from datetime import timedelta
import logging
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.config import APP_ENV, DEFAULT_ADMIN_PASSWORD
from app.models import *  # noqa: F401,F403
from app.services import hash_password, utc_now

logger = logging.getLogger(__name__)


def seed_database(db: Session) -> None:
    now = utc_now()

    def apply_values(instance: Any, values: Dict[str, Any]) -> None:
        for key, value in values.items():
            setattr(instance, key, value)
        instance.updated_at = now

    def department_id(name: str) -> Optional[int]:
        department = db.query(Department).filter(Department.name == name).first()
        return department.id if department else None

    def user_id(email: str) -> Optional[int]:
        user = db.query(User).filter(User.email == email).first()
        return user.id if user else None

    def seed_department(name: str, description: str) -> Department:
        department = db.query(Department).filter(Department.name == name).first()
        values = {"description": description}
        if department:
            apply_values(department, values)
        else:
            department = Department(name=name, **values, created_at=now, updated_at=now)
            db.add(department)
        db.commit()
        db.refresh(department)
        return department

    def seed_user(email: str, values: Dict[str, Any]) -> User:
        user = db.query(User).filter(User.email == email).first()
        if user:
            update_values = values.copy()
            update_values.pop("password", None)
            apply_values(user, update_values)
        else:
            user = User(email=email, **values, created_at=now, updated_at=now)
            db.add(user)
        db.commit()
        db.refresh(user)
        return user

    def seed_contact(email: str, values: Dict[str, Any]) -> Contact:
        contact = db.query(Contact).filter(Contact.email == email).first()
        if contact:
            apply_values(contact, values)
        else:
            contact = Contact(email=email, **values, created_at=now, updated_at=now)
            db.add(contact)
        db.commit()
        db.refresh(contact)
        return contact

    def seed_job(title: str, values: Dict[str, Any]) -> Job:
        job = db.query(Job).filter(Job.title == title).first()
        if job:
            apply_values(job, values)
        else:
            job = Job(title=title, **values, posted_date=now, created_at=now, updated_at=now)
            db.add(job)
        db.commit()
        db.refresh(job)
        return job

    def seed_post(content: str, values: Dict[str, Any]) -> CommunityPost:
        posts = db.query(CommunityPost).filter(CommunityPost.content == content).order_by(CommunityPost.id).all()
        if posts:
            post = posts[0]
            for duplicate in posts[1:]:
                db.delete(duplicate)
            apply_values(post, values)
        else:
            post = CommunityPost(content=content, **values, created_at=now, updated_at=now)
            db.add(post)
        db.commit()
        db.refresh(post)
        return post

    def rewrite_seed_post(old_content: str, new_content: str) -> None:
        post = db.query(CommunityPost).filter(CommunityPost.content == old_content).first()
        if post:
            post.content = new_content
            post.updated_at = now
            db.commit()

    def seed_comment(post_content: str, author_email: str, content: str) -> None:
        post = db.query(CommunityPost).filter(CommunityPost.content == post_content).first()
        author = db.query(User).filter(User.email == author_email).first()
        if not post or not author:
            return
        comment = (
            db.query(CommunityComment)
            .filter(
                CommunityComment.post_id == post.id,
                CommunityComment.author_id == author.id,
                CommunityComment.content == content,
            )
            .first()
        )
        if not comment:
            db.add(
                CommunityComment(
                    post_id=post.id,
                    author_id=author.id,
                    content=content,
                    created_at=now,
                    updated_at=now,
                )
            )
        post.comments_count = db.query(CommunityComment).filter(CommunityComment.post_id == post.id).count()
        post.updated_at = now
        db.commit()

    def seed_message(sender_email: str, recipient_email: str, content: str, read: bool = False) -> None:
        sender = db.query(User).filter(User.email == sender_email).first()
        recipient = db.query(User).filter(User.email == recipient_email).first()
        if not sender or not recipient:
            return
        message = (
            db.query(DirectMessage)
            .filter(
                DirectMessage.sender_id == sender.id,
                DirectMessage.recipient_id == recipient.id,
                DirectMessage.content == content,
            )
            .first()
        )
        if not message:
            db.add(
                DirectMessage(
                    sender_id=sender.id,
                    recipient_id=recipient.id,
                    content=content,
                    read_at=now if read else None,
                    created_at=now,
                    updated_at=now,
                )
            )
            db.commit()

    def seed_event(title: str, creator_email: str, values: Dict[str, Any]) -> Optional[CommunityEvent]:
        creator = db.query(User).filter(User.email == creator_email).first()
        if not creator:
            return None
        event = db.query(CommunityEvent).filter(CommunityEvent.title == title).first()
        values = {**values, "created_by_id": creator.id}
        if event:
            apply_values(event, values)
        else:
            event = CommunityEvent(title=title, **values, created_at=now, updated_at=now)
            db.add(event)
        db.commit()
        db.refresh(event)
        return event

    def seed_rsvp(event_title: str, user_email: str, response: str = "going") -> None:
        event = db.query(CommunityEvent).filter(CommunityEvent.title == event_title).first()
        user = db.query(User).filter(User.email == user_email).first()
        if not event or not user:
            return
        rsvp = db.query(EventRsvp).filter(EventRsvp.event_id == event.id, EventRsvp.user_id == user.id).first()
        if rsvp:
            rsvp.response = response
            rsvp.updated_at = now
        else:
            db.add(
                EventRsvp(
                    event_id=event.id,
                    user_id=user.id,
                    response=response,
                    created_at=now,
                    updated_at=now,
                )
            )
        db.commit()

    def seed_notification(user_email: str, title: str, message: str, notification_type: str) -> None:
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            return
        existing = (
            db.query(Notification)
            .filter(Notification.user_id == user.id, Notification.title == title, Notification.message == message)
            .first()
        )
        if not existing:
            db.add(
                Notification(
                    user_id=user.id,
                    title=title,
                    message=message,
                    notification_type=notification_type,
                    is_read=False,
                    created_at=now,
                    updated_at=now,
                )
            )
            db.commit()

    def seed_report(reporter_email: str, content_type: str, content_id: int, reason: str) -> None:
        reporter = db.query(User).filter(User.email == reporter_email).first()
        if not reporter:
            return
        existing = (
            db.query(ContentReport)
            .filter(
                ContentReport.reporter_id == reporter.id,
                ContentReport.content_type == content_type,
                ContentReport.content_id == content_id,
                ContentReport.reason == reason,
            )
            .first()
        )
        if not existing:
            db.add(
                ContentReport(
                    reporter_id=reporter.id,
                    content_type=content_type,
                    content_id=content_id,
                    reason=reason,
                    status="open",
                    created_at=now,
                    updated_at=now,
                )
            )
            db.commit()

    seed_department("Engineering", "Cloud, product, and platform engineering.")
    seed_department("Marketing", "Brand, campaigns, and digital growth.")
    seed_department("Operations", "Delivery, process improvement, and field coordination.")
    seed_department("Data & Science", "Analytics, research, AI learning, and science discussion.")
    seed_department("Creative & Hobbies", "Design, writing, photography, music, and hobby communities.")
    seed_department("Human Resources", "People operations, hiring, onboarding, and employee experience.")
    seed_department("Talent Acquisition", "Candidate sourcing, interviews, hiring pipelines, and assessment support.")
    seed_department("Learning & Development", "Training programs, skill growth, internal courses, and coaching plans.")
    seed_department("Product Management", "Roadmaps, discovery, user research, and product delivery planning.")
    seed_department("Customer Success", "Client onboarding, support quality, retention, and service improvement.")
    seed_department("Sales & Partnerships", "Business development, partner relationships, and commercial growth.")
    seed_department("Finance & Admin", "Budgeting, administration, procurement, payroll, and reporting.")
    seed_department("Quality Assurance", "Testing, process quality, release checks, and continuous improvement.")
    seed_department("Cybersecurity", "Security awareness, risk reviews, access control, and incident readiness.")
    seed_department("Cloud & DevOps", "Infrastructure, CI/CD, reliability, monitoring, and deployment practice.")
    seed_department("Internship Program", "Intern mentorship, early-career development, and project placement.")

    if APP_ENV == "production" and not DEFAULT_ADMIN_PASSWORD:
        logger.warning("Seeded groups only. Set DEFAULT_ADMIN_PASSWORD to seed demo users and content.")
        return

    seed_user(
        "admin@turcomp.com",
        {
            "username": "admin",
            "password": hash_password(DEFAULT_ADMIN_PASSWORD),
            "first_name": "Turcomp",
            "last_name": "Admin",
            "phone": "+60 3-0000 0000",
            "position": "Community Administrator",
            "skills": ["Community Operations", "Coordination", "Mentorship Matching"],
            "notes": "Seeded administrator account.",
            "role": "admin",
            "department_id": department_id("Engineering"),
        },
    )
    seed_user(
        "ahmad.mentor@turcomp.com",
        {
            "username": "ahmad.mentor",
            "password": hash_password(DEFAULT_ADMIN_PASSWORD),
            "first_name": "Ahmad",
            "last_name": "Hassan",
            "phone": "+60 3-1234 5678",
            "position": "Cloud Mentor",
            "skills": ["Python", "AWS", "System Design", "Mentorship"],
            "notes": "Coaches backend engineers and cloud learners.",
            "role": "user",
            "department_id": department_id("Engineering"),
        },
    )
    seed_user(
        "siti.coach@turcomp.com",
        {
            "username": "siti.coach",
            "password": hash_password(DEFAULT_ADMIN_PASSWORD),
            "first_name": "Siti",
            "last_name": "Nurhaliza",
            "phone": "+60 3-2234 5678",
            "position": "Content Coach",
            "skills": ["Storytelling", "Content Strategy", "Analytics", "Coaching"],
            "notes": "Helps community members refine campaigns and public writing.",
            "role": "user",
            "department_id": department_id("Marketing"),
        },
    )
    seed_user(
        "mei.science@turcomp.com",
        {
            "username": "mei.science",
            "password": hash_password(DEFAULT_ADMIN_PASSWORD),
            "first_name": "Mei",
            "last_name": "Tan",
            "phone": "+60 3-3234 5678",
            "position": "Data Science Mentor",
            "skills": ["Data Science", "Machine Learning", "Research Methods", "Science"],
            "notes": "Hosts data and science learning circles.",
            "role": "user",
            "department_id": department_id("Data & Science"),
        },
    )
    seed_user(
        "danial.hobby@turcomp.com",
        {
            "username": "danial.hobby",
            "password": hash_password(DEFAULT_ADMIN_PASSWORD),
            "first_name": "Danial",
            "last_name": "Rahman",
            "phone": "+60 3-4234 5678",
            "position": "Creative Community Lead",
            "skills": ["Photography", "Design Critique", "Writing", "Hobby Groups"],
            "notes": "Connects members around creative practice and hobby topics.",
            "role": "user",
            "department_id": department_id("Creative & Hobbies"),
        },
    )

    leader_map = {
        "Engineering": "ahmad.mentor@turcomp.com",
        "Marketing": "siti.coach@turcomp.com",
        "Operations": "admin@turcomp.com",
        "Data & Science": "mei.science@turcomp.com",
        "Creative & Hobbies": "danial.hobby@turcomp.com",
    }
    for department_name, leader_email in leader_map.items():
        department = db.query(Department).filter(Department.name == department_name).first()
        leader = db.query(User).filter(User.email == leader_email).first()
        if department and leader and department.leader_id != leader.id:
            department.leader_id = leader.id
            department.updated_at = now
    db.commit()

    seed_contact(
        "ahmad.mentor@turcomp.com",
        {
            "name": "Ahmad Hassan",
            "phone": "+60 3-1234 5678",
            "position": "Cloud Mentor",
            "skills": ["Python", "AWS", "Leadership", "Mentorship"],
            "notes": "Available for backend coaching and cloud migration guidance.",
            "department_id": department_id("Engineering"),
            "created_by_id": user_id("admin@turcomp.com"),
            "status": "active",
        },
    )
    seed_contact(
        "siti.coach@turcomp.com",
        {
            "name": "Siti Nurhaliza",
            "phone": "+60 3-2234 5678",
            "position": "Content Coach",
            "skills": ["Content Strategy", "Analytics", "Leadership", "Coaching"],
            "notes": "Open to coaching on storytelling, campaign planning, and analytics.",
            "department_id": department_id("Marketing"),
            "created_by_id": user_id("admin@turcomp.com"),
            "status": "active",
        },
    )
    seed_contact(
        "mei.science@turcomp.com",
        {
            "name": "Mei Tan",
            "phone": "+60 3-3234 5678",
            "position": "Data Science Mentor",
            "skills": ["Data Science", "Machine Learning", "Research", "Science"],
            "notes": "Runs data literacy sessions and science discussion circles.",
            "department_id": department_id("Data & Science"),
            "created_by_id": user_id("admin@turcomp.com"),
            "status": "active",
        },
    )
    seed_contact(
        "danial.hobby@turcomp.com",
        {
            "name": "Danial Rahman",
            "phone": "+60 3-4234 5678",
            "position": "Creative Community Lead",
            "skills": ["Photography", "Design", "Writing", "Hobbies"],
            "notes": "Organizes creative prompts, hobby meetups, and portfolio feedback.",
            "department_id": department_id("Creative & Hobbies"),
            "created_by_id": user_id("admin@turcomp.com"),
            "status": "active",
        },
    )
    seed_contact(
        "priya.ops@turcomp.com",
        {
            "name": "Priya Nair",
            "phone": "+60 3-5234 5678",
            "position": "Operations Coach",
            "skills": ["Process Improvement", "Facilitation", "Project Planning"],
            "notes": "Supports members who want coaching on delivery workflows and planning habits.",
            "department_id": department_id("Operations"),
            "created_by_id": user_id("admin@turcomp.com"),
            "status": "active",
        },
    )

    seed_job(
        "Cloud Architecture Mentorship",
        {
            "description": "Weekly coaching for people learning backend systems and cloud delivery.",
            "requirements": ["Python", "AWS", "System Design"],
            "department_id": department_id("Engineering"),
            "created_by_id": user_id("admin@turcomp.com"),
            "status": "open",
            "closing_date": "2026-07-31",
        },
    )
    seed_job(
        "Content Strategy Coaching",
        {
            "description": "One-to-one coaching for members improving campaign ideas, writing, and analytics.",
            "requirements": ["Storytelling", "Analytics", "Marketing"],
            "department_id": department_id("Marketing"),
            "created_by_id": user_id("siti.coach@turcomp.com"),
            "status": "open",
            "closing_date": "2026-08-15",
        },
    )
    seed_job(
        "Data Science Study Circle",
        {
            "description": "A guided peer group for statistics, machine learning basics, and research thinking.",
            "requirements": ["Data Science", "Machine Learning", "Science"],
            "department_id": department_id("Data & Science"),
            "created_by_id": user_id("mei.science@turcomp.com"),
            "status": "open",
            "closing_date": "2026-08-30",
        },
    )
    seed_job(
        "Creative Portfolio Feedback",
        {
            "description": "Casual coaching sessions for photography, design, writing, and hobby projects.",
            "requirements": ["Design", "Photography", "Writing", "Hobbies"],
            "department_id": department_id("Creative & Hobbies"),
            "created_by_id": user_id("danial.hobby@turcomp.com"),
            "status": "open",
            "closing_date": "2026-09-15",
        },
    )

    rewrite_seed_post(
        "Offering a small group mentorship circle for Python, AWS, and system design this month.",
        "Mentorship opening: Ahmad is hosting a four-week cloud architecture circle covering Python services, AWS foundations, and system design reviews.",
    )
    rewrite_seed_post(
        "Engineering is looking for cloud migration contributors.",
        "Mentorship opening: Ahmad is hosting a four-week cloud architecture circle covering Python services, AWS foundations, and system design reviews.",
    )
    rewrite_seed_post(
        "Anyone working on public speaking or campaign storytelling? I can review outlines this week.",
        "Coaching clinic: Siti is reviewing campaign narratives, presentation outlines, and content measurement plans for members preparing stakeholder updates.",
    )
    rewrite_seed_post(
        "Starting a beginner-friendly discussion on machine learning myths, model evaluation, and science news.",
        "Science forum: Mei is leading a beginner-friendly session on machine learning myths, evaluation basics, and how to read research claims critically.",
    )
    rewrite_seed_post(
        "Weekend hobby thread: share a photo, sketch, playlist, or writing snippet you want feedback on.",
        "Creative review thread: Danial is collecting photography, design, writing, and hobby project samples for constructive peer feedback this week.",
    )
    rewrite_seed_post(
        "Use the People tab to search by email, role, skill, or expertise tag when you need a mentor fast.",
        "Expertise directory tip: use People search to find mentors by email, role, skill, or topic tags before starting a coaching conversation.",
    )

    seed_post(
        "Mentorship opening: Ahmad is hosting a four-week cloud architecture circle covering Python services, AWS foundations, and system design reviews.",
        {
            "category": "Mentorship",
            "author_id": user_id("ahmad.mentor@turcomp.com"),
            "likes": 14,
            "comments_count": 0,
        },
    )
    seed_post(
        "Coaching clinic: Siti is reviewing campaign narratives, presentation outlines, and content measurement plans for members preparing stakeholder updates.",
        {
            "category": "Coaching",
            "author_id": user_id("siti.coach@turcomp.com"),
            "likes": 11,
            "comments_count": 0,
        },
    )
    seed_post(
        "Science forum: Mei is leading a beginner-friendly session on machine learning myths, evaluation basics, and how to read research claims critically.",
        {
            "category": "Science",
            "author_id": user_id("mei.science@turcomp.com"),
            "likes": 16,
            "comments_count": 0,
        },
    )
    seed_post(
        "Creative review thread: Danial is collecting photography, design, writing, and hobby project samples for constructive peer feedback this week.",
        {
            "category": "Hobby",
            "author_id": user_id("danial.hobby@turcomp.com"),
            "likes": 8,
            "comments_count": 0,
        },
    )
    seed_post(
        "Expertise directory tip: use People search to find mentors by email, role, skill, or topic tags before starting a coaching conversation.",
        {
            "category": "Expertise",
            "author_id": user_id("admin@turcomp.com"),
            "likes": 10,
            "comments_count": 0,
        },
    )
    seed_post(
        "Community guideline: keep posts specific, respectful, and action-oriented so members can quickly find the right mentor, coach, or discussion group.",
        {
            "category": "General",
            "author_id": user_id("admin@turcomp.com"),
            "likes": 6,
            "comments_count": 0,
        },
    )

    seed_comment(
        "Mentorship opening: Ahmad is hosting a four-week cloud architecture circle covering Python services, AWS foundations, and system design reviews.",
        "mei.science@turcomp.com",
        "This is useful for members moving from data scripts into production services. Please include a short design review segment.",
    )
    seed_comment(
        "Coaching clinic: Siti is reviewing campaign narratives, presentation outlines, and content measurement plans for members preparing stakeholder updates.",
        "admin@turcomp.com",
        "Great clinic format. Please reserve a few slots for first-time presenters and early-career members.",
    )
    seed_comment(
        "Science forum: Mei is leading a beginner-friendly session on machine learning myths, evaluation basics, and how to read research claims critically.",
        "ahmad.mentor@turcomp.com",
        "I can contribute a short example on model monitoring from a backend engineering perspective.",
    )

    seed_message(
        "admin@turcomp.com",
        "ahmad.mentor@turcomp.com",
        "Can you prepare three starter questions for the cloud mentorship circle?",
        read=True,
    )
    seed_message(
        "siti.coach@turcomp.com",
        "danial.hobby@turcomp.com",
        "Your creative review thread would pair well with a short storytelling prompt.",
    )

    seed_event(
        "Cloud Mentorship Kickoff",
        "ahmad.mentor@turcomp.com",
        {
            "description": "Kickoff session for the cloud architecture mentorship circle with expectations, topics, and Q&A.",
            "event_type": "Workshop",
            "event_date": "2026-07-12 10:00",
            "location": "Training Room A",
            "virtual_link": "https://meet.example.com/cloud-mentorship",
            "status": "scheduled",
        },
    )
    seed_event(
        "Professional Storytelling Clinic",
        "siti.coach@turcomp.com",
        {
            "description": "Hands-on coaching for clearer stakeholder updates, campaign narratives, and presentation flow.",
            "event_type": "Coaching",
            "event_date": "2026-07-18 14:00",
            "location": "Online",
            "virtual_link": "https://meet.example.com/storytelling-clinic",
            "status": "scheduled",
        },
    )
    seed_event(
        "Science Discussion Roundtable",
        "mei.science@turcomp.com",
        {
            "description": "Community roundtable on evidence, claims, and practical ways to discuss science topics at work.",
            "event_type": "Roundtable",
            "event_date": "2026-07-25 15:30",
            "location": "Innovation Lab",
            "virtual_link": "",
            "status": "scheduled",
        },
    )

    seed_rsvp("Cloud Mentorship Kickoff", "admin@turcomp.com", "going")
    seed_rsvp("Cloud Mentorship Kickoff", "mei.science@turcomp.com", "interested")
    seed_rsvp("Professional Storytelling Clinic", "danial.hobby@turcomp.com", "going")
    seed_rsvp("Science Discussion Roundtable", "ahmad.mentor@turcomp.com", "going")

    seed_notification(
        "admin@turcomp.com",
        "Community seed data refreshed",
        "People, groups, posts, events, comments, and messages are available for testing.",
        "system",
    )
    seed_notification(
        "ahmad.mentor@turcomp.com",
        "New comment on your mentorship post",
        "Mei asked for a short design review segment in the cloud mentorship circle.",
        "comment",
    )

    guideline_post = (
        db.query(CommunityPost)
        .filter(
            CommunityPost.content
            == "Community guideline: keep posts specific, respectful, and action-oriented so members can quickly find the right mentor, coach, or discussion group."
        )
        .first()
    )
    if guideline_post:
        seed_report(
            "siti.coach@turcomp.com",
            "community_post",
            guideline_post.id,
            "Testing moderation workflow with a low-risk guideline post.",
        )

    for post in db.query(CommunityPost).all():
        post.comments_count = db.query(CommunityComment).filter(CommunityComment.post_id == post.id).count()
        post.updated_at = now
    db.commit()

    admin_user_id = user_id("admin@turcomp.com")
    seed_token = db.get(AuthToken, "seed-expired-password-reset-token")
    if not seed_token and admin_user_id:
        db.add(
            AuthToken(
                token="seed-expired-password-reset-token",
                user_id=admin_user_id,
                token_type="password_reset",
                expires_at=now - timedelta(days=1),
            )
        )
        db.commit()


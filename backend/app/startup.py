import time
from datetime import timedelta
from typing import Any, Dict, Optional

from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.config import APP_ENV, DATABASE_DIALECT, DEFAULT_ADMIN_PASSWORD, SEED_DATABASE
from app.database import Base, SessionLocal, engine
from app.models import *  # noqa: F401,F403
from app.services import hash_password, utc_now

def add_missing_columns(table_name: str, column_statements: Dict[str, str]) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}

    with engine.begin() as connection:
        for column_name, statement in column_statements.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))


def migrate_existing_columns() -> None:
    json_type = "JSON"
    bool_default_false = "BOOLEAN DEFAULT FALSE"
    if DATABASE_DIALECT == "postgresql":
        user_columns = {
            "phone": "ALTER TABLE users ADD COLUMN phone VARCHAR(80)",
            "position": "ALTER TABLE users ADD COLUMN position VARCHAR(160)",
            "skills": f"ALTER TABLE users ADD COLUMN skills {json_type}",
            "notes": "ALTER TABLE users ADD COLUMN notes TEXT",
            "profile_picture": "ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255)",
            "cover_photo": "ALTER TABLE users ADD COLUMN cover_photo VARCHAR(255)",
            "bio": "ALTER TABLE users ADD COLUMN bio TEXT",
            "work_experience": f"ALTER TABLE users ADD COLUMN work_experience {json_type}",
            "education": f"ALTER TABLE users ADD COLUMN education {json_type}",
            "certifications": f"ALTER TABLE users ADD COLUMN certifications {json_type}",
            "portfolio_url": "ALTER TABLE users ADD COLUMN portfolio_url VARCHAR(255)",
            "resume_url": "ALTER TABLE users ADD COLUMN resume_url VARCHAR(255)",
            "contact_info": f"ALTER TABLE users ADD COLUMN contact_info {json_type}",
            "privacy_settings": f"ALTER TABLE users ADD COLUMN privacy_settings {json_type}",
            "email_verified": f"ALTER TABLE users ADD COLUMN email_verified {bool_default_false}",
            "two_factor_enabled": f"ALTER TABLE users ADD COLUMN two_factor_enabled {bool_default_false}",
            "status": "ALTER TABLE users ADD COLUMN status VARCHAR(40) DEFAULT 'active'",
        }
        post_columns = {
            "title": "ALTER TABLE community_posts ADD COLUMN title VARCHAR(180)",
            "content_type": "ALTER TABLE community_posts ADD COLUMN content_type VARCHAR(80) DEFAULT 'text'",
            "attachments": f"ALTER TABLE community_posts ADD COLUMN attachments {json_type}",
            "poll_options": f"ALTER TABLE community_posts ADD COLUMN poll_options {json_type}",
            "hashtags": f"ALTER TABLE community_posts ADD COLUMN hashtags {json_type}",
            "mentions": f"ALTER TABLE community_posts ADD COLUMN mentions {json_type}",
            "scheduled_at": "ALTER TABLE community_posts ADD COLUMN scheduled_at VARCHAR(80)",
            "pinned": f"ALTER TABLE community_posts ADD COLUMN pinned {bool_default_false}",
            "shared_post_id": "ALTER TABLE community_posts ADD COLUMN shared_post_id INTEGER",
            "community_id": "ALTER TABLE community_posts ADD COLUMN community_id INTEGER",
        }
        message_columns = {
            "room_id": "ALTER TABLE direct_messages ADD COLUMN room_id INTEGER",
            "message_type": "ALTER TABLE direct_messages ADD COLUMN message_type VARCHAR(40) DEFAULT 'text'",
            "attachment_url": "ALTER TABLE direct_messages ADD COLUMN attachment_url VARCHAR(255)",
            "voice_url": "ALTER TABLE direct_messages ADD COLUMN voice_url VARCHAR(255)",
        }
        job_columns = {
            "company": "ALTER TABLE jobs ADD COLUMN company VARCHAR(180)",
            "location": "ALTER TABLE jobs ADD COLUMN location VARCHAR(180)",
            "job_type": "ALTER TABLE jobs ADD COLUMN job_type VARCHAR(80)",
        }
    else:
        user_columns = {
            "phone": "ALTER TABLE users ADD COLUMN phone VARCHAR(80) NULL",
            "position": "ALTER TABLE users ADD COLUMN position VARCHAR(160) NULL",
            "skills": f"ALTER TABLE users ADD COLUMN skills {json_type} NULL",
            "notes": "ALTER TABLE users ADD COLUMN notes TEXT NULL",
            "profile_picture": "ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255) NULL",
            "cover_photo": "ALTER TABLE users ADD COLUMN cover_photo VARCHAR(255) NULL",
            "bio": "ALTER TABLE users ADD COLUMN bio TEXT NULL",
            "work_experience": f"ALTER TABLE users ADD COLUMN work_experience {json_type} NULL",
            "education": f"ALTER TABLE users ADD COLUMN education {json_type} NULL",
            "certifications": f"ALTER TABLE users ADD COLUMN certifications {json_type} NULL",
            "portfolio_url": "ALTER TABLE users ADD COLUMN portfolio_url VARCHAR(255) NULL",
            "resume_url": "ALTER TABLE users ADD COLUMN resume_url VARCHAR(255) NULL",
            "contact_info": f"ALTER TABLE users ADD COLUMN contact_info {json_type} NULL",
            "privacy_settings": f"ALTER TABLE users ADD COLUMN privacy_settings {json_type} NULL",
            "email_verified": f"ALTER TABLE users ADD COLUMN email_verified {bool_default_false}",
            "two_factor_enabled": f"ALTER TABLE users ADD COLUMN two_factor_enabled {bool_default_false}",
            "status": "ALTER TABLE users ADD COLUMN status VARCHAR(40) DEFAULT 'active'",
        }
        post_columns = {
            "title": "ALTER TABLE community_posts ADD COLUMN title VARCHAR(180) NULL",
            "content_type": "ALTER TABLE community_posts ADD COLUMN content_type VARCHAR(80) DEFAULT 'text'",
            "attachments": f"ALTER TABLE community_posts ADD COLUMN attachments {json_type} NULL",
            "poll_options": f"ALTER TABLE community_posts ADD COLUMN poll_options {json_type} NULL",
            "hashtags": f"ALTER TABLE community_posts ADD COLUMN hashtags {json_type} NULL",
            "mentions": f"ALTER TABLE community_posts ADD COLUMN mentions {json_type} NULL",
            "scheduled_at": "ALTER TABLE community_posts ADD COLUMN scheduled_at VARCHAR(80) NULL",
            "pinned": f"ALTER TABLE community_posts ADD COLUMN pinned {bool_default_false}",
            "shared_post_id": "ALTER TABLE community_posts ADD COLUMN shared_post_id INTEGER NULL",
            "community_id": "ALTER TABLE community_posts ADD COLUMN community_id INTEGER NULL",
        }
        message_columns = {
            "room_id": "ALTER TABLE direct_messages ADD COLUMN room_id INTEGER NULL",
            "message_type": "ALTER TABLE direct_messages ADD COLUMN message_type VARCHAR(40) DEFAULT 'text'",
            "attachment_url": "ALTER TABLE direct_messages ADD COLUMN attachment_url VARCHAR(255) NULL",
            "voice_url": "ALTER TABLE direct_messages ADD COLUMN voice_url VARCHAR(255) NULL",
        }
        job_columns = {
            "company": "ALTER TABLE jobs ADD COLUMN company VARCHAR(180) NULL",
            "location": "ALTER TABLE jobs ADD COLUMN location VARCHAR(180) NULL",
            "job_type": "ALTER TABLE jobs ADD COLUMN job_type VARCHAR(80) NULL",
        }

    add_missing_columns("users", user_columns)
    add_missing_columns("community_posts", post_columns)
    add_missing_columns("direct_messages", message_columns)
    add_missing_columns("jobs", job_columns)


def init_database() -> None:
    last_error: Optional[Exception] = None
    for _ in range(30):
        try:
            Base.metadata.create_all(bind=engine)
            migrate_existing_columns()
            if SEED_DATABASE:
                with SessionLocal() as db:
                    seed_database(db)
            return
        except Exception as exc:  # pragma: no cover - startup retry for containerized MySQL
            last_error = exc
            time.sleep(2)
    raise RuntimeError(f"Database did not become ready: {last_error}")


def seed_database(db: Session) -> None:
    now = utc_now()
    if APP_ENV == "production" and not DEFAULT_ADMIN_PASSWORD:
        return

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


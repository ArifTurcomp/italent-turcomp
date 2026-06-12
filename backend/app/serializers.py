from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models import *  # noqa: F401,F403
from app.utils import iso
def public_user(user: User) -> Dict[str, Any]:
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone or "",
        "position": user.position or "",
        "skills": user.skills or [],
        "notes": user.notes or "",
        "profile_picture": user.profile_picture or "",
        "cover_photo": user.cover_photo or "",
        "bio": user.bio or "",
        "work_experience": user.work_experience or [],
        "education": user.education or [],
        "certifications": user.certifications or [],
        "portfolio_url": user.portfolio_url or "",
        "resume_url": user.resume_url or "",
        "contact_info": user.contact_info or {},
        "privacy_settings": user.privacy_settings or {},
        "email_verified": bool(user.email_verified),
        "two_factor_enabled": bool(user.two_factor_enabled),
        "status": user.status,
        "role": user.role,
        "department_id": user.department_id,
        "created_at": iso(user.created_at),
        "updated_at": iso(user.updated_at),
    }


def department_to_dict(department: Department, db: Optional[Session] = None) -> Dict[str, Any]:
    leader = db.get(User, department.leader_id) if db and department.leader_id else None
    return {
        "id": department.id,
        "name": department.name,
        "description": department.description,
        "leader_id": department.leader_id,
        "leader_name": f"{leader.first_name} {leader.last_name}".strip() if leader else None,
        "members_count": db.query(Contact).filter(Contact.department_id == department.id).count() if db else 0,
        "created_at": iso(department.created_at),
        "updated_at": iso(department.updated_at),
    }


def contact_to_dict(db: Session, contact: Contact) -> Dict[str, Any]:
    department = db.get(Department, contact.department_id) if contact.department_id else None
    return {
        "id": contact.id,
        "name": contact.name,
        "email": contact.email,
        "phone": contact.phone,
        "position": contact.position,
        "skills": contact.skills or [],
        "notes": contact.notes,
        "department_id": contact.department_id,
        "department": department.name if department else None,
        "created_by_id": contact.created_by_id,
        "status": contact.status,
        "created_at": iso(contact.created_at),
        "updated_at": iso(contact.updated_at),
    }


def job_to_dict(db: Session, job: Job) -> Dict[str, Any]:
    department = db.get(Department, job.department_id) if job.department_id else None
    return {
        "id": job.id,
        "title": job.title,
        "description": job.description,
        "requirements": job.requirements or [],
        "company": job.company or "",
        "location": job.location or "",
        "job_type": job.job_type or "",
        "department_id": job.department_id,
        "department": department.name if department else None,
        "created_by_id": job.created_by_id,
        "status": job.status,
        "posted_date": iso(job.posted_date),
        "closing_date": job.closing_date,
        "created_at": iso(job.created_at),
        "updated_at": iso(job.updated_at),
    }


def post_to_dict(db: Session, post: CommunityPost, current_user_id: Optional[int] = None) -> Dict[str, Any]:
    author = db.get(User, post.author_id) if post.author_id else None
    author_name = None
    if author:
        author_name = f"{author.first_name} {author.last_name}".strip()
    bookmark_query = db.query(PostBookmark).filter(PostBookmark.post_id == post.id)
    bookmark_count = bookmark_query.count()
    return {
        "id": post.id,
        "title": post.title or "",
        "content": post.content,
        "category": post.category,
        "content_type": post.content_type,
        "attachments": post.attachments or [],
        "poll_options": post.poll_options or [],
        "hashtags": post.hashtags or [],
        "mentions": post.mentions or [],
        "scheduled_at": post.scheduled_at,
        "pinned": bool(post.pinned),
        "shared_post_id": post.shared_post_id,
        "community_id": post.community_id,
        "author_id": post.author_id,
        "author_name": author_name,
        "author_email": author.email if author else None,
        "author_position": author.position if author else None,
        "likes": post.likes,
        "comments_count": post.comments_count,
        "bookmark_count": bookmark_count,
        "is_bookmarked": (
            bookmark_query.filter(PostBookmark.user_id == current_user_id).first() is not None
            if current_user_id
            else False
        ),
        "created_at": iso(post.created_at),
        "updated_at": iso(post.updated_at),
    }


def comment_to_dict(db: Session, comment: CommunityComment) -> Dict[str, Any]:
    author = db.get(User, comment.author_id)
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "author_id": comment.author_id,
        "author_name": f"{author.first_name} {author.last_name}".strip() if author else None,
        "author_email": author.email if author else None,
        "content": comment.content,
        "created_at": iso(comment.created_at),
        "updated_at": iso(comment.updated_at),
    }


def message_to_dict(db: Session, message: DirectMessage) -> Dict[str, Any]:
    sender = db.get(User, message.sender_id)
    recipient = db.get(User, message.recipient_id)
    return {
        "id": message.id,
        "sender_id": message.sender_id,
        "sender_name": f"{sender.first_name} {sender.last_name}".strip() if sender else None,
        "recipient_id": message.recipient_id,
        "recipient_name": f"{recipient.first_name} {recipient.last_name}".strip() if recipient else None,
        "room_id": message.room_id,
        "content": message.content,
        "message_type": message.message_type,
        "attachment_url": message.attachment_url or "",
        "voice_url": message.voice_url or "",
        "read_at": iso(message.read_at),
        "created_at": iso(message.created_at),
        "updated_at": iso(message.updated_at),
    }


def event_to_dict(db: Session, event: CommunityEvent) -> Dict[str, Any]:
    creator = db.get(User, event.created_by_id)
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "event_type": event.event_type,
        "event_date": event.event_date,
        "location": event.location or "",
        "virtual_link": event.virtual_link or "",
        "created_by_id": event.created_by_id,
        "created_by_name": f"{creator.first_name} {creator.last_name}".strip() if creator else None,
        "status": event.status,
        "rsvp_count": db.query(EventRsvp).filter(EventRsvp.event_id == event.id).count(),
        "created_at": iso(event.created_at),
        "updated_at": iso(event.updated_at),
    }


def rsvp_to_dict(db: Session, rsvp: EventRsvp) -> Dict[str, Any]:
    user = db.get(User, rsvp.user_id)
    return {
        "id": rsvp.id,
        "event_id": rsvp.event_id,
        "user_id": rsvp.user_id,
        "user_name": f"{user.first_name} {user.last_name}".strip() if user else None,
        "response": rsvp.response,
        "created_at": iso(rsvp.created_at),
        "updated_at": iso(rsvp.updated_at),
    }


def notification_to_dict(notification: Notification) -> Dict[str, Any]:
    return {
        "id": notification.id,
        "user_id": notification.user_id,
        "title": notification.title,
        "message": notification.message,
        "notification_type": notification.notification_type,
        "is_read": notification.is_read,
        "created_at": iso(notification.created_at),
        "updated_at": iso(notification.updated_at),
    }


def report_to_dict(db: Session, report: ContentReport) -> Dict[str, Any]:
    reporter = db.get(User, report.reporter_id)
    return {
        "id": report.id,
        "reporter_id": report.reporter_id,
        "reporter_name": f"{reporter.first_name} {reporter.last_name}".strip() if reporter else None,
        "content_type": report.content_type,
        "content_id": report.content_id,
        "reason": report.reason,
        "status": report.status,
        "created_at": iso(report.created_at),
        "updated_at": iso(report.updated_at),
    }


def community_group_to_dict(db: Session, community: CommunityGroup) -> Dict[str, Any]:
    owner = db.get(User, community.owner_id)
    return {
        "id": community.id,
        "name": community.name,
        "description": community.description or "",
        "category": community.category,
        "rules": community.rules or [],
        "owner_id": community.owner_id,
        "owner_name": f"{owner.first_name} {owner.last_name}".strip() if owner else None,
        "privacy": community.privacy,
        "status": community.status,
        "members_count": db.query(CommunityMembership).filter(
            CommunityMembership.community_id == community.id,
            CommunityMembership.status == "active",
        ).count(),
        "created_at": iso(community.created_at),
        "updated_at": iso(community.updated_at),
    }


def membership_to_dict(db: Session, membership: CommunityMembership) -> Dict[str, Any]:
    user = db.get(User, membership.user_id)
    return {
        "id": membership.id,
        "community_id": membership.community_id,
        "user_id": membership.user_id,
        "user_name": f"{user.first_name} {user.last_name}".strip() if user else None,
        "role": membership.role,
        "status": membership.status,
        "invited_by_id": membership.invited_by_id,
        "created_at": iso(membership.created_at),
        "updated_at": iso(membership.updated_at),
    }


def connection_to_dict(db: Session, connection: ConnectionRequest) -> Dict[str, Any]:
    requester = db.get(User, connection.requester_id)
    recipient = db.get(User, connection.recipient_id)
    return {
        "id": connection.id,
        "requester_id": connection.requester_id,
        "requester_name": f"{requester.first_name} {requester.last_name}".strip() if requester else None,
        "recipient_id": connection.recipient_id,
        "recipient_name": f"{recipient.first_name} {recipient.last_name}".strip() if recipient else None,
        "message": connection.message or "",
        "status": connection.status,
        "created_at": iso(connection.created_at),
        "updated_at": iso(connection.updated_at),
    }


def endorsement_to_dict(db: Session, endorsement: SkillEndorsement) -> Dict[str, Any]:
    endorser = db.get(User, endorsement.endorser_id)
    return {
        "id": endorsement.id,
        "endorser_id": endorsement.endorser_id,
        "endorser_name": f"{endorser.first_name} {endorser.last_name}".strip() if endorser else None,
        "endorsed_user_id": endorsement.endorsed_user_id,
        "skill": endorsement.skill,
        "note": endorsement.note or "",
        "created_at": iso(endorsement.created_at),
    }


def recommendation_to_dict(db: Session, recommendation: UserRecommendation) -> Dict[str, Any]:
    author = db.get(User, recommendation.author_id)
    return {
        "id": recommendation.id,
        "author_id": recommendation.author_id,
        "author_name": f"{author.first_name} {author.last_name}".strip() if author else None,
        "subject_user_id": recommendation.subject_user_id,
        "relationship": recommendation.relationship or "",
        "content": recommendation.content,
        "status": recommendation.status,
        "created_at": iso(recommendation.created_at),
        "updated_at": iso(recommendation.updated_at),
    }


def forum_topic_to_dict(db: Session, topic: ForumTopic) -> Dict[str, Any]:
    author = db.get(User, topic.created_by_id)
    return {
        "id": topic.id,
        "title": topic.title,
        "description": topic.description or "",
        "tags": topic.tags or [],
        "created_by_id": topic.created_by_id,
        "created_by_name": f"{author.first_name} {author.last_name}".strip() if author else None,
        "threads_count": db.query(ForumThread).filter(ForumThread.topic_id == topic.id).count(),
        "created_at": iso(topic.created_at),
        "updated_at": iso(topic.updated_at),
    }


def forum_thread_to_dict(db: Session, thread: ForumThread) -> Dict[str, Any]:
    author = db.get(User, thread.author_id)
    return {
        "id": thread.id,
        "topic_id": thread.topic_id,
        "title": thread.title,
        "body": thread.body,
        "tags": thread.tags or [],
        "author_id": thread.author_id,
        "author_name": f"{author.first_name} {author.last_name}".strip() if author else None,
        "best_reply_id": thread.best_reply_id,
        "upvotes": thread.upvotes,
        "downvotes": thread.downvotes,
        "status": thread.status,
        "replies_count": db.query(ForumReply).filter(ForumReply.thread_id == thread.id).count(),
        "created_at": iso(thread.created_at),
        "updated_at": iso(thread.updated_at),
    }


def forum_reply_to_dict(db: Session, reply: ForumReply) -> Dict[str, Any]:
    author = db.get(User, reply.author_id)
    return {
        "id": reply.id,
        "thread_id": reply.thread_id,
        "author_id": reply.author_id,
        "author_name": f"{author.first_name} {author.last_name}".strip() if author else None,
        "body": reply.body,
        "upvotes": reply.upvotes,
        "downvotes": reply.downvotes,
        "is_expert_answer": bool(reply.is_expert_answer),
        "created_at": iso(reply.created_at),
        "updated_at": iso(reply.updated_at),
    }


def knowledge_to_dict(db: Session, item: KnowledgeItem) -> Dict[str, Any]:
    author = db.get(User, item.created_by_id)
    return {
        "id": item.id,
        "title": item.title,
        "body": item.body,
        "item_type": item.item_type,
        "tags": item.tags or [],
        "url": item.url or "",
        "created_by_id": item.created_by_id,
        "created_by_name": f"{author.first_name} {author.last_name}".strip() if author else None,
        "status": item.status,
        "created_at": iso(item.created_at),
        "updated_at": iso(item.updated_at),
    }


def chat_room_to_dict(db: Session, room: ChatRoom) -> Dict[str, Any]:
    participants = db.query(ChatParticipant).filter(ChatParticipant.room_id == room.id).all()
    return {
        "id": room.id,
        "name": room.name or "",
        "room_type": room.room_type,
        "created_by_id": room.created_by_id,
        "participants": [membership_to_chat_dict(db, participant) for participant in participants],
        "created_at": iso(room.created_at),
        "updated_at": iso(room.updated_at),
    }


def membership_to_chat_dict(db: Session, participant: ChatParticipant) -> Dict[str, Any]:
    user = db.get(User, participant.user_id)
    return {
        "user_id": participant.user_id,
        "user_name": f"{user.first_name} {user.last_name}".strip() if user else None,
        "role": participant.role,
        "last_read_at": iso(participant.last_read_at),
    }


def learning_to_dict(item: LearningItem) -> Dict[str, Any]:
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description or "",
        "item_type": item.item_type,
        "skills": item.skills or [],
        "provider": item.provider or "",
        "url": item.url or "",
        "status": item.status,
        "created_by_id": item.created_by_id,
        "created_at": iso(item.created_at),
        "updated_at": iso(item.updated_at),
    }


def mentorship_profile_to_dict(db: Session, profile: MentorshipProfile) -> Dict[str, Any]:
    user = db.get(User, profile.user_id)
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "user_name": f"{user.first_name} {user.last_name}".strip() if user else None,
        "profile_type": profile.profile_type,
        "goals": profile.goals or "",
        "expertise": profile.expertise or [],
        "availability": profile.availability or "",
        "status": profile.status,
        "created_at": iso(profile.created_at),
        "updated_at": iso(profile.updated_at),
    }


def mentorship_session_to_dict(db: Session, session: MentorshipSession) -> Dict[str, Any]:
    mentor = db.get(User, session.mentor_id)
    mentee = db.get(User, session.mentee_id)
    return {
        "id": session.id,
        "mentor_id": session.mentor_id,
        "mentor_name": f"{mentor.first_name} {mentor.last_name}".strip() if mentor else None,
        "mentee_id": session.mentee_id,
        "mentee_name": f"{mentee.first_name} {mentee.last_name}".strip() if mentee else None,
        "scheduled_at": session.scheduled_at,
        "topic": session.topic,
        "notes": session.notes or "",
        "progress": session.progress or "",
        "status": session.status,
        "created_at": iso(session.created_at),
        "updated_at": iso(session.updated_at),
    }


def application_to_dict(db: Session, application: JobApplication) -> Dict[str, Any]:
    applicant = db.get(User, application.applicant_id)
    return {
        "id": application.id,
        "job_id": application.job_id,
        "applicant_id": application.applicant_id,
        "applicant_name": f"{applicant.first_name} {applicant.last_name}".strip() if applicant else None,
        "cover_note": application.cover_note or "",
        "resume_url": application.resume_url or "",
        "status": application.status,
        "created_at": iso(application.created_at),
        "updated_at": iso(application.updated_at),
    }


def job_alert_to_dict(alert: JobAlert) -> Dict[str, Any]:
    return {
        "id": alert.id,
        "user_id": alert.user_id,
        "query": alert.query or "",
        "filters": alert.filters or {},
        "is_active": bool(alert.is_active),
        "created_at": iso(alert.created_at),
        "updated_at": iso(alert.updated_at),
    }


def notification_setting_to_dict(setting: NotificationSetting) -> Dict[str, Any]:
    return {
        "id": setting.id,
        "user_id": setting.user_id,
        "push_enabled": bool(setting.push_enabled),
        "email_enabled": bool(setting.email_enabled),
        "sms_enabled": bool(setting.sms_enabled),
        "preferences": setting.preferences or {},
        "updated_at": iso(setting.updated_at),
    }


def badge_to_dict(db: Session, badge: UserBadge) -> Dict[str, Any]:
    user = db.get(User, badge.user_id)
    return {
        "id": badge.id,
        "user_id": badge.user_id,
        "user_name": f"{user.first_name} {user.last_name}".strip() if user else None,
        "badge_name": badge.badge_name,
        "description": badge.description or "",
        "awarded_by_id": badge.awarded_by_id,
        "created_at": iso(badge.created_at),
    }


def audit_to_dict(log: AuditLog) -> Dict[str, Any]:
    return {
        "id": log.id,
        "actor_id": log.actor_id,
        "action": log.action,
        "target_type": log.target_type,
        "target_id": log.target_id,
        "metadata": log.details or {},
        "created_at": iso(log.created_at),
    }


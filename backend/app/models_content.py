from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from app.database import Base


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(180), nullable=True, index=True)
    content = Column(Text, nullable=False)
    category = Column(String(80), nullable=False, default="General")
    content_type = Column(String(80), nullable=False, default="text")
    attachments = Column(JSON, nullable=True, default=list)
    poll_options = Column(JSON, nullable=True, default=list)
    hashtags = Column(JSON, nullable=True, default=list)
    mentions = Column(JSON, nullable=True, default=list)
    scheduled_at = Column(String(80), nullable=True)
    pinned = Column(Boolean, nullable=False, default=False)
    shared_post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=True)
    community_id = Column(Integer, ForeignKey("communities.id"), nullable=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    likes = Column(Integer, nullable=False, default=0)
    comments_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False, index=True)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    attachments = Column(JSON, nullable=True, default=list)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class DirectMessage(Base):
    __tablename__ = "direct_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    recipient_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id"), nullable=True, index=True)
    content = Column(Text, nullable=False)
    message_type = Column(String(40), nullable=False, default="text")
    attachment_url = Column(String(255), nullable=True)
    voice_url = Column(String(255), nullable=True)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class CommunityEvent(Base):
    __tablename__ = "community_events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(180), nullable=False, index=True)
    description = Column(Text, nullable=False)
    event_type = Column(String(80), nullable=False, default="Workshop")
    event_date = Column(String(80), nullable=False)
    location = Column(String(180), nullable=True)
    virtual_link = Column(String(255), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String(40), nullable=False, default="scheduled")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class EventRsvp(Base):
    __tablename__ = "event_rsvps"

    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("community_events.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    response = Column(String(40), nullable=False, default="going")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(180), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(80), nullable=False, default="general")
    is_read = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class ContentReport(Base):
    __tablename__ = "content_reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    content_type = Column(String(80), nullable=False)
    content_id = Column(Integer, nullable=False)
    reason = Column(Text, nullable=False)
    status = Column(String(40), nullable=False, default="open")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

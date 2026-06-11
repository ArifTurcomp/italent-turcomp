from fastapi import APIRouter
from app.routes_shared import *  # noqa: F401,F403

router = APIRouter()


@router.get("/api/forum/topics")
def list_forum_topics(tag: Optional[str] = None, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(ForumTopic)
    if tag:
        query = query.filter(cast(ForumTopic.tags, String).ilike(f"%{tag}%"))
    return {"items": [forum_topic_to_dict(db, topic) for topic in query.order_by(ForumTopic.created_at.desc()).all()]}


@router.post("/api/forum/topics")
def create_forum_topic(payload: ForumTopicPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    now = utc_now()
    topic = ForumTopic(**dump(payload), created_by_id=current_user.id, created_at=now, updated_at=now)
    db.add(topic)
    db.commit()
    db.refresh(topic)
    return forum_topic_to_dict(db, topic)


@router.get("/api/forum/threads")
def list_forum_threads(topic_id: Optional[int] = None, tag: Optional[str] = None, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(ForumThread)
    if topic_id:
        query = query.filter(ForumThread.topic_id == topic_id)
    if tag:
        query = query.filter(cast(ForumThread.tags, String).ilike(f"%{tag}%"))
    return {"items": [forum_thread_to_dict(db, thread) for thread in query.order_by(ForumThread.created_at.desc()).all()]}


@router.post("/api/forum/threads")
def create_forum_thread(payload: ForumThreadPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    if not db.get(ForumTopic, payload.topic_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Topic not found")
    now = utc_now()
    thread = ForumThread(**dump(payload), author_id=current_user.id, created_at=now, updated_at=now)
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return forum_thread_to_dict(db, thread)


@router.get("/api/forum/threads/{thread_id}/replies")
def list_forum_replies(thread_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.query(ForumReply).filter(ForumReply.thread_id == thread_id).order_by(ForumReply.created_at).all()
    return {"items": [forum_reply_to_dict(db, reply) for reply in rows]}


@router.post("/api/forum/threads/{thread_id}/replies")
def reply_to_forum_thread(thread_id: int, payload: ForumReplyPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    thread = db.get(ForumThread, thread_id)
    if not thread:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Thread not found")
    now = utc_now()
    reply = ForumReply(thread_id=thread_id, author_id=current_user.id, body=payload.body.strip(), is_expert_answer=payload.is_expert_answer, created_at=now, updated_at=now)
    db.add(reply)
    thread.updated_at = now
    db.commit()
    db.refresh(reply)
    return forum_reply_to_dict(db, reply)


@router.put("/api/forum/threads/{thread_id}/best-answer/{reply_id}")
def mark_best_answer(thread_id: int, reply_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    thread = db.get(ForumThread, thread_id)
    reply = db.get(ForumReply, reply_id)
    if not thread or not reply or reply.thread_id != thread_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Thread or reply not found")
    if thread.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot mark best answer")
    thread.best_reply_id = reply_id
    thread.status = "answered"
    thread.updated_at = utc_now()
    db.commit()
    db.refresh(thread)
    return forum_thread_to_dict(db, thread)


@router.post("/api/forum/{content_type}/{content_id}/vote")
def vote_forum_content(content_type: str, content_id: int, payload: Dict[str, str], _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    target = db.get(ForumThread if content_type == "thread" else ForumReply, content_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Forum content not found")
    if payload.get("vote", "up") == "down":
        target.downvotes += 1
    else:
        target.upvotes += 1
    target.updated_at = utc_now()
    db.commit()
    return forum_thread_to_dict(db, target) if content_type == "thread" else forum_reply_to_dict(db, target)


@router.get("/api/knowledge")
def list_knowledge_items(item_type: Optional[str] = None, tag: Optional[str] = None, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(KnowledgeItem)
    if item_type:
        query = query.filter(KnowledgeItem.item_type == item_type)
    if tag:
        query = query.filter(cast(KnowledgeItem.tags, String).ilike(f"%{tag}%"))
    return {"items": [knowledge_to_dict(db, item) for item in query.order_by(KnowledgeItem.created_at.desc()).all()]}


@router.post("/api/knowledge")
def create_knowledge_item(payload: KnowledgePayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    now = utc_now()
    item = KnowledgeItem(**dump(payload), created_by_id=current_user.id, created_at=now, updated_at=now)
    db.add(item)
    db.commit()
    db.refresh(item)
    return knowledge_to_dict(db, item)


@router.get("/api/chats")
def list_chat_rooms(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    room_ids = [row.room_id for row in db.query(ChatParticipant).filter(ChatParticipant.user_id == current_user.id).all()]
    rooms = db.query(ChatRoom).filter(ChatRoom.id.in_(room_ids)).order_by(ChatRoom.updated_at.desc()).all() if room_ids else []
    return {"items": [chat_room_to_dict(db, room) for room in rooms]}


@router.post("/api/chats")
def create_chat_room(payload: ChatRoomPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    now = utc_now()
    room = ChatRoom(name=(payload.name or "").strip(), room_type=payload.room_type, created_by_id=current_user.id, created_at=now, updated_at=now)
    db.add(room)
    db.commit()
    db.refresh(room)
    for user_id in set(payload.participant_ids + [current_user.id]):
        if db.get(User, user_id):
            db.add(ChatParticipant(room_id=room.id, user_id=user_id, role="owner" if user_id == current_user.id else "member", created_at=now))
    db.commit()
    return chat_room_to_dict(db, room)


@router.get("/api/chats/{room_id}/messages")
def list_chat_messages(room_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    participant = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id, ChatParticipant.user_id == current_user.id).first()
    if not participant:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chat not found")
    messages = db.query(DirectMessage).filter(DirectMessage.room_id == room_id).order_by(DirectMessage.created_at).all()
    return {"items": [message_to_dict(db, message) for message in messages]}


@router.post("/api/chats/{room_id}/messages")
def send_chat_message(room_id: int, payload: MessagePayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    participant = db.query(ChatParticipant).filter(ChatParticipant.room_id == room_id, ChatParticipant.user_id == current_user.id).first()
    if not participant:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chat not found")
    now = utc_now()
    message = DirectMessage(sender_id=current_user.id, recipient_id=payload.recipient_id or current_user.id, room_id=room_id, content=payload.content.strip(), message_type=payload.message_type, attachment_url=payload.attachment_url, voice_url=payload.voice_url, created_at=now, updated_at=now)
    room = db.get(ChatRoom, room_id)
    if room:
        room.updated_at = now
    db.add(message)
    db.commit()
    db.refresh(message)
    return message_to_dict(db, message)


@router.get("/api/messages/search")
def search_messages(q: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(DirectMessage).filter(DirectMessage.content.ilike(f"%{q}%"), or_(DirectMessage.sender_id == current_user.id, DirectMessage.recipient_id == current_user.id))
    return {"items": [message_to_dict(db, message) for message in query.order_by(DirectMessage.created_at.desc()).all()]}


@router.get("/api/learning")
def list_learning(item_type: Optional[str] = None, skill: Optional[str] = None, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(LearningItem)
    if item_type:
        query = query.filter(LearningItem.item_type == item_type)
    if skill:
        query = query.filter(cast(LearningItem.skills, String).ilike(f"%{skill}%"))
    return {"items": [learning_to_dict(item) for item in query.order_by(LearningItem.created_at.desc()).all()]}


@router.post("/api/learning")
def create_learning(payload: LearningPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    now = utc_now()
    item = LearningItem(**dump(payload), created_by_id=current_user.id, created_at=now, updated_at=now)
    db.add(item)
    db.commit()
    db.refresh(item)
    return learning_to_dict(item)


@router.post("/api/mentorship/profiles")
def upsert_mentorship_profile(payload: MentorshipProfilePayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    now = utc_now()
    profile = db.query(MentorshipProfile).filter(MentorshipProfile.user_id == current_user.id, MentorshipProfile.profile_type == payload.profile_type).first()
    if profile:
        for key, value in dump(payload).items():
            setattr(profile, key, value)
        profile.updated_at = now
    else:
        profile = MentorshipProfile(user_id=current_user.id, **dump(payload), created_at=now, updated_at=now)
        db.add(profile)
    db.commit()
    db.refresh(profile)
    return mentorship_profile_to_dict(db, profile)


@router.get("/api/mentorship/matches")
def mentorship_matches(skill: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(MentorshipProfile).filter(MentorshipProfile.profile_type == "mentor", MentorshipProfile.user_id != current_user.id)
    if skill:
        query = query.filter(cast(MentorshipProfile.expertise, String).ilike(f"%{skill}%"))
    return {"items": [mentorship_profile_to_dict(db, profile) for profile in query.limit(20).all()]}


@router.post("/api/mentorship/sessions")
def book_mentorship_session(payload: MentorshipSessionPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    if current_user.id not in {payload.mentor_id, payload.mentee_id} and current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cannot book for other users")
    now = utc_now()
    session = MentorshipSession(**dump(payload), created_at=now, updated_at=now)
    db.add(session)
    create_notification(db, payload.mentor_id, "Mentorship session booked", payload.topic, "mentorship")
    create_notification(db, payload.mentee_id, "Mentorship session booked", payload.topic, "mentorship")
    db.commit()
    db.refresh(session)
    return mentorship_session_to_dict(db, session)


@router.put("/api/mentorship/sessions/{session_id}/progress")
def update_mentorship_progress(session_id: int, payload: Dict[str, str], current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    session = db.get(MentorshipSession, session_id)
    if not session or (current_user.id not in {session.mentor_id, session.mentee_id} and current_user.role != "admin"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Session not found")
    session.progress = payload.get("progress", session.progress)
    session.status = payload.get("status", session.status)
    session.notes = payload.get("notes", session.notes)
    session.updated_at = utc_now()
    db.commit()
    db.refresh(session)
    return mentorship_session_to_dict(db, session)

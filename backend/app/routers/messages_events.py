from fastapi import APIRouter
from app.routes_shared import *  # noqa: F401,F403

router = APIRouter()

@router.get("/api/messages")
def list_messages(
    with_user_id: Optional[int] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = db.query(DirectMessage).filter(
        or_(DirectMessage.sender_id == current_user.id, DirectMessage.recipient_id == current_user.id)
    )
    if with_user_id:
        query = query.filter(
            or_(
                DirectMessage.sender_id == with_user_id,
                DirectMessage.recipient_id == with_user_id,
            )
        )
    query = query.order_by(DirectMessage.created_at.desc())
    return paginate(query, page, per_page, lambda message: message_to_dict(db, message))


@router.post("/api/messages")
def send_message(
    payload: MessagePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    if payload.recipient_id is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "recipient_id is required for direct messages")
    recipient = db.get(User, payload.recipient_id)
    if not recipient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recipient not found")
    now = utc_now()
    message = DirectMessage(
        sender_id=current_user.id,
        recipient_id=payload.recipient_id,
        room_id=payload.room_id,
        content=payload.content.strip(),
        message_type=payload.message_type,
        attachment_url=payload.attachment_url,
        voice_url=payload.voice_url,
        created_at=now,
        updated_at=now,
    )
    db.add(message)
    create_notification(
        db,
        payload.recipient_id,
        "New message",
        f"{current_user.first_name} sent you a message.",
        "message",
    )
    db.commit()
    db.refresh(message)
    return message_to_dict(db, message)


@router.put("/api/messages/{message_id}/read")
def mark_message_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    message = db.get(DirectMessage, message_id)
    if not message or message.recipient_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Message not found")
    message.read_at = utc_now()
    message.updated_at = message.read_at
    db.commit()
    db.refresh(message)
    return message_to_dict(db, message)


@router.get("/api/events")
def list_events(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    event_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = db.query(CommunityEvent)
    if event_type:
        query = query.filter(CommunityEvent.event_type == event_type)
    if status_filter:
        query = query.filter(CommunityEvent.status == status_filter)
    query = query.order_by(CommunityEvent.event_date, CommunityEvent.created_at.desc())
    return paginate(query, page, per_page, lambda event: event_to_dict(db, event))


@router.get("/api/events/{event_id}")
def get_event(
    event_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    event = db.get(CommunityEvent, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    return event_to_dict(db, event)


@router.post("/api/events")
def create_event(
    payload: EventPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    now = utc_now()
    event = CommunityEvent(
        **dump(payload),
        created_by_id=current_user.id,
        created_at=now,
        updated_at=now,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event_to_dict(db, event)


@router.put("/api/events/{event_id}")
def update_event(
    event_id: int,
    payload: EventPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    event = db.get(CommunityEvent, event_id)
    if not event or (event.created_by_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    for key, value in dump(payload).items():
        setattr(event, key, value)
    event.updated_at = utc_now()
    db.commit()
    db.refresh(event)
    return event_to_dict(db, event)


@router.delete("/api/events/{event_id}")
def delete_event(
    event_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    event = db.get(CommunityEvent, event_id)
    if not event or (event.created_by_id != current_user.id and current_user.role != "admin"):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    db.query(EventRsvp).filter(EventRsvp.event_id == event_id).delete()
    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}


@router.get("/api/events/{event_id}/rsvps")
def list_event_rsvps(
    event_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    event = db.get(CommunityEvent, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    query = db.query(EventRsvp).filter(EventRsvp.event_id == event_id).order_by(EventRsvp.created_at.desc())
    return paginate(query, page, per_page, lambda rsvp: rsvp_to_dict(db, rsvp))


@router.post("/api/events/{event_id}/rsvp")
def rsvp_event(
    event_id: int,
    payload: RsvpPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    event = db.get(CommunityEvent, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    now = utc_now()
    rsvp = db.query(EventRsvp).filter(EventRsvp.event_id == event_id, EventRsvp.user_id == current_user.id).first()
    if rsvp:
        rsvp.response = payload.response
        rsvp.updated_at = now
    else:
        rsvp = EventRsvp(
            event_id=event_id,
            user_id=current_user.id,
            response=payload.response,
            created_at=now,
            updated_at=now,
        )
        db.add(rsvp)
    if event.created_by_id != current_user.id:
        create_notification(
            db,
            event.created_by_id,
            "New event RSVP",
            f"{current_user.first_name} responded {payload.response} to {event.title}.",
            "event",
        )
    db.commit()
    db.refresh(rsvp)
    return rsvp_to_dict(db, rsvp)


@router.get("/api/notifications")
def list_notifications(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    if unread_only:
        query = query.filter(Notification.is_read == False)  # noqa: E712
    query = query.order_by(Notification.created_at.desc())
    return paginate(query, page, per_page, notification_to_dict)


@router.post("/api/notifications")
def create_manual_notification(
    payload: NotificationPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    require_admin(current_user)
    user = db.get(User, payload.user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    now = utc_now()
    notification = Notification(**dump(payload), is_read=False, created_at=now, updated_at=now)
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification_to_dict(notification)


@router.put("/api/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    notification = db.get(Notification, notification_id)
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    notification.is_read = True
    notification.updated_at = utc_now()
    db.commit()
    db.refresh(notification)
    return notification_to_dict(notification)


@router.put("/api/notifications/read-all")
def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, int]:
    updated = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)  # noqa: E712
        .update({"is_read": True, "updated_at": utc_now()})
    )
    db.commit()
    return {"updated": updated}

@router.get("/api/calendar/events")
def event_calendar(
    start: Optional[str] = None,
    end: Optional[str] = None,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = db.query(CommunityEvent)
    if start:
        query = query.filter(CommunityEvent.event_date >= start)
    if end:
        query = query.filter(CommunityEvent.event_date <= end)
    return {"items": [event_to_dict(db, event) for event in query.order_by(CommunityEvent.event_date).all()]}


@router.post("/api/events/{event_id}/reminder")
def create_event_reminder(
    event_id: int,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    event = db.get(CommunityEvent, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Event not found")
    reminder = Notification(
        user_id=current_user.id,
        title=f"Event reminder: {event.title}",
        message=payload.get("message", f"Reminder for {event.event_date}"),
        notification_type="event_reminder",
        is_read=False,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return notification_to_dict(reminder)



# pyrefly: ignore [missing-import]
from fastapi import APIRouter
from app.routes_shared import *  # noqa: F401,F403

router = APIRouter()


@router.get("/api/notifications/settings")
def get_notification_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    setting = db.query(NotificationSetting).filter(NotificationSetting.user_id == current_user.id).first()
    if not setting:
        setting = NotificationSetting(user_id=current_user.id, updated_at=utc_now())
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return notification_setting_to_dict(setting)


@router.put("/api/notifications/settings")
def update_notification_settings(payload: NotificationSettingPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    setting = db.query(NotificationSetting).filter(NotificationSetting.user_id == current_user.id).first()
    if not setting:
        setting = NotificationSetting(user_id=current_user.id)
        db.add(setting)
    for key, value in dump(payload).items():
        setattr(setting, key, value)
    setting.updated_at = utc_now()
    db.commit()
    db.refresh(setting)
    return notification_setting_to_dict(setting)


@router.get("/api/search")
def global_search(q: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    needle = f"%{q}%"
    users = db.query(User).filter(or_(User.first_name.ilike(needle), User.last_name.ilike(needle), User.email.ilike(needle), User.position.ilike(needle), cast(User.skills, String).ilike(needle))).limit(10).all()
    communities = db.query(CommunityGroup).filter(or_(CommunityGroup.name.ilike(needle), CommunityGroup.description.ilike(needle))).limit(10).all()
    posts = db.query(CommunityPost).filter(or_(CommunityPost.content.ilike(needle), CommunityPost.category.ilike(needle))).limit(10).all()
    events = db.query(CommunityEvent).filter(or_(CommunityEvent.title.ilike(needle), CommunityEvent.description.ilike(needle))).limit(10).all()
    jobs = db.query(Job).filter(or_(Job.title.ilike(needle), Job.description.ilike(needle), cast(Job.requirements, String).ilike(needle))).limit(10).all()
    return {"members": [public_user(user, db) for user in users], "communities": [community_group_to_dict(db, community) for community in communities], "posts": [post_to_dict(db, post) for post in posts], "events": [event_to_dict(db, event) for event in events], "jobs": [job_to_dict(db, job) for job in jobs]}


@router.post("/api/reputation/events")
def create_reputation_event(payload: ReputationPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_admin(current_user)
    event = ReputationEvent(**dump(payload), created_at=utc_now())
    db.add(event)
    create_notification(db, payload.user_id, "Reputation updated", f"{payload.points} points: {payload.reason}", "reputation")
    db.commit()
    db.refresh(event)
    return {"id": event.id, "user_id": event.user_id, "points": event.points, "reason": event.reason, "source_type": event.source_type, "source_id": event.source_id, "created_at": iso(event.created_at)}


@router.post("/api/reputation/badges")
def award_badge(payload: BadgePayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_admin(current_user)
    badge = UserBadge(user_id=payload.user_id, badge_name=payload.badge_name, description=payload.description, awarded_by_id=current_user.id, created_at=utc_now())
    db.add(badge)
    db.commit()
    db.refresh(badge)
    return badge_to_dict(db, badge)


@router.get("/api/reputation/leaderboard/top-contributors")
def top_contributors(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.query(ReputationEvent.user_id, func.coalesce(func.sum(ReputationEvent.points), 0).label("points")).group_by(ReputationEvent.user_id).order_by(text("points DESC")).limit(20).all()
    return {"items": [{"user": public_user(user, db), "points": points} for user_id, points in rows if (user := db.get(User, user_id))]}


@router.get("/api/reputation/{user_id}")
def get_reputation(user_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    points = db.query(func.coalesce(func.sum(ReputationEvent.points), 0)).filter(ReputationEvent.user_id == user_id).scalar() or 0
    badges = db.query(UserBadge).filter(UserBadge.user_id == user_id).order_by(UserBadge.created_at.desc()).all()
    level = "Expert" if points >= 500 else "Advanced" if points >= 200 else "Contributor" if points >= 50 else "Member"
    return {"user_id": user_id, "points": points, "expertise_level": level, "badges": [badge_to_dict(db, badge) for badge in badges]}


@router.get("/api/analytics/me")
def my_analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    posts = db.query(CommunityPost).filter(CommunityPost.author_id == current_user.id).all()
    return {"profile_views": 0, "post_reach": sum(post.likes + post.comments_count for post in posts), "engagement_metrics": {"posts": len(posts), "likes": sum(post.likes for post in posts), "comments": sum(post.comments_count for post in posts)}, "connection_growth": db.query(ConnectionRequest).filter(ConnectionRequest.status == "accepted", or_(ConnectionRequest.requester_id == current_user.id, ConnectionRequest.recipient_id == current_user.id)).count()}


@router.get("/api/analytics/communities/{community_id}")
def community_analytics(community_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_community_manager(db, current_user, community_id)
    posts = db.query(CommunityPost).filter(CommunityPost.community_id == community_id).all()
    return {"community_id": community_id, "active_members": db.query(CommunityMembership).filter(CommunityMembership.community_id == community_id, CommunityMembership.status == "active").count(), "popular_topics": sorted({post.category for post in posts}), "event_participation": db.query(EventRsvp).join(CommunityEvent, EventRsvp.event_id == CommunityEvent.id).count(), "community_growth": db.query(CommunityMembership).filter(CommunityMembership.community_id == community_id).count()}


@router.put("/api/admin/users/{user_id}/status")
def admin_update_user_status(user_id: int, payload: AdminStatusPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_admin(current_user)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    user.status = payload.status
    user.updated_at = utc_now()
    create_audit_log(db, current_user.id, "user.status.update", "user", user_id, {"status": payload.status})
    db.commit()
    db.refresh(user)
    return public_user(user, db)


@router.put("/api/admin/users/{user_id}/role")
def admin_update_user_role(user_id: int, payload: RolePayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_admin(current_user)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    user.role = payload.role
    user.updated_at = utc_now()
    create_audit_log(db, current_user.id, "user.role.update", "user", user_id, {"role": payload.role})
    db.commit()
    db.refresh(user)
    return public_user(user, db)


@router.post("/api/admin/moderation/spam-check")
def spam_check(payload: Dict[str, str], current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    require_admin(current_user)
    content = payload.get("content", "").lower()
    signals = [word for word in ["free money", "click here", "buy now", "urgent", "spam"] if word in content]
    return {"is_spam": bool(signals), "signals": signals, "score": min(1.0, len(signals) / 3)}


@router.get("/api/admin/audit-logs")
def list_audit_logs(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_admin(current_user)
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(100).all()
    return {"items": [audit_to_dict(row) for row in rows]}


@router.get("/api/ai/connection-suggestions")
def ai_connection_suggestions(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    from app.routers.networking import suggested_connections
    return suggested_connections(current_user, db)


@router.get("/api/ai/mentor-matches")
def ai_mentor_matches(skill: Optional[str] = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    from app.routers.forum_learning import mentorship_matches
    return mentorship_matches(skill, current_user, db)


@router.get("/api/ai/career-recommendations")
def ai_career_recommendations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    from app.routers.jobs import job_recommendations
    return job_recommendations(current_user, db)


@router.post("/api/ai/post-generation")
def ai_post_generation(payload: Dict[str, str], _: User = Depends(get_current_user)) -> Dict[str, str]:
    topic = payload.get("topic", "community update").strip()
    tone = payload.get("tone", "professional").strip()
    return {"draft": f"{topic.title()}: sharing a {tone} update with context, a clear question, and one concrete next step for the community."}


@router.post("/api/ai/post-summarization")
def ai_post_summarization(payload: Dict[str, str], _: User = Depends(get_current_user)) -> Dict[str, str]:
    words = payload.get("content", "").strip().split()
    return {"summary": " ".join(words[:32]) + ("..." if len(words) > 32 else "")}


@router.get("/api/ai/discussion-insights")
def ai_discussion_insights(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    categories = db.query(CommunityPost.category, func.count(CommunityPost.id)).group_by(CommunityPost.category).all()
    return {"popular_categories": [{"category": category, "posts": count} for category, count in categories]}


@router.get("/api/ai/knowledge-search")
def ai_knowledge_search(q: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    from app.routers.forum_learning import list_knowledge_items
    return list_knowledge_items(None, q, current_user, db)

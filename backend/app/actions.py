from typing import Any, Dict, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models import *  # noqa: F401,F403
from app.utils import utc_now
def create_notification(
    db: Session,
    user_id: Optional[int],
    title: str,
    message: str,
    notification_type: str = "general",
) -> None:
    if not user_id:
        return
    now = utc_now()
    db.add(
        Notification(
            user_id=user_id,
            title=title,
            message=message,
            notification_type=notification_type,
            is_read=False,
            created_at=now,
            updated_at=now,
        )
    )


def create_audit_log(
    db: Session,
    actor_id: Optional[int],
    action: str,
    target_type: Optional[str] = None,
    target_id: Optional[int] = None,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    db.add(
        AuditLog(
            actor_id=actor_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details or {},
            created_at=utc_now(),
        )
    )


def require_community_manager(db: Session, user: User, community_id: int) -> None:
    if user.role == "admin":
        return
    membership = (
        db.query(CommunityMembership)
        .filter(CommunityMembership.community_id == community_id, CommunityMembership.user_id == user.id)
        .first()
    )
    if not membership or membership.role not in {"owner", "admin", "moderator"} or membership.status != "active":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Community moderator access required")


def require_admin(user: User) -> None:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")


def paginate(query, page: int, per_page: int, mapper) -> Dict[str, Any]:
    total = query.count()
    rows = query.offset((page - 1) * per_page).limit(per_page).all()
    pages = max(1, (total + per_page - 1) // per_page)
    return {
        "items": [mapper(row) for row in rows],
        "pagination": {"page": page, "per_page": per_page, "total": total, "pages": pages},
    }


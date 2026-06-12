from fastapi import APIRouter
from app.routes_shared import *  # noqa: F401,F403

router = APIRouter()


@router.get("/api/communities")
def list_communities(page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), category: Optional[str] = None, search: Optional[str] = None, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(CommunityGroup)
    if category:
        query = query.filter(CommunityGroup.category == category)
    if search:
        needle = f"%{search}%"
        query = query.filter(or_(CommunityGroup.name.ilike(needle), CommunityGroup.description.ilike(needle)))
    query = query.order_by(CommunityGroup.name)
    return paginate(query, page, per_page, lambda community: community_group_to_dict(db, community))


@router.get("/api/communities/categories")
def list_community_categories(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.query(CommunityGroup.category).distinct().order_by(CommunityGroup.category).all()
    return {"items": [row[0] for row in rows]}


@router.post("/api/communities")
def create_community_group(payload: CommunityGroupPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    now = utc_now()
    community = CommunityGroup(**dump(payload), owner_id=current_user.id, created_at=now, updated_at=now)
    db.add(community)
    db.commit()
    db.refresh(community)
    db.add(CommunityMembership(community_id=community.id, user_id=current_user.id, role="owner", status="active", created_at=now, updated_at=now))
    create_audit_log(db, current_user.id, "community.create", "community", community.id)
    db.commit()
    return community_group_to_dict(db, community)


@router.get("/api/communities/{community_id}")
def get_community_group(community_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    community = db.get(CommunityGroup, community_id)
    if not community:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Community not found")
    return community_group_to_dict(db, community)


@router.put("/api/communities/{community_id}")
def update_community_group(community_id: int, payload: CommunityGroupPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    community = db.get(CommunityGroup, community_id)
    if not community:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Community not found")
    require_community_manager(db, current_user, community_id)
    for key, value in dump(payload).items():
        setattr(community, key, value)
    community.updated_at = utc_now()
    create_audit_log(db, current_user.id, "community.update", "community", community.id)
    db.commit()
    db.refresh(community)
    return community_group_to_dict(db, community)


@router.post("/api/communities/{community_id}/join")
def join_community(community_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    community = db.get(CommunityGroup, community_id)
    if not community:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Community not found")
    now = utc_now()
    status_value = "pending" if community.privacy == "private" else "active"
    membership = db.query(CommunityMembership).filter(CommunityMembership.community_id == community_id, CommunityMembership.user_id == current_user.id).first()
    if membership:
        membership.status = status_value
        membership.updated_at = now
    else:
        membership = CommunityMembership(community_id=community_id, user_id=current_user.id, role="member", status=status_value, created_at=now, updated_at=now)
        db.add(membership)
    db.commit()
    db.refresh(membership)
    return membership_to_dict(db, membership)


@router.post("/api/communities/{community_id}/leave")
def leave_community(community_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, str]:
    membership = db.query(CommunityMembership).filter(CommunityMembership.community_id == community_id, CommunityMembership.user_id == current_user.id).first()
    if not membership:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Membership not found")
    membership.status = "left"
    membership.updated_at = utc_now()
    db.commit()
    return {"message": "Left community"}


@router.get("/api/communities/{community_id}/members")
def list_community_members(community_id: int, page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100), status_filter: Optional[str] = Query(None, alias="status"), _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    query = db.query(CommunityMembership).filter(CommunityMembership.community_id == community_id)
    if status_filter:
        query = query.filter(CommunityMembership.status == status_filter)
    query = query.order_by(CommunityMembership.created_at.desc())
    return paginate(query, page, per_page, lambda membership: membership_to_dict(db, membership))


@router.post("/api/communities/{community_id}/members")
def invite_community_member(community_id: int, payload: MembershipPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_community_manager(db, current_user, community_id)
    if not db.get(User, payload.user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    now = utc_now()
    membership = db.query(CommunityMembership).filter(CommunityMembership.community_id == community_id, CommunityMembership.user_id == payload.user_id).first()
    if membership:
        membership.role = payload.role
        membership.status = payload.status
        membership.invited_by_id = current_user.id
        membership.updated_at = now
    else:
        membership = CommunityMembership(community_id=community_id, user_id=payload.user_id, role=payload.role, status=payload.status, invited_by_id=current_user.id, created_at=now, updated_at=now)
        db.add(membership)
    create_notification(db, payload.user_id, "Community invitation", "You were invited to a community.", "community")
    create_audit_log(db, current_user.id, "community.member.upsert", "community", community_id, {"user_id": payload.user_id})
    db.commit()
    db.refresh(membership)
    return membership_to_dict(db, membership)


@router.put("/api/communities/{community_id}/members/{user_id}/role")
def update_community_member_role(community_id: int, user_id: int, payload: RolePayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_community_manager(db, current_user, community_id)
    membership = db.query(CommunityMembership).filter(CommunityMembership.community_id == community_id, CommunityMembership.user_id == user_id).first()
    if not membership:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Membership not found")
    membership.role = payload.role
    membership.updated_at = utc_now()
    db.commit()
    db.refresh(membership)
    return membership_to_dict(db, membership)


@router.put("/api/communities/{community_id}/members/{user_id}/status")
def update_community_member_status(community_id: int, user_id: int, payload: AdminStatusPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_community_manager(db, current_user, community_id)
    membership = db.query(CommunityMembership).filter(CommunityMembership.community_id == community_id, CommunityMembership.user_id == user_id).first()
    if not membership:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Membership not found")
    membership.status = payload.status
    membership.updated_at = utc_now()
    create_audit_log(db, current_user.id, f"community.member.{payload.status}", "community", community_id, {"user_id": user_id})
    db.commit()
    db.refresh(membership)
    return membership_to_dict(db, membership)


@router.post("/api/communities/{community_id}/announcements")
def create_community_announcement(community_id: int, payload: CommunityPayload, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    require_community_manager(db, current_user, community_id)
    now = utc_now()
    post_data = dump(payload)
    post_data["category"] = "Announcement"
    post_data["community_id"] = community_id
    post = CommunityPost(**post_data, author_id=current_user.id, likes=0, comments_count=0, pinned=True, created_at=now, updated_at=now)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post_to_dict(db, post, current_user.id)

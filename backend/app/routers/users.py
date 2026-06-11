from fastapi import APIRouter
from app.routes_shared import *  # noqa: F401,F403

router = APIRouter()

@router.get("/api/users")
def list_users(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    return {"items": [public_user(user) for user in db.query(User).order_by(User.id).all()]}


@router.get("/api/users/me")
def me(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    return public_user(current_user)


@router.put("/api/users/me")
def update_me(
    payload: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    current_user.first_name = payload.first_name.strip()
    current_user.last_name = payload.last_name.strip()
    current_user.phone = payload.phone.strip()
    current_user.position = payload.position.strip()
    current_user.skills = payload.skills
    current_user.notes = (payload.notes or "").strip()
    current_user.department_id = payload.department_id
    current_user.updated_at = utc_now()
    db.commit()
    db.refresh(current_user)
    return public_user(current_user)

@router.put("/api/users/me/profile")
def update_extended_profile(
    payload: ExtendedProfilePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    for key, value in dump(payload).items():
        setattr(current_user, key, value.strip() if isinstance(value, str) else value)
    current_user.updated_at = utc_now()
    db.commit()
    db.refresh(current_user)
    return public_user(current_user)


@router.put("/api/users/me/privacy")
def update_privacy_settings(
    payload: PrivacyPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    current_user.privacy_settings = payload.privacy_settings
    current_user.updated_at = utc_now()
    db.commit()
    db.refresh(current_user)
    return public_user(current_user)


@router.get("/api/users/{user_id}/profile")
def get_user_profile(user_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return public_user(user)


@router.post("/api/users/{user_id}/follow")
def follow_user(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, str]:
    if user_id == current_user.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot follow yourself")
    if not db.get(User, user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    existing = db.query(UserFollow).filter(UserFollow.follower_id == current_user.id, UserFollow.followed_id == user_id).first()
    if not existing:
        db.add(UserFollow(follower_id=current_user.id, followed_id=user_id, created_at=utc_now()))
        db.commit()
    return {"message": "Followed"}


@router.delete("/api/users/{user_id}/follow")
def unfollow_user(user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, str]:
    existing = db.query(UserFollow).filter(UserFollow.follower_id == current_user.id, UserFollow.followed_id == user_id).first()
    if existing:
        db.delete(existing)
        db.commit()
    return {"message": "Unfollowed"}


@router.post("/api/users/{user_id}/endorse")
def endorse_user_skill(
    user_id: int,
    payload: EndorsementPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    if not db.get(User, user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    endorsement = SkillEndorsement(
        endorser_id=current_user.id,
        endorsed_user_id=user_id,
        skill=payload.skill.strip(),
        note=(payload.note or "").strip(),
        created_at=utc_now(),
    )
    db.add(endorsement)
    create_notification(db, user_id, "New skill endorsement", f"{current_user.first_name} endorsed {payload.skill}.", "endorsement")
    db.commit()
    db.refresh(endorsement)
    return endorsement_to_dict(db, endorsement)


@router.get("/api/users/{user_id}/endorsements")
def list_user_endorsements(user_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.query(SkillEndorsement).filter(SkillEndorsement.endorsed_user_id == user_id).order_by(SkillEndorsement.created_at.desc()).all()
    return {"items": [endorsement_to_dict(db, row) for row in rows]}


@router.post("/api/users/{user_id}/recommendations")
def write_user_recommendation(
    user_id: int,
    payload: RecommendationPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    if not db.get(User, user_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    now = utc_now()
    recommendation = UserRecommendation(
        author_id=current_user.id,
        subject_user_id=user_id,
        relationship=(payload.relationship or "").strip(),
        content=payload.content.strip(),
        created_at=now,
        updated_at=now,
    )
    db.add(recommendation)
    db.commit()
    db.refresh(recommendation)
    return recommendation_to_dict(db, recommendation)


@router.get("/api/users/{user_id}/recommendations")
def list_user_recommendations(user_id: int, _: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    rows = db.query(UserRecommendation).filter(UserRecommendation.subject_user_id == user_id).order_by(UserRecommendation.created_at.desc()).all()
    return {"items": [recommendation_to_dict(db, row) for row in rows]}



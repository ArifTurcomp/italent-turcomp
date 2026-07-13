from fastapi import APIRouter
from sqlalchemy.exc import IntegrityError

from app.routes_shared import *  # noqa: F401,F403

router = APIRouter()


def _validate_department_id(db: Session, department_id: int | None) -> None:
    if department_id is not None and not db.get(Department, department_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Choose a valid group.")

@router.post("/api/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if "$" not in user.password:
        user.password = hash_password(payload.password)
        user.updated_at = utc_now()
        db.commit()
    return issue_tokens(db, user)


@router.post("/api/auth/password-reset/request")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)) -> Dict[str, str]:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user:
        token = uuid4().hex
        expires_at = utc_now() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
        db.add(AuthToken(token=token, user_id=user.id, token_type="password_reset", expires_at=expires_at))
        db.commit()
        send_password_reset_email(user.email, token)
    return {"message": "If that email is registered, a reset token has been sent."}


@router.post("/api/auth/password-reset/confirm")
def confirm_password_reset(payload: PasswordResetConfirmRequest, db: Session = Depends(get_db)) -> Dict[str, str]:
    token = db.get(AuthToken, payload.token)
    if not token or token.token_type != "password_reset" or token.expires_at < utc_now():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired reset token")

    user = db.get(User, token.user_id)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired reset token")

    user.password = hash_password(payload.password)
    user.updated_at = utc_now()
    db.delete(token)
    db.commit()
    return {"message": "Password has been reset. You can now sign in."}


@router.post("/api/auth/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    if not payload.terms_accepted:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You must accept the Terms & Conditions to register.")
    if db.query(User).filter(or_(User.email == payload.email.lower(), User.username == payload.username)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username is already registered")
    _validate_department_id(db, payload.department_id)
    now = utc_now()
    user = User(
        username=payload.username.strip(),
        email=payload.email.lower(),
        password=hash_password(payload.password),
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        phone=payload.phone.strip(),
        position=payload.position.strip(),
        skills=payload.skills,
        notes=(payload.notes or "").strip(),
        gender=payload.gender.strip().lower(),
        marital_status=payload.marital_status.strip().lower(),
        status="active",
        job_status=(payload.job_status or "not_specified").strip(),
        offers_free_coaching=payload.offers_free_coaching,
        offers_free_counselling=payload.offers_free_counselling,
        requests_free_coaching=payload.requests_free_coaching,
        requests_free_counselling=payload.requests_free_counselling,
        role=payload.role,
        department_id=payload.department_id,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username is already registered") from exc
    db.refresh(user)
    return issue_tokens(db, user)


@router.post("/api/auth/refresh")
def refresh(payload: Dict[str, str], db: Session = Depends(get_db)) -> Dict[str, Any]:
    token = db.get(AuthToken, payload.get("refresh_token", ""))
    if not token or token.token_type != "refresh" or token.expires_at < utc_now():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    user = db.get(User, token.user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return issue_tokens(db, user)


@router.post("/api/auth/logout")
def logout(_: User = Depends(get_current_user)) -> Dict[str, str]:
    return {"message": "Logged out"}

@router.post("/api/auth/social-login")
def social_login(payload: SocialLoginPayload, db: Session = Depends(get_db)) -> Dict[str, Any]:
    now = utc_now()
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user:
        _validate_department_id(db, payload.department_id)
        base_username = payload.username or payload.email.split("@", 1)[0]
        username = base_username
        suffix = 1
        while db.query(User).filter(User.username == username).first():
            suffix += 1
            username = f"{base_username}{suffix}"
        user = User(
            username=username,
            email=payload.email.lower(),
            password=hash_password(uuid4().hex),
            first_name=payload.first_name.strip(),
            last_name=payload.last_name.strip(),
            phone="",
            position=(payload.position or "").strip(),
            skills=[],
            notes=f"Social login via {payload.provider}:{payload.provider_user_id}",
            role="user",
            department_id=payload.department_id,
            email_verified=True,
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        try:
            db.commit()
        except IntegrityError as exc:
            db.rollback()
            raise HTTPException(status.HTTP_409_CONFLICT, "Email or username is already registered") from exc
        db.refresh(user)
    return issue_tokens(db, user)


@router.post("/api/auth/email-verification/request")
def request_email_verification(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, str]:
    token = uuid4().hex
    db.add(
        AuthToken(
            token=token,
            user_id=current_user.id,
            token_type="email_verify",
            expires_at=utc_now() + timedelta(hours=24),
        )
    )
    create_notification(db, current_user.id, "Email verification requested", f"Verification token: {token}", "system")
    db.commit()
    return {"message": "Verification token created.", "token": token if APP_ENV != "production" else ""}


@router.post("/api/auth/email-verification/confirm")
def confirm_email_verification(payload: Dict[str, str], db: Session = Depends(get_db)) -> Dict[str, str]:
    token = db.get(AuthToken, payload.get("token", ""))
    if not token or token.token_type != "email_verify" or token.expires_at < utc_now():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired verification token")
    user = db.get(User, token.user_id)
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid verification token")
    user.email_verified = True
    user.updated_at = utc_now()
    db.delete(token)
    db.commit()
    return {"message": "Email verified"}


@router.put("/api/auth/2fa")
def update_two_factor(
    payload: TwoFactorPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    current_user.two_factor_enabled = payload.enabled
    current_user.updated_at = utc_now()
    db.commit()
    db.refresh(current_user)
    return public_user(current_user)


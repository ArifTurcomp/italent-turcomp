import base64
import hashlib
import hmac
import smtplib
from datetime import timedelta
from email.message import EmailMessage
from secrets import token_bytes
from typing import Any, Dict, Optional
from uuid import uuid4

# pyrefly: ignore [missing-import]
from fastapi import Depends, Header, HTTPException, status
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

from app.config import PASSWORD_HASH_ITERATIONS, RESET_TOKEN_EXPIRE_MINUTES, SMTP_FROM_EMAIL, SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USERNAME, SMTP_USE_TLS
from app.dependencies import get_db
from app.models import AuthToken, User
from app.serializers import public_user
from app.utils import utc_now
def hash_password(password: str) -> str:
    salt = token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PASSWORD_HASH_ITERATIONS)
    salt_value = base64.urlsafe_b64encode(salt).decode("ascii")
    hash_value = base64.urlsafe_b64encode(digest).decode("ascii")
    return f"pbkdf2_sha256${PASSWORD_HASH_ITERATIONS}${salt_value}${hash_value}"


def verify_password(password: str, stored_password: str) -> bool:
    parts = stored_password.split("$")
    if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
        return hmac.compare_digest(stored_password, password)

    _, iterations, salt_value, hash_value = parts
    try:
        salt = base64.urlsafe_b64decode(salt_value.encode("ascii"))
        expected = base64.urlsafe_b64decode(hash_value.encode("ascii"))
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, int(iterations))
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(digest, expected)
def issue_tokens(db: Session, user: User) -> Dict[str, Any]:
    access_token = uuid4().hex
    refresh_token = uuid4().hex
    expires_at = utc_now() + timedelta(hours=8)
    db.add(AuthToken(token=access_token, user_id=user.id, token_type="access", expires_at=expires_at))
    db.add(
        AuthToken(
            token=refresh_token,
            user_id=user.id,
            token_type="refresh",
            expires_at=expires_at + timedelta(days=14),
        )
    )
    db.commit()
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": public_user(user, db),
    }


def send_password_reset_email(email: str, token: str) -> None:
    subject = "Turcomp iTalent password reset"
    body = (
        "A password reset was requested for your Turcomp iTalent account.\n\n"
        f"Reset token: {token}\n\n"
        f"This token expires in {RESET_TOKEN_EXPIRE_MINUTES} minutes. "
        "If you did not request this reset, you can ignore this email."
    )

    if not SMTP_HOST:
        print(f"Password reset token for {email}: {token}")
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = SMTP_FROM_EMAIL
    message["To"] = email
    message.set_content(body)

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
        if SMTP_USE_TLS:
            smtp.starttls()
        if SMTP_USERNAME:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(message)


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Missing bearer token")
    token_value = authorization.split(" ", 1)[1]
    token = db.get(AuthToken, token_value)
    if not token or token.token_type != "access" or token.expires_at < utc_now():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    user = db.get(User, token.user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return user

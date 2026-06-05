import base64
import hashlib
import hmac
import os
import smtplib
import time
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from secrets import token_bytes
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import Depends, FastAPI, Header, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import JSON, Column, DateTime, ForeignKey, Integer, String, Text, create_engine, inspect, or_, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://italent:italent_password@localhost:3306/italent_db",
)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)
DATABASE_DIALECT = DATABASE_URL.split(":", 1)[0].split("+", 1)[0]
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:19006,http://localhost:8081,http://localhost:3000",
    ).split(",")
    if origin.strip()
]
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", "").strip() or None
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USERNAME or "no-reply@turcomp.local")
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
RESET_TOKEN_EXPIRE_MINUTES = int(os.getenv("RESET_TOKEN_EXPIRE_MINUTES", "30"))
PASSWORD_HASH_ITERATIONS = int(os.getenv("PASSWORD_HASH_ITERATIONS", "210000"))
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
SEED_DATABASE = os.getenv("SEED_DATABASE", "true" if APP_ENV != "production" else "false").lower() == "true"
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "" if APP_ENV == "production" else "password123")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    first_name = Column(String(120), nullable=False)
    last_name = Column(String(120), nullable=False)
    phone = Column(String(80), nullable=True)
    position = Column(String(160), nullable=True)
    skills = Column(JSON, nullable=True, default=list)
    notes = Column(Text, nullable=True)
    role = Column(String(40), nullable=False, default="user")
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    leader_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(160), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(80), nullable=True)
    position = Column(String(160), nullable=False)
    skills = Column(JSON, nullable=False, default=list)
    notes = Column(Text, nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(40), nullable=False, default="active")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(180), nullable=False, index=True)
    description = Column(Text, nullable=False)
    requirements = Column(JSON, nullable=False, default=list)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(40), nullable=False, default="open")
    posted_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    closing_date = Column(String(80), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    content = Column(Text, nullable=False)
    category = Column(String(80), nullable=False, default="General")
    author_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    likes = Column(Integer, nullable=False, default=0)
    comments_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    token = Column(String(80), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_type = Column(String(20), nullable=False)
    expires_at = Column(DateTime, nullable=False)


app = FastAPI(
    title="Turcomp iTalent API",
    description="FastAPI backend for the Turcomp iTalent talent management app.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["*"],
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str = Field(min_length=16)
    password: str = Field(min_length=8)


class RegisterRequest(LoginRequest):
    username: str = Field(min_length=2)
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    position: str = Field(min_length=1)
    skills: List[str] = Field(default_factory=list)
    notes: Optional[str] = ""
    role: str = "user"
    department_id: int


class ProfileUpdateRequest(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    phone: str = Field(min_length=1)
    position: str = Field(min_length=1)
    skills: List[str] = Field(default_factory=list)
    notes: Optional[str] = ""
    department_id: int


class DepartmentPayload(BaseModel):
    name: str
    description: Optional[str] = ""
    leader_id: Optional[int] = None


class ContactPayload(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = ""
    position: str
    skills: List[str] = Field(default_factory=list)
    notes: Optional[str] = ""
    department_id: Optional[int] = None
    status: str = "active"


class JobPayload(BaseModel):
    title: str
    description: str
    requirements: List[str] = Field(default_factory=list)
    department_id: Optional[int] = None
    status: str = "open"
    closing_date: Optional[str] = None


class CommunityPayload(BaseModel):
    content: str
    category: str = "General"


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc).isoformat()


def dump(model: BaseModel) -> Dict[str, Any]:
    return model.model_dump(exclude_none=True)


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


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
        "role": user.role,
        "department_id": user.department_id,
        "created_at": iso(user.created_at),
        "updated_at": iso(user.updated_at),
    }


def department_to_dict(department: Department) -> Dict[str, Any]:
    return {
        "id": department.id,
        "name": department.name,
        "description": department.description,
        "leader_id": department.leader_id,
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
        "department_id": job.department_id,
        "department": department.name if department else None,
        "created_by_id": job.created_by_id,
        "status": job.status,
        "posted_date": iso(job.posted_date),
        "closing_date": job.closing_date,
        "created_at": iso(job.created_at),
        "updated_at": iso(job.updated_at),
    }


def post_to_dict(post: CommunityPost) -> Dict[str, Any]:
    return {
        "id": post.id,
        "content": post.content,
        "category": post.category,
        "author_id": post.author_id,
        "likes": post.likes,
        "comments_count": post.comments_count,
        "created_at": iso(post.created_at),
        "updated_at": iso(post.updated_at),
    }


def paginate(query, page: int, per_page: int, mapper) -> Dict[str, Any]:
    total = query.count()
    rows = query.offset((page - 1) * per_page).limit(per_page).all()
    pages = max(1, (total + per_page - 1) // per_page)
    return {
        "items": [mapper(row) for row in rows],
        "pagination": {"page": page, "per_page": per_page, "total": total, "pages": pages},
    }


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
        "user": public_user(user),
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


def migrate_user_profile_columns() -> None:
    inspector = inspect(engine)
    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    if DATABASE_DIALECT == "postgresql":
        column_statements = {
            "phone": "ALTER TABLE users ADD COLUMN phone VARCHAR(80)",
            "position": "ALTER TABLE users ADD COLUMN position VARCHAR(160)",
            "skills": "ALTER TABLE users ADD COLUMN skills JSON",
            "notes": "ALTER TABLE users ADD COLUMN notes TEXT",
        }
    else:
        column_statements = {
            "phone": "ALTER TABLE users ADD COLUMN phone VARCHAR(80) NULL",
            "position": "ALTER TABLE users ADD COLUMN position VARCHAR(160) NULL",
            "skills": "ALTER TABLE users ADD COLUMN skills JSON NULL",
            "notes": "ALTER TABLE users ADD COLUMN notes TEXT NULL",
        }

    with engine.begin() as connection:
        for column_name, statement in column_statements.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))


def init_database() -> None:
    last_error: Optional[Exception] = None
    for _ in range(30):
        try:
            Base.metadata.create_all(bind=engine)
            migrate_user_profile_columns()
            if SEED_DATABASE:
                with SessionLocal() as db:
                    seed_database(db)
            return
        except Exception as exc:  # pragma: no cover - startup retry for containerized MySQL
            last_error = exc
            time.sleep(2)
    raise RuntimeError(f"Database did not become ready: {last_error}")


def seed_database(db: Session) -> None:
    if APP_ENV == "production" and not DEFAULT_ADMIN_PASSWORD:
        raise RuntimeError("DEFAULT_ADMIN_PASSWORD must be set when seeding a production database")

    now = utc_now()
    if db.query(Department).count() == 0:
        db.add_all(
            [
                Department(
                    id=1,
                    name="Engineering",
                    description="Cloud, product, and platform engineering.",
                    leader_id=1,
                    created_at=now,
                    updated_at=now,
                ),
                Department(
                    id=2,
                    name="Marketing",
                    description="Brand, campaigns, and digital growth.",
                    leader_id=2,
                    created_at=now,
                    updated_at=now,
                ),
                Department(
                    id=3,
                    name="Operations",
                    description="Delivery, process improvement, and field coordination.",
                    leader_id=3,
                    created_at=now,
                    updated_at=now,
                ),
            ]
        )
        db.commit()

    if db.query(User).count() == 0:
        db.add(
            User(
                id=1,
                username="admin",
                email="admin@turcomp.com",
                password=hash_password(DEFAULT_ADMIN_PASSWORD),
                first_name="Turcomp",
                last_name="Admin",
                phone="+60 3-0000 0000",
                position="Administrator",
                skills=["Talent Operations", "Coordination"],
                notes="Seeded administrator account.",
                role="admin",
                department_id=1,
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    if db.query(Contact).count() == 0:
        db.add_all(
            [
                Contact(
                    name="Ahmad Hassan",
                    email="ahmad@turcomp.com",
                    phone="+60 3-1234 5678",
                    position="Senior Software Engineer",
                    skills=["Python", "AWS", "Leadership"],
                    notes="Strong backend lead for cloud migration work.",
                    department_id=1,
                    created_by_id=1,
                    status="active",
                    created_at=now,
                    updated_at=now,
                ),
                Contact(
                    name="Siti Nurhaliza",
                    email="siti@turcomp.com",
                    phone="+60 3-2234 5678",
                    position="Marketing Manager",
                    skills=["Content Strategy", "Analytics", "Leadership"],
                    notes="Experienced with cross-channel campaign execution.",
                    department_id=2,
                    created_by_id=1,
                    status="active",
                    created_at=now,
                    updated_at=now,
                ),
            ]
        )
        db.commit()

    if db.query(Job).count() == 0:
        db.add(
            Job(
                title="Senior Software Engineer",
                description="Lead backend services and cloud platform delivery.",
                requirements=["Python", "AWS", "5+ years"],
                department_id=1,
                created_by_id=1,
                status="open",
                posted_date=now,
                created_at=now,
                updated_at=now,
            )
        )
        db.commit()

    if db.query(CommunityPost).count() == 0:
        db.add(
            CommunityPost(
                content="Engineering is looking for cloud migration contributors.",
                category="Opportunity",
                author_id=1,
                likes=4,
                comments_count=0,
                created_at=now,
                updated_at=now,
            )
        )
    db.commit()


@app.on_event("startup")
def startup() -> None:
    init_database()


@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "database": DATABASE_DIALECT}


@app.post("/api/auth/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if "$" not in user.password:
        user.password = hash_password(payload.password)
        user.updated_at = utc_now()
        db.commit()
    return issue_tokens(db, user)


@app.post("/api/auth/password-reset/request")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)) -> Dict[str, str]:
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user:
        token = uuid4().hex
        expires_at = utc_now() + timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES)
        db.add(AuthToken(token=token, user_id=user.id, token_type="password_reset", expires_at=expires_at))
        db.commit()
        send_password_reset_email(user.email, token)
    return {"message": "If that email is registered, a reset token has been sent."}


@app.post("/api/auth/password-reset/confirm")
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


@app.post("/api/auth/register")
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> Dict[str, Any]:
    if db.query(User).filter(or_(User.email == payload.email.lower(), User.username == payload.username)).first():
        raise HTTPException(status.HTTP_409_CONFLICT, "Email or username is already registered")
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
        role=payload.role,
        department_id=payload.department_id,
        created_at=now,
        updated_at=now,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return issue_tokens(db, user)


@app.post("/api/auth/refresh")
def refresh(payload: Dict[str, str], db: Session = Depends(get_db)) -> Dict[str, Any]:
    token = db.get(AuthToken, payload.get("refresh_token", ""))
    if not token or token.token_type != "refresh" or token.expires_at < utc_now():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid refresh token")
    user = db.get(User, token.user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User no longer exists")
    return issue_tokens(db, user)


@app.post("/api/auth/logout")
def logout(_: User = Depends(get_current_user)) -> Dict[str, str]:
    return {"message": "Logged out"}


@app.get("/api/users")
def list_users(_: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Dict[str, Any]:
    return {"items": [public_user(user) for user in db.query(User).order_by(User.id).all()]}


@app.get("/api/users/me")
def me(current_user: User = Depends(get_current_user)) -> Dict[str, Any]:
    return public_user(current_user)


@app.put("/api/users/me")
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


@app.get("/api/departments")
def list_departments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = db.query(Department).order_by(Department.name)
    return paginate(query, page, per_page, department_to_dict)


@app.get("/api/departments/{department_id}")
def get_department(
    department_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    department = db.get(Department, department_id)
    if not department:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    return department_to_dict(department)


@app.post("/api/departments")
def create_department(
    payload: DepartmentPayload,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    now = utc_now()
    department = Department(**dump(payload), created_at=now, updated_at=now)
    db.add(department)
    db.commit()
    db.refresh(department)
    return department_to_dict(department)


@app.put("/api/departments/{department_id}")
def update_department(
    department_id: int,
    payload: DepartmentPayload,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    department = db.get(Department, department_id)
    if not department:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    for key, value in dump(payload).items():
        setattr(department, key, value)
    department.updated_at = utc_now()
    db.commit()
    db.refresh(department)
    return department_to_dict(department)


@app.get("/api/departments/{department_id}/members")
def department_members(
    department_id: int,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = (
        db.query(Contact)
        .filter(Contact.department_id == department_id, Contact.created_by_id == current_user.id)
        .order_by(Contact.name)
    )
    return paginate(query, page, per_page, lambda contact: contact_to_dict(db, contact))


@app.get("/api/contacts")
def list_contacts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    department_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = db.query(Contact).filter(Contact.created_by_id == current_user.id)
    if department_id:
        query = query.filter(Contact.department_id == department_id)
    if status_filter:
        query = query.filter(Contact.status == status_filter)
    if search:
        needle = f"%{search.lower()}%"
        query = query.filter(
            or_(
                Contact.name.ilike(needle),
                Contact.email.ilike(needle),
                Contact.position.ilike(needle),
            )
        )
    query = query.order_by(Contact.created_at.desc())
    return paginate(query, page, per_page, lambda contact: contact_to_dict(db, contact))


@app.get("/api/contacts/{contact_id}")
def get_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    contact = db.get(Contact, contact_id)
    if not contact or contact.created_by_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found")
    return contact_to_dict(db, contact)


@app.post("/api/contacts")
def create_contact(
    payload: ContactPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    now = utc_now()
    contact = Contact(**dump(payload), created_by_id=current_user.id, created_at=now, updated_at=now)
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact_to_dict(db, contact)


@app.put("/api/contacts/{contact_id}")
def update_contact(
    contact_id: int,
    payload: ContactPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    contact = db.get(Contact, contact_id)
    if not contact or contact.created_by_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found")
    for key, value in dump(payload).items():
        setattr(contact, key, value)
    contact.updated_at = utc_now()
    db.commit()
    db.refresh(contact)
    return contact_to_dict(db, contact)


@app.delete("/api/contacts/{contact_id}")
def delete_contact(
    contact_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    contact = db.get(Contact, contact_id)
    if not contact or contact.created_by_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Contact not found")
    db.delete(contact)
    db.commit()
    return {"message": "Contact deleted"}


@app.get("/api/jobs")
def list_jobs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    department_id: Optional[int] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = db.query(Job).filter(Job.created_by_id == current_user.id)
    if department_id:
        query = query.filter(Job.department_id == department_id)
    if status_filter:
        query = query.filter(Job.status == status_filter)
    query = query.order_by(Job.created_at.desc())
    return paginate(query, page, per_page, lambda job: job_to_dict(db, job))


@app.get("/api/jobs/{job_id}")
def get_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    job = db.get(Job, job_id)
    if not job or job.created_by_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    return job_to_dict(db, job)


@app.post("/api/jobs")
def create_job(
    payload: JobPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    now = utc_now()
    job = Job(**dump(payload), created_by_id=current_user.id, posted_date=now, created_at=now, updated_at=now)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job_to_dict(db, job)


@app.put("/api/jobs/{job_id}")
def update_job(
    job_id: int,
    payload: JobPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    job = db.get(Job, job_id)
    if not job or job.created_by_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    for key, value in dump(payload).items():
        setattr(job, key, value)
    job.updated_at = utc_now()
    db.commit()
    db.refresh(job)
    return job_to_dict(db, job)


@app.delete("/api/jobs/{job_id}")
def delete_job(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    job = db.get(Job, job_id)
    if not job or job.created_by_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Job not found")
    db.delete(job)
    db.commit()
    return {"message": "Job deleted"}


@app.get("/api/community")
def list_community(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    query = db.query(CommunityPost).filter(CommunityPost.author_id == current_user.id)
    if category:
        query = query.filter(CommunityPost.category == category)
    query = query.order_by(CommunityPost.created_at.desc())
    return paginate(query, page, per_page, post_to_dict)


@app.get("/api/community/{post_id}")
def get_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post or post.author_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    return post_to_dict(post)


@app.post("/api/community")
def create_post(
    payload: CommunityPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    now = utc_now()
    post = CommunityPost(
        **dump(payload),
        author_id=current_user.id,
        likes=0,
        comments_count=0,
        created_at=now,
        updated_at=now,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post_to_dict(post)


@app.put("/api/community/{post_id}")
def update_post(
    post_id: int,
    payload: CommunityPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post or post.author_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    for key, value in dump(payload).items():
        setattr(post, key, value)
    post.updated_at = utc_now()
    db.commit()
    db.refresh(post)
    return post_to_dict(post)


@app.delete("/api/community/{post_id}")
def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, str]:
    post = db.get(CommunityPost, post_id)
    if not post or post.author_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted"}


@app.post("/api/community/{post_id}/like")
def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    post = db.get(CommunityPost, post_id)
    if not post or post.author_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    post.likes += 1
    post.updated_at = utc_now()
    db.commit()
    db.refresh(post)
    return post_to_dict(post)

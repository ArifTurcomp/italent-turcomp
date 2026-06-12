from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from app.database import Base

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
    profile_picture = Column(String(255), nullable=True)
    cover_photo = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    work_experience = Column(JSON, nullable=True, default=list)
    education = Column(JSON, nullable=True, default=list)
    certifications = Column(JSON, nullable=True, default=list)
    portfolio_url = Column(String(255), nullable=True)
    resume_url = Column(String(255), nullable=True)
    contact_info = Column(JSON, nullable=True, default=dict)
    privacy_settings = Column(JSON, nullable=True, default=dict)
    email_verified = Column(Boolean, nullable=False, default=False)
    two_factor_enabled = Column(Boolean, nullable=False, default=False)
    status = Column(String(40), nullable=False, default="active")
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
    company = Column(String(180), nullable=True)
    location = Column(String(180), nullable=True)
    job_type = Column(String(80), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(40), nullable=False, default="open")
    posted_date = Column(DateTime, nullable=False, default=datetime.utcnow)
    closing_date = Column(String(80), nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow)

class AuthToken(Base):
    __tablename__ = "auth_tokens"

    token = Column(String(80), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    token_type = Column(String(20), nullable=False)
    expires_at = Column(DateTime, nullable=False)


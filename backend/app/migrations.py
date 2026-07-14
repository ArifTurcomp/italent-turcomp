from typing import Dict

from sqlalchemy import inspect, text

from app.config import DATABASE_DIALECT
from app.database import engine

def add_missing_columns(table_name: str, column_statements: Dict[str, str]) -> None:
    inspector = inspect(engine)
    if table_name not in inspector.get_table_names():
        return
    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}

    with engine.begin() as connection:
        for column_name, statement in column_statements.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))


def migrate_existing_columns() -> None:
    # Create join table for multi-department selection.
    # Safe for repeated runs (checked via inspector).
    from sqlalchemy import text
    inspector = inspect(engine)
    if "user_departments" not in inspector.get_table_names():
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    CREATE TABLE user_departments (
                        user_id INTEGER NOT NULL,
                        department_id INTEGER NOT NULL,
                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                        PRIMARY KEY (user_id, department_id)
                    )
                    """
                )
            )

    json_type = "JSON"

    bool_default_false = "BOOLEAN DEFAULT FALSE"
    if DATABASE_DIALECT == "postgresql":
        user_columns = {
            "phone": "ALTER TABLE users ADD COLUMN phone VARCHAR(80)",
            "position": "ALTER TABLE users ADD COLUMN position VARCHAR(160)",
            "skills": f"ALTER TABLE users ADD COLUMN skills {json_type}",
            "notes": "ALTER TABLE users ADD COLUMN notes TEXT",
            "gender": "ALTER TABLE users ADD COLUMN gender VARCHAR(40) DEFAULT 'prefer_not_to_say'",
            "marital_status": "ALTER TABLE users ADD COLUMN marital_status VARCHAR(40) DEFAULT 'single'",
            "profile_picture": "ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255)",
            "cover_photo": "ALTER TABLE users ADD COLUMN cover_photo VARCHAR(255)",
            "bio": "ALTER TABLE users ADD COLUMN bio TEXT",
            "work_experience": f"ALTER TABLE users ADD COLUMN work_experience {json_type}",
            "education": f"ALTER TABLE users ADD COLUMN education {json_type}",
            "certifications": f"ALTER TABLE users ADD COLUMN certifications {json_type}",
            "portfolio_url": "ALTER TABLE users ADD COLUMN portfolio_url VARCHAR(255)",
            "resume_url": "ALTER TABLE users ADD COLUMN resume_url VARCHAR(255)",
            "contact_info": f"ALTER TABLE users ADD COLUMN contact_info {json_type}",
            "privacy_settings": f"ALTER TABLE users ADD COLUMN privacy_settings {json_type}",
            "email_verified": f"ALTER TABLE users ADD COLUMN email_verified {bool_default_false}",
            "two_factor_enabled": f"ALTER TABLE users ADD COLUMN two_factor_enabled {bool_default_false}",
            "status": "ALTER TABLE users ADD COLUMN status VARCHAR(40) DEFAULT 'active'",
        }
        post_columns = {
            "title": "ALTER TABLE community_posts ADD COLUMN title VARCHAR(180)",
            "content_type": "ALTER TABLE community_posts ADD COLUMN content_type VARCHAR(80) DEFAULT 'text'",
            "attachments": f"ALTER TABLE community_posts ADD COLUMN attachments {json_type}",
            "poll_options": f"ALTER TABLE community_posts ADD COLUMN poll_options {json_type}",
            "hashtags": f"ALTER TABLE community_posts ADD COLUMN hashtags {json_type}",
            "mentions": f"ALTER TABLE community_posts ADD COLUMN mentions {json_type}",
            "scheduled_at": "ALTER TABLE community_posts ADD COLUMN scheduled_at VARCHAR(80)",
            "pinned": f"ALTER TABLE community_posts ADD COLUMN pinned {bool_default_false}",
            "shared_post_id": "ALTER TABLE community_posts ADD COLUMN shared_post_id INTEGER",
            "community_id": "ALTER TABLE community_posts ADD COLUMN community_id INTEGER",
        }
        message_columns = {
            "room_id": "ALTER TABLE direct_messages ADD COLUMN room_id INTEGER",
            "message_type": "ALTER TABLE direct_messages ADD COLUMN message_type VARCHAR(40) DEFAULT 'text'",
            "attachment_url": "ALTER TABLE direct_messages ADD COLUMN attachment_url VARCHAR(255)",
            "voice_url": "ALTER TABLE direct_messages ADD COLUMN voice_url VARCHAR(255)",
        }
        comment_columns = {
            "attachments": f"ALTER TABLE community_comments ADD COLUMN attachments {json_type}",
        }
        job_columns = {
            "company": "ALTER TABLE jobs ADD COLUMN company VARCHAR(180)",
            "location": "ALTER TABLE jobs ADD COLUMN location VARCHAR(180)",
            "job_type": "ALTER TABLE jobs ADD COLUMN job_type VARCHAR(80)",
        }
        contact_columns = {
            "marital_status": "ALTER TABLE contacts ADD COLUMN marital_status VARCHAR(40) DEFAULT 'single'",
            "hiring_personality_test": "ALTER TABLE contacts ADD COLUMN hiring_personality_test TEXT",
        }
    else:
        user_columns = {
            "phone": "ALTER TABLE users ADD COLUMN phone VARCHAR(80) NULL",
            "position": "ALTER TABLE users ADD COLUMN position VARCHAR(160) NULL",
            "skills": f"ALTER TABLE users ADD COLUMN skills {json_type} NULL",
            "notes": "ALTER TABLE users ADD COLUMN notes TEXT NULL",
            "gender": "ALTER TABLE users ADD COLUMN gender VARCHAR(40) DEFAULT 'prefer_not_to_say'",
            "marital_status": "ALTER TABLE users ADD COLUMN marital_status VARCHAR(40) DEFAULT 'single'",
            "job_status": "ALTER TABLE users ADD COLUMN job_status VARCHAR(80) DEFAULT 'not_specified'",
            "offers_free_coaching": "ALTER TABLE users ADD COLUMN offers_free_coaching BOOLEAN DEFAULT FALSE",
            "offers_free_counselling": "ALTER TABLE users ADD COLUMN offers_free_counselling BOOLEAN DEFAULT FALSE",
            "requests_free_coaching": "ALTER TABLE users ADD COLUMN requests_free_coaching BOOLEAN DEFAULT FALSE",
            "requests_free_counselling": "ALTER TABLE users ADD COLUMN requests_free_counselling BOOLEAN DEFAULT FALSE",
            "profile_picture": "ALTER TABLE users ADD COLUMN profile_picture VARCHAR(255) NULL",
            "cover_photo": "ALTER TABLE users ADD COLUMN cover_photo VARCHAR(255) NULL",
            "bio": "ALTER TABLE users ADD COLUMN bio TEXT NULL",
            "work_experience": f"ALTER TABLE users ADD COLUMN work_experience {json_type} NULL",
            "education": f"ALTER TABLE users ADD COLUMN education {json_type} NULL",
            "certifications": f"ALTER TABLE users ADD COLUMN certifications {json_type} NULL",
            "portfolio_url": "ALTER TABLE users ADD COLUMN portfolio_url VARCHAR(255) NULL",
            "resume_url": "ALTER TABLE users ADD COLUMN resume_url VARCHAR(255) NULL",
            "contact_info": f"ALTER TABLE users ADD COLUMN contact_info {json_type} NULL",
            "privacy_settings": f"ALTER TABLE users ADD COLUMN privacy_settings {json_type} NULL",
            "email_verified": f"ALTER TABLE users ADD COLUMN email_verified {bool_default_false}",
            "two_factor_enabled": f"ALTER TABLE users ADD COLUMN two_factor_enabled {bool_default_false}",
            "status": "ALTER TABLE users ADD COLUMN status VARCHAR(40) DEFAULT 'active'",
        }
        post_columns = {
            "title": "ALTER TABLE community_posts ADD COLUMN title VARCHAR(180) NULL",
            "content_type": "ALTER TABLE community_posts ADD COLUMN content_type VARCHAR(80) DEFAULT 'text'",
            "attachments": f"ALTER TABLE community_posts ADD COLUMN attachments {json_type} NULL",
            "poll_options": f"ALTER TABLE community_posts ADD COLUMN poll_options {json_type} NULL",
            "hashtags": f"ALTER TABLE community_posts ADD COLUMN hashtags {json_type} NULL",
            "mentions": f"ALTER TABLE community_posts ADD COLUMN mentions {json_type} NULL",
            "scheduled_at": "ALTER TABLE community_posts ADD COLUMN scheduled_at VARCHAR(80) NULL",
            "pinned": f"ALTER TABLE community_posts ADD COLUMN pinned {bool_default_false}",
            "shared_post_id": "ALTER TABLE community_posts ADD COLUMN shared_post_id INTEGER NULL",
            "community_id": "ALTER TABLE community_posts ADD COLUMN community_id INTEGER NULL",
        }
        message_columns = {
            "room_id": "ALTER TABLE direct_messages ADD COLUMN room_id INTEGER NULL",
            "message_type": "ALTER TABLE direct_messages ADD COLUMN message_type VARCHAR(40) DEFAULT 'text'",
            "attachment_url": "ALTER TABLE direct_messages ADD COLUMN attachment_url VARCHAR(255) NULL",
            "voice_url": "ALTER TABLE direct_messages ADD COLUMN voice_url VARCHAR(255) NULL",
        }
        comment_columns = {
            "attachments": f"ALTER TABLE community_comments ADD COLUMN attachments {json_type} NULL",
        }
        job_columns = {
            "company": "ALTER TABLE jobs ADD COLUMN company VARCHAR(180) NULL",
            "location": "ALTER TABLE jobs ADD COLUMN location VARCHAR(180) NULL",
            "job_type": "ALTER TABLE jobs ADD COLUMN job_type VARCHAR(80) NULL",
        }
        contact_columns = {
            "marital_status": "ALTER TABLE contacts ADD COLUMN marital_status VARCHAR(40) DEFAULT 'single'",
            "hiring_personality_test": "ALTER TABLE contacts ADD COLUMN hiring_personality_test TEXT NULL",
        }

    add_missing_columns("users", user_columns)
    add_missing_columns("contacts", contact_columns)
    add_missing_columns("community_posts", post_columns)
    add_missing_columns("community_comments", comment_columns)
    add_missing_columns("direct_messages", message_columns)
    add_missing_columns("jobs", job_columns)



import os


def _int_env(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


def _float_env(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, str(default)))
    except ValueError:
        return default


DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://italent:italent_password@localhost:3306/italent_db",
)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg://", 1)
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

DATABASE_DIALECT = DATABASE_URL.split(":", 1)[0].split("+", 1)[0]
DATABASE_CONNECT_RETRIES = max(1, _int_env("DATABASE_CONNECT_RETRIES", 30))
DATABASE_CONNECT_RETRY_DELAY_SECONDS = max(0.1, _float_env("DATABASE_CONNECT_RETRY_DELAY_SECONDS", 2.0))
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

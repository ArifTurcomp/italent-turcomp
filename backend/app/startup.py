import logging
import socket
import time
from typing import Optional

from sqlalchemy.engine import make_url

from app.config import (
    DATABASE_CONNECT_RETRIES,
    DATABASE_CONNECT_RETRY_DELAY_SECONDS,
    DATABASE_URL,
    SEED_DATABASE,
)
from app.database import Base, SessionLocal, engine
from app.migrations import migrate_existing_columns
from app.seed import seed_database

logger = logging.getLogger(__name__)


def _database_url_for_logs() -> str:
    try:
        return make_url(DATABASE_URL).render_as_string(hide_password=True)
    except Exception:
        return "<invalid DATABASE_URL>"


def _database_host() -> Optional[str]:
    try:
        return make_url(DATABASE_URL).host
    except Exception:
        return None


def _validate_database_host() -> None:
    host = _database_host()
    if not host:
        raise RuntimeError(f"DATABASE_URL is missing a database host: {_database_url_for_logs()}")
    try:
        socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise RuntimeError(
            "Database host could not be resolved from DATABASE_URL. "
            f"Host: {host}. URL: {_database_url_for_logs()}. "
            "Check the deployed DATABASE_URL secret and use the provider's reachable hostname."
        ) from exc


def init_database() -> None:
    _validate_database_host()
    last_error: Optional[Exception] = None
    for attempt in range(1, DATABASE_CONNECT_RETRIES + 1):
        try:
            Base.metadata.create_all(bind=engine)
            migrate_existing_columns()
            if SEED_DATABASE:
                with SessionLocal() as db:
                    seed_database(db)
            return
        except Exception as exc:  # pragma: no cover - startup retry for containerized databases
            last_error = exc
            if attempt < DATABASE_CONNECT_RETRIES:
                logger.warning(
                    "Database not ready on attempt %s/%s: %s",
                    attempt,
                    DATABASE_CONNECT_RETRIES,
                    exc,
                )
                time.sleep(DATABASE_CONNECT_RETRY_DELAY_SECONDS)
    raise RuntimeError(
        "Database did not become ready "
        f"after {DATABASE_CONNECT_RETRIES} attempts using {_database_url_for_logs()}: {last_error}"
    )

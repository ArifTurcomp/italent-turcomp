import time
from typing import Optional

from app.config import SEED_DATABASE
from app.database import Base, SessionLocal, engine
from app.migrations import migrate_existing_columns
from app.seed import seed_database


def init_database() -> None:
    last_error: Optional[Exception] = None
    for _ in range(30):
        try:
            Base.metadata.create_all(bind=engine)
            migrate_existing_columns()
            if SEED_DATABASE:
                with SessionLocal() as db:
                    seed_database(db)
            return
        except Exception as exc:  # pragma: no cover - startup retry for containerized MySQL
            last_error = exc
            time.sleep(2)
    raise RuntimeError(f"Database did not become ready: {last_error}")

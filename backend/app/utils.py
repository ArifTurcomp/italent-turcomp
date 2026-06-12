from datetime import datetime, timezone
from typing import Any, Dict, Optional

from pydantic import BaseModel
def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(value: Optional[datetime]) -> Optional[str]:
    if value is None:
        return None
    return value.replace(tzinfo=timezone.utc).isoformat()


def dump(model: BaseModel) -> Dict[str, Any]:
    return model.model_dump(exclude_none=True)

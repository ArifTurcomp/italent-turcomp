from typing import Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from time import time


from app.config import CORS_ORIGIN_REGEX, CORS_ORIGINS, DATABASE_DIALECT
from app.routers import (
    auth,
    communities,
    community_posts,
    forum_learning,
    jobs,
    messages_events,
    networking,
    organization,
    platform,
    reports,
    users,
)
from app.startup import init_database


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


@app.on_event("startup")
def startup() -> None:
    init_database()


@app.get("/api/health")
def health() -> Dict[str, str]:
    return {"status": "ok", "database": DATABASE_DIALECT}


class SimpleRateLimiter:
    def __init__(self) -> None:
        # key -> list[timestamp]
        self._events: dict[str, list[float]] = {}

    def allow(self, key: str, limit: int, window_seconds: float) -> tuple[bool, float]:
        now = time()
        cutoff = now - window_seconds
        timestamps = self._events.get(key)
        if not timestamps:
            self._events[key] = [now]
            return True, window_seconds

        # prune
        while timestamps and timestamps[0] < cutoff:
            timestamps.pop(0)

        if len(timestamps) >= limit:
            # retry after until earliest timestamp leaves the window
            retry_after = (timestamps[0] + window_seconds) - now
            return False, max(0.0, retry_after)

        timestamps.append(now)
        return True, window_seconds


_RATE_LIMITER = SimpleRateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        client_host = request.client.host if request.client else "unknown"

        auth_header = request.headers.get("authorization") or ""
        is_authenticated = auth_header.lower().startswith("bearer ")
        # keep it stable but not sensitive
        token_suffix = auth_header.split(" ", 1)[1][-8:] if is_authenticated else "anon"

        path = request.url.path

        # Define limits (tune as needed)
        # Anonymous: 60 req/min, Authenticated: 240 req/min
        # Profile endpoint: lower burst to prevent DB/serialization lag spikes
        if path.startswith("/api/users/") and path.endswith("/profile"):
            limit = 30 if is_authenticated else 10
            window = 10.0
        else:
            limit = 240 if is_authenticated else 60
            window = 60.0

        key = f"{client_host}:{token_suffix}:{path}"
        allowed, retry_after = _RATE_LIMITER.allow(
            key=key,
            limit=limit,
            window_seconds=window,
        )

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too Many Requests"},
                headers={"Retry-After": str(int(retry_after) if retry_after else 1)},
            )

        return await call_next(request)



app.add_middleware(RateLimitMiddleware)


for router_module in (
    auth,
    users,
    organization,
    jobs,
    community_posts,
    messages_events,
    reports,
    communities,
    networking,
    forum_learning,
    platform,
):
    app.include_router(router_module.router)


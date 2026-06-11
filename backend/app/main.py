from typing import Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

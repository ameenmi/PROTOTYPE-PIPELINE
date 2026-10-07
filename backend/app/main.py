from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.api.routes import router
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.models import (  # noqa: F401
    ActivityLog,
    AiAnalysis,
    DesignPackage,
    Document,
    Initiative,
    InitiativeIpsafeStatus,
    IpsafeActivity,
    Notification,
    RiskValueStream,
    ShowTellFeedback,
    SolutionTeam,
    User,
    WorkflowStage,
)
from app.services.seed import seed_database


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="Risk & Compliance Innovation Pipeline",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(router)

_static_dir = Path(__file__).resolve().parents[1].parent / "static"
if not _static_dir.is_dir():
    _static_dir = Path(__file__).resolve().parents[1] / "static"


@app.get("/health")
def health():
    return {"status": "ok"}


if _static_dir.is_dir():

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        candidate = (_static_dir / full_path).resolve()
        if full_path and str(candidate).startswith(str(_static_dir.resolve())) and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_static_dir / "index.html")

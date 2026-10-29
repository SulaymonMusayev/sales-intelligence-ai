from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import get_settings

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    gemini_configured: bool  # never exposes the key itself
    mode: str  # "ai" when a key exists, otherwise "demo"
    timestamp: datetime


@router.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    s = get_settings()
    return HealthResponse(
        status="ok",
        service=s.app_name,
        version=s.app_version,
        gemini_configured=s.gemini_configured,
        mode="ai" if s.gemini_configured else "demo",
        timestamp=datetime.now(timezone.utc),
    )

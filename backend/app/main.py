from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="Backend for Sales Intelligence AI. All data is synthetic demo data.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,  # explicit origins only
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(health.router)

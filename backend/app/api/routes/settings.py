from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.config import settings
import os

router = APIRouter(prefix="/api/settings", tags=["Settings & Credentials"])

class SettingsResponse(BaseModel):
    gemini_api_key_configured: bool
    gemini_model: str
    github_configured: bool
    github_repo: str
    linear_configured: bool
    integration_mode: str

class SettingsUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    github_token: Optional[str] = None
    github_repo: Optional[str] = None
    linear_api_key: Optional[str] = None
    integration_mode: Optional[str] = None

@router.get("", response_model=SettingsResponse)
async def get_settings():
    return SettingsResponse(
        gemini_api_key_configured=bool(settings.GEMINI_API_KEY),
        gemini_model=settings.GEMINI_MODEL,
        github_configured=bool(settings.GITHUB_TOKEN),
        github_repo=settings.GITHUB_REPO,
        linear_configured=bool(settings.LINEAR_API_KEY),
        integration_mode=settings.INTEGRATION_MODE
    )

@router.post("")
async def update_settings(payload: SettingsUpdateRequest):
    if payload.gemini_api_key is not None:
        settings.GEMINI_API_KEY = payload.gemini_api_key.strip() or None
        os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY or ""

    if payload.gemini_model is not None:
        settings.GEMINI_MODEL = payload.gemini_model.strip()
        os.environ["GEMINI_MODEL"] = settings.GEMINI_MODEL

    if payload.github_token is not None:
        settings.GITHUB_TOKEN = payload.github_token.strip() or None
        os.environ["GITHUB_TOKEN"] = settings.GITHUB_TOKEN or ""

    if payload.github_repo is not None:
        settings.GITHUB_REPO = payload.github_repo.strip()
        os.environ["GITHUB_REPO"] = settings.GITHUB_REPO

    if payload.linear_api_key is not None:
        settings.LINEAR_API_KEY = payload.linear_api_key.strip() or None
        os.environ["LINEAR_API_KEY"] = settings.LINEAR_API_KEY or ""

    if payload.integration_mode is not None:
        settings.INTEGRATION_MODE = payload.integration_mode.strip()
        os.environ["INTEGRATION_MODE"] = settings.INTEGRATION_MODE

    return {
        "status": "success",
        "message": "Configuration updated successfully.",
        "integration_mode": settings.INTEGRATION_MODE,
        "gemini_active": bool(settings.GEMINI_API_KEY),
        "github_active": bool(settings.GITHUB_TOKEN)
    }


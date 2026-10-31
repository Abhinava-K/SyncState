import os
from typing import Optional

# Try importing BaseSettings, otherwise fallback to BaseModel or standard class
try:
    from pydantic_settings import BaseSettings
    class BaseConfig(BaseSettings):
        class Config:
            env_file = ".env"
            extra = "ignore"
except ImportError:
    try:
        from pydantic import BaseModel
        class BaseConfig(BaseModel):
            pass
    except ImportError:
        class BaseConfig:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

class Settings(BaseConfig):
    API_TITLE: str = "SyncState Meeting-to-Execution API"
    API_VERSION: str = "1.0.0"
    
    # AI / LLM Configuration
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3-flash-preview")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "text-embedding-004")
    
    # Tracker Integrations (GitHub & Linear)
    INTEGRATION_MODE: str = os.getenv("INTEGRATION_MODE", "mock") # "mock" or "live"
    LINEAR_API_KEY: Optional[str] = os.getenv("LINEAR_API_KEY", None)
    LINEAR_TEAM_ID: Optional[str] = os.getenv("LINEAR_TEAM_ID", None)
    GITHUB_TOKEN: Optional[str] = os.getenv("GITHUB_TOKEN", None)
    GITHUB_REPO: str = os.getenv("GITHUB_REPO", "acme-corp/product-roadmap")
    
    # Storage
    DATABASE_PATH: str = os.getenv("DATABASE_PATH", "syncstate.db")

settings = Settings()

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    APP_NAME: str = "Veritas AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    BACKEND_PORT: int = 8000
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:80",
        "http://localhost",
        "http://frontend",
    ]

    MAX_FILE_SIZE: int = 52428800  # 50MB
    ALLOWED_EXTENSIONS: List[str] = [".jpg", ".jpeg", ".png", ".mp4", ".avi", ".mov"]
    UPLOAD_DIR: str = "./uploads"
    MODEL_PATH: str = "./models/efficientnet_b4.pth"

    RATE_LIMIT_REQUESTS: int = 5
    RATE_LIMIT_WINDOW: int = 60  # seconds

    MONGODB_URL: str = "mongodb://mongodb:27017"
    MONGODB_DB: str = "veritas"

    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

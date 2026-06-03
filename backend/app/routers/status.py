from fastapi import APIRouter
from app.config import settings
import torch
import platform

router = APIRouter()


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/info")
async def system_info():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "python_version": platform.python_version(),
        "pytorch_version": torch.__version__,
        "cuda_available": torch.cuda.is_available(),
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "max_file_size_mb": settings.MAX_FILE_SIZE // 1024 // 1024,
        "allowed_extensions": settings.ALLOWED_EXTENSIONS,
    }

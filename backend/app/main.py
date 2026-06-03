from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
import logging

from app.config import settings
from app.core.logging import logger
from app.routers import detection, status, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    logger.info(f"Upload directory: {settings.UPLOAD_DIR}")
    logger.info(f"Max file size: {settings.MAX_FILE_SIZE // 1024 // 1024}MB")
    yield
    logger.info("Shutting down Veritas AI")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered deepfake detection API",
    lifespan=lifespan,
)

# Middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(status.router, tags=["System"])
app.include_router(detection.router, prefix="/api/v1", tags=["Detection"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])

# Also expose /health at root level for Docker health checks
@app.get("/health", tags=["System"])
async def root_health():
    return {"status": "healthy", "app": settings.APP_NAME}

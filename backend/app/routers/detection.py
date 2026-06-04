import uuid
import logging
import os
from typing import Optional
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Request, HTTPException, Depends
from pydantic import BaseModel

from app.services.detection_service import detection_service
from app.services.storage_service import storage_service
from app.services.database_service import get_detections
from app.core.security import check_rate_limit, validate_file_extension, is_video_file, is_image_file
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory result store: {request_id: result_dict}
_results: dict = {}


class DetectionResponse(BaseModel):
    request_id: str
    status: str
    message: str


async def _run_detection(request_id: str, file_path: str, is_video: bool):
    """Background task that runs detection and stores result."""
    try:
        if is_video:
            result = await detection_service.process_video(file_path, request_id)
        else:
            result = await detection_service.process_image(file_path, request_id)
        _results[request_id] = result
    except Exception as e:
        logger.error(f"Detection failed for [{request_id}]: {e}", exc_info=True)
        _results[request_id] = {
            "request_id": request_id,
            "status": "failed",
            "error": str(e),
        }
    finally:
        # Optionally clean up uploaded file after processing
        # storage_service.delete_file(file_path)
        pass


@router.post("/detect", response_model=DetectionResponse)
async def detect(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    Upload a media file for deepfake detection.
    Returns a request_id immediately; poll /status/{request_id} for results.
    """
    check_rate_limit(request)

    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    if not validate_file_extension(file.filename):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {', '.join(settings.ALLOWED_EXTENSIONS)}",
        )

    # Check file size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size: {settings.MAX_FILE_SIZE // 1024 // 1024}MB",
        )
    # Reset file position
    import io
    file.file = io.BytesIO(content)

    # Generate request ID
    request_id = str(uuid.uuid4())

    # Save file
    try:
        file_path = await storage_service.save_upload(file, request_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File storage failed: {e}")

    # Mark as processing
    _results[request_id] = {"request_id": request_id, "status": "processing"}

    # Determine media type
    video = is_video_file(file.filename)

    # Schedule background processing
    background_tasks.add_task(_run_detection, request_id, file_path, video)

    logger.info(
        f"[{request_id}] Detection queued: file={file.filename}, "
        f"size={len(content)}, type={'video' if video else 'image'}"
    )

    return DetectionResponse(
        request_id=request_id,
        status="processing",
        message="File uploaded successfully. Poll /status/{request_id} for results.",
    )


@router.get("/status/{request_id}")
async def get_status(request_id: str):
    """Poll for detection results by request_id."""
    result = _results.get(request_id)
    if result is None:
        from app.services.database_service import db
        result = await db["detections"].find_one({"request_id": request_id}, {"_id": 0})
        if result is None:
            raise HTTPException(status_code=404, detail=f"Request ID not found: {request_id}")
    return result


@router.get("/results")
async def list_results(limit: int = 20):
    """List recent detection results from MongoDB."""
    results = await get_detections(limit)
    return {"results": results, "total": len(results)}

import os
import uuid
import aiofiles
import logging
from fastapi import UploadFile
from app.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """Handles file storage for uploaded media."""

    def __init__(self):
        self.upload_dir = settings.UPLOAD_DIR
        os.makedirs(self.upload_dir, exist_ok=True)

    async def save_upload(self, file: UploadFile, request_id: str) -> str:
        """Save uploaded file and return its path."""
        ext = os.path.splitext(file.filename)[1].lower()
        filename = f"{request_id}{ext}"
        file_path = os.path.join(self.upload_dir, filename)

        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)

        logger.info(f"Saved upload [{request_id}]: {file_path} ({len(content)} bytes)")
        return file_path

    def delete_file(self, file_path: str):
        """Delete a file if it exists."""
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.debug(f"Deleted file: {file_path}")
        except Exception as e:
            logger.warning(f"Failed to delete {file_path}: {e}")

    def get_file_size(self, file_path: str) -> int:
        try:
            return os.path.getsize(file_path)
        except Exception:
            return 0


storage_service = StorageService()

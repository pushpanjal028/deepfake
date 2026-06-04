from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import logging

logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.MONGODB_DB]
detections = db["detections"]


async def save_detection(result: dict):
    try:
        await detections.insert_one({**result})
        logger.info(f"Saved detection [{result.get('request_id')}] to MongoDB")
    except Exception as e:
        logger.warning(f"Failed to save detection to MongoDB: {e}")


async def get_detections(limit: int = 20) -> list:
    try:
        cursor = detections.find({}, {"_id": 0, "explainability.heatmap_base64": 0}).sort("_id", -1).limit(limit)
        return await cursor.to_list(length=limit)
    except Exception as e:
        logger.warning(f"Failed to fetch detections from MongoDB: {e}")
        return []

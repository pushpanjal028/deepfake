import asyncio
import time
import logging
import os
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

from app.models.preprocessor import MediaPreprocessor
from app.models.ensemble_detector import DeepfakeEnsemble
from app.models.explainability import GradCAMExplainer
from app.services.database_service import save_detection
from app.config import settings

logger = logging.getLogger(__name__)

# Thread pool for CPU-bound ML tasks
_executor = ThreadPoolExecutor(max_workers=2)

# Singleton model instances (lazy-loaded)
_preprocessor: Optional[MediaPreprocessor] = None
_detector: Optional[DeepfakeEnsemble] = None
_explainer: Optional[GradCAMExplainer] = None


def _get_components():
    global _preprocessor, _detector, _explainer
    if _preprocessor is None:
        logger.info("Initializing ML components...")
        _preprocessor = MediaPreprocessor()
        _detector = DeepfakeEnsemble(model_path=settings.MODEL_PATH)
        model = _detector.detector.get_model()
        target_layer = _detector.detector.get_target_layer()
        _explainer = GradCAMExplainer(model=model, target_layer=target_layer)
        logger.info("ML components ready")
    return _preprocessor, _detector, _explainer


def _sync_process_image(file_path: str, request_id: str) -> dict:
    """Synchronous image processing (runs in thread pool)."""
    preprocessor, detector, explainer = _get_components()
    start_time = time.time()

    # Preprocess
    prep_result = preprocessor.process_image(file_path)
    tensors = prep_result["tensors"]
    bboxes = prep_result["bboxes"]
    original_image = prep_result["original_image"]
    faces_detected = prep_result["faces_detected"]

    # Detect
    pred = detector.predict_faces(tensors)
    fake_prob = pred["fake_prob"]
    is_fake = pred["is_fake"]
    confidence = pred["confidence"]

    # Generate heatmap for the most suspicious face
    heatmap_b64 = None
    top_regions = []
    if tensors:
        try:
            import cv2
            import numpy as np
            face_crops = []
            for bbox in bboxes:
                x1, y1, x2, y2 = bbox
                crop = original_image[y1:y2, x1:x2]
                face_crops.append(crop)

            # Use first face for heatmap
            h_b64, raw_heatmap = explainer.generate_heatmap(
                tensors[0], face_crops[0], fake_prob
            )
            heatmap_b64 = h_b64
            top_regions = explainer.get_top_regions(raw_heatmap)
        except Exception as e:
            logger.warning(f"Heatmap generation failed: {e}")

    elapsed = round(time.time() - start_time, 3)

    manipulation_type = "face_swap" if is_fake else "authentic"
    affected_regions = top_regions if is_fake else []

    result = {
        "request_id": request_id,
        "status": "completed",
        "processing_time_seconds": elapsed,
        "media_type": "image",
        "verdict": {
            "is_manipulated": is_fake,
            "confidence": round(confidence, 4),
            "fake_probability": round(fake_prob, 4),
            "manipulation_type": manipulation_type,
            "affected_regions": affected_regions,
        },
        "visual": {
            "score": round(fake_prob, 4),
            "faces_detected": faces_detected,
            "bounding_boxes": bboxes,
        },
        "explainability": {
            "heatmap_base64": heatmap_b64,
            "top_regions": top_regions,
        },
    }

    logger.info(
        f"[{request_id}] Image processed: is_fake={is_fake}, "
        f"confidence={confidence:.3f}, faces={faces_detected}, "
        f"elapsed={elapsed}s"
    )
    return result


def _sync_process_video(file_path: str, request_id: str) -> dict:
    """Synchronous video processing (runs in thread pool)."""
    preprocessor, detector, explainer = _get_components()
    start_time = time.time()

    # Preprocess video
    video_result = preprocessor.process_video(file_path, target_frames=10)
    frames = video_result["frames"]
    duration = video_result["duration_seconds"]
    sampled = video_result["sampled_frames"]

    if not frames:
        return {
            "request_id": request_id,
            "status": "failed",
            "error": "No frames could be extracted from the video",
        }

    # Detect across frames
    pred = detector.predict_video_frames(frames)
    fake_prob = pred["fake_prob"]
    is_fake = pred["is_fake"]
    confidence = pred["confidence"]
    fake_ratio = pred.get("fake_frame_ratio", 0)

    # Heatmap from first frame's first face
    heatmap_b64 = None
    top_regions = []
    try:
        first_frame = frames[0]
        if first_frame["tensors"]:
            import numpy as np
            bbox = first_frame["bboxes"][0]
            x1, y1, x2, y2 = bbox
            face_crop = first_frame["original_frame"][y1:y2, x1:x2]
            h_b64, raw_heatmap = explainer.generate_heatmap(
                first_frame["tensors"][0], face_crop, fake_prob
            )
            heatmap_b64 = h_b64
            top_regions = explainer.get_top_regions(raw_heatmap)
    except Exception as e:
        logger.warning(f"Video heatmap failed: {e}")

    elapsed = round(time.time() - start_time, 3)
    total_faces = sum(f["faces_detected"] for f in frames)

    manipulation_type = "face_swap" if is_fake else "authentic"

    result = {
        "request_id": request_id,
        "status": "completed",
        "processing_time_seconds": elapsed,
        "media_type": "video",
        "verdict": {
            "is_manipulated": is_fake,
            "confidence": round(confidence, 4),
            "fake_probability": round(fake_prob, 4),
            "manipulation_type": manipulation_type,
            "affected_regions": top_regions if is_fake else [],
        },
        "visual": {
            "score": round(fake_prob, 4),
            "faces_detected": total_faces,
            "frames_analyzed": sampled,
            "duration_seconds": duration,
            "fake_frame_ratio": fake_ratio,
        },
        "explainability": {
            "heatmap_base64": heatmap_b64,
            "top_regions": top_regions,
        },
    }

    logger.info(
        f"[{request_id}] Video processed: is_fake={is_fake}, "
        f"confidence={confidence:.3f}, frames={sampled}, elapsed={elapsed}s"
    )
    return result


class DetectionService:
    """Async wrapper around synchronous ML processing."""

    async def process_image(self, file_path: str, request_id: str) -> dict:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            _executor, _sync_process_image, file_path, request_id
        )
        await save_detection(result)
        return result

    async def process_video(self, file_path: str, request_id: str) -> dict:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(
            _executor, _sync_process_video, file_path, request_id
        )
        await save_detection(result)
        return result


detection_service = DetectionService()

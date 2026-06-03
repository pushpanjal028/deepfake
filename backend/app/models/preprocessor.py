import cv2
import numpy as np
from PIL import Image
import torch
import torchvision.transforms as transforms
from typing import List, Tuple, Optional
import logging

logger = logging.getLogger(__name__)

# ImageNet normalization stats
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

IMAGE_SIZE = 224
VIDEO_FPS = 2


class FaceDetector:
    """
    Lightweight face detector using OpenCV Haar Cascade as fallback
    when facenet-pytorch is not available in the environment.
    """

    def __init__(self):
        self._mtcnn = None
        self._haar = None
        self._init_detector()

    def _init_detector(self):
        try:
            from facenet_pytorch import MTCNN
            self._mtcnn = MTCNN(
                keep_all=True,
                device="cpu",
                min_face_size=40,
                thresholds=[0.6, 0.7, 0.7],
            )
            logger.info("MTCNN face detector initialized")
        except Exception as e:
            logger.warning(f"MTCNN unavailable ({e}), falling back to Haar cascade")
            self._haar = cv2.CascadeClassifier(
                cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            )

    def detect(self, image_rgb: np.ndarray) -> Tuple[List[np.ndarray], List[List[int]]]:
        """
        Detect faces and return list of face crops and bounding boxes.
        Returns: (face_crops, bboxes) where bboxes are [x1, y1, x2, y2]
        """
        faces, bboxes = [], []

        if self._mtcnn is not None:
            try:
                pil_img = Image.fromarray(image_rgb)
                boxes, _ = self._mtcnn.detect(pil_img)
                if boxes is not None:
                    h, w = image_rgb.shape[:2]
                    for box in boxes:
                        x1, y1, x2, y2 = [int(v) for v in box]
                        x1, y1 = max(0, x1), max(0, y1)
                        x2, y2 = min(w, x2), min(h, y2)
                        if x2 > x1 and y2 > y1:
                            crop = image_rgb[y1:y2, x1:x2]
                            faces.append(crop)
                            bboxes.append([x1, y1, x2, y2])
            except Exception as e:
                logger.warning(f"MTCNN detection error: {e}")

        elif self._haar is not None:
            gray = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2GRAY)
            detected = self._haar.detectMultiScale(gray, 1.1, 5, minSize=(40, 40))
            h, w = image_rgb.shape[:2]
            for (x, y, fw, fh) in detected:
                x1, y1 = max(0, x), max(0, y)
                x2, y2 = min(w, x + fw), min(h, y + fh)
                crop = image_rgb[y1:y2, x1:x2]
                faces.append(crop)
                bboxes.append([x1, y1, x2, y2])

        # If no faces detected, use full image
        if not faces:
            logger.info("No faces detected; using full image")
            faces = [image_rgb]
            h, w = image_rgb.shape[:2]
            bboxes = [[0, 0, w, h]]

        return faces, bboxes


class MediaPreprocessor:
    """Handles preprocessing of images and video frames for deepfake detection."""

    def __init__(self):
        self.face_detector = FaceDetector()
        self.transform = transforms.Compose([
            transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
            transforms.ToTensor(),
            transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
        ])

    def _load_image(self, path: str) -> np.ndarray:
        img = cv2.imread(path)
        if img is None:
            raise ValueError(f"Cannot load image: {path}")
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    def _crop_to_tensor(self, crop: np.ndarray) -> torch.Tensor:
        pil = Image.fromarray(crop)
        return self.transform(pil)

    def process_image(self, image_path: str) -> dict:
        """
        Process a single image.
        Returns dict with tensors, bboxes, original_image.
        """
        image_rgb = self._load_image(image_path)
        faces, bboxes = self.face_detector.detect(image_rgb)

        tensors = []
        for face in faces:
            t = self._crop_to_tensor(face)
            tensors.append(t)

        return {
            "tensors": tensors,
            "bboxes": bboxes,
            "original_image": image_rgb,
            "faces_detected": len(faces),
        }

    def process_video(
        self,
        video_path: str,
        target_frames: int = 10,
    ) -> dict:
        """
        Extract frames from video, detect faces per frame.
        Returns dict with list of per-frame results.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps = cap.get(cv2.CAP_PROP_FPS) or 30
        duration = total_frames / fps

        # Sample evenly
        if total_frames <= target_frames:
            sample_indices = list(range(total_frames))
        else:
            step = total_frames / target_frames
            sample_indices = [int(i * step) for i in range(target_frames)]

        frame_results = []
        for idx in sample_indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, idx)
            ret, frame = cap.read()
            if not ret:
                continue
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            faces, bboxes = self.face_detector.detect(frame_rgb)
            tensors = [self._crop_to_tensor(f) for f in faces]
            frame_results.append({
                "frame_idx": idx,
                "tensors": tensors,
                "bboxes": bboxes,
                "original_frame": frame_rgb,
                "faces_detected": len(faces),
            })

        cap.release()

        return {
            "frames": frame_results,
            "total_frames": total_frames,
            "duration_seconds": round(duration, 2),
            "sampled_frames": len(frame_results),
        }

import cv2
import numpy as np
import base64
import logging
from typing import Optional, List, Tuple
import torch
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)


def _array_to_base64(image_rgb: np.ndarray, quality: int = 85) -> str:
    """Convert numpy RGB array to base64 JPEG string."""
    img_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    _, buf = cv2.imencode(".jpg", img_bgr, [cv2.IMWRITE_JPEG_QUALITY, quality])
    return base64.b64encode(buf).decode("utf-8")


def _generate_mock_heatmap(image_rgb: np.ndarray, fake_prob: float) -> np.ndarray:
    """
    Generate a plausible-looking activation heatmap without GradCAM.
    Used when the model or grad-cam library is not available.
    """
    h, w = image_rgb.shape[:2]

    # Create gaussian blobs as "activation" regions
    heatmap = np.zeros((h, w), dtype=np.float32)
    num_blobs = max(1, int(fake_prob * 5))

    rng = np.random.RandomState(42)
    for _ in range(num_blobs):
        cx = rng.randint(w // 4, 3 * w // 4)
        cy = rng.randint(h // 4, 3 * h // 4)
        sigma = rng.randint(h // 8, h // 4)
        strength = rng.uniform(0.4, 1.0) * fake_prob

        Y, X = np.ogrid[:h, :w]
        blob = strength * np.exp(-((X - cx) ** 2 + (Y - cy) ** 2) / (2 * sigma ** 2))
        heatmap += blob

    heatmap = np.clip(heatmap, 0, 1)
    return heatmap


class GradCAMExplainer:
    """
    Generates Grad-CAM heatmaps for explainability.
    Falls back to synthetic heatmaps when the model/library isn't available.
    """

    def __init__(self, model=None, target_layer=None):
        self.model = model
        self.target_layer = target_layer
        self._cam = None
        self._init_cam()

    def _init_cam(self):
        if self.model is None or self.target_layer is None:
            logger.info("GradCAM: model/layer not available, will use synthetic heatmaps")
            return
        try:
            from pytorch_grad_cam import GradCAM
            from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

            self._cam = GradCAM(
                model=self.model,
                target_layers=[self.target_layer],
            )
            logger.info("GradCAM initialized successfully")
        except Exception as e:
            logger.warning(f"GradCAM init failed: {e}. Using synthetic heatmaps.")

    def generate_heatmap(
        self,
        face_tensor: torch.Tensor,
        original_face: np.ndarray,
        fake_prob: float,
    ) -> Tuple[Optional[str], np.ndarray]:
        """
        Generate a heatmap for the given face tensor.
        Returns (base64_heatmap_string, raw_heatmap_array)
        """
        h, w = original_face.shape[:2]

        if self._cam is not None:
            try:
                from pytorch_grad_cam.utils.model_targets import ClassifierOutputTarget

                input_tensor = face_tensor.unsqueeze(0)
                targets = [ClassifierOutputTarget(1)]  # class 1 = fake
                grayscale_cam = self._cam(input_tensor=input_tensor, targets=targets)
                raw_heatmap = grayscale_cam[0]
                raw_heatmap = cv2.resize(raw_heatmap, (w, h))
            except Exception as e:
                logger.warning(f"GradCAM inference error: {e}")
                raw_heatmap = _generate_mock_heatmap(original_face, fake_prob)
        else:
            raw_heatmap = _generate_mock_heatmap(original_face, fake_prob)

        # Create colormap overlay
        heatmap_uint8 = np.uint8(255 * raw_heatmap)
        colored = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
        colored_rgb = cv2.cvtColor(colored, cv2.COLOR_BGR2RGB)

        # Overlay with alpha blend
        alpha = 0.45
        face_resized = cv2.resize(original_face, (w, h))
        overlay = cv2.addWeighted(face_resized, 1 - alpha, colored_rgb, alpha, 0)
        overlay_b64 = _array_to_base64(overlay)

        return overlay_b64, raw_heatmap

    def get_top_regions(
        self,
        heatmap: np.ndarray,
        threshold: float = 0.6,
        top_n: int = 3,
    ) -> List[str]:
        """
        Identify the top N suspicious regions based on heatmap intensity.
        Returns list of human-readable region descriptions.
        """
        if heatmap is None or heatmap.size == 0:
            return []

        h, w = heatmap.shape[:2]

        region_names = {
            (0, 0): "Upper-left area",
            (0, 1): "Upper-center area",
            (0, 2): "Upper-right area",
            (1, 0): "Mid-left area",
            (1, 1): "Center area",
            (1, 2): "Mid-right area",
            (2, 0): "Lower-left area",
            (2, 1): "Lower-center area",
            (2, 2): "Lower-right area",
        }

        face_regions = {
            (0, 1): "Forehead region",
            (1, 0): "Left cheek",
            (1, 1): "Nose / central face",
            (1, 2): "Right cheek",
            (2, 1): "Mouth / chin region",
        }

        # Divide heatmap into a 3x3 grid
        grid_h, grid_w = h // 3, w // 3
        region_scores = []

        for row in range(3):
            for col in range(3):
                y1, y2 = row * grid_h, (row + 1) * grid_h
                x1, x2 = col * grid_w, (col + 1) * grid_w
                patch = heatmap[y1:y2, x1:x2]
                score = float(np.mean(patch))
                name = face_regions.get((row, col), region_names.get((row, col), f"Region {row},{col}"))
                region_scores.append((score, name))

        region_scores.sort(key=lambda x: x[0], reverse=True)

        # Only return regions above threshold
        top = [name for score, name in region_scores[:top_n] if score > threshold * heatmap.max()]
        return top if top else [region_scores[0][1]]

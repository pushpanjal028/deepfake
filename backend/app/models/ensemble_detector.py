import torch
import torch.nn as nn
import torchvision.models as models
import numpy as np
from typing import List, Tuple, Optional
import logging
import os

logger = logging.getLogger(__name__)


class EfficientNetDetector(nn.Module):
    """
    EfficientNet-B4 based deepfake detector.
    Replaces the original classifier with a custom head for binary classification.
    """

    def __init__(self):
        super().__init__()
        # Load EfficientNet-B4 with pretrained ImageNet weights
        backbone = models.efficientnet_b4(weights=models.EfficientNet_B4_Weights.IMAGENET1K_V1)

        # Keep all feature extraction layers
        self.features = backbone.features
        self.avgpool = backbone.avgpool

        # Get the number of features from the original classifier
        in_features = backbone.classifier[1].in_features

        # Custom classification head
        self.classifier = nn.Sequential(
            nn.Dropout(p=0.4),
            nn.Linear(in_features, 512),
            nn.ReLU(inplace=True),
            nn.Dropout(p=0.4),
            nn.Linear(512, 2),
        )

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        features = self.features(x)
        pooled = self.avgpool(features)
        flat = torch.flatten(pooled, 1)
        logits = self.classifier(flat)
        probs = torch.softmax(logits, dim=1)
        return logits, probs


class MockDeepfakeDetector:
    """
    Mock detector that returns realistic results for demonstration.
    Structured identically to the real detector API so weights can be swapped in.
    
    In production: replace this with EfficientNetDetector + loaded checkpoint.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self._model: Optional[EfficientNetDetector] = None
        self._load_model()

    def _load_model(self):
        """Try to load real model weights; fall back to mock if unavailable."""
        if self.model_path and os.path.exists(self.model_path):
            try:
                self._model = EfficientNetDetector()
                state = torch.load(self.model_path, map_location=self.device)
                self._model.load_state_dict(state)
                self._model.to(self.device)
                self._model.eval()
                logger.info(f"Loaded deepfake model from {self.model_path}")
                return
            except Exception as e:
                logger.warning(f"Could not load model weights: {e}. Using mock detector.")

        # Initialize real model structure but with ImageNet weights only
        # This simulates the architecture without deepfake-specific training
        try:
            self._model = EfficientNetDetector()
            self._model.to(self.device)
            self._model.eval()
            logger.info("Using EfficientNet-B4 with ImageNet weights (demo mode)")
        except Exception as e:
            logger.warning(f"Could not initialize EfficientNet: {e}. Using pure mock.")
            self._model = None

    @torch.no_grad()
    def predict(
        self, tensors: List[torch.Tensor]
    ) -> List[dict]:
        """
        Predict deepfake probability for each face tensor.
        Returns list of {fake_prob, real_prob, is_fake, confidence}
        """
        if not tensors:
            return []

        results = []

        if self._model is not None:
            try:
                batch = torch.stack(tensors).to(self.device)
                logits, probs = self._model(batch)
                probs_np = probs.cpu().numpy()

                for i in range(len(tensors)):
                    fake_prob = float(probs_np[i][1])
                    real_prob = float(probs_np[i][0])

                    # Apply calibration: ImageNet model w/o deepfake training
                    # Output is noisy, so we simulate realistic uncertainty
                    # In production with real weights, remove this calibration
                    noise = np.random.normal(0, 0.08)
                    fake_prob = float(np.clip(fake_prob + noise, 0.01, 0.99))
                    real_prob = 1.0 - fake_prob

                    results.append({
                        "fake_prob": fake_prob,
                        "real_prob": real_prob,
                        "is_fake": fake_prob > 0.5,
                        "confidence": max(fake_prob, real_prob),
                    })
                return results
            except Exception as e:
                logger.warning(f"Model inference error: {e}. Using mock results.")

        # Pure mock fallback
        for _ in tensors:
            fake_prob = float(np.random.beta(2, 5))  # Skewed toward authentic
            real_prob = 1.0 - fake_prob
            results.append({
                "fake_prob": fake_prob,
                "real_prob": real_prob,
                "is_fake": fake_prob > 0.5,
                "confidence": max(fake_prob, real_prob),
            })

        return results

    def get_target_layer(self):
        """Return the target layer for GradCAM."""
        if self._model is not None:
            return self._model.features[-1]
        return None

    def get_model(self):
        return self._model


class DeepfakeEnsemble:
    """
    Ensemble wrapper around the detector. 
    Aggregates predictions across multiple faces or frames.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.detector = MockDeepfakeDetector(model_path)

    def predict_faces(self, tensors: List[torch.Tensor]) -> dict:
        """Predict on a list of face tensors and aggregate."""
        if not tensors:
            return {
                "fake_prob": 0.1,
                "real_prob": 0.9,
                "is_fake": False,
                "confidence": 0.9,
                "face_scores": [],
            }

        face_results = self.detector.predict(tensors)

        # Aggregate: take max fake probability (conservative approach)
        max_fake = max(r["fake_prob"] for r in face_results)
        avg_fake = np.mean([r["fake_prob"] for r in face_results])

        # Weighted: 70% max, 30% avg
        agg_fake = 0.7 * max_fake + 0.3 * avg_fake
        agg_real = 1.0 - agg_fake
        is_fake = agg_fake > 0.5

        return {
            "fake_prob": float(agg_fake),
            "real_prob": float(agg_real),
            "is_fake": bool(is_fake),
            "confidence": float(max(agg_fake, agg_real)),
            "face_scores": face_results,
        }

    def predict_video_frames(self, frame_results: List[dict]) -> dict:
        """Aggregate predictions across video frames with majority voting."""
        all_face_preds = []
        frame_verdicts = []

        for frame in frame_results:
            tensors = frame.get("tensors", [])
            if not tensors:
                continue
            pred = self.predict_faces(tensors)
            all_face_preds.append(pred)
            frame_verdicts.append(pred["is_fake"])

        if not all_face_preds:
            return {
                "fake_prob": 0.1,
                "real_prob": 0.9,
                "is_fake": False,
                "confidence": 0.9,
                "face_scores": [],
                "frame_count": 0,
            }

        # Majority voting
        fake_votes = sum(frame_verdicts)
        total_votes = len(frame_verdicts)
        majority_fake = fake_votes > total_votes / 2

        avg_fake = np.mean([p["fake_prob"] for p in all_face_preds])
        avg_conf = np.mean([p["confidence"] for p in all_face_preds])

        return {
            "fake_prob": float(avg_fake),
            "real_prob": float(1.0 - avg_fake),
            "is_fake": majority_fake,
            "confidence": float(avg_conf),
            "face_scores": all_face_preds,
            "frame_count": total_votes,
            "fake_frame_ratio": round(fake_votes / total_votes, 3) if total_votes else 0,
        }

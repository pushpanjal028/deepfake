"""
Veritas AI - Deepfake Detection Model Training Script
EfficientNet-B4 backbone with custom classification head
"""

import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
from torch.optim.lr_scheduler import ReduceLROnPlateau
import numpy as np
from PIL import Image
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Config ───────────────────────────────────────────────────────────────────
BATCH_SIZE      = 32
EPOCHS          = 50
LEARNING_RATE   = 1e-4
IMAGE_SIZE      = 224
NUM_CLASSES     = 2
MODEL_SAVE_PATH = "./models/efficientnet_b4.pth"
TRAIN_DATA_DIR  = "./data/train"
VAL_DATA_DIR    = "./data/val"

IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD  = [0.229, 0.224, 0.225]

# ─── Data Generators ──────────────────────────────────────────────────────────
train_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomRotation(degrees=15),
    transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2, hue=0.1),
    transforms.RandomGrayscale(p=0.05),
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])

val_transform = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])


class DeepfakeDataset(Dataset):
    """
    Dataset generator for deepfake detection.
    Expects directory structure:
        data/train/real/  *.jpg
        data/train/fake/  *.jpg
        data/val/real/    *.jpg
        data/val/fake/    *.jpg
    """

    def __init__(self, root_dir: str, transform=None):
        self.transform = transform
        self.samples = []
        self.class_map = {"real": 0, "fake": 1}

        for label_name, label_idx in self.class_map.items():
            class_dir = os.path.join(root_dir, label_name)
            if not os.path.exists(class_dir):
                continue
            for fname in os.listdir(class_dir):
                if fname.lower().endswith((".jpg", ".jpeg", ".png")):
                    self.samples.append((os.path.join(class_dir, fname), label_idx))

        logger.info(f"Loaded {len(self.samples)} samples from {root_dir}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        image = Image.open(path).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, label


# ─── Model Definition ─────────────────────────────────────────────────────────
class EfficientNetDetector(nn.Module):
    """
    EfficientNet-B4 backbone with custom deepfake detection head.
    Includes Dropout, BatchNorm, and Dense layers.
    """

    def __init__(self, num_classes: int = 2):
        super().__init__()

        # Backbone — EfficientNet-B4 pretrained on ImageNet
        backbone = models.efficientnet_b4(
            weights=models.EfficientNet_B4_Weights.IMAGENET1K_V1
        )

        # Feature extraction layers (frozen initially)
        self.features = backbone.features
        self.avgpool  = backbone.avgpool

        in_features = backbone.classifier[1].in_features  # 1792

        # Custom classification head
        self.classifier = nn.Sequential(
            nn.BatchNorm1d(in_features),        # Batch Normalization
            nn.Dropout(p=0.4),                  # Dropout layer 1
            nn.Linear(in_features, 512),        # Dense layer 1
            nn.ReLU(inplace=True),
            nn.BatchNorm1d(512),                # Batch Normalization
            nn.Dropout(p=0.4),                  # Dropout layer 2
            nn.Linear(512, num_classes),        # Output layer
        )

    def forward(self, x: torch.Tensor):
        x = self.features(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        x = self.classifier(x)
        return x


# ─── Callbacks (PyTorch equivalents) ──────────────────────────────────────────
class EarlyStopping:
    """Stops training when validation loss stops improving (like Keras EarlyStopping)."""

    def __init__(self, patience: int = 7, min_delta: float = 1e-4):
        self.patience   = patience
        self.min_delta  = min_delta
        self.counter    = 0
        self.best_loss  = np.inf
        self.stop       = False

    def __call__(self, val_loss: float):
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.counter   = 0
        else:
            self.counter += 1
            logger.info(f"EarlyStopping counter: {self.counter}/{self.patience}")
            if self.counter >= self.patience:
                self.stop = True
                logger.info("Early stopping triggered.")


class ModelCheckpoint:
    """Saves best model weights (like Keras ModelCheckpoint)."""

    def __init__(self, save_path: str, monitor: str = "val_loss"):
        self.save_path  = save_path
        self.monitor    = monitor
        self.best_score = np.inf
        os.makedirs(os.path.dirname(save_path), exist_ok=True)

    def __call__(self, val_loss: float, model: nn.Module):
        if val_loss < self.best_score:
            self.best_score = val_loss
            torch.save(model.state_dict(), self.save_path)
            logger.info(f"ModelCheckpoint: saved best model → {self.save_path}")


# ─── Training Loop ────────────────────────────────────────────────────────────
def train():
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info(f"Training on: {device}")

    # Data generators
    train_dataset = DeepfakeDataset(TRAIN_DATA_DIR, transform=train_transform)
    val_dataset   = DeepfakeDataset(VAL_DATA_DIR,   transform=val_transform)

    train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True,  num_workers=4)
    val_loader   = DataLoader(val_dataset,   batch_size=BATCH_SIZE, shuffle=False, num_workers=4)

    # Model
    model = EfficientNetDetector(num_classes=NUM_CLASSES).to(device)

    # Compile parameters — Optimizer, Loss Function, Metrics
    optimizer  = optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=1e-5)
    criterion  = nn.CrossEntropyLoss()                       # Loss function
    scheduler  = ReduceLROnPlateau(                          # ReduceLROnPlateau callback
        optimizer,
        mode="min",
        factor=0.5,
        patience=3,
        verbose=True,
    )

    # Callbacks
    early_stopping    = EarlyStopping(patience=7)
    model_checkpoint  = ModelCheckpoint(save_path=MODEL_SAVE_PATH)

    # fit() — Training loop
    for epoch in range(1, EPOCHS + 1):
        # ── Train phase ──
        model.train()
        train_loss, train_correct, train_total = 0.0, 0, 0

        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss    = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            train_loss    += loss.item() * images.size(0)
            preds          = outputs.argmax(dim=1)
            train_correct += (preds == labels).sum().item()
            train_total   += labels.size(0)

        train_loss /= train_total
        train_acc   = train_correct / train_total

        # ── Validation phase ──
        model.eval()
        val_loss, val_correct, val_total = 0.0, 0, 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs  = model(images)
                loss     = criterion(outputs, labels)
                val_loss += loss.item() * images.size(0)
                preds     = outputs.argmax(dim=1)
                val_correct += (preds == labels).sum().item()
                val_total   += labels.size(0)

        val_loss /= val_total
        val_acc   = val_correct / val_total

        logger.info(
            f"Epoch [{epoch}/{EPOCHS}] "
            f"Train Loss: {train_loss:.4f} | Train Acc: {train_acc:.4f} | "
            f"Val Loss: {val_loss:.4f} | Val Acc: {val_acc:.4f}"
        )

        # Callbacks
        scheduler(val_loss)                             # ReduceLROnPlateau
        model_checkpoint(val_loss, model)               # ModelCheckpoint
        early_stopping(val_loss)                        # EarlyStopping
        if early_stopping.stop:
            break

    logger.info("Training complete.")


if __name__ == "__main__":
    train()

# Veritas AI — Deepfake Detection Platform

> AI-powered deepfake and media manipulation detection with explainable neural network analysis.

![Veritas AI Banner](https://placehold.co/1200x400/080c14/0ea5e9?text=Veritas+AI+%E2%80%94+Deepfake+Detection)

---

## Overview

Veritas AI detects deepfakes and AI-generated facial manipulation in images and videos. It uses an **EfficientNet-B4** backbone with multi-face ensemble aggregation, and provides **GradCAM heatmaps** to visually explain which regions triggered the detection.

### Key Features
- Upload images (JPG, PNG) or videos (MP4, AVI, MOV) up to 50MB
- Real-time async processing with polling
- GradCAM activation heatmap with region tagging
- Video temporal analysis across 10 sampled frames
- Dashboard with history and confidence charts
- Rate limiting: 5 requests/min per IP
- Fully Dockerized, one-command setup

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) ≥ 24
- [Docker Compose](https://docs.docker.com/compose/install/) ≥ 2.20
- 4GB RAM recommended (PyTorch model loading)

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/yourorg/veritas-ai.git
cd veritas-ai

# 2. Configure environment
cp .env.example .env

# 3. Build and start
docker-compose up --build

# 4. Open in browser
open http://localhost
```

The API will be available at `http://localhost:8000` and the UI at `http://localhost:80`.

---

## Architecture

```
veritas-ai/
├── backend/          # FastAPI + PyTorch inference server
│   └── app/
│       ├── models/   # EfficientNet-B4, preprocessor, GradCAM
│       ├── routers/  # Detection + status endpoints
│       ├── services/ # DetectionService, StorageService
│       └── core/     # Rate limiting, logging
└── frontend/         # React + Vite + Tailwind SPA
    └── src/
        ├── components/  # UploadZone, ResultCard, HeatmapViewer
        ├── pages/       # Home, ResultPage, Dashboard
        └── services/    # Axios API client
```

---

## API Reference

### POST `/api/v1/detect`
Upload media for deepfake detection.

```bash
curl -X POST http://localhost:8000/api/v1/detect \
  -F "file=@/path/to/your/image.jpg"
```

Response:
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "message": "File uploaded successfully. Poll /status/{request_id} for results."
}
```

### GET `/api/v1/status/{request_id}`
Poll for results.

```bash
curl http://localhost:8000/api/v1/status/550e8400-e29b-41d4-a716-446655440000
```

Response (completed):
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "processing_time_seconds": 1.23,
  "media_type": "image",
  "verdict": {
    "is_manipulated": true,
    "confidence": 0.87,
    "fake_probability": 0.87,
    "manipulation_type": "face_swap",
    "affected_regions": ["Nose / central face", "Left cheek"]
  },
  "visual": {
    "score": 0.87,
    "faces_detected": 1,
    "bounding_boxes": [[45, 30, 210, 195]]
  },
  "explainability": {
    "heatmap_base64": "...",
    "top_regions": ["Nose / central face", "Left cheek"]
  }
}
```

### GET `/api/v1/results`
List recent detection results.

```bash
curl "http://localhost:8000/api/v1/results?limit=10"
```

### GET `/health`
Health check.

```bash
curl http://localhost:8000/health
```

---

## Using Real Model Weights

The default configuration uses EfficientNet-B4 with ImageNet pretrained weights only (demo mode). To use actual deepfake-trained weights:

1. Download or train a deepfake detection checkpoint compatible with the `EfficientNetDetector` class
2. Place the `.pth` file at `./backend/models/efficientnet_b4.pth`
3. Update `MODEL_PATH` in `.env` if needed
4. Restart: `docker-compose restart backend`

The model expects weights for `EfficientNetDetector` — `features`, `avgpool`, and `classifier` keys matching the architecture in `ensemble_detector.py`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| API Server | FastAPI 0.104 |
| ML Framework | PyTorch 2.1 + TorchVision |
| Backbone | EfficientNet-B4 |
| Face Detection | MTCNN (facenet-pytorch) + OpenCV Haar fallback |
| Explainability | pytorch-grad-cam (GradCAM) |
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Containerization | Docker + Docker Compose |
| Cache | Redis 7 |

---

## Development

```bash
# Backend only (hot reload)
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend only (hot reload)
cd frontend
npm install
npm run dev  # → http://localhost:5173
```

---

## License

MIT License — see [LICENSE](LICENSE) for details.

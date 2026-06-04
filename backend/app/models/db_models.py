"""
Veritas AI - Database Models
Defines both SQLAlchemy ORM (relational) and MongoDB schema (NoSQL) models.
"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy import (
    Column, String, Float, Boolean, Integer,
    DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import declarative_base, relationship
from pydantic import BaseModel, EmailStr, Field
import uuid

Base = declarative_base()


# ─── SQLAlchemy ORM Models (Relational) ───────────────────────────────────────

class User(Base):
    """Represents a registered user."""
    __tablename__ = "users"

    id         = Column(String(36),  primary_key=True, default=lambda: str(uuid.uuid4()))
    name       = Column(String(100), nullable=False)
    email      = Column(String(255), nullable=False, unique=True, index=True)
    password   = Column(String(255), nullable=False)
    created_at = Column(DateTime,    default=datetime.utcnow, nullable=False)
    is_active  = Column(Boolean,     default=True,  nullable=False)

    # Relationship
    detections = relationship("Detection", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"


class Detection(Base):
    """Represents a single deepfake detection result."""
    __tablename__ = "detections"

    id                      = Column(String(36),  primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id              = Column(String(36),  unique=True, nullable=False, index=True)
    user_id                 = Column(String(36),  ForeignKey("users.id"), nullable=True)
    status                  = Column(String(20),  nullable=False, default="processing")
    media_type              = Column(String(10),  nullable=True)   # image | video
    processing_time_seconds = Column(Float,       nullable=True)
    created_at              = Column(DateTime,    default=datetime.utcnow, nullable=False)

    # Verdict fields
    is_manipulated          = Column(Boolean,     nullable=True)
    confidence              = Column(Float,       nullable=True)
    fake_probability        = Column(Float,       nullable=True)
    manipulation_type       = Column(String(50),  nullable=True)
    affected_regions        = Column(JSON,        nullable=True)   # List[str]

    # Visual fields
    faces_detected          = Column(Integer,     nullable=True)
    bounding_boxes          = Column(JSON,        nullable=True)   # List[List[int]]

    # Explainability
    heatmap_base64          = Column(Text,        nullable=True)
    top_regions             = Column(JSON,        nullable=True)   # List[str]

    # Relationship
    user = relationship("User", back_populates="detections")

    def __repr__(self):
        return f"<Detection id={self.id} status={self.status} is_manipulated={self.is_manipulated}>"


class UploadedFile(Base):
    """Tracks uploaded media files."""
    __tablename__ = "uploaded_files"

    id           = Column(String(36),  primary_key=True, default=lambda: str(uuid.uuid4()))
    request_id   = Column(String(36),  ForeignKey("detections.request_id"), nullable=False)
    filename     = Column(String(255), nullable=False)
    file_path    = Column(String(500), nullable=False)
    file_size    = Column(Integer,     nullable=False)   # bytes
    content_type = Column(String(100), nullable=False)
    uploaded_at  = Column(DateTime,    default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<UploadedFile id={self.id} filename={self.filename}>"


# ─── MongoDB Pydantic Schema Models (NoSQL) ───────────────────────────────────

class VerdictSchema(BaseModel):
    """Embedded verdict document inside a detection."""
    is_manipulated:   bool
    confidence:       float = Field(..., ge=0.0, le=1.0)
    fake_probability: float = Field(..., ge=0.0, le=1.0)
    manipulation_type: str  = "authentic"
    affected_regions: List[str] = []


class VisualSchema(BaseModel):
    """Embedded visual analysis data."""
    score:            float
    faces_detected:   int   = 0
    bounding_boxes:   List[List[int]] = []
    frames_analyzed:  Optional[int]   = None
    duration_seconds: Optional[float] = None
    fake_frame_ratio: Optional[float] = None


class ExplainabilitySchema(BaseModel):
    """Embedded GradCAM explainability data."""
    heatmap_base64: Optional[str]       = None
    top_regions:    List[str]           = []


class DetectionDocument(BaseModel):
    """
    MongoDB document schema for the 'detections' collection.
    Maps directly to how data is stored in MongoDB.
    """
    request_id:              str      = Field(default_factory=lambda: str(uuid.uuid4()))
    status:                  str      = "processing"    # processing | completed | failed
    media_type:              Optional[str]  = None      # image | video
    processing_time_seconds: Optional[float] = None
    created_at:              datetime = Field(default_factory=datetime.utcnow)

    verdict:        Optional[VerdictSchema]       = None
    visual:         Optional[VisualSchema]        = None
    explainability: Optional[ExplainabilitySchema] = None

    class Config:
        json_schema_extra = {
            "example": {
                "request_id": "550e8400-e29b-41d4-a716-446655440000",
                "status": "completed",
                "media_type": "image",
                "processing_time_seconds": 1.25,
                "verdict": {
                    "is_manipulated": True,
                    "confidence": 0.92,
                    "fake_probability": 0.92,
                    "manipulation_type": "face_swap",
                    "affected_regions": ["left_eye", "mouth"],
                },
                "visual": {
                    "score": 0.92,
                    "faces_detected": 1,
                    "bounding_boxes": [[45, 30, 210, 220]],
                },
                "explainability": {
                    "heatmap_base64": "<base64_encoded_image>",
                    "top_regions": ["left_eye", "mouth"],
                },
            }
        }


class UserDocument(BaseModel):
    """
    MongoDB document schema for the 'users' collection.
    """
    id:              str      = Field(default_factory=lambda: str(uuid.uuid4()))
    name:            str
    email:           EmailStr
    hashed_password: str
    created_at:      datetime = Field(default_factory=datetime.utcnow)
    is_active:       bool     = True

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "name": "John Doe",
                "email": "john@example.com",
                "hashed_password": "$2b$12$...",
                "created_at": "2024-01-01T00:00:00",
                "is_active": True,
            }
        }

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from jose import jwt
from datetime import datetime, timedelta
from app.services.auth_service import create_user, authenticate_user
from app.config import settings

router = APIRouter()

SECRET_KEY = "veritas-secret-key-change-in-production"
ALGORITHM = "HS256"
TOKEN_EXPIRE_HOURS = 24


def create_token(data: dict) -> str:
    payload = {**data, "exp": datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
async def register(body: RegisterRequest):
    user = await create_user(body.email, body.password, body.name)
    if not user:
        raise HTTPException(status_code=400, detail="Email already registered")
    token = create_token({"email": user["email"], "name": user["name"]})
    return {"token": token, "user": user}


@router.post("/login")
async def login(body: LoginRequest):
    user = await authenticate_user(body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_token({"email": user["email"], "name": user["name"]})
    return {"token": token, "user": user}

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
from passlib.context import CryptContext
from datetime import datetime

client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.MONGODB_DB]
users = db["users"]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def create_user(email: str, password: str, name: str) -> dict | None:
    existing = await users.find_one({"email": email})
    if existing:
        return None
    user = {
        "email": email,
        "name": name,
        "hashed_password": pwd_context.hash(password),
        "created_at": datetime.utcnow().isoformat(),
    }
    await users.insert_one(user)
    return {"email": email, "name": name}


async def authenticate_user(email: str, password: str) -> dict | None:
    user = await users.find_one({"email": email})
    if not user:
        return None
    if not pwd_context.verify(password, user["hashed_password"]):
        return None
    return {"email": user["email"], "name": user["name"]}

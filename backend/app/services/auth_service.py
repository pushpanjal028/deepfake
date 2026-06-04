from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings
import bcrypt
from datetime import datetime

client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.MONGODB_DB]
users = db["users"]

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


async def create_user(email: str, password: str, name: str) -> dict | None:
    existing = await users.find_one({"email": email})
    if existing:
        return None
    user = {
        "email": email,
        "name": name,
        "hashed_password": get_password_hash(password),
        "created_at": datetime.utcnow().isoformat(),
    }
    await users.insert_one(user)
    return {"email": email, "name": name}


async def authenticate_user(email: str, password: str) -> dict | None:
    user = await users.find_one({"email": email})
    if not user:
        return None
    if not verify_password(password, user["hashed_password"]):
        return None
    return {"email": user["email"], "name": user["name"]}

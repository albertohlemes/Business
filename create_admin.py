import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv('/app/backend/.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    
    hashed_password = pwd_context.hash("123456")
    user = {
        "id": "debug_admin_id",
        "email": "admin_debug@test.com",
        "hashed_password": hashed_password,
        "name": "Debug Admin",
        "role": "admin",
        "company_ids": [],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.update_one(
        {"email": "admin_debug@test.com"},
        {"$set": user},
        upsert=True
    )
    print("User admin_debug@test.com created/updated.")

asyncio.run(create_admin())

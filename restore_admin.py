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
        "id": "admin_default",
        "email": "test@test.com",
        "hashed_password": hashed_password,
        "name": "Administrador",
        "role": "admin",
        "company_ids": [],
        "created_at": datetime.now(timezone.utc)
    }
    
    await db.users.update_one(
        {"email": "test@test.com"},
        {"$set": user},
        upsert=True
    )
    print("User test@test.com (password: 123456) created.")

if __name__ == "__main__":
    asyncio.run(create_admin())

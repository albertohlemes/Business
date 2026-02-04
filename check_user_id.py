import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def get_user_id():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]
    user = await db.users.find_one({'email': 'test@test.com'})
    print(f"User ID: {user.get('id')}")

asyncio.run(get_user_id())

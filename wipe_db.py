import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def wipe_database():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    
    print(f"Connecting to {mongo_url}...")
    client = AsyncIOMotorClient(mongo_url)
    
    print(f"Dropping database: {db_name}...")
    await client.drop_database(db_name)
    
    print("Database wiped successfully.")

if __name__ == "__main__":
    asyncio.run(wipe_database())

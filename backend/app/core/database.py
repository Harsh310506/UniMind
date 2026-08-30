"""
UniMind Database - MongoDB connection using Motor + Beanie ODM
"""
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.core.config import settings

# Will be populated on startup
db_client: AsyncIOMotorClient = None


async def init_db():
    """Initialize MongoDB connection and Beanie ODM"""
    global db_client

    # Import all document models here
    from app.models.user import User
    from app.models.document import Document
    from app.models.conversation import Conversation, Message
    from app.models.quiz import Quiz, Question
    from app.models.quiz_attempt import QuizAttempt

    try:
        db_client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
        )
        # Test the connection
        await db_client.admin.command("ping")
        database = db_client[settings.DATABASE_NAME]

        await init_beanie(
            database=database,
            document_models=[
                User,
                Document,
                Conversation,
                Message,
                Quiz,
                Question,
                QuizAttempt,
            ],
        )
        print(f"[DB] Connected to MongoDB: {settings.DATABASE_NAME}")
    except Exception as e:
        print(f"[WARNING] MongoDB connection failed: {e}")
        print("[WARNING] Server will start but database features won't work.")
        print("[WARNING] Please set a valid MONGODB_URI in .env")


async def close_db():
    """Close MongoDB connection"""
    global db_client
    if db_client:
        db_client.close()
        print("[DB] MongoDB connection closed")

"""
User Model - Beanie Document for MongoDB
"""
from beanie import Document
from pydantic import EmailStr, Field
from datetime import datetime
from typing import Optional
from uuid import uuid4


class User(Document):
    user_id: str = Field(default_factory=lambda: str(uuid4()))
    email: EmailStr
    hashed_password: str
    full_name: str
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = ["email", "user_id"]

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "full_name": "John Doe",
                "is_active": True,
            }
        }

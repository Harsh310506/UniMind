"""
Conversation & Message Models - Beanie Documents for chat
"""
from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional, List
from uuid import uuid4
from enum import Enum


class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


class Conversation(Document):
    conversation_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    title: str = "New Conversation"
    document_ids: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_archived: bool = False

    class Settings:
        name = "conversations"
        indexes = ["conversation_id", "user_id"]


class Message(Document):
    message_id: str = Field(default_factory=lambda: str(uuid4()))
    conversation_id: str
    role: MessageRole
    content: str
    sources: Optional[List[dict]] = None  # [{chunk_id, page, text_preview}]
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "messages"
        indexes = ["conversation_id", "message_id"]

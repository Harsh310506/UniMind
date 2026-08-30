"""
Document Model - Beanie Document for uploaded files
"""
from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional
from uuid import uuid4
from enum import Enum


class FileType(str, Enum):
    PDF = "PDF"
    DOCX = "DOCX"
    TXT = "TXT"
    IMAGE = "IMAGE"
    WEB = "WEB"
    YOUTUBE = "YOUTUBE"


class DocumentStatus(str, Enum):
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Document(Document):
    doc_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    filename: str
    file_path: str
    file_type: FileType
    file_size: int  # bytes
    status: DocumentStatus = DocumentStatus.PROCESSING
    num_chunks: int = 0
    preview_text: Optional[str] = None
    summary: Optional[dict] = None  # Cache for AI summary
    upload_date: datetime = Field(default_factory=datetime.utcnow)
    processed_date: Optional[datetime] = None
    is_deleted: bool = False

    class Settings:
        name = "documents"
        indexes = ["doc_id", "user_id", "status"]

    class Config:
        json_schema_extra = {
            "example": {
                "filename": "research_paper.pdf",
                "file_type": "PDF",
                "file_size": 1024000,
                "status": "COMPLETED",
            }
        }

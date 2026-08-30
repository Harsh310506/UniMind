"""
Flashcard Model - Beanie Document for AI-Generated Flashcard Decks
Includes Spaced Repetition (SM-2) tracking
"""
from beanie import Document
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import uuid4
from enum import Enum


class CardDifficulty(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"


class CardState(str, Enum):
    NEW = "NEW"
    LEARNING = "LEARNING"
    REVIEW = "REVIEW"
    MASTERED = "MASTERED"


class FlashcardItem(BaseModel):
    card_id: str = Field(default_factory=lambda: str(uuid4()))
    front: str  # Question or Term
    back: str  # Answer or Definition
    key_takeaway: Optional[str] = None
    difficulty: CardDifficulty = CardDifficulty.MEDIUM
    
    # Spaced repetition metrics (SM-2)
    state: CardState = CardState.NEW
    repetitions: int = 0
    interval: int = 1  # in days
    ease_factor: float = 2.5
    due_date: datetime = Field(default_factory=datetime.utcnow)
    last_reviewed: Optional[datetime] = None


class FlashcardDeck(Document):
    deck_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    document_id: str
    document_name: str
    title: str
    description: Optional[str] = None
    cards: List[FlashcardItem] = []
    total_cards: int = 0
    mastered_cards: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "flashcard_decks"
        indexes = ["deck_id", "user_id", "document_id"]

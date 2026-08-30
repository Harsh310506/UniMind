"""
Quiz & Question Models - Beanie Documents for quiz generation
"""
from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import Optional, List
from uuid import uuid4
from enum import Enum


class Difficulty(str, Enum):
    EASY = "EASY"
    MEDIUM = "MEDIUM"
    HARD = "HARD"
    MIXED = "MIXED"


class QuizStatus(str, Enum):
    GENERATING = "GENERATING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Quiz(Document):
    quiz_id: str = Field(default_factory=lambda: str(uuid4()))
    document_id: str
    user_id: str
    title: str
    difficulty: Difficulty = Difficulty.MEDIUM
    num_questions: int = 10
    status: QuizStatus = QuizStatus.GENERATING
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "quizzes"
        indexes = ["quiz_id", "user_id", "document_id"]


class Question(Document):
    question_id: str = Field(default_factory=lambda: str(uuid4()))
    quiz_id: str
    question_number: int
    question_text: str
    options: List[str]  # Exactly 4 options
    correct_answer: int  # Index 0-3
    explanation: str
    difficulty: Difficulty = Difficulty.MEDIUM

    class Settings:
        name = "questions"
        indexes = ["quiz_id", "question_id"]

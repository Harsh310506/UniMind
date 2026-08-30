"""
QuizAttempt Model - Persists each quiz submission result to MongoDB
"""
from beanie import Document
from pydantic import Field
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import uuid4


class QuizAttempt(Document):
    attempt_id: str = Field(default_factory=lambda: str(uuid4()))
    quiz_id: str
    user_id: str
    document_id: str
    quiz_title: str

    # Submitted answers: { question_id: selected_option_index }
    answers: Dict[str, Optional[int]] = Field(default_factory=dict)

    # Graded results
    score: float          # 0.0 – 100.0
    correct: int
    total: int

    # Full per-question breakdown (stored so review needs no re-computation)
    results: List[Dict[str, Any]] = Field(default_factory=list)

    completed_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "quiz_attempts"
        indexes = ["attempt_id", "quiz_id", "user_id"]

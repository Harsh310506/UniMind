"""
Quiz API Routes - Generate, take, manage quizzes, and persist attempt results
"""
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document, DocumentStatus
from app.models.quiz import Quiz, Question, Difficulty, QuizStatus
from app.models.quiz_attempt import QuizAttempt
from app.services.llm_service import generate_quiz_questions

router = APIRouter(prefix="/api/quiz", tags=["Quiz"])


class GenerateQuizRequest(BaseModel):
    document_id: str
    difficulty: str = "MEDIUM"
    num_questions: int = Field(default=10, ge=5, le=20)


class SubmitQuizRequest(BaseModel):
    answers: dict  # {question_id: selected_option_index}


async def background_generate_quiz(quiz_id: str, document_id: str, difficulty: str, num_questions: int):
    """Background task: generate quiz questions"""
    try:
        quiz = await Quiz.find_one({"quiz_id": quiz_id})
        if not quiz:
            return

        # Get document content from ChromaDB
        from app.services.vector_store import get_chroma_collection
        collection = get_chroma_collection()
        results = collection.get(
            where={"document_id": document_id},
            include=["documents"],
            limit=30,
        )

        if not results["documents"]:
            quiz.status = QuizStatus.FAILED
            await quiz.save()
            return

        content = "\n\n".join(results["documents"])

        # Generate questions using LLM
        quiz_data = await generate_quiz_questions(content, num_questions, difficulty)

        # Save questions
        questions = quiz_data.get("questions", [])
        for i, q in enumerate(questions):
            question = Question(
                quiz_id=quiz_id,
                question_number=i + 1,
                question_text=q["question"],
                options=q["options"],
                correct_answer=q["correct_answer"],
                explanation=q.get("explanation", ""),
                difficulty=Difficulty(q.get("difficulty", difficulty)),
            )
            await question.insert()

        quiz.status = QuizStatus.COMPLETED
        quiz.num_questions = len(questions)
        await quiz.save()

        print(f"[OK] Quiz {quiz_id} generated: {len(questions)} questions")

    except Exception as e:
        print(f"[ERROR] Error generating quiz {quiz_id}: {e}")
        try:
            quiz = await Quiz.find_one({"quiz_id": quiz_id})
            if quiz:
                quiz.status = QuizStatus.FAILED
                await quiz.save()
        except:
            pass


# ─── List all user quizzes ───────────────────────────────────────────────────

@router.get("")
async def list_all_quizzes(current_user: User = Depends(get_current_user)):
    """List ALL quizzes for the current user across all documents"""
    quizzes = await Quiz.find(
        {"user_id": current_user.user_id}
    ).sort(-Quiz.created_at).to_list()

    result = []
    for q in quizzes:
        # Count attempts for this quiz
        attempt_count = await QuizAttempt.find({"quiz_id": q.quiz_id}).count()
        # Best score
        attempts = await QuizAttempt.find({"quiz_id": q.quiz_id}).sort(-QuizAttempt.score).first_or_none()
        best_score = attempts.score if attempts else None

        # Get document filename
        doc = await Document.find_one({"doc_id": q.document_id})

        result.append({
            "quiz_id": q.quiz_id,
            "title": q.title,
            "document_id": q.document_id,
            "document_name": doc.filename if doc else "Unknown",
            "difficulty": q.difficulty.value,
            "num_questions": q.num_questions,
            "status": q.status.value,
            "created_at": q.created_at.isoformat(),
            "attempt_count": attempt_count,
            "best_score": best_score,
        })

    return {"quizzes": result}


# ─── Generate ────────────────────────────────────────────────────────────────

@router.post("/generate", status_code=status.HTTP_201_CREATED)
async def generate_quiz(
    req: GenerateQuizRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Generate a quiz from a document"""
    doc = await Document.find_one(
        {"doc_id": req.document_id, "user_id": current_user.user_id}
    )
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status != DocumentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Document is still processing")

    try:
        difficulty = Difficulty(req.difficulty)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid difficulty. Use: EASY, MEDIUM, HARD, MIXED")

    quiz = Quiz(
        document_id=req.document_id,
        user_id=current_user.user_id,
        title=f"Quiz - {doc.filename}",
        difficulty=difficulty,
        num_questions=req.num_questions,
        status=QuizStatus.GENERATING,
    )
    await quiz.insert()

    background_tasks.add_task(
        background_generate_quiz,
        quiz.quiz_id, req.document_id, req.difficulty, req.num_questions,
    )

    return {
        "quiz_id": quiz.quiz_id,
        "status": "GENERATING",
        "message": "Quiz generation started",
    }


# ─── Status & fetch quiz ─────────────────────────────────────────────────────

@router.get("/{quiz_id}/status")
async def get_quiz_status(quiz_id: str, current_user: User = Depends(get_current_user)):
    """Check quiz generation status"""
    quiz = await Quiz.find_one(Quiz.quiz_id == quiz_id, Quiz.user_id == current_user.user_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    return {
        "quiz_id": quiz.quiz_id,
        "status": quiz.status.value,
        "num_questions": quiz.num_questions,
        "title": quiz.title,
    }


@router.get("/{quiz_id}")
async def get_quiz(quiz_id: str, current_user: User = Depends(get_current_user)):
    """Get quiz with questions (without answers for quiz-taking mode)"""
    quiz = await Quiz.find_one(Quiz.quiz_id == quiz_id, Quiz.user_id == current_user.user_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.status != QuizStatus.COMPLETED:
        raise HTTPException(status_code=400, detail=f"Quiz status: {quiz.status.value}")

    questions = await Question.find(
        Question.quiz_id == quiz_id,
    ).sort(Question.question_number).to_list()

    return {
        "quiz_id": quiz.quiz_id,
        "title": quiz.title,
        "difficulty": quiz.difficulty.value,
        "num_questions": quiz.num_questions,
        "created_at": quiz.created_at.isoformat(),
        "questions": [
            {
                "question_id": q.question_id,
                "question_number": q.question_number,
                "question_text": q.question_text,
                "options": q.options,
                "difficulty": q.difficulty.value,
                # correct_answer and explanation intentionally omitted here
            }
            for q in questions
        ],
    }


# ─── Submit & persist attempt ────────────────────────────────────────────────

@router.post("/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: str,
    req: SubmitQuizRequest,
    current_user: User = Depends(get_current_user),
):
    """Submit quiz answers, grade them, save the attempt, and return results"""
    quiz = await Quiz.find_one(Quiz.quiz_id == quiz_id, Quiz.user_id == current_user.user_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    questions = await Question.find(
        Question.quiz_id == quiz_id,
    ).sort(Question.question_number).to_list()

    # Grade answers
    correct_count = 0
    results = []

    for q in questions:
        user_answer = req.answers.get(q.question_id)
        is_correct = user_answer == q.correct_answer

        if is_correct:
            correct_count += 1

        results.append({
            "question_id": q.question_id,
            "question_number": q.question_number,
            "question_text": q.question_text,
            "options": q.options,
            "user_answer": user_answer,
            "correct_answer": q.correct_answer,
            "is_correct": is_correct,
            "explanation": q.explanation,
            "difficulty": q.difficulty.value,
        })

    score = (correct_count / len(questions)) * 100 if questions else 0

    # ── Persist the attempt ──────────────────────────────────────────────────
    attempt = QuizAttempt(
        quiz_id=quiz_id,
        user_id=current_user.user_id,
        document_id=quiz.document_id,
        quiz_title=quiz.title,
        answers=req.answers,
        score=round(score, 1),
        correct=correct_count,
        total=len(questions),
        results=results,
    )
    await attempt.insert()
    # ────────────────────────────────────────────────────────────────────────

    return {
        "attempt_id": attempt.attempt_id,
        "quiz_id": quiz_id,
        "title": quiz.title,
        "score": round(score, 1),
        "correct": correct_count,
        "total": len(questions),
        "results": results,
    }


# ─── Attempt history ─────────────────────────────────────────────────────────

@router.get("/{quiz_id}/attempts")
async def list_attempts(quiz_id: str, current_user: User = Depends(get_current_user)):
    """List all attempts for a quiz (summary: score, date, attempt_id)"""
    quiz = await Quiz.find_one(Quiz.quiz_id == quiz_id, Quiz.user_id == current_user.user_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    attempts = await QuizAttempt.find(
        {"quiz_id": quiz_id, "user_id": current_user.user_id}
    ).sort(-QuizAttempt.completed_at).to_list()

    return {
        "quiz_id": quiz_id,
        "quiz_title": quiz.title,
        "attempts": [
            {
                "attempt_id": a.attempt_id,
                "score": a.score,
                "correct": a.correct,
                "total": a.total,
                "completed_at": a.completed_at.isoformat(),
            }
            for a in attempts
        ],
    }


@router.get("/{quiz_id}/attempts/{attempt_id}")
async def get_attempt(
    quiz_id: str,
    attempt_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get full detail of a specific attempt (for review)"""
    attempt = await QuizAttempt.find_one(
        {"attempt_id": attempt_id, "quiz_id": quiz_id, "user_id": current_user.user_id}
    )
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    return {
        "attempt_id": attempt.attempt_id,
        "quiz_id": attempt.quiz_id,
        "quiz_title": attempt.quiz_title,
        "score": attempt.score,
        "correct": attempt.correct,
        "total": attempt.total,
        "completed_at": attempt.completed_at.isoformat(),
        "results": attempt.results,
    }


# ─── Per-document quiz list ───────────────────────────────────────────────────

@router.get("/document/{document_id}")
async def list_quizzes_by_document(
    document_id: str,
    current_user: User = Depends(get_current_user),
):
    """List all quizzes for a specific document"""
    quizzes = await Quiz.find(
        {"document_id": document_id, "user_id": current_user.user_id}
    ).sort(-Quiz.created_at).to_list()

    return {
        "quizzes": [
            {
                "quiz_id": q.quiz_id,
                "title": q.title,
                "difficulty": q.difficulty.value,
                "num_questions": q.num_questions,
                "status": q.status.value,
                "created_at": q.created_at.isoformat(),
            }
            for q in quizzes
        ],
    }


# ─── Delete ───────────────────────────────────────────────────────────────────

@router.delete("/{quiz_id}")
async def delete_quiz(quiz_id: str, current_user: User = Depends(get_current_user)):
    """Delete a quiz, its questions, and all its attempts"""
    quiz = await Quiz.find_one(Quiz.quiz_id == quiz_id, Quiz.user_id == current_user.user_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    await Question.find({"quiz_id": quiz_id}).delete()
    await QuizAttempt.find({"quiz_id": quiz_id}).delete()
    await quiz.delete()

    return {"message": "Quiz deleted", "quiz_id": quiz_id}

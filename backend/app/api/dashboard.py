from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document, DocumentStatus
from app.models.conversation import Conversation
from app.models.quiz import Quiz

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get aggregated dashboard statistics"""
    
    # Run counts in parallel (Beanie supports async)
    doc_count = await Document.find({"user_id": current_user.user_id, "is_deleted": False}).count()
    chat_count = await Conversation.find({"user_id": current_user.user_id}).count()
    quiz_count = await Quiz.find({"user_id": current_user.user_id}).count()
    
    # Count completed documents as "Analysis" (documents that have been fully processed)
    analysis_count = await Document.find(
        {"user_id": current_user.user_id, "is_deleted": False, "status": DocumentStatus.COMPLETED}
    ).count()

    return {
        "documents": doc_count,
        "conversations": chat_count,
        "quizzes": quiz_count,
        "analysis": analysis_count
    }

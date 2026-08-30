from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document, DocumentStatus
from app.models.conversation import Conversation
from app.models.quiz import Quiz

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get aggregated dashboard statistics plus recent activity"""

    # Run counts
    doc_count = await Document.find({"user_id": current_user.user_id, "is_deleted": False}).count()
    chat_count = await Conversation.find({"user_id": current_user.user_id}).count()
    quiz_count = await Quiz.find({"user_id": current_user.user_id}).count()

    # Count completed documents as "Analysis"
    analysis_count = await Document.find(
        {"user_id": current_user.user_id, "is_deleted": False, "status": DocumentStatus.COMPLETED}
    ).count()

    # Recent documents (last 5)
    recent_docs_raw = await Document.find(
        {"user_id": current_user.user_id, "is_deleted": False}
    ).sort(-Document.upload_date).limit(5).to_list()

    recent_docs = [
        {
            "doc_id": d.doc_id,
            "filename": d.filename,
            "file_type": d.file_type.value if hasattr(d.file_type, "value") else str(d.file_type),
            "status": d.status.value if hasattr(d.status, "value") else str(d.status),
            "upload_date": d.upload_date.isoformat(),
        }
        for d in recent_docs_raw
    ]

    # Recent conversations (last 3)
    recent_convs_raw = await Conversation.find(
        {"user_id": current_user.user_id, "is_archived": False}
    ).sort(-Conversation.updated_at).limit(3).to_list()

    recent_conversations = [
        {
            "conversation_id": c.conversation_id,
            "title": c.title,
            "updated_at": c.updated_at.isoformat(),
        }
        for c in recent_convs_raw
    ]

    return {
        "documents": doc_count,
        "conversations": chat_count,
        "quizzes": quiz_count,
        "analysis": analysis_count,
        "recent_documents": recent_docs,
        "recent_conversations": recent_conversations,
    }

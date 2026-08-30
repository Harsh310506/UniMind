import re
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document, DocumentStatus
from app.models.conversation import Conversation
from app.models.quiz import Quiz
from app.models.flashcard import FlashcardDeck

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    """Get aggregated dashboard statistics plus recent activity"""

    # Run counts
    doc_count = await Document.find({"user_id": current_user.user_id, "is_deleted": False}).count()
    chat_count = await Conversation.find({"user_id": current_user.user_id}).count()
    quiz_count = await Quiz.find({"user_id": current_user.user_id}).count()
    deck_count = await FlashcardDeck.find({"user_id": current_user.user_id}).count()

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
        "flashcards": deck_count,
        "analysis": analysis_count,
        "recent_documents": recent_docs,
        "recent_conversations": recent_conversations,
    }


@router.get("/search")
async def global_spotlight_search(
    q: str = Query(..., min_length=1, max_length=100),
    current_user: User = Depends(get_current_user),
):
    """
    Unified spotlight search across documents, chat conversations, quizzes, and flashcard decks
    """
    clean_q = q.strip()
    regex_pattern = re.compile(re.escape(clean_q), re.IGNORECASE)

    # 1. Search Documents
    docs = await Document.find({
        "user_id": current_user.user_id,
        "is_deleted": False,
        "$or": [
            {"filename": {"$regex": regex_pattern}},
            {"preview_text": {"$regex": regex_pattern}},
        ]
    }).limit(6).to_list()

    doc_results = [
        {
            "id": d.doc_id,
            "title": d.filename,
            "subtitle": f"{d.file_type.value if hasattr(d.file_type, 'value') else d.file_type} • {d.status.value if hasattr(d.status, 'value') else d.status}",
            "type": "DOCUMENT",
            "url": f"/documents?doc={d.doc_id}",
        }
        for d in docs
    ]

    # 2. Search Conversations
    convs = await Conversation.find({
        "user_id": current_user.user_id,
        "is_archived": False,
        "title": {"$regex": regex_pattern},
    }).limit(5).to_list()

    conv_results = [
        {
            "id": c.conversation_id,
            "title": c.title,
            "subtitle": f"Updated {c.updated_at.strftime('%b %d, %Y')}",
            "type": "CHAT",
            "url": f"/chat?id={c.conversation_id}",
        }
        for c in convs
    ]

    # 3. Search Quizzes
    quizzes = await Quiz.find({
        "user_id": current_user.user_id,
        "title": {"$regex": regex_pattern},
    }).limit(4).to_list()

    quiz_results = [
        {
            "id": qz.quiz_id,
            "title": qz.title,
            "subtitle": f"{qz.difficulty.value if hasattr(qz.difficulty, 'value') else qz.difficulty} • {qz.num_questions} questions",
            "type": "QUIZ",
            "url": f"/quiz?quizId={qz.quiz_id}",
        }
        for qz in quizzes
    ]

    # 4. Search Flashcard Decks
    decks = await FlashcardDeck.find({
        "user_id": current_user.user_id,
        "title": {"$regex": regex_pattern},
    }).limit(4).to_list()

    deck_results = [
        {
            "id": dk.deck_id,
            "title": dk.title,
            "subtitle": f"{dk.total_cards} cards • {dk.document_name}",
            "type": "FLASHCARD",
            "url": f"/flashcards?deckId={dk.deck_id}",
        }
        for dk in decks
    ]

    total_matches = len(doc_results) + len(conv_results) + len(quiz_results) + len(deck_results)

    return {
        "query": clean_q,
        "total_results": total_matches,
        "documents": doc_results,
        "chats": conv_results,
        "quizzes": quiz_results,
        "flashcards": deck_results,
    }

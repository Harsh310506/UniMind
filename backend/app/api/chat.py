"""
Chat API Routes - Conversations, messages, RAG-based responses
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.user import User
from app.models.conversation import Conversation, Message, MessageRole
from app.services.vector_store import hybrid_search, prepare_context
from app.services.llm_service import rag_chat, general_chat

router = APIRouter(prefix="/api/chat", tags=["Chat"])


class CreateConversationRequest(BaseModel):
    document_ids: Optional[List[str]] = None
    title: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str
    document_ids: Optional[List[str]] = None


class RenameConversationRequest(BaseModel):
    title: str


@router.post("/conversations")
async def create_conversation(
    req: CreateConversationRequest,
    current_user: User = Depends(get_current_user),
):
    """Create a new conversation"""
    conv = Conversation(
        user_id=current_user.user_id,
        title=req.title or "New Conversation",
        document_ids=req.document_ids or [],
    )
    await conv.insert()

    return {
        "conversation_id": conv.conversation_id,
        "title": conv.title,
        "document_ids": conv.document_ids,
        "created_at": conv.created_at.isoformat(),
    }


@router.get("/conversations")
async def list_conversations(current_user: User = Depends(get_current_user)):
    """List user's conversations"""
    conversations = await Conversation.find(
        {"user_id": current_user.user_id, "is_archived": False}
    ).sort(-Conversation.updated_at).to_list()

    result = []
    for conv in conversations:
        # Get last message for preview
        last_msg = await Message.find(
            {"conversation_id": conv.conversation_id}
        ).sort(-Message.timestamp).first_or_none()

        result.append({
            "conversation_id": conv.conversation_id,
            "title": conv.title,
            "document_ids": conv.document_ids,
            "created_at": conv.created_at.isoformat(),
            "updated_at": conv.updated_at.isoformat(),
            "last_message": last_msg.content[:100] if last_msg else None,
            "last_message_role": last_msg.role.value if last_msg else None,
        })

    return {"conversations": result}


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get conversation with all messages"""
    conv = await Conversation.find_one(
        {"conversation_id": conversation_id, "user_id": current_user.user_id}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await Message.find(
        {"conversation_id": conversation_id}
    ).sort(+Message.timestamp).to_list()

    return {
        "conversation_id": conv.conversation_id,
        "title": conv.title,
        "document_ids": conv.document_ids,
        "created_at": conv.created_at.isoformat(),
        "messages": [
            {
                "message_id": m.message_id,
                "role": m.role.value,
                "content": m.content,
                "sources": m.sources,
                "timestamp": m.timestamp.isoformat(),
            }
            for m in messages
        ],
    }


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    req: SendMessageRequest,
    current_user: User = Depends(get_current_user),
):
    """Send a message and get AI response"""
    conv = await Conversation.find_one(
        Conversation.conversation_id == conversation_id,
        Conversation.user_id == current_user.user_id,
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user message
    user_msg = Message(
        conversation_id=conversation_id,
        role=MessageRole.USER,
        content=req.content,
    )
    await user_msg.insert()

    # Determine if RAG or general chat
    doc_ids = req.document_ids or conv.document_ids
    sources_data = []

    try:
        if doc_ids:
            # RAG mode: search documents and build context
            search_results = await hybrid_search(
                query=req.content,
                document_ids=doc_ids,
                user_id=current_user.user_id,
                top_k=5,
            )

            context = prepare_context(search_results)
            sources_data = [
                {
                    "chunk_id": f"{r['document_id']}_chunk_{r['chunk_index']}",
                    "page": r.get("source_page", 0),
                    "text_preview": r["text"][:150],
                }
                for r in search_results[:3]
            ]

            # Get conversation history
            history_msgs = await Message.find(
                Message.conversation_id == conversation_id,
            ).sort(-Message.timestamp).limit(10).to_list()

            history = [
                {"role": m.role.value, "content": m.content}
                for m in reversed(history_msgs[1:])  # exclude the message we just sent
            ]

            response_text = await rag_chat(req.content, context, history)
        else:
            # General chat mode
            history_msgs = await Message.find(
                Message.conversation_id == conversation_id,
            ).sort(-Message.timestamp).limit(10).to_list()

            history = [
                {"role": m.role.value, "content": m.content}
                for m in reversed(history_msgs[1:])
            ]

            response_text = await general_chat(req.content, history)

    except Exception as e:
        response_text = f"I'm sorry, I encountered an error: {str(e)}"

    # Save assistant response
    assistant_msg = Message(
        conversation_id=conversation_id,
        role=MessageRole.ASSISTANT,
        content=response_text,
        sources=sources_data if sources_data else None,
    )
    await assistant_msg.insert()

    # Update conversation title if first message
    if conv.title == "New Conversation":
        conv.title = req.content[:50] + ("..." if len(req.content) > 50 else "")
    conv.updated_at = datetime.utcnow()
    await conv.save()

    return {
        "message_id": assistant_msg.message_id,
        "role": "assistant",
        "content": response_text,
        "sources": sources_data,
        "timestamp": assistant_msg.timestamp.isoformat(),
    }


@router.patch("/conversations/{conversation_id}")
async def rename_conversation(
    conversation_id: str,
    req: RenameConversationRequest,
    current_user: User = Depends(get_current_user),
):
    """Rename a conversation"""
    conv = await Conversation.find_one(
        {"conversation_id": conversation_id, "user_id": current_user.user_id}
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.title = req.title.strip() or conv.title
    conv.updated_at = datetime.utcnow()
    await conv.save()
    return {"conversation_id": conv.conversation_id, "title": conv.title}


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    current_user: User = Depends(get_current_user),
):
    """Delete (archive) a conversation"""
    conv = await Conversation.find_one(
        Conversation.conversation_id == conversation_id,
        Conversation.user_id == current_user.user_id,
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conv.is_archived = True
    await conv.save()

    return {"message": "Conversation deleted", "conversation_id": conversation_id}

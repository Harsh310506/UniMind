"""
Flashcard Management API Routes - Deck Generation, Spaced Repetition (SM-2), Study & Anki Export
"""
import json
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import uuid4
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document, DocumentStatus
from app.models.flashcard import FlashcardDeck, FlashcardItem, CardDifficulty, CardState
from app.services.llm_service import call_groq_llm
from app.services.vector_store import get_chroma_collection

router = APIRouter(prefix="/api/flashcards", tags=["Flashcards"])


class GenerateFlashcardsRequest(BaseModel):
    document_id: str
    num_cards: int = 10
    title: Optional[str] = None


class ReviewCardRequest(BaseModel):
    card_id: str
    rating: int  # 1: Again / Hard, 2: Good, 3: Easy


@router.post("/generate")
async def generate_flashcards(
    req: GenerateFlashcardsRequest,
    current_user: User = Depends(get_current_user),
):
    """Generate an AI-powered flashcard deck from an indexed document"""
    doc = await Document.find_one(
        Document.doc_id == req.document_id,
        Document.user_id == current_user.user_id,
    )
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status != DocumentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Document is still processing")

    # Get content from ChromaDB or preview
    content = doc.preview_text or ""
    try:
        collection = get_chroma_collection()
        results = collection.get(
            where={"document_id": req.document_id},
            include=["documents"],
            limit=25,
        )
        if results["documents"]:
            content = "\n\n".join(results["documents"][:15])
    except Exception:
        pass

    if not content or len(content) < 50:
        raise HTTPException(status_code=400, detail="Document has insufficient text for flashcards")

    system_prompt = (
        "You are an expert educator and cognitive scientist specializing in spaced repetition and high-yield flashcards. "
        "Create concise, clear, and memorable flashcards from the provided document text. "
        "Each flashcard must contain:\n"
        "- front: Question, core concept, or prompt (max 20 words)\n"
        "- back: Direct, accurate, comprehensive answer or definition (max 60 words)\n"
        "- key_takeaway: 1-sentence mnemonic or key insight\n"
        "- difficulty: EASY, MEDIUM, or HARD\n\n"
        "Return ONLY a valid JSON array of objects with keys: 'front', 'back', 'key_takeaway', 'difficulty'. Do not include markdown code blocks or text."
    )

    user_prompt = (
        f"Generate exactly {req.num_cards} flashcards from this document material:\n\n"
        f"{content[:8000]}"
    )

    try:
        response_text = await call_groq_llm(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.3,
            max_tokens=2500,
            json_mode=True,
        )

        # Parse JSON
        clean_text = response_text.strip()
        if clean_text.startswith("```"):
            clean_text = clean_text.split("```")[1]
            if clean_text.startswith("json"):
                clean_text = clean_text[4:]
            clean_text = clean_text.strip()

        parsed = json.loads(clean_text)
        cards_data = parsed if isinstance(parsed, list) else parsed.get("flashcards", parsed.get("cards", []))

        cards: List[FlashcardItem] = []
        for c in cards_data:
            diff = CardDifficulty.MEDIUM
            raw_diff = str(c.get("difficulty", "MEDIUM")).upper()
            if raw_diff in ("EASY", "MEDIUM", "HARD"):
                diff = CardDifficulty(raw_diff)

            cards.append(FlashcardItem(
                card_id=str(uuid4()),
                front=c.get("front", "").strip(),
                back=c.get("back", "").strip(),
                key_takeaway=c.get("key_takeaway", "").strip(),
                difficulty=diff,
                state=CardState.NEW,
                repetitions=0,
                interval=1,
                ease_factor=2.5,
                due_date=datetime.utcnow(),
            ))

        if not cards:
            raise ValueError("No valid flashcards could be parsed from LLM response")

        deck_title = req.title.strip() if req.title and req.title.strip() else f"Flashcards: {doc.filename}"

        deck = FlashcardDeck(
            deck_id=str(uuid4()),
            user_id=current_user.user_id,
            document_id=doc.doc_id,
            document_name=doc.filename,
            title=deck_title[:100],
            description=f"{len(cards)} cards generated from {doc.filename}",
            cards=cards,
            total_cards=len(cards),
            mastered_cards=0,
        )
        await deck.save()

        return {
            "message": "Flashcard deck generated successfully",
            "deck_id": deck.deck_id,
            "title": deck.title,
            "total_cards": deck.total_cards,
            "cards": [c.dict() for c in deck.cards],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Flashcard generation failed: {str(e)}")


@router.get("/decks")
async def list_decks(current_user: User = Depends(get_current_user)):
    """List all flashcard decks for the current user"""
    decks = await FlashcardDeck.find(
        FlashcardDeck.user_id == current_user.user_id
    ).sort(-FlashcardDeck.created_at).to_list()

    now = datetime.utcnow()
    deck_list = []
    for d in decks:
        due_count = sum(1 for c in d.cards if c.due_date <= now)
        mastered_count = sum(1 for c in d.cards if c.state == CardState.MASTERED or c.interval >= 14)
        deck_list.append({
            "deck_id": d.deck_id,
            "title": d.title,
            "document_id": d.document_id,
            "document_name": d.document_name,
            "total_cards": d.total_cards,
            "due_cards": due_count,
            "mastered_cards": mastered_count,
            "created_at": d.created_at.isoformat(),
            "updated_at": d.updated_at.isoformat(),
        })

    return {"decks": deck_list}


@router.get("/decks/{deck_id}")
async def get_deck(deck_id: str, current_user: User = Depends(get_current_user)):
    """Get flashcard deck details and all its cards"""
    deck = await FlashcardDeck.find_one(
        FlashcardDeck.deck_id == deck_id,
        FlashcardDeck.user_id == current_user.user_id,
    )
    if not deck:
        raise HTTPException(status_code=404, detail="Flashcard deck not found")

    return {
        "deck_id": deck.deck_id,
        "title": deck.title,
        "document_id": deck.document_id,
        "document_name": deck.document_name,
        "total_cards": deck.total_cards,
        "cards": [c.dict() for c in deck.cards],
        "created_at": deck.created_at.isoformat(),
    }


@router.post("/decks/{deck_id}/review")
async def review_card(
    deck_id: str,
    req: ReviewCardRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Review a flashcard and update its SM-2 spaced repetition metrics
    Rating: 1 = Again/Hard, 2 = Good, 3 = Easy
    """
    deck = await FlashcardDeck.find_one(
        FlashcardDeck.deck_id == deck_id,
        FlashcardDeck.user_id == current_user.user_id,
    )
    if not deck:
        raise HTTPException(status_code=404, detail="Flashcard deck not found")

    target_card: Optional[FlashcardItem] = None
    for c in deck.cards:
        if c.card_id == req.card_id:
            target_card = c
            break

    if not target_card:
        raise HTTPException(status_code=404, detail="Card not found in this deck")

    # SM-2 Spaced Repetition Algorithm
    now = datetime.utcnow()
    target_card.last_reviewed = now

    if req.rating == 1:  # Again / Hard
        target_card.repetitions = 0
        target_card.interval = 1
        target_card.state = CardState.LEARNING
        target_card.ease_factor = max(1.3, target_card.ease_factor - 0.2)
    elif req.rating == 2:  # Good
        if target_card.repetitions == 0:
            target_card.interval = 1
        elif target_card.repetitions == 1:
            target_card.interval = 4
        else:
            target_card.interval = int(target_card.interval * target_card.ease_factor)
        target_card.repetitions += 1
        target_card.state = CardState.REVIEW
    elif req.rating == 3:  # Easy
        if target_card.repetitions == 0:
            target_card.interval = 3
        elif target_card.repetitions == 1:
            target_card.interval = 7
        else:
            target_card.interval = int(target_card.interval * target_card.ease_factor * 1.3)
        target_card.repetitions += 1
        target_card.ease_factor = min(3.0, target_card.ease_factor + 0.15)
        target_card.state = CardState.MASTERED if target_card.interval >= 14 else CardState.REVIEW

    target_card.due_date = now + timedelta(days=target_card.interval)
    deck.mastered_cards = sum(1 for c in deck.cards if c.state == CardState.MASTERED or c.interval >= 14)
    deck.updated_at = now
    await deck.save()

    return {
        "message": "Review recorded",
        "card_id": target_card.card_id,
        "interval": target_card.interval,
        "state": target_card.state.value,
        "due_date": target_card.due_date.isoformat(),
        "deck_mastered": deck.mastered_cards,
    }


@router.delete("/decks/{deck_id}")
async def delete_deck(deck_id: str, current_user: User = Depends(get_current_user)):
    """Delete a flashcard deck"""
    deck = await FlashcardDeck.find_one(
        FlashcardDeck.deck_id == deck_id,
        FlashcardDeck.user_id == current_user.user_id,
    )
    if not deck:
        raise HTTPException(status_code=404, detail="Flashcard deck not found")

    await deck.delete()
    return {"message": "Deck deleted", "deck_id": deck_id}


@router.get("/decks/{deck_id}/export")
async def export_deck(
    deck_id: str,
    format: str = "anki",  # "anki" (TSV) or "markdown"
    current_user: User = Depends(get_current_user),
):
    """Export flashcards to Anki TSV/CSV format or Markdown"""
    deck = await FlashcardDeck.find_one(
        FlashcardDeck.deck_id == deck_id,
        FlashcardDeck.user_id == current_user.user_id,
    )
    if not deck:
        raise HTTPException(status_code=404, detail="Flashcard deck not found")

    if format == "anki":
        # Format: Front \t Back \t Key Takeaway \t Tags
        tsv_lines = ["#separator:tab", "#html:true", "#tags column:4"]
        for c in deck.cards:
            front = c.front.replace("\t", " ").replace("\n", "<br>")
            back = c.back.replace("\t", " ").replace("\n", "<br>")
            takeaway = (c.key_takeaway or "").replace("\t", " ").replace("\n", "<br>")
            tsv_lines.append(f"{front}\t{back}\t{takeaway}\tUniMind")
        content = "\n".join(tsv_lines)
        return PlainTextResponse(
            content=content,
            media_type="text/tab-separated-values",
            headers={"Content-Disposition": f'attachment; filename="{deck.title}.tsv"'}
        )
    else:
        # Markdown format
        md_lines = [f"# {deck.title}", f"> Generated from {deck.document_name} on {deck.created_at.strftime('%Y-%m-%d')}\n"]
        for i, c in enumerate(deck.cards, 1):
            md_lines.append(f"### Card {i}: {c.front}")
            md_lines.append(f"**Answer:** {c.back}")
            if c.key_takeaway:
                md_lines.append(f"*Key Takeaway:* {c.key_takeaway}")
            md_lines.append("---")
        content = "\n\n".join(md_lines)
        return PlainTextResponse(
            content=content,
            media_type="text/markdown",
            headers={"Content-Disposition": f'attachment; filename="{deck.title}.md"'}
        )

"""
Analysis API Routes - Sentiment analysis, speech-to-text, Mind Maps & Multi-Document Comparison
"""
import os
import json
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document, DocumentStatus
from app.services.llm_service import analyze_sentiment, call_groq_llm
from app.services.vector_store import get_chroma_collection

router = APIRouter(prefix="/api", tags=["Analysis"])


class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


class CompareDocumentsRequest(BaseModel):
    document_ids: List[str] = Field(..., min_items=2, max_items=5)
    focus: Optional[str] = None


@router.post("/analysis/sentiment")
async def sentiment_analysis(
    req: SentimentRequest,
    current_user: User = Depends(get_current_user),
):
    """Analyze sentiment of text"""
    result = await analyze_sentiment(req.text)
    return {
        "text_length": len(req.text),
        "sentiment": result,
    }


@router.post("/speech/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Transcribe audio file to text using OpenAI Whisper"""
    # Validate file type
    allowed = {".mp3", ".wav", ".m4a", ".webm", ".ogg", ".flac"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format. Allowed: {', '.join(allowed)}",
        )

    # Validate size (25MB max for Whisper)
    content = await file.read()
    if len(content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Audio file too large. Max 25MB.")

    try:
        from openai import OpenAI
        from app.core.config import settings
        import tempfile

        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        # Save to temp file for Whisper API
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        with open(tmp_path, "rb") as audio_file:
            transcript = client.audio.transcriptions.create(
                model="whisper-1",
                file=audio_file,
                response_format="verbose_json",
            )

        # Clean up temp file
        os.unlink(tmp_path)

        return {
            "text": transcript.text,
            "language": getattr(transcript, "language", "unknown"),
            "duration": getattr(transcript, "duration", None),
            "segments": [
                {
                    "text": seg.get("text", "") if isinstance(seg, dict) else getattr(seg, "text", ""),
                    "start": seg.get("start", 0) if isinstance(seg, dict) else getattr(seg, "start", 0),
                    "end": seg.get("end", 0) if isinstance(seg, dict) else getattr(seg, "end", 0),
                }
                for seg in (getattr(transcript, "segments", []) or [])
            ],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}",
        )


@router.post("/analysis/mindmap/{doc_id}")
async def generate_mindmap(
    doc_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Generate an interactive hierarchical concept mind map tree from a document
    """
    doc = await Document.find_one(
        Document.doc_id == doc_id,
        Document.user_id == current_user.user_id,
    )
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    content = doc.preview_text or ""
    try:
        collection = get_chroma_collection()
        results = collection.get(
            where={"document_id": doc_id},
            include=["documents"],
            limit=20,
        )
        if results["documents"]:
            content = "\n\n".join(results["documents"][:12])
    except Exception:
        pass

    if not content:
        raise HTTPException(status_code=400, detail="No content available for Mind Map generation")

    system_prompt = (
        "You are an expert knowledge architect. Analyze the document and generate a structured hierarchical "
        "concept graph / mind map tree.\n"
        "The hierarchy must have:\n"
        "- Root (Main theme / Subject)\n"
        "  - 3 to 6 Major Branches (Core Categories / Modules)\n"
        "    - 2 to 4 Sub-concepts per branch with concise definitions & takeaways\n\n"
        "Return ONLY a valid JSON object matching this schema:\n"
        "{\n"
        "  \"title\": \"Document Theme\",\n"
        "  \"root\": {\n"
        "    \"id\": \"root\",\n"
        "    \"label\": \"Main Topic Name\",\n"
        "    \"description\": \"Comprehensive 1-sentence summary\",\n"
        "    \"children\": [\n"
        "      {\n"
        "        \"id\": \"b1\",\n"
        "        \"label\": \"Branch Name\",\n"
        "        \"description\": \"Category description\",\n"
        "        \"color\": \"#6366f1\",\n"
        "        \"children\": [\n"
        "          {\n"
        "            \"id\": \"b1_1\",\n"
        "            \"label\": \"Concept Name\",\n"
        "            \"description\": \"Precise definition and key takeaway\"\n"
        "          }\n"
        "        ]\n"
        "      }\n"
        "    ]\n"
        "  }\n"
        "}"
    )

    user_prompt = f"Create a comprehensive mind map for:\n\n{content[:7000]}"

    try:
        response_text = await call_groq_llm(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.2,
            max_tokens=3000,
            json_mode=True,
        )

        clean_text = response_text.strip()
        if clean_text.startswith("```"):
            clean_text = clean_text.split("```")[1]
            if clean_text.startswith("json"):
                clean_text = clean_text[4:]
            clean_text = clean_text.strip()

        mindmap_data = json.loads(clean_text)
        return {
            "doc_id": doc_id,
            "filename": doc.filename,
            "mindmap": mindmap_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate Mind Map: {str(e)}")


@router.post("/analysis/compare")
async def compare_documents(
    req: CompareDocumentsRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Generate a structured comparison and synthesis matrix across multiple documents
    """
    docs = await Document.find({
        "doc_id": {"$in": req.document_ids},
        "user_id": current_user.user_id,
        "is_deleted": False,
    }).to_list()

    if len(docs) < 2:
        raise HTTPException(status_code=400, detail="At least 2 valid documents required for comparison")

    # Assemble document previews
    doc_summaries = []
    collection = get_chroma_collection()

    for d in docs:
        content = d.preview_text or ""
        try:
            results = collection.get(
                where={"document_id": d.doc_id},
                include=["documents"],
                limit=10,
            )
            if results["documents"]:
                content = "\n\n".join(results["documents"][:6])
        except Exception:
            pass

        doc_summaries.append(f"### Document: {d.filename} (ID: {d.doc_id})\n{content[:3500]}")

    joined_docs = "\n\n---\n\n".join(doc_summaries)

    system_prompt = (
        "You are an executive research analyst and document comparison specialist. "
        "Compare and synthesize the provided documents into a structured comparison matrix.\n"
        "Return ONLY a valid JSON object matching this schema:\n"
        "{\n"
        "  \"overview\": \"High-level executive synthesis of all compared documents (2-3 sentences)\",\n"
        "  \"dimensions\": [\n"
        "    {\n"
        "      \"dimension\": \"e.g. Scope / Methodology / Findings / Risk Factors / Performance\",\n"
        "      \"values\": { \"<filename_1>\": \"Summary value for Doc 1\", \"<filename_2>\": \"Summary value for Doc 2\" },\n"
        "      \"synthesis\": \"Analytical contrast or commonality\"\n"
        "    }\n"
        "  ],\n"
        "  \"key_differences\": [\"Difference 1\", \"Difference 2\"],\n"
        "  \"common_elements\": [\"Similarity 1\", \"Similarity 2\"],\n"
        "  \"conclusion\": \"Actionable takeaway or recommendation\"\n"
        "}"
    )

    focus_text = f"\nFocus Areas: {req.focus}" if req.focus else ""
    user_prompt = f"Compare these {len(docs)} documents accurately:{focus_text}\n\n{joined_docs}"

    try:
        response_text = await call_groq_llm(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.2,
            max_tokens=3000,
            json_mode=True,
        )

        clean_text = response_text.strip()
        if clean_text.startswith("```"):
            clean_text = clean_text.split("```")[1]
            if clean_text.startswith("json"):
                clean_text = clean_text[4:]
            clean_text = clean_text.strip()

        comparison_data = json.loads(clean_text)
        return {
            "document_ids": req.document_ids,
            "document_names": [d.filename for d in docs],
            "comparison": comparison_data,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {str(e)}")

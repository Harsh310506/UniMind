"""
Analysis API Routes - Sentiment analysis, speech-to-text
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.user import User
from app.services.llm_service import analyze_sentiment

router = APIRouter(prefix="/api", tags=["Analysis"])


class SentimentRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)


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
    import os
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

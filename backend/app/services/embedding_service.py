"""
Embedding Service - Generate text embeddings using local sentence-transformers.

Uses the 'all-MiniLM-L6-v2' model which runs entirely locally (no API key needed,
no quota limits). The model is downloaded once and cached automatically.

Falls back to zero-vectors if the model can't load, so the app still starts.
"""
from typing import List

# Lazy-loaded singleton to avoid loading the model at import time
_model = None
_EMBED_DIM = 384  # all-MiniLM-L6-v2 produces 384-dim vectors


def _get_model():
    """Load and cache the sentence-transformer model (downloaded once)."""
    global _model
    if _model is None:
        try:
            from sentence_transformers import SentenceTransformer
            print("[INFO] Loading local embedding model (all-MiniLM-L6-v2)...")
            _model = SentenceTransformer("all-MiniLM-L6-v2")
            print("[OK] Embedding model loaded successfully.")
        except Exception as e:
            print(f"[ERROR] Could not load embedding model: {e}")
            _model = None
    return _model


async def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts using a local sentence-transformer model."""
    model = _get_model()

    if model is None:
        print("⚠️  Embedding model unavailable – returning zero-vectors.")
        return [[0.0] * _EMBED_DIM for _ in texts]

    try:
        # encode() is CPU/GPU bound but fast enough for typical batch sizes
        embeddings = model.encode(texts, show_progress_bar=False)
        return [emb.tolist() for emb in embeddings]
    except Exception as e:
        print(f"[ERROR] Embedding generation error: {e}")
        return [[0.0] * _EMBED_DIM for _ in texts]


async def generate_single_embedding(text: str) -> List[float]:
    """Generate embedding for a single text."""
    result = await generate_embeddings([text])
    return result[0] if result else [0.0] * _EMBED_DIM

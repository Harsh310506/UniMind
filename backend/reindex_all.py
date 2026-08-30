"""
Standalone reindex script - re-processes all documents from disk into ChromaDB.
Run with: python reindex_all.py
Server does NOT need to be running (but stop it first to avoid file locks).
"""
import asyncio
import sys
import os

# Make sure we can import app modules
sys.path.insert(0, os.path.dirname(__file__))

from app.core.config import settings
from app.services.document_processor import process_document
from app.services.vector_store import index_document_chunks


async def reindex_all():
    # --- Connect to MongoDB via Beanie ---
    from motor.motor_asyncio import AsyncIOMotorClient
    from beanie import init_beanie
    from app.models.document import Document, DocumentStatus

    print(f"[1/4] Connecting to MongoDB: {settings.DATABASE_NAME}")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(database=client[settings.DATABASE_NAME], document_models=[Document])
    print("      Connected.\n")

    # --- Fetch all non-deleted documents ---
    docs = await Document.find({"is_deleted": False}).to_list()
    print(f"[2/4] Found {len(docs)} document(s) in MongoDB.\n")

    ok = 0
    failed = 0

    for i, doc in enumerate(docs, 1):
        tag = f"[{i}/{len(docs)}] {doc.filename} ({doc.doc_id[:8]}...)"

        if not os.path.exists(doc.file_path):
            print(f"  SKIP  {tag}  -- file not on disk: {doc.file_path}")
            failed += 1
            continue

        print(f"  Processing {tag}")
        try:
            # Extract + chunk
            chunks = await process_document(doc.file_path, doc.file_type.value, doc.doc_id)
            if not chunks:
                raise ValueError("No chunks extracted")

            # Embed + store in ChromaDB
            num = await index_document_chunks(doc.doc_id, doc.user_id, chunks)

            # Update Mongo record
            doc.status = DocumentStatus.COMPLETED
            doc.num_chunks = num
            doc.preview_text = chunks[0].text[:500] if chunks else ""
            await doc.save()

            print(f"  OK    {tag}  -- {num} chunks indexed")
            ok += 1

        except Exception as e:
            print(f"  FAIL  {tag}  -- {e}")
            doc.status = DocumentStatus.FAILED
            await doc.save()
            failed += 1

    print(f"\n[3/4] Done.  Success: {ok}  Failed/Skipped: {failed}")

    # --- Verify ChromaDB state ---
    from app.services.vector_store import get_chroma_collection
    col = get_chroma_collection()
    count = col.count()
    print(f"[4/4] ChromaDB now contains {count} chunk(s) total.")
    print("\nRestart uvicorn and the chatbot will work correctly.")


if __name__ == "__main__":
    asyncio.run(reindex_all())

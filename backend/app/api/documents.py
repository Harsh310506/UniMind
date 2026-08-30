"""
Document Management API Routes - Upload, list, get, delete, download
"""
import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Query, BackgroundTasks
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document, FileType, DocumentStatus
from app.services.document_processor import process_document
from app.services.vector_store import index_document_chunks, delete_document_vectors
from app.services.llm_service import summarize_content

router = APIRouter(prefix="/api/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {
    ".pdf": FileType.PDF,
    ".docx": FileType.DOCX,
    ".txt": FileType.TXT,
    ".jpg": FileType.IMAGE,
    ".jpeg": FileType.IMAGE,
    ".png": FileType.IMAGE,
}


def get_file_type(filename: str) -> Optional[FileType]:
    """Determine file type from extension"""
    ext = os.path.splitext(filename)[1].lower()
    return ALLOWED_EXTENSIONS.get(ext)


async def background_process_document(doc_id: str, file_path: str, file_type: str, user_id: str):
    """Background task: process document, extract text, generate embeddings, index"""
    try:
        doc = await Document.find_one({"doc_id": doc_id})
        if not doc:
            return

        # Process document (extract text, chunk)
        chunks = await process_document(file_path, file_type, doc_id)

        if not chunks:
            doc.status = DocumentStatus.FAILED
            await doc.save()
            return

        # Index chunks in vector store
        num_indexed = await index_document_chunks(doc_id, user_id, chunks)

        # Update document record
        doc.status = DocumentStatus.COMPLETED
        doc.num_chunks = num_indexed
        doc.preview_text = chunks[0].text[:500] if chunks else ""
        doc.processed_date = datetime.utcnow()
        await doc.save()

        print(f"[OK] Document {doc_id} processed: {num_indexed} chunks indexed")

    except Exception as e:
        print(f"[ERROR] Error processing document {doc_id}: {e}")
        try:
            doc = await Document.find_one({"doc_id": doc_id})
            if doc:
                doc.status = DocumentStatus.FAILED
                await doc.save()
        except:
            pass


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Upload a document for processing"""
    # Validate file type
    file_type = get_file_type(file.filename or "")
    if not file_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS.keys())}",
        )

    # Validate file size
    content = await file.read()
    file_size = len(content)
    max_size = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {settings.MAX_FILE_SIZE_MB}MB",
        )

    # Create unique file path
    doc_id = str(uuid.uuid4())
    user_dir = os.path.join(settings.UPLOAD_DIR, current_user.user_id)
    os.makedirs(user_dir, exist_ok=True)

    ext = os.path.splitext(file.filename)[1]
    file_path = os.path.join(user_dir, f"{doc_id}{ext}")

    # Save file
    with open(file_path, "wb") as f:
        f.write(content)

    # Create document record
    new_doc = Document(
        doc_id=doc_id,
        user_id=current_user.user_id,
        filename=file.filename or "unnamed",
        file_path=file_path,
        file_type=file_type,
        file_size=file_size,
        status=DocumentStatus.PROCESSING,
    )
    await new_doc.insert()

    # Trigger background processing
    background_tasks.add_task(
        background_process_document,
        doc_id, file_path, file_type.value, current_user.user_id,
    )

    return {
        "doc_id": doc_id,
        "filename": file.filename,
        "file_type": file_type.value,
        "file_size": file_size,
        "status": "PROCESSING",
        "message": "Document uploaded and processing started",
    }


@router.get("")
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    file_type: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
):
    """List user's documents with pagination"""
    query_dict = {"user_id": current_user.user_id, "is_deleted": False}
    if file_type:
        query_dict["file_type"] = file_type
    if status_filter:
        query_dict["status"] = status_filter

    query = Document.find(query_dict)

    total = await query.count()
    documents = await query.sort(-Document.upload_date).skip((page - 1) * page_size).limit(page_size).to_list()

    return {
        "documents": [
            {
                "doc_id": d.doc_id,
                "filename": d.filename,
                "file_type": d.file_type.value,
                "file_size": d.file_size,
                "status": d.status.value,
                "num_chunks": d.num_chunks,
                "preview_text": d.preview_text,
                "upload_date": d.upload_date.isoformat(),
                "processed_date": d.processed_date.isoformat() if d.processed_date else None,
            }
            for d in documents
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{doc_id}")
async def get_document(doc_id: str, current_user: User = Depends(get_current_user)):
    """Get full document details"""
    doc = await Document.find_one(
        Document.doc_id == doc_id,
        Document.user_id == current_user.user_id,
    )
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "doc_id": doc.doc_id,
        "filename": doc.filename,
        "file_type": doc.file_type.value,
        "file_size": doc.file_size,
        "status": doc.status.value,
        "num_chunks": doc.num_chunks,
        "preview_text": doc.preview_text,
        "upload_date": doc.upload_date.isoformat(),
        "processed_date": doc.processed_date.isoformat() if doc.processed_date else None,
    }


@router.delete("/{doc_id}")
async def delete_document(doc_id: str, current_user: User = Depends(get_current_user)):
    """Soft-delete a document and its vectors"""
    doc = await Document.find_one(
        {"doc_id": doc_id, "user_id": current_user.user_id}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    doc.is_deleted = True
    await doc.save()

    # Delete vectors
    delete_document_vectors(doc_id)

    return {"message": "Document deleted", "doc_id": doc_id}


@router.get("/{doc_id}/download")
async def download_document(doc_id: str, current_user: User = Depends(get_current_user)):
    """Download original document file"""
    doc = await Document.find_one(
        Document.doc_id == doc_id,
        Document.user_id == current_user.user_id,
    )
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")

    return FileResponse(
        path=doc.file_path,
        filename=doc.filename,
        media_type="application/octet-stream",
    )


@router.post("/{doc_id}/reindex")
async def reindex_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Re-index an existing document into ChromaDB (useful after vector store was cleared)"""
    doc = await Document.find_one(
        {"doc_id": doc_id, "user_id": current_user.user_id, "is_deleted": False}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=400, detail="Original file not found on disk")

    doc.status = DocumentStatus.PROCESSING
    await doc.save()

    background_tasks.add_task(
        background_process_document,
        doc.doc_id, doc.file_path, doc.file_type.value, current_user.user_id,
    )

    return {"message": "Re-indexing started", "doc_id": doc_id, "filename": doc.filename}


@router.post("/reindex-all")
async def reindex_all_documents(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    """Re-index ALL user documents into ChromaDB (run this after clearing the vector store)"""
    docs = await Document.find(
        {"user_id": current_user.user_id, "is_deleted": False}
    ).to_list()

    queued = []
    skipped = []

    for doc in docs:
        if not os.path.exists(doc.file_path):
            skipped.append({"doc_id": doc.doc_id, "filename": doc.filename, "reason": "file not on disk"})
            continue

        doc.status = DocumentStatus.PROCESSING
        await doc.save()

        background_tasks.add_task(
            background_process_document,
            doc.doc_id, doc.file_path, doc.file_type.value, current_user.user_id,
        )
        queued.append({"doc_id": doc.doc_id, "filename": doc.filename})

    return {
        "message": f"Re-indexing {len(queued)} document(s)",
        "queued": queued,
        "skipped": skipped,
    }


@router.post("/{doc_id}/summarize")
async def summarize_document(doc_id: str, current_user: User = Depends(get_current_user)):
    """Generate AI summary of a document"""
    doc = await Document.find_one(
        Document.doc_id == doc_id,
        Document.user_id == current_user.user_id,
    )
    if not doc or doc.is_deleted:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status != DocumentStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Document is still processing")

    # Return cached summary if available
    if doc.summary:
        return {
            "doc_id": doc_id,
            "filename": doc.filename,
            "summary": doc.summary,
        }

    # Try to get content from ChromaDB
    content = doc.preview_text or ""
    from app.services.vector_store import get_chroma_collection
    try:
        collection = get_chroma_collection()
        results = collection.get(
            where={"document_id": doc_id},
            include=["documents"],
            limit=20,
        )
        if results["documents"]:
            content = "\n\n".join(results["documents"])
    except:
        pass

    if not content:
        raise HTTPException(status_code=400, detail="No content available for summarization")

    # Generate summary
    summary = await summarize_content(content)

    # Save to database
    doc.summary = summary
    await doc.save()

    return {
        "doc_id": doc_id,
        "filename": doc.filename,
        "summary": summary,
    }

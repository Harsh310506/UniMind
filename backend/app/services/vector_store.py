"""
Vector Store Service - ChromaDB for semantic search + BM25 for keyword search.

On server startup, `load_bm25_indexes_from_chroma()` is called to rebuild the
in-memory BM25 indexes from persisted ChromaDB data so that hybrid search works
even after a server restart.
"""
import chromadb
from typing import List, Optional, Dict
from rank_bm25 import BM25Okapi

from app.core.config import settings
from app.services.embedding_service import generate_embeddings, generate_single_embedding

# Global ChromaDB client
_chroma_client = None
_collection = None

# BM25 indexes per document (in-memory cache: rebuilt from ChromaDB on startup)
_bm25_indexes: Dict[str, dict] = {}


def get_chroma_collection():
    """Get or create the ChromaDB collection"""
    global _chroma_client, _collection
    if _collection is None:
        _chroma_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_DIR)
        _collection = _chroma_client.get_or_create_collection(
            name="document_chunks",
            metadata={"hnsw:space": "cosine"},
        )
    return _collection


def load_bm25_indexes_from_chroma():
    """
    Rebuild all in-memory BM25 indexes by reading documents already stored in ChromaDB.
    Called once on server startup so keyword search works after a restart.
    """
    global _bm25_indexes
    try:
        collection = get_chroma_collection()
        # Fetch everything (ids + documents + metadata)
        all_data = collection.get(include=["documents", "metadatas"])

        if not all_data["ids"]:
            print("[INFO] ChromaDB is empty - no BM25 indexes to load.")
            return

        # Group chunks by document_id
        doc_chunks: Dict[str, List[dict]] = {}
        for chunk_id, text, meta in zip(
            all_data["ids"], all_data["documents"], all_data["metadatas"]
        ):
            doc_id = meta.get("document_id", "")
            if not doc_id:
                continue
            if doc_id not in doc_chunks:
                doc_chunks[doc_id] = []
            doc_chunks[doc_id].append(
                {
                    "id": chunk_id,
                    "text": text,
                    "chunk_index": meta.get("chunk_index", 0),
                    "source_page": meta.get("source_page", 0),
                }
            )

        # Build a BM25 index per document
        for doc_id, chunks in doc_chunks.items():
            chunks.sort(key=lambda c: c["chunk_index"])
            texts = [c["text"] for c in chunks]
            tokenized = [t.lower().split() for t in texts]
            _bm25_indexes[doc_id] = {
                "bm25": BM25Okapi(tokenized),
                "chunks": chunks,
                "texts": texts,
            }

        print(f"[OK] BM25 indexes rebuilt for {len(doc_chunks)} document(s)")

    except Exception as e:
        print(f"[WARNING] Could not rebuild BM25 indexes from ChromaDB: {e}")


async def index_document_chunks(
    document_id: str,
    user_id: str,
    chunks: list,
) -> int:
    """
    Index document chunks into ChromaDB and build BM25 index.
    Returns number of chunks indexed.
    """
    if not chunks:
        return 0

    collection = get_chroma_collection()

    texts = [c.text for c in chunks]
    ids = [f"{document_id}_chunk_{c.chunk_index}" for c in chunks]
    metadatas = [
        {
            "document_id": document_id,
            "user_id": user_id,
            "chunk_index": c.chunk_index,
            "source_page": c.source_page,
            "char_count": c.char_count,
        }
        for c in chunks
    ]

    # Generate embeddings
    embeddings = await generate_embeddings(texts)

    # Insert into ChromaDB in batches
    batch_size = 100
    for i in range(0, len(texts), batch_size):
        end = min(i + batch_size, len(texts))
        collection.upsert(
            ids=ids[i:end],
            embeddings=embeddings[i:end],
            documents=texts[i:end],
            metadatas=metadatas[i:end],
        )

    # Build BM25 index for this document
    tokenized = [text.lower().split() for text in texts]
    _bm25_indexes[document_id] = {
        "bm25": BM25Okapi(tokenized),
        "chunks": chunks,
        "texts": texts,
    }

    return len(texts)


async def semantic_search(
    query: str,
    document_ids: Optional[List[str]] = None,
    user_id: Optional[str] = None,
    top_k: int = 10,
    min_score: float = 0.3,
) -> List[dict]:
    """Perform semantic search using ChromaDB"""
    collection = get_chroma_collection()

    where_filter = {}
    if document_ids and len(document_ids) == 1:
        where_filter = {"document_id": document_ids[0]}
    elif document_ids and len(document_ids) > 1:
        where_filter = {"document_id": {"$in": document_ids}}
    elif user_id:
        where_filter = {"user_id": user_id}

    query_embedding = await generate_single_embedding(query)

    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter if where_filter else None,
            include=["documents", "metadatas", "distances"],
        )
    except Exception as e:
        print(f"[ERROR] ChromaDB search error: {e}")
        return []

    search_results = []
    if results and results["documents"] and results["documents"][0]:
        for doc, meta, dist in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            similarity = 1 - dist
            if similarity >= min_score:
                search_results.append(
                    {
                        "text": doc,
                        "score": similarity,
                        "source_page": meta.get("source_page", 0),
                        "document_id": meta.get("document_id", ""),
                        "chunk_index": meta.get("chunk_index", 0),
                        "search_type": "semantic",
                    }
                )

    return search_results


def bm25_search(
    query: str,
    document_ids: Optional[List[str]] = None,
    top_k: int = 10,
) -> List[dict]:
    """Perform BM25 keyword search"""
    results = []
    tokenized_query = query.lower().split()

    target_docs = document_ids or list(_bm25_indexes.keys())

    for doc_id in target_docs:
        if doc_id not in _bm25_indexes:
            continue

        index_data = _bm25_indexes[doc_id]
        bm25 = index_data["bm25"]
        chunks = index_data["chunks"]

        scores = bm25.get_scores(tokenized_query)
        max_score = max(scores) if len(scores) > 0 and max(scores) > 0 else 1

        for i, score in enumerate(scores):
            if score > 0:
                chunk = chunks[i]
                if isinstance(chunk, dict):
                    text = chunk["text"]
                    source_page = chunk.get("source_page", 0)
                    chunk_index = chunk.get("chunk_index", i)
                else:
                    text = chunk.text
                    source_page = chunk.source_page
                    chunk_index = chunk.chunk_index

                results.append(
                    {
                        "text": text,
                        "score": score / max_score,
                        "source_page": source_page,
                        "document_id": doc_id,
                        "chunk_index": chunk_index,
                        "search_type": "bm25",
                    }
                )

    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:top_k]


async def hybrid_search(
    query: str,
    document_ids: Optional[List[str]] = None,
    user_id: Optional[str] = None,
    top_k: int = 5,
    semantic_weight: float = 0.7,
    bm25_weight: float = 0.3,
) -> List[dict]:
    """Hybrid retrieval combining semantic and BM25 search."""
    semantic_results = await semantic_search(query, document_ids, user_id, top_k=top_k * 2)
    bm25_results = bm25_search(query, document_ids, top_k=top_k * 2)

    combined = {}

    for r in semantic_results:
        key = f"{r['document_id']}_{r['chunk_index']}"
        combined[key] = {**r, "combined_score": r["score"] * semantic_weight}

    for r in bm25_results:
        key = f"{r['document_id']}_{r['chunk_index']}"
        if key in combined:
            combined[key]["combined_score"] += r["score"] * bm25_weight
        else:
            combined[key] = {**r, "combined_score": r["score"] * bm25_weight}

    results = sorted(combined.values(), key=lambda x: x["combined_score"], reverse=True)
    return results[:top_k]


def delete_document_vectors(document_id: str):
    """Delete all vectors for a document from ChromaDB"""
    try:
        collection = get_chroma_collection()
        results = collection.get(
            where={"document_id": document_id},
            include=[],
        )
        if results["ids"]:
            collection.delete(ids=results["ids"])
        _bm25_indexes.pop(document_id, None)
    except Exception as e:
        print(f"[ERROR] Error deleting vectors for {document_id}: {e}")


def prepare_context(chunks: List[dict], max_tokens: int = 3000) -> str:
    """Prepare context string from retrieved chunks for LLM consumption"""
    context_parts = []
    total_tokens = 0

    for chunk in chunks:
        chunk_tokens = len(chunk["text"].split())
        if total_tokens + chunk_tokens > max_tokens:
            break

        page_ref = f"[Page {chunk['source_page']}]" if chunk.get("source_page") else ""
        context_parts.append(f"{page_ref}\n{chunk['text']}")
        total_tokens += chunk_tokens

    return "\n\n---\n\n".join(context_parts)

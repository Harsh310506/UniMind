"""
One-time script: Delete the stale 1536-dim ChromaDB collection and recreate it
fresh so the new 384-dim sentence-transformer embeddings work correctly.
Run with: python reset_vectorstore.py
"""
import shutil
import os

VECTOR_STORE_PATH = "vector_store"

print(f"[1/2] Deleting vector store at: {os.path.abspath(VECTOR_STORE_PATH)}")
if os.path.exists(VECTOR_STORE_PATH):
    shutil.rmtree(VECTOR_STORE_PATH)
    print("      Done - directory removed.")
else:
    print("      Already gone.")

print("[2/2] Recreating empty vector store directory...")
os.makedirs(VECTOR_STORE_PATH, exist_ok=True)

# Verify chromadb can create a fresh 384-dim collection
print("[3/3] Verifying new ChromaDB collection (384-dim)...")
import chromadb
client = chromadb.PersistentClient(path=VECTOR_STORE_PATH)
col = client.get_or_create_collection(
    name="document_chunks",
    metadata={"hnsw:space": "cosine"},
)
# Insert one test vector to lock in 384 dimensions
col.upsert(
    ids=["__dim_init__"],
    embeddings=[[0.0] * 384],
    documents=["init"],
    metadatas=[{"init": True}],
)
# Remove it immediately
col.delete(ids=["__dim_init__"])
print("      ChromaDB collection is fresh and set to 384 dimensions.")
print("\n✅ Reset complete! Restart uvicorn and re-upload your documents.")

"""
UniMind - Multi-Function AI Platform
FastAPI Application Entry Point
"""
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from datetime import datetime
import time

from app.core.config import settings
from app.core.database import init_db, close_db
from app.api.auth import router as auth_router
from app.api.documents import router as documents_router
from app.api.chat import router as chat_router
from app.api.quiz import router as quiz_router
from app.api.analysis import router as analysis_router
from app.api.dashboard import router as dashboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle"""
    # Startup
    print(f"[STARTUP] Starting {settings.APP_NAME} v{settings.APP_VERSION}")

    # Create required directories
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)

    # Initialize database
    await init_db()

    # Rebuild BM25 indexes from persisted ChromaDB data so hybrid search works after restart
    try:
        from app.services.vector_store import load_bm25_indexes_from_chroma
        load_bm25_indexes_from_chroma()
    except Exception as e:
        print(f"[WARNING] BM25 index rebuild skipped: {e}")

    print(f"[READY] {settings.APP_NAME} is ready!")
    yield

    # Shutdown
    await close_db()
    print(f"[SHUTDOWN] {settings.APP_NAME} shut down gracefully")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="A unified, intelligent platform that transforms static documents into interactive knowledge sources. "
    "Features: Document Chat (RAG), Quiz Generation, Sentiment Analysis, Speech-to-Text.",
    version=settings.APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    if settings.DEBUG:
        print(
            f"[API] {request.method} {request.url.path} "
            f"-> {response.status_code} ({duration:.2f}s)"
        )
    return response


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    print(f"[ERROR] Unhandled error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred",
            "error": str(exc) if settings.DEBUG else "Internal Server Error",
        },
    )


# --- Register API Routers ---
app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(chat_router)
app.include_router(quiz_router)
app.include_router(analysis_router)
app.include_router(dashboard_router)


# --- Health Check ---
@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/", tags=["System"])
async def root():
    """Root endpoint - API information"""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/health",
        "message": "Welcome to UniMind API! Visit /docs for interactive documentation.",
    }

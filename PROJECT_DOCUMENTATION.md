# UniMind — Master Technical & Functional Specification

> **Version**: 1.0.0  
> **Target Audience**: Developers, Architects, Stakeholders, Technical Writers  
> **Status**: Production Ready & Fully Functional  

---

## 1. Executive Summary & Product Vision

**UniMind** is a state-of-the-art, multi-modal **AI Knowledge Platform and Cognitive Study Companion**. It unifies document processing, vector search (RAG), generative intelligence, spaced-repetition learning, cross-document synthesis, and audio transcription into a single cohesive, high-performance web application.

Users can upload documents (PDF, DOCX, TXT, Images via OCR), scrape web articles, or transcribe YouTube videos to generate:
- **Grounded RAG Conversations** with page and snippet citations
- **Interactive Concept Mind Maps** with dynamic tree connectors and zoom/pan canvases
- **AI-Generated Flashcard Decks** with Leitner spaced-repetition mastery tracking
- **Multi-Document Synthesis & Comparison Matrices**
- **Adaptive Practice Quizzes** with automated grading and historical analytics
- **Speech-to-Text Audio Transcriptions** powered by OpenAI Whisper
- **Sentiment & Emotion Analysis** with confidence metrics
- **Global Spotlight Search (`Ctrl + K`)** across all resources

---

## 2. High-Level System Architecture

```
+-----------------------------------------------------------------------------------+
|                                 FRONTEND (React + Vite)                          |
|  - TypeScript, React 18, React Router DOM, TanStack Query, Lucide Icons           |
|  - Modern Dark Glassmorphic UI, CSS Variables Design System                       |
|  - Global Spotlight Command Palette (Ctrl+K)                                     |
+------------------------------------------+----------------------------------------+
                                           | HTTP / REST (Axios)
                                           v
+-----------------------------------------------------------------------------------+
|                                 BACKEND (FastAPI / Python)                        |
|  - Async ASGI framework (Uvicorn), Pydantic v2 validation                         |
|  - Beanie ODM for MongoDB (Motor Async Driver)                                    |
|  - ChromaDB Vector Store with SentenceTransformers (all-MiniLM-L6-v2)             |
|  - Groq Cloud API & OpenAI API integrations                                       |
+-------------------+---------------------------------------+-----------------------+
                    |                                       |
                    v                                       v
+------------------------------------+   +------------------------------------------+
|          DATABASE TIER             |   |             AI & ML SERVICES             |
|  - MongoDB (Users, Docs, Quizzes,  |   |  - Groq LLM (Qwen 2.5 / Llama 3 70B)     |
|    Flashcards, Conversations)      |   |  - Sentence-Transformers (Embeddings)    |
|  - ChromaDB (Vector Store on disk) |   |  - OpenAI Whisper (Speech-to-Text)       |
|  - Local File Storage (`uploads/`) |   |  - Tesseract OCR (Image text extraction) |
+------------------------------------+   +------------------------------------------+
```

---

## 3. Technology Stack Breakdown

| Layer | Technologies & Libraries | Key Responsibilities |
|---|---|---|
| **Frontend Core** | React 18, TypeScript, Vite | Ultra-fast client build, type safety, modular component architecture |
| **State & API** | TanStack React Query, Axios, Context API | Server-state caching, optimistic mutations, JWT authentication state, toast alerts |
| **UI & Styling** | Vanilla CSS Tokens, CSS Grid/Flexbox, Glassmorphism | Custom dark mode palette, smooth micro-interactions, responsive views, SVG/CSS trees |
| **Backend API** | FastAPI, Python 3.10+, Uvicorn | High-throughput asynchronous REST API, background task queuing, schema validation |
| **Database & ODM** | MongoDB, Motor, Beanie ODM | Document persistence, indexing, aggregate queries, async entity mapping |
| **Vector Engine** | ChromaDB, `all-MiniLM-L6-v2` | Dense semantic embeddings (384-dim), cosine distance search, per-document filtering |
| **Document Ingestion** | PyMuPDF (fitz), python-docx, Pillow, pytesseract, BeautifulSoup4, yt-dlp / youtube-transcript-api | Parsing PDFs, DOCX, TXT, OCR images, web article extraction, and YouTube video transcripts |
| **LLM & Inference** | Groq Cloud SDK (`groq`), OpenAI SDK | Ultra-low-latency Groq 70B inference for RAG, JSON structured outputs, Whisper audio transcription |

---

## 4. Comprehensive Feature Specifications

---

### Feature 1: Multi-Modal Document Knowledge Base

#### What It Does
Provides an end-to-end repository for uploading, ingesting, parsing, indexing, and organizing multi-modal learning assets.

#### Supported Inputs
1. **PDF Documents** (`.pdf`): Multi-page text extraction with page tracking via `PyMuPDF`.
2. **Word Documents** (`.docx`): Paragraph and structure extraction via `python-docx`.
3. **Plain Text** (`.txt`): Multi-encoding fallback (UTF-8, Latin-1, CP1252).
4. **Images** (`.png`, `.jpg`, `.jpeg`, `.webp`): Optical Character Recognition (OCR) using `pytesseract` with Windows path auto-discovery.
5. **Web URLs**: Clean semantic HTML scraping via `BeautifulSoup4` (stripping nav, scripts, styles).
6. **YouTube URLs**: Transcript extraction via `youtube-transcript-api` and video metadata via `yt-dlp`.

#### Ingestion & Vectorization Pipeline
```
[User Input: File/URL] 
         │
         ▼
[Format-Specific Extractor] (PDF/DOCX/TXT/OCR/Web/YouTube)
         │
         ▼
[Text Normalizer & Cleaner] (Removes artifacts, excess whitespace, page markers)
         │
         ▼
[Paragraph-Aware Chunking] (800 chars target, 100 chars overlap)
         │
         ▼
[SentenceTransformer Embeddings] (all-MiniLM-L6-v2 -> 384-dim float vectors)
         │
         ▼
[ChromaDB Vector Store] + [MongoDB Document Record with Metadata]
```

#### User Interface Features
- Drag-and-drop file upload zone with live size validation (max 50MB).
- Modal dialog for Web & YouTube URL ingestion with auto-title detection.
- Filter documents by type (`ALL`, `PDF`, `DOCX`, `TXT`, `IMAGE`, `WEB`, `YOUTUBE`) and live search.
- Per-document action bar: **Chat**, **Flashcards**, **Mind Map**, **Quiz**, **Summary**, **Download**, **Delete**.

---

### Feature 2: Structured Document Summarization

#### What It Does
Generates an executive-level, structured 3-part synthesis of any ingested document using Groq's high-parameter LLM.

#### Implementation Architecture
- **Backend Endpoint**: `POST /api/documents/{doc_id}/summarize`
- **Output Schema**:
  ```json
  {
    "executive_summary": "High-level overview of key concepts (2-3 sentences)",
    "key_points": [
      "Key takeaway 1",
      "Key takeaway 2",
      "Key takeaway 3"
    ],
    "detailed_summary": "In-depth thematic breakdown..."
  }
  ```
- **Caching**: The generated summary is persisted in the MongoDB `Document.summary` field to avoid redundant inference calls.
- **Frontend Presentation**:
  - Modal with distinct styled cards for **Executive Summary**, **Key Takeaways** (with check badges), and **Detailed Breakdown**.
  - **1-Click Copy**: Converts the structured object into a formatted text string ready for clipboard pasting.

---

### Feature 3: Grounded RAG Chat & Conversations

#### What It Does
Enables multi-turn conversational AI grounded strictly in user documents to prevent hallucinations.

#### Implementation Architecture
- **Vector Retrieval**: Queries ChromaDB with the user's prompt using cosine similarity (`n_results=5`).
- **Citation System**: Chunks retain source page numbers and document IDs, formatted as `[Page X]` or `[Doc: filename]`.
- **General vs Document-Specific Chat**:
  - If a document is active: RAG mode with system prompt enforcing context grounding.
  - If no document is selected: General AI assistant mode with conversational memory.
- **Persistence**: Sessions and exchanges are stored in MongoDB `Conversation` model with timestamped message histories.
- **Quick Prompts**: Contextual prompt chips ("Summarize this document", "Key takeaways", "Explain simply", "Practice questions").

---

### Feature 4: Interactive Hierarchical Concept Mind Maps

#### What It Does
Constructs a navigable, color-coded visual tree graph that breaks down complex documents into core themes, branches, and sub-concepts.

#### Implementation Architecture
- **Backend Graph Extraction**: `POST /api/analysis/mindmap/{doc_id}` prompts Groq LLM in JSON mode to output a tree with root, 3-6 major branches, and 2-5 sub-concepts per branch with color codes and definitions.
- **Dynamic Tree Visualizer**:
  - **CSS Connecting Stems & Spines**: Outgoing horizontal stems (`::after`) and vertical spine lines (`::before` / `::after`) connect parent nodes to children with zero DOM offset lag.
  - **Vertically Centered Alignment**: Parent nodes are centered alongside their child clusters.
  - **Pan-and-Drag Canvas**: Mouse drag panning with smooth coordinate offsets `(pan.x, pan.y)` and zoom scaling (`0.4x` to `1.8x`).
  - **Expand / Collapse Branches**: Interactive button with `+N` count badges when collapsed.
  - **Concept Breakdown Drawer**: Clicking any concept opens a details side sheet with full definition and sub-concept navigation chips.

---

### Feature 5: AI Flashcards & Spaced Repetition (Leitner System)

#### What It Does
Automatically generates study flashcards from documents and provides a 3D flip-card study interface with mastery scoring based on the Leitner spaced repetition system.

#### Implementation Architecture
- **Deck Generation**: `POST /api/flashcards/generate` analyzes document text and outputs 5-20 question/answer pairs with tags and hints.
- **Study Engine**:
  - **3D Card Flip**: CSS `perspective` and `transform: rotateY(180deg)` animations.
  - **Rating System**: After flipping, users rate their recall as **Again (1)**, **Hard (2)**, **Good (3)**, or **Easy (4)**.
  - **Leitner Algorithm**:
    - "Again" / "Hard": Resets mastery score and schedules card for immediate review.
    - "Good" / "Easy": Increments mastery level (1 to 5) and increases spaced repetition interval.
  - **Deck Filtering**: Study **All Cards**, **Starred Only**, or **Review Queue Only** (mastery < 3).

---

### Feature 6: Cross-Document Comparison & Synthesis Matrix

#### What It Does
Performs deep comparative analysis across 2 to 5 documents, generating a multi-dimensional matrix of differences, similarities, and unified conclusions.

#### Implementation Architecture
- **Backend Endpoint**: `POST /api/analysis/compare` takes a list of `document_ids`.
- **LLM Synthesis**: Extracts dense context chunks from ChromaDB for all target documents, prompting the LLM to return:
  - **Executive Overview**: Synthesis of all compared documents.
  - **Dimension Matrix**: Array of analytical dimensions (e.g. Scope, Methodology, Findings, Trade-offs) mapping each document to its specific values.
  - **Key Differences & Commonalities**: Categorized bullet points.
  - **Strategic Conclusion**: Actionable takeaways.
- **Frontend Matrix View**: Responsive comparative table with color badges, side-by-side dimension views, and markdown export.

---

### Feature 7: Automated Practice Quizzes & Exam Engine

#### What It Does
Generates interactive multiple-choice quizzes (10 questions) categorized by difficulty (`EASY`, `MEDIUM`, `HARD`) from any document.

#### Implementation Architecture
- **Quiz Generation**: `POST /api/quiz/generate` constructs 4-option MCQs with explanations for each correct answer.
- **Quiz Engine UI**:
  - Timed quiz option with live countdown.
  - Option selector with instant validation or submit-at-end mode.
  - Explanation cards detailing why an answer is correct.
  - Results breakdown: Score percentage, accuracy badge, grade evaluation, and time taken.
- **Historical Analytics**: Tracks user quiz attempts in MongoDB `QuizAttempt` collection to visualize progress over time.

---

### Feature 8: Audio Transcription (Speech-to-Text)

#### What It Does
Transcribes spoken audio files (`.mp3`, `.wav`, `.m4a`, `.webm`, `.ogg`, `.flac`) into clean text with precise timestamps.

#### Implementation Architecture
- **Backend Endpoint**: `POST /api/speech/transcribe`
- **Whisper Integration**: Uses OpenAI's `whisper-1` model via multipart file upload.
- **Capabilities**:
  - Returns raw full text + segment-by-segment timestamps `[00:00 - 00:05]`.
  - Built-in audio player for synchronized playback.
  - **1-Click Actions**: Copy transcription, download `.txt`, or save directly into the UniMind Knowledge Base as a searchable document.

---

### Feature 9: Real-Time Sentiment & Emotion Analysis

#### What It Does
Analyzes tone, polarity, and underlying emotion of any submitted text.

#### Implementation Architecture
- **Backend Endpoint**: `POST /api/analysis/sentiment`
- **Output**:
  - Classification: `POSITIVE`, `NEGATIVE`, or `NEUTRAL`.
  - Confidence Score: `0.0` to `1.0` (visualized via a glowing gradient gauge).
  - Detailed explanation of emotional tone and keyword triggers.

---

### Feature 10: Global Spotlight Search (`Ctrl + K`)

#### What It Does
Provides an omnibar / command palette accessible from anywhere in the application by pressing <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>⌘</kbd> + <kbd>K</kbd>).

#### Capabilities
- **Quick Navigation**: Instantly jump to Dashboard, Documents, Chat, Flashcards, Compare, Quiz, Speech, Sentiment, or Settings.
- **Instant Search**: Search through all documents in the database by title or file type.
- **Direct Actions**: Trigger document uploads, ingest URLs, or start new chat sessions directly from the keyboard.

---

### Feature 11: Unified Dashboard & Analytics

#### What It Does
Serves as the home command center summarizing all user activity, document telemetry, and study progress.

#### Key Metrics Displayed
- **Total Documents**: Breakdown by type (PDF, Web, Image, etc.).
- **Total Chunks & Embeddings Indexed**.
- **Active Chat Conversations & Total Queries**.
- **Flashcard Mastery Rate** (% of cards mastered at Level 3+).
- **Quiz Performance**: Total quizzes taken, average score, and recent attempts log.
- **Recent Documents**: Quick-launch carousel for fast access.

---

### Feature 12: User Authentication & Profile Security

#### What It Does
Provides secure authentication and user management.

#### Implementation Architecture
- **Auth Scheme**: JWT (JSON Web Tokens) with HMAC-SHA256 signature.
- **Password Security**: Salted hashing with `bcrypt` (12 rounds).
- **Access Control**: FastAPI `Depends(get_current_user)` dependency validates tokens on all protected routes.
- **Profile Management**: Update display name, view registration date, and change passwords with server-side validation.

---

## 5. Database Schema & Data Models

### User Model (`users` collection)
```typescript
interface User {
  user_id: string;        // UUIDv4
  email: string;          // Unique, indexed
  hashed_password: string;// bcrypt hash
  full_name: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}
```

### Document Model (`documents` collection)
```typescript
interface Document {
  doc_id: string;         // UUIDv4, indexed
  user_id: string;        // Owner user UUID, indexed
  filename: string;
  file_type: "PDF" | "DOCX" | "TXT" | "IMAGE" | "WEB" | "YOUTUBE";
  file_size: number;      // Bytes
  file_path: string;      // Absolute disk path
  num_chunks: number;     // ChromaDB vector count
  preview_text: string;   // First 1000 characters
  summary?: {             // Cached structured summary
    executive_summary: string;
    key_points: string[];
    detailed_summary: string;
  };
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  is_deleted: boolean;    // Soft-delete flag
  upload_date: Date;
  processed_date?: Date;
}
```

### Flashcard Deck & Card Models (`flashcard_decks` collection)
```typescript
interface Flashcard {
  card_id: string;
  question: string;
  answer: string;
  hint?: string;
  tag?: string;
  mastery_level: number;  // 0 to 5 (Leitner system)
  reviews_count: number;
  last_reviewed?: Date;
}

interface FlashcardDeck {
  deck_id: string;
  user_id: string;
  doc_id?: string;
  title: string;
  cards: Flashcard[];
  created_at: Date;
}
```

### Quiz & Quiz Attempt Models (`quizzes`, `quiz_attempts` collections)
```typescript
interface QuizQuestion {
  question: string;
  options: string[];      // 4 choices
  correct_answer: number; // Index 0-3
  explanation: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
}

interface QuizAttempt {
  attempt_id: string;
  user_id: string;
  quiz_id: string;
  doc_id?: string;
  score: number;          // Percentage (0-100)
  total_questions: number;
  correct_count: number;
  answers: { question_idx: number; selected: number; is_correct: boolean }[];
  completed_at: Date;
}
```

---

## 6. Complete REST API Catalog

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register new user account (returns JWT token) |
| `POST` | `/api/auth/login` | Authenticate with email & password (returns JWT token) |
| `GET` | `/api/auth/me` | Get current authenticated user profile |
| `PUT` | `/api/auth/profile` | Update user display name |
| `POST` | `/api/auth/change-password` | Change account password |

### Documents (`/api/documents`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/documents` | List all documents for current user |
| `POST` | `/api/documents/upload` | Upload & index file (PDF, DOCX, TXT, Image) |
| `POST` | `/api/documents/ingest-url` | Scrape & index Web URL or YouTube transcript |
| `GET` | `/api/documents/{doc_id}` | Get document metadata and status |
| `POST` | `/api/documents/{doc_id}/summarize` | Generate/retrieve structured AI summary |
| `GET` | `/api/documents/{doc_id}/download` | Download original file |
| `POST` | `/api/documents/{doc_id}/reindex` | Re-index document into vector store |
| `DELETE` | `/api/documents/{doc_id}` | Soft-delete document and remove vectors |

### Chat & RAG (`/api/chat`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Send message (RAG grounded or general AI) |
| `GET` | `/api/chat/conversations` | List user conversation threads |
| `GET` | `/api/chat/conversations/{conv_id}` | Get conversation message history |
| `DELETE` | `/api/chat/conversations/{conv_id}` | Delete conversation thread |

### Flashcards (`/api/flashcards`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/flashcards/decks` | List all flashcard decks |
| `POST` | `/api/flashcards/generate` | Auto-generate deck from document |
| `POST` | `/api/flashcards/decks/{deck_id}/cards` | Add custom flashcard to deck |
| `POST` | `/api/flashcards/cards/{card_id}/review` | Record Leitner spaced review rating (1-4) |
| `DELETE` | `/api/flashcards/decks/{deck_id}` | Delete deck |

### Quizzes (`/api/quiz`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/quiz/generate` | Generate 10-question MCQ quiz |
| `POST` | `/api/quiz/submit` | Submit answers and calculate score |
| `GET` | `/api/quiz/attempts` | List historical quiz attempts |

### Analysis & Tools (`/api/analysis`, `/api/speech`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analysis/mindmap/{doc_id}` | Generate hierarchical concept graph |
| `POST` | `/api/analysis/compare` | Multi-document synthesis matrix |
| `POST` | `/api/analysis/sentiment` | Sentiment and emotion analysis |
| `POST` | `/api/speech/transcribe` | Audio speech-to-text with timestamps |

---

## 7. Setup, Environment & Execution Guide

### Prerequisites
- **Node.js**: `v18.0+`
- **Python**: `3.10+`
- **MongoDB**: Running instance (`localhost:27017` or MongoDB Atlas URI)
- **Tesseract OCR (Optional for local image OCR)**: `winget install UB-Mannheim.TesseractOCR`

### Environment Configuration (`.env`)
```env
# Application
APP_NAME=UniMind
DEBUG=True

# MongoDB
MONGODB_URI=mongodb://localhost:27017
DATABASE_NAME=unimind

# JWT Authentication
SECRET_KEY=your_super_secret_jwt_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Provider API Keys
GROQ_API_KEY=gsk_your_groq_api_key_here
OPENAI_API_KEY=sk-your_openai_api_key_here

# Storage & CORS
UPLOAD_DIR=uploads
CHROMA_PERSIST_DIR=vector_store
FRONTEND_URL=http://localhost:5173
```

### Running the Backend
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### Running the Frontend
```powershell
cd frontend
npm install
npm run dev
```

---

*This document serves as the master specification for the entire UniMind codebase.*

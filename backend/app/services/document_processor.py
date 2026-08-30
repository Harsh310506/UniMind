"""
Document Processing Service - Text extraction, cleaning, and chunking
"""
import os
import re
from typing import List, Optional, Tuple
from datetime import datetime

import fitz  # PyMuPDF
from PIL import Image

from app.core.config import settings


class TextChunk:
    """Represents a chunk of text from a document"""
    def __init__(self, text: str, chunk_index: int, source_page: int = 0,
                 document_id: str = "", char_count: int = 0):
        self.text = text
        self.chunk_index = chunk_index
        self.source_page = source_page
        self.document_id = document_id
        self.char_count = char_count or len(text)
        self.token_count = len(text.split())  # approximate

    def to_dict(self):
        return {
            "text": self.text,
            "chunk_index": self.chunk_index,
            "source_page": self.source_page,
            "document_id": self.document_id,
            "char_count": self.char_count,
            "token_count": self.token_count,
        }


def extract_text_from_pdf(file_path: str) -> List[Tuple[int, str]]:
    """Extract text from PDF, returns list of (page_number, text) tuples"""
    pages = []
    try:
        doc = fitz.open(file_path)
        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            if text.strip():
                pages.append((page_num + 1, text))
        doc.close()
    except Exception as e:
        print(f"Error extracting PDF text: {e}")
    return pages


def extract_text_from_txt(file_path: str) -> List[Tuple[int, str]]:
    """Extract text from TXT file"""
    try:
        # Try UTF-8 first, then latin-1
        for encoding in ["utf-8", "latin-1", "cp1252"]:
            try:
                with open(file_path, "r", encoding=encoding) as f:
                    text = f.read()
                return [(1, text)]
            except UnicodeDecodeError:
                continue
    except Exception as e:
        print(f"Error reading TXT file: {e}")
    return []


def extract_text_from_docx(file_path: str) -> List[Tuple[int, str]]:
    """Extract text from DOCX file"""
    try:
        from docx import Document as DocxDocument
        doc = DocxDocument(file_path)
        paragraphs = []
        for para in doc.paragraphs:
            if para.text.strip():
                paragraphs.append(para.text)
        full_text = "\n".join(paragraphs)
        return [(1, full_text)]
    except Exception as e:
        print(f"Error extracting DOCX text: {e}")
    return []


def extract_text_from_image(file_path: str) -> List[Tuple[int, str]]:
    """Extract text from image using OCR (Tesseract)"""
    try:
        import pytesseract
        img = Image.open(file_path)
        # Convert to grayscale for better OCR
        img = img.convert("L")
        text = pytesseract.image_to_string(img)
        if text.strip():
            return [(1, text)]
    except Exception as e:
        print(f"OCR extraction failed (Tesseract may not be installed): {e}")
        # Fallback: return a placeholder
        return [(1, f"[Image file: {os.path.basename(file_path)} - OCR not available]")]
    return []


def clean_text(text: str) -> str:
    """Clean extracted text"""
    # Remove excessive whitespace
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r' {2,}', ' ', text)
    # Remove common artifacts
    text = re.sub(r'\x0c', '', text)  # form feed
    # Normalize unicode
    text = text.strip()
    return text


def chunk_text(
    pages: List[Tuple[int, str]],
    document_id: str,
    chunk_size: int = 800,
    overlap: int = 100,
) -> List[TextChunk]:
    """
    Split text into semantic chunks with overlap.
    Uses paragraph-aware splitting with token limits.
    """
    chunks = []
    chunk_index = 0

    for page_num, page_text in pages:
        cleaned = clean_text(page_text)
        if not cleaned:
            continue

        # Split by paragraphs first
        paragraphs = cleaned.split('\n\n')
        current_chunk = ""

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            # If adding this paragraph exceeds chunk_size
            if len(current_chunk.split()) + len(para.split()) > chunk_size:
                if current_chunk.strip():
                    chunks.append(TextChunk(
                        text=current_chunk.strip(),
                        chunk_index=chunk_index,
                        source_page=page_num,
                        document_id=document_id,
                    ))
                    chunk_index += 1

                    # Create overlap from last portion
                    words = current_chunk.split()
                    if len(words) > overlap:
                        current_chunk = " ".join(words[-overlap:]) + "\n\n" + para
                    else:
                        current_chunk = para
                else:
                    current_chunk = para
            else:
                current_chunk = current_chunk + "\n\n" + para if current_chunk else para

        # Don't forget the last chunk
        if current_chunk.strip():
            chunks.append(TextChunk(
                text=current_chunk.strip(),
                chunk_index=chunk_index,
                source_page=page_num,
                document_id=document_id,
            ))
            chunk_index += 1

    return chunks


def get_extractor(file_type: str):
    """Get the appropriate text extractor based on file type"""
    extractors = {
        "PDF": extract_text_from_pdf,
        "TXT": extract_text_from_txt,
        "DOCX": extract_text_from_docx,
        "IMAGE": extract_text_from_image,
    }
    return extractors.get(file_type)


async def process_document(file_path: str, file_type: str, document_id: str) -> List[TextChunk]:
    """
    Full document processing pipeline:
    1. Extract text
    2. Clean text
    3. Chunk text
    Returns list of TextChunks ready for embedding
    """
    extractor = get_extractor(file_type)
    if not extractor:
        raise ValueError(f"Unsupported file type: {file_type}")

    pages = extractor(file_path)
    if not pages:
        raise ValueError(f"No text could be extracted from {file_path}")

    chunks = chunk_text(pages, document_id)
    return chunks

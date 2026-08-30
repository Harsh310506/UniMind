/* ─── TypeScript types for the UniMind API ─── */

export interface User {
    user_id: string;
    email: string;
    full_name: string;
    is_active: boolean;
    created_at: string;
}

export interface AuthTokens {
    access_token: string;
    refresh_token: string;
    token_type: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    full_name: string;
}

export type FileType = 'PDF' | 'DOCX' | 'TXT' | 'IMAGE';
export type DocumentStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
export type QuizStatus = 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface DocumentItem {
    doc_id: string;
    user_id: string;
    filename: string;
    file_path: string;
    file_type: FileType;
    file_size: number;
    status: DocumentStatus;
    num_chunks: number;
    preview_text?: string;
    summary?: any;
    upload_date: string;
    processed_date?: string;
}

export interface Conversation {
    conversation_id: string;
    user_id: string;
    title: string;
    document_ids: string[];
    created_at: string;
    updated_at: string;
}

export interface Message {
    message_id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    sources?: { chunk_id: string; page: number; text_preview: string }[];
    timestamp: string;
}

export interface Quiz {
    quiz_id: string;
    document_id: string;
    user_id: string;
    title: string;
    difficulty: Difficulty;
    num_questions: number;
    status: QuizStatus;
    created_at: string;
}

export interface Question {
    question_id: string;
    quiz_id: string;
    question_number: number;
    question_text: string;
    options: string[];
    correct_answer: number;
    explanation: string;
    difficulty: Difficulty;
}

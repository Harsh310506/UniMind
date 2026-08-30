import axios from 'axios';
import type { AuthTokens, LoginCredentials, RegisterData, User } from '../types';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor: handle 401 errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const { data } = await axios.post('/api/auth/refresh', {
                        refresh_token: refreshToken,
                    });
                    localStorage.setItem('access_token', data.access_token);
                    localStorage.setItem('refresh_token', data.refresh_token);
                    originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
                    return api(originalRequest);
                } catch {
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                }
            } else {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ─── Auth API ────────────────────────────────────────────
export const authAPI = {
    login: (credentials: LoginCredentials) =>
        api.post<AuthTokens>('/auth/login', credentials),

    register: (data: RegisterData) =>
        api.post<User>('/auth/register', data),

    getMe: () =>
        api.get<User>('/auth/me'),

    refresh: (refreshToken: string) =>
        api.post<AuthTokens>('/auth/refresh', { refresh_token: refreshToken }),
};

// ─── Documents API ───────────────────────────────────────
export const documentsAPI = {
    upload: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/documents/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    list: (params?: { page?: number; page_size?: number; file_type?: string }) =>
        api.get('/documents', { params }),

    get: (docId: string) =>
        api.get(`/documents/${docId}`),

    delete: (docId: string) =>
        api.delete(`/documents/${docId}`),

    download: (docId: string) =>
        api.get(`/documents/${docId}/download`, { responseType: 'blob' }),
};

// ─── Chat API ────────────────────────────────────────────
export const chatAPI = {
    createConversation: (documentIds?: string[], title?: string) =>
        api.post('/chat/conversations', { document_ids: documentIds, title }),

    listConversations: () =>
        api.get('/chat/conversations'),

    getConversation: (conversationId: string) =>
        api.get(`/chat/conversations/${conversationId}`),

    sendMessage: (conversationId: string, content: string, documentIds?: string[]) =>
        api.post(`/chat/conversations/${conversationId}/messages`, {
            content,
            document_ids: documentIds,
        }),

    deleteConversation: (conversationId: string) =>
        api.delete(`/chat/conversations/${conversationId}`),
};

// ─── Quiz API ────────────────────────────────────────────
export const quizAPI = {
    generate: (documentId: string, difficulty: string, numQuestions: number) =>
        api.post('/quiz/generate', {
            document_id: documentId,
            difficulty,
            num_questions: numQuestions,
        }),

    getStatus: (quizId: string) =>
        api.get(`/quiz/${quizId}/status`),

    getQuiz: (quizId: string) =>
        api.get(`/quiz/${quizId}`),

    submit: (quizId: string, answers: Record<string, number>) =>
        api.post(`/quiz/${quizId}/submit`, { answers }),

    listByDocument: (documentId: string) =>
        api.get(`/quiz/document/${documentId}`),

    listAll: () =>
        api.get('/quiz'),

    getAttempts: (quizId: string) =>
        api.get(`/quiz/${quizId}/attempts`),

    getAttempt: (quizId: string, attemptId: string) =>
        api.get(`/quiz/${quizId}/attempts/${attemptId}`),

    delete: (quizId: string) =>
        api.delete(`/quiz/${quizId}`),
};

// ─── Analysis API ────────────────────────────────────────
export const analysisAPI = {
    sentiment: (text: string) =>
        api.post('/analysis/sentiment', { text }),

    transcribe: (audioFile: File) => {
        const formData = new FormData();
        formData.append('file', audioFile);
        return api.post('/speech/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    summarize: (documentId: string) =>
        api.post(`/documents/${documentId}/summarize`),
};

// ─── Dashboard API ───────────────────────────────────────
export const dashboardAPI = {
    getStats: () =>
        api.get('/dashboard/stats'),
};

export default api;

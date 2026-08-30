import { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI, documentsAPI } from '../services/api';

interface Message {
    message_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    sources?: { chunk_id: string; page: number; text_preview: string }[];
    timestamp: string;
}

interface ConversationItem {
    conversation_id: string;
    title: string;
    document_ids: string[];
    updated_at: string;
    last_message?: string;
}

export default function Chat() {
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [showDocPicker, setShowDocPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Get doc ID from URL params
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const docId = params.get('doc');
        if (docId) setSelectedDocs([docId]);
    }, []);

    const fetchConversations = useCallback(async () => {
        try {
            const { data } = await chatAPI.listConversations();
            setConversations(data.conversations);
        } catch { }
    }, []);

    const fetchDocuments = useCallback(async () => {
        try {
            const { data } = await documentsAPI.list({ page_size: 50 });
            setDocuments(data.documents.filter((d: any) => d.status === 'COMPLETED'));
        } catch { }
    }, []);

    useEffect(() => {
        fetchConversations();
        fetchDocuments();
    }, [fetchConversations, fetchDocuments]);

    const loadConversation = async (convId: string) => {
        setActiveConvId(convId);
        try {
            const { data } = await chatAPI.getConversation(convId);
            setMessages(data.messages);
            setSelectedDocs(data.document_ids || []);
        } catch { }
    };

    const startNewConversation = async () => {
        try {
            const { data } = await chatAPI.createConversation(
                selectedDocs.length > 0 ? selectedDocs : undefined,
            );
            setActiveConvId(data.conversation_id);
            setMessages([]);
            fetchConversations();
        } catch { }
    };

    const sendMessage = async () => {
        if (!input.trim() || sending) return;

        let convId = activeConvId;
        if (!convId) {
            try {
                const { data } = await chatAPI.createConversation(
                    selectedDocs.length > 0 ? selectedDocs : undefined,
                );
                convId = data.conversation_id;
                setActiveConvId(convId);
            } catch { return; }
        }

        const userMessage: Message = {
            message_id: `temp_${Date.now()}`,
            role: 'user',
            content: input,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setSending(true);

        try {
            const { data } = await chatAPI.sendMessage(convId!, input, selectedDocs.length > 0 ? selectedDocs : undefined);
            setMessages(prev => [...prev, data]);
            fetchConversations();
        } catch (err: any) {
            setMessages(prev => [...prev, {
                message_id: `err_${Date.now()}`,
                role: 'assistant',
                content: `Error: ${err.response?.data?.detail || 'Failed to get response'}`,
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setSending(false);
        }
    };

    const deleteConversation = async (convId: string) => {
        try {
            await chatAPI.deleteConversation(convId);
            if (activeConvId === convId) {
                setActiveConvId(null);
                setMessages([]);
            }
            fetchConversations();
        } catch { }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div style={{ height: 'calc(100vh - 4rem)', display: 'flex', background: 'var(--background)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Sidebar */}
            <div style={{
                width: 280, borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column',
                background: 'var(--surface)',
            }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <button onClick={startNewConversation} style={{
                        width: '100%', padding: '0.7rem',
                        background: 'var(--primary)', color: '#fff',
                        border: 'none', borderRadius: 10, cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.9rem',
                    }}>+ New Chat</button>
                </div>

                <div style={{ flex: 1, overflow: 'auto', padding: '0.5rem' }}>
                    {conversations.map(conv => (
                        <div key={conv.conversation_id} style={{
                            padding: '0.7rem 0.8rem',
                            borderRadius: 10,
                            marginBottom: '0.3rem',
                            cursor: 'pointer',
                            background: activeConvId === conv.conversation_id ? 'var(--surface-2)' : 'transparent',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }} onClick={() => loadConversation(conv.conversation_id)}>
                            <div style={{ minWidth: 0, flex: 1, marginRight: '0.5rem' }}>
                                <div style={{
                                    fontSize: '0.85rem', fontWeight: 500,
                                    color: 'var(--text-primary)',
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>{conv.title}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                    {conv.document_ids?.length || 0} docs
                                </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); deleteConversation(conv.conversation_id); }}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.2rem',
                                }}>🗑️</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{
                    padding: '0.8rem 1.5rem',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                        💬 {activeConvId ? 'Conversation' : 'Start a new chat'}
                    </h2>
                    <button
                        onClick={() => setShowDocPicker(!showDocPicker)}
                        style={{
                            padding: '0.4rem 1rem', fontSize: '0.85rem',
                            background: selectedDocs.length > 0 ? 'var(--primary)' : 'var(--surface-2)',
                            color: selectedDocs.length > 0 ? '#fff' : 'var(--text-primary)',
                            border: 'none', borderRadius: 8, cursor: 'pointer',
                        }}
                    >
                        📎 {selectedDocs.length > 0 ? `${selectedDocs.length} doc(s) attached` : 'Attach Documents'}
                    </button>
                </div>

                {/* Doc Picker Dropdown */}
                {showDocPicker && (
                    <div style={{
                        background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 12, padding: '1rem', margin: '0.5rem 1.5rem',
                        maxHeight: 200, overflow: 'auto',
                    }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                            Select documents for RAG context:
                        </div>
                        {documents.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No processed documents available</p>
                        ) : documents.map(doc => (
                            <label key={doc.doc_id} style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '0.4rem 0', cursor: 'pointer',
                                color: 'var(--text-primary)', fontSize: '0.85rem',
                            }}>
                                <input type="checkbox"
                                    checked={selectedDocs.includes(doc.doc_id)}
                                    onChange={e => {
                                        if (e.target.checked) setSelectedDocs(prev => [...prev, doc.doc_id]);
                                        else setSelectedDocs(prev => prev.filter(id => id !== doc.doc_id));
                                    }}
                                />
                                {doc.filename}
                            </label>
                        ))}
                    </div>
                )}

                {/* Messages */}
                <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
                    {messages.length === 0 && (
                        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
                            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🧠</div>
                            <h3 style={{ color: 'var(--text-primary)' }}>UniMind AI Assistant</h3>
                            <p style={{ color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto' }}>
                                {selectedDocs.length > 0
                                    ? 'Ask questions about your attached documents. I\'ll use RAG to find relevant information.'
                                    : 'Start a general conversation or attach documents for RAG-powered Q&A.'}
                            </p>
                        </div>
                    )}
                    {messages.map(msg => (
                        <div key={msg.message_id} style={{
                            display: 'flex',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                            marginBottom: '1rem',
                        }}>
                            <div style={{
                                maxWidth: '70%',
                                padding: '0.8rem 1.2rem',
                                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface)',
                                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                                border: msg.role !== 'user' ? '1px solid var(--border)' : 'none',
                            }}>
                                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                    {msg.content}
                                </div>
                                {msg.sources && msg.sources.length > 0 && (
                                    <div style={{
                                        marginTop: '0.5rem', paddingTop: '0.5rem',
                                        borderTop: '1px solid rgba(255,255,255,0.1)',
                                        fontSize: '0.75rem', color: 'var(--text-muted)',
                                    }}>
                                        📚 Sources: {msg.sources.map((s, i) => (
                                            <span key={i}>Page {s.page}{i < msg.sources!.length - 1 ? ', ' : ''}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {sending && (
                        <div style={{ display: 'flex', marginBottom: '1rem' }}>
                            <div style={{
                                padding: '0.8rem 1.2rem', borderRadius: '16px 16px 16px 4px',
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                color: 'var(--text-muted)',
                            }}>
                                Thinking... ⏳
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid var(--border)',
                    background: 'var(--surface)',
                }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={selectedDocs.length > 0 ? 'Ask about your documents...' : 'Type a message...'}
                            rows={1}
                            style={{
                                flex: 1, padding: '0.7rem 1rem',
                                background: 'var(--surface-2)',
                                border: '1px solid var(--border)',
                                borderRadius: 12, resize: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '0.9rem',
                                fontFamily: 'inherit',
                                outline: 'none',
                                minHeight: 44, maxHeight: 120,
                            }}
                        />
                        <button onClick={sendMessage} disabled={!input.trim() || sending}
                            style={{
                                padding: '0.7rem 1.2rem',
                                background: input.trim() ? 'var(--primary)' : 'var(--surface-2)',
                                color: input.trim() ? '#fff' : 'var(--text-muted)',
                                border: 'none', borderRadius: 12,
                                cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                                fontWeight: 600,
                            }}
                        >
                            Send →
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

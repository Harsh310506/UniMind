import React, { useState, useEffect, useRef, useCallback } from 'react';
import { chatAPI, documentsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
    MessageSquare,
    Paperclip,
    Send,
    Plus,
    Trash2,
    Edit3,
    Check,
    X,
    Copy,
    Bot,
    User,
    Sparkles,
    ChevronDown,
    ChevronUp,
    FileText,
    Search,
    BookOpen
} from 'lucide-react';

interface Source {
    chunk_id: string;
    page: number;
    text_preview: string;
}

interface Message {
    message_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    sources?: Source[];
    timestamp: string;
}

interface ConversationItem {
    conversation_id: string;
    title: string;
    document_ids: string[];
    updated_at: string;
    last_message?: string;
}

/** Expandable source citation accordion */
function SourceCitations({ sources }: { sources: Source[] }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="source-citations-wrapper">
            <button
                className="citations-toggle-btn"
                onClick={() => setOpen(o => !o)}
            >
                <BookOpen size={13} color="var(--primary-light)" />
                <span>{sources.length} Grounded Source{sources.length > 1 ? 's' : ''}</span>
                {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {open && (
                <div className="citations-list animate-fade-in">
                    {sources.map((s, i) => (
                        <div key={i} className="citation-card">
                            <div className="citation-header">
                                <span className="citation-page-badge">Page {s.page > 0 ? s.page : '—'}</span>
                                <span className="citation-id">{s.chunk_id}</span>
                            </div>
                            <p className="citation-preview">{s.text_preview}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Chat() {
    const toast = useToast();
    const [conversations, setConversations] = useState<ConversationItem[]>([]);
    const [convSearchQuery, setConvSearchQuery] = useState('');
    const [activeConvId, setActiveConvId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [loadingConvs, setLoadingConvs] = useState(true);
    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
    const [showDocPicker, setShowDocPicker] = useState(false);
    const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

    // Inline rename state
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        } catch {
        } finally {
            setLoadingConvs(false);
        }
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
        } catch {
            toast.error('Failed to load conversation');
        }
    };

    const startNewConversation = async () => {
        try {
            const { data } = await chatAPI.createConversation(
                selectedDocs.length > 0 ? selectedDocs : undefined,
            );
            setActiveConvId(data.conversation_id);
            setMessages([]);
            fetchConversations();
        } catch {
            toast.error('Failed to create new conversation');
        }
    };

    const sendMessage = async (textToSend?: string) => {
        const messageContent = textToSend || input;
        if (!messageContent.trim() || sending) return;

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
            content: messageContent,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setSending(true);

        try {
            const { data } = await chatAPI.sendMessage(convId!, messageContent, selectedDocs.length > 0 ? selectedDocs : undefined);
            setMessages(prev => [...prev, data]);
            fetchConversations();
        } catch (err: any) {
            setMessages(prev => [...prev, {
                message_id: `err_${Date.now()}`,
                role: 'assistant',
                content: `Error: ${err.response?.data?.detail || 'Failed to generate response'}`,
                timestamp: new Date().toISOString(),
            }]);
            toast.error('Message error', err.response?.data?.detail);
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
            toast.success('Conversation deleted');
        } catch {
            toast.error('Failed to delete conversation');
        }
    };

    // Inline rename
    const startEdit = (conv: ConversationItem) => {
        setEditingId(conv.conversation_id);
        setEditTitle(conv.title);
        setTimeout(() => renameInputRef.current?.focus(), 50);
    };

    const commitRename = async (convId: string) => {
        const trimmed = editTitle.trim();
        setEditingId(null);
        if (!trimmed) return;
        try {
            await chatAPI.renameConversation(convId, trimmed);
            setConversations(prev =>
                prev.map(c => c.conversation_id === convId ? { ...c, title: trimmed } : c)
            );
            toast.success('Renamed conversation');
        } catch {
            toast.error('Failed to rename conversation');
        }
    };

    const copyMessage = (msgId: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedMsgId(msgId);
        toast.success('Copied to clipboard');
        setTimeout(() => setCopiedMsgId(null), 2000);
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

    const promptSuggestions = [
        'Summarize the key conclusions and takeaways.',
        'Extract all important dates, facts, and figures.',
        'What are the core risks or limitations identified?',
        'Create a 5-question study guide based on this.',
    ];

    const filteredConversations = conversations.filter(c => 
        c.title.toLowerCase().includes(convSearchQuery.toLowerCase())
    );

    const activeConv = conversations.find(c => c.conversation_id === activeConvId);

    return (
        <div className="chat-page-container animate-slide-up">
            {/* Conversation List Sidebar */}
            <div className="conversations-sidebar glass-panel">
                <div className="conv-sidebar-header">
                    <button className="btn-primary new-chat-btn" onClick={startNewConversation}>
                        <Plus size={16} />
                        <span>New Chat</span>
                    </button>

                    <div className="conv-search-box">
                        <Search size={14} className="conv-search-icon" />
                        <input
                            type="text"
                            placeholder="Filter chats..."
                            value={convSearchQuery}
                            onChange={e => setConvSearchQuery(e.target.value)}
                            className="conv-search-input"
                        />
                    </div>
                </div>

                <div className="conversations-scroll-list">
                    {loadingConvs ? (
                        <div className="conv-skeletons-wrapper">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="conv-item-skeleton">
                                    <div className="skeleton" style={{ height: 14, width: '75%', marginBottom: 4 }} />
                                    <div className="skeleton" style={{ height: 11, width: '40%' }} />
                                </div>
                            ))}
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="empty-conv-list">
                            <MessageSquare size={24} color="var(--text-muted)" />
                            <span>No chats found</span>
                        </div>
                    ) : (
                        filteredConversations.map(conv => {
                            const isActive = activeConvId === conv.conversation_id;
                            const isEditing = editingId === conv.conversation_id;

                            return (
                                <div
                                    key={conv.conversation_id}
                                    className={`conv-list-item ${isActive ? 'active' : ''}`}
                                    onClick={() => { if (!isEditing) loadConversation(conv.conversation_id); }}
                                >
                                    <div className="conv-item-main">
                                        {isEditing ? (
                                            <div className="rename-input-group" onClick={e => e.stopPropagation()}>
                                                <input
                                                    ref={renameInputRef}
                                                    value={editTitle}
                                                    onChange={e => setEditTitle(e.target.value)}
                                                    onBlur={() => commitRename(conv.conversation_id)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') commitRename(conv.conversation_id);
                                                        if (e.key === 'Escape') setEditingId(null);
                                                    }}
                                                    className="rename-input"
                                                />
                                                <button className="save-rename-btn" onClick={() => commitRename(conv.conversation_id)}>
                                                    <Check size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div 
                                                    className="conv-title"
                                                    onDoubleClick={(e) => { e.stopPropagation(); startEdit(conv); }}
                                                    title="Double click to rename"
                                                >
                                                    {conv.title}
                                                </div>
                                                <div className="conv-meta">
                                                    <span>{conv.document_ids?.length || 0} doc(s) attached</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {!isEditing && (
                                        <div className="conv-item-actions">
                                            <button
                                                className="conv-action-btn"
                                                onClick={(e) => { e.stopPropagation(); startEdit(conv); }}
                                                title="Rename conversation"
                                            >
                                                <Edit3 size={13} />
                                            </button>
                                            <button
                                                className="conv-action-btn delete"
                                                onClick={(e) => { e.stopPropagation(); deleteConversation(conv.conversation_id); }}
                                                title="Delete conversation"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Main Chat Interface */}
            <div className="chat-main-area glass-panel">
                {/* Chat Topbar */}
                <div className="chat-header-bar">
                    <div className="chat-title-group">
                        <div className="chat-bot-icon">
                            <Bot size={18} color="#ffffff" />
                        </div>
                        <div>
                            <h2 className="active-chat-title">
                                {activeConv ? activeConv.title : 'New AI Knowledge Chat'}
                            </h2>
                            <span className="chat-model-info">
                                Groq Llama-3-70B • Hybrid Retrieval (0.7 Vector + 0.3 BM25)
                            </span>
                        </div>
                    </div>

                    <div className="chat-header-right">
                        <button
                            className={`attach-doc-btn ${selectedDocs.length > 0 ? 'has-docs' : ''}`}
                            onClick={() => setShowDocPicker(!showDocPicker)}
                        >
                            <Paperclip size={14} />
                            <span>{selectedDocs.length > 0 ? `${selectedDocs.length} Doc(s) Attached` : 'Attach Documents'}</span>
                        </button>
                    </div>
                </div>

                {/* Document Picker Dropdown Card */}
                {showDocPicker && (
                    <div className="doc-picker-dropdown glass-panel animate-fade-in">
                        <div className="picker-header">
                            <span className="picker-title">Select Document Knowledge Sources:</span>
                            <button className="picker-close" onClick={() => setShowDocPicker(false)}>
                                <X size={14} />
                            </button>
                        </div>
                        <div className="picker-list">
                            {documents.length === 0 ? (
                                <p className="no-docs-hint">No processed documents available. Upload one in Documents page.</p>
                            ) : documents.map(doc => (
                                <label key={doc.doc_id} className="picker-checkbox-item">
                                    <input
                                        type="checkbox"
                                        checked={selectedDocs.includes(doc.doc_id)}
                                        onChange={e => {
                                            if (e.target.checked) setSelectedDocs(prev => [...prev, doc.doc_id]);
                                            else setSelectedDocs(prev => prev.filter(id => id !== doc.doc_id));
                                        }}
                                        className="picker-input"
                                    />
                                    <FileText size={15} color="var(--primary-light)" />
                                    <span className="picker-doc-name">{doc.filename}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Messages Stream */}
                <div className="messages-stream">
                    {messages.length === 0 ? (
                        <div className="chat-empty-hero animate-fade-in">
                            <div className="hero-avatar">
                                <Sparkles size={36} color="var(--primary-light)" />
                            </div>
                            <h3>How can I assist your document research?</h3>
                            <p>
                                {selectedDocs.length > 0
                                    ? `I am ready to query ${selectedDocs.length} attached document(s) with grounded citations.`
                                    : 'Ask general technical questions or attach documents for precise RAG-powered answers.'}
                            </p>

                            <div className="prompt-suggestions-grid">
                                {promptSuggestions.map((prompt, i) => (
                                    <button
                                        key={i}
                                        className="suggestion-chip"
                                        onClick={() => sendMessage(prompt)}
                                    >
                                        <span className="suggestion-sparkle">💡</span>
                                        <span>{prompt}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map((msg) => {
                            const isUser = msg.role === 'user';
                            return (
                                <div key={msg.message_id} className={`message-row ${isUser ? 'user-row' : 'assistant-row'}`}>
                                    <div className="message-avatar">
                                        {isUser ? <User size={16} color="#ffffff" /> : <Bot size={16} color="#ffffff" />}
                                    </div>

                                    <div className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}>
                                        <div className="message-content">
                                            {msg.content}
                                        </div>

                                        {msg.sources && msg.sources.length > 0 && (
                                            <SourceCitations sources={msg.sources} />
                                        )}

                                        <div className="message-footer-bar">
                                            <span className="message-time">
                                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {!isUser && (
                                                <button
                                                    className="copy-msg-btn"
                                                    onClick={() => copyMessage(msg.message_id, msg.content)}
                                                    title="Copy response"
                                                >
                                                    {copiedMsgId === msg.message_id ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {sending && (
                        <div className="message-row assistant-row">
                            <div className="message-avatar">
                                <Bot size={16} color="#ffffff" />
                            </div>
                            <div className="message-bubble assistant-bubble typing-bubble">
                                <div className="typing-indicator">
                                    <span className="typing-dot" />
                                    <span className="typing-dot" />
                                    <span className="typing-dot" />
                                </div>
                                <span className="typing-label">Searching context & generating response...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Floating Box */}
                <div className="chat-input-container">
                    {/* Attached doc pills above input */}
                    {selectedDocs.length > 0 && (
                        <div className="attached-docs-bar">
                            <span className="attached-label">Knowledge Scope:</span>
                            {selectedDocs.map(docId => {
                                const d = documents.find(doc => doc.doc_id === docId);
                                return (
                                    <span key={docId} className="attached-doc-pill">
                                        <FileText size={12} />
                                        <span className="doc-pill-name">{d?.filename || 'Document'}</span>
                                        <button 
                                            className="remove-doc-pill-btn" 
                                            onClick={() => setSelectedDocs(prev => prev.filter(id => id !== docId))}
                                        >
                                            <X size={11} />
                                        </button>
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    <div className="chat-input-wrapper">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={selectedDocs.length > 0 ? "Ask anything about attached documents..." : "Type your question... (Enter to send, Shift+Enter for new line)"}
                            rows={1}
                            className="chat-textarea"
                        />

                        <button
                            className="chat-send-btn"
                            onClick={() => sendMessage()}
                            disabled={!input.trim() || sending}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                .chat-page-container {
                    display: flex;
                    gap: 1.25rem;
                    height: calc(100vh - 8rem);
                    width: 100%;
                }

                /* ─── Sidebar ─── */
                .conversations-sidebar {
                    width: 290px;
                    display: flex;
                    flex-direction: column;
                    flex-shrink: 0;
                    overflow: hidden;
                }
                .conv-sidebar-header {
                    padding: 1rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .new-chat-btn {
                    width: 100%;
                    padding: 0.6rem;
                    font-size: 0.85rem;
                }
                .conv-search-box {
                    position: relative;
                }
                .conv-search-icon {
                    position: absolute;
                    left: 0.65rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                }
                .conv-search-input {
                    width: 100%;
                    padding: 0.45rem 0.6rem 0.45rem 1.8rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-sm);
                    color: var(--text-primary);
                    font-size: 0.8rem;
                    outline: none;
                }
                .conv-search-input:focus {
                    border-color: var(--primary);
                }

                .conversations-scroll-list {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0.6rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }
                .conv-list-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.65rem 0.75rem;
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    transition: all 0.15s;
                    border: 1px solid transparent;
                }
                .conv-list-item:hover {
                    background: var(--surface-2);
                    border-color: var(--border);
                }
                .conv-list-item.active {
                    background: rgba(99, 102, 241, 0.12);
                    border-color: rgba(99, 102, 241, 0.3);
                }
                .conv-item-main {
                    flex: 1;
                    min-width: 0;
                }
                .conv-title {
                    font-size: 0.84rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    margin-bottom: 0.15rem;
                }
                .conv-meta {
                    font-size: 0.72rem;
                    color: var(--text-muted);
                }
                .conv-item-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.2rem;
                    opacity: 0;
                    transition: opacity 0.15s;
                }
                .conv-list-item:hover .conv-item-actions {
                    opacity: 1;
                }
                .conv-action-btn {
                    padding: 0.3rem;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    border-radius: 4px;
                }
                .conv-action-btn:hover {
                    color: var(--text-primary);
                    background: var(--surface-3);
                }
                .conv-action-btn.delete:hover {
                    color: var(--error);
                    background: var(--error-glow);
                }

                .rename-input-group {
                    display: flex;
                    align-items: center;
                    gap: 0.3rem;
                }
                .rename-input {
                    flex: 1;
                    background: var(--surface-3);
                    border: 1px solid var(--primary);
                    border-radius: 4px;
                    padding: 0.2rem 0.4rem;
                    font-size: 0.8rem;
                    color: var(--text-primary);
                    outline: none;
                }
                .save-rename-btn {
                    background: var(--primary);
                    border: none;
                    color: #fff;
                    padding: 0.25rem;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .empty-conv-list {
                    padding: 2.5rem 1rem;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.82rem;
                    color: var(--text-muted);
                }

                /* ─── Chat Main Area ─── */
                .chat-main-area {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: relative;
                }

                .chat-header-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.9rem 1.4rem;
                    border-bottom: 1px solid var(--border);
                    background: rgba(18, 26, 45, 0.85);
                }
                .chat-title-group {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .chat-bot-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: var(--radius-sm);
                    background: linear-gradient(135deg, #6366f1, #0ea5e9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3);
                }
                .active-chat-title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #ffffff;
                    margin-bottom: 0.15rem;
                }
                .chat-model-info {
                    font-size: 0.73rem;
                    color: var(--text-muted);
                }
                .attach-doc-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    padding: 0.45rem 0.85rem;
                    border-radius: var(--radius);
                    border: 1px solid var(--border);
                    background: var(--surface-2);
                    color: var(--text-secondary);
                    font-size: 0.8rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .attach-doc-btn:hover {
                    background: var(--surface-3);
                    color: var(--text-primary);
                }
                .attach-doc-btn.has-docs {
                    background: rgba(99, 102, 241, 0.15);
                    border-color: rgba(99, 102, 241, 0.4);
                    color: var(--primary-light);
                }

                /* ─── Doc Picker Dropdown ─── */
                .doc-picker-dropdown {
                    position: absolute;
                    top: 60px;
                    right: 1.4rem;
                    width: 320px;
                    max-height: 260px;
                    z-index: 50;
                    padding: 1rem;
                    box-shadow: var(--shadow-lg);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                }
                .picker-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid var(--border);
                }
                .picker-title {
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .picker-close {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                }
                .picker-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                    max-height: 180px;
                    overflow-y: auto;
                }
                .picker-checkbox-item {
                    display: flex;
                    align-items: center;
                    gap: 0.55rem;
                    padding: 0.35rem 0.5rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.82rem;
                    color: var(--text-primary);
                }
                .picker-checkbox-item:hover {
                    background: var(--surface-2);
                }
                .picker-input {
                    accent-color: var(--primary);
                }
                .picker-doc-name {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .no-docs-hint {
                    font-size: 0.78rem;
                    color: var(--text-muted);
                    text-align: center;
                    padding: 0.5rem;
                }

                /* ─── Messages Stream ─── */
                .messages-stream {
                    flex: 1;
                    overflow-y: auto;
                    padding: 1.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .chat-empty-hero {
                    margin: auto;
                    max-width: 580px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 2rem 1rem;
                }
                .hero-avatar {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: rgba(99, 102, 241, 0.12);
                    border: 1px solid rgba(99, 102, 241, 0.25);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 0.4rem;
                }
                .chat-empty-hero h3 {
                    font-size: 1.35rem;
                    color: #ffffff;
                }
                .chat-empty-hero p {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    line-height: 1.5;
                }
                .prompt-suggestions-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.65rem;
                    width: 100%;
                    margin-top: 1rem;
                }
                .suggestion-chip {
                    display: flex;
                    align-items: center;
                    gap: 0.55rem;
                    padding: 0.75rem 1rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    color: var(--text-primary);
                    font-size: 0.82rem;
                    font-family: inherit;
                    text-align: left;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .suggestion-chip:hover {
                    background: var(--surface-3);
                    border-color: rgba(99, 102, 241, 0.4);
                    transform: translateY(-2px);
                }
                .suggestion-sparkle {
                    font-size: 0.95rem;
                }

                /* ─── Message Bubbles ─── */
                .message-row {
                    display: flex;
                    gap: 0.85rem;
                    max-width: 82%;
                }
                .user-row {
                    margin-left: auto;
                    flex-direction: row-reverse;
                }
                .assistant-row {
                    margin-right: auto;
                }
                .message-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .user-row .message-avatar {
                    background: linear-gradient(135deg, #6366f1, #4f46e5);
                }
                .assistant-row .message-avatar {
                    background: linear-gradient(135deg, #0ea5e9, #6366f1);
                }

                .message-bubble {
                    padding: 1rem 1.25rem;
                    border-radius: var(--radius-md);
                    font-size: 0.92rem;
                    line-height: 1.65;
                }
                .user-bubble {
                    background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
                    color: #ffffff;
                    border-bottom-right-radius: 4px;
                    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
                }
                .assistant-bubble {
                    background: var(--surface-2);
                    color: var(--text-primary);
                    border: 1px solid var(--border);
                    border-bottom-left-radius: 4px;
                }

                .message-footer-bar {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
                    gap: 0.5rem;
                    margin-top: 0.55rem;
                    font-size: 0.72rem;
                    color: var(--text-muted);
                }
                .user-bubble .message-footer-bar {
                    color: rgba(255, 255, 255, 0.6);
                }
                .copy-msg-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 0.2rem;
                    border-radius: 4px;
                }
                .copy-msg-btn:hover {
                    color: var(--text-primary);
                    background: var(--surface-3);
                }

                /* ─── Source Citations ─── */
                .source-citations-wrapper {
                    margin-top: 0.75rem;
                    padding-top: 0.65rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                }
                .citations-toggle-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    background: rgba(99, 102, 241, 0.1);
                    border: 1px solid rgba(99, 102, 241, 0.25);
                    border-radius: 6px;
                    padding: 0.25rem 0.55rem;
                    color: var(--primary-light);
                    font-size: 0.74rem;
                    font-weight: 600;
                    cursor: pointer;
                    font-family: inherit;
                }
                .citations-list {
                    margin-top: 0.6rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.45rem;
                }
                .citation-card {
                    background: rgba(0, 0, 0, 0.25);
                    border: 1px solid rgba(255, 255, 255, 0.06);
                    border-radius: 8px;
                    padding: 0.6rem 0.8rem;
                }
                .citation-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.3rem;
                }
                .citation-page-badge {
                    font-size: 0.72rem;
                    font-weight: 700;
                    color: var(--primary-light);
                }
                .citation-id {
                    font-size: 0.68rem;
                    color: var(--text-muted);
                    font-family: var(--font-mono);
                }
                .citation-preview {
                    font-size: 0.78rem;
                    color: var(--text-secondary);
                    line-height: 1.5;
                }

                /* ─── Typing Indicator ─── */
                .typing-bubble {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                }
                .typing-indicator {
                    display: flex;
                    gap: 0.3rem;
                }
                .typing-dot {
                    width: 6px;
                    height: 6px;
                    background: var(--primary-light);
                    border-radius: 50%;
                    animation: pulseGlow 1s infinite alternate;
                }
                .typing-dot:nth-child(2) { animation-delay: 0.2s; }
                .typing-dot:nth-child(3) { animation-delay: 0.4s; }
                .typing-label {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }

                /* ─── Input Bar ─── */
                .chat-input-container {
                    padding: 0.9rem 1.25rem;
                    background: rgba(18, 26, 45, 0.95);
                    border-top: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    gap: 0.6rem;
                }
                .attached-docs-bar {
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                    flex-wrap: wrap;
                }
                .attached-label {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    font-weight: 600;
                }
                .attached-doc-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.2rem 0.55rem;
                    background: rgba(99, 102, 241, 0.12);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    border-radius: 6px;
                    font-size: 0.74rem;
                    color: var(--primary-light);
                }
                .doc-pill-name {
                    max-width: 140px;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .remove-doc-pill-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                }
                .remove-doc-pill-btn:hover {
                    color: var(--error);
                }

                .chat-input-wrapper {
                    display: flex;
                    align-items: flex-end;
                    gap: 0.65rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-md);
                    padding: 0.5rem 0.8rem;
                    transition: border-color 0.2s;
                }
                .chat-input-wrapper:focus-within {
                    border-color: var(--primary);
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
                }
                .chat-textarea {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: var(--text-primary);
                    font-size: 0.92rem;
                    font-family: inherit;
                    outline: none;
                    resize: none;
                    min-height: 24px;
                    max-height: 140px;
                    line-height: 1.5;
                }
                .chat-send-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: var(--radius-sm);
                    background: var(--primary);
                    border: none;
                    color: #ffffff;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                    transition: all 0.2s;
                }
                .chat-send-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
                }
                .chat-send-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                    background: var(--surface-3);
                }

                /* ─── Responsive ─── */
                @media (max-width: 900px) {
                    .chat-page-container {
                        flex-direction: column;
                        height: calc(100vh - 6rem);
                    }
                    .conversations-sidebar {
                        width: 100%;
                        height: 180px;
                    }
                    .prompt-suggestions-grid {
                        grid-template-columns: 1fr;
                    }
                    .message-row {
                        max-width: 95%;
                    }
                }
            `}</style>
        </div>
    );
}

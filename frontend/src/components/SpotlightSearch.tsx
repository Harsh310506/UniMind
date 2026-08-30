import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import {
    Search,
    FileText,
    MessageSquare,
    Sparkles,
    Layers,
    X,
    CornerDownLeft
} from 'lucide-react';

interface SearchResultItem {
    id: string;
    title: string;
    subtitle: string;
    type: 'DOCUMENT' | 'CHAT' | 'QUIZ' | 'FLASHCARD';
    url: string;
}

interface SpotlightSearchProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SpotlightSearch({ isOpen, onClose }: SpotlightSearchProps) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{
        documents: SearchResultItem[];
        chats: SearchResultItem[];
        quizzes: SearchResultItem[];
        flashcards: SearchResultItem[];
    }>({
        documents: [],
        chats: [],
        quizzes: [],
        flashcards: [],
    });
    const [selectedIndex, setSelectedIndex] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    // Flatten results for keyboard navigation
    const allItems = [
        ...results.documents,
        ...results.chats,
        ...results.quizzes,
        ...results.flashcards,
    ];

    const performSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults({ documents: [], chats: [], quizzes: [], flashcards: [] });
            return;
        }
        setLoading(true);
        try {
            const { data } = await dashboardAPI.globalSearch(searchQuery.trim());
            setResults({
                documents: data.documents || [],
                chats: data.chats || [],
                quizzes: data.quizzes || [],
                flashcards: data.flashcards || [],
            });
            setSelectedIndex(0);
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(query);
        }, 200);
        return () => clearTimeout(timer);
    }, [query, performSearch]);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setResults({ documents: [], chats: [], quizzes: [], flashcards: [] });
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    const handleSelect = (item: SearchResultItem) => {
        onClose();
        navigate(item.url);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => (i + 1 < allItems.length ? i + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => (i - 1 >= 0 ? i - 1 : allItems.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (allItems[selectedIndex]) {
                handleSelect(allItems[selectedIndex]);
            }
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'DOCUMENT': return <FileText size={16} color="var(--primary-light)" />;
            case 'CHAT': return <MessageSquare size={16} color="var(--secondary)" />;
            case 'QUIZ': return <Sparkles size={16} color="var(--warning)" />;
            case 'FLASHCARD': return <Layers size={16} color="#8b5cf6" />;
            default: return <Search size={16} />;
        }
    };

    let flatIndexTracker = 0;

    return (
        <div className="spotlight-backdrop" onClick={onClose}>
            <div className="spotlight-modal glass-panel animate-slide-up" onClick={e => e.stopPropagation()}>
                {/* Search Input Bar */}
                <div className="spotlight-search-header">
                    <Search size={18} className="spotlight-search-icon" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search anything across documents, chats, quizzes, flashcards..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="spotlight-input"
                    />
                    {loading && (
                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    )}
                    <button className="spotlight-close-btn" onClick={onClose}>
                        <X size={16} />
                    </button>
                </div>

                {/* Search Results List */}
                <div className="spotlight-results-body">
                    {query.trim() && allItems.length === 0 && !loading && (
                        <div className="spotlight-empty-state">
                            <p>No matching knowledge found for "{query}"</p>
                        </div>
                    )}

                    {!query.trim() && (
                        <div className="spotlight-prompt-hints">
                            <span>Quick jumps:</span>
                            <div className="quick-jump-chips">
                                <button onClick={() => { onClose(); navigate('/documents'); }}>📄 All Documents</button>
                                <button onClick={() => { onClose(); navigate('/chat'); }}>💬 AI Chat</button>
                                <button onClick={() => { onClose(); navigate('/quiz'); }}>✨ Quizzes</button>
                                <button onClick={() => { onClose(); navigate('/flashcards'); }}>🗂️ Flashcards</button>
                                <button onClick={() => { onClose(); navigate('/compare'); }}>⚖️ Document Compare</button>
                            </div>
                        </div>
                    )}

                    {/* Section 1: Documents */}
                    {results.documents.length > 0 && (
                        <div className="result-group">
                            <span className="group-title">DOCUMENTS</span>
                            {results.documents.map(item => {
                                const idx = flatIndexTracker++;
                                const isSelected = idx === selectedIndex;
                                return (
                                    <div
                                        key={item.id}
                                        className={`spotlight-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelect(item)}
                                    >
                                        <div className="item-icon-box">{getTypeIcon(item.type)}</div>
                                        <div className="item-details">
                                            <span className="item-title">{item.title}</span>
                                            <span className="item-subtitle">{item.subtitle}</span>
                                        </div>
                                        <CornerDownLeft size={14} className="item-enter-icon" />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Section 2: Conversations */}
                    {results.chats.length > 0 && (
                        <div className="result-group">
                            <span className="group-title">AI CONVERSATIONS</span>
                            {results.chats.map(item => {
                                const idx = flatIndexTracker++;
                                const isSelected = idx === selectedIndex;
                                return (
                                    <div
                                        key={item.id}
                                        className={`spotlight-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelect(item)}
                                    >
                                        <div className="item-icon-box">{getTypeIcon(item.type)}</div>
                                        <div className="item-details">
                                            <span className="item-title">{item.title}</span>
                                            <span className="item-subtitle">{item.subtitle}</span>
                                        </div>
                                        <CornerDownLeft size={14} className="item-enter-icon" />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Section 3: Quizzes */}
                    {results.quizzes.length > 0 && (
                        <div className="result-group">
                            <span className="group-title">ASSESSMENTS & QUIZZES</span>
                            {results.quizzes.map(item => {
                                const idx = flatIndexTracker++;
                                const isSelected = idx === selectedIndex;
                                return (
                                    <div
                                        key={item.id}
                                        className={`spotlight-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelect(item)}
                                    >
                                        <div className="item-icon-box">{getTypeIcon(item.type)}</div>
                                        <div className="item-details">
                                            <span className="item-title">{item.title}</span>
                                            <span className="item-subtitle">{item.subtitle}</span>
                                        </div>
                                        <CornerDownLeft size={14} className="item-enter-icon" />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Section 4: Flashcards */}
                    {results.flashcards.length > 0 && (
                        <div className="result-group">
                            <span className="group-title">FLASHCARD DECKS</span>
                            {results.flashcards.map(item => {
                                const idx = flatIndexTracker++;
                                const isSelected = idx === selectedIndex;
                                return (
                                    <div
                                        key={item.id}
                                        className={`spotlight-item ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelect(item)}
                                    >
                                        <div className="item-icon-box">{getTypeIcon(item.type)}</div>
                                        <div className="item-details">
                                            <span className="item-title">{item.title}</span>
                                            <span className="item-subtitle">{item.subtitle}</span>
                                        </div>
                                        <CornerDownLeft size={14} className="item-enter-icon" />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer Shortcuts */}
                <div className="spotlight-footer">
                    <div className="shortcut-pill">
                        <kbd>↑</kbd> <kbd>↓</kbd> <span>Navigate</span>
                    </div>
                    <div className="shortcut-pill">
                        <kbd>↵</kbd> <span>Open</span>
                    </div>
                    <div className="shortcut-pill">
                        <kbd>esc</kbd> <span>Close</span>
                    </div>
                </div>
            </div>

            <style>{`
                .spotlight-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: flex-start;
                    justify-content: center;
                    z-index: 1000;
                    padding: 5rem 1rem 2rem;
                }

                .spotlight-modal {
                    width: 100%;
                    max-width: 640px;
                    border-radius: var(--radius-lg);
                    border: 1px solid rgba(99, 102, 241, 0.35);
                    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }

                .spotlight-search-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1.1rem 1.4rem;
                    border-bottom: 1px solid var(--border);
                    background: rgba(18, 26, 45, 0.95);
                }
                .spotlight-search-icon {
                    color: var(--primary-light);
                    flex-shrink: 0;
                }
                .spotlight-input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: #ffffff;
                    font-size: 1.05rem;
                    font-family: inherit;
                    outline: none;
                }
                .spotlight-input::placeholder {
                    color: var(--text-muted);
                    font-size: 0.95rem;
                }
                .spotlight-close-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                }

                .spotlight-results-body {
                    max-height: 420px;
                    overflow-y: auto;
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }

                .spotlight-empty-state {
                    text-align: center;
                    padding: 2.5rem 1rem;
                    color: var(--text-muted);
                    font-size: 0.9rem;
                }

                .spotlight-prompt-hints {
                    padding: 1rem 0.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.6rem;
                    font-size: 0.78rem;
                    color: var(--text-muted);
                }
                .quick-jump-chips {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.45rem;
                }
                .quick-jump-chips button {
                    padding: 0.4rem 0.75rem;
                    border-radius: var(--radius-sm);
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    font-size: 0.8rem;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .quick-jump-chips button:hover {
                    background: var(--surface-3);
                    border-color: rgba(99, 102, 241, 0.35);
                }

                .result-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }
                .group-title {
                    font-size: 0.7rem;
                    font-weight: 800;
                    color: var(--text-muted);
                    letter-spacing: 0.06em;
                    padding: 0 0.5rem;
                }

                .spotlight-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.7rem 0.85rem;
                    border-radius: var(--radius-sm);
                    cursor: pointer;
                    transition: all 0.15s;
                    border: 1px solid transparent;
                }
                .spotlight-item:hover, .spotlight-item.selected {
                    background: rgba(99, 102, 241, 0.15);
                    border-color: rgba(99, 102, 241, 0.3);
                }
                .item-icon-box {
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    background: var(--surface-2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .item-details {
                    flex: 1;
                    min-width: 0;
                }
                .item-title {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    display: block;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .item-subtitle {
                    font-size: 0.74rem;
                    color: var(--text-muted);
                }
                .item-enter-icon {
                    color: var(--text-muted);
                    opacity: 0;
                }
                .spotlight-item.selected .item-enter-icon {
                    opacity: 1;
                    color: var(--primary-light);
                }

                .spotlight-footer {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    padding: 0.75rem 1.4rem;
                    background: rgba(18, 26, 45, 0.95);
                    border-top: 1px solid var(--border);
                }
                .shortcut-pill {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.74rem;
                    color: var(--text-muted);
                }
                .shortcut-pill kbd {
                    padding: 0.15rem 0.4rem;
                    border-radius: 4px;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                    font-size: 0.7rem;
                    font-weight: 700;
                    font-family: inherit;
                }
            `}</style>
        </div>
    );
}

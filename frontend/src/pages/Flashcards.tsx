import { useState, useEffect, useCallback } from 'react';
import { flashcardsAPI, documentsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
    Sparkles,
    RotateCw,
    Download,
    Trash2,
    BookOpen,
    Layers,
    Sliders,
    ArrowRight,
    ArrowLeft,
    Award,
    FileText
} from 'lucide-react';

interface FlashcardItem {
    card_id: string;
    front: string;
    back: string;
    key_takeaway?: string;
    difficulty: string;
    state: string;
    interval: number;
    repetitions: number;
    due_date: string;
}

interface DeckSummary {
    deck_id: string;
    title: string;
    document_id: string;
    document_name: string;
    total_cards: number;
    due_cards: number;
    mastered_cards: number;
    created_at: string;
}

export default function Flashcards() {
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'decks' | 'study' | 'generate'>('decks');
    const [decks, setDecks] = useState<DeckSummary[]>([]);
    const [loadingDecks, setLoadingDecks] = useState(true);

    // Generation state
    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedDoc, setSelectedDoc] = useState('');
    const [deckTitle, setDeckTitle] = useState('');
    const [numCards, setNumCards] = useState(10);
    const [generating, setGenerating] = useState(false);

    // Study state
    const [currentDeck, setCurrentDeck] = useState<any>(null);
    const [cards, setCards] = useState<FlashcardItem[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [studyCompleted, setStudyCompleted] = useState(false);

    const loadDecks = useCallback(async () => {
        setLoadingDecks(true);
        try {
            const { data } = await flashcardsAPI.listDecks();
            setDecks(data.decks);
        } catch {
            toast.error('Failed to load flashcard decks');
        } finally {
            setLoadingDecks(false);
        }
    }, [toast]);

    const fetchDocuments = useCallback(async () => {
        try {
            const { data } = await documentsAPI.list({ page_size: 50 });
            setDocuments(data.documents.filter((d: any) => d.status === 'COMPLETED'));
        } catch { }
    }, []);

    useEffect(() => {
        loadDecks();
        fetchDocuments();
    }, [loadDecks, fetchDocuments]);

    const startStudy = async (deckId: string) => {
        try {
            const { data } = await flashcardsAPI.getDeck(deckId);
            setCurrentDeck(data);
            setCards(data.cards);
            setCurrentIdx(0);
            setIsFlipped(false);
            setStudyCompleted(false);
            setActiveTab('study');
        } catch {
            toast.error('Failed to open deck');
        }
    };

    const handleGenerate = async () => {
        if (!selectedDoc) {
            toast.warning('Select document', 'Please choose a document to generate flashcards from.');
            return;
        }
        setGenerating(true);
        try {
            const { data } = await flashcardsAPI.generate(selectedDoc, numCards, deckTitle);
            toast.success('Deck created!', `${data.total_cards} flashcards ready.`);
            loadDecks();
            startStudy(data.deck_id);
        } catch (err: any) {
            toast.error('Generation failed', err.response?.data?.detail);
        } finally {
            setGenerating(false);
        }
    };

    const handleCardRating = async (rating: number) => {
        if (!currentDeck || cards.length === 0) return;
        const currentCard = cards[currentIdx];

        try {
            await flashcardsAPI.reviewCard(currentDeck.deck_id, currentCard.card_id, rating);
        } catch { }

        setIsFlipped(false);

        if (currentIdx + 1 < cards.length) {
            setCurrentIdx(i => i + 1);
        } else {
            setStudyCompleted(true);
            toast.success('Session complete!', `You reviewed all ${cards.length} cards in this deck.`);
        }
    };

    const handleDeleteDeck = async (e: React.MouseEvent, deckId: string) => {
        e.stopPropagation();
        if (!confirm('Delete this flashcard deck?')) return;
        try {
            await flashcardsAPI.deleteDeck(deckId);
            setDecks(prev => prev.filter(d => d.deck_id !== deckId));
            toast.success('Deck deleted');
        } catch {
            toast.error('Failed to delete deck');
        }
    };

    const handleExport = async (e: React.MouseEvent, deckId: string, title: string, format: 'anki' | 'markdown') => {
        e.stopPropagation();
        try {
            const res = await flashcardsAPI.exportDeck(deckId, format);
            const blob = new Blob([res.data]);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${title}.${format === 'anki' ? 'tsv' : 'md'}`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            toast.success(`Exported as ${format === 'anki' ? 'Anki TSV' : 'Markdown'}`);
        } catch {
            toast.error('Export failed');
        }
    };

    // Keyboard navigation during study
    useEffect(() => {
        if (activeTab !== 'study' || studyCompleted || cards.length === 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setIsFlipped(f => !f);
            } else if (isFlipped) {
                if (e.key === '1') handleCardRating(1);
                else if (e.key === '2') handleCardRating(2);
                else if (e.key === '3') handleCardRating(3);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, isFlipped, currentIdx, studyCompleted, cards]);

    const card = cards[currentIdx];

    return (
        <div className="flashcards-container animate-slide-up">
            {/* Header with Navigation Switcher */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Interactive AI Flashcards</h1>
                    <p className="page-subtitle">
                        Master concepts with spaced repetition (SM-2), 3D flip card recall, and one-click Anki export.
                    </p>
                </div>

                <div className="tab-pill-bar glass-panel">
                    <button
                        className={`tab-pill-btn ${activeTab === 'decks' ? 'active' : ''}`}
                        onClick={() => setActiveTab('decks')}
                    >
                        <BookOpen size={15} />
                        <span>Decks ({decks.length})</span>
                    </button>
                    <button
                        className={`tab-pill-btn ${activeTab === 'generate' ? 'active' : ''}`}
                        onClick={() => setActiveTab('generate')}
                    >
                        <Sparkles size={15} />
                        <span>Create Deck</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: Decks Library */}
            {activeTab === 'decks' && (
                <div className="decks-view animate-fade-in">
                    {loadingDecks ? (
                        <div className="decks-grid">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="deck-card-skeleton glass-panel">
                                    <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 10 }} />
                                    <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 16 }} />
                                    <div className="skeleton" style={{ height: 36, width: '100%', borderRadius: 8 }} />
                                </div>
                            ))}
                        </div>
                    ) : decks.length === 0 ? (
                        <div className="empty-decks-card glass-panel">
                            <div className="empty-icon-box">🗂️</div>
                            <h3>No Flashcard Decks Yet</h3>
                            <p>Generate high-yield Q&A flashcards from any document in your knowledge base.</p>
                            <button className="btn-primary" onClick={() => setActiveTab('generate')}>
                                <Sparkles size={16} />
                                <span>Create First Flashcard Deck</span>
                            </button>
                        </div>
                    ) : (
                        <div className="decks-grid">
                            {decks.map(d => {
                                const masteryPct = d.total_cards > 0 ? Math.round((d.mastered_cards / d.total_cards) * 100) : 0;

                                return (
                                    <div
                                        key={d.deck_id}
                                        className="deck-card glass-panel"
                                        onClick={() => startStudy(d.deck_id)}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div className="deck-card-top">
                                            <div className="deck-tag">
                                                <Layers size={13} color="var(--primary-light)" />
                                                <span>{d.total_cards} Cards</span>
                                            </div>
                                            <div className="deck-actions-right">
                                                <button
                                                    className="deck-action-icon"
                                                    onClick={(e) => handleExport(e, d.deck_id, d.title, 'anki')}
                                                    title="Export to Anki TSV"
                                                >
                                                    <Download size={14} />
                                                </button>
                                                <button
                                                    className="deck-action-icon delete"
                                                    onClick={(e) => handleDeleteDeck(e, d.deck_id)}
                                                    title="Delete deck"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="deck-card-body">
                                            <h3 className="deck-title">{d.title}</h3>
                                            <span className="deck-source-doc">📄 {d.document_name}</span>

                                            <div className="deck-mastery-section">
                                                <div className="mastery-labels">
                                                    <span>Mastery Level</span>
                                                    <span className="mastery-pct">{masteryPct}%</span>
                                                </div>
                                                <div className="mastery-track">
                                                    <div className="mastery-fill" style={{ width: `${masteryPct}%` }} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="deck-card-footer">
                                            <button className="study-deck-btn">
                                                <span>Study Deck</span>
                                                <ArrowRight size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: Generate Deck */}
            {activeTab === 'generate' && (
                <div className="generate-deck-card glass-panel animate-slide-up">
                    <div className="card-header-group">
                        <div className="card-header-icon">
                            <Sparkles size={20} color="var(--primary-light)" />
                        </div>
                        <div>
                            <h3>Generate AI Flashcards</h3>
                            <p>Extract core definitions, formulas, and key takeaways into an active recall deck.</p>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="field-label">
                            <FileText size={15} />
                            <span>Select Source Document</span>
                        </label>
                        <select
                            value={selectedDoc}
                            onChange={e => setSelectedDoc(e.target.value)}
                            className="input-field"
                        >
                            <option value="">Choose an indexed document...</option>
                            {documents.map(doc => (
                                <option key={doc.doc_id} value={doc.doc_id}>
                                    {doc.filename} ({doc.file_type})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="field-label">
                            <Sliders size={15} />
                            <span>Card Count: <strong>{numCards} cards</strong></span>
                        </label>
                        <div className="count-selector-pills">
                            {[5, 10, 15, 20].map(cnt => (
                                <button
                                    key={cnt}
                                    type="button"
                                    className={`count-chip ${numCards === cnt ? 'active' : ''}`}
                                    onClick={() => setNumCards(cnt)}
                                >
                                    {cnt} Cards
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="field-label">Custom Deck Title (Optional)</label>
                        <input
                            type="text"
                            placeholder="e.g. Machine Learning Key Terms"
                            value={deckTitle}
                            onChange={e => setDeckTitle(e.target.value)}
                            className="input-field"
                        />
                    </div>

                    <div className="form-actions">
                        <button
                            className="btn-primary start-btn"
                            onClick={handleGenerate}
                            disabled={!selectedDoc || generating}
                        >
                            {generating ? (
                                <>
                                    <div className="spinner" style={{ width: 16, height: 16 }} />
                                    <span>Synthesizing Concept Cards with Groq 70B...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    <span>Generate Flashcards</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* TAB 3: Interactive Study Mode */}
            {activeTab === 'study' && currentDeck && (
                <div className="study-mode-container animate-slide-up">
                    {/* Top Study Bar */}
                    <div className="study-top-bar glass-panel">
                        <button className="btn-secondary back-btn" onClick={() => setActiveTab('decks')}>
                            <ArrowLeft size={15} />
                            <span>All Decks</span>
                        </button>

                        <div className="study-progress-info">
                            <span className="deck-study-name">{currentDeck.title}</span>
                            <span className="card-counter">
                                Card <strong>{currentIdx + 1}</strong> of {cards.length}
                            </span>
                        </div>

                        <div className="export-shortcut-group">
                            <button
                                className="export-shortcut-btn"
                                onClick={(e) => handleExport(e, currentDeck.deck_id, currentDeck.title, 'anki')}
                                title="Export to Anki"
                            >
                                <Download size={13} />
                                <span>Anki</span>
                            </button>
                        </div>
                    </div>

                    {studyCompleted ? (
                        <div className="study-complete-card glass-panel animate-fade-in">
                            <div className="complete-icon-badge">
                                <Award size={36} color="var(--primary-light)" />
                            </div>
                            <h2>Session Completed! 🎉</h2>
                            <p>You have reviewed all {cards.length} flashcards in this deck.</p>
                            <div className="complete-actions">
                                <button className="btn-primary" onClick={() => startStudy(currentDeck.deck_id)}>
                                    <RotateCw size={15} />
                                    <span>Study Again</span>
                                </button>
                                <button className="btn-secondary" onClick={() => setActiveTab('decks')}>
                                    <span>Back to Decks</span>
                                </button>
                            </div>
                        </div>
                    ) : card && (
                        <div className="interactive-card-arena">
                            {/* 3D Flip Card */}
                            <div
                                className={`flashcard-3d-wrapper ${isFlipped ? 'flipped' : ''}`}
                                onClick={() => setIsFlipped(!isFlipped)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className="flashcard-3d-inner">
                                    {/* Front Side */}
                                    <div className="card-face card-face-front">
                                        <div className="card-face-header">
                                            <span className="face-tag question">QUESTION / CONCEPT</span>
                                            <span className="hint-pill">Press Space or Click to Flip</span>
                                        </div>
                                        <div className="card-text-body">
                                            <p>{card.front}</p>
                                        </div>
                                        <div className="card-face-footer">
                                            <RotateCw size={14} />
                                            <span>Click to Reveal Answer</span>
                                        </div>
                                    </div>

                                    {/* Back Side */}
                                    <div className="card-face card-face-back">
                                        <div className="card-face-header">
                                            <span className="face-tag answer">ANSWER / DEFINITION</span>
                                            <span className="hint-pill">Spaced Repetition Rating</span>
                                        </div>
                                        <div className="card-text-body">
                                            <p className="answer-text">{card.back}</p>
                                            {card.key_takeaway && (
                                                <div className="takeaway-callout">
                                                    <span className="takeaway-title">💡 Key Takeaway:</span>
                                                    <p>{card.key_takeaway}</p>
                                                </div>
                                            )}
                                        </div>
                                        <div className="card-face-footer">
                                            <span>Rate your recall difficulty below</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recall Rating Buttons (SM-2) */}
                            {isFlipped && (
                                <div className="rating-action-bar animate-fade-in">
                                    <button
                                        className="rating-btn again"
                                        onClick={() => handleCardRating(1)}
                                    >
                                        <span className="rating-num">1</span>
                                        <span className="rating-label">Again / Hard</span>
                                        <span className="rating-sub">Review in 1d</span>
                                    </button>

                                    <button
                                        className="rating-btn good"
                                        onClick={() => handleCardRating(2)}
                                    >
                                        <span className="rating-num">2</span>
                                        <span className="rating-label">Good</span>
                                        <span className="rating-sub">Review in 4d</span>
                                    </button>

                                    <button
                                        className="rating-btn easy"
                                        onClick={() => handleCardRating(3)}
                                    >
                                        <span className="rating-num">3</span>
                                        <span className="rating-label">Easy</span>
                                        <span className="rating-sub">Review in 7d</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <style>{`
                .flashcards-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.75rem;
                    max-width: 920px;
                    margin: 0 auto;
                    width: 100%;
                }

                .page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .page-title {
                    font-size: 1.75rem;
                    font-weight: 800;
                    color: #ffffff;
                    margin-bottom: 0.3rem;
                }
                .page-subtitle {
                    color: var(--text-secondary);
                    font-size: 0.92rem;
                }

                .tab-pill-bar {
                    display: flex;
                    padding: 0.3rem;
                    border-radius: var(--radius);
                    gap: 0.3rem;
                }
                .tab-pill-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                    padding: 0.55rem 1.1rem;
                    border-radius: var(--radius-sm);
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    font-size: 0.85rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: inherit;
                }
                .tab-pill-btn:hover {
                    color: var(--text-primary);
                }
                .tab-pill-btn.active {
                    background: var(--primary);
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
                }

                /* ─── Decks Grid ─── */
                .decks-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.25rem;
                }
                .deck-card {
                    padding: 1.5rem;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    min-height: 200px;
                }
                .deck-card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.8rem;
                }
                .deck-tag {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.2rem 0.55rem;
                    background: rgba(99, 102, 241, 0.12);
                    border: 1px solid rgba(99, 102, 241, 0.25);
                    border-radius: 6px;
                    font-size: 0.74rem;
                    color: var(--primary-light);
                    font-weight: 700;
                }
                .deck-actions-right {
                    display: flex;
                    gap: 0.25rem;
                }
                .deck-action-icon {
                    padding: 0.35rem;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    border-radius: 6px;
                }
                .deck-action-icon:hover {
                    background: var(--surface-2);
                    color: var(--text-primary);
                }
                .deck-action-icon.delete:hover {
                    color: var(--error);
                    background: var(--error-glow);
                }

                .deck-title {
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.25rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .deck-source-doc {
                    font-size: 0.78rem;
                    color: var(--text-muted);
                    display: block;
                    margin-bottom: 1rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .deck-mastery-section {
                    margin-bottom: 1.25rem;
                }
                .mastery-labels {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.74rem;
                    color: var(--text-muted);
                    margin-bottom: 0.35rem;
                }
                .mastery-pct {
                    font-weight: 700;
                    color: var(--primary-light);
                }
                .mastery-track {
                    height: 5px;
                    background: var(--surface-3);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .mastery-fill {
                    height: 100%;
                    background: var(--primary);
                    border-radius: 4px;
                    transition: width 0.3s;
                }

                .study-deck-btn {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    padding: 0.55rem 0.85rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-sm);
                    color: var(--text-primary);
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .study-deck-btn:hover {
                    background: var(--primary);
                    color: #fff;
                    border-color: var(--primary);
                }

                .empty-decks-card {
                    padding: 3.5rem 2rem;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.75rem;
                }
                .empty-icon-box {
                    font-size: 3rem;
                }

                /* ─── Generate Card ─── */
                .generate-deck-card {
                    padding: 2.2rem 2.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .card-header-group {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                    margin-bottom: 0.5rem;
                }
                .card-header-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: var(--radius);
                    background: rgba(99, 102, 241, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .card-header-group h3 {
                    font-size: 1.25rem;
                    color: #ffffff;
                    margin-bottom: 0.2rem;
                }
                .card-header-group p {
                    font-size: 0.86rem;
                    color: var(--text-secondary);
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.55rem;
                }
                .field-label {
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .count-selector-pills {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 0.5rem;
                }
                .count-chip {
                    padding: 0.65rem;
                    border-radius: var(--radius-sm);
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                    font-size: 0.84rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s;
                    font-family: inherit;
                }
                .count-chip.active {
                    background: var(--primary);
                    color: #fff;
                    border-color: var(--primary);
                }
                .start-btn {
                    padding: 0.85rem 1.75rem;
                    font-size: 0.95rem;
                }

                /* ─── Study Arena ─── */
                .study-mode-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .study-top-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.85rem 1.4rem;
                }
                .deck-study-name {
                    font-size: 0.95rem;
                    font-weight: 700;
                    color: #ffffff;
                    display: block;
                }
                .card-counter {
                    font-size: 0.78rem;
                    color: var(--text-muted);
                }
                .export-shortcut-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.35rem 0.65rem;
                    border-radius: 6px;
                    border: 1px solid var(--border);
                    background: var(--surface-2);
                    color: var(--text-secondary);
                    font-size: 0.76rem;
                    cursor: pointer;
                }
                .export-shortcut-btn:hover {
                    background: var(--surface-3);
                    color: var(--text-primary);
                }

                /* ─── 3D Card Flip ─── */
                .interactive-card-arena {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 1.5rem;
                    width: 100%;
                }
                .flashcard-3d-wrapper {
                    width: 100%;
                    min-height: 320px;
                    cursor: pointer;
                    perspective: 1200px;
                }
                .flashcard-3d-inner {
                    width: 100%;
                    min-height: 320px;
                    position: relative;
                    transform-style: preserve-3d;
                    -webkit-transform-style: preserve-3d;
                    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: var(--radius-lg);
                }
                .flashcard-3d-wrapper.flipped .flashcard-3d-inner {
                    transform: rotateY(180deg);
                }
                .card-face {
                    position: absolute;
                    inset: 0;
                    width: 100%;
                    height: 100%;
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                    padding: 2rem 2.25rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border);
                    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
                }
                .card-face-front {
                    background: #121a2d;
                    transform: rotateY(0deg);
                }
                .card-face-back {
                    background: #162038;
                    transform: rotateY(180deg);
                    border-color: rgba(99, 102, 241, 0.4);
                }
                .card-face-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .face-tag {
                    font-size: 0.72rem;
                    font-weight: 800;
                    padding: 0.2rem 0.55rem;
                    border-radius: 6px;
                    letter-spacing: 0.05em;
                }
                .face-tag.question {
                    background: rgba(99, 102, 241, 0.15);
                    color: var(--primary-light);
                }
                .face-tag.answer {
                    background: var(--success-glow);
                    color: var(--success);
                }
                .hint-pill {
                    font-size: 0.72rem;
                    color: var(--text-muted);
                }
                .card-text-body {
                    margin: 1.5rem 0;
                }
                .card-text-body p {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #ffffff;
                    line-height: 1.5;
                }
                .answer-text {
                    font-size: 1.1rem !important;
                    font-weight: 500 !important;
                }
                .takeaway-callout {
                    margin-top: 1.2rem;
                    padding: 0.75rem 1rem;
                    background: rgba(0, 0, 0, 0.25);
                    border-left: 3px solid var(--primary);
                    border-radius: 6px;
                }
                .takeaway-title {
                    font-size: 0.76rem;
                    font-weight: 700;
                    color: var(--primary-light);
                    display: block;
                    margin-bottom: 0.2rem;
                }
                .takeaway-callout p {
                    font-size: 0.85rem !important;
                    color: var(--text-secondary) !important;
                    line-height: 1.5 !important;
                }
                .card-face-footer {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.76rem;
                    color: var(--text-muted);
                }

                /* ─── Rating Action Bar ─── */
                .rating-action-bar {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                    width: 100%;
                }
                .rating-btn {
                    padding: 0.9rem;
                    border-radius: var(--radius);
                    border: 1px solid var(--border);
                    background: var(--surface);
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.2rem;
                    transition: all 0.2s;
                    font-family: inherit;
                }
                .rating-num {
                    font-size: 0.74rem;
                    font-weight: 700;
                    opacity: 0.6;
                }
                .rating-label {
                    font-size: 0.95rem;
                    font-weight: 700;
                }
                .rating-sub {
                    font-size: 0.72rem;
                    opacity: 0.7;
                }
                .rating-btn.again {
                    border-color: rgba(244, 63, 94, 0.3);
                    color: var(--error);
                }
                .rating-btn.again:hover {
                    background: var(--error-glow);
                    transform: translateY(-2px);
                }
                .rating-btn.good {
                    border-color: rgba(99, 102, 241, 0.3);
                    color: var(--primary-light);
                }
                .rating-btn.good:hover {
                    background: rgba(99, 102, 241, 0.15);
                    transform: translateY(-2px);
                }
                .rating-btn.easy {
                    border-color: rgba(16, 185, 129, 0.3);
                    color: var(--success);
                }
                .rating-btn.easy:hover {
                    background: var(--success-glow);
                    transform: translateY(-2px);
                }

                .study-complete-card {
                    padding: 3.5rem 2rem;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.85rem;
                }
                .complete-icon-badge {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: var(--success-glow);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .complete-actions {
                    display: flex;
                    gap: 0.75rem;
                    margin-top: 0.5rem;
                }
            `}</style>
        </div>
    );
}

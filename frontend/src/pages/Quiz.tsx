import React, { useState, useEffect, useCallback, useRef } from 'react';
import { quizAPI, documentsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
    Sparkles,
    Clock,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Award,
    ChevronRight,
    ChevronLeft,
    FileText,
    Layers,
    Sliders,
    Check,
    History,
    Zap,
    Trash2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuizQuestion {
    question_id: string;
    question_number: number;
    question_text: string;
    options: string[];
    difficulty: string;
}

interface QuizResult {
    question_id: string;
    question_number: number;
    question_text: string;
    options: string[];
    user_answer: number | null;
    correct_answer: number;
    is_correct: boolean;
    explanation: string;
    difficulty: string;
}

interface QuizSummary {
    quiz_id: string;
    title: string;
    document_id: string;
    document_name: string;
    difficulty: string;
    num_questions: number;
    status: string;
    created_at: string;
    attempt_count: number;
    best_score: number | null;
}

interface AttemptSummary {
    attempt_id: string;
    score: number;
    correct: number;
    total: number;
    completed_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    return (
        <span style={{
            background: `${color}18`,
            color,
            fontWeight: 700,
            padding: '0.2rem 0.65rem',
            borderRadius: '9999px',
            fontSize: '0.82rem',
            border: `1px solid ${color}35`,
        }}>
            {score}%
        </span>
    );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
    const map: Record<string, { color: string; bg: string }> = {
        EASY: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
        MEDIUM: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
        HARD: { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
        MIXED: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
    };
    const c = map[difficulty] || { color: 'var(--text-secondary)', bg: 'var(--surface-2)' };
    return (
        <span style={{
            color: c.color,
            background: c.bg,
            padding: '0.15rem 0.55rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            border: `1px solid ${c.color}30`,
        }}>
            {difficulty}
        </span>
    );
}

// ─── Full Review Screen ────────────────────────────────────────────────────────

function ReviewScreen({
    quizTitle,
    results,
    attempts,
    selectedAttemptId,
    onSelectAttempt,
    onBack,
    onReattempt,
    loadingAttempt,
}: {
    quizTitle: string;
    results: QuizResult[];
    attempts: AttemptSummary[];
    selectedAttemptId: string;
    onSelectAttempt: (id: string) => void;
    onBack: () => void;
    onReattempt: () => void;
    loadingAttempt: boolean;
}) {
    const score = results.length
        ? Math.round((results.filter(r => r.is_correct).length / results.length) * 1000) / 10
        : 0;
    const correct = results.filter(r => r.is_correct).length;

    return (
        <div className="review-screen animate-slide-up">
            {/* Top Bar Navigation */}
            <div className="review-nav-bar">
                <button onClick={onBack} className="btn-secondary" style={{ padding: '0.5rem 0.9rem', fontSize: '0.85rem' }}>
                    <ChevronLeft size={16} />
                    <span>Back to History</span>
                </button>

                <button onClick={onReattempt} className="btn-primary" style={{ padding: '0.55rem 1.1rem' }}>
                    <RotateCcw size={16} />
                    <span>Re-attempt Quiz</span>
                </button>
            </div>

            {/* Score Summary Card */}
            <div className="review-score-hero glass-panel">
                <div className="score-hero-details">
                    <div className="score-hero-tag">
                        <Award size={15} color="var(--primary-light)" />
                        <span>Assessment Report</span>
                    </div>
                    <h2>{quizTitle}</h2>
                    <p className="score-hero-subtext">
                        {results.length} total questions • {correct} correct answers • {results.length - correct} incorrect
                    </p>
                </div>

                <div className="score-circle-display">
                    <div 
                        className="score-big-number" 
                        style={{ color: score >= 80 ? 'var(--success)' : score >= 60 ? 'var(--warning)' : 'var(--error)' }}
                    >
                        {score}%
                    </div>
                    <span className="score-fraction">{correct} / {results.length} Correct</span>
                </div>
            </div>

            {/* Attempt Switcher */}
            {attempts.length > 1 && (
                <div className="attempt-switcher-card glass-panel">
                    <span className="switcher-label">ATTEMPT HISTORY:</span>
                    <div className="switcher-pills">
                        {attempts.map((a, i) => {
                            const active = a.attempt_id === selectedAttemptId;
                            return (
                                <button
                                    key={a.attempt_id}
                                    onClick={() => onSelectAttempt(a.attempt_id)}
                                    disabled={loadingAttempt}
                                    className={`attempt-pill ${active ? 'active' : ''}`}
                                >
                                    <span>#{i + 1}</span>
                                    <ScoreBadge score={a.score} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Question Breakdown List */}
            {loadingAttempt ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
                    Loading attempt details...
                </div>
            ) : (
                <div className="review-questions-list">
                    {results.map((r, i) => (
                        <div 
                            key={r.question_id} 
                            className={`review-q-card glass-panel ${r.is_correct ? 'correct-border' : 'wrong-border'}`}
                        >
                            <div className="review-q-header">
                                <span className={`q-status-badge ${r.is_correct ? 'correct' : 'wrong'}`}>
                                    {r.is_correct ? <Check size={13} /> : <XCircle size={13} />}
                                    Q{i + 1}
                                </span>
                                <div className="q-title-box">
                                    <h4>{r.question_text}</h4>
                                    <div style={{ marginTop: 4 }}>
                                        <DifficultyBadge difficulty={r.difficulty} />
                                    </div>
                                </div>
                            </div>

                            <div className="review-options-grid">
                                {r.options.map((opt, oi) => {
                                    const isCorrect = oi === r.correct_answer;
                                    const isUserWrong = oi === r.user_answer && !r.is_correct;
                                    const isUserRight = oi === r.user_answer && r.is_correct;

                                    let optionClass = 'review-opt-normal';
                                    if (isCorrect) optionClass = 'review-opt-correct';
                                    else if (isUserWrong) optionClass = 'review-opt-wrong';

                                    return (
                                        <div key={oi} className={`review-option-pill ${optionClass}`}>
                                            <span className="opt-letter">{String.fromCharCode(65 + oi)}</span>
                                            <span className="opt-text">{opt}</span>
                                            {isUserRight && <span className="opt-tag tag-correct">✓ Your Answer (Correct)</span>}
                                            {isCorrect && !isUserRight && <span className="opt-tag tag-correct">✓ Correct Answer</span>}
                                            {isUserWrong && <span className="opt-tag tag-wrong">✗ Your Answer</span>}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="review-explanation-box">
                                <span className="explanation-title">💡 Explanation:</span>
                                <p>{r.explanation}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── History Tab ───────────────────────────────────────────────────────────────

function HistoryTab({ onReattempt }: { onReattempt: (quizId: string) => void }) {
    const [quizzes, setQuizzes] = useState<QuizSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingQuiz, setDeletingQuiz] = useState<string | null>(null);

    // Review state
    const [reviewQuiz, setReviewQuiz] = useState<QuizSummary | null>(null);
    const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
    const [selectedAttemptId, setSelectedAttemptId] = useState<string>('');
    const [reviewResults, setReviewResults] = useState<QuizResult[]>([]);
    const [loadingReview, setLoadingReview] = useState(false);
    const [loadingAttemptSwitch, setLoadingAttemptSwitch] = useState(false);

    const loadQuizzes = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await quizAPI.listAll();
            setQuizzes(data.quizzes);
        } catch { }
        setLoading(false);
    }, []);

    useEffect(() => { loadQuizzes(); }, [loadQuizzes]);

    const openQuizReview = async (quiz: QuizSummary) => {
        setLoadingReview(true);
        setReviewQuiz(quiz);
        setAttempts([]);
        setReviewResults([]);
        try {
            const { data: attData } = await quizAPI.getAttempts(quiz.quiz_id);
            const attList: AttemptSummary[] = attData.attempts;
            setAttempts(attList);

            if (attList.length > 0) {
                const latest = attList[0];
                setSelectedAttemptId(latest.attempt_id);
                const { data: detail } = await quizAPI.getAttempt(quiz.quiz_id, latest.attempt_id);
                setReviewResults(detail.results);
            }
        } catch { }
        setLoadingReview(false);
    };

    const switchAttempt = async (attemptId: string) => {
        if (!reviewQuiz || attemptId === selectedAttemptId) return;
        setLoadingAttemptSwitch(true);
        setSelectedAttemptId(attemptId);
        try {
            const { data } = await quizAPI.getAttempt(reviewQuiz.quiz_id, attemptId);
            setReviewResults(data.results);
        } catch { }
        setLoadingAttemptSwitch(false);
    };

    const deleteQuiz = async (e: React.MouseEvent, quizId: string) => {
        e.stopPropagation();
        if (!confirm('Delete this quiz and all associated attempts?')) return;
        setDeletingQuiz(quizId);
        try {
            await quizAPI.delete(quizId);
            setQuizzes(prev => prev.filter(q => q.quiz_id !== quizId));
        } catch { }
        setDeletingQuiz(null);
    };

    if (reviewQuiz) {
        return (
            <ReviewScreen
                quizTitle={reviewQuiz.title}
                results={reviewResults}
                attempts={attempts}
                selectedAttemptId={selectedAttemptId}
                onSelectAttempt={switchAttempt}
                onBack={() => { setReviewQuiz(null); loadQuizzes(); }}
                onReattempt={() => onReattempt(reviewQuiz.quiz_id)}
                loadingAttempt={loadingReview || loadingAttemptSwitch}
            />
        );
    }

    if (loading) {
        return (
            <div className="quiz-history-list">
                {[1, 2, 3].map(i => (
                    <div key={i} className="history-card-skeleton glass-panel">
                        <div className="skeleton" style={{ height: 18, width: '45%', marginBottom: 8 }} />
                        <div className="skeleton" style={{ height: 12, width: '70%' }} />
                    </div>
                ))}
            </div>
        );
    }

    if (quizzes.length === 0) {
        return (
            <div className="empty-history-state glass-panel">
                <span className="empty-state-icon">📋</span>
                <h3>No Quizzes Created Yet</h3>
                <p>Generate your first interactive assessment from any uploaded document in the Generate tab.</p>
            </div>
        );
    }

    return (
        <div className="quiz-history-list">
            {quizzes.map(quiz => (
                <div
                    key={quiz.quiz_id}
                    onClick={() => quiz.status === 'COMPLETED' && openQuizReview(quiz)}
                    className="history-quiz-card glass-panel"
                >
                    <div className="history-card-main">
                        <div className="history-card-title-row">
                            <h3 className="history-card-title">{quiz.title}</h3>
                            <DifficultyBadge difficulty={quiz.difficulty} />
                        </div>
                        <div className="history-card-meta">
                            <span>📄 {quiz.document_name}</span>
                            <span className="dot-divider">•</span>
                            <span>{quiz.num_questions} questions</span>
                            <span className="dot-divider">•</span>
                            <span>{new Date(quiz.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>

                    <div className="history-card-stats">
                        <div className="history-score-col">
                            <span className="attempt-count-text">
                                {quiz.attempt_count} attempt{quiz.attempt_count !== 1 ? 's' : ''}
                            </span>
                            {quiz.best_score !== null && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <ScoreBadge score={quiz.best_score} />
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>best</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={e => deleteQuiz(e, quiz.quiz_id)}
                            disabled={deletingQuiz === quiz.quiz_id}
                            className="delete-quiz-btn"
                            title="Delete quiz"
                        >
                            <Trash2 size={15} />
                        </button>

                        {quiz.status === 'COMPLETED' && (
                            <ChevronRight size={18} className="history-chevron" />
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── Generate Tab ──────────────────────────────────────────────────────────────

function GenerateTab({
    onAttemptSaved,
    reattemptQuizId,
    onReattemptConsumed,
}: {
    onAttemptSaved: () => void;
    reattemptQuizId: string | null;
    onReattemptConsumed: () => void;
}) {
    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedDoc, setSelectedDoc] = useState('');
    const [difficulty, setDifficulty] = useState('MEDIUM');
    const [numQuestions, setNumQuestions] = useState(10);
    const [generating, setGenerating] = useState(false);
    const [quizId, setQuizId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState('');
    const [pollCount, setPollCount] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    // Single-question navigator
    const [currentQ, setCurrentQ] = useState(0);

    // Countdown timer (seconds)
    const [timerEnabled, setTimerEnabled] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const toast = useToast();
    const didLoadReattempt = useRef(false);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const docId = params.get('doc');
        if (docId) setSelectedDoc(docId);
    }, []);

    const fetchDocuments = useCallback(async () => {
        try {
            const { data } = await documentsAPI.list({ page_size: 50 });
            setDocuments(data.documents.filter((d: any) => d.status === 'COMPLETED'));
        } catch { }
    }, []);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

    // Handle re-attempt
    useEffect(() => {
        if (!reattemptQuizId || didLoadReattempt.current) return;
        didLoadReattempt.current = true;

        const load = async () => {
            setGenerating(true);
            setError('');
            setQuestions([]);
            setResults(null);
            setAnswers({});
            try {
                const { data } = await quizAPI.getQuiz(reattemptQuizId);
                setQuizId(reattemptQuizId);
                setQuestions(data.questions);
                setCurrentQ(0);
            } catch {
                setError('Failed to load quiz for re-attempt.');
            }
            setGenerating(false);
            onReattemptConsumed();
        };
        load();
    }, [reattemptQuizId, onReattemptConsumed]);

    const generateQuiz = async () => {
        if (!selectedDoc) {
            toast.error('Document required', 'Please select a document first.');
            return;
        }
        setGenerating(true);
        setError('');
        setQuestions([]);
        setResults(null);
        setAnswers({});
        setCurrentQ(0);
        if (timerRef.current) clearInterval(timerRef.current);

        try {
            const { data } = await quizAPI.generate(selectedDoc, difficulty, numQuestions);
            setQuizId(data.quiz_id);
            setPollCount(0);
            pollForCompletion(data.quiz_id);
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Failed to generate quiz';
            setError(msg);
            toast.error('Generation failed', msg);
            setGenerating(false);
        }
    };

    const pollForCompletion = async (id: string) => {
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 2000));
            setPollCount(i + 1);
            try {
                const { data } = await quizAPI.getStatus(id);
                if (data.status === 'COMPLETED') {
                    const quizData = await quizAPI.getQuiz(id);
                    setQuestions(quizData.data.questions);
                    setCurrentQ(0);

                    // Start timer if enabled
                    if (timerEnabled) {
                        const secs = quizData.data.questions.length * 60;
                        setTimeLeft(secs);
                        if (timerRef.current) clearInterval(timerRef.current);
                        timerRef.current = setInterval(() => {
                            setTimeLeft(prev => {
                                if (prev <= 1) {
                                    clearInterval(timerRef.current!);
                                    toast.warning('Time\'s up!', 'Submitting your quiz...');
                                    return 0;
                                }
                                return prev - 1;
                            });
                        }, 1000);
                    }
                    setGenerating(false);
                    toast.success('Quiz ready!', `${quizData.data.questions.length} questions generated.`);
                    return;
                } else if (data.status === 'FAILED') {
                    setError('Quiz generation failed. Please try again.');
                    setGenerating(false);
                    return;
                }
            } catch {
                setError('Error checking quiz status');
                setGenerating(false);
                return;
            }
        }
        setError('Quiz generation timed out.');
        setGenerating(false);
    };

    const submitQuiz = async () => {
        if (!quizId) return;
        if (timerRef.current) clearInterval(timerRef.current);
        setSubmitting(true);
        try {
            const { data } = await quizAPI.submit(quizId, answers);
            setResults(data);
            onAttemptSaved();
            toast.success('Quiz submitted!', `You scored ${data.score}% (${data.correct}/${data.total} correct)`);
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Failed to submit quiz';
            setError(msg);
            toast.error('Submit failed', msg);
        }
        setSubmitting(false);
    };

    const resetAll = () => {
        setQuestions([]);
        setResults(null);
        setAnswers({});
        setQuizId(null);
        setError('');
        setCurrentQ(0);
        if (timerRef.current) clearInterval(timerRef.current);
        setTimeLeft(0);
        didLoadReattempt.current = false;
    };

    const showSetup = questions.length === 0 && !results && !generating;
    const difficulties = [
        { id: 'EASY', label: 'Easy', icon: '🟢', desc: 'Direct recall' },
        { id: 'MEDIUM', label: 'Medium', icon: '🟡', desc: 'Comprehension' },
        { id: 'HARD', label: 'Hard', icon: '🔴', desc: 'Analytical' },
        { id: 'MIXED', label: 'Mixed', icon: '🟣', desc: 'All levels' },
    ];

    return (
        <div className="generate-tab-content">
            {error && (
                <div className="error-banner animate-fade-in">
                    {error}
                </div>
            )}

            {/* Generating Loader */}
            {generating && (
                <div className="generating-card glass-panel animate-fade-in">
                    <div className="spinner" style={{ width: 44, height: 44, borderWidth: 4, margin: '0 auto 1.25rem' }} />
                    <h3>{reattemptQuizId ? 'Loading Quiz Questions...' : 'Analyzing Document & Generating Assessment...'}</h3>
                    <p className="poll-count-text">
                        Extracting key concepts with Groq 70B • {pollCount * 2}s elapsed
                    </p>
                </div>
            )}

            {/* Quiz Configuration Setup Screen */}
            {showSetup && (
                <div className="quiz-config-card glass-panel animate-slide-up">
                    <div className="config-header">
                        <div className="config-icon-badge">
                            <Sliders size={20} color="var(--primary-light)" />
                        </div>
                        <div>
                            <h3>Configure Assessment</h3>
                            <p>Customize difficulty, question count, and time pressure.</p>
                        </div>
                    </div>

                    <div className="config-form-group">
                        <label className="config-label">
                            <FileText size={15} />
                            <span>Select Source Document</span>
                        </label>
                        <select
                            value={selectedDoc}
                            onChange={e => setSelectedDoc(e.target.value)}
                            className="input-field config-select"
                        >
                            <option value="">Choose an indexed document...</option>
                            {documents.map(doc => (
                                <option key={doc.doc_id} value={doc.doc_id}>
                                    {doc.filename} ({doc.file_type})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="config-form-group">
                        <label className="config-label">
                            <Zap size={15} />
                            <span>Difficulty Level</span>
                        </label>
                        <div className="difficulty-selector-grid">
                            {difficulties.map(d => (
                                <button
                                    key={d.id}
                                    type="button"
                                    className={`diff-option-btn ${difficulty === d.id ? 'active' : ''}`}
                                    onClick={() => setDifficulty(d.id)}
                                >
                                    <span className="diff-icon">{d.icon}</span>
                                    <span className="diff-title">{d.label}</span>
                                    <span className="diff-desc">{d.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="config-row-two-col">
                        <div className="config-form-group">
                            <label className="config-label">
                                <Layers size={15} />
                                <span>Question Count: <strong>{numQuestions}</strong></span>
                            </label>
                            <div className="question-count-pills">
                                {[5, 10, 15, 20].map(cnt => (
                                    <button
                                        key={cnt}
                                        type="button"
                                        className={`count-pill ${numQuestions === cnt ? 'active' : ''}`}
                                        onClick={() => setNumQuestions(cnt)}
                                    >
                                        {cnt} Questions
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="config-form-group">
                            <label className="config-label">
                                <Clock size={15} />
                                <span>Timer Pressure</span>
                            </label>
                            <label className="timer-toggle-card">
                                <input
                                    type="checkbox"
                                    checked={timerEnabled}
                                    onChange={e => setTimerEnabled(e.target.checked)}
                                    className="timer-checkbox"
                                />
                                <div>
                                    <div className="timer-toggle-title">1 min / question timer</div>
                                    <div className="timer-toggle-sub">Auto-submits when countdown finishes</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <button
                        onClick={generateQuiz}
                        disabled={!selectedDoc || generating}
                        className="btn-primary start-gen-btn"
                    >
                        <Sparkles size={18} />
                        <span>Generate Quiz Assessment</span>
                    </button>
                </div>
            )}

            {/* Quiz Taking Mode (Single Question Navigator) */}
            {questions.length > 0 && !results && !generating && (() => {
                const q = questions[currentQ];
                const totalAnswered = Object.keys(answers).length;
                const allAnswered = totalAnswered === questions.length;
                const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
                const timerWarn = timerEnabled && timeLeft > 0 && timeLeft <= 30;

                return (
                    <div className="quiz-taking-container animate-slide-up">
                        {/* Status bar */}
                        <div className="taking-topbar glass-panel">
                            <div className="progress-details">
                                <span className="taking-q-counter">
                                    Question <strong>{currentQ + 1}</strong> of {questions.length}
                                </span>
                                <div className="taking-progress-bar-track">
                                    <div 
                                        className="taking-progress-bar-fill"
                                        style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="taking-right-actions">
                                {timerEnabled && timeLeft > 0 && (
                                    <div className={`timer-display-pill ${timerWarn ? 'warning' : ''}`}>
                                        <Clock size={14} />
                                        <span>{formatTime(timeLeft)}</span>
                                    </div>
                                )}

                                <span className="answered-summary-badge">
                                    {totalAnswered}/{questions.length} answered
                                </span>

                                <button onClick={resetAll} className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                                    Cancel
                                </button>
                            </div>
                        </div>

                        {/* Question Jumper Grid */}
                        <div className="question-jumper-pills">
                            {questions.map((qq, idx) => {
                                const isAnswered = answers[qq.question_id] !== undefined;
                                const isCurrent = idx === currentQ;

                                return (
                                    <button
                                        key={qq.question_id}
                                        onClick={() => setCurrentQ(idx)}
                                        className={`jumper-pill ${isCurrent ? 'current' : ''} ${isAnswered ? 'answered' : ''}`}
                                    >
                                        {idx + 1}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Current Question Card */}
                        <div className="current-q-card glass-panel animate-fade-in">
                            <div className="q-card-header">
                                <span className="q-index-pill">Q{currentQ + 1}</span>
                                <div className="q-card-text">
                                    <h2>{q.question_text}</h2>
                                    <DifficultyBadge difficulty={q.difficulty} />
                                </div>
                            </div>

                            <div className="q-options-container">
                                {q.options.map((opt, oi) => {
                                    const isSelected = answers[q.question_id] === oi;
                                    return (
                                        <div
                                            key={oi}
                                            className={`q-option-card ${isSelected ? 'selected' : ''}`}
                                            onClick={() => setAnswers(prev => ({ ...prev, [q.question_id]: oi }))}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <span className={`option-letter-badge ${isSelected ? 'selected' : ''}`}>
                                                {String.fromCharCode(65 + oi)}
                                            </span>
                                            <span className="option-text-label">{opt}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Navigator Bottom Bar */}
                        <div className="taking-bottom-nav">
                            <button
                                onClick={() => setCurrentQ(i => Math.max(0, i - 1))}
                                disabled={currentQ === 0}
                                className="btn-secondary"
                            >
                                <ChevronLeft size={16} />
                                <span>Previous</span>
                            </button>

                            {currentQ < questions.length - 1 ? (
                                <button
                                    onClick={() => setCurrentQ(i => i + 1)}
                                    className="btn-primary"
                                >
                                    <span>Next Question</span>
                                    <ChevronRight size={16} />
                                </button>
                            ) : (
                                <button
                                    onClick={submitQuiz}
                                    disabled={!allAnswered || submitting}
                                    className="btn-primary submit-final-btn"
                                >
                                    <CheckCircle2 size={16} />
                                    <span>{submitting ? 'Grading...' : allAnswered ? 'Submit Quiz' : `Answer ${questions.length - totalAnswered} more`}</span>
                                </button>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Results Dashboard Screen */}
            {results && (() => {
                const diffBreakdown: Record<string, { correct: number; total: number }> = {};
                (results.results as QuizResult[]).forEach(r => {
                    const d = r.difficulty;
                    if (!diffBreakdown[d]) diffBreakdown[d] = { correct: 0, total: 0 };
                    diffBreakdown[d].total++;
                    if (r.is_correct) diffBreakdown[d].correct++;
                });
                const diffKeys = Object.keys(diffBreakdown);
                const isMixed = diffKeys.length > 1;

                return (
                    <div className="results-container animate-slide-up">
                        <div className="results-hero-card glass-panel">
                            <div className="results-score-badge">
                                <Award size={32} color="var(--primary-light)" />
                            </div>
                            <div 
                                className="results-big-score"
                                style={{ color: results.score >= 80 ? 'var(--success)' : results.score >= 60 ? 'var(--warning)' : 'var(--error)' }}
                            >
                                {results.score}%
                            </div>
                            <h3 className="results-headline">
                                {results.score >= 80 ? 'Outstanding Masterclass! 🎉' : results.score >= 60 ? 'Solid Performance! 👍' : 'Good Effort! Keep Reviewing 📚'}
                            </h3>
                            <p className="results-summary-line">
                                You answered <strong>{results.correct}</strong> out of <strong>{results.total}</strong> questions correctly.
                            </p>

                            {/* Mixed Breakdown */}
                            {isMixed && (
                                <div className="diff-breakdown-box">
                                    <span className="diff-breakdown-title">PERFORMANCE BY DIFFICULTY</span>
                                    <div className="diff-breakdown-list">
                                        {diffKeys.map(dk => {
                                            const { correct: dc, total: dt } = diffBreakdown[dk];
                                            const pct = Math.round((dc / dt) * 100);
                                            return (
                                                <div key={dk} className="diff-breakdown-item">
                                                    <div className="diff-item-top">
                                                        <DifficultyBadge difficulty={dk} />
                                                        <span className="diff-item-stat">{dc}/{dt} ({pct}%)</span>
                                                    </div>
                                                    <div className="diff-item-bar-track">
                                                        <div 
                                                            className="diff-item-bar-fill" 
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="results-action-buttons">
                                <button onClick={resetAll} className="btn-primary">
                                    <Sparkles size={16} />
                                    <span>Create Another Quiz</span>
                                </button>
                                <button
                                    onClick={() => { setAnswers({}); setResults(null); setCurrentQ(0); didLoadReattempt.current = false; }}
                                    className="btn-secondary"
                                >
                                    <RotateCcw size={16} />
                                    <span>Re-attempt This Quiz</span>
                                </button>
                            </div>
                        </div>

                        {/* Inline Review of Each Question */}
                        <div className="results-review-section">
                            <h3 className="review-heading">Question Analysis & Explanations</h3>
                            <div className="review-questions-list">
                                {results.results.map((r: QuizResult, i: number) => (
                                    <div 
                                        key={r.question_id}
                                        className={`review-q-card glass-panel ${r.is_correct ? 'correct-border' : 'wrong-border'}`}
                                    >
                                        <div className="review-q-header">
                                            <span className={`q-status-badge ${r.is_correct ? 'correct' : 'wrong'}`}>
                                                {r.is_correct ? '✓ Correct' : '✗ Incorrect'}
                                            </span>
                                            <div className="q-title-box">
                                                <h4>Q{i + 1}: {r.question_text}</h4>
                                            </div>
                                        </div>

                                        <div className="review-options-summary">
                                            <div className="review-correct-ans-pill">
                                                <Check size={14} color="var(--success)" />
                                                <span>Correct: <strong>{r.options[r.correct_answer]}</strong></span>
                                            </div>
                                            {!r.is_correct && r.user_answer !== null && (
                                                <div className="review-wrong-ans-pill">
                                                    <XCircle size={14} color="var(--error)" />
                                                    <span>Your answer: <strong>{r.options[r.user_answer!]}</strong></span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="review-explanation-box">
                                            <span className="explanation-title">💡 Explanation:</span>
                                            <p>{r.explanation}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

// ─── Main Quiz Page ────────────────────────────────────────────────────────────

export default function QuizPage() {
    const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate');
    const [historyKey, setHistoryKey] = useState(0);
    const [reattemptQuizId, setReattemptQuizId] = useState<string | null>(null);

    const handleReattempt = (quizId: string) => {
        setReattemptQuizId(quizId);
        setActiveTab('generate');
    };

    return (
        <div className="quiz-page-layout animate-slide-up">
            {/* Header with Tab Switcher */}
            <div className="quiz-page-header">
                <div>
                    <h1 className="page-title">Interactive Assessments</h1>
                    <p className="page-subtitle">
                        Test your comprehension with auto-generated multi-choice quizzes and timed mock tests.
                    </p>
                </div>

                <div className="quiz-tab-switcher glass-panel">
                    <button
                        className={`quiz-tab-btn ${activeTab === 'generate' ? 'active' : ''}`}
                        onClick={() => setActiveTab('generate')}
                    >
                        <Sparkles size={15} />
                        <span>Generator</span>
                    </button>
                    <button
                        className={`quiz-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                        onClick={() => setActiveTab('history')}
                    >
                        <History size={15} />
                        <span>Attempt History</span>
                    </button>
                </div>
            </div>

            {/* Tab Body */}
            <div className="quiz-tab-body">
                {activeTab === 'generate' ? (
                    <GenerateTab
                        onAttemptSaved={() => setHistoryKey(k => k + 1)}
                        reattemptQuizId={reattemptQuizId}
                        onReattemptConsumed={() => setReattemptQuizId(null)}
                    />
                ) : (
                    <HistoryTab key={historyKey} onReattempt={handleReattempt} />
                )}
            </div>

            <style>{`
                .quiz-page-layout {
                    display: flex;
                    flex-direction: column;
                    gap: 1.75rem;
                    max-width: 960px;
                    margin: 0 auto;
                    width: 100%;
                }

                .quiz-page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .quiz-tab-switcher {
                    display: flex;
                    padding: 0.3rem;
                    border-radius: var(--radius);
                    gap: 0.3rem;
                }
                .quiz-tab-btn {
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
                .quiz-tab-btn:hover {
                    color: var(--text-primary);
                }
                .quiz-tab-btn.active {
                    background: var(--primary);
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
                }

                /* ─── Config Setup Card ─── */
                .quiz-config-card {
                    padding: 2.2rem 2.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .config-header {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                    margin-bottom: 0.5rem;
                }
                .config-icon-badge {
                    width: 44px;
                    height: 44px;
                    border-radius: var(--radius);
                    background: rgba(99, 102, 241, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .config-header h3 {
                    font-size: 1.25rem;
                    color: #ffffff;
                    margin-bottom: 0.2rem;
                }
                .config-header p {
                    font-size: 0.86rem;
                    color: var(--text-secondary);
                }

                .config-form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.6rem;
                }
                .config-label {
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .config-select {
                    font-size: 0.92rem;
                    padding: 0.8rem 1rem;
                }

                .difficulty-selector-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
                    gap: 0.75rem;
                }
                .diff-option-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.25rem;
                    padding: 0.9rem 0.75rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                    font-family: inherit;
                }
                .diff-option-btn:hover {
                    background: var(--surface-3);
                    border-color: rgba(99, 102, 241, 0.3);
                }
                .diff-option-btn.active {
                    background: rgba(99, 102, 241, 0.15);
                    border-color: var(--primary);
                    box-shadow: 0 0 0 1px var(--primary);
                }
                .diff-icon {
                    font-size: 1.2rem;
                }
                .diff-title {
                    font-size: 0.88rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .diff-desc {
                    font-size: 0.72rem;
                    color: var(--text-muted);
                }

                .config-row-two-col {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }
                .question-count-pills {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.5rem;
                }
                .count-pill {
                    padding: 0.65rem;
                    border-radius: var(--radius-sm);
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s;
                    font-family: inherit;
                }
                .count-pill.active {
                    background: var(--primary);
                    color: #fff;
                    border-color: var(--primary);
                }

                .timer-toggle-card {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.8rem 1rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    cursor: pointer;
                }
                .timer-checkbox {
                    width: 18px;
                    height: 18px;
                    accent-color: var(--primary);
                }
                .timer-toggle-title {
                    font-size: 0.84rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .timer-toggle-sub {
                    font-size: 0.73rem;
                    color: var(--text-muted);
                }
                .start-gen-btn {
                    padding: 0.9rem;
                    font-size: 1rem;
                    margin-top: 0.5rem;
                }

                /* ─── Generating State ─── */
                .generating-card {
                    padding: 3.5rem 2rem;
                    text-align: center;
                }
                .generating-card h3 {
                    font-size: 1.25rem;
                    color: #ffffff;
                    margin-bottom: 0.4rem;
                }
                .poll-count-text {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }

                /* ─── Taking Mode ─── */
                .quiz-taking-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
                .taking-topbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                }
                .progress-details {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }
                .taking-q-counter {
                    font-size: 0.88rem;
                    color: var(--text-secondary);
                }
                .taking-progress-bar-track {
                    width: 220px;
                    height: 6px;
                    background: var(--surface-3);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .taking-progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #6366f1, #0ea5e9);
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }
                .taking-right-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .timer-display-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.35rem 0.75rem;
                    border-radius: var(--radius-full);
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    font-weight: 700;
                    font-size: 0.85rem;
                }
                .timer-display-pill.warning {
                    background: rgba(244, 63, 94, 0.15);
                    border-color: var(--error);
                    color: var(--error);
                    animation: pulseGlow 1s infinite alternate;
                }
                .answered-summary-badge {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }

                .question-jumper-pills {
                    display: flex;
                    gap: 0.4rem;
                    flex-wrap: wrap;
                }
                .jumper-pill {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    background: var(--surface);
                    color: var(--text-muted);
                    font-weight: 700;
                    font-size: 0.82rem;
                    cursor: pointer;
                    transition: all 0.15s;
                }
                .jumper-pill:hover {
                    border-color: var(--primary);
                }
                .jumper-pill.current {
                    background: var(--primary);
                    color: #fff;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
                }
                .jumper-pill.answered:not(.current) {
                    background: rgba(16, 185, 129, 0.15);
                    color: var(--success);
                    border-color: rgba(16, 185, 129, 0.3);
                }

                .current-q-card {
                    padding: 2rem 2.25rem;
                }
                .q-card-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.85rem;
                    margin-bottom: 1.75rem;
                }
                .q-index-pill {
                    padding: 0.3rem 0.75rem;
                    border-radius: 8px;
                    background: var(--primary);
                    color: #fff;
                    font-weight: 800;
                    font-size: 0.85rem;
                    flex-shrink: 0;
                }
                .q-card-text {
                    flex: 1;
                }
                .q-card-text h2 {
                    font-size: 1.2rem;
                    font-weight: 700;
                    line-height: 1.5;
                    color: #ffffff;
                    margin-bottom: 0.4rem;
                }

                .q-options-container {
                    display: flex;
                    flex-direction: column;
                    gap: 0.65rem;
                }
                .q-option-card {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                    padding: 0.9rem 1.25rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    cursor: pointer;
                    transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .q-option-card:hover {
                    background: var(--surface-3);
                    border-color: rgba(99, 102, 241, 0.3);
                    transform: translateX(3px);
                }
                .q-option-card.selected {
                    background: rgba(99, 102, 241, 0.15);
                    border-color: var(--primary);
                    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
                }
                .option-letter-badge {
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    background: var(--surface-3);
                    color: var(--text-secondary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 0.82rem;
                    flex-shrink: 0;
                }
                .option-letter-badge.selected {
                    background: var(--primary);
                    color: #ffffff;
                }
                .option-text-label {
                    font-size: 0.94rem;
                    color: var(--text-primary);
                    font-weight: 500;
                }

                .taking-bottom-nav {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .submit-final-btn {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                }

                /* ─── Results Dashboard ─── */
                .results-hero-card {
                    padding: 2.5rem 2rem;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.6rem;
                    margin-bottom: 2rem;
                }
                .results-big-score {
                    font-size: 4rem;
                    font-weight: 900;
                    line-height: 1;
                    letter-spacing: -0.03em;
                    margin: 0.3rem 0;
                }
                .results-headline {
                    font-size: 1.4rem;
                    color: #ffffff;
                }
                .results-summary-line {
                    font-size: 0.95rem;
                    color: var(--text-secondary);
                }

                .diff-breakdown-box {
                    width: 100%;
                    max-width: 440px;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    padding: 1.25rem;
                    margin: 1.2rem 0;
                    text-align: left;
                }
                .diff-breakdown-title {
                    font-size: 0.72rem;
                    font-weight: 800;
                    color: var(--text-muted);
                    letter-spacing: 0.06em;
                    display: block;
                    margin-bottom: 0.75rem;
                }
                .diff-breakdown-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.65rem;
                }
                .diff-item-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.25rem;
                }
                .diff-item-stat {
                    font-size: 0.8rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                }
                .diff-item-bar-track {
                    height: 6px;
                    background: var(--surface-3);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .diff-item-bar-fill {
                    height: 100%;
                    background: var(--primary);
                    border-radius: 4px;
                    transition: width 0.8s ease;
                }

                .results-action-buttons {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                    justify-content: center;
                    margin-top: 0.8rem;
                }

                /* ─── Review Questions ─── */
                .review-heading {
                    font-size: 1.15rem;
                    color: #ffffff;
                    margin-bottom: 1rem;
                }
                .review-questions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.9rem;
                }
                .review-q-card {
                    padding: 1.5rem;
                }
                .review-q-card.correct-border {
                    border-color: rgba(16, 185, 129, 0.3);
                }
                .review-q-card.wrong-border {
                    border-color: rgba(244, 63, 94, 0.3);
                }
                .review-q-header {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                    margin-bottom: 1rem;
                }
                .q-status-badge {
                    padding: 0.25rem 0.6rem;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.3rem;
                    flex-shrink: 0;
                }
                .q-status-badge.correct {
                    background: var(--success-glow);
                    color: var(--success);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                }
                .q-status-badge.wrong {
                    background: var(--error-glow);
                    color: var(--error);
                    border: 1px solid rgba(244, 63, 94, 0.3);
                }
                .q-title-box h4 {
                    font-size: 0.98rem;
                    color: var(--text-primary);
                    line-height: 1.45;
                }

                .review-options-summary {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                    margin-bottom: 0.85rem;
                }
                .review-correct-ans-pill {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.55rem 0.85rem;
                    background: rgba(16, 185, 129, 0.1);
                    border: 1px solid rgba(16, 185, 129, 0.25);
                    border-radius: 8px;
                    font-size: 0.86rem;
                    color: var(--success);
                }
                .review-wrong-ans-pill {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.55rem 0.85rem;
                    background: rgba(244, 63, 94, 0.1);
                    border: 1px solid rgba(244, 63, 94, 0.25);
                    border-radius: 8px;
                    font-size: 0.86rem;
                    color: var(--error);
                }

                .review-explanation-box {
                    padding: 0.75rem 1rem;
                    background: var(--surface-2);
                    border-left: 3px solid var(--primary);
                    border-radius: 6px;
                    font-size: 0.84rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                }
                .explanation-title {
                    font-weight: 700;
                    color: var(--text-primary);
                    display: block;
                    margin-bottom: 0.2rem;
                }

                /* ─── History Cards ─── */
                .quiz-history-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                .history-quiz-card {
                    padding: 1.25rem 1.5rem;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .history-quiz-card:hover {
                    border-color: rgba(99, 102, 241, 0.35);
                    transform: translateX(3px);
                }
                .history-card-main {
                    flex: 1;
                    min-width: 0;
                }
                .history-card-title-row {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    margin-bottom: 0.35rem;
                    flex-wrap: wrap;
                }
                .history-card-title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: #ffffff;
                }
                .history-card-meta {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                }
                .history-card-stats {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                }
                .history-score-col {
                    text-align: right;
                }
                .attempt-count-text {
                    font-size: 0.75rem;
                    color: var(--text-muted);
                    display: block;
                    margin-bottom: 0.2rem;
                }
                .delete-quiz-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 0.35rem;
                    border-radius: 6px;
                }
                .delete-quiz-btn:hover {
                    color: var(--error);
                    background: var(--error-glow);
                }
                .history-chevron {
                    color: var(--text-muted);
                }

                @media (max-width: 768px) {
                    .config-row-two-col {
                        grid-template-columns: 1fr;
                    }
                    .quiz-config-card {
                        padding: 1.5rem;
                    }
                }
            `}</style>
        </div>
    );
}

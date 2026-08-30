import { useState, useEffect, useCallback, useRef } from 'react';
import { quizAPI, documentsAPI } from '../services/api';

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
            background: `${color}18`, color, fontWeight: 700,
            padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.84rem',
        }}>{score}%</span>
    );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
    const map: Record<string, string> = { EASY: '#10b981', MEDIUM: '#f59e0b', HARD: '#ef4444', MIXED: '#8b5cf6' };
    const color = map[difficulty] || 'var(--text-secondary)';
    return (
        <span style={{
            color, background: `${color}18`, padding: '0.15rem 0.55rem',
            borderRadius: 6, fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.04em',
        }}>{difficulty}</span>
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
        <div>
            {/* Top bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.7rem' }}>
                <button onClick={onBack} style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', padding: '0.45rem 0.9rem',
                    borderRadius: 10, cursor: 'pointer', fontSize: '0.88rem',
                }}>← History</button>

                <button onClick={onReattempt} style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    background: 'var(--primary)', border: 'none', color: '#fff',
                    padding: '0.55rem 1.3rem', borderRadius: 10,
                    cursor: 'pointer', fontSize: '0.92rem', fontWeight: 700,
                    boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
                }}>🔁 Re-attempt Quiz</button>
            </div>

            {/* Score card */}
            <div style={{
                background: 'var(--surface)', borderRadius: 16,
                padding: '1.4rem 1.8rem', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem',
            }}>
                <div>
                    <h3 style={{ color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>{quizTitle}</h3>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        {results.length} questions · {correct} correct · {results.length - correct} wrong
                    </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        fontSize: '2.8rem', fontWeight: 900, lineHeight: 1,
                        color: score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444',
                    }}>{score}%</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{correct}/{results.length}</div>
                </div>
            </div>

            {/* Attempt selector */}
            {attempts.length > 1 && (
                <div style={{ marginBottom: '1.2rem' }}>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
                        SWITCH ATTEMPT
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {attempts.map((a, i) => {
                            const active = a.attempt_id === selectedAttemptId;
                            return (
                                <button key={a.attempt_id}
                                    onClick={() => onSelectAttempt(a.attempt_id)}
                                    disabled={loadingAttempt}
                                    style={{
                                        padding: '0.35rem 0.9rem', borderRadius: 8,
                                        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                                        background: active ? 'rgba(99,102,241,0.15)' : 'var(--surface-2)',
                                        color: active ? 'var(--primary)' : 'var(--text-secondary)',
                                        cursor: 'pointer', fontSize: '0.82rem', fontWeight: active ? 700 : 400,
                                    }}>
                                    #{i + 1} &nbsp;<ScoreBadge score={a.score} />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {loadingAttempt && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading attempt...</div>
            )}

            {/* Questions */}
            {!loadingAttempt && results.map((r, i) => (
                <div key={r.question_id} style={{
                    background: 'var(--surface)', borderRadius: 14,
                    border: `1px solid ${r.is_correct ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    padding: '1.3rem 1.4rem', marginBottom: '0.8rem',
                }}>
                    {/* Question header */}
                    <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <span style={{
                            background: r.is_correct ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)',
                            color: r.is_correct ? '#10b981' : '#ef4444',
                            borderRadius: 8, padding: '0.2rem 0.6rem',
                            fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
                        }}>Q{i + 1} &nbsp;{r.is_correct ? '✓' : '✗'}</span>
                        <div style={{ flex: 1 }}>
                            <span style={{ color: 'var(--text-primary)', fontSize: '0.94rem', lineHeight: 1.5 }}>{r.question_text}</span>
                            <div style={{ marginTop: '0.25rem' }}><DifficultyBadge difficulty={r.difficulty} /></div>
                        </div>
                    </div>

                    {/* Options */}
                    <div style={{ display: 'grid', gap: '0.45rem' }}>
                        {r.options.map((opt, oi) => {
                            const isCorrect = oi === r.correct_answer;
                            const isUserWrong = oi === r.user_answer && !r.is_correct;
                            const isUserRight = oi === r.user_answer && r.is_correct;
                            const isUnanswered = r.user_answer === null || r.user_answer === undefined;

                            let bg = 'var(--surface-2)';
                            let borderColor = 'var(--border)';
                            let textColor = 'var(--text-secondary)';
                            let label = null;

                            if (isCorrect) {
                                bg = 'rgba(16,185,129,0.14)';
                                borderColor = 'rgba(16,185,129,0.5)';
                                textColor = '#10b981';
                                label = isUserRight ? '✓ Your answer · Correct' : '✓ Correct answer';
                            } else if (isUserWrong) {
                                bg = 'rgba(239,68,68,0.1)';
                                borderColor = 'rgba(239,68,68,0.4)';
                                textColor = '#ef4444';
                                label = '✗ Your answer';
                            }

                            return (
                                <div key={oi} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.7rem',
                                    padding: '0.55rem 0.9rem', borderRadius: 9,
                                    background: bg, border: `1px solid ${borderColor}`,
                                    color: textColor, fontSize: '0.88rem',
                                    fontWeight: isCorrect ? 600 : 400,
                                    transition: 'all 0.1s',
                                }}>
                                    <span style={{ minWidth: 22, flexShrink: 0, fontWeight: 700 }}>{String.fromCharCode(65 + oi)}.</span>
                                    <span style={{ flex: 1 }}>{opt}</span>
                                    {label && <span style={{ fontSize: '0.78rem', fontWeight: 700, flexShrink: 0, opacity: 0.9 }}>{label}</span>}
                                </div>
                            );
                        })}

                        {(r.user_answer === null || r.user_answer === undefined) && (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem', fontStyle: 'italic' }}>
                                ⚠️ Not answered
                            </div>
                        )}
                    </div>

                    {/* Explanation */}
                    <div style={{
                        marginTop: '0.9rem', padding: '0.6rem 0.9rem',
                        background: 'rgba(99,102,241,0.06)', borderRadius: 8,
                        borderLeft: '3px solid var(--primary)',
                        fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.65,
                    }}>
                        💡 <strong style={{ color: 'var(--text-primary)' }}>Explanation: </strong>{r.explanation}
                    </div>
                </div>
            ))}
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
        if (!confirm('Delete this quiz and all its attempts?')) return;
        setDeletingQuiz(quizId);
        try {
            await quizAPI.delete(quizId);
            setQuizzes(prev => prev.filter(q => q.quiz_id !== quizId));
        } catch { }
        setDeletingQuiz(null);
    };

    // ── Review Mode ─────────────────────────────────────────────────────────
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

    // ── Quiz List ────────────────────────────────────────────────────────────
    if (loading) return (
        <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--text-muted)' }}>
            <div className="spinner" style={{ width: 36, height: 36, border: '3px solid var(--surface-2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
            Loading quiz history...
        </div>
    );

    if (quizzes.length === 0) return (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📋</div>
            <p style={{ fontSize: '1rem' }}>No quizzes yet — generate one from the <strong>Generate</strong> tab!</p>
        </div>
    );

    return (
        <div>
            {quizzes.map(quiz => (
                <div
                    key={quiz.quiz_id}
                    onClick={() => quiz.status === 'COMPLETED' && openQuizReview(quiz)}
                    style={{
                        background: 'var(--surface)', borderRadius: 14,
                        border: '1px solid var(--border)', marginBottom: '0.75rem',
                        padding: '1.1rem 1.3rem', cursor: quiz.status === 'COMPLETED' ? 'pointer' : 'default',
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { if (quiz.status === 'COMPLETED') { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.boxShadow = '0 0 0 1px rgba(99,102,241,0.2)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                    {/* Left: quiz info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.96rem' }}>{quiz.title}</span>
                            <DifficultyBadge difficulty={quiz.difficulty} />
                            {quiz.status !== 'COMPLETED' && (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem', background: 'var(--surface-2)', padding: '0.1rem 0.5rem', borderRadius: 6, fontWeight: 600 }}>
                                    {quiz.status}
                                </span>
                            )}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                            📄 {quiz.document_name}&nbsp;&nbsp;·&nbsp;&nbsp;
                            {quiz.num_questions} questions&nbsp;&nbsp;·&nbsp;&nbsp;
                            {new Date(quiz.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                    </div>

                    {/* Right: stats */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                {quiz.attempt_count} attempt{quiz.attempt_count !== 1 ? 's' : ''}
                            </div>
                            {quiz.best_score !== null && (
                                <div style={{ marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                                    <ScoreBadge score={quiz.best_score} />
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>best</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={e => deleteQuiz(e, quiz.quiz_id)}
                            disabled={deletingQuiz === quiz.quiz_id}
                            style={{
                                background: 'transparent', border: '1px solid rgba(239,68,68,0.25)',
                                color: '#ef4444', padding: '0.3rem 0.55rem', borderRadius: 8,
                                cursor: 'pointer', fontSize: '0.82rem', flexShrink: 0,
                            }}
                        >🗑️</button>

                        {quiz.status === 'COMPLETED' && (
                            <span style={{ color: 'var(--primary)', fontSize: '1rem' }}>›</span>
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

    // Handle re-attempt: load existing quiz questions fresh
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
            } catch {
                setError('Failed to load quiz for re-attempt.');
            }
            setGenerating(false);
            onReattemptConsumed();
        };
        load();
    }, [reattemptQuizId, onReattemptConsumed]);

    const generateQuiz = async () => {
        if (!selectedDoc) { setError('Please select a document'); return; }
        setGenerating(true); setError(''); setQuestions([]); setResults(null); setAnswers({});
        try {
            const { data } = await quizAPI.generate(selectedDoc, difficulty, numQuestions);
            setQuizId(data.quiz_id);
            setPollCount(0);
            pollForCompletion(data.quiz_id);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to generate quiz');
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
                    setGenerating(false);
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
        setSubmitting(true);
        try {
            const { data } = await quizAPI.submit(quizId, answers);
            setResults(data);
            onAttemptSaved();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to submit quiz');
        }
        setSubmitting(false);
    };

    const resetAll = () => {
        setQuestions([]); setResults(null); setAnswers({});
        setQuizId(null); setError('');
        didLoadReattempt.current = false;
    };

    // ── Setup screen ─────────────────────────────────────────────────────────
    const showSetup = questions.length === 0 && !results && !generating;

    return (
        <div>
            {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '0.8rem 1.2rem', borderRadius: 10, marginBottom: '1rem' }}>
                    {error}
                </div>
            )}

            {/* Generating spinner */}
            {generating && (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--border)' }}>
                    <div className="spinner" style={{ width: 44, height: 44, border: '4px solid var(--surface-2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem' }} />
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                        {reattemptQuizId ? 'Loading quiz...' : `Generating quiz... (${pollCount * 2}s)`}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>Hang tight, this takes a few seconds</div>
                </div>
            )}

            {/* Setup */}
            {showSetup && (
                <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '2rem', border: '1px solid var(--border)' }}>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', marginTop: 0 }}>Configure Your Quiz</h3>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Select Document</label>
                        <select value={selectedDoc} onChange={e => setSelectedDoc(e.target.value)}
                            style={{ width: '100%', padding: '0.7rem 1rem', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', outline: 'none' }}>
                            <option value="">Choose a document...</option>
                            {documents.map(doc => (<option key={doc.doc_id} value={doc.doc_id}>{doc.filename}</option>))}
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Difficulty</label>
                            <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
                                style={{ width: '100%', padding: '0.7rem 1rem', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', outline: 'none' }}>
                                <option value="EASY">Easy</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HARD">Hard</option>
                                <option value="MIXED">Mixed</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Number of Questions</label>
                            <input type="number" min={5} max={20} value={numQuestions}
                                onChange={e => setNumQuestions(parseInt(e.target.value) || 10)}
                                style={{ width: '100%', padding: '0.7rem 1rem', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>
                    </div>

                    <button onClick={generateQuiz} disabled={!selectedDoc}
                        style={{ width: '100%', padding: '0.9rem', background: !selectedDoc ? 'var(--surface-2)' : 'var(--primary)', color: !selectedDoc ? 'var(--text-muted)' : '#fff', border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 600, cursor: !selectedDoc ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                        ✨ Generate Quiz
                    </button>
                </div>
            )}

            {/* Quiz taking */}
            {questions.length > 0 && !results && !generating && (
                <div>
                    <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '1rem 1.3rem', border: '1px solid var(--border)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem' }}>
                                {Object.keys(answers).length} / {questions.length} answered
                            </span>
                            <div style={{ height: 4, background: 'var(--surface-2)', borderRadius: 4, marginTop: '0.4rem', width: 180 }}>
                                <div style={{ height: '100%', borderRadius: 4, background: 'var(--primary)', width: `${(Object.keys(answers).length / questions.length) * 100}%`, transition: 'width 0.3s' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                            <button onClick={resetAll} style={{ padding: '0.5rem 1rem', background: 'var(--surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontSize: '0.87rem' }}>
                                ✕ Cancel
                            </button>
                            <button onClick={submitQuiz} disabled={Object.keys(answers).length < questions.length || submitting}
                                style={{ padding: '0.5rem 1.2rem', background: Object.keys(answers).length === questions.length ? '#10b981' : 'var(--surface-2)', color: Object.keys(answers).length === questions.length ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                                {submitting ? 'Submitting...' : 'Submit Quiz →'}
                            </button>
                        </div>
                    </div>

                    {questions.map((q, qi) => (
                        <div key={q.question_id} style={{ background: 'var(--surface)', borderRadius: 14, padding: '1.4rem', border: `1px solid ${answers[q.question_id] !== undefined ? 'var(--primary)' : 'var(--border)'}`, marginBottom: '1rem', transition: 'border-color 0.2s' }}>
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <span style={{ background: answers[q.question_id] !== undefined ? 'var(--primary)' : 'var(--surface-2)', color: answers[q.question_id] !== undefined ? '#fff' : 'var(--text-muted)', borderRadius: 8, padding: '0.2rem 0.6rem', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0, transition: 'all 0.2s' }}>{qi + 1}</span>
                                <div style={{ flex: 1 }}>
                                    <span style={{ color: 'var(--text-primary)', fontSize: '0.94rem', lineHeight: 1.5 }}>{q.question_text}</span>
                                    <div style={{ marginTop: '0.3rem' }}><DifficultyBadge difficulty={q.difficulty} /></div>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gap: '0.45rem' }}>
                                {q.options.map((opt, oi) => (
                                    <label key={oi} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.6rem 1rem', borderRadius: 10, cursor: 'pointer',
                                        background: answers[q.question_id] === oi ? 'rgba(99,102,241,0.13)' : 'var(--surface-2)',
                                        border: `1px solid ${answers[q.question_id] === oi ? 'var(--primary)' : 'var(--border)'}`,
                                        transition: 'all 0.15s',
                                    }}>
                                        <input type="radio" name={q.question_id} checked={answers[q.question_id] === oi}
                                            onChange={() => setAnswers(prev => ({ ...prev, [q.question_id]: oi }))}
                                            style={{ accentColor: 'var(--primary)', flexShrink: 0 }} />
                                        <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Results after submit */}
            {results && (
                <div>
                    <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '2rem', border: '1px solid var(--border)', textAlign: 'center', marginBottom: '1.5rem' }}>
                        <div style={{ fontSize: '3.5rem', fontWeight: 900, color: results.score >= 80 ? '#10b981' : results.score >= 60 ? '#f59e0b' : '#ef4444', marginBottom: '0.3rem', lineHeight: 1 }}>
                            {results.score}%
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', margin: '0 0 0.3rem' }}>{results.correct} out of {results.total} correct</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 1.2rem' }}>✅ Saved — check the <strong>History</strong> tab to review anytime</p>
                        <div style={{ display: 'flex', gap: '0.7rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button onClick={resetAll} style={{ padding: '0.65rem 1.4rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
                                ✨ New Quiz
                            </button>
                            <button onClick={() => { setAnswers({}); setResults(null); didLoadReattempt.current = false; }}
                                style={{ padding: '0.65rem 1.4rem', background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
                                🔁 Re-attempt
                            </button>
                        </div>
                    </div>

                    {/* Inline results preview */}
                    {results.results.map((r: QuizResult, i: number) => (
                        <div key={r.question_id} style={{ background: 'var(--surface)', borderRadius: 12, border: `1px solid ${r.is_correct ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, padding: '1.1rem 1.3rem', marginBottom: '0.7rem' }}>
                            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', marginBottom: '0.7rem' }}>
                                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{r.is_correct ? '✅' : '❌'}</span>
                                <span style={{ color: 'var(--text-secondary)', minWidth: 22, fontSize: '0.82rem' }}>Q{i + 1}</span>
                                <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.45 }}>{r.question_text}</span>
                            </div>
                            <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(16,185,129,0.1)', borderRadius: 8, fontSize: '0.83rem', color: '#10b981', fontWeight: 600, marginBottom: '0.4rem' }}>
                                ✓ Correct: {r.options[r.correct_answer]}
                            </div>
                            {!r.is_correct && r.user_answer !== null && (
                                <div style={{ padding: '0.4rem 0.8rem', background: 'rgba(239,68,68,0.08)', borderRadius: 8, fontSize: '0.83rem', color: '#ef4444', marginBottom: '0.4rem' }}>
                                    ✗ Your answer: {r.options[r.user_answer!]}
                                </div>
                            )}
                            <div style={{ padding: '0.5rem 0.8rem', background: 'var(--surface-2)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6, borderLeft: '3px solid var(--primary)' }}>
                                💡 {r.explanation}
                            </div>
                        </div>
                    ))}
                </div>
            )}
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

    const tab = (id: 'generate' | 'history', label: string, icon: string) => (
        <button
            onClick={() => setActiveTab(id)}
            style={{
                padding: '0.6rem 1.4rem', borderRadius: 10, border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem',
                background: activeTab === id ? 'var(--primary)' : 'var(--surface-2)',
                color: activeTab === id ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.18s',
            }}
        >{icon} {label}</button>
    );

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>📝 Quiz Generator</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', marginBottom: 0 }}>Generate AI-powered quizzes from your documents</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {tab('generate', 'Generate', '✨')}
                    {tab('history', 'History', '📋')}
                </div>
            </div>

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
    );
}

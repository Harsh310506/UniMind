import { useState } from 'react';
import { analysisAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
    BarChart3,
    Smile,
    Frown,
    Meh,
    Lightbulb,
    RotateCcw,
    Zap
} from 'lucide-react';

export default function Sentiment() {
    const [text, setText] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const toast = useToast();

    const analyze = async (customText?: string) => {
        const textToAnalyze = customText || text;
        if (!textToAnalyze.trim()) {
            toast.warning('Text required', 'Please enter or pick a sample text to analyze.');
            return;
        }
        setAnalyzing(true);
        setResult(null);

        try {
            const { data } = await analysisAPI.sentiment(textToAnalyze);
            setResult(data.sentiment);
            toast.success('Analysis complete', `Classified as ${data.sentiment.label}`);
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Analysis failed';
            toast.error('Analysis failed', msg);
        } finally {
            setAnalyzing(false);
        }
    };

    const samples = [
        {
            label: 'Happy Customer',
            icon: '🌟',
            text: 'UniMind exceeded my expectations! The speed of document indexing and accuracy of RAG responses are absolutely game-changing for our research team.'
        },
        {
            label: 'Support Escalation',
            icon: '⚠️',
            text: 'I am extremely frustrated. The previous document upload failed three times without any clear explanation, causing significant delays in my project deadline.'
        },
        {
            label: 'Neutral Summary',
            icon: '📊',
            text: 'The quarterly report outlines standard operational expenditures, revenue growth of 4.2% year-over-year, and planned technical upgrades for next fiscal period.'
        },
        {
            label: 'Critical Review',
            icon: '🔍',
            text: 'While the UI looks clean, the latency on large 50-page PDF processing could be improved. Some complex tables were not parsed perfectly.'
        }
    ];

    const getSentimentConfig = (label: string) => {
        switch (label) {
            case 'POSITIVE':
                return {
                    icon: <Smile size={48} color="#10b981" />,
                    color: '#10b981',
                    bg: 'rgba(16, 185, 129, 0.12)',
                    border: 'rgba(16, 185, 129, 0.3)',
                    glow: 'rgba(16, 185, 129, 0.25)',
                    title: 'Positive Tone',
                    desc: 'Optimistic, satisfied, or enthusiastic sentiment detected.'
                };
            case 'NEGATIVE':
                return {
                    icon: <Frown size={48} color="#f43f5e" />,
                    color: '#f43f5e',
                    bg: 'rgba(244, 63, 94, 0.12)',
                    border: 'rgba(244, 63, 94, 0.3)',
                    glow: 'rgba(244, 63, 94, 0.25)',
                    title: 'Negative Tone',
                    desc: 'Frustrated, dissatisfied, or critical sentiment detected.'
                };
            default:
                return {
                    icon: <Meh size={48} color="#f59e0b" />,
                    color: '#f59e0b',
                    bg: 'rgba(245, 158, 11, 0.12)',
                    border: 'rgba(245, 158, 11, 0.3)',
                    glow: 'rgba(245, 158, 11, 0.25)',
                    title: 'Neutral Tone',
                    desc: 'Objective, factual, or balanced sentiment detected.'
                };
        }
    };

    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

    return (
        <div className="sentiment-page-container animate-slide-up">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Sentiment & Tone Analyzer</h1>
                    <p className="page-subtitle">
                        Analyze emotional valence, sentiment polarity, and confidence scoring using Groq LLM intelligence.
                    </p>
                </div>
            </div>

            {/* Quick Test Samples */}
            <div className="sample-prompts-section">
                <span className="samples-title">QUICK TEST SAMPLES:</span>
                <div className="sample-cards-grid">
                    {samples.map((s, i) => (
                        <button
                            key={i}
                            className="sample-prompt-pill glass-panel"
                            onClick={() => {
                                setText(s.text);
                                analyze(s.text);
                            }}
                        >
                            <span className="sample-emoji">{s.icon}</span>
                            <span className="sample-label">{s.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Input Card */}
            <div className="sentiment-input-card glass-panel">
                <div className="card-top">
                    <label className="input-label">
                        <BarChart3 size={16} color="var(--primary-light)" />
                        <span>Input Text for Sentiment Evaluation</span>
                    </label>
                    <span className="char-counter">
                        {wordCount} words • {text.length} / 5000 chars
                    </span>
                </div>

                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    placeholder="Type or paste any customer review, email draft, support message, or meeting transcript..."
                    rows={6}
                    maxLength={5000}
                    className="sentiment-textarea"
                />

                <div className="card-bottom-actions">
                    <button
                        className="btn-secondary"
                        onClick={() => { setText(''); setResult(null); }}
                        disabled={!text}
                    >
                        <RotateCcw size={14} />
                        <span>Clear</span>
                    </button>

                    <button
                        className="btn-primary"
                        onClick={() => analyze()}
                        disabled={!text.trim() || analyzing}
                    >
                        {analyzing ? (
                            <>
                                <div className="spinner" style={{ width: 16, height: 16 }} />
                                <span>Analyzing Sentiment...</span>
                            </>
                        ) : (
                            <>
                                <Zap size={16} />
                                <span>Analyze Tone & Polarity</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Results Presentation */}
            {result && (() => {
                const config = getSentimentConfig(result.label);
                const pct = Math.round(result.score * 100);

                return (
                    <div className="sentiment-results-card glass-panel animate-slide-up" style={{ borderColor: config.border }}>
                        <div className="result-header">
                            <div className="result-icon-circle" style={{ background: config.bg, borderColor: config.border }}>
                                {config.icon}
                            </div>
                            <div className="result-title-group">
                                <span className="result-polarity-badge" style={{ color: config.color, background: config.bg, border: `1px solid ${config.border}` }}>
                                    {result.label}
                                </span>
                                <h2>{config.title}</h2>
                                <p>{config.desc}</p>
                            </div>
                        </div>

                        {/* Confidence Meter Bar */}
                        <div className="confidence-meter-box">
                            <div className="meter-header">
                                <span className="meter-label">AI CONFIDENCE SCORE</span>
                                <span className="meter-value" style={{ color: config.color }}>{pct}%</span>
                            </div>
                            <div className="meter-track">
                                <div
                                    className="meter-fill"
                                    style={{
                                        width: `${pct}%`,
                                        background: `linear-gradient(90deg, ${config.color}, var(--primary))`
                                    }}
                                />
                            </div>
                        </div>

                        {/* Explanation Box */}
                        {result.explanation && (
                            <div className="explanation-callout">
                                <div className="callout-header">
                                    <Lightbulb size={16} color="var(--primary-light)" />
                                    <span>Linguistic Rationale</span>
                                </div>
                                <p>{result.explanation}</p>
                            </div>
                        )}
                    </div>
                );
            })()}

            <style>{`
                .sentiment-page-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.75rem;
                    max-width: 820px;
                    margin: 0 auto;
                    width: 100%;
                }

                .page-header {
                    margin-bottom: 0.5rem;
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

                /* ─── Sample Prompts ─── */
                .sample-prompts-section {
                    display: flex;
                    flex-direction: column;
                    gap: 0.6rem;
                }
                .samples-title {
                    font-size: 0.72rem;
                    font-weight: 800;
                    color: var(--text-muted);
                    letter-spacing: 0.06em;
                }
                .sample-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
                    gap: 0.65rem;
                }
                .sample-prompt-pill {
                    display: flex;
                    align-items: center;
                    gap: 0.55rem;
                    padding: 0.65rem 0.9rem;
                    cursor: pointer;
                    text-align: left;
                    font-family: inherit;
                    transition: all 0.2s;
                }
                .sample-prompt-pill:hover {
                    background: var(--surface-2);
                    border-color: rgba(99, 102, 241, 0.35);
                    transform: translateY(-2px);
                }
                .sample-emoji {
                    font-size: 1.1rem;
                }
                .sample-label {
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                /* ─── Input Card ─── */
                .sentiment-input-card {
                    padding: 1.75rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                .card-top {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .input-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.88rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .char-counter {
                    font-size: 0.76rem;
                    color: var(--text-muted);
                }
                .sentiment-textarea {
                    width: 100%;
                    padding: 1rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    color: var(--text-primary);
                    font-size: 0.94rem;
                    font-family: inherit;
                    line-height: 1.6;
                    outline: none;
                    resize: vertical;
                    transition: border-color 0.2s;
                    box-sizing: border-box;
                }
                .sentiment-textarea:focus {
                    border-color: var(--primary);
                    background: var(--surface-3);
                }
                .card-bottom-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                /* ─── Results Card ─── */
                .sentiment-results-card {
                    padding: 2.2rem 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    box-shadow: var(--shadow-md);
                }
                .result-header {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                }
                .result-icon-circle {
                    width: 72px;
                    height: 72px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid;
                    flex-shrink: 0;
                }
                .result-title-group h2 {
                    font-size: 1.35rem;
                    color: #ffffff;
                    margin: 0.2rem 0;
                }
                .result-title-group p {
                    font-size: 0.86rem;
                    color: var(--text-secondary);
                }
                .result-polarity-badge {
                    display: inline-block;
                    font-size: 0.74rem;
                    font-weight: 800;
                    letter-spacing: 0.05em;
                    padding: 0.2rem 0.6rem;
                    border-radius: 6px;
                }

                .confidence-meter-box {
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    padding: 1.2rem;
                }
                .meter-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }
                .meter-label {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    letter-spacing: 0.05em;
                }
                .meter-value {
                    font-size: 1.1rem;
                    font-weight: 800;
                }
                .meter-track {
                    height: 8px;
                    background: var(--surface-3);
                    border-radius: 6px;
                    overflow: hidden;
                }
                .meter-fill {
                    height: 100%;
                    border-radius: 6px;
                    transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                }

                .explanation-callout {
                    padding: 1.2rem;
                    background: var(--surface-2);
                    border-left: 3px solid var(--primary);
                    border-radius: var(--radius-sm);
                }
                .callout-header {
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                    font-size: 0.82rem;
                    font-weight: 700;
                    color: var(--primary-light);
                    margin-bottom: 0.4rem;
                }
                .explanation-callout p {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                }
            `}</style>
        </div>
    );
}

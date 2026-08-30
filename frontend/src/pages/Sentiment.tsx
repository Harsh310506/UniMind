import { useState } from 'react';
import { analysisAPI } from '../services/api';

export default function Sentiment() {
    const [text, setText] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');

    const analyze = async () => {
        if (!text.trim()) return;
        setAnalyzing(true); setError(''); setResult(null);
        try {
            const { data } = await analysisAPI.sentiment(text);
            setResult(data.sentiment);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Analysis failed');
        } finally { setAnalyzing(false); }
    };

    const emoji: Record<string, string> = { POSITIVE: '😊', NEGATIVE: '😞', NEUTRAL: '😐' };
    const color: Record<string, string> = { POSITIVE: 'var(--success)', NEGATIVE: 'var(--error)', NEUTRAL: 'var(--warning)' };

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>💭 Sentiment Analysis</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Analyze the emotional tone of any text</p>
                </div>
            </div>

            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--error)', padding: '0.8rem 1.2rem', borderRadius: 10, marginBottom: '1rem' }}>{error}</div>}

            <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '2rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Enter text to analyze..." rows={6} maxLength={5000}
                    style={{ width: '100%', padding: '1rem', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, resize: 'vertical', color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.6, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{text.length} / 5000</span>
                    <button onClick={analyze} disabled={!text.trim() || analyzing}
                        style={{ padding: '0.7rem 2rem', background: text.trim() ? 'var(--primary)' : 'var(--surface-2)', color: text.trim() ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: 12, fontWeight: 600, cursor: text.trim() && !analyzing ? 'pointer' : 'not-allowed' }}>
                        {analyzing ? '⏳ Analyzing...' : '🔍 Analyze'}
                    </button>
                </div>
            </div>

            {result && (
                <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '2rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '0.5rem' }}>{emoji[result.label] || '🤔'}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: color[result.label], marginBottom: '0.5rem' }}>{result.label}</div>
                    <div style={{ width: '100%', maxWidth: 300, margin: '1rem auto', background: 'var(--surface-2)', borderRadius: 10, height: 12, overflow: 'hidden' }}>
                        <div style={{ width: `${result.score * 100}%`, height: '100%', background: color[result.label], borderRadius: 10, transition: 'width 0.5s ease' }} />
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Confidence: {(result.score * 100).toFixed(1)}%</p>
                    {result.explanation && (
                        <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-2)', borderRadius: 12, textAlign: 'left' }}>
                            <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>💡 {result.explanation}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

import { useState, useRef } from 'react';
import { analysisAPI } from '../services/api';

export default function Speech() {
    const [file, setFile] = useState<File | null>(null);
    const [transcribing, setTranscribing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState('');
    const fileRef = useRef<HTMLInputElement>(null);

    const transcribe = async () => {
        if (!file) return;
        setTranscribing(true); setError(''); setResult(null);
        try {
            const { data } = await analysisAPI.transcribe(file);
            setResult(data);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Transcription failed');
        } finally { setTranscribing(false); }
    };

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>🎤 Speech to Text</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Transcribe audio files using OpenAI Whisper</p>
                </div>
            </div>

            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--error)', padding: '0.8rem 1.2rem', borderRadius: 10, marginBottom: '1rem' }}>{error}</div>}

            <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '2rem', border: '1px solid var(--border)', textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎙️</div>
                <label style={{ display: 'inline-block', padding: '0.8rem 2rem', background: 'var(--surface-2)', borderRadius: 12, cursor: 'pointer', border: '2px dashed var(--border)', marginBottom: '1rem' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{file ? file.name : 'Choose audio file'}</span>
                    <input ref={fileRef} type="file" accept=".mp3,.wav,.m4a,.webm,.ogg,.flac" style={{ display: 'none' }}
                        onChange={e => setFile(e.target.files?.[0] || null)} />
                </label>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.5rem 0 1rem' }}>
                    Supported: MP3, WAV, M4A, WebM, OGG, FLAC (max 25MB)
                </p>
                {file && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Size: {(file.size / (1024 * 1024)).toFixed(2)} MB</p>}
                <button onClick={transcribe} disabled={!file || transcribing}
                    style={{ marginTop: '1rem', padding: '0.7rem 2rem', background: file ? 'var(--primary)' : 'var(--surface-2)', color: file ? '#fff' : 'var(--text-muted)', border: 'none', borderRadius: 12, fontWeight: 600, cursor: file && !transcribing ? 'pointer' : 'not-allowed' }}>
                    {transcribing ? '⏳ Transcribing...' : '🎯 Transcribe'}
                </button>
            </div>

            {result && (
                <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '2rem', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>Transcription</h3>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            {result.language && <span>🌐 {result.language}</span>}
                            {result.duration && <span>⏱️ {Math.round(result.duration)}s</span>}
                        </div>
                    </div>
                    <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '1.2rem' }}>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{result.text}</p>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(result.text)}
                        style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', background: 'var(--surface-2)', color: 'var(--text-primary)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem' }}>
                        📋 Copy to Clipboard
                    </button>
                </div>
            )}
        </div>
    );
}

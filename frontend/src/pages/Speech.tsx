import { useState, useRef } from 'react';
import { analysisAPI, chatAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import {
    Mic,
    MessageSquare,
    Copy,
    Check,
    Globe,
    Clock,
    FileAudio,
    Sparkles,
    X,
    Volume2
} from 'lucide-react';

export default function Speech() {
    const [file, setFile] = useState<File | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [transcribing, setTranscribing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [copied, setCopied] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Send to chat modal state
    const [showChatModal, setShowChatModal] = useState(false);
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedConv, setSelectedConv] = useState('');
    const [sendingToChat, setSendingToChat] = useState(false);

    const toast = useToast();
    const navigate = useNavigate();

    const handleFileSelected = (selectedFile: File) => {
        setFile(selectedFile);
        setResult(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(selectedFile));
    };

    const transcribe = async () => {
        if (!file) return;
        setTranscribing(true);
        setResult(null);
        try {
            const { data } = await analysisAPI.transcribe(file);
            setResult(data);
            toast.success('Transcription complete!', `Language: ${data.language?.toUpperCase() || 'Auto'} • ${Math.round(data.duration || 0)}s duration`);
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Transcription failed';
            toast.error('Transcription failed', msg);
        } finally {
            setTranscribing(false);
        }
    };

    const openChatModal = async () => {
        setShowChatModal(true);
        setSelectedConv('');
        try {
            const convRes = await chatAPI.listConversations();
            setConversations(convRes.data.conversations);
        } catch { }
    };

    const sendToChat = async () => {
        if (!result?.text) return;
        setSendingToChat(true);
        try {
            let convId = selectedConv;
            if (!convId) {
                const { data } = await chatAPI.createConversation(undefined, 'Audio Transcript Query');
                convId = data.conversation_id;
            }
            await chatAPI.sendMessage(convId, result.text);
            toast.success('Piped into Chat!', 'Transcription added as a conversation prompt.');
            setShowChatModal(false);
            navigate('/chat');
        } catch {
            toast.error('Failed to pipe into chat');
        } finally {
            setSendingToChat(false);
        }
    };

    const handleCopy = () => {
        if (result?.text) {
            navigator.clipboard.writeText(result.text);
            setCopied(true);
            toast.success('Transcript copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="speech-page-layout animate-slide-up">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Speech-to-Text Transcription</h1>
                    <p className="page-subtitle">
                        Convert lecture recordings, voice memos, and meetings into searchable text using OpenAI Whisper.
                    </p>
                </div>
            </div>

            {/* Upload & Audio Card */}
            <div className="speech-upload-card glass-panel">
                <input
                    ref={fileRef}
                    type="file"
                    accept=".mp3,.wav,.m4a,.webm,.ogg,.flac"
                    style={{ display: 'none' }}
                    onChange={e => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
                />

                <div 
                    className="audio-dropzone-inner"
                    onClick={() => fileRef.current?.click()}
                    role="button"
                    tabIndex={0}
                >
                    <div className="audio-icon-pulse">
                        <Mic size={28} />
                    </div>

                    <div className="audio-dropzone-text">
                        <span className="dropzone-title">
                            {file ? file.name : 'Select or drop an audio recording'}
                        </span>
                        <span className="dropzone-sub">
                            Supports MP3, WAV, M4A, WebM, OGG, FLAC (Max 25MB)
                        </span>
                    </div>

                    {file && (
                        <div className="file-selected-pill">
                            <FileAudio size={14} />
                            <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                    )}
                </div>

                {/* Audio Player Preview if file selected */}
                {audioUrl && (
                    <div className="audio-player-preview glass-panel">
                        <div className="preview-label">
                            <Volume2 size={15} color="var(--primary-light)" />
                            <span>Audio Preview:</span>
                        </div>
                        <audio controls src={audioUrl} className="native-audio-player" />
                    </div>
                )}

                <div className="speech-action-bar">
                    <button
                        onClick={transcribe}
                        disabled={!file || transcribing}
                        className="btn-primary transcribe-btn"
                    >
                        {transcribing ? (
                            <>
                                <div className="spinner" style={{ width: 16, height: 16 }} />
                                <span>Processing Audio with Whisper...</span>
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                <span>Transcribe Audio</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Results Presentation */}
            {result && (
                <div className="transcript-result-card glass-panel animate-slide-up">
                    <div className="result-top-bar">
                        <div className="result-heading-group">
                            <div className="result-mic-badge">
                                <FileAudio size={18} color="var(--primary-light)" />
                            </div>
                            <div>
                                <h3>Transcription Result</h3>
                                <span className="transcript-word-count">
                                    {result.text.trim().split(/\s+/).length} words extracted
                                </span>
                            </div>
                        </div>

                        <div className="result-metrics-badges">
                            {result.language && (
                                <span className="metric-pill">
                                    <Globe size={13} />
                                    <span>Language: {result.language.toUpperCase()}</span>
                                </span>
                            )}
                            {result.duration && (
                                <span className="metric-pill">
                                    <Clock size={13} />
                                    <span>Duration: {Math.round(result.duration)}s</span>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="transcript-content-box">
                        <p>{result.text}</p>
                    </div>

                    <div className="result-action-footer">
                        <button className="btn-secondary" onClick={handleCopy}>
                            {copied ? <Check size={15} color="var(--success)" /> : <Copy size={15} />}
                            <span>{copied ? 'Copied' : 'Copy Text'}</span>
                        </button>

                        <button className="btn-primary" onClick={openChatModal}>
                            <MessageSquare size={15} />
                            <span>Ask AI About This Transcript</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Pipe to Chat Modal */}
            {showChatModal && (
                <div className="modal-backdrop" onClick={() => setShowChatModal(false)}>
                    <div className="chat-pipe-modal glass-panel" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title-group">
                                <div className="modal-icon-badge">
                                    <MessageSquare size={18} color="var(--secondary)" />
                                </div>
                                <div>
                                    <h3>Send to AI Chat</h3>
                                    <span className="modal-sub">Pipe transcript as a conversational prompt</span>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowChatModal(false)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body">
                            <label className="config-label" style={{ marginBottom: '0.5rem' }}>
                                Target Conversation
                            </label>
                            <select
                                value={selectedConv}
                                onChange={e => setSelectedConv(e.target.value)}
                                className="input-field"
                            >
                                <option value="">— Create New Conversation —</option>
                                {conversations.map((c: any) => (
                                    <option key={c.conversation_id} value={c.conversation_id}>
                                        {c.title}
                                    </option>
                                ))}
                            </select>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                The full transcript will be posted as the initial prompt to query key insights.
                            </p>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowChatModal(false)}>
                                Cancel
                            </button>
                            <button className="btn-primary" onClick={sendToChat} disabled={sendingToChat}>
                                {sendingToChat ? 'Sending...' : 'Send to Chat →'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .speech-page-layout {
                    display: flex;
                    flex-direction: column;
                    gap: 1.75rem;
                    max-width: 820px;
                    margin: 0 auto;
                    width: 100%;
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

                .speech-upload-card {
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
                .audio-dropzone-inner {
                    border: 2px dashed rgba(99, 102, 241, 0.3);
                    background: rgba(18, 26, 45, 0.5);
                    border-radius: var(--radius);
                    padding: 2.5rem 1.5rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.85rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                }
                .audio-dropzone-inner:hover {
                    border-color: var(--primary);
                    background: rgba(99, 102, 241, 0.08);
                    transform: translateY(-2px);
                }
                .audio-icon-pulse {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: rgba(99, 102, 241, 0.15);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    color: var(--primary-light);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .audio-dropzone-text {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                .dropzone-title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .dropzone-sub {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .file-selected-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius-full);
                    background: rgba(16, 185, 129, 0.15);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    color: var(--success);
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .audio-player-preview {
                    padding: 0.9rem 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    border-radius: var(--radius);
                }
                .preview-label {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                    flex-shrink: 0;
                }
                .native-audio-player {
                    flex: 1;
                    height: 34px;
                    outline: none;
                }

                .speech-action-bar {
                    display: flex;
                    justify-content: flex-end;
                }
                .transcribe-btn {
                    padding: 0.75rem 1.75rem;
                    font-size: 0.94rem;
                }

                /* ─── Result Card ─── */
                .transcript-result-card {
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
                .result-top-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 1rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border);
                }
                .result-heading-group {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .result-mic-badge {
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius);
                    background: rgba(99, 102, 241, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .result-heading-group h3 {
                    font-size: 1.1rem;
                    color: #ffffff;
                }
                .transcript-word-count {
                    font-size: 0.76rem;
                    color: var(--text-muted);
                }
                .result-metrics-badges {
                    display: flex;
                    gap: 0.5rem;
                }
                .metric-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.25rem 0.65rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius-full);
                    font-size: 0.76rem;
                    color: var(--text-secondary);
                    font-weight: 600;
                }

                .transcript-content-box {
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    padding: 1.5rem;
                    font-size: 0.95rem;
                    line-height: 1.7;
                    color: var(--text-primary);
                    white-space: pre-wrap;
                }
                .result-action-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                /* ─── Modal ─── */
                .modal-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.75);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                    padding: 1.5rem;
                }
                .chat-pipe-modal {
                    width: 100%;
                    max-width: 480px;
                    border-radius: var(--radius-lg);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    box-shadow: var(--shadow-lg);
                    overflow: hidden;
                    animation: slideInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.25rem 1.5rem;
                    border-bottom: 1px solid var(--border);
                    background: rgba(18, 26, 45, 0.9);
                }
                .modal-title-group {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                }
                .modal-icon-badge {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: rgba(14, 165, 233, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-header h3 {
                    font-size: 1.05rem;
                    color: #ffffff;
                }
                .modal-sub {
                    font-size: 0.74rem;
                    color: var(--text-muted);
                }
                .modal-close-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                }
                .modal-body {
                    padding: 1.5rem;
                }
                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                    padding: 1rem 1.5rem;
                    border-top: 1px solid var(--border);
                    background: rgba(18, 26, 45, 0.9);
                }
            `}</style>
        </div>
    );
}

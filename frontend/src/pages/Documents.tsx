import { useState, useEffect, useCallback, useRef } from 'react';
import { documentsAPI, analysisAPI } from '../services/api';
import type { DocumentItem } from '../types';

import { FileText, Upload, MessageSquare, Trash2 } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
    PROCESSING: 'var(--warning)',
    COMPLETED: 'var(--success)',
    FAILED: 'var(--error)',
};

export default function Documents() {
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>('');
    const [error, setError] = useState('');
    const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
    const [summary, setSummary] = useState<any>(null);
    const [summarizing, setSummarizing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDocuments = useCallback(async () => {
        try {
            const { data } = await documentsAPI.list();
            setDocuments(data.documents);
        } catch (err: any) {
            setError('Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadProgress(`Uploading ${file.name}...`);
        setError('');

        try {
            await documentsAPI.upload(file);
            setUploadProgress('');
            fetchDocuments();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Upload failed');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (docId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await documentsAPI.delete(docId);
            setDocuments(prev => prev.filter(d => d.doc_id !== docId));
            if (selectedDoc?.doc_id === docId) setSelectedDoc(null);
        } catch {
            setError('Failed to delete document');
        }
    };

    const handleSummarize = async (docId: string) => {
        setSummarizing(true);
        setSummary(null);
        try {
            const { data } = await analysisAPI.summarize(docId);
            setSummary(data.summary);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Summarization failed');
        } finally {
            setSummarizing(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        📁 Documents
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        Upload and manage your documents for AI-powered analysis
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <label style={{
                        padding: '0.8rem 1.5rem',
                        background: 'var(--primary)',
                        color: '#fff',
                        borderRadius: 12,
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        opacity: uploading ? 0.7 : 1,
                        transition: 'all 0.2s ease',
                    }}>
                        {uploading ? '⏳ Uploading...' : '+ Upload File'}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleUpload}
                            accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
                            style={{ display: 'none' }}
                            disabled={uploading}
                        />
                    </label>
                </div>
            </div>

            {error && (
                <div style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.3)',
                    color: 'var(--error)',
                    padding: '0.8rem 1.2rem',
                    borderRadius: 10,
                    marginBottom: '1rem',
                }}>{error}</div>
            )}

            {uploadProgress && (
                <div style={{
                    background: 'rgba(99,102,241,0.1)',
                    border: '1px solid rgba(99,102,241,0.3)',
                    color: 'var(--primary)',
                    padding: '0.8rem 1.2rem',
                    borderRadius: 10,
                    marginBottom: '1rem',
                }}>{uploadProgress}</div>
            )}

            {/* Document Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
                    Loading documents...
                </div>
            ) : documents.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '4rem',
                    background: 'var(--surface)',
                    borderRadius: 16,
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}>
                    <div style={{
                        background: 'var(--surface-2)',
                        padding: '1.5rem',
                        borderRadius: '50%',
                        marginBottom: '1.5rem',
                        color: 'var(--primary)',
                    }}>
                        <Upload size={40} />
                    </div>
                    <h3 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontSize: '1.25rem' }}>No documents yet</h3>
                    <p style={{ color: 'var(--text-secondary)', maxWidth: 400, lineHeight: 1.5 }}>
                        Upload your first document to get started with AI analysis, chat, and quizzes.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
                    {documents.map(doc => (
                        <div key={doc.doc_id} style={{
                            background: 'var(--surface)',
                            borderRadius: 16,
                            padding: '1.5rem',
                            border: `1px solid ${selectedDoc?.doc_id === doc.doc_id ? 'var(--primary)' : 'var(--border)'}`,
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%',
                        }}
                            onClick={() => setSelectedDoc(doc)}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        padding: '0.8rem',
                                        borderRadius: 12,
                                        background: 'var(--surface-2)',
                                        color: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        {doc.file_type === 'PDF' && <FileText size={24} />}
                                        {doc.file_type === 'DOCX' && <FileText size={24} />}
                                        {doc.file_type === 'TXT' && <FileText size={24} />}
                                        {doc.file_type === 'IMAGE' && <FileText size={24} />}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{
                                            fontWeight: 600,
                                            color: 'var(--text-primary)',
                                            fontSize: '1.05rem',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            marginBottom: '0.25rem',
                                        }} title={doc.filename}>{doc.filename}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {formatFileSize(doc.file_size)} • {new Date(doc.upload_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '0.75rem',
                                    padding: '0.25rem 0.75rem',
                                    borderRadius: 20,
                                    fontWeight: 600,
                                    color: STATUS_COLORS[doc.status],
                                    background: `${STATUS_COLORS[doc.status]}15`,
                                    border: `1px solid ${STATUS_COLORS[doc.status]}30`,
                                    whiteSpace: 'nowrap',
                                }}>
                                    {doc.status === 'COMPLETED' ? 'Ready' : doc.status}
                                </span>
                            </div>

                            {doc.preview_text && (
                                <p style={{
                                    fontSize: '0.9rem',
                                    color: 'var(--text-secondary)',
                                    margin: '0 0 1.5rem',
                                    lineHeight: 1.6,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical' as any,
                                    overflow: 'hidden',
                                    flex: 1,
                                }}>{doc.preview_text}</p>
                            )}

                            <div style={{
                                display: 'flex',
                                gap: '0.5rem',
                                marginTop: 'auto',
                                paddingTop: '1rem',
                                borderTop: '1px solid var(--border)',
                                justifyContent: 'flex-end',
                            }}>
                                {doc.status === 'COMPLETED' && (
                                    <>
                                        <a href={`/chat?doc=${doc.doc_id}`}
                                            onClick={e => e.stopPropagation()}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                fontSize: '0.85rem', padding: '0.5rem 1rem',
                                                background: 'var(--surface-2)', color: 'var(--text-primary)',
                                                borderRadius: 8, textDecoration: 'none', fontWeight: 500,
                                                transition: 'background 0.2s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
                                        ><MessageSquare size={16} /> Chat</a>

                                        <button
                                            onClick={e => { e.stopPropagation(); handleSummarize(doc.doc_id); }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.4rem',
                                                fontSize: '0.85rem', padding: '0.5rem 1rem',
                                                background: 'var(--surface-2)', color: 'var(--text-primary)',
                                                borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 500,
                                                transition: 'background 0.2s',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
                                        ><FileText size={16} /> Summary</button>
                                    </>
                                )}
                                <button
                                    onClick={e => { e.stopPropagation(); handleDelete(doc.doc_id); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        padding: '0.5rem',
                                        background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)',
                                        borderRadius: 8, border: 'none', cursor: 'pointer',
                                        transition: 'background 0.2s',
                                    }}
                                    title="Delete Document"
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                                ><Trash2 size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary Modal */}
            {(summarizing || summary) && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.6)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    padding: '2rem',
                }} onClick={() => { setSummary(null); setSummarizing(false); }}>
                    <div style={{
                        background: 'var(--surface)', borderRadius: 20, padding: '2rem',
                        maxWidth: 700, width: '100%', maxHeight: '80vh', overflow: 'auto',
                        border: '1px solid var(--border)',
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: 'var(--text-primary)', margin: '0 0 1rem' }}>📊 Document Summary</h2>
                        {summarizing ? (
                            <p style={{ color: 'var(--text-secondary)' }}>Generating summary... ⏳</p>
                        ) : summary && (
                            <div>
                                <div style={{
                                    background: 'var(--surface-2)', borderRadius: 12,
                                    padding: '1rem', marginBottom: '1rem',
                                }}>
                                    <h3 style={{ color: 'var(--primary)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>Executive Summary</h3>
                                    <p style={{ color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
                                        {summary.executive_summary}
                                    </p>
                                </div>
                                {summary.key_points && summary.key_points.length > 0 && (
                                    <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
                                        <h3 style={{ color: 'var(--primary)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>Key Points</h3>
                                        <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                                            {summary.key_points.map((point: string, i: number) => (
                                                <li key={i} style={{ color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '0.3rem' }}>
                                                    {point}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '1rem' }}>
                                    <h3 style={{ color: 'var(--primary)', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>Detailed Summary</h3>
                                    <p style={{ color: 'var(--text-primary)', fontSize: '0.85rem', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                                        {summary.detailed_summary}
                                    </p>
                                </div>
                            </div>
                        )}
                        <button onClick={() => { setSummary(null); setSummarizing(false); }}
                            style={{
                                marginTop: '1rem', padding: '0.6rem 1.5rem',
                                background: 'var(--surface-2)', color: 'var(--text-primary)',
                                border: 'none', borderRadius: 10, cursor: 'pointer',
                            }}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
}

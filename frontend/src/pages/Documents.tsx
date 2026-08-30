import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { documentsAPI, analysisAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import type { DocumentItem } from '../types';

import {
    Upload,
    MessageSquare,
    Trash2,
    Sparkles,
    Download,
    Search,
    X,
    Copy,
    Layers,
    FileCheck,
    Check
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    PROCESSING: { label: 'Processing...', color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.12)' },
    COMPLETED: { label: 'Ready', color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.12)' },
    FAILED: { label: 'Failed', color: 'var(--error)', bg: 'rgba(244, 63, 94, 0.12)' },
};

const FILE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
    PDF: { icon: '📄', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' },
    DOCX: { icon: '📝', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' },
    TXT: { icon: '📃', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
    IMAGE: { icon: '🖼️', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' },
};

export default function Documents() {
    const navigate = useNavigate();
    const toast = useToast();
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [isDragging, setIsDragging] = useState(false);

    // Summary modal
    const [summaryModalDoc, setSummaryModalDoc] = useState<DocumentItem | null>(null);
    const [summaryContent, setSummaryContent] = useState<string>('');
    const [summarizing, setSummarizing] = useState(false);
    const [copiedSummary, setCopiedSummary] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDocuments = useCallback(async () => {
        try {
            const { data } = await documentsAPI.list();
            setDocuments(data.documents);
        } catch {
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleUploadFile = async (file: File) => {
        setUploading(true);
        setUploadProgress(`Uploading ${file.name}...`);

        try {
            await documentsAPI.upload(file);
            setUploadProgress('');
            fetchDocuments();
            toast.success('Upload started!', `${file.name} is being indexed in background.`);
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Upload failed';
            toast.error('Upload failed', msg);
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUploadFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleUploadFile(file);
    };

    const handleDelete = async (docId: string, docName: string) => {
        if (!confirm(`Are you sure you want to delete "${docName}"? This will also remove associated vector embeddings.`)) return;
        try {
            await documentsAPI.delete(docId);
            setDocuments(prev => prev.filter(d => d.doc_id !== docId));
            toast.success('Document deleted', `${docName} removed.`);
        } catch {
            toast.error('Delete failed', 'Could not delete document.');
        }
    };

    const handleDownload = async (docId: string, fileName: string) => {
        try {
            const response = await documentsAPI.download(docId);
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            toast.success('Download started', fileName);
        } catch {
            toast.error('Download failed');
        }
    };

    const handleOpenSummary = async (doc: DocumentItem) => {
        setSummaryModalDoc(doc);
        setSummarizing(true);
        setSummaryContent('');
        setCopiedSummary(false);

        try {
            const { data } = await analysisAPI.summarize(doc.doc_id);
            setSummaryContent(data.summary);
        } catch (err: any) {
            setSummaryContent('Failed to generate summary. Please ensure the document is processed.');
            toast.error('Summarization failed', err.response?.data?.detail);
        } finally {
            setSummarizing(false);
        }
    };

    const handleCopySummary = () => {
        if (summaryContent) {
            navigator.clipboard.writeText(summaryContent);
            setCopiedSummary(true);
            toast.success('Summary copied to clipboard');
            setTimeout(() => setCopiedSummary(false), 2000);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Filtered documents
    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'ALL' || doc.file_type === typeFilter;
        return matchesSearch && matchesType;
    });

    const filterTypes = ['ALL', 'PDF', 'DOCX', 'TXT', 'IMAGE'];

    return (
        <div className="documents-container animate-slide-up">
            {/* Header Area */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Document Knowledge Base</h1>
                    <p className="page-subtitle">
                        Upload documents to power RAG chat conversations, interactive quizzes, and semantic retrieval.
                    </p>
                </div>
                <div className="header-badge">
                    <Layers size={15} color="var(--primary-light)" />
                    <span>{documents.length} Document{documents.length !== 1 ? 's' : ''} Stored</span>
                </div>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
                className={`dropzone-card ${isDragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    disabled={uploading}
                />
                
                <div className="dropzone-inner">
                    <div className="upload-icon-circle">
                        {uploading ? (
                            <div className="spinner" style={{ width: 26, height: 26, borderWidth: 3 }} />
                        ) : (
                            <Upload size={24} />
                        )}
                    </div>
                    
                    <div className="upload-instructions">
                        <span className="upload-primary-text">
                            {uploading ? uploadProgress : (
                                <>
                                    <strong>Click to upload</strong> or drag and drop files here
                                </>
                            )}
                        </span>
                        <span className="upload-subtext">
                            Supported: PDF, DOCX, TXT, JPG, PNG (with OCR text extraction) • Up to 25MB
                        </span>
                    </div>

                    <div className="supported-formats-pills">
                        <span className="format-pill">PDF</span>
                        <span className="format-pill">DOCX</span>
                        <span className="format-pill">TXT</span>
                        <span className="format-pill">OCR Images</span>
                    </div>
                </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="toolbar-section">
                <div className="search-bar-wrapper">
                    <Search size={16} className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search documents by name..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
                            <X size={14} />
                        </button>
                    )}
                </div>

                <div className="filter-chips-group">
                    {filterTypes.map(ft => (
                        <button
                            key={ft}
                            className={`filter-chip ${typeFilter === ft ? 'active' : ''}`}
                            onClick={() => setTypeFilter(ft)}
                        >
                            {ft === 'ALL' ? 'All Formats' : ft}
                        </button>
                    ))}
                </div>
            </div>

            {/* Document Cards Grid */}
            {loading ? (
                <div className="documents-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="doc-card-skeleton glass-panel">
                            <div className="skeleton-header">
                                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12 }} />
                                <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 12 }} />
                            </div>
                            <div className="skeleton" style={{ height: 16, width: '75%', margin: '1rem 0 0.5rem' }} />
                            <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: '1.2rem' }} />
                            <div className="skeleton" style={{ height: 40, width: '100%', borderRadius: 8 }} />
                        </div>
                    ))}
                </div>
            ) : filteredDocs.length === 0 ? (
                <div className="empty-docs-state glass-panel">
                    <div className="empty-state-icon">📄</div>
                    <h3>No documents found</h3>
                    <p>
                        {searchQuery || typeFilter !== 'ALL'
                            ? 'No files matched your current search and filter settings.'
                            : 'Upload your first document above to enable RAG chat, quizzes, and text analysis.'}
                    </p>
                    {(searchQuery || typeFilter !== 'ALL') && (
                        <button className="btn-secondary" onClick={() => { setSearchQuery(''); setTypeFilter('ALL'); }}>
                            Clear filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="documents-grid">
                    {filteredDocs.map(doc => {
                        const fileCfg = FILE_CONFIG[doc.file_type] || FILE_CONFIG.TXT;
                        const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.COMPLETED;

                        return (
                            <div key={doc.doc_id} className="doc-card glass-panel">
                                <div className="doc-card-header">
                                    <div 
                                        className="file-badge" 
                                        style={{ background: fileCfg.bg, color: fileCfg.color }}
                                    >
                                        <span className="file-emoji">{fileCfg.icon}</span>
                                        <span className="file-type-name">{doc.file_type}</span>
                                    </div>

                                    <span 
                                        className="status-pill" 
                                        style={{ color: statusCfg.color, background: statusCfg.bg, border: `1px solid ${statusCfg.color}30` }}
                                    >
                                        {statusCfg.label}
                                    </span>
                                </div>

                                <div className="doc-card-body">
                                    <h3 className="doc-title" title={doc.filename}>{doc.filename}</h3>
                                    
                                    <div className="doc-meta-row">
                                        <span>{formatFileSize(doc.file_size)}</span>
                                        <span className="dot-divider">•</span>
                                        <span>{new Date(doc.upload_date).toLocaleDateString()}</span>
                                        {doc.num_chunks > 0 && (
                                            <>
                                                <span className="dot-divider">•</span>
                                                <span className="chunk-pill">{doc.num_chunks} chunks</span>
                                            </>
                                        )}
                                    </div>

                                    {doc.preview_text && (
                                        <p className="doc-preview">
                                            {doc.preview_text}
                                        </p>
                                    )}
                                </div>

                                <div className="doc-card-actions">
                                    {doc.status === 'COMPLETED' && (
                                        <>
                                            <button
                                                className="action-btn chat-action"
                                                onClick={() => navigate(`/chat?doc=${doc.doc_id}`)}
                                                title="Chat with this document"
                                            >
                                                <MessageSquare size={14} />
                                                <span>Chat</span>
                                            </button>

                                            <button
                                                className="action-btn quiz-action"
                                                onClick={() => navigate(`/quiz?doc=${doc.doc_id}`)}
                                                title="Generate quiz from this document"
                                            >
                                                <Sparkles size={14} />
                                                <span>Quiz</span>
                                            </button>

                                            <button
                                                className="action-btn summary-action"
                                                onClick={() => handleOpenSummary(doc)}
                                                title="Generate AI Summary"
                                            >
                                                <FileCheck size={14} />
                                                <span>Summary</span>
                                            </button>
                                        </>
                                    )}

                                    <button
                                        className="icon-action-btn"
                                        onClick={() => handleDownload(doc.doc_id, doc.filename)}
                                        title="Download original file"
                                    >
                                        <Download size={15} />
                                    </button>

                                    <button
                                        className="icon-action-btn delete-action"
                                        onClick={() => handleDelete(doc.doc_id, doc.filename)}
                                        title="Delete document"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* AI Summary Modal */}
            {summaryModalDoc && (
                <div className="modal-backdrop" onClick={() => setSummaryModalDoc(null)}>
                    <div className="summary-modal glass-panel" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title-group">
                                <div className="modal-icon-badge">
                                    <Sparkles size={18} color="var(--primary-light)" />
                                </div>
                                <div>
                                    <h3>Document Summary</h3>
                                    <span className="modal-doc-name">{summaryModalDoc.filename}</span>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setSummaryModalDoc(null)}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {summarizing ? (
                                <div className="summarizing-state">
                                    <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3, margin: '0 auto 1rem' }} />
                                    <p>Analyzing document & generating summary with Groq 70B...</p>
                                </div>
                            ) : (
                                <div className="summary-text-box">
                                    <p>{summaryContent}</p>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={handleCopySummary}
                                disabled={summarizing || !summaryContent}
                            >
                                {copiedSummary ? <Check size={15} color="var(--success)" /> : <Copy size={15} />}
                                <span>{copiedSummary ? 'Copied' : 'Copy Summary'}</span>
                            </button>
                            <button className="btn-primary" onClick={() => setSummaryModalDoc(null)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .documents-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.75rem;
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
                    max-width: 650px;
                }
                .header-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.4rem 0.85rem;
                    background: rgba(99, 102, 241, 0.1);
                    border: 1px solid rgba(99, 102, 241, 0.25);
                    border-radius: var(--radius-full);
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: var(--primary-light);
                }

                /* ─── Dropzone ─── */
                .dropzone-card {
                    background: rgba(18, 26, 45, 0.5);
                    border: 2px dashed rgba(99, 102, 241, 0.3);
                    border-radius: var(--radius-lg);
                    padding: 2.25rem 2rem;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
                    backdrop-filter: blur(12px);
                }
                .dropzone-card:hover, .dropzone-card.dragging {
                    border-color: var(--primary);
                    background: rgba(99, 102, 241, 0.08);
                    transform: translateY(-2px);
                    box-shadow: 0 12px 30px -10px rgba(99, 102, 241, 0.2);
                }
                .dropzone-card.uploading {
                    cursor: wait;
                    border-style: solid;
                    border-color: rgba(99, 102, 241, 0.5);
                }
                .dropzone-inner {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.9rem;
                    max-width: 540px;
                    margin: 0 auto;
                }
                .upload-icon-circle {
                    width: 52px;
                    height: 52px;
                    border-radius: 50%;
                    background: rgba(99, 102, 241, 0.15);
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    color: var(--primary-light);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .upload-instructions {
                    display: flex;
                    flex-direction: column;
                    gap: 0.3rem;
                }
                .upload-primary-text {
                    font-size: 1rem;
                    color: var(--text-primary);
                }
                .upload-primary-text strong {
                    color: var(--primary-light);
                }
                .upload-subtext {
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .supported-formats-pills {
                    display: flex;
                    gap: 0.45rem;
                    margin-top: 0.4rem;
                }
                .format-pill {
                    font-size: 0.72rem;
                    font-weight: 700;
                    padding: 0.15rem 0.55rem;
                    border-radius: 6px;
                    background: rgba(255, 255, 255, 0.05);
                    color: var(--text-secondary);
                    border: 1px solid var(--border);
                }

                /* ─── Toolbar ─── */
                .toolbar-section {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .search-bar-wrapper {
                    position: relative;
                    flex: 1;
                    min-width: 260px;
                    max-width: 420px;
                }
                .search-icon {
                    position: absolute;
                    left: 0.9rem;
                    top: 50%;
                    transform: translateY(-50%);
                    color: var(--text-muted);
                }
                .search-input {
                    width: 100%;
                    padding: 0.65rem 2.2rem 0.65rem 2.4rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    color: var(--text-primary);
                    font-size: 0.88rem;
                    outline: none;
                    transition: all 0.2s;
                }
                .search-input:focus {
                    border-color: var(--primary);
                    background: var(--surface-3);
                }
                .clear-search-btn {
                    position: absolute;
                    right: 0.75rem;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 0.2rem;
                }
                .filter-chips-group {
                    display: flex;
                    gap: 0.4rem;
                }
                .filter-chip {
                    padding: 0.5rem 0.9rem;
                    border-radius: var(--radius);
                    border: 1px solid var(--border);
                    background: var(--surface);
                    color: var(--text-secondary);
                    font-size: 0.82rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .filter-chip:hover {
                    background: var(--surface-2);
                    color: var(--text-primary);
                }
                .filter-chip.active {
                    background: var(--primary);
                    color: #ffffff;
                    border-color: var(--primary);
                    box-shadow: 0 2px 10px rgba(99, 102, 241, 0.35);
                }

                /* ─── Grid ─── */
                .documents-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
                    gap: 1.25rem;
                }
                .doc-card {
                    padding: 1.4rem;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    min-height: 220px;
                    transition: all 0.2s;
                }
                .doc-card:hover {
                    border-color: rgba(99, 102, 241, 0.35);
                    box-shadow: var(--shadow-md);
                    transform: translateY(-2px);
                }
                .doc-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.9rem;
                }
                .file-badge {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.25rem 0.6rem;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    font-weight: 700;
                }
                .status-pill {
                    font-size: 0.72rem;
                    font-weight: 700;
                    padding: 0.2rem 0.55rem;
                    border-radius: 6px;
                }
                .doc-card-body {
                    flex: 1;
                }
                .doc-title {
                    font-size: 1rem;
                    font-weight: 700;
                    color: var(--text-primary);
                    margin-bottom: 0.35rem;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .doc-meta-row {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.78rem;
                    color: var(--text-muted);
                    margin-bottom: 0.8rem;
                }
                .dot-divider {
                    opacity: 0.5;
                }
                .chunk-pill {
                    color: var(--primary-light);
                    font-weight: 600;
                }
                .doc-preview {
                    font-size: 0.84rem;
                    color: var(--text-secondary);
                    line-height: 1.5;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    margin-bottom: 1.1rem;
                }
                .doc-card-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                    padding-top: 0.9rem;
                    border-top: 1px solid var(--border-subtle);
                }
                .action-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.45rem 0.75rem;
                    border-radius: 8px;
                    border: 1px solid var(--border);
                    background: var(--surface-2);
                    color: var(--text-primary);
                    font-size: 0.78rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.15s;
                    text-decoration: none;
                }
                .action-btn:hover {
                    background: var(--surface-3);
                    border-color: rgba(255, 255, 255, 0.2);
                    transform: translateY(-1px);
                }
                .chat-action:hover {
                    color: #0ea5e9;
                    border-color: rgba(14, 165, 233, 0.4);
                }
                .quiz-action:hover {
                    color: #f59e0b;
                    border-color: rgba(245, 158, 11, 0.4);
                }
                .summary-action:hover {
                    color: #8b5cf6;
                    border-color: rgba(139, 92, 246, 0.4);
                }
                .icon-action-btn {
                    padding: 0.45rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    color: var(--text-secondary);
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.15s;
                    margin-left: auto;
                }
                .icon-action-btn:hover {
                    background: var(--surface-3);
                    color: var(--text-primary);
                }
                .delete-action {
                    margin-left: 0;
                }
                .delete-action:hover {
                    background: rgba(244, 63, 94, 0.12);
                    color: var(--error);
                    border-color: rgba(244, 63, 94, 0.3);
                }

                .doc-card-skeleton {
                    padding: 1.4rem;
                }
                .skeleton-header {
                    display: flex;
                    justify-content: space-between;
                }
                .empty-docs-state {
                    padding: 3.5rem 2rem;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 0.6rem;
                }
                .empty-state-icon {
                    font-size: 3rem;
                    margin-bottom: 0.4rem;
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
                .summary-modal {
                    width: 100%;
                    max-width: 620px;
                    border: 1px solid rgba(99, 102, 241, 0.3);
                    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
                    border-radius: var(--radius-lg);
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
                    gap: 0.75rem;
                }
                .modal-icon-badge {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    background: rgba(99, 102, 241, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .modal-header h3 {
                    font-size: 1.1rem;
                    font-weight: 700;
                    color: #ffffff;
                }
                .modal-doc-name {
                    font-size: 0.76rem;
                    color: var(--text-muted);
                }
                .modal-close-btn {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 0.3rem;
                    border-radius: 6px;
                }
                .modal-close-btn:hover {
                    color: var(--text-primary);
                    background: var(--surface-2);
                }
                .modal-body {
                    padding: 1.5rem;
                    max-height: 420px;
                    overflow-y: auto;
                }
                .summarizing-state {
                    text-align: center;
                    padding: 2.5rem 1rem;
                    color: var(--text-secondary);
                }
                .summary-text-box {
                    background: var(--surface-2);
                    border-radius: var(--radius);
                    padding: 1.25rem;
                    font-size: 0.92rem;
                    line-height: 1.7;
                    color: var(--text-primary);
                    white-space: pre-wrap;
                    border: 1px solid var(--border);
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

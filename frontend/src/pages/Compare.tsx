import { useState, useEffect, useCallback } from 'react';
import { analysisAPI, documentsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
    Scale,
    Sparkles,
    FileText,
    Check,
    Download,
    Copy,
    Sliders,
    Diff
} from 'lucide-react';

export default function Compare() {
    const toast = useToast();
    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [focusArea, setFocusArea] = useState('');
    const [comparing, setComparing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [copied, setCopied] = useState(false);

    const fetchDocuments = useCallback(async () => {
        try {
            const { data } = await documentsAPI.list({ page_size: 50 });
            setDocuments(data.documents.filter((d: any) => d.status === 'COMPLETED'));
        } catch { }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const toggleDocSelection = (docId: string) => {
        setSelectedDocIds(prev => {
            if (prev.includes(docId)) {
                return prev.filter(id => id !== docId);
            } else {
                if (prev.length >= 5) {
                    toast.warning('Limit reached', 'You can compare up to 5 documents simultaneously.');
                    return prev;
                }
                return [...prev, docId];
            }
        });
    };

    const runComparison = async () => {
        if (selectedDocIds.length < 2) {
            toast.warning('Select 2+ documents', 'Please select at least 2 documents to compare.');
            return;
        }

        setComparing(true);
        setResult(null);

        try {
            const { data } = await analysisAPI.compareDocuments(selectedDocIds, focusArea);
            setResult(data);
            toast.success('Comparison generated!', `Synthesized ${data.document_names.length} documents.`);
        } catch (err: any) {
            toast.error('Comparison failed', err.response?.data?.detail);
        } finally {
            setComparing(false);
        }
    };

    const handleCopyMarkdown = () => {
        if (!result) return;
        const comp = result.comparison;

        let md = `# Multi-Document Comparison Matrix\n`;
        md += `**Compared Documents:** ${result.document_names.join(', ')}\n\n`;
        md += `## Executive Overview\n${comp.overview}\n\n`;
        md += `## Comparison Matrix\n\n`;

        // Table Header
        const headers = ['Dimension', ...result.document_names, 'Synthesis'];
        md += `| ${headers.join(' | ')} |\n`;
        md += `| ${headers.map(() => '---').join(' | ')} |\n`;

        // Table Rows
        comp.dimensions.forEach((dim: any) => {
            const row = [
                dim.dimension,
                ...result.document_names.map((name: string) => dim.values[name] || '—'),
                dim.synthesis || '—'
            ];
            md += `| ${row.join(' | ')} |\n`;
        });

        if (comp.key_differences && comp.key_differences.length > 0) {
            md += `\n## Key Differences\n` + comp.key_differences.map((d: string) => `- ${d}`).join('\n') + '\n';
        }

        if (comp.common_elements && comp.common_elements.length > 0) {
            md += `\n## Common Elements\n` + comp.common_elements.map((s: string) => `- ${s}`).join('\n') + '\n';
        }

        if (comp.conclusion) {
            md += `\n## Conclusion & Recommendations\n${comp.conclusion}\n`;
        }

        navigator.clipboard.writeText(md);
        setCopied(true);
        toast.success('Comparison Markdown copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownloadMarkdown = () => {
        if (!result) return;
        handleCopyMarkdown();
        const blob = new Blob([navigator.clipboard ? '' : ''], { type: 'text/markdown' });
        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Comparison_Matrix.md`);
        document.body.appendChild(link);
        link.click();
        link.parentNode?.removeChild(link);
    };

    return (
        <div className="compare-page-container animate-slide-up">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Multi-Document Comparison Matrix</h1>
                    <p className="page-subtitle">
                        Cross-analyze 2 to 5 documents simultaneously to uncover key differences, similarities, and contradictions.
                    </p>
                </div>
            </div>

            {/* Document Selection Card */}
            <div className="compare-setup-card glass-panel">
                <div className="setup-header">
                    <div className="setup-icon-badge">
                        <Scale size={20} color="var(--primary-light)" />
                    </div>
                    <div>
                        <h3>Select Documents to Compare</h3>
                        <p>Choose 2 to 5 indexed documents ({selectedDocIds.length} selected)</p>
                    </div>
                </div>

                <div className="doc-select-grid">
                    {documents.length === 0 ? (
                        <p className="no-docs-text">No processed documents found. Upload documents first.</p>
                    ) : documents.map(doc => {
                        const isSelected = selectedDocIds.includes(doc.doc_id);
                        return (
                            <div
                                key={doc.doc_id}
                                className={`doc-select-chip glass-panel ${isSelected ? 'selected' : ''}`}
                                onClick={() => toggleDocSelection(doc.doc_id)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className={`select-check-circle ${isSelected ? 'checked' : ''}`}>
                                    {isSelected && <Check size={12} />}
                                </div>
                                <FileText size={16} color="var(--primary-light)" />
                                <div className="doc-chip-meta">
                                    <span className="doc-chip-title">{doc.filename}</span>
                                    <span className="doc-chip-type">{doc.file_type}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="focus-input-group">
                    <label className="focus-label">
                        <Sliders size={14} />
                        <span>Comparison Focus / Custom Dimensions (Optional)</span>
                    </label>
                    <input
                        type="text"
                        placeholder="e.g. Focus on pricing models, architectural trade-offs, and security risks"
                        value={focusArea}
                        onChange={e => setFocusArea(e.target.value)}
                        className="input-field"
                    />
                </div>

                <div className="setup-actions-bar">
                    <button
                        className="btn-primary compare-btn"
                        onClick={runComparison}
                        disabled={selectedDocIds.length < 2 || comparing}
                    >
                        {comparing ? (
                            <>
                                <div className="spinner" style={{ width: 16, height: 16 }} />
                                <span>Synthesizing Matrix with Groq 70B...</span>
                            </>
                        ) : (
                            <>
                                <Scale size={16} />
                                <span>Generate Comparison Matrix</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Results Presentation */}
            {result && (() => {
                const comp = result.comparison;

                return (
                    <div className="comparison-results-container animate-slide-up">
                        {/* Executive Overview Hero */}
                        <div className="overview-hero-card glass-panel">
                            <div className="overview-top-bar">
                                <div className="overview-badge">
                                    <Sparkles size={14} color="var(--primary-light)" />
                                    <span>Executive Synthesis</span>
                                </div>

                                <div className="overview-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button className="btn-secondary" onClick={handleCopyMarkdown}>
                                        {copied ? <Check size={14} color="var(--success)" /> : <Copy size={14} />}
                                        <span>{copied ? 'Copied' : 'Copy'}</span>
                                    </button>
                                    <button className="btn-secondary" onClick={handleDownloadMarkdown} title="Download Markdown file">
                                        <Download size={14} />
                                        <span>Download .md</span>
                                    </button>
                                </div>
                            </div>

                            <p className="overview-text">{comp.overview}</p>
                        </div>

                        {/* Comparison Matrix Table */}
                        <div className="matrix-table-card glass-panel">
                            <div className="matrix-table-header">
                                <h3>Structured Comparison Table</h3>
                            </div>

                            <div className="matrix-table-wrapper">
                                <table className="comparison-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '18%' }}>Dimension</th>
                                            {result.document_names.map((name: string, i: number) => (
                                                <th key={i}>{name}</th>
                                            ))}
                                            <th style={{ width: '25%' }}>Synthesis / Contrast</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {comp.dimensions?.map((dim: any, i: number) => (
                                            <tr key={i}>
                                                <td className="dimension-col">
                                                    <strong>{dim.dimension}</strong>
                                                </td>
                                                {result.document_names.map((name: string, j: number) => (
                                                    <td key={j} className="doc-value-col">
                                                        {dim.values?.[name] || '—'}
                                                    </td>
                                                ))}
                                                <td className="synthesis-col">
                                                    {dim.synthesis || '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Differences & Similarities Dual Cards */}
                        <div className="contrast-dual-grid">
                            {comp.key_differences && (
                                <div className="contrast-card glass-panel differences">
                                    <h4 className="contrast-title diff-title">
                                        <Diff size={16} /> Key Differences & Distinctions
                                    </h4>
                                    <ul className="contrast-list">
                                        {comp.key_differences.map((diff: string, i: number) => (
                                            <li key={i}>{diff}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {comp.common_elements && (
                                <div className="contrast-card glass-panel similarities">
                                    <h4 className="contrast-title sim-title">
                                        <Check size={16} /> Shared & Common Elements
                                    </h4>
                                    <ul className="contrast-list">
                                        {comp.common_elements.map((sim: string, i: number) => (
                                            <li key={i}>{sim}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Conclusion Card */}
                        {comp.conclusion && (
                            <div className="conclusion-card glass-panel">
                                <h4>💡 Actionable Takeaways & Conclusions</h4>
                                <p>{comp.conclusion}</p>
                            </div>
                        )}
                    </div>
                );
            })()}

            <style>{`
                .compare-page-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.75rem;
                    max-width: 1100px;
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

                .compare-setup-card {
                    padding: 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .setup-header {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                }
                .setup-icon-badge {
                    width: 44px;
                    height: 44px;
                    border-radius: var(--radius);
                    background: rgba(99, 102, 241, 0.15);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .setup-header h3 {
                    font-size: 1.2rem;
                    color: #ffffff;
                    margin-bottom: 0.2rem;
                }
                .setup-header p {
                    font-size: 0.84rem;
                    color: var(--text-muted);
                }

                .doc-select-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
                    gap: 0.75rem;
                    max-height: 240px;
                    overflow-y: auto;
                    padding: 0.25rem;
                }
                .doc-select-chip {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    padding: 0.75rem 0.9rem;
                    cursor: pointer;
                    transition: all 0.15s;
                    border: 1px solid var(--border);
                }
                .doc-select-chip:hover {
                    border-color: rgba(99, 102, 241, 0.35);
                    background: var(--surface-2);
                }
                .doc-select-chip.selected {
                    background: rgba(99, 102, 241, 0.15);
                    border-color: var(--primary);
                }
                .select-check-circle {
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    border: 1px solid var(--border);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .select-check-circle.checked {
                    background: var(--primary);
                    border-color: var(--primary);
                    color: #ffffff;
                }
                .doc-chip-meta {
                    min-width: 0;
                    flex: 1;
                }
                .doc-chip-title {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    display: block;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .doc-chip-type {
                    font-size: 0.72rem;
                    color: var(--text-muted);
                }

                .focus-input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.45rem;
                }
                .focus-label {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.84rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .setup-actions-bar {
                    display: flex;
                    justify-content: flex-end;
                }
                .compare-btn {
                    padding: 0.8rem 1.6rem;
                    font-size: 0.94rem;
                }

                /* ─── Results View ─── */
                .comparison-results-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .overview-hero-card {
                    padding: 1.75rem 2rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.85rem;
                }
                .overview-top-bar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .overview-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.2rem 0.6rem;
                    border-radius: var(--radius-full);
                    background: rgba(99, 102, 241, 0.12);
                    border: 1px solid rgba(99, 102, 241, 0.25);
                    font-size: 0.76rem;
                    font-weight: 700;
                    color: var(--primary-light);
                }
                .overview-text {
                    font-size: 0.98rem;
                    color: var(--text-primary);
                    line-height: 1.65;
                }

                /* ─── Table ─── */
                .matrix-table-card {
                    padding: 1.75rem;
                    overflow: hidden;
                }
                .matrix-table-header h3 {
                    font-size: 1.15rem;
                    color: #ffffff;
                    margin-bottom: 1rem;
                }
                .matrix-table-wrapper {
                    overflow-x: auto;
                }
                .comparison-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                    font-size: 0.88rem;
                }
                .comparison-table th {
                    padding: 0.85rem 1rem;
                    background: var(--surface-2);
                    color: var(--text-primary);
                    font-weight: 700;
                    border-bottom: 1px solid var(--border);
                }
                .comparison-table td {
                    padding: 1rem;
                    border-bottom: 1px solid var(--border-subtle);
                    vertical-align: top;
                    line-height: 1.55;
                }
                .dimension-col {
                    color: var(--primary-light);
                }
                .doc-value-col {
                    color: var(--text-secondary);
                }
                .synthesis-col {
                    color: var(--text-primary);
                    background: rgba(255, 255, 255, 0.02);
                }

                /* ─── Contrast Dual ─── */
                .contrast-dual-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }
                .contrast-card {
                    padding: 1.5rem;
                }
                .contrast-title {
                    font-size: 1rem;
                    margin-bottom: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                }
                .diff-title { color: #f43f5e; }
                .sim-title { color: #10b981; }
                .contrast-list {
                    padding-left: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    font-size: 0.88rem;
                    color: var(--text-secondary);
                    line-height: 1.55;
                }

                .conclusion-card {
                    padding: 1.5rem 1.75rem;
                    border-left: 3px solid var(--primary);
                }
                .conclusion-card h4 {
                    font-size: 1.05rem;
                    color: #ffffff;
                    margin-bottom: 0.4rem;
                }
                .conclusion-card p {
                    font-size: 0.9rem;
                    color: var(--text-secondary);
                    line-height: 1.6;
                }

                @media (max-width: 768px) {
                    .contrast-dual-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  FileText,
  MessageSquare,
  Upload,
  BarChart3,
  Sparkles,
  Clock,
  ChevronRight,
  ArrowUpRight,
  Layers,
  Scale,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    documents: 0,
    conversations: 0,
    quizzes: 0,
    flashcards: 0,
    analysis: 0,
    recent_documents: [] as any[],
    recent_conversations: [] as any[],
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await dashboardAPI.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const statCards = [
    {
      label: 'Total Documents',
      value: stats.documents,
      subtext: 'Indexed in ChromaDB',
      icon: <FileText size={22} />,
      color: '#6366f1',
      glow: 'rgba(99, 102, 241, 0.15)',
      path: '/documents',
    },
    {
      label: 'AI Conversations',
      value: stats.conversations,
      subtext: 'RAG Knowledge Chat',
      icon: <MessageSquare size={22} />,
      color: '#0ea5e9',
      glow: 'rgba(14, 165, 233, 0.15)',
      path: '/chat',
    },
    {
      label: 'Flashcard Decks',
      value: stats.flashcards,
      subtext: 'Spaced repetition SM-2',
      icon: <Layers size={22} />,
      color: '#8b5cf6',
      glow: 'rgba(139, 92, 246, 0.15)',
      path: '/flashcards',
    },
    {
      label: 'Quizzes Created',
      value: stats.quizzes,
      subtext: 'Auto-assessed MCQs',
      icon: <Sparkles size={22} />,
      color: '#f59e0b',
      glow: 'rgba(245, 158, 11, 0.15)',
      path: '/quiz',
    },
  ];

  const quickActions = [
    {
      icon: <Upload size={22} />,
      title: 'Upload / Ingest URL',
      description: 'PDF, DOCX, TXT, OCR Images, Web Articles & YouTube',
      color: '#6366f1',
      badge: 'Web & Video',
      path: '/documents',
    },
    {
      icon: <MessageSquare size={22} />,
      title: 'Ask AI Documents',
      description: 'Query multiple documents with grounded citations',
      color: '#0ea5e9',
      badge: 'Hybrid RAG',
      path: '/chat',
    },
    {
      icon: <Layers size={22} />,
      title: 'AI Flashcards',
      description: 'Active recall & spaced repetition flashcard decks',
      color: '#8b5cf6',
      badge: 'SM-2 Anki',
      path: '/flashcards',
    },
    {
      icon: <Scale size={22} />,
      title: 'Compare 2+ Docs',
      description: 'Side-by-side synthesis matrix & difference analysis',
      color: '#ec4899',
      badge: 'Synthesis',
      path: '/compare',
    },
    {
      icon: <Sparkles size={22} />,
      title: 'Generate Assessment',
      description: 'Auto-generate timed quizzes with difficulty breakdown',
      color: '#f59e0b',
      badge: 'Interactive',
      path: '/quiz',
    },
    {
      icon: <BarChart3 size={22} />,
      title: 'Sentiment Analyzer',
      description: 'Instant tone & emotion analysis with confidence scoring',
      color: '#10b981',
      badge: 'Fast',
      path: '/sentiment',
    },
  ];

  const fileTypeIcon: Record<string, string> = {
    PDF: '📄', DOCX: '📝', TXT: '📃', IMAGE: '🖼️',
  };

  const statusColor: Record<string, { color: string; bg: string }> = {
    COMPLETED: { color: 'var(--success)', bg: 'rgba(16, 185, 129, 0.12)' },
    PROCESSING: { color: 'var(--warning)', bg: 'rgba(245, 158, 11, 0.12)' },
    FAILED: { color: 'var(--error)', bg: 'rgba(244, 63, 94, 0.12)' },
  };

  return (
    <div className="dashboard-layout animate-slide-up">
      {/* Hero Welcome Banner */}
      <section className="welcome-banner">
        <div className="banner-content">
          <div className="banner-tag">
            <span className="sparkle-icon">✨</span>
            <span>UniMind Knowledge Hub</span>
          </div>
          <h1>
            {getGreeting()}, <span className="highlight-text">{user?.full_name?.split(' ')[0] || 'Explorer'}</span>
          </h1>
          <p>
            Your intelligent workspace is connected. Search documents with hybrid retrieval, generate interactive quizzes, or transcribe audio notes.
          </p>
        </div>
        <div className="banner-actions">
          <button className="btn-primary" onClick={() => navigate('/documents')}>
            <Upload size={17} />
            <span>Upload Document</span>
          </button>
          <button className="btn-secondary" onClick={() => navigate('/chat')}>
            <MessageSquare size={17} />
            <span>Start Chat</span>
          </button>
        </div>
      </section>

      {/* KPI Stats Grid */}
      <section className="stats-section">
        <div className="stats-grid">
          {statCards.map((stat, i) => (
            <div 
              key={i} 
              className="stat-card glass-panel"
              onClick={() => navigate(stat.path)}
              role="button"
              tabIndex={0}
            >
              <div className="stat-header">
                <div className="stat-icon-wrapper" style={{ background: stat.glow, color: stat.color }}>
                  {stat.icon}
                </div>
                <ArrowUpRight size={16} className="stat-arrow" />
              </div>
              <div className="stat-body">
                {loading ? (
                  <div className="skeleton" style={{ height: 32, width: '45%', marginBottom: 6 }} />
                ) : (
                  <div className="stat-number">{stat.value}</div>
                )}
                <div className="stat-title">{stat.label}</div>
                <div className="stat-subtext">{stat.subtext}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Action Hub */}
      <section className="actions-section">
        <div className="section-header">
          <div>
            <h2>Quick Actions</h2>
            <p>Direct shortcuts to high-impact AI tools</p>
          </div>
        </div>

        <div className="actions-grid">
          {quickActions.map((action, i) => (
            <div
              key={i}
              className="action-card glass-card-interactive"
              onClick={() => navigate(action.path)}
              role="button"
              tabIndex={0}
            >
              <div className="action-top">
                <div 
                  className="action-icon-pill" 
                  style={{ background: `${action.color}15`, color: action.color, border: `1px solid ${action.color}30` }}
                >
                  {action.icon}
                </div>
                <span className="action-badge">{action.badge}</span>
              </div>
              <div className="action-body">
                <h3>{action.title}</h3>
                <p>{action.description}</p>
              </div>
              <div className="action-footer">
                <span>Launch tool</span>
                <ChevronRight size={14} className="action-chevron" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity Dual Cards */}
      <section className="activity-section">
        <div className="section-header">
          <div>
            <h2>Recent Activity</h2>
            <p>Your latest documents and chat sessions</p>
          </div>
        </div>

        <div className="activity-grid">
          {/* Documents Stream */}
          <div className="activity-card glass-panel">
            <div className="card-top-bar">
              <div className="card-title-group">
                <FileText size={18} color="var(--primary-light)" />
                <h3>Recent Documents</h3>
              </div>
              <button className="view-all-link" onClick={() => navigate('/documents')}>
                View all ({stats.documents})
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="activity-list">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="activity-item-skeleton">
                    <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 4 }} />
                      <div className="skeleton" style={{ height: 11, width: '40%' }} />
                    </div>
                  </div>
                ))
              ) : stats.recent_documents.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📁</span>
                  <p>No documents uploaded yet</p>
                  <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => navigate('/documents')}>
                    Upload first document
                  </button>
                </div>
              ) : (
                stats.recent_documents.map((doc: any) => {
                  const s = statusColor[doc.status] || { color: 'var(--text-muted)', bg: 'transparent' };
                  return (
                    <div
                      key={doc.doc_id}
                      className="activity-item"
                      onClick={() => navigate('/documents')}
                    >
                      <span className="file-type-icon">{fileTypeIcon[doc.file_type] || '📄'}</span>
                      <div className="item-details">
                        <div className="item-primary">{doc.filename}</div>
                        <div className="item-secondary">
                          {new Date(doc.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                      <span 
                        className="status-badge" 
                        style={{ color: s.color, background: s.bg, border: `1px solid ${s.color}30` }}
                      >
                        {doc.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Conversations Stream */}
          <div className="activity-card glass-panel">
            <div className="card-top-bar">
              <div className="card-title-group">
                <MessageSquare size={18} color="var(--secondary)" />
                <h3>Recent AI Chats</h3>
              </div>
              <button className="view-all-link" onClick={() => navigate('/chat')}>
                Open chat ({stats.conversations})
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="activity-list">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="activity-item-skeleton">
                    <div className="skeleton" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 4 }} />
                      <div className="skeleton" style={{ height: 11, width: '50%' }} />
                    </div>
                  </div>
                ))
              ) : stats.recent_conversations.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">💬</span>
                  <p>No conversations started yet</p>
                  <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => navigate('/chat')}>
                    Start first chat
                  </button>
                </div>
              ) : (
                stats.recent_conversations.map((conv: any) => (
                  <div
                    key={conv.conversation_id}
                    className="activity-item"
                    onClick={() => navigate('/chat')}
                  >
                    <div className="chat-avatar-icon">
                      <MessageSquare size={15} color="#0ea5e9" />
                    </div>
                    <div className="item-details">
                      <div className="item-primary">{conv.title}</div>
                      <div className="item-secondary">
                        <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                        {new Date(conv.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <ChevronRight size={15} className="item-chevron" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .dashboard-layout {
          display: flex;
          flex-direction: column;
          gap: 2.5rem;
          width: 100%;
        }

        /* ─── Welcome Banner ─── */
        .welcome-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 2rem;
          padding: 2.2rem 2.5rem;
          background: linear-gradient(135deg, rgba(26, 37, 62, 0.8) 0%, rgba(18, 26, 45, 0.9) 100%);
          border: 1px solid rgba(99, 102, 241, 0.2);
          border-radius: var(--radius-lg);
          box-shadow: 0 12px 36px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }
        .welcome-banner::after {
          content: '';
          position: absolute;
          top: -50%;
          right: -10%;
          width: 350px;
          height: 350px;
          background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
          pointer-events: none;
        }
        .banner-content {
          max-width: 620px;
          position: relative;
          z-index: 1;
        }
        .banner-tag {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.25rem 0.75rem;
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: var(--radius-full);
          font-size: 0.76rem;
          font-weight: 700;
          color: var(--primary-light);
          margin-bottom: 0.8rem;
          letter-spacing: 0.03em;
        }
        .welcome-banner h1 {
          font-size: 1.95rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.25;
          margin-bottom: 0.6rem;
        }
        .highlight-text {
          background: linear-gradient(135deg, #818cf8 0%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .welcome-banner p {
          color: var(--text-secondary);
          font-size: 0.94rem;
          line-height: 1.6;
        }
        .banner-actions {
          display: flex;
          gap: 0.85rem;
          flex-shrink: 0;
          position: relative;
          z-index: 1;
        }

        /* ─── Stats Grid ─── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
          gap: 1.25rem;
        }
        .stat-card {
          padding: 1.5rem;
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        .stat-card:hover {
          transform: translateY(-3px);
          border-color: rgba(99, 102, 241, 0.35);
          box-shadow: var(--shadow-md);
        }
        .stat-card:hover .stat-arrow {
          opacity: 1;
          transform: translate(2px, -2px);
        }
        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.2rem;
        }
        .stat-icon-wrapper {
          width: 44px;
          height: 44px;
          border-radius: var(--radius);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-arrow {
          color: var(--text-muted);
          opacity: 0.5;
          transition: all 0.2s;
        }
        .stat-number {
          font-size: 1.9rem;
          font-weight: 800;
          color: #ffffff;
          line-height: 1;
          margin-bottom: 0.4rem;
          font-feature-settings: 'tnum';
        }
        .stat-title {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.2rem;
        }
        .stat-subtext {
          font-size: 0.76rem;
          color: var(--text-muted);
        }

        /* ─── Section Header ─── */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 1.25rem;
        }
        .section-header h2 {
          font-size: 1.35rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 0.2rem;
        }
        .section-header p {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        /* ─── Actions Grid ─── */
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.25rem;
        }
        .action-card {
          padding: 1.5rem;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 200px;
        }
        .action-card:hover .action-chevron {
          transform: translateX(4px);
          color: var(--primary-light);
        }
        .action-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.2rem;
        }
        .action-icon-pill {
          width: 44px;
          height: 44px;
          border-radius: var(--radius);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .action-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          border: 1px solid var(--border);
        }
        .action-body h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 0.4rem;
        }
        .action-body p {
          font-size: 0.84rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
        .action-footer {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-muted);
          margin-top: 1.2rem;
          padding-top: 0.8rem;
          border-top: 1px solid var(--border-subtle);
        }
        .action-chevron {
          transition: transform 0.2s;
        }

        /* ─── Activity Grid ─── */
        .activity-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 1.5rem;
        }
        .activity-card {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
        }
        .card-top-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.25rem;
          padding-bottom: 0.9rem;
          border-bottom: 1px solid var(--border);
        }
        .card-title-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .card-title-group h3 {
          font-size: 1rem;
          font-weight: 700;
          color: #ffffff;
        }
        .view-all-link {
          background: none;
          border: none;
          color: var(--primary-light);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-family: inherit;
        }
        .view-all-link:hover {
          text-decoration: underline;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .activity-item {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.75rem 0.85rem;
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .activity-item:hover {
          background: var(--surface-2);
          border-color: var(--border);
          transform: translateX(2px);
        }
        .file-type-icon {
          font-size: 1.4rem;
          line-height: 1;
        }
        .chat-avatar-icon {
          width: 34px;
          height: 34px;
          border-radius: var(--radius-sm);
          background: rgba(14, 165, 233, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .item-details {
          flex: 1;
          min-width: 0;
        }
        .item-primary {
          font-size: 0.88rem;
          font-weight: 600;
          color: var(--text-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          margin-bottom: 0.15rem;
        }
        .item-secondary {
          font-size: 0.75rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }
        .status-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 6px;
        }
        .item-chevron {
          color: var(--text-muted);
        }

        .activity-item-skeleton {
          display: flex;
          align-items: center;
          gap: 0.85rem;
          padding: 0.75rem;
        }
        .empty-state {
          text-align: center;
          padding: 2.5rem 1rem;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.6rem;
        }
        .empty-icon {
          font-size: 2.2rem;
          margin-bottom: 0.2rem;
        }

        /* ─── Responsive ─── */
        @media (max-width: 900px) {
          .welcome-banner {
            flex-direction: column;
            align-items: flex-start;
            padding: 1.5rem;
          }
          .banner-actions {
            width: 100%;
            flex-direction: column;
          }
          .welcome-banner h1 {
            font-size: 1.6rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;

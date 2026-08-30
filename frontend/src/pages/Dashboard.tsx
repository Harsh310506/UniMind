import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  FileText,
  MessageSquare,
  Upload,
  BarChart3,
  Mic,
  Plus,
  Sparkles,
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = React.useState({
    documents: 0,
    conversations: 0,
    quizzes: 0,
    analysis: 0,
  });

  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await dashboardAPI.getStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      }
    };
    fetchStats();
  }, []);

  const quickActions = [
    {
      icon: <Upload size={24} />,
      title: 'Upload Document',
      description: 'PDF, DOCX, TXT, or Image',
      color: '#6366f1',
      path: '/documents',
    },
    {
      icon: <MessageSquare size={24} />,
      title: 'Start Chat',
      description: 'Chat with your documents',
      color: '#0ea5e9',
      path: '/chat',
    },
    {
      icon: <Sparkles size={24} />,
      title: 'Generate Quiz',
      description: 'Auto-generate assessments',
      color: '#f59e0b',
      path: '/quiz',
    },
    {
      icon: <BarChart3 size={24} />,
      title: 'Sentiment Analysis',
      description: 'Analyze text sentiment',
      color: '#22c55e',
      path: '/sentiment',
    },
    {
      icon: <Mic size={24} />,
      title: 'Speech to Text',
      description: 'Transcribe audio files',
      color: '#ec4899',
      path: '/speech',
    },
    {
      icon: <FileText size={24} />,
      title: 'Summarize',
      description: 'Get document summaries',
      color: '#8b5cf6',
      path: '/documents',
    },
  ];

  return (
    <div className="dashboard-content">
      {/* Header */}
      <header className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.full_name?.split(' ')[0] || 'User'} 👋</h1>
          <p>Here's what's happening with your documents</p>
        </div>
        <div className="header-actions">
          <button className="primary-btn" onClick={() => navigate('/documents')}>
            <Plus size={18} /> Upload Document
          </button>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="stats-grid">
        {[
          { label: 'Documents', value: stats.documents, icon: <FileText size={20} />, color: '#6366f1' },
          { label: 'Conversations', value: stats.conversations, icon: <MessageSquare size={20} />, color: '#0ea5e9' },
          { label: 'Quizzes', value: stats.quizzes, icon: <Sparkles size={20} />, color: '#f59e0b' },
          { label: 'Analysis', value: stats.analysis, icon: <BarChart3 size={20} />, color: '#22c55e' },
        ].map((stat, i) => (
          <div key={i} className="stat-card glass">
            <div className="stat-icon" style={{ background: `${stat.color}20`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <h2 className="section-title">Quick Actions</h2>
      <div className="actions-grid">
        {quickActions.map((action, i) => (
          <button
            key={i}
            className="action-card glass"
            onClick={() => navigate(action.path)}
          >
            <div className="action-icon" style={{ background: `${action.color}15`, color: action.color }}>
              {action.icon}
            </div>
            <h3>{action.title}</h3>
            <p>{action.description}</p>
          </button>
        ))}
      </div>

      <style>{`
        .dashboard-content {
          width: 100%;
        }
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        .dashboard-header h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          color: var(--text-primary);
        }
        .dashboard-header p {
          color: var(--text-secondary);
          font-size: 0.95rem;
        }
        .primary-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.25rem;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 0.9rem;
          font-weight: 600;
          font-family: var(--font-sans);
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          white-space: nowrap;
        }
        .primary-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3);
        }

        /* ─── Stats Grid ─── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }
        .stat-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.5rem;
          border-radius: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          transition: transform 0.15s;
        }
        .stat-card:hover {
          transform: translateY(-2px);
        }
        .stat-icon {
          width: 48px; height: 48px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
        }
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          display: block;
          color: var(--text-primary);
        }
        .stat-label {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        /* ─── Actions Grid ─── */
        .section-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: var(--text-primary);
        }
        .actions-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1.5rem;
        }
        .action-card {
          padding: 1.5rem;
          border-radius: 16px;
          background: var(--surface);
          border: 1px solid var(--border);
          text-align: left;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          font-family: var(--font-sans);
        }
        .action-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.1);
          border-color: var(--primary);
        }
        .action-icon {
          width: 52px; height: 52px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 1rem;
        }
        .action-card h3 {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.3rem;
        }
        .action-card p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .dashboard-header { flex-direction: column; gap: 1rem; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SpotlightSearch from './SpotlightSearch';
import Logo from './Logo';
import {
    LayoutDashboard,
    FileText,
    MessageSquare,
    Sparkles,
    BarChart3,
    Mic,
    LogOut,
    Menu,
    X,
    Settings,
    ChevronRight,
    Zap,
    Layers,
    Scale,
    Search
} from 'lucide-react';

const Layout: React.FC = () => {
    const { logout, user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const navItems = [
        { icon: <LayoutDashboard size={19} />, label: 'Dashboard', path: '/dashboard', badge: null },
        { icon: <FileText size={19} />, label: 'Documents', path: '/documents', badge: null },
        { icon: <MessageSquare size={19} />, label: 'AI Chat', path: '/chat', badge: 'RAG' },
        { icon: <Layers size={19} />, label: 'Flashcards', path: '/flashcards', badge: 'SM-2' },
        { icon: <Sparkles size={19} />, label: 'Quizzes', path: '/quiz', badge: null },
        { icon: <Scale size={19} />, label: 'Compare Docs', path: '/compare', badge: null },
        { icon: <BarChart3 size={19} />, label: 'Sentiment', path: '/sentiment', badge: null },
        { icon: <Mic size={19} />, label: 'Speech-to-Text', path: '/speech', badge: 'Whisper' },
        { icon: <Settings size={19} />, label: 'Settings', path: '/settings', badge: null },
    ];

    const currentNav = navItems.find(item => item.path === location.pathname) || { label: 'UniMind' };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Global keyboard shortcut for Spotlight Search (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setSearchOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="app-layout">
            {/* Global Spotlight Search Modal */}
            <SpotlightSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

            {/* Mobile Top Header */}
            <header className="mobile-header">
                <div className="brand-logo" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
                    <Logo size="sm" />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button className="mobile-toggle-btn" onClick={() => setSearchOpen(true)} aria-label="Search">
                        <Search size={18} />
                    </button>
                    <button className="mobile-toggle-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle Navigation">
                        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>
                </div>
            </header>

            {/* Backdrop for mobile */}
            {mobileMenuOpen && (
                <div className="mobile-backdrop" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Sidebar Navigation */}
            <aside className={`sidebar-container ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header" onClick={() => navigate('/dashboard')} role="button" tabIndex={0}>
                    <Logo size="md" showSubtitle={true} />
                </div>

                <div className="nav-section-label">PLATFORM</div>

                <nav className="sidebar-nav-list">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`nav-link ${isActive ? 'active' : ''}`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span className="nav-label">{item.label}</span>
                                {item.badge && (
                                    <span className="nav-badge">{item.badge}</span>
                                )}
                                {isActive && <span className="active-indicator" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="sidebar-footer-container">
                    {/* User profile card */}
                    <div 
                        className="user-profile-card"
                        onClick={() => { navigate('/settings'); setMobileMenuOpen(false); }}
                        title="Open Settings"
                    >
                        <div className="user-avatar-pill">
                            {(user?.full_name?.[0] || 'U').toUpperCase()}
                        </div>
                        <div className="user-meta">
                            <div className="user-name">{user?.full_name || 'User'}</div>
                            <div className="user-email">{user?.email || 'user@unimind.ai'}</div>
                        </div>
                        <ChevronRight size={14} className="user-arrow" />
                    </div>

                    <button onClick={handleLogout} className="sidebar-logout-btn">
                        <LogOut size={16} />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* Main Application Area */}
            <div className="main-viewport">
                {/* Desktop Topbar */}
                <header className="topbar">
                    <div className="topbar-breadcrumbs">
                        <span className="breadcrumb-app">UniMind</span>
                        <ChevronRight size={14} className="breadcrumb-separator" />
                        <span className="breadcrumb-current">{currentNav.label}</span>
                    </div>

                    <div className="topbar-actions">
                        {/* Spotlight Search Trigger Button */}
                        <button className="topbar-search-btn glass-panel" onClick={() => setSearchOpen(true)}>
                            <Search size={14} />
                            <span className="search-btn-text">Quick Search...</span>
                            <span className="search-btn-kbd">Ctrl K</span>
                        </button>

                        <div className="system-status-pill">
                            <span className="status-dot" />
                            <Zap size={13} className="zap-icon" />
                            <span>Groq Active</span>
                        </div>
                    </div>
                </header>

                <main className="content-container animate-fade-in">
                    <Outlet />
                </main>
            </div>

            <style>{`
                .app-layout {
                    display: flex;
                    min-height: 100vh;
                    background: var(--background);
                    position: relative;
                }

                /* ─── Mobile Header ─── */
                .mobile-header {
                    display: none;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.85rem 1.25rem;
                    background: rgba(18, 26, 45, 0.95);
                    backdrop-filter: blur(16px);
                    border-bottom: 1px solid var(--border);
                    position: fixed;
                    top: 0; left: 0; right: 0;
                    z-index: 50;
                }
                .brand-logo {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    cursor: pointer;
                }
                .brand-icon {
                    width: 38px;
                    height: 38px;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.35);
                }
                .brand-name {
                    font-size: 1.25rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    background: linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .mobile-toggle-btn {
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    padding: 0.45rem;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .mobile-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.65);
                    backdrop-filter: blur(4px);
                    z-index: 45;
                }

                /* ─── Sidebar ─── */
                .sidebar-container {
                    width: 260px;
                    background: rgba(13, 19, 34, 0.85);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    padding: 1.25rem 1rem;
                    height: 100vh;
                    position: sticky;
                    top: 0;
                    flex-shrink: 0;
                    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    z-index: 48;
                }

                .sidebar-header {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.4rem 0.5rem 1.5rem;
                    cursor: pointer;
                    user-select: none;
                }
                .brand-info {
                    display: flex;
                    flex-direction: column;
                }
                .brand-title {
                    font-size: 1.2rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    color: #ffffff;
                    line-height: 1.2;
                }
                .brand-subtitle {
                    font-size: 0.68rem;
                    color: var(--text-muted);
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                }

                .nav-section-label {
                    font-size: 0.68rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    letter-spacing: 0.08em;
                    padding: 0 0.75rem 0.6rem;
                }

                .sidebar-nav-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                    flex: 1;
                    overflow-y: auto;
                }

                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.6rem 0.85rem;
                    border-radius: 10px;
                    color: var(--text-secondary);
                    text-decoration: none;
                    font-size: 0.88rem;
                    font-weight: 500;
                    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
                    position: relative;
                }
                .nav-link:hover {
                    background: rgba(255, 255, 255, 0.04);
                    color: var(--text-primary);
                    transform: translateX(2px);
                }
                .nav-link.active {
                    background: rgba(99, 102, 241, 0.12);
                    color: #ffffff;
                    font-weight: 600;
                    border: 1px solid rgba(99, 102, 241, 0.25);
                }
                .nav-link.active .nav-icon {
                    color: var(--primary-light);
                }
                .nav-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-muted);
                    transition: color 0.2s;
                }
                .nav-label {
                    flex: 1;
                }
                .nav-badge {
                    font-size: 0.65rem;
                    font-weight: 700;
                    padding: 0.15rem 0.45rem;
                    border-radius: 6px;
                    background: rgba(99, 102, 241, 0.2);
                    color: var(--primary-light);
                    letter-spacing: 0.04em;
                }
                .active-indicator {
                    width: 3px;
                    height: 16px;
                    background: var(--primary);
                    border-radius: 4px;
                    position: absolute;
                    left: 2px;
                }

                /* ─── Footer ─── */
                .sidebar-footer-container {
                    margin-top: auto;
                    padding-top: 0.85rem;
                    border-top: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .user-profile-card {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    padding: 0.55rem 0.65rem;
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .user-profile-card:hover {
                    background: rgba(255, 255, 255, 0.06);
                    border-color: rgba(255, 255, 255, 0.15);
                }
                .user-avatar-pill {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6366f1, #0ea5e9);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #ffffff;
                    flex-shrink: 0;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
                }
                .user-meta {
                    min-width: 0;
                    flex: 1;
                }
                .user-name {
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: var(--text-primary);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    line-height: 1.2;
                }
                .user-email {
                    font-size: 0.7rem;
                    color: var(--text-muted);
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .user-arrow {
                    color: var(--text-muted);
                }

                .sidebar-logout-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    width: 100%;
                    padding: 0.5rem;
                    background: transparent;
                    border: 1px solid transparent;
                    color: var(--text-muted);
                    cursor: pointer;
                    border-radius: 8px;
                    font-size: 0.82rem;
                    font-weight: 500;
                    font-family: inherit;
                    transition: all 0.2s;
                }
                .sidebar-logout-btn:hover {
                    background: rgba(244, 63, 94, 0.1);
                    color: var(--error);
                    border-color: rgba(244, 63, 94, 0.2);
                }

                /* ─── Main Viewport ─── */
                .main-viewport {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-width: 0;
                }

                .topbar {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 0.85rem 2.5rem;
                    border-bottom: 1px solid var(--border);
                    background: rgba(9, 13, 22, 0.6);
                    backdrop-filter: blur(12px);
                    position: sticky;
                    top: 0;
                    z-index: 30;
                }
                .topbar-breadcrumbs {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-size: 0.85rem;
                }
                .breadcrumb-app {
                    color: var(--text-muted);
                    font-weight: 500;
                }
                .breadcrumb-separator {
                    color: var(--text-muted);
                    opacity: 0.6;
                }
                .breadcrumb-current {
                    color: var(--text-primary);
                    font-weight: 600;
                }

                .topbar-actions {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .topbar-search-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.6rem;
                    padding: 0.4rem 0.85rem;
                    border-radius: var(--radius-sm);
                    border: 1px solid var(--border);
                    background: var(--surface-2);
                    color: var(--text-secondary);
                    cursor: pointer;
                    font-size: 0.82rem;
                    transition: all 0.15s;
                }
                .topbar-search-btn:hover {
                    border-color: rgba(99, 102, 241, 0.4);
                    background: var(--surface-3);
                    color: var(--text-primary);
                }
                .search-btn-kbd {
                    font-size: 0.68rem;
                    font-weight: 700;
                    padding: 0.15rem 0.4rem;
                    background: var(--surface);
                    border: 1px solid var(--border);
                    border-radius: 4px;
                    color: var(--text-muted);
                }

                .system-status-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.45rem;
                    padding: 0.3rem 0.75rem;
                    background: rgba(16, 185, 129, 0.08);
                    border: 1px solid rgba(16, 185, 129, 0.25);
                    border-radius: var(--radius-full);
                    font-size: 0.76rem;
                    font-weight: 600;
                    color: var(--success);
                }
                .status-dot {
                    width: 6px;
                    height: 6px;
                    border-radius: 50%;
                    background: var(--success);
                    box-shadow: 0 0 8px var(--success);
                    animation: pulseGlow 2s infinite;
                }
                .zap-icon {
                    color: var(--warning);
                }

                .content-container {
                    flex: 1;
                    padding: 2rem 2.5rem;
                    max-width: 1400px;
                    width: 100%;
                    margin: 0 auto;
                }

                /* ─── Responsive ─── */
                @media (max-width: 900px) {
                    .mobile-header { display: flex; }
                    .topbar { display: none; }
                    .sidebar-container {
                        position: fixed;
                        top: 0; bottom: 0; left: 0;
                        transform: translateX(-100%);
                        z-index: 50;
                    }
                    .sidebar-container.mobile-open {
                        transform: translateX(0);
                    }
                    .content-container {
                        padding: 1.25rem;
                        padding-top: 5rem;
                    }
                }
            `}</style>
        </div>
    );
};

export default Layout;

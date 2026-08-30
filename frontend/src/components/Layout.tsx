import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    FileText,
    MessageSquare,
    Sparkles,
    BarChart3,
    Mic,
    LogOut,
    Brain,
    Menu,
    X
} from 'lucide-react';

const Layout: React.FC = () => {
    const { logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const navItems = [
        { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/dashboard' },
        { icon: <FileText size={20} />, label: 'Documents', path: '/documents' },
        { icon: <MessageSquare size={20} />, label: 'Chat', path: '/chat' },
        { icon: <Sparkles size={20} />, label: 'Quizzes', path: '/quiz' },
        { icon: <BarChart3 size={20} />, label: 'Sentiment', path: '/sentiment' },
        { icon: <Mic size={20} />, label: 'Speech', path: '/speech' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="layout">
            {/* Mobile Header */}
            <header className="mobile-header">
                <div className="logo">
                    <Brain size={24} />
                    <span>UniMind</span>
                </div>
                <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                    {mobileMenuOpen ? <X /> : <Menu />}
                </button>
            </header>

            {/* Sidebar */}
            <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo-icon">
                        <Brain size={24} color="white" />
                    </div>
                    <span className="logo-text">UniMind</span>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                            onClick={() => setMobileMenuOpen(false)}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="logout-btn">
                        <LogOut size={18} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>

            <style>{`
                .layout {
                    display: flex;
                    min-height: 100vh;
                    background: var(--background);
                }

                /* Mobile Header */
                .mobile-header {
                    display: none;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: var(--surface);
                    border-bottom: 1px solid var(--border);
                    position: fixed;
                    top: 0; left: 0; right: 0;
                    z-index: 50;
                }
                .mobile-header .logo {
                    display: flex; gap: 0.5rem; alignItems: center;
                    font-weight: bold; font-size: 1.2rem;
                    color: var(--primary);
                }

                /* Sidebar */
                .sidebar {
                    width: 260px;
                    background: var(--surface);
                    border-right: 1px solid var(--border);
                    display: flex;
                    flex-direction: column;
                    padding: 1.5rem;
                    height: 100vh;
                    position: sticky;
                    top: 0;
                    flex-shrink: 0;
                    transition: transform 0.3s ease;
                    z-index: 40;
                }

                .sidebar-header {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    margin-bottom: 2rem;
                    padding-left: 0.5rem;
                }
                .logo-icon {
                    width: 36px; height: 36px;
                    background: linear-gradient(135deg, var(--primary), var(--secondary));
                    border-radius: 8px;
                    display: flex; align-items: center; justify-content: center;
                }
                .logo-text {
                    font-size: 1.4rem;
                    font-weight: 800;
                    background: linear-gradient(135deg, var(--primary), var(--secondary));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .sidebar-nav {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    flex: 1;
                }

                .nav-item {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    padding: 0.8rem 1rem;
                    border-radius: 12px;
                    color: var(--text-secondary);
                    text-decoration: none;
                    font-weight: 500;
                    transition: all 0.2s;
                }
                .nav-item:hover {
                    background: var(--surface-2);
                    color: var(--text-primary);
                    transform: translateX(4px);
                }
                .nav-item.active {
                    background: linear-gradient(90deg, rgba(99,102,241,0.1), transparent);
                    color: var(--primary);
                    border-left: 3px solid var(--primary);
                }

                .sidebar-footer {
                    margin-top: auto;
                    padding-top: 1rem;
                    border-top: 1px solid var(--border);
                }
                .logout-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.8rem;
                    width: 100%;
                    padding: 0.8rem 1rem;
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    border-radius: 12px;
                    font-size: 0.95rem;
                    transition: all 0.2s;
                }
                .logout-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                    color: var(--error);
                }

                /* Main Content Area */
                .main-content {
                    flex: 1;
                    padding: 2rem;
                    max-width: 1400px;
                    margin: 0 auto;
                    width: 100%;
                }

                /* Responsive */
                @media (max-width: 768px) {
                    .mobile-header { display: flex; }
                    .sidebar {
                        position: fixed;
                        transform: translateX(-100%);
                        box-shadow: 2px 0 10px rgba(0,0,0,0.1);
                    }
                    .sidebar.open {
                        transform: translateX(0);
                    }
                    .main-content {
                        padding: 1rem;
                        padding-top: 5rem; /* Space for mobile header */
                    }
                }
            `}</style>
        </div>
    );
};

export default Layout;

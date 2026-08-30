import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { LogIn, Eye, EyeOff, Mail, Lock, Sparkles, ShieldCheck, Zap } from 'lucide-react';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Invalid email or password. Please check credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page-wrapper">
            {/* Ambient Background Overlay & Glows */}
            <div className="auth-bg-overlay" />
            <div className="auth-mesh-glow glow-1" />
            <div className="auth-mesh-glow glow-2" />

            <div className="auth-main-layout">
                {/* Left Side: Brand Showcase */}
                <div className="auth-showcase-panel animate-slide-up">
                    <div className="showcase-brand">
                        <Logo size="lg" showSubtitle={true} />
                    </div>

                    <div className="showcase-hero">
                        <h2>Your Cognitive <span className="gradient-text">AI Knowledge</span> Studio</h2>
                        <p>
                            Transform documents, videos, and web articles into dynamic mind maps, grounded RAG chats, spaced-repetition flashcards, and adaptive practice quizzes.
                        </p>
                    </div>

                    <div className="showcase-features">
                        <div className="feature-pill">
                            <Zap size={15} color="#38bdf8" />
                            <span>Groq 70B Ultra-Fast RAG</span>
                        </div>
                        <div className="feature-pill">
                            <Sparkles size={15} color="#c084fc" />
                            <span>Interactive Mind Maps</span>
                        </div>
                        <div className="feature-pill">
                            <ShieldCheck size={15} color="#34d399" />
                            <span>Private & Multi-Modal</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Auth Card Container */}
                <div className="auth-card-container glass-panel animate-slide-up">
                    <div className="auth-card-header">
                        <div className="auth-mobile-logo">
                            <Logo size="md" />
                        </div>
                        <h3>Welcome Back</h3>
                        <p>Enter your credentials to access your knowledge workspace</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="auth-form-body">
                        {error && (
                            <div className="auth-error-alert animate-fade-in">
                                {error}
                            </div>
                        )}

                        <div className="auth-field-group">
                            <label htmlFor="email">Email Address</label>
                            <div className="auth-input-wrapper">
                                <Mail size={16} className="auth-input-icon" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoFocus
                                    className="auth-input"
                                />
                            </div>
                        </div>

                        <div className="auth-field-group">
                            <div className="field-label-row">
                                <label htmlFor="password">Password</label>
                            </div>
                            <div className="auth-input-wrapper">
                                <Lock size={16} className="auth-input-icon" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="auth-input"
                                />
                                <button
                                    type="button"
                                    className="auth-pw-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" className="btn-primary auth-submit-btn" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <div className="spinner" style={{ width: 18, height: 18 }} />
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <LogIn size={17} />
                                    <span>Sign In to UniMind</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-footer-text">
                        <span>New to UniMind?</span>{' '}
                        <Link to="/register" className="auth-link">Create an account</Link>
                    </div>
                </div>
            </div>

            <style>{`
                .auth-page-wrapper {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem 1.5rem;
                    background-color: #060913;
                    background-image: url('/images/auth_bg.jpg');
                    background-size: cover;
                    background-position: center;
                    background-repeat: no-repeat;
                    position: relative;
                    overflow: hidden;
                }

                .auth-bg-overlay {
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at 60% 40%, rgba(6, 9, 19, 0.7) 0%, rgba(4, 7, 15, 0.94) 100%);
                    backdrop-filter: blur(8px);
                    z-index: 1;
                }

                .auth-mesh-glow {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(90px);
                    pointer-events: none;
                    z-index: 1;
                }
                .glow-1 {
                    width: 450px;
                    height: 450px;
                    background: rgba(99, 102, 241, 0.22);
                    top: 15%;
                    left: 10%;
                }
                .glow-2 {
                    width: 380px;
                    height: 380px;
                    background: rgba(6, 182, 212, 0.18);
                    bottom: 10%;
                    right: 15%;
                }

                .auth-main-layout {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 3.5rem;
                    max-width: 1120px;
                    width: 100%;
                }

                /* Left Showcase Panel */
                .auth-showcase-panel {
                    flex: 1;
                    max-width: 500px;
                    display: flex;
                    flex-direction: column;
                    gap: 1.75rem;
                }
                @media (max-width: 920px) {
                    .auth-showcase-panel {
                        display: none;
                    }
                }

                .showcase-hero h2 {
                    font-size: 2.35rem;
                    font-weight: 800;
                    line-height: 1.2;
                    letter-spacing: -0.03em;
                    color: #ffffff;
                    margin-bottom: 0.85rem;
                }
                .showcase-hero p {
                    font-size: 1.02rem;
                    line-height: 1.65;
                    color: var(--text-secondary, #94a3b8);
                }
                .gradient-text {
                    background: linear-gradient(135deg, #818cf8 0%, #38bdf8 50%, #c084fc 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }

                .showcase-features {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.65rem;
                }
                .feature-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.95rem;
                    border-radius: 30px;
                    background: rgba(15, 23, 42, 0.75);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    backdrop-filter: blur(12px);
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: #f1f5f9;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                }

                /* Right Auth Card */
                .auth-card-container {
                    width: 100%;
                    max-width: 440px;
                    padding: 2.5rem 2.25rem;
                    border-radius: var(--radius-lg, 16px);
                    background: rgba(15, 23, 42, 0.82);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(99, 102, 241, 0.35);
                    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.15);
                }

                .auth-card-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .auth-mobile-logo {
                    display: none;
                    justify-content: center;
                    margin-bottom: 1.25rem;
                }
                @media (max-width: 920px) {
                    .auth-mobile-logo {
                        display: flex;
                    }
                }
                .auth-card-header h3 {
                    font-size: 1.55rem;
                    font-weight: 800;
                    color: #ffffff;
                    margin-bottom: 0.4rem;
                }
                .auth-card-header p {
                    font-size: 0.88rem;
                    color: var(--text-muted, #94a3b8);
                }

                .auth-form-body {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .auth-error-alert {
                    padding: 0.85rem 1rem;
                    border-radius: var(--radius, 8px);
                    background: rgba(244, 63, 94, 0.15);
                    border: 1px solid rgba(244, 63, 94, 0.4);
                    color: #fecdd3;
                    font-size: 0.84rem;
                    line-height: 1.45;
                }

                .auth-field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.45rem;
                }
                .auth-field-group label {
                    font-size: 0.82rem;
                    font-weight: 600;
                    color: #e2e8f0;
                }

                .auth-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .auth-input-icon {
                    position: absolute;
                    left: 1rem;
                    color: var(--text-muted, #64748b);
                    pointer-events: none;
                    transition: color 0.2s;
                }
                .auth-input {
                    width: 100%;
                    padding: 0.78rem 1rem 0.78rem 2.6rem;
                    background: rgba(10, 15, 30, 0.75);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: var(--radius, 8px);
                    color: #ffffff;
                    font-size: 0.92rem;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .auth-input:focus {
                    outline: none;
                    border-color: #818cf8;
                    background: rgba(15, 23, 42, 0.95);
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
                }
                .auth-input:focus ~ .auth-input-icon {
                    color: #818cf8;
                }

                .auth-pw-toggle {
                    position: absolute;
                    right: 0.85rem;
                    background: none;
                    border: none;
                    color: var(--text-muted, #64748b);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    padding: 0.25rem;
                    border-radius: 4px;
                    transition: color 0.15s;
                }
                .auth-pw-toggle:hover {
                    color: #ffffff;
                }

                .auth-submit-btn {
                    width: 100%;
                    padding: 0.85rem 1.25rem;
                    margin-top: 0.6rem;
                    font-size: 0.95rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.6rem;
                    border-radius: var(--radius, 8px);
                    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
                }

                .auth-footer-text {
                    margin-top: 1.75rem;
                    text-align: center;
                    font-size: 0.86rem;
                    color: var(--text-muted, #94a3b8);
                }
                .auth-link {
                    color: #818cf8;
                    font-weight: 700;
                    text-decoration: none;
                    transition: color 0.15s;
                }
                .auth-link:hover {
                    color: #38bdf8;
                    text-decoration: underline;
                }
            `}</style>
        </div>
    );
};

export default Login;

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { UserPlus, Eye, EyeOff, User, Mail, Lock, Check, X, Sparkles, Zap, ShieldCheck } from 'lucide-react';

const Register: React.FC = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const passwordChecks = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        digit: /\d/.test(password),
        match: password === confirmPassword && confirmPassword.length > 0,
    };

    const isValid = Object.values(passwordChecks).every(Boolean) && fullName.trim().length >= 2;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        setError('');
        setIsLoading(true);

        try {
            await register(email, password, fullName.trim());
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed. Please check your details.');
        } finally {
            setIsLoading(false);
        }
    };

    const PasswordCheck = ({ ok, label }: { ok: boolean; label: string }) => (
        <div className={`rule-chip ${ok ? 'passed' : ''}`}>
            {ok ? <Check size={12} color="var(--success, #10b981)" /> : <X size={12} color="var(--text-muted, #64748b)" />}
            <span>{label}</span>
        </div>
    );

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
                        <h2>Build Your Personal <span className="gradient-text">Second Brain</span></h2>
                        <p>
                            Join UniMind to index textbooks, research papers, YouTube videos, and documentation. Get instant grounded answers with citations.
                        </p>
                    </div>

                    <div className="showcase-features">
                        <div className="feature-pill">
                            <Zap size={15} color="#38bdf8" />
                            <span>100% Grounded RAG</span>
                        </div>
                        <div className="feature-pill">
                            <Sparkles size={15} color="#c084fc" />
                            <span>Leitner AI Flashcards</span>
                        </div>
                        <div className="feature-pill">
                            <ShieldCheck size={15} color="#34d399" />
                            <span>Encrypted & Private</span>
                        </div>
                    </div>
                </div>

                {/* Right Side: Auth Card Container */}
                <div className="auth-card-container glass-panel animate-slide-up">
                    <div className="auth-card-header">
                        <div className="auth-mobile-logo">
                            <Logo size="md" />
                        </div>
                        <h3>Create Account</h3>
                        <p>Get started with your AI-powered knowledge workspace</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="auth-form-body">
                        {error && (
                            <div className="auth-error-alert animate-fade-in">
                                {error}
                            </div>
                        )}

                        <div className="auth-field-group">
                            <label htmlFor="fullName">Full Name</label>
                            <div className="auth-input-wrapper">
                                <User size={16} className="auth-input-icon" />
                                <input
                                    id="fullName"
                                    type="text"
                                    placeholder="Jane Doe"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    minLength={2}
                                    autoFocus
                                    className="auth-input"
                                />
                            </div>
                        </div>

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
                                    className="auth-input"
                                />
                            </div>
                        </div>

                        <div className="auth-field-group">
                            <label htmlFor="password">Password</label>
                            <div className="auth-input-wrapper">
                                <Lock size={16} className="auth-input-icon" />
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
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

                            {password.length > 0 && (
                                <div className="auth-rules-checklist">
                                    <PasswordCheck ok={passwordChecks.length} label="8+ chars" />
                                    <PasswordCheck ok={passwordChecks.uppercase} label="Uppercase" />
                                    <PasswordCheck ok={passwordChecks.lowercase} label="Lowercase" />
                                    <PasswordCheck ok={passwordChecks.digit} label="Number" />
                                </div>
                            )}
                        </div>

                        <div className="auth-field-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className="auth-input-wrapper">
                                <Lock size={16} className="auth-input-icon" />
                                <input
                                    id="confirmPassword"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="auth-input"
                                />
                            </div>
                            {confirmPassword.length > 0 && (
                                <div style={{ marginTop: '0.35rem' }}>
                                    <PasswordCheck ok={passwordChecks.match} label="Passwords match" />
                                </div>
                            )}
                        </div>

                        <button 
                            type="submit" 
                            className="btn-primary auth-submit-btn" 
                            disabled={isLoading || !isValid}
                        >
                            {isLoading ? (
                                <>
                                    <div className="spinner" style={{ width: 18, height: 18 }} />
                                    <span>Creating Account...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus size={17} />
                                    <span>Create Free Account</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="auth-footer-text">
                        <span>Already have an account?</span>{' '}
                        <Link to="/login" className="auth-link">Sign In</Link>
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
                    max-width: 460px;
                    padding: 2.25rem 2.25rem;
                    border-radius: var(--radius-lg, 16px);
                    background: rgba(15, 23, 42, 0.82);
                    backdrop-filter: blur(24px);
                    -webkit-backdrop-filter: blur(24px);
                    border: 1px solid rgba(99, 102, 241, 0.35);
                    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(99, 102, 241, 0.15);
                }

                .auth-card-header {
                    text-align: center;
                    margin-bottom: 1.75rem;
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
                    gap: 1.1rem;
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
                    gap: 0.4rem;
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
                    padding: 0.75rem 1rem 0.75rem 2.6rem;
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

                .auth-rules-checklist {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.4rem;
                    margin-top: 0.45rem;
                }
                .rule-chip {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.3rem;
                    padding: 0.2rem 0.5rem;
                    border-radius: 4px;
                    font-size: 0.72rem;
                    background: rgba(30, 41, 59, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: var(--text-muted, #94a3b8);
                }
                .rule-chip.passed {
                    background: rgba(16, 185, 129, 0.12);
                    border-color: rgba(16, 185, 129, 0.3);
                    color: #6ee7b7;
                }

                .auth-submit-btn {
                    width: 100%;
                    padding: 0.85rem 1.25rem;
                    margin-top: 0.5rem;
                    font-size: 0.95rem;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.6rem;
                    border-radius: var(--radius, 8px);
                    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
                }
                .auth-submit-btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .auth-footer-text {
                    margin-top: 1.5rem;
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

export default Register;

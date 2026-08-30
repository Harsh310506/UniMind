import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Eye, EyeOff, Brain, Mail, Lock } from 'lucide-react';

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
            <div className="auth-card-container glass-panel animate-slide-up">
                {/* Brand Logo Header */}
                <div className="auth-brand-header">
                    <div className="auth-brand-icon">
                        <Brain size={30} color="#ffffff" />
                    </div>
                    <h1>Welcome to UniMind</h1>
                    <p>Sign in to access your AI document knowledge base</p>
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
                                placeholder="name@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoFocus
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
                    <span>Don't have an account?</span>{' '}
                    <Link to="/register" className="auth-link">Create one for free</Link>
                </div>
            </div>

            <style>{`
                .auth-page-wrapper {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                    background: var(--background);
                    position: relative;
                }

                .auth-card-container {
                    width: 100%;
                    max-width: 440px;
                    padding: 2.5rem 2.25rem;
                    border-radius: var(--radius-lg);
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
                    position: relative;
                    z-index: 2;
                }

                .auth-brand-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                .auth-brand-icon {
                    width: 58px;
                    height: 58px;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.1rem;
                    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
                }
                .auth-brand-header h1 {
                    font-size: 1.5rem;
                    font-weight: 800;
                    color: #ffffff;
                    margin-bottom: 0.35rem;
                }
                .auth-brand-header p {
                    color: var(--text-secondary);
                    font-size: 0.86rem;
                }

                .auth-form-body {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }

                .auth-error-alert {
                    padding: 0.75rem 1rem;
                    background: var(--error-glow);
                    border: 1px solid rgba(244, 63, 94, 0.3);
                    border-radius: var(--radius);
                    color: var(--error);
                    font-size: 0.84rem;
                    line-height: 1.4;
                }

                .auth-field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.45rem;
                }
                .auth-field-group label {
                    font-size: 0.84rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .auth-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                }
                .auth-input-icon {
                    position: absolute;
                    left: 0.9rem;
                    color: var(--text-muted);
                    pointer-events: none;
                }
                .auth-input {
                    width: 100%;
                    padding: 0.75rem 2.6rem 0.75rem 2.6rem;
                    background: var(--surface-2);
                    border: 1px solid var(--border);
                    border-radius: var(--radius);
                    color: var(--text-primary);
                    font-size: 0.92rem;
                    font-family: inherit;
                    outline: none;
                    transition: all 0.2s;
                }
                .auth-input:focus {
                    border-color: var(--primary);
                    background: var(--surface-3);
                    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
                }
                .auth-input::placeholder {
                    color: var(--text-muted);
                }

                .auth-pw-toggle {
                    position: absolute;
                    right: 0.85rem;
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    padding: 0.2rem;
                }
                .auth-pw-toggle:hover {
                    color: var(--text-primary);
                }

                .auth-submit-btn {
                    width: 100%;
                    padding: 0.85rem;
                    font-size: 0.95rem;
                    margin-top: 0.5rem;
                }

                .auth-footer-text {
                    text-align: center;
                    margin-top: 1.75rem;
                    font-size: 0.85rem;
                    color: var(--text-secondary);
                }
                .auth-link {
                    color: var(--primary-light);
                    text-decoration: none;
                    font-weight: 600;
                    transition: color 0.15s;
                }
                .auth-link:hover {
                    color: #ffffff;
                    text-decoration: underline;
                }
            `}</style>
        </div>
    );
};

export default Login;

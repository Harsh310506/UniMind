import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Eye, EyeOff, Brain, User, Mail, Lock, Check, X } from 'lucide-react';

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

    const isValid = Object.values(passwordChecks).every(Boolean) && fullName.length >= 2;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isValid) return;
        setError('');
        setIsLoading(true);

        try {
            await register(email, password, fullName);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Registration failed. Please check your details.');
        } finally {
            setIsLoading(false);
        }
    };

    const PasswordCheck = ({ ok, label }: { ok: boolean; label: string }) => (
        <div className={`rule-chip ${ok ? 'passed' : ''}`}>
            {ok ? <Check size={12} /> : <X size={12} />}
            <span>{label}</span>
        </div>
    );

    return (
        <div className="auth-page-wrapper">
            <div className="auth-card-container glass-panel animate-slide-up" style={{ maxWidth: 460 }}>
                {/* Brand Logo Header */}
                <div className="auth-brand-header">
                    <div className="auth-brand-icon">
                        <Brain size={30} color="#ffffff" />
                    </div>
                    <h1>Create UniMind Account</h1>
                    <p>Start querying documents and generating AI assessments</p>
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
                                placeholder="name@company.com"
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

                        {password.length > 0 && (
                            <div className="auth-rules-checklist glass-panel">
                                <PasswordCheck ok={passwordChecks.length} label="8+ characters" />
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
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                className="auth-input"
                            />
                        </div>
                        {confirmPassword.length > 0 && (
                            <div style={{ marginTop: 4 }}>
                                <PasswordCheck ok={passwordChecks.match} label={passwordChecks.match ? 'Passwords match' : 'Passwords do not match'} />
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
                    <Link to="/login" className="auth-link">Sign in here</Link>
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
                    padding: 2.25rem 2rem;
                    border-radius: var(--radius-lg);
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
                    position: relative;
                    z-index: 2;
                }

                .auth-brand-header {
                    text-align: center;
                    margin-bottom: 1.75rem;
                }
                .auth-brand-icon {
                    width: 54px;
                    height: 54px;
                    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                    border-radius: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 0.9rem;
                    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
                }
                .auth-brand-header h1 {
                    font-size: 1.45rem;
                    font-weight: 800;
                    color: #ffffff;
                    margin-bottom: 0.3rem;
                }
                .auth-brand-header p {
                    color: var(--text-secondary);
                    font-size: 0.84rem;
                }

                .auth-form-body {
                    display: flex;
                    flex-direction: column;
                    gap: 1.1rem;
                }

                .auth-error-alert {
                    padding: 0.75rem 1rem;
                    background: var(--error-glow);
                    border: 1px solid rgba(244, 63, 94, 0.3);
                    border-radius: var(--radius);
                    color: var(--error);
                    font-size: 0.84rem;
                }

                .auth-field-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
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
                    padding: 0.7rem 2.6rem 0.7rem 2.6rem;
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

                .auth-rules-checklist {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.35rem;
                    padding: 0.6rem 0.8rem;
                    background: var(--surface-2);
                    border-radius: var(--radius-sm);
                    margin-top: 0.4rem;
                }
                .rule-chip {
                    display: flex;
                    align-items: center;
                    gap: 0.35rem;
                    font-size: 0.74rem;
                    color: var(--text-muted);
                }
                .rule-chip.passed {
                    color: var(--success);
                    font-weight: 600;
                }

                .auth-submit-btn {
                    width: 100%;
                    padding: 0.85rem;
                    font-size: 0.95rem;
                    margin-top: 0.4rem;
                }

                .auth-footer-text {
                    text-align: center;
                    margin-top: 1.5rem;
                    font-size: 0.84rem;
                    color: var(--text-secondary);
                }
                .auth-link {
                    color: var(--primary-light);
                    text-decoration: none;
                    font-weight: 600;
                }
                .auth-link:hover {
                    color: #ffffff;
                    text-decoration: underline;
                }
            `}</style>
        </div>
    );
};

export default Register;

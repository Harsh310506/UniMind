import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Eye, EyeOff, Brain, Check, X } from 'lucide-react';

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
            setError(err.response?.data?.detail || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const PasswordCheck = ({ ok, label }: { ok: boolean; label: string }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: ok ? 'var(--success)' : 'var(--text-muted)' }}>
            {ok ? <Check size={14} /> : <X size={14} />}
            {label}
        </div>
    );

    return (
        <div className="login-page">
            <div className="login-container animate-fade-in" style={{ maxWidth: '440px' }}>
                <div className="login-logo">
                    <div className="logo-icon">
                        <Brain size={32} />
                    </div>
                    <h1>UniMind</h1>
                    <p>Create your account</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {error && <div className="error-banner">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="fullName">Full Name</label>
                        <input
                            id="fullName"
                            type="text"
                            placeholder="John Doe"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            minLength={2}
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-wrapper">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {password.length > 0 && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', marginTop: '0.5rem' }}>
                                <PasswordCheck ok={passwordChecks.length} label="8+ characters" />
                                <PasswordCheck ok={passwordChecks.uppercase} label="Uppercase" />
                                <PasswordCheck ok={passwordChecks.lowercase} label="Lowercase" />
                                <PasswordCheck ok={passwordChecks.digit} label="Number" />
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                        {confirmPassword.length > 0 && (
                            <PasswordCheck ok={passwordChecks.match} label={passwordChecks.match ? 'Passwords match' : 'Passwords do not match'} />
                        )}
                    </div>

                    <button type="submit" className="login-btn" disabled={isLoading || !isValid}>
                        {isLoading ? (
                            <span className="spinner" />
                        ) : (
                            <>
                                <UserPlus size={18} />
                                Create Account
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </div>

            <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--background);
          padding: 1rem;
          position: relative;
          overflow: hidden;
        }
        .login-page::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle at 30% 40%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
                      radial-gradient(circle at 70% 60%, rgba(14, 165, 233, 0.06) 0%, transparent 50%);
          pointer-events: none;
        }
        .login-container {
          width: 100%;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 2.5rem;
          position: relative;
          z-index: 1;
        }
        .login-logo { text-align: center; margin-bottom: 2rem; }
        .logo-icon {
          width: 64px; height: 64px;
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          color: white; margin: 0 auto 1rem;
          box-shadow: 0 8px 24px rgba(99, 102, 241, 0.25);
        }
        .login-logo h1 {
          font-size: 1.75rem; font-weight: 800;
          background: linear-gradient(135deg, var(--primary-light), var(--secondary));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; margin-bottom: 0.25rem;
        }
        .login-logo p { color: var(--text-secondary); font-size: 0.9rem; }
        .login-form { display: flex; flex-direction: column; gap: 1.1rem; }
        .error-banner {
          background: rgba(239, 68, 68, 0.1); color: var(--danger);
          border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 10px;
          padding: 0.75rem 1rem; font-size: 0.875rem;
        }
        .form-group { display: flex; flex-direction: column; gap: 0.5rem; }
        .form-group label { font-size: 0.875rem; font-weight: 500; color: var(--text-secondary); }
        .form-group input {
          width: 100%; padding: 0.75rem 1rem;
          background: var(--surface-2); border: 1px solid var(--border);
          border-radius: 10px; color: var(--text-primary);
          font-size: 0.95rem; font-family: var(--font-sans);
          outline: none; transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-group input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .form-group input::placeholder { color: var(--text-muted); }
        .password-wrapper { position: relative; }
        .password-wrapper input { padding-right: 3rem; }
        .password-toggle {
          position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: var(--text-muted);
          cursor: pointer; padding: 0.25rem; display: flex; align-items: center;
        }
        .login-btn {
          width: 100%; padding: 0.8rem;
          background: linear-gradient(135deg, var(--primary), var(--primary-dark));
          color: white; border: none; border-radius: 10px;
          font-size: 1rem; font-weight: 600; font-family: var(--font-sans);
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 0.5rem;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
        }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .spinner {
          width: 20px; height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white; border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-footer {
          text-align: center; margin-top: 1.5rem;
          font-size: 0.875rem; color: var(--text-secondary);
        }
        .login-footer a { color: var(--primary-light); text-decoration: none; font-weight: 500; }
        .login-footer a:hover { text-decoration: underline; }
      `}</style>
        </div>
    );
};

export default Register;

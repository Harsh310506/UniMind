import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { useToast } from '../context/ToastContext';
import {
    User,
    Lock,
    Save,
    Shield,
    Mail,
    KeyRound,
    Calendar,
    BadgeCheck,
    Check,
    X
} from 'lucide-react';

export default function Settings() {
    const { user } = useAuth();
    const toast = useToast();
    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

    // Profile form
    const [fullName, setFullName] = useState(user?.full_name || '');
    const [savingProfile, setSavingProfile] = useState(false);

    // Password form
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);
    const [pwError, setPwError] = useState('');

    const handleSaveProfile = async () => {
        if (!fullName.trim() || fullName.trim().length < 2) {
            toast.error('Invalid Name', 'Name must be at least 2 characters.');
            return;
        }
        setSavingProfile(true);
        try {
            await authAPI.updateProfile(fullName.trim());
            toast.success('Profile updated!', 'Your display name has been saved.');
        } catch (err: any) {
            toast.error('Update failed', err.response?.data?.detail || 'Please try again');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        setPwError('');
        if (!oldPassword || !newPassword || !confirmPassword) {
            setPwError('All password fields are required');
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwError('New passwords do not match');
            return;
        }
        if (newPassword.length < 8) {
            setPwError('New password must be at least 8 characters');
            return;
        }
        setSavingPassword(true);
        try {
            await authAPI.changePassword(oldPassword, newPassword);
            toast.success('Password updated!', 'Your account password has been changed.');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            const msg = err.response?.data?.detail || 'Failed to change password';
            setPwError(msg);
            toast.error('Password change failed', msg);
        } finally {
            setSavingPassword(false);
        }
    };

    // Password requirements checks
    const hasLength = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);

    return (
        <div className="settings-page-container animate-slide-up">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">Account Settings</h1>
                    <p className="page-subtitle">
                        Manage your user profile credentials and security preferences.
                    </p>
                </div>
            </div>

            {/* Profile Hero Card */}
            <div className="profile-hero-card glass-panel">
                <div className="profile-avatar-large">
                    {(user?.full_name?.[0] || 'U').toUpperCase()}
                </div>
                <div className="profile-hero-meta">
                    <div className="profile-name-row">
                        <h2>{user?.full_name}</h2>
                        <span className="account-status-badge">
                            <BadgeCheck size={14} />
                            <span>Verified</span>
                        </span>
                    </div>
                    <div className="profile-email-row">
                        <Mail size={14} />
                        <span>{user?.email}</span>
                        {user?.created_at && (
                            <>
                                <span className="dot-divider">•</span>
                                <Calendar size={14} />
                                <span>Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Settings Tab Navigation */}
            <div className="settings-tabs-bar glass-panel">
                <button
                    className={`settings-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    <User size={16} />
                    <span>Personal Profile</span>
                </button>
                <button
                    className={`settings-tab-btn ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    <Shield size={16} />
                    <span>Password & Security</span>
                </button>
            </div>

            {/* Tab 1: Profile */}
            {activeTab === 'profile' && (
                <div className="settings-card glass-panel animate-fade-in">
                    <div className="card-section-header">
                        <div className="section-icon-badge">
                            <User size={18} color="var(--primary-light)" />
                        </div>
                        <div>
                            <h3>Profile Details</h3>
                            <p>Update your public display name</p>
                        </div>
                    </div>

                    <div className="settings-form">
                        <div className="form-group">
                            <label className="field-label">Email Address</label>
                            <input
                                value={user?.email || ''}
                                disabled
                                className="input-field disabled-input"
                            />
                            <span className="field-hint">
                                Email cannot be modified once verified.
                            </span>
                        </div>

                        <div className="form-group">
                            <label className="field-label">Display Name</label>
                            <input
                                value={fullName}
                                onChange={e => setFullName(e.target.value)}
                                placeholder="Your full name"
                                className="input-field"
                                onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                            />
                            <span className="field-hint">
                                Used across chat responses and generated assessments.
                            </span>
                        </div>

                        <div className="form-actions-bar">
                            <button
                                onClick={handleSaveProfile}
                                disabled={savingProfile || fullName.trim() === user?.full_name}
                                className="btn-primary save-btn"
                            >
                                <Save size={16} />
                                <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Security */}
            {activeTab === 'security' && (
                <div className="settings-card glass-panel animate-fade-in">
                    <div className="card-section-header">
                        <div className="section-icon-badge" style={{ background: 'rgba(244, 63, 94, 0.12)' }}>
                            <KeyRound size={18} color="var(--error)" />
                        </div>
                        <div>
                            <h3>Password & Authentication</h3>
                            <p>Change your account password to maintain security</p>
                        </div>
                    </div>

                    {pwError && (
                        <div className="error-banner animate-fade-in">
                            {pwError}
                        </div>
                    )}

                    <div className="settings-form">
                        <div className="form-group">
                            <label className="field-label">Current Password</label>
                            <input
                                type="password"
                                value={oldPassword}
                                onChange={e => setOldPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input-field"
                            />
                        </div>

                        <div className="form-group">
                            <label className="field-label">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input-field"
                            />
                        </div>

                        {/* Password Strength Checklist */}
                        {newPassword && (
                            <div className="password-rules-card glass-panel">
                                <span className="rules-title">Password Requirements:</span>
                                <div className="rules-grid">
                                    <div className={`rule-item ${hasLength ? 'passed' : ''}`}>
                                        {hasLength ? <Check size={12} /> : <X size={12} />}
                                        <span>At least 8 characters</span>
                                    </div>
                                    <div className={`rule-item ${hasUpper ? 'passed' : ''}`}>
                                        {hasUpper ? <Check size={12} /> : <X size={12} />}
                                        <span>One uppercase letter</span>
                                    </div>
                                    <div className={`rule-item ${hasLower ? 'passed' : ''}`}>
                                        {hasLower ? <Check size={12} /> : <X size={12} />}
                                        <span>One lowercase letter</span>
                                    </div>
                                    <div className={`rule-item ${hasNumber ? 'passed' : ''}`}>
                                        {hasNumber ? <Check size={12} /> : <X size={12} />}
                                        <span>One number</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label className="field-label">Confirm New Password</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                                className="input-field"
                            />
                        </div>

                        <div className="form-actions-bar">
                            <button
                                onClick={handleChangePassword}
                                disabled={savingPassword}
                                className="btn-primary save-btn"
                                style={{ background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' }}
                            >
                                <Lock size={16} />
                                <span>{savingPassword ? 'Updating...' : 'Update Password'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .settings-page-container {
                    display: flex;
                    flex-direction: column;
                    gap: 1.75rem;
                    max-width: 760px;
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

                /* ─── Hero Card ─── */
                .profile-hero-card {
                    padding: 1.75rem 2rem;
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }
                .profile-avatar-large {
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #6366f1 0%, #0ea5e9 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.6rem;
                    font-weight: 800;
                    color: #ffffff;
                    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);
                    flex-shrink: 0;
                }
                .profile-hero-meta {
                    display: flex;
                    flex-direction: column;
                    gap: 0.35rem;
                }
                .profile-name-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .profile-name-row h2 {
                    font-size: 1.35rem;
                    color: #ffffff;
                }
                .account-status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    padding: 0.15rem 0.55rem;
                    border-radius: var(--radius-full);
                    background: var(--success-glow);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    color: var(--success);
                    font-size: 0.72rem;
                    font-weight: 700;
                }
                .profile-email-row {
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                    font-size: 0.84rem;
                    color: var(--text-secondary);
                }
                .dot-divider {
                    opacity: 0.4;
                }

                /* ─── Tabs ─── */
                .settings-tabs-bar {
                    display: flex;
                    padding: 0.35rem;
                    gap: 0.35rem;
                }
                .settings-tab-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0.65rem;
                    border-radius: var(--radius-sm);
                    border: none;
                    background: transparent;
                    color: var(--text-secondary);
                    font-size: 0.88rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: inherit;
                }
                .settings-tab-btn:hover {
                    color: var(--text-primary);
                }
                .settings-tab-btn.active {
                    background: var(--primary);
                    color: #ffffff;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                }

                /* ─── Settings Card ─── */
                .settings-card {
                    padding: 2.2rem 2.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .card-section-header {
                    display: flex;
                    align-items: center;
                    gap: 0.85rem;
                    padding-bottom: 1.25rem;
                    border-bottom: 1px solid var(--border);
                }
                .section-icon-badge {
                    width: 40px;
                    height: 40px;
                    border-radius: var(--radius);
                    background: rgba(99, 102, 241, 0.12);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .card-section-header h3 {
                    font-size: 1.15rem;
                    color: #ffffff;
                    margin-bottom: 0.2rem;
                }
                .card-section-header p {
                    font-size: 0.82rem;
                    color: var(--text-muted);
                }

                .settings-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.45rem;
                }
                .field-label {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .field-hint {
                    font-size: 0.76rem;
                    color: var(--text-muted);
                }
                .disabled-input {
                    opacity: 0.6;
                    cursor: not-allowed;
                    background: var(--surface);
                }
                .form-actions-bar {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 0.5rem;
                }
                .save-btn {
                    padding: 0.75rem 1.6rem;
                }

                /* ─── Password Rules ─── */
                .password-rules-card {
                    padding: 1rem 1.25rem;
                    background: var(--surface-2);
                }
                .rules-title {
                    font-size: 0.76rem;
                    font-weight: 700;
                    color: var(--text-muted);
                    display: block;
                    margin-bottom: 0.5rem;
                }
                .rules-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 0.45rem;
                }
                .rule-item {
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                    font-size: 0.76rem;
                    color: var(--text-muted);
                }
                .rule-item.passed {
                    color: var(--success);
                    font-weight: 600;
                }

                .error-banner {
                    padding: 0.75rem 1rem;
                    background: var(--error-glow);
                    border: 1px solid rgba(244, 63, 94, 0.3);
                    border-radius: var(--radius);
                    color: var(--error);
                    font-size: 0.85rem;
                }
            `}</style>
        </div>
    );
}

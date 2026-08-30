import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: string;
    type: ToastType;
    title: string;
    message?: string;
}

interface ToastContextType {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ICONS: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
};

const COLORS: Record<ToastType, { bg: string; border: string; title: string }> = {
    success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.4)', title: '#22c55e' },
    error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.4)',  title: '#ef4444' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.4)', title: '#f59e0b' },
    info:    { bg: 'rgba(14,165,233,0.12)', border: 'rgba(14,165,233,0.4)', title: '#0ea5e9' },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((type: ToastType, title: string, message?: string) => {
        const id = `toast_${Date.now()}_${Math.random()}`;
        setToasts(prev => [...prev.slice(-4), { id, type, title, message }]);
        setTimeout(() => dismiss(id), 4000);
    }, [dismiss]);

    const ctx: ToastContextType = {
        success: (title, msg) => addToast('success', title, msg),
        error:   (title, msg) => addToast('error',   title, msg),
        warning: (title, msg) => addToast('warning', title, msg),
        info:    (title, msg) => addToast('info',    title, msg),
    };

    return (
        <ToastContext.Provider value={ctx}>
            {children}

            {/* Toast Container */}
            <div style={{
                position: 'fixed',
                bottom: '1.5rem',
                right: '1.5rem',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                pointerEvents: 'none',
            }}>
                {toasts.map(toast => {
                    const c = COLORS[toast.type];
                    return (
                        <div
                            key={toast.id}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.75rem',
                                padding: '0.9rem 1.1rem',
                                background: c.bg,
                                border: `1px solid ${c.border}`,
                                borderRadius: 14,
                                minWidth: 280,
                                maxWidth: 380,
                                backdropFilter: 'blur(12px)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                animation: 'toastSlideIn 0.3s ease-out',
                                pointerEvents: 'all',
                                cursor: 'pointer',
                            }}
                            onClick={() => dismiss(toast.id)}
                        >
                            <span style={{ fontSize: '1.1rem', lineHeight: 1.4 }}>{ICONS[toast.type]}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    color: c.title,
                                    marginBottom: toast.message ? '0.2rem' : 0,
                                }}>
                                    {toast.title}
                                </div>
                                {toast.message && (
                                    <div style={{
                                        fontSize: '0.8rem',
                                        color: 'var(--text-secondary)',
                                        lineHeight: 1.4,
                                    }}>
                                        {toast.message}
                                    </div>
                                )}
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>✕</span>
                        </div>
                    );
                })}
            </div>

            <style>{`
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateX(20px) scale(0.95); }
                    to   { opacity: 1; transform: translateX(0)   scale(1); }
                }
            `}</style>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};

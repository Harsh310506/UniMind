import React from 'react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showText?: boolean;
    showSubtitle?: boolean;
    className?: string;
}

export default function Logo({
    size = 'md',
    showText = true,
    showSubtitle = false,
    className = ''
}: LogoProps) {
    const iconSizes = {
        sm: 28,
        md: 38,
        lg: 52,
        xl: 68
    };

    const iconDimension = iconSizes[size];

    return (
        <div className={`unimind-brand-logo ${size} ${className}`}>
            <div className="unimind-logo-icon-wrap" style={{ width: iconDimension, height: iconDimension }}>
                <svg
                    width={iconDimension}
                    height={iconDimension}
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="unimind-logo-svg"
                >
                    <defs>
                        <linearGradient id="logoGradPrimary" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#6366f1" />
                            <stop offset="50%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#06b6d4" />
                        </linearGradient>
                        <linearGradient id="logoGradCore" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#ec4899" />
                        </linearGradient>
                        <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Outer Hexagonal Tech Ring */}
                    <path
                        d="M32 4L56 18V46L32 60L8 46V18L32 4Z"
                        stroke="url(#logoGradPrimary)"
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        opacity="0.85"
                    />

                    {/* Inner Dynamic Synaptic Nodes */}
                    <circle cx="32" cy="18" r="3.5" fill="#38bdf8" filter="url(#logoGlow)" />
                    <circle cx="46" cy="26" r="3.5" fill="#818cf8" filter="url(#logoGlow)" />
                    <circle cx="46" cy="42" r="3" fill="#c084fc" filter="url(#logoGlow)" />
                    <circle cx="32" cy="50" r="3.5" fill="#ec4899" filter="url(#logoGlow)" />
                    <circle cx="18" cy="42" r="3" fill="#818cf8" filter="url(#logoGlow)" />
                    <circle cx="18" cy="26" r="3.5" fill="#38bdf8" filter="url(#logoGlow)" />

                    {/* Neural Lattice Synaptic Connections */}
                    <path
                        d="M32 18L46 26M46 26L46 42M46 42L32 50M32 50L18 42M18 42L18 26M18 26L32 18"
                        stroke="rgba(255, 255, 255, 0.4)"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                    />
                    <path
                        d="M32 18L32 34M46 26L32 34M46 42L32 34M32 50L32 34M18 42L32 34M18 26L32 34"
                        stroke="url(#logoGradPrimary)"
                        strokeWidth="1.75"
                    />

                    {/* Central Quantum Brain Core */}
                    <circle cx="32" cy="34" r="6.5" fill="url(#logoGradCore)" filter="url(#logoGlow)" />
                    <circle cx="32" cy="34" r="3" fill="#ffffff" />
                </svg>
            </div>

            {showText && (
                <div className="unimind-brand-text">
                    <div className="unimind-brand-title">
                        <span className="title-uni">Uni</span>
                        <span className="title-mind">Mind</span>
                        <span className="title-ai-badge">AI</span>
                    </div>
                    {showSubtitle && (
                        <span className="unimind-brand-tagline">Cognitive Knowledge Suite</span>
                    )}
                </div>
            )}

            <style>{`
                .unimind-brand-logo {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.75rem;
                    user-select: none;
                    text-decoration: none;
                }
                .unimind-logo-icon-wrap {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    flex-shrink: 0;
                    border-radius: 12px;
                    background: radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(15, 23, 42, 0.6) 80%);
                    box-shadow: 0 0 20px rgba(99, 102, 241, 0.35);
                    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
                }
                .unimind-brand-logo:hover .unimind-logo-icon-wrap {
                    transform: scale(1.06) rotate(3deg);
                    box-shadow: 0 0 28px rgba(99, 102, 241, 0.6), 0 0 10px rgba(6, 182, 212, 0.4);
                }
                .unimind-logo-svg {
                    display: block;
                    filter: drop-shadow(0 2px 8px rgba(99, 102, 241, 0.5));
                }
                .unimind-brand-text {
                    display: flex;
                    flex-direction: column;
                    line-height: 1.1;
                }
                .unimind-brand-title {
                    font-weight: 800;
                    letter-spacing: -0.03em;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                }
                .unimind-brand-logo.sm .unimind-brand-title {
                    font-size: 1.15rem;
                }
                .unimind-brand-logo.md .unimind-brand-title {
                    font-size: 1.35rem;
                }
                .unimind-brand-logo.lg .unimind-brand-title {
                    font-size: 1.75rem;
                }
                .unimind-brand-logo.xl .unimind-brand-title {
                    font-size: 2.2rem;
                }
                .title-uni {
                    color: #ffffff;
                }
                .title-mind {
                    background: linear-gradient(135deg, #818cf8 0%, #38bdf8 50%, #c084fc 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .title-ai-badge {
                    font-size: 0.65em;
                    font-weight: 800;
                    padding: 0.1em 0.45em;
                    border-radius: 4px;
                    background: linear-gradient(135deg, #6366f1, #06b6d4);
                    color: #ffffff;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    box-shadow: 0 2px 6px rgba(99, 102, 241, 0.4);
                    margin-left: 0.15rem;
                }
                .unimind-brand-tagline {
                    font-size: 0.72rem;
                    font-weight: 600;
                    color: var(--text-muted, #94a3b8);
                    letter-spacing: 0.02em;
                    margin-top: 0.2rem;
                }
            `}</style>
        </div>
    );
}

import { useState } from 'preact/hooks';
import { supabase } from './supabaseClient';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    if (!isOpen) return null;

    const handleLogin = async (e: Event) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (!supabase) {
            setMessage({ text: "Supabase not configured.", type: 'error' });
            setLoading(false);
            return;
        }

        const { error } = await supabase.auth.signInWithOtp({ email });

        if (error) {
            setMessage({ text: error.message, type: 'error' });
        } else {
            setMessage({ text: "Check your inbox! Click the link to log in.", type: 'success' });
            setEmail('');
        }
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>&times;</button>

                <h2 className="modal-title">Welcome Back</h2>
                <p className="modal-subtitle">
                    Enter your email to sign in or create an account.
                    <br />
                    <span style={{ fontSize: '0.9em', opacity: 0.8 }}>We'll email you a secure link. No password needed.</span>
                </p>

                <form onSubmit={handleLogin} className="auth-form">
                    <input
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.currentTarget.value)}
                        className="auth-input"
                        required
                    />

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? 'Sending...' : 'Email Me a Login Link'}
                    </button>
                </form>

                {message && (
                    <div className={`auth-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="trust-section">
                    <div className="trust-badge">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                        <span>Secured by </span>
                        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">Supabase</a>
                    </div>
                    <p className="privacy-note">
                        Your email is only used for login. We never share or sell your data.
                    </p>
                </div>
            </div>

            <style>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(5px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.2s ease-out;
                }
                .modal-content {
                    background: rgba(18, 18, 18, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 2rem;
                    width: 100%;
                    max-width: 400px;
                    position: relative;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .close-btn {
                    position: absolute;
                    top: 10px;
                    right: 15px;
                    background: none;
                    border: none;
                    color: #666;
                    font-size: 24px;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                .close-btn:hover {
                    color: #fff;
                }
                .modal-title {
                    font-size: 24px;
                    font-weight: 700;
                    margin: 0 0 5px 0;
                    text-align: center;
                    background: linear-gradient(135deg, #fff 0%, #aaa 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .modal-subtitle {
                    color: #888;
                    font-size: 14px;
                    text-align: center;
                    margin-bottom: 25px;
                }
                .auth-form {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .auth-input {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    padding: 12px 16px;
                    border-radius: 6px;
                    color: #fff;
                    font-size: 16px;
                    outline: none;
                    transition: all 0.2s;
                }
                .auth-input:focus {
                    border-color: #2563eb;
                    background: rgba(255, 255, 255, 0.08);
                    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
                }
                .auth-submit-btn {
                    background: #2563eb;
                    color: white;
                    border: none;
                    padding: 12px;
                    border-radius: 6px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .auth-submit-btn:hover:not(:disabled) {
                    background: #1d4ed8;
                    transform: translateY(-1px);
                }
                .auth-submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }
                .auth-message {
                    margin-top: 15px;
                    padding: 10px;
                    border-radius: 6px;
                    text-align: center;
                    font-size: 13px;
                }
                .auth-message.error {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                .auth-message.success {
                    background: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                    border: 1px solid rgba(34, 197, 94, 0.2);
                }
                .trust-section {
                    margin-top: 24px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    text-align: center;
                }
                .trust-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    color: rgba(255, 255, 255, 0.5);
                }
                .trust-badge svg {
                    color: #22c55e;
                }
                .trust-badge a {
                    color: #22c55e;
                    text-decoration: none;
                    font-weight: 500;
                }
                .trust-badge a:hover {
                    text-decoration: underline;
                }
                .privacy-note {
                    font-size: 11px;
                    color: rgba(255, 255, 255, 0.35);
                    margin-top: 8px;
                    line-height: 1.4;
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}

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

        </div>
    );
}



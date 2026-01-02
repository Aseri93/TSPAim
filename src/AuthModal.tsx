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

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        if (!supabase) {
            setMessage({ text: "Supabase not configured.", type: 'error' });
            setLoading(false);
            return;
        }

        try {
            const { error } = await supabase.auth.signInWithOtp({ email });
            if (error) throw error;
            setMessage({ text: "Check your inbox! Click the link to log in.", type: 'success' });
        } catch (error: any) {
            setMessage({ text: error.message || "Failed to send magic link", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>&times;</button>

                <h2 className="modal-title">Sign In</h2>

                <p className="modal-subtitle">
                    We'll email you a secure login link. No password needed.
                </p>

                <form onSubmit={handleSubmit} className="auth-form">
                    <input
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.currentTarget.value)}
                        className="auth-input"
                        required
                    />

                    <button type="submit" className="btn auth-submit-btn" disabled={loading}>
                        {loading ? 'Sending...' : 'Email Me a Login Link'}
                    </button>
                </form>

                {message && (
                    <div className={`auth-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="trust-section">
                    <p className="privacy-note">
                        Secured by Supabase. Your data is safe.
                    </p>
                </div>
            </div>
        </div>
    );
}

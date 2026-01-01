import { useState } from 'preact/hooks';
import { supabase } from './supabaseClient';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type AuthMode = 'magic' | 'password';
type PasswordMode = 'signin' | 'signup';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [authMode, setAuthMode] = useState<AuthMode>('magic');
    const [passwordMode, setPasswordMode] = useState<PasswordMode>('signin');
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
            if (authMode === 'magic') {
                const { error } = await supabase.auth.signInWithOtp({ email });
                if (error) throw error;
                setMessage({ text: "Check your inbox! Click the link to log in.", type: 'success' });
            } else {
                if (passwordMode === 'signup') {
                    const { error } = await supabase.auth.signUp({
                        email,
                        password,
                    });
                    if (error) throw error;
                    setMessage({ text: "Account created! You can now sign in.", type: 'success' });
                    setPasswordMode('signin'); // Switch to login after signup
                } else {
                    const { error } = await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });
                    if (error) throw error;
                    // Success! Modal should probably close or app handles state change
                    onClose();
                }
            }
        } catch (error: any) {
            setMessage({ text: error.message || "Authentication failed", type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>&times;</button>

                <h2 className="modal-title">
                    {authMode === 'magic' ? 'Magic Link' : (passwordMode === 'signin' ? 'Welcome Back' : 'Create Account')}
                </h2>

                <div className="auth-tabs">
                    <button
                        className={`auth-tab ${authMode === 'magic' ? 'active' : ''}`}
                        onClick={() => { setAuthMode('magic'); setMessage(null); }}
                    >
                        Magic Link
                    </button>
                    <button
                        className={`auth-tab ${authMode === 'password' ? 'active' : ''}`}
                        onClick={() => { setAuthMode('password'); setMessage(null); }}
                    >
                        Password
                    </button>
                </div>

                <p className="modal-subtitle">
                    {authMode === 'magic'
                        ? "We'll email you a secure link. No password needed."
                        : (passwordMode === 'signin' ? "Enter your credentials to access your account." : "Sign up to track your progress and compete.")}
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

                    {authMode === 'password' && (
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.currentTarget.value)}
                            className="auth-input"
                            required
                            minLength={6}
                        />
                    )}

                    <button type="submit" className="btn auth-submit-btn" disabled={loading}>
                        {loading ? 'Processing...' : (
                            authMode === 'magic' ? 'Email Me a Login Link' : (passwordMode === 'signup' ? 'Create Account' : 'Sign In')
                        )}
                    </button>
                </form>

                {authMode === 'password' && (
                    <div className="auth-switch">
                        {passwordMode === 'signin' ? "Don't have an account? " : "Already have an account? "}
                        <button
                            className="text-link"
                            onClick={() => {
                                setPasswordMode(passwordMode === 'signin' ? 'signup' : 'signin');
                                setMessage(null);
                            }}
                        >
                            {passwordMode === 'signin' ? 'Sign Up' : 'Sign In'}
                        </button>
                    </div>
                )}

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

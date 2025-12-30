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
            setMessage({ text: "Magic link sent! Check your email.", type: 'success' });
            setEmail('');
        }
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="close-btn" onClick={onClose}>&times;</button>

                <h2 className="modal-title">Sign In</h2>
                <p className="modal-subtitle">Save your scores to the global leaderboard.</p>

                <form onSubmit={handleLogin} className="auth-form">
                    <input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.currentTarget.value)}
                        className="auth-input"
                        required
                    />

                    <button type="submit" className="auth-submit-btn" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Magic Link'}
                    </button>
                </form>

                {message && (
                    <div className={`auth-message ${message.type}`}>
                        {message.text}
                    </div>
                )}
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

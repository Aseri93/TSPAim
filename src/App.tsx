import { useState, useEffect } from 'preact/hooks';
import { scenarios } from './scenarios';
import Game from './Game';
import Leaderboard from './Leaderboard';
import './index.css';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import AuthModal from './AuthModal';
import { GameResults, Scenario } from './types';

type AppPhase = 'select' | 'playing' | 'results' | 'leaderboard';



// Helper to get high score key
const getHighScoreKey = (id: string) => `tspaim_highscore_${id}`;

// Helper to get saved high score
const getSavedHighScore = (id: string): number => {
    const saved = localStorage.getItem(getHighScoreKey(id));
    return saved ? parseFloat(saved) : 0;
};

// Helper to check if score is better (handles reaction time where lower is better)
const isBetterScore = (newScore: number, currentBest: number, type: Scenario['scoring']): boolean => {
    if (currentBest === 0) return true;
    if (type === 'reaction') return newScore < currentBest;
    return newScore > currentBest;
};

export default function App() {
    const [phase, setPhase] = useState<AppPhase>('select');
    const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
    const [results, setResults] = useState<GameResults | null>(null);
    const [isHighScore, setIsHighScore] = useState(false);
    const [fpsLimit, setFpsLimit] = useState(() => {
        const saved = localStorage.getItem('tspaim_fps_limit');
        return saved ? parseInt(saved, 10) : 0;
    }); // 0 = Unlimited
    const [nickname, setNickname] = useState(localStorage.getItem('tspaim_nickname') || '');
    const [mouseDpi, setMouseDpi] = useState(() => {
        const saved = localStorage.getItem('tspaim_mouse_dpi');
        return saved ? parseInt(saved, 10) : 800; // Default 800
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    // Force re-render of menu when scores change
    const [, setScoresVersion] = useState(0);
    // Counter to force fresh Game instances
    const [gameKey, setGameKey] = useState(0);
    // Category filter for scenario navigation
    const [activeCategory, setActiveCategory] = useState<Scenario['category'] | 'all'>('all');

    // Auth State
    const [session, setSession] = useState<Session | null>(null);
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [showNicknameSetup, setShowNicknameSetup] = useState(false);
    const [setupNickname, setSetupNickname] = useState('');
    const [isSavingNickname, setIsSavingNickname] = useState(false);

    // Category definitions for tabs
    const categories: { id: Scenario['category'] | 'all'; label: string }[] = [
        { id: 'all', label: 'All' },
        { id: 'precision', label: 'Precision' },
        { id: 'speed', label: 'Speed' },
        { id: 'tracking', label: 'Tracking' },
        { id: 'challenge', label: 'Challenge' },
        { id: 'calibration', label: 'Calibration' },
    ];

    // Filter scenarios by active category
    const filteredScenarios = activeCategory === 'all'
        ? scenarios
        : scenarios.filter(s => s.category === activeCategory);

    // Keyboard Navigation State
    const [focusedIndex, setFocusedIndex] = useState(0);

    // Reset focus when category changes
    useEffect(() => {
        setFocusedIndex(0);
    }, [activeCategory]);

    // Keyboard Event Listener
    useEffect(() => {
        if (phase !== 'select' || showNicknameSetup) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                setFocusedIndex(i => Math.min(i + 1, filteredScenarios.length - 1));
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setFocusedIndex(i => Math.max(i - 1, 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredScenarios[focusedIndex]) {
                    handleSelectScenario(filteredScenarios[focusedIndex]);
                }
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                // Prevent page scroll if we are just browsing grid? 
                // Actually, maybe we want to allow scrolling if the grid wraps.
                // For now, allow default behavior for Up/Down unless we implement grid nav.
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [phase, showNicknameSetup, filteredScenarios, focusedIndex]);

    // Scroll focused card into view and update rendering
    useEffect(() => {
        const card = document.getElementById(`scenario-card-${focusedIndex}`);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }, [focusedIndex]);



    useEffect(() => {
        localStorage.setItem('tspaim_fps_limit', fpsLimit.toString());
    }, [fpsLimit]);

    useEffect(() => {
        localStorage.setItem('tspaim_mouse_dpi', mouseDpi.toString());
    }, [mouseDpi]);

    useEffect(() => {
        if (isSupabaseConfigured && supabase) {
            supabase.auth.getSession().then(({ data: { session } }) => {
                setSession(session);
                setIsAuthLoading(false);

                if (session) {
                    const savedNickname = session.user.user_metadata?.nickname;
                    // Provide nickname if missing
                    if (!savedNickname) {
                        setShowNicknameSetup(true);
                    } else if (savedNickname !== nickname) {
                        // Sync remote nickname to local if different
                        setNickname(savedNickname);
                        localStorage.setItem('tspaim_nickname', savedNickname);
                    }
                }
            });

            const {
                data: { subscription },
            } = supabase.auth.onAuthStateChange((_event, session) => {
                setSession(session);

                if (session) {
                    const savedNickname = session.user.user_metadata?.nickname;
                    if (!savedNickname) {
                        setShowNicknameSetup(true);
                    } else if (savedNickname !== nickname) {
                        // Sync remote nickname to local
                        setNickname(savedNickname);
                        localStorage.setItem('tspaim_nickname', savedNickname);
                    }
                }
            });

            return () => subscription.unsubscribe();
        } else {
            setIsAuthLoading(false);
        }
    }, []);

    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

    const handleLogin = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        setIsAuthModalOpen(true);
    };

    const handleLogout = async () => {
        if (supabase) await supabase.auth.signOut();
    };

    const handleSaveNickname = async () => {
        if (!supabase || !setupNickname.trim()) return;

        setIsSavingNickname(true);
        try {
            await supabase.auth.updateUser({
                data: { nickname: setupNickname.trim() }
            });
            // Also update local nickname
            setNickname(setupNickname.trim());
            localStorage.setItem('tspaim_nickname', setupNickname.trim());
            setShowNicknameSetup(false);
        } catch (error) {
            console.error('Failed to save nickname:', error);
        }
        setIsSavingNickname(false);
    };

    const handleSelectScenario = (scenario: Scenario) => {
        setSelectedScenario(scenario);
        setGameKey(k => k + 1); // Increment to force fresh Game
        setPhase('playing');
    };

    const handleGameEnd = async (gameResults: GameResults) => {
        const { scenario, primary, replayLog } = gameResults;
        const currentBest = getSavedHighScore(scenario.id);
        const isNewBest = isBetterScore(primary, currentBest, scenario.scoring);

        // Primary Goal: Save to local storage high scores
        if (isNewBest) {
            localStorage.setItem(getHighScoreKey(scenario.id), primary.toString());
            setScoresVersion(v => v + 1);
        }

        // 1. Always try Local Network save if nickname exists (Ensure everyone shows on LAN)
        // We now allow all scores to be saved for DPI/Resolution calibration tracking
        if (nickname.trim()) {
            await saveGuestScore(gameResults, nickname.trim());
        }

        // 2. Try Global Supabase save if logged in OR nickname provided AND new best
        // Arcade Mode: Allow anonymous saves with nickname
        if (isNewBest && nickname.trim() && supabase && isSupabaseConfigured) {
            const { error } = await supabase.from('scores').insert({
                user_id: session?.user.id || null, // Allow null for guests
                nickname: nickname.trim(), // Save the nickname
                scenario_id: scenario.id,
                score: primary,
                replay_data: replayLog || null,
                mouse_dpi: gameResults.mouseDpi,
                viewport_w: gameResults.viewportW,
                viewport_h: gameResults.viewportH,
                device_pixel_ratio: gameResults.devicePixelRatio,
                view_scale: gameResults.viewScale
            });
            if (error) console.error("Global save failed:", error);
            else setSaveSuccess(true);
        }

        setIsHighScore(isNewBest);
        setResults(gameResults);
        setPhase('results');
    };

    const handlePlayAgain = () => {
        setSaveSuccess(false);
        setGameKey(k => k + 1); // Increment to force fresh Game
        setPhase('playing');
    };

    const handleBackToMenu = () => {
        setSelectedScenario(null);
        setResults(null);
        setIsHighScore(false);
        setSaveSuccess(false);
        setPhase('select');
    };

    const saveLocalScore = (res: GameResults, name: string = 'Guest') => {
        const key = 'tspaim_local_rankings';
        const raw = localStorage.getItem(key);
        const rankings = raw ? JSON.parse(raw) : [];

        const newEntry = {
            id: Date.now(),
            scenario_id: res.scenario.id,
            score: res.primary,
            nickname: name,
            created_at: new Date().toISOString(),
            // Metadata
            mouse_dpi: res.mouseDpi,
            viewport_w: res.viewportW,
            viewport_h: res.viewportH,
            device_pixel_ratio: res.devicePixelRatio,
            view_scale: res.viewScale
        };

        rankings.push(newEntry);
        // Sort (descending, or ascending for reaction)
        const isReaction = res.scenario.id.includes('reaction');
        rankings.sort((a: any, b: any) => isReaction ? a.score - b.score : b.score - a.score);

        // Keep top 50
        localStorage.setItem(key, JSON.stringify(rankings.slice(0, 50)));
    };

    const saveGuestScore = async (res: GameResults, name: string) => {
        setIsSaving(true);
        // 1. Save to Device (Immediate fallback)
        saveLocalScore(res, name);

        // 2. Save to Network (Shared with friends on LAN)
        try {
            await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenario_id: res.scenario.id,
                    score: res.primary,
                    nickname: name,
                    mouse_dpi: res.mouseDpi,
                    viewport_w: res.viewportW,
                    viewport_h: res.viewportH,
                    device_pixel_ratio: res.devicePixelRatio,
                    view_scale: res.viewScale
                })
            });
        } catch (e) {
            console.error("Network save failed:", e);
        }

        // 3. Save to Global (Supabase)
        if (supabase && isSupabaseConfigured) {
            const { error } = await supabase.from('scores').insert({
                scenario_id: res.scenario.id,
                score: res.primary,
                nickname: name,
                replay_data: res.replayLog || null,
                mouse_dpi: res.mouseDpi,
                viewport_w: res.viewportW,
                viewport_h: res.viewportH,
                device_pixel_ratio: res.devicePixelRatio,
                view_scale: res.viewScale
            });
            if (error) {
                console.error("Global save failed:", error);
            }
        }

        setIsSaving(false);
        setSaveSuccess(true);
    };

    // Scenario Selection Screen
    if (phase === 'select') {
        return (
            <div className="app">
                {/* Fixed top-right auth button */}
                {isSupabaseConfigured && (
                    <div className="auth-floating">
                        {isAuthLoading ? (
                            <span className="auth-loading">Loading...</span>
                        ) : session ? (
                            <div className="auth-user">
                                <span className="auth-username">{session.user.user_metadata?.nickname || session.user.email?.split('@')[0]}</span>
                                <button onClick={handleLogout} className="auth-btn">Sign Out</button>
                            </div>
                        ) : (
                            <button type="button" onClick={handleLogin} className="auth-btn">
                                Sign In
                            </button>
                        )}
                    </div>
                )}

                <header className="header">
                    <h1>TSP Aim Trainer</h1>
                    <p className="subtitle">Optimal Path Training</p>
                </header>

                {/* Settings Controls */}
                <div className="settings-bar">
                    <div className="setting-item">
                        <label>MAX FPS</label>
                        <select
                            value={fpsLimit}
                            onChange={(e) => setFpsLimit(Number(e.currentTarget.value))}
                        >
                            <option value={0}>Unlimited</option>
                            <option value={60}>60</option>
                            <option value={120}>120</option>
                            <option value={144}>144</option>
                            <option value={165}>165</option>
                            <option value={240}>240</option>
                        </select>
                    </div>

                    <div className="setting-item">
                        <label>PLAYER</label>
                        <input
                            type="text"
                            placeholder="Nickname"
                            value={nickname}
                            onInput={(e) => {
                                const val = e.currentTarget.value.slice(0, 15);
                                setNickname(val);
                                localStorage.setItem('tspaim_nickname', val);
                            }}
                        />
                    </div>

                    <div className="setting-item">
                        <label>DPI</label>
                        <input
                            type="number"
                            value={mouseDpi}
                            onInput={(e) => setMouseDpi(parseInt(e.currentTarget.value) || 0)}
                            style={{ width: 70 }}
                        />
                    </div>

                    <button
                        className="btn-secondary"
                        onClick={() => setPhase('leaderboard')}
                    >
                        Leaderboards
                    </button>
                </div>

                {/* Category Tabs */}
                <div className="category-tabs">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Scenario Grid */}
                <div className="scenario-grid">
                    {filteredScenarios.map((scenario, index) => (
                        <button
                            key={scenario.id}
                            id={`scenario-card-${index}`}
                            className={`scenario-card ${index === focusedIndex ? 'focused' : ''}`}
                            onClick={() => {
                                setFocusedIndex(index);
                                handleSelectScenario(scenario);
                            }}
                        >
                            <div className="scenario-category-badge">{scenario.category}</div>
                            <h2>{scenario.name}</h2>
                            <p>{scenario.description}</p>
                            <div className="scenario-meta">
                                <span>{scenario.duration}s</span>
                                <span>{scenario.movement}</span>
                                <span>{scenario.scoring}</span>
                            </div>
                            {getSavedHighScore(scenario.id) > 0 && (
                                <div className="scenario-highscore">
                                    Best: {getSavedHighScore(scenario.id)}
                                    {scenario.scoring === 'reaction' ? 'ms' : ''}
                                </div>
                            )}
                        </button>
                    ))}
                </div>
                {isAuthModalOpen && <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />}

                {/* Nickname Setup Modal */}
                {showNicknameSetup && (
                    <div className="modal-overlay" onClick={() => { }}>
                        <div className="modal-content" onClick={e => e.stopPropagation()}>
                            <h2 style={{ marginBottom: 8, fontSize: 24, fontWeight: 500 }}>Welcome!</h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 24, fontSize: 14 }}>
                                Choose a nickname for the global leaderboards
                            </p>
                            <input
                                type="text"
                                placeholder="Enter nickname"
                                value={setupNickname}
                                onInput={(e) => setSetupNickname(e.currentTarget.value.slice(0, 15))}
                                style={{
                                    width: '100%',
                                    padding: '12px 16px',
                                    fontSize: 16,
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: 8,
                                    color: '#fff',
                                    outline: 'none',
                                    textAlign: 'center',
                                    marginBottom: 16
                                }}
                                autoFocus
                            />
                            <button
                                onClick={handleSaveNickname}
                                disabled={!setupNickname.trim() || isSavingNickname}
                                style={{
                                    width: '100%',
                                    padding: '12px 24px',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    background: setupNickname.trim() ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    borderRadius: 8,
                                    color: '#fff',
                                    cursor: setupNickname.trim() ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {isSavingNickname ? 'Saving...' : 'Continue'}
                            </button>
                        </div>
                    </div>
                )}
            </div >
        );
    }

    // Game Screen
    if (phase === 'playing' && selectedScenario) {
        return (
            <Game
                key={`game-${gameKey}`}
                scenario={selectedScenario}
                fpsLimit={fpsLimit}
                mouseDpi={mouseDpi}
                onEnd={handleGameEnd}
                onExit={handleBackToMenu}
            />
        );
    }

    // Results Screen
    if (phase === 'results' && results) {
        return (
            <div className="app">
                <header className="header">
                    <h1>RESULTS</h1>
                    <p className="subtitle">{results.scenario.name}</p>
                </header>

                <div className="results-container">
                    <div className="result-primary">
                        <span className="result-value">{results.primary}</span>
                        <span className="result-label">{results.label}</span>
                        {isHighScore && <div className="new-highscore-badge">NEW PERSONAL BEST!</div>}
                    </div>

                    {results.secondary !== undefined && (
                        <div className="result-secondary">
                            <span className="result-value">{results.secondary}</span>
                            <span className="result-label">{results.secondaryLabel}</span>
                        </div>
                    )}

                    <div className="result-stats">
                        <div className="stat">
                            <span className="stat-value">{results.hits}</span>
                            <span className="stat-label">Hits</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{results.shots}</span>
                            <span className="stat-label">Shots</span>
                        </div>
                        <div className="stat">
                            <span className="stat-value">{(results.timeElapsed / 1000).toFixed(1)}s</span>
                            <span className="stat-label">Time</span>
                        </div>
                    </div>

                    <div style={{ marginTop: -20, display: 'flex', gap: 20, opacity: 0.5, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        <span>DPI: {results.mouseDpi || 'N/A'}</span>
                        <span>RES: {results.viewportW}x{results.viewportH}</span>
                        <span>SCALE: {results.viewScale?.toFixed(2)}x</span>
                    </div>

                    {!session && (
                        <div className="guest-input-container" style={{ marginTop: 30, textAlign: 'center' }}>
                            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 10 }}>
                                ENTER NICKNAME TO SAVE TO LEADERBOARD
                            </p>
                            <input
                                type="text"
                                placeholder="Guest Nickname"
                                value={nickname}
                                onInput={(e) => {
                                    const val = e.currentTarget.value.slice(0, 15);
                                    setNickname(val);
                                    localStorage.setItem('tspaim_nickname', val);
                                }}
                                className="nickname-input"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    color: '#fff',
                                    padding: '10px 15px',
                                    borderRadius: 8,
                                    fontSize: 16,
                                    textAlign: 'center',
                                    width: '100%',
                                    maxWidth: 250,
                                    marginBottom: 15,
                                    transition: 'opacity 0.2s',
                                    opacity: saveSuccess ? 0.5 : 1
                                }}
                                disabled={isSaving || saveSuccess}
                            />
                            {nickname.trim() && !saveSuccess && (
                                <button
                                    className="btn btn-primary"
                                    style={{ display: 'block', margin: '0 auto 20px' }}
                                    onClick={() => saveGuestScore(results, nickname)}
                                    disabled={isSaving}
                                >
                                    {isSaving ? 'Uploading...' : 'Upload to Leaderboard'}
                                </button>
                            )}
                            {saveSuccess && (
                                <p style={{ color: '#4ade80', fontSize: 14, fontWeight: 'bold', marginBottom: 20 }}>
                                    ✓ HIGH SCORE SAVED!
                                </p>
                            )}
                            {!isHighScore && !saveSuccess && (
                                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 20 }}>
                                    (Only new personal bests are uploaded to leaderboards)
                                </p>
                            )}
                        </div>
                    )}

                    <div className="result-actions">
                        <button className="btn btn-primary" onClick={handlePlayAgain}>
                            Play Again
                        </button>
                        <button className="btn btn-secondary" onClick={handleBackToMenu}>
                            Back to Menu
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (phase === 'leaderboard') {
        return <Leaderboard onBack={() => setPhase('select')} />;
    }

    return null;
}

import { useEffect, useState } from 'preact/hooks';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { scenarios } from './scenarios';



interface LeaderboardProps {
    onBack: () => void;
}

export default function Leaderboard({ onBack }: LeaderboardProps) {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [scenarioId, setScenarioId] = useState(scenarios[0].id);
    const [viewMode, setViewMode] = useState<'global' | 'network' | 'device'>(isSupabaseConfigured ? 'global' : 'network');

    useEffect(() => {
        if (viewMode === 'device') {
            fetchDeviceScores();
        } else if (viewMode === 'network') {
            fetchNetworkScores();
        } else if (isSupabaseConfigured && supabase) {
            fetchGlobalScores();
        }
    }, [scenarioId, viewMode]);

    const fetchDeviceScores = () => {
        setLoading(true);
        const raw = localStorage.getItem('tspaim_local_rankings');
        let rankings = raw ? JSON.parse(raw) : [];
        rankings = rankings.filter((r: any) => r.scenario_id === scenarioId);
        const isReaction = scenarioId.includes('reaction');
        rankings.sort((a: any, b: any) => isReaction ? a.score - b.score : b.score - a.score);
        setEntries(rankings);
        setLoading(false);
    };

    const fetchNetworkScores = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/scores');
            let data = await res.json();
            // Filter and sort
            data = data.filter((r: any) => r.scenario_id === scenarioId);
            const isReaction = scenarioId.includes('reaction');
            data.sort((a: any, b: any) => isReaction ? a.score - b.score : b.score - a.score);
            setEntries(data);
        } catch (e) {
            console.error("Failed to fetch network scores:", e);
            setEntries([]);
        }
        setLoading(false);
    };

    const fetchGlobalScores = async () => {
        if (!supabase) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('scores')
            .select(`
                id,
                score,
                created_at,
                user_id,
                nickname,
                profiles (username, avatar_url)
            `)
            .eq('scenario_id', scenarioId)
            .order('score', { ascending: scenarioId.includes('reaction') })
            .limit(50);

        if (error) {
            console.error('Error fetching global leaderboard:', error);
        } else {
            setEntries(data || []);
        }
        setLoading(false);
    };


    // Format date helper
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    };


    return (
        <div className="leaderboard-container">
            <header className="header">
                <div>
                    <h1>{viewMode === 'global' ? 'GLOBAL RANKINGS' : viewMode === 'network' ? 'LOCAL NETWORK' : 'THIS DEVICE'}</h1>
                    <p className="subtitle">
                        {viewMode === 'global' ? 'Top players worldwide' : viewMode === 'network' ? 'Shared on your WiFi' : 'Your private scores'}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <div className="view-toggle">
                        {isSupabaseConfigured && (
                            <button
                                className={`toggle-btn ${viewMode === 'global' ? 'active' : ''}`}
                                onClick={() => setViewMode('global')}
                            >
                                Global
                            </button>
                        )}
                        <button
                            className={`toggle-btn ${viewMode === 'network' ? 'active' : ''}`}
                            onClick={() => setViewMode('network')}
                        >
                            Network
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'device' ? 'active' : ''}`}
                            onClick={() => setViewMode('device')}
                        >
                            Device
                        </button>
                    </div>
                    <button className="btn-secondary" onClick={onBack}>Menu</button>
                </div>
            </header>

            <div className="leaderboard-controls">
                {scenarios.map(s => (
                    <button
                        key={s.id}
                        className={`filter-btn ${scenarioId === s.id ? 'active' : ''}`}
                        onClick={() => setScenarioId(s.id)}
                    >
                        {s.name}
                    </button>
                ))}
            </div>

            <div className="leaderboard-table-wrapper">
                {loading ? (
                    <div className="loading-spinner">Loading scores...</div>
                ) : entries.length === 0 ? (
                    <div className="empty-state">No scores yet. Be the first!</div>
                ) : (
                    <table className="leaderboard-table">
                        <thead>
                            <tr>
                                <th>Rank</th>
                                <th>Player</th>
                                <th className="meta-col">DPI</th>
                                <th className="meta-col">Res</th>
                                <th className="meta-col">Scale</th>
                                <th>Score</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {entries.map((entry, index) => (
                                <tr key={entry.id}>
                                    <td className="rank-cell">#{index + 1}</td>
                                    <td className="player-cell">
                                        <div className="player-name">
                                            {entry.profiles?.username || entry.nickname || 'Anonymous'}
                                        </div>
                                    </td>
                                    <td className="meta-cell">{entry.mouse_dpi || '-'}</td>
                                    <td className="meta-cell">{entry.viewport_w ? `${entry.viewport_w}x${entry.viewport_h}` : '-'}</td>
                                    <td className="meta-cell">{entry.view_scale ? `${entry.view_scale.toFixed(2)}x` : '-'}</td>
                                    <td className="score-cell">
                                        {entry.score}
                                        {scenarioId.includes('reaction') && <span className="unit">ms</span>}
                                    </td>
                                    <td className="date-cell">{formatDate(entry.created_at)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <style>{`
                .leaderboard-container {
                    padding: 2rem;
                    max-width: 1000px;
                    margin: 0 auto;
                    height: 100vh;
                    display: flex;
                    flex-direction: column;
                }
                .leaderboard-controls {
                    display: flex;
                    gap: 10px;
                    margin: 20px 0;
                    overflow-x: auto;
                    padding-bottom: 10px;
                }
                .filter-btn {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    color: #aaa;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.2s;
                }
                .view-toggle {
                    display: flex;
                    background: rgba(255,255,255,0.05);
                    border-radius: 6px;
                    padding: 3px;
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .toggle-btn {
                    background: transparent;
                    border: none;
                    color: #666;
                    padding: 5px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s;
                }
                .toggle-btn.active {
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                }
                .filter-btn:hover {
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                }
                .filter-btn.active {
                    background: #2563eb;
                    border-color: #2563eb;
                    color: #fff;
                }
                .leaderboard-table-wrapper {
                    flex: 1;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 8px;
                    overflow-y: auto;
                }
                .leaderboard-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .leaderboard-table th {
                    text-align: left;
                    padding: 16px;
                    background: rgba(255,255,255,0.05);
                    color: #888;
                    font-size: 14px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    position: sticky;
                    top: 0;
                }
                .leaderboard-table td {
                    padding: 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                }
                .rank-cell {
                    font-family: monospace;
                    color: #666;
                    width: 60px;
                }
                .player-cell {
                    font-weight: 500;
                    color: #fff;
                    display: flex;
                    flex-direction: column;
                    gap: 2px;
                }
                .player-name {
                    font-size: 14px;
                }
                .player-meta {
                    display: none; /* Removed in favor of columns */
                }
                .meta-col {
                    text-align: center;
                    font-size: 11px;
                    color: var(--fg-subtle);
                    font-weight: 500;
                }
                .meta-cell {
                    text-align: center;
                    font-size: 12px;
                    color: var(--fg-muted);
                    font-family: 'JetBrains Mono', monospace;
                }
                .score-cell {
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 1.1em;
                    color: #4ade80;
                }
                .unit {
                    font-size: 0.7em;
                    color: #666;
                    margin-left: 4px;
                }
                .date-cell {
                    color: #666;
                    font-size: 0.9em;
                    text-align: right;
                }
                .empty-state {
                    padding: 40px;
                    text-align: center;
                    color: #666;
                }
                .loading-spinner {
                    padding: 40px;
                    text-align: center;
                    color: #2563eb;
                }
            `}</style>
        </div >
    );
}

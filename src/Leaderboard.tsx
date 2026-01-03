import { useEffect, useState } from 'preact/hooks';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { scenarios } from './scenarios';

// Helper to keep only the best score per player (by nickname for display consistency)
// We deduplicate by nickname since that's what users see on the leaderboard
const deduplicateByPlayer = (scores: any[], isReaction: boolean): any[] => {
    const bestByPlayer = new Map<string, any>();

    for (const score of scores) {
        // Use nickname as the key - this is what users see on the leaderboard
        const key = (score.nickname || 'Anonymous').toLowerCase().trim();
        const existing = bestByPlayer.get(key);

        if (!existing) {
            bestByPlayer.set(key, score);
        } else {
            // For reaction time, lower is better; for other scenarios, higher is better
            const isBetter = isReaction
                ? score.score < existing.score
                : score.score > existing.score;
            if (isBetter) {
                bestByPlayer.set(key, score);
            }
        }
    }

    return Array.from(bestByPlayer.values());
};

interface LeaderboardProps {
    onBack: () => void;
}

export default function Leaderboard({ onBack }: LeaderboardProps) {
    const [entries, setEntries] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [scenarioId, setScenarioId] = useState(scenarios[0].id);
    const [viewMode, setViewMode] = useState<'global' | 'network' | 'device'>(isSupabaseConfigured ? 'global' : 'network');
    const [displayMode, setDisplayMode] = useState<'table' | 'graph'>('table');
    const [graphData, setGraphData] = useState<any[]>([]);

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
        // Deduplicate to show only best score per player
        rankings = deduplicateByPlayer(rankings, isReaction);
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
            // Deduplicate to show only best score per player
            data = deduplicateByPlayer(data, isReaction);
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
        const isReaction = scenarioId.includes('reaction');

        // Fetch more entries to allow for deduplication, then trim
        const { data, error } = await supabase
            .from('scores')
            .select(`
                id,
                score,
                created_at,
                user_id,
                nickname,
                mouse_dpi,
                viewport_w,
                viewport_h,
                view_scale
            `)
            .eq('scenario_id', scenarioId)
            .not('nickname', 'ilike', 'Pro_Player_%')
            .not('nickname', 'ilike', 'Player_%')
            .order('score', { ascending: isReaction })
            .limit(200); // Fetch more to ensure enough unique players

        if (error) {
            console.error('Error fetching global leaderboard:', error);
        } else {
            // Deduplicate to show only best score per player
            let deduplicated = deduplicateByPlayer(data || [], isReaction);
            // Re-sort and limit to 50 for display
            deduplicated.sort((a: any, b: any) => isReaction ? a.score - b.score : b.score - a.score);
            setEntries(deduplicated.slice(0, 50));
        }
        setLoading(false);
    };

    const fetchAnalyticsData = async () => {
        if (!supabase) return;
        setLoading(true);

        const { data, error } = await supabase
            .from('scores')
            .select('score, mouse_dpi, viewport_w, nickname')
            .eq('scenario_id', scenarioId)
            .gt('mouse_dpi', 0)
            .gt('viewport_w', 0)
            .order('score', { ascending: !scenarioId.includes('reaction') })
            .limit(500);

        if (error) {
            console.error('Analytics fetch error:', error);
        } else if (data) {
            const processed = data.map((d: any) => ({
                ...d,
                ratio: d.mouse_dpi / d.viewport_w,
                isPro: d.nickname?.startsWith('Pro_Player')
            })).filter((d: any) => d.ratio > 0.1 && d.ratio < 3.0);
            setGraphData(processed);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (displayMode === 'graph' && viewMode === 'global') {
            fetchAnalyticsData();
        }
    }, [displayMode, scenarioId, viewMode]);


    // Format date helper
    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });
    };


    const renderScatterPlot = () => {
        if (graphData.length === 0) return <div className="empty-state">No analytics data available.</div>;

        const maxScore = Math.max(...graphData.map((d: any) => d.score)) * 1.1; // 10% headroom
        const maxX = 2.0; // Ratio cap (DPI/Width usually < 1.0, but some go higher)
        const width = 800;
        const height = 400;
        const padding = 40;

        return (
            <div style={{ width: '100%', maxWidth: 1000, margin: '0 auto', background: 'rgba(0,0,0,0.2)', padding: 20, borderRadius: 8 }}>
                <h3 style={{ textAlign: 'center', marginBottom: 20, color: '#888' }}>Score vs. DPI/Resolution Ratio</h3>
                <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1.0].map(t => {
                        const y = height - (t * height);
                        return (
                            <g key={t}>
                                <line x1={padding} y1={y} x2={width} y2={y} stroke="#333" strokeDasharray="4" />
                                <text x={padding - 10} y={y + 5} fill="#666" fontSize="12" textAnchor="end">{Math.round(maxScore * t)}</text>
                            </g>
                        );
                    })}

                    {/* X Axis Labels (Ratios) */}
                    {[0.2, 0.4, 0.6, 0.8, 1.0, 1.5].map(r => {
                        const x = padding + (r / maxX) * (width - padding);
                        return (
                            <g key={r}>
                                <line x1={x} y1={0} x2={x} y2={height} stroke="#333" strokeDasharray="4" />
                                <text x={x} y={height + 20} fill="#666" fontSize="12" textAnchor="middle">{r}</text>
                            </g>
                        );
                    })}
                    <text x={width / 2} y={height + 40} fill="#888" fontSize="14" textAnchor="middle">DPI / ScreenWidth Ratio (Universal Ratio)</text>

                    {/* Data Points */}
                    {graphData.map((d, i) => {
                        const x = padding + (d.ratio / maxX) * (width - padding);
                        const y = height - (d.score / maxScore) * height;

                        // Bounds check
                        if (x > width) return null;

                        return (
                            <circle
                                key={i}
                                cx={x}
                                cy={y}
                                r={d.isPro ? 4 : 5}
                                fill={d.isPro ? 'rgba(255,255,255,0.1)' : '#4ade80'}
                                stroke={d.isPro ? 'none' : 'rgba(0,0,0,0.5)'}
                                style={{ transition: 'all 0.3s' }}
                            >
                                <title>{`${d.nickname}\nScore: ${d.score}\nDPI: ${d.mouse_dpi}\nRatio: ${d.ratio.toFixed(3)}`}</title>
                            </circle>
                        );
                    })}
                </svg>
                <div style={{ marginTop: 20, display: 'flex', gap: 20, justifyContent: 'center', fontSize: 13, color: '#888' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80' }}></div>
                        Real Players
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}></div>
                        Theoretical Baseline (Simulated)
                    </div>
                </div>
            </div>
        );
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

                    {viewMode === 'global' && (
                        <div className="view-toggle" style={{ marginLeft: 10 }}>
                            <button
                                className={`toggle-btn ${displayMode === 'table' ? 'active' : ''}`}
                                onClick={() => setDisplayMode('table')}
                            >
                                Table
                            </button>
                            <button
                                className={`toggle-btn ${displayMode === 'graph' ? 'active' : ''}`}
                                onClick={() => setDisplayMode('graph')}
                            >
                                Analytics
                            </button>
                        </div>
                    )}

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
                ) : displayMode === 'graph' ? (
                    <div style={{ height: '100%', overflowY: 'auto', padding: 20 }}>
                        {renderScatterPlot()}
                    </div>
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
                                            {entry.nickname || 'Anonymous'}
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

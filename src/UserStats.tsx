import { useEffect, useState, useMemo } from 'preact/hooks';
import { scenarios } from './scenarios';

interface UserStatsProps {
    onBack: () => void;
}

interface ScoreEntry {
    scenario_id: string;
    score: number;
    created_at: string;
    nickname?: string;
    mouse_dpi?: number;
    viewport_w?: number;
    viewport_h?: number;
}

export default function UserStats({ onBack }: UserStatsProps) {
    const [allScores, setAllScores] = useState<ScoreEntry[]>([]);

    useEffect(() => {
        // Load device scores from localStorage
        const raw = localStorage.getItem('tspaim_local_rankings');
        const rankings: ScoreEntry[] = raw ? JSON.parse(raw) : [];
        setAllScores(rankings);
    }, []);

    // Compute aggregate stats
    const stats = useMemo(() => {
        if (allScores.length === 0) return null;

        const totalPlays = allScores.length;

        // Best scores per scenario
        const bestByScenario: Record<string, { score: number; dpi?: number; date: string }> = {};
        allScores.forEach(s => {
            const isReaction = s.scenario_id.includes('reaction');
            const current = bestByScenario[s.scenario_id];
            const isBetter = !current ||
                (isReaction ? s.score < current.score : s.score > current.score);
            if (isBetter) {
                bestByScenario[s.scenario_id] = {
                    score: s.score,
                    dpi: s.mouse_dpi,
                    date: s.created_at
                };
            }
        });

        // DPI analysis
        const dpiScores: Record<number, number[]> = {};
        allScores.forEach(s => {
            if (s.mouse_dpi && s.mouse_dpi > 0) {
                if (!dpiScores[s.mouse_dpi]) dpiScores[s.mouse_dpi] = [];
                dpiScores[s.mouse_dpi].push(s.score);
            }
        });

        const dpiAverages = Object.entries(dpiScores).map(([dpi, scores]) => ({
            dpi: parseInt(dpi),
            avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
            count: scores.length
        })).sort((a, b) => b.avgScore - a.avgScore);

        // Resolution analysis
        const resolutions: Record<string, number> = {};
        allScores.forEach(s => {
            if (s.viewport_w && s.viewport_h) {
                const key = `${s.viewport_w}x${s.viewport_h}`;
                resolutions[key] = (resolutions[key] || 0) + 1;
            }
        });

        const topResolutions = Object.entries(resolutions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        // Activity by day
        const dayActivity: Record<string, number> = {};
        allScores.forEach(s => {
            const day = s.created_at.split('T')[0];
            dayActivity[day] = (dayActivity[day] || 0) + 1;
        });

        return {
            totalPlays,
            bestByScenario,
            dpiAverages,
            topResolutions,
            recentDays: Object.keys(dayActivity).length
        };
    }, [allScores]);

    return (
        <div className="leaderboard-container">
            <div className="leaderboard-header">
                <h1>Your Stats</h1>
                <button onClick={onBack} className="btn">← Back</button>
            </div>

            {allScores.length === 0 ? (
                <div className="empty-state">
                    <p>No plays recorded yet. Play some scenarios to see your stats!</p>
                </div>
            ) : stats && (
                <div className="stats-grid">
                    {/* Overview Cards */}
                    <div className="stats-card overview">
                        <h3>Overview</h3>
                        <div className="stat-row">
                            <span>Total Plays</span>
                            <strong>{stats.totalPlays}</strong>
                        </div>
                        <div className="stat-row">
                            <span>Days Active</span>
                            <strong>{stats.recentDays}</strong>
                        </div>
                        <div className="stat-row">
                            <span>Scenarios Played</span>
                            <strong>{Object.keys(stats.bestByScenario).length}</strong>
                        </div>
                    </div>

                    {/* Best Scores */}
                    <div className="stats-card best-scores">
                        <h3>Personal Bests</h3>
                        <div className="best-list">
                            {scenarios.map(s => {
                                const best = stats.bestByScenario[s.id];
                                return (
                                    <div key={s.id} className="best-item">
                                        <span className="scenario-name">{s.name}</span>
                                        <span className={`score ${best ? '' : 'no-score'}`}>
                                            {best ? (
                                                s.scoring === 'reaction'
                                                    ? `${best.score}ms`
                                                    : best.score.toLocaleString()
                                            ) : '—'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* DPI Analysis */}
                    {stats.dpiAverages.length > 0 && (
                        <div className="stats-card dpi-analysis">
                            <h3>DPI Performance</h3>
                            <p className="card-subtitle">Your average score at each DPI setting</p>
                            <div className="dpi-list">
                                {stats.dpiAverages.slice(0, 5).map((d, i) => (
                                    <div key={d.dpi} className={`dpi-item ${i === 0 ? 'top' : ''}`}>
                                        <span className="dpi-value">{d.dpi} DPI</span>
                                        <span className="dpi-avg">avg {d.avgScore}</span>
                                        <span className="dpi-count">({d.count} plays)</span>
                                        {i === 0 && <span className="best-badge">★ Best</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Resolution Usage */}
                    {stats.topResolutions.length > 0 && (
                        <div className="stats-card resolution-stats">
                            <h3>Resolutions Used</h3>
                            <div className="resolution-list">
                                {stats.topResolutions.map(([res, count]) => (
                                    <div key={res} className="resolution-item">
                                        <span>{res}</span>
                                        <span>{count} plays</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

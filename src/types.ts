
// Centralized types to avoid circular dependencies and duplication

export interface Scenario {
    id: string;
    name: string;
    description: string;
    duration: number; // seconds
    targetCount: number;
    targetSize: number; // base size at 1080p
    movement: 'static' | 'strafe' | 'smooth';
    scoring: 'tps' | 'accuracy' | 'tracking' | 'benchmark' | 'reaction' | 'adaptive';
    category: 'precision' | 'speed' | 'tracking' | 'challenge' | 'calibration';
    speed?: number; // movement speed for non-static scenarios
    autoPlay?: boolean; // if true, scenario plays itself (for benchmarks)
    clickLimit?: number; // End game after N clicks (for reaction test)
    noRespawn?: boolean; // If true, targets don't respawn on hit
    pattern?: 'grid' | 'circle' | 'grubby'; // Custom spawn pattern
}

export interface ReplayEvent {
    t: number; // Timestamp (relative to start)
    type: 'move' | 'click' | 'hit' | 'spawn';
    x: number;
    y: number;
    meta?: any; // Extra data like target ID
}

export interface Target {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    hit: boolean;
    label?: string; // Optional label for specific scenarios
}

export interface GameState {
    phase: 'idle' | 'playing' | 'ended';
    targets: Target[];
    optimalPath: Target[]; // TSP-ordered targets
    renderPath: { x: number; y: number; targetId: string }[]; // Interpolated positions for smooth rendering
    score: number;
    hits: number;
    shots: number;
    timeElapsed: number;
    trackingTime: number;
    trackingTotal: number;
    // Reaction test metrics
    lastHitTime: number; // Time when signal appeared (red screen or target spawn)
    reactionTimes: number[];
    nextSpawnTime: number; // For random delays
    message?: string; // "Wait...", "CLICK!", "Too Early!"
    isRed?: boolean; // For visual reaction test
    cursorX: number;
    cursorY: number;
    width: number;
    height: number;
    showPath: boolean;
    replayLog: ReplayEvent[]; // Full input log for verification
    // Adaptive tracking
    adaptiveSpeed: number; // Current speed multiplier (1.0 = base)
    adaptiveScore: number; // Accumulated score based on speed
}

export interface GameResults {
    scenario: Scenario;
    primary: number;
    label: string;
    secondary?: number;
    secondaryLabel?: string;
    hits: number;
    shots: number;
    timeElapsed: number;
    replayLog?: ReplayEvent[]; // Anti-cheat data
    // Performance Metadata
    mouseDpi?: number;
    viewportW?: number;
    viewportH?: number;
    devicePixelRatio?: number;
    viewScale?: number;
}

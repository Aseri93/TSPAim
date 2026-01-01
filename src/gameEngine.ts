// Pure game engine - no React, just game logic and canvas rendering

import { Scenario, GameState, Target } from './types';

// Distance between two points
export function dist(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

// TSP Nearest Neighbor solver - finds optimal path from cursor position
export function solveTSP(targets: Target[], startX: number, startY: number): Target[] {
    const activeTargets = targets.filter(t => !t.hit);
    if (activeTargets.length === 0) return [];
    if (activeTargets.length === 1) return activeTargets;

    const path: Target[] = [];
    const remaining = [...activeTargets];
    let currentX = startX;
    let currentY = startY;

    while (remaining.length > 0) {
        let nearestIdx = 0;
        let nearestDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const d = dist(currentX, currentY, remaining[i].x, remaining[i].y);
            if (d < nearestDist) {
                nearestDist = d;
                nearestIdx = i;
            }
        }

        const nearest = remaining[nearestIdx];
        path.push(nearest);
        currentX = nearest.x;
        currentY = nearest.y;
        remaining.splice(nearestIdx, 1);
    }

    return path;
}

// Calculate total path length
export function calculatePathLength(path: Target[], startX: number, startY: number): number {
    if (path.length === 0) return 0;

    let total = dist(startX, startY, path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
        total += dist(path[i - 1].x, path[i - 1].y, path[i].x, path[i].y);
    }
    return total;
}

// Scale target size based on screen resolution (1080p baseline)
export function scaleSize(baseSize: number, screenHeight: number): number {
    return baseSize * (screenHeight / 1080);
}

// Lerp (linear interpolation) for smooth transitions
function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

// Update render path with smooth interpolation towards optimal path
export function updateRenderPath(state: GameState, lerpFactor: number = 0.8): void {
    const { optimalPath, renderPath } = state;

    // Build new render path, lerping existing positions or adding new ones
    const newRenderPath: { x: number; y: number; targetId: string }[] = [];

    for (const p of optimalPath) {
        // Find the current version of the target in state.targets (it gets replaced every frame when moving)
        const currentTarget = state.targets.find(t => t.id === p.id);
        if (!currentTarget || currentTarget.hit) continue;

        const existing = renderPath.find(r => r.targetId === currentTarget.id);
        if (existing) {
            // Lerp towards target's current position
            newRenderPath.push({
                x: lerp(existing.x, currentTarget.x, lerpFactor),
                y: lerp(existing.y, currentTarget.y, lerpFactor),
                targetId: currentTarget.id,
            });
        } else {
            // New target, start at its current position
            newRenderPath.push({
                x: currentTarget.x,
                y: currentTarget.y,
                targetId: currentTarget.id,
            });
        }
    }

    state.renderPath = newRenderPath;
}

// Create initial game state
export function createGameState(
    scenario: Scenario,
    width: number,
    height: number
): GameState {
    const scaledSize = scaleSize(scenario.targetSize, height);
    const margin = 50;

    const targets: Target[] = [];
    if (scenario.scoring !== 'reaction') {
        if (scenario.pattern === 'compass') {
            // Guided circular pattern: Center -> North -> NE -> East -> SE -> South -> SW -> West -> NW
            // Margins: 12% from X edges, 15%/85% for Y to avoid HUD and bottom browser chrome
            const positions = [
                { x: 0.5, y: 0.5, label: 'CENTER' },
                { x: 0.5, y: 0.15, label: '1' }, // TOP
                { x: 0.88, y: 0.15, label: '2' }, // NE
                { x: 0.88, y: 0.5, label: '3' }, // RIGHT
                { x: 0.88, y: 0.85, label: '4' },  // SE
                { x: 0.5, y: 0.85, label: '5' },  // BOTTOM
                { x: 0.12, y: 0.85, label: '6' },  // SW
                { x: 0.12, y: 0.5, label: '7' }, // LEFT
                { x: 0.12, y: 0.15, label: '8' }, // NW
            ];
            positions.forEach((p, i) => {
                targets.push({
                    id: `target-compass-${i}`,
                    x: p.x * width,
                    y: p.y * height,
                    vx: 0,
                    vy: 0,
                    size: scaledSize,
                    hit: false,
                    label: p.label,
                    relX: p.x, // Store relative position for resolution-independent resize
                    relY: p.y,
                });
            });
        } else {
            for (let i = 0; i < scenario.targetCount; i++) {
                targets.push(createTarget(i, width, height, scaledSize, margin, scenario, targets));
            }
        }
    }

    const cursorX = width / 2;
    const cursorY = height / 2;
    const optimalPath = solveTSP(targets, cursorX, cursorY);

    // Compass Rose initialization
    const isCompass = scenario.id === 'compass-rose';

    return {
        phase: 'idle',
        targets,
        optimalPath,
        renderPath: optimalPath.map(t => ({ x: t.x, y: t.y, targetId: t.id })),
        score: 0,
        hits: 0,
        shots: 0,
        timeElapsed: 0,
        trackingTime: 0,
        trackingTotal: 0,
        lastHitTime: 0,
        reactionTimes: [],
        nextSpawnTime: scenario.scoring === 'reaction'
            ? performance.now() + (scenario.id === 'visual-reaction' ? 2000 + Math.random() * 3000 : 1000 + Math.random() * 2000)
            : 0,
        message: scenario.id === 'visual-reaction' ? 'Wait...' : (isCompass ? 'Hit CENTER to start' : undefined),
        isRed: false,
        cursorX,
        cursorY,
        width,
        height,
        showPath: (scenario.movement === 'static' || scenario.movement === 'strafe') && !isCompass,
        replayLog: [],
        adaptiveSpeed: 1.0,
        adaptiveScore: 0,
        // Compass Rose state
        compassIndex: isCompass ? 0 : undefined, // Start at CENTER (index 0)
        compassLap: isCompass ? 1 : undefined,
        compassClockwise: isCompass ? true : undefined, // First lap is clockwise
        lapTimes: isCompass ? [] : undefined,
        lapStartTime: undefined,
    };
}

export function createTarget(
    index: number,
    width: number,
    height: number,
    size: number,
    margin: number,
    scenario: Scenario,
    existingTargets: Target[]
): Target {
    let x: number, y: number;
    let attempts = 0;

    // Find non-overlapping position
    do {
        x = margin + Math.random() * (width - margin * 2 - size);
        y = (scenario.scoring === 'reaction' ? margin : (margin + 70)) + Math.random() * (height - margin * 2 - size - 70);
        attempts++;
    } while (
        attempts < 100 &&
        existingTargets.some(t => {
            const dx = x - t.x;
            const dy = y - t.y;
            return Math.sqrt(dx * dx + dy * dy) < size + t.size + 10;
        })
    );

    // Velocity based on movement type
    let vx = 0, vy = 0;
    const speed = scenario.speed || 0;

    if (scenario.movement === 'strafe') {
        vx = (Math.random() > 0.5 ? 1 : -1) * speed;
    } else if (scenario.movement === 'smooth') {
        const angle = Math.random() * Math.PI * 2;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
    }

    return {
        id: `target-${index}-${Date.now()}-${Math.random()}`,
        x,
        y,
        vx,
        vy,
        size,
        hit: false,
    };
}

// Respawn a target at new position
export function respawnTarget(
    state: GameState,
    scenario: Scenario,
    targetId: string
): Target[] {
    const scaledSize = scaleSize(scenario.targetSize, state.height);
    const margin = 50;

    return state.targets.map(t => {
        if (t.id === targetId) {
            if (scenario.pattern === 'compass') {
                return { ...t, hit: false }; // Just reset the same target
            }
            return createTarget(
                0,
                state.width,
                state.height,
                scaledSize,
                margin,
                scenario,
                state.targets.filter(ot => ot.id !== targetId)
            );
        }
        return t;
    });
}

// Update target positions (called every frame)
export function updateTargets(
    targets: Target[],
    width: number,
    height: number,
    scenario: Scenario,
    deltaTime: number
): Target[] {
    if (scenario.movement === 'static') return targets;

    const dtScale = deltaTime / (1000 / 60); // Normalize to 60fps baseline

    return targets.map(t => {
        if (t.hit) return t;

        let { x, y, vx, vy } = t;
        x += vx * dtScale;
        y += vy * dtScale;

        // Bounce off walls
        const halfSize = t.size / 2;
        if (x < halfSize || x > width - halfSize) {
            vx = -vx;
            x = Math.max(halfSize, Math.min(width - halfSize, x));
        }
        if (y < halfSize || y > height - halfSize) {
            vy = -vy;
            y = Math.max(halfSize, Math.min(height - halfSize, y));
        }

        // Smooth tracking: add slight random direction changes
        if (scenario.movement === 'smooth' && Math.random() < 0.02) {
            const angle = Math.atan2(vy, vx) + (Math.random() - 0.5) * 0.5;
            const speed = scenario.speed || 2;
            vx = Math.cos(angle) * speed;
            vy = Math.sin(angle) * speed;
        }

        return { ...t, x, y, vx, vy };
    });
}

// Check if cursor is on target (for tracking)
export function isCursorOnTarget(
    cursorX: number,
    cursorY: number,
    target: Target
): boolean {
    const dx = cursorX - target.x;
    const dy = cursorY - target.y;
    return Math.sqrt(dx * dx + dy * dy) <= target.size / 2;
}

// Check click hit
export function checkHit(
    clickX: number,
    clickY: number,
    targets: Target[],
    scenario?: Scenario // Added scenario parameter
): Target | null {
    // For reaction test: click anywhere on screen counts as hit if target is visible
    if (scenario?.scoring === 'reaction' && targets.length > 0) {
        return targets[0]; // If target exists, it's a hit regardless of position
    }

    for (const target of targets) {
        if (target.hit) continue;
        const dx = clickX - target.x;
        const dy = clickY - target.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d <= target.size / 2 + 2) { // 2px tolerance
            return target;
        }
    }
    return null;
}

// Calculate final score based on scenario type
export function calculateScore(state: GameState, scenario: Scenario): {
    primary: number;
    label: string;
    secondary?: number;
    secondaryLabel?: string;
} {
    const timeSeconds = state.timeElapsed / 1000;

    switch (scenario.scoring) {
        case 'tps':
            return {
                primary: timeSeconds > 0 ? +(state.hits / timeSeconds).toFixed(2) : 0,
                label: 'Targets/sec',
                secondary: state.hits,
                secondaryLabel: 'Total Hits',
            };
        case 'accuracy':
            const accuracy = state.shots > 0 ? +((state.hits / state.shots) * 100).toFixed(1) : 0;
            const tps = timeSeconds > 0 ? +(state.hits / timeSeconds).toFixed(2) : 0;
            return {
                primary: +(accuracy * tps / 10).toFixed(1),
                label: 'Score',
                secondary: accuracy,
                secondaryLabel: 'Accuracy %',
            };
        case 'tracking':
            const trackPct = state.trackingTotal > 0
                ? +((state.trackingTime / state.trackingTotal) * 100).toFixed(1)
                : 0;
            return {
                primary: trackPct,
                label: 'Tracking %',
            };
        case 'benchmark':
            const hitsPerSec = timeSeconds > 0 ? +(state.hits / timeSeconds).toFixed(2) : 0;
            return {
                primary: hitsPerSec,
                label: 'Hits/sec (auto)',
                secondary: state.hits,
                secondaryLabel: 'Total Frames',
            };
        case 'reaction':
            const avgReaction = state.reactionTimes.length > 0
                ? Math.round(state.reactionTimes.reduce((a, b) => a + b, 0) / state.reactionTimes.length)
                : 0;
            return {
                primary: avgReaction,
                label: 'Avg Reaction (ms)',
                secondary: state.reactionTimes.length > 0 ? Math.min(...state.reactionTimes) : 0,
                secondaryLabel: 'Best (ms)',
            };
        case 'adaptive':
            const adaptiveTrackPct = state.trackingTotal > 0
                ? +((state.trackingTime / state.trackingTotal) * 100).toFixed(1)
                : 0;
            return {
                primary: Math.round(state.adaptiveScore),
                label: 'Adaptive Score',
                secondary: adaptiveTrackPct,
                secondaryLabel: 'Tracking %',
            };
        default:
            return { primary: state.score, label: 'Score' };
    }
}

// Interpolate color from green to very faded - emphasize first 2 segments
function getPathColor(index: number, total: number): string {
    // First segment: bright green
    if (index === 0) {
        return 'rgba(34, 197, 94, 0.9)';
    }
    // Second segment: lighter green, still visible
    if (index === 1) {
        return 'rgba(34, 197, 94, 0.5)';
    }
    // Rest: very subtle gray, fades with distance
    const fadeProgress = Math.min(1, (index - 1) / Math.max(1, total - 2));
    const opacity = 0.2 - fadeProgress * 0.12; // 0.2 -> 0.08
    return `rgba(100, 100, 100, ${opacity})`;
}

// Render game to canvas
export function renderGame(
    ctx: CanvasRenderingContext2D,
    state: GameState,
    scenario: Scenario
): void {
    const { width, height, targets, renderPath, cursorX, cursorY, showPath, isRed, message } = state;

    // Clear / Background
    ctx.fillStyle = isRed ? '#ef4444' : '#000';
    ctx.fillRect(0, 0, width, height);

    // Draw Calibration Guide Circle for Compass Rose
    if (scenario.id === 'compass-rose' && state.phase === 'playing') {
        ctx.beginPath();
        // Wider ellipse for better edge-to-edge calibration
        ctx.ellipse(width / 2, height / 2, width * 0.45, height * 0.43, 0, 0, Math.PI * 2);
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.2)'; // More visible
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.setLineDash([]);
    }


    // Draw Message (Wait / Too Early / Click)
    if (message) {
        ctx.fillStyle = isRed ? '#000' : '#fff';
        ctx.font = 'bold 48px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const lines = message.split('\n');
        const lineHeight = 60;
        const startY = (height / 2) - ((lines.length - 1) * lineHeight) / 2;

        lines.forEach((line, i) => {
            ctx.fillText(line, width / 2, startY + i * lineHeight);
        });
    }

    // Draw TSP path lines using interpolated renderPath for smooth transitions
    // CRITICAL: Strictly suppress path during countdown (idle phase)
    if (showPath && renderPath.length > 0 && state.phase === 'playing') {
        let prevX = cursorX;
        let prevY = cursorY;
        let segmentsDrawn = 0;

        for (let i = 0; i < renderPath.length; i++) {
            const renderPos = renderPath[i];
            const target = targets.find(t => t.id === renderPos.targetId); // Check against main targets
            if (!target || target.hit) continue;

            const color = getPathColor(segmentsDrawn, renderPath.length);

            // Use interpolated position for smooth line movement
            const targetX = renderPos.x;
            const targetY = renderPos.y;

            const dx = targetX - prevX;
            const dy = targetY - prevY;
            const d = Math.sqrt(dx * dx + dy * dy);

            // Don't draw line if cursor is overlapping the target
            if (d > target.size / 2 + 5) {
                const startX = prevX;
                const startY = prevY;
                const endX = targetX - (dx / d) * (target.size / 2);
                const endY = targetY - (dy / d) * (target.size / 2);

                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.strokeStyle = color;
                ctx.lineWidth = segmentsDrawn === 0 ? 2 : 1;
                ctx.stroke();

                // Draw arrowhead
                const arrowSize = 5;
                const angle = Math.atan2(dy, dx);
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - arrowSize * Math.cos(angle - Math.PI / 6),
                    endY - arrowSize * Math.sin(angle - Math.PI / 6)
                );
                ctx.lineTo(
                    endX - arrowSize * Math.cos(angle + Math.PI / 6),
                    endY - arrowSize * Math.sin(angle + Math.PI / 6)
                );
                ctx.closePath();
                ctx.fillStyle = color;
                ctx.fill();
            }

            prevX = targetX;
            prevY = targetY;
            segmentsDrawn++;
        }
    }

    // Targets are now rendered via DOM in Game.tsx for better fullscreen performance.
    // This allows the browser to optimize the targets as individual layers.

    // Draw crosshair (only in non-tracking mode when playing)
    // REMOVED: Canvas crosshair caused double-cursor issue. Relying on DOM .custom-crosshair in Game.tsx


    // Tracking cursor (circle that shows if you're on target)
    if (scenario.scoring === 'tracking' && state.phase === 'playing') {
        const target = targets[0];
        const isOnTarget = target && isCursorOnTarget(cursorX, cursorY, target);

        ctx.beginPath();
        ctx.arc(cursorX, cursorY, 8, 0, Math.PI * 2);
        ctx.fillStyle = isOnTarget ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
        ctx.fill();
    }
}

// Helper to calculate accuracy based on scenario type
export function getAccuracy(state: GameState, scenario: Scenario): number {
    if (scenario.scoring === 'tracking' || scenario.scoring === 'adaptive') {
        return state.trackingTotal > 0 ? (state.trackingTime / state.trackingTotal) * 100 : 0;
    }
    // Default click accuracy
    return state.shots > 0 ? (state.hits / state.shots) * 100 : 0;
}

import { useEffect, useRef, useCallback, useState } from 'preact/hooks';
import {
    createGameState,
    updateTargets,
    checkHit,
    respawnTarget,
    isCursorOnTarget,
    calculateScore,
    renderGame,
    solveTSP,
    calculatePathLength,
    updateRenderPath,
    createTarget,
    getAccuracy
} from './gameEngine';
import { GameState, Target, Scenario } from './types';

interface GameProps {
    scenario: Scenario;
    onEnd: (results: {
        scenario: Scenario;
        primary: number;
        label: string;
        secondary?: number;
        secondaryLabel?: string;
        hits: number;
        shots: number;
        timeElapsed: number;
        mouseDpi?: number;
        viewportW?: number;
        viewportH?: number;
        devicePixelRatio?: number;
        viewScale?: number;
    }) => void;
    onExit: () => void;
    fpsLimit?: number;
    mouseDpi?: number;
}

export default function Game({ scenario, onEnd, onExit, fpsLimit = 0, mouseDpi }: GameProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const gameStateRef = useRef<GameState | null>(null);
    const lastFrameRef = useRef(0);
    const frameCountRef = useRef(0);
    const fpsTimeRef = useRef(0);
    const lastTspUpdateRef = useRef(0);

    // Direct DOM refs for targets
    const targetElementsRef = useRef<Record<string, HTMLDivElement>>({});
    const crosshairRef = useRef<HTMLDivElement>(null);

    const fpsIntervalRef = useRef(0);

    const [isPlaying, setIsPlaying] = useState(false);
    const [countdown, setCountdown] = useState(3);
    const countdownRef = useRef(3);
    const [hudState, setHudState] = useState({ hits: 0, time: 0, fps: 0, pathLength: 0, accuracy: 0, adaptiveSpeed: 1.0, adaptiveScore: 0 });
    const [viewScale, setViewScale] = useState(1);
    const viewScaleRef = useRef(1);

    // React state for targets - only for spawning/removing
    const [targets, setTargets] = useState<Target[]>([]);

    useEffect(() => {
        fpsIntervalRef.current = fpsLimit > 0 ? 1000 / fpsLimit : 0;
    }, [fpsLimit]);

    // Initialize resolution relative to container
    const initGame = useCallback(() => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.height === 0) return;

        const height = 1080; // Fixed vertical reference
        const aspect = rect.width / rect.height;
        const width = Math.round(height * aspect);

        const MIN_SCALE = 0.5;
        // Scale based on height to maintain vertical FOV
        const scale = Math.max(MIN_SCALE, rect.height / height);

        setViewScale(scale);
        viewScaleRef.current = scale;

        const state = createGameState(scenario, width, height);
        gameStateRef.current = state;
        setTargets([...state.targets]);

        if (contentRef.current) {
            contentRef.current.style.width = `${width}px`;
            contentRef.current.style.height = `${height}px`;
        }

        const canvas = canvasRef.current;
        if (canvas) {
            const dpr = Math.min(1.5, window.devicePixelRatio || 1);
            canvas.width = width * dpr;
            canvas.height = height * dpr;

            // Apply styles manually for consistency, though absolute positioning handles layout
            canvas.style.width = '100%';
            canvas.style.height = '100%';

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                renderGame(ctx, gameStateRef.current, scenario);
            }
        }
    }, [scenario]);

    useEffect(() => {
        const handleFsChange = () => {
            if (!document.fullscreenElement && document.pointerLockElement) {
                document.exitPointerLock();
            }
        };
        const handlePlChange = () => {
            // If pointer lock is lost but window still has focus, it's likely the user pressed ESC
            // We treat this as an "Exit" intent for a quicker workflow
            if (!document.pointerLockElement && document.hasFocus()) {
                onExit();
            }
        };
        document.addEventListener('fullscreenchange', handleFsChange);
        document.addEventListener('pointerlockchange', handlePlChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFsChange);
            document.removeEventListener('pointerlockchange', handlePlChange);
        };
    }, [onExit]);

    // AUTOMATIC STEALTH BOOST
    useEffect(() => {
        const boost = async () => {
            if (!containerRef.current) return;
            try {
                // Couple Pointer Lock immediately for raw input (Unadjusted for lowest latency)
                if (!document.pointerLockElement && containerRef.current.requestPointerLock) {
                    // @ts-ignore - unadjustedMovement is a newer/experimental but widely supported feature in Chromium
                    await containerRef.current.requestPointerLock({
                        unadjustedMovement: true
                    });
                }
            } catch (err) {
                // Silently fallback to borderless if gesture is lost
            }
        };

        // Short delay to ensure mount is processed and gesture is still valid
        const timer = setTimeout(boost, 10);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        let isActive = true;
        initGame();
        let count = 3;
        setCountdown(count);

        const interval = setInterval(() => {
            if (!isActive) return;
            count--;
            countdownRef.current = count;
            if (count > 0) {
                setCountdown(count);
            } else {
                clearInterval(interval);
                setCountdown(0);
                countdownRef.current = 0;
                setIsPlaying(true);

                const now = performance.now();
                lastFrameRef.current = now;
                fpsTimeRef.current = now;

                if (gameStateRef.current) {
                    gameStateRef.current.phase = 'playing';
                    gameStateRef.current.lastHitTime = now;
                    gameStateRef.current.timeElapsed = 0;
                }
            }
        }, 1000);

        return () => {
            isActive = false;
            clearInterval(interval);
        };
    }, [initGame]);

    // Game Loop
    useEffect(() => {
        if (!isPlaying) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', {
            alpha: true,
            // desynchronized: true, // Disabled to prevent potential visual desync with DOM
            willReadFrequently: false,
            // @ts-ignore
            powerPreference: 'high-performance'
        }) as CanvasRenderingContext2D;
        if (!ctx) return;

        if (gameStateRef.current) {
            gameStateRef.current.width = 1920;
            gameStateRef.current.height = 1080;
        }

        const resizeObserver = new ResizeObserver(() => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect && rect.height > 0) {
                const height = 1080;
                const aspect = rect.width / rect.height;
                const width = Math.round(height * aspect);

                const MIN_SCALE = 0.5;
                const scale = Math.max(MIN_SCALE, rect.height / height);
                setViewScale(scale);
                viewScaleRef.current = scale;

                if (contentRef.current) {
                    contentRef.current.style.width = `${width}px`;
                    contentRef.current.style.height = `${height}px`;
                }

                // Update game state dimensions dynamically
                if (gameStateRef.current) {
                    gameStateRef.current.width = width;
                    // We don't update height as it's fixed 1080

                    // Strict Sync: Update canvas if resolution mismatches at all
                    const canvas = canvasRef.current;
                    // Use 1x DPI for performance (high-DPI scaling hurts fullscreen perf)
                    const dpr = 1;
                    const targetW = Math.round(width * dpr);

                    if (canvas && Math.abs(canvas.width - targetW) > 1) {
                        canvas.width = targetW;
                        canvas.height = height * dpr;
                        const ctx = canvas.getContext('2d');
                        if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    }
                }
            }
            if (gameStateRef.current && (scenario.movement === 'static' || scenario.scoring === 'tps')) {
                gameStateRef.current.optimalPath = solveTSP(gameStateRef.current.targets, gameStateRef.current.cursorX, gameStateRef.current.cursorY);
            }
        });
        if (containerRef.current) resizeObserver.observe(containerRef.current);

        let hudUpdateTime = 0;
        let lastLogicTime = performance.now();
        let lastVisualTime = performance.now();
        let isLooping = true;

        const channel = new MessageChannel();
        const scheduleNext = () => { if (isLooping) channel.port2.postMessage(undefined); };

        // RENDER LOOP SCHEDULING - use postMessage to window (less throttled than MessageChannel)
        const RENDER_MSG = '__tspaim_render__';
        const scheduleRender = () => {
            if (isLooping) window.postMessage(RENDER_MSG, '*');
        };

        // RENDER FUNCTION - called by either rAF or postMessage
        const doRender = () => {
            const state = gameStateRef.current;
            if (state) {
                renderGame(ctx, state, scenario);
                updateTargetDOM(state);
                frameCountRef.current++;
            }
        };

        // CAPPED RENDER LOOP (VSync-aligned with throttling)
        const cappedRenderLoop = () => {
            if (!isLooping) return;
            const now = performance.now();
            const state = gameStateRef.current;

            if (state && fpsIntervalRef.current > 0) {
                const elapsed = now - lastVisualTime;
                if (elapsed >= fpsIntervalRef.current - 0.1) {
                    renderGame(ctx, state, scenario);
                    updateTargetDOM(state);
                    lastVisualTime = now - (elapsed % fpsIntervalRef.current);
                    frameCountRef.current++;
                }
            }
            requestAnimationFrame(cappedRenderLoop);
        };

        // UNLIMITED RENDER LOOP (postMessage - bypasses VSync)
        const renderHandler = (e: MessageEvent) => {
            if (e.data !== RENDER_MSG || !isLooping) return;
            doRender();
            scheduleRender();
        };
        window.addEventListener('message', renderHandler);

        // Start the appropriate render loop based on FPS setting
        // Use fpsLimit directly (not ref) to avoid stale value issues
        if (fpsLimit > 0) {
            // Capped: use VSync-aligned requestAnimationFrame
            requestAnimationFrame(cappedRenderLoop);
        } else {
            // Unlimited: use high-frequency postMessage
            scheduleRender();
        }

        // HIGH-FREQUENCY LOGIC LOOP (Logic/DOM Bound - Unlocked or Throttled)
        channel.port1.onmessage = () => {
            if (!isLooping) return;
            const now = performance.now();

            if (fpsIntervalRef.current > 0) {
                const elapsed = now - lastLogicTime;
                if (elapsed < fpsIntervalRef.current - 0.1) {
                    if (fpsIntervalRef.current - elapsed > 3) {
                        setTimeout(scheduleNext, 1);
                    } else {
                        scheduleNext();
                    }
                    return;
                }
                lastLogicTime = now - (elapsed % fpsIntervalRef.current);
            } else {
                lastLogicTime = now;
            }

            const state = gameStateRef.current;
            if (!state || state.phase !== 'playing') {
                scheduleNext();
                return;
            }

            const deltaTime = now - lastFrameRef.current;
            lastFrameRef.current = now;

            state.timeElapsed += deltaTime;
            const isTimeEnd = scenario.duration > 0 && state.timeElapsed >= scenario.duration * 1000;
            const isClickEnd = scenario.clickLimit && state.hits >= scenario.clickLimit;

            if (isTimeEnd || isClickEnd) {
                state.phase = 'ended';
                onEnd({
                    scenario,
                    ...calculateScore(state, scenario),
                    hits: state.hits,
                    shots: state.shots,
                    timeElapsed: state.timeElapsed,
                    mouseDpi,
                    viewportW: window.innerWidth,
                    viewportH: window.innerHeight,
                    devicePixelRatio: window.devicePixelRatio,
                    viewScale: viewScale
                });
                return;
            }

            // Target spawning and logic
            if (scenario.id === 'visual-reaction') {
                if (!state.isRed && now >= state.nextSpawnTime) {
                    state.isRed = true;
                    state.message = 'CLICK!';
                    state.lastHitTime = now;
                }
            } else if (scenario.scoring === 'reaction' && state.targets.length === 0) {
                if (now >= state.nextSpawnTime) {
                    const size = scenario.targetSize * (state.height / 1080);
                    const newTarget = createTarget(0, state.width, state.height, size, 50, scenario, []);
                    state.targets.push(newTarget);
                    state.lastHitTime = now;
                    setTargets([...state.targets]);
                }
            }

            state.targets = updateTargets(state.targets, state.width, state.height, scenario, deltaTime);

            if (scenario.scoring === 'tracking') {
                const target = state.targets[0];
                if (target && isCursorOnTarget(state.cursorX, state.cursorY, target)) {
                    state.trackingTime += deltaTime;
                }
                state.trackingTotal += deltaTime;
            }

            // Adaptive tracking: speed scales with accuracy, score scales with speed
            if (scenario.scoring === 'adaptive') {
                const target = state.targets[0];
                const isOnTarget = target && isCursorOnTarget(state.cursorX, state.cursorY, target);

                if (isOnTarget) {
                    state.trackingTime += deltaTime;
                    // Increase speed when on target (up to 5x)
                    state.adaptiveSpeed = Math.min(5.0, state.adaptiveSpeed + deltaTime * 0.002);
                    // Accumulate score based on current speed
                    state.adaptiveScore += deltaTime * state.adaptiveSpeed * 0.1;
                } else {
                    // Decrease speed when off target (min 0.5x)
                    state.adaptiveSpeed = Math.max(0.5, state.adaptiveSpeed - deltaTime * 0.004);
                }
                state.trackingTotal += deltaTime;

                // Apply adaptive speed to target movement
                if (target) {
                    const baseSpeed = scenario.speed || 2;
                    const adaptedSpeed = baseSpeed * state.adaptiveSpeed;
                    const angle = Math.atan2(target.vy, target.vx);
                    target.vx = Math.cos(angle) * adaptedSpeed;
                    target.vy = Math.sin(angle) * adaptedSpeed;
                }
            }

            if (scenario.movement !== 'static') {
                state.optimalPath = solveTSP(state.targets, state.cursorX, state.cursorY);
            }

            if (state.showPath && countdownRef.current === 0 && isPlaying) updateRenderPath(state);

            if (scenario.autoPlay && state.optimalPath.length > 0) {
                const firstTarget = state.optimalPath[0];
                if (firstTarget && !firstTarget.hit && isCursorOnTarget(state.cursorX, state.cursorY, firstTarget)) {
                    state.hits++;
                    state.shots++;
                    state.score += 100;
                    state.targets = respawnTarget(state, scenario, firstTarget.id);
                    state.optimalPath = solveTSP(state.targets, state.cursorX, state.cursorY);
                    setTargets([...state.targets]);
                }
            }

            if (now - fpsTimeRef.current >= 1000) {
                const fps = Math.round(frameCountRef.current * 1000 / (now - fpsTimeRef.current));
                frameCountRef.current = 0;
                fpsTimeRef.current = now;
                const pathLen = state.showPath ? calculatePathLength(state.optimalPath, state.cursorX, state.cursorY) : 0;
                const accuracy = scenario.scoring === 'tracking' || scenario.scoring === 'adaptive'
                    ? (state.trackingTotal > 0 ? (state.trackingTime / state.trackingTotal) * 100 : 0)
                    : (state.shots > 0 ? (state.hits / state.shots) * 100 : 0);
                setHudState({
                    hits: state.hits,
                    time: Math.floor(state.timeElapsed / 1000),
                    fps,
                    pathLength: pathLen,
                    accuracy: Math.round(accuracy),
                    adaptiveSpeed: state.adaptiveSpeed,
                    adaptiveScore: state.adaptiveScore
                });
            } else if (now - hudUpdateTime > 100) {
                hudUpdateTime = now;
                const accuracy = getAccuracy(state, scenario);

                setHudState(prev => ({
                    ...prev,
                    hits: state.hits,
                    time: Math.floor(state.timeElapsed / 1000),
                    accuracy: Math.round(accuracy),
                    adaptiveSpeed: state.adaptiveSpeed,
                    adaptiveScore: state.adaptiveScore
                }));
            }

            scheduleNext();
        };

        scheduleNext();

        return () => {
            isLooping = false;
            resizeObserver.disconnect();
            window.removeEventListener('message', renderHandler);
        };
    }, [isPlaying, scenario, onEnd, fpsLimit]);

    // Helper for decoupled DOM updates
    const updateTargetDOM = (state: GameState) => {
        const firstTargetId = state.optimalPath.length > 0 ? state.optimalPath[0].id : null;

        for (const target of state.targets) {
            if (target.hit) continue;
            const el = targetElementsRef.current[target.id];
            if (el) {
                // High-performance movement
                el.style.transform = `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`;

                // Throttled style updates (only change visual state if needed)
                const isFirst = target.id === firstTargetId;
                const currentZ = el.style.zIndex;

                if (isFirst && currentZ !== '100') {
                    el.style.zIndex = '100';
                    el.style.borderColor = 'rgba(34, 197, 94, 0.8)';
                    el.style.backgroundColor = 'rgba(34, 197, 94, 0.15)';
                } else if (!isFirst && currentZ !== '10' && currentZ !== '') {
                    el.style.zIndex = '10';
                    el.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                    el.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
            }
        }
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!gameStateRef.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const state = gameStateRef.current;

        if (document.pointerLockElement) {
            // Scale pointer movement relative to our 1080p virtual space
            state.cursorX += e.movementX / viewScaleRef.current;
            state.cursorY += e.movementY / viewScaleRef.current;
            // Clamp to virtual bounds
            state.cursorX = Math.max(0, Math.min(state.width, state.cursorX));
            state.cursorY = Math.max(0, Math.min(1080, state.cursorY));
        } else {
            // Map window coordinates to virtual space, accounting for centering offset
            // The virtual workspace is centered in the container.
            // visual_x = (cursorX * viewScale) + offset_x
            // offset_x = (rect.width - (1920 * viewScale)) / 2
            // cursorX = (visual_x - offset_x) / viewScale

            const relativeX = e.clientX - rect.left;
            const relativeY = e.clientY - rect.top;

            const virtualW = state.width;
            const offsetX = (rect.width - (virtualW * viewScaleRef.current)) / 2;
            const offsetY = (rect.height - (1080 * viewScaleRef.current)) / 2;

            state.cursorX = (relativeX - offsetX) / viewScaleRef.current;
            state.cursorY = (relativeY - offsetY) / viewScaleRef.current;
        }

        const now = performance.now();

        // Zero-Latency Crosshair Update (Direct from Event)
        if (crosshairRef.current) {
            crosshairRef.current.style.transform = `translate3d(${state.cursorX}px, ${state.cursorY}px, 0) translate(-50%, -50%)`;
        }

        if (state.showPath && now - lastTspUpdateRef.current > 50) {
            state.optimalPath = solveTSP(state.targets, state.cursorX, state.cursorY);
            lastTspUpdateRef.current = now;
        }
    }, [scenario.movement, scenario.scoring]);

    const handleMouseDown = useCallback((e: MouseEvent) => {
        if (!gameStateRef.current || !containerRef.current || gameStateRef.current.phase !== 'playing') return;

        // Request Pointer Lock on interaction if not active
        if (!document.pointerLockElement && containerRef.current.requestPointerLock) {
            // @ts-ignore
            containerRef.current.requestPointerLock({ unadjustedMovement: true });
        }

        if (scenario.scoring === 'tracking') return;
        const rect = containerRef.current.getBoundingClientRect();
        const state = gameStateRef.current;

        // CRITICAL: If not locked yet, we must map THIS click event to virtual space
        // This ensures the first click (to engage lock) can still hit a target.
        if (!document.pointerLockElement) {
            const virtualW = state.width;
            const offsetX = (rect.width - (virtualW * viewScaleRef.current)) / 2;
            const offsetY = (rect.height - (1080 * viewScaleRef.current)) / 2;

            const relativeX = e.clientX - rect.left;
            const relativeY = e.clientY - rect.top;

            state.cursorX = (relativeX - offsetX) / viewScaleRef.current;
            state.cursorY = (relativeY - offsetY) / viewScaleRef.current;
        }

        const cursorX = state.cursorX;
        const cursorY = state.cursorY;
        state.shots++;

        if ((scenario.id === 'visual-reaction' || scenario.scoring === 'reaction') && !state.isRed && state.targets.length === 0) {
            state.message = 'Too Early!';
            const delay = scenario.id === 'visual-reaction' ? (2000 + Math.random() * 3000) : (1000 + Math.random() * 2000);
            state.nextSpawnTime = performance.now() + delay;
            state.shots--;
            return;
        }

        const hitTarget = scenario.id === 'visual-reaction' && state.isRed
            ? { id: 'visual', x: 0, y: 0, vx: 0, vy: 0, size: 0, hit: false }
            : checkHit(cursorX, cursorY, state.targets, scenario);

        if (hitTarget) {
            // Compass Rose: Enforce sequence
            if (scenario.id === 'compass-rose' && state.compassIndex !== undefined) {
                const expectedIndex = state.compassIndex;
                const hitIndex = state.targets.findIndex(t => t.id === hitTarget.id);

                // Build the expected sequence based on direction
                // Sequence: CENTER(0), then 1-8 clockwise or 8-1 counter-clockwise
                let expectedTargetIndex: number;
                if (expectedIndex === 0) {
                    expectedTargetIndex = 0; // CENTER
                } else if (state.compassClockwise) {
                    expectedTargetIndex = expectedIndex; // 1, 2, 3, 4, 5, 6, 7, 8
                } else {
                    expectedTargetIndex = 9 - expectedIndex; // 8, 7, 6, 5, 4, 3, 2, 1
                }

                if (hitIndex !== expectedTargetIndex) {
                    // Wrong target - don't count as hit
                    state.shots--; // Undo shot count for wrong target
                    return;
                }

                // Correct hit!
                state.hits++;
                state.score += 100;

                // Start lap timer when hitting CENTER
                if (expectedIndex === 0) {
                    state.lapStartTime = performance.now();
                }

                // Advance sequence
                state.compassIndex++;

                // Check if lap complete (hit all 9 targets: CENTER + 1-8)
                if (state.compassIndex > 8) {
                    // Record lap time
                    if (state.lapTimes && state.lapStartTime) {
                        const lapTime = (performance.now() - state.lapStartTime) / 1000;
                        state.lapTimes.push(lapTime);
                    }

                    // Start new lap
                    state.compassIndex = 0; // Back to CENTER
                    state.compassLap = (state.compassLap || 1) + 1;
                    state.compassClockwise = !state.compassClockwise; // Alternate direction

                    const direction = state.compassClockwise ? '→ CW' : '← CCW';
                    state.message = `Lap ${state.compassLap} ${direction}`;
                } else {
                    // Update message with next target
                    const nextLabel = state.compassIndex === 0 ? 'CENTER' :
                        (state.compassClockwise ? state.compassIndex : 9 - state.compassIndex);
                    state.message = `Hit ${nextLabel}`;
                }

                setTargets([...state.targets]);
                return;
            }

            // Normal hit handling for other scenarios
            state.hits++;
            state.score += 100;
            if (scenario.scoring === 'reaction') {
                const now = performance.now();
                state.reactionTimes.push(now - state.lastHitTime);
                state.lastHitTime = now;
            }
            if (scenario.id === 'visual-reaction') {
                state.isRed = false;
                state.message = 'Wait...';
                state.nextSpawnTime = performance.now() + 2000 + Math.random() * 3000;
            } else if (scenario.scoring === 'reaction') {
                state.targets = [];
                state.nextSpawnTime = performance.now() + 300 + Math.random() * 500;
                state.message = 'Wait...';
            } else if (scenario.noRespawn) {
                state.targets = state.targets.map(t => t.id === hitTarget.id ? { ...t, hit: true } : t);
            } else {
                // Respawn for all scenarios (static, strafe, etc.)
                state.targets = respawnTarget(state, scenario, hitTarget.id);
            }
            state.optimalPath = solveTSP(state.targets, state.cursorX, state.cursorY);
            setTargets([...state.targets]);
        }
    }, [scenario]);

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            // Explicitly exit game state immediately
            onExit();

            // Clean up browser states if they haven't auto-exited
            if (document.pointerLockElement) document.exitPointerLock();
            if (document.fullscreenElement) document.exitFullscreen();
        }
    }, [onExit]);

    useEffect(() => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('keydown', handleKeyDown);
        const prevent = (e: Event) => e.preventDefault();
        window.addEventListener('contextmenu', prevent);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('contextmenu', prevent);
        };
    }, [handleMouseMove, handleMouseDown, handleKeyDown]);

    return (
        <div ref={containerRef} className="game-container">
            {/* Zero-Latency Virtual Scaling Wrapper */}
            <div
                ref={contentRef}
                className="virtual-workspace"
                style={{
                    transform: `scale(${viewScale})`,
                    pointerEvents: 'none',
                    '--view-scale': viewScale
                } as any}
            >
                <canvas
                    ref={canvasRef}
                    // Width/Height managed manually by initGame for DPR support
                    style={{
                        width: '100%',
                        height: '100%',
                        cursor: isPlaying ? 'none' : 'default',
                        pointerEvents: 'none',
                        position: 'absolute',
                        top: 0,
                        left: 0
                    }}
                />
                {isPlaying && (
                    <div className="targets-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        {targets.filter(t => !t.hit).map((target) => {
                            const state = gameStateRef.current;
                            const pathIndex = state?.optimalPath.findIndex(pt => pt.id === target.id) ?? -1;

                            // Compass Rose: Determine if this target is the active one
                            let isActiveCompass = false;
                            if (scenario.id === 'compass-rose' && state?.compassIndex !== undefined) {
                                const expectedIndex = state.compassIndex;
                                let expectedTargetIndex: number;
                                if (expectedIndex === 0) {
                                    expectedTargetIndex = 0; // CENTER
                                } else if (state.compassClockwise) {
                                    expectedTargetIndex = expectedIndex;
                                } else {
                                    expectedTargetIndex = 9 - expectedIndex;
                                }
                                const actualIdx = state.targets.findIndex(t => t.id === target.id);
                                isActiveCompass = actualIdx === expectedTargetIndex;
                            }

                            const isFirst = scenario.id === 'compass-rose' ? isActiveCompass : pathIndex === 0;
                            const isDimmed = scenario.id === 'compass-rose' && !isActiveCompass;

                            return (
                                <div
                                    key={target.id}
                                    ref={el => {
                                        if (el) targetElementsRef.current[target.id] = el;
                                        else delete targetElementsRef.current[target.id];
                                    }}
                                    className={`target-element spawn ${scenario.id === 'compass-rose' ? 'farm' : ''} ${target.label === 'CENTER' ? 'center-target' : ''}`}
                                    onAnimationEnd={(e) => {
                                        // Remove spawn class after animation so JS can control transform
                                        e.currentTarget.classList.remove('spawn');
                                    }}
                                    style={{
                                        width: target.size,
                                        height: target.size,
                                        backgroundColor: isFirst ? 'rgba(34, 197, 94, 0.2)' : (isDimmed ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.1)'),
                                        border: `2px solid ${isFirst ? 'rgba(34, 197, 94, 0.9)' : (isDimmed ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.4)')}`,
                                        zIndex: isFirst ? 100 : 10,
                                        opacity: isDimmed ? 0.5 : 1,
                                        '--tx': `${target.x}px`,
                                        '--ty': `${target.y}px`,
                                        transform: `translate3d(${target.x}px, ${target.y}px, 0) translate(-50%, -50%)`,
                                    } as any}
                                >
                                    {isPlaying && (target.label || (state?.showPath && pathIndex >= 0)) && (() => {
                                        const labelText = target.label || String(pathIndex + 1);
                                        const isLongNumber = labelText.length >= 3;
                                        const baseFontSize = target.size * (target.label === 'CENTER' ? 0.25 : 0.4);
                                        const fontSize = isLongNumber ? Math.max(8, baseFontSize * 0.65) : Math.max(10, baseFontSize);
                                        return (
                                            <span style={{
                                                color: isFirst ? 'rgba(34, 197, 94, 1)' : (isDimmed ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.8)'),
                                                fontSize,
                                                fontWeight: 'bold',
                                                pointerEvents: 'none'
                                            }}>
                                                {labelText}
                                            </span>
                                        );
                                    })()}
                                </div>
                            );
                        })}
                    </div>
                )}
                {isPlaying && (
                    <div className="crosshair-layer" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                        <div ref={crosshairRef} className="custom-crosshair" />
                    </div>
                )}
            </div>

            {countdown > 0 && (
                <div className="countdown-overlay">
                    <div className="countdown-number">{countdown}</div>
                    <div className="countdown-scenario">{scenario.name}</div>
                    {/* Stealth mode: No technical button or jargon here */}
                </div>
            )}
            {isPlaying && (
                <div className="game-hud">
                    <div className="hud-item">
                        <span className="hud-value">
                            {scenario.scoring === 'adaptive'
                                ? Math.round(hudState.adaptiveScore)
                                : scenario.scoring === 'tracking'
                                    ? `${hudState.accuracy}%`
                                    : hudState.hits}
                        </span>
                        <span className="hud-label">
                            {scenario.scoring === 'adaptive' ? 'Score' : scenario.scoring === 'tracking' ? 'Track' : 'Hits'}
                        </span>
                    </div>
                    {scenario.scoring === 'adaptive' && (
                        <div className="hud-item">
                            <span className="hud-value" style={{ color: hudState.adaptiveSpeed >= 3 ? '#22c55e' : hudState.adaptiveSpeed <= 1 ? '#ef4444' : '#fff' }}>
                                {hudState.adaptiveSpeed.toFixed(1)}x
                            </span>
                            <span className="hud-label">Speed</span>
                        </div>
                    )}
                    <div className="hud-item">
                        <span className="hud-value">{scenario.duration - hudState.time}s</span>
                        <span className="hud-label">Time</span>
                    </div>
                    {hudState.pathLength > 0 && (
                        <div className="hud-item">
                            <span className="hud-value">{Math.round(hudState.pathLength)}px</span>
                            <span className="hud-label">Path</span>
                        </div>
                    )}
                    <div className="hud-item hud-fps">
                        <span className="hud-value">{hudState.fps}</span>
                        <span className="hud-label">FPS</span>
                    </div>
                </div>
            )}
            <div className="exit-hint">ESC to exit</div>
        </div>
    );
}

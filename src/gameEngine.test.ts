import { describe, it, expect } from 'vitest';
import { dist, solveTSP, calculateScore, calculatePathLength, checkHit, isCursorOnTarget } from './gameEngine';
import { scenarios } from './scenarios';
import { Scenario, Target } from './types';

// Helper to create a target for testing
function createTestTarget(overrides: Partial<Target> = {}): Target {
    return {
        id: 'test-target',
        x: 100,
        y: 100,
        vx: 0,
        vy: 0,
        size: 40,
        hit: false,
        ...overrides,
    };
}

describe('Game Engine Logic', () => {
    describe('dist - Distance calculation', () => {
        it('calculates distance for 3-4-5 triangle', () => {
            expect(dist(0, 0, 3, 4)).toBe(5);
        });

        it('calculates zero distance for same point', () => {
            expect(dist(10, 20, 10, 20)).toBe(0);
        });

        it('calculates distance for negative coordinates', () => {
            expect(dist(-3, -4, 0, 0)).toBe(5);
        });
    });

    describe('solveTSP - Path optimization', () => {
        it('solves simple two-target path', () => {
            const targets = [
                createTestTarget({ id: '1', x: 10, y: 10 }),
                createTestTarget({ id: '2', x: 50, y: 50 }),
            ];
            const path = solveTSP(targets, 0, 0);
            expect(path[0].id).toBe('1');
            expect(path[1].id).toBe('2');
        });

        it('handles single target', () => {
            const targets = [createTestTarget({ id: '1', x: 100, y: 100 })];
            const path = solveTSP(targets, 0, 0);
            expect(path).toHaveLength(1);
            expect(path[0].id).toBe('1');
        });

        it('handles empty target array', () => {
            const path = solveTSP([], 0, 0);
            expect(path).toHaveLength(0);
        });

        it('chooses nearest target first', () => {
            const targets = [
                createTestTarget({ id: 'far', x: 500, y: 500 }),
                createTestTarget({ id: 'near', x: 10, y: 10 }),
            ];
            const path = solveTSP(targets, 0, 0);
            expect(path[0].id).toBe('near');
        });

        it('skips already-hit targets', () => {
            const targets = [
                createTestTarget({ id: '1', x: 10, y: 10, hit: true }),
                createTestTarget({ id: '2', x: 50, y: 50, hit: false }),
            ];
            const path = solveTSP(targets, 0, 0);
            expect(path).toHaveLength(1);
            expect(path[0].id).toBe('2');
        });
    });

    describe('calculatePathLength', () => {
        it('calculates path length correctly', () => {
            const path = [
                createTestTarget({ id: '1', x: 10, y: 0 }),
                createTestTarget({ id: '2', x: 20, y: 0 }),
            ];
            expect(calculatePathLength(path, 0, 0)).toBe(20);
        });

        it('returns zero for empty path', () => {
            expect(calculatePathLength([], 0, 0)).toBe(0);
        });
    });

    describe('checkHit - Click detection', () => {
        it('detects hit when clicking inside target', () => {
            const targets = [createTestTarget({ x: 100, y: 100, size: 40 })];
            const hit = checkHit(100, 100, targets);
            expect(hit).not.toBeNull();
        });

        it('detects hit on target edge (with tolerance)', () => {
            const targets = [createTestTarget({ x: 100, y: 100, size: 40 })];
            // Size 40 = radius 20, plus 2px tolerance = 22px from center
            const hit = checkHit(121, 100, targets);
            expect(hit).not.toBeNull();
        });

        it('returns null when clicking outside target', () => {
            const targets = [createTestTarget({ x: 100, y: 100, size: 40 })];
            const hit = checkHit(200, 200, targets);
            expect(hit).toBeNull();
        });

        it('ignores already-hit targets', () => {
            const targets = [createTestTarget({ x: 100, y: 100, size: 40, hit: true })];
            const hit = checkHit(100, 100, targets);
            expect(hit).toBeNull();
        });

        it('returns first unhit target when multiple overlap', () => {
            const targets = [
                createTestTarget({ id: '1', x: 100, y: 100, size: 40 }),
                createTestTarget({ id: '2', x: 105, y: 100, size: 40 }),
            ];
            const hit = checkHit(102, 100, targets);
            expect(hit?.id).toBe('1');
        });
    });

    describe('isCursorOnTarget - Tracking detection', () => {
        it('returns true when cursor is on target', () => {
            const target = createTestTarget({ x: 100, y: 100, size: 40 });
            expect(isCursorOnTarget(100, 100, target)).toBe(true);
        });

        it('returns true on target edge', () => {
            const target = createTestTarget({ x: 100, y: 100, size: 40 });
            // Size 40 = radius 20, so 119 is just inside
            expect(isCursorOnTarget(119, 100, target)).toBe(true);
        });

        it('returns false when cursor is outside target', () => {
            const target = createTestTarget({ x: 100, y: 100, size: 40 });
            expect(isCursorOnTarget(150, 100, target)).toBe(false);
        });
    });

    describe('calculateScore - Scoring types', () => {
        it('calculates TPS score correctly', () => {
            const scenario: Scenario = {
                id: 'test', name: 'Test', description: '',
                duration: 10, targetCount: 1, targetSize: 10,
                movement: 'static', scoring: 'tps'
            };
            const state: any = { hits: 10, timeElapsed: 5000 };
            const score = calculateScore(state, scenario);
            expect(score.primary).toBe(2); // 10 hits / 5 seconds
        });

        it('calculates accuracy score correctly', () => {
            const scenario: Scenario = {
                id: 'test', name: 'Test', description: '',
                duration: 10, targetCount: 1, targetSize: 10,
                movement: 'static', scoring: 'accuracy'
            };
            const state: any = { hits: 5, shots: 10, timeElapsed: 1000 };
            const score = calculateScore(state, scenario);
            expect(score.secondary).toBe(50); // 5/10 = 50%
        });

        it('calculates tracking score correctly', () => {
            const scenario: Scenario = {
                id: 'test', name: 'Test', description: '',
                duration: 10, targetCount: 1, targetSize: 10,
                movement: 'smooth', scoring: 'tracking'
            };
            const state: any = { trackingTime: 5000, trackingTotal: 10000 };
            const score = calculateScore(state, scenario);
            expect(score.primary).toBe(50); // 50% tracking
        });

        it('calculates reaction time correctly', () => {
            const scenario: Scenario = {
                id: 'test', name: 'Test', description: '',
                duration: 60, targetCount: 1, targetSize: 40,
                movement: 'static', scoring: 'reaction'
            };
            const state: any = { reactionTimes: [100, 150, 200, 250, 300] };
            const score = calculateScore(state, scenario);
            expect(score.primary).toBe(200); // Median of sorted array
        });

        it('handles zero shots in accuracy without division by zero', () => {
            const scenario: Scenario = {
                id: 'test', name: 'Test', description: '',
                duration: 10, targetCount: 1, targetSize: 10,
                movement: 'static', scoring: 'accuracy'
            };
            const state: any = { hits: 0, shots: 0, timeElapsed: 1000 };
            const score = calculateScore(state, scenario);
            expect(score.secondary).toBe(0); // Should handle gracefully
        });
    });
});

describe('Scenarios Configuration', () => {
    it('all scenarios have required fields', () => {
        for (const s of scenarios) {
            expect(s.id).toBeDefined();
            expect(s.name).toBeDefined();
            expect(s.description).toBeDefined();
            expect(s.duration).toBeGreaterThan(0);
            expect(s.targetCount).toBeGreaterThanOrEqual(0);
            expect(s.targetSize).toBeGreaterThanOrEqual(0);
            expect(['static', 'strafe', 'smooth']).toContain(s.movement);
            expect(['tps', 'accuracy', 'tracking', 'benchmark', 'reaction', 'adaptive']).toContain(s.scoring);
        }
    });

    it('moving scenarios have speed defined', () => {
        for (const s of scenarios) {
            if (s.movement !== 'static') {
                expect(s.speed).toBeDefined();
                expect(s.speed).toBeGreaterThan(0);
            }
        }
    });

    it('all scenario IDs are unique', () => {
        const ids = scenarios.map(s => s.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
    });
});


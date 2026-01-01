
import { describe, it, expect } from 'vitest';
import { scenarios } from './scenarios';
import { createGameState } from './gameEngine';

describe('Scenarios Configuration', () => {
    it('has valid scenarios', () => {
        expect(scenarios.length).toBeGreaterThan(0);
    });

    it('each scenario has a unique ID', () => {
        const ids = new Set();
        scenarios.forEach(s => {
            expect(ids.has(s.id)).toBe(false);
            ids.add(s.id);
        });
    });

    it('each scenario has valid properties', () => {
        scenarios.forEach(s => {
            expect(s.name).toBeTruthy();
            expect(s.description).toBeTruthy();
            expect(s.duration).toBeGreaterThan(0);

            // Movement types
            expect(['static', 'strafe', 'smooth', 'flick']).toContain(s.movement);

            // Scoring types
            expect(['tps', 'accuracy', 'tracking', 'adaptive', 'benchmark', 'reaction']).toContain(s.scoring);

            if (s.scoring === 'tracking') {
                expect(s.movement).toBe('smooth');
            }
        });
    });

    it('does not contain removed scenarios', () => {
        const removed = ['benchmark', 'linear-calibration', 'reaction'];
        scenarios.forEach(s => {
            expect(removed).not.toContain(s.id);
        });
    });
});

describe('Resolution-Independent Target Bounds', () => {
    const resolutions = [
        { name: '1080p (16:9)', width: 1920, height: 1080 },
        { name: '1440p (16:9)', width: 2560, height: 1080 }, // Virtual 1080 fixed height
        { name: 'Ultrawide (21:9)', width: 2520, height: 1080 },
        { name: '4:3 Aspect', width: 1440, height: 1080 },
        { name: 'Narrow (3:4)', width: 810, height: 1080 },
    ];

    resolutions.forEach(({ name, width, height }) => {
        describe(`at ${name} (${width}x${height})`, () => {
            scenarios.forEach(scenario => {
                // Skip reaction scenarios (no targets)
                if (scenario.scoring === 'reaction' && scenario.targetCount === 0) return;

                it(`${scenario.name}: all targets within bounds`, () => {
                    const state = createGameState(scenario, width, height);

                    state.targets.forEach((target) => {
                        const halfSize = target.size / 2;

                        // Target center should be far enough from edges
                        expect(target.x).toBeGreaterThanOrEqual(halfSize);
                        expect(target.x).toBeLessThanOrEqual(width - halfSize);
                        expect(target.y).toBeGreaterThanOrEqual(halfSize);
                        expect(target.y).toBeLessThanOrEqual(height - halfSize);
                    });
                });
            });
        });
    });
});


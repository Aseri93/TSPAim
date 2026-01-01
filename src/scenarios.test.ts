
import { describe, it, expect } from 'vitest';
import { scenarios } from './scenarios';

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

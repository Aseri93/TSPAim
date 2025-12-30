import { describe, it, expect } from 'vitest';
import { dist, solveTSP, calculateScore, calculatePathLength } from './gameEngine';
import { Scenario } from './types';

describe('Game Engine Logic', () => {
    it('calculates distance correctly', () => {
        // @ts-ignore - testing internal function exported for tests
        expect(dist(0, 0, 3, 4)).toBe(5);
    });

    it('solves simple TSP paths', () => {
        const targets = [
            { id: '1', x: 10, y: 10, vx: 0, vy: 0, size: 10, hit: false },
            { id: '2', x: 50, y: 50, vx: 0, vy: 0, size: 10, hit: false },
        ];
        const path = solveTSP(targets, 0, 0);
        expect(path[0].id).toBe('1');
        expect(path[1].id).toBe('2');
    });

    it('calculates path length', () => {
        const path = [
            { id: '1', x: 10, y: 0, vx: 0, vy: 0, size: 10, hit: false },
            { id: '2', x: 20, y: 0, vx: 0, vy: 0, size: 10, hit: false },
        ];
        expect(calculatePathLength(path, 0, 0)).toBe(20);
    });

    it('calculates TPS score correctly', () => {
        const scenario: Scenario = {
            id: 'test',
            name: 'Test',
            description: '',
            duration: 10,
            targetCount: 1,
            targetSize: 10,
            movement: 'static',
            scoring: 'tps'
        };
        const state: any = {
            hits: 10,
            timeElapsed: 5000 // 5 seconds
        };
        const score = calculateScore(state, scenario);
        expect(score.primary).toBe(2); // 10 hits / 5 seconds
    });

    it('calculates accuracy correctly', () => {
        const scenario: Scenario = {
            id: 'test',
            name: 'Test',
            description: '',
            duration: 10,
            targetCount: 1,
            targetSize: 10,
            movement: 'static',
            scoring: 'accuracy'
        };
        const state: any = {
            hits: 5,
            shots: 10,
            timeElapsed: 1000
        };
        const score = calculateScore(state, scenario);
        expect(score.secondary).toBe(50); // 5/10 = 50%
    });
});

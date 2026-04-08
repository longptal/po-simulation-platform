import { describe, it, expect } from 'vitest';
import { computeXP, computeLevel } from '../xp-calculator.js';

describe('computeXP', () => {
  it('should compute XP from base, difficulty, and performance', () => {
    const xp = computeXP({
      baseXP: 100,
      difficultyMultiplier: 1.8, // difficulty = 4 -> 1.0 + 4*0.2 = 1.8
      performanceScore: 0.75,    // 75% score
    });

    expect(xp).toBe(Math.round(100 * 1.8 * 0.75)); // 135
    expect(xp).toBe(135);
  });

  it('should return 0 for zero performance', () => {
    const xp = computeXP({
      baseXP: 100,
      difficultyMultiplier: 2.0,
      performanceScore: 0,
    });
    expect(xp).toBe(0);
  });

  it('should scale with difficulty', () => {
    const easy = computeXP({
      baseXP: 100,
      difficultyMultiplier: 1.2,
      performanceScore: 0.5,
    });
    const hard = computeXP({
      baseXP: 100,
      difficultyMultiplier: 3.0,
      performanceScore: 0.5,
    });

    expect(hard).toBeGreaterThan(easy);
  });
});

describe('computeLevel', () => {
  it('should compute level from total XP', () => {
    expect(computeLevel(0)).toBe(1);
    expect(computeLevel(100)).toBe(2);
    expect(computeLevel(500)).toBe(6);
    expect(computeLevel(1000)).toBe(11);
  });

  it('should never return less than 1', () => {
    expect(computeLevel(-10)).toBe(1);
  });
});

import { describe, it, expect } from 'vitest';
import { ScoringEngine } from '../engine.js';
import type { ScoringInput, ScoringDecisionRecord, ScoringConfig } from '../types.js';

const TEST_CONFIG: ScoringConfig = {
  dimensions: [
    { dimension: 'prioritization', weight: 0.35 },
    { dimension: 'communication', weight: 0.25 },
    { dimension: 'analytics', weight: 0.15 },
    { dimension: 'stakeholder_management', weight: 0.25 },
  ],
  maxScorePerDimension: 100,
};

function makeDecision(
  modifiers: { dimension: string; delta: number }[] = [],
  sideEffects: {
    target: string;
    operation: string;
    value: number;
    delayTurns: number;
  }[] = [],
): ScoringDecisionRecord {
  return {
    nodeId: 'node-1',
    optionId: 'opt-1a',
    scoreModifiers: modifiers,
    sideEffects,
    timeTakenSeconds: 15,
    sprintNumber: 1,
  };
}

function makeInput(
  decisions: ScoringDecisionRecord[],
  difficulty = 4,
): ScoringInput {
  return {
    sessionId: 'test-session',
    scenarioId: 'test-scenario',
    config: TEST_CONFIG,
    decisions,
    scenarioDifficulty: difficulty,
  };
}

describe('ScoringEngine', () => {
  it('should compute a session score from decisions', () => {
    const engine = new ScoringEngine();
    const result = engine.computeScore(makeInput([makeDecision()]));

    expect(result.sessionScore.sessionId).toBe('test-session');
    expect(result.sessionScore.scenarioId).toBe('test-scenario');
    expect(result.sessionScore.weightedTotal).toBeGreaterThanOrEqual(0);
    expect(result.sessionScore.weightedTotal).toBeLessThanOrEqual(100);
    expect(result.sessionScore.xpEarned).toBeGreaterThanOrEqual(0);
    expect(result.sessionScore.dimensionScores.length).toBe(4);
  });

  it('should increase score for positive modifiers', () => {
    const engine = new ScoringEngine();
    const positiveInput = makeInput([
      makeDecision([{ dimension: 'prioritization', delta: 8 }]),
    ]);
    const neutralInput = makeInput([makeDecision()]);

    const positiveResult = engine.computeScore(positiveInput);
    const neutralResult = engine.computeScore(neutralInput);

    const posScore = positiveResult.sessionScore.dimensionScores.find(
      (d) => d.dimension === 'prioritization',
    );
    const neuScore = neutralResult.sessionScore.dimensionScores.find(
      (d) => d.dimension === 'prioritization',
    );

    expect(posScore!.score).toBeGreaterThan(neuScore!.score);
  });

  it('should decrease score for negative modifiers', () => {
    const engine = new ScoringEngine();
    const negativeInput = makeInput([
      makeDecision([{ dimension: 'communication', delta: -6 }]),
    ]);
    const neutralInput = makeInput([makeDecision()]);

    const negativeResult = engine.computeScore(negativeInput);
    const neutralResult = engine.computeScore(neutralInput);

    const negScore = negativeResult.sessionScore.dimensionScores.find(
      (d) => d.dimension === 'communication',
    );
    const neuScore = neutralResult.sessionScore.dimensionScores.find(
      (d) => d.dimension === 'communication',
    );

    expect(negScore!.score).toBeLessThan(neuScore!.score);
  });

  it('should accumulate scores across multiple decisions', () => {
    const engine = new ScoringEngine();
    const result = engine.computeScore(
      makeInput([
        makeDecision([{ dimension: 'analytics', delta: 5 }]),
        makeDecision([{ dimension: 'analytics', delta: 3 }]),
      ]),
    );

    const analyticsScore = result.sessionScore.dimensionScores.find(
      (d) => d.dimension === 'analytics',
    );
    expect(analyticsScore!.decisionsContributed).toBe(2);
  });

  it('should validate input and throw on invalid data', () => {
    const engine = new ScoringEngine();
    const invalidInput = {
      sessionId: '',
      scenarioId: '',
      config: {
        dimensions: [],
        maxScorePerDimension: 0,
      },
      decisions: [],
      scenarioDifficulty: 0, // invalid: must be >= 1
    };

    expect(() =>
      engine.computeScore(invalidInput as unknown as ScoringInput),
    ).toThrow();
  });

  it('should compute sprint score for a subset of decisions', () => {
    const engine = new ScoringEngine();
    const config: ScoringConfig = {
      dimensions: [
        { dimension: 'prioritization' as const, weight: 0.35 },
        { dimension: 'communication' as const, weight: 0.25 },
        { dimension: 'analytics' as const, weight: 0.15 },
        { dimension: 'stakeholder_management' as const, weight: 0.25 },
      ],
      maxScorePerDimension: 100,
    };
    const sprintScore = engine.computeSprintScore(config, [makeDecision()], 2);

    expect(sprintScore.sprintNumber).toBe(2);
    expect(sprintScore.dimensionScores.length).toBe(4);
    expect(sprintScore.weightedTotal).toBeGreaterThanOrEqual(0);
    expect(sprintScore.weightedTotal).toBeLessThanOrEqual(100);
  });

  it('should return causal chains for each decision', () => {
    const engine = new ScoringEngine();
    const result = engine.computeScore(
      makeInput([
        makeDecision([], [
          { target: 'team_morale', operation: 'decrease', value: 5, delayTurns: 0 },
        ]),
      ]),
    );

    expect(result.causalChains.length).toBe(1);
    expect(result.causalChains[0].directEffects.length).toBeGreaterThan(0);
  });

  it('should classify delayed effects as indirect', () => {
    const engine = new ScoringEngine();
    const result = engine.computeScore(
      makeInput([
        makeDecision([], [
          {
            target: 'technical_debt',
            operation: 'increase',
            value: 8,
            delayTurns: 2,
          },
        ]),
      ]),
    );

    expect(result.causalChains[0].indirectEffects.length).toBeGreaterThan(0);
    expect(result.causalChains[0].timeline).toBe('next_sprint');
  });

  it('should return causal graph with nodes and edges', () => {
    const engine = new ScoringEngine();
    const result = engine.computeScore(
      makeInput([
        makeDecision([], [
          { target: 'stakeholder_trust', operation: 'increase', value: 3, delayTurns: 0 },
        ]),
      ]),
    );

    expect(result.causalGraph.nodes.length).toBeGreaterThan(0);
    expect(result.causalGraph.edges.length).toBeGreaterThan(0);
  });
});

import { describe, it, expect } from 'vitest';
import { computeCausalChains, buildCausalGraph } from '../impact-mapper.js';
import type { ScoringDecisionRecord } from '../types.js';

function makeDecision(
  nodeId = 'node-1',
  optionId = 'opt-1a',
  sideEffects: {
    target: string;
    operation: string;
    value: number;
    delayTurns: number;
  }[] = [],
): ScoringDecisionRecord {
  return {
    nodeId,
    optionId,
    scoreModifiers: [],
    sideEffects,
    timeTakenSeconds: 15,
    sprintNumber: 1,
  };
}

describe('computeCausalChains', () => {
  it('should return one chain per decision', () => {
    const decisions = [makeDecision(), makeDecision()];
    const chains = computeCausalChains(decisions);
    expect(chains.length).toBe(2);
  });

  it('should map direct effects (delayTurns=0) to directEffects', () => {
    const decisions = [
      makeDecision('node-1', 'opt-a', [
        { target: 'team_morale', operation: 'increase', value: 3, delayTurns: 0 },
      ]),
    ];
    const chains = computeCausalChains(decisions);
    expect(chains[0].directEffects.length).toBe(1);
    expect(chains[0].directEffects[0].metric).toBe('team_morale');
    expect(chains[0].indirectEffects.length).toBe(0);
  });

  it('should map delayed effects (delayTurns>0) to indirectEffects', () => {
    const decisions = [
      makeDecision('node-1', 'opt-a', [
        { target: 'technical_debt', operation: 'increase', value: 5, delayTurns: 2 },
      ]),
    ];
    const chains = computeCausalChains(decisions);
    expect(chains[0].indirectEffects.length).toBe(1);
    expect(chains[0].directEffects.length).toBe(0);
  });

  it('should set timeline to next_sprint when all effects are delayed', () => {
    const decisions = [
      makeDecision('node-1', 'opt-a', [
        { target: 'stakeholder_trust', operation: 'decrease', value: 4, delayTurns: 1 },
      ]),
    ];
    const chains = computeCausalChains(decisions);
    expect(chains[0].timeline).toBe('next_sprint');
  });

  it('should set timeline to immediate when no delayed effects', () => {
    const decisions = [
      makeDecision('node-1', 'opt-a', [
        { target: 'timeline', operation: 'increase', value: 2, delayTurns: 0 },
      ]),
    ];
    const chains = computeCausalChains(decisions);
    expect(chains[0].timeline).toBe('immediate');
  });

  it('should set timeline to gradual when mix of direct and indirect', () => {
    const decisions = [
      makeDecision('node-1', 'opt-a', [
        { target: 'team_morale', operation: 'increase', value: 3, delayTurns: 0 },
        { target: 'technical_debt', operation: 'increase', value: 5, delayTurns: 1 },
      ]),
    ];
    const chains = computeCausalChains(decisions);
    expect(chains[0].directEffects.length).toBe(1);
    expect(chains[0].indirectEffects.length).toBe(1);
    expect(chains[0].timeline).toBe('gradual');
  });

  it('should produce explanations for each effect', () => {
    const decisions = [
      makeDecision('node-1', 'opt-a', [
        { target: 'metric', operation: 'increase', value: 5, delayTurns: 0 },
      ]),
    ];
    const chains = computeCausalChains(decisions);
    expect(chains[0].directEffects[0].explanation).toContain('metric');
    expect(chains[0].directEffects[0].explanation).toContain('increased');
  });
});

describe('buildCausalGraph', () => {
  it('should create nodes for decisions and effects', () => {
    const decisions = [
      makeDecision('node-1', 'opt-a', [
        { target: 'team_morale', operation: 'increase', value: 3, delayTurns: 0 },
      ]),
    ];
    const chains = computeCausalChains(decisions);
    const graph = buildCausalGraph('sess-1', decisions, chains);

    expect(graph.nodes.length).toBeGreaterThan(0);
    const decisionNode = graph.nodes.find(
      (n) => n.id === 'decision-node-1',
    );
    expect(decisionNode).toBeDefined();
  });

  it('should create edges between decisions and their effects', () => {
    const decisions = [
      makeDecision('node-1', 'opt-a', [
        { target: 'team_morale', operation: 'increase', value: 3, delayTurns: 0 },
      ]),
    ];
    const chains = computeCausalChains(decisions);
    const graph = buildCausalGraph('sess-1', decisions, chains);

    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.edges[0].from).toBe('decision-node-1');
  });

  it('should handle empty decisions gracefully', () => {
    const graph = buildCausalGraph('sess-empty', [], []);
    expect(graph.sessionId).toBe('sess-empty');
    expect(graph.nodes.length).toBe(0);
    expect(graph.edges.length).toBe(0);
  });
});

/**
 * Impact Mapper — computes causal chains from decision side effects
 */

import type {
  CausalChain,
  ScoringDecisionRecord,
  SessionCausalGraph,
  ImpactEffect,
  ImpactDirection,
  ImpactTimeline,
  GraphNode,
  GraphEdge,
} from './types.js';

/**
 * Compute causal chains from a list of decisions.
 * Each decision's side effects become a chain linking the decision to its impacts.
 */
export function computeCausalChains(decisions: ScoringDecisionRecord[]): CausalChain[] {
  return decisions.map((decision) => buildCausalChain(decision));
}

function buildCausalChain(decision: ScoringDecisionRecord): CausalChain {
  const directEffects: ImpactEffect[] = [];
  const indirectEffects: ImpactEffect[] = [];

  for (const effect of decision.sideEffects) {
    const direction = directionFromOperation(effect.operation, effect.value);
    const impactEffect: ImpactEffect = {
      metric: effect.target,
      direction,
      magnitude: clampMagnitude(effect.value),
      affectedTargets: [
        effect.target as ImpactEffect['affectedTargets'][number],
      ],
      delayTurns: effect.delayTurns,
      explanation: buildExplanation(effect, direction),
    };

    if (effect.delayTurns > 0) {
      indirectEffects.push(impactEffect);
    } else {
      directEffects.push(impactEffect);
    }
  }

  const timeline: ImpactTimeline =
    indirectEffects.length > 0 && directEffects.length === 0
      ? 'next_sprint'
      : indirectEffects.length > 0
        ? 'gradual'
        : 'immediate';

  return {
    decisionNodeId: decision.nodeId,
    optionId: decision.optionId,
    directEffects,
    indirectEffects,
    timeline,
  };
}

/**
 * Build session-level causal graph from decisions and their chains.
 */
export function buildCausalGraph(
  sessionId: string,
  decisions: ScoringDecisionRecord[],
  chains: CausalChain[],
): SessionCausalGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  for (let i = 0; i < decisions.length; i++) {
    const decision = decisions[i];
    const chain = chains[i];

    const decisionNodeId = `decision-${decision.nodeId}`;
    nodes.push({
      id: decisionNodeId,
      type: 'decision',
      label: `Decision at node ${decision.nodeId}`,
      value: decision.scoreModifiers.reduce((sum, m) => sum + m.delta, 0),
      sprint: decision.sprintNumber,
    });

    for (const effect of chain.directEffects) {
      const metricNodeId = `metric-${effect.metric}-${decision.nodeId}`;
      const existingNode = nodes.find((n) => n.id === metricNodeId);
      if (!existingNode) {
        nodes.push({
          id: metricNodeId,
          type: 'metric',
          label: effect.metric,
          value: effect.magnitude,
          sprint: decision.sprintNumber,
        });
      }

      edges.push({
        from: decisionNodeId,
        to: metricNodeId,
        weight: effect.magnitude,
        delaySprints: effect.delayTurns,
        explanation: effect.explanation,
      });
    }

    for (const effect of chain.indirectEffects) {
      const sideEffectId = `side_effect-${decision.nodeId}-${effect.metric}`;
      nodes.push({
        id: sideEffectId,
        type: 'side_effect',
        label: `${effect.metric} (delayed)`,
        value: effect.magnitude,
        sprint: decision.sprintNumber + effect.delayTurns,
      });

      edges.push({
        from: decisionNodeId,
        to: sideEffectId,
        weight: effect.magnitude,
        delaySprints: effect.delayTurns,
        explanation: effect.explanation,
      });
    }
  }

  return { sessionId, nodes, edges };
}

// -----------------------------------------------
// Internal helpers
// -----------------------------------------------

function directionFromOperation(
  operation: string,
  value: number,
): ImpactDirection {
  if (value === 0) return 'neutral';
  const sign = value > 0 ? 1 : -1;
  const effective = operation === 'decrease' ? -sign : sign;
  if (effective > 0) return 'positive';
  if (effective < 0) return 'negative';
  return 'neutral';
}

function clampMagnitude(value: number): number {
  return Math.max(-1, Math.min(1, Math.abs(value) / 10));
}

function buildExplanation(
  effect: {
    target: string;
    operation: string;
    value: number;
    delayTurns: number;
  },
  direction: ImpactDirection,
): string {
  const verb =
    effect.operation === 'increase'
      ? 'increased'
      : effect.operation === 'decrease'
        ? 'decreased'
        : 'set to';
  const delayNote =
    effect.delayTurns > 0
      ? ` This effect manifests after ${effect.delayTurns} turn(s).`
      : '';

  return `${effect.target} ${verb} by ${effect.value}.${delayNote} Impact: ${direction}.`;
}

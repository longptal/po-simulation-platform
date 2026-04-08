/**
 * Scoring Engine types — contracts between engine, orchestrator, and frontend
 */

import type { SideEffectTarget } from '../types/scenario.js';

// ============================================
// Dimension constants
// ============================================

export const SCORING_DIMENSIONS = [
  'prioritization',
  'communication',
  'analytics',
  'stakeholder_management',
] as const;

export type KnownDimension = (typeof SCORING_DIMENSIONS)[number];

// ============================================
// Scoring configuration
// ============================================

export interface ScoringConfig {
  dimensions: DimensionWeight[];
  maxScorePerDimension: number; // default 100
}

export interface DimensionWeight {
  dimension: KnownDimension;
  weight: number; // 0-1, all weights must sum to 1.0
}

// ============================================
// Score output types
// ============================================

export interface DimensionScore {
  dimension: KnownDimension;
  score: number; // 0-100
  maxPossible: number;
  decisionsContributed: number;
}

export interface SessionScore {
  sessionId: string;
  scenarioId: string;
  dimensionScores: DimensionScore[];
  weightedTotal: number; // 0-100
  xpEarned: number;
  completedAt: Date;
}

export interface SprintScore {
  sprintNumber: number;
  dimensionScores: DimensionScore[];
  weightedTotal: number;
}

// ============================================
// Impact / causal mapping types
// ============================================

export type ImpactDirection = 'positive' | 'negative' | 'neutral';
export type ImpactTimeline = 'immediate' | 'next_sprint' | 'gradual';

export interface ImpactEffect {
  metric: string;
  direction: ImpactDirection;
  magnitude: number; // -1.0 to 1.0
  affectedTargets: SideEffectTarget[];
  delayTurns: number;
  explanation: string;
}

export interface CausalChain {
  decisionNodeId: string;
  optionId: string;
  directEffects: ImpactEffect[];
  indirectEffects: ImpactEffect[];
  timeline: ImpactTimeline;
}

// ============================================
// Causal graph (session-level aggregation)
// ============================================

export type GraphNodeType = 'decision' | 'metric' | 'side_effect';

export interface GraphNode {
  id: string;
  type: GraphNodeType;
  label: string;
  value: number;
  sprint: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  weight: number; // -1.0 to 1.0
  delaySprints: number;
  explanation: string;
}

export interface SessionCausalGraph {
  sessionId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ============================================
// Engine input / output contracts
// ============================================

export interface ScoringDecisionRecord {
  nodeId: string;
  optionId: string;
  scoreModifiers: Array<{ dimension: string; delta: number }>;
  sideEffects: Array<{
    target: string;
    operation: string;
    value: number;
    delayTurns: number;
  }>;
  timeTakenSeconds: number;
  sprintNumber: number;
}

export interface ScoringInput {
  sessionId: string;
  scenarioId: string;
  config: ScoringConfig;
  decisions: ScoringDecisionRecord[];
  scenarioDifficulty: number; // 1-10
}

export interface ScoringResult {
  sessionScore: SessionScore;
  causalChains: CausalChain[];
  causalGraph: SessionCausalGraph;
}

/**
 * Zod schemas for runtime validation of scoring engine inputs/outputs
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const KnownDimensionSchema = z.enum([
  'prioritization',
  'communication',
  'analytics',
  'stakeholder_management',
]);

export const ImpactDirectionSchema = z.enum([
  'positive',
  'negative',
  'neutral',
]);

export const ImpactTimelineSchema = z.enum([
  'immediate',
  'next_sprint',
  'gradual',
]);

export const GraphNodeTypeSchema = z.enum([
  'decision',
  'metric',
  'side_effect',
]);

import { SideEffectTargetSchema } from '../schemas/scenario.schema.js';
export { SideEffectTargetSchema };

// ============================================
// Scoring Config Schemas
// ============================================

export const DimensionWeightSchema = z.object({
  dimension: KnownDimensionSchema,
  weight: z.number().min(0).max(1),
});

export const ScoringConfigSchema = z.object({
  dimensions: z.array(DimensionWeightSchema),
  maxScorePerDimension: z.number().min(1).default(100),
});

// ============================================
// Score Output Schemas
// ============================================

export const DimensionScoreSchema = z.object({
  dimension: KnownDimensionSchema,
  score: z.number().min(0).max(100),
  maxPossible: z.number().min(0),
  decisionsContributed: z.number().int().min(0),
});

export const SessionScoreSchema = z.object({
  sessionId: z.string(),
  scenarioId: z.string(),
  dimensionScores: z.array(DimensionScoreSchema),
  weightedTotal: z.number().min(0).max(100),
  xpEarned: z.number().int().min(0),
  completedAt: z.date(),
});

export const SprintScoreSchema = z.object({
  sprintNumber: z.number().int().min(1),
  dimensionScores: z.array(DimensionScoreSchema),
  weightedTotal: z.number().min(0).max(100),
});

// ============================================
// Impact / Causal Mapping Schemas
// ============================================

export const ImpactEffectSchema = z.object({
  metric: z.string(),
  direction: ImpactDirectionSchema,
  magnitude: z.number().min(-1).max(1),
  affectedTargets: z.array(SideEffectTargetSchema),
  delayTurns: z.number().int().min(0),
  explanation: z.string(),
});

export const CausalChainSchema = z.object({
  decisionNodeId: z.string(),
  optionId: z.string(),
  directEffects: z.array(ImpactEffectSchema),
  indirectEffects: z.array(ImpactEffectSchema),
  timeline: ImpactTimelineSchema,
});

// ============================================
// Causal Graph Schemas
// ============================================

export const GraphNodeSchema = z.object({
  id: z.string(),
  type: GraphNodeTypeSchema,
  label: z.string(),
  value: z.number(),
  sprint: z.number().int().min(0),
});

export const GraphEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  weight: z.number().min(-1).max(1),
  delaySprints: z.number().int().min(0),
  explanation: z.string(),
});

export const SessionCausalGraphSchema = z.object({
  sessionId: z.string(),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

// ============================================
// Engine Input / Output Schemas
// ============================================

export const DecisionRecordSchema = z.object({
  nodeId: z.string(),
  optionId: z.string(),
  scoreModifiers: z.array(
    z.object({
      dimension: z.string(),
      delta: z.number(),
    }),
  ),
  sideEffects: z.array(
    z.object({
      target: z.string(),
      operation: z.string(),
      value: z.number(),
      delayTurns: z.number().int().min(0),
    }),
  ),
  timeTakenSeconds: z.number().min(0),
  sprintNumber: z.number().int().min(1),
});

export const ScoringInputSchema = z.object({
  sessionId: z.string(),
  scenarioId: z.string(),
  config: ScoringConfigSchema,
  decisions: z.array(DecisionRecordSchema),
  scenarioDifficulty: z.number().min(1).max(10),
});

export const ScoringResultSchema = z.object({
  sessionScore: SessionScoreSchema,
  causalChains: z.array(CausalChainSchema),
  causalGraph: SessionCausalGraphSchema,
});

// ============================================
// Type inference from schemas
// ============================================

export type ScoringInputValidated = z.infer<typeof ScoringInputSchema>;
export type SessionScoreValidated = z.infer<typeof SessionScoreSchema>;
export type DimensionScoreValidated = z.infer<typeof DimensionScoreSchema>;
export type SprintScoreValidated = z.infer<typeof SprintScoreSchema>;
export type ScoringResultValidated = z.infer<typeof ScoringResultSchema>;

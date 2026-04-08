/**
 * Zod schemas for runtime validation of scenario YAML files
 * These schemas enforce the structure defined in scenario-engine-plan.md
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const DomainSchema = z.enum([
  'fintech',
  'edtech',
  'healthtech',
  'ecommerce',
  'saas_b2b',
  'marketplace',
]);

export const ScenarioTypeSchema = z.enum([
  'daily_work',
  'unexpected_event',
  'strategic_decision',
]);

export const ProductStageSchema = z.enum([
  'ideation',
  'mvp',
  'growth',
  'mature',
]);

export const UrgencySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical',
]);

export const DeliveryMethodSchema = z.enum([
  'slack_message',
  'email',
  'meeting',
  'dashboard_alert',
  'stakeholder_call',
]);

export const DecisionTypeSchema = z.enum([
  'prioritize',
  'communicate',
  'negotiate',
  'analyze',
  'delegate',
  'accept_reject',
]);

export const SideEffectTargetSchema = z.enum([
  'metric',
  'team_morale',
  'stakeholder_trust',
  'technical_debt',
  'timeline',
]);

export const SideEffectOperationSchema = z.enum([
  'increase',
  'decrease',
  'set',
]);

// ============================================
// Context & Supporting Schemas
// ============================================

export const TeamMemberSchema = z.object({
  role: z.string(),
  personality: z.string(),
  skill_level: z.string(),
});

export const SprintInfoSchema = z.object({
  day: z.number().int().min(1).max(14),
  velocity: z.number().int().min(0),
  committed_points: z.number().int().min(0),
});

export const BacklogItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  points: z.number().int().min(0),
  priority: z.string(),
});

export const ProductMetricsSchema = z.object({
  dau: z.number().int().min(0),
  revenue_mrr: z.number().min(0),
  nps: z.number().min(-100).max(100),
  churn_rate: z.number().min(0).max(100),
  bug_count: z.number().int().min(0),
});

export const ScenarioContextSchema = z.object({
  product_name: z.string(),
  product_stage: ProductStageSchema,
  team_composition: z.array(TeamMemberSchema),
  current_sprint: SprintInfoSchema,
  existing_backlog: z.array(BacklogItemSchema),
  active_metrics: ProductMetricsSchema,
});

// ============================================
// Trigger Schema
// ============================================

export const ArtifactSchema = z.object({
  type: z.string(),
  url: z.string().url().optional(),
  content: z.string().optional(),
});

export const ScenarioTriggerSchema = z.object({
  description: z.string(),
  delivered_by: DeliveryMethodSchema,
  urgency: UrgencySchema,
  attachments: z.array(ArtifactSchema).optional(),
});

// ============================================
// Decision Tree Schemas
// ============================================

export const ScoreModifierSchema = z.object({
  dimension: z.string(),
  delta: z.number(),
});

export const SideEffectSchema = z.object({
  target: SideEffectTargetSchema,
  operation: SideEffectOperationSchema,
  value: z.number(),
  delay_turns: z.number().int().min(0),
});

export const OptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  is_optimal: z.boolean(),
  score_modifiers: z.array(ScoreModifierSchema),
  next_node_id: z.string().nullable(),
  side_effects: z.array(SideEffectSchema),
});

export const ConsequenceSchema = z.object({
  description: z.string(),
  condition: z.string().optional(),
});

export const DecisionNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    prompt: z.string(),
    decision_type: DecisionTypeSchema,
    options: z.array(OptionSchema),
    allow_freeform: z.boolean(),
    time_pressure_seconds: z.number().int().nullable(),
    consequences: z.array(ConsequenceSchema),
  })
);

// ============================================
// Scoring Schemas
// ============================================

export const ScoringDimensionSchema = z.object({
  name: z.string(),
  weight: z.number().min(0).max(1),
});

export const ScoringRubricSchema = z.object({
  dimension: z.string(),
  criteria: z.string(),
  points: z.number(),
});

export const ScoringSystemSchema = z.object({
  dimensions: z.array(ScoringDimensionSchema),
  rubric: z.array(ScoringRubricSchema),
});

// ============================================
// Outcomes Schema
// ============================================

export const ScenarioOutcomesSchema = z.object({
  success_criteria: z.string(),
  failure_modes: z.array(z.string()),
  learning_objectives: z.array(z.string()),
});

// ============================================
// Main Scenario Schema
// ============================================

export const ScenarioSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  domain: DomainSchema,
  type: ScenarioTypeSchema,
  difficulty: z.number().int().min(1).max(10),
  required_po_level: z.number().int().min(1).max(20),
  estimated_duration_minutes: z.number().int().min(5),
  tags: z.array(z.string()),
  context: ScenarioContextSchema,
  trigger: ScenarioTriggerSchema,
  decision_tree: DecisionNodeSchema,
  scoring: ScoringSystemSchema,
  outcomes: ScenarioOutcomesSchema,
});

// ============================================
// Export type inference
// ============================================

export type ScenarioValidated = z.infer<typeof ScenarioSchema>;
export type DecisionNodeValidated = z.infer<typeof DecisionNodeSchema>;
export type OptionValidated = z.infer<typeof OptionSchema>;

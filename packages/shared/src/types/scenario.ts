/**
 * Scenario engine types
 * Based on YAML schema defined in scenario-engine-plan.md
 */

// ============================================
// Scenario Core Types
// ============================================

export type Domain =
  | 'fintech'
  | 'edtech'
  | 'healthtech'
  | 'ecommerce'
  | 'saas_b2b'
  | 'marketplace';

export type ScenarioType =
  | 'daily_work'
  | 'unexpected_event'
  | 'strategic_decision';

export type ProductStage =
  | 'ideation'
  | 'mvp'
  | 'growth'
  | 'mature';

export type Urgency =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export type DeliveryMethod =
  | 'slack_message'
  | 'email'
  | 'meeting'
  | 'dashboard_alert'
  | 'stakeholder_call';

export type DecisionType =
  | 'prioritize'
  | 'communicate'
  | 'negotiate'
  | 'analyze'
  | 'delegate'
  | 'accept_reject';

export type SideEffectTarget =
  | 'metric'
  | 'team_morale'
  | 'stakeholder_trust'
  | 'technical_debt'
  | 'timeline';

export type SideEffectOperation =
  | 'increase'
  | 'decrease'
  | 'set';

// ============================================
// Scenario Schema
// ============================================

export interface Scenario {
  id: string;
  title: string;
  domain: Domain;
  type: ScenarioType;
  difficulty: number; // 1-10
  required_po_level: number; // 1-20
  estimated_duration_minutes: number;
  tags: string[];
  context: ScenarioContext;
  trigger: ScenarioTrigger;
  decision_tree: DecisionNode;
  scoring: ScoringSystem;
  outcomes: ScenarioOutcomes;
}

export interface ScenarioContext {
  product_name: string;
  product_stage: ProductStage;
  team_composition: TeamMember[];
  current_sprint: SprintInfo;
  existing_backlog: BacklogItem[];
  active_metrics: ProductMetrics;
}

export interface TeamMember {
  role: string;
  personality: string;
  skill_level: string;
}

export interface SprintInfo {
  day: number;
  velocity: number;
  committed_points: number;
}

export interface BacklogItem {
  id: string;
  title: string;
  points: number;
  priority: string;
}

export interface ProductMetrics {
  dau: number;
  revenue_mrr: number;
  nps: number;
  churn_rate: number;
  bug_count: number;
}

export interface ScenarioTrigger {
  description: string;
  delivered_by: DeliveryMethod;
  urgency: Urgency;
  attachments?: Artifact[];
}

export interface Artifact {
  type: string;
  url?: string;
  content?: string;
}

// ============================================
// Decision Tree
// ============================================

export interface DecisionNode {
  id: string;
  prompt: string;
  decision_type: DecisionType;
  options: Option[];
  allow_freeform: boolean;
  time_pressure_seconds: number | null;
  consequences: Consequence[];
}

export interface Option {
  id: string;
  label: string;
  is_optimal: boolean;
  score_modifiers: ScoreModifier[];
  next_node_id: string | null;
  side_effects: SideEffect[];
}

export interface ScoreModifier {
  dimension: string;
  delta: number;
}

export interface SideEffect {
  target: SideEffectTarget;
  operation: SideEffectOperation;
  value: number;
  delay_turns: number;
}

export interface Consequence {
  description: string;
  condition?: string;
}

// ============================================
// Scoring System
// ============================================

export interface ScoringSystem {
  dimensions: ScoringDimension[];
  rubric: ScoringRubric[];
}

export interface ScoringDimension {
  name: string;
  weight: number;
}

export interface ScoringRubric {
  dimension: string;
  criteria: string;
  points: number;
}

export interface ScenarioOutcomes {
  success_criteria: string;
  failure_modes: string[];
  learning_objectives: string[];
}

// ============================================
// Progression System
// ============================================

export type POLevel =
  | 'junior_po'      // 1-3
  | 'po'             // 4-7
  | 'senior_po'      // 8-12
  | 'lead_po'        // 13-16
  | 'head_of_product'; // 17-20

export interface POProgress {
  userId: string;
  level: number; // 1-20
  xp: number;
  title: POLevel;
  unlocked_domains: Domain[];
  scenarios_completed: number;
  average_score: number;
}

export interface ScenarioCompletion {
  scenarioId: string;
  userId: string;
  sessionId: string;
  score: number;
  performance_breakdown: Record<string, number>;
  decisions_made: DecisionRecord[];
  duration_minutes: number;
  completed_at: Date;
}

export interface DecisionRecord {
  node_id: string;
  option_id: string;
  timestamp: Date;
  time_taken_seconds: number;
}

// ============================================
// XP Calculation
// ============================================

export interface XPCalculation {
  base_xp: number; // 100
  difficulty_multiplier: number; // 1.0 + (difficulty * 0.2)
  performance_score: number; // 0.0 - 1.0
  total_xp: number;
  level_up: boolean;
  new_level?: number;
}

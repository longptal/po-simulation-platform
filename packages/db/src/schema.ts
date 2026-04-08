/**
 * Drizzle ORM Schema for PO Simulation Platform
 * PostgreSQL 16 + JSONB for flexible session/agent data
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  jsonb,
  real,
  pgEnum,
} from 'drizzle-orm/pg-core';
import type {
  BAInput,
  BAOutput,
  DesignerInput,
  DesignerOutput,
  DevInput,
  DevOutput,
  StakeholderInput,
  StakeholderOutput,
  CustomerInput,
  CustomerOutput,
  ProductMetrics,
} from '@po-sim/shared';

// ============================================
// Enums
// ============================================

export const agentRoleEnum = pgEnum('agent_role', [
  'ba',
  'designer',
  'dev',
  'stakeholder',
  'customer',
]);

export const sessionStatusEnum = pgEnum('session_status', [
  'active',
  'paused',
  'completed',
]);

export const agentJobStatusEnum = pgEnum('agent_job_status', [
  'pending',
  'running',
  'completed',
  'failed',
]);

export const domainEnum = pgEnum('domain', [
  'fintech',
  'edtech',
  'healthtech',
  'ecommerce',
  'saas_b2b',
  'marketplace',
]);

export const scenarioTypeEnum = pgEnum('scenario_type', [
  'daily_work',
  'unexpected_event',
  'strategic_decision',
]);

// ============================================
// Users Table
// ============================================

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  level: integer('level').notNull().default(1),
  xp: integer('xp').notNull().default(0),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// Scenarios Table
// ============================================

export const scenarios = pgTable('scenarios', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  domain: domainEnum('domain').notNull(),
  type: scenarioTypeEnum('type').notNull(),
  difficulty: integer('difficulty').notNull(), // 1-10
  required_po_level: integer('required_po_level').notNull(), // 1-20
  estimated_duration_minutes: integer('estimated_duration_minutes').notNull(),

  // JSONB for flexible scenario data (stored as generic JSON, validated at runtime)
  scenario_data: jsonb('scenario_data').notNull(),

  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================
// Sessions Table
// ============================================

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  scenario_id: uuid('scenario_id')
    .notNull()
    .references(() => scenarios.id),

  current_sprint: integer('current_sprint').notNull().default(1),
  status: sessionStatusEnum('status').notNull().default('active'),

  // JSONB for flexible state storage (XState snapshot)
  state_snapshot: jsonb('state_snapshot'),

  // Current metrics (updated as simulation progresses)
  current_metrics: jsonb('current_metrics').$type<ProductMetrics>(),

  started_at: timestamp('started_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  completed_at: timestamp('completed_at'),
});

// ============================================
// Agent Jobs Table
// ============================================

export const agentJobs = pgTable('agent_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_id: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  agent_role: agentRoleEnum('agent_role').notNull(),
  status: agentJobStatusEnum('status').notNull().default('pending'),

  // BullMQ job ID for correlating queue events with DB records
  bullmq_job_id: varchar('bullmq_job_id', { length: 255 }),

  // JSONB for agent inputs/outputs (validated with Zod at runtime)
  input: jsonb('input').$type<
    | BAInput
    | DesignerInput
    | DevInput
    | StakeholderInput
    | CustomerInput
  >().notNull(),

  output: jsonb('output').$type<
    | BAOutput
    | DesignerOutput
    | DevOutput
    | StakeholderOutput
    | CustomerOutput
  >(),

  error_message: text('error_message'),
  retry_count: integer('retry_count').notNull().default(0),

  created_at: timestamp('created_at').notNull().defaultNow(),
  started_at: timestamp('started_at'),
  completed_at: timestamp('completed_at'),
});

// ============================================
// Decisions Table (Audit Log)
// ============================================

export const decisions = pgTable('decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  session_id: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),

  decision_node_id: varchar('decision_node_id', { length: 255 }).notNull(),
  option_id: varchar('option_id', { length: 255 }).notNull(),

  time_taken_seconds: integer('time_taken_seconds'),

  // Store the full decision context for retrospective
  decision_context: jsonb('decision_context'),

  created_at: timestamp('created_at').notNull().defaultNow(),
});

// ============================================
// Scenario Completions Table
// ============================================

export const scenarioCompletions = pgTable('scenario_completions', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  scenario_id: uuid('scenario_id')
    .notNull()
    .references(() => scenarios.id),
  session_id: uuid('session_id')
    .notNull()
    .references(() => sessions.id, { onDelete: 'cascade' }),

  score: real('score').notNull(), // 0.0 - 1.0
  xp_earned: integer('xp_earned').notNull(),
  duration_minutes: integer('duration_minutes').notNull(),

  // JSONB for detailed performance breakdown
  performance_breakdown: jsonb('performance_breakdown').$type<
    Record<string, number>
  >().notNull(),

  completed_at: timestamp('completed_at').notNull().defaultNow(),
});

// ============================================
// Types for Drizzle operations
// ============================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type ScenarioRow = typeof scenarios.$inferSelect;
export type NewScenarioRow = typeof scenarios.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type AgentJob = typeof agentJobs.$inferSelect;
export type NewAgentJob = typeof agentJobs.$inferInsert;

export type Decision = typeof decisions.$inferSelect;
export type NewDecision = typeof decisions.$inferInsert;

export type ScenarioCompletion = typeof scenarioCompletions.$inferSelect;
export type NewScenarioCompletion = typeof scenarioCompletions.$inferInsert;

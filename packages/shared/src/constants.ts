/**
 * Shared constants for PO Simulation Platform
 * Single source of truth for queue names, Redis channels, and config values
 */

// ─── BullMQ Queue Names ────────────────────────────────────────────────────

export const QUEUE_NAMES = {
  BA: 'agent:ba',
  STAKEHOLDER: 'agent:stakeholder',
  DESIGNER: 'agent:designer',
  DEV: 'agent:dev',
  CUSTOMER: 'agent:customer',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─── Redis Pub/Sub Channels ────────────────────────────────────────────────

/**
 * Template: 'session:{sessionId}:events'
 * Payload: SessionEvent
 */
export const CHANNEL_SESSION_EVENTS = (sessionId: string) =>
  `session:${sessionId}:events`;

/**
 * Template: 'session:{sessionId}:metrics'
 * Payload: ProductMetrics
 */
export const CHANNEL_SESSION_METRICS = (sessionId: string) =>
  `session:${sessionId}:metrics`;

/**
 * Published by workers when a BullMQ job completes
 * Payload: { jobId: string; agentRole: AgentRole; output: unknown; error?: string }
 */
export const CHANNEL_JOB_COMPLETE = 'agent:job:complete';

// ─── Default Configuration ──────────────────────────────────────────────────

export const DEFAULTS = {
  REDIS_URL: process.env.REDIS_URL ?? 'redis://localhost:6379',
  API_BASE_URL: process.env.API_BASE_URL ?? 'http://localhost:3001',
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  SSE_RECONNECT_INTERVAL_MS: 5_000,
  CHECKPOINT_INTERVAL_MS: 5_000,
} as const;

// ─── Agent Configuration ────────────────────────────────────────────────────

export const AGENT_CONFIG = {
  BA: {
    timeoutMs: 30_000,
    maxRetries: 2,
    model: 'claude-sonnet-4-20250514',
  },
  STAKEHOLDER: {
    timeoutMs: 15_000,
    maxRetries: 2,
    model: 'claude-haiku-4-5-20250514',
  },
  DESIGNER: {
    timeoutMs: 30_000,
    maxRetries: 2,
    model: 'claude-sonnet-4-20250514',
  },
  DEV: {
    timeoutMs: 60_000,
    maxRetries: 1,
    model: 'claude-sonnet-4-20250514',
  },
  CUSTOMER: {
    timeoutMs: 15_000,
    maxRetries: 2,
    model: 'claude-haiku-4-5-20250514',
  },
} as const;

// ─── Session States (XState) ───────────────────────────────────────────────

export const SESSION_STATES = {
  IDLE: 'idle',
  LOADING_SCENARIO: 'loadingScenario',
  WAITING_FOR_DECISION: 'waitingForDecision',
  PROCESSING_DECISION: 'processingDecision',
  WAITING_FOR_AGENTS: 'waitingForAgents',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ERROR: 'error',
} as const;

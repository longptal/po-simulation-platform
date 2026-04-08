/**
 * SSE Event Types — typed events emitted by the orchestrator to connected web clients
 *
 * These events flow through SSE to the frontend:
 *   Orchestrator → Redis Pub/Sub → SSE Endpoint → Web Client
 */

import type {
  DecisionNodeValidated,
  ProductMetrics,
  SessionScore,
  SprintScore,
  AgentRole,
} from '@po-sim/shared/types/scenario';

/** All possible SSE event types emitted to web clients */
export type SSEEventType =
  | 'decision_prompt'
  | 'metrics_update'
  | 'agent_message'
  | 'sprint_complete'
  | 'session_complete'
  | 'error'
  | 'connected';

/** Payload for 'decision_prompt' — sent when a new decision node is ready */
export interface DecisionPromptEvent {
  type: 'decision_prompt';
  nodeId: string;
  prompt: string;
  options: DecisionOption[];
  decisionType: string;
  allowFreeform: boolean;
  timePressureSeconds: number | null;
  currentSprint: number;
}

export interface DecisionOption {
  id: string;
  label: string;
}

/** Payload for 'metrics_update' — sent after real-time scoring */
export interface MetricsUpdateEvent {
  type: 'metrics_update';
  metrics: ProductMetrics;
  previousMetrics: ProductMetrics | null;
  sprintScore: SprintScore | null;
}

/** Payload for 'agent_message' — sent when an agent produces output */
export interface AgentMessageEvent {
  type: 'agent_message';
  agentRole: AgentRole;
  /** Human-readable content suitable for chat display */
  content: string;
  timestamp: string; // ISO 8601
}

/** Payload for 'sprint_complete' — sent when a sprint ends */
export interface SprintCompleteEvent {
  type: 'sprint_complete';
  sprint: number;
  sprintScore: SprintScore;
}

/** Payload for 'session_complete' — sent when the scenario ends */
export interface SessionCompleteEvent {
  type: 'session_complete';
  sessionScore: SessionScore;
  xpEarned: number;
}

/** Payload for 'error' — sent when something goes wrong */
export interface ErrorEvent {
  type: 'error';
  error: string;
  /** 'agent' | 'system' | 'session' */
  source: 'agent' | 'system' | 'session';
}

/** Payload for 'connected' — sent immediately on SSE connection */
export interface ConnectedEvent {
  type: 'connected';
  sessionId: string;
  currentState: string;
}

export type SSEEvent =
  | DecisionPromptEvent
  | MetricsUpdateEvent
  | AgentMessageEvent
  | SprintCompleteEvent
  | SessionCompleteEvent
  | ErrorEvent
  | ConnectedEvent;

/**
 * Create an SSE-formatted string from an event.
 * Format: "event: <type>\ndata: <json>\n\n"
 */
export function createSSEvent(event: SSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * Parse an incoming SSE event from the wire format.
 */
export function parseSSEvent(raw: string): SSEEvent | null {
  try {
    const event = JSON.parse(raw);
    return event as SSEEvent;
  } catch {
    return null;
  }
}

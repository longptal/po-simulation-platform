import type { ChatMessage, MetricValue, DecisionPrompt, DocumentSpec } from "@/store/ui-store";

const BASE_URL = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL ?? "http://localhost:3100";

export interface SessionResponse {
  sessionId: string;
  userId: string;
  scenarioId: string;
  state?: string;
  context?: Record<string, unknown>;
}

/** Create a new simulation session */
export async function createSession(userId: string, scenarioId: string): Promise<SessionResponse> {
  const res = await fetch(`${BASE_URL}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, scenarioId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to create session: ${res.status}`);
  }
  return res.json();
}

/** Get current session state */
export async function getSession(sessionId: string): Promise<SessionResponse> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Session not found: ${res.status}`);
  }
  return res.json();
}

/** Submit a decision */
export async function submitDecisionApi(
  sessionId: string,
  optionId: string,
  timeTaken = 0
): Promise<SessionResponse> {
  const res = await fetch(`${BASE_URL}/sessions/${sessionId}/decisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ optionId, timeTaken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `Failed to submit decision: ${res.status}`);
  }
  return res.json();
}

/** Pause session */
export async function pauseSession(sessionId: string): Promise<void> {
  await fetch(`${BASE_URL}/sessions/${sessionId}/pause`, { method: "POST" });
}

/** Resume session */
export async function resumeSession(sessionId: string): Promise<void> {
  await fetch(`${BASE_URL}/sessions/${sessionId}/resume`, { method: "POST" });
}

/** Stop session */
export async function stopSession(sessionId: string): Promise<void> {
  await fetch(`${BASE_URL}/sessions/${sessionId}`, { method: "DELETE" });
}

/** Health check */
export async function healthCheck(): Promise<{ status: string; service: string }> {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

/** Parse session context into UI state */
export function parseSessionContext(context?: Record<string, unknown>): {
  messages: ChatMessage[];
  metrics: MetricValue[];
  activeDecision: DecisionPrompt | null;
  documents: DocumentSpec[];
  currentSprint: number;
  sessionStarted: boolean;
} {
  if (!context) {
    return {
      messages: [],
      metrics: [],
      activeDecision: null,
      documents: [],
      currentSprint: 1,
      sessionStarted: false,
    };
  }

  const messages: ChatMessage[] = Array.isArray(context.messages)
    ? (context.messages as ChatMessage[])
    : [];

  const metrics: MetricValue[] = Array.isArray(context.metrics)
    ? (context.metrics as MetricValue[])
    : [];

  const activeDecision: DecisionPrompt | null = context.activeDecision as DecisionPrompt | null;
  const documents: DocumentSpec[] = Array.isArray(context.documents)
    ? (context.documents as DocumentSpec[])
    : [];

  const currentSprint = (context.currentSprint as number) ?? 1;
  const sessionStarted = (context.sessionStarted as boolean) ?? false;

  return { messages, metrics, activeDecision, documents, currentSprint, sessionStarted };
}

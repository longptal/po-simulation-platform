/**
 * Unit tests for SSE event types
 */

import { describe, it, expect } from 'vitest';
import {
  type SSEEvent,
  type DecisionPromptEvent,
  type MetricsUpdateEvent,
  type AgentMessageEvent,
  type SessionCompleteEvent,
  type ErrorEvent,
  createSSEvent,
  parseSSEvent,
} from '../types.js';

describe('SSEEvent types', () => {
  it('DecisionPromptEvent has correct shape', () => {
    const event: DecisionPromptEvent = {
      type: 'decision_prompt',
      nodeId: 'node-1',
      prompt: 'What should we prioritize?',
      options: [
        { id: 'opt-a', label: 'Feature A' },
        { id: 'opt-b', label: 'Feature B' },
      ],
      decisionType: 'prioritize',
      allowFreeform: true,
      timePressureSeconds: 120,
      currentSprint: 1,
    };

    expect(event.type).toBe('decision_prompt');
    expect(event.options).toHaveLength(2);
    expect(event.timePressureSeconds).toBe(120);
  });

  it('MetricsUpdateEvent has correct shape', () => {
    const event: MetricsUpdateEvent = {
      type: 'metrics_update',
      metrics: {
        dau: 12500,
        revenue_mrr: 5500,
        nps: 42,
        churn_rate: 0.03,
        bug_count: 8,
      },
      previousMetrics: {
        dau: 12000,
        revenue_mrr: 5200,
        nps: 40,
        churn_rate: 0.035,
        bug_count: 10,
      },
      sprintScore: {
        sprintNumber: 1,
        dimensionScores: [],
        weightedTotal: 75,
      },
    };

    expect(event.type).toBe('metrics_update');
    expect(event.metrics.dau).toBe(12500);
    expect(event.previousMetrics?.dau).toBe(12000);
  });

  it('AgentMessageEvent has correct shape', () => {
    const event: AgentMessageEvent = {
      type: 'agent_message',
      agentRole: 'ba',
      content: 'Here is the specification for the dark mode feature...',
      timestamp: '2026-04-08T10:00:00.000Z',
    };

    expect(event.type).toBe('agent_message');
    expect(event.agentRole).toBe('ba');
    expect(event.timestamp).toBe('2026-04-08T10:00:00.000Z');
  });

  it('SessionCompleteEvent has correct shape', () => {
    const event: SessionCompleteEvent = {
      type: 'session_complete',
      sessionScore: {
        sessionId: 'session-abc',
        scenarioId: 'scenario-xyz',
        dimensionScores: [],
        weightedTotal: 82,
        xpEarned: 150,
        completedAt: new Date(),
      },
      xpEarned: 150,
    };

    expect(event.type).toBe('session_complete');
    expect(event.xpEarned).toBe(150);
  });

  it('ErrorEvent has correct shape', () => {
    const event: ErrorEvent = {
      type: 'error',
      error: 'Agent timeout after 30 seconds',
      source: 'agent',
    };

    expect(event.type).toBe('error');
    expect(event.source).toBe('agent');
  });
});

describe('createSSEvent', () => {
  it('produces SSE wire format: event: <type>\\ndata: <json>\\n\\n', () => {
    const event: DecisionPromptEvent = {
      type: 'decision_prompt',
      nodeId: 'node-1',
      prompt: 'Test?',
      options: [{ id: 'a', label: 'A' }],
      decisionType: 'prioritize',
      allowFreeform: false,
      timePressureSeconds: null,
      currentSprint: 1,
    };

    const sse = createSSEvent(event);

    expect(sse).toContain('event: decision_prompt\n');
    expect(sse).toContain('data: ');
    expect(sse).toContain('nodeId');
    expect(sse).toEndWith('\n\n');
  });

  it('serializes timestamps as ISO strings', () => {
    const event: AgentMessageEvent = {
      type: 'agent_message',
      agentRole: 'stakeholder',
      content: 'Feedback here',
      timestamp: new Date('2026-04-08T10:00:00.000Z').toISOString(),
    };

    const sse = createSSEvent(event);
    const dataLine = (sse.split('\n').find((l) => l.startsWith('data: ')) ?? '').replace('data: ', '');
    const parsed = JSON.parse(dataLine);

    expect(parsed.timestamp).toBe('2026-04-08T10:00:00.000Z');
  });

  it('handles null/undefined optional fields', () => {
    const event: MetricsUpdateEvent = {
      type: 'metrics_update',
      metrics: { dau: 100, revenue_mrr: 0, nps: 0, churn_rate: 0, bug_count: 0 },
      previousMetrics: null,
      sprintScore: null,
    };

    const sse = createSSEvent(event);
    expect(sse).toContain('previousMetrics');
    expect(sse).toContain('null');
  });
});

describe('parseSSEvent', () => {
  it('parses valid SSE data line into SSEEvent', () => {
    const raw = JSON.stringify({
      type: 'error',
      error: 'Test error',
      source: 'system',
    });

    const event = parseSSEvent(raw);

    expect(event).not.toBeNull();
    expect((event as ErrorEvent).type).toBe('error');
    expect((event as ErrorEvent).error).toBe('Test error');
  });

  it('returns null for invalid JSON', () => {
    expect(parseSSEvent('not valid json {{{')).toBeNull();
  });
});

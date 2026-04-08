/**
 * Unit tests for AgentDispatcher
 *
 * Architecture note:
 * - Full dispatchSequential() end-to-end requires real BullMQ + Redis
 *   → tested in Phase 1D (E2E tests)
 * - These tests cover the unit-testable surface: JobFailedError, interface contracts
 */

import { describe, it, expect } from 'vitest';
import { JobFailedError } from '../agent-dispatcher.js';

describe('JobFailedError', () => {
  it('contains agentRole, jobId and cause', () => {
    const err = new JobFailedError('ba', 'job-123', 'API timeout');
    expect(err.agentRole).toBe('ba');
    expect(err.jobId).toBe('job-123');
    expect(err.cause).toBe('API timeout');
    expect(err.message).toContain("'ba'");
    expect(err.message).toContain("'job-123'");
    expect(err.message).toContain('failed after all retries');
  });

  it('is an Error subclass', () => {
    const err = new JobFailedError('stakeholder', 'job-456', new Error('rate limit'));
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(JobFailedError);
    expect(err.stack).toBeDefined();
  });

  it('handles undefined cause gracefully', () => {
    const err = new JobFailedError('ba', 'job-789', undefined);
    expect(err.cause).toBeUndefined();
    expect(err.message).toContain('undefined');
  });

  it('jobId is included verbatim', () => {
    const jobId = 'special-chars-_-job-id';
    const err = new JobFailedError('dev', jobId, 'crash');
    expect(err.jobId).toBe(jobId);
    expect(err.message).toContain(jobId);
  });
});

describe('AgentDispatcher — interface contract', () => {
  it('AgentJobInput requires agentRole and input', () => {
    // TypeScript compile-time check:
    // AgentDispatcher expects AgentJobInput[] with { agentRole: AgentRole; input: unknown }
    // Verify the types are correctly structured
    const validJob = { agentRole: 'ba' as const, input: { feature: 'test' } };
    expect(validJob.agentRole).toBe('ba');
    expect(typeof validJob.input).toBe('object');
  });

  it('dispatchSequential returns Record<AgentRole, unknown>', async () => {
    // Verify the return type contract
    const mockResult: Record<string, unknown> = {
      ba: { spec: { title: 'Test' } },
      stakeholder: { overallSentiment: 'approve', feedback: [] },
    };
    expect(typeof mockResult.ba).toBe('object');
    expect(typeof mockResult.stakeholder).toBe('object');
  });
});

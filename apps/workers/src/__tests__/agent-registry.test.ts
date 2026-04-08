/**
 * Unit tests for AgentRegistry
 *
 * Tests:
 * - register() + get() basic flow
 * - duplicate register throws ConflictError
 * - get() throws NotFoundError for missing agent
 * - list() returns all registered roles
 * - assertRequired() passes when all required agents present
 * - assertRequired() throws for missing agents
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry, ConflictError, NotFoundError } from '../agent-registry.js';
import type { AgentContract } from '../agent-registry.js';
import type { AgentRole } from '@po-sim/shared/types/agents.js';

function makeMockAgent(timeoutMs = 5000): AgentContract {
  return {
    run: async () => ({ ok: true }),
    validateOutput: (o) => o as ReturnType<AgentContract['validateOutput']>,
    timeoutMs,
    maxRetries: 2,
  };
}

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it('register() + get() basic flow', () => {
    const agent = makeMockAgent();
    registry.register('ba', agent);
    const retrieved = registry.get('ba');
    expect(retrieved).toBe(agent);
  });

  it('register() throws ConflictError on duplicate registration', () => {
    registry.register('ba', makeMockAgent());
    expect(() => registry.register('ba', makeMockAgent())).toThrow(ConflictError);
  });

  it('get() throws NotFoundError for unregistered role', () => {
    expect(() => registry.get('stakeholder')).toThrow(NotFoundError);
  });

  it('list() returns all registered roles', () => {
    registry.register('ba', makeMockAgent());
    registry.register('stakeholder', makeMockAgent());

    const roles = registry.list();
    expect(roles).toContain('ba');
    expect(roles).toContain('stakeholder');
    expect(roles).toHaveLength(2);
  });

  it('list() returns empty array when nothing registered', () => {
    expect(registry.list()).toHaveLength(0);
  });

  it('assertRequired() passes when all required agents present', () => {
    registry.register('ba', makeMockAgent());
    registry.register('stakeholder', makeMockAgent());

    expect(() => registry.assertRequired(['ba', 'stakeholder'])).not.toThrow();
  });

  it('assertRequired() throws NotFoundError for missing agent', () => {
    registry.register('ba', makeMockAgent());
    expect(() => registry.assertRequired(['ba', 'stakeholder'])).toThrow(NotFoundError);
  });

  it('has() returns true for registered, false for missing', () => {
    registry.register('ba', makeMockAgent());
    expect(registry.has('ba')).toBe(true);
    expect(registry.has('stakeholder')).toBe(false);
  });

  it('clear() removes all agents', () => {
    registry.register('ba', makeMockAgent());
    registry.register('stakeholder', makeMockAgent());
    registry.clear();
    expect(registry.list()).toHaveLength(0);
  });
});

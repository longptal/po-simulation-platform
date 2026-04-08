/**
 * AgentRegistry — plugin pattern for agent management
 *
 * Responsibilities:
 * - Register agents by role
 * - Retrieve agents by role
 * - List all registered roles
 * - Assert required agents are registered
 */

import type { AgentRole } from '@po-sim/shared/types/agents.js';

export interface AgentContract<I = unknown, O = unknown> {
  run(input: I): Promise<O>;
  validateOutput(output: unknown): O; // throws ZodError on invalid
  timeoutMs: number;
  maxRetries: number;
}

export class ConflictError extends Error {
  constructor(role: AgentRole) {
    super(`Agent '${role}' is already registered`);
    this.name = 'ConflictError';
  }
}

export class NotFoundError extends Error {
  constructor(role: AgentRole) {
    super(`Agent '${role}' is not registered`);
    this.name = 'NotFoundError';
  }
}

export class AgentRegistry {
  private readonly agents = new Map<AgentRole, AgentContract>();

  /**
   * Register an agent. Throws ConflictError if already registered.
   */
  register(role: AgentRole, agent: AgentContract): void {
    if (this.agents.has(role)) {
      throw new ConflictError(role);
    }
    this.agents.set(role, agent);
  }

  /**
   * Retrieve an agent by role. Throws NotFoundError if not registered.
   */
  get(role: AgentRole): AgentContract {
    const agent = this.agents.get(role);
    if (!agent) {
      throw new NotFoundError(role);
    }
    return agent;
  }

  /**
   * List all registered roles.
   */
  list(): AgentRole[] {
    return Array.from(this.agents.keys());
  }

  /**
   * Assert all required agents are registered. Throws NotFoundError listing missing ones.
   */
  assertRequired(requiredRoles: AgentRole[]): void {
    const missing = requiredRoles.filter((r) => !this.agents.has(r));
    if (missing.length > 0) {
      throw new NotFoundError(missing[0]); // Report first missing only
    }
  }

  /**
   * Check if a role is registered.
   */
  has(role: AgentRole): boolean {
    return this.agents.has(role);
  }

  /**
   * Clear all registered agents (mostly for testing).
   */
  clear(): void {
    this.agents.clear();
  }
}

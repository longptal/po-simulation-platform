/**
 * Session Manager Service
 * Manages XState actors for active simulation sessions
 */

import { createActor, type Actor } from 'xstate';
import { sessionMachine, type SessionContext, type SessionEvent } from '../state-machine/session.machine.js';
import type { JobCompletionService } from './job-completion.service.js';

// ============================================
// Session Manager
// ============================================

export class SessionManager {
  private sessions: Map<string, Actor<typeof sessionMachine>>;
  private jobCompletionService?: JobCompletionService;

  constructor() {
    this.sessions = new Map();
  }

  setJobCompletionService(service: JobCompletionService) {
    this.jobCompletionService = service;
  }

  /**
   * Create a new session
   */
  createSession(sessionId: string, userId: string): Actor<typeof sessionMachine> {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    const actor = createActor(sessionMachine, {
      input: {
        sessionId,
        userId,
        scenario: null,
        currentNodeId: null,
        currentNode: null,
        decisionHistory: [],
        currentMetrics: {},
        currentSprint: 1,
        error: null,
        agentResults: {},
      } as SessionContext,
    });

    // Subscribe to state changes for logging/persistence
    actor.subscribe((state) => {
      console.log(`[Session ${sessionId}] State:`, state.value);
      // TODO: Persist state snapshot to database
    });

    actor.start();
    this.sessions.set(sessionId, actor);

    if (this.jobCompletionService) {
      this.jobCompletionService.registerHandler(sessionId, actor as any);
    }

    return actor;
  }

  /**
   * Get existing session actor
   */
  getSession(sessionId: string): Actor<typeof sessionMachine> | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Send event to session
   */
  sendEvent(sessionId: string, event: SessionEvent): void {
    const actor = this.sessions.get(sessionId);
    if (!actor) {
      throw new Error(`Session ${sessionId} not found`);
    }

    actor.send(event);
  }

  /**
   * Get current session state
   */
  getState(sessionId: string) {
    const actor = this.sessions.get(sessionId);
    if (!actor) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return actor.getSnapshot();
  }

  /**
   * Pause session
   */
  pauseSession(sessionId: string): void {
    this.sendEvent(sessionId, { type: 'PAUSE' });
  }

  /**
   * Resume session
   */
  resumeSession(sessionId: string): void {
    this.sendEvent(sessionId, { type: 'RESUME' });
  }

  /**
   * Stop and remove session
   */
  stopSession(sessionId: string): void {
    const actor = this.sessions.get(sessionId);
    if (actor) {
      actor.stop();
      this.sessions.delete(sessionId);
      if (this.jobCompletionService) {
        this.jobCompletionService.unregisterHandler(sessionId);
      }
    }
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Restore session from persisted state
   */
  restoreSession(
    sessionId: string,
    persistedState: any
  ): Actor<typeof sessionMachine> {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    // TODO: Implement state restoration from database snapshot
    const actor = createActor(sessionMachine, {
      snapshot: persistedState,
    });

    actor.start();
    this.sessions.set(sessionId, actor);

    return actor;
  }
}

// Singleton instance
export const sessionManager = new SessionManager();

/**
 * SSE Broadcaster — singleton service for streaming SSE events to web clients
 *
 * Responsibilities:
 * - Maintain a map of sessionId → Set of active ReadableStreamControllers
 * - Broadcast SSE events to all connected clients for a session
 * - Clean up controllers when clients disconnect (via controller.close())
 */

import { createSSEvent, type SSEEvent } from './types.js';

interface SSEClient {
  sessionId: string;
  controller: ReadableStreamDefaultController;
  createdAt: number;
}

export class SSEBroadcaster {
  private static instance: SSEBroadcaster | null = null;

  /** Map: sessionId → Set of active SSE client controllers */
  private clients = new Map<string, Set<SSEClient>>();

  private constructor() {}

  /** Get the singleton instance */
  static getInstance(): SSEBroadcaster {
    if (!SSEBroadcaster.instance) {
      SSEBroadcaster.instance = new SSEBroadcaster();
    }
    return SSEBroadcaster.instance;
  }

  /**
   * Register a new SSE client connection.
   * Returns a ReadableStream that the Hono route can return.
   */
  register(sessionId: string): ReadableStream<Uint8Array> {
    return new ReadableStream({
      start(controller) {
        const client: SSEClient = {
          sessionId,
          controller,
          createdAt: Date.now(),
        };

        const existing = SSEBroadcaster.instance!.clients.get(sessionId) ?? new Set();
        existing.add(client);
        SSEBroadcaster.instance!.clients.set(sessionId, existing);
      },

      cancel(controller) {
        // Called when the client disconnects (e.g., closes the connection)
        SSEBroadcaster.removeClient(sessionId, controller);
      },
    });
  }

  /**
   * Broadcast an SSE event to all clients subscribed to this session.
   */
  broadcast(sessionId: string, event: SSEEvent): void {
    const clients = this.clients.get(sessionId);
    if (!clients || clients.size === 0) return;

    const sseData = new TextEncoder().encode(createSSEvent(event));
    const dead: SSEClient[] = [];

    for (const client of clients) {
      try {
        client.controller.enqueue(sseData);
      } catch {
        // Client disconnected but not yet removed — mark for cleanup
        dead.push(client);
      }
    }

    // Remove disconnected clients
    for (const d of dead) {
      this.removeClient(sessionId, d.controller);
    }
  }

  /**
   * Broadcast to all sessions (useful for system-wide events).
   */
  broadcastAll(event: SSEEvent): void {
    for (const sessionId of this.clients.keys()) {
      this.broadcast(sessionId, event);
    }
  }

  /**
   * Get count of active SSE connections for a session.
   */
  getConnectionCount(sessionId: string): number {
    return this.clients.get(sessionId)?.size ?? 0;
  }

  /**
   * Get all active session IDs.
   */
  getActiveSessions(): string[] {
    return Array.from(this.clients.keys()).filter(
      (id) => (this.clients.get(id)?.size ?? 0) > 0,
    );
  }

  /**
   * Remove a client from a session's client set.
   */
  private removeClient(
    sessionId: string,
    controller: ReadableStreamDefaultController,
  ): void {
    const clients = this.clients.get(sessionId);
    if (!clients) return;

    for (const client of clients) {
      if (client.controller === controller) {
        clients.delete(client);
        break;
      }
    }

    if (clients.size === 0) {
      this.clients.delete(sessionId);
    }
  }

  /**
   * Remove all clients for a session (called when session ends).
   */
  closeSession(sessionId: string): void {
    const clients = this.clients.get(sessionId);
    if (!clients) return;

    for (const client of clients) {
      try {
        client.controller.close();
      } catch {
        // Already closed
      }
    }

    this.clients.delete(sessionId);
  }

  /**
   * Reset singleton (for testing).
   */
  static reset(): void {
    SSEBroadcaster.instance = null;
  }
}

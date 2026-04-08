/**
 * Unit tests for EventBus
 *
 * Architecture: EventBus wraps Redis Pub/Sub. These tests mock ioredis at the module level
 * to verify the EventBus API contract without requiring a running Redis server.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mock ioredis ─────────────────────────────────────────────────────────
// Shared state across mock instances (two Redis instances are created: pub + sub)

const publishedMessages = new Map<string, string[]>();
const subscribedChannels = new Set<string>();
const messageHandlers: Array<(channel: string, message: string) => void> = [];

vi.mock('ioredis', () => {
  // Use constructor override pattern so we can control the mock instances
  const MockRedis = class {
    static status = 'ready';

    async publish(channel: string, msg: string) {
      const list = publishedMessages.get(channel) ?? [];
      list.push(msg);
      publishedMessages.set(channel, list);
      // Simulate Redis Pub/Sub: trigger all registered message handlers
      for (const handler of messageHandlers) {
        handler(channel, msg);
      }
      return 1;
    }

    async subscribe(channel: string) {
      subscribedChannels.add(channel);
      return 1;
    }

    async unsubscribe(channel: string) {
      subscribedChannels.delete(channel);
      return 1;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on(event: string, handler: (...args: any[]) => void) {
      if (event === 'message') {
        messageHandlers.push(handler);
      }
      return this;
    }

    removeAllListeners = () => {
      messageHandlers.length = 0;
    };

    async quit() {}
    async disconnect() {}
    async connect() {}
  };

  return { default: MockRedis, Redis: MockRedis };
});

import { createEventBus } from '../event-bus.js';

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('EventBus', () => {
  beforeEach(async () => {
    publishedMessages.clear();
    subscribedChannels.clear();
    messageHandlers.length = 0;
  });

  afterEach(async () => {
    // Clean up any open buses
    vi.restoreAllMocks();
  });

  it('publish() sends JSON-encoded payload to the channel', async () => {
    const bus = await createEventBus({ url: 'redis://localhost:6379' });
    const payload = { type: 'test', data: { foo: 'bar' } };

    await bus.publish('session:abc:events', payload);

    const msgs = publishedMessages.get('session:abc:events');
    expect(msgs).toBeDefined();
    expect(JSON.parse(msgs![0])).toEqual(payload);

    await bus.disconnect();
  });

  it('subscribe() registers a channel handler', async () => {
    const bus = await createEventBus({ url: 'redis://localhost:6379' });

    await bus.subscribe('session:xyz:events', () => {});

    expect(subscribedChannels.has('session:xyz:events')).toBe(true);

    await bus.disconnect();
  });

  it('unsubscribe() removes the channel subscription', async () => {
    const bus = await createEventBus({ url: 'redis://localhost:6379' });
    const unsub = await bus.subscribe('session:unsub', () => {});

    expect(subscribedChannels.has('session:unsub')).toBe(true);

    await unsub();
    expect(subscribedChannels.has('session:unsub')).toBe(false);

    await bus.disconnect();
  });

  it('disconnect() can be called multiple times without throwing', async () => {
    const bus = await createEventBus({ url: 'redis://localhost:6379' });
    await bus.disconnect();
    await expect(bus.disconnect()).resolves.not.toThrow();
  });

  it('publish() after disconnect does not throw (buffers in memory)', async () => {
    const bus = await createEventBus({ url: 'redis://localhost:6379' });
    await bus.disconnect();

    await expect(bus.publish('after-disconnect', { msg: 'buffered' })).resolves.not.toThrow();
  });

  it('publish() handles unknown channels gracefully', async () => {
    const bus = await createEventBus({ url: 'redis://localhost:6379' });

    await expect(
      bus.publish('never-registered-channel', { msg: 'ok' }),
    ).resolves.not.toThrow();

    await bus.disconnect();
  });

  it('subscribe() returns a callable unsubscribe function', async () => {
    const bus = await createEventBus({ url: 'redis://localhost:6379' });
    const unsub = await bus.subscribe('session:ret:events', () => {});

    expect(typeof unsub).toBe('function');

    await unsub();
    expect(subscribedChannels.has('session:ret:events')).toBe(false);

    await bus.disconnect();
  });

  it('subscribe() to same channel twice registers two handlers', async () => {
    const bus = await createEventBus({ url: 'redis://localhost:6379' });
    const received1: unknown[] = [];
    const received2: unknown[] = [];

    await bus.subscribe('session:dup', (p) => received1.push(p));
    await bus.subscribe('session:dup', (p) => received2.push(p));

    await bus.publish('session:dup', { step: 1 });

    expect(received1).toHaveLength(1);
    expect(received2).toHaveLength(1);

    await bus.disconnect();
  });

  it('unsubscribing one handler keeps the other active', async () => {
    const bus = await createEventBus({ url: 'redis://localhost:6379' });
    const active: unknown[] = [];
    const removed: unknown[] = [];

    const unsub1 = await bus.subscribe('session:partial', (p) => active.push(p));
    const unsub2 = await bus.subscribe('session:partial', (p) => removed.push(p));

    await bus.publish('session:partial', { step: 1 });
    expect(active).toHaveLength(1);
    expect(removed).toHaveLength(1);

    await unsub1();

    await bus.publish('session:partial', { step: 2 });
    expect(active).toHaveLength(1);   // stopped receiving
    expect(removed).toHaveLength(2);  // still active

    await bus.disconnect();
  });
});

/**
 * EventBus — Redis Pub/Sub wrapper for orchestrator-side event broadcasting
 *
 * Responsibilities:
 * - Publish events to typed Redis channels
 * - Subscribe to channels and invoke handlers
 * - Auto-reconnect on Redis disconnection
 * - Buffer publishes when Redis is temporarily disconnected
 */

import { Redis } from 'ioredis';

export interface EventBusConfig {
  url?: string;
  reconnectIntervalMs?: number;
}

export interface EventBus {
  publish(channel: string, payload: unknown): Promise<void>;
  subscribe(channel: string, handler: (payload: unknown) => void): Promise<() => void>;
  disconnect(): Promise<void>;
}

interface PendingPublish {
  channel: string;
  payload: unknown;
  timestamp: number;
}

const DEFAULT_RECONNECT_MS = 2000;
const MAX_BUFFERED_PUBLISHES = 1000;
const BUFFER_TTL_MS = 30_000; // Discard buffered messages older than 30s

/**
 * Creates an EventBus instance backed by Redis Pub/Sub.
 *
 * - On Redis disconnect: buffers publishes in memory, flushes on reconnect
 * - Returns an unsubscribe function from subscribe()
 * - Fully typed channels — use string literals or constants
 */
export function createEventBus(config: EventBusConfig = {}): EventBus {
  const url = config.url ?? process.env.REDIS_URL ?? 'redis://localhost:6379';
  const reconnectIntervalMs = config.reconnectIntervalMs ?? DEFAULT_RECONNECT_MS;

  let redis: Redis | null = new Redis(url, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  let isConnected = false;
  let isConnecting = false;

  // Buffered publishes when disconnected
  const pendingPublishes: PendingPublish[] = [];

  // Active subscriptions: channel → Set of handlers
  const subscriptions = new Map<string, Set<(payload: unknown) => void>>();

  // Subscribe to Redis channels and forward to handlers
  const subscriptionRedis = new Redis(url, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });

  // ─── Connection Management ───────────────────────────────────────────────

  async function ensureConnected(): Promise<boolean> {
    if (isConnected && redis?.status === 'ready') return true;
    if (isConnecting) return false;

    isConnecting = true;
    try {
      await redis?.connect();
      isConnected = true;
      isConnecting = false;
      return true;
    } catch {
      isConnected = false;
      isConnecting = false;
      return false;
    }
  }

  async function flushBufferedPublishes(): Promise<void> {
    if (pendingPublishes.length === 0) return;

    const now = Date.now();
    const remaining: PendingPublish[] = [];

    for (const p of pendingPublishes) {
      if (now - p.timestamp > BUFFER_TTL_MS) {
        // Discard stale buffered messages
        continue;
      }
      try {
        await redis!.publish(p.channel, JSON.stringify(p.payload));
      } catch {
        remaining.push(p);
      }
    }

    pendingPublishes.length = 0;
    pendingPublishes.push(...remaining);
  }

  function handleRedisDisconnect(): void {
    isConnected = false;
    console.warn('[EventBus] Redis disconnected, buffering publishes');
  }

  // ─── Subscribe ────────────────────────────────────────────────────────────

  async function subscribe(channel: string, handler: (payload: unknown) => void): Promise<() => void> {
    const handlerSet = subscriptions.get(channel) ?? new Set();
    handlerSet.add(handler);
    subscriptions.set(channel, handlerSet);

    // If this is the first handler for this channel, subscribe on the subscription Redis
    if (handlerSet.size === 1) {
      await subscriptionRedis.subscribe(channel);

      if (!messageHandlerRef) {
        messageHandlerRef = (recvChannel: string, message: string) => {
          const handlers = subscriptions.get(recvChannel);
          if (!handlers || handlers.size === 0) return;

          let payload: unknown;
          try {
            payload = JSON.parse(message);
          } catch {
            payload = message;
          }

          for (const h of handlers) {
            try {
              h(payload);
            } catch {
              // Handler threw — log and continue
              console.error('[EventBus] Handler threw:', recvChannel);
            }
          }
        };
      }

      subscriptionRedis.on('message', messageHandlerRef);
    }

    return () => {
      const hs = subscriptions.get(channel);
      if (!hs) return;
      hs.delete(handler);
      if (hs.size === 0) {
        subscriptions.delete(channel);
        subscriptionRedis.unsubscribe(channel).catch(() => {
          // ignore — channel might already be unsubscribed
        });
      }
    };
  }

  let messageHandlerRef: ((channel: string, message: string) => void) | null = null;

  // ─── Publish ─────────────────────────────────────────────────────────────

  async function publish(channel: string, payload: unknown): Promise<void> {
    const connected = await ensureConnected();

    if (!connected || !redis) {
      // Buffer in memory
      if (pendingPublishes.length < MAX_BUFFERED_PUBLISHES) {
        pendingPublishes.push({ channel, payload, timestamp: Date.now() });
      }
      return;
    }

    try {
      await redis.publish(channel, JSON.stringify(payload));

      if (!isConnected) {
        isConnected = true;
        await flushBufferedPublishes();
      }
    } catch (err) {
      // Redis write failed — buffer and reconnect
      isConnected = false;
      if (pendingPublishes.length < MAX_BUFFERED_PUBLISHES) {
        pendingPublishes.push({ channel, payload, timestamp: Date.now() });
      }
      scheduleReconnect();
    }
  }

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleReconnect(): void {
    if (reconnectTimer) return;
    reconnectTimer = setTimeout(async () => {
      reconnectTimer = null;
      isConnecting = false;

      // Create new Redis instance
      try { await redis?.disconnect(); } catch { /* ignore */ }
      redis = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: true });

      redis.on('error', handleRedisDisconnect);
      redis.on('close', handleRedisDisconnect);

      const ok = await ensureConnected();
      if (ok) {
        isConnected = true;
        await flushBufferedPublishes();
      } else {
        scheduleReconnect();
      }
    }, reconnectIntervalMs);
  }

  // Attach disconnect handlers
  if (redis) {
    redis.on('error', handleRedisDisconnect);
    redis.on('close', handleRedisDisconnect);
  }

  subscriptionRedis.on('error', (err) => {
    console.error('[EventBus] Subscription Redis error:', err);
  });

  // ─── Disconnect ───────────────────────────────────────────────────────────

  async function disconnect(): Promise<void> {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    await Promise.allSettled([
      redis?.quit(),
      subscriptionRedis.quit(),
    ]);

    redis = null;
    isConnected = false;
    pendingPublishes.length = 0;
    subscriptions.clear();
  }

  return {
    publish,
    subscribe,
    disconnect,
  };
}

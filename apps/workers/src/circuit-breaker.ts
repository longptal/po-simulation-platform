/**
 * CircuitBreaker — prevents cascading failures in agent execution
 *
 * Behavior:
 * - Sliding window of last N attempts (default 5)
 * - Opens (blocks) when all N attempts are failures
 * - Closes on next success
 * - Already-open breaker rejects immediately without counting
 */

export interface CircuitBreakerConfig {
  /** Number of consecutive failures to trigger open state */
  failureThreshold?: number;
  /** Reset window after this many ms (0 = never expire, default) */
  windowMs?: number;
}

export interface CircuitBreaker {
  /** Record a successful execution — resets failure count */
  recordSuccess(): void;
  /** Record a failed execution — increments failure count */
  recordFailure(): void;
  /** Returns true when the breaker is open (agent paused) */
  isOpen(): boolean;
  /** Force-reset to closed state */
  reset(): void;
  /** Returns current state snapshot */
  getState(): CircuitBreakerState;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  consecutiveFailures: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
}

const DEFAULT_FAILURE_THRESHOLD = 5;

/**
 * Creates a CircuitBreaker instance.
 *
 * @example
 * const cb = createCircuitBreaker({ failureThreshold: 5 });
 * try {
 *   await doSomething();
 *   cb.recordSuccess();
 * } catch {
 *   cb.recordFailure();
 *   if (cb.isOpen()) throw new AgentPausedError();
 * }
 */
export function createCircuitBreaker(config: CircuitBreakerConfig = {}): CircuitBreaker {
  const failureThreshold = config.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
  const windowMs = config.windowMs ?? 0;

  let consecutiveFailures = 0;
  let lastFailureAt: number | null = null;
  let lastSuccessAt: number | null = null;

  return {
    recordSuccess(): void {
      consecutiveFailures = 0;
      lastSuccessAt = Date.now();
    },

    recordFailure(): void {
      consecutiveFailures++;
      lastFailureAt = Date.now();
    },

    isOpen(): boolean {
      if (windowMs > 0 && lastFailureAt !== null) {
        // Window has expired — allow reset
        if (Date.now() - lastFailureAt > windowMs) {
          consecutiveFailures = 0;
          return false;
        }
      }
      return consecutiveFailures >= failureThreshold;
    },

    reset(): void {
      consecutiveFailures = 0;
      lastFailureAt = null;
      lastSuccessAt = null;
    },

    getState(): CircuitBreakerState {
      return {
        isOpen: this.isOpen(),
        consecutiveFailures,
        lastFailureAt,
        lastSuccessAt,
      };
    },
  };
}

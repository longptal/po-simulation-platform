/**
 * Unit tests for CircuitBreaker
 *
 * Tests:
 * - Opens after N consecutive failures (N = failureThreshold)
 * - Closes on first success after being open
 * - Already-open breaker rejects immediately without counting
 * - reset() restores closed state
 * - Window expiration (if configured)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCircuitBreaker } from '../circuit-breaker.js';

describe('CircuitBreaker', () => {
  it('starts closed (not open)', () => {
    const cb = createCircuitBreaker({ failureThreshold: 5 });
    expect(cb.isOpen()).toBe(false);
  });

  it('opens after failureThreshold consecutive failures', () => {
    const cb = createCircuitBreaker({ failureThreshold: 5 });

    for (let i = 0; i < 5; i++) {
      expect(cb.isOpen()).toBe(false);
      cb.recordFailure();
    }

    expect(cb.isOpen()).toBe(true);
  });

  it('closes on success after being open', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3 });

    for (let i = 0; i < 3; i++) cb.recordFailure();
    expect(cb.isOpen()).toBe(true);

    cb.recordSuccess();
    expect(cb.isOpen()).toBe(false);
  });

  it('resets failure count on success when not yet open', () => {
    const cb = createCircuitBreaker({ failureThreshold: 5 });

    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(false);

    cb.recordSuccess(); // resets counter
    expect(cb.isOpen()).toBe(false);

    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    // Only 3 failures after reset — still below threshold
    expect(cb.isOpen()).toBe(false);
  });

  it('already-open breaker does not count additional failures', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3 });

    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);

    // Further failures should not cause issues
    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();

    // Still open, not worse
    expect(cb.isOpen()).toBe(true);

    // Success still closes it
    cb.recordSuccess();
    expect(cb.isOpen()).toBe(false);
  });

  it('reset() restores closed state', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3 });

    cb.recordFailure();
    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);

    cb.reset();

    expect(cb.isOpen()).toBe(false);
    expect(cb.getState().consecutiveFailures).toBe(0);
    expect(cb.getState().lastFailureAt).toBeNull();
  });

  it('getState() returns accurate snapshot', () => {
    const cb = createCircuitBreaker({ failureThreshold: 3 });
    cb.recordFailure();
    cb.recordFailure();

    const state = cb.getState();
    expect(state.isOpen).toBe(false);
    expect(state.consecutiveFailures).toBe(2);
    expect(state.lastFailureAt).not.toBeNull();
    expect(state.lastSuccessAt).toBeNull();
  });

  it('respects windowMs — resets failures after window expires', async () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, windowMs: 50 });

    cb.recordFailure();
    cb.recordFailure();
    expect(cb.isOpen()).toBe(false);

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 60));

    // Window expired — failures should be reset
    expect(cb.isOpen()).toBe(false);
    expect(cb.getState().consecutiveFailures).toBe(0);
  });

  it('windowMs does not reset while failures still within window', async () => {
    const cb = createCircuitBreaker({ failureThreshold: 3, windowMs: 100 });

    cb.recordFailure();
    cb.recordFailure();

    // Wait 50ms — still within window
    await new Promise((r) => setTimeout(r, 60));

    cb.recordFailure();
    expect(cb.isOpen()).toBe(true);
  });
});

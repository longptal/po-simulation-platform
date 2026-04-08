/**
 * AgentDispatcher — Sequential BullMQ job dispatcher
 *
 * Dispatches agent jobs sequentially (BA → Stakeholder), waits for completion
 * via Redis Pub/Sub events, returns both outputs.
 *
 * Flow:
 *   dispatchSequential(sessionId, [ba, stakeholder])
 *     → add BA job to 'agent:ba' queue
 *     → wait for 'agent:job:complete' event with BA jobId
 *     → add Stakeholder job to 'agent:stakeholder' queue
 *     → wait for 'agent:job:complete' event with Stakeholder jobId
 *     → return { ba: output, stakeholder: output }
 */

import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { QUEUE_NAMES, CHANNEL_JOB_COMPLETE, DEFAULTS } from '@po-sim/shared/constants';
import { createEventBus } from './event-bus.js';
import type { AgentRole } from '@po-sim/shared/types/agents';

export interface AgentJobInput {
  agentRole: AgentRole;
  input: unknown;
}

export interface JobResult {
  jobId: string;
  agentRole: AgentRole;
  output: unknown;
  error?: string;
}

export class JobFailedError extends Error {
  constructor(
    public readonly agentRole: AgentRole,
    public readonly jobId: string,
    public readonly cause: unknown,
  ) {
    super(`Agent '${agentRole}' job '${jobId}' failed after all retries: ${String(cause)}`);
    this.name = 'JobFailedError';
  }
}

export class AgentDispatcher {
  private readonly redis: Redis;
  private readonly eventBus = createEventBus({ url: DEFAULTS.REDIS_URL });
  private readonly queues = new Map<AgentRole, Queue>();

  // Pending completions: jobId → resolver
  private readonly pendingJobs = new Map<string, {
    resolve: (result: JobResult) => void;
    reject: (error: Error) => void;
    agentRole: AgentRole;
  }>();

  private unsubscribe: (() => void) | null = null;
  private isListening = false;

  constructor(redisUrl?: string) {
    const url = redisUrl ?? DEFAULTS.REDIS_URL;
    this.redis = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: true });

    // Initialize queues for all Phase 1 agents
    this.queues.set('ba', new Queue(QUEUE_NAMES.BA, { connection: this.redis }));
    this.queues.set('stakeholder', new Queue(QUEUE_NAMES.STAKEHOLDER, { connection: this.redis }));
  }

  /**
   * Dispatch jobs sequentially. Returns outputs in the same order as input jobs.
   * Throws JobFailedError if any job fails after max retries.
   */
  async dispatchSequential(
    sessionId: string,
    jobs: AgentJobInput[],
  ): Promise<Record<AgentRole, unknown>> {
    await this.ensureListening();
    const results = new Map<AgentRole, unknown>();

    for (const job of jobs) {
      const result = await this.dispatchOne(sessionId, job);
      if (result.error) {
        throw new JobFailedError(job.agentRole, result.jobId, result.error);
      }
      results.set(job.agentRole, result.output);
    }

    return Object.fromEntries(results) as Record<AgentRole, unknown>;
  }

  private async dispatchOne(
    _sessionId: string,
    job: AgentJobInput,
  ): Promise<JobResult> {
    const queue = this.queues.get(job.agentRole);
    if (!queue) {
      throw new Error(`No queue registered for agent role: ${job.agentRole}`);
    }

    const addedJob = await queue.add(job.agentRole, job.input, {
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 1000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    return new Promise<JobResult>((resolve, reject) => {
      this.pendingJobs.set(addedJob.id!, {
        resolve,
        reject,
        agentRole: job.agentRole,
      });

      // Timeout safety: reject if no completion within 60s
      const timeout = setTimeout(() => {
        if (this.pendingJobs.has(addedJob.id!)) {
          this.pendingJobs.delete(addedJob.id!);
          reject(new Error(`Job timeout: ${job.agentRole}/${addedJob.id}`));
        }
        clearTimeout(timeout);
      }, 60_000);
    });
  }

  private async ensureListening(): Promise<void> {
    if (this.isListening) return;

    this.unsubscribe = await this.eventBus.subscribe(
      CHANNEL_JOB_COMPLETE,
      (payload) => {
        this.handleJobComplete(payload as JobCompletePayload);
      },
    );

    this.isListening = true;
  }

  private handleJobComplete(payload: JobCompletePayload): void {
    const pending = this.pendingJobs.get(payload.jobId);
    if (!pending) return;

    this.pendingJobs.delete(payload.jobId);

    if (payload.error) {
      pending.reject(new Error(payload.error));
    } else {
      pending.resolve({
        jobId: payload.jobId,
        agentRole: payload.agentRole,
        output: payload.output,
      });
    }
  }

  /**
   * Clean up resources. Call on shutdown.
   */
  async close(): Promise<void> {
    this.unsubscribe?.();
    this.isListening = false;

    await Promise.allSettled(
      Array.from(this.queues.values()).map((q) => q.close()),
    );

    await this.redis.quit();
    await this.eventBus.disconnect();
  }
}

// ─── Payload Types ──────────────────────────────────────────────────────────

interface JobCompletePayload {
  jobId: string;
  agentRole: AgentRole;
  output: unknown;
  error?: string;
}

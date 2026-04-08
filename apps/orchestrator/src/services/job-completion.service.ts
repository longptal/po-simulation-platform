/**
 * Job Completion Service
 * Listens for BullMQ QueueEvents and notifies the XState session machine
 * when agent jobs complete or fail.
 *
 * Flow: BullMQ 'completed' event → validate output → update DB → dispatch XState event
 */

import { QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import { getAgentJobByBullmqId, updateAgentJobStatus } from '@po-sim/db';

interface JobCompletionHandler {
  sessionId: string;
  actorRef: any;
}

export class JobCompletionService {
  private queueEvents: QueueEvents;
  /** Map of sessionId → handler for dispatching events */
  private handlers = new Map<string, JobCompletionHandler>();

  constructor(redisUrl: string) {
    const connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      reconnectOnError: (_err) => true,
    });

    this.queueEvents = new QueueEvents('ba-agent', { connection });

    connection.on('connect', () => {
      console.log('[JobCompletion] Redis connected');
    });

    connection.on('error', (err) => {
      console.error('[JobCompletion] Redis connection error:', err.message);
    });

    this.registerEventHandlers();
  }

  /**
   * Register a session handler so we can dispatch XState events
   * for this session when jobs complete.
   */
  registerHandler(sessionId: string, actorRef: any) {
    this.handlers.set(sessionId, { sessionId, actorRef });
    console.log(`[JobCompletion] Registered handler for session ${sessionId}`);
  }

  /**
   * Remove a session handler when the session completes or is cleaned up.
   */
  unregisterHandler(sessionId: string) {
    this.handlers.delete(sessionId);
    console.log(`[JobCompletion] Unregistered handler for session ${sessionId}`);
  }

  private registerEventHandlers() {
    // ----- Job completed successfully -----
    this.queueEvents.on('completed', async (evt: { jobId: string; returnvalue?: string; prev?: string }) => {
      console.log(`[JobCompletion] Job ${evt.jobId} completed`);

      try {
        // 1. Look up the DB record by BullMQ job ID
        const agentJob = await getAgentJobByBullmqId(evt.jobId);
        if (!agentJob) {
          console.error(`[JobCompletion] No agent job found for BullMQ jobId ${evt.jobId}`);
          return;
        }

        // 2. Parse the returnvalue from the worker
        let output: any;
        try {
          output = evt.returnvalue ? JSON.parse(evt.returnvalue) : null;
        } catch (parseErr) {
          console.error(`[JobCompletion] Failed to parse returnvalue for job ${evt.jobId}:`, (parseErr as Error).message);
          await updateAgentJobStatus(agentJob.id, 'failed', {
            errorMessage: `Invalid returnvalue: ${(parseErr as Error).message}`,
          });
          return;
        }

        if (!output) {
          await updateAgentJobStatus(agentJob.id, 'failed', {
            errorMessage: 'Agent returned null output',
          });
          return;
        }

        // 3. Persist output to database
        await updateAgentJobStatus(agentJob.id, 'completed', { output });

        console.log(`[JobCompletion] Stored output for job ${agentJob.id} (session: ${agentJob.session_id})`);

        // 4. Dispatch XState AGENT_COMPLETE event
        const handler = this.handlers.get(agentJob.session_id);
        if (handler) {
          handler.actorRef.send({
            type: 'AGENT_COMPLETE',
            agentRole: agentJob.agent_role,
            output,
          });
          console.log(`[JobCompletion] Dispatched AGENT_COMPLETE to session ${agentJob.session_id}`);
        } else {
          console.warn(`[JobCompletion] No handler registered for session ${agentJob.session_id}`);
        }
      } catch (error) {
        console.error(`[JobCompletion] Error processing completed event for job ${evt.jobId}:`, error);
      }
    });

    // ----- Job failed after all retries -----
    this.queueEvents.on('failed', async (evt: { jobId: string; failedReason: string; prev?: string }) => {
      console.error(`[JobCompletion] Job ${evt.jobId} failed: ${evt.failedReason}`);

      try {
        const agentJob = await getAgentJobByBullmqId(evt.jobId);
        if (!agentJob) {
          console.error(`[JobCompletion] No agent job found for failed BullMQ jobId ${evt.jobId}`);
          return;
        }

        // 5. Update DB with failure status
        await updateAgentJobStatus(agentJob.id, 'failed', {
          errorMessage: evt.failedReason,
        });

        // 6. Dispatch XState ERROR event
        const handler = this.handlers.get(agentJob.session_id);
        if (handler) {
          handler.actorRef.send({
            type: 'ERROR',
            error: `Agent ${agentJob.agent_role} failed: ${evt.failedReason}`,
          });
          console.log(`[JobCompletion] Dispatched ERROR to session ${agentJob.session_id}`);
        }
      } catch (error) {
        console.error(`[JobCompletion] Error processing failed event for job ${evt.jobId}:`, error);
      }
    });
  }

  /**
   * Graceful shutdown — stop listening to queue events.
   */
  async close() {
    console.log('[JobCompletion] Closing...');
    await this.queueEvents.close();
  }
}

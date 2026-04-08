/**
 * Database client using Drizzle ORM + postgres.js
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema.js';

// Connection string from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres.js client
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create Drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for convenience
export * from './schema.js';

// ============================================
// Scenario Operations
// ============================================

export async function getScenarioById(scenarioId: string) {
  const result = await db
    .select()
    .from(schema.scenarios)
    .where(eq(schema.scenarios.id, scenarioId))
    .limit(1);

  return result[0] || null;
}

export async function createScenario(data: typeof schema.scenarios.$inferInsert) {
  const result = await db.insert(schema.scenarios).values(data).returning();
  return result[0];
}

// ============================================
// Session Operations
// ============================================

export async function createSession(data: typeof schema.sessions.$inferInsert) {
  const result = await db.insert(schema.sessions).values(data).returning();
  return result[0];
}

export async function getSessionById(sessionId: string) {
  const result = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.id, sessionId))
    .limit(1);

  return result[0] || null;
}

export async function updateSessionState(sessionId: string, state: any) {
  const result = await db
    .update(schema.sessions)
    .set({
      state_snapshot: state,
      updated_at: new Date(),
    })
    .where(eq(schema.sessions.id, sessionId))
    .returning();

  return result[0];
}

export async function updateSessionStatus(
  sessionId: string,
  status: 'active' | 'paused' | 'completed'
) {
  const result = await db
    .update(schema.sessions)
    .set({
      status,
      updated_at: new Date(),
    })
    .where(eq(schema.sessions.id, sessionId))
    .returning();

  return result[0];
}

// ============================================
// Agent Job Operations
// ============================================

export async function createAgentJob(data: typeof schema.agentJobs.$inferInsert) {
  const result = await db.insert(schema.agentJobs).values(data).returning();
  return result[0];
}

export async function getAgentJobById(jobId: string) {
  const result = await db
    .select()
    .from(schema.agentJobs)
    .where(eq(schema.agentJobs.id, jobId))
    .limit(1);

  return result[0] || null;
}

/**
 * Look up an agent job by its BullMQ job ID.
 * Used in job completion handler to correlate
 * BullMQ events with DB records.
 */
export async function getAgentJobByBullmqId(bullmqJobId: string) {
  const result = await db
    .select()
    .from(schema.agentJobs)
    .where(eq(schema.agentJobs.bullmq_job_id, bullmqJobId))
    .limit(1);

  return result[0] || null;
}

/**
 * Atomically update an agent job's status and optionally its output/error.
 */
export async function updateAgentJobStatus(
  jobId: string,
  status: 'pending' | 'running' | 'completed' | 'failed',
  options?: { output?: any; errorMessage?: string; started_at?: Date }
) {
  const updateFields: Record<string, any> = {
    status,
    updated_at: new Date(),
  };

  if (options?.output) {
    updateFields.output = options.output;
    updateFields.completed_at = new Date();
  }

  if (options?.errorMessage) {
    updateFields.errorMessage = options.errorMessage;
    if (status === 'completed') {
      updateFields.completed_at = new Date();
    }
  }

  if (status === 'running' && !options?.started_at) {
    updateFields.started_at = new Date();
  }

  const result = await db
    .update(schema.agentJobs)
    .set(updateFields)
    .where(eq(schema.agentJobs.id, jobId))
    .returning();

  return result[0];
}

export async function updateAgentJobOutput(jobId: string, output: any) {
  const result = await db
    .update(schema.agentJobs)
    .set({
      output,
      completed_at: new Date(),
    })
    .where(eq(schema.agentJobs.id, jobId))
    .returning();

  return result[0];
}

// ============================================
// Decision Operations
// ============================================

export async function createDecision(data: typeof schema.decisions.$inferInsert) {
  const result = await db.insert(schema.decisions).values(data).returning();
  return result[0];
}

export async function getSessionDecisions(sessionId: string) {
  return await db
    .select()
    .from(schema.decisions)
    .where(eq(schema.decisions.session_id, sessionId))
    .orderBy(schema.decisions.created_at);
}

// ============================================
// Cleanup
// ============================================

export async function closeDatabase() {
  await client.end();
}

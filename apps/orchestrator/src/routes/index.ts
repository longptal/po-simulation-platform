/**
 * Orchestrator API Routes (Hono)
 * REST endpoints for session and scenario management
 */

import { Hono } from 'hono';
import { sessionManager } from '../services/session-manager.js';
import { createSimulationSession, loadScenario } from '../services/orchestrator.service.js';

const app = new Hono();

// ============================================
// Session Routes
// ============================================

/**
 * POST /sessions
 * Create a new simulation session
 */
app.post('/sessions', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, scenarioId } = body;

    if (!userId || !scenarioId) {
      return c.json({ error: 'userId and scenarioId are required' }, 400);
    }

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Create session actor
    const actor = sessionManager.createSession(sessionId, userId);

    // Load scenario
    actor.send({ type: 'LOAD_SCENARIO', scenarioId });

    return c.json({
      sessionId,
      userId,
      scenarioId,
      state: actor.getSnapshot().value,
    }, 201);
  } catch (error) {
    console.error('Error creating session:', error);
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /sessions/:sessionId
 * Get session state
 */
app.get('/sessions/:sessionId', (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const snapshot = sessionManager.getState(sessionId);

    return c.json({
      sessionId,
      state: snapshot.value,
      context: snapshot.context,
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Session not found' },
      404
    );
  }
});

/**
 * POST /sessions/:sessionId/decisions
 * Make a decision in the simulation
 */
app.post('/sessions/:sessionId/decisions', async (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    const body = await c.req.json();
    const { optionId, timeTaken } = body;

    if (!optionId) {
      return c.json({ error: 'optionId is required' }, 400);
    }

    sessionManager.sendEvent(sessionId, {
      type: 'MAKE_DECISION',
      optionId,
      timeTaken: timeTaken || 0,
    });

    const snapshot = sessionManager.getState(sessionId);

    return c.json({
      sessionId,
      state: snapshot.value,
      context: snapshot.context,
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /sessions/:sessionId/pause
 * Pause a session
 */
app.post('/sessions/:sessionId/pause', (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    sessionManager.pauseSession(sessionId);

    return c.json({ sessionId, status: 'paused' });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /sessions/:sessionId/resume
 * Resume a paused session
 */
app.post('/sessions/:sessionId/resume', (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    sessionManager.resumeSession(sessionId);

    return c.json({ sessionId, status: 'resumed' });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * DELETE /sessions/:sessionId
 * Stop and remove a session
 */
app.delete('/sessions/:sessionId', (c) => {
  try {
    const sessionId = c.req.param('sessionId');
    sessionManager.stopSession(sessionId);

    return c.json({ sessionId, status: 'stopped' });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * GET /sessions
 * List all active sessions
 */
app.get('/sessions', (c) => {
  const activeSessions = sessionManager.getActiveSessions();
  return c.json({ sessions: activeSessions, count: activeSessions.length });
});

// ============================================
// Scenario Routes
// ============================================

/**
 * GET /scenarios
 * List all available scenarios
 */
app.get('/scenarios', async (c) => {
  try {
    const { db } = await import('@po-sim/db');
    const { scenarios: scenarioTable } = await import('@po-sim/db');
    const results = await db.select().from(scenarioTable);

    const scenarioList = results.map((s) => ({
      id: s.id,
      title: s.title,
      domain: s.domain,
      type: s.type,
      difficulty: s.difficulty,
      required_po_level: s.required_po_level,
      estimated_duration_minutes: s.estimated_duration_minutes,
    }));

    return c.json({ scenarios: scenarioList, count: scenarioList.length });
  } catch (error) {
    console.error('Error listing scenarios:', error);
    return c.json(
      { error: 'Failed to load scenarios. Ensure DATABASE_URL is set and database is running.' },
      500
    );
  }
});

/**
 * GET /scenarios/:scenarioId
 * Get full scenario details
 */
app.get('/scenarios/:scenarioId', async (c) => {
  try {
    const scenarioId = c.req.param('scenarioId');
    const scenario = await loadScenario(scenarioId);

    if (!scenario) {
      return c.json({ error: `Scenario ${scenarioId} not found` }, 404);
    }

    return c.json({ scenario });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

/**
 * POST /scenarios/:scenarioId/sessions
 * Create a session from a specific scenario
 */
app.post('/scenarios/:scenarioId/sessions', async (c) => {
  try {
    const scenarioId = c.req.param('scenarioId');
    const body = await c.req.json();
    const { userId } = body;

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const session = await createSimulationSession(userId, scenarioId);

    return c.json(session, 201);
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    );
  }
});

// ============================================
// Health Check
// ============================================

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'orchestrator' });
});

export default app;

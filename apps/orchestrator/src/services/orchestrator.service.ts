import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { parseScenarioFile } from '@po-sim/shared/utils/scenario-parser';
import type { Scenario } from '@po-sim/shared/types/scenario';
import {
  createSession,
  getSessionById,
  updateSessionState,
  createAgentJob,
  createDecision,
  getScenarioById,
} from '@po-sim/db';
import type { BAInput, StakeholderInput } from '@po-sim/shared/types/agents';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis connection for BullMQ
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

// BA Agent Queue
const baQueue = new Queue('ba-agent', { connection });

// Stakeholder Agent Queue
const stakeholderQueue = new Queue('stakeholder-agent', { connection });

// ============================================
// Scenario Loading
// ============================================

export async function loadScenario(scenarioId: string): Promise<Scenario | null> {
  // Try to load from database first
  const dbScenario = await getScenarioById(scenarioId);

  if (dbScenario) {
    return dbScenario.scenario_data as Scenario;
  }

  // Fallback: load from YAML file (for development)
  const scenarioPath = `./scenarios/${scenarioId}.yaml`;
  const result = await parseScenarioFile(scenarioPath);

  if (!result.success) {
    throw new Error(`Failed to load scenario: ${result.errors?.join(', ')}`);
  }

  return result.data as Scenario;
}

// ============================================
// Session Management
// ============================================

export async function createSimulationSession(userId: string, scenarioId: string) {
  const scenario = await loadScenario(scenarioId);

  if (!scenario) {
    throw new Error(`Scenario ${scenarioId} not found`);
  }

  // Create session in database
  const session = await createSession({
    user_id: userId,
    scenario_id: scenarioId,
    status: 'active',
    state_snapshot: {
      currentNodeId: scenario.decision_tree.id,
      decisionHistory: [],
      currentMetrics: {},
      currentSprint: 1,
    },
  });

  return {
    sessionId: session.id,
    scenario,
    currentNode: scenario.decision_tree,
  };
}

// ============================================
// Decision Processing
// ============================================

export async function processDecision(
  sessionId: string,
  optionId: string,
  timeTaken: number
) {
  const session = await getSessionById(sessionId);

  if (!session) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const scenario = await loadScenario(session.scenario_id);
  if (!scenario) {
    throw new Error(`Scenario ${session.scenario_id} not found`);
  }

  const currentNode = scenario.decision_tree;
  const selectedOption = currentNode.options.find((opt: any) => opt.id === optionId);

  if (!selectedOption) {
    throw new Error(`Option ${optionId} not found in current node`);
  }

  // Record decision in database
  await createDecision({
    session_id: sessionId,
    decision_node_id: currentNode.id,
    option_id: optionId,
    time_taken_seconds: timeTaken,
  });

  // Dispatch BA Agent job
  const baInput: BAInput = {
    sessionId,
    poDecision: {
      featureDescription: selectedOption.label,
      priority: 'must',
      constraints: selectedOption.side_effects?.map((se) => `${se.target}: ${se.value}`) || [],
    },
    projectContext: {
      existingFeatures: scenario.context.existing_backlog?.map((item) => item.title) || [],
      productGoal: scenario.context.product_name,
      targetUsers: scenario.context.product_stage,
    },
  };

  const job = await baQueue.add('generate-spec', baInput, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  // Record agent job in database
  await createAgentJob({
    session_id: sessionId,
    agent_role: 'ba',
    input: baInput,
  });

  // Update session state
  const currentState = (session.state_snapshot as Record<string, unknown>) || {};
  const updatedState = {
    ...currentState,
    decisionHistory: [
      ...((currentState.decisionHistory as unknown[]) || []),
      {
        nodeId: currentNode.id,
        optionId,
        timestamp: new Date(),
        timeTakenSeconds: timeTaken,
      },
    ],
  };

  await updateSessionState(sessionId, updatedState);

  // Dispatch Stakeholder Agent job
  const stakeholderInput: StakeholderInput = {
    sessionId,
    role: 'engineering_manager', // Default role — can be made configurable
    poDecision: {
      description: selectedOption.label,
      optionChosen: selectedOption.id,
      context: selectedOption.side_effects?.map((se: any) => `${se.target}: ${se.operation} ${se.value}`).join(', ') || '',
      timeTaken,
    },
    scenarioContext: {
      productName: scenario.context.product_name,
      currentSprint: (currentState.currentSprint as number) || 1,
      velocity: scenario.context.current_sprint?.velocity || 40,
      activeMetrics: {},
      urgencyLevel: scenario.trigger?.urgency === 'critical' ? 'high' : (scenario.trigger?.urgency || 'medium'),
      trigger: scenario.trigger?.description,
    },
  };

  await stakeholderQueue.add('generate-feedback', stakeholderInput, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  });

  await createAgentJob({
    session_id: sessionId,
    agent_role: 'stakeholder',
    input: stakeholderInput,
  });

  return {
    success: true,
    jobId: job.id,
    message: 'Decision recorded, BA Agent processing...',
  };
}

// ============================================
// Cleanup
// ============================================

export async function closeOrchestrator() {
  await baQueue.close();
  await connection.quit();
}

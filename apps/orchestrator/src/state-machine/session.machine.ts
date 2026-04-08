/**
 * XState v5 State Machine for PO Simulation Session
 * Manages the flow: scenario load → decision → agent processing → feedback → next decision
 */

import { setup, assign, fromPromise } from 'xstate';
import type { ScenarioValidated, DecisionNodeValidated } from '@po-sim/shared';

// ============================================
// Context Type
// ============================================

export interface SessionContext {
  sessionId: string;
  userId: string;
  scenario: ScenarioValidated | null;
  currentNodeId: string | null;
  currentNode: DecisionNodeValidated | null;
  decisionHistory: DecisionRecord[];
  currentMetrics: Record<string, number>;
  currentSprint: number;
  error: string | null;
  agentResults: Record<string, { output: unknown; completedAt: Date }>;
}

export interface DecisionRecord {
  nodeId: string;
  optionId: string;
  timestamp: Date;
  timeTakenSeconds: number;
}

// ============================================
// Events
// ============================================

export type SessionEvent =
  | { type: 'LOAD_SCENARIO'; scenarioId: string }
  | { type: 'MAKE_DECISION'; optionId: string; timeTaken: number }
  | { type: 'AGENT_COMPLETE'; agentRole: string; output: unknown }
  | { type: 'CONTINUE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'COMPLETE' }
  | { type: 'ERROR'; error: string };

// ============================================
// Actors (Async operations)
// ============================================

const loadScenarioActor = fromPromise(
  async ({ input }: { input: { scenarioId: string } }) => {
    // TODO: Load scenario from database
    // For now, return mock data
    console.log('Loading scenario:', input.scenarioId);
    return null;
  }
);

const processDecisionActor = fromPromise(
  async ({
    input,
  }: {
    input: { nodeId: string; optionId: string; sessionId: string };
  }) => {
    // TODO: Process decision, trigger side effects, dispatch agent jobs
    console.log('Processing decision:', input);
    return { nextNodeId: null };
  }
);

const waitForAgentsActor = fromPromise(
  async ({ input }: { input: { sessionId: string } }) => {
    // TODO: Wait for all agent jobs to complete
    console.log('Waiting for agents:', input.sessionId);
    return { allComplete: true };
  }
);

// ============================================
// State Machine Definition
// ============================================

export const sessionMachine = setup({
  types: {
    context: {} as SessionContext,
    events: {} as SessionEvent,
  },
  actors: {
    loadScenario: loadScenarioActor,
    processDecision: processDecisionActor,
    waitForAgents: waitForAgentsActor,
  },
  actions: {
    setScenario: assign({
      scenario: ({ event }) => {
        if (event.type === 'LOAD_SCENARIO') {
          // TODO: Set actual scenario data
          return null;
        }
        return null;
      },
    }),

    recordDecision: assign({
      decisionHistory: ({ context, event }) => {
        if (event.type === 'MAKE_DECISION') {
          return [
            ...context.decisionHistory,
            {
              nodeId: context.currentNodeId!,
              optionId: event.optionId,
              timestamp: new Date(),
              timeTakenSeconds: event.timeTaken,
            },
          ];
        }
        return context.decisionHistory;
      },
    }),

    moveToNextNode: assign({
      currentNodeId: () => {
        // TODO: Get next node from decision result
        return null;
      },
    }),

    setError: assign({
      error: ({ event }) => {
        if (event.type === 'ERROR') {
          return event.error;
        }
        return null;
      },
    }),

    clearError: assign({
      error: null,
    }),

    storeAgentResult: assign({
      agentResults: ({ context, event }) => {
        if (event.type === 'AGENT_COMPLETE') {
          return {
            ...context.agentResults,
            [event.agentRole]: {
              output: event.output,
              completedAt: new Date(),
            },
          };
        }
        return context.agentResults;
      },
    }),
  },
  guards: {
    hasNextNode: ({ context }) => {
      return context.currentNodeId !== null;
    },

    isScenarioComplete: ({ context }) => {
      return context.currentNodeId === null;
    },
  },
}).createMachine({
  id: 'session',
  initial: 'idle',
  context: {
    sessionId: '',
    userId: '',
    scenario: null,
    currentNodeId: null,
    currentNode: null,
    decisionHistory: [],
    currentMetrics: {},
    currentSprint: 1,
    error: null,
    agentResults: {},
  },
  states: {
    idle: {
      on: {
        LOAD_SCENARIO: {
          target: 'loadingScenario',
        },
      },
    },

    loadingScenario: {
      invoke: {
        src: 'loadScenario',
        input: ({ event }) => ({
          scenarioId: event.type === 'LOAD_SCENARIO' ? event.scenarioId : '',
        }),
        onDone: {
          target: 'waitingForDecision',
          actions: 'setScenario',
        },
        onError: {
          target: 'error',
          actions: 'setError',
        },
      },
    },

    waitingForDecision: {
      on: {
        MAKE_DECISION: {
          target: 'processingDecision',
          actions: 'recordDecision',
        },
        PAUSE: {
          target: 'paused',
        },
      },
    },

    processingDecision: {
      invoke: {
        src: 'processDecision',
        input: ({ context, event }) => ({
          sessionId: context.sessionId,
          nodeId: context.currentNodeId!,
          optionId: event.type === 'MAKE_DECISION' ? event.optionId : '',
        }),
        onDone: [
          {
            target: 'waitingForAgents',
            guard: 'hasNextNode',
            actions: 'moveToNextNode',
          },
          {
            target: 'completed',
            guard: 'isScenarioComplete',
          },
        ],
        onError: {
          target: 'error',
          actions: 'setError',
        },
      },
    },

    waitingForAgents: {
      invoke: {
        src: 'waitForAgents',
        input: ({ context }) => ({
          sessionId: context.sessionId,
        }),
        onDone: {
          target: 'waitingForDecision',
        },
        onError: {
          target: 'error',
          actions: 'setError',
        },
      },
      on: {
        AGENT_COMPLETE: {
          // Stay in this state until all agents complete
          actions: [],
        },
      },
    },

    paused: {
      on: {
        RESUME: {
          target: 'waitingForDecision',
        },
      },
    },

    completed: {
      type: 'final',
    },

    error: {
      on: {
        CONTINUE: {
          target: 'waitingForDecision',
          actions: 'clearError',
        },
      },
    },
  },
});

// ============================================
// Export types
// ============================================

export type SessionMachine = typeof sessionMachine;
export type SessionState = ReturnType<SessionMachine['transition']>;

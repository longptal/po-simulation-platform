/**
 * Workers Entry Point
 * Initializes BullMQ workers for agent job processing
 */

import { Worker, Queue } from 'bullmq';
import Redis from 'ioredis';
import { BAAgent } from './agents/ba-agent.js';
import { StakeholderAgent } from './agents/stakeholder-agent.js';
import { DesignerAgent } from './agents/designer-agent.js';
import { CustomerAgent } from './agents/customer-agent.js';
import type {
  BAInput,
  StakeholderInput,
  DesignerInput,
  CustomerInput,
} from '@po-sim/shared/types/agents';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  console.warn('[MOCK_LLM] No ANTHROPIC_API_KEY set — agents will return mock responses');
}

// Redis connection
const connection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

// Initialize agents
const baAgent = new BAAgent(ANTHROPIC_API_KEY);
const stakeholderAgent = new StakeholderAgent(ANTHROPIC_API_KEY);
const designerAgent = new DesignerAgent(ANTHROPIC_API_KEY);
const customerAgent = new CustomerAgent(ANTHROPIC_API_KEY);

// Queues
const baQueue = new Queue('ba-agent', { connection });
const stakeholderQueue = new Queue('stakeholder-agent', { connection });
const designerQueue = new Queue('designer-agent', { connection });
const customerQueue = new Queue('customer-agent', { connection });

// BA Agent Worker
const baWorker = new Worker(
  'ba-agent',
  async (job) => {
    console.log(`[BA Worker] Processing job ${job.id}`);

    const input = job.data as BAInput;

    try {
      const output = await baAgent.generateSpec(input);

      console.log(`[BA Worker] Job ${job.id} completed successfully`);
      return output;
    } catch (error) {
      console.error(`[BA Worker] Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60000,
    },
  }
);

// Stakeholder Agent Worker
const stakeholderWorker = new Worker(
  'stakeholder-agent',
  async (job) => {
    console.log(`[Stakeholder Worker] Processing job ${job.id}`);

    const input = job.data as StakeholderInput;

    try {
      const output = await stakeholderAgent.generateFeedback(input);

      console.log(`[Stakeholder Worker] Job ${job.id} completed successfully`);
      return output;
    } catch (error) {
      console.error(`[Stakeholder Worker] Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60000,
    },
  }
);

// Designer Agent Worker
const designerWorker = new Worker(
  'designer-agent',
  async (job) => {
    console.log(`[Designer Worker] Processing job ${job.id}`);

    const input = job.data as DesignerInput;

    try {
      const output = await designerAgent.generateDesign(input);

      console.log(`[Designer Worker] Job ${job.id} completed successfully`);
      return output;
    } catch (error) {
      console.error(`[Designer Worker] Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60000,
    },
  }
);

// Customer Agent Worker
const customerWorker = new Worker(
  'customer-agent',
  async (job) => {
    console.log(`[Customer Worker] Processing job ${job.id}`);

    const input = job.data as CustomerInput;

    try {
      const output = await customerAgent.generateFeedback(input);

      console.log(`[Customer Worker] Job ${job.id} completed successfully`);
      return output;
    } catch (error) {
      console.error(`[Customer Worker] Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 2,
    limiter: {
      max: 10,
      duration: 60000,
    },
  }
);

// Worker event handlers
baWorker.on('completed', (job) => {
  console.log(`[BA Worker] Job ${job.id} completed`);
});

baWorker.on('failed', (job, err) => {
  console.error(`[BA Worker] Job ${job?.id} failed:`, err);
});

baWorker.on('error', (err) => {
  console.error('[BA Worker] Worker error:', err);
});

stakeholderWorker.on('completed', (job) => {
  console.log(`[Stakeholder Worker] Job ${job.id} completed`);
});

stakeholderWorker.on('failed', (job, err) => {
  console.error(`[Stakeholder Worker] Job ${job?.id} failed:`, err);
});

designerWorker.on('completed', (job) => {
  console.log(`[Designer Worker] Job ${job.id} completed`);
});

designerWorker.on('failed', (job, err) => {
  console.error(`[Designer Worker] Job ${job?.id} failed:`, err);
});

customerWorker.on('completed', (job) => {
  console.log(`[Customer Worker] Job ${job.id} completed`);
});

customerWorker.on('failed', (job, err) => {
  console.error(`[Customer Worker] Job ${job?.id} failed:`, err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing workers...');
  await baWorker.close();
  await stakeholderWorker.close();
  await designerWorker.close();
  await customerWorker.close();
  await connection.quit();
  process.exit(0);
});

console.log('Workers started');
console.log('   - BA Agent worker running');
console.log('   - Stakeholder Agent worker running');
console.log('   - Designer Agent worker running');
console.log('   - Customer Agent worker running');
console.log(`   - Redis: ${REDIS_URL}`);
console.log(`   - Concurrency: 2 per worker`);
console.log(`   - Rate limit: 10 jobs/minute per worker`);

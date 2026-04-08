/**
 * Orchestrator Service - Main Entry Point
 * Session manager + XState state machine + Hono API
 */

import { serve } from '@hono/node-server';
import app from './routes/index.js';
import { sessionManager } from './services/session-manager.js';
import { JobCompletionService } from './services/job-completion.service.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

console.log('🚀 Starting PO Simulation Orchestrator...');
console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);

// Initialize Job Completion Service
const jobCompletionService = new JobCompletionService(REDIS_URL);
sessionManager.setJobCompletionService(jobCompletionService);

// Start HTTP server
serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`✅ Orchestrator running on http://localhost:${PORT}`);
console.log(`📊 Health check: http://localhost:${PORT}/health`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received, shutting down gracefully...');
  await jobCompletionService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️  SIGINT received, shutting down gracefully...');
  await jobCompletionService.close();
  process.exit(0);
});

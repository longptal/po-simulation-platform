# Project Contract

Invariants enforced by cook/sentinel. Review and customize before implementation starts.

## Language & Types
- TypeScript strict mode (`"strict": true`) — no `any` without explicit comment justification
- All agent input/output types defined in `packages/shared/types/` — never inline
- Zod schema required for every agent output before it is consumed

## LLM Usage
- Never call LLM APIs directly from frontend (`apps/web`) — always via orchestrator API
- All LLM calls MUST have a Zod output schema
- On Zod validation failure: retry once with format reminder, then circuit breaker — never silently swallow malformed output
- Log every LLM call with: model, input token count, output token count, latency (for cost tracking)

## Database
- All DB queries via Drizzle ORM — no raw SQL strings with user input (parameterized only)
- No direct DB access from `apps/workers` agents — only via `packages/db` module
- Every schema change requires a migration file (up + down)
- JSONB columns: always define TypeScript type, never store untyped blobs

## State
- Session state mutations ONLY through XState state machine transitions — no direct state store writes
- UI state (Zustand) must never contain sensitive data (tokens, PII)
- Redis cache keys must include session ID prefix to prevent cross-session leakage

## Security
- No secrets in environment variables committed to repo — use `.env.example` with placeholders
- API keys for LLM providers: server-side only, never exposed to frontend
- Per-session rate limiting on all agent endpoints

## Agent Reliability
- Every BullMQ job: `attempts: 3`, exponential backoff, dead-letter queue
- Circuit breaker threshold: 5 consecutive failures per agent → pause + alert
- Agent response timeout: 30 seconds hard limit (configurable per agent)

## Cost Control
- Prompt caching enabled for all system prompts (Anthropic cache_control headers)
- Context pruning: keep last N turns only (configurable, default 10)
- Free tier cap: enforce 3 sessions/day limit at orchestrator level

## Testing
- Scenario parser: unit tested against fixture YAML files
- Agent contracts (Zod schemas): unit tested with valid + invalid inputs
- Orchestrator state machine: tested for all state transitions
- No mocking LLM calls in integration tests — use recorded fixtures

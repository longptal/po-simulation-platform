# AI Agent Orchestration Plan — PO Virtual Simulation Platform

## 1. Kiến truc tong the

### Pattern: Hybrid Orchestrator + Event-Driven

```
                         +---------------------+
                         |    PO Interface      |
                         |  (User Decisions)    |
                         +----------+----------+
                                    |
                                    v
                         +----------+----------+
                         |   Orchestrator       |
                         |   (Central Brain)    |
                         |                      |
                         |  - Session Manager   |
                         |  - Flow Controller   |
                         |  - State Machine     |
                         +----------+----------+
                                    |
                    +---------------+---------------+
                    |               |               |
               +----v----+    +----v----+    +-----v-----+
               |  Event  |    |  Task   |    |  State    |
               |  Bus    |    |  Queue  |    |  Store    |
               | (Redis) |    | (BullMQ)|    | (Postgres)|
               +---------+    +---------+    +-----------+
                    |
        +-----------+-----------+-----------+-----------+
        |           |           |           |           |
   +----v----+ +----v----+ +----v----+ +----v----+ +----v----+
   |   BA    | |Designer | |  Dev    | |Stakeh.  | |Customer |
   |  Agent  | |  Agent  | |  Agent  | |  Agent  | |  Agent  |
   +---------+ +---------+ +---------+ +---------+ +---------+
        |           |           |
        |      +----v----+  +--v-------+
        |      | Stitch  |  | Codex/   |
        |      |  MCP    |  | Claude   |
        |      +---------+  | CLI      |
        |                    +---------+
```

**Tai sao Hybrid?**

- **Orchestrator pattern**: can thiet vi flow co thu tu ro rang (BA -> Designer -> Dev). PO decisions tao ra deterministic chains.
- **Event-driven**: cho phep agents react voi nhau loosely coupled. Stakeholder/Customer agents lang nghe events va phan hoi async.

### Core Components


| Component     | Tech                     | Vai tro                         |
| ------------- | ------------------------ | ------------------------------- |
| Orchestrator  | Node.js (TypeScript)     | Dieu phoi flow, quan ly session |
| Event Bus     | Redis Pub/Sub            | Agent-to-agent communication    |
| Task Queue    | BullMQ (Redis-backed)    | Async job processing, retry     |
| State Store   | PostgreSQL + Redis cache | Session state, agent outputs    |
| Agent Runtime | Isolated Node.js workers | Chay tung agent trong sandbox   |


---

## 2. Agent Roles — Chi tiet

### 2.1 BA Agent (Business Analyst)

**Nhiem vu**: Chuyen PO decision thanh spec co cau truc.

**Input contract**:

```typescript
interface BAInput {
  sessionId: string;
  poDecision: {
    featureDescription: string;    // Mo ta feature tu PO
    userStories?: string[];        // User stories (neu PO da viet)
    priority: 'must' | 'should' | 'could';
    constraints?: string[];        // Rang buoc tu PO
  };
  projectContext: {
    existingFeatures: string[];    // Features da co
    productGoal: string;           // Muc tieu san pham
    targetUsers: string;           // Doi tuong su dung
  };
}
```

**Output contract**:

```typescript
interface BAOutput {
  spec: {
    title: string;
    userStories: UserStory[];      // Format: As a..., I want..., So that...
    acceptanceCriteria: AC[];      // Given/When/Then
    dataModel?: EntityDef[];       // Neu can
    apiEndpoints?: EndpointDef[]; // Neu can
    uiRequirements: UIReq[];      // Mô tả UI cần thiết
    outOfScope: string[];          // Minh bach gi KHONG lam
  };
  estimatedComplexity: 'S' | 'M' | 'L' | 'XL';
  questionsForPO?: string[];       // Neu spec chua du ro
}
```

**System prompt core**:

```
You are a senior Business Analyst. Given a Product Owner's decision about a feature,
produce a detailed specification. Be concise but thorough.

Rules:
- Always write acceptance criteria in Given/When/Then format
- Flag ambiguities as questions back to PO rather than assuming
- Keep scope tight — explicitly list what is out of scope
- UI requirements must be concrete enough for a designer to work from
- Consider edge cases and error states
```

**Token estimate**: ~2,000-4,000 tokens output per feature spec.

---

### 2.2 Designer Agent (via Stitch MCP)

**Nhiem vu**: Tao UI components/mockups tu BA spec.

**Input contract**:

```typescript
interface DesignerInput {
  sessionId: string;
  spec: BAOutput['spec'];          // Tu BA agent
  designSystem?: {
    framework: 'react' | 'vue';
    componentLibrary: string;      // e.g., 'shadcn/ui', 'material-ui'
    theme?: ThemeConfig;
  };
  existingScreens?: ScreenRef[];   // Reference den screens da co
}
```

**Output contract**:

```typescript
interface DesignerOutput {
  screens: {
    name: string;
    description: string;
    components: ComponentDef[];    // Stitch MCP output
    layout: string;                // Layout description / JSX skeleton
    interactions: Interaction[];   // User interactions
  }[];
  designTokens?: Record<string, string>;
  componentCode?: string[];        // Generated component code tu Stitch
}
```

**Stitch MCP integration** (chi tiet o Section 3).

**System prompt core**:

```
You are a senior UI/UX Designer working with a component-based design system.
Given a BA specification, create screen designs using available components.

Rules:
- Prefer existing components over custom ones
- Design mobile-first, responsive
- Every interactive element must have clear states (default, hover, disabled, error)
- Follow accessibility guidelines (WCAG 2.1 AA)
- Output must be concrete enough for a developer to implement
```

**Token estimate**: ~3,000-6,000 tokens (excluding Stitch MCP calls).

---

### 2.3 Dev Agent (via Codex CLI / Claude CLI)

**Nhiem vu**: Build working code tu spec + design.

**Input contract**:

```typescript
interface DevInput {
  sessionId: string;
  spec: BAOutput['spec'];
  design: DesignerOutput;
  codeContext: {
    repoPath: string;              // Path to project repo
    techStack: TechStack;          // Framework, DB, etc.
    existingPatterns: string[];    // Code conventions
    relevantFiles?: string[];      // Files dev should look at
  };
  taskBreakdown?: string[];        // Tu orchestrator neu task lon
}
```

**Output contract**:

```typescript
interface DevOutput {
  files: {
    path: string;
    action: 'create' | 'modify';
    content: string;
    diff?: string;                 // Neu modify
  }[];
  testFiles?: {
    path: string;
    content: string;
  }[];
  commands?: string[];             // npm install, migration, etc.
  buildStatus: 'success' | 'failed';
  buildErrors?: string[];
  notes: string[];                 // Decisions made, trade-offs
}
```

**System prompt core**:

```
You are a senior full-stack developer. Given a spec and UI design,
implement the feature in working code.

Rules:
- Follow existing code patterns in the repo
- Write tests for business logic
- Handle error states from the spec
- Do not over-engineer — implement exactly what the spec says
- If blocked, output what you can and list blockers
```

**Token estimate**: 5,000-20,000 tokens tuy complexity. Day la agent ton kem nhat.

---

### 2.4 Stakeholder Agent

**Nhiem vu**: Dong vai stakeholder (CEO, CTO, end-user manager) de cho feedback.

**Input contract**:

```typescript
interface StakeholderInput {
  sessionId: string;
  role: 'ceo' | 'cto' | 'engineering_manager' | 'sales_lead' | 'custom';
  customPersona?: string;
  artifact: {                      // Bat ky output nao can review
    type: 'spec' | 'design' | 'code' | 'demo';
    content: any;                  // Tuong ung output cua agent khac
  };
  projectContext: string;
  previousFeedback?: Feedback[];   // De tranh lap lai
}
```

**Output contract**:

```typescript
interface StakeholderOutput {
  overallSentiment: 'approve' | 'concerns' | 'reject';
  feedback: {
    aspect: string;                // UI, performance, scope, business value...
    comment: string;
    severity: 'blocker' | 'major' | 'minor' | 'suggestion';
    suggestion?: string;
  }[];
  questionsForPO: string[];
  approvalConditions?: string[];   // "Approve if..."
}
```

**System prompt core**:

```
You are a {role} reviewing a product artifact. Provide realistic,
constructive feedback from your role's perspective.

As {role}, you care about:
- CEO: business value, market fit, ROI
- CTO: technical debt, scalability, security
- Engineering Manager: team capacity, maintainability, timeline
- Sales Lead: customer appeal, competitive advantage

Rules:
- Be specific — vague feedback is not helpful
- Distinguish blockers from nice-to-haves
- Suggest solutions, not just problems
- Be realistic about the stage of development
```

**Token estimate**: ~1,000-2,500 tokens.

---

### 2.5 Customer Agent

**Nhiem vu**: Mo phong end-user feedback, usability testing.

**Input contract**:

```typescript
interface CustomerInput {
  sessionId: string;
  persona: {
    name: string;
    role: string;                  // "Small business owner", "Developer"
    techSavviness: 'low' | 'medium' | 'high';
    goals: string[];
    frustrations: string[];
  };
  artifact: {
    type: 'design' | 'demo' | 'prototype';
    content: any;
  };
  taskToComplete?: string;         // "Try to create an invoice"
}
```

**Output contract**:

```typescript
interface CustomerOutput {
  usabilityScore: number;          // 1-10
  taskCompletion: 'success' | 'struggled' | 'failed';
  journey: {
    step: string;
    action: string;
    reaction: string;              // What user thinks/feels
    issue?: string;
  }[];
  painPoints: string[];
  positives: string[];
  wouldRecommend: boolean;
  verbatimQuote: string;           // Realistic user quote
}
```

**Token estimate**: ~1,500-3,000 tokens.

---

## 3. MCP Server Integration

### 3.1 Stitch MCP (Design)

**Goi nhu the nao**:

```typescript
// Stitch MCP client wrapper
class StitchMCPClient {
  private client: MCPClient;

  constructor(serverUrl: string) {
    this.client = new MCPClient({
      transport: new StdioTransport({
        command: 'npx',
        args: ['@anthropic/stitch-mcp-server']
      })
    });
  }

  // List available components
  async listComponents(): Promise<Component[]> {
    return this.client.callTool('list_components', {
      library: this.designSystem
    });
  }

  // Generate UI from description
  async generateUI(spec: UIReq): Promise<ComponentCode> {
    return this.client.callTool('generate_component', {
      description: spec.description,
      props: spec.props,
      variants: spec.variants,
      framework: 'react'
    });
  }

  // Compose full screen from components
  async composeScreen(layout: ScreenLayout): Promise<string> {
    return this.client.callTool('compose_screen', {
      components: layout.components,
      layout: layout.gridSpec,
      responsive: true
    });
  }
}
```

**Async handling**: Stitch calls duoc wrap trong BullMQ job. Designer agent submit job -> poll/wait for completion -> continue.

```typescript
// In Designer Agent worker
async function designerWorker(job: Job<DesignerInput>) {
  const stitch = new StitchMCPClient();

  // Step 1: Map UI requirements to components
  const components = await stitch.listComponents();
  const mapping = await llmMapRequirementsToComponents(
    job.data.spec.uiRequirements,
    components
  );

  // Step 2: Generate each screen (parallel where possible)
  const screens = await Promise.all(
    mapping.screens.map(screen =>
      stitch.composeScreen(screen)
    )
  );

  return { screens, componentCode: screens.map(s => s.code) };
}
```

### 3.2 Codex CLI / Claude CLI (Dev)

**Goi nhu the nao**:

```typescript
class DevCLIClient {
  // Option A: Codex CLI
  async runCodex(task: DevTask): Promise<DevResult> {
    const proc = spawn('codex', [
      '--model', 'o4-mini',
      '--approval-mode', 'full-auto',
      '--quiet',
      task.prompt
    ], {
      cwd: task.repoPath,
      env: { ...process.env, OPENAI_API_KEY: task.apiKey }
    });

    return this.collectOutput(proc);
  }

  // Option B: Claude CLI
  async runClaude(task: DevTask): Promise<DevResult> {
    const proc = spawn('claude', [
      '-p', task.prompt,
      '--output-format', 'json',
      '--max-turns', '20'
    ], {
      cwd: task.repoPath,
      env: { ...process.env, ANTHROPIC_API_KEY: task.apiKey }
    });

    return this.collectOutput(proc);
  }

  // Wrapper that picks best tool for task
  async execute(task: DevTask): Promise<DevResult> {
    if (task.complexity === 'S' || task.complexity === 'M') {
      return this.runClaude(task);  // Claude tot cho tasks nho-vua
    }
    return this.runCodex(task);     // Codex cho tasks phuc tap, multi-file
  }
}
```

**Async handling**:

```typescript
// Dev agent runs as long-running BullMQ worker
const devQueue = new Queue('dev-agent', { connection: redis });

// Job co the chay 5-15 phut
devQueue.add('implement-feature', devInput, {
  timeout: 15 * 60 * 1000,        // 15 min timeout
  attempts: 2,                      // Retry 1 lan neu fail
  backoff: { type: 'fixed', delay: 5000 }
});

// Worker
const worker = new Worker('dev-agent', async (job) => {
  const cli = new DevCLIClient();
  const result = await cli.execute(job.data);

  // Validate output
  if (result.buildStatus === 'failed') {
    // Try self-heal: feed errors back to CLI
    const fixResult = await cli.execute({
      ...job.data,
      prompt: `Fix these build errors:\n${result.buildErrors.join('\n')}\n\nOriginal task: ${job.data.prompt}`
    });
    return fixResult;
  }

  return result;
}, {
  connection: redis,
  concurrency: 2                    // Max 2 dev tasks dong thoi
});
```

---

## 4. Orchestration Flow

### 4.1 Main Flow: PO Decision -> Working Feature

```
PO makes decision
       |
       v
[1] Orchestrator receives decision
       |
       v
[2] BA Agent: create spec ──────────────────┐
       |                                      |
       v                                      |
[3] PO reviews spec                           |
       |                                      |
    approve? ──no──> BA revises ──────────────┘
       |
      yes
       |
       v
[4] Designer Agent + Stakeholder Agent (parallel)
       |                    |
       |              Stakeholder feedback
       v                    |
    Design output <─────────┘ (merge feedback)
       |
       v
[5] PO reviews design
       |
    approve? ──no──> Designer revises
       |
      yes
       |
       v
[6] Dev Agent: implement
       |
       v
[7] Auto-test (build + lint + test)
       |
    pass? ──no──> Dev Agent: fix ──> [7]
       |
      yes
       |
       v
[8] Customer Agent: usability review
       |
       v
[9] Stakeholder Agent: final review
       |
       v
[10] PO final decision
       |
    ship? ──no──> identify what to fix ──> [2] or [4] or [6]
       |
      yes
       |
       v
[11] Feature complete. Score PO decisions.
```

### 4.2 State Machine

```typescript
enum SessionState {
  INITIATED = 'initiated',
  SPEC_DRAFTING = 'spec_drafting',
  SPEC_REVIEW = 'spec_review',          // PO reviews
  DESIGN_IN_PROGRESS = 'design_in_progress',
  DESIGN_REVIEW = 'design_review',      // PO reviews
  DEV_IN_PROGRESS = 'dev_in_progress',
  DEV_TESTING = 'dev_testing',
  USER_TESTING = 'user_testing',        // Customer agent
  STAKEHOLDER_REVIEW = 'stakeholder_review',
  FINAL_REVIEW = 'final_review',        // PO final call
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Transitions
const transitions: Record<SessionState, SessionState[]> = {
  [SessionState.INITIATED]:          [SessionState.SPEC_DRAFTING],
  [SessionState.SPEC_DRAFTING]:      [SessionState.SPEC_REVIEW],
  [SessionState.SPEC_REVIEW]:        [SessionState.DESIGN_IN_PROGRESS, SessionState.SPEC_DRAFTING],
  [SessionState.DESIGN_IN_PROGRESS]: [SessionState.DESIGN_REVIEW],
  [SessionState.DESIGN_REVIEW]:      [SessionState.DEV_IN_PROGRESS, SessionState.DESIGN_IN_PROGRESS],
  [SessionState.DEV_IN_PROGRESS]:    [SessionState.DEV_TESTING],
  [SessionState.DEV_TESTING]:        [SessionState.USER_TESTING, SessionState.DEV_IN_PROGRESS],
  [SessionState.USER_TESTING]:       [SessionState.STAKEHOLDER_REVIEW],
  [SessionState.STAKEHOLDER_REVIEW]: [SessionState.FINAL_REVIEW],
  [SessionState.FINAL_REVIEW]:       [SessionState.COMPLETED, SessionState.SPEC_DRAFTING,
                                       SessionState.DESIGN_IN_PROGRESS, SessionState.DEV_IN_PROGRESS],
  [SessionState.COMPLETED]:          [],
  [SessionState.FAILED]:             [SessionState.INITIATED]
};
```

### 4.3 Orchestrator Implementation

```typescript
class SessionOrchestrator {
  constructor(
    private stateStore: StateStore,
    private eventBus: EventBus,
    private taskQueue: TaskQueue
  ) {}

  async handlePODecision(sessionId: string, decision: PODecision) {
    const session = await this.stateStore.getSession(sessionId);

    switch (session.state) {
      case SessionState.INITIATED:
        await this.startSpecDrafting(session, decision);
        break;

      case SessionState.SPEC_REVIEW:
        if (decision.action === 'approve') {
          await this.startDesign(session);
        } else {
          await this.reviseSpec(session, decision.feedback);
        }
        break;

      case SessionState.DESIGN_REVIEW:
        if (decision.action === 'approve') {
          await this.startDevelopment(session);
        } else {
          await this.reviseDesign(session, decision.feedback);
        }
        break;

      case SessionState.FINAL_REVIEW:
        await this.handleFinalDecision(session, decision);
        break;
    }
  }

  private async startSpecDrafting(session: Session, decision: PODecision) {
    await this.stateStore.transition(session.id, SessionState.SPEC_DRAFTING);

    await this.taskQueue.add('ba-agent', {
      sessionId: session.id,
      poDecision: decision,
      projectContext: session.projectContext
    });

    // BA agent completion triggers event
    this.eventBus.once(`ba-complete:${session.id}`, async (output: BAOutput) => {
      await this.stateStore.saveArtifact(session.id, 'spec', output);

      if (output.questionsForPO?.length) {
        // Pause for PO input
        await this.stateStore.transition(session.id, SessionState.SPEC_REVIEW);
        this.eventBus.emit(`po-input-needed:${session.id}`, {
          type: 'clarification',
          questions: output.questionsForPO
        });
      } else {
        await this.stateStore.transition(session.id, SessionState.SPEC_REVIEW);
        this.eventBus.emit(`po-review-ready:${session.id}`, {
          type: 'spec',
          artifact: output
        });
      }
    });
  }

  private async startDesign(session: Session) {
    await this.stateStore.transition(session.id, SessionState.DESIGN_IN_PROGRESS);
    const spec = await this.stateStore.getArtifact(session.id, 'spec');

    // Run Designer + Stakeholder in parallel
    await Promise.all([
      this.taskQueue.add('designer-agent', {
        sessionId: session.id,
        spec: spec
      }),
      this.taskQueue.add('stakeholder-agent', {
        sessionId: session.id,
        role: 'cto',
        artifact: { type: 'spec', content: spec }
      })
    ]);
  }

  private async startDevelopment(session: Session) {
    await this.stateStore.transition(session.id, SessionState.DEV_IN_PROGRESS);
    const spec = await this.stateStore.getArtifact(session.id, 'spec');
    const design = await this.stateStore.getArtifact(session.id, 'design');

    await this.taskQueue.add('dev-agent', {
      sessionId: session.id,
      spec,
      design,
      codeContext: session.codeContext
    }, {
      timeout: 15 * 60 * 1000  // Dev tasks can be long
    });
  }
}
```

---

## 5. Cost Management

### 5.1 Token Cost Estimate Per Session

Gia dinh 1 session = PO implement 1 feature trung binh (M complexity).


| Agent                 | Calls/Session | Input Tokens | Output Tokens | Model                  | Cost/Call | Total              |
| --------------------- | ------------- | ------------ | ------------- | ---------------------- | --------- | ------------------ |
| BA Agent              | 1-2           | ~3,000       | ~3,500        | Claude Sonnet          | ~$0.04    | ~$0.08             |
| Designer Agent        | 1-2           | ~4,000       | ~5,000        | Claude Sonnet + Stitch | ~$0.06    | ~$0.12             |
| Dev Agent             | 2-4           | ~8,000       | ~15,000       | Claude Sonnet / Codex  | ~$0.20    | ~$0.80             |
| Stakeholder Agent     | 2-3           | ~2,000       | ~2,000        | Claude Haiku           | ~$0.005   | ~$0.015            |
| Customer Agent        | 1-2           | ~2,000       | ~2,500        | Claude Haiku           | ~$0.005   | ~$0.01             |
| Orchestrator LLM      | 3-5           | ~1,000       | ~500          | Claude Haiku           | ~$0.002   | ~$0.01             |
| **Total per session** |               |              |               |                        |           | **~$1.00 - $1.50** |


Voi revisions va retries: **~$1.50 - $3.00 per feature session**.

### 5.2 Cost Reduction Strategies

**A. Model tiering**:

```typescript
const MODEL_ROUTING = {
  'ba-agent':          'claude-sonnet-4-6',    // Can reasoning tot
  'designer-agent':    'claude-sonnet-4-6',    // Can creativity
  'dev-agent':         'claude-sonnet-4-6',    // Can code quality
  'stakeholder-agent': 'claude-haiku-4-5',     // Feedback don gian hon
  'customer-agent':    'claude-haiku-4-5',     // Simulated user, khong can qua smart
  'orchestrator':      'claude-haiku-4-5',     // Routing decisions
};
```

**B. Context pruning**: Chi truyen context can thiet cho tung agent, khong truyen toan bo session history.

```typescript
function pruneContextForAgent(session: Session, agentType: string): any {
  switch (agentType) {
    case 'designer-agent':
      // Designer chi can spec.uiRequirements, khong can dataModel chi tiet
      return {
        uiRequirements: session.spec.uiRequirements,
        userStories: session.spec.userStories,
        // KHONG truyen: apiEndpoints, dataModel
      };
    case 'stakeholder-agent':
      // Stakeholder chi can summary, khong can full code
      return {
        summary: summarizeArtifact(session.latestArtifact),
        keyDecisions: session.decisions.slice(-5)
      };
  }
}
```

**C. Caching**: Cache component listings tu Stitch MCP, cache code patterns.

**D. Incremental generation**: Khi PO chi thay doi 1 phan spec, chi re-run agents affected, khong re-run toan bo chain.

```typescript
async function handlePartialUpdate(session: Session, change: Change) {
  const impactAnalysis = analyzeImpact(change, session);

  if (impactAnalysis.affectsUI && !impactAnalysis.affectsLogic) {
    // Chi re-run Designer, skip BA va Dev
    await taskQueue.add('designer-agent', {
      ...session.designInput,
      changedRequirements: impactAnalysis.changedUIReqs
    });
  }
}
```

**E. Prompt caching**: Su dung Anthropic prompt caching cho system prompts + project context (giam ~90% input cost cho cached portion).

---

## 6. Error Handling

### 6.1 Error Categories & Strategies

```typescript
enum ErrorType {
  AGENT_TIMEOUT = 'agent_timeout',       // Agent chay qua lau
  AGENT_CRASH = 'agent_crash',           // Process die
  LLM_API_ERROR = 'llm_api_error',       // Rate limit, 500, etc.
  INVALID_OUTPUT = 'invalid_output',     // Output khong match contract
  MCP_ERROR = 'mcp_error',              // Stitch/tool fail
  BUILD_FAILURE = 'build_failure',       // Code khong compile
  STATE_CORRUPTION = 'state_corruption'  // Inconsistent state
}
```

### 6.2 Recovery Strategies

```typescript
class ErrorHandler {
  async handle(error: AgentError, session: Session): Promise<Recovery> {
    switch (error.type) {

      case ErrorType.AGENT_TIMEOUT:
        // Strategy: Retry voi simplified input
        if (error.retryCount < 2) {
          return {
            action: 'retry',
            modification: 'reduce_scope',  // Break task nho hon
            delay: 5000
          };
        }
        return { action: 'escalate_to_po', message: 'Task qua phuc tap, can chia nho' };

      case ErrorType.LLM_API_ERROR:
        if (error.statusCode === 429) {
          // Rate limit: exponential backoff
          return {
            action: 'retry',
            delay: Math.min(2 ** error.retryCount * 1000, 60000)
          };
        }
        if (error.statusCode >= 500) {
          // Fallback model
          return {
            action: 'retry',
            modification: 'fallback_model',
            fallbackModel: getFallbackModel(error.originalModel)
          };
        }
        break;

      case ErrorType.INVALID_OUTPUT:
        // Output validation failed — retry voi explicit format instructions
        if (error.retryCount < 2) {
          return {
            action: 'retry',
            modification: 'add_format_instructions',
            extraPrompt: `Your previous output was invalid: ${error.validationError}. Please output valid JSON matching the schema.`
          };
        }
        // Sau 2 lan fail, dung partial output + flag cho PO
        return {
          action: 'use_partial',
          warnings: [`Agent output incomplete: ${error.validationError}`]
        };

      case ErrorType.BUILD_FAILURE:
        // Self-heal: feed errors back to dev agent
        if (error.retryCount < 3) {
          return {
            action: 'retry_dev',
            feedbackPrompt: `Build failed with:\n${error.buildErrors}\n\nFix these errors.`
          };
        }
        return {
          action: 'rollback',
          message: 'Cannot fix build errors after 3 attempts'
        };

      case ErrorType.MCP_ERROR:
        // Stitch MCP down: fallback to text-only design description
        return {
          action: 'degrade_gracefully',
          fallback: 'text_design',
          message: 'Design tool unavailable, using text descriptions'
        };

      case ErrorType.STATE_CORRUPTION:
        // Rebuild state from event log
        return {
          action: 'rebuild_state',
          fromEventLog: true
        };
    }
  }
}
```

### 6.3 Circuit Breaker

```typescript
class AgentCircuitBreaker {
  private failures: Map<string, number> = new Map();
  private readonly threshold = 5;
  private readonly resetTime = 60000; // 1 min

  async callAgent(agentType: string, input: any): Promise<any> {
    const failures = this.failures.get(agentType) || 0;

    if (failures >= this.threshold) {
      throw new CircuitOpenError(
        `${agentType} circuit open — ${failures} consecutive failures`
      );
    }

    try {
      const result = await this.executeAgent(agentType, input);
      this.failures.set(agentType, 0); // Reset on success
      return result;
    } catch (error) {
      this.failures.set(agentType, failures + 1);
      throw error;
    }
  }
}
```

### 6.4 Session Checkpoint & Resume

```typescript
// Moi buoc thanh cong deu luu checkpoint
async function checkpoint(session: Session, state: SessionState, data: any) {
  await db.transaction(async (tx) => {
    await tx.insert(checkpoints).values({
      sessionId: session.id,
      state,
      data: JSON.stringify(data),
      timestamp: new Date()
    });
    await tx.update(sessions)
      .set({ state, updatedAt: new Date() })
      .where(eq(sessions.id, session.id));
  });
}

// Resume tu checkpoint gan nhat
async function resumeSession(sessionId: string) {
  const latest = await db.select()
    .from(checkpoints)
    .where(eq(checkpoints.sessionId, sessionId))
    .orderBy(desc(checkpoints.timestamp))
    .limit(1);

  return orchestrator.resumeFrom(latest.state, latest.data);
}
```

---

## 7. Tech Stack

### 7.1 Core Stack


| Layer            | Technology                 | Ly do chon                                    |
| ---------------- | -------------------------- | --------------------------------------------- |
| **Runtime**      | Node.js 22 (TypeScript)    | Ecosystem MCP tot nhat, async native          |
| **Framework**    | Fastify                    | Nhanh, schema validation built-in             |
| **Queue**        | BullMQ + Redis 7           | Reliable, delayed jobs, rate limiting         |
| **Database**     | PostgreSQL 16              | Session state, checkpoints, audit log         |
| **Cache**        | Redis 7                    | Session cache, pub/sub, circuit breaker state |
| **ORM**          | Drizzle ORM                | Type-safe, lightweight                        |
| **LLM SDK**      | Anthropic SDK + OpenAI SDK | Cho Claude va Codex                           |
| **MCP Client**   | @modelcontextprotocol/sdk  | Standard MCP client                           |
| **Process Mgmt** | PM2 / Docker Compose       | Worker process management                     |
| **Monitoring**   | Pino logger + Prometheus   | Structured logging, metrics                   |


### 7.2 Project Structure

```
po-simulation-platform/
├── apps/
│   ├── web/                     # Next.js frontend (PO interface)
│   ├── orchestrator/            # Main orchestration service
│   │   ├── src/
│   │   │   ├── state-machine.ts
│   │   │   ├── session.ts
│   │   │   ├── orchestrator.ts
│   │   │   └── error-handler.ts
│   │   └── package.json
│   └── workers/                 # Agent workers
│       ├── src/
│       │   ├── agents/
│       │   │   ├── ba.agent.ts
│       │   │   ├── designer.agent.ts
│       │   │   ├── dev.agent.ts
│       │   │   ├── stakeholder.agent.ts
│       │   │   └── customer.agent.ts
│       │   ├── mcp/
│       │   │   ├── stitch.client.ts
│       │   │   └── codex.client.ts
│       │   └── index.ts
│       └── package.json
├── packages/
│   ├── shared/                  # Shared types, contracts
│   │   ├── src/
│   │   │   ├── types/           # All I/O contracts
│   │   │   ├── prompts/         # System prompts per agent
│   │   │   └── validators/      # Zod schemas for output validation
│   │   └── package.json
│   └── db/                      # Database schema & migrations
├── infra/
│   ├── docker-compose.yml       # Local dev: Redis + Postgres
│   └── k8s/                     # Production deployment
├── turbo.json                   # Turborepo config
└── package.json
```

### 7.3 Output Validation (Zod)

```typescript
// packages/shared/src/validators/ba-output.ts
import { z } from 'zod';

export const UserStorySchema = z.object({
  asA: z.string(),
  iWant: z.string(),
  soThat: z.string(),
});

export const AcceptanceCriteriaSchema = z.object({
  given: z.string(),
  when: z.string(),
  then: z.string(),
});

export const BAOutputSchema = z.object({
  spec: z.object({
    title: z.string().max(200),
    userStories: z.array(UserStorySchema).min(1),
    acceptanceCriteria: z.array(AcceptanceCriteriaSchema).min(1),
    uiRequirements: z.array(z.object({
      screen: z.string(),
      description: z.string(),
      components: z.array(z.string()),
    })),
    outOfScope: z.array(z.string()),
  }),
  estimatedComplexity: z.enum(['S', 'M', 'L', 'XL']),
  questionsForPO: z.array(z.string()).optional(),
});

// Validate agent output
function validateAgentOutput(agentType: string, output: unknown) {
  const schema = SCHEMAS[agentType]; // Map agent -> schema
  const result = schema.safeParse(output);

  if (!result.success) {
    throw new InvalidOutputError(agentType, result.error);
  }

  return result.data;
}
```

### 7.4 Deployment

**Development**: Docker Compose

```yaml
# infra/docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: po_simulation
      POSTGRES_PASSWORD: dev
    ports: ['5432:5432']

  orchestrator:
    build: ./apps/orchestrator
    depends_on: [redis, postgres]
    environment:
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      OPENAI_API_KEY: ${OPENAI_API_KEY}

  workers:
    build: ./apps/workers
    depends_on: [redis, postgres]
    deploy:
      replicas: 2
```

**Production**: Kubernetes voi auto-scaling workers based on queue depth.

---

## 8. Scoring & PO Learning

Moi session ket thuc, he thong tinh diem cho PO:

```typescript
interface POScorecard {
  sessionId: string;
  scores: {
    specClarity: number;           // BA agent phai hoi lai bao nhieu lan
    scopeControl: number;          // Scope creep? Out-of-scope items added?
    stakeholderAlignment: number;  // Stakeholder approve ngay hay nhieu revision
    decisionSpeed: number;         // Thoi gian PO mat de review/decide
    finalQuality: number;          // Customer agent usability score
    costEfficiency: number;        // Actual cost vs estimated
  };
  feedback: string;                // AI-generated coaching feedback
  comparisonToAverage?: {          // So voi cac PO khac (anonymous)
    percentile: number;
    strengths: string[];
    improvementAreas: string[];
  };
}
```

---

## Summary


| Aspect         | Decision                                                                     |
| -------------- | ---------------------------------------------------------------------------- |
| Architecture   | Hybrid Orchestrator + Event-Driven                                           |
| Runtime        | Node.js TypeScript, monorepo (Turborepo)                                     |
| Queue          | BullMQ + Redis                                                               |
| State          | PostgreSQL (durable) + Redis (cache)                                         |
| LLM routing    | Sonnet cho BA/Designer/Dev, Haiku cho Stakeholder/Customer                   |
| Cost/session   | ~$1.50-3.00 per feature                                                      |
| Error handling | Retry with backoff, circuit breaker, graceful degradation, checkpoint/resume |
| MCP            | Stitch (design), Codex/Claude CLI (dev) via stdio transport                  |



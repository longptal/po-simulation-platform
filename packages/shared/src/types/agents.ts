/**
 * Core shared types for PO Simulation Platform
 * These types define contracts between all agents and the orchestrator
 */

// ============================================
// Common Types
// ============================================

export type Priority = 'must' | 'should' | 'could';
export type Complexity = 'S' | 'M' | 'L' | 'XL';
export type AgentRole = 'ba' | 'designer' | 'dev' | 'stakeholder' | 'customer';

// ============================================
// BA Agent Contracts
// ============================================

export interface BAInput {
  sessionId: string;
  poDecision: {
    featureDescription: string;
    userStories?: string[];
    priority: Priority;
    constraints?: string[];
  };
  projectContext: {
    existingFeatures: string[];
    productGoal: string;
    targetUsers: string;
  };
}

export interface UserStory {
  id: string;
  asA: string;          // Role
  iWant: string;        // Goal
  soThat: string;       // Benefit
  priority: Priority;
}

export interface AcceptanceCriteria {
  given: string;
  when: string;
  then: string;
}

export interface EntityDef {
  name: string;
  attributes: Record<string, string>;
  relationships?: string[];
}

export interface EndpointDef {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  requestBody?: Record<string, unknown>;
  responseBody?: Record<string, unknown>;
}

export interface UIRequirement {
  screen: string;
  elements: string[];
  interactions: string[];
}

export interface BAOutput {
  spec: {
    title: string;
    userStories: UserStory[];
    acceptanceCriteria: AcceptanceCriteria[];
    dataModel?: EntityDef[];
    apiEndpoints?: EndpointDef[];
    uiRequirements: UIRequirement[];
    outOfScope: string[];
  };
  estimatedComplexity: Complexity;
  questionsForPO?: string[];
}

// ============================================
// Designer Agent Contracts
// ============================================

export interface DesignerInput {
  sessionId: string;
  spec: BAOutput['spec'];
  designSystem?: {
    framework: 'react' | 'vue';
    componentLibrary: string;
    theme?: Record<string, unknown>;
  };
  existingScreens?: ScreenReference[];
}

export interface ScreenReference {
  id: string;
  name: string;
  path: string;
}

export interface ComponentDef {
  name: string;
  type: string;
  props?: Record<string, unknown>;
  children?: ComponentDef[];
}

export interface Interaction {
  trigger: string;
  action: string;
  result: string;
}

export interface DesignerOutput {
  screens: {
    name: string;
    description: string;
    html: string; // Raw HTML/Tailwind output
    components: ComponentDef[];
    layout: string;
    interactions: Interaction[];
  }[];
  designTokens?: Record<string, string>;
}

// ============================================
// Dev Agent Contracts
// ============================================

export interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  [key: string]: string;
}

export interface DevInput {
  sessionId: string;
  spec: BAOutput['spec'];
  design: DesignerOutput;
  codeContext: {
    repoPath: string;
    techStack: TechStack;
    existingPatterns: string[];
    relevantFiles?: string[];
  };
  taskBreakdown?: string[];
}

export interface PRDef {
  title: string;
  branch: string;
  commits: string[];
  filesChanged: string[];
  description: string;
}

export interface DevOutput {
  pullRequests: PRDef[];
  testsCoverage: {
    unit: number;
    integration: number;
  };
  warnings?: string[];
}

// ============================================
// Stakeholder Agent Contracts
// ============================================

export type StakeholderRole =
  | 'ceo'
  | 'cto'
  | 'engineering_manager'
  | 'sales_lead';

export type StakeholderSentiment = 'approve' | 'concerns' | 'reject';
export type FeedbackSeverity = 'blocker' | 'major' | 'minor' | 'suggestion';

export interface StakeholderInput {
  sessionId: string;
  role: StakeholderRole;
  poDecision: {
    description: string;
    optionChosen: string;
    context: string;
    timeTaken: number;
  };
  scenarioContext: {
    productName: string;
    currentSprint: number;
    velocity: number;
    activeMetrics: Record<string, number>;
    urgencyLevel: 'low' | 'medium' | 'high';
    trigger?: string;
  };
  previousFeedback?: string[];
}

export interface StakeholderFeedbackItem {
  aspect: string; // "timeline", "scope", "resources", "risk", "quality"
  comment: string;
  severity: FeedbackSeverity;
  suggestion?: string;
}

export interface StakeholderOutput {
  overallSentiment: StakeholderSentiment;
  feedback: StakeholderFeedbackItem[];
  questionsForPO: string[];
  approvalConditions?: string[];
}

// ============================================
// Customer Agent Contracts
// ============================================

export interface CustomerPersona {
  id: string;
  name: string;
  segment: string;
  behaviors: string[];
}

export interface CustomerInput {
  sessionId: string;
  deployedFeatures: string[];
  personas: CustomerPersona[];
}

export interface CustomerOutput {
  feedback: {
    persona: string;
    message: string;
    satisfaction: number;  // 1-5
  }[];
  usageMetrics?: Record<string, number>;
}

// ============================================
// Session & State Types
// ============================================

export interface SessionState {
  sessionId: string;
  userId: string;
  scenarioId: string;
  currentSprint: number;
  status: 'active' | 'paused' | 'completed';
  startedAt: Date;
  updatedAt: Date;
}

export interface AgentJob {
  id: string;
  sessionId: string;
  agentRole: AgentRole;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input: BAInput | DesignerInput | DevInput | StakeholderInput | CustomerInput;
  output?: BAOutput | DesignerOutput | DevOutput | StakeholderOutput | CustomerOutput;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

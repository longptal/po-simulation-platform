/**
 * Zod validation schemas for BA Agent output
 */

import { z } from 'zod';

export const UserStorySchema = z.object({
  id: z.string(),
  asA: z.string(),
  iWant: z.string(),
  soThat: z.string(),
  priority: z.enum(['must', 'should', 'could']),
});

export const AcceptanceCriteriaSchema = z.object({
  given: z.string(),
  when: z.string(),
  then: z.string(),
});

export const EntityDefSchema = z.object({
  name: z.string(),
  attributes: z.record(z.string()),
  relationships: z.array(z.string()).optional(),
});

export const EndpointDefSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  path: z.string(),
  description: z.string(),
  requestBody: z.record(z.unknown()).optional(),
  responseBody: z.record(z.unknown()).optional(),
});

export const UIRequirementSchema = z.object({
  screen: z.string(),
  elements: z.array(z.string()),
  interactions: z.array(z.string()),
});

export const BAOutputSchema = z.object({
  spec: z.object({
    title: z.string(),
    userStories: z.array(UserStorySchema),
    acceptanceCriteria: z.array(AcceptanceCriteriaSchema),
    dataModel: z.array(EntityDefSchema).optional(),
    apiEndpoints: z.array(EndpointDefSchema).optional(),
    uiRequirements: z.array(UIRequirementSchema),
    outOfScope: z.array(z.string()),
  }),
  estimatedComplexity: z.enum(['S', 'M', 'L', 'XL']),
  questionsForPO: z.array(z.string()).optional(),
});

// ============================================
// Stakeholder Agent Schemas
// ============================================

export const StakeholderFeedbackItemSchema = z.object({
  aspect: z.string(), // "timeline", "scope", "resources", "risk", "quality", "customer_impact"
  comment: z.string(),
  severity: z.enum(['blocker', 'major', 'minor', 'suggestion']),
  suggestion: z.string().optional(),
});

export const StakeholderOutputSchema = z.object({
  overallSentiment: z.enum(['approve', 'concerns', 'reject']),
  feedback: z.array(StakeholderFeedbackItemSchema).min(1).max(10),
  questionsForPO: z.array(z.string()).max(5),
  approvalConditions: z.array(z.string()).optional(),
});

// ============================================
// Designer Agent Schemas
// ============================================

interface IComponentDef {
  name: string;
  type: string;
  props?: Record<string, unknown>;
  children?: IComponentDef[];
}

export const ComponentDefSchema: z.ZodType<IComponentDef> = z.object({
  name: z.string(),
  type: z.string(),
  props: z.record(z.unknown()).optional(),
  children: z.lazy(() => z.array(ComponentDefSchema)).optional(),
});

export const InteractionSchema = z.object({
  trigger: z.string(),
  action: z.string(),
  result: z.string(),
});

export const DesignerScreenSchema = z.object({
  name: z.string(),
  description: z.string(),
  html: z.string().min(1, 'HTML output is required'),
  components: z.array(ComponentDefSchema),
  layout: z.string(),
  interactions: z.array(InteractionSchema),
});

export const DesignerOutputSchema = z.object({
  screens: z.array(DesignerScreenSchema).min(1),
  designTokens: z.record(z.string()).optional(),
});

// ============================================
// Customer Agent Schemas
// ============================================

export const CustomerFeedbackItemSchema = z.object({
  persona: z.string(),
  message: z.string(),
  satisfaction: z.number().int().min(1).max(5),
});

export const CustomerOutputSchema = z.object({
  feedback: z.array(CustomerFeedbackItemSchema).min(1),
  usageMetrics: z.record(z.number()).optional(),
});

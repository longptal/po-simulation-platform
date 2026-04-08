/**
 * Stakeholder Agent — Reactive feedback agent
 * Reviews PO decisions and provides realistic stakeholder pushback/concerns
 * Uses Claude Haiku 4.5 (cost optimization: ~$0.10 per response)
 */

import Anthropic from '@anthropic-ai/sdk';
import type { StakeholderInput, StakeholderOutput } from '@po-sim/shared/types/agents';
import { StakeholderOutputSchema } from '@po-sim/shared/schemas/agent-output.schema';

// Persona-specific concerns for realistic behavior
const ROLE_PERSONAS: Record<string, { lens: string; cares: string[] }> = {
  ceo: {
    lens: 'CEO',
    cares: [
      'business value and revenue impact',
      'market positioning and competitive advantage',
      'return on investment',
      'alignment with company strategy',
      'risk to existing revenue streams',
    ],
  },
  cto: {
    lens: 'CTO',
    cares: [
      'technical debt accumulation',
      'system scalability and architecture',
      'security implications',
      'engineering standards and code quality',
      'infrastructure costs',
    ],
  },
  engineering_manager: {
    lens: 'Engineering Manager',
    cares: [
      'team capacity and realistic delivery',
      'developer burnout and morale',
      'timeline feasibility',
      'quality assurance and testing',
      'maintainability of the solution',
    ],
  },
  sales_lead: {
    lens: 'Sales Lead',
    cares: [
      'customer appeal and deal closure',
      'competitive differentiation',
      'client retention and satisfaction',
      'time-to-market for features',
      'sales team enablement',
    ],
  },
};

export class StakeholderAgent {
  private client?: Anthropic;
  private model = 'claude-haiku-4-5-20250514';
  private maxRetries = 2;
  private mockMode: boolean;

  constructor(apiKey?: string) {
    this.mockMode = !apiKey;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  /**
   * Generate stakeholder feedback from PO decision
   */
  async generateFeedback(input: StakeholderInput): Promise<StakeholderOutput> {
    if (this.mockMode) {
      return this.mockGenerateFeedback(input);
    }
    const systemPrompt = this.buildSystemPrompt(input.role);
    const userPrompt = this.buildUserPrompt(input);

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      try {
        const response = await this.client!.messages.create({
          model: this.model,
          max_tokens: 1500,
          temperature: 0.7,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: userPrompt,
            },
          ],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error('Expected text response from Claude');
        }

        // Parse JSON from response
        const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/);
        if (!jsonMatch) {
          throw new Error('No JSON block found in response');
        }

        const parsed = JSON.parse(jsonMatch[1]);

        // Validate with Zod
        const validated = StakeholderOutputSchema.parse(parsed);

        return validated as StakeholderOutput;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt <= this.maxRetries) {
          console.warn(
            `Stakeholder Agent validation failed (attempt ${attempt}/${this.maxRetries}):`,
            error
          );
        }
      }
    }

    throw new Error(
      `Stakeholder Agent failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  private mockGenerateFeedback(input: StakeholderInput): Promise<StakeholderOutput> {
    const persona = ROLE_PERSONAS[input.role] || ROLE_PERSONAS.engineering_manager;
    return Promise.resolve({
      overallSentiment: 'approve',
      feedback: [
        {
          aspect: 'timeline',
          comment: `This seems reasonable, but let's monitor capacity. As ${persona.lens}, I'd like to see more detail on the delivery plan.`,
          severity: 'minor',
          suggestion: 'Consider breaking this into smaller milestones for easier tracking.',
        },
      ],
      questionsForPO: ['What is the expected impact on current sprint commitments?'],
      approvalConditions: ['Team has capacity to deliver without overtime'],
    });
  }

  private buildSystemPrompt(role: string): string {
    const persona = ROLE_PERSONAS[role] || ROLE_PERSONAS.ceo;
    const caresList = persona.cares.map((c) => `- ${c}`).join('\n');

    return `You are a ${persona.lens} reviewing a Product Owner's decision in a simulation.

Your concerns focus on:
${caresList}

Output format:
- Respond with a JSON object wrapped in \`\`\`json code blocks
- Follow the exact schema structure
- Be concise — 1-3 sentences per feedback item
- Realistic but constructive — challenge without being hostile

Behavior:
- If the decision is realistic and well-reasoned, respond with approval
- If the decision overcommits or ignores critical concerns, push back firmly
- If context is unclear, ask 1-3 clarifying questions
- If approving conditionally, list your conditions

Sentiment guidance:
- "approve": decision is sound, addresses key concerns
- "concerns": decision has issues but is workable with adjustments
- "reject": decision is fundamentally flawed from your perspective`;
  }

  private buildUserPrompt(input: StakeholderInput): string {
    let prompt = `## PO Decision
Role selected: ${input.poDecision.optionChosen}
Decision: ${input.poDecision.description}
Context: ${input.poDecision.context}
Time taken: ${input.poDecision.timeTaken}s

## Scenario Context
Product: ${input.scenarioContext.productName}
Current Sprint: ${input.scenarioContext.currentSprint}
Team Velocity: ${input.scenarioContext.velocity} pts`;

    // Add active metrics
    const metrics = Object.entries(input.scenarioContext.activeMetrics);
    if (metrics.length > 0) {
      prompt += `\nActive Metrics:\n${metrics.map(([k, v]) => `- ${k}: ${v}`).join('\n')}`;
    }

    prompt += `\nUrgency: ${input.scenarioContext.urgencyLevel}`;

    // Add scenario trigger if present
    if (input.scenarioContext.trigger) {
      prompt += `\n\n## Recent Context\n${input.scenarioContext.trigger}`;
    }

    // Reference previous feedback for continuity
    if (input.previousFeedback && input.previousFeedback.length > 0) {
      prompt += `\n\n## Previous Feedback You Raised\n${input.previousFeedback.map((f) => `- ${f}`).join('\n')}`;
    }

    prompt += `\n\n---

Review this decision as a ${ROLE_PERSONAS[input.role]?.lens || input.role}.
Provide your feedback following this JSON schema:

\`\`\`json
{
  "overallSentiment": "approve | concerns | reject",
  "feedback": [
    {
      "aspect": "string (e.g., timeline, scope, risk, quality)",
      "comment": "string (your feedback)",
      "severity": "blocker | major | minor | suggestion",
      "suggestion": "string (constructive alternative, optional)"
    }
  ],
  "questionsForPO": ["string (1-3 clarifying questions, empty array if clear)"],
  "approvalConditions": ["string (if approving conditionally)"]
}
\`\`\`

Respond with ONLY the JSON object in \`\`\`json code blocks.`;

    return prompt;
  }
}

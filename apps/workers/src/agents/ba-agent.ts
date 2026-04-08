/**
 * BA Agent — Business Analyst
 * Converts PO decisions into structured specifications
 * Supports MOCK_LLM mode when ANTHROPIC_API_KEY is not set
 */

import Anthropic from '@anthropic-ai/sdk';
import type { BAInput, BAOutput } from '@po-sim/shared/types/agents';
import { BAOutputSchema } from '@po-sim/shared/schemas/agent-output.schema';

export class BAAgent {
  private client?: Anthropic;
  private model = 'claude-sonnet-4-20250514';
  private maxRetries = 2;
  private mockMode: boolean;

  constructor(apiKey?: string) {
    this.mockMode = !apiKey;
    if (apiKey) {
      this.client = new Anthropic({ apiKey });
    }
  }

  /**
   * Generate specification from PO decision
   */
  async generateSpec(input: BAInput): Promise<BAOutput> {
    if (this.mockMode) {
      return this.mockGenerateSpec(input);
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      try {
        const response = await this.client!.messages.create({
          model: this.model,
          max_tokens: 4096,
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
        const validated = BAOutputSchema.parse(parsed);

        return validated as BAOutput;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt <= this.maxRetries) {
          console.warn(
            `BA Agent validation failed (attempt ${attempt}/${this.maxRetries}):`,
            error
          );
        }
      }
    }

    throw new Error(
      `BA Agent failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  private mockGenerateSpec(input: BAInput): Promise<BAOutput> {
    return Promise.resolve({
      spec: {
        title: `Spec: ${input.poDecision.featureDescription}`,
        userStories: [
          {
            id: 'US-001',
            asA: 'user',
            iWant: input.poDecision.featureDescription,
            soThat: 'I can accomplish my goal efficiently',
            priority: input.poDecision.priority,
          },
        ],
        acceptanceCriteria: [
          {
            given: 'User is on the relevant screen',
            when: 'User performs the primary action',
            then: 'The expected outcome occurs without errors',
          },
        ],
        uiRequirements: [
          {
            screen: 'Main Screen',
            elements: ['Header', 'Content area', 'Action buttons'],
            interactions: ['Click to submit', 'Hover for details'],
          },
        ],
        outOfScope: ['Advanced analytics', 'Third-party integrations'],
      },
      estimatedComplexity: 'M',
      questionsForPO: ['Should we include this in the current sprint?'],
    });
  }

  private buildSystemPrompt(): string {
    return `You are a Business Analyst AI agent in a Product Owner training simulation.

Your role:
- Convert PO decisions into structured technical specifications
- Write clear user stories in "As a... I want... So that..." format
- Define acceptance criteria in Given-When-Then format
- Identify data models, API endpoints, and UI requirements
- Flag items that are out of scope

Output format:
- Respond with a JSON object wrapped in \`\`\`json code blocks
- Follow the exact schema structure provided
- Be concise but complete
- Prioritize clarity over verbosity

Quality standards:
- User stories must be testable and independent
- Acceptance criteria must be specific and measurable
- Data models should follow normalization principles
- API endpoints should follow REST conventions
- UI requirements should be implementation-agnostic`;
  }

  private buildUserPrompt(input: BAInput): string {
    return `Session ID: ${input.sessionId}

## PO Decision
Feature: ${input.poDecision.featureDescription}
Priority: ${input.poDecision.priority}
${input.poDecision.userStories ? `User Stories Provided:\n${input.poDecision.userStories.map((s: string) => `- ${s}`).join('\n')}` : ''}
${input.poDecision.constraints ? `Constraints:\n${input.poDecision.constraints.map((c: string) => `- ${c}`).join('\n')}` : ''}

## Project Context
Product Goal: ${input.projectContext.productGoal}
Target Users: ${input.projectContext.targetUsers}
Existing Features:
${input.projectContext.existingFeatures.map((f: string) => `- ${f}`).join('\n')}

---

Generate a complete specification following this JSON schema:

\`\`\`json
{
  "spec": {
    "title": "string",
    "userStories": [
      {
        "id": "string (e.g., US-001)",
        "asA": "string (user role)",
        "iWant": "string (goal)",
        "soThat": "string (benefit)",
        "priority": "must | should | could"
      }
    ],
    "acceptanceCriteria": [
      {
        "given": "string (precondition)",
        "when": "string (action)",
        "then": "string (expected result)"
      }
    ],
    "dataModel": [
      {
        "name": "string (entity name)",
        "attributes": { "field": "type" },
        "relationships": ["string (related entities)"]
      }
    ],
    "apiEndpoints": [
      {
        "method": "GET | POST | PUT | DELETE | PATCH",
        "path": "string (e.g., /api/users)",
        "description": "string",
        "requestBody": {},
        "responseBody": {}
      }
    ],
    "uiRequirements": [
      {
        "screen": "string (screen name)",
        "elements": ["string (UI elements)"],
        "interactions": ["string (user interactions)"]
      }
    ],
    "outOfScope": ["string (items explicitly not included)"]
  },
  "estimatedComplexity": "S | M | L | XL",
  "questionsForPO": ["string (clarifying questions)"]
}
\`\`\`

Respond with ONLY the JSON object wrapped in \`\`\`json code blocks. No additional text.`;
  }
}

/**
 * Customer Agent — simulates end-user feedback from personas
 * Uses Claude Haiku 4.5 (cost optimization: ~$0.10 per response)
 * Output: structured JSON feedback with satisfaction scores
 */

import Anthropic from '@anthropic-ai/sdk';
import type { CustomerInput, CustomerOutput } from '@po-sim/shared/types/agents';
import { CustomerOutputSchema } from '@po-sim/shared/schemas/agent-output.schema';

// Persona archetypes for realistic user simulation
const PERSONA_PROFILES: Record<string, { tone: string; priorities: string[] }> = {
  power_user: {
    tone: 'detail-oriented and demanding',
    priorities: [
      'advanced features and customization',
      'keyboard shortcuts and efficiency',
      'data export and integration capabilities',
      'performance and loading speed',
    ],
  },
  casual_user: {
    tone: 'friendly but easily confused',
    priorities: [
      'simplicity and clarity of the interface',
      'clear instructions and guidance',
      'minimal steps to complete tasks',
      'visual consistency and familiarity',
    ],
  },
  accessibility_user: {
    tone: 'practical and direct',
    priorities: [
      'screen reader compatibility',
      'keyboard navigation',
      'sufficient color contrast',
      'clear error messages and recovery paths',
    ],
  },
  mobile_user: {
    tone: 'impatient and context-switching',
    priorities: [
      'touch-friendly button sizes and spacing',
      'responsive layout on small screens',
      'offline or low-connectivity behavior',
      'quick task completion on the go',
    ],
  },
  stakeholder_buyer: {
    tone: 'results-focused and time-pressed',
    priorities: [
      'dashboard clarity and key metrics at a glance',
      'reporting and sharing capabilities',
      'onboarding speed for new team members',
      'admin controls and permissions',
    ],
  },
};

export class CustomerAgent {
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
   * Generate customer feedback from personas about deployed features
   */
  async generateFeedback(input: CustomerInput): Promise<CustomerOutput> {
    if (this.mockMode) {
      return this.mockGenerateFeedback(input);
    }

    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      try {
        const response = await this.client!.messages.create({
          model: this.model,
          max_tokens: 2048,
          temperature: 0.8,
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
        const validated = CustomerOutputSchema.parse(parsed);

        return validated as CustomerOutput;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt <= this.maxRetries) {
          console.warn(
            `Customer Agent validation failed (attempt ${attempt}/${this.maxRetries}):`,
            error
          );
        }
      }
    }

    throw new Error(
      `Customer Agent failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  private mockGenerateFeedback(input: CustomerInput): Promise<CustomerOutput> {
    const personas = input.personas.length > 0
      ? input.personas
      : [{ id: 'default', name: 'Default User', segment: 'general', behaviors: ['general usage'] }];

    return Promise.resolve({
      feedback: personas.map((p) => ({
        persona: p.name,
        message: `This looks good overall. I was able to complete my tasks without major issues. A few minor improvements could help the experience.`,
        satisfaction: 4,
      })),
      usageMetrics: {
        adoptionRate: 72,
        featureDiscovery: 45,
        returnRate: 68,
      },
    });
  }

  private buildSystemPrompt(): string {
    return `You are a Customer Feedback AI agent in a Product Owner training simulation.

Your role:
- Simulate realistic end-user feedback for deployed features
- Speak from the perspective of different user personas
- Provide concrete, specific feedback (not vague opinions)
- Rate satisfaction on a 1-5 scale based on feature quality and persona fit

Satisfaction scale:
- 1 = Very dissatisfied: feature is broken or unusable for this persona
- 2 = Dissatisfied: major usability issues or missing expected functionality
- 3 = Neutral: functional but not great, average experience
- 4 = Satisfied: good experience with minor quibbles
- 5 = Very satisfied: excellent, meets all needs perfectly

Persona behavior:
- Each persona has different priorities and expectations
- A feature that delights one persona may frustrate another
- Feedback should reflect the persona's typical concerns and vocabulary

Output format:
- Respond with a JSON object wrapped in \`\`\`json code blocks
- One feedback item per persona provided in the input
- Messages should be 1-3 sentences, written in first person
- Include specific details about what works or doesn't work

Do NOT include explanatory text outside the JSON block.`;
  }

  private buildUserPrompt(input: CustomerInput): string {
    let prompt = `Session ID: ${input.sessionId}

## Deployed Features
${input.deployedFeatures.map((f) => `- ${f}`).join('\n')}`;

    if (input.personas && input.personas.length > 0) {
      prompt += `\n\n## User Personas\n${input.personas.map((p) => `- **${p.name}** (${p.segment}): ${p.behaviors.join(', ')}`).join('\n')}`;
    } else {
      prompt += `\n\n## User Personas\nNo specific personas provided. Use common personas (power user, casual user, mobile user).`;
    }

    prompt += `\n\n---

Simulate user feedback for the deployed features above from the perspective of each persona.

Respond with this JSON schema:

\`\`\`json
{
  "feedback": [
    {
      "persona": "string (persona name)",
      "message": "string (1-3 sentences of feedback in first person)",
      "satisfaction": "number (1-5)"
    }
  ],
  "usageMetrics": {
    "adoptionRate": "number (0-100 percentage)",
    "featureDiscovery": "number (0-100 percentage)",
    "returnRate": "number (0-100 percentage)"
  }
}
\`\`\`

Respond with ONLY the JSON object in \`\`\`json code blocks.`;

    return prompt;
  }
}

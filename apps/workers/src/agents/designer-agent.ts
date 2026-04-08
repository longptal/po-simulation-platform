/**
 * Designer Agent — generates HTML/Tailwind components from BA specs
 * Uses Claude Sonnet 4.6 for complex layout reasoning
 * Output: raw HTML strings (NO Stitch MCP or external tool integration)
 */

import Anthropic from '@anthropic-ai/sdk';
import type { DesignerInput, DesignerOutput } from '@po-sim/shared/types/agents';
import { DesignerOutputSchema } from '@po-sim/shared/schemas/agent-output.schema';

export class DesignerAgent {
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
   * Generate HTML/Tailwind design from BA specification
   */
  async generateDesign(input: DesignerInput): Promise<DesignerOutput> {
    if (this.mockMode) {
      return this.mockGenerateDesign(input);
    }
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(input);

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= this.maxRetries) {
      try {
        const response = await this.client!.messages.create({
          model: this.model,
          max_tokens: 8192,
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
        const validated = DesignerOutputSchema.parse(parsed);

        return validated as DesignerOutput;
      } catch (error) {
        lastError = error as Error;
        attempt++;

        if (attempt <= this.maxRetries) {
          console.warn(
            `Designer Agent validation failed (attempt ${attempt}/${this.maxRetries}):`,
            error
          );
        }
      }
    }

    throw new Error(
      `Designer Agent failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`
    );
  }

  private mockGenerateDesign(input: DesignerInput): Promise<DesignerOutput> {
    return Promise.resolve({
      screens: input.spec.uiRequirements.map((req) => ({
        name: req.screen,
        description: `Mock design for ${req.screen}`,
        html: `<div class="p-4 bg-white rounded-lg shadow"><h1 class="text-2xl font-bold mb-4">${req.screen}</h1><div class="space-y-2">${req.elements.map((e) => `<div class="p-2 border rounded">${e}</div>`).join('\n')}</div></div>`,
        components: req.elements.map((el) => ({
          name: el.replace(/\s+/g, ''),
          type: 'div',
        })),
        layout: 'single-column flex flex-col gap-4',
        interactions: req.interactions.map((i) => ({
          trigger: i,
          action: 'click',
          result: 'Triggered interaction',
        })),
      })),
    });
  }

  private buildSystemPrompt(): string {
    return `You are a UI Designer AI agent in a Product Owner training simulation.

Your role:
- Convert BA specifications into production-ready HTML with Tailwind CSS classes
- Generate complete, self-contained HTML for each screen described in the spec
- Use modern, accessible markup with proper semantic HTML elements
- Apply Tailwind CSS utility classes for all styling

Output rules:
- Each screen's "html" field must contain a complete HTML string (or component fragment)
- HTML must include proper structure: semantic elements, accessibility attributes, responsive classes
- Use Tailwind CSS v3+ utility classes exclusively — no inline styles or custom CSS
- Include responsive breakpoints (sm:, md:, lg:) where relevant
- Use Tailwind's built-in spacing scale (1=0.25rem, 2=0.5rem, etc.)
- For interactive elements, include appropriate ARIA attributes

Quality standards:
- HTML must be valid and well-structured
- Use appropriate semantic elements (nav, main, section, article, aside, footer)
- Form inputs must have associated labels
- Navigation must be keyboard-accessible
- Color contrast must meet WCAG AA (use Tailwind's default palette)

Respond with a JSON object wrapped in \`\`\`json code blocks.
Be concise but complete in your HTML output.
Do NOT include explanatory text outside the JSON block.`;
  }

  private buildUserPrompt(input: DesignerInput): string {
    let prompt = `Session ID: ${input.sessionId}

## Source Specification

**Feature**: ${input.spec.title}

### User Stories
${input.spec.userStories.map((s) => `- [${s.priority.toUpperCase()}] As a ${s.asA}, I want ${s.iWant} so that ${s.soThat}`).join('\n')}

### Acceptance Criteria
${input.spec.acceptanceCriteria.map((c) => `- GIVEN ${c.given} WHEN ${c.when} THEN ${c.then}`).join('\n')}

### UI Requirements (from BA spec)
${input.spec.uiRequirements.map((r) => `**Screen: ${r.screen}**\n  Elements: ${r.elements.join(', ')}\n  Interactions: ${r.interactions.join(', ')}`).join('\n\n')}

### Out of Scope
${input.spec.outOfScope.map((s) => `- ${s}`).join('\n')}`;

    if (input.designSystem) {
      prompt += `\n\n## Design System\nFramework: ${input.designSystem.framework}\nComponent Library: ${input.designSystem.componentLibrary}`;
      if (input.designSystem.theme) {
        prompt += `\nTheme: ${JSON.stringify(input.designSystem.theme)}`;
      }
    }

    if (input.existingScreens && input.existingScreens.length > 0) {
      prompt += `\n\n## Existing Screens (for reference)\n${input.existingScreens.map((s) => `- ${s.name} (${s.path})`).join('\n')}`;
    }

    prompt += `\n\n---

Generate HTML/Tailwind designs for the required screens following this JSON schema:

\`\`\`json
{
  "screens": [
    {
      "name": "string (screen name matching UI requirement)",
      "description": "string (brief purpose of this screen)",
      "html": "string (complete HTML with Tailwind CSS classes)",
      "components": [
        {
          "name": "string (component name)",
          "type": "string (e.g., Button, Form, Card, Table)",
          "props": { "propName": "type or value" }
        }
      ],
      "layout": "string (layout description, e.g., 'sidebar + main content grid')",
      "interactions": [
        { "trigger": "string", "action": "string", "result": "string" }
      ]
    }
  ],
  "designTokens": { "primaryColor": "string", "fontFamily": "string" }
}
\`\`\`

Important:
- The "html" field must be a string with escaped newlines, NOT raw multi-line text
- Generate HTML for every screen listed in the UI Requirements above
- HTML should be complete enough to render without additional code

Respond with ONLY the JSON object in \`\`\`json code blocks.`;

    return prompt;
  }
}

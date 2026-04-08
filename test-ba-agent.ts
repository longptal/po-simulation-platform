/**
 * Test script for BA Agent
 * Run: ANTHROPIC_API_KEY=your-key tsx test-ba-agent.ts
 */

import { BAAgent } from './apps/workers/src/agents/ba-agent.js';
import type { BAInput } from './packages/shared/src/types/agents.js';

async function testBAAgent() {
  console.log('🧪 Testing BA Agent...\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required');
    process.exit(1);
  }

  const agent = new BAAgent(apiKey);

  const testInput: BAInput = {
    sessionId: 'test-session-001',
    poDecision: {
      featureDescription: 'Add user profile page with avatar upload and bio editing',
      priority: 'must',
      constraints: [
        'Must support images up to 5MB',
        'Bio limited to 500 characters',
        'Must work on mobile devices',
      ],
    },
    projectContext: {
      existingFeatures: [
        'User authentication (email/password)',
        'Dashboard with activity feed',
        'Settings page',
      ],
      productGoal: 'Build a social platform for developers to share projects',
      targetUsers: 'Software developers aged 20-40',
    },
  };

  console.log('📝 Input:');
  console.log(JSON.stringify(testInput, null, 2));
  console.log('\n⏳ Calling BA Agent (Claude Sonnet 4)...\n');

  try {
    const output = await agent.generateSpec(testInput);

    console.log('✅ BA Agent Response:\n');
    console.log('📊 Title:', output.spec.title);
    console.log('🔢 Complexity:', output.estimatedComplexity);
    console.log(`📝 User Stories: ${output.spec.userStories.length}`);
    output.spec.userStories.forEach((story, i) => {
      console.log(`   ${i + 1}. ${story.id}: As a ${story.asA}, I want ${story.iWant}`);
    });

    console.log(`\n✓ Acceptance Criteria: ${output.spec.acceptanceCriteria.length}`);
    console.log(`✓ UI Requirements: ${output.spec.uiRequirements.length}`);
    console.log(`✓ Out of Scope: ${output.spec.outOfScope.length}`);

    if (output.spec.dataModel) {
      console.log(`✓ Data Model: ${output.spec.dataModel.length} entities`);
    }

    if (output.spec.apiEndpoints) {
      console.log(`✓ API Endpoints: ${output.spec.apiEndpoints.length}`);
    }

    if (output.questionsForPO && output.questionsForPO.length > 0) {
      console.log(`\n❓ Questions for PO: ${output.questionsForPO.length}`);
      output.questionsForPO.forEach((q, i) => {
        console.log(`   ${i + 1}. ${q}`);
      });
    }

    console.log('\n✨ Test passed! BA Agent is working correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testBAAgent().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});

/**
 * Test script for scenario parser
 * Run: tsx test-parser.ts
 */

import { parseScenarioFile } from './packages/shared/src/utils/scenario-parser.js';
import { resolve } from 'path';

async function testParser() {
  console.log('🧪 Testing Scenario Parser...\n');

  const scenarioPath = resolve('./scenarios/sprint-planning-capacity.yaml');
  console.log(`📄 Loading scenario: ${scenarioPath}\n`);

  const result = await parseScenarioFile(scenarioPath);

  if (result.success && result.data) {
    console.log('✅ Scenario parsed successfully!\n');
    console.log('📊 Scenario Details:');
    console.log(`   ID: ${result.data.id}`);
    console.log(`   Title: ${result.data.title}`);
    console.log(`   Domain: ${result.data.domain}`);
    console.log(`   Type: ${result.data.type}`);
    console.log(`   Difficulty: ${result.data.difficulty}/10`);
    console.log(`   Required PO Level: ${result.data.required_po_level}/20`);
    console.log(`   Duration: ${result.data.estimated_duration_minutes} minutes`);
    console.log(`   Tags: ${result.data.tags.join(', ')}\n`);

    console.log('🎯 Context:');
    console.log(`   Product: ${result.data.context.product_name}`);
    console.log(`   Stage: ${result.data.context.product_stage}`);
    console.log(`   Team Size: ${result.data.context.team_composition.length}`);
    console.log(`   Sprint Velocity: ${result.data.context.current_sprint.velocity} points`);
    console.log(`   Backlog Items: ${result.data.context.existing_backlog.length}\n`);

    console.log('🌳 Decision Tree:');
    console.log(`   Root Node: ${result.data.decision_tree.id}`);
    console.log(`   Decision Type: ${result.data.decision_tree.decision_type}`);
    console.log(`   Options: ${result.data.decision_tree.options.length}`);
    console.log(`   Allow Freeform: ${result.data.decision_tree.allow_freeform}`);
    console.log(`   Time Pressure: ${result.data.decision_tree.time_pressure_seconds}s\n`);

    console.log('📈 Scoring:');
    console.log(`   Dimensions: ${result.data.scoring.dimensions.length}`);
    result.data.scoring.dimensions.forEach((dim) => {
      console.log(`     - ${dim.name} (weight: ${dim.weight})`);
    });
    console.log(`   Rubric Items: ${result.data.scoring.rubric.length}\n`);

    console.log('🎓 Learning Objectives:');
    result.data.outcomes.learning_objectives.forEach((obj, i) => {
      console.log(`   ${i + 1}. ${obj}`);
    });

    console.log('\n✨ All validations passed!');
  } else {
    console.error('❌ Scenario parsing failed!\n');
    console.error('Errors:');
    result.errors?.forEach((err, i) => {
      console.error(`   ${i + 1}. ${err}`);
    });
    process.exit(1);
  }
}

testParser().catch((error) => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});

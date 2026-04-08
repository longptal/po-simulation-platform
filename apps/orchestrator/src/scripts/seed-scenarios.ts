/**
 * Seed Script — Load scenario YAML files into PostgreSQL
 * Run: npx tsx src/scripts/seed-scenarios.ts
 */

import { readdir, readFile } from 'fs/promises';
import { resolve } from 'path';
import { parseScenarioString } from '@po-sim/shared/utils/scenario-parser';
import { db, scenarios } from '@po-sim/db';
import { eq } from 'drizzle-orm';

const SCENARIOS_DIR = resolve(process.cwd(), '..', '..', 'scenarios');

/**
 * Load a scenario YAML file, validate, and insert/update in the database.
 */
async function seedScenario(filename: string): Promise<void> {
  const filePath = resolve(SCENARIOS_DIR, filename);

  console.log(`Loading scenario: ${filename}`);

  const content = await readFile(filePath, 'utf-8');
  const result = parseScenarioString(content);

  if (!result.success) {
    console.error(`  FAILED: ${result.errors?.join(', ')}`);
    return;
  }

  const scenario = result.data!;

  // Check if scenario already exists
  const existing = await db
    .select()
    .from(scenarios)
    .where(eq(scenarios.id, scenario.id))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  SKIP: Scenario ${scenario.id} already exists in database`);
    return;
  }

  // Insert scenario
  await db.insert(scenarios).values({
    id: scenario.id,
    title: scenario.title,
    domain: scenario.domain,
    type: scenario.type,
    difficulty: scenario.difficulty,
    required_po_level: scenario.required_po_level,
    estimated_duration_minutes: scenario.estimated_duration_minutes,
    scenario_data: scenario as unknown as Record<string, unknown>,
  });

  console.log(`  OK: Scenario "${scenario.title}" seeded`);
}

/**
 * Main — load all YAML files in the scenarios directory.
 */
async function main() {
  try {
    const files = await readdir(SCENARIOS_DIR);
    const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

    if (yamlFiles.length === 0) {
      console.log('No scenario YAML files found in scenarios/');
      return;
    }

    console.log(`Found ${yamlFiles.length} scenario file(s)\n`);

    for (const file of yamlFiles) {
      await seedScenario(file);
    }

    console.log('\nSeeding complete');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

main();

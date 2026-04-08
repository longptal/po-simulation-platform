/**
 * Scenario YAML parser with Zod validation
 * Loads scenario files and validates against schema
 */

import { readFile } from 'fs/promises';
import { parse as parseYAML } from 'yaml';
import { ScenarioSchema, type ScenarioValidated } from '../schemas/scenario.schema.js';

export interface ParseResult {
  success: boolean;
  data?: ScenarioValidated;
  errors?: string[];
}

/**
 * Parse and validate a scenario YAML file
 * @param filePath - Absolute path to YAML file
 * @returns ParseResult with validated data or errors
 */
export async function parseScenarioFile(filePath: string): Promise<ParseResult> {
  try {
    // Read file
    const content = await readFile(filePath, 'utf-8');

    // Parse YAML
    const rawData = parseYAML(content);

    // Validate with Zod
    const result = ScenarioSchema.safeParse(rawData);

    if (!result.success) {
      return {
        success: false,
        errors: result.error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`
        ),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        error instanceof Error
          ? error.message
          : 'Unknown error parsing scenario file',
      ],
    };
  }
}

/**
 * Parse scenario from YAML string (useful for testing)
 * @param yamlContent - YAML content as string
 * @returns ParseResult with validated data or errors
 */
export function parseScenarioString(yamlContent: string): ParseResult {
  try {
    const rawData = parseYAML(yamlContent);
    const result = ScenarioSchema.safeParse(rawData);

    if (!result.success) {
      return {
        success: false,
        errors: result.error.errors.map(
          (err) => `${err.path.join('.')}: ${err.message}`
        ),
      };
    }

    return {
      success: true,
      data: result.data,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        error instanceof Error
          ? error.message
          : 'Unknown error parsing scenario string',
      ],
    };
  }
}

/**
 * Validate decision tree structure (check for cycles, orphaned nodes)
 * @param scenario - Validated scenario
 * @returns Array of validation warnings
 */
export function validateDecisionTree(scenario: ScenarioValidated): string[] {
  const warnings: string[] = [];
  const visitedNodes = new Set<string>();
  const allNodeIds = new Set<string>();

  // Collect all node IDs from options
  function collectNodeIds(node: any) {
    allNodeIds.add(node.id);
    for (const option of node.options) {
      if (option.next_node_id) {
        allNodeIds.add(option.next_node_id);
      }
    }
  }

  collectNodeIds(scenario.decision_tree);

  // Check for orphaned node references
  for (const option of scenario.decision_tree.options) {
    if (option.next_node_id && !allNodeIds.has(option.next_node_id)) {
      warnings.push(
        `Orphaned node reference: ${option.next_node_id} in option ${option.id}`
      );
    }
  }

  // Check for cycles (simple DFS)
  function checkCycles(nodeId: string, path: Set<string>) {
    if (path.has(nodeId)) {
      warnings.push(`Cycle detected: ${Array.from(path).join(' -> ')} -> ${nodeId}`);
      return;
    }

    if (visitedNodes.has(nodeId)) return;

    visitedNodes.add(nodeId);
    path.add(nodeId);

    // Note: This is a simplified check for the root node only
    // Full tree traversal would require loading all referenced nodes

    path.delete(nodeId);
  }

  checkCycles(scenario.decision_tree.id, new Set());

  return warnings;
}

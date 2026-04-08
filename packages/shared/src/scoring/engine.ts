/**
 * Scoring Engine — computes weighted scores from PO decisions
 *
 * Input: ScoringInput (session, config, decisions, difficulty)
 * Output: ScoringResult (session score, causal chains, causal graph)
 *
 * All inputs validated via Zod. Validation failure throws.
 */

import {
  ScoringInputSchema,
} from './schemas.js';
import type {
  ScoringInput,
  ScoringResult,
  SessionScore,
  DimensionScore,
  SprintScore,
  ScoringDecisionRecord,
} from './types.js';
import { computeCausalChains, buildCausalGraph } from './impact-mapper.js';
import { computeXP } from './xp-calculator.js';

export class ScoringEngine {
  /**
   * Compute full session score from a list of PO decisions.
   * @throws on Zod validation failure
   */
  computeScore(input: ScoringInput): ScoringResult {
    // Validate input via Zod
    const validated = ScoringInputSchema.parse(input);

    const { sessionId, scenarioId, config, decisions, scenarioDifficulty } =
      validated;

    // Compute per-dimension scores across all decisions
    const dimensionScores = this.computeDimensionScores(config, decisions);

    // Compute weighted total
    const weightedTotal = this.computeWeightedTotal(
      dimensionScores,
      config.dimensions,
    );

    // Compute XP
    const xpEarned = computeXP({
      baseXP: 100,
      difficultyMultiplier: 1.0 + scenarioDifficulty * 0.2,
      performanceScore: weightedTotal / 100,
    });

    const sessionScore: SessionScore = {
      sessionId,
      scenarioId,
      dimensionScores,
      weightedTotal,
      xpEarned,
      completedAt: new Date(),
    };

    // Build causal chains from decision side effects
    const causalChains = computeCausalChains(decisions);

    // Build session-level causal graph
    const causalGraph = buildCausalGraph(sessionId, decisions, causalChains);

    return { sessionScore, causalChains, causalGraph };
  }

  /**
   * Compute score for a single sprint (subset of decisions).
   */
  computeSprintScore(
    config: ScoringInput['config'],
    decisions: ScoringDecisionRecord[],
    sprintNumber: number,
  ): SprintScore {
    const dimensionScores = this.computeDimensionScores(config, decisions);
    const weightedTotal = this.computeWeightedTotal(
      dimensionScores,
      config.dimensions,
    );

    return { sprintNumber, dimensionScores, weightedTotal };
  }

  // -----------------------------------------------
  // Internal helpers
  // -----------------------------------------------

  private computeDimensionScores(
    config: ScoringInput['config'],
    decisions: ScoringDecisionRecord[],
  ): DimensionScore[] {
    const maxScore = config.maxScorePerDimension;

    // Initialize accumulators for each configured dimension
    const accumulators = new Map<string, { total: number; count: number }>();
    for (const dim of config.dimensions) {
      accumulators.set(dim.dimension, { total: 0, count: 0 });
    }

    // Accumulate modifiers from each decision
    for (const decision of decisions) {
      for (const modifier of decision.scoreModifiers) {
        const acc = accumulators.get(modifier.dimension);
        if (acc) {
          acc.total += modifier.delta;
          acc.count += 1;
        }
      }
    }

    // Convert to DimensionScore[]
    const result: DimensionScore[] = [];
    for (const [dimension, acc] of accumulators) {
      const avgDelta = acc.count > 0 ? acc.total / acc.count : 0;
      // Normalize: center at 50 (neutral), each +1 delta adds 5 points
      const normalizedScore = Math.max(
        0,
        Math.min(maxScore, 50 + avgDelta * 5),
      );

      result.push({
        dimension: dimension as DimensionScore['dimension'],
        score: Math.round(normalizedScore * 100) / 100,
        maxPossible: maxScore,
        decisionsContributed: acc.count,
      });
    }

    return result;
  }

  private computeWeightedTotal(
    dimensionScores: DimensionScore[],
    weights: ScoringInput['config']['dimensions'],
  ): number {
    let total = 0;
    for (const dimScore of dimensionScores) {
      const weight = weights.find((w) => w.dimension === dimScore.dimension);
      if (weight) {
        total += dimScore.score * weight.weight;
      }
    }
    return Math.round(total * 100) / 100;
  }
}

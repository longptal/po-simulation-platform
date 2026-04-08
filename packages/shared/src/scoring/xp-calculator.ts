/**
 * XP Calculator — computes XP earned from session performance
 */

/**
 * Compute XP from base values and performance score.
 */
export function computeXP(input: {
  baseXP: number;
  difficultyMultiplier: number;
  performanceScore: number;
}): number {
  return Math.round(
    input.baseXP * input.difficultyMultiplier * input.performanceScore
  );
}

/**
 * Compute new PO level from total XP.
 */
export function computeLevel(totalXP: number): number {
  // 100 XP per level, with diminishing returns at higher levels
  return Math.max(1, Math.floor(totalXP / 100) + 1);
}

import type { Weights } from './types';

/**
 * Single source of truth for weight presets. Drives both the route table
 * (src/routes.tsx) and the preset buttons (src/components/PiePresets.tsx),
 * so the two can never drift out of sync.
 *
 * Each preset maps a label + URL path to a fixed weight distribution. The
 * first entry (`/`) is the default landing page; its `weights` value is
 * exported as `DEFAULT_WEIGHTS` for initial state in HomePage.
 */
export interface Preset {
  label: string;
  path: string;
  weights: Weights;
}

const THIRD = 100 / 3;

export const PRESETS: Preset[] = [
  { label: 'Balanced', path: '/', weights: { good: THIRD, cheap: THIRD, fast: THIRD } },
  { label: 'Best value', path: '/best-value', weights: { good: 50, cheap: 50, fast: 0 } },
  { label: 'Fast & cheap', path: '/fast-and-cheap', weights: { good: 0, cheap: 50, fast: 50 } },
  { label: 'Highest quality', path: '/highest-quality', weights: { good: 100, cheap: 0, fast: 0 } },
  { label: 'Fastest', path: '/fastest', weights: { good: 0, cheap: 0, fast: 100 } },
  { label: 'Cheapest', path: '/cheapest', weights: { good: 0, cheap: 100, fast: 0 } },
  { label: 'Fast & good', path: '/fast-and-good', weights: { good: 50, cheap: 0, fast: 50 } },
];

export const DEFAULT_WEIGHTS: Weights = PRESETS[0].weights;

/**
 * Tolerance for "current weights match this preset" detection. Safe at 2
 * because every pair of presets differs by >=50 on at least one dimension,
 * so two presets can never both fall within tolerance of the same weights.
 */
export const MATCH_TOLERANCE = 2;

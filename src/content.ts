/**
 * Single source of truth for the prose that explains how each dimension is
 * sourced. Consumed by BOTH the results-table column tooltips and the footer
 * "How data is sourced" section — edit here and both update together.
 */

export type Dimension = 'good' | 'cheap' | 'fast';

export interface SourcingInfo {
  label: string;
  /** No trailing period — sourcingTooltip appends one after the label. */
  body: string;
}

export const SOURCING: Record<Dimension, SourcingInfo> = {
  good: {
    label: 'Good — BenchLM',
    body: 'Overall and per-category quality scores.',
  },
  cheap: {
    label: 'Cheap — OpenRouter',
    body: 'Live hosted-API prices, blended at an 8:1 input:output ratio per million tokens. Effort tiers (e.g. “Pro (Max)”) inherit the base endpoint’s price.',
  },
  fast: {
    label: 'Fast — OpenRouter',
    body: 'Ranking uses OpenRouter’s throughput and latency ordering, which reflects real-world hosted-API serving. Absolute speed values aren’t shown: per-model measurements are taken at varying reasoning-effort tiers and don’t align with the ordinal ranking.',
  },
};

export function sourcingTooltip(key: Dimension): string {
  const { label, body } = SOURCING[key];
  return `${label}. ${body}`;
}

export const COMPOSITE_NOTE =
  'Composite scores use percentile-ranking (100 = best within the eligible set), blended from your weights. A model ranks only when it has data for every weighted dimension.';

import type { Weights } from './types';

/**
 * Canonical site origin. Used to build absolute canonical / OG URLs for each
 * preset route — both at prerender time (scripts/prerender.mjs) and on the
 * client (useSeoMeta). Update here if the deployed domain changes.
 */
export const SITE_ORIGIN = 'https://modelspie.com';

/**
 * Single source of truth for weight presets. Drives the route table
 * (src/routes.tsx), the preset buttons (src/components/PiePresets.tsx), the
 * prerendered <head> metadata (scripts/prerender.mjs), and the visible intro
 * copy (src/components/PresetIntro.tsx) — so all four stay in sync.
 *
 * Each preset maps a label + URL path to a fixed weight distribution. The
 * first entry (`/`) is the default landing page; its `weights` value is
 * exported as `DEFAULT_WEIGHTS` for initial state in HomePage.
 */
export interface PresetSeo {
  /** <title> + OG/twitter title. Include keywords + brand. */
  title: string;
  /** <meta name="description"> + OG/twitter description. ~150 chars. */
  description: string;
  /** Sole visible <h1> on the page (brand h1 is demoted to <p>). */
  h1: string;
  /** Visible intro paragraph rendered into the SSR HTML for crawlers + users. */
  intro: string;
}

export interface Preset {
  label: string;
  path: string;
  weights: Weights;
  seo: PresetSeo;
}

const THIRD = 100 / 3;

export const PRESETS: Preset[] = [
  {
    label: 'Balanced',
    path: '/',
    weights: { good: THIRD, cheap: THIRD, fast: THIRD },
    seo: {
      title: 'Models Pie · Compare & Rank LLMs by Cost, Speed & Quality',
      description:
        'Models Pie ranks large language models by your fast, cheap and good priorities. Adjust the weights to compare LLMs by cost, speed and quality and find the best model for the job.',
      h1: 'Compare LLMs by cost, speed & quality',
      intro:
        'Models Pie ranks large language models across quality, price and speed so you can pick the right trade-off for your workload. This balanced view weighs all three equally — drag the pie to emphasize what matters, or pick a preset.',
    },
  },
  {
    label: 'Best value',
    path: '/best-value',
    weights: { good: 50, cheap: 50, fast: 0 },
    seo: {
      title: 'Best Value AI Models · Quality per Dollar | Models Pie',
      description:
        'The best value AI models — ranked by quality and price equally, ignoring speed. Find large language models that deliver the most capability per dollar per million tokens.',
      h1: 'Best value AI models',
      intro:
        'These models offer the best quality per dollar, weighting capability and blended cost per million tokens equally. Speed is ignored — ideal when latency isn’t a constraint but getting the most for your budget is.',
    },
  },
  {
    label: 'Fast & cheap',
    path: '/fast-and-cheap',
    weights: { good: 0, cheap: 50, fast: 50 },
    seo: {
      title: 'Fast & Cheap AI Models · Low Latency, Low Cost | Models Pie',
      description:
        'Fast and cheap AI models ranked equally by speed and price. Find large language models with low latency and low cost per million tokens for high-volume, cost-sensitive workloads.',
      h1: 'Fast and cheap AI models',
      intro:
        'Ranking by speed and cost equally — quality is ignored. Best for high-throughput pipelines, bulk classification, and tasks where many cheap, responsive inferences matter more than peak capability.',
    },
  },
  {
    label: 'Highest quality',
    path: '/highest-quality',
    weights: { good: 100, cheap: 0, fast: 0 },
    seo: {
      title: 'Highest Quality AI Models · Best LLMs Ranked | Models Pie',
      description:
        'The highest quality AI models — ranked purely by capability across overall, agentic, coding, reasoning and other quality benchmarks, regardless of price or speed.',
      h1: 'Highest quality AI models',
      intro:
        'Pure quality ranking — price and speed are ignored. Use the “good” dropdown in the column header to switch between overall, agentic, coding, reasoning and other capability benchmarks.',
    },
  },
  {
    label: 'Fastest',
    path: '/fastest',
    weights: { good: 0, cheap: 0, fast: 100 },
    seo: {
      title: 'Fastest AI Models · Lowest Latency & Highest Throughput | Models Pie',
      description:
        'The fastest AI models — ranked purely by speed (throughput and time-to-first-token), regardless of quality or price. Find large language models with the lowest latency for real-time use.',
      h1: 'Fastest AI models',
      intro:
        'Pure speed ranking — quality and price are ignored. Use the “fast” dropdown in the column header to switch between throughput, latency, or a 50:50 blend of both.',
    },
  },
  {
    label: 'Cheapest',
    path: '/cheapest',
    weights: { good: 0, cheap: 100, fast: 0 },
    seo: {
      title: 'Cheapest AI Models · Lowest Cost per Million Tokens | Models Pie',
      description:
        'The cheapest AI models — ranked purely by blended cost per million tokens, regardless of quality or speed. Find the most affordable large language models for budget-constrained workloads.',
      h1: 'Cheapest AI models',
      intro:
        'Pure price ranking — quality and speed are ignored. Models are ordered by blended cost per million input and output tokens, so free and heavily discounted models surface first.',
    },
  },
  {
    label: 'Fast & good',
    path: '/fast-and-good',
    weights: { good: 50, cheap: 0, fast: 50 },
    seo: {
      title: 'Fast & High-Quality AI Models · Speed Plus Capability | Models Pie',
      description:
        'Fast and high-quality AI models ranked equally by speed and quality, ignoring price. Find large language models that are both capable and responsive for latency-sensitive, premium workloads.',
      h1: 'Fast and high-quality AI models',
      intro:
        'Ranking by quality and speed equally — price is ignored. Best for real-time applications where you want strong capability without paying the latency tax, and budget is less of a concern.',
    },
  },
];

export const DEFAULT_WEIGHTS: Weights = PRESETS[0].weights;

/** A preset’s SEO metadata resolved with its absolute canonical URL. */
export interface ResolvedSeo extends PresetSeo {
  path: string;
  url: string;
}

/** Resolve a preset’s full SEO metadata including the absolute canonical URL.
 *  Used by both the prerender script (build-time head injection) and the
 *  useSeoMeta hook (client-side head sync on route change).
 *
 *  `path` stays slash-less (react-router routes/Links/matchesPreset all key off
 *  the bare path). Only the canonical `url` carries the trailing slash for
 *  non-home routes, so the canonical/og:url matches the URL Cloudflare Pages
 *  actually serves: Pages 301-redirects `/best-value` → `/best-value/` when
 *  serving a directory index, so the canonical must agree on the slashed form. */
export function resolveSeo(preset: Preset): ResolvedSeo {
  const canonicalPath = preset.path === '/' ? '/' : `${preset.path}/`;
  return { ...preset.seo, path: preset.path, url: `${SITE_ORIGIN}${canonicalPath}` };
}

/** Path-based lookup for the prerender script, which iterates ROUTE_PATHS. */
export function resolveSeoForPath(path: string): ResolvedSeo {
  const preset = PRESETS.find((p) => p.path === path) ?? PRESETS[0];
  return resolveSeo(preset);
}

/**
 * Tolerance for "current weights match this preset" detection. Safe at 2
 * because every pair of presets differs by >=50 on at least one dimension,
 * so two presets can never both fall within tolerance of the same weights.
 */
export const MATCH_TOLERANCE = 2;

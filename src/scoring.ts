import type {
  JoinedModel,
  QualityMetric,
  RankConfig,
  RankedModel,
  RankResult,
  SpeedMetric,
} from './types';

// Blended cost/M tokens from an 8:1 input:output ratio (per spec). Lower = cheaper.
const INPUT_WEIGHT = 8;
const OUTPUT_WEIGHT = 1;
const BLEND_DIVISOR = INPUT_WEIGHT + OUTPUT_WEIGHT;

export function blendedCost(model: JoinedModel): number | null {
  const { inputPrice, outputPrice } = model;
  if (inputPrice == null || outputPrice == null) return null;
  return (INPUT_WEIGHT * inputPrice + OUTPUT_WEIGHT * outputPrice) / BLEND_DIVISOR;
}

export function qualityRaw(model: JoinedModel, metric: QualityMetric): number | null {
  if (metric === 'overall') return model.overallScore;
  return model.categories[metric] ?? null;
}

function isQualityConfident(model: JoinedModel, metric: QualityMetric): boolean {
  return metric === 'overall'
    ? model.rankingEligible
    : (model.categoryRankingEligible[metric] ?? false);
}

function confidenceTagFor(model: JoinedModel): string {
  const sparse = model.scoreConfidence === 1 || (model.trustedBenchmarkCount ?? 99) <= 1;
  if (!sparse) return 'not BenchLM-ranked';
  const trusted = model.trustedBenchmarkCount;
  if (trusted === 0) return 'low confidence · no trusted benchmarks';
  if (trusted === 1) return 'low confidence · 1 trusted benchmark';
  return 'low confidence';
}

export function speedDataPresent(
  model: JoinedModel,
  metric: SpeedMetric,
): boolean {
  if (metric === 'tps') return model.tokensPerSecond != null;
  if (metric === 'ttft') return model.ttft != null;
  return model.tokensPerSecond != null && model.ttft != null;
}

// Percentile-rank onto 0..100 (100 = best). Robust to skewed distributions such
// as pricing ($0..hundreds); ties share the best (highest) rank.
function percentileRank(
  entries: { key: string; value: number }[],
  higherIsBetter: boolean,
): Map<string, number> {
  const map = new Map<string, number>();
  const n = entries.length;
  if (n === 0) return map;
  if (n === 1) {
    map.set(entries[0].key, 100);
    return map;
  }

  const sorted = higherIsBetter
    ? [...entries].sort((a, b) => b.value - a.value)
    : [...entries].sort((a, b) => a.value - b.value);

  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && sorted[j].value === sorted[i].value) j++;
    const pct = ((n - (i + 1)) / (n - 1)) * 100;
    for (let k = i; k < j; k++) map.set(sorted[k].key, pct);
    i = j;
  }
  return map;
}

function isEligible(model: JoinedModel, cfg: RankConfig): boolean {
  if (cfg.good > 0) {
    const q = qualityRaw(model, cfg.qualityMetric);
    if (q == null || q <= 0) return false;
  }
  if (cfg.cheap > 0 && blendedCost(model) == null) return false;
  if (cfg.fast > 0 && !speedDataPresent(model, cfg.speedMetric)) return false;
  return true;
}

function computeFastPercentiles(
  eligible: JoinedModel[],
  metric: SpeedMetric,
): Map<string, number> {
  if (metric === 'tps') {
    return percentileRank(
      eligible
        .filter((m) => m.tokensPerSecond != null)
        .map((m) => ({ key: m.key, value: m.tokensPerSecond as number })),
      true,
    );
  }
  if (metric === 'ttft') {
    return percentileRank(
      eligible
        .filter((m) => m.ttft != null)
        .map((m) => ({ key: m.key, value: m.ttft as number })),
      false,
    );
  }
  const tps = percentileRank(
    eligible
      .filter((m) => m.tokensPerSecond != null)
      .map((m) => ({ key: m.key, value: m.tokensPerSecond as number })),
    true,
  );
  const ttft = percentileRank(
    eligible
      .filter((m) => m.ttft != null)
      .map((m) => ({ key: m.key, value: m.ttft as number })),
    false,
  );
  const blend = new Map<string, number>();
  for (const m of eligible) {
    const a = tps.get(m.key);
    const b = ttft.get(m.key);
    if (a != null && b != null) blend.set(m.key, (a + b) / 2);
    else if (a != null) blend.set(m.key, a);
    else if (b != null) blend.set(m.key, b);
  }
  return blend;
}

export function rank(models: JoinedModel[], cfg: RankConfig): RankResult {
  const rawTotal = cfg.good + cfg.cheap + cfg.fast;
  const weights =
    rawTotal > 0
      ? { good: cfg.good / rawTotal, cheap: cfg.cheap / rawTotal, fast: cfg.fast / rawTotal }
      : { good: 1 / 3, cheap: 1 / 3, fast: 1 / 3 };

  const eligible = models.filter((m) => isEligible(m, cfg));

  const goodPct =
    weights.good > 0
      ? percentileRank(
          eligible
            .map((m) => ({ key: m.key, value: qualityRaw(m, cfg.qualityMetric) }))
            .filter((e): e is { key: string; value: number } => e.value != null && e.value > 0),
          true,
        )
      : new Map<string, number>();

  const cheapPct =
    weights.cheap > 0
      ? percentileRank(
          eligible
            .map((m) => ({ key: m.key, value: blendedCost(m) }))
            .filter((e): e is { key: string; value: number } => e.value != null),
          false,
        )
      : new Map<string, number>();

  const fastPct = weights.fast > 0 ? computeFastPercentiles(eligible, cfg.speedMetric) : new Map<string, number>();

  const ranked: RankedModel[] = eligible.map((m) => {
    const qualityPct = goodPct.get(m.key) ?? null;
    const cheapPctVal = cheapPct.get(m.key) ?? null;
    const fastPctVal = fastPct.get(m.key) ?? null;

    let composite = 0;
    if (weights.good > 0 && qualityPct != null) composite += weights.good * qualityPct;
    if (weights.cheap > 0 && cheapPctVal != null) composite += weights.cheap * cheapPctVal;
    if (weights.fast > 0 && fastPctVal != null) composite += weights.fast * fastPctVal;

    const lowConfidence = weights.good > 0 && !isQualityConfident(m, cfg.qualityMetric);

    return {
      ...m,
      qualityRaw: qualityRaw(m, cfg.qualityMetric),
      costRaw: blendedCost(m),
      tokensPerSecondRaw: m.tokensPerSecond,
      ttftRaw: m.ttft,
      qualityPct,
      cheapPct: cheapPctVal,
      fastPct: fastPctVal,
      composite,
      lowConfidence,
      confidenceTag: lowConfidence ? confidenceTagFor(m) : null,
    };
  });

  ranked.sort(
    (a, b) =>
      b.composite - a.composite ||
      (b.qualityRaw ?? -1) - (a.qualityRaw ?? -1) ||
      (b.overallScore ?? -1) - (a.overallScore ?? -1),
  );

  return {
    ranked,
    eligibleCount: eligible.length,
    totalConsidered: models.length,
    weights,
  };
}

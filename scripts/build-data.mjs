// Compiles the raw data JSONs (downloaded by fetch-data.mjs) into a single slim
// src/compiled-data.json that the frontend imports instead of the ~1.6MB of raw
// files. This is a Node port of the joining logic that previously ran in the
// browser (src/data.ts); the output shape matches JoinedModel[] + DatasetMeta.
//
//   npm run build:data   # compile only (raws must already be fetched)
//   npm run setup        # fetch + compile (use this on a fresh clone)

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const RAW_FILES = [
  'models.json',
  'speed.json',
  'openrouter-models.json',
  'speed-throughput-rank.json',
  'speed-latency-rank.json',
];

const missing = RAW_FILES.filter((f) => !existsSync(join(root, f)));
if (missing.length > 0) {
  console.error(
    `[build-data] Raw data not found (${missing.join(', ')}). ` +
      `Run \`npm run setup\` first.`,
  );
  process.exit(1);
}

const readJson = (f) => JSON.parse(readFileSync(join(root, f), 'utf8'));

const CATEGORY_KEYS = [
  'agentic',
  'coding',
  'reasoning',
  'multimodalGrounded',
  'knowledge',
  'multilingual',
  'instructionFollowing',
  'math',
];

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v) => (typeof v === 'string' && v.length > 0 ? v : null);

const normalizeName = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const stripOrgPrefix = (name) => {
  const idx = name.indexOf(': ');
  return idx >= 0 ? name.slice(idx + 2) : name;
};

// OpenRouter prices are dollars per single token; the rest of the app works in
// dollars per million tokens, so multiply by 1e6. "-1"/missing => no price.
const tokenPriceToPerM = (v) => {
  if (typeof v !== 'string') return null;
  const parsed = Number(v);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed * 1e6;
};

const TIER_SUFFIX =
  /\s*\((?:max|high|medium|low|turbo|lite|base|preview|thinking|reasoning)\)$/i;

function applyItemPrice(model, item) {
  const inputPrice = tokenPriceToPerM(item?.pricing?.prompt);
  const outputPrice = tokenPriceToPerM(item?.pricing?.completion);
  if (inputPrice == null || outputPrice == null) return;
  model.inputPrice = inputPrice;
  model.outputPrice = outputPrice;
  model.hasNumericPricing = true;
  model.isFreePricing = inputPrice === 0 && outputPrice === 0;
}

function toModel(item) {
  const cats = item?.scores?.displayCategoryScores ?? {};
  const categories = {};
  for (const key of CATEGORY_KEYS) if (key in cats) categories[key] = num(cats[key]);

  const rawCatElig = item?.ranking?.categoryRankingEligible ?? {};
  const categoryRankingEligible = {};
  for (const key of CATEGORY_KEYS)
    if (key in rawCatElig) categoryRankingEligible[key] = rawCatElig[key] === true;

  return {
    key: str(item?.canonicalModelKey) ?? 'unknown',
    name: str(item?.model) ?? str(item?.canonicalModelKey) ?? 'Unknown',
    creator: str(item?.creator),
    contextWindow: str(item?.contextWindow),
    url: str(item?.url),
    sourceType: str(item?.sourceType),
    reasoningType: str(item?.reasoningType),
    overallScore: num(item?.scores?.overallScore),
    categories,
    rankingEligible: item?.ranking?.rankingEligible === true,
    categoryRankingEligible,
    trustedBenchmarkCount: num(item?.coverage?.trustedBenchmarkCount),
    scoreConfidence: num(item?.coverage?.scoreConfidence),
    inputPrice: null,
    outputPrice: null,
    isFreePricing: false,
    hasNumericPricing: false,
    priceNote: null,
    tokensPerSecond: null,
    ttft: null,
    tpsRankValue: null,
    ttftRankValue: null,
  };
}

function applyOpenRouterPricing(models, envelope) {
  const byName = new Map();
  for (const model of models) {
    const n = normalizeName(model.name);
    if (n && !byName.has(n)) byName.set(n, model);
  }

  const orByName = new Map();
  for (const item of envelope?.data ?? []) {
    const name = str(item?.name);
    if (!name) continue;
    const n = normalizeName(stripOrgPrefix(name));
    if (!n) continue;
    const existing = orByName.get(n);
    const itemIsFreeEndpoint = String(item?.id ?? '').endsWith(':free');
    const existingIsFreeEndpoint = existing
      ? String(existing.id ?? '').endsWith(':free')
      : false;
    if (!existing || (existingIsFreeEndpoint && !itemIsFreeEndpoint)) {
      orByName.set(n, item);
    }
  }

  for (const [n, item] of orByName) {
    const model = byName.get(n);
    if (model) applyItemPrice(model, item);
  }

  // BenchLM tracks effort tiers as separate rows ("...Pro (Max)") but OpenRouter
  // exposes one base endpoint, so on an exact-name miss retry with the tier
  // suffix stripped to inherit the base price.
  for (const model of models) {
    if (model.hasNumericPricing) continue;
    const stripped = normalizeName(model.name.replace(TIER_SUFFIX, '').trim());
    if (!stripped || stripped === normalizeName(model.name)) continue;
    const item = orByName.get(stripped);
    if (item) applyItemPrice(model, item);
  }
}

function enrichSpeed(byKey, item) {
  const key = str(item?.canonicalModelKey);
  if (!key) return;
  const model = byKey.get(key);
  if (!model) return;
  model.tokensPerSecond = num(item?.tokensPerSecond);
  model.ttft = num(item?.ttft);
}

function enrichSpeedRank(models, throughputArr, latencyArr) {
  const byName = new Map();
  for (const model of models) {
    const n = normalizeName(model.name);
    if (n && !byName.has(n)) byName.set(n, model);
  }
  // OpenRouter /models sorts by throughput and latency but exposes only an
  // ordinal position (no value), so encode each position: throughput
  // higher-is-better (total - position), latency lower-is-better (raw position).
  const assign = (arr, field, higherIsBetter) => {
    const total = arr.length;
    arr.forEach((entry, idx) => {
      const name = str(entry?.name);
      if (!name) return;
      const model = byName.get(normalizeName(stripOrgPrefix(name)));
      if (model) model[field] = higherIsBetter ? total - idx : idx;
    });
  };
  assign(throughputArr, 'tpsRankValue', true);
  assign(latencyArr, 'ttftRankValue', false);

  for (const model of models) {
    if (model.tpsRankValue != null && model.ttftRankValue != null) continue;
    const stripped = normalizeName(model.name.replace(TIER_SUFFIX, '').trim());
    if (!stripped || stripped === normalizeName(model.name)) continue;
    const base = byName.get(stripped);
    if (!base) continue;
    if (model.tpsRankValue == null && base.tpsRankValue != null)
      model.tpsRankValue = base.tpsRankValue;
    if (model.ttftRankValue == null && base.ttftRankValue != null)
      model.ttftRankValue = base.ttftRankValue;
  }
}

function build() {
  const modelsEnvelope = readJson('models.json');
  const speedEnvelope = readJson('speed.json');
  const openrouterEnvelope = readJson('openrouter-models.json');
  const throughputArr = readJson('speed-throughput-rank.json');
  const latencyArr = readJson('speed-latency-rank.json');

  const byKey = new Map();
  const models = [];
  for (const item of modelsEnvelope?.items ?? []) {
    const model = toModel(item);
    if (!byKey.has(model.key)) {
      byKey.set(model.key, model);
      models.push(model);
    }
  }
  applyOpenRouterPricing(models, openrouterEnvelope);
  for (const item of speedEnvelope?.items ?? []) enrichSpeed(byKey, item);
  enrichSpeedRank(models, throughputArr, latencyArr);

  models.sort((a, b) => a.name.localeCompare(b.name));

  const meta = {
    generatedAt: str(modelsEnvelope?.generatedAt),
    sourceLastUpdated: str(modelsEnvelope?.sourceLastUpdated),
    qualityProvider: 'BenchLM',
    pricingProvider: 'OpenRouter',
    pricingProviderUrl: 'https://openrouter.ai/models',
    speedProvider: str(speedEnvelope?.source?.name) ?? 'Artificial Analysis',
    speedProviderUrl: str(speedEnvelope?.source?.url),
    canonicalUrl: str(modelsEnvelope?.canonicalUrl),
  };

  return { meta, models };
}

const out = build();
const json = JSON.stringify(out);
const dest = join(root, 'src', 'compiled-data.json');
writeFileSync(dest, json);
const kb = (Buffer.byteLength(json) / 1024).toFixed(1);
console.log(`[build-data] wrote ${dest} (${out.models.length} models, ${kb} KB)`);

import type {
  CategoryKey,
  DatasetMeta,
  JoinedModel,
} from './types';

// Imported as ?raw strings so TypeScript does not infer a literal type over the
// ~28k-line models.json (which would slow tsc) and we own the schema instead.
import modelsJson from '../models.json?raw';
import openrouterJson from '../openrouter-models.json?raw';
import speedJson from '../speed.json?raw';

const CATEGORY_KEYS: CategoryKey[] = [
  'agentic',
  'coding',
  'reasoning',
  'multimodalGrounded',
  'knowledge',
  'multilingual',
  'instructionFollowing',
  'math',
];

interface RawEnvelope<T> {
  generatedAt?: string | null;
  sourceLastUpdated?: string | null;
  canonicalUrl?: string | null;
  source?: { name?: string | null; url?: string | null } | null;
  items?: T[];
}

interface RawModelItem {
  canonicalModelKey?: string | null;
  model?: string | null;
  creator?: string | null;
  contextWindow?: string | null;
  url?: string | null;
  sourceType?: string | null;
  reasoningType?: string | null;
  scores?: {
    overallScore?: number | null;
    displayCategoryScores?: Record<string, number | null> | null;
  } | null;
}

interface RawOpenRouterItem {
  id?: string | null;
  name?: string | null;
  pricing?: {
    prompt?: string | null;
    completion?: string | null;
  } | null;
}

interface RawSpeedItem {
  canonicalModelKey?: string | null;
  tokensPerSecond?: number | null;
  ttft?: number | null;
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.length > 0 ? v : null;

function parseEnvelope<T>(raw: string): RawEnvelope<T> {
  return JSON.parse(raw) as RawEnvelope<T>;
}

const normalizeName = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

const stripOrgPrefix = (name: string): string => {
  const idx = name.indexOf(': ');
  return idx >= 0 ? name.slice(idx + 2) : name;
};

// OpenRouter prices are dollars per single token; the rest of the app works in
// dollars per million tokens, so multiply by 1e6. "-1"/missing => no price.
const tokenPriceToPerM = (v: unknown): number | null => {
  if (typeof v !== 'string') return null;
  const parsed = Number(v);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed * 1_000_000;
};

function toModel(item: RawModelItem): JoinedModel {
  const cats = item.scores?.displayCategoryScores ?? {};
  const categories: Partial<Record<CategoryKey, number | null>> = {};
  for (const key of CATEGORY_KEYS) {
    if (key in cats) categories[key] = num(cats[key]);
  }
  return {
    key: str(item.canonicalModelKey) ?? 'unknown',
    name: str(item.model) ?? str(item.canonicalModelKey) ?? 'Unknown',
    creator: str(item.creator),
    contextWindow: str(item.contextWindow),
    url: str(item.url),
    sourceType: str(item.sourceType),
    reasoningType: str(item.reasoningType),
    overallScore: num(item.scores?.overallScore),
    categories,
    inputPrice: null,
    outputPrice: null,
    isFreePricing: false,
    hasNumericPricing: false,
    priceNote: null,
    tokensPerSecond: null,
    ttft: null,
  };
}

function applyOpenRouterPricing(models: JoinedModel[], raw: string): void {
  const byName = new Map<string, JoinedModel>();
  for (const model of models) {
    const n = normalizeName(model.name);
    if (n && !byName.has(n)) byName.set(n, model);
  }

  const orByName = new Map<string, RawOpenRouterItem>();
  const envelope = JSON.parse(raw) as { data?: RawOpenRouterItem[] };
  for (const item of envelope.data ?? []) {
    const name = str(item.name);
    if (!name) continue;
    const n = normalizeName(stripOrgPrefix(name));
    if (!n) continue;
    const existing = orByName.get(n);
    const itemIsFreeEndpoint = String(item.id ?? '').endsWith(':free');
    const existingIsFreeEndpoint = existing
      ? String(existing.id ?? '').endsWith(':free')
      : false;
    if (!existing || (existingIsFreeEndpoint && !itemIsFreeEndpoint)) {
      orByName.set(n, item);
    }
  }

  for (const [n, item] of orByName) {
    const model = byName.get(n);
    if (!model) continue;
    const inputPrice = tokenPriceToPerM(item.pricing?.prompt);
    const outputPrice = tokenPriceToPerM(item.pricing?.completion);
    if (inputPrice == null || outputPrice == null) continue;
    model.inputPrice = inputPrice;
    model.outputPrice = outputPrice;
    model.hasNumericPricing = true;
    model.isFreePricing = inputPrice === 0 && outputPrice === 0;
  }
}

function enrichSpeed(models: Map<string, JoinedModel>, item: RawSpeedItem): void {
  const key = str(item.canonicalModelKey);
  if (!key) return;
  const model = models.get(key);
  if (!model) return;
  model.tokensPerSecond = num(item.tokensPerSecond);
  model.ttft = num(item.ttft);
}

function build(): { models: JoinedModel[]; meta: DatasetMeta } {
  const modelsEnvelope = parseEnvelope<RawModelItem>(modelsJson);
  const speedEnvelope = parseEnvelope<RawSpeedItem>(speedJson);

  const byKey = new Map<string, JoinedModel>();
  const models: JoinedModel[] = [];
  for (const item of modelsEnvelope.items ?? []) {
    const model = toModel(item);
    if (!byKey.has(model.key)) {
      byKey.set(model.key, model);
      models.push(model);
    }
  }
  applyOpenRouterPricing(models, openrouterJson);
  for (const item of speedEnvelope.items ?? []) enrichSpeed(byKey, item);

  models.sort((a, b) => a.name.localeCompare(b.name));

  const meta: DatasetMeta = {
    generatedAt: str(modelsEnvelope.generatedAt),
    sourceLastUpdated: str(modelsEnvelope.sourceLastUpdated),
    qualityProvider: 'BenchLM',
    pricingProvider: 'OpenRouter',
    pricingProviderUrl: 'https://openrouter.ai/models',
    speedProvider: str(speedEnvelope.source?.name) ?? 'Artificial Analysis',
    speedProviderUrl: str(speedEnvelope.source?.url),
    canonicalUrl: str(modelsEnvelope.canonicalUrl),
  };

  return { models, meta };
}

const { models, meta } = build();

export const joinedModels: JoinedModel[] = models;
export const datasetMeta: DatasetMeta = meta;

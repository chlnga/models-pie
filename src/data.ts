import type {
  CategoryKey,
  DatasetMeta,
  JoinedModel,
} from './types';

// Imported as ?raw strings so TypeScript does not infer a literal type over the
// ~28k-line models.json (which would slow tsc) and we own the schema instead.
import modelsJson from '../models.json?raw';
import pricingJson from '../pricing.json?raw';
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

interface RawPricingItem {
  canonicalModelKey?: string | null;
  inputPrice?: number | null;
  outputPrice?: number | null;
  hasNumericPricing?: boolean | null;
  isFreePricing?: boolean | null;
  note?: string | null;
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

function enrichPricing(models: Map<string, JoinedModel>, item: RawPricingItem): void {
  const key = str(item.canonicalModelKey);
  if (!key) return;
  const model = models.get(key);
  if (!model) return;
  model.inputPrice = num(item.inputPrice);
  model.outputPrice = num(item.outputPrice);
  model.hasNumericPricing = item.hasNumericPricing === true;
  model.isFreePricing = item.isFreePricing === true;
  model.priceNote = str(item.note);
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
  const pricingEnvelope = parseEnvelope<RawPricingItem>(pricingJson);
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
  for (const item of pricingEnvelope.items ?? []) enrichPricing(byKey, item);
  for (const item of speedEnvelope.items ?? []) enrichSpeed(byKey, item);

  models.sort((a, b) => a.name.localeCompare(b.name));

  const meta: DatasetMeta = {
    generatedAt: str(modelsEnvelope.generatedAt),
    sourceLastUpdated: str(modelsEnvelope.sourceLastUpdated),
    qualityProvider: 'BenchLM',
    speedProvider: str(speedEnvelope.source?.name) ?? 'Artificial Analysis',
    speedProviderUrl: str(speedEnvelope.source?.url),
    canonicalUrl: str(modelsEnvelope.canonicalUrl),
  };

  return { models, meta };
}

const { models, meta } = build();

export const joinedModels: JoinedModel[] = models;
export const datasetMeta: DatasetMeta = meta;

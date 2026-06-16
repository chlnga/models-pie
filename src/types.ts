export type CategoryKey =
  | 'agentic'
  | 'coding'
  | 'reasoning'
  | 'multimodalGrounded'
  | 'knowledge'
  | 'multilingual'
  | 'instructionFollowing'
  | 'math';

export type Dimension = 'good' | 'cheap' | 'fast';

export type Weights = Record<Dimension, number>;

export type QualityMetric = 'overall' | CategoryKey;

export type SpeedMetric = 'tps' | 'ttft' | 'blend';

export interface JoinedModel {
  key: string;
  name: string;
  creator: string | null;
  contextWindow: string | null;
  url: string | null;
  sourceType: string | null;
  reasoningType: string | null;
  overallScore: number | null;
  categories: Partial<Record<CategoryKey, number | null>>;
  rankingEligible: boolean;
  categoryRankingEligible: Partial<Record<CategoryKey, boolean>>;
  trustedBenchmarkCount: number | null;
  scoreConfidence: number | null;
  inputPrice: number | null;
  outputPrice: number | null;
  isFreePricing: boolean;
  hasNumericPricing: boolean;
  priceNote: string | null;
  tokensPerSecond: number | null;
  ttft: number | null;
}

export interface DatasetMeta {
  generatedAt: string | null;
  sourceLastUpdated: string | null;
  qualityProvider: string | null;
  pricingProvider: string | null;
  pricingProviderUrl: string | null;
  speedProvider: string | null;
  speedProviderUrl: string | null;
  canonicalUrl: string | null;
}

export interface RankConfig {
  good: number;
  cheap: number;
  fast: number;
  qualityMetric: QualityMetric;
  speedMetric: SpeedMetric;
}

export interface RankedModel extends JoinedModel {
  qualityRaw: number | null;
  costRaw: number | null;
  tokensPerSecondRaw: number | null;
  ttftRaw: number | null;
  qualityPct: number | null;
  cheapPct: number | null;
  fastPct: number | null;
  composite: number;
  lowConfidence: boolean;
  confidenceTag: string | null;
}

export interface RankResult {
  ranked: RankedModel[];
  eligibleCount: number;
  totalConsidered: number;
  weights: { good: number; cheap: number; fast: number };
}

export const QUALITY_OPTIONS: { value: QualityMetric; label: string }[] = [
  { value: 'overall', label: 'Overall' },
  { value: 'agentic', label: 'Agentic' },
  { value: 'coding', label: 'Coding' },
  { value: 'reasoning', label: 'Reasoning' },
  { value: 'knowledge', label: 'Knowledge' },
  { value: 'multilingual', label: 'Multilingual' },
  { value: 'multimodalGrounded', label: 'Multimodal' },
  { value: 'instructionFollowing', label: 'Instruction following' },
  { value: 'math', label: 'Math' },
];

export const SPEED_OPTIONS: { value: SpeedMetric; label: string }[] = [
  { value: 'blend', label: 'Blend (50:50 t/s · ttft)' },
  { value: 'tps', label: 'Tokens / second' },
  { value: 'ttft', label: 'Time to first token' },
];

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  agentic: 'Agentic',
  coding: 'Coding',
  reasoning: 'Reasoning',
  multimodalGrounded: 'Multimodal',
  knowledge: 'Knowledge',
  multilingual: 'Multilingual',
  instructionFollowing: 'Instruction following',
  math: 'Math',
};

export const QUALITY_LABELS: Record<QualityMetric, string> = {
  overall: 'Overall',
  ...CATEGORY_LABELS,
};

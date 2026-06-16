import ScoreBar from './ScoreBar';
import type { QualityMetric, RankedModel } from '../types';
import { QUALITY_LABELS } from '../types';
import {
  formatBlendedCost,
  formatMatch,
  formatScore,
  formatTps,
  formatTtft,
} from '../format';

interface ResultsTableProps {
  ranked: RankedModel[];
  visibleCount: number;
  totalCount: number;
  eligibleCount: number;
  qualityMetric: QualityMetric;
  weights: { good: number; cheap: number; fast: number };
  query: string;
  limit: number;
  onQueryChange: (query: string) => void;
  onLimitChange: (limit: number) => void;
}

const LIMIT_OPTIONS = [25, 50, 100];

export default function ResultsTable({
  ranked,
  visibleCount,
  totalCount,
  eligibleCount,
  qualityMetric,
  weights,
  query,
  limit,
  onQueryChange,
  onLimitChange,
}: ResultsTableProps) {
  return (
    <section className="panel results">
      <div className="results__toolbar">
        <div className="results__count">
          <strong>{visibleCount}</strong>
          <span className="muted">
            {' '}
            of {eligibleCount} eligible{eligibleCount !== totalCount && ` · ${totalCount} total`}
          </span>
        </div>

        <div className="results__controls">
          <input
            className="results__search"
            type="search"
            placeholder="Filter by model or maker…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            aria-label="Filter models"
          />
          <div className="segmented" role="group" aria-label="Rows to show">
            {LIMIT_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                className="segmented__btn"
                data-active={limit === opt}
                onClick={() => onLimitChange(opt)}
              >
                {opt}
              </button>
            ))}
            <button
              type="button"
              className="segmented__btn"
              data-active={limit === Infinity}
              onClick={() => onLimitChange(Infinity)}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {ranked.length === 0 ? (
        <div className="results__empty">
          <p>No models match these priorities.</p>
          <p className="muted">
            Try lowering a weighting, switching the “good” metric, or clearing the
            filter.
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="col-rank">#</th>
                <th className="col-model">Model</th>
                <th className="col-good">
                  <span className="dot dot--good" aria-hidden="true" />
                  {QUALITY_LABELS[qualityMetric]}
                </th>
                <th className="col-cheap">
                  <span className="dot dot--cheap" aria-hidden="true" />
                  Blended $/M
                </th>
                <th className="col-fast">
                  <span className="dot dot--fast" aria-hidden="true" />
                  Tokens/s · TTFT
                </th>
                <th className="col-match">Match</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((m, i) => (
                <tr key={m.key}>
                  <td data-label="Rank" className="col-rank">
                    <span className="rank">{i + 1}</span>
                  </td>
                  <td data-label="Model" className="col-model">
                    <div className="model">
                      <span className="model__name">
                        {m.url ? (
                          <a href={m.url} target="_blank" rel="noreferrer noopener">
                            {m.name}
                          </a>
                        ) : (
                          m.name
                        )}
                      </span>
                      <span className="model__meta">
                        {m.creator && <span>{m.creator}</span>}
                        {m.contextWindow && <span>{m.contextWindow} ctx</span>}
                        {m.isFreePricing && <span className="tag tag--free">Free</span>}
                        {m.sourceType?.toLowerCase().includes('open') && (
                          <span className="tag tag--open">Open weight</span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td data-label={QUALITY_LABELS[qualityMetric]} className="col-good">
                    <div className="metric">
                      <span className="metric__value">{formatScore(m.qualityRaw)}</span>
                      <ScoreBar value={m.qualityPct} variant="good" weight={weights.good} />
                    </div>
                  </td>
                  <td data-label="Blended $/M" className="col-cheap">
                    <div className="metric">
                      <span className="metric__value">
                        {formatBlendedCost(m.costRaw, m.isFreePricing)}
                      </span>
                      <ScoreBar value={m.cheapPct} variant="cheap" weight={weights.cheap} />
                    </div>
                  </td>
                  <td data-label="Tokens/s · TTFT" className="col-fast">
                    <div className="metric metric--dual">
                      <span className="metric__value">
                        {formatTps(m.tokensPerSecondRaw)} <span className="muted">t/s</span>
                      </span>
                      <span className="metric__value">
                        {formatTtft(m.ttftRaw)}
                      </span>
                      <ScoreBar value={m.fastPct} variant="fast" weight={weights.fast} />
                    </div>
                  </td>
                  <td data-label="Match" className="col-match">
                    <div className="match" data-tier={tierOf(m.composite)}>
                      {formatMatch(m.composite)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function tierOf(composite: number): 'high' | 'mid' | 'low' {
  if (composite >= 75) return 'high';
  if (composite >= 40) return 'mid';
  return 'low';
}

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import WeightControls from './components/WeightControls';
import WeightPie from './components/WeightPie';
import MetricSelectors from './components/MetricSelectors';
import ResultsTable from './components/ResultsTable';
import { joinedModels, datasetMeta } from './data';
import { rank } from './scoring';
import type { QualityMetric, SpeedMetric, Weights } from './types';

const DEFAULT_WEIGHTS: Weights = { good: 33.33, cheap: 33.33, fast: 33.34 };

export default function App() {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [qualityMetric, setQualityMetric] = useState<QualityMetric>('overall');
  const [speedMetric, setSpeedMetric] = useState<SpeedMetric>('blend');
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState<number>(50);

  const panelRef = useRef<HTMLDivElement>(null);
  const pieWrapRef = useRef<HTMLDivElement>(null);
  const prevRectRef = useRef<DOMRect | null>(null);
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const update = () => setDocked(panel.getBoundingClientRect().top < 16);
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  useLayoutEffect(() => {
    const el = pieWrapRef.current;
    if (!el) return;
    el.style.transition = 'none';
    el.style.transform = '';
    el.style.transformOrigin = 'top left';
    const last = el.getBoundingClientRect();
    const first = prevRectRef.current;
    if (first) {
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      const sx = first.width / last.width;
      const sy = first.height / last.height;
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      el.getBoundingClientRect();
      el.style.transition = 'transform .34s cubic-bezier(.2,.7,.2,1)';
      el.style.transform = '';
    }
    prevRectRef.current = last;
  }, [docked]);

  const result = useMemo(
    () => rank(joinedModels, { ...weights, qualityMetric, speedMetric }),
    [weights, qualityMetric, speedMetric],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return result.ranked;
    return result.ranked.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.creator?.toLowerCase().includes(q) ?? false),
    );
  }, [result, query]);

  const visible = limit === Infinity ? filtered : filtered.slice(0, limit);

  return (
    <div className="app">
      <header className="header">
        <div className="header__inner">
          <div className="header__brand">
            <span className="header__logo" aria-hidden="true" />
            <div>
              <h1 className="header__title">Which model?</h1>
              <p className="header__subtitle">
                Pick your <em>fast</em>, <em>cheap</em>, and <em>good</em> trade-offs
                — get the best-matching LLMs.
              </p>
            </div>
          </div>
          <p className="header__data muted">
            {datasetMeta.qualityProvider}
            {' · '}
            {datasetMeta.pricingProvider}
            {' · '}
            {datasetMeta.speedProvider}
          </p>
        </div>
      </header>

      <main className="container">
        <div ref={panelRef}>
          <WeightControls>
            <div ref={pieWrapRef} className={`pie-wrap${docked ? ' is-docked' : ''}`}>
              <WeightPie weights={weights} onWeightsChange={setWeights} />
            </div>
          </WeightControls>
        </div>
        <MetricSelectors
          qualityMetric={qualityMetric}
          speedMetric={speedMetric}
          onQualityChange={setQualityMetric}
          onSpeedChange={setSpeedMetric}
        />
        <ResultsTable
          ranked={visible}
          visibleCount={filtered.length}
          totalCount={result.totalConsidered}
          eligibleCount={result.eligibleCount}
          qualityMetric={qualityMetric}
          speedMetric={speedMetric}
          weights={weights}
          query={query}
          limit={limit}
          onQueryChange={setQuery}
          onLimitChange={setLimit}
        />
      </main>

      <footer className="footer">
        <p className="muted">
          Composite scores use percentile-ranking (100 = best within the eligible
          set), blended from your weights. Blended cost uses an 8:1 input:output
          ratio per million tokens. Faded rows mark quality scores BenchLM
          excludes from its leaderboards (sparse or unranked evidence). Data:{' '}
          {datasetMeta.canonicalUrl ? (
            <a href={datasetMeta.canonicalUrl} target="_blank" rel="noreferrer noopener">
              {datasetMeta.qualityProvider}
            </a>
          ) : (
            datasetMeta.qualityProvider
          )}
          {' · '}
          {datasetMeta.pricingProviderUrl ? (
            <a href={datasetMeta.pricingProviderUrl} target="_blank" rel="noreferrer noopener">
              {datasetMeta.pricingProvider}
            </a>
          ) : (
            datasetMeta.pricingProvider
          )}
          {datasetMeta.speedProviderUrl ? (
            <>
              {' · '}
              <a href={datasetMeta.speedProviderUrl} target="_blank" rel="noreferrer noopener">
                {datasetMeta.speedProvider}
              </a>
            </>
          ) : null}
          {datasetMeta.generatedAt && ` · generated ${datasetMeta.generatedAt.slice(0, 10)}`}
        </p>
      </footer>
    </div>
  );
}

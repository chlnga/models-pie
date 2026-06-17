import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import WeightControls from "./components/WeightControls";
import WeightPie from "./components/WeightPie";
import PiePresets from "./components/PiePresets";
import MetricSelectors from "./components/MetricSelectors";
import ResultsTable from "./components/ResultsTable";
import ScrollToTop from "./components/ScrollToTop";
import { joinedModels, datasetMeta } from "./data";
import { rank } from "./scoring";
import type { QualityMetric, SpeedMetric, Weights } from "./types";

const DEFAULT_WEIGHTS: Weights = { good: 33.33, cheap: 33.33, fast: 33.34 };

export default function App() {
  const [weights, setWeights] = useState<Weights>(DEFAULT_WEIGHTS);
  const [qualityMetric, setQualityMetric] = useState<QualityMetric>("overall");
  const [speedMetric, setSpeedMetric] = useState<SpeedMetric>("blend");
  const [query, setQuery] = useState("");

  const panelRef = useRef<HTMLDivElement>(null);
  const pieWrapRef = useRef<HTMLDivElement>(null);
  const prevRectRef = useRef<DOMRect | null>(null);
  const dockedRef = useRef(false);
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    // Capture the pre-flip rect at the flip boundary — viewport-relative rects
    // go stale under scroll, so a mount-time value would throw the FLIP off.
    const update = () => {
      const shouldDock = panel.getBoundingClientRect().top < -100;
      if (shouldDock === dockedRef.current) return;
      const el = pieWrapRef.current;
      if (el) prevRectRef.current = el.getBoundingClientRect();
      dockedRef.current = shouldDock;
      setDocked(shouldDock);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useLayoutEffect(() => {
    const el = pieWrapRef.current;
    if (!el) return;
    el.style.transition = "none";
    el.style.transform = "";
    el.style.transformOrigin = "top left";
    const last = el.getBoundingClientRect();
    const first = prevRectRef.current;
    if (first) {
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      const sx = first.width / last.width;
      const sy = first.height / last.height;
      el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
      el.getBoundingClientRect();
      el.style.transition = "transform .34s cubic-bezier(.2,.7,.2,1)";
      el.style.transform = "";
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

  return (
    <div className="app">
      <header className="header">
        <div className="header__inner">
          <div className="header__brand">
            <span className="header__logo" aria-hidden="true" />
            <div>
              <h1 className="header__title">Which model?</h1>
            </div>
          </div>
          <p className="header__data muted">
            Data:{" "}
            {datasetMeta.canonicalUrl ? (
              <a
                href={datasetMeta.canonicalUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                {datasetMeta.qualityProvider}
              </a>
            ) : (
              datasetMeta.qualityProvider
            )}
            {" · "}
            {datasetMeta.pricingProviderUrl ? (
              <a
                href={datasetMeta.pricingProviderUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                {datasetMeta.pricingProvider}
              </a>
            ) : (
              datasetMeta.pricingProvider
            )}
            {datasetMeta.speedProviderUrl ? (
              <>
                {" · "}
                <a
                  href={datasetMeta.speedProviderUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {datasetMeta.speedProvider}
                </a>
              </>
            ) : null}
            <br />
            {datasetMeta.generatedAt &&
              `Generated ${datasetMeta.generatedAt.slice(0, 10)}`}
          </p>
        </div>
      </header>

      <main className="container">
        <div ref={panelRef}>
          <WeightControls>
            <div
              ref={pieWrapRef}
              className={`pie-wrap${docked ? " is-docked" : ""}`}
            >
              <WeightPie weights={weights} onWeightsChange={setWeights} />
              <PiePresets weights={weights} onSelect={setWeights} />
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
          ranked={filtered}
          visibleCount={filtered.length}
          totalCount={result.totalConsidered}
          eligibleCount={result.eligibleCount}
          qualityMetric={qualityMetric}
          speedMetric={speedMetric}
          weights={weights}
          query={query}
          onQueryChange={setQuery}
        />
      </main>

      <footer className="footer">
        <section className="sourcing" aria-label="How data is sourced">
          <div className="footer__title muted">How data is sourced</div>
          <ul className="sourcing__list">
            <li>
              <p className="muted">
                <strong>Good — BenchLM.</strong> Overall and per-category
                quality scores.
              </p>
            </li>
            <li>
              <p className="muted">
                <strong>Cheap — OpenRouter.</strong> Live hosted-API prices,
                blended at an 8:1 input:output ratio per million tokens. Effort
                tiers (e.g. “Pro (Max)”) inherit the base endpoint's price.
              </p>
            </li>
            <li>
              <p className="muted">
                <strong>Fast — Hybrid.</strong> Absolute speeds where available
                come from BenchLM (a re-publication of Artificial Analysis,
                MIT). Ranking across uses OpenRouter's throughput and latency
                ordering.
              </p>
            </li>
          </ul>
        </section>
        <p className="muted">
          Composite scores use percentile-ranking (100 = best within the
          eligible set), blended from your weights. A model ranks only when it
          has data for every weighted dimension. Data:{" "}
          {datasetMeta.canonicalUrl ? (
            <a
              href={datasetMeta.canonicalUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              {datasetMeta.qualityProvider}
            </a>
          ) : (
            datasetMeta.qualityProvider
          )}
          {" · "}
          {datasetMeta.pricingProviderUrl ? (
            <a
              href={datasetMeta.pricingProviderUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              {datasetMeta.pricingProvider}
            </a>
          ) : (
            datasetMeta.pricingProvider
          )}
          {datasetMeta.speedProviderUrl ? (
            <>
              {" · "}
              <a
                href={datasetMeta.speedProviderUrl}
                target="_blank"
                rel="noreferrer noopener"
              >
                {datasetMeta.speedProvider}
              </a>
            </>
          ) : null}
          {datasetMeta.generatedAt &&
            ` · Generated ${datasetMeta.generatedAt.slice(0, 10)}`}
        </p>
      </footer>

      <ScrollToTop />
    </div>
  );
}

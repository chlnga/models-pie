import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import WeightControls from "../components/WeightControls";
import WeightPie from "../components/WeightPie";
import PiePresets from "../components/PiePresets";
import PresetIntro from "../components/PresetIntro";
import ResultsTable from "../components/ResultsTable";
import ScrollToTop from "../components/ScrollToTop";
import { joinedModels, datasetMeta } from "../data";
import { rank } from "../scoring";
import { COMPOSITE_NOTE, SOURCING } from "../content";
import { PRESETS, resolveSeo } from "../presets";
import type { Preset } from "../presets";
import { useSeoMeta } from "../hooks/useSeoMeta";
import type { QualityMetric, SpeedMetric, Weights } from "../types";

// useLayoutEffect fires synchronously before paint on the client; on the server
// it's a no-op but logs a warning. Use this shim so the FLIP animation stays
// flicker-free in the browser without polluting the prerender build log.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface HomePageProps {
  /** Active preset — drives the initial weight distribution, the visible
   *  intro copy, and the document <head> metadata. Defaults to the Balanced
   *  landing preset. Per-route callers pass their preset so the page loads
   *  preconfigured and SEO-tagged for that route. */
  preset?: Preset;
}

export default function HomePage({ preset = PRESETS[0] }: HomePageProps) {
  const initialWeights = preset.weights;
  const [weights, setWeights] = useState<Weights>(initialWeights);
  const [qualityMetric, setQualityMetric] = useState<QualityMetric>("overall");
  const [speedMetric, setSpeedMetric] = useState<SpeedMetric>("blend");
  const [query, setQuery] = useState("");

  // Sync <title> / meta / canonical / OG tags on client-side route changes.
  // At build time the prerender script bakes these into each route's HTML;
  // this covers navigations between preset chips where no page load occurs.
  useSeoMeta(resolveSeo(preset));

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

  useIsomorphicLayoutEffect(() => {
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
              {/* <p> not <h1>: each page’s real <h1> lives in <PresetIntro>
                  below, keeping one descriptive top-level heading per route. */}
              <p className="header__title">Models Pie</p>
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
              <br/>
              <a href={"https://github.com/chlnga/models-pie"} target={"_blank"}>Github</a>
          </p>
        </div>
      </header>

      <main className="container">
        <PresetIntro seo={preset.seo} />
        <div ref={panelRef}>
          <WeightControls>
            <div
              ref={pieWrapRef}
              className={`pie-wrap${docked ? " is-docked" : ""}`}
            >
              <WeightPie weights={weights} onWeightsChange={setWeights} />
              <PiePresets weights={weights} />
            </div>
          </WeightControls>
        </div>
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
          onQualityChange={setQualityMetric}
          onSpeedChange={setSpeedMetric}
        />
      </main>

      <footer className="footer">
        <section className="sourcing" aria-label="How data is sourced">
          <div className="footer__title muted">How data is sourced</div>
          <ul className="sourcing__list">
            {(Object.keys(SOURCING) as Array<keyof typeof SOURCING>).map((key) => {
              const { label, body } = SOURCING[key];
              return (
                <li key={key}>
                  <p className="muted">
                    <strong>{label}.</strong> {body}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
        <p className="muted">
          {COMPOSITE_NOTE} Data:{" "}
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

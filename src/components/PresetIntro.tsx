import type { PresetSeo } from "../presets";

interface PresetIntroProps {
  seo: PresetSeo;
}

/**
 * Visible per-preset intro: the page's sole <h1> plus a short descriptive
 * paragraph. Rendered into the SSR HTML by scripts/prerender.mjs so both
 * crawlers and human readers see unique, keyword-relevant copy per route.
 *
 * The site brand in the header is a <p> (not an <h1>) so this is the only
 * top-level heading on the page.
 */
export default function PresetIntro({ seo }: PresetIntroProps) {
  return (
    <section className="preset-intro">
      <h1 className="preset-intro__title">{seo.h1}</h1>
      <p className="preset-intro__text">{seo.intro}</p>
    </section>
  );
}

import { useEffect } from "react";
import type { ResolvedSeo } from "../presets";

/**
 * Keeps the document <head> in sync with the active preset’s SEO metadata.
 *
 * At build time, scripts/prerender.mjs bakes the correct tags into each
 * route’s static HTML. This hook handles the case that script can’t: client-
 * side navigations between preset routes (clicking a preset chip), where no
 * full page load occurs to refresh <title> / meta / canonical / OG tags.
 *
 * On the server, useEffect is a no-op, so this is safe to call during SSR.
 */
export function useSeoMeta(seo: ResolvedSeo): void {
  useEffect(() => {
    document.title = seo.title;

    const setAttr = (selector: string, attr: string, value: string) => {
      const el = document.head.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };

    setAttr('meta[name="description"]', "content", seo.description);
    setAttr('link[rel="canonical"]', "href", seo.url);
    setAttr('meta[property="og:url"]', "content", seo.url);
    setAttr('meta[property="og:title"]', "content", seo.title);
    setAttr('meta[property="og:description"]', "content", seo.description);
    setAttr('meta[name="twitter:title"]', "content", seo.title);
    setAttr('meta[name="twitter:description"]', "content", seo.description);
  }, [seo.title, seo.description, seo.url]);
}

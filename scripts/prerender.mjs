import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { AppRoutes, ROUTE_PATHS, resolveSeoForPath } from "../dist/server/entry-server.js";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(projectRoot, "dist");
const indexPath = join(outDir, "index.html");
const ROOT_PLACEHOLDER = `<div id="root"></div>`;

let template;
try {
  template = readFileSync(indexPath, "utf8");
} catch {
  throw new Error(
    `[prerender] ${indexPath} not found. Run \`vite build\` first.`,
  );
}
if (!template.includes(ROOT_PLACEHOLDER)) {
  throw new Error(
    `[prerender] ${indexPath} missing "${ROOT_PLACEHOLDER}" — ` +
      `check that index.html's root div was not modified.`,
  );
}

// Escape user-supplied SEO copy for safe interpolation into HTML text and
// attribute values. & must come first so we don't double-escape.
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Rewrites the per-route <head> tags in the static template so each
// prerendered route ships with its own <title>, meta description, canonical
// URL, and OG/Twitter tags. \s+ tolerates the multi-line attribute layout
// used for the description metas in index.html.
function applyHeadTags(html, seo) {
  const title = escapeHtml(seo.title);
  const desc = escapeHtml(seo.description);
  const url = escapeHtml(seo.url);
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${desc}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${desc}$2`);
}

for (const path of ROUTE_PATHS) {
  const tree = createElement(
    StaticRouter,
    { location: path },
    createElement(AppRoutes),
  );
  const html = renderToString(tree);
  const seo = resolveSeoForPath(path);
  const withHtml = applyHeadTags(
    template.replace(ROOT_PLACEHOLDER, `<div id="root">${html}</div>`),
    seo,
  );

  const target = path === "/" ? indexPath : join(outDir, path, "index.html");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, withHtml);
  console.log(
    `[prerender] ${path} → ${target.replace(outDir, "dist")} (${html.length} bytes)`,
  );
}

// --- sitemap.xml: every route, trailing-slash canonical URLs. Generated from
// PRESETS so it can never drift from the route table — the static
// public/sitemap.xml was removed because it only listed `/` and had already
// fallen out of sync once.
const sitemap =
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  ROUTE_PATHS.map(
    (p) => `  <url><loc>${escapeHtml(resolveSeoForPath(p).url)}</loc></url>`,
  ).join("\n") +
  `\n</urlset>\n`;
writeFileSync(join(outDir, "sitemap.xml"), sitemap);
console.log(`[prerender] sitemap.xml (${ROUTE_PATHS.length} urls)`);

// --- 404.html: static fallback so Cloudflare Pages returns a real 404 instead
// of slipping into SPA mode (which serves `/` with a 200 for any unknown path
// → soft-404s). The main bundle <script> is stripped so client-side React
// doesn't mount, match no route, and wipe this static content; the CSS <link>
// stays, so the page reuses the site's .container/.preset-intro styles. A
// noindex robots meta keeps the error page out of the index.
const notFoundSeo = {
  title: "Page not found · Models Pie",
  description:
    "This page doesn't exist on Models Pie. Return to the home page to compare AI models by quality, speed, and price.",
  url: resolveSeoForPath("/").url,
};
const notFoundBody =
  `<main class="container"><section class="preset-intro">` +
  `<h1 class="preset-intro__title">Page not found</h1>` +
  `<p class="preset-intro__text">This page doesn't exist. ` +
  `<a href="/">Return to Models Pie</a> to compare AI models.</p>` +
  `</section></main>`;
const notFoundHtml = applyHeadTags(
  template.replace(ROOT_PLACEHOLDER, `<div id="root">${notFoundBody}</div>`),
  notFoundSeo,
)
  // Strip the React entry script so the static 404 body survives client-side.
  .replace(/<script[^>]*src="\/assets\/index-[^"]*\.js"[^>]*><\/script>\s*/, "")
  // Keep the error page out of search results.
  .replace("</head>", `<meta name="robots" content="noindex">\n</head>`);
writeFileSync(join(outDir, "404.html"), notFoundHtml);
console.log(`[prerender] 404.html (${notFoundHtml.length} bytes)`);

console.log(`[prerender] done: ${ROUTE_PATHS.length} route(s)`);

// dist/server/ is build-time-only — entry-server.js exists to feed this script,
// not to ship in the deployment artifact.
rmSync(join(outDir, "server"), { recursive: true, force: true });

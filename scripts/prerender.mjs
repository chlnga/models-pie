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

console.log(`[prerender] done: ${ROUTE_PATHS.length} route(s)`);

// dist/server/ is build-time-only — entry-server.js exists to feed this script,
// not to ship in the deployment artifact.
rmSync(join(outDir, "server"), { recursive: true, force: true });

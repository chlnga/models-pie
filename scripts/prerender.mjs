import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import { AppRoutes, ROUTE_PATHS } from "../dist/server/entry-server.js";

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

for (const path of ROUTE_PATHS) {
  const tree = createElement(
    StaticRouter,
    { location: path },
    createElement(AppRoutes),
  );
  const html = renderToString(tree);
  const withHtml = template.replace(
    ROOT_PLACEHOLDER,
    `<div id="root">${html}</div>`,
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

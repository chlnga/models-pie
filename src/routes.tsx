import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import { PRESETS } from "./presets";

/**
 * Canonical route table. Rendered identically on the client (inside
 * BrowserRouter in main.tsx) and at build time (inside StaticRouter in
 * scripts/prerender.mjs). One route per preset — derived from the same
 * PRESETS array that drives the preset chips, so the two stay in sync.
 *
 * Adding a preset = add an entry to src/presets.ts. The route table and the
 * prerender output (which iterates ROUTE_PATHS) update automatically.
 */
export const ROUTE_PATHS = PRESETS.map((p) => p.path);

export function AppRoutes() {
  return (
    <Routes>
      {PRESETS.map((p) => (
        <Route
          key={p.path}
          path={p.path}
          element={
            // `key` mirrors `path` so navigating between sibling routes that
            // render <HomePage> forces React to remount, re-running the
            // useState initializer with the new preset's weights. Without it,
            // React would preserve the prior route's weights state.
            <HomePage key={p.path} initialWeights={p.weights} />
          }
        />
      ))}
    </Routes>
  );
}

import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";

/**
 * Canonical route table. Rendered identically on the client (inside
 * BrowserRouter in main.tsx) and at build time (inside StaticRouter in
 * scripts/prerender.mjs). Adding a page = add a <Route> here + add its path
 * to ROUTE_PATHS so the prerender script knows to emit a static HTML file.
 */
export const ROUTE_PATHS = ["/"] as const;

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  );
}

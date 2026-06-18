import { Link } from 'react-router-dom';
import { PRESETS, MATCH_TOLERANCE } from '../presets';
import type { Weights } from '../types';

interface PiePresetsProps {
  weights: Weights;
}

function matchesPreset(w: Weights, p: Weights): boolean {
  return (
    Math.abs(w.good - p.good) <= MATCH_TOLERANCE &&
    Math.abs(w.cheap - p.cheap) <= MATCH_TOLERANCE &&
    Math.abs(w.fast - p.fast) <= MATCH_TOLERANCE
  );
}

/**
 * Preset chips. Each is a router <Link> to its dedicated route, where HomePage
 * remounts with the preset's weights as initial state. The active chip is
 * derived from the *current* weights (not the current route), so dragging the
 * pie to a preset's distribution lights up that chip regardless of route.
 */
export default function PiePresets({ weights }: PiePresetsProps) {
  return (
    <div className="pie-presets" role="group" aria-label="Weight presets">
      {PRESETS.map((p) => {
        const active = matchesPreset(weights, p.weights);
        return (
          <Link
            key={p.path}
            to={p.path}
            className="pie-presets__btn"
            aria-pressed={active}
          >
            {p.label}
          </Link>
        );
      })}
    </div>
  );
}

import type { Weights } from '../types';

interface PiePresetsProps {
  weights: Weights;
  onSelect: (w: Weights) => void;
}

const THIRD = 100 / 3;
// Safe because presets differ by >=17 on every dimension, so matches can't overlap.
const MATCH_TOLERANCE = 2;

const PRESETS: { label: string; weights: Weights }[] = [
  { label: 'Balanced', weights: { good: THIRD, cheap: THIRD, fast: THIRD } },
  { label: 'Best value', weights: { good: 50, cheap: 50, fast: 0 } },
  { label: 'Fast & cheap', weights: { good: 0, cheap: 50, fast: 50 } },
  { label: 'Highest quality', weights: { good: 100, cheap: 0, fast: 0 } },
];

function matchesPreset(w: Weights, p: Weights): boolean {
  return (
    Math.abs(w.good - p.good) <= MATCH_TOLERANCE &&
    Math.abs(w.cheap - p.cheap) <= MATCH_TOLERANCE &&
    Math.abs(w.fast - p.fast) <= MATCH_TOLERANCE
  );
}

export default function PiePresets({ weights, onSelect }: PiePresetsProps) {
  return (
    <div className="pie-presets" role="group" aria-label="Weight presets">
      {PRESETS.map((p) => {
        const active = matchesPreset(weights, p.weights);
        return (
          <button
            key={p.label}
            type="button"
            className="pie-presets__btn"
            aria-pressed={active}
            onClick={() => onSelect(p.weights)}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}

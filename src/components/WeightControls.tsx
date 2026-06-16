import type { Dimension, Weights } from '../types';

interface WeightControlsProps {
  weights: Weights;
  total: number;
  onChange: (dim: Dimension, value: number) => void;
  onPreset: (preset: Weights) => void;
}

const DIMENSIONS: { key: Dimension; label: string; hint: string }[] = [
  { key: 'good', label: 'Good', hint: 'Quality' },
  { key: 'cheap', label: 'Cheap', hint: 'Price' },
  { key: 'fast', label: 'Fast', hint: 'Speed' },
];

const PRESETS: { name: string; weights: Weights }[] = [
  { name: 'Balanced', weights: { good: 33.34, cheap: 33.33, fast: 33.33 } },
  { name: 'Best quality', weights: { good: 100, cheap: 0, fast: 0 } },
  { name: 'Cheapest', weights: { good: 0, cheap: 100, fast: 0 } },
  { name: 'Fastest', weights: { good: 0, cheap: 0, fast: 100 } },
  { name: 'Value', weights: { good: 50, cheap: 50, fast: 0 } },
  { name: 'Fast & cheap', weights: { good: 0, cheap: 50, fast: 50 } },
];

function clampPercent(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

export default function WeightControls({
  weights,
  total,
  onChange,
  onPreset,
}: WeightControlsProps) {
  const rounded = Math.round(total * 100) / 100;
  const onTarget = Math.abs(rounded - 100) < 0.01;

  return (
    <section className="panel weights">
      <div className="panel__head">
        <h2 className="panel__title">Your priorities</h2>
        <div className="weights__total" data-ok={onTarget}>
          <span className="weights__total-value">{rounded.toFixed(2)}%</span>
          <span className="weights__total-hint">
            {onTarget ? 'on target' : 'should total 100%'}
          </span>
        </div>
      </div>

      <div className="weights__grid">
        {DIMENSIONS.map(({ key, label, hint }) => (
          <div key={key} className={`weight weight--${key}`}>
            <label className="weight__label" htmlFor={`weight-${key}`}>
              <span className="weight__name">{label}</span>
              <span className="weight__hint">{hint}</span>
            </label>
            <div className="weight__controls">
              <input
                id={`weight-${key}`}
                className="weight__number"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.01}
                value={weights[key]}
                onChange={(e) => onChange(key, clampPercent(parseFloat(e.target.value)))}
              />
              <input
                className="weight__slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(weights[key])}
                onChange={(e) => onChange(key, clampPercent(parseFloat(e.target.value)))}
                aria-label={`${label} weight`}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="weights__presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className="chip"
            onClick={() => onPreset(preset.weights)}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </section>
  );
}

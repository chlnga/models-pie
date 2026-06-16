import type { Dimension, Weights } from '../types';
import WeightPie from './WeightPie';

interface WeightControlsProps {
  weights: Weights;
  onWeightsChange: (w: Weights) => void;
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

const KEYS: Dimension[] = ['good', 'cheap', 'fast'];

export default function WeightControls({ weights, onWeightsChange }: WeightControlsProps) {
  const total = weights.good + weights.cheap + weights.fast;
  const rounded = Math.round(total * 100) / 100;
  const onTarget = Math.abs(rounded - 100) < 0.01;

  const setDim = (dim: Dimension, value: number) => {
    const v = clampPercent(value);
    const next: Weights = { ...weights };
    next[dim] = v;
    const others = KEYS.filter((k) => k !== dim);
    const a = weights[others[0]];
    const b = weights[others[1]];
    const rem = 100 - v;
    if (a + b <= 0) {
      next[others[0]] = rem / 2;
      next[others[1]] = rem / 2;
    } else {
      next[others[0]] = (rem * a) / (a + b);
      next[others[1]] = (rem * b) / (a + b);
    }
    next[others[0]] = Math.round(next[others[0]] * 100) / 100;
    next[others[1]] = Math.round(next[others[1]] * 100) / 100;
    onWeightsChange(next);
  };

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

      <div className="weights__body">
        <div className="weights__pie">
          <WeightPie weights={weights} onWeightsChange={onWeightsChange} />
        </div>

        <div className="weights__inputs">
          {DIMENSIONS.map(({ key, label, hint }) => (
            <div key={key} className={`weight weight--${key}`}>
              <label className="weight__label" htmlFor={`weight-${key}`}>
                <span className={`dot dot--${key}`} aria-hidden="true" />
                <span className="weight__name">{label}</span>
                <span className="weight__hint">{hint}</span>
              </label>
              <input
                id={`weight-${key}`}
                className="weight__number"
                type="number"
                inputMode="decimal"
                min={0}
                max={100}
                step={0.01}
                value={weights[key]}
                onChange={(e) => setDim(key, parseFloat(e.target.value))}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="weights__presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className="chip"
            onClick={() => onWeightsChange(preset.weights)}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </section>
  );
}

import type { Weights } from '../types';
import WeightPie from './WeightPie';

interface WeightControlsProps {
  weights: Weights;
  onWeightsChange: (w: Weights) => void;
}

const PRESETS: { name: string; weights: Weights }[] = [
  { name: 'Balanced', weights: { good: 33.34, cheap: 33.33, fast: 33.33 } },
  { name: 'Best quality', weights: { good: 100, cheap: 0, fast: 0 } },
  { name: 'Cheapest', weights: { good: 0, cheap: 100, fast: 0 } },
  { name: 'Fastest', weights: { good: 0, cheap: 0, fast: 100 } },
  { name: 'Value', weights: { good: 50, cheap: 50, fast: 0 } },
  { name: 'Fast & cheap', weights: { good: 0, cheap: 50, fast: 50 } },
];

export default function WeightControls({ weights, onWeightsChange }: WeightControlsProps) {
  return (
    <section className="panel weights">
      <div className="panel__head">
        <h2 className="panel__title">Your priorities</h2>
      </div>

      <div className="weights__body">
        <div className="weights__pie">
          <WeightPie weights={weights} onWeightsChange={onWeightsChange} />
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

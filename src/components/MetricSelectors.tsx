import { QUALITY_OPTIONS, SPEED_OPTIONS } from '../types';
import type { QualityMetric, SpeedMetric } from '../types';

interface MetricSelectorsProps {
  qualityMetric: QualityMetric;
  speedMetric: SpeedMetric;
  onQualityChange: (metric: QualityMetric) => void;
  onSpeedChange: (metric: SpeedMetric) => void;
}

export default function MetricSelectors({
  qualityMetric,
  speedMetric,
  onQualityChange,
  onSpeedChange,
}: MetricSelectorsProps) {
  return (
    <section className="panel selectors">
      <div className="selector selector--good">
        <label className="selector__label" htmlFor="quality-metric">
          <span className="dot dot--good" aria-hidden="true" />
          Measure “good” by
        </label>
        <select
          id="quality-metric"
          className="selector__select"
          value={qualityMetric}
          onChange={(e) => onQualityChange(e.target.value as QualityMetric)}
        >
          {QUALITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label} score
            </option>
          ))}
        </select>
      </div>

      <div className="selector selector--fast">
        <label className="selector__label" htmlFor="speed-metric">
          <span className="dot dot--fast" aria-hidden="true" />
          Measure “fast” by
        </label>
        <select
          id="speed-metric"
          className="selector__select"
          value={speedMetric}
          onChange={(e) => onSpeedChange(e.target.value as SpeedMetric)}
        >
          {SPEED_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

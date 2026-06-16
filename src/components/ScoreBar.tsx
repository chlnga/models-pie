interface ScoreBarProps {
  value: number | null;
  variant: 'good' | 'cheap' | 'fast';
  weight: number;
}

export default function ScoreBar({ value, variant, weight }: ScoreBarProps) {
  const active = weight > 0;
  const pct = value == null ? 0 : Math.max(0, Math.min(100, value));
  const dimmed = !active || value == null;

  return (
    <div className={`scorebar scorebar--${variant}`} data-dimmed={dimmed}>
      <div className="scorebar__track">
        <div
          className="scorebar__fill"
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <span className="scorebar__label">
        {value == null ? '—' : Math.round(value)}
      </span>
    </div>
  );
}

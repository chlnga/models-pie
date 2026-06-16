import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import type { Dimension, Weights } from '../types';

interface WeightPieProps {
  weights: Weights;
  onWeightsChange: (w: Weights) => void;
}

type Divider = 'goodCheap' | 'cheapFast';

const SIZE = 240;
const CX = 120;
const CY = 120;
const R_OUTER = 108;
const R_MID = 70;
const HANDLE_R = 12;
const FAN = 9;

const NAMES: Record<Dimension, string> = { good: 'Good', cheap: 'Cheap', fast: 'Fast' };

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(v, hi));
}

function polar(r: number, thetaDeg: number): { x: number; y: number } {
  const t = (thetaDeg * Math.PI) / 180;
  return { x: CX + r * Math.sin(t), y: CY - r * Math.cos(t) };
}

function piePath(theta0: number, theta1: number): string {
  const span = Math.min(theta1 - theta0, 359.999);
  const a1 = theta0 + span;
  const p0 = polar(R_OUTER, theta0);
  const p1 = polar(R_OUTER, a1);
  const large = span > 180 ? 1 : 0;
  return [
    `M ${CX} ${CY}`,
    `L ${p0.x.toFixed(2)} ${p0.y.toFixed(2)}`,
    `A ${R_OUTER} ${R_OUTER} 0 ${large} 1 ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

function shortestStep(deg: number): number {
  return ((deg + 180) % 360 + 360) % 360 - 180;
}

interface DragState {
  divider: Divider;
  prev: number;
  acc: number;
  start: number;
  fixed: number;
}

interface PieHandleProps {
  pos: { x: number; y: number };
  active: boolean;
  label: string;
  valuenow: number;
  onPointerDown: (e: ReactPointerEvent) => void;
  onKeyDown: (e: ReactKeyboardEvent) => void;
}

function PieHandle({
  pos,
  active,
  label,
  valuenow,
  onPointerDown,
  onKeyDown,
}: PieHandleProps) {
  return (
    <g
      className={`pie__handle${active ? ' pie__handle--active' : ''}`}
      transform={`translate(${pos.x.toFixed(2)} ${pos.y.toFixed(2)})`}
      tabIndex={0}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={valuenow}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
    >
      <circle className="pie__handle-ring" r={HANDLE_R} />
      <circle className="pie__handle-dot" r={3.5} />
    </g>
  );
}

export default function WeightPie({ weights, onWeightsChange }: WeightPieProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [active, setActive] = useState<Divider | null>(null);
  const [hint, setHint] = useState(true);
  const drag = useRef<DragState | null>(null);

  const g = weights.good;
  const c = weights.cheap;
  const f = weights.fast;

  const thetaGc = (g * 360) / 100;
  const thetaCf = ((g + c) * 360) / 100;

  let dispGc = thetaGc;
  let dispCf = thetaCf;
  const diff = shortestStep(thetaCf - thetaGc);
  if (Math.abs(diff) < FAN) {
    const mid = thetaGc + diff / 2;
    dispGc = mid - FAN / 2;
    dispCf = mid + FAN / 2;
  }

  function pointerTheta(clientX: number, clientY: number): number {
    const svg = svgRef.current;
    if (!svg) return 0;
    const rect = svg.getBoundingClientRect();
    const px = clientX - (rect.left + rect.width / 2);
    const py = clientY - (rect.top + rect.height / 2);
    let th = (Math.atan2(px, -py) * 180) / Math.PI;
    if (th < 0) th += 360;
    return th;
  }

  function applyDrag() {
    const d = drag.current;
    if (!d) return;
    if (d.divider === 'goodCheap') {
      const good = clamp(d.start + d.acc / 3.6, 0, 100 - d.fixed);
      onWeightsChange({ good, cheap: 100 - d.fixed - good, fast: d.fixed });
    } else {
      const cheap = clamp(d.start + d.acc / 3.6, 0, 100 - d.fixed);
      onWeightsChange({ good: d.fixed, cheap, fast: 100 - d.fixed - cheap });
    }
  }

  function onPointerDown(divider: Divider) {
    return (e: ReactPointerEvent) => {
      e.preventDefault();
      drag.current = {
        divider,
        prev: pointerTheta(e.clientX, e.clientY),
        acc: 0,
        start: divider === 'goodCheap' ? g : c,
        fixed: divider === 'goodCheap' ? f : g,
      };
      setActive(divider);
    };
  }

  // Window-level listeners while dragging so the release lands no matter where
  // the pointer is (including off the pie), which the per-element handlers +
  // pointer capture failed to guarantee.
  useEffect(() => {
    if (!active) return;
    const move = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const th = pointerTheta(e.clientX, e.clientY);
      d.acc += shortestStep(th - d.prev);
      d.prev = th;
      applyDrag();
    };
    const end = () => {
      drag.current = null;
      setActive(null);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, [active]);

  function nudge(divider: Divider, delta: number) {
    if (divider === 'goodCheap') {
      const good = clamp(g + delta, 0, 100 - f);
      onWeightsChange({ good, cheap: 100 - f - good, fast: f });
    } else {
      const cheap = clamp(c + delta, 0, 100 - g);
      onWeightsChange({ good: g, cheap, fast: 100 - g - cheap });
    }
  }

  function onKeyDown(divider: Divider) {
    return (e: ReactKeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        nudge(divider, step);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        nudge(divider, -step);
      }
    };
  }

  const slices = [
    { key: 'good' as Dimension, t0: 0, t1: thetaGc, pct: g, mid: thetaGc / 2 },
    { key: 'cheap' as Dimension, t0: thetaGc, t1: thetaCf, pct: c, mid: (thetaGc + thetaCf) / 2 },
    { key: 'fast' as Dimension, t0: thetaCf, t1: 360, pct: f, mid: (thetaCf + 360) / 2 },
  ];

  const firstHandlePos = polar(R_MID, dispGc);

  return (
    <svg
      ref={svgRef}
      className="pie"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="group"
      aria-label="Priority pie. Drag the handles between slices to set the good, cheap, and fast weights."
      onMouseEnter={() => setHint(false)}
      onTouchStart={() => setHint(false)}
    >
      {slices.map((s) =>
        s.pct >= 99.999 ? (
          <circle
            key={s.key}
            className={`pie__slice pie__slice--${s.key}`}
            cx={CX}
            cy={CY}
            r={R_OUTER}
          />
        ) : (
          <path
            key={s.key}
            className={`pie__slice pie__slice--${s.key}`}
            d={piePath(s.t0, s.t1)}
            strokeWidth={0}
          />
        ),
      )}

      {slices.map((s) => {
        if (s.pct < 7) return null;
        const p = polar(R_MID, s.mid);
        return (
          <g key={s.key} className="pie__label" aria-hidden="true">
            <text className="pie__label-name" x={p.x.toFixed(2)} y={(p.y - 2).toFixed(2)} textAnchor="middle">
              {NAMES[s.key]}
            </text>
            <text className="pie__label-pct" x={p.x.toFixed(2)} y={(p.y + 14).toFixed(2)} textAnchor="middle">
              {Math.round(s.pct)}%
            </text>
          </g>
        );
      })}

      <PieHandle
        pos={firstHandlePos}
        active={active === 'goodCheap'}
        label={`Divider between good and cheap. Good ${Math.round(g)} percent.`}
        valuenow={Math.round(g)}
        onPointerDown={onPointerDown('goodCheap')}
        onKeyDown={onKeyDown('goodCheap')}
      />
      <PieHandle
        pos={polar(R_MID, dispCf)}
        active={active === 'cheapFast'}
        label={`Divider between cheap and fast. Cheap ${Math.round(c)} percent.`}
        valuenow={Math.round(c)}
        onPointerDown={onPointerDown('cheapFast')}
        onKeyDown={onKeyDown('cheapFast')}
      />

      {hint && (
        <g
          className="pie__hint"
          transform={`translate(${firstHandlePos.x.toFixed(2)} ${(firstHandlePos.y - 26).toFixed(2)})`}
          aria-hidden="true"
        >
          <rect className="pie__hint-box" x={-58} y={-13} width={116} height={26} rx={7} />
          <text className="pie__hint-text" x={0} y={4} textAnchor="middle">Drag to adjust</text>
        </g>
      )}
    </svg>
  );
}

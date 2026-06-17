import { useId, type ReactNode } from 'react';

type Align = 'start' | 'center' | 'end';

interface TooltipProps {
  text: string;
  align?: Align;
  children: ReactNode;
}

export default function Tooltip({ text, align = 'center', children }: TooltipProps) {
  const id = useId();
  return (
    <span className={`tooltip tooltip--${align}`} tabIndex={0} aria-describedby={id}>
      {children}
      <span className="tooltip__bubble" id={id} role="tooltip">
        {text}
      </span>
    </span>
  );
}

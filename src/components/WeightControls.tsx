import type { ReactNode } from "react";

interface WeightControlsProps {
  children: ReactNode;
}

export default function WeightControls({ children }: WeightControlsProps) {
  return (
    <section className="panel weights">
      <div className="panel__head">
        <h2 className="panel__title">
          Pick your <em>fast</em>, <em>cheap</em>, and <em>good</em> trade-offs
          — get the best-matching models.
        </h2>
      </div>

      <div className="weights__body">
        <div className="weights__pie">{children}</div>
      </div>
    </section>
  );
}

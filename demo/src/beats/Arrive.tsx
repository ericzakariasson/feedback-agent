import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cursor } from "../components/Cursor";
import { AcmeApp } from "../components/AcmeApp";
import { pathXY, tval } from "../lib/motion";

// 0:00–0:04 — Invoice list, cursor drifts in. No caption; establishing shot.
// Ends at (1560, 420) so Confusion can pick the cursor up seamlessly.

export const ARRIVE_CURSOR_END = { x: 1560, y: 420 } as const;

export const Arrive: React.FC = () => {
  const frame = useCurrentFrame();
  const loadT = tval(frame, 0, 52);
  const cursor = pathXY(frame, [
    { f: 14, x: 1968, y: 316 },
    { f: 78, x: 1642, y: 396 },
    { f: 116, x: ARRIVE_CURSOR_END.x, y: ARRIVE_CURSOR_END.y },
  ]);

  return (
    <AbsoluteFill>
      <AcmeApp loadT={loadT} />
      <Cursor x={cursor.x} y={cursor.y} />
    </AbsoluteFill>
  );
};

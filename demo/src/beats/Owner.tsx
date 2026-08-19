import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cursor } from "../components/Cursor";
import { APPROVE, SlackApp } from "../components/SlackApp";
import { Click } from "../components/Sounds";
import { pathXY, pressScale, tval, windowT } from "../lib/motion";

// Slack #feedback, zoomed in on the message: Approve / Open PR. Click Approve
// (sound). ✓ Approved by Maya. The beat ends on the approved state.

const CLICK_APPROVE = 88;
const DURATION = 150;

export const Owner: React.FC = () => {
  const frame = useCurrentFrame();

  // The channel sits quiet for a beat, then the report lands.
  const messageT = tval(frame, 12, 24);

  const cursor = pathXY(frame, [
    { f: 20, x: 820, y: 620 },
    { f: 60, x: APPROVE.cx + 6, y: APPROVE.cy + 1 },
  ]);
  const approvedT = tval(frame, CLICK_APPROVE + 8, CLICK_APPROVE + 20);

  // Zoomed in on the message, centered, with a slow push-in. The cursor lives
  // inside the zoomed space so it tracks like a cropped screen recording.
  const s = 2.42 + 0.1 * Math.min(frame / DURATION, 1);
  const anchor = { x: 350, y: 775 };
  const tx = 960 - anchor.x * s;
  const ty = 540 - anchor.y * s;

  return (
    <AbsoluteFill style={{ background: "#FFFFFF" }}>
      <div
        style={{
          position: "absolute",
          width: 1920,
          height: 1080,
          transformOrigin: "0 0",
          transform: `translate(${tx}px, ${ty}px) scale(${s})`,
        }}
      >
        <SlackApp
          approveHoverT={windowT(frame, 54, CLICK_APPROVE + 6, 6)}
          approveScale={pressScale(frame, CLICK_APPROVE)}
          approvedT={approvedT}
          messageT={messageT}
        />
        <Cursor x={cursor.x} y={cursor.y} scale={pressScale(frame, CLICK_APPROVE)} />
      </div>
      <Click at={CLICK_APPROVE} />
    </AbsoluteFill>
  );
};

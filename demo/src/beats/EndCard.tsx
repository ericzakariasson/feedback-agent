import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { KeyTicks } from "../components/Sounds";
import { blinkOn, tval, typedCount } from "../lib/motion";
import { fonts, FPS } from "../script";

// 0:46.5–0:52.5 — `$ npm i feedback-agent` typed bare on the dot-grid canvas
// with key ticks, GitHub URL fades in under.

const COMMAND = "npm i feedback-agent";
const TYPE_START = 24;
const TYPE_CPS = 20;

// Center the finished line: "$ " + 20 chars at 72px SF Mono ≈ 43.2px per char.
const CMD_X = (1920 - (COMMAND.length + 2) * 43.2) / 2;

export const EndCard: React.FC = () => {
  const frame = useCurrentFrame();
  const enterT = tval(frame, 0, 16);
  const chars = typedCount(frame, TYPE_START, COMMAND.length, TYPE_CPS, FPS);
  const typingDone = TYPE_START + Math.ceil((COMMAND.length / TYPE_CPS) * FPS);
  const caretVisible = frame <= typingDone + 4 || blinkOn(frame - typingDone);
  const urlT = tval(frame, 84, 102);
  const fadeOut = tval(frame, 162, 179);

  return (
    <AbsoluteFill
      style={{
        background: "#FCFCFC",
        backgroundImage: "radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1.5px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div style={{ position: "absolute", inset: 0, opacity: (1 - fadeOut) * enterT }}>
        {/* The command, typed bare on the dark canvas */}
        <div
          style={{
            position: "absolute",
            left: CMD_X,
            top: 448,
            fontFamily: fonts.mono,
            fontSize: 72,
            color: "#141414",
            whiteSpace: "pre",
            transform: `translateY(${(1 - enterT) * 14}px)`,
          }}
        >
          <span style={{ color: "#1A7F37" }}>$ </span>
          <span>{COMMAND.slice(0, chars)}</span>
          {caretVisible ? (
            <span
              style={{
                display: "inline-block",
                width: 40,
                height: 78,
                marginBottom: -10,
                marginLeft: 5,
                background: "#3A3A3F",
              }}
            />
          ) : null}
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 618,
            textAlign: "center",
            fontFamily: fonts.mono,
            fontSize: 21,
            letterSpacing: 0.3,
            color: `rgba(0, 0, 0, ${0.55 * urlT})`,
            transform: `translateY(${(1 - urlT) * 8}px)`,
          }}
        >
          github.com/ericzakariasson/feedback-agent
        </div>
      </div>

      <KeyTicks
        start={TYPE_START}
        textLength={COMMAND.length}
        cps={TYPE_CPS}
        fps={FPS}
        every={2}
        volume={0.38}
      />
    </AbsoluteFill>
  );
};

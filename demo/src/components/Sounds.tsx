import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { keyTickFrames } from "../lib/motion";

// Click on: title, click-away, Feedback, Send, Approve.
export const Click: React.FC<{ at: number; volume?: number }> = ({ at, volume = 0.55 }) => {
  if (at < 0) return null;
  return (
    <Sequence from={at} durationInFrames={8}>
      <Audio src={staticFile("click.wav")} volume={volume} />
    </Sequence>
  );
};

// Keys tick every 2–3 chars. Sparse, not a storm.
export const KeyTicks: React.FC<{
  start: number;
  textLength: number;
  cps: number;
  fps: number;
  every?: number;
  volume?: number;
}> = ({ start, textLength, cps, fps, every = 3, volume = 0.3 }) => {
  const frames = keyTickFrames(start, textLength, cps, fps, every);
  return (
    <>
      {frames.map((f, i) => (
        <Sequence key={i} from={f} durationInFrames={6}>
          <Audio src={staticFile("key.wav")} volume={volume} />
        </Sequence>
      ))}
    </>
  );
};

import type { CSSProperties } from "react";
import { Easing, interpolate } from "remotion";

// Shared easings. easeOut for entrances, easeInOut for cursor travel.
export const easeOut = Easing.bezier(0.22, 1, 0.36, 1);
export const easeInOut = Easing.bezier(0.6, 0.04, 0.28, 1);

export const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** Progress 0→1 between two frames, clamped, eased. */
export function tval(
  frame: number,
  from: number,
  to: number,
  easing: (t: number) => number = easeOut,
): number {
  if (to <= from) return frame >= to ? 1 : 0;
  return interpolate(frame, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

/** 1 while inside [from, to], fading in/out over `fade` frames. */
export function windowT(frame: number, from: number, to: number, fade = 8): number {
  return Math.min(tval(frame, from, from + fade), 1 - tval(frame, to - fade, to, easeInOut));
}

export type Waypoint = {
  f: number;
  x: number;
  y: number;
  /** Easing for the segment that ends at this waypoint. */
  e?: (t: number) => number;
};

/** Piecewise cursor path: interpolates between waypoints, holds outside. */
export function pathXY(frame: number, points: readonly Waypoint[]): { x: number; y: number } {
  const first = points[0];
  if (frame <= first.f) return { x: first.x, y: first.y };
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    if (frame <= b.f) {
      const raw = (frame - a.f) / (b.f - a.f);
      const t = (b.e ?? easeInOut)(raw);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
  }
  const last = points[points.length - 1];
  return { x: last.x, y: last.y };
}

/** How many characters of a string are visible at `frame`. */
export function typedCount(
  frame: number,
  startFrame: number,
  textLength: number,
  cps: number,
  fps: number,
): number {
  if (frame < startFrame) return 0;
  return Math.min(textLength, Math.floor(((frame - startFrame) / fps) * cps) + 1);
}

/** Frames at which key ticks should play for a typed string (every Nth char). */
export function keyTickFrames(
  startFrame: number,
  textLength: number,
  cps: number,
  fps: number,
  every = 3,
): number[] {
  const frames: number[] = [];
  let previous = -1;
  for (let i = 0; i < textLength; i += every) {
    const f = startFrame + Math.round((i / cps) * fps);
    if (f !== previous) frames.push(f);
    previous = f;
  }
  return frames;
}

/** Click scale: dips to 0.88 right after `at`, recovers a few frames later. */
export function pressScale(frame: number, at: number): number {
  if (frame < at || frame > at + 6) return 1;
  const down = tval(frame, at, at + 2, Easing.linear);
  const up = tval(frame, at + 2, at + 6, easeOut);
  return 1 - 0.12 * down * (1 - up);
}

/** Caret blink: solid while "typing", then a steady blink. */
export function blinkOn(frame: number, period = 16): boolean {
  return Math.floor(frame / period) % 2 === 0;
}

/** Standard entrance: fade + small rise. */
export function fadeRise(t: number, dy = 10): CSSProperties {
  return { opacity: t, transform: `translateY(${(1 - t) * dy}px)` };
}

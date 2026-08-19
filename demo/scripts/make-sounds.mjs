// Generates the two UI sound samples used by the demo video:
//   public/click.wav — a soft mouse click
//   public/key.wav   — a quieter keyboard tick
// Both are synthesized (no recorded/licensed material) and deterministic.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLE_RATE = 44100;
const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public");

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function synth({ seconds, parts, seed }) {
  const n = Math.round(seconds * SAMPLE_RATE);
  const rand = mulberry32(seed);
  const out = new Float64Array(n);
  // One-pole lowpass state for the noise component.
  let lp = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    let v = 0;
    for (const p of parts) {
      const env = Math.exp(-t / p.decay);
      if (p.kind === "noise") {
        const white = rand() * 2 - 1;
        lp = lp + p.lowpass * (white - lp);
        v += lp * env * p.gain;
      } else {
        v += Math.sin(2 * Math.PI * p.freq * t) * env * p.gain;
      }
    }
    out[i] = Math.tanh(v * 1.4);
  }
  // Short fade at both ends to avoid clicks-on-the-click.
  const fade = Math.round(0.001 * SAMPLE_RATE);
  for (let i = 0; i < fade; i++) {
    out[i] *= i / fade;
    out[n - 1 - i] *= i / fade;
  }
  // Normalize to a known peak.
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const norm = peak > 0 ? 0.8 / peak : 1;
  return out.map((v) => v * norm);
}

function toWav(samples) {
  const n = samples.length;
  const buffer = Buffer.alloc(44 + n * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + n * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  }
  return buffer;
}

const click = synth({
  seconds: 0.055,
  seed: 7,
  parts: [
    { kind: "noise", decay: 0.004, lowpass: 0.55, gain: 0.55 },
    { kind: "sine", freq: 2600, decay: 0.005, gain: 0.5 },
    { kind: "sine", freq: 950, decay: 0.011, gain: 0.32 },
  ],
});

const key = synth({
  seconds: 0.04,
  seed: 11,
  parts: [
    { kind: "noise", decay: 0.0028, lowpass: 0.45, gain: 0.42 },
    { kind: "sine", freq: 1700, decay: 0.0035, gain: 0.3 },
    { kind: "sine", freq: 720, decay: 0.007, gain: 0.16 },
  ],
});

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "click.wav"), toWav(click));
writeFileSync(join(outDir, "key.wav"), toWav(key));
console.log("Wrote public/click.wav and public/key.wav");

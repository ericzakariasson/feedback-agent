import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Cursor } from "../components/Cursor";
import { AcmeApp, type AcmeEdit } from "../components/AcmeApp";
import { clamp01, easeInOut, fadeRise, tval } from "../lib/motion";
import { dark, demo, fonts, acme } from "../script";

// 0:18.5–0:26.5 — What the agent receives, as a loose floating paper stack:
// the message, viewport.png (tight crop on the list), replay-collage.jpg
// (4 frames: idle → rename → blur → reverted), and breadcrumbs. At the end
// the agent console peeks up and the cards drop into it one by one.

// A cropped, scaled-down render of the Acme app — because everything is
// drawn React, the "screenshots" are the real component in the right state.
const Shot: React.FC<{
  w: number;
  h: number;
  sx: number;
  sy: number;
  sw: number;
  acmeTitle?: string;
  edit?: AcmeEdit;
  cursor?: { x: number; y: number };
  /** No border/radius — for nesting inside the collage's dark tile backing. */
  bare?: boolean;
}> = ({ w, h, sx, sy, sw, acmeTitle, edit, cursor, bare = false }) => {
  const s = w / sw;
  return (
    <div
      style={{
        width: w,
        height: h,
        overflow: "hidden",
        position: "relative",
        borderRadius: bare ? 6 : 8,
        border: bare ? "none" : `1px solid ${acme.border}`,
        background: acme.paper,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 1920,
          height: 1080,
          transformOrigin: "top left",
          transform: `scale(${s}) translate(${-sx}px, ${-sy}px)`,
        }}
      >
        <AcmeApp acmeTitle={acmeTitle} edit={edit ?? null} triggerVisibleT={0} />
        {cursor ? <Cursor x={cursor.x} y={cursor.y} /> : null}
      </div>
    </div>
  );
};

const Card: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  t: number;
  /** Resting tilt in degrees — the cards sit like papers on a desk. */
  rot?: number;
  z?: number;
  /** Phase offset so each card floats on its own rhythm. */
  phase?: number;
  /** 0..1 — the card drops into the agent intake at the end of the beat. */
  dropT?: number;
  dropDX?: number;
  dropDY?: number;
  children: React.ReactNode;
}> = ({ x, y, w, h, t, rot = 0, z = 1, phase = 0, dropT = 0, dropDX = 0, dropDY = 0, children }) => {
  const frame = useCurrentFrame();
  // Gentle idle hover: a slow vertical drift and a whisper of rotation.
  const floatY = Math.sin((frame + phase) / 14.5) * 3 * t;
  const floatRot = Math.cos((frame + phase) / 18) * 0.14 * t;
  const scale = 1 - 0.96 * dropT;
  const fade = 1 - clamp01((dropT - 0.78) / 0.22);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        height: h,
        background: acme.card,
        border: `1px solid ${acme.border}`,
        borderRadius: 14,
        padding: 18,
        zIndex: z,
        opacity: t * fade,
        transform: `translate(${dropDX * dropT}px, ${dropDY * dropT + (1 - t) * 14 + floatY}px) rotate(${
          rot * (1 - dropT) + floatRot
        }deg) scale(${scale})`,
      }}
    >
      {children}
    </div>
  );
};

// Each card states plainly what it is: a label tag, an optional filename,
// and a short meta line.
const CardTag: React.FC<{ label: string; file?: string; meta?: string }> = ({
  label,
  file,
  meta,
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
    <span
      style={{
        fontFamily: fonts.mono,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 1.4,
        color: acme.muted,
        background: "rgba(0, 0, 0, 0.06)",
        borderRadius: 5,
        padding: "4px 8px",
        lineHeight: 1,
      }}
    >
      {label}
    </span>
    {file ? (
      <span style={{ fontFamily: fonts.mono, fontSize: 14, fontWeight: 600, color: acme.ink }}>
        {file}
      </span>
    ) : null}
    {meta ? (
      <span style={{ fontFamily: fonts.mono, fontSize: 12.5, color: acme.faint }}>{meta}</span>
    ) : null}
  </div>
);

const CRUMBS: Array<{ time: string; kind: string; detail: string; flag?: boolean }> = [
  { time: "−4:12", kind: "route", detail: "/invoices" },
  { time: "−0:26", kind: "click", detail: 'invoice-title "Website refresh"' },
  { time: "−0:24", kind: "input", detail: '"Website redesign"' },
  { time: "−0:11", kind: "click", detail: "page background" },
  { time: "−0:11", kind: "blur", detail: "invoice-title" },
  { time: "−0:10", kind: "dom", detail: 'title → "Website refresh"', flag: true },
];

const FRAMES: Array<{
  chip: string;
  acmeTitle?: string;
  edit?: AcmeEdit;
  cursor: { x: number; y: number };
}> = [
  { chip: "1  −3.8s · idle", cursor: { x: 700, y: 484 } },
  {
    chip: "2  −1.9s · rename",
    edit: { text: demo.invoiceTitleNext, selectAll: false, caretOn: true },
    cursor: { x: 516, y: 412 },
  },
  { chip: "3  −1.2s · blur", acmeTitle: demo.invoiceTitleNext, cursor: { x: 742, y: 566 } },
  { chip: "4  −0.6s · reverted", cursor: { x: 742, y: 566 } },
];

// The agent console (same geometry as the Agent beat) peeks from the bottom;
// the cards drop into its header, then it rides up to exactly where the next
// sequence holds it — the cut is invisible and the agent is clearly running.
const PANEL = { x: 200, w: 1520, h: 900 };
const PANEL_PEEK_Y = 1010;
const PANEL_FINAL_Y = 90;
const DROP_TARGET = { x: 960, y: PANEL_PEEK_Y + 28 };
// Card centers, in drop order: message, viewport, breadcrumbs, collage.
const CARD_CENTERS = [
  { x: 500, y: 236 },
  { x: 1200, y: 359 },
  { x: 530, y: 529 },
  { x: 1270, y: 693 },
];
const DROP_START = (i: number) => 170 + i * 7;
const DROP_DURATION = 30;

export const Packet: React.FC = () => {
  const frame = useCurrentFrame();

  // Each card drops into the console — this is the context the agent gets.
  const drop = (i: number) => ({
    dropT: tval(frame, DROP_START(i), DROP_START(i) + DROP_DURATION, easeInOut),
    dropDX: DROP_TARGET.x - CARD_CENTERS[i].x,
    dropDY: DROP_TARGET.y - CARD_CENTERS[i].y,
  });

  const peekT = tval(frame, 162, 176);
  const riseT = tval(frame, 224, 240, easeInOut);
  const panelY = 1080 - (1080 - PANEL_PEEK_Y) * peekT - (PANEL_PEEK_Y - PANEL_FINAL_Y) * riseT;
  const statusDot = 0.55 + 0.45 * Math.sin(frame / 7);

  return (
    <AbsoluteFill
      style={{
        background: acme.paper,
        backgroundImage: "radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1.5px)",
        backgroundSize: "28px 28px",
        fontFamily: fonts.ui,
        color: acme.ink,
      }}
    >
      {/* Message */}
      <Card x={180} y={150} w={640} h={172} t={tval(frame, 8, 24)} rot={-0.8} z={4} phase={0} {...drop(0)}>
        <CardTag label="MESSAGE" meta="what they wrote" />
        <div style={{ marginTop: 14, fontSize: 25, fontWeight: 550, letterSpacing: -0.4, lineHeight: 1.32 }}>
          {demo.message}
        </div>
        <div style={{ marginTop: 14, fontFamily: fonts.mono, fontSize: 13, color: acme.faint }}>
          route /invoices · sent 2:09 PM
        </div>
      </Card>

      {/* Breadcrumbs */}
      <Card x={210} y={314} w={640} h={430} t={tval(frame, 34, 52)} rot={0.7} z={3} phase={31} {...drop(2)}>
        <CardTag label="ACTIVITY" file="breadcrumbs" meta="last 5 min · redacted" />
        {CRUMBS.map((crumb, i) => {
          const t = tval(frame, 44 + i * 6, 58 + i * 6);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                height: 56,
                margin: "0 -8px",
                padding: "0 8px",
                borderRadius: 8,
                background: crumb.flag ? `rgba(207, 34, 46, ${0.06 * tval(frame, 84, 100)})` : "transparent",
                boxShadow: crumb.flag
                  ? `inset 3px 0 0 rgba(207, 34, 46, ${0.85 * tval(frame, 84, 100)})`
                  : "none",
                ...fadeRise(t, 8),
              }}
            >
              <span
                style={{
                  width: 62,
                  textAlign: "right",
                  fontFamily: fonts.mono,
                  fontSize: 14.5,
                  color: acme.faint,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {crumb.time}
              </span>
              <span
                style={{
                  width: 64,
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  color: crumb.flag ? "#CF222E" : acme.muted,
                }}
              >
                {crumb.kind.toUpperCase()}
              </span>
              <span
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 15.5,
                  color: crumb.flag ? "#CF222E" : acme.ink,
                }}
              >
                {crumb.detail}
              </span>
              {crumb.flag ? (
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: 12,
                    fontWeight: 650,
                    color: "#CF222E",
                    opacity: tval(frame, 88, 102),
                  }}
                >
                  ← the revert
                </span>
              ) : null}
            </div>
          );
        })}
      </Card>

      {/* viewport.png */}
      <Card x={790} y={128} w={820} h={462} t={tval(frame, 20, 38)} rot={0.5} z={5} phase={57} {...drop(1)}>
        <CardTag label="SCREENSHOT" file="viewport.png" meta="1440 × 900 · captured at send" />
        <Shot w={784} h={372} sx={286} sy={26} sw={1348} />
      </Card>

      {/* replay-collage.jpg — drawn the way the library actually composites it:
          dark canvas, burned-in header and labels, tiles on dark backings. */}
      <Card x={860} y={560} w={820} h={266} t={tval(frame, 46, 64)} rot={-0.6} z={6} phase={83} {...drop(3)}>
        <CardTag label="REPLAY" file="replay-collage.jpg" meta="4 frames · last 5 min" />
        <div
          style={{
            width: 784,
            borderRadius: 8,
            background: "#111111",
            border: "1px solid rgba(0, 0, 0, 0.12)",
            padding: "12px 14px 14px",
            opacity: tval(frame, 54, 68),
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#F5F5F5" }}>Session replay</span>
            <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 500, color: "#A3A3A3" }}>
              4 frames · 4×1 · /invoices
            </span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {FRAMES.map((f, i) => {
              const t = tval(frame, 58 + i * 7, 72 + i * 7);
              return (
                <div key={i} style={{ opacity: t }}>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "#A3A3A3",
                      marginBottom: 5,
                      whiteSpace: "pre",
                    }}
                  >
                    {f.chip}
                  </div>
                  <div style={{ background: "#1A1A1A", borderRadius: 8, padding: 2 }}>
                    <Shot
                      w={177}
                      h={110}
                      sx={404}
                      sy={352}
                      sw={392}
                      acmeTitle={f.acmeTitle}
                      edit={f.edit}
                      cursor={f.cursor}
                      bare
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* The agent console, rising to meet the next sequence */}
      {peekT > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: PANEL.x,
            top: panelY,
            width: PANEL.w,
            height: PANEL.h,
            background: dark.panel,
            border: `1px solid ${dark.panelBorder}`,
            borderRadius: 16,
            boxShadow: "0 24px 60px rgba(0,0,0,0.07)",
            zIndex: 20,
          }}
        >
          <div
            style={{
              height: 56,
              borderBottom: `1px solid ${dark.panelBorder}`,
              display: "flex",
              alignItems: "center",
              padding: "0 24px",
              gap: 12,
              fontFamily: fonts.mono,
            }}
          >
            <div
              style={{
                width: 9,
                height: 9,
                borderRadius: 999,
                background: dark.green,
                opacity: statusDot,
              }}
            />
            <span style={{ fontSize: 14.5, color: dark.dim }}>cursor agent</span>
            <span
              style={{
                fontSize: 13.5,
                color: dark.text,
                background: "rgba(0,0,0,0.05)",
                border: `1px solid ${dark.panelBorder}`,
                borderRadius: 6,
                padding: "3px 8px",
              }}
            >
              {demo.feedbackId}
            </span>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 13.5, color: dark.faint }}>
              acme/app · fix/invoice-rename-revert
            </span>
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

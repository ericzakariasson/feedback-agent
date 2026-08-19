import React from "react";
import { fonts } from "../script";

// The feedback dialog, drawn to match the real widget (src/react/widget.tsx +
// styles.ts): same copy, same layout, same black-and-white language. We do not
// import the package — the script wants a lookalike, honest but hand-drawn.

const PANEL_W = 440;
const PANEL_H = 400;
const PANEL_X = (1920 - PANEL_W) / 2;
const PANEL_Y = (1080 - PANEL_H) / 2;
const PAD = 16;

export const WIDGET = {
  panel: { x: PANEL_X, y: PANEL_Y, w: PANEL_W, h: PANEL_H },
  send: { cx: PANEL_X + PANEL_W - PAD - 46, cy: PANEL_Y + PANEL_H - PAD - 20 },
} as const;

// The real widget's light scheme (styles.ts light-dark() light values).
const ink = "#000000";
const muted = "rgba(0,0,0,0.68)";
const faint = "rgba(0,0,0,0.56)";
const border = "rgba(0,0,0,0.10)";

const CloseGlyph: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 14 14">
    <path d="M2 2l10 10M12 2L2 12" stroke={muted} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const UploadTile: React.FC = () => (
  <div
    style={{
      width: 88,
      height: 88,
      border: `1px dashed ${border}`,
      borderRadius: 8,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      color: faint,
    }}
  >
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2.25" y="3.75" width="17.5" height="14.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8" cy="9" r="1.5" fill="currentColor" />
      <path d="M3.5 15.25 8 11.25l3.25 2.75 2.75-2.5 4.5 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
    <span style={{ fontSize: 13, color: muted }}>Upload</span>
  </div>
);

export const Widget: React.FC<{
  openT: number;
  view: "compose" | "thanks";
  /** Crossfade progress of the thanks view. */
  thanksT?: number;
  text?: string;
  caretOn?: boolean;
  /** 0..1 — textarea focus ring. */
  focusT?: number;
  sending?: boolean;
  sendHoverT?: number;
  sendScale?: number;
  feedbackId?: string;
  /** 0..1..0 — one gentle wash behind the reference id. */
  idPulseT?: number;
}> = ({
  openT,
  view,
  thanksT = 1,
  text = "",
  caretOn = false,
  focusT = 0,
  sending = false,
  sendHoverT = 0,
  sendScale = 1,
  feedbackId = "",
  idPulseT = 0,
}) => {
  if (openT <= 0.001) return null;

  const hoverShade = Math.round(46 * sendHoverT);
  const sendBg = sending
    ? "rgba(0,0,0,0.18)"
    : `rgb(${hoverShade}, ${hoverShade}, ${hoverShade})`;
  const composeOpacity = view === "compose" ? 1 : 1 - thanksT;

  return (
    <div
      style={{
        position: "absolute",
        left: PANEL_X,
        top: PANEL_Y,
        width: PANEL_W,
        height: PANEL_H,
        fontFamily: fonts.ui,
        color: ink,
        background: "#FFFFFF",
        border: `1px solid ${border}`,
        borderRadius: 10,
        boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 24px 64px rgba(0,0,0,0.18)",
        opacity: openT,
        transform: `translateY(${(1 - openT) * 8}px) scale(${0.98 + 0.02 * openT})`,
        zIndex: 500,
        overflow: "hidden",
      }}
    >
      {/* Compose view */}
      <div style={{ position: "absolute", inset: 0, padding: PAD, opacity: composeOpacity }}>
        <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.36, lineHeight: "22px" }}>
          Feedback
        </div>
        <div style={{ marginTop: 8, fontSize: 16, color: muted, lineHeight: 1.45 }}>
          What&rsquo;s not working, or what could be better?
        </div>
        <div style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CloseGlyph />
        </div>

        {/* Textarea */}
        <div
          style={{
            position: "absolute",
            left: PAD,
            top: 86,
            width: PANEL_W - PAD * 2,
            height: 104,
            border: `1px solid rgba(0,0,0,${0.1 + 0.9 * focusT})`,
            borderRadius: 8,
            padding: "12px 14px",
            fontSize: 16,
            lineHeight: 1.45,
            background: "#FFFFFF",
          }}
        >
          {text.length === 0 ? (
            <span style={{ color: faint }}>
              {caretOn ? <Caret /> : null}
              Describe a bug or idea. What did you expect to happen?
            </span>
          ) : (
            <span>
              {text}
              {caretOn ? <Caret /> : null}
            </span>
          )}
        </div>

        {/* Gallery */}
        <div style={{ position: "absolute", left: PAD, top: 202 }}>
          <UploadTile />
        </div>

        {/* Meta */}
        <div
          style={{
            position: "absolute",
            left: PAD,
            right: PAD,
            top: 302,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            color: muted,
          }}
        >
          <span>Upload or paste a screenshot.</span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{text.length}/2000</span>
        </div>

        {/* Send */}
        <div
          style={{
            position: "absolute",
            right: PAD,
            bottom: PAD,
            minWidth: 92,
            height: 40,
            padding: "0 22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            background: sendBg,
            color: sending ? "rgba(0,0,0,0.44)" : "#FFFFFF",
            fontSize: 14,
            fontWeight: 500,
            transform: `scale(${sendScale})`,
          }}
        >
          {sending ? "Sending…" : "Send"}
        </div>
      </div>

      {/* Thanks view — just a big thank you in the middle */}
      {view === "thanks" ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            padding: PAD,
            background: "#FFFFFF",
            opacity: thanksT,
          }}
        >
          <div style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CloseGlyph />
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <div style={{ fontSize: 30, fontWeight: 650, letterSpacing: -0.6, color: ink }}>
              Thanks, we got it
            </div>
            <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 13,
                color: "rgba(0,0,0,0.62)",
                padding: "4px 10px",
                borderRadius: 6,
                background: `rgba(0, 0, 0, ${0.07 * idPulseT})`,
              }}
            >
              Reference: {feedbackId}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

const Caret: React.FC = () => (
  <span
    style={{
      display: "inline-block",
      width: 1.5,
      height: 18,
      marginLeft: 1,
      marginBottom: -3,
      background: "#000000",
    }}
  />
);

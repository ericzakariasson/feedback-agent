import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { easeInOut, fadeRise, tval } from "../lib/motion";
import { dark, demo, fonts } from "../script";

// 0:26.5–0:41.5 — Agent log fills line by line (read report → rg → open file →
// found it), buggy lines flag red, then flip to a green persist() diff.
// Final log line: opened PR #184 · includes evt_7f3a — then push in on it.

const PANEL = { x: 200, y: 90, w: 1520, h: 900 };
const MONO = 20;
const LH = 38;

const FLAGS_AT = 190;
const FLIP_AT = 248;
const CHECKS_AT = 306;
const PR_AT = 332;

type Line = {
  at: number;
  y: number;
  kind: "step" | "cmd" | "out";
  parts: Array<{ text: string; color?: string }>;
};

const LINES: Line[] = [
  {
    at: 22,
    y: 124,
    kind: "step",
    parts: [
      { text: `read feedback ${demo.feedbackId} — ` },
      { text: `"${demo.message}"`, color: dark.text },
    ],
  },
  {
    at: 52,
    y: 162,
    kind: "step",
    parts: [{ text: "replay: rename → blur → title reverts · route /invoices · viewport.png" }],
  },
  {
    at: 82,
    y: 208,
    kind: "cmd",
    parts: [{ text: `rg -n "setTitle" src/invoices`, color: dark.text }],
  },
  {
    at: 106,
    y: 246,
    kind: "out",
    parts: [
      { text: "src/invoices/InvoiceRow.tsx:29", color: dark.blue },
      { text: ":  const [title, setTitle] = useState(invoice.title);" },
    ],
  },
  {
    at: 118,
    y: 284,
    kind: "out",
    parts: [
      { text: "src/invoices/InvoiceRow.tsx:39", color: dark.blue },
      { text: ":      setTitle(invoice.title);" },
    ],
  },
  {
    at: 142,
    y: 330,
    kind: "step",
    parts: [
      { text: `open src/invoices/${demo.file}:39 — ` },
      { text: "found it", color: dark.text },
    ],
  },
];

const BUG_LINES = [
  { n: 36, code: "function handleBlur() {" },
  { n: 37, code: "  setEditing(false);" },
  { n: 38, code: "  // reset to the server value", flag: true },
  { n: 39, code: "  setTitle(invoice.title);", flag: true },
  { n: 40, code: "}" },
];

const DIFF_LINES: Array<{ sign: " " | "-" | "+"; code: string }> = [
  { sign: " ", code: "function handleBlur() {" },
  { sign: " ", code: "  setEditing(false);" },
  { sign: "-", code: "  // reset to the server value" },
  { sign: "-", code: "  setTitle(invoice.title);" },
  { sign: "+", code: "  setTitle(draft);" },
  { sign: "+", code: "  persist(invoice.id, { title: draft });" },
  { sign: " ", code: "}" },
];

const CODE_Y = 380;

export const Agent: React.FC = () => {
  const frame = useCurrentFrame();
  const flagT = tval(frame, FLAGS_AT, FLAGS_AT + 12);
  const flipT = tval(frame, FLIP_AT, FLIP_AT + 16);
  const statusDot = 0.55 + 0.45 * Math.sin(frame / 7);

  // Push in on the "opened PR" line once it lands.
  const zoomT = tval(frame, PR_AT + 20, PR_AT + 46, easeInOut);
  const zs = 1 + 0.9 * zoomT;
  const ztx = (960 - 480 * zs) * zoomT;
  const zty = (540 - 834 * zs) * zoomT;

  return (
    <AbsoluteFill
      style={{
        background: dark.bg,
        backgroundImage: "radial-gradient(rgba(0,0,0,0.07) 1px, transparent 1.5px)",
        backgroundSize: "28px 28px",
        fontFamily: fonts.mono,
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 1920,
          height: 1080,
          transformOrigin: "0 0",
          transform: `translate(${ztx}px, ${zty}px) scale(${zs})`,
        }}
      >
      <div
        style={{
          position: "absolute",
          left: PANEL.x,
          top: PANEL.y,
          width: PANEL.w,
          height: PANEL.h,
          background: dark.panel,
          border: `1px solid ${dark.panelBorder}`,
          borderRadius: 16,
          boxShadow: "0 24px 60px rgba(0,0,0,0.07)",
        }}
      >
        {/* Header */}
        <div
          style={{
            height: 56,
            borderBottom: `1px solid ${dark.panelBorder}`,
            display: "flex",
            alignItems: "center",
            padding: "0 24px",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 9,
              height: 9,
              borderRadius: 999,
              background: dark.green,
              opacity: frame < PR_AT ? statusDot : 1,
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

        {/* Log lines */}
        {LINES.map((line, i) => {
          const t = tval(frame, line.at, line.at + 7);
          if (t <= 0) return null;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 44,
                top: line.y,
                fontSize: MONO,
                lineHeight: `${LH}px`,
                whiteSpace: "pre",
                ...fadeRise(t, 7),
              }}
            >
              {line.kind === "cmd" ? (
                <span style={{ color: dark.prompt }}>$ </span>
              ) : line.kind === "step" ? (
                <span style={{ color: dark.faint }}>▸ </span>
              ) : (
                <span>{"  "}</span>
              )}
              {line.parts.map((part, j) => (
                <span key={j} style={{ color: part.color ?? dark.dim }}>
                  {part.text}
                </span>
              ))}
            </div>
          );
        })}

        {/* Buggy code → diff */}
        {frame >= 162 ? (
          <div style={{ position: "absolute", left: 44, top: CODE_Y, width: 1150, height: 310 }}>
            {/* Bug block */}
            {flipT < 1 ? (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  opacity: (1 - flipT) * tval(frame, 162, 172),
                  transform: `translateY(${(1 - tval(frame, 162, 172)) * 10}px)`,
                }}
              >
                <CodeFrame title={`src/invoices/${demo.file}`}>
                  {BUG_LINES.map((line) => (
                    <div
                      key={line.n}
                      style={{
                        display: "flex",
                        fontSize: MONO,
                        lineHeight: "34px",
                        background: line.flag ? `rgba(207, 34, 46, ${0.07 * flagT})` : "transparent",
                        boxShadow: line.flag
                          ? `inset 3px 0 0 rgba(207, 34, 46, ${0.85 * flagT})`
                          : "none",
                      }}
                    >
                      <span style={{ width: 64, color: dark.faint, textAlign: "right", paddingRight: 22 }}>
                        {line.n}
                      </span>
                      <span style={{ color: line.flag ? "#A8362C" : "#3B3B40", whiteSpace: "pre" }}>
                        {line.code}
                      </span>
                      {line.n === 39 ? (
                        <span
                          style={{
                            marginLeft: 26,
                            alignSelf: "center",
                            fontSize: 13.5,
                            color: dark.red,
                            border: `1px solid rgba(207, 34, 46, 0.35)`,
                            background: "rgba(207, 34, 46, 0.05)",
                            borderRadius: 6,
                            padding: "2px 9px",
                            opacity: tval(frame, FLAGS_AT + 14, FLAGS_AT + 26),
                          }}
                        >
                          draft is discarded on blur
                        </span>
                      ) : null}
                    </div>
                  ))}
                </CodeFrame>
              </div>
            ) : null}

            {/* Diff block */}
            {flipT > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: 0,
                  opacity: flipT,
                  transform: `translateY(${(1 - flipT) * 8}px)`,
                }}
              >
                <CodeFrame
                  title={`src/invoices/${demo.file} · persist the draft on blur`}
                  accent={dark.green}
                >
                  {DIFF_LINES.map((line, i) => {
                    const bg =
                      line.sign === "+" ? dark.greenBg : line.sign === "-" ? dark.redBg : "transparent";
                    const color =
                      line.sign === "+" ? "#1A7F37" : line.sign === "-" ? "#CF222E" : "rgba(0,0,0,0.45)";
                    return (
                      <div key={i} style={{ display: "flex", fontSize: MONO, lineHeight: "34px", background: bg }}>
                        <span style={{ width: 64, color, textAlign: "center" }}>{line.sign}</span>
                        <span style={{ color, whiteSpace: "pre" }}>{line.code}</span>
                      </div>
                    );
                  })}
                </CodeFrame>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Checks */}
        <div
          style={{
            position: "absolute",
            left: 44,
            top: 706,
            fontSize: 18,
            color: dark.dim,
            ...fadeRise(tval(frame, CHECKS_AT, CHECKS_AT + 8), 6),
          }}
        >
          <span style={{ color: dark.green }}>✓</span> typecheck clean{"   "}
          <span style={{ color: dark.green }}>✓</span> 12 tests passed
        </div>

        {/* The payoff, as one more line of output */}
        <div
          style={{
            position: "absolute",
            left: 44,
            top: 744,
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: MONO,
            ...fadeRise(tval(frame, PR_AT, PR_AT + 8), 7),
          }}
        >
          <PrGlyph />
          <span style={{ color: "#1A7F37" }}>
            opened PR <span style={{ fontWeight: 700 }}>#{demo.pr}</span>
          </span>
          <span style={{ color: dark.dim }}>· includes {demo.feedbackId}</span>
        </div>
      </div>
      </div>
    </AbsoluteFill>
  );
};

const CodeFrame: React.FC<{ title: string; accent?: string; children: React.ReactNode }> = ({
  title,
  accent,
  children,
}) => (
  <div
    style={{
      background: dark.bg,
      border: `1px solid ${accent ? "rgba(26,127,55,0.35)" : dark.panelBorder}`,
      borderRadius: 10,
      overflow: "hidden",
    }}
  >
    <div
      style={{
        height: 40,
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        borderBottom: `1px solid ${dark.panelBorder}`,
        fontSize: 14,
        color: accent ?? dark.faint,
      }}
    >
      {title}
    </div>
    <div style={{ padding: "12px 0" }}>{children}</div>
  </div>
);

const PrGlyph: React.FC = () => (
  <svg width="19" height="19" viewBox="0 0 16 16" fill="#1A7F37">
    <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z" />
  </svg>
);

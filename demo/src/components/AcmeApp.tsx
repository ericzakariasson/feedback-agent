import React from "react";
import { clamp01 } from "../lib/motion";
import { demo, fonts, acme } from "../script";

// Acme — quiet invoicing app. Light, full-bleed, no fake Mac window.
// Pure and prop-driven so beats (and the packet's mini screenshots) can
// render any state at any frame.

type Status = keyof typeof acme.statuses;

type Row = {
  client: string;
  title: string;
  number: string;
  status: Status;
  amount: string;
  date: string;
  tint: { bg: string; fg: string };
};

export const ROWS: Row[] = [
  {
    client: "Halcyon Labs",
    title: "Onboarding flow",
    number: "INV-0139",
    status: "Paid",
    amount: "$3,400",
    date: "Jul 28",
    tint: { bg: "rgba(37, 99, 235, 0.10)", fg: "#1D5FC2" },
  },
  {
    client: demo.invoiceClient,
    title: demo.invoiceTitle,
    number: "INV-0142",
    status: "Sent",
    amount: "$6,200",
    date: "Aug 22",
    tint: { bg: "rgba(124, 58, 237, 0.10)", fg: "#6D3FC0" },
  },
  {
    client: "Meridian & Co",
    title: "Q3 retainer",
    number: "INV-0143",
    status: "Sent",
    amount: "$8,000",
    date: "Aug 30",
    tint: { bg: "rgba(22, 163, 74, 0.10)", fg: "#0F7B3D" },
  },
  {
    client: "Bluebird Café",
    title: "Menu redesign",
    number: "INV-0144",
    status: "Draft",
    amount: "$1,150",
    date: "—",
    tint: { bg: "rgba(202, 138, 4, 0.12)", fg: "#9A6708" },
  },
  {
    client: "Foxglove Press",
    title: "Catalogue layout",
    number: "INV-0138",
    status: "Paid",
    amount: "$2,750",
    date: "Jul 19",
    tint: { bg: "rgba(220, 68, 50, 0.10)", fg: "#C03A2B" },
  },
  {
    client: "Standard Freight",
    title: "Logistics dashboard",
    number: "INV-0131",
    status: "Overdue",
    amount: "$9,600",
    date: "Jul 5",
    tint: { bg: "rgba(71, 85, 105, 0.10)", fg: "#475569" },
  },
];

const CONTENT_X = 400;
const CONTENT_W = 1120;
const LIST_Y = 288;
const ROW_H = 92;
export const ACME_ROW = 1;

const acmeRowY = LIST_Y + ACME_ROW * ROW_H;

// Cursor targets and geometry other files need.
export const T = {
  contentX: CONTENT_X,
  contentW: CONTENT_W,
  listY: LIST_Y,
  rowH: ROW_H,
  acmeRowY,
  // Middle of the Acme title text.
  titleTarget: { x: 516, y: acmeRowY + 32 },
  // Blank space beneath the list — the click-away spot.
  emptySpace: { x: 906, y: 924 },
  // Center of the Feedback trigger pill (right: 20, bottom: 20 — real defaults).
  trigger: { cx: 1837, cy: 1038 },
} as const;

export type AcmeEdit = {
  text: string;
  selectAll: boolean;
  caretOn: boolean;
} | null;

const AcmeMark: React.FC<{ size?: number }> = ({ size = 28 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: size * 0.29,
      background: "#0A0A0A",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "0 0 auto",
    }}
  >
    <span
      style={{
        color: "#FFFFFF",
        fontWeight: 700,
        fontSize: size * 0.55,
        lineHeight: 1,
        letterSpacing: -0.5,
      }}
    >
      A
    </span>
  </div>
);

const Chip: React.FC<{ status: Status }> = ({ status }) => {
  const c = acme.statuses[status];
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "6px 12px",
        borderRadius: 999,
        background: c.bg,
        color: c.fg,
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: 0.2,
        lineHeight: 1,
      }}
    >
      {status}
    </div>
  );
};

const ChatGlyph: React.FC = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M3.25 2.75h9.5A1.25 1.25 0 0 1 14 4v6a1.25 1.25 0 0 1-1.25 1.25H8.1L5.2 13.85a.4.4 0 0 1-.7-.27V11.25H3.25A1.25 1.25 0 0 1 2 10V4a1.25 1.25 0 0 1 1.25-1.25Z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
  </svg>
);

export const AcmeApp: React.FC<{
  /** 0..1 — rows cascade in on the establishing shot. Default settled. */
  loadT?: number;
  /** Display title of the Acme row (when not editing). */
  acmeTitle?: string;
  /** Inline rename state for the Acme row. */
  edit?: AcmeEdit;
  hoverRowIndex?: number | null;
  hoverRowT?: number;
  /** 0..1 — hover affordance on the Acme title text. */
  titleAffordanceT?: number;
  /** 0..1 — green "just updated" wash on the Acme row. */
  acmeGlowT?: number;
  triggerHoverT?: number;
  /** 1 visible, 0 hidden (fades while the widget is open). */
  triggerVisibleT?: number;
  /** 0..1 — widget overlay scrim. */
  scrimT?: number;
}> = ({
  loadT = 1,
  acmeTitle = demo.invoiceTitle,
  edit = null,
  hoverRowIndex = null,
  hoverRowT = 0,
  titleAffordanceT = 0,
  acmeGlowT = 0,
  triggerHoverT = 0,
  triggerVisibleT = 1,
  scrimT = 0,
}) => {
  const stagger = (i: number) => clamp01(loadT * (ROWS.length + 2) - i);
  const headerT = stagger(0);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: acme.paper,
        fontFamily: fonts.ui,
        color: acme.ink,
        overflow: "hidden",
      }}
    >
      {/* Brand row */}
      <div
        style={{
          position: "absolute",
          left: CONTENT_X,
          top: 56,
          width: CONTENT_W,
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: headerT,
        }}
      >
        <AcmeMark />
        <div style={{ fontSize: 25, fontWeight: 650, letterSpacing: -0.4 }}>{demo.app}</div>
        <div style={{ flex: 1 }} />
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 999,
            background: "rgba(0, 0, 0, 0.06)",
            color: acme.muted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 15,
            fontWeight: 600,
          }}
        >
          E
        </div>
      </div>

      {/* Page title */}
      <div style={{ position: "absolute", left: CONTENT_X, top: 148, opacity: headerT }}>
        <div style={{ fontSize: 42, fontWeight: 650, letterSpacing: -1 }}>Invoices</div>
        <div style={{ marginTop: 10, fontSize: 15.5, color: acme.muted }}>
          6 invoices · 2 awaiting payment
        </div>
      </div>

      {/* Rows */}
      {ROWS.map((row, i) => {
        const rowY = LIST_Y + i * ROW_H;
        const t = stagger(i + 1);
        const isAcme = i === ACME_ROW;
        const hover = hoverRowIndex === i ? hoverRowT : 0;
        const title = isAcme ? acmeTitle : row.title;
        const editing = isAcme && edit !== null;

        return (
          <div
            key={row.number}
            style={{
              position: "absolute",
              left: CONTENT_X,
              top: rowY,
              width: CONTENT_W,
              height: ROW_H,
              opacity: t,
              transform: `translateY(${(1 - t) * 12}px)`,
            }}
          >
            {/* hover / glow washes */}
            <div
              style={{
                position: "absolute",
                left: -16,
                right: -16,
                top: 3,
                bottom: 3,
                borderRadius: 12,
                background: acme.hover,
                opacity: hover,
              }}
            />
            {isAcme && acmeGlowT > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: -16,
                  right: -16,
                  top: 3,
                  bottom: 3,
                  borderRadius: 12,
                  background: "rgba(22, 163, 74, 0.10)",
                  opacity: acmeGlowT,
                }}
              />
            ) : null}
            {/* divider */}
            {i < ROWS.length - 1 ? (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 0,
                  height: 1,
                  background: acme.divider,
                }}
              />
            ) : null}

            {/* avatar */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 26,
                width: 40,
                height: 40,
                borderRadius: 11,
                background: row.tint.bg,
                color: row.tint.fg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 650,
              }}
            >
              {row.client[0]}
            </div>

            {/* title + sub */}
            {editing && edit ? (
              <div
                style={{
                  position: "absolute",
                  left: 44,
                  top: 8,
                  width: 348,
                  height: 40,
                  borderRadius: 9,
                  border: `1.5px solid ${acme.ink}`,
                  background: "#FFFFFF",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.10)",
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: 10.5,
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: -0.2,
                    lineHeight: "27px",
                    background: edit.selectAll ? acme.selection : "transparent",
                    borderRadius: 2,
                  }}
                >
                  {edit.text}
                </span>
                {edit.caretOn ? (
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 23,
                      marginLeft: 1,
                      background: acme.ink,
                    }}
                  />
                ) : null}
              </div>
            ) : (
              <div style={{ position: "absolute", left: 56, top: 18 }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    letterSpacing: -0.2,
                    lineHeight: "26px",
                    padding: "3px 8px",
                    margin: "-3px -8px",
                    borderRadius: 6,
                    background:
                      isAcme && titleAffordanceT > 0
                        ? `rgba(0, 0, 0, ${0.05 * titleAffordanceT})`
                        : "transparent",
                    boxShadow:
                      isAcme && titleAffordanceT > 0
                        ? `inset 0 -1.5px 0 rgba(0, 0, 0, ${0.28 * titleAffordanceT})`
                        : "none",
                  }}
                >
                  {title}
                </span>
              </div>
            )}
            <div
              style={{
                position: "absolute",
                left: 56,
                top: 48,
                fontSize: 14,
                color: acme.faint,
              }}
            >
              {row.client} · {row.number}
            </div>

            {/* status */}
            <div style={{ position: "absolute", left: 640, top: 33 }}>
              <Chip status={row.status} />
            </div>

            {/* amount */}
            <div
              style={{
                position: "absolute",
                right: 170,
                top: 33,
                fontSize: 17.5,
                fontWeight: 600,
                letterSpacing: -0.2,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.amount}
            </div>

            {/* date */}
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 36,
                fontSize: 15,
                color: acme.muted,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.date}
            </div>
          </div>
        );
      })}

      {/* Feedback trigger — the widget's real defaults: pill, right 20, bottom 20 */}
      {triggerVisibleT > 0.001 ? (
        <div
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
            height: 44,
            padding: "0 17px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            border: "1px solid rgba(0, 0, 0, 0.16)",
            background: `rgb(${Math.round(255 - 11 * triggerHoverT)}, ${Math.round(
              255 - 11 * triggerHoverT,
            )}, ${Math.round(255 - 11 * triggerHoverT)})`,
            color: acme.ink,
            fontSize: 14.5,
            fontWeight: 500,
            boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.08)",
            opacity: triggerVisibleT,
            transform: `scale(${0.96 + 0.04 * triggerVisibleT})`,
          }}
        >
          <ChatGlyph />
          Feedback
        </div>
      ) : null}

      {/* Widget scrim */}
      {scrimT > 0.001 ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(0, 0, 0, ${0.44 * scrimT})`,
          }}
        />
      ) : null}
    </div>
  );
};

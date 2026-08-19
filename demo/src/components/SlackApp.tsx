import React from "react";
import { demo, fonts, slack } from "../script";

// Slack desktop, light theme, channel #feedback. No sidebar tour — the
// message is the frame. Remotion paints the Block Kit card; nothing is posted.

const CONTENT_X = 32;
const MSG_X = 88; // after the 40px avatar + gap
const NAME_Y = 752;
const LINE_H = 28;
const LINE1_Y = NAME_Y + 30;
const BUTTONS_Y = LINE1_Y + LINE_H * 3 + 14;

export const APPROVE = { cx: MSG_X + 47, cy: BUTTONS_Y + 19 } as const;

const CodeChip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span
    style={{
      fontFamily: fonts.mono,
      fontSize: 14.5,
      color: slack.code,
      background: slack.codeBg,
      border: `1px solid ${slack.codeBorder}`,
      borderRadius: 4,
      padding: "1px 5px",
      margin: "0 1px",
    }}
  >
    {children}
  </span>
);

const AcmeAvatar: React.FC<{ enter?: React.CSSProperties }> = ({ enter }) => (
  <div
    style={{
      position: "absolute",
      left: CONTENT_X,
      top: NAME_Y - 4,
      width: 40,
      height: 40,
      borderRadius: 9,
      background: "#0A0A0A",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      ...enter,
    }}
  >
    <span
      style={{
        color: "#FFFFFF",
        fontWeight: 700,
        fontSize: 21,
        lineHeight: 1,
        letterSpacing: -0.5,
        fontFamily: fonts.ui,
      }}
    >
      A
    </span>
  </div>
);

export const SlackApp: React.FC<{
  approveHoverT?: number;
  approveScale?: number;
  /** 0..1 — buttons swap for the "Approved by Maya" context line. */
  approvedT?: number;
  /** 0..1 — the bot message arriving after the cut to Slack. */
  messageT?: number;
}> = ({ approveHoverT = 0, approveScale = 1, approvedT = 0, messageT = 1 }) => {
  const approveBg = approveHoverT > 0.5 ? slack.greenHover : slack.green;
  const enter: React.CSSProperties = {
    opacity: messageT,
    transform: `translateY(${(1 - messageT) * 12}px)`,
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: slack.bg,
        fontFamily: fonts.ui,
        color: slack.text,
        overflow: "hidden",
      }}
    >
      {/* Channel header */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 60,
          borderBottom: `1px solid ${slack.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 28px",
        }}
      >
        <span style={{ fontSize: 18.5, fontWeight: 800, letterSpacing: -0.2 }}>
          <span style={{ color: slack.dim, fontWeight: 600, marginRight: 3 }}>#</span>
          {demo.slackChannel.slice(1)}
        </span>
        <span style={{ marginLeft: 14, fontSize: 13.5, color: slack.dim }}>
          Feedback from the widget, triaged by agents
        </span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "center" }}>
          {["#E8DEF8", "#FDE3C3", "#CFE5CE"].map((c, i) => (
            <div
              key={c}
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: c,
                border: "2px solid #FFFFFF",
                marginLeft: i === 0 ? 0 : -7,
              }}
            />
          ))}
          <span style={{ marginLeft: 8, fontSize: 13, color: slack.dim, fontWeight: 500 }}>12</span>
        </div>
      </div>

      {/* Channel intro — the very beginning of #feedback */}
      <div style={{ position: "absolute", left: CONTENT_X, top: 128 }}>
        <div
          style={{
            width: 78,
            height: 78,
            borderRadius: 20,
            background: "#F4EDE4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            fontWeight: 800,
            color: "#A88B5C",
          }}
        >
          #
        </div>
        <div style={{ marginTop: 20, fontSize: 30, fontWeight: 800, letterSpacing: -0.4 }}>
          You&rsquo;re looking at the{" "}
          <span style={{ color: slack.link }}>{demo.slackChannel}</span> channel
        </div>
        <div style={{ marginTop: 10, fontSize: 15.5, color: slack.dim, lineHeight: 1.5, maxWidth: 760 }}>
          This channel is for feedback reported inside {demo.app}. When the agent has a fix
          ready, it posts the pull request here for a human to approve.
        </div>
      </div>

      {/* An earlier human message */}
      <div
        style={{
          position: "absolute",
          left: CONTENT_X,
          top: 596,
          width: 40,
          height: 40,
          borderRadius: 9,
          background: "#E7D3E8",
          color: "#8D4A93",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          fontWeight: 700,
        }}
      >
        M
      </div>
      <div style={{ position: "absolute", left: MSG_X, top: 590 }}>
        <span style={{ fontSize: 16.5, fontWeight: 800 }}>{demo.owner}</span>
        <span style={{ marginLeft: 8, fontSize: 12.5, color: slack.dim }}>Friday at 4:31 PM</span>
        <div style={{ marginTop: 5, fontSize: 16, lineHeight: `${LINE_H}px` }}>
          widget is live on production — reports land here from now on{" "}
          <span style={{ fontSize: 17 }}>🎉</span>
        </div>
      </div>

      {/* Date divider */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 688 }}>
        <div style={{ position: "absolute", left: 28, right: 28, top: 14, height: 1, background: slack.border }} />
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            top: 0,
            background: "#FFFFFF",
            border: `1px solid ${slack.border}`,
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Today
        </div>
      </div>

      {/* The message */}
      <AcmeAvatar enter={enter} />
      <div style={{ position: "absolute", left: MSG_X, top: NAME_Y - 6, ...enter }}>
        <span style={{ fontSize: 16.5, fontWeight: 800 }}>{demo.app}</span>
        <span
          style={{
            marginLeft: 7,
            fontSize: 10.5,
            fontWeight: 700,
            color: slack.dim,
            background: "#ECECEC",
            borderRadius: 3,
            padding: "2px 4px",
            letterSpacing: 0.3,
            verticalAlign: "2px",
          }}
        >
          APP
        </span>
        <span style={{ marginLeft: 8, fontSize: 12.5, color: slack.dim }}>2:14 PM</span>
      </div>

      <div style={{ position: "absolute", left: MSG_X, top: LINE1_Y, fontSize: 16, lineHeight: `${LINE_H}px`, ...enter }}>
        <div style={{ fontWeight: 700 }}>
          Feedback <CodeChip>{demo.feedbackId}</CodeChip> is ready to review
        </div>
        <div style={{ fontStyle: "italic", color: "#3E3D3E" }}>{demo.message}</div>
        <div>
          PR{" "}
          <span style={{ color: slack.link, fontWeight: 500 }}>#{demo.pr}</span>
          <span style={{ color: slack.dim }}> · </span>
          <CodeChip>acme/app</CodeChip>
          <span style={{ color: slack.dim }}> · </span>
          <CodeChip>{demo.file}</CodeChip>
        </div>
      </div>

      {/* Actions — Approve is the click. Two buttons only. */}
      {approvedT < 1 ? (
        <div
          style={{
            position: "absolute",
            left: MSG_X,
            top: BUTTONS_Y,
            display: "flex",
            gap: 10,
            opacity: (1 - approvedT) * messageT,
            transform: `translateY(${(1 - messageT) * 12}px)`,
          }}
        >
          <div
            style={{
              height: 38,
              padding: "0 18px",
              display: "flex",
              alignItems: "center",
              background: approveBg,
              color: "#FFFFFF",
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 5,
              transform: `scale(${approveScale})`,
              boxShadow: approveHoverT > 0.5 ? "0 1px 3px rgba(0,0,0,0.18)" : "none",
            }}
          >
            Approve
          </div>
          <div
            style={{
              height: 38,
              padding: "0 18px",
              display: "flex",
              alignItems: "center",
              background: "#FFFFFF",
              border: `1px solid ${slack.buttonBorder}`,
              color: slack.text,
              fontSize: 15,
              fontWeight: 700,
              borderRadius: 5,
            }}
          >
            Open PR
          </div>
        </div>
      ) : null}

      {/* Post-approve context line */}
      {approvedT > 0.001 ? (
        <div
          style={{
            position: "absolute",
            left: MSG_X,
            top: BUTTONS_Y + 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            opacity: approvedT,
            fontSize: 15,
          }}
        >
          <svg width="17" height="17" viewBox="0 0 17 17">
            <circle cx="8.5" cy="8.5" r="8" fill="#2BAC76" />
            <path d="M5 8.7l2.4 2.4L12 6.4" stroke="#FFFFFF" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontWeight: 600 }}>Approved by {demo.owner}</span>
          <span style={{ color: slack.dim }}>· 2:14 PM</span>
        </div>
      ) : null}

      {/* Composer */}
      <div
        style={{
          position: "absolute",
          left: 28,
          right: 28,
          bottom: 26,
          height: 52,
          border: "1px solid rgba(141,141,141,0.5)",
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          padding: "0 14px",
          gap: 12,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="9" fill="#F0F0F0" />
          <path d="M10 6.2v7.6M6.2 10h7.6" stroke={slack.dim} strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 15, color: slack.dim }}>Message {demo.slackChannel}</span>
        <div style={{ flex: 1 }} />
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect x="6.4" y="1.8" width="5.2" height="9.4" rx="2.6" stroke={slack.dim} strokeWidth="1.4" />
          <path d="M3.4 8.6a5.6 5.6 0 0 0 11.2 0M9 14.2v2.2" stroke={slack.dim} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

// Single source of truth for the demo, per docs/demo-script.md.
// The typed sentence, feedback id, filenames and diff all come from here
// so the beats can never drift apart.

export const demo = {
  app: "Acme",
  invoiceClient: "Northwind",
  invoiceTitle: "Website refresh", // client label carries "Acme"; no duplication
  invoiceTitleNext: "Website redesign",
  message: "Renaming an invoice reverts when I click away.",
  feedbackId: "evt_7f3a",
  file: "InvoiceRow.tsx",
  pr: 184,
  slackChannel: "#feedback",
  owner: "Maya",
  typeCps: 32,
} as const;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

const sec = (s: number) => Math.round(s * FPS);

// Beat sheet. Total 52.5s — the Workflow diagram beat was cut, the packet
// follows the report directly, and the Owner beat ends on the approved
// Slack message (no smash cut back to Acme).
export const BEATS = {
  arrive: { from: sec(0), duration: sec(4) },
  confusion: { from: sec(4), duration: sec(7) },
  report: { from: sec(11), duration: sec(7.5) },
  packet: { from: sec(18.5), duration: sec(8) },
  agent: { from: sec(26.5), duration: sec(15) },
  owner: { from: sec(41.5), duration: sec(5) },
  endcard: { from: sec(46.5), duration: sec(6) },
} as const;

export const TOTAL_FRAMES = BEATS.endcard.from + BEATS.endcard.duration;

// ————— Palette —————

// x.ai design language, light mode: stark white canvas, near-black ink,
// alpha-black hierarchy, hairline borders, mono labels, dot-grid accents.
export const acme = {
  paper: "#FCFCFC",
  card: "#FFFFFF",
  ink: "#0A0A0A",
  muted: "rgba(0, 0, 0, 0.62)",
  faint: "rgba(0, 0, 0, 0.40)",
  border: "rgba(0, 0, 0, 0.12)",
  divider: "rgba(0, 0, 0, 0.07)",
  hover: "rgba(0, 0, 0, 0.04)",
  selection: "rgba(64, 128, 235, 0.32)",
  accent: "#000000",
  statuses: {
    Paid: { fg: "#0F7B3D", bg: "rgba(22, 163, 74, 0.10)" },
    Sent: { fg: "#1D5FC2", bg: "rgba(37, 99, 235, 0.09)" },
    Draft: { fg: "rgba(0, 0, 0, 0.55)", bg: "rgba(0, 0, 0, 0.06)" },
    Overdue: { fg: "#C03A2B", bg: "rgba(220, 68, 50, 0.10)" },
  },
} as const;

// Slack, light theme.
export const slack = {
  bg: "#FFFFFF",
  text: "#1D1C1D",
  dim: "#616061",
  border: "#DDDDDD",
  link: "#1264A3",
  green: "#007A5A",
  greenHover: "#00644A",
  buttonBorder: "#BBBABB",
  code: "#E01E5A",
  codeBg: "#F6F6F6",
  codeBorder: "rgba(29, 28, 29, 0.16)",
} as const;

// Agent console / end card, light. White panel, docs-style code colors.
export const dark = {
  bg: "#FCFCFC",
  panel: "#FFFFFF",
  panelBorder: "rgba(0, 0, 0, 0.12)",
  text: "#1A1A1A",
  dim: "rgba(0, 0, 0, 0.55)",
  faint: "rgba(0, 0, 0, 0.38)",
  green: "#1A7F37",
  greenBg: "rgba(26, 127, 55, 0.09)",
  red: "#CF222E",
  redBg: "rgba(207, 34, 46, 0.07)",
  blue: "#0969DA",
  prompt: "#1A7F37",
} as const;

export const fonts = {
  ui: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  mono: '"SF Mono", ui-monospace, Menlo, Monaco, "Cascadia Mono", monospace',
} as const;

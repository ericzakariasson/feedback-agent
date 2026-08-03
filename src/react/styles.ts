export const STYLE_ID = "feedback-agent-styles";

export const WIDGET_CSS = `
:host {
  display: block;
  width: 0;
  height: 0;
  overflow: visible;
  color-scheme: light;
  font-family: Inter, "Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 16px;
  font-weight: 400;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  color: #000000;
  --fw-font: Inter, "Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --fw-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --fw-fs-title: 18px;
  --fw-fs-body: 16px;
  --fw-fs-control: 14px;
  --fw-fs-meta: 13px;
  --fw-fs-mono: 12px;
  --fw-bg: light-dark(#ffffff, #000000);
  --fw-elevated: light-dark(#ffffff, #171717);
  --fw-fg: light-dark(#000000, #ffffff);
  --fw-muted: light-dark(rgb(0 0 0 / 68%), rgb(255 255 255 / 72%));
  --fw-faint: light-dark(rgb(0 0 0 / 48%), rgb(255 255 255 / 52%));
  --fw-border: light-dark(rgb(0 0 0 / 10%), rgb(255 255 255 / 12%));
  --fw-border-strong: light-dark(rgb(0 0 0 / 18%), rgb(255 255 255 / 32%));
  --fw-hover: light-dark(rgb(0 0 0 / 5%), rgb(255 255 255 / 6%));
  --fw-pressed: light-dark(rgb(0 0 0 / 9%), rgb(255 255 255 / 10%));
  --fw-scrim: light-dark(rgb(0 0 0 / 44%), rgb(0 0 0 / 60%));
  --fw-accent: light-dark(#000000, #ffffff);
  --fw-accent-contrast: light-dark(#ffffff, #000000);
  --fw-danger: light-dark(#b42318, #f97066);
  --fw-shadow: 0 1px 2px light-dark(rgb(0 0 0 / 6%), rgb(0 0 0 / 40%));
  --fw-well: light-dark(rgb(0 0 0 / 4%), rgb(255 255 255 / 5%));
  --fw-radius: 10px;
  --fw-radius-sm: 8px;
  --fw-control-radius: 8px;
  --fw-z: 2147483000;
  --fw-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --fw-ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
  --fw-duration: 200ms;
  --fw-duration-exit: 150ms;
}
:host([data-fw-scheme="dark"]) { color-scheme: dark; color: #ffffff; }
.fw-shadow-mount { display: contents; }
.fw-root {
  color: var(--fw-fg);
  font-family: var(--fw-font);
  font-size: 16px;
  font-weight: 400;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  text-align: start;
  text-transform: none;
  text-decoration: none;
  box-sizing: border-box;
}
.fw-root *, .fw-root *::before, .fw-root *::after { box-sizing: border-box; }
.fw-root button {
  appearance: none;
  -webkit-appearance: none;
}
.fw-root button.fw-trigger {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: var(--fw-z);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  border: 1px solid var(--fw-border-strong);
  border-radius: 999px;
  padding: 10px 14px;
  background: var(--fw-elevated);
  color: var(--fw-fg);
  font: 500 var(--fw-fs-control)/1 var(--fw-font);
  cursor: pointer;
  box-shadow: var(--fw-shadow), 0 8px 24px light-dark(rgb(0 0 0 / 8%), rgb(0 0 0 / 48%));
  transition: transform 130ms var(--fw-ease-out), background-color 140ms ease, border-color 140ms ease, color 140ms ease, box-shadow 140ms ease, opacity 140ms var(--fw-ease-out);
}
:host([data-fw-open="true"]) button.fw-trigger,
.fw-root[data-fw-open="true"] button.fw-trigger {
  opacity: 0;
  pointer-events: none;
  transform: scale(0.96);
}
@media (hover: hover) and (pointer: fine) {
  .fw-root button.fw-trigger:hover:not(:disabled) {
    background: color-mix(in srgb, var(--fw-fg) 6%, var(--fw-elevated));
    color: var(--fw-fg);
  }
}
.fw-root button.fw-trigger:active:not(:disabled) {
  transform: scale(0.97);
  background: color-mix(in srgb, var(--fw-fg) 10%, var(--fw-elevated));
  color: var(--fw-fg);
}
.fw-overlay {
  position: fixed;
  inset: 0;
  z-index: calc(var(--fw-z) + 1);
  background: var(--fw-scrim);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--fw-duration) var(--fw-ease-out);
}
.fw-overlay[data-state="open"] {
  opacity: 1;
  pointer-events: auto;
}
.fw-overlay[data-state="closed"] {
  opacity: 0;
  pointer-events: none;
  transition-duration: var(--fw-duration-exit);
}
.fw-panel {
  position: relative;
  width: 100%;
  max-height: min(720px, 92dvh);
  overflow: auto;
  background: var(--fw-bg);
  color: var(--fw-fg);
  border: 1px solid var(--fw-border);
  border-bottom: 0;
  border-radius: var(--fw-radius) var(--fw-radius) 0 0;
  box-shadow: var(--fw-shadow);
  padding: 16px 16px max(16px, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 12px;
  transform-origin: center;
  opacity: 0;
  transform: translate3d(0, 100%, 0);
  transition:
    transform 240ms var(--fw-ease-drawer),
    opacity 160ms var(--fw-ease-out);
}
.fw-overlay[data-state="open"] .fw-panel {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
}
.fw-overlay[data-state="closed"] .fw-panel {
  opacity: 0;
  transform: translate3d(0, 100%, 0);
  transition-duration: var(--fw-duration-exit);
}
@media (min-width: 640px) {
  .fw-overlay {
    align-items: center;
    padding: 16px;
  }
  .fw-panel {
    width: min(440px, 100%);
    max-height: min(720px, 92vh);
    border: 1px solid var(--fw-border);
    border-radius: var(--fw-radius);
    padding: 16px;
    transform: translate3d(0, 8px, 0) scale(0.98);
    transition:
      transform var(--fw-duration) var(--fw-ease-out),
      opacity 160ms var(--fw-ease-out);
  }
  .fw-overlay[data-state="open"] .fw-panel {
    transform: translate3d(0, 0, 0) scale(1);
  }
  .fw-overlay[data-state="closed"] .fw-panel {
    transform: translate3d(0, 6px, 0) scale(0.98);
  }
}
.fw-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.fw-title {
  margin: 0;
  font: 600 var(--fw-fs-title)/1.25 var(--fw-font);
  letter-spacing: -0.02em;
  color: var(--fw-fg);
}
.fw-subtitle {
  margin: 8px 0 0;
  color: var(--fw-muted);
  font: 400 var(--fw-fs-body)/1.45 var(--fw-font);
  max-width: 34ch;
}
.fw-root button.fw-close {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: -6px -10px 0 0;
  border: 0;
  background: transparent;
  color: var(--fw-muted);
  cursor: pointer;
  padding: 0;
  border-radius: var(--fw-radius-sm);
  transition: background-color 140ms ease, color 140ms ease, transform 130ms var(--fw-ease-out);
}
.fw-root button.fw-close:active:not(:disabled) {
  transform: scale(0.97);
  background: var(--fw-pressed);
  color: var(--fw-fg);
}
@media (hover: hover) and (pointer: fine) {
  .fw-root button.fw-close:hover:not(:disabled) {
    background: var(--fw-hover);
    color: var(--fw-fg);
  }
}
.fw-close:focus-visible,
.fw-submit:focus-visible,
.fw-secondary:focus-visible,
.fw-debug:focus-visible,
.fw-player-play:focus-visible,
.fw-trigger:focus-visible,
.fw-gallery-open:focus-visible,
.fw-gallery-add:focus-visible,
.fw-gallery-add:focus-within,
.fw-gallery-remove:focus-visible {
  outline: 2px solid var(--fw-fg);
  outline-offset: 2px;
}
.fw-textarea {
  width: 100%;
  min-height: 104px;
  resize: vertical;
  border: 1px solid var(--fw-border);
  border-radius: var(--fw-control-radius);
  padding: 12px 14px;
  background: var(--fw-bg);
  color: var(--fw-fg);
  font: 400 var(--fw-fs-body)/1.45 var(--fw-font);
  transition: border-color 140ms ease;
}
.fw-textarea::placeholder { color: var(--fw-faint); }
.fw-textarea:focus {
  outline: none;
  border-color: var(--fw-fg);
}
.fw-textarea:disabled {
  color: var(--fw-faint);
  background: var(--fw-hover);
}
.fw-gallery {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  overflow-x: auto;
}
.fw-gallery-item,
.fw-gallery-add {
  position: relative;
  isolation: isolate;
  flex: 0 0 88px;
  width: 88px;
  height: 88px;
}
.fw-root button.fw-gallery-open,
.fw-gallery-add {
  display: block;
  width: 88px;
  height: 88px;
  margin: 0;
  padding: 0;
  border: 1px solid var(--fw-border);
  border-radius: var(--fw-radius-sm);
  background: var(--fw-well);
  overflow: hidden;
  cursor: zoom-in;
  transition: border-color 140ms ease, background-color 140ms ease, transform 130ms var(--fw-ease-out);
}
.fw-gallery-open img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  pointer-events: none;
  transition: opacity 140ms ease;
}
.fw-gallery-open:active,
.fw-gallery-add:active { transform: scale(0.98); }
@media (hover: hover) and (pointer: fine) {
  .fw-root button.fw-gallery-open:hover:not(:disabled),
  .fw-gallery-add:hover {
    border-color: var(--fw-border-strong);
    background: var(--fw-hover);
  }
}
.fw-root button.fw-gallery-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 999px;
  background: rgb(0 0 0 / 64%);
  color: #ffffff;
  box-shadow: 0 0 0 1px rgb(255 255 255 / 22%), 0 1px 2px rgb(0 0 0 / 28%);
  cursor: pointer;
  padding: 0;
  transition: transform 130ms var(--fw-ease-out), background-color 140ms ease;
}
.fw-root button.fw-gallery-remove::after {
  content: "";
  position: absolute;
  inset: -6px;
}
.fw-gallery-item:has(.fw-gallery-remove:hover) .fw-gallery-open img,
.fw-gallery-item:has(.fw-gallery-remove:active) .fw-gallery-open img {
  opacity: 0.78;
}
@media (hover: hover) and (pointer: fine) {
  .fw-root button.fw-gallery-remove:hover:not(:disabled) {
    background: rgb(0 0 0 / 88%);
    color: #ffffff;
    transform: scale(1.08);
  }
}
.fw-root button.fw-gallery-remove:active:not(:disabled) {
  transform: scale(0.92);
  background: rgb(0 0 0 / 92%);
}
.fw-gallery-add {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px;
  border-style: dashed;
  background: transparent;
  color: var(--fw-faint);
}
.fw-gallery-add input { display: none; }
.fw-gallery-plus {
  display: flex;
  color: var(--fw-faint);
}
.fw-gallery-add-label {
  font: 400 var(--fw-fs-meta)/1.2 var(--fw-font);
  color: var(--fw-muted);
}
button.fw-gallery-add {
  font: inherit;
  appearance: none;
  -webkit-appearance: none;
  color: var(--fw-faint);
}
.fw-lightbox {
  position: fixed;
  inset: 0;
  z-index: calc(var(--fw-z) + 3);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgb(0 0 0 / 72%);
}
.fw-lightbox-frame {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin: 0;
  width: min(960px, 100%);
  max-height: 100%;
}
.fw-lightbox-frame img {
  display: block;
  align-self: center;
  flex: 0 0 auto;
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: min(72vh, 720px);
  object-fit: contain;
  background: var(--fw-bg);
  border-radius: var(--fw-radius-sm);
}
.fw-lightbox-frame figcaption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  align-self: stretch;
  gap: 12px;
  color: rgb(255 255 255 / 78%);
  font: 400 var(--fw-fs-meta)/1.4 var(--fw-font);
}
.fw-lightbox-frame figcaption span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.fw-lightbox .fw-secondary {
  color: #ffffff;
  border-color: rgb(255 255 255 / 28%);
}
.fw-root button.fw-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--fw-border-strong);
  border-radius: 999px;
  min-width: 92px;
  min-height: 40px;
  padding: 10px 22px;
  background: transparent;
  color: var(--fw-fg);
  font: 500 var(--fw-fs-control)/1 var(--fw-font);
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease;
}
@media (hover: hover) and (pointer: fine) {
  .fw-root button.fw-secondary:hover:not(:disabled) {
    background: var(--fw-hover);
    border-color: var(--fw-border-strong);
  }
}
.fw-hint {
  color: var(--fw-muted);
  font: 400 var(--fw-fs-meta)/1.4 var(--fw-font);
  margin: 0;
}
.fw-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
.fw-count {
  margin: 0;
  color: var(--fw-muted);
  font: 400 var(--fw-fs-meta)/1.4 var(--fw-font);
  font-variant-numeric: tabular-nums;
}
.fw-view {
  display: flex;
  flex-direction: column;
  gap: 12px;
  opacity: 1;
  transform: translateY(0);
  transition: opacity 160ms var(--fw-ease-out), transform 160ms var(--fw-ease-out);
}
@starting-style {
  .fw-view {
    opacity: 0;
    transform: translateY(4px);
  }
}
.fw-error {
  color: var(--fw-danger);
  font: 500 var(--fw-fs-body)/1.45 var(--fw-font);
  margin: 0;
}
.fw-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 4px;
}
.fw-footer-split { justify-content: space-between; }
.fw-root button.fw-debug {
  border: 0;
  background: transparent;
  margin: 0 0 0 -8px;
  padding: 8px;
  border-radius: var(--fw-radius-sm);
  color: var(--fw-muted);
  font: 500 var(--fw-fs-control)/1 var(--fw-font);
  cursor: pointer;
}
@media (hover: hover) and (pointer: fine) {
  .fw-root button.fw-debug:hover:not(:disabled) {
    color: var(--fw-fg);
    background: transparent;
  }
}
.fw-root button.fw-debug:disabled {
  cursor: default;
  color: var(--fw-faint);
  background: transparent;
}
.fw-subtitle code,
.fw-hint code {
  font: 500 var(--fw-fs-meta)/1.4 var(--fw-mono);
}
.fw-inspect-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--fw-muted);
  font: 400 var(--fw-fs-meta)/1.4 var(--fw-font);
  cursor: pointer;
}
.fw-inspect-toggle input {
  margin: 0;
  accent-color: var(--fw-fg);
}
.fw-player {
  border: 1px solid var(--fw-border);
  border-radius: var(--fw-radius-sm);
  background: light-dark(#111111, #050505);
  overflow: hidden;
}
.fw-player-stage {
  position: relative;
  width: 100%;
  min-height: 120px;
  overflow: hidden;
  background: #111111;
}
.fw-player-stage .replayer-wrapper {
  position: relative;
}
.fw-player-stage iframe {
  border: 0;
  display: block;
  background: #ffffff;
  pointer-events: none;
}
.fw-player-stage .replayer-mouse {
  position: absolute;
  width: 20px;
  height: 20px;
  background-size: contain;
  background-repeat: no-repeat;
  background-image: url("data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MCA1MCI+PHBhdGggZD0iTTQ4LjcxLDQyLjkxTDM0LjA4LDI4LjI5LDQ0LjMzLDE4QTEsMSwwLDAsMCw0NCwxNi4zOUwyLjM1LDEuMDZBMSwxLDAsMCwwLDEuMDYsMi4zNUwxNi4zOSw0NGExLDEsMCwwLDAsMS42NS4zNkwyOC4yOSwzNC4wOCw0Mi45MSw0OC43MWExLDEsMCwwLDAsMS40MSwwbDQuMzgtNC4zOEExLDEsMCwwLDAsNDguNzEsNDIuOTFaIj48L3BhdGg+PC9zdmc+");
  pointer-events: none;
}
.fw-player-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--fw-bg);
  border-top: 1px solid var(--fw-border);
}
.fw-root button.fw-player-play {
  border: 0;
  background: transparent;
  color: var(--fw-fg);
  font: 500 var(--fw-fs-meta)/1 var(--fw-font);
  padding: 0;
  cursor: pointer;
}
.fw-player-scrub {
  flex: 1;
  min-width: 0;
  accent-color: var(--fw-fg);
}
.fw-player-time {
  flex: 0 0 auto;
  color: var(--fw-muted);
  font: 400 var(--fw-fs-mono)/1 var(--fw-mono);
}
.fw-inspect-json {
  margin: 0;
  max-height: min(220px, 32vh);
  overflow: auto;
  padding: 12px;
  border: 1px solid var(--fw-border);
  border-radius: var(--fw-radius-sm);
  background: var(--fw-well);
  color: var(--fw-fg);
  font: 400 var(--fw-fs-mono)/1.45 var(--fw-mono);
  white-space: pre-wrap;
  word-break: break-word;
}
.fw-root button.fw-submit {
  border: 1px solid transparent;
  border-radius: 999px;
  min-width: 92px;
  min-height: 40px;
  padding: 10px 22px;
  background: var(--fw-accent);
  color: var(--fw-accent-contrast);
  font: 500 var(--fw-fs-control)/1 var(--fw-font);
  cursor: pointer;
  transition: transform 130ms var(--fw-ease-out), background-color 140ms ease, box-shadow 140ms ease;
}
.fw-root button.fw-submit:active:not(:disabled) {
  transform: scale(0.97);
  background: light-dark(#1a1a1a, #f2f2f2);
}
@media (hover: hover) and (pointer: fine) {
  .fw-root button.fw-submit:hover:not(:disabled) {
    background: light-dark(#2e2e2e, #e8e8e8);
    color: var(--fw-accent-contrast);
    box-shadow: 0 1px 2px light-dark(rgb(0 0 0 / 18%), rgb(0 0 0 / 40%));
  }
}
.fw-root button.fw-submit:disabled {
  background: light-dark(rgb(0 0 0 / 18%), rgb(255 255 255 / 18%));
  color: light-dark(rgb(0 0 0 / 44%), rgb(255 255 255 / 44%));
  cursor: default;
  transform: none;
}
.fw-root button.fw-secondary:disabled {
  color: var(--fw-faint);
  border-color: var(--fw-border);
  cursor: default;
  background: transparent;
}
.fw-gallery-add:has(input:disabled),
.fw-gallery-add:disabled {
  pointer-events: none;
  opacity: 0.45;
}
.fw-compose[data-parked="true"] {
  visibility: hidden;
  pointer-events: none;
}
.fw-thanks {
  position: absolute;
  inset: 0;
  padding: inherit;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--fw-bg);
  opacity: 1;
  transition: opacity 160ms var(--fw-ease-out);
}
@starting-style {
  .fw-thanks {
    opacity: 0;
  }
}
.fw-thanks-copy {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  flex: 1 1 auto;
}
.fw-thanks p {
  margin: 0;
  color: var(--fw-muted);
  font: 400 var(--fw-fs-body)/1.45 var(--fw-font);
  max-width: 38ch;
}
.fw-thanks .fw-id,
.fw-id {
  min-height: calc(var(--fw-fs-mono) * 1.45 * 2);
  font: 400 var(--fw-fs-mono)/1.45 var(--fw-mono);
  color: var(--fw-faint);
  overflow-wrap: anywhere;
  word-break: break-word;
}
.fw-thanks .fw-footer {
  margin-top: auto;
}
@media (prefers-reduced-motion: reduce) {
  .fw-trigger,
  .fw-overlay,
  .fw-panel,
  .fw-close,
  .fw-secondary,
  .fw-submit,
  .fw-gallery-open,
  .fw-gallery-add,
  .fw-thanks,
  .fw-view {
    transition-duration: 0.01ms !important;
    animation: none !important;
  }
  .fw-panel,
  .fw-overlay[data-state="closed"] .fw-panel,
  .fw-trigger:hover,
  .fw-trigger:active,
  .fw-submit:active,
  .fw-gallery-add:active,
  .fw-close:active {
    transform: none;
  }
}
`;

export function ensureWidgetStyles(target: ShadowRoot | Document = document): void {
  if (typeof document === "undefined") return;
  const root: ParentNode = target instanceof Document ? target.head : target;
  const existing = root.querySelector<HTMLStyleElement>(`#${STYLE_ID}`);
  if (existing) {
    existing.textContent = WIDGET_CSS;
  } else {
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = WIDGET_CSS;
    root.appendChild(style);
  }
  if (!(target instanceof Document)) {
    document.getElementById(STYLE_ID)?.remove();
  }
}

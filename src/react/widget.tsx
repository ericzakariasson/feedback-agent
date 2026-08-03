import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type ReactNode,
  type TransitionEvent,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { CLIENT_LIMITS } from "../shared/limits";
import { shouldOfferDebug } from "./debug-mode";
import { useHostColorScheme } from "./host-scheme";
import { useFeedback } from "./hook";
import { ReplayPlayer } from "./replay-player";
import { ensureWidgetStyles } from "./styles";
import type { FeedbackWidgetProps } from "./types";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

const MESSAGE_COUNT_WARN_RATIO = 0.1;

function classnames(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => {
    if (el.closest("[inert]")) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  });
}

function inertOutside(el: HTMLElement): HTMLElement[] {
  const applied: HTMLElement[] = [];
  let node: HTMLElement | null = el;
  while (node && node !== document.body) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sibling of Array.from(parent.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement)) continue;
      if (sibling.hasAttribute("data-fw-inert")) continue;
      if (sibling.inert) continue;
      sibling.inert = true;
      sibling.setAttribute("data-fw-inert", "");
      sibling.setAttribute("aria-hidden", "true");
      applied.push(sibling);
    }
    node = parent;
  }
  return applied;
}

function deepActiveElement(): Element | null {
  let active: Element | null = document.activeElement;
  while (active instanceof HTMLElement && active.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement;
  }
  return active;
}

export function FeedbackWidget({
  title = "Feedback",
  placeholder = "Describe a bug or idea. What did you expect to happen?",
  triggerLabel = "Feedback",
  submitLabel = "Send",
  thanksTitle = "Thanks, we got it",
  thanksBody = "If the issue is clear, a coding agent will open a pull request.",
  debug,
  className,
  classNames,
  style,
}: FeedbackWidgetProps) {
  const {
    isOpen,
    open,
    close,
    message,
    setMessage,
    screenshots,
    addScreenshot,
    removeScreenshot,
    getDebugContext,
    getSession,
    status,
    error,
    feedbackId,
    submit,
    reset,
  } = useFeedback();
  const debugEnabled = shouldOfferDebug(debug);
  const hostScheme = useHostColorScheme();
  const titleId = useId();
  const subtitleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const shadowReactRootRef = useRef<Root | null>(null);
  const treeRef = useRef<ReactNode>(null);
  const [shadowReady, setShadowReady] = useState(false);
  const panelRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const lightboxCloseRef = useRef<HTMLButtonElement>(null);
  const previewSourceRef = useRef<HTMLButtonElement | null>(null);
  const [present, setPresent] = useState(isOpen);
  const [entered, setEntered] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [includeReplayEvents, setIncludeReplayEvents] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [replayEvents, setReplayEvents] = useState<unknown[]>([]);
  const enteredRef = useRef(false);
  const previewIdRef = useRef(previewId);
  const inspectingRef = useRef(inspecting);
  const submitting = status === "submitting";
  const canSend = message.trim().length > 0 && !submitting;
  const messageLimit = CLIENT_LIMITS.maxMessageChars;
  const showMessageCount =
    messageLimit - message.length <= Math.max(80, Math.round(messageLimit * MESSAGE_COUNT_WARN_RATIO));
  enteredRef.current = entered;
  previewIdRef.current = previewId;
  inspectingRef.current = inspecting;
  const preview = screenshots.find((shot) => shot.id === previewId) ?? null;
  const debugContext = debugEnabled && inspecting ? getDebugContext({ includeReplayEvents }) : null;
  const debugJson = debugContext ? JSON.stringify(debugContext, null, 2) : "";
  const overlayOpen = present && entered;

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    ensureWidgetStyles(shadow);
    let mount = shadow.querySelector<HTMLDivElement>(":scope > .fw-shadow-mount");
    if (!mount) {
      mount = document.createElement("div");
      mount.className = "fw-shadow-mount";
      shadow.appendChild(mount);
    }
    const root = createRoot(mount);
    shadowReactRootRef.current = root;
    setShadowReady(true);
    return () => {
      root.unmount();
      shadowReactRootRef.current = null;
      setShadowReady(false);
    };
  }, []);

  useLayoutEffect(() => {
    if (!shadowReady) return;
    shadowReactRootRef.current?.render(treeRef.current);
  });

  useEffect(() => {
    if (debugEnabled) return;
    setInspecting(false);
    setReplayEvents([]);
  }, [debugEnabled]);

  useEffect(() => {
    if (isOpen) {
      setPresent(true);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setEntered(true));
      });
      return () => cancelAnimationFrame(frame);
    }

    setEntered(false);
    setPreviewId(null);
    setInspecting(false);
    setCopied(false);
    setCopyError(false);
    setReplayEvents([]);
    if (!enteredRef.current) setPresent(false);
  }, [isOpen]);

  useEffect(() => {
    if (!overlayOpen || !hostRef.current) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const inerted = inertOutside(hostRef.current);
    return () => {
      document.body.style.overflow = previousOverflow;
      for (const node of inerted) {
        node.inert = false;
        node.removeAttribute("data-fw-inert");
        node.removeAttribute("aria-hidden");
      }
    };
  }, [overlayOpen]);

  useEffect(() => {
    if (!isOpen || !entered) return;
    const previousActive = deepActiveElement();
    const previous = previousActive instanceof HTMLElement ? previousActive : null;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (previewIdRef.current) {
          event.stopPropagation();
          event.preventDefault();
          setPreviewId(null);
          queueMicrotask(() => previewSourceRef.current?.focus());
          return;
        }
        if (inspectingRef.current) {
          event.stopPropagation();
          event.preventDefault();
          setInspecting(false);
          return;
        }
        close();
        return;
      }

      if (event.key !== "Tab") return;
      const root = previewIdRef.current ? lightboxRef.current : panelRef.current;
      const items = focusables(root);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const active = deepActiveElement();
      if (event.shiftKey && (active === first || !root?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !root?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      if (
        previous?.isConnected &&
        !hostRef.current?.contains(previous) &&
        !rootRef.current?.contains(previous)
      ) {
        previous.focus();
      } else triggerRef.current?.focus();
    };
  }, [isOpen, entered, close]);

  useEffect(() => {
    if (!isOpen || !entered) return;
    if (preview) {
      lightboxCloseRef.current?.focus();
      return;
    }
    if (inspecting) {
      panelRef.current?.querySelector<HTMLElement>(".fw-debug")?.focus();
      return;
    }
    if (status === "success") {
      panelRef.current?.querySelector<HTMLElement>(".fw-submit")?.focus();
      return;
    }
    textareaRef.current?.focus();
  }, [isOpen, entered, preview, inspecting, status]);

  const onOverlayTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "opacity") return;
    if (!isOpen) setPresent(false);
  };

  const onFiles = async (files: FileList | File[] | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (file.type.startsWith("image/")) await addScreenshot(file, file.name);
    }
  };

  const onPaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          event.preventDefault();
          await addScreenshot(file, file.name || "pasted-image.png");
        }
      }
    }
  };

  const tree = (
    <div
      ref={rootRef}
      className={classnames("fw-root", classNames?.root)}
      data-fw-scheme={hostScheme}
      data-fw-open={overlayOpen ? "true" : "false"}
      onPaste={onPaste}
    >
      <button
        ref={triggerRef}
        type="button"
        className={classnames("fw-trigger", classNames?.trigger)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-hidden={overlayOpen || undefined}
        tabIndex={overlayOpen ? -1 : undefined}
        onClick={() => (isOpen ? close() : open())}
      >
        <ChatIcon />
        {triggerLabel}
      </button>

      {present ? (
        <div
          className={classnames("fw-overlay", classNames?.overlay)}
          data-state={entered ? "open" : "closed"}
          onTransitionEnd={onOverlayTransitionEnd}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !previewId) close();
          }}
        >
          <section
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={status === "success" || inspecting ? undefined : subtitleId}
            aria-hidden={preview ? true : undefined}
            className={classnames("fw-panel", classNames?.panel)}
          >
            {debugEnabled && inspecting && status !== "success" ? (
              <div className="fw-view">
                <div className={classnames("fw-header", classNames?.header)}>
                  <div>
                    <h2 id={titleId} className={classnames("fw-title", classNames?.title)}>
                      Context
                    </h2>
                    <p className="fw-subtitle">
                      Replay and browser payload. Server <code>enrich()</code> is added after POST.
                    </p>
                  </div>
                </div>
                <ReplayPlayer events={replayEvents} />
                <label className="fw-inspect-toggle">
                  <input
                    type="checkbox"
                    checked={includeReplayEvents}
                    onChange={(event) => setIncludeReplayEvents(event.target.checked)}
                  />
                  Include rrweb events
                </label>
                <pre className="fw-inspect-json">{debugJson}</pre>
                {copyError ? (
                  <p className="fw-error" role="alert">
                    Could not copy. Select the JSON and copy it manually.
                  </p>
                ) : null}
                <div className="fw-footer fw-footer-split">
                  <button type="button" className="fw-debug" onClick={() => setInspecting(false)}>
                    Back
                  </button>
                  <button
                    type="button"
                    className={classnames("fw-secondary", classNames?.secondary)}
                    onClick={() => {
                      void (async () => {
                        try {
                          await navigator.clipboard.writeText(debugJson);
                          setCopied(true);
                          setCopyError(false);
                          window.setTimeout(() => setCopied(false), 1400);
                        } catch {
                          setCopied(false);
                          setCopyError(true);
                        }
                      })();
                    }}
                  >
                    {copied ? "Copied" : "Copy JSON"}
                  </button>
                </div>
              </div>
            ) : (
              <>
              <div
                className="fw-view fw-compose"
                data-parked={status === "success" ? "true" : undefined}
                aria-hidden={status === "success" || undefined}
              >
                <div className={classnames("fw-header", classNames?.header)}>
                  <div>
                    <h2 id={status === "success" ? undefined : titleId} className={classnames("fw-title", classNames?.title)}>
                      {title}
                    </h2>
                    <p id={subtitleId} className="fw-subtitle">
                      What's not working, or what could be better?
                    </p>
                  </div>
                  <button
                    type="button"
                    className={classnames("fw-close", classNames?.close)}
                    aria-label="Close feedback"
                    onClick={close}
                  >
                    <CloseIcon />
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  className={classnames("fw-textarea", classNames?.textarea)}
                  placeholder={placeholder}
                  value={message}
                  maxLength={messageLimit}
                  disabled={submitting}
                  onChange={(event) => setMessage(event.target.value)}
                />
                <div className={classnames("fw-gallery", classNames?.screenshots)}>
                  {screenshots.map((shot) => (
                    <div key={shot.id} className={classnames("fw-gallery-item", classNames?.thumbnail)}>
                      <button
                        type="button"
                        className="fw-gallery-open"
                        aria-label={`View ${shot.name}`}
                        onClick={(event) => {
                          previewSourceRef.current = event.currentTarget;
                          setPreviewId(shot.id);
                        }}
                      >
                        <img src={shot.url} alt="" />
                      </button>
                      <button
                        type="button"
                        className="fw-gallery-remove"
                        aria-label={`Remove ${shot.name}`}
                        onClick={() => {
                          if (previewId === shot.id) setPreviewId(null);
                          removeScreenshot(shot.id);
                        }}
                      >
                        <CloseIcon size={12} />
                      </button>
                    </div>
                  ))}
                  {screenshots.length < CLIENT_LIMITS.maxScreenshots ? (
                    <label className={classnames("fw-gallery-add", classNames?.actions)}>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        multiple
                        disabled={submitting}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => {
                          void onFiles(event.target.files);
                          event.target.value = "";
                        }}
                      />
                      <span className="fw-gallery-plus" aria-hidden="true">
                        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                          <rect x="2.25" y="3.75" width="17.5" height="14.5" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="8" cy="9" r="1.5" fill="currentColor" />
                          <path d="M3.5 15.25 8 11.25l3.25 2.75 2.75-2.5 4.5 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span className="fw-gallery-add-label">Upload</span>
                    </label>
                  ) : null}
                </div>
                <div className="fw-meta">
                  <p className="fw-hint">Upload or paste a screenshot.</p>
                  {showMessageCount ? (
                    <p className="fw-count" aria-live="polite">
                      {message.length}/{messageLimit}
                    </p>
                  ) : null}
                </div>
                {error ? (
                  <p className={classnames("fw-error", classNames?.error)} role="alert">
                    {error}
                  </p>
                ) : null}
                <div className={classnames("fw-footer", debugEnabled && "fw-footer-split")}>
                  {debugEnabled ? (
                    <button
                      type="button"
                      className="fw-debug"
                      disabled={submitting}
                      onClick={() => {
                        setCopied(false);
                        setCopyError(false);
                        setReplayEvents(getSession()?.replay?.events ?? []);
                        setInspecting(true);
                      }}
                    >
                      Inspect
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className={classnames("fw-submit", classNames?.submit)}
                    disabled={!canSend}
                    onClick={() => void submit()}
                  >
                    {submitting ? "Sending…" : submitLabel}
                  </button>
                </div>
              </div>
              {status === "success" ? (
                <div className={classnames("fw-thanks", classNames?.thanks)}>
                  <div className={classnames("fw-header", classNames?.header)}>
                    <h2 id={titleId} className={classnames("fw-title", classNames?.title)}>
                      {thanksTitle}
                    </h2>
                    <button
                      type="button"
                      className={classnames("fw-close", classNames?.close)}
                      aria-label="Close"
                      onClick={close}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                  <div className="fw-thanks-copy">
                    <p>{thanksBody}</p>
                    <p className="fw-id">{feedbackId ? `Reference: ${feedbackId}` : "\u00a0"}</p>
                  </div>
                  <div className="fw-footer">
                    <button
                      type="button"
                      className={classnames("fw-secondary", classNames?.secondary)}
                      onClick={() => {
                        reset();
                      }}
                    >
                      Send another
                    </button>
                    <button
                      type="button"
                      className={classnames("fw-submit", classNames?.submit)}
                      onClick={close}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : null}
              </>
            )}
          </section>
        </div>
      ) : null}

      {preview ? (
        <div
          ref={lightboxRef}
          className="fw-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Screenshot preview"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPreviewId(null);
              queueMicrotask(() => previewSourceRef.current?.focus());
            }
          }}
        >
          <figure className="fw-lightbox-frame">
            <img src={preview.url} alt={preview.name} />
            <figcaption>
              <span>{preview.name}</span>
              <button
                ref={lightboxCloseRef}
                type="button"
                className="fw-secondary"
                onClick={() => {
                  setPreviewId(null);
                  queueMicrotask(() => previewSourceRef.current?.focus());
                }}
              >
                Close
              </button>
            </figcaption>
          </figure>
        </div>
      ) : null}
    </div>
  );
  treeRef.current = tree;

  return (
    <div
      ref={hostRef}
      className={className}
      style={style}
      data-feedback-agent=""
      data-fw-scheme={hostScheme}
      data-fw-open={overlayOpen ? "true" : "false"}
    />
  );
}

function ChatIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.25 2.75h9.5A1.25 1.25 0 0 1 14 4v6a1.25 1.25 0 0 1-1.25 1.25H8.1L5.2 13.85a.4.4 0 0 1-.7-.27V11.25H3.25A1.25 1.25 0 0 1 2 10V4A1.25 1.25 0 0 1 3.25 2.75Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.75 3.75 12.25 12.25M12.25 3.75 3.75 12.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

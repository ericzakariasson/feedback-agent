import { CLIENT_LIMITS } from "../../shared/limits";
import { redactText, redactUnknown } from "../../shared/redact";
import { compactReplayEvents } from "../../shared/replay";
import type {
  Breadcrumb,
  SessionBundle,
  SessionError,
  UrlEntry,
} from "../../shared/types";

export interface CaptureOptions {
  windowMs?: number
  recordReplay?: boolean
  maskInputs?: boolean
  consoleErrors?: boolean
  appVersion?: string
}

const MAX_BREADCRUMBS = 100;
const MAX_ERRORS = 40;
const MAX_URLS = 30;

function nowIso(ts = Date.now()): string {
  return new Date(ts).toISOString();
}

function cssPath(el: Element): string {
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && parts.length < 4) {
    const tag = node.tagName.toLowerCase();
    const id = node.id ? `#${node.id}` : "";
    const cls = typeof node.className === "string" && node.className.trim()
      ? `.${node.className.trim().split(/\s+/).slice(0, 2).join(".")}`
      : "";
    parts.unshift(`${tag}${id}${cls}`);
    node = node.parentElement;
  }
  return parts.join(" > ");
}

function clickLabel(el: Element): string | undefined {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    return undefined;
  }
  const labeled =
    el.getAttribute("aria-label") ||
    (el instanceof HTMLElement ? el.innerText : "") ||
    el.getAttribute("title") ||
    el.getAttribute("name");
  if (!labeled) return undefined;
  return redactText(labeled.replace(/\s+/g, " ").trim(), 80);
}

export class SessionCapture {
  readonly id: string;
  readonly startedAt: number;
  private readonly windowMs: number;
  private readonly recordReplay: boolean;
  private readonly maskInputs: boolean;
  private readonly consoleErrors: boolean;
  private readonly appVersion?: string;
  private breadcrumbs: Breadcrumb[] = [];
  private errors: SessionError[] = [];
  private urlHistory: UrlEntry[] = [];
  private replayEvents: { timestamp: number; event: unknown }[] = [];
  private stopReplay: (() => void) | null = null;
  private unsubs: Array<() => void> = [];
  private started = false;

  constructor(options: CaptureOptions = {}) {
    this.id = createId();
    this.startedAt = Date.now();
    this.windowMs = options.windowMs ?? CLIENT_LIMITS.captureWindowMs;
    this.recordReplay = options.recordReplay ?? true;
    this.maskInputs = options.maskInputs ?? true;
    this.consoleErrors = options.consoleErrors ?? false;
    this.appVersion = options.appVersion;
  }

  start(): void {
    if (this.started || typeof window === "undefined") return;
    this.started = true;
    this.pushUrl(window.location.href);
    this.watchNavigation();
    this.watchClicks();
    this.watchErrors();
    if (this.consoleErrors) this.watchConsole();
    if (this.recordReplay) void this.startReplay();
  }

  stop(): void {
    for (const unsub of this.unsubs) unsub();
    this.unsubs = [];
    this.stopReplay?.();
    this.stopReplay = null;
    this.started = false;
  }

  clear(): void {
    this.breadcrumbs = [];
    this.errors = [];
    this.urlHistory = [];
    this.replayEvents = [];
  }

  track(name: string, props?: Record<string, unknown>): void {
    this.pushBreadcrumb({
      type: "track",
      timestamp: nowIso(),
      name: redactText(name, 80),
      data: props ? (redactUnknown(props) as Record<string, unknown>) : undefined,
    });
  }

  snapshot(): SessionBundle {
    this.trim(Date.now());
    const rawEvents = this.replayEvents.map((entry) => entry.event);
    const replayEvents = compactReplayEvents(rawEvents);
    const truncated = rawEvents.length > replayEvents.length;
    return {
      id: this.id,
      startedAt: nowIso(this.startedAt),
      capturedAt: nowIso(),
      windowMs: this.windowMs,
      href: typeof window === "undefined" ? "" : window.location.href,
      urlHistory: this.urlHistory.slice(-MAX_URLS),
      breadcrumbs: this.breadcrumbs.slice(-MAX_BREADCRUMBS),
      errors: this.errors.slice(-MAX_ERRORS),
      replay: replayEvents.length
        ? {
            format: "rrweb",
            events: replayEvents,
            eventCount: replayEvents.length,
            truncated,
          }
        : undefined,
      metadata: this.metadata(),
    };
  }

  private metadata() {
    const viewport =
      typeof window === "undefined"
        ? { width: 0, height: 0 }
        : { width: window.innerWidth, height: window.innerHeight };
    return {
      viewport,
      locale: typeof navigator === "undefined" ? undefined : navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userAgent: typeof navigator === "undefined" ? undefined : navigator.userAgent,
      appVersion: this.appVersion,
      platform: typeof navigator === "undefined" ? undefined : navigator.platform,
    };
  }

  private pushBreadcrumb(crumb: Breadcrumb): void {
    this.breadcrumbs.push(crumb);
    if (this.breadcrumbs.length > MAX_BREADCRUMBS * 2) this.trim(Date.now());
  }

  private pushError(error: SessionError): void {
    this.errors.push(error);
    this.pushBreadcrumb({
      type: "error",
      timestamp: error.timestamp,
      message: error.message,
    });
    if (this.errors.length > MAX_ERRORS * 2) this.trim(Date.now());
  }

  private pushUrl(href: string): void {
    const last = this.urlHistory.at(-1);
    if (last?.href === href) return;
    this.urlHistory.push({
      href,
      title: typeof document === "undefined" ? undefined : document.title,
      timestamp: nowIso(),
    });
    this.pushBreadcrumb({
      type: "navigation",
      timestamp: nowIso(),
      href,
      message: typeof document === "undefined" ? href : document.title || href,
    });
  }

  private trim(now: number): void {
    const cutoff = now - this.windowMs;
    this.breadcrumbs = this.breadcrumbs.filter(
      (item) => Date.parse(item.timestamp) >= cutoff,
    );
    this.errors = this.errors.filter((item) => Date.parse(item.timestamp) >= cutoff);
    this.urlHistory = this.urlHistory.filter((item) => Date.parse(item.timestamp) >= cutoff);
    this.replayEvents = this.replayEvents.filter((item) => item.timestamp >= cutoff);
    if (this.replayEvents.length > CLIENT_LIMITS.maxReplayEvents * 1.5) {
      this.replayEvents = compactReplayEvents(
        this.replayEvents.map((entry) => entry.event),
        CLIENT_LIMITS.maxReplayEvents,
      ).map((event) => ({
        timestamp:
          typeof event === "object" && event && "timestamp" in event
            ? Number((event as { timestamp?: number }).timestamp) || now
            : now,
        event,
      }));
    }
  }

  private watchNavigation(): void {
    const onPop = () => this.pushUrl(window.location.href);
    window.addEventListener("popstate", onPop);
    window.addEventListener("hashchange", onPop);
    this.unsubs.push(() => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("hashchange", onPop);
    });

    const wrap = (method: "pushState" | "replaceState") => {
      const original = history[method];
      history[method] = (...args: Parameters<History["pushState"]>) => {
        const result = original.apply(history, args);
        this.pushUrl(window.location.href);
        return result;
      };
      this.unsubs.push(() => {
        history[method] = original;
      });
    };
    wrap("pushState");
    wrap("replaceState");
  }

  private watchClicks(): void {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (isInsideFeedbackWidget(target)) return;
      const clickable = target.closest("a,button,[role='button'],input[type='submit'],summary");
      if (!clickable) return;
      this.pushBreadcrumb({
        type: "click",
        timestamp: nowIso(),
        name: clickable.tagName.toLowerCase(),
        message: clickLabel(clickable),
        href: clickable instanceof HTMLAnchorElement ? clickable.href : undefined,
        data: {
          path: cssPath(clickable),
          role: clickable.getAttribute("role") ?? undefined,
        },
      });
    };
    document.addEventListener("click", onClick, true);
    this.unsubs.push(() => document.removeEventListener("click", onClick, true));
  }

  private watchErrors(): void {
    const onError = (event: ErrorEvent) => {
      if (isInsideFeedbackWidget(event.target)) return;
      this.pushError({
        timestamp: nowIso(),
        type: "error",
        message: redactText(event.message || "window error", 500),
        stack: event.error instanceof Error ? redactText(event.error.stack ?? "", 1_500) : undefined,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isInsideFeedbackWidget(document.activeElement)) return;
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "unhandledrejection";
      const stack = reason instanceof Error ? reason.stack : undefined;
      this.pushError({
        timestamp: nowIso(),
        type: "unhandledrejection",
        message: redactText(message, 500),
        stack: stack ? redactText(stack, 1_500) : undefined,
      });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    this.unsubs.push(() => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    });
  }

  private watchConsole(): void {
    const original = console.error;
    console.error = (...args: unknown[]) => {
      const message = args
        .map((arg) => (typeof arg === "string" ? arg : safeStringify(arg)))
        .join(" ");
      this.pushError({
        timestamp: nowIso(),
        type: "console",
        message: redactText(message, 500),
      });
      return original.apply(console, args);
    };
    this.unsubs.push(() => {
      console.error = original;
    });
  }

  private async startReplay(): Promise<void> {
    try {
      const { record } = await import("@rrweb/record");
      this.stopReplay = record({
        emit: (event) => {
          const timestamp =
            typeof event === "object" && event && "timestamp" in event
              ? Number((event as { timestamp?: number }).timestamp) || Date.now()
              : Date.now();
          this.replayEvents.push({ timestamp, event });
          if (this.replayEvents.length > CLIENT_LIMITS.maxReplayEvents * 1.5) {
            this.trim(Date.now());
          }
        },
        maskAllInputs: this.maskInputs,
        maskInputOptions: {
          password: true,
          email: true,
          tel: true,
        },
        blockSelector: "video,audio,[data-fw-block],[data-feedback-agent]",
        inlineStylesheet: false,
        collectFonts: false,
        recordCanvas: false,
        checkoutEveryNms: 10_000,
        slimDOMOptions: true,
        sampling: {
          mousemove: false,
          mouseInteraction: {
            MouseUp: false,
            MouseDown: false,
            Click: true,
            ContextMenu: true,
            DblClick: true,
            Focus: false,
            Blur: false,
            TouchStart: true,
            TouchEnd: true,
            TouchCancel: false,
          },
          scroll: 150,
          input: "last",
        },
      }) ?? null;
    } catch {
      this.stopReplay = null;
    }
  }
}

function isInsideFeedbackWidget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-feedback-agent]")) return true;
  const root = target.getRootNode();
  return root instanceof ShadowRoot && root.host instanceof Element
    ? Boolean(root.host.closest("[data-feedback-agent]"))
    : false;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(redactUnknown(value)) ?? "";
  } catch {
    return "[unserializable]";
  }
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `fw_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

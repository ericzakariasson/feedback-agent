import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ALLOWED_IMAGE_TYPES, CLIENT_LIMITS, DEFAULT_LIMITS } from "../shared/limits";
import type { AllowedImageType, FeedbackPayload, ScreenshotPayload } from "../shared/types";
import { SessionCapture } from "./capture/session";
import { FeedbackContext, type FeedbackStatus } from "./context";
import { buildDebugContext } from "./preview";
import type { FeedbackProviderProps, ScreenshotItem } from "./types";

function isAllowedType(type: string): type is AllowedImageType {
  return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

async function readDimensions(blob: Blob): Promise<{ width?: number; height?: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob);
      const size = { width: bitmap.width, height: bitmap.height };
      bitmap.close();
      return size;
    } catch {
      return {};
    }
  }
  return {};
}

async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function newId(): string {
  return crypto.randomUUID?.() ?? `fw_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function FeedbackProvider({
  endpoint,
  children,
  appVersion,
  capture,
}: FeedbackProviderProps): ReactNode {
  const captureRef = useRef<SessionCapture | null>(null);
  const screenshotsRef = useRef<ScreenshotItem[]>([]);
  const [isOpen, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [status, setStatus] = useState<FeedbackStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  screenshotsRef.current = screenshots;

  useEffect(() => {
    const session = new SessionCapture({
      appVersion,
      windowMs: capture?.windowMs,
      recordReplay: capture?.recordReplay,
      maskInputs: capture?.maskInputs,
      consoleErrors: capture?.consoleErrors,
    });
    captureRef.current = session;
    session.start();
    return () => {
      session.stop();
      captureRef.current = null;
    };
  }, [
    appVersion,
    capture?.windowMs,
    capture?.recordReplay,
    capture?.maskInputs,
    capture?.consoleErrors,
  ]);

  useEffect(() => {
    return () => {
      for (const shot of screenshots) URL.revokeObjectURL(shot.url);
    };
    // only on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = useCallback(() => {
    setOpen(true);
    if (status === "success") {
      setStatus("idle");
      setFeedbackId(null);
      setError(null);
    }
  }, [status]);

  const close = useCallback(() => setOpen(false), []);

  const track = useCallback((name: string, props?: Record<string, unknown>) => {
    captureRef.current?.track(name, props);
  }, []);

  const addScreenshot = useCallback(async (file: Blob, name?: string) => {
    if (!isAllowedType(file.type || "image/png")) {
      setError("Screenshots must be PNG, JPEG, GIF, or WebP.");
      setStatus("error");
      return;
    }
    if (file.size > CLIENT_LIMITS.maxScreenshotBytes) {
      setError("Each screenshot must be 2 MB or smaller.");
      setStatus("error");
      return;
    }

    if (screenshotsRef.current.length >= CLIENT_LIMITS.maxScreenshots) {
      setError(`You can attach up to ${CLIENT_LIMITS.maxScreenshots} screenshots.`);
      setStatus("error");
      return;
    }

    const dims = await readDimensions(file);
    const item: ScreenshotItem = {
      id: newId(),
      name: name || (file instanceof File ? file.name : "screenshot.png"),
      mimeType: file.type || "image/png",
      blob: file,
      url: URL.createObjectURL(file),
      ...dims,
    };
    setScreenshots((current) => {
      if (current.length >= CLIENT_LIMITS.maxScreenshots) {
        URL.revokeObjectURL(item.url);
        return current;
      }
      return [...current, item];
    });
    setError(null);
    setStatus((currentStatus) => (currentStatus === "error" ? "idle" : currentStatus));
  }, []);

  const removeScreenshot = useCallback((id: string) => {
    setScreenshots((current) => {
      const found = current.find((item) => item.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return current.filter((item) => item.id !== id);
    });
  }, []);

  const captureScreenshot = useCallback(async () => {
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(document.documentElement, {
        cacheBust: true,
        pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        filter: (node) => {
          if (!(node instanceof HTMLElement)) return true;
          return !node.closest("[data-feedback-agent]");
        },
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      await addScreenshot(blob, `viewport-${new Date().toISOString()}.png`);
    } catch {
      setError("Could not capture this page. Try uploading or pasting a screenshot.");
      setStatus("error");
    }
  }, [addScreenshot]);

  const getSession = useCallback(() => captureRef.current?.snapshot() ?? null, []);

  const getDebugContext = useCallback(
    (options?: { includeReplayEvents?: boolean }) => {
      return buildDebugContext({
        endpoint,
        message: message.trim(),
        screenshots: screenshots.map((item) => ({
          name: item.name,
          mimeType: item.mimeType,
          bytes: item.blob.size,
          width: item.width,
          height: item.height,
        })),
        session: captureRef.current?.snapshot() ?? null,
        includeReplayEvents: options?.includeReplayEvents,
      });
    },
    [endpoint, message, screenshots],
  );

  const reset = useCallback(() => {
    setMessage("");
    setScreenshots((current) => {
      for (const item of current) URL.revokeObjectURL(item.url);
      return [];
    });
    setStatus("idle");
    setError(null);
    setFeedbackId(null);
  }, []);

  const submit = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Please add a short description.");
      setStatus("error");
      return;
    }
    if (trimmed.length > CLIENT_LIMITS.maxMessageChars) {
      setError(`Please keep feedback under ${CLIENT_LIMITS.maxMessageChars.toLocaleString()} characters.`);
      setStatus("error");
      return;
    }
    const session = captureRef.current?.snapshot();
    if (!session) {
      setError("Session capture is not running.");
      setStatus("error");
      return;
    }

    setStatus("submitting");
    setError(null);
    const eventId = newId();

    try {
      const shots: ScreenshotPayload[] = [];
      for (const item of screenshots) {
        shots.push({
          name: item.name,
          mimeType: item.mimeType as AllowedImageType,
          data: await blobToBase64(item.blob),
          width: item.width,
          height: item.height,
        });
      }

      if (shots.length === 0) {
        try {
          const { captureViewportPayload } = await import("./capture/viewport");
          const viewport = await captureViewportPayload();
          if (viewport) shots.push(viewport);
        } catch {
          /* viewport is best-effort */
        }
      }
      if (shots.length < DEFAULT_LIMITS.maxScreenshots) {
        try {
          const { buildReplayCollage } = await import("./capture/collage");
          const collage = await buildReplayCollage(session);
          if (collage) shots.push(collage);
        } catch {
          /* collage is best-effort */
        }
      }

      const payload: FeedbackPayload = {
        eventId,
        sessionId: session.id,
        message: trimmed,
        screenshots: shots,
        session,
        submittedAt: new Date().toISOString(),
      };

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as
        | { ok?: boolean; feedbackId?: string; error?: string }
        | null;

      if (!response.ok || !body?.ok) {
        throw new Error(body?.error || `Request failed (${response.status})`);
      }

      setFeedbackId(body.feedbackId ?? eventId);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not send feedback.");
    }
  }, [endpoint, message, screenshots]);

  const value = useMemo(
    () => ({
      endpoint,
      isOpen,
      open,
      close,
      message,
      setMessage,
      screenshots,
      addScreenshot,
      removeScreenshot,
      captureScreenshot,
      getDebugContext,
      getSession,
      status,
      error,
      feedbackId,
      submit,
      track,
      reset,
    }),
    [
      endpoint,
      isOpen,
      open,
      close,
      message,
      screenshots,
      addScreenshot,
      removeScreenshot,
      captureScreenshot,
      getDebugContext,
      getSession,
      status,
      error,
      feedbackId,
      submit,
      track,
      reset,
    ],
  );

  return <FeedbackContext.Provider value={value}>{children}</FeedbackContext.Provider>;
}

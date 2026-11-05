import { CLIENT_LIMITS } from "../../shared/limits";
import type { ScreenshotPayload, SessionBundle } from "../../shared/types";

export const REPLAY_COLLAGE_NAME = "replay-collage.jpg";

export interface CollageMoment {
  label: string
  /** Playback offset passed to rrweb `pause()`, not wall-clock. */
  offsetMs: number
}

export interface CollageGrid {
  cols: number
  rows: number
}

const SCALE = 2;
const PAD = 14 * SCALE;
const GAP = 10 * SCALE;
const HEADER_H = 32 * SCALE;
const LABEL_H = 20 * SCALE;
const MIN_DURATION_MS = 200;
const MAX_FRAMES = 12;
const GRID_STEPS = [4, 6, 9, 12] as const;
const MAX_CANVAS_WIDTH = 2880;
const MAX_CANVAS_HEIGHT = 3600;
const MAX_STAGE_WIDTH = 1600;
const MAX_STAGE_HEIGHT = 1600;
const CAPTURE_PIXEL_RATIO = 2;

export function collageGrid(count: number): CollageGrid {
  if (count <= 0) return { cols: 0, rows: 0 };
  if (count === 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 9) return { cols: 3, rows: 3 };
  return { cols: 4, rows: 3 };
}

export function frameCountForDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs < MIN_DURATION_MS) return 0;
  if (durationMs < 1_500) return 2;
  if (durationMs < 5_000) return 4;
  const wanted = Math.round(durationMs / 2_000);
  let chosen: number = GRID_STEPS[0];
  for (const step of GRID_STEPS) {
    if (step <= Math.max(4, wanted)) chosen = step;
  }
  return Math.min(MAX_FRAMES, chosen);
}

export function selectCollageMoments(durationMs: number): CollageMoment[] {
  const count = frameCountForDuration(durationMs);
  if (count === 0) return [];
  const end = Math.max(0, durationMs - 30);
  if (count === 1) return [{ label: formatOffset(end), offsetMs: end }];
  return Array.from({ length: count }, (_, index) => {
    const offsetMs = Math.round((index / (count - 1)) * end);
    return { label: formatOffset(offsetMs), offsetMs };
  });
}

export async function buildReplayCollage(
  session: SessionBundle,
): Promise<ScreenshotPayload | null> {
  const events = session.replay?.events;
  if (!events || events.length < 2 || typeof document === "undefined") return null;

  const stage = replayStageSize(events);
  const root = document.createElement("div");
  root.setAttribute("data-fw-collage-root", "");
  // Full opacity off-screen. On-screen opacity hacks double-draw html-to-image clones.
  root.style.cssText = [
    "position:fixed",
    "left:-10000px",
    "top:0",
    `width:${stage.width}px`,
    `height:${stage.height}px`,
    "opacity:1",
    "pointer-events:none",
    "overflow:hidden",
    "z-index:-1",
  ].join(";");
  document.body.appendChild(root);

  try {
    const { Replayer } = await import("rrweb");
    const { toPng } = await import("html-to-image");
    const replayer = new Replayer(events as never, {
      root,
      skipInactive: true,
      showWarning: false,
      mouseTail: false,
      triggerFocus: false,
      speed: 1,
    });
    replayer.pause(0);
    replayer.disableInteract();
    await settle(120);

    const duration = Math.max(0, replayer.getMetaData().totalTime || 0);
    const moments = selectCollageMoments(duration);
    if (moments.length < 2) {
      console.info("[fw-collage] skip: short replay", { duration, events: events.length });
      replayer.destroy();
      return null;
    }

    const frames: Array<{ label: string; dataUrl: string }> = [];
    const settleMs = moments.length > 6 ? 55 : 80;
    for (const moment of moments) {
      replayer.pause(moment.offsetMs);
      await settle(settleMs);
      const dataUrl = await captureFrame(replayer.iframe, toPng);
      if (dataUrl) frames.push({ label: moment.label, dataUrl });
    }

    replayer.destroy();
    if (frames.length < 2) {
      console.info("[fw-collage] skip: captured", frames.length, "frames");
      return null;
    }

    return drawCollage(frames, session.href);
  } catch (error) {
    console.info("[fw-collage] failed", error);
    return null;
  } finally {
    root.remove();
  }
}

async function captureFrame(
  iframe: HTMLIFrameElement | undefined,
  toPng: (node: HTMLElement, options?: Record<string, unknown>) => Promise<string>,
): Promise<string | null> {
  const doc = iframe?.contentDocument;
  // iframe nodes fail `instanceof HTMLElement` (different realm). Never capture
  // `.replayer-wrapper` — html-to-image double-paints live iframe + clone.
  const target = doc?.body;
  if (!target || target.nodeType !== 1) return null;
  try {
    const dataUrl = await toPng(target as HTMLElement, {
      cacheBust: false,
      pixelRatio: CAPTURE_PIXEL_RATIO,
      skipFonts: true,
      backgroundColor:
        doc.documentElement.getAttribute("data-theme") === "dark" ? "#111111" : "#ffffff",
    });
    if (dataUrl.startsWith("data:image") && dataUrl.length > 800) return dataUrl;
  } catch {
    /* ignore */
  }
  return null;
}

async function drawCollage(
  frames: Array<{ label: string; dataUrl: string }>,
  href: string,
): Promise<ScreenshotPayload | null> {
  const images = await Promise.all(frames.map((frame) => loadImage(frame.dataUrl)));
  const count = images.length;
  const { cols, rows } = collageGrid(count);
  const tile = tileSize(cols, rows, frameAspect(images));
  const width = PAD * 2 + cols * tile.width + (cols - 1) * GAP;
  const height = PAD * 2 + HEADER_H + rows * (LABEL_H + tile.height) + (rows - 1) * GAP;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#f5f5f5";
  ctx.font = `600 ${14 * SCALE}px ui-sans-serif, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.fillText("Session replay", PAD, PAD + HEADER_H / 2);

  ctx.fillStyle = "#a3a3a3";
  ctx.font = `500 ${12 * SCALE}px ui-sans-serif, system-ui, sans-serif`;
  const path = safePath(href);
  const meta = `${count} frames · ${cols}×${rows}  ·  ${path}`;
  const metaWidth = ctx.measureText(meta).width;
  ctx.fillText(meta, Math.max(PAD, width - PAD - metaWidth), PAD + HEADER_H / 2);

  for (let i = 0; i < count; i += 1) {
    const image = images[i]!;
    const frame = frames[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = PAD + col * (tile.width + GAP);
    const labelY = PAD + HEADER_H + row * (LABEL_H + tile.height + GAP);
    const tileY = labelY + LABEL_H;

    ctx.fillStyle = "#a3a3a3";
    ctx.font = `600 ${11 * SCALE}px ui-sans-serif, system-ui, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(`${i + 1}  ${frame.label}`, x, labelY + LABEL_H / 2);

    ctx.fillStyle = "#1a1a1a";
    roundRect(ctx, x, tileY, tile.width, tile.height, 8 * SCALE);
    ctx.fill();

    const inset = 2 * SCALE;
    const srcW = image.naturalWidth || image.width || 1;
    const srcH = image.naturalHeight || image.height || 1;
    const fit = contain(srcW, srcH, tile.width - inset * 2, tile.height - inset * 2);
    const dx = x + inset + Math.round((tile.width - inset * 2 - fit.width) / 2);
    const dy = tileY + inset + Math.round((tile.height - inset * 2 - fit.height) / 2);
    ctx.save();
    roundRect(ctx, x + inset, tileY + inset, tile.width - inset * 2, tile.height - inset * 2, 6 * SCALE);
    ctx.clip();
    ctx.drawImage(image, dx, dy, fit.width, fit.height);
    ctx.restore();
  }

  return canvasToScreenshot(canvas);
}

function tileSize(
  cols: number,
  rows: number,
  aspect = 3 / 2,
): { width: number; height: number } {
  const width = Math.floor((MAX_CANVAS_WIDTH - PAD * 2 - GAP * Math.max(0, cols - 1)) / Math.max(1, cols));
  let height = Math.round(width / Math.max(0.85, Math.min(2, aspect || 3 / 2)));
  const blockH = PAD * 2 + HEADER_H + rows * (LABEL_H + height) + Math.max(0, rows - 1) * GAP;
  if (blockH > MAX_CANVAS_HEIGHT) {
    const available = MAX_CANVAS_HEIGHT - PAD * 2 - HEADER_H - rows * LABEL_H - Math.max(0, rows - 1) * GAP;
    height = Math.max(160, Math.floor(available / Math.max(1, rows)));
  }
  return { width: Math.max(240, width), height };
}

function frameAspect(images: Array<{ width: number; height: number; naturalWidth: number; naturalHeight: number }>): number {
  const ratios = images
    .map((image) => {
      const width = image.naturalWidth || image.width || 1;
      const height = image.naturalHeight || image.height || 1;
      return width / Math.max(1, height);
    })
    .sort((left, right) => left - right);
  return ratios[Math.floor(ratios.length / 2)] || 3 / 2;
}

function replayStageSize(events: unknown[]): { width: number; height: number } {
  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const record = event as { type?: number; data?: { width?: number; height?: number } };
    if (record.type !== 4 || !record.data?.width || !record.data.height) continue;
    return {
      width: Math.min(MAX_STAGE_WIDTH, Math.max(320, Math.round(record.data.width))),
      height: Math.min(MAX_STAGE_HEIGHT, Math.max(240, Math.round(record.data.height))),
    };
  }
  return { width: 1280, height: 800 };
}

async function canvasToScreenshot(canvas: HTMLCanvasElement): Promise<ScreenshotPayload | null> {
  for (const quality of [0.9, 0.78, 0.62]) {
    const blob = await canvasBlob(canvas, "image/jpeg", quality);
    if (!blob || blob.size > CLIENT_LIMITS.maxScreenshotBytes) continue;
    return {
      name: REPLAY_COLLAGE_NAME,
      mimeType: "image/jpeg",
      data: await blobToBase64(blob),
      width: canvas.width,
      height: canvas.height,
    };
  }
  return null;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Failed to decode collage frame"));
    image.src = src;
  });
}

function contain(srcW: number, srcH: number, maxW: number, maxH: number): { width: number; height: number } {
  const scale = Math.min(maxW / srcW, maxH / srcH);
  return {
    width: Math.max(1, Math.round(srcW * scale)),
    height: Math.max(1, Math.round(srcH * scale)),
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function safePath(href: string): string {
  try {
    const url = new URL(href);
    return `${url.pathname}${url.search}`.slice(0, 64) || "/";
  } catch {
    return href.slice(0, 64) || "/";
  }
}

function formatOffset(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function settle(ms: number): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, ms);
      });
    });
  });
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

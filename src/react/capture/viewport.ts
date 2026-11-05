import { CLIENT_LIMITS } from "../../shared/limits";
import type { ScreenshotPayload } from "../../shared/types";

export const VIEWPORT_SHOT_NAME = "viewport.png";

export async function captureViewportPayload(): Promise<ScreenshotPayload | null> {
  if (typeof document === "undefined") return null;
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(document.documentElement, {
    cacheBust: true,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      return !node.closest("[data-feedback-agent]");
    },
  });
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  if (blob.size < 80 || blob.size > CLIENT_LIMITS.maxScreenshotBytes) return null;
  const bitmap = await loadSize(blob);
  return {
    name: VIEWPORT_SHOT_NAME,
    mimeType: "image/png",
    data: await blobToBase64(blob),
    width: bitmap.width,
    height: bitmap.height,
  };
}

function loadSize(blob: Blob): Promise<{ width?: number; height?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({});
    };
    image.src = url;
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

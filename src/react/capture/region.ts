import { CLIENT_LIMITS } from "../../shared/limits";
import { cropRectToBitmap, type RegionRect } from "./region-math";
import { removeRegionOverlay } from "./region-overlay";

function excludeFeedbackNodes(node: Node): boolean {
  if (!(node instanceof Element)) return true;
  return !node.closest("[data-feedback-agent]");
}

export async function captureRegionBlob(
  rect: RegionRect,
  viewport: { width: number; height: number },
): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("Region capture requires a document");
  }
  removeRegionOverlay();
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(document.documentElement, {
    cacheBust: true,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    width: Math.max(1, Math.round(viewport.width)),
    height: Math.max(1, Math.round(viewport.height)),
    filter: excludeFeedbackNodes,
  });
  const response = await fetch(dataUrl);
  const source = await response.blob();
  if (source.size < 80) {
    throw new Error("Could not capture this page");
  }
  const bitmap = await createImageBitmap(source);
  const crop = cropRectToBitmap(rect, viewport, {
    width: bitmap.width,
    height: bitmap.height,
  });
  const canvas = document.createElement("canvas");
  canvas.width = crop.sw;
  canvas.height = crop.sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not crop screenshot");
  }
  ctx.drawImage(bitmap, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, crop.sw, crop.sh);
  bitmap.close();
  const blob = await canvasToPng(canvas);
  if (blob.size > CLIENT_LIMITS.maxScreenshotBytes) {
    throw new Error("Each screenshot must be 2 MB or smaller.");
  }
  return blob;
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not crop screenshot"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

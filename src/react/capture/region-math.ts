export type RegionRect = {
  x: number
  y: number
  width: number
  height: number
}

export type BitmapSize = {
  width: number
  height: number
}

export type ViewportSize = {
  width: number
  height: number
}

export type ScrollOffset = {
  x: number
  y: number
}

/** Shift a document-origin raster so the visible viewport sits at (0, 0). */
export function viewportCaptureTransform(scroll: ScrollOffset): string {
  return `translate(${-scroll.x}px, ${-scroll.y}px)`;
}

/**
 * Map a viewport-space selection onto a viewport-sized bitmap.
 * Region capture rasters the visible viewport, so the selection is scaled by
 * the bitmap / viewport ratio and is not offset by document scroll.
 */
export function cropRectToBitmap(
  rect: RegionRect,
  viewport: ViewportSize,
  bitmap: BitmapSize,
): { sx: number; sy: number; sw: number; sh: number } {
  const viewW = Math.max(1, viewport.width);
  const viewH = Math.max(1, viewport.height);
  const scaleX = bitmap.width / viewW;
  const scaleY = bitmap.height / viewH;
  const sx = Math.max(0, Math.round(rect.x * scaleX));
  const sy = Math.max(0, Math.round(rect.y * scaleY));
  const sw = Math.max(1, Math.round(rect.width * scaleX));
  const sh = Math.max(1, Math.round(rect.height * scaleY));
  return {
    sx: Math.min(sx, Math.max(0, bitmap.width - 1)),
    sy: Math.min(sy, Math.max(0, bitmap.height - 1)),
    sw: Math.min(sw, Math.max(1, bitmap.width - sx)),
    sh: Math.min(sh, Math.max(1, bitmap.height - sy)),
  };
}

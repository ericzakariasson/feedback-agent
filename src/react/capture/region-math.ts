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

export type DocumentSize = {
  width: number
  height: number
}

/**
 * Map a viewport-space selection onto a full-document bitmap.
 * `html-to-image` captures `document.documentElement` from (0, 0), so the
 * selection is offset by scroll and scaled by the bitmap / document ratio.
 */
export function cropRectToBitmap(
  rect: RegionRect,
  scroll: { x: number; y: number },
  bitmap: BitmapSize,
  documentSize: DocumentSize,
): { sx: number; sy: number; sw: number; sh: number } {
  const docW = Math.max(1, documentSize.width);
  const docH = Math.max(1, documentSize.height);
  const scaleX = bitmap.width / docW;
  const scaleY = bitmap.height / docH;
  const sx = Math.max(0, Math.round((rect.x + scroll.x) * scaleX));
  const sy = Math.max(0, Math.round((rect.y + scroll.y) * scaleY));
  const sw = Math.max(1, Math.round(rect.width * scaleX));
  const sh = Math.max(1, Math.round(rect.height * scaleY));
  return {
    sx: Math.min(sx, Math.max(0, bitmap.width - 1)),
    sy: Math.min(sy, Math.max(0, bitmap.height - 1)),
    sw: Math.min(sw, Math.max(1, bitmap.width - sx)),
    sh: Math.min(sh, Math.max(1, bitmap.height - sy)),
  };
}

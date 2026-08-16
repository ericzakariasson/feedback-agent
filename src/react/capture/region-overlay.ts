import type { RegionRect } from "./region-math";

export const REGION_HOST_ID = "__fw_region_root";

export type RegionSelection = {
  rect: RegionRect
  viewport: { width: number; height: number }
}

/**
 * Page-level region picker. Injected into the document (own closed shadow root)
 * so host CSS cannot leak in. Mirrors the cursor_ext capture overlay: drag to
 * select, move / resize, Enter or Capture confirms, Escape cancels.
 */
let abortActive: (() => void) | null = null;

export function selectPageRegion(): Promise<RegionSelection | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  abortActive?.();
  return new Promise((resolve) => {
    let settled = false;
    const settle = (selection: RegionSelection | null) => {
      if (settled) return;
      settled = true;
      resolve(selection);
    };
    installRegionOverlay(settle);
  });
}

export function removeRegionOverlay(): void {
  if (abortActive) {
    abortActive();
    return;
  }
  document.getElementById(REGION_HOST_ID)?.remove();
}

function installRegionOverlay(done: (selection: RegionSelection | null) => void): () => void {
  const host = document.createElement("div");
  host.id = REGION_HOST_ID;
  host.setAttribute("data-feedback-agent", "");
  host.setAttribute("data-fw-region", "");
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;";
  document.documentElement.appendChild(host);
  const root = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = `
    :host, * { box-sizing: border-box; font-weight: 400 !important; font-family: Inter, "Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    .stage { position: fixed; inset: 0; cursor: crosshair; }
    .hint {
      position: fixed; top: 16px; left: 50%; transform: translateX(-50%);
      background: #000000; color: #ffffff; padding: 8px 14px; border-radius: 999px;
      font-size: 13px; letter-spacing: 0; user-select: none; pointer-events: none;
      box-shadow: 0 8px 24px rgb(0 0 0 / 28%);
    }
    .hint kbd {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: #2e2e2e; color: #ffffff; padding: 1px 6px; border-radius: 4px;
      margin: 0 4px; font-size: 11px;
    }
    .box {
      position: fixed; display: none; border: 1px solid #ffffff;
      box-shadow: 0 0 0 9999px rgb(0 0 0 / 48%);
      cursor: move;
    }
    .box.editing { display: block; }
    .dims {
      position: absolute; top: 6px; left: 6px;
      background: #000000; color: #ffffff; padding: 2px 8px; border-radius: 4px;
      font-size: 11px; font-family: Inter, ui-sans-serif, system-ui, sans-serif; user-select: none; pointer-events: none;
      white-space: nowrap;
    }
    .dims.flip { top: auto; bottom: 6px; }
    .handle {
      position: absolute; width: 11px; height: 11px;
      background: #ffffff; border: 1px solid #000000;
      transform: translate(-50%, -50%);
    }
    .handle.tl { top: 0; left: 0; cursor: nwse-resize; }
    .handle.tr { top: 0; left: 100%; cursor: nesw-resize; }
    .handle.bl { top: 100%; left: 0; cursor: nesw-resize; }
    .handle.br { top: 100%; left: 100%; cursor: nwse-resize; }
    .handle.t  { top: 0;   left: 50%; cursor: ns-resize; }
    .handle.b  { top: 100%; left: 50%; cursor: ns-resize; }
    .handle.l  { top: 50%; left: 0;   cursor: ew-resize; }
    .handle.r  { top: 50%; left: 100%; cursor: ew-resize; }
    .toolbar {
      position: fixed; display: none; gap: 6px; padding: 6px;
      background: #000000; border-radius: 999px;
      box-shadow: 0 8px 24px rgb(0 0 0 / 28%);
    }
    .toolbar.editing { display: inline-flex; }
    .toolbar button {
      border: none; outline: none; cursor: pointer; font-family: inherit; font-size: 13px;
      padding: 6px 14px; border-radius: 999px; display: inline-flex; align-items: center; gap: 6px;
    }
    .toolbar .confirm { background: #ffffff; color: #000000; }
    .toolbar .confirm:hover { background: #e8e8e8; }
    .toolbar .cancel { background: #2e2e2e; color: #ffffff; }
    .toolbar .cancel:hover { background: #3a3a3a; }
  `;
  root.appendChild(style);

  const stage = document.createElement("div");
  stage.className = "stage";
  root.appendChild(stage);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.innerHTML =
    'Drag to select a region. <kbd>esc</kbd> cancels<span style="color:#9a9a9a"> · </span><kbd>enter</kbd> captures';
  root.appendChild(hint);

  const box = document.createElement("div");
  box.className = "box";
  root.appendChild(box);

  const dims = document.createElement("div");
  dims.className = "dims";
  dims.textContent = "0 × 0";
  box.appendChild(dims);

  const handleClasses = ["tl", "tr", "bl", "br", "t", "b", "l", "r"] as const;
  const handles: Record<string, HTMLDivElement> = {};
  for (const cls of handleClasses) {
    const handle = document.createElement("div");
    handle.className = `handle ${cls}`;
    handle.dataset.handle = cls;
    box.appendChild(handle);
    handles[cls] = handle;
  }

  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";
  const confirmBtn = document.createElement("button");
  confirmBtn.className = "confirm";
  confirmBtn.type = "button";
  confirmBtn.textContent = "Capture";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "cancel";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  toolbar.append(confirmBtn, cancelBtn);
  root.appendChild(toolbar);

  type Mode = "idle" | "drawing" | "editing";
  type Rect = { x: number; y: number; w: number; h: number };
  let mode: Mode = "idle";
  let rect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  let dragOrigin: { px: number; py: number; rect: Rect } | null = null;
  let resizeHandle: string | null = null;
  let settled = false;

  const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

  function applyRect() {
    box.style.left = `${rect.x}px`;
    box.style.top = `${rect.y}px`;
    box.style.width = `${rect.w}px`;
    box.style.height = `${rect.h}px`;
    dims.textContent = `${Math.round(rect.w)} × ${Math.round(rect.h)}`;
    if (rect.y < 28) dims.classList.add("flip");
    else dims.classList.remove("flip");
    positionToolbar();
  }

  function positionToolbar() {
    if (mode !== "editing") return;
    const w = toolbar.offsetWidth || 180;
    const h = toolbar.offsetHeight || 36;
    let top = rect.y + rect.h + 8;
    if (top + h > window.innerHeight - 8) {
      top = rect.y - h - 8;
    }
    if (top < 8) {
      top = clamp(rect.y + 8, 8, window.innerHeight - h - 8);
    }
    let left = rect.x + rect.w / 2 - w / 2;
    left = clamp(left, 8, window.innerWidth - w - 8);
    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;
  }

  function setMode(next: Mode) {
    mode = next;
    if (next === "editing") {
      box.classList.add("editing");
      toolbar.classList.add("editing");
      hint.style.display = "none";
      stage.style.cursor = "crosshair";
      requestAnimationFrame(positionToolbar);
    } else if (next === "drawing") {
      box.classList.add("editing");
      toolbar.classList.remove("editing");
      hint.style.display = "none";
      stage.style.cursor = "crosshair";
    } else {
      box.classList.remove("editing");
      toolbar.classList.remove("editing");
      hint.style.display = "";
      stage.style.cursor = "crosshair";
    }
  }

  function finish(selection: RegionSelection | null) {
    if (settled) return;
    settled = true;
    if (abortActive === sendCancel) abortActive = null;
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", positionToolbar);
    host.remove();
    done(selection);
  }

  function sendCancel() {
    finish(null);
  }
  abortActive = sendCancel;

  function sendConfirm() {
    if (rect.w < 4 || rect.h < 4) {
      sendCancel();
      return;
    }
    const x = Math.max(0, Math.round(rect.x));
    const y = Math.max(0, Math.round(rect.y));
    const width = Math.min(window.innerWidth - x, Math.round(rect.w));
    const height = Math.min(window.innerHeight - y, Math.round(rect.h));
    finish({
      rect: { x, y, width, height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });
  }

  function onKey(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      sendCancel();
      return;
    }
    if (event.key === "Enter" && mode === "editing") {
      event.preventDefault();
      event.stopImmediatePropagation();
      sendConfirm();
    }
  }

  window.addEventListener("keydown", onKey, true);
  window.addEventListener("resize", positionToolbar);

  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    stage.setPointerCapture(event.pointerId);
    rect = { x: event.clientX, y: event.clientY, w: 0, h: 0 };
    setMode("drawing");
    applyRect();

    const startX = event.clientX;
    const startY = event.clientY;

    const move = (ev: PointerEvent) => {
      const cx = clamp(ev.clientX, 0, window.innerWidth);
      const cy = clamp(ev.clientY, 0, window.innerHeight);
      rect = {
        x: Math.min(startX, cx),
        y: Math.min(startY, cy),
        w: Math.abs(cx - startX),
        h: Math.abs(cy - startY),
      };
      applyRect();
    };
    const up = () => {
      stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", up);
      try {
        stage.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      if (rect.w < 12 || rect.h < 12) {
        setMode("idle");
        rect = { x: 0, y: 0, w: 0, h: 0 };
        applyRect();
        return;
      }
      setMode("editing");
    };
    stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", up);
  });

  box.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    if (mode !== "editing") return;
    const target = event.target as HTMLElement;
    if (target.classList.contains("handle")) return;
    if (target.tagName === "BUTTON") return;
    event.preventDefault();
    event.stopPropagation();
    box.setPointerCapture(event.pointerId);
    dragOrigin = { px: event.clientX, py: event.clientY, rect: { ...rect } };

    const move = (ev: PointerEvent) => {
      if (!dragOrigin) return;
      const dx = ev.clientX - dragOrigin.px;
      const dy = ev.clientY - dragOrigin.py;
      rect = {
        x: clamp(dragOrigin.rect.x + dx, 0, window.innerWidth - dragOrigin.rect.w),
        y: clamp(dragOrigin.rect.y + dy, 0, window.innerHeight - dragOrigin.rect.h),
        w: dragOrigin.rect.w,
        h: dragOrigin.rect.h,
      };
      applyRect();
    };
    const up = () => {
      box.removeEventListener("pointermove", move);
      box.removeEventListener("pointerup", up);
      try {
        box.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      dragOrigin = null;
    };
    box.addEventListener("pointermove", move);
    box.addEventListener("pointerup", up);
  });

  for (const cls of handleClasses) {
    const handle = handles[cls];
    if (!handle) continue;
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      if (mode !== "editing") return;
      event.preventDefault();
      event.stopPropagation();
      handle.setPointerCapture(event.pointerId);
      resizeHandle = cls;
      const origin = { px: event.clientX, py: event.clientY, rect: { ...rect } };

      const move = (ev: PointerEvent) => {
        if (!resizeHandle) return;
        const dx = ev.clientX - origin.px;
        const dy = ev.clientY - origin.py;
        let { x, y, w, h } = origin.rect;
        const right = x + w;
        const bottom = y + h;
        if (resizeHandle.includes("l")) {
          const nx = clamp(x + dx, 0, right - 4);
          w = right - nx;
          x = nx;
        }
        if (resizeHandle.includes("r")) {
          w = clamp(w + dx, 4, window.innerWidth - x);
        }
        if (resizeHandle.includes("t")) {
          const ny = clamp(y + dy, 0, bottom - 4);
          h = bottom - ny;
          y = ny;
        }
        if (resizeHandle.includes("b")) {
          h = clamp(h + dy, 4, window.innerHeight - y);
        }
        rect = { x, y, w, h };
        applyRect();
      };
      const up = () => {
        handle.removeEventListener("pointermove", move);
        handle.removeEventListener("pointerup", up);
        try {
          handle.releasePointerCapture(event.pointerId);
        } catch {
          // ignore
        }
        resizeHandle = null;
      };
      handle.addEventListener("pointermove", move);
      handle.addEventListener("pointerup", up);
    });
  }

  confirmBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    sendConfirm();
  });
  cancelBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    sendCancel();
  });

  host.addEventListener("contextmenu", (event) => event.preventDefault(), true);
  return sendCancel;
}

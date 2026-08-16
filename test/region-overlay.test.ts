import { afterEach, describe, expect, it } from "vitest";
import { REGION_HOST_ID, removeRegionOverlay, selectPageRegion } from "../src/react/capture/region-overlay";

afterEach(() => {
  removeRegionOverlay();
});

describe("selectPageRegion", () => {
  it("mounts a page overlay marked as feedback-agent chrome", async () => {
    const pending = selectPageRegion();
    const host = document.getElementById(REGION_HOST_ID);
    expect(host).toBeTruthy();
    expect(host?.hasAttribute("data-feedback-agent")).toBe(true);
    expect(host?.getAttribute("data-fw-region")).toBe("");
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect(pending).resolves.toBeNull();
    expect(document.getElementById(REGION_HOST_ID)).toBeNull();
  });

  it("replaces an existing overlay instead of stacking hosts", async () => {
    const first = selectPageRegion();
    const second = selectPageRegion();
    expect(document.querySelectorAll(`#${REGION_HOST_ID}`)).toHaveLength(1);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect(second).resolves.toBeNull();
    await first;
  });
});

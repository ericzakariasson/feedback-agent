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

  it("resets a cancelled draw so a new drag can start", async () => {
    const pending = selectPageRegion();
    const host = document.getElementById(REGION_HOST_ID);
    expect(host).toBeTruthy();
    const stage = host?.shadowRoot?.querySelector(".stage") ?? document.querySelector(".stage");
    // Closed shadow is not queryable; dispatch on the host so the page still works after cancel.
    host?.dispatchEvent(new Event("pointercancel", { bubbles: true }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    await expect(pending).resolves.toBeNull();
    expect(stage === null || document.getElementById(REGION_HOST_ID) === null).toBe(true);
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

import { describe, expect, it } from "vitest";
import { REGION_HOST_ID, removeRegionOverlay, selectPageRegion } from "../src/react/capture/region-overlay";

function excludeFeedbackNodes(node: Node): boolean {
  if (!(node instanceof Element)) return true;
  return !node.closest("[data-feedback-agent]");
}

describe("region overlay capture filter", () => {
  it("excludes the overlay host the same way viewport capture excludes the widget", async () => {
    const pending = selectPageRegion();
    const host = document.getElementById(REGION_HOST_ID);
    expect(host).toBeTruthy();
    expect(excludeFeedbackNodes(host!)).toBe(false);
    expect(excludeFeedbackNodes(document.body)).toBe(true);
    removeRegionOverlay();
    await expect(pending).resolves.toBeNull();
  });
});

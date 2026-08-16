import { describe, expect, it } from "vitest";
import { cropRectToBitmap } from "../src/react/capture/region-math";

describe("cropRectToBitmap", () => {
  it("maps a 1:1 viewport selection onto the bitmap", () => {
    expect(
      cropRectToBitmap(
        { x: 10, y: 20, width: 100, height: 50 },
        { x: 0, y: 0 },
        { width: 800, height: 600 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ sx: 10, sy: 20, sw: 100, sh: 50 });
  });

  it("applies scroll offset and pixel-ratio scale", () => {
    expect(
      cropRectToBitmap(
        { x: 10, y: 20, width: 100, height: 50 },
        { x: 40, y: 10 },
        { width: 1600, height: 1200 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ sx: 100, sy: 60, sw: 200, sh: 100 });
  });

  it("clamps a selection that would run past the bitmap edge", () => {
    expect(
      cropRectToBitmap(
        { x: 700, y: 500, width: 200, height: 200 },
        { x: 0, y: 0 },
        { width: 800, height: 600 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ sx: 700, sy: 500, sw: 100, sh: 100 });
  });
});

import { describe, expect, it } from "vitest";
import { cropRectToBitmap, viewportCaptureTransform } from "../src/react/capture/region-math";

describe("cropRectToBitmap", () => {
  it("maps a 1:1 viewport selection onto the bitmap", () => {
    expect(
      cropRectToBitmap(
        { x: 10, y: 20, width: 100, height: 50 },
        { width: 800, height: 600 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ sx: 10, sy: 20, sw: 100, sh: 50 });
  });

  it("scales by bitmap / viewport ratio without using document scroll", () => {
    expect(
      cropRectToBitmap(
        { x: 10, y: 20, width: 100, height: 50 },
        { width: 800, height: 600 },
        { width: 1600, height: 1200 },
      ),
    ).toEqual({ sx: 20, sy: 40, sw: 200, sh: 100 });
  });

  it("translates the document-origin raster by the selection-time scroll", () => {
    expect(viewportCaptureTransform({ x: 0, y: 0 })).toBe("translate(0px, 0px)");
    expect(viewportCaptureTransform({ x: 40, y: 1000 })).toBe("translate(-40px, -1000px)");
  });

  it("clamps a selection that would run past the bitmap edge", () => {
    expect(
      cropRectToBitmap(
        { x: 700, y: 500, width: 200, height: 200 },
        { width: 800, height: 600 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ sx: 700, sy: 500, sw: 100, sh: 100 });
  });
});

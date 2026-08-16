import { afterEach, describe, expect, it, vi } from "vitest";

const toPng = vi.fn(async () => "data:image/png;base64,aaaa");

vi.mock("html-to-image", () => ({
  toPng: (node: Node, options: Record<string, unknown>) => toPng(node, options),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  toPng.mockClear();
});

describe("captureRegionBlob", () => {
  it("rasters the scrolled viewport, then crops in viewport space", async () => {
    const png = new Blob([new Uint8Array(120)], { type: "image/png" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ blob: async () => png }) as Response),
    );
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 800, height: 600, close() {} })),
    );
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
      drawImage: vi.fn(),
    })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.toBlob = function toBlob(cb: BlobCallback) {
      cb(new Blob([new Uint8Array(80)], { type: "image/png" }));
    };

    const { captureRegionBlob } = await import("../src/react/capture/region");
    await captureRegionBlob(
      { x: 10, y: 20, width: 100, height: 50 },
      { width: 800, height: 600 },
      { x: 0, y: 1000 },
    );

    expect(toPng).toHaveBeenCalledOnce();
    const options = toPng.mock.calls[0]?.[1] as {
      width: number
      height: number
      style: { transform: string }
    };
    expect(options.width).toBe(800);
    expect(options.height).toBe(600);
    expect(options.style.transform).toBe("translate(0px, -1000px)");
  });
});

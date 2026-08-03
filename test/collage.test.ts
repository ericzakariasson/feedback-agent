import { describe, expect, it } from "vitest";
import {
  collageGrid,
  frameCountForDuration,
  selectCollageMoments,
} from "../src/react/capture/collage";

describe("collageGrid", () => {
  it("uses 2x2 for four frames", () => {
    expect(collageGrid(4)).toEqual({ cols: 2, rows: 2 });
  });

  it("scales to denser grids", () => {
    expect(collageGrid(6)).toEqual({ cols: 3, rows: 2 });
    expect(collageGrid(9)).toEqual({ cols: 3, rows: 3 });
    expect(collageGrid(12)).toEqual({ cols: 4, rows: 3 });
  });
});

describe("selectCollageMoments", () => {
  it("skips very short replays", () => {
    expect(selectCollageMoments(0)).toEqual([]);
    expect(selectCollageMoments(100)).toEqual([]);
  });

  it("uses two frames only when the session is tiny", () => {
    expect(frameCountForDuration(1_200)).toBe(2);
    const moments = selectCollageMoments(1_200);
    expect(moments).toHaveLength(2);
    expect(moments[0]?.offsetMs).toBe(0);
  });

  it("prefers a 2x2 set of four frames", () => {
    expect(frameCountForDuration(4_000)).toBe(4);
    const moments = selectCollageMoments(8_000);
    expect(moments).toHaveLength(4);
    expect(moments[0]?.offsetMs).toBe(0);
    expect(moments.at(-1)?.offsetMs).toBeGreaterThan(7_000);
  });

  it("scales up toward 3x3 / 4x3 for long sessions", () => {
    expect(frameCountForDuration(18_000)).toBe(9);
    expect(frameCountForDuration(30_000)).toBe(12);
    const moments = selectCollageMoments(18_000);
    expect(moments).toHaveLength(9);
    expect(new Set(moments.map((item) => item.offsetMs)).size).toBe(9);
  });
});

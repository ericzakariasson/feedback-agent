import { describe, expect, it } from "vitest";
import { compactReplayEvents, isUsefulReplayEvent } from "../src/shared/replay";

describe("compactReplayEvents", () => {
  it("drops pointer-move noise but keeps clicks and mutations", () => {
    expect(
      isUsefulReplayEvent({
        type: 3,
        data: { source: 1, positions: [{ x: 1, y: 2, id: 3, timeOffset: 0 }] },
      }),
    ).toBe(false);
    expect(isUsefulReplayEvent({ type: 3, data: { source: 2, type: 2, id: 9, x: 10, y: 12 } })).toBe(true);
    expect(isUsefulReplayEvent({ type: 3, data: { source: 14 } })).toBe(false);
    expect(
      isUsefulReplayEvent({
        type: 3,
        data: { source: 0, adds: [], removes: [], texts: [], attributes: [] },
      }),
    ).toBe(false);
    expect(
      isUsefulReplayEvent({
        type: 3,
        data: { source: 0, adds: [{ parentId: 1, nextId: null, node: {} }] },
      }),
    ).toBe(true);
  });

  it("drops stale incrementals before the last playable full snapshot", () => {
    const events = [
      { type: 3, timestamp: 1, data: { source: 0, adds: [{ id: "stale" }] } },
      { type: 4, timestamp: 2, data: { href: "https://a.test", width: 10, height: 10 } },
      { type: 2, timestamp: 3, data: { node: { id: 1 }, initialOffset: { top: 0, left: 0 } } },
      { type: 3, timestamp: 4, data: { source: 3, id: 1, x: 0, y: 40 } },
      { type: 3, timestamp: 5, data: { source: 1, positions: [] } },
      { type: 4, timestamp: 12, data: { href: "https://a.test/b", width: 10, height: 10 } },
      { type: 2, timestamp: 13, data: { node: { id: 2 }, initialOffset: { top: 0, left: 0 } } },
      { type: 3, timestamp: 14, data: { source: 0, adds: [{ id: "fresh" }] } },
    ];

    const compacted = compactReplayEvents(events, 50);
    expect(compacted).toEqual([
      events[1],
      events[2],
      events[3],
      events[5],
      events[6],
      events[7],
    ]);
  });

  it("prefers the earliest full snapshot that still fits the cap", () => {
    const events = [
      { type: 4, timestamp: 1, data: {} },
      { type: 2, timestamp: 2, data: { node: { id: 1 } } },
      { type: 3, timestamp: 3, data: { source: 3, id: 1, x: 0, y: 1 } },
      { type: 4, timestamp: 4, data: {} },
      { type: 2, timestamp: 5, data: { node: { id: 2 } } },
      { type: 3, timestamp: 6, data: { source: 4, width: 800, height: 600 } },
    ];

    expect(compactReplayEvents(events, 10)).toEqual(events);
    expect(compactReplayEvents(events, 3)).toEqual([events[3], events[4], events[5]]);
  });

  it("returns nothing when only orphan incrementals remain", () => {
    expect(
      compactReplayEvents([
        { type: 3, timestamp: 1, data: { source: 0, adds: [{ id: "orphan" }] } },
        { type: 3, timestamp: 2, data: { source: 3, id: 1, x: 0, y: 1 } },
      ]),
    ).toEqual([]);
  });
});

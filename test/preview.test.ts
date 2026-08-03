import { describe, expect, it } from "vitest";
import { buildDebugContext } from "../src/react/preview";
import { sampleSession } from "./helpers";

describe("buildDebugContext", () => {
  it("summarizes the client payload and omits rrweb events by default", () => {
    const session = sampleSession({
      replay: {
        format: "rrweb",
        events: [{ type: 2 }, { type: 3 }],
        eventCount: 2,
        truncated: false,
      },
    });

    const debug = buildDebugContext({
      endpoint: "/api/feedback",
      message: "Save plan crashes",
      screenshots: [{ name: "bug.png", mimeType: "image/png", bytes: 1200, width: 800, height: 600 }],
      session,
    });

    expect(debug.endpoint).toBe("/api/feedback");
    expect(debug.payload.message).toBe("Save plan crashes");
    expect(debug.payload.screenshots[0]).toMatchObject({ name: "bug.png", bytes: 1200 });
    expect(debug.payload.session).toMatchObject({
      replay: { eventCount: 2, events: "[2 rrweb events omitted]" },
    });
    expect(debug.note).toContain("enrich()");
  });

  it("can include rrweb events", () => {
    const events = [{ type: 2 }];
    const debug = buildDebugContext({
      endpoint: "/api/feedback",
      message: "",
      screenshots: [],
      session: sampleSession({
        replay: { format: "rrweb", events, eventCount: 1, truncated: false },
      }),
      includeReplayEvents: true,
    });

    expect(debug.payload.session).toMatchObject({
      replay: { events },
    });
  });
});

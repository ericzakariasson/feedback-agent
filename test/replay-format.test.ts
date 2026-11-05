import { describe, expect, it } from "vitest";
import { formatReplayTimeline } from "../src/shared/replay-format";

describe("formatReplayTimeline", () => {
  it("formats a readable timeline instead of JSON", () => {
    const text = formatReplayTimeline([
      {
        type: 4,
        timestamp: 1_000,
        data: { href: "https://app.example.com/settings", width: 1280, height: 720 },
      },
      {
        type: 2,
        timestamp: 1_000,
        data: {
          node: {
            type: 0,
            childNodes: [
              {
                type: 2,
                id: 1,
                tagName: "html",
                attributes: { "data-theme": "light" },
                childNodes: [
                  {
                    type: 2,
                    id: 2,
                    tagName: "body",
                    attributes: { class: "app" },
                    childNodes: [
                      {
                        type: 2,
                        id: 3,
                        tagName: "button",
                        attributes: { class: "save" },
                        childNodes: [{ type: 3, textContent: "Save plan" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        type: 3,
        timestamp: 2_400,
        data: { source: 2, type: 2, id: 3, x: 40, y: 80 },
      },
      {
        type: 3,
        timestamp: 3_000,
        data: {
          source: 0,
          adds: [],
          removes: [],
          texts: [],
          attributes: [{ id: 1, attributes: { "data-theme": "dark" } }],
        },
      },
      {
        type: 3,
        timestamp: 3_500,
        data: { source: 5, id: 9, text: "ada@example.com" },
      },
    ]);

    expect(text).toContain("5 events");
    expect(text).toContain("Meta  1280×720  https://app.example.com/settings");
    expect(text).toContain("FullSnapshot");
    expect(text).toContain('html[data-theme="light"]');
    expect(text).toContain("button.save");
    expect(text).toContain("Click  #3 @ (40,80)");
    expect(text).toContain("Mutation  +0 −0 text=0 attr=1");
    expect(text).toContain('data-theme="dark"');
    expect(text).toContain("Input  #9");
    expect(text).not.toContain("ada@example.com");
    expect(text).toContain("[email]");
    expect(text).not.toContain('"type": 4');
  });
});

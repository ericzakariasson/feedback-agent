import { describe, expect, it } from "vitest";
import { WIDGET_CSS } from "../src/react/styles";

describe("widget styles", () => {
  it("scopes tokens to the shadow host", () => {
    expect(WIDGET_CSS).toContain(":host {");
    expect(WIDGET_CSS).toContain(':host([data-fw-scheme="dark"])');
    expect(WIDGET_CSS).toContain(".fw-shadow-mount");
    expect(WIDGET_CSS).toContain('.fw-compose[data-parked="true"]');
    expect(WIDGET_CSS).toMatch(/button\.fw-secondary \{[\s\S]*min-height: 40px/);
    expect(WIDGET_CSS).not.toContain(".fw-root button.fw-secondary:active");
  });
});

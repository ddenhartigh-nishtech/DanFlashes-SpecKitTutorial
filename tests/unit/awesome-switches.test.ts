import { describe, expect, it } from "vitest";
import { switchOffCss } from "@/lib/awesome/switches";

const on = { flashMode: true, pipesBackground: true };

describe("switchOffCss (006 R4)", () => {
  it("is empty while both switches are on", () => {
    expect(switchOffCss(on)).toBe("");
  });

  it("stops the strobe while Flash Mode is off, and leaves the pipes alone", () => {
    const css = switchOffCss({ ...on, flashMode: false });
    expect(css).toContain(':root[data-awesome="on"]');
    expect(css).toMatch(/animation:\s*none/);
    expect(css).not.toContain('[data-testid="pipes"]');
    expect(css).not.toContain('[data-testid="extreme-awesomeness"]');
  });

  it("restores the plain field and hides the canvas while the Pipes are off", () => {
    const css = switchOffCss({ ...on, pipesBackground: false });
    expect(css).toMatch(
      /body\s*\{[^}]*background-color:\s*var\(--df-strobe-paper, var\(--color-paper\)\)/,
    );
    expect(css).toMatch(/\[data-testid="pipes"\]\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.field-backing\s*\{[^}]*padding:\s*0/);
    expect(css).not.toMatch(/animation:\s*none/);
  });

  it("with both off, also hides the button", () => {
    const css = switchOffCss({ flashMode: false, pipesBackground: false });
    expect(css).toMatch(/animation:\s*none/);
    expect(css).toContain('[data-testid="pipes"]');
    expect(css).toMatch(/\[data-testid="extreme-awesomeness"\]\s*\{[^}]*display:\s*none/);
  });
});

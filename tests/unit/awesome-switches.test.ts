import { describe, expect, it } from "vitest";
import { fieldStrobeCss, STROBE_EXCLUDE } from "@/lib/awesome/strobe";
import { switchOffCss } from "@/lib/awesome/switches";

const on = { flashMode: true, pipesBackground: true };

describe("switchOffCss (006 R4)", () => {
  it("is empty while both switches are on", () => {
    expect(switchOffCss(on)).toBe("");
  });

  it("holds every strobing color at its normal value while Flash Mode is off, and leaves the pipes alone", () => {
    const css = switchOffCss({ ...on, flashMode: false });
    expect(css).toContain(':root[data-awesome="on"]');
    expect(css).toMatch(/\.bg-paper[^{]*\{background-color:var\(--color-paper\)!important\}/);
    expect(css).toMatch(/\.solid-backing[^{]*\{background-color:var\(--color-ink\)!important\}/);
    expect(css).toMatch(/\.border-ink[^{]*\{border-color:var\(--color-ink\)!important\}/);
    // A picked size keeps its own black: these hold only what the strobe would have changed.
    for (const rule of css.split("\n")) expect(rule).toContain(STROBE_EXCLUDE);
    expect(css).not.toContain('[data-testid="pipes"]');
    expect(css).not.toContain('[data-testid="extreme-awesomeness"]');
  });

  it("brings back the field and hides the canvas while the Pipes are off; with Flash Mode on, the field strobes", () => {
    const css = switchOffCss({ ...on, pipesBackground: false });
    expect(css).toContain(fieldStrobeCss());
    expect(css).toMatch(/\[data-testid="pipes"\]\s*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.field-backing\s*\{[^}]*padding:\s*0/);
    expect(css).not.toMatch(/!important\}[^]*\.bg-paper/);
  });

  it("with both off, the plain field holds still and the button is hidden", () => {
    const css = switchOffCss({ flashMode: false, pipesBackground: false });
    expect(css).not.toContain(fieldStrobeCss());
    expect(css).toMatch(/body\{background-color:var\(--color-paper\)!important\}/);
    expect(css).toContain('[data-testid="pipes"]');
    expect(css).toMatch(/\[data-testid="extreme-awesomeness"\]\s*\{[^}]*display:\s*none/);
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("AI-Run brand assets", () => {
  it("uses the supplied favicon artwork in the composite logo", () => {
    const favicon = readFileSync(resolve("public/favicon.svg"), "utf8");
    const logo = readFileSync(resolve("public/logo.svg"), "utf8");
    const image = favicon.match(/href="(data:image\/png;base64,[A-Za-z0-9+/=]+)"/)?.[1];
    expect(image).toBeDefined();
    expect(logo).toContain(`href="${image}"`);
    expect(logo).toContain("AI<tspan");
  });

  it("provides a valid ICO fallback", () => {
    const ico = readFileSync(resolve("public/favicon.ico"));
    expect(ico.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0]))).toBe(true);
    expect(ico.readUInt16LE(4)).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from "vitest";

import { ringColor, ringTextColor } from "./ringColor";

describe("ringColor", () => {
    it("colors the sole ring green when there is only one ring", () => {
        expect(ringColor(0, 1)).toBe("hsl(140, 65%, 55%)");
    });

    it("interpolates hue from green (first ring) to red (last ring)", () => {
        expect(ringColor(0, 4)).toBe("hsl(140, 65%, 55%)");
        expect(ringColor(3, 4)).toBe("hsl(0, 65%, 55%)");
    });
});

describe("ringTextColor", () => {
    it("picks a dark color for the innermost (green) ring, where white would wash out", () => {
        expect(ringTextColor(0, 4)).toBe("var(--bg)");
    });

    it("picks white for the outermost (red) ring", () => {
        expect(ringTextColor(3, 4)).toBe("#fff");
    });

    it("only returns one of the two known colors, for any index/ring count", () => {
        for (let ringCount = 1; ringCount <= 5; ringCount++) {
            for (let index = 0; index < ringCount; index++) {
                expect(["var(--bg)", "#fff"]).toContain(ringTextColor(index, ringCount));
            }
        }
    });
});

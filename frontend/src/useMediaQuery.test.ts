import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { stubMatchMedia } from "./test/factories";
import { useMediaQuery } from "./useMediaQuery";

describe("useMediaQuery", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("reflects the initial matchMedia result", () => {
        stubMatchMedia(true);
        const { result } = renderHook(() => useMediaQuery("(max-width: 860px)"));

        expect(result.current).toBe(true);
    });

    it("updates when matchMedia reports a change (resize)", () => {
        const media = stubMatchMedia(false);
        const { result } = renderHook(() => useMediaQuery("(max-width: 860px)"));

        expect(result.current).toBe(false);

        act(() => media.setMatches(true));

        expect(result.current).toBe(true);
    });
});

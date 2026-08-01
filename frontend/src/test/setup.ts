import "@testing-library/jest-dom";

// jsdom has no matchMedia implementation; default to "wide" (no narrow-tabs layout) unless a
// test opts into `stubMatchMedia` from ./factories. This must NOT use `vi.stubGlobal` (unlike
// `stubMatchMedia`) since other tests' `vi.unstubAllGlobals()` would wipe out this default too.
window.matchMedia = ((query: string) =>
    ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => { },
        removeEventListener: () => { },
        addListener: () => { },
        removeListener: () => { },
        dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;

import "@testing-library/jest-dom";

// jsdom has no matchMedia implementation; default to "wide" (no narrow-tabs layout) unless a
// test opts into `stubMatchMedia` from ../test/factories.
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

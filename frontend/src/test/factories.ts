import { vi } from "vitest";

import type { Blip, Quadrant, RadarDetail, RadarSummary, Ring } from "../api/radars";

export function makeRadarSummary(overrides: Partial<RadarSummary> = {}): RadarSummary {
    return {
        id: "r1",
        name: "Mobile Radar",
        purpose: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        blip_count: 0,
        ...overrides,
    };
}

export function makeRadarDetail(overrides: Partial<RadarDetail> = {}): RadarDetail {
    return {
        id: "r1",
        name: "Mobile Radar",
        purpose: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        quadrants: [],
        rings: [],
        blips: [],
        ...overrides,
    };
}

export function makeQuadrant(overrides: Partial<Quadrant> = {}): Quadrant {
    return {
        id: "q1",
        name: "TECHNIQUES",
        position: 1,
        ...overrides,
    };
}

export function makeRing(overrides: Partial<Ring> = {}): Ring {
    return {
        id: "ring1",
        name: "ADOPT",
        position: 1,
        ...overrides,
    };
}

export function makeBlip(overrides: Partial<Blip> = {}): Blip {
    return {
        id: "b1",
        name: "Service Mesh",
        description: "A dedicated infrastructure layer for service-to-service communication.",
        quadrant_id: "q1",
        ring_id: "ring1",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        ...overrides,
    };
}

/** Stubs `window.matchMedia` for one test; call `setMatches` to simulate a viewport resize. */
export function stubMatchMedia(initialMatches: boolean) {
    let matches = initialMatches;
    let changeHandler: ((event: MediaQueryListEvent) => void) | null = null;

    vi.stubGlobal(
        "matchMedia",
        vi.fn().mockImplementation((query: string) => ({
            get matches() {
                return matches;
            },
            media: query,
            onchange: null,
            addEventListener: (_type: "change", handler: (event: MediaQueryListEvent) => void) => {
                changeHandler = handler;
            },
            removeEventListener: () => {
                changeHandler = null;
            },
            addListener: () => { },
            removeListener: () => { },
            dispatchEvent: () => false,
        })),
    );

    return {
        setMatches(next: boolean) {
            matches = next;
            changeHandler?.({ matches: next } as MediaQueryListEvent);
        },
    };
}

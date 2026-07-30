import type { Blip, Quadrant, RadarDetail, RadarSummary, Ring } from "../api/radars";

export function makeRadarSummary(overrides: Partial<RadarSummary> = {}): RadarSummary {
    return {
        id: "r1",
        name: "Mobile Radar",
        purpose: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        ...overrides,
    };
}

export function makeRadarDetail(overrides: Partial<RadarDetail> = {}): RadarDetail {
    return {
        ...makeRadarSummary(),
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

import type { RadarDetail, RadarSummary } from "../api/radars";

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

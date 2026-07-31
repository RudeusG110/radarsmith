import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
    computeRadarGeometry,
    type BlipInput,
    type RadarGeometry,
    type RadarGeometryInput,
    type RingInput,
    type SectorInput,
} from "./radarGeometry";

function makeSectors(count: number): SectorInput[] {
    return Array.from({ length: count }, (_, index) => ({ id: `q${index}`, position: index }));
}

function makeRings(count: number): RingInput[] {
    return Array.from({ length: count }, (_, index) => ({ id: `r${index}`, position: index }));
}

/** Angle from center to point, normalized to [0, 360), matching `computeRadarGeometry`'s convention. */
function angleFromCenter(geometry: RadarGeometry, point: { x: number; y: number }): number {
    const dx = point.x - geometry.center.x;
    const dy = geometry.center.y - point.y;
    const degrees = (Math.atan2(dy, dx) * 180) / Math.PI;
    return ((degrees % 360) + 360) % 360;
}

function distanceFromCenter(geometry: RadarGeometry, point: { x: number; y: number }): number {
    return Math.hypot(point.x - geometry.center.x, point.y - geometry.center.y);
}

/** Whether `angle` falls within [start, start + span), tolerant of angles that wrap past 360. */
function angleWithinSpan(angle: number, start: number, span: number): boolean {
    const offset = (((angle - start) % 360) + 360) % 360;
    return offset >= -1e-9 && offset <= span + 1e-9;
}

describe("computeRadarGeometry", () => {
    it("is deterministic for identical input", () => {
        const input: RadarGeometryInput = {
            quadrants: makeSectors(4),
            rings: makeRings(4),
            blips: [
                { id: "11111111-1111-1111-1111-111111111111", quadrantId: "q0", ringId: "r0" },
                { id: "22222222-2222-2222-2222-222222222222", quadrantId: "q2", ringId: "r3" },
            ],
        };
        const first = computeRadarGeometry(input, { size: 500 });
        const second = computeRadarGeometry(input, { size: 500 });
        expect(second).toEqual(first);
    });

    it("supports a single quadrant and a single ring", () => {
        const geometry = computeRadarGeometry(
            {
                quadrants: makeSectors(1),
                rings: makeRings(1),
                blips: [{ id: "b1", quadrantId: "q0", ringId: "r0" }],
            },
            { size: 400 },
        );
        expect(geometry.sectors).toHaveLength(1);
        expect(geometry.sectors[0].endAngle - geometry.sectors[0].startAngle).toBeCloseTo(360);
        expect(geometry.rings).toHaveLength(1);
        expect(geometry.rings[0].innerRadius).toBeCloseTo(0);
        expect(geometry.markers).toHaveLength(1);
    });

    it("supports many rings", () => {
        const geometry = computeRadarGeometry(
            { quadrants: makeSectors(4), rings: makeRings(6), blips: [] },
            { size: 300 },
        );
        expect(geometry.rings).toHaveLength(6);
        // Ring bands are contiguous and increasing.
        geometry.rings.forEach((ring, index) => {
            expect(ring.innerRadius).toBeCloseTo((geometry.maxRadius * index) / 6);
            expect(ring.outerRadius).toBeCloseTo((geometry.maxRadius * (index + 1)) / 6);
        });
    });

    it("supports an empty sector (no blips)", () => {
        const geometry = computeRadarGeometry(
            { quadrants: makeSectors(4), rings: makeRings(4), blips: [] },
            { size: 400 },
        );
        expect(geometry.markers).toHaveLength(0);
    });

    it("skips a blip whose quadrant or ring id is unknown", () => {
        const geometry = computeRadarGeometry(
            {
                quadrants: makeSectors(4),
                rings: makeRings(4),
                blips: [
                    { id: "b1", quadrantId: "q0", ringId: "r0" },
                    { id: "b2", quadrantId: "does-not-exist", ringId: "r0" },
                    { id: "b3", quadrantId: "q0", ringId: "does-not-exist" },
                ],
            },
            { size: 400 },
        );
        expect(geometry.markers.map((marker) => marker.blipId)).toEqual(["b1"]);
    });

    it("spreads a dense sector without exact-duplicate marker coordinates", () => {
        const blips: BlipInput[] = Array.from({ length: 50 }, (_, index) => ({
            id: `dense-blip-${index}`,
            quadrantId: "q0",
            ringId: "r0",
        }));
        const geometry = computeRadarGeometry(
            { quadrants: makeSectors(4), rings: makeRings(4), blips },
            { size: 500 },
        );
        const coordinates = geometry.markers.map((marker) => `${marker.x.toFixed(3)},${marker.y.toFixed(3)}`);
        expect(new Set(coordinates).size).toBe(coordinates.length);
    });
});

describe("computeRadarGeometry (property-based)", () => {
    const sectorCountArb = fc.integer({ min: 1, max: 5 });
    const ringCountArb = fc.integer({ min: 1, max: 5 });

    const radarInputArb: fc.Arbitrary<RadarGeometryInput> = fc
        .tuple(sectorCountArb, ringCountArb)
        .chain(([quadrantCount, ringCount]) =>
            fc
                .array(
                    fc.record({
                        id: fc.uuid(),
                        quadrantIndex: fc.nat({ max: quadrantCount - 1 }),
                        ringIndex: fc.nat({ max: ringCount - 1 }),
                    }),
                    { maxLength: 40 },
                )
                .map((blipDrafts) => {
                    const quadrants = makeSectors(quadrantCount);
                    const rings = makeRings(ringCount);
                    const blips = blipDrafts.map((draft) => ({
                        id: draft.id,
                        quadrantId: quadrants[draft.quadrantIndex].id,
                        ringId: rings[draft.ringIndex].id,
                    }));
                    return { quadrants, rings, blips };
                }),
        );

    const sizeArb = fc.integer({ min: 50, max: 2000 });

    it("always returns identical output for identical input", () => {
        fc.assert(
            fc.property(radarInputArb, sizeArb, (input, size) => {
                const first = computeRadarGeometry(input, { size });
                const second = computeRadarGeometry(input, { size });
                expect(second).toEqual(first);
            }),
        );
    });

    it("places every marker within its assigned sector and ring", () => {
        fc.assert(
            fc.property(radarInputArb, sizeArb, (input, size) => {
                const geometry = computeRadarGeometry(input, { size });
                for (const marker of geometry.markers) {
                    const sector = geometry.sectors.find((s) => s.quadrantId === marker.quadrantId);
                    const ring = geometry.rings.find((r) => r.ringId === marker.ringId);
                    expect(sector).toBeDefined();
                    expect(ring).toBeDefined();
                    if (!sector || !ring) continue;

                    const angle = angleFromCenter(geometry, marker);
                    const span = sector.endAngle - sector.startAngle;
                    expect(angleWithinSpan(angle, sector.startAngle, span)).toBe(true);

                    const radius = distanceFromCenter(geometry, marker);
                    expect(radius).toBeGreaterThanOrEqual(ring.innerRadius - 1e-9);
                    expect(radius).toBeLessThanOrEqual(ring.outerRadius + 1e-9);
                }
            }),
        );
    });

    it("does not depend on the order of the blips array", () => {
        fc.assert(
            fc.property(radarInputArb, sizeArb, (input, size) => {
                const shuffled = { ...input, blips: [...input.blips].reverse() };
                const original = computeRadarGeometry(input, { size });
                const reordered = computeRadarGeometry(shuffled, { size });

                const originalById = new Map(original.markers.map((marker) => [marker.blipId, marker]));
                const reorderedById = new Map(reordered.markers.map((marker) => [marker.blipId, marker]));
                expect(reorderedById.size).toBe(originalById.size);
                for (const [blipId, marker] of originalById) {
                    expect(reorderedById.get(blipId)).toEqual(marker);
                }
            }),
        );
    });

    it("scales linearly with the requested size", () => {
        fc.assert(
            fc.property(radarInputArb, sizeArb, (input, size) => {
                const base = computeRadarGeometry(input, { size });
                const doubled = computeRadarGeometry(input, { size: size * 2 });

                expect(doubled.maxRadius).toBeCloseTo(base.maxRadius * 2, 6);
                expect(doubled.center.x).toBeCloseTo(base.center.x * 2, 6);
                expect(doubled.center.y).toBeCloseTo(base.center.y * 2, 6);

                base.rings.forEach((ring, index) => {
                    expect(doubled.rings[index].innerRadius).toBeCloseTo(ring.innerRadius * 2, 6);
                    expect(doubled.rings[index].outerRadius).toBeCloseTo(ring.outerRadius * 2, 6);
                });

                const doubledById = new Map(doubled.markers.map((marker) => [marker.blipId, marker]));
                for (const marker of base.markers) {
                    const scaled = doubledById.get(marker.blipId);
                    expect(scaled).toBeDefined();
                    if (!scaled) continue;
                    expect(scaled.x - doubled.center.x).toBeCloseTo((marker.x - base.center.x) * 2, 6);
                    expect(scaled.y - doubled.center.y).toBeCloseTo((marker.y - base.center.y) * 2, 6);
                }
            }),
        );
    });

    it("leaves existing markers unmoved when a sibling is added or removed", () => {
        fc.assert(
            fc.property(radarInputArb, sizeArb, fc.uuid(), (input, size, extraBlipId) => {
                fc.pre(input.quadrants.length > 0 && input.rings.length > 0);
                fc.pre(!input.blips.some((blip) => blip.id === extraBlipId));

                const withoutSibling = computeRadarGeometry(input, { size });
                const extraBlip: BlipInput = {
                    id: extraBlipId,
                    quadrantId: input.quadrants[0].id,
                    ringId: input.rings[0].id,
                };
                const withSibling = computeRadarGeometry(
                    { ...input, blips: [...input.blips, extraBlip] },
                    { size },
                );

                const withoutById = new Map(withoutSibling.markers.map((marker) => [marker.blipId, marker]));
                const withById = new Map(withSibling.markers.map((marker) => [marker.blipId, marker]));
                for (const [blipId, marker] of withoutById) {
                    expect(withById.get(blipId)).toEqual(marker);
                }
            }),
        );
    });
});

/**
 * Pure radar geometry: rings, sectors, labels, and marker placement.
 *
 * Marker placement is a pure function of a blip's own id plus its sector/ring bounds — it
 * never inspects sibling blips, so a blip's position never changes when a sibling is added
 * or removed. Dense-sector overlap is reduced with a golden-angle ("sunflower") slot derived
 * from a hash of the blip's own id, which spreads points far more evenly than plain
 * independent jitter, with no iterative/physics-based collision resolution.
 */

export interface SectorInput {
    id: string;
    position: number;
}

export interface RingInput {
    id: string;
    position: number;
}

export interface BlipInput {
    id: string;
    quadrantId: string;
    ringId: string;
}

export interface RadarGeometryInput {
    quadrants: SectorInput[];
    rings: RingInput[];
    blips: BlipInput[];
}

export interface RadarDimensions {
    size: number;
}

export interface Point {
    x: number;
    y: number;
}

export interface RingGeometry {
    ringId: string;
    position: number;
    innerRadius: number;
    outerRadius: number;
    labelPosition: Point;
}

export interface SectorGeometry {
    quadrantId: string;
    position: number;
    startAngle: number;
    endAngle: number;
    labelPosition: Point;
    boundaryStart: Point;
    boundaryEnd: Point;
    /** SVG path `d` data for the full wedge area, for a clickable quadrant hit-region. */
    hitPath: string;
}

export interface MarkerGeometry {
    blipId: string;
    quadrantId: string;
    ringId: string;
    x: number;
    y: number;
}

export interface RadarGeometry {
    viewBoxSize: number;
    center: Point;
    maxRadius: number;
    rings: RingGeometry[];
    sectors: SectorGeometry[];
    markers: MarkerGeometry[];
}

/** Fraction of `size / 2` used as the drawing radius, leaving room for labels outside it. */
const RADIUS_FRACTION = 0.78;

/** Angle (degrees, counterclockwise from the positive x-axis) where the first sector starts. */
const START_ANGLE_DEGREES = 90;

/** Fixed slot count for the golden-angle spread — large relative to any realistic bucket size. */
const SLOT_COUNT = 9973;

/** Golden ratio conjugate: an irrational step that equidistributes slot indices around a turn. */
const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949;

/** Keeps markers off ring/sector boundary lines. */
const RADIAL_INSET_FRACTION = 0.12;
const ANGULAR_INSET_FRACTION = 0.12;

/**
 * Equal-width ring bands give the innermost ring far less area than the outer ones (area grows
 * with radius squared), crowding it. Widen the innermost band instead, following the real
 * Zalando tech-radar's fixed ring radii ([130, 220, 310, 400] — a ~1.44x first band).
 */
const INNER_RING_WIDTH_BOOST = 1.44;

/** Deterministic FNV-1a-style hash of a string, salted, mapped to [0, 1). */
function hashUnitInterval(value: string, salt: string): number {
    let hash = 2166136261;
    const input = `${value}:${salt}`;
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) / 4294967296;
}

function toCartesian(center: Point, angleDegrees: number, radius: number): Point {
    const angleRadians = (angleDegrees * Math.PI) / 180;
    return {
        x: center.x + radius * Math.cos(angleRadians),
        y: center.y - radius * Math.sin(angleRadians),
    };
}

function byPositionAscending(a: { position: number }, b: { position: number }): number {
    return a.position - b.position;
}

/** A single sector spanning the full circle has coincident endpoints, so it needs two arcs. */
function buildWedgePath(center: Point, startAngle: number, endAngle: number, radius: number): string {
    const span = endAngle - startAngle;
    if (span >= 360 - 1e-9) {
        const right = toCartesian(center, startAngle, radius);
        const left = toCartesian(center, startAngle + 180, radius);
        return `M ${center.x} ${center.y} L ${right.x} ${right.y} A ${radius} ${radius} 0 1 1 ${left.x} ${left.y} A ${radius} ${radius} 0 1 1 ${right.x} ${right.y} Z`;
    }
    const start = toCartesian(center, startAngle, radius);
    const end = toCartesian(center, endAngle, radius);
    const largeArcFlag = span > 180 ? 1 : 0;
    return `M ${center.x} ${center.y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y} Z`;
}

function buildRings(rings: RingInput[], center: Point, maxRadius: number): RingGeometry[] {
    const ordered = [...rings].sort(byPositionAscending);
    const count = ordered.length;
    const unit = maxRadius / (INNER_RING_WIDTH_BOOST + (count - 1));
    let cursor = 0;
    return ordered.map((ring, index) => {
        const width = (index === 0 ? INNER_RING_WIDTH_BOOST : 1) * unit;
        const innerRadius = cursor;
        const outerRadius = cursor + width;
        cursor = outerRadius;
        const labelRadius = (innerRadius + outerRadius) / 2;
        return {
            ringId: ring.id,
            position: ring.position,
            innerRadius,
            outerRadius,
            labelPosition: toCartesian(center, START_ANGLE_DEGREES, labelRadius),
        };
    });
}

function buildSectors(quadrants: SectorInput[], center: Point, maxRadius: number): SectorGeometry[] {
    const ordered = [...quadrants].sort(byPositionAscending);
    const count = ordered.length;
    const span = 360 / count;
    return ordered.map((quadrant, index) => {
        const startAngle = START_ANGLE_DEGREES + index * span;
        const endAngle = startAngle + span;
        const midAngle = (startAngle + endAngle) / 2;
        return {
            quadrantId: quadrant.id,
            position: quadrant.position,
            startAngle,
            endAngle,
            labelPosition: toCartesian(center, midAngle, maxRadius * 1.08),
            boundaryStart: center,
            boundaryEnd: toCartesian(center, startAngle, maxRadius),
            hitPath: buildWedgePath(center, startAngle, endAngle, maxRadius),
        };
    });
}

function buildMarkers(
    blips: BlipInput[],
    sectorsById: Map<string, SectorGeometry>,
    ringsById: Map<string, RingGeometry>,
    center: Point,
): MarkerGeometry[] {
    const markers: MarkerGeometry[] = [];
    for (const blip of blips) {
        const sector = sectorsById.get(blip.quadrantId);
        const ring = ringsById.get(blip.ringId);
        if (!sector || !ring) {
            continue;
        }

        const slot = Math.floor(hashUnitInterval(blip.id, "slot") * SLOT_COUNT);
        const radialFraction = Math.sqrt((slot + 0.5) / SLOT_COUNT);
        const angularFraction = (slot * GOLDEN_RATIO_CONJUGATE) % 1;

        const angularSpan = sector.endAngle - sector.startAngle;
        const angularInset = angularSpan * ANGULAR_INSET_FRACTION;
        const angle = sector.startAngle + angularInset + angularFraction * (angularSpan - 2 * angularInset);

        const radialSpan = ring.outerRadius - ring.innerRadius;
        const radialInset = radialSpan * RADIAL_INSET_FRACTION;
        const radius = ring.innerRadius + radialInset + radialFraction * (radialSpan - 2 * radialInset);

        const point = toCartesian(center, angle, radius);
        markers.push({ blipId: blip.id, quadrantId: blip.quadrantId, ringId: blip.ringId, x: point.x, y: point.y });
    }
    return markers;
}

export function computeRadarGeometry(input: RadarGeometryInput, dimensions: RadarDimensions): RadarGeometry {
    const { size } = dimensions;
    const center: Point = { x: size / 2, y: size / 2 };
    const maxRadius = (size / 2) * RADIUS_FRACTION;

    const rings = buildRings(input.rings, center, maxRadius);
    const sectors = buildSectors(input.quadrants, center, maxRadius);

    const sectorsById = new Map(sectors.map((sector) => [sector.quadrantId, sector]));
    const ringsById = new Map(rings.map((ring) => [ring.ringId, ring]));
    const markers = buildMarkers(input.blips, sectorsById, ringsById, center);

    return { viewBoxSize: size, center, maxRadius, rings, sectors, markers };
}

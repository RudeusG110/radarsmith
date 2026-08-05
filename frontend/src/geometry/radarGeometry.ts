/**
 * Pure radar geometry: rings, sectors, labels, and marker placement.
 *
 * Marker placement/size is a pure function of a blip's own id plus the full set of blips
 * sharing its exact quadrant+ring bucket — it never inspects blips outside that bucket, so a
 * blip only moves/resizes when a sibling is added to or removed from its own bucket, never from
 * changes elsewhere on the radar. Each bucket is laid out with a golden-angle ("sunflower"/
 * phyllotactic) arrangement ranked by the bucket's own blip ids (sorted, so it's independent of
 * input array order) — the standard technique for evenly filling a disk with N points, which
 * requires ranking within the *actual* bucket size to work (picking a slot via a per-blip hash
 * across one large fixed range, as a prior version of this file did, is equivalent to
 * independent random placement and does not avoid overlap). Marker radius also shrinks per
 * bucket when its blip count would otherwise overflow the available annulus area. No
 * iterative/physics-based collision resolution.
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
    /** Shrinks below BASE_MARKER_RADIUS when its quadrant+ring bucket is too dense to fit at full size. */
    markerRadius: number;
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

/** Golden ratio conjugate: an irrational step that equidistributes ranks evenly around a turn. */
const GOLDEN_RATIO_CONJUGATE = 0.6180339887498949;

/** Keeps markers off ring/sector boundary lines. */
const RADIAL_INSET_FRACTION = 0.12;
const ANGULAR_INSET_FRACTION = 0.12;

/** Marker circle radius at/below which a bucket is never crowded enough to need shrinking. */
export const BASE_MARKER_RADIUS = 10;
/** Never shrink a marker below this, so its number stays legible. */
const MIN_MARKER_RADIUS = 5;
/** Conservative fraction of a bucket's annulus area markers may occupy (sunflower packing isn't a tight hex-pack). */
const PACKING_EFFICIENCY = 0.55;

/**
 * Equal-width ring bands give the innermost ring far less area than the outer ones (area grows
 * with radius squared), crowding it. Widen the innermost band instead, following the real
 * Zalando tech-radar's fixed ring radii ([130, 220, 310, 400] — a ~1.44x first band).
 */
const INNER_RING_WIDTH_BOOST = 1.44;

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

/** Bucket key grouping blips that share both a quadrant and a ring, since that's the area they compete for space within. */
function bucketKey(quadrantId: string, ringId: string): string {
    return `${quadrantId}::${ringId}`;
}

function buildMarkers(
    blips: BlipInput[],
    sectorsById: Map<string, SectorGeometry>,
    ringsById: Map<string, RingGeometry>,
    center: Point,
): MarkerGeometry[] {
    const validBlips = blips.filter((blip) => sectorsById.has(blip.quadrantId) && ringsById.has(blip.ringId));

    // Rank each blip within its own quadrant+ring bucket (sorted by id, so the rank is
    // independent of input array order) — the sunflower formula below needs the bucket's
    // *actual* size to evenly fill it; a slot picked from one shared, much larger range
    // (a prior version of this function) doesn't spread points any better than random jitter.
    const bucketIds = new Map<string, string[]>();
    for (const blip of validBlips) {
        const key = bucketKey(blip.quadrantId, blip.ringId);
        const ids = bucketIds.get(key);
        if (ids) {
            ids.push(blip.id);
        } else {
            bucketIds.set(key, [blip.id]);
        }
    }
    const rankById = new Map<string, number>();
    for (const ids of bucketIds.values()) {
        [...ids].sort().forEach((id, rank) => rankById.set(id, rank));
    }

    const markers: MarkerGeometry[] = [];
    for (const blip of validBlips) {
        const sector = sectorsById.get(blip.quadrantId);
        const ring = ringsById.get(blip.ringId);
        if (!sector || !ring) {
            continue;
        }

        const count = bucketIds.get(bucketKey(blip.quadrantId, blip.ringId))?.length ?? 1;
        const rank = rankById.get(blip.id) ?? 0;
        const radialFraction = Math.sqrt((rank + 0.5) / count);
        const angularFraction = (rank * GOLDEN_RATIO_CONJUGATE) % 1;

        const angularSpan = sector.endAngle - sector.startAngle;
        const angularInset = angularSpan * ANGULAR_INSET_FRACTION;
        const usableAngularSpan = angularSpan - 2 * angularInset;
        const angle = sector.startAngle + angularInset + angularFraction * usableAngularSpan;

        const radialSpan = ring.outerRadius - ring.innerRadius;
        const radialInset = radialSpan * RADIAL_INSET_FRACTION;
        const innerUsable = ring.innerRadius + radialInset;
        const outerUsable = ring.outerRadius - radialInset;
        const radius = innerUsable + radialFraction * (outerUsable - innerUsable);

        const usableAngularSpanRadians = (usableAngularSpan * Math.PI) / 180;
        const bucketArea = (usableAngularSpanRadians / 2) * (outerUsable ** 2 - innerUsable ** 2);
        const packingRadius = Math.sqrt((bucketArea * PACKING_EFFICIENCY) / (count * Math.PI));
        const markerRadius = Math.min(BASE_MARKER_RADIUS, Math.max(MIN_MARKER_RADIUS, packingRadius));

        const point = toCartesian(center, angle, radius);
        markers.push({
            blipId: blip.id,
            quadrantId: blip.quadrantId,
            ringId: blip.ringId,
            x: point.x,
            y: point.y,
            markerRadius,
        });
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

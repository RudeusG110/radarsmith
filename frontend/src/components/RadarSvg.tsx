import type { Blip, Quadrant, Ring } from "../api/radars";
import { indexById } from "../collections";
import { titleCase } from "../format";
import {
    computeRadarGeometry,
    type BlipInput as GeometryBlipInput,
    type RingInput as GeometryRingInput,
    type SectorInput as GeometrySectorInput,
} from "../geometry/radarGeometry";
import { ringColor } from "../ringColor";

export interface RadarSvgProps {
    radarName: string;
    quadrants: Quadrant[];
    rings: Ring[];
    blips: Blip[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    /** Lets a parent move DOM focus onto a marker, e.g. when its row is selected. */
    markerRef?: (blipId: string, element: SVGGElement | null) => void;
}

/** Fixed square viewBox size; geometry scales every distance as a fraction of this. */
const SIZE = 600;
const MARKER_RADIUS = 8;

export function RadarSvg({ radarName, quadrants, rings, blips, selectedId, onSelect, markerRef }: RadarSvgProps) {
    const quadrantById = indexById(quadrants);
    const ringById = indexById(rings);
    const blipById = indexById(blips);

    const sectorInputs: GeometrySectorInput[] = quadrants.map((quadrant) => ({ id: quadrant.id, position: quadrant.position }));
    const ringInputs: GeometryRingInput[] = rings.map((ring) => ({ id: ring.id, position: ring.position }));
    const blipInputs: GeometryBlipInput[] = blips.map((blip) => ({ id: blip.id, quadrantId: blip.quadrant_id, ringId: blip.ring_id }));

    const geometry = computeRadarGeometry({ quadrants: sectorInputs, rings: ringInputs, blips: blipInputs }, { size: SIZE });
    // geometry.rings is ordered ascending by position, so array index doubles as ring order.
    const ringIndexById = new Map(geometry.rings.map((ring, index) => [ring.ringId, index]));

    function handleMarkerKeyDown(event: React.KeyboardEvent<SVGGElement>, blipId: string) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect(blipId);
        }
    }

    return (
        <svg
            className="radar-svg"
            viewBox={`0 0 ${geometry.viewBoxSize} ${geometry.viewBoxSize}`}
            width="100%"
            height="100%"
            role="graphics-document"
            aria-label={`${radarName} radar`}
        >
            {[...geometry.rings].reverse().map((ring, index) => (
                <circle
                    key={ring.ringId}
                    cx={geometry.center.x}
                    cy={geometry.center.y}
                    r={ring.outerRadius}
                    fill={index % 2 === 0 ? "var(--panel-2)" : "var(--panel)"}
                    stroke="currentColor"
                />
            ))}
            {geometry.rings.map((ring) => (
                <text key={ring.ringId} x={ring.labelPosition.x} y={ring.labelPosition.y} textAnchor="middle">
                    {titleCase(ringById.get(ring.ringId)?.name ?? "")}
                </text>
            ))}
            {geometry.sectors.map((sector) => {
                const quadrantLabel = titleCase(quadrantById.get(sector.quadrantId)?.name ?? "");
                return (
                    <g key={sector.quadrantId} role="graphics-object group" aria-label={quadrantLabel}>
                        <line
                            x1={sector.boundaryStart.x}
                            y1={sector.boundaryStart.y}
                            x2={sector.boundaryEnd.x}
                            y2={sector.boundaryEnd.y}
                            stroke="currentColor"
                        />
                        <text x={sector.labelPosition.x} y={sector.labelPosition.y} textAnchor="middle">
                            {quadrantLabel}
                        </text>
                    </g>
                );
            })}
            {blips.length === 0 && (
                <text x={geometry.center.x} y={geometry.center.y} textAnchor="middle">
                    No blips yet
                </text>
            )}
            {geometry.markers.map((marker, index) => {
                const blip = blipById.get(marker.blipId);
                if (blip === undefined) {
                    return null;
                }
                const quadrantLabel = titleCase(quadrantById.get(marker.quadrantId)?.name ?? "");
                const ringLabel = titleCase(ringById.get(marker.ringId)?.name ?? "");
                const isSelected = selectedId === blip.id;
                const color = ringColor(ringIndexById.get(marker.ringId) ?? 0, geometry.rings.length);
                return (
                    <g
                        key={blip.id}
                        ref={(element) => markerRef?.(blip.id, element)}
                        role="graphics-symbol img"
                        aria-label={`${blip.name}, ${quadrantLabel}, ${ringLabel}`}
                        tabIndex={0}
                        onClick={() => onSelect(blip.id)}
                        onKeyDown={(event) => handleMarkerKeyDown(event, blip.id)}
                        style={{ cursor: "pointer" }}
                    >
                        <title>{blip.name}</title>
                        <circle
                            cx={marker.x}
                            cy={marker.y}
                            r={MARKER_RADIUS}
                            fill={color}
                            stroke={isSelected ? "var(--accent)" : "var(--bg)"}
                            strokeWidth={isSelected ? 2 : 1}
                        />
                        <text x={marker.x} y={marker.y} textAnchor="middle" dominantBaseline="middle" aria-hidden="true">
                            {index + 1}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

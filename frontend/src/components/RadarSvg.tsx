import { useState } from "react";

import type { Blip, Quadrant, Ring } from "../api/radars";
import { titleCase } from "../format";
import {
    computeRadarGeometry,
    type BlipInput as GeometryBlipInput,
    type RingInput as GeometryRingInput,
    type SectorInput as GeometrySectorInput,
} from "../geometry/radarGeometry";
import { linkify } from "../linkify";

export interface RadarSvgProps {
    radarName: string;
    quadrants: Quadrant[];
    rings: Ring[];
    blips: Blip[];
}

/** Fixed square viewBox size; geometry scales every distance as a fraction of this. */
const SIZE = 600;
const MARKER_RADIUS = 8;

export function RadarSvg({ radarName, quadrants, rings, blips }: RadarSvgProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [hoverId, setHoverId] = useState<string | null>(null);
    const activeId = hoverId ?? selectedId;

    const quadrantById = new Map(quadrants.map((quadrant) => [quadrant.id, quadrant]));
    const ringById = new Map(rings.map((ring) => [ring.id, ring]));
    const blipById = new Map(blips.map((blip) => [blip.id, blip]));

    const sectorInputs: GeometrySectorInput[] = quadrants.map((quadrant) => ({ id: quadrant.id, position: quadrant.position }));
    const ringInputs: GeometryRingInput[] = rings.map((ring) => ({ id: ring.id, position: ring.position }));
    const blipInputs: GeometryBlipInput[] = blips.map((blip) => ({ id: blip.id, quadrantId: blip.quadrant_id, ringId: blip.ring_id }));

    const geometry = computeRadarGeometry({ quadrants: sectorInputs, rings: ringInputs, blips: blipInputs }, { size: SIZE });

    function toggleSelected(blipId: string) {
        setSelectedId((current) => (current === blipId ? null : blipId));
    }

    function handleMarkerKeyDown(event: React.KeyboardEvent<SVGGElement>, blipId: string) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleSelected(blipId);
        }
    }

    const activeBlip = activeId === null ? null : (blipById.get(activeId) ?? null);

    return (
        <div>
            <svg
                viewBox={`0 0 ${geometry.viewBoxSize} ${geometry.viewBoxSize}`}
                width="100%"
                height="100%"
                role="graphics-document"
                aria-label={`${radarName} radar`}
            >
                {geometry.rings.map((ring) => (
                    <circle
                        key={ring.ringId}
                        cx={geometry.center.x}
                        cy={geometry.center.y}
                        r={ring.outerRadius}
                        fill="none"
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
                    return (
                        <g
                            key={blip.id}
                            role="graphics-symbol img"
                            aria-label={`${blip.name}, ${quadrantLabel}, ${ringLabel}`}
                            tabIndex={0}
                            onClick={() => toggleSelected(blip.id)}
                            onKeyDown={(event) => handleMarkerKeyDown(event, blip.id)}
                            onMouseEnter={() => setHoverId(blip.id)}
                            onMouseLeave={() => setHoverId(null)}
                            onFocus={() => setHoverId(blip.id)}
                            onBlur={() => setHoverId(null)}
                            style={{ cursor: "pointer" }}
                        >
                            <circle
                                cx={marker.x}
                                cy={marker.y}
                                r={MARKER_RADIUS}
                                fill={isSelected ? "currentColor" : "none"}
                                stroke="currentColor"
                            />
                            <text x={marker.x} y={marker.y} textAnchor="middle" dominantBaseline="middle" aria-hidden="true">
                                {index + 1}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <div>
                {activeBlip === null ? (
                    <p>Select a blip marker to see its details.</p>
                ) : (
                    <div>
                        <h2>{activeBlip.name}</h2>
                        <p>
                            {titleCase(quadrantById.get(activeBlip.quadrant_id)?.name ?? "Unknown")},{" "}
                            {titleCase(ringById.get(activeBlip.ring_id)?.name ?? "Unknown")}
                        </p>
                        <p>{linkify(activeBlip.description)}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

import type { Quadrant, Ring } from "../api/radars";
import { titleCase } from "../format";
import { ringColor } from "../ringColor";

export interface RadarGlossaryProps {
    quadrants: Quadrant[];
    rings: Ring[];
}

function byPositionAscending(a: { position: number }, b: { position: number }): number {
    return a.position - b.position;
}

/** Compact legend below the radar SVG; ring order/colors mirror RadarSvg's own ring bands. */
export function RadarGlossary({ quadrants, rings }: RadarGlossaryProps) {
    const orderedQuadrants = [...quadrants].sort(byPositionAscending);
    const orderedRings = [...rings].sort(byPositionAscending);

    return (
        <div className="radar-glossary">
            <div className="glossary-row">
                <span className="glossary-label">Quadrants</span>
                <ul className="glossary-list">
                    {orderedQuadrants.map((quadrant) => (
                        <li key={quadrant.id} className="tag">
                            {titleCase(quadrant.name)}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="glossary-row">
                <span className="glossary-label">Rings</span>
                <ul className="glossary-list">
                    {orderedRings.map((ring, index) => (
                        <li key={ring.id} className="tag">
                            <span className="ring-swatch" style={{ background: ringColor(index, orderedRings.length) }} />
                            {titleCase(ring.name)}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

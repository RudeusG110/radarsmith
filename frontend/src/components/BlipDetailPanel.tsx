import type { Blip } from "../api/radars";
import { linkify } from "../linkify";

export interface BlipDetailPanelProps {
    blip: Blip | null;
    quadrantLabel: string;
    ringLabel: string;
}

/** Persists across Radar/Blips tabs — driven by shared selection, not by either surface alone. */
export function BlipDetailPanel({ blip, quadrantLabel, ringLabel }: BlipDetailPanelProps) {
    if (blip === null) {
        return <p>Select a blip marker or row to see its details.</p>;
    }

    return (
        <div>
            <h2>{blip.name}</h2>
            <p className="blip-meta">
                {quadrantLabel}, {ringLabel}
            </p>
            <p>{linkify(blip.description)}</p>
        </div>
    );
}

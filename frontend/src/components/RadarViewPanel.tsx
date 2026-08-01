import type { Blip } from "../api/radars";
import { BlipDetailPanel } from "./BlipDetailPanel";

export interface RadarViewPanelGroup {
    ringLabel: string;
    blips: Blip[];
}

export type RadarViewSelection =
    | { kind: "blip"; blip: Blip; quadrantLabel: string; ringLabel: string }
    | { kind: "quadrant"; quadrantLabel: string; groups: RadarViewPanelGroup[] }
    | null;

export interface RadarViewPanelProps {
    selection: RadarViewSelection;
    onSelectBlip: (blipId: string) => void;
}

/** Shared read-only slot for a selected blip's detail or a quadrant's ring-grouped blips. */
export function RadarViewPanel({ selection, onSelectBlip }: RadarViewPanelProps) {
    return (
        <div className="panel side-panel">
            <div className="panel-title">Details</div>
            <div className="panel-body" aria-live="polite">
                {selection === null && <p className="empty">Select a blip or a quadrant to see details.</p>}
                {selection?.kind === "blip" && (
                    <BlipDetailPanel blip={selection.blip} quadrantLabel={selection.quadrantLabel} ringLabel={selection.ringLabel} />
                )}
                {selection?.kind === "quadrant" && (
                    <>
                        <h2>{selection.quadrantLabel}</h2>
                        {selection.groups.length === 0 && <p>No blips in this quadrant yet.</p>}
                        {selection.groups.map((group) => (
                            <table key={group.ringLabel}>
                                <caption>{group.ringLabel}</caption>
                                <thead>
                                    <tr>
                                        <th scope="col">Name</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {group.blips.map((blip) => (
                                        <tr key={blip.id}>
                                            <td>
                                                <button type="button" className="name-toggle" onClick={() => onSelectBlip(blip.id)}>
                                                    {blip.name}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

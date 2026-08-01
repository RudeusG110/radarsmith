import type { Blip, Quadrant, Ring } from "../api/radars";
import { titleCase } from "../format";

export interface BlipTableProps {
    radarName: string;
    blips: Blip[];
    quadrantById: Map<string, Quadrant>;
    ringById: Map<string, Ring>;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onEdit: (blip: Blip) => void;
    onDelete: (blip: Blip) => void;
}

export function BlipTable({ radarName, blips, quadrantById, ringById, selectedId, onSelect, onEdit, onDelete }: BlipTableProps) {
    if (blips.length === 0) {
        return <p>No blips yet.</p>;
    }

    return (
        <div className="table-scroll">
            <table>
                <caption className="visually-hidden">Blips for {radarName}</caption>
                <thead>
                    <tr>
                        <th scope="col">Name</th>
                        <th scope="col">Quadrant</th>
                        <th scope="col">Ring</th>
                        <th scope="col">Description</th>
                        <th scope="col">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {blips.map((blip) => {
                        const isSelected = blip.id === selectedId;
                        return (
                            <tr key={blip.id} className={isSelected ? "selected" : undefined}>
                                <td>
                                    <button type="button" className="name-toggle" aria-pressed={isSelected} onClick={() => onSelect(blip.id)}>
                                        {blip.name}
                                    </button>
                                </td>
                                <td>{titleCase(quadrantById.get(blip.quadrant_id)?.name ?? "Unknown")}</td>
                                <td>{titleCase(ringById.get(blip.ring_id)?.name ?? "Unknown")}</td>
                                <td>
                                    <details>
                                        <summary>Description</summary>
                                        <p>{blip.description}</p>
                                    </details>
                                </td>
                                <td>
                                    <button type="button" onClick={() => onEdit(blip)}>
                                        Edit<span className="visually-hidden"> {blip.name}</span>
                                    </button>
                                    <button type="button" onClick={() => onDelete(blip)}>
                                        Delete<span className="visually-hidden"> {blip.name}</span>
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, toErrorMessage } from "../api/errors";
import { getRadar, type Blip, type RadarDetail } from "../api/radars";
import { AddBlipDrawer } from "../components/AddBlipDrawer";
import { DeleteBlipDialog } from "../components/DeleteBlipDialog";
import { EditBlipDrawer } from "../components/EditBlipDrawer";
import { titleCase } from "../format";

type OpenDialog = { kind: "add" } | { kind: "edit"; blip: Blip } | { kind: "delete"; blip: Blip } | null;

export function RadarWorkspace() {
    const { radarId } = useParams();
    const [radar, setRadar] = useState<RadarDetail | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState<OpenDialog>(null);

    const load = useCallback(() => {
        if (radarId === undefined) {
            return;
        }
        setLoadError(null);
        setNotFound(false);
        setRadar(null);
        getRadar(radarId)
            .then(setRadar)
            .catch((error: unknown) => {
                if (error instanceof ApiError && error.code === "not_found") {
                    setNotFound(true);
                    return;
                }
                setLoadError(toErrorMessage(error, "Failed to load radar."));
            });
    }, [radarId]);

    useEffect(() => {
        load();
    }, [load]);

    if (notFound) {
        return (
            <main>
                <p>Radar not found.</p>
                <Link to="/radars">Back to radar library</Link>
            </main>
        );
    }

    if (loadError !== null) {
        return (
            <main>
                <p role="alert">{loadError}</p>
                <button type="button" onClick={load}>
                    Try again
                </button>
            </main>
        );
    }

    if (radar === null) {
        return (
            <main>
                <p role="status">Loading radar…</p>
            </main>
        );
    }

    const quadrantById = new Map(radar.quadrants.map((quadrant) => [quadrant.id, quadrant]));
    const ringById = new Map(radar.rings.map((ring) => [ring.id, ring]));

    function handleCreated(blip: Blip) {
        setRadar((current) => (current === null ? current : { ...current, blips: [...current.blips, blip] }));
        setOpenDialog(null);
    }

    function handleSaved(blip: Blip) {
        setRadar((current) =>
            current === null ? current : { ...current, blips: current.blips.map((existing) => (existing.id === blip.id ? blip : existing)) },
        );
        setOpenDialog(null);
    }

    function handleDeleted(blipId: string) {
        setRadar((current) => (current === null ? current : { ...current, blips: current.blips.filter((blip) => blip.id !== blipId) }));
        setOpenDialog(null);
    }

    return (
        <main>
            <h1>{radar.name}</h1>
            <p>{radar.purpose ?? "No purpose set"}</p>
            <dl>
                <dt>Quadrants</dt>
                <dd>{radar.quadrants.map((quadrant) => titleCase(quadrant.name)).join(", ")}</dd>
                <dt>Rings</dt>
                <dd>{radar.rings.map((ring) => titleCase(ring.name)).join(", ")}</dd>
            </dl>
            <button type="button" onClick={() => setOpenDialog({ kind: "add" })}>
                + Add Blip
            </button>
            {radar.blips.length === 0 ? (
                <p>No blips yet.</p>
            ) : (
                <div className="table-scroll">
                    <table>
                        <caption className="visually-hidden">Blips for {radar.name}</caption>
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
                            {radar.blips.map((blip) => (
                                <tr key={blip.id}>
                                    <td>{blip.name}</td>
                                    <td>{titleCase(quadrantById.get(blip.quadrant_id)?.name ?? "Unknown")}</td>
                                    <td>{titleCase(ringById.get(blip.ring_id)?.name ?? "Unknown")}</td>
                                    <td>
                                        <details>
                                            <summary>Description</summary>
                                            <p>{blip.description}</p>
                                        </details>
                                    </td>
                                    <td>
                                        <button type="button" onClick={() => setOpenDialog({ kind: "edit", blip })}>
                                            Edit<span className="visually-hidden"> {blip.name}</span>
                                        </button>
                                        <button type="button" onClick={() => setOpenDialog({ kind: "delete", blip })}>
                                            Delete<span className="visually-hidden"> {blip.name}</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {openDialog?.kind === "add" && (
                <AddBlipDrawer radarId={radar.id} quadrants={radar.quadrants} rings={radar.rings} onCreated={handleCreated} onCancel={() => setOpenDialog(null)} />
            )}
            {openDialog?.kind === "edit" && (
                <EditBlipDrawer
                    radarId={radar.id}
                    blip={openDialog.blip}
                    quadrants={radar.quadrants}
                    rings={radar.rings}
                    onSaved={handleSaved}
                    onCancel={() => setOpenDialog(null)}
                />
            )}
            {openDialog?.kind === "delete" && (
                <DeleteBlipDialog radarId={radar.id} blip={openDialog.blip} onDeleted={handleDeleted} onCancel={() => setOpenDialog(null)} />
            )}
        </main>
    );
}

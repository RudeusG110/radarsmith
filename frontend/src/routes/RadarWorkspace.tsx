import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, toErrorMessage } from "../api/errors";
import { getRadar, type RadarDetail } from "../api/radars";

/** Renders backend enum values ("ADOPT", "LANGUAGES & FRAMEWORKS") as title case. */
function titleCase(value: string): string {
    return value
        .toLowerCase()
        .split(" ")
        .map((word) => (word === "&" ? word : word.charAt(0).toUpperCase() + word.slice(1)))
        .join(" ");
}

export function RadarWorkspace() {
    const { radarId } = useParams();
    const [radar, setRadar] = useState<RadarDetail | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </main>
    );
}

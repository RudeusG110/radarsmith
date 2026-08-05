import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { toErrorMessage } from "../api/errors";
import { listRadars, type RadarSummary } from "../api/radars";
import { NewRadarForm } from "../components/NewRadarForm";

// Frontend-only heuristic: no `bundled`/`is_starter` flag exists in the schema or DB, but the
// TICKET-010 preload migration gives the starter radar this stable, deterministic UUID.
const STARTER_RADAR_ID = "2aa5eefc-c0d3-582e-bb73-5f14ef07953a";

function sortWithStarterFirst(radars: RadarSummary[]): RadarSummary[] {
    return [...radars].sort((a, b) => {
        if (a.id === STARTER_RADAR_ID) {
            return -1;
        }
        if (b.id === STARTER_RADAR_ID) {
            return 1;
        }
        return 0;
    });
}

export function RadarLibrary() {
    const [radars, setRadars] = useState<RadarSummary[] | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const navigate = useNavigate();

    const load = useCallback(() => {
        setLoadError(null);
        listRadars()
            .then(setRadars)
            .catch((error: unknown) => {
                setLoadError(toErrorMessage(error, "Failed to load radars."));
            });
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return (
        <main>
            <div className="lib-head">
                <div>
                    <h1>Radars</h1>
                    {radars !== null && (
                        <p className="subtle">
                            {radars.length} radar{radars.length === 1 ? "" : "s"} · self-hosted, single author
                        </p>
                    )}
                </div>
                <button type="button" className="btn primary" onClick={() => setShowCreateForm(true)}>
                    + New Radar
                </button>
            </div>
            {showCreateForm && (
                <NewRadarForm
                    onCreated={(radar) => navigate(`/radars/${radar.id}`, { state: { justCreated: true } })}
                    onCancel={() => setShowCreateForm(false)}
                />
            )}
            {loadError !== null && (
                <div>
                    <p role="alert">{loadError}</p>
                    <button type="button" className="btn" onClick={load}>
                        Try again
                    </button>
                </div>
            )}
            {loadError === null && radars === null && <p role="status">Loading radars…</p>}
            {loadError === null && radars !== null && radars.length === 0 && (
                <p className="empty-state">You have no radars yet.</p>
            )}
            {loadError === null && radars !== null && radars.length > 0 && (
                <ul className="radar-list">
                    {sortWithStarterFirst(radars).map((radar) => (
                        <li key={radar.id} className="radar-card">
                            <div className="info">
                                <div className="name">
                                    <Link to={`/radars/${radar.id}`}>{radar.name}</Link>
                                    {radar.id === STARTER_RADAR_ID && <span className="tag">Start here</span>}
                                </div>
                                <p className="purpose">{radar.purpose ?? "No purpose set"}</p>
                            </div>
                            <div className="meta">
                                {radar.blip_count} blip{radar.blip_count === 1 ? "" : "s"}
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}

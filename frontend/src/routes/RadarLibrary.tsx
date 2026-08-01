import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { toErrorMessage } from "../api/errors";
import { listRadars, type RadarSummary } from "../api/radars";
import { NewRadarForm } from "../components/NewRadarForm";

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
            <h1>Radars</h1>
            <button type="button" className="btn primary" onClick={() => setShowCreateForm(true)}>
                + New Radar
            </button>
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
                <p>You have no radars yet.</p>
            )}
            {loadError === null && radars !== null && radars.length > 0 && (
                <ul>
                    {radars.map((radar) => (
                        <li key={radar.id}>
                            <Link to={`/radars/${radar.id}`}>{radar.name}</Link>
                            <p>{radar.purpose ?? "No purpose set"}</p>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}

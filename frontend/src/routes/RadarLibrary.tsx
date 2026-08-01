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
                    {radars.map((radar) => (
                        <li key={radar.id} className="radar-card">
                            <div className="name">
                                <Link to={`/radars/${radar.id}`}>{radar.name}</Link>
                            </div>
                            <p className="purpose">{radar.purpose ?? "No purpose set"}</p>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}

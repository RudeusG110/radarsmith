import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { ApiError, toErrorMessage } from "../api/errors";
import { getRadar, type Blip, type RadarDetail } from "../api/radars";
import { AddBlipDrawer } from "../components/AddBlipDrawer";
import { BlipDetailPanel } from "../components/BlipDetailPanel";
import { BlipTable } from "../components/BlipTable";
import { DeleteBlipDialog } from "../components/DeleteBlipDialog";
import { EditBlipDrawer } from "../components/EditBlipDrawer";
import { RadarSvg } from "../components/RadarSvg";
import { Tabs, type TabItem } from "../components/Tabs";
import { titleCase } from "../format";
import { useMediaQuery } from "../useMediaQuery";

type OpenDialog = { kind: "add" } | { kind: "edit"; blip: Blip } | { kind: "delete"; blip: Blip } | null;
type WorkspaceTab = "radar" | "blips";

const NARROW_QUERY = "(max-width: 860px)";
const WORKSPACE_TABS: TabItem[] = [
    { id: "radar", label: "Radar" },
    { id: "blips", label: "Blips" },
];

export function RadarWorkspace() {
    const { radarId } = useParams();
    const [radar, setRadar] = useState<RadarDetail | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
    const [selectedBlipId, setSelectedBlipId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<WorkspaceTab>("radar");
    const isNarrow = useMediaQuery(NARROW_QUERY);

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
    const selectedBlip = radar.blips.find((blip) => blip.id === selectedBlipId) ?? null;
    const selectedQuadrantLabel =
        selectedBlip === null ? "" : titleCase(quadrantById.get(selectedBlip.quadrant_id)?.name ?? "Unknown");
    const selectedRingLabel = selectedBlip === null ? "" : titleCase(ringById.get(selectedBlip.ring_id)?.name ?? "Unknown");

    function handleSelect(id: string) {
        setSelectedBlipId((current) => (current === id ? null : id));
    }

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
        setSelectedBlipId((current) => (current === blipId ? null : current));
        setOpenDialog(null);
    }

    const radarView = (
        <RadarSvg
            radarName={radar.name}
            quadrants={radar.quadrants}
            rings={radar.rings}
            blips={radar.blips}
            selectedId={selectedBlipId}
            onSelect={handleSelect}
        />
    );
    const tableView = (
        <BlipTable
            radarName={radar.name}
            blips={radar.blips}
            quadrantById={quadrantById}
            ringById={ringById}
            selectedId={selectedBlipId}
            onSelect={handleSelect}
            onEdit={(blip) => setOpenDialog({ kind: "edit", blip })}
            onDelete={(blip) => setOpenDialog({ kind: "delete", blip })}
        />
    );

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
            {isNarrow ? (
                <>
                    <Tabs
                        label="Workspace view"
                        tabs={WORKSPACE_TABS}
                        activeId={activeTab}
                        onChange={(id) => setActiveTab(id as WorkspaceTab)}
                    />
                    <div role="tabpanel" id="radar-panel" aria-labelledby="radar-tab" hidden={activeTab !== "radar"}>
                        {radarView}
                    </div>
                    <div role="tabpanel" id="blips-panel" aria-labelledby="blips-tab" hidden={activeTab !== "blips"}>
                        {tableView}
                    </div>
                </>
            ) : (
                <div className="workspace-grid">
                    {radarView}
                    {tableView}
                </div>
            )}
            <BlipDetailPanel blip={selectedBlip} quadrantLabel={selectedQuadrantLabel} ringLabel={selectedRingLabel} />
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

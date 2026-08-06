import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { ApiError, toErrorMessage } from "../api/errors";
import { getRadar, type Blip, type RadarDetail } from "../api/radars";
import { AddBlipDrawer } from "../components/AddBlipDrawer";
import { BlipTable } from "../components/BlipTable";
import { DeleteBlipDialog } from "../components/DeleteBlipDialog";
import { EditBlipDrawer } from "../components/EditBlipDrawer";
import { RadarGlossary } from "../components/RadarGlossary";
import { RadarSvg } from "../components/RadarSvg";
import { RadarViewPanel, type RadarViewSelection } from "../components/RadarViewPanel";
import { Tabs, type TabItem } from "../components/Tabs";
import { indexById } from "../collections";
import { titleCase } from "../format";
import { useMediaQuery } from "../useMediaQuery";
import { useWorkspaceChrome, type WorkspaceMode } from "../workspaceChrome";

type OpenDialog = { kind: "add" } | { kind: "edit"; blip: Blip } | { kind: "delete"; blip: Blip } | null;
type WorkspaceTab = "radar" | "blips";
type ViewSelectionState = { kind: "blip"; blipId: string } | { kind: "quadrant"; quadrantId: string } | null;

// Wider than .view-grid's 860px: edit-grid's blip-table column (640px) is wider than
// view-grid's side panel (420px), so edit needs more width before the radar gets cramped.
const EDIT_NARROW_QUERY = "(max-width: 1080px)";
const WORKSPACE_TABS: TabItem[] = [
    { id: "radar", label: "Radar" },
    { id: "blips", label: "Blips" },
];

export function RadarWorkspace() {
    const { radarId } = useParams();
    const location = useLocation();
    const [radar, setRadar] = useState<RadarDetail | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [openDialog, setOpenDialog] = useState<OpenDialog>(null);
    const [selectedBlipId, setSelectedBlipId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<WorkspaceTab>("radar");
    const [mode, setMode] = useState<WorkspaceMode>("view");
    const [viewSelection, setViewSelection] = useState<ViewSelectionState>(null);
    const isNarrow = useMediaQuery(EDIT_NARROW_QUERY);
    const markerRefs = useRef(new Map<string, SVGGElement>());
    const rowRefs = useRef(new Map<string, HTMLButtonElement>());
    const { setChrome } = useWorkspaceChrome();

    const handleModeChange = useCallback((next: WorkspaceMode) => {
        setMode(next);
        setOpenDialog(null);
    }, []);

    const load = useCallback(() => {
        if (radarId === undefined) {
            return;
        }
        setLoadError(null);
        setNotFound(false);
        setRadar(null);
        let cancelled = false;
        getRadar(radarId)
            .then((detail) => {
                if (!cancelled) {
                    setRadar(detail);
                }
            })
            .catch((error: unknown) => {
                if (cancelled) {
                    return;
                }
                if (error instanceof ApiError && error.code === "not_found") {
                    setNotFound(true);
                    return;
                }
                setLoadError(toErrorMessage(error, "Failed to load radar."));
            });
        return () => {
            cancelled = true;
        };
    }, [radarId]);

    useEffect(() => {
        return load();
    }, [load]);

    /** Just-created radars open in Edit mode; opening an existing radar defaults to View. */
    useEffect(() => {
        const justCreated = (location.state as { justCreated?: boolean } | null)?.justCreated ?? false;
        setMode(justCreated ? "edit" : "view");
        setViewSelection(null);
    }, [radarId, location.state]);

    /**
     * Publishes the crumb/mode-toggle to the persistent TopBar instead of rendering them here.
     * Uses useLayoutEffect (not useEffect) so it commits synchronously with the radar/mode
     * render it depends on, instead of one tick later.
     */
    useLayoutEffect(() => {
        if (radar === null) {
            setChrome(null);
            return;
        }
        setChrome({ radarName: radar.name, mode, onModeChange: handleModeChange });
        return () => setChrome(null);
    }, [radar, mode, handleModeChange, setChrome]);

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
                <button type="button" className="btn" onClick={load}>
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

    const quadrantById = indexById(radar.quadrants);
    const ringById = indexById(radar.rings);

    const orderedRings = [...radar.rings].sort((a, b) => a.position - b.position);
    const viewPanelSelection: RadarViewSelection =
        viewSelection === null
            ? null
            : viewSelection.kind === "blip"
                ? (() => {
                    const blip = radar.blips.find((candidate) => candidate.id === viewSelection.blipId);
                    if (blip === undefined) {
                        return null;
                    }
                    return {
                        kind: "blip",
                        blip,
                        quadrantLabel: titleCase(quadrantById.get(blip.quadrant_id)?.name ?? "Unknown"),
                        ringLabel: titleCase(ringById.get(blip.ring_id)?.name ?? "Unknown"),
                    };
                })()
                : {
                    kind: "quadrant",
                    quadrantLabel: titleCase(quadrantById.get(viewSelection.quadrantId)?.name ?? "Unknown"),
                    groups: orderedRings
                        .map((ring) => ({
                            ringLabel: titleCase(ring.name),
                            blips: radar.blips
                                .filter((blip) => blip.quadrant_id === viewSelection.quadrantId && blip.ring_id === ring.id)
                                .sort((a, b) => a.name.localeCompare(b.name)),
                        }))
                        .filter((group) => group.blips.length > 0),
                };

    /** Selecting from one surface also moves focus onto the matching element in the other. */
    function handleSelect(id: string, source: "marker" | "row") {
        const next = selectedBlipId === id ? null : id;
        setSelectedBlipId(next);
        if (next === null) {
            return;
        }
        const target = source === "row" ? markerRefs.current.get(id) : rowRefs.current.get(id);
        target?.focus();
    }

    function handleSelectViewBlip(id: string) {
        setViewSelection((current) => (current?.kind === "blip" && current.blipId === id ? null : { kind: "blip", blipId: id }));
    }

    function handleSelectViewQuadrant(id: string) {
        setViewSelection((current) => (current?.kind === "quadrant" && current.quadrantId === id ? null : { kind: "quadrant", quadrantId: id }));
    }

    function registerMarkerRef(blipId: string, element: SVGGElement | null) {
        if (element === null) {
            markerRefs.current.delete(blipId);
        } else {
            markerRefs.current.set(blipId, element);
        }
    }

    function registerRowRef(blipId: string, element: HTMLButtonElement | null) {
        if (element === null) {
            rowRefs.current.delete(blipId);
        } else {
            rowRefs.current.set(blipId, element);
        }
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

    const editRadarView = (
        <div className="panel radar-panel">
            <div className="panel-title">Radar</div>
            <div className="radar-wrap">
                <RadarSvg
                    radarName={radar.name}
                    quadrants={radar.quadrants}
                    rings={radar.rings}
                    blips={radar.blips}
                    selectedId={selectedBlipId}
                    onSelect={(id) => handleSelect(id, "marker")}
                    markerRef={registerMarkerRef}
                />
            </div>
            <RadarGlossary quadrants={radar.quadrants} rings={radar.rings} />
        </div>
    );
    const tableView = (
        <BlipTable
            radarName={radar.name}
            blips={radar.blips}
            quadrantById={quadrantById}
            ringById={ringById}
            selectedId={selectedBlipId}
            onSelect={(id) => handleSelect(id, "row")}
            onEdit={(blip) => setOpenDialog({ kind: "edit", blip })}
            onDelete={(blip) => setOpenDialog({ kind: "delete", blip })}
            rowRef={registerRowRef}
        />
    );
    const blipsPanel = (
        <div className="panel blips-panel">
            <div className="panel-title">
                Blips
                <button type="button" className="btn primary" onClick={() => setOpenDialog({ kind: "add" })}>
                    + Add Blip
                </button>
            </div>
            <div className="panel-body">{tableView}</div>
        </div>
    );

    return (
        <main className="workspace-main">
            <h1>{radar.name}</h1>
            <p>{radar.purpose ?? "No purpose set"}</p>
            {mode === "view" ? (
                <div className="view-grid">
                    <div className="panel radar-panel">
                        <div className="panel-title">Radar</div>
                        <div className="radar-wrap">
                            <RadarSvg
                                radarName={radar.name}
                                quadrants={radar.quadrants}
                                rings={radar.rings}
                                blips={radar.blips}
                                selectedId={viewSelection?.kind === "blip" ? viewSelection.blipId : null}
                                onSelect={handleSelectViewBlip}
                                onSelectQuadrant={handleSelectViewQuadrant}
                            />
                        </div>
                        <RadarGlossary quadrants={radar.quadrants} rings={radar.rings} />
                    </div>
                    <RadarViewPanel selection={viewPanelSelection} onSelectBlip={handleSelectViewBlip} />
                </div>
            ) : (
                <>
                    {isNarrow ? (
                        <>
                            <Tabs
                                label="Workspace view"
                                tabs={WORKSPACE_TABS}
                                activeId={activeTab}
                                onChange={(id) => setActiveTab(id as WorkspaceTab)}
                            />
                            <div role="tabpanel" id="radar-panel" aria-labelledby="radar-tab" hidden={activeTab !== "radar"}>
                                {editRadarView}
                            </div>
                            <div role="tabpanel" id="blips-panel" aria-labelledby="blips-tab" hidden={activeTab !== "blips"}>
                                {blipsPanel}
                            </div>
                        </>
                    ) : (
                        <div className="edit-grid">
                            {editRadarView}
                            {blipsPanel}
                        </div>
                    )}
                </>
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

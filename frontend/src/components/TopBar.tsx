import { Link } from "react-router-dom";

import { useWorkspaceChrome } from "../workspaceChrome";

/** Persistent across every route: brand/home link, workspace crumb, and the View/Edit toggle. */
export function TopBar() {
    const { chrome } = useWorkspaceChrome();

    return (
        <header className="topbar">
            <Link to="/radars" className="brand">
                <span className="logo" aria-hidden="true">
                    ◤
                </span>{" "}
                RadarSmith
            </Link>
            {chrome !== null && <span className="subtle">/ {chrome.radarName}</span>}
            <div className="spacer" />
            {chrome !== null && (
                <div className="mode-toggle" role="group" aria-label="Workspace mode">
                    <button
                        type="button"
                        className={chrome.mode === "view" ? "active" : undefined}
                        aria-pressed={chrome.mode === "view"}
                        onClick={() => chrome.onModeChange("view")}
                    >
                        View
                    </button>
                    <button
                        type="button"
                        className={chrome.mode === "edit" ? "active" : undefined}
                        aria-pressed={chrome.mode === "edit"}
                        onClick={() => chrome.onModeChange("edit")}
                    >
                        Edit
                    </button>
                </div>
            )}
        </header>
    );
}

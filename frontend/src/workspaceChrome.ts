import { createContext, useContext } from "react";

export type WorkspaceMode = "view" | "edit";

export interface WorkspaceChrome {
    radarName: string;
    mode: WorkspaceMode;
    onModeChange: (mode: WorkspaceMode) => void;
}

export interface WorkspaceChromeContextValue {
    chrome: WorkspaceChrome | null;
    setChrome: (chrome: WorkspaceChrome | null) => void;
}

// No-op default: lets components read/set chrome in tests that render them without a provider.
export const WorkspaceChromeContext = createContext<WorkspaceChromeContextValue>({
    chrome: null,
    setChrome: () => undefined,
});

export function useWorkspaceChrome(): WorkspaceChromeContextValue {
    return useContext(WorkspaceChromeContext);
}

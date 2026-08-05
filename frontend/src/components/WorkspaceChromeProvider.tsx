import { useMemo, useState } from "react";

import { WorkspaceChromeContext, type WorkspaceChrome } from "../workspaceChrome";

interface WorkspaceChromeProviderProps {
    children: React.ReactNode;
}

/** Lets the persistent `TopBar` render a workspace's crumb/mode-toggle without prop-drilling through the router. */
export function WorkspaceChromeProvider({ children }: WorkspaceChromeProviderProps) {
    const [chrome, setChrome] = useState<WorkspaceChrome | null>(null);
    const value = useMemo(() => ({ chrome, setChrome }), [chrome]);

    return <WorkspaceChromeContext.Provider value={value}>{children}</WorkspaceChromeContext.Provider>;
}

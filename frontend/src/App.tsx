import { Navigate, Route, Routes } from "react-router-dom";

import { ToastProvider } from "./components/ToastProvider";
import { TopBar } from "./components/TopBar";
import { WorkspaceChromeProvider } from "./components/WorkspaceChromeProvider";
import { RadarLibrary } from "./routes/RadarLibrary";
import { RadarWorkspace } from "./routes/RadarWorkspace";

export function App() {
    return (
        <ToastProvider>
            <WorkspaceChromeProvider>
                <TopBar />
                <Routes>
                    <Route path="/" element={<Navigate to="/radars" replace />} />
                    <Route path="/radars" element={<RadarLibrary />} />
                    <Route path="/radars/:radarId" element={<RadarWorkspace />} />
                </Routes>
            </WorkspaceChromeProvider>
        </ToastProvider>
    );
}

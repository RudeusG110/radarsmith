import { Navigate, Route, Routes } from "react-router-dom";

import { RadarLibrary } from "./routes/RadarLibrary";
import { RadarWorkspace } from "./routes/RadarWorkspace";

export function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/radars" replace />} />
            <Route path="/radars" element={<RadarLibrary />} />
            <Route path="/radars/:radarId" element={<RadarWorkspace />} />
        </Routes>
    );
}

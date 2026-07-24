import { useParams } from "react-router-dom";

export function RadarWorkspace() {
    const { radarId } = useParams();

    return (
        <main>
            <h1>Radar workspace</h1>
            <p>Editing radar {radarId}.</p>
        </main>
    );
}

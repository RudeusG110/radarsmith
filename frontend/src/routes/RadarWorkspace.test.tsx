import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeBlip, makeQuadrant, makeRadarDetail, makeRing } from "../test/factories";
import { RadarWorkspace } from "./RadarWorkspace";

function renderWorkspace(radarId = "r1") {
    render(
        <MemoryRouter initialEntries={[`/radars/${radarId}`]}>
            <Routes>
                <Route path="/radars" element={<p>Radar library</p>} />
                <Route path="/radars/:radarId" element={<RadarWorkspace />} />
            </Routes>
        </MemoryRouter>,
    );
}

describe("RadarWorkspace", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shows a loading state, then the radar name, purpose, structure, and blip table", async () => {
        const quadrant = makeQuadrant({ id: "q1", name: "TECHNIQUES" });
        const ring = makeRing({ id: "ring1", name: "ADOPT" });
        const blip = makeBlip({
            id: "b1",
            name: "Service Mesh",
            description: "A dedicated infrastructure layer.",
            quadrant_id: "q1",
            ring_id: "ring1",
        });
        const radar = makeRadarDetail({
            name: "Engineering Radar",
            purpose: "Our stances",
            quadrants: [quadrant],
            rings: [ring],
            blips: [blip],
        });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderWorkspace();

        expect(screen.getByRole("status")).toHaveTextContent("Loading radar…");

        expect(await screen.findByRole("heading", { name: "Engineering Radar" })).toBeInTheDocument();
        expect(screen.getByText("Our stances")).toBeInTheDocument();

        expect(screen.getByRole("cell", { name: "Service Mesh" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Quadrant" })).toBeInTheDocument();
        expect(screen.getAllByText("Techniques").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Adopt").length).toBeGreaterThan(0);

        expect(screen.getByRole("group")).not.toHaveAttribute("open");
        fireEvent.click(screen.getByRole("group").querySelector("summary")!);
        expect(screen.getByText("A dedicated infrastructure layer.")).toBeInTheDocument();
    });

    it("shows an empty state when the radar has no blips", async () => {
        const radar = makeRadarDetail({ blips: [] });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderWorkspace();

        expect(await screen.findByText("No blips yet.")).toBeInTheDocument();
    });

    it("shows a not-found state with a link back to the library", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                Response.json({ error: { code: "not_found", message: "Radar not found." } }, { status: 404 }),
            ),
        );
        renderWorkspace("missing-id");

        expect(await screen.findByText("Radar not found.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Back to radar library" })).toHaveAttribute("href", "/radars");
    });

    it("shows a retryable error state that recovers", async () => {
        const radar = makeRadarDetail({ name: "Engineering Radar" });
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                Response.json({ error: { code: "conflict", message: "Failed to reach the server." } }, { status: 500 }),
            )
            .mockResolvedValueOnce(Response.json(radar, { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        renderWorkspace();

        expect(await screen.findByRole("alert")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Try again" }));

        expect(await screen.findByRole("heading", { name: "Engineering Radar" })).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});

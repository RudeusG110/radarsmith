import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

    it("adds a new blip to the table from the server-confirmed response, without refetching the radar", async () => {
        const quadrant = makeQuadrant({ id: "q1", name: "TECHNIQUES" });
        const ring = makeRing({ id: "ring1", name: "ADOPT" });
        const radar = makeRadarDetail({ quadrants: [quadrant], rings: [ring], blips: [] });
        const newBlip = makeBlip({ id: "b2", name: "Feature Flags", description: "Toggle behavior at runtime." });
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(Response.json(radar, { status: 200 }))
            .mockResolvedValueOnce(Response.json(newBlip, { status: 201 }));
        vi.stubGlobal("fetch", fetchMock);
        renderWorkspace();

        await screen.findByRole("heading", { name: radar.name });
        fireEvent.click(screen.getByRole("button", { name: "+ Add Blip" }));
        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Feature Flags" } });
        fireEvent.change(screen.getByLabelText("Description"), { target: { value: "Toggle behavior at runtime." } });
        fireEvent.click(screen.getByRole("button", { name: "Add blip" }));

        expect(await screen.findByRole("cell", { name: "Feature Flags" })).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("updates a blip in the table from the server-confirmed response", async () => {
        const quadrant = makeQuadrant({ id: "q1", name: "TECHNIQUES" });
        const ring = makeRing({ id: "ring1", name: "ADOPT" });
        const blip = makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" });
        const radar = makeRadarDetail({ quadrants: [quadrant], rings: [ring], blips: [blip] });
        const updatedBlip = makeBlip({ ...blip, name: "Service Mesh v2" });
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(Response.json(radar, { status: 200 }))
            .mockResolvedValueOnce(Response.json(updatedBlip, { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        renderWorkspace();

        await screen.findByRole("cell", { name: "Service Mesh" });
        fireEvent.click(screen.getByRole("button", { name: "Edit Service Mesh" }));
        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Service Mesh v2" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        expect(await screen.findByRole("cell", { name: "Service Mesh v2" })).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("removes a blip from the table after a confirmed delete", async () => {
        const blip = makeBlip({ id: "b1", name: "Service Mesh" });
        const radar = makeRadarDetail({ blips: [blip] });
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(Response.json(radar, { status: 200 }))
            .mockResolvedValueOnce(new Response(null, { status: 204 }));
        vi.stubGlobal("fetch", fetchMock);
        renderWorkspace();

        await screen.findByRole("cell", { name: "Service Mesh" });
        fireEvent.click(screen.getByRole("button", { name: "Delete Service Mesh" }));
        expect(screen.getByRole("dialog")).toHaveTextContent("Delete Service Mesh?");
        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() => expect(screen.queryByRole("cell", { name: "Service Mesh" })).not.toBeInTheDocument());
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
});

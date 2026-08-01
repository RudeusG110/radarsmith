import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TopBar } from "../components/TopBar";
import { WorkspaceChromeProvider } from "../components/WorkspaceChromeProvider";
import { makeBlip, makeQuadrant, makeRadarDetail, makeRing, stubMatchMedia } from "../test/factories";
import { RadarWorkspace } from "./RadarWorkspace";

function renderWorkspace(radarId = "r1", locationState?: { justCreated: boolean }) {
    render(
        <WorkspaceChromeProvider>
            <MemoryRouter initialEntries={[{ pathname: `/radars/${radarId}`, state: locationState }]}>
                <TopBar />
                <Routes>
                    <Route path="/radars" element={<p>Radar library</p>} />
                    <Route path="/radars/:radarId" element={<RadarWorkspace />} />
                </Routes>
            </MemoryRouter>
        </WorkspaceChromeProvider>,
    );
}

/** Most existing coverage exercises Edit mode's add/edit/delete workflow, so land there directly. */
function renderEditWorkspace(radarId = "r1") {
    renderWorkspace(radarId, { justCreated: true });
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
        renderEditWorkspace();

        expect(screen.getByRole("status")).toHaveTextContent("Loading radar…");

        expect(await screen.findByRole("heading", { name: "Engineering Radar" })).toBeInTheDocument();
        expect(screen.getByText("Our stances")).toBeInTheDocument();

        expect(screen.getByRole("cell", { name: "Service Mesh" })).toBeInTheDocument();
        expect(screen.getByRole("columnheader", { name: "Quadrant" })).toBeInTheDocument();
        expect(screen.getAllByText("Techniques").length).toBeGreaterThan(0);
        expect(screen.getAllByText("Adopt").length).toBeGreaterThan(0);
    });

    it("shows an empty state when the radar has no blips", async () => {
        const radar = makeRadarDetail({ blips: [] });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderEditWorkspace();

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
        renderEditWorkspace();

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
        renderEditWorkspace();

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
        renderEditWorkspace();

        await screen.findByRole("cell", { name: "Service Mesh" });
        fireEvent.click(screen.getByRole("button", { name: "Delete Service Mesh" }));
        expect(screen.getByRole("dialog")).toHaveTextContent("Delete Service Mesh?");
        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() => expect(screen.queryByRole("cell", { name: "Service Mesh" })).not.toBeInTheDocument());
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("shows radar and table together with no tabs on wide screens, and syncs selection both ways", async () => {
        const quadrant = makeQuadrant({ id: "q1", name: "TECHNIQUES" });
        const ring = makeRing({ id: "ring1", name: "ADOPT" });
        const blip = makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" });
        const radar = makeRadarDetail({ quadrants: [quadrant], rings: [ring], blips: [blip] });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderEditWorkspace();

        await screen.findByRole("cell", { name: "Service Mesh" });
        expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
        expect(screen.getByRole("graphics-symbol")).toBeInTheDocument();
        expect(screen.getByText("Select a blip marker or row to see its details.")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Service Mesh" }));

        expect(screen.getByRole("button", { name: "Service Mesh" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("graphics-symbol").querySelector("circle")).toHaveAttribute("stroke", "var(--accent)");
        expect(screen.getByRole("heading", { name: "Service Mesh" })).toBeInTheDocument();
        expect(screen.getByRole("graphics-symbol")).toHaveFocus();

        fireEvent.click(screen.getByRole("graphics-symbol"));

        expect(screen.getByRole("button", { name: "Service Mesh" })).toHaveAttribute("aria-pressed", "false");
        expect(screen.getByText("Select a blip marker or row to see its details.")).toBeInTheDocument();
    });

    it("selects and focuses a row when its unselected marker is clicked first", async () => {
        const quadrant = makeQuadrant({ id: "q1", name: "TECHNIQUES" });
        const ring = makeRing({ id: "ring1", name: "ADOPT" });
        const blip = makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" });
        const radar = makeRadarDetail({ quadrants: [quadrant], rings: [ring], blips: [blip] });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderEditWorkspace();

        await screen.findByRole("graphics-symbol");
        expect(screen.getByRole("button", { name: "Service Mesh" })).toHaveAttribute("aria-pressed", "false");

        fireEvent.click(screen.getByRole("graphics-symbol"));

        expect(screen.getByRole("button", { name: "Service Mesh" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Service Mesh" })).toHaveFocus();
        expect(screen.getByRole("heading", { name: "Service Mesh" })).toBeInTheDocument();
    });

    it("shows Radar/Blips tabs on narrow screens and preserves selection across tab switches", async () => {
        stubMatchMedia(true);
        const quadrant = makeQuadrant({ id: "q1", name: "TECHNIQUES" });
        const ring = makeRing({ id: "ring1", name: "ADOPT" });
        const blip = makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" });
        const radar = makeRadarDetail({ quadrants: [quadrant], rings: [ring], blips: [blip] });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderEditWorkspace();

        await screen.findByRole("tablist", { name: "Workspace view" });
        expect(screen.getByRole("tab", { name: "Radar" })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("graphics-symbol")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Service Mesh" })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("graphics-symbol"));
        fireEvent.click(screen.getByRole("tab", { name: "Blips" }));

        expect(screen.getByRole("tab", { name: "Blips" })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("button", { name: "Service Mesh" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("heading", { name: "Service Mesh" })).toBeInTheDocument();
    });

    it("preserves selection when resizing from wide to narrow", async () => {
        const media = stubMatchMedia(false);
        const quadrant = makeQuadrant({ id: "q1", name: "TECHNIQUES" });
        const ring = makeRing({ id: "ring1", name: "ADOPT" });
        const blip = makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" });
        const radar = makeRadarDetail({ quadrants: [quadrant], rings: [ring], blips: [blip] });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderEditWorkspace();

        await screen.findByRole("cell", { name: "Service Mesh" });
        expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole("button", { name: "Service Mesh" }));

        act(() => media.setMatches(true));

        expect(await screen.findByRole("tablist", { name: "Workspace view" })).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Service Mesh" })).toBeInTheDocument();
    });

    it("defaults to View mode when opening an existing radar, with no edit affordances", async () => {
        const quadrant = makeQuadrant({ id: "q1", name: "TECHNIQUES" });
        const ring = makeRing({ id: "ring1", name: "ADOPT" });
        const blip = makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" });
        const radar = makeRadarDetail({ quadrants: [quadrant], rings: [ring], blips: [blip] });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderWorkspace();

        await screen.findByRole("heading", { name: radar.name });
        expect(screen.getByRole("button", { name: "View" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute("aria-pressed", "false");
        expect(screen.queryByRole("button", { name: "+ Add Blip" })).not.toBeInTheDocument();
        expect(screen.queryByRole("cell", { name: "Service Mesh" })).not.toBeInTheDocument();
        expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
        expect(screen.getByText("Select a blip or a quadrant to see details.")).toBeInTheDocument();
    });

    it("defaults to Edit mode right after creating a radar", async () => {
        const radar = makeRadarDetail({ blips: [] });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderEditWorkspace();

        await screen.findByRole("heading", { name: radar.name });
        expect(screen.getByRole("button", { name: "Edit" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "+ Add Blip" })).toBeInTheDocument();
    });

    it("switches between View and Edit via the mode toggle", async () => {
        const blip = makeBlip({ id: "b1", name: "Service Mesh" });
        const radar = makeRadarDetail({ blips: [blip] });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderWorkspace();

        await screen.findByRole("heading", { name: radar.name });
        expect(screen.queryByRole("button", { name: "+ Add Blip" })).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Edit" }));
        expect(screen.getByRole("button", { name: "+ Add Blip" })).toBeInTheDocument();
        expect(screen.getByRole("cell", { name: "Service Mesh" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "View" }));
        expect(screen.queryByRole("button", { name: "+ Add Blip" })).not.toBeInTheDocument();
    });

    it("View mode: selecting a blip marker shows its detail in the side panel", async () => {
        const quadrant = makeQuadrant({ id: "q1", name: "TECHNIQUES" });
        const ring = makeRing({ id: "ring1", name: "ADOPT" });
        const blip = makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" });
        const radar = makeRadarDetail({ quadrants: [quadrant], rings: [ring], blips: [blip] });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderWorkspace();

        await screen.findByRole("graphics-symbol");
        fireEvent.click(screen.getByRole("graphics-symbol"));

        expect(screen.getByRole("heading", { name: "Service Mesh" })).toBeInTheDocument();
        expect(screen.getByText("Techniques, Adopt")).toBeInTheDocument();
    });

    it("View mode: selecting a quadrant shows a ring-grouped table, and clicking a blip name drills into its detail", async () => {
        const quadrant = makeQuadrant({ id: "q1", name: "TECHNIQUES" });
        const ring = makeRing({ id: "ring1", name: "ADOPT" });
        const blip = makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" });
        const radar = makeRadarDetail({ quadrants: [quadrant], rings: [ring], blips: [blip] });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderWorkspace();

        const sector = await screen.findByRole("graphics-object", { name: "Techniques" });
        const hitArea = sector.querySelector(".quad-hit")!;
        fireEvent.click(hitArea);

        expect(screen.getByRole("heading", { name: "Techniques" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Service Mesh" })).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Service Mesh" }));

        expect(screen.getByRole("heading", { name: "Service Mesh" })).toBeInTheDocument();
    });

    it("View mode: stacks the side panel below the radar on narrow screens, with no tab toggle", async () => {
        stubMatchMedia(true);
        const quadrant = makeQuadrant({ id: "q1", name: "TECHNIQUES" });
        const ring = makeRing({ id: "ring1", name: "ADOPT" });
        const blip = makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" });
        const radar = makeRadarDetail({ quadrants: [quadrant], rings: [ring], blips: [blip] });
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 200 })));
        renderWorkspace();

        await screen.findByRole("graphics-symbol");
        expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
        expect(screen.getByText("Select a blip or a quadrant to see details.")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("graphics-symbol"));

        expect(screen.getByRole("heading", { name: "Service Mesh" })).toBeInTheDocument();
        expect(screen.getByRole("graphics-symbol")).toBeInTheDocument();
    });
});

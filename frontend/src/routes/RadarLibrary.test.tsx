import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeRadarDetail, makeRadarSummary } from "../test/factories";
import { RadarLibrary } from "./RadarLibrary";
import { RadarWorkspace } from "./RadarWorkspace";

function renderLibrary() {
    render(
        <MemoryRouter initialEntries={["/radars"]}>
            <Routes>
                <Route path="/radars" element={<RadarLibrary />} />
                <Route path="/radars/:radarId" element={<RadarWorkspace />} />
            </Routes>
        </MemoryRouter>,
    );
}

describe("RadarLibrary", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("shows a loading state, then the radar list", async () => {
        const radars = [makeRadarSummary({ name: "Engineering Radar", purpose: "Our stances" })];
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radars, { status: 200 })));
        renderLibrary();

        expect(screen.getByRole("status")).toHaveTextContent("Loading radars…");

        expect(await screen.findByRole("link", { name: "Engineering Radar" })).toHaveAttribute(
            "href",
            "/radars/r1",
        );
        expect(screen.getByText("Our stances")).toBeInTheDocument();
    });

    it("shows an empty state when there are no radars", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([], { status: 200 })));
        renderLibrary();

        expect(await screen.findByText("You have no radars yet.")).toBeInTheDocument();
    });

    it("shows a retryable error state that recovers", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(
                Response.json({ error: { code: "not_found", message: "Failed to reach the server." } }, { status: 500 }),
            )
            .mockResolvedValueOnce(
                Response.json([makeRadarSummary({ name: "Engineering Radar" })], { status: 200 }),
            );
        vi.stubGlobal("fetch", fetchMock);
        renderLibrary();

        expect(await screen.findByRole("alert")).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: "Try again" }));

        expect(await screen.findByRole("link", { name: "Engineering Radar" })).toBeInTheDocument();
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("creates a radar and navigates to its workspace", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(Response.json([], { status: 200 }))
            .mockResolvedValueOnce(
                Response.json(makeRadarDetail({ id: "new-id", name: "Mobile Radar" }), { status: 201 }),
            );
        vi.stubGlobal("fetch", fetchMock);
        renderLibrary();

        await screen.findByText("You have no radars yet.");
        fireEvent.click(screen.getByRole("button", { name: "+ New Radar" }));
        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Mobile Radar" } });
        fireEvent.click(screen.getByRole("button", { name: "Create radar" }));

        expect(await screen.findByText("Editing radar new-id.")).toBeInTheDocument();
    });
});

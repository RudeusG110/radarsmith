import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeBlip, makeQuadrant, makeRing } from "../test/factories";
import { EditBlipDrawer } from "./EditBlipDrawer";

const quadrants = [makeQuadrant({ id: "q1", name: "TECHNIQUES" }), makeQuadrant({ id: "q2", name: "TOOLS" })];
const rings = [makeRing({ id: "ring1", name: "ADOPT" }), makeRing({ id: "ring2", name: "TRIAL" })];
const blip = makeBlip({ id: "b1", name: "Service Mesh", description: "A mesh.", quadrant_id: "q1", ring_id: "ring1" });

function renderDrawer(onSaved = vi.fn(), onCancel = vi.fn()) {
    render(<EditBlipDrawer radarId="r1" blip={blip} quadrants={quadrants} rings={rings} onSaved={onSaved} onCancel={onCancel} />);
}

/** Mirrors how RadarWorkspace opens the drawer from a trigger button, for focus-restore tests. */
function Harness() {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button type="button" onClick={() => setOpen(true)}>
                Open
            </button>
            {open && (
                <EditBlipDrawer
                    radarId="r1"
                    blip={blip}
                    quadrants={quadrants}
                    rings={rings}
                    onSaved={() => setOpen(false)}
                    onCancel={() => setOpen(false)}
                />
            )}
        </div>
    );
}

async function requestBody(fetchMock: ReturnType<typeof vi.fn>): Promise<unknown> {
    const request = fetchMock.mock.calls[0][0] as Request;
    return request.clone().json();
}

describe("EditBlipDrawer", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("initializes fields from the blip and disables Save until something changes", () => {
        renderDrawer();

        expect(screen.getByLabelText("Name")).toHaveValue("Service Mesh");
        expect(screen.getByLabelText("Description")).toHaveValue("A mesh.");
        expect(screen.getByLabelText("Quadrant")).toHaveValue("q1");
        expect(screen.getByLabelText("Ring")).toHaveValue("ring1");
        expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    });

    it("sends only the changed fields for a content-only edit", async () => {
        const fetchMock = vi.fn().mockResolvedValue(Response.json(makeBlip({ ...blip, name: "Service Mesh 2" }), { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        const onSaved = vi.fn();
        renderDrawer(onSaved);

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Service Mesh 2" } });
        expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(await requestBody(fetchMock)).toEqual({ name: "Service Mesh 2" });
    });

    it("sends only the changed fields for a placement-only edit", async () => {
        const fetchMock = vi.fn().mockResolvedValue(Response.json(makeBlip({ ...blip, quadrant_id: "q2" }), { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        const onSaved = vi.fn();
        renderDrawer(onSaved);

        fireEvent.change(screen.getByLabelText("Quadrant"), { target: { value: "q2" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(await requestBody(fetchMock)).toEqual({ quadrant_id: "q2" });
    });

    it("sends all changed fields for a combined edit", async () => {
        const fetchMock = vi.fn().mockResolvedValue(Response.json(blip, { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        const onSaved = vi.fn();
        renderDrawer(onSaved);

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Service Mesh 2" } });
        fireEvent.change(screen.getByLabelText("Ring"), { target: { value: "ring2" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        await waitFor(() => expect(onSaved).toHaveBeenCalled());
        expect(await requestBody(fetchMock)).toEqual({ name: "Service Mesh 2", ring_id: "ring2" });
    });

    it("preserves the draft and last-confirmed value on server failure, with retry", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(Response.json({ error: { code: "validation_error", message: "Invalid blip." } }, { status: 422 })),
        );
        const onSaved = vi.fn();
        renderDrawer(onSaved);

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Service Mesh 2" } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Invalid blip.");
        expect(screen.getByLabelText("Name")).toHaveValue("Service Mesh 2");
        expect(onSaved).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    });

    it("calls onCancel without making a request", () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const onCancel = vi.fn();
        renderDrawer(vi.fn(), onCancel);

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Draft" } });
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onCancel).toHaveBeenCalledOnce();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("blocks a blank name change with an accessibly-linked error and no request", () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        renderDrawer();

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "   " } });
        fireEvent.click(screen.getByRole("button", { name: "Save" }));

        const alert = screen.getByRole("alert");
        expect(alert).toHaveTextContent("Name is required.");
        expect(screen.getByLabelText("Name")).toHaveAttribute("aria-describedby", alert.id);
        expect(screen.getByLabelText("Name")).toHaveFocus();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("closes on Escape", () => {
        const onCancel = vi.fn();
        renderDrawer(vi.fn(), onCancel);

        fireEvent.keyDown(screen.getByLabelText("Name"), { key: "Escape" });

        expect(onCancel).toHaveBeenCalledOnce();
    });

    it("restores focus to the trigger button after Cancel", () => {
        render(<Harness />);
        const trigger = screen.getByRole("button", { name: "Open" });
        trigger.focus();
        fireEvent.click(trigger);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(trigger).toHaveFocus();
    });
});

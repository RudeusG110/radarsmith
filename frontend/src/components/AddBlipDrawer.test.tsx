import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeBlip, makeQuadrant, makeRing } from "../test/factories";
import { AddBlipDrawer } from "./AddBlipDrawer";

const quadrants = [makeQuadrant({ id: "q1", name: "TECHNIQUES" }), makeQuadrant({ id: "q2", name: "TOOLS" })];
const rings = [makeRing({ id: "ring1", name: "ADOPT" }), makeRing({ id: "ring2", name: "TRIAL" })];

function renderDrawer(onCreated = vi.fn(), onCancel = vi.fn()) {
    render(<AddBlipDrawer radarId="r1" quadrants={quadrants} rings={rings} onCreated={onCreated} onCancel={onCancel} />);
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
                <AddBlipDrawer radarId="r1" quadrants={quadrants} rings={rings} onCreated={() => setOpen(false)} onCancel={() => setOpen(false)} />
            )}
        </div>
    );
}

describe("AddBlipDrawer", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("defaults the quadrant and ring selects to the first option", () => {
        renderDrawer();

        expect(screen.getByLabelText("Quadrant")).toHaveValue("q1");
        expect(screen.getByLabelText("Ring")).toHaveValue("ring1");
    });

    it("blocks submission with a blank name and makes no request", () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        renderDrawer();

        fireEvent.click(screen.getByRole("button", { name: "Add blip" }));

        const alert = screen.getByRole("alert");
        expect(alert).toHaveTextContent("Name is required.");
        expect(screen.getByLabelText("Name")).toHaveAttribute("aria-describedby", alert.id);
        expect(screen.getByLabelText("Name")).toHaveFocus();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("blocks submission with a blank description and makes no request", () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        renderDrawer();

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Service Mesh" } });
        fireEvent.click(screen.getByRole("button", { name: "Add blip" }));

        expect(screen.getByRole("alert")).toHaveTextContent("Description is required.");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("disables the submit button while the request is pending", async () => {
        let resolveFetch: (value: Response) => void = () => undefined;
        vi.stubGlobal(
            "fetch",
            vi.fn().mockReturnValue(new Promise<Response>((resolve) => (resolveFetch = resolve))),
        );
        const onCreated = vi.fn();
        renderDrawer(onCreated);

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Service Mesh" } });
        fireEvent.change(screen.getByLabelText("Description"), { target: { value: "A mesh." } });
        fireEvent.click(screen.getByRole("button", { name: "Add blip" }));

        const submitButton = await screen.findByRole("button", { name: "Adding…" });
        expect(submitButton).toBeDisabled();

        const blip = makeBlip({ name: "Service Mesh", description: "A mesh." });
        resolveFetch(Response.json(blip, { status: 201 }));
        await waitFor(() => expect(onCreated).toHaveBeenCalledWith(blip));
    });

    it("preserves entered values and shows a retryable error on server failure", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(Response.json({ error: { code: "validation_error", message: "Invalid blip." } }, { status: 422 })),
        );
        const onCreated = vi.fn();
        renderDrawer(onCreated);

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Service Mesh" } });
        fireEvent.change(screen.getByLabelText("Description"), { target: { value: "A mesh." } });
        fireEvent.click(screen.getByRole("button", { name: "Add blip" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Invalid blip.");
        expect(screen.getByLabelText("Name")).toHaveValue("Service Mesh");
        expect(screen.getByLabelText("Description")).toHaveValue("A mesh.");
        expect(onCreated).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Add blip" })).toBeEnabled();
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

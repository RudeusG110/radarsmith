import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { makeBlip } from "../test/factories";
import { DeleteBlipDialog } from "./DeleteBlipDialog";

const blip = makeBlip({ id: "b1", name: "Service Mesh" });

function renderDialog(onDeleted = vi.fn(), onCancel = vi.fn()) {
    render(<DeleteBlipDialog radarId="r1" blip={blip} onDeleted={onDeleted} onCancel={onCancel} />);
}

/** Mirrors how RadarWorkspace opens the dialog from a trigger button, for focus-restore tests. */
function Harness() {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button type="button" onClick={() => setOpen(true)}>
                Open
            </button>
            {open && <DeleteBlipDialog radarId="r1" blip={blip} onDeleted={() => setOpen(false)} onCancel={() => setOpen(false)} />}
        </div>
    );
}

describe("DeleteBlipDialog", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("names the blip in the confirmation text", () => {
        renderDialog();

        expect(screen.getByRole("dialog")).toHaveTextContent("Delete Service Mesh?");
    });

    it("calls onDeleted after a confirmed, successful delete", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
        const onDeleted = vi.fn();
        renderDialog(onDeleted);

        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() => expect(onDeleted).toHaveBeenCalledWith("b1"));
    });

    it("keeps the dialog open with a retryable error on failure", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(Response.json({ error: { code: "not_found", message: "Blip not found." } }, { status: 404 })),
        );
        const onDeleted = vi.fn();
        renderDialog(onDeleted);

        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Blip not found.");
        expect(onDeleted).not.toHaveBeenCalled();
        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
    });

    it("calls onCancel without making a request", () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const onCancel = vi.fn();
        renderDialog(vi.fn(), onCancel);

        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onCancel).toHaveBeenCalledOnce();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("closes on Escape", () => {
        const onCancel = vi.fn();
        renderDialog(vi.fn(), onCancel);

        fireEvent.keyDown(screen.getByRole("button", { name: "Delete" }), { key: "Escape" });

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

    it("restores focus to the trigger button after a successful delete", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
        render(<Harness />);
        const trigger = screen.getByRole("button", { name: "Open" });
        trigger.focus();
        fireEvent.click(trigger);

        fireEvent.click(screen.getByRole("button", { name: "Delete" }));

        await waitFor(() => expect(trigger).toHaveFocus());
    });
});

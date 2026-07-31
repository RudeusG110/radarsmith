import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { Dialog } from "./Dialog";

function Harness() {
    const [open, setOpen] = useState(false);
    return (
        <div>
            <button type="button" onClick={() => setOpen(true)}>
                Open
            </button>
            {open && (
                <Dialog titleId="test-title" title="Test dialog" onClose={() => setOpen(false)}>
                    <button type="button">First</button>
                    <button type="button">Last</button>
                </Dialog>
            )}
        </div>
    );
}

describe("Dialog", () => {
    it("focuses the first focusable element on open", () => {
        render(<Harness />);

        fireEvent.click(screen.getByRole("button", { name: "Open" }));

        expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
    });

    it("closes on Escape", () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole("button", { name: "Open" }));

        fireEvent.keyDown(screen.getByRole("button", { name: "First" }), { key: "Escape" });

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("traps Tab focus within the dialog, wrapping at both ends", () => {
        render(<Harness />);
        fireEvent.click(screen.getByRole("button", { name: "Open" }));
        const first = screen.getByRole("button", { name: "First" });
        const last = screen.getByRole("button", { name: "Last" });

        last.focus();
        fireEvent.keyDown(last, { key: "Tab" });
        expect(first).toHaveFocus();

        fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
        expect(last).toHaveFocus();
    });

    it("restores focus to the triggering element when closed", () => {
        render(<Harness />);
        const trigger = screen.getByRole("button", { name: "Open" });
        // jsdom's fireEvent.click doesn't auto-focus like a real browser click does.
        trigger.focus();
        fireEvent.click(trigger);

        fireEvent.keyDown(screen.getByRole("button", { name: "First" }), { key: "Escape" });

        expect(trigger).toHaveFocus();
    });
});

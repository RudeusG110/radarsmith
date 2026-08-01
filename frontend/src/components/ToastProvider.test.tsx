import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TOAST_DURATION_MS, useToast } from "../toast";
import { ToastProvider } from "./ToastProvider";

function TriggerButton() {
    const { showToast } = useToast();
    return (
        <button type="button" onClick={() => showToast("Radar created.", "success")}>
            Trigger
        </button>
    );
}

describe("ToastProvider", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("shows a success toast and auto-dismisses it", () => {
        render(
            <ToastProvider>
                <TriggerButton />
            </ToastProvider>,
        );

        fireEvent.click(screen.getByRole("button", { name: "Trigger" }));

        const toast = screen.getByText("Radar created.");
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveClass("toast--success");
        expect(screen.getByRole("status")).toContainElement(toast);

        act(() => {
            vi.advanceTimersByTime(TOAST_DURATION_MS);
        });

        expect(screen.queryByText("Radar created.")).not.toBeInTheDocument();
    });
});

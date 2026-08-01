import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Tabs } from "./Tabs";

const tabs = [
    { id: "radar", label: "Radar" },
    { id: "blips", label: "Blips" },
];

describe("Tabs", () => {
    it("renders each tab with the correct aria-selected and roving tabindex", () => {
        render(<Tabs label="Workspace view" tabs={tabs} activeId="radar" onChange={vi.fn()} />);

        expect(screen.getByRole("tablist", { name: "Workspace view" })).toBeInTheDocument();
        expect(screen.getByRole("tab", { name: "Radar" })).toHaveAttribute("aria-selected", "true");
        expect(screen.getByRole("tab", { name: "Radar" })).toHaveAttribute("tabindex", "0");
        expect(screen.getByRole("tab", { name: "Blips" })).toHaveAttribute("aria-selected", "false");
        expect(screen.getByRole("tab", { name: "Blips" })).toHaveAttribute("tabindex", "-1");
    });

    it("calls onChange when a tab is clicked", () => {
        const onChange = vi.fn();
        render(<Tabs label="Workspace view" tabs={tabs} activeId="radar" onChange={onChange} />);

        fireEvent.click(screen.getByRole("tab", { name: "Blips" }));
        expect(onChange).toHaveBeenCalledWith("blips");
    });

    it("moves focus and activates the next tab on ArrowRight, wrapping from the last to the first", () => {
        const onChange = vi.fn();
        render(<Tabs label="Workspace view" tabs={tabs} activeId="radar" onChange={onChange} />);

        fireEvent.keyDown(screen.getByRole("tab", { name: "Radar" }), { key: "ArrowRight" });
        expect(onChange).toHaveBeenCalledWith("blips");
        expect(screen.getByRole("tab", { name: "Blips" })).toHaveFocus();

        fireEvent.keyDown(screen.getByRole("tab", { name: "Blips" }), { key: "ArrowRight" });
        expect(onChange).toHaveBeenCalledWith("radar");
        expect(screen.getByRole("tab", { name: "Radar" })).toHaveFocus();
    });

    it("moves focus and activates the previous tab on ArrowLeft, wrapping from the first to the last", () => {
        const onChange = vi.fn();
        render(<Tabs label="Workspace view" tabs={tabs} activeId="radar" onChange={onChange} />);

        fireEvent.keyDown(screen.getByRole("tab", { name: "Radar" }), { key: "ArrowLeft" });
        expect(onChange).toHaveBeenCalledWith("blips");
        expect(screen.getByRole("tab", { name: "Blips" })).toHaveFocus();
    });
});

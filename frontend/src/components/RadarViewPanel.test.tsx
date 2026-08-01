import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeBlip } from "../test/factories";
import { RadarViewPanel, type RadarViewSelection } from "./RadarViewPanel";

describe("RadarViewPanel", () => {
    it("shows a placeholder when nothing is selected", () => {
        render(<RadarViewPanel selection={null} onSelectBlip={vi.fn()} />);

        expect(screen.getByText("Select a blip or a quadrant to see details.")).toBeInTheDocument();
    });

    it("shows the blip's detail, including linkified description, when a blip is selected", () => {
        const blip = makeBlip({ name: "Service Mesh", description: "See https://example.com for details." });
        const selection: RadarViewSelection = { kind: "blip", blip, quadrantLabel: "Techniques", ringLabel: "Adopt" };
        render(<RadarViewPanel selection={selection} onSelectBlip={vi.fn()} />);

        expect(screen.getByRole("heading", { name: "Service Mesh" })).toBeInTheDocument();
        expect(screen.getByText("Techniques, Adopt")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "https://example.com" })).toHaveAttribute("href", "https://example.com");
    });

    it("shows a ring-grouped table of the quadrant's blips when a quadrant is selected", () => {
        const adoptBlip = makeBlip({ id: "b1", name: "Service Mesh" });
        const trialBlip = makeBlip({ id: "b2", name: "Feature Flags" });
        const selection: RadarViewSelection = {
            kind: "quadrant",
            quadrantLabel: "Techniques",
            groups: [
                { ringLabel: "Adopt", blips: [adoptBlip] },
                { ringLabel: "Trial", blips: [trialBlip] },
            ],
        };
        render(<RadarViewPanel selection={selection} onSelectBlip={vi.fn()} />);

        expect(screen.getByRole("heading", { name: "Techniques" })).toBeInTheDocument();
        expect(screen.getByText("Adopt")).toBeInTheDocument();
        expect(screen.getByText("Trial")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Service Mesh" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Feature Flags" })).toBeInTheDocument();
    });

    it("shows an empty message when the quadrant has no blips", () => {
        const selection: RadarViewSelection = { kind: "quadrant", quadrantLabel: "Techniques", groups: [] };
        render(<RadarViewPanel selection={selection} onSelectBlip={vi.fn()} />);

        expect(screen.getByText("No blips in this quadrant yet.")).toBeInTheDocument();
    });

    it("calls onSelectBlip when a blip name in the quadrant table is clicked", () => {
        const blip = makeBlip({ id: "b1", name: "Service Mesh" });
        const selection: RadarViewSelection = {
            kind: "quadrant",
            quadrantLabel: "Techniques",
            groups: [{ ringLabel: "Adopt", blips: [blip] }],
        };
        const onSelectBlip = vi.fn();
        render(<RadarViewPanel selection={selection} onSelectBlip={onSelectBlip} />);

        fireEvent.click(screen.getByRole("button", { name: "Service Mesh" }));
        expect(onSelectBlip).toHaveBeenCalledWith("b1");
    });
});

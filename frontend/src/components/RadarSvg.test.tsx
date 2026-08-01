import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeBlip, makeQuadrant, makeRing } from "../test/factories";
import { RadarSvg } from "./RadarSvg";

const quadrants = [
    makeQuadrant({ id: "q1", name: "TECHNIQUES", position: 1 }),
    makeQuadrant({ id: "q2", name: "TOOLS", position: 2 }),
];
const rings = [
    makeRing({ id: "ring1", name: "ADOPT", position: 1 }),
    makeRing({ id: "ring2", name: "TRIAL", position: 2 }),
];

describe("RadarSvg", () => {
    it("renders the root, sectors, and one marker per blip with the correct graphics roles and accessible names", () => {
        const blips = [
            makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" }),
            makeBlip({ id: "b2", name: "Feature Flags", quadrant_id: "q2", ring_id: "ring2" }),
        ];
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={blips} />);

        expect(screen.getByRole("graphics-document", { name: "Engineering Radar radar" })).toBeInTheDocument();
        expect(screen.getAllByRole("graphics-object")).toHaveLength(quadrants.length);
        expect(screen.getByRole("graphics-object", { name: "Techniques" })).toBeInTheDocument();

        const markers = screen.getAllByRole("graphics-symbol");
        expect(markers).toHaveLength(blips.length);
        expect(screen.getByRole("graphics-symbol", { name: "Service Mesh, Techniques, Adopt" })).toBeInTheDocument();
        expect(screen.getByRole("graphics-symbol", { name: "Feature Flags, Tools, Trial" })).toBeInTheDocument();
    });

    it("skips blips whose quadrant or ring id does not match any known sector/ring", () => {
        const blips = [
            makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" }),
            makeBlip({ id: "b2", name: "Orphan", quadrant_id: "unknown-quadrant", ring_id: "ring1" }),
        ];
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={blips} />);

        expect(screen.getAllByRole("graphics-symbol")).toHaveLength(1);
    });

    it("markers are keyboard focusable", () => {
        const blips = [makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" })];
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={blips} />);

        const marker = screen.getByRole("graphics-symbol");
        expect(marker).toHaveAttribute("tabindex", "0");
        act(() => marker.focus());
        expect(marker).toHaveFocus();
    });

    it("shows a meaningful empty state and zero markers when there are no blips", () => {
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={[]} />);

        expect(screen.queryAllByRole("graphics-symbol")).toHaveLength(0);
        expect(screen.getByText("No blips yet")).toBeInTheDocument();
        expect(screen.getByText("Select a blip marker to see its details.")).toBeInTheDocument();
    });

    it("shows full details for a clicked marker, including a linkified description, and clears on second click", () => {
        const blips = [
            makeBlip({
                id: "b1",
                name: "Service Mesh",
                description: "See https://example.com/docs for more.",
                quadrant_id: "q1",
                ring_id: "ring1",
            }),
        ];
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={blips} />);

        fireEvent.click(screen.getByRole("graphics-symbol"));

        expect(screen.getByRole("heading", { name: "Service Mesh" })).toBeInTheDocument();
        expect(screen.getByText("Techniques, Adopt")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "https://example.com/docs" })).toHaveAttribute(
            "href",
            "https://example.com/docs",
        );

        fireEvent.click(screen.getByRole("graphics-symbol"));
        expect(screen.getByText("Select a blip marker to see its details.")).toBeInTheDocument();
    });

    it("shows details for a focused marker and clears them on blur", () => {
        const blips = [makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" })];
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={blips} />);

        const marker = screen.getByRole("graphics-symbol");
        fireEvent.focus(marker);
        expect(screen.getByRole("heading", { name: "Service Mesh" })).toBeInTheDocument();

        fireEvent.blur(marker);
        expect(screen.getByText("Select a blip marker to see its details.")).toBeInTheDocument();
    });

    it("never interprets HTML-looking text in the description as markup", () => {
        const blips = [
            makeBlip({
                id: "b1",
                name: "Service Mesh",
                description: "<script>alert(1)</script>",
                quadrant_id: "q1",
                ring_id: "ring1",
            }),
        ];
        const { container } = render(
            <RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={blips} />,
        );

        fireEvent.click(screen.getByRole("graphics-symbol"));

        expect(container.querySelector("script")).not.toBeInTheDocument();
        expect(screen.getByText("<script>alert(1)</script>", { exact: false })).toBeInTheDocument();
    });

    it("renders exactly one marker per blip in a dense sector/ring", () => {
        const denseBlips = Array.from({ length: 40 }, (_, index) =>
            makeBlip({ id: `dense-${index}`, name: `Blip ${index}`, quadrant_id: "q1", ring_id: "ring1" }),
        );
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={denseBlips} />);

        expect(screen.getAllByRole("graphics-symbol")).toHaveLength(denseBlips.length);
    });
});

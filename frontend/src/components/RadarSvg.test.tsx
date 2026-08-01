import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={blips} selectedId={null} onSelect={vi.fn()} />);

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
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={blips} selectedId={null} onSelect={vi.fn()} />);

        expect(screen.getAllByRole("graphics-symbol")).toHaveLength(1);
    });

    it("markers are keyboard focusable", () => {
        const blips = [makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" })];
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={blips} selectedId={null} onSelect={vi.fn()} />);

        const marker = screen.getByRole("graphics-symbol");
        expect(marker).toHaveAttribute("tabindex", "0");
        act(() => marker.focus());
        expect(marker).toHaveFocus();
    });

    it("shows a meaningful empty state and zero markers when there are no blips", () => {
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={[]} selectedId={null} onSelect={vi.fn()} />);

        expect(screen.queryAllByRole("graphics-symbol")).toHaveLength(0);
        expect(screen.getByText("No blips yet")).toBeInTheDocument();
    });

    it("calls onSelect with the blip's id on click and on Enter/Space", () => {
        const blips = [makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" })];
        const onSelect = vi.fn();
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={blips} selectedId={null} onSelect={onSelect} />);

        const marker = screen.getByRole("graphics-symbol");
        fireEvent.click(marker);
        expect(onSelect).toHaveBeenCalledWith("b1");

        fireEvent.keyDown(marker, { key: "Enter" });
        expect(onSelect).toHaveBeenCalledTimes(2);

        fireEvent.keyDown(marker, { key: " " });
        expect(onSelect).toHaveBeenCalledTimes(3);
    });

    it("fills the marker matching selectedId and leaves others unfilled", () => {
        const blips = [
            makeBlip({ id: "b1", name: "Service Mesh", quadrant_id: "q1", ring_id: "ring1" }),
            makeBlip({ id: "b2", name: "Feature Flags", quadrant_id: "q2", ring_id: "ring2" }),
        ];
        render(<RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={blips} selectedId="b1" onSelect={vi.fn()} />);

        const selectedMarker = screen.getByRole("graphics-symbol", { name: "Service Mesh, Techniques, Adopt" });
        const otherMarker = screen.getByRole("graphics-symbol", { name: "Feature Flags, Tools, Trial" });
        expect(selectedMarker.querySelector("circle")).toHaveAttribute("fill", "currentColor");
        expect(otherMarker.querySelector("circle")).toHaveAttribute("fill", "none");
    });

    it("renders exactly one marker per blip in a dense sector/ring", () => {
        const denseBlips = Array.from({ length: 40 }, (_, index) =>
            makeBlip({ id: `dense-${index}`, name: `Blip ${index}`, quadrant_id: "q1", ring_id: "ring1" }),
        );
        render(
            <RadarSvg radarName="Engineering Radar" quadrants={quadrants} rings={rings} blips={denseBlips} selectedId={null} onSelect={vi.fn()} />,
        );

        expect(screen.getAllByRole("graphics-symbol")).toHaveLength(denseBlips.length);
    });
});

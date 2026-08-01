import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { makeBlip, makeQuadrant, makeRing } from "../test/factories";
import { BlipTable } from "./BlipTable";

const quadrants = [makeQuadrant({ id: "q1", name: "TECHNIQUES" })];
const rings = [makeRing({ id: "ring1", name: "ADOPT" })];
const quadrantById = new Map(quadrants.map((quadrant) => [quadrant.id, quadrant]));
const ringById = new Map(rings.map((ring) => [ring.id, ring]));

describe("BlipTable", () => {
    it("shows an empty state when there are no blips", () => {
        render(
            <BlipTable
                radarName="Engineering Radar"
                blips={[]}
                quadrantById={quadrantById}
                ringById={ringById}
                selectedId={null}
                onSelect={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.getByText("No blips yet.")).toBeInTheDocument();
    });

    it("renders a row per blip with title-cased quadrant/ring and the description behind details", () => {
        const blip = makeBlip({ id: "b1", name: "Service Mesh", description: "A mesh.", quadrant_id: "q1", ring_id: "ring1" });
        render(
            <BlipTable
                radarName="Engineering Radar"
                blips={[blip]}
                quadrantById={quadrantById}
                ringById={ringById}
                selectedId={null}
                onSelect={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.getByRole("button", { name: "Service Mesh" })).toBeInTheDocument();
        expect(screen.getByRole("cell", { name: "Techniques" })).toBeInTheDocument();
        expect(screen.getByRole("cell", { name: "Adopt" })).toBeInTheDocument();
        expect(screen.getByRole("group")).not.toHaveAttribute("open");
        fireEvent.click(screen.getByRole("group").querySelector("summary")!);
        expect(screen.getByText("A mesh.")).toBeInTheDocument();
    });

    it("calls onSelect with the blip's id when its name button is activated, regardless of current selection", () => {
        const blip = makeBlip({ id: "b1", name: "Service Mesh" });
        const onSelect = vi.fn();
        render(
            <BlipTable
                radarName="Engineering Radar"
                blips={[blip]}
                quadrantById={quadrantById}
                ringById={ringById}
                selectedId="b1"
                onSelect={onSelect}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Service Mesh" }));
        expect(onSelect).toHaveBeenCalledWith("b1");
    });

    it("marks the selected row's name button with aria-pressed", () => {
        const blips = [makeBlip({ id: "b1", name: "Service Mesh" }), makeBlip({ id: "b2", name: "Feature Flags" })];
        render(
            <BlipTable
                radarName="Engineering Radar"
                blips={blips}
                quadrantById={quadrantById}
                ringById={ringById}
                selectedId="b1"
                onSelect={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.getByRole("button", { name: "Service Mesh" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByRole("button", { name: "Feature Flags" })).toHaveAttribute("aria-pressed", "false");
    });

    it("calls onEdit/onDelete with the blip when the Edit/Delete buttons are activated", () => {
        const blip = makeBlip({ id: "b1", name: "Service Mesh" });
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        render(
            <BlipTable
                radarName="Engineering Radar"
                blips={[blip]}
                quadrantById={quadrantById}
                ringById={ringById}
                selectedId={null}
                onSelect={vi.fn()}
                onEdit={onEdit}
                onDelete={onDelete}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Edit Service Mesh" }));
        expect(onEdit).toHaveBeenCalledWith(blip);

        fireEvent.click(screen.getByRole("button", { name: "Delete Service Mesh" }));
        expect(onDelete).toHaveBeenCalledWith(blip);
    });
});

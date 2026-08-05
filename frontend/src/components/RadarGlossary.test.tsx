import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ringColor } from "../ringColor";
import { makeQuadrant, makeRing } from "../test/factories";
import { RadarGlossary } from "./RadarGlossary";

describe("RadarGlossary", () => {
    it("renders each quadrant and ring name, title-cased", () => {
        const quadrants = [makeQuadrant({ id: "q1", name: "TECHNIQUES", position: 1 })];
        const rings = [makeRing({ id: "ring1", name: "ADOPT", position: 1 })];

        render(<RadarGlossary quadrants={quadrants} rings={rings} />);

        expect(screen.getByText("Techniques")).toBeInTheDocument();
        expect(screen.getByText("Adopt")).toBeInTheDocument();
    });

    it("orders quadrants and rings ascending by position, regardless of input order", () => {
        const quadrants = [
            makeQuadrant({ id: "q2", name: "TOOLS", position: 2 }),
            makeQuadrant({ id: "q1", name: "TECHNIQUES", position: 1 }),
        ];
        const rings = [
            makeRing({ id: "ring2", name: "TRIAL", position: 2 }),
            makeRing({ id: "ring1", name: "ADOPT", position: 1 }),
        ];

        render(<RadarGlossary quadrants={quadrants} rings={rings} />);

        const quadrantItems = screen.getAllByRole("listitem").filter((item) => ["Techniques", "Tools"].includes(item.textContent ?? ""));
        expect(quadrantItems.map((item) => item.textContent)).toEqual(["Techniques", "Tools"]);

        const ringItems = screen.getAllByRole("listitem").filter((item) => ["Adopt", "Trial"].includes(item.textContent ?? ""));
        expect(ringItems.map((item) => item.textContent)).toEqual(["Adopt", "Trial"]);
    });

    it("colors each ring swatch to match ringColor for its sorted index", () => {
        const rings = [
            makeRing({ id: "ring2", name: "TRIAL", position: 2 }),
            makeRing({ id: "ring1", name: "ADOPT", position: 1 }),
            makeRing({ id: "ring3", name: "ASSESS", position: 3 }),
        ];

        const { container } = render(<RadarGlossary quadrants={[]} rings={rings} />);

        const swatches = [...container.querySelectorAll(".ring-swatch")];
        expect(swatches).toHaveLength(3);
        expect(swatches[0]).toHaveStyle({ background: ringColor(0, 3) });
        expect(swatches[1]).toHaveStyle({ background: ringColor(1, 3) });
        expect(swatches[2]).toHaveStyle({ background: ringColor(2, 3) });
    });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeBlip } from "../test/factories";
import { BlipDetailPanel } from "./BlipDetailPanel";

describe("BlipDetailPanel", () => {
    it("shows a placeholder when no blip is selected", () => {
        render(<BlipDetailPanel blip={null} quadrantLabel="Techniques" ringLabel="Adopt" />);

        expect(screen.getByText("Select a blip marker or row to see its details.")).toBeInTheDocument();
    });

    it("shows the selected blip's name, quadrant/ring, and a linkified description", () => {
        const blip = makeBlip({ name: "Service Mesh", description: "See https://example.com/docs for more." });
        render(<BlipDetailPanel blip={blip} quadrantLabel="Techniques" ringLabel="Adopt" />);

        expect(screen.getByRole("heading", { name: "Service Mesh" })).toBeInTheDocument();
        expect(screen.getByText("Techniques, Adopt")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "https://example.com/docs" })).toHaveAttribute(
            "href",
            "https://example.com/docs",
        );
    });

    it("never interprets HTML-looking text in the description as markup", () => {
        const blip = makeBlip({ description: "<script>alert(1)</script>" });
        const { container } = render(<BlipDetailPanel blip={blip} quadrantLabel="Techniques" ringLabel="Adopt" />);

        expect(container.querySelector("script")).not.toBeInTheDocument();
        expect(screen.getByText("<script>alert(1)</script>", { exact: false })).toBeInTheDocument();
    });

    it("omits the description when showDescription is false", () => {
        const blip = makeBlip({ name: "Service Mesh", description: "See https://example.com/docs for more." });
        render(<BlipDetailPanel blip={blip} quadrantLabel="Techniques" ringLabel="Adopt" showDescription={false} />);

        expect(screen.getByRole("heading", { name: "Service Mesh" })).toBeInTheDocument();
        expect(screen.queryByText("See https://example.com/docs for more.", { exact: false })).not.toBeInTheDocument();
    });
});

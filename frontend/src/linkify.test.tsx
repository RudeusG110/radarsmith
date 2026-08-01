import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { linkify } from "./linkify";

describe("linkify", () => {
    it("turns a bare URL into a link", () => {
        const { container } = render(<p>{linkify("See https://example.com/docs for details.")}</p>);

        const link = screen.getByRole("link", { name: "https://example.com/docs" });
        expect(link).toHaveAttribute("href", "https://example.com/docs");
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
        expect(container.textContent).toBe("See https://example.com/docs for details.");
    });

    it("linkifies multiple URLs independently", () => {
        render(<p>{linkify("First https://a.example then https://b.example done.")}</p>);

        expect(screen.getByRole("link", { name: "https://a.example" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "https://b.example" })).toBeInTheDocument();
    });

    it("passes plain text through unchanged", () => {
        render(<p>{linkify("No links here, just plain text.")}</p>);

        expect(screen.getByText("No links here, just plain text.")).toBeInTheDocument();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("never interprets HTML-looking text as markup", () => {
        const { container } = render(<p>{linkify("<script>alert(1)</script> and <b>bold</b>")}</p>);

        expect(container.querySelector("script")).not.toBeInTheDocument();
        expect(container.querySelector("b")).not.toBeInTheDocument();
        expect(screen.getByText("<script>alert(1)</script> and <b>bold</b>")).toBeInTheDocument();
    });
});

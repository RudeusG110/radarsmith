import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, it, expect, vi } from "vitest";

import { App } from "../App";

afterEach(() => {
    vi.unstubAllGlobals();
});

it("renders the radar library heading on /radars", async () => {
    // Stub fetch: an unmocked real network call rejects after the test tears down and crashes React's scheduler.
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([], { status: 200 })));
    render(
        <MemoryRouter initialEntries={["/radars"]}>
            <App />
        </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Radars" })).toBeInTheDocument();
});

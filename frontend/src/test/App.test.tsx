import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import { App } from "../App";

it("renders the radar library heading on /radars", () => {
    render(
        <MemoryRouter initialEntries={["/radars"]}>
            <App />
        </MemoryRouter>,
    );

    expect(screen.getByRole("heading", { name: "Radars" })).toBeInTheDocument();
});

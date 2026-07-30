import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NewRadarForm } from "./NewRadarForm";

describe("NewRadarForm", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("blocks submission with a blank name and makes no request", () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const onCreated = vi.fn();
        render(<NewRadarForm onCreated={onCreated} onCancel={vi.fn()} />);

        fireEvent.click(screen.getByRole("button", { name: "Create radar" }));

        expect(screen.getByRole("alert")).toHaveTextContent("Name is required.");
        expect(fetchMock).not.toHaveBeenCalled();
        expect(onCreated).not.toHaveBeenCalled();
    });

    it("disables the submit button while the request is pending", async () => {
        let resolveFetch: (value: Response) => void = () => undefined;
        vi.stubGlobal(
            "fetch",
            vi.fn().mockReturnValue(new Promise<Response>((resolve) => (resolveFetch = resolve))),
        );
        const onCreated = vi.fn();
        render(<NewRadarForm onCreated={onCreated} onCancel={vi.fn()} />);

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Mobile Radar" } });
        fireEvent.click(screen.getByRole("button", { name: "Create radar" }));

        const submitButton = await screen.findByRole("button", { name: "Creating…" });
        expect(submitButton).toBeDisabled();

        const radar = { id: "r1", name: "Mobile Radar", purpose: null, created_at: "now", updated_at: "now", quadrants: [], rings: [], blips: [] };
        resolveFetch(Response.json(radar, { status: 201 }));
        await waitFor(() => expect(onCreated).toHaveBeenCalledWith(radar));
    });

    it("preserves entered values and shows a retryable error on server failure", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                Response.json({ error: { code: "validation_error", message: "Name already exists." } }, { status: 422 }),
            ),
        );
        const onCreated = vi.fn();
        render(<NewRadarForm onCreated={onCreated} onCancel={vi.fn()} />);

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Mobile Radar" } });
        fireEvent.change(screen.getByLabelText("Purpose (optional)"), { target: { value: "Mobile stances" } });
        fireEvent.click(screen.getByRole("button", { name: "Create radar" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Name already exists.");
        expect(screen.getByLabelText("Name")).toHaveValue("Mobile Radar");
        expect(screen.getByLabelText("Purpose (optional)")).toHaveValue("Mobile stances");
        expect(onCreated).not.toHaveBeenCalled();
        expect(screen.getByRole("button", { name: "Create radar" })).toBeEnabled();
    });

    it("calls onCreated with the parsed radar on success", async () => {
        const radar = { id: "r1", name: "Mobile Radar", purpose: null, created_at: "now", updated_at: "now", quadrants: [], rings: [], blips: [] };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(radar, { status: 201 })));
        const onCreated = vi.fn();
        render(<NewRadarForm onCreated={onCreated} onCancel={vi.fn()} />);

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Mobile Radar" } });
        fireEvent.click(screen.getByRole("button", { name: "Create radar" }));

        await waitFor(() => expect(onCreated).toHaveBeenCalledWith(radar));
    });

    it("calls onCancel without making a request", () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const onCancel = vi.fn();
        render(<NewRadarForm onCreated={vi.fn()} onCancel={onCancel} />);

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Draft" } });
        fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

        expect(onCancel).toHaveBeenCalledOnce();
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

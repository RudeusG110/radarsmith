import { afterEach, describe, expect, it, vi } from "vitest";

import { apiClient, unwrap } from "./client";
import { ApiError, NetworkError } from "./errors";
import type { components } from "./schema";

describe("apiClient + unwrap", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("resolves typed data for a successful response", async () => {
        const radars: components["schemas"]["RadarSummaryOut"][] = [
            {
                id: "b1f2c3d4-0000-4000-8000-000000000001",
                name: "Starter Radar",
                purpose: null,
                created_at: "2026-01-01T00:00:00Z",
                updated_at: "2026-01-01T00:00:00Z",
                blip_count: 0,
            },
        ];
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(Response.json(radars, { status: 200 })),
        );

        const data = await unwrap(apiClient.GET("/api/v1/radars"));

        expect(data).toEqual(radars);
    });

    it("throws ApiError for a structured error response", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                Response.json(
                    { error: { code: "not_found", message: "Radar not found." } },
                    { status: 404 },
                ),
            ),
        );

        await expect(unwrap(apiClient.GET("/api/v1/radars"))).rejects.toMatchObject({
            code: "not_found",
            message: "Radar not found.",
            status: 404,
        } satisfies Partial<ApiError>);
    });

    it("throws NetworkError when the request never reaches the server", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

        await expect(unwrap(apiClient.GET("/api/v1/radars"))).rejects.toBeInstanceOf(NetworkError);
    });

    it("passes the backend's internal_error envelope through", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                Response.json(
                    { error: { code: "internal_error", message: "An unexpected error occurred." } },
                    { status: 500 },
                ),
            ),
        );

        await expect(unwrap(apiClient.GET("/api/v1/radars"))).rejects.toMatchObject({
            code: "internal_error",
            message: "An unexpected error occurred.",
            status: 500,
        } satisfies Partial<ApiError>);
    });

    it.each([
        {
            label: "a plain-text 500",
            response: () => new Response("Internal Server Error", { status: 500, headers: { "Content-Type": "text/plain" } }),
            status: 500,
            message: "The server ran into a problem (HTTP 500). Please try again.",
        },
        {
            label: "an empty 502 from a proxy",
            response: () => new Response(null, { status: 502, headers: { "Content-Length": "0" } }),
            status: 502,
            message: "The server ran into a problem (HTTP 502). Please try again.",
        },
        {
            label: "an empty body without a length",
            response: () => new Response("", { status: 503 }),
            status: 503,
            message: "The server ran into a problem (HTTP 503). Please try again.",
        },
        {
            label: "JSON in another shape",
            response: () => Response.json({ detail: "Not Found" }, { status: 404 }),
            status: 404,
            message: "The request failed (HTTP 404).",
        },
        {
            label: "a partial envelope",
            response: () => Response.json({ error: { code: 42 } }, { status: 400 }),
            status: 400,
            message: "The request failed (HTTP 400).",
        },
    ])("throws a generic ApiError for $label", async ({ response, status, message }) => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));

        const error: unknown = await unwrap(apiClient.GET("/api/v1/radars")).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({ code: "unexpected_response", status, message } satisfies Partial<ApiError>);
    });

    it("resolves undefined for a successful empty response", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

        await expect(
            unwrap(
                apiClient.DELETE("/api/v1/radars/{radar_id}", {
                    params: { path: { radar_id: "b1f2c3d4-0000-4000-8000-000000000001" } },
                }),
            ),
        ).resolves.toBeUndefined();
    });
});

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
});

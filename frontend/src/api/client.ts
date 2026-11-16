import createClient from "openapi-fetch";

import { ApiError, NetworkError } from "./errors";
import type { components, paths } from "./schema";

// baseUrl is the current origin (not a hardcoded hostname): the Vite dev proxy and the
// single-origin production build (TICKET-018) both serve `/api/v1` from wherever the app runs.
// `fetch` looks up `globalThis.fetch` per call (not at client-creation time) so tests can
// stub it after this module has already been imported.
export const apiClient = createClient<paths>({
    baseUrl: window.location.origin,
    fetch: (input) => globalThis.fetch(input),
});

type ErrorOut = components["schemas"]["ErrorOut"];

interface RawResult<Data> {
    data?: Data;
    // Declared as `ErrorOut`, but a crash or a proxy in front of the API can return any body, or none.
    error?: unknown;
    response: Response;
}

function isErrorEnvelope(body: unknown): body is ErrorOut {
    if (typeof body !== "object" || body === null || !("error" in body)) {
        return false;
    }
    const { error } = body;
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "message" in error &&
        typeof error.code === "string" &&
        typeof error.message === "string"
    );
}

function toApiError(body: unknown, status: number): ApiError {
    if (isErrorEnvelope(body)) {
        return new ApiError(body.error.code, body.error.message, status);
    }
    const message =
        status >= 500
            ? `The server ran into a problem (HTTP ${status}). Please try again.`
            : `The request failed (HTTP ${status}).`;
    return new ApiError("unexpected_response", message, status);
}

/** Normalizes an openapi-fetch call into typed data, throwing `ApiError`/`NetworkError` instead. */
export async function unwrap<Data>(call: Promise<RawResult<Data>>): Promise<Data> {
    let result: RawResult<Data>;
    try {
        result = await call;
    } catch (cause) {
        throw new NetworkError(cause);
    }

    if (!result.response.ok) {
        throw toApiError(result.error, result.response.status);
    }

    return result.data as Data;
}

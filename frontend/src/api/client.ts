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
    error?: ErrorOut;
    response: Response;
}

/** Normalizes an openapi-fetch call into typed data, throwing `ApiError`/`NetworkError` instead. */
export async function unwrap<Data>(call: Promise<RawResult<Data>>): Promise<Data> {
    let result: RawResult<Data>;
    try {
        result = await call;
    } catch (cause) {
        throw new NetworkError(cause);
    }

    if (result.error !== undefined) {
        throw new ApiError(result.error.error.code, result.error.error.message, result.response.status);
    }

    return result.data as Data;
}

/** The backend rejected the request; `code` matches the shared `ErrorOut` envelope. */
export class ApiError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly status: number,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

/** The request never reached the server (offline, DNS/CORS failure, etc.). */
export class NetworkError extends Error {
    constructor(cause: unknown) {
        super("Unable to reach the server. Check your connection and try again.");
        this.name = "NetworkError";
        this.cause = cause;
    }
}

/** Renders any thrown value as user-facing text, falling back for non-`Error` throws. */
export function toErrorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

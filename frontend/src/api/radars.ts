import { apiClient, unwrap } from "./client";
import type { components } from "./schema";

export type RadarSummary = components["schemas"]["RadarSummaryOut"];
export type RadarDetail = components["schemas"]["RadarDetailOut"];
export type RadarInput = components["schemas"]["RadarPost"];

export function listRadars(): Promise<RadarSummary[]> {
    return unwrap(apiClient.GET("/api/v1/radars"));
}

export function createRadar(input: RadarInput): Promise<RadarDetail> {
    return unwrap(apiClient.POST("/api/v1/radars", { body: input }));
}

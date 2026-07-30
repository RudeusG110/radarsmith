import { apiClient, unwrap } from "./client";
import type { components } from "./schema";

export type RadarSummary = components["schemas"]["RadarSummaryOut"];
export type RadarDetail = components["schemas"]["RadarDetailOut"];
export type RadarInput = components["schemas"]["RadarPost"];
export type Quadrant = components["schemas"]["QuadrantOut"];
export type Ring = components["schemas"]["RingOut"];
export type Blip = components["schemas"]["BlipOut"];

export function listRadars(): Promise<RadarSummary[]> {
    return unwrap(apiClient.GET("/api/v1/radars"));
}

export function getRadar(radarId: string): Promise<RadarDetail> {
    return unwrap(apiClient.GET("/api/v1/radars/{radar_id}", { params: { path: { radar_id: radarId } } }));
}

export function createRadar(input: RadarInput): Promise<RadarDetail> {
    return unwrap(apiClient.POST("/api/v1/radars", { body: input }));
}

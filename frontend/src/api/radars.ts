import { apiClient, unwrap } from "./client";
import type { components } from "./schema";

export type RadarSummary = components["schemas"]["RadarSummaryOut"];
export type RadarDetail = components["schemas"]["RadarDetailOut"];
export type RadarInput = components["schemas"]["RadarPost"];
export type Quadrant = components["schemas"]["QuadrantOut"];
export type Ring = components["schemas"]["RingOut"];
export type Blip = components["schemas"]["BlipOut"];
export type BlipInput = components["schemas"]["BlipPost"];
export type BlipPatch = components["schemas"]["BlipPatch"];

export function listRadars(): Promise<RadarSummary[]> {
    return unwrap(apiClient.GET("/api/v1/radars"));
}

export function getRadar(radarId: string): Promise<RadarDetail> {
    return unwrap(apiClient.GET("/api/v1/radars/{radar_id}", { params: { path: { radar_id: radarId } } }));
}

export function createRadar(input: RadarInput): Promise<RadarDetail> {
    return unwrap(apiClient.POST("/api/v1/radars", { body: input }));
}

export function createBlip(radarId: string, input: BlipInput): Promise<Blip> {
    return unwrap(apiClient.POST("/api/v1/radars/{radar_id}/blips", { params: { path: { radar_id: radarId } }, body: input }));
}

export function updateBlip(radarId: string, blipId: string, patch: BlipPatch): Promise<Blip> {
    return unwrap(
        apiClient.PATCH("/api/v1/radars/{radar_id}/blips/{blip_id}", {
            params: { path: { radar_id: radarId, blip_id: blipId } },
            body: patch,
        }),
    );
}

export async function deleteBlip(radarId: string, blipId: string): Promise<void> {
    await unwrap(
        apiClient.DELETE("/api/v1/radars/{radar_id}/blips/{blip_id}", {
            params: { path: { radar_id: radarId, blip_id: blipId } },
        }),
    );
}

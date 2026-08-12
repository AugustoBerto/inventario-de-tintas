import { inventoryHttp } from "./http";
import type {
  DrawerSummary,
  PaginatedSamples,
  Sample,
  SampleFilters,
  SampleInput,
  SampleMovement,
} from "@/types/sample";

export const listSamples = async (params: SampleFilters) =>
  (
    await inventoryHttp.get<PaginatedSamples>("/samples", {
      params,
    })
  ).data;

export const getSample = async (id: string) =>
  (await inventoryHttp.get<Sample>(`/samples/${id}`)).data;

export const createSample = async (values: SampleInput) =>
  (await inventoryHttp.post<Sample>("/samples", values)).data;

export const updateSample = async (id: string, values: SampleInput) =>
  (await inventoryHttp.patch<Sample>(`/samples/${id}`, values)).data;

export const listDrawers = async () =>
  (await inventoryHttp.get<DrawerSummary[]>("/drawers")).data;

export const updateDrawerCapacity = async (id: string, capacity: number) =>
  (await inventoryHttp.patch<DrawerSummary>(`/drawers/${id}`, { capacity })).data;

export const addressSample = async (id: string) =>
  (await inventoryHttp.post<Sample>(`/samples/${id}/address`)).data;

export const moveSample = async (
  id: string,
  drawerId: string,
  confirmDivergence = false,
  reason?: string,
) =>
  (
    await inventoryHttp.post<Sample>(`/samples/${id}/move`, {
      drawerId,
      confirmDivergence,
      reason,
    })
  ).data;

export const removeSampleAddress = async (id: string) =>
  (await inventoryHttp.delete<Sample>(`/samples/${id}/address`)).data;

export const getSampleMovements = async (id: string) =>
  (await inventoryHttp.get<SampleMovement[]>(`/samples/${id}/movements`)).data;

export type BatchAction =
  "move" | "move-to-recommended" | "remove-address" | "delete";

export interface BatchResult {
  preview: boolean;
  results: Array<{ id: string; success: boolean; reason: string | null }>;
}

export const runBatch = async (
  action: BatchAction,
  ids: string[],
  preview: boolean,
  drawerId?: string,
) => {
  const config = { data: { ids, preview, drawerId } };
  return action === "delete"
    ? (await inventoryHttp.delete<BatchResult>("/samples/batch", config)).data
    : (
        await inventoryHttp.post<BatchResult>(`/samples/batch/${action}`, {
          ids,
          preview,
          drawerId,
        })
      ).data;
};

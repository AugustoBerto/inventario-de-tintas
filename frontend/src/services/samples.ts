import { http } from "./http";
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
    await http.get<PaginatedSamples>("/inventory/samples", {
      params,
    })
  ).data;

export const getSample = async (id: string) =>
  (await http.get<Sample>(`/inventory/samples/${id}`)).data;

export const createSample = async (values: SampleInput) =>
  (await http.post<Sample>("/inventory/samples", values)).data;

export const updateSample = async (id: string, values: SampleInput) =>
  (await http.patch<Sample>(`/inventory/samples/${id}`, values)).data;

export const listDrawers = async () =>
  (await http.get<DrawerSummary[]>("/inventory/drawers")).data;

export const addressSample = async (id: string) =>
  (await http.post<Sample>(`/inventory/samples/${id}/address`)).data;

export const moveSample = async (
  id: string,
  drawerId: string,
  confirmDivergence = false,
  reason?: string,
) =>
  (
    await http.post<Sample>(`/inventory/samples/${id}/move`, {
      drawerId,
      confirmDivergence,
      reason,
    })
  ).data;

export const removeSampleAddress = async (id: string) =>
  (await http.delete<Sample>(`/inventory/samples/${id}/address`)).data;

export const getSampleMovements = async (id: string) =>
  (await http.get<SampleMovement[]>(`/inventory/samples/${id}/movements`)).data;

export type BatchAction =
  | "move"
  | "move-to-recommended"
  | "remove-address"
  | "delete";

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
    ? (await http.delete<BatchResult>("/inventory/samples/batch", config)).data
    : (
        await http.post<BatchResult>(`/inventory/samples/batch/${action}`, {
          ids,
          preview,
          drawerId,
        })
      ).data;
};

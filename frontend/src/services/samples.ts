import { http } from "./http";
import type {
  DrawerSummary,
  PaginatedSamples,
  Sample,
  SampleInput,
} from "@/types/sample";

export const listSamples = async (params: {
  page: number;
  limit: number;
  search: string;
  order: "ASC" | "DESC";
}) =>
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

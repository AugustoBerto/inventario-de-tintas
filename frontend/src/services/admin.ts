import { http } from "./http";
import type { InventoryAccess, InventorySettings } from "@/types/sample";

export const getSettings = async () =>
  (await http.get<InventorySettings>("/inventory/settings")).data;

export const updateSettings = async (settings: InventorySettings) =>
  (await http.patch<InventorySettings>("/inventory/settings", settings)).data;

export const listAccessUsers = async (registration = "") =>
  (
    await http.get<InventoryAccess[]>("/inventory/access-users", {
      params: { registration },
    })
  ).data;

export const createAccessUser = async (values: {
  registration: string;
  profile: InventoryAccess["profile"];
}) =>
  (await http.post<InventoryAccess>("/inventory/access-users", values)).data;

export interface CorporateUserLookup {
  registration: string;
  displayName: string;
  department: string | null;
  function: string | null;
}

export const lookupCorporateUser = async (registration: string) =>
  (
    await http.get<CorporateUserLookup>(
      `/inventory/access-users/lookup/${encodeURIComponent(registration)}`,
    )
  ).data;

export const updateAccessUser = async (
  id: string,
  values: Partial<Pick<InventoryAccess, "profile" | "active">>,
) =>
  (await http.patch<InventoryAccess>(`/inventory/access-users/${id}`, values))
    .data;

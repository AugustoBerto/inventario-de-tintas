import { inventoryHttp } from "./http";
import type { InventoryAccess, InventorySettings } from "@/types/sample";

export const getSettings = async () =>
  (await inventoryHttp.get<InventorySettings>("/settings")).data;

export const updateSettings = async (settings: InventorySettings) =>
  (await inventoryHttp.patch<InventorySettings>("/settings", settings)).data;

export const listAccessUsers = async (registration = "") =>
  (
    await inventoryHttp.get<InventoryAccess[]>("/access-users", {
      params: { registration },
    })
  ).data;

export const createAccessUser = async (values: {
  registration: string;
  profile: InventoryAccess["profile"];
}) =>
  (await inventoryHttp.post<InventoryAccess>("/access-users", values)).data;

export interface CorporateUserLookup {
  registration: string;
  displayName: string;
  department: string | null;
  function: string | null;
}

export const lookupCorporateUser = async (registration: string) =>
  (
    await inventoryHttp.get<CorporateUserLookup>(
      `/access-users/lookup/${encodeURIComponent(registration)}`,
    )
  ).data;

export const updateAccessUser = async (
  id: string,
  values: Partial<Pick<InventoryAccess, "profile" | "active">>,
) =>
  (await inventoryHttp.patch<InventoryAccess>(`/access-users/${id}`, values))
    .data;

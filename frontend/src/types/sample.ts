export interface Sample {
  id: string;
  reference: string;
  /* DESABILITADO: Data da amostra / Fabricação
  sampleDate: string | null;
  manufacturedAt: string | null;
  */
  sampleDate?: string | null;
  manufacturedAt?: string | null;
  expiresAt: string | null;
  productBase: string | null;
  supplier: string | null;
  color: string | null;
  substrate: string | null;
  voc: "SOLVENTE" | "BASE_AGUA" | null;
  paintApplication: string | null;
  brand: string | null;
  coat: string | null;
  notes: string | null;
  status: string;
  drawerId: string | null;
  drawer: Drawer | null;
  recommendation: DrawerSummary | null;
  divergenceReason: string | null;
  expirationStatus: "SEM_VALIDADE" | "VALIDA" | "PROXIMA" | "VENCIDA";
  createdAt: string;
  updatedAt: string;
}

export interface SampleInput {
  reference?: string;
  drawerId?: string;
  addressRecommended?: boolean;
  /* DESABILITADO: Data da amostra / Fabricação
  sampleDate?: string;
  manufacturedAt?: string;
  */
  sampleDate?: string;
  manufacturedAt?: string;
  expiresAt?: string;
  productBase?: string;
  supplier?: string;
  color?: string;
  substrate?: string;
  voc?: "SOLVENTE" | "BASE_AGUA";
  paintApplication?: string;
  brand?: string;
  coat?: string;
  notes?: string;
}

export interface Drawer {
  id: string;
  type: "SOLVENTE" | "BASE_AGUA";
  number: number;
  capacity: number;
}

export interface DrawerSummary extends Drawer {
  occupied: number;
  available: number;
}

export interface PaginatedSamples {
  items: Sample[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  counters: {
    total: number;
    withoutAddress: number;
    expired: number;
    expiring: number;
  };
}

export interface SampleFilters {
  page: number;
  limit: number;
  search?: string;
  color?: string;
  supplier?: string;
  brand?: string;
  productBase?: string;
  substrate?: string;
  voc?: string;
  paintApplication?: string;
  coat?: string;
  sampleDate?: string;
  manufacturedAt?: string;
  expiresAt?: string;
  expirationStatus?: string;
  drawerId?: string;
  status?: string;
  createdDate?: string;
  sort?: string;
  order?: "ASC" | "DESC";
}

export interface SampleMovement {
  id: string;
  event: string;
  fromDrawerId: string | null;
  toDrawerId: string | null;
  details: Record<string, unknown> | null;
  actorId: string;
  actorRegistration: string | null;
  createdAt: string;
}

export interface InventoryAccess {
  id: string;
  corporateUserId: string;
  registration: string | null;
  displayName: string;
  profile: "ADMIN" | "OPERATOR" | "VIEWER";
  active: boolean;
}

export interface InventorySettings {
  defaultDrawerCapacity: number;
  maxDrawerCapacity: number;
  capacityAlertPercent: number;
  expirationAlertDays: number;
}

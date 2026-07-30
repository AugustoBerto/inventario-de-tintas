export interface Sample {
  id: string;
  reference: string;
  sampleDate: string | null;
  manufacturedAt: string | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface SampleInput {
  reference?: string;
  addressRecommended?: boolean;
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
}

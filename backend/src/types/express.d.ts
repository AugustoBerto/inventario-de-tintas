import type { AuthUser } from "./auth.js";
import type { InventoryAccess } from "../database/entities/InventoryAccess.js";

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
      inventoryAccess?: InventoryAccess;
    }
  }
}

export {};

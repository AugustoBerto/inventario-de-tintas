import { describe, expect, it } from "vitest";
import { BatchPreviewCapacity } from "../src/services/batch-preview.js";

describe("prévia de capacidade em lote", () => {
  it("consome cumulativamente as vagas do destino", () => {
    const preview = new BatchPreviewCapacity();
    const destination = { id: "drawer-a", capacity: 2, occupied: 1 };

    expect(preview.tryMove(null, destination)).toBe(true);
    expect(preview.tryMove(null, destination)).toBe(false);
  });

  it("considera vagas liberadas anteriormente no mesmo lote", () => {
    const preview = new BatchPreviewCapacity();
    const drawerA = { id: "drawer-a", capacity: 1, occupied: 1 };
    const drawerB = { id: "drawer-b", capacity: 1, occupied: 0 };

    expect(preview.tryMove("drawer-a", drawerB)).toBe(true);
    expect(preview.tryMove(null, drawerA)).toBe(true);
  });
});

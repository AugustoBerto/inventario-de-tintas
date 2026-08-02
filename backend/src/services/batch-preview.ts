export interface DrawerOccupancy {
  id: string;
  capacity: number;
  occupied: number;
}

export class BatchPreviewCapacity {
  private readonly occupancyChanges = new Map<string, number>();

  tryMove(fromDrawerId: string | null, destination: DrawerOccupancy) {
    const occupied =
      destination.occupied + (this.occupancyChanges.get(destination.id) ?? 0);
    if (occupied >= destination.capacity) return false;

    if (fromDrawerId) {
      this.occupancyChanges.set(
        fromDrawerId,
        (this.occupancyChanges.get(fromDrawerId) ?? 0) - 1,
      );
    }
    this.occupancyChanges.set(
      destination.id,
      (this.occupancyChanges.get(destination.id) ?? 0) + 1,
    );
    return true;
  }
}

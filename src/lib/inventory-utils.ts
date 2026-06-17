import { daysUntil } from "./date-utils";
import type {
  BatchStatus,
  InventoryBatch,
  InventoryItem,
  InventorySummary,
  ItemStatus,
  StockMovement
} from "@/types/inventory";

export function isLowStock(item: InventoryItem, totalQuantity: number): boolean {
  return totalQuantity > 0 && totalQuantity <= item.minQuantity;
}

export function isExpired(dateString?: string): boolean {
  const days = daysUntil(dateString);
  return days !== null && days < 0;
}

export function isExpiringSoon(dateString?: string, withinDays = 30): boolean {
  const days = daysUntil(dateString);
  return days !== null && days >= 0 && days <= withinDays;
}

export function calculateTotalInventory(batches: InventoryBatch[]): number {
  return activeBatches(batches).reduce((sum, batch) => sum + batch.currentQuantity, 0);
}

export function calculateNearestExpiryDate(batches: InventoryBatch[]): string | undefined {
  return activeBatches(batches)
    .filter((batch) => batch.expiryDate && batch.currentQuantity > 0)
    .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())[0]?.expiryDate;
}

export function calculateInventoryValue(batches: InventoryBatch[]): number {
  return activeBatches(batches).reduce((sum, batch) => sum + batch.currentQuantity * batch.unitPrice, 0);
}

export function calculateAverageUnitPrice(batches: InventoryBatch[]): number {
  const validBatches = activeBatches(batches).filter((batch) => batch.currentQuantity > 0);
  const totalQuantity = validBatches.reduce((sum, batch) => sum + batch.currentQuantity, 0);
  if (totalQuantity === 0) return 0;
  return calculateInventoryValue(validBatches) / totalQuantity;
}

export function getItemStatus(item: InventoryItem, batches: InventoryBatch[]): ItemStatus {
  const totalQuantity = calculateTotalInventory(batches);
  const nearestExpiryDate = calculateNearestExpiryDate(batches);
  if (totalQuantity === 0) return "out_of_stock";
  if (nearestExpiryDate && isExpired(nearestExpiryDate)) return "expired";
  if (nearestExpiryDate && isExpiringSoon(nearestExpiryDate)) return "expiring_soon";
  if (isLowStock(item, totalQuantity)) return "low_stock";
  return "normal";
}

export function getBatchStatus(batch: InventoryBatch): BatchStatus {
  if (batch.currentQuantity <= 0) return "used_up";
  if (isExpired(batch.expiryDate)) return "expired";
  if (isExpiringSoon(batch.expiryDate)) return "expiring_soon";
  return "normal";
}

export function summarizeItem(item: InventoryItem, allBatches: InventoryBatch[]): InventorySummary {
  const batches = allBatches.filter((batch) => batch.itemId === item.id && !batch.deletedAt);
  return {
    totalQuantity: calculateTotalInventory(batches),
    availableBatchCount: activeBatches(batches).filter((batch) => batch.currentQuantity > 0).length,
    nearestExpiryDate: calculateNearestExpiryDate(batches),
    averageUnitPrice: calculateAverageUnitPrice(batches),
    inventoryValue: calculateInventoryValue(batches),
    status: getItemStatus(item, batches)
  };
}

export function deductFromEarliestExpiringBatches(
  itemId: string,
  batches: InventoryBatch[],
  quantity: number,
  operatorId: string,
  reason: string,
  notes?: string
): { batches: InventoryBatch[]; movements: StockMovement[]; error?: string } {
  if (quantity <= 0) return { batches, movements: [], error: "出库数量必须大于 0" };
  const available = activeBatches(batches)
    .filter((batch) => batch.itemId === itemId && batch.currentQuantity > 0)
    .sort((a, b) => {
      const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  const total = available.reduce((sum, batch) => sum + batch.currentQuantity, 0);
  if (quantity > total) return { batches, movements: [], error: "出库后数量不能小于 0" };

  let remaining = quantity;
  const now = new Date().toISOString();
  const movements: StockMovement[] = [];
  const updated = batches.map((batch) => {
    if (remaining <= 0 || batch.itemId !== itemId || batch.currentQuantity <= 0 || batch.deletedAt) return batch;
    const deduction = Math.min(batch.currentQuantity, remaining);
    remaining -= deduction;
    const nextQuantity = batch.currentQuantity - deduction;
    movements.push({
      id: `movement-${crypto.randomUUID()}`,
      itemId,
      batchId: batch.id,
      movementType: "out",
      quantityChange: -deduction,
      quantityBefore: batch.currentQuantity,
      quantityAfter: nextQuantity,
      reason,
      operatorId,
      createdAt: now,
      notes
    });
    return { ...batch, currentQuantity: nextQuantity, updatedBy: operatorId, updatedAt: now };
  });

  return { batches: updated, movements };
}

export function deductFromSpecificBatch(
  batch: InventoryBatch,
  quantity: number,
  operatorId: string,
  reason: string,
  notes?: string
): { batch: InventoryBatch; movement?: StockMovement; error?: string } {
  if (quantity <= 0) return { batch, error: "出库数量必须大于 0" };
  if (quantity > batch.currentQuantity) return { batch, error: "出库后数量不能小于 0" };
  const now = new Date().toISOString();
  const nextQuantity = batch.currentQuantity - quantity;
  return {
    batch: { ...batch, currentQuantity: nextQuantity, updatedBy: operatorId, updatedAt: now },
    movement: {
      id: `movement-${crypto.randomUUID()}`,
      itemId: batch.itemId,
      batchId: batch.id,
      movementType: "out",
      quantityChange: -quantity,
      quantityBefore: batch.currentQuantity,
      quantityAfter: nextQuantity,
      reason,
      operatorId,
      createdAt: now,
      notes
    }
  };
}

function activeBatches(batches: InventoryBatch[]): InventoryBatch[] {
  return batches.filter((batch) => !batch.deletedAt);
}

import type { Profile } from "./user";

export type ItemType = "reagent" | "consumable" | "equipment" | "sample" | "other";
export type MovementType = "in" | "out" | "adjust" | "discard";
export type ItemStatus = "normal" | "low_stock" | "expiring_soon" | "expired" | "out_of_stock";
export type BatchStatus = "normal" | "expiring_soon" | "expired" | "used_up";
export type SafetyLevel = "普通" | "易燃" | "腐蚀" | "有毒" | "生物危害";

export interface FunctionCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  itemType: ItemType;
  functionCategoryId: string;
  catalogNumber?: string;
  casNumber?: string;
  specification: string;
  purityOrConcentration?: string;
  packageSize?: string;
  manufacturer: string;
  defaultSupplier?: string;
  unit: string;
  minQuantity: number;
  defaultLocation: string;
  storageCondition?: string;
  safetyLevel?: SafetyLevel;
  ownerId?: string;
  notes?: string;
  tags: string[];
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface InventoryBatch {
  id: string;
  itemId: string;
  lotNumber?: string;
  purchaseDate: string;
  expiryDate?: string;
  purchasedQuantity: number;
  currentQuantity: number;
  unitPrice: number;
  currency: string;
  supplier?: string;
  purchaserId?: string;
  location: string;
  invoiceNumber?: string;
  orderNumber?: string;
  notes?: string;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface StockMovement {
  id: string;
  itemId: string;
  batchId?: string;
  movementType: MovementType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  reason?: string;
  operatorId: string;
  createdAt: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: "create" | "update" | "delete" | "restore";
  oldValue?: unknown;
  newValue?: unknown;
  operatorId: string;
  createdAt: string;
}

export interface InventoryStore {
  profiles: Profile[];
  categories: FunctionCategory[];
  items: InventoryItem[];
  batches: InventoryBatch[];
  movements: StockMovement[];
  auditLogs: AuditLog[];
}

export interface InventorySummary {
  totalQuantity: number;
  availableBatchCount: number;
  nearestExpiryDate?: string;
  averageUnitPrice: number;
  inventoryValue: number;
  status: ItemStatus;
}

export interface InventoryFilters {
  keyword: string;
  itemType: "all" | ItemType;
  categoryId: "all" | string;
  location: "all" | string;
  status: "all" | ItemStatus;
  manufacturer: "all" | string;
  ownerId: "all" | string;
  sortBy: "name" | "quantity" | "expiry" | "updated" | "purchase";
}

export interface ImportPreviewRow {
  rowNumber: number;
  raw: Record<string, string>;
  valid: boolean;
  errors: string[];
}

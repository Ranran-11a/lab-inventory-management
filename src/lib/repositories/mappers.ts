import type { AuditLog, FunctionCategory, InventoryBatch, InventoryItem, StockMovement } from "@/types/inventory";
import type { Profile } from "@/types/user";

export function mapProfile(row: any): Profile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapCategory(row: any): FunctionCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function mapItem(row: any): InventoryItem {
  return {
    id: row.id,
    name: row.name,
    itemType: row.item_type,
    functionCategoryId: row.function_category_id,
    catalogNumber: row.catalog_number ?? undefined,
    casNumber: row.cas_number ?? undefined,
    specification: row.specification,
    purityOrConcentration: row.purity_or_concentration ?? undefined,
    packageSize: row.package_size ?? undefined,
    manufacturer: row.manufacturer,
    defaultSupplier: row.default_supplier ?? undefined,
    unit: row.unit,
    minQuantity: Number(row.min_quantity ?? 0),
    defaultLocation: row.default_location,
    storageCondition: row.storage_condition ?? undefined,
    safetyLevel: row.safety_level ?? undefined,
    ownerId: row.owner_id ?? undefined,
    notes: row.notes ?? undefined,
    tags: row.tags ?? [],
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

export function toItemRow(item: Partial<InventoryItem>) {
  return {
    name: item.name,
    item_type: item.itemType,
    function_category_id: item.functionCategoryId,
    catalog_number: item.catalogNumber,
    cas_number: item.casNumber,
    specification: item.specification,
    purity_or_concentration: item.purityOrConcentration,
    package_size: item.packageSize,
    manufacturer: item.manufacturer,
    default_supplier: item.defaultSupplier,
    unit: item.unit,
    min_quantity: item.minQuantity,
    default_location: item.defaultLocation,
    storage_condition: item.storageCondition,
    safety_level: item.safetyLevel,
    owner_id: item.ownerId,
    notes: item.notes,
    tags: item.tags,
    created_by: item.createdBy,
    updated_by: item.updatedBy,
    deleted_at: item.deletedAt
  };
}

export function mapBatch(row: any): InventoryBatch {
  return {
    id: row.id,
    itemId: row.item_id,
    lotNumber: row.lot_number ?? undefined,
    purchaseDate: row.purchase_date,
    expiryDate: row.expiry_date ?? undefined,
    purchasedQuantity: Number(row.purchased_quantity ?? 0),
    currentQuantity: Number(row.current_quantity ?? 0),
    unitPrice: Number(row.unit_price ?? 0),
    currency: row.currency ?? "CNY",
    supplier: row.supplier ?? undefined,
    purchaserId: row.purchaser_id ?? undefined,
    location: row.location,
    invoiceNumber: row.invoice_number ?? undefined,
    orderNumber: row.order_number ?? undefined,
    notes: row.notes ?? undefined,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}

export function toBatchRow(batch: Partial<InventoryBatch>) {
  return {
    item_id: batch.itemId,
    lot_number: batch.lotNumber,
    purchase_date: batch.purchaseDate,
    expiry_date: batch.expiryDate,
    purchased_quantity: batch.purchasedQuantity,
    current_quantity: batch.currentQuantity,
    unit_price: batch.unitPrice,
    currency: batch.currency,
    supplier: batch.supplier,
    purchaser_id: batch.purchaserId,
    location: batch.location,
    invoice_number: batch.invoiceNumber,
    order_number: batch.orderNumber,
    notes: batch.notes,
    created_by: batch.createdBy,
    updated_by: batch.updatedBy,
    deleted_at: batch.deletedAt
  };
}

export function mapMovement(row: any): StockMovement {
  return {
    id: row.id,
    itemId: row.item_id,
    batchId: row.batch_id ?? undefined,
    movementType: row.movement_type,
    quantityChange: Number(row.quantity_change ?? 0),
    quantityBefore: Number(row.quantity_before ?? 0),
    quantityAfter: Number(row.quantity_after ?? 0),
    reason: row.reason ?? undefined,
    operatorId: row.operator_id,
    createdAt: row.created_at,
    notes: row.notes ?? undefined
  };
}

export function toMovementRow(movement: Partial<StockMovement>) {
  return {
    item_id: movement.itemId,
    batch_id: movement.batchId,
    movement_type: movement.movementType,
    quantity_change: movement.quantityChange,
    quantity_before: movement.quantityBefore,
    quantity_after: movement.quantityAfter,
    reason: movement.reason,
    operator_id: movement.operatorId,
    notes: movement.notes
  };
}

export function toAuditRow(audit: Partial<AuditLog>) {
  return {
    table_name: audit.tableName,
    record_id: audit.recordId,
    action: audit.action,
    old_value: audit.oldValue,
    new_value: audit.newValue,
    operator_id: audit.operatorId
  };
}

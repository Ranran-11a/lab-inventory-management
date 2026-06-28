import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deductFromEarliestExpiringBatches, deductFromSpecificBatch } from "@/lib/inventory-utils";
import {
  mapBatch,
  mapCategory,
  mapItem,
  mapMovement,
  mapProfile,
  toAuditRow,
  toBatchRow,
  toItemRow,
  toMovementRow
} from "./mappers";
import type { FunctionCategory, InventoryBatch, InventoryItem, InventoryStore, StockMovement } from "@/types/inventory";
import type { Profile } from "@/types/user";

const explicitDataSource = process.env.NEXT_PUBLIC_DATA_SOURCE;
const hasSupabaseConfig = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
);

export const dataSource =
  explicitDataSource === "mock"
    ? "mock"
    : explicitDataSource === "supabase" || hasSupabaseConfig
      ? "supabase"
      : "mock";
export const FREE_LIST_LIMIT = 100;

export async function ensureSupabaseProfile(user: { id: string; email?: string | null }): Promise<Profile> {
  const supabase = requireSupabase();
  const { data: existing, error: selectError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (selectError) throw new Error(selectError.message);
  if (existing) return mapProfile(existing);

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email ?? "",
      display_name: user.email?.split("@")[0] || "新成员",
      role: "viewer"
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapProfile(data);
}

export async function loadSupabaseStore(): Promise<InventoryStore> {
  const supabase = requireSupabase();
  const [{ data: profiles, error: profilesError }, { data: categories, error: categoriesError }, { data: items, error: itemsError }] =
    await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: true }),
      supabase.from("function_categories").select("*").order("sort_order", { ascending: true }),
      supabase
        .from("inventory_items")
        .select("*")
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(FREE_LIST_LIMIT)
    ]);
  if (profilesError) throw new Error(profilesError.message);
  if (categoriesError) throw new Error(categoriesError.message);
  if (itemsError) throw new Error(itemsError.message);

  const itemIds = (items ?? []).map((item) => item.id);
  const [{ data: batches, error: batchesError }, { data: movements, error: movementsError }] =
    itemIds.length === 0
      ? [{ data: [], error: null }, { data: [], error: null }]
      : await Promise.all([
          supabase
            .from("inventory_batches")
            .select("*")
            .in("item_id", itemIds)
            .is("deleted_at", null)
            .order("expiry_date", { ascending: true, nullsFirst: false }),
          supabase
            .from("stock_movements")
            .select("*")
            .in("item_id", itemIds)
            .order("created_at", { ascending: false })
            .limit(500)
        ]);
  if (batchesError) throw new Error(batchesError.message);
  if (movementsError) throw new Error(movementsError.message);

  return {
    profiles: (profiles ?? []).map(mapProfile),
    categories: (categories ?? []).map(mapCategory),
    items: (items ?? []).map(mapItem),
    batches: (batches ?? []).map(mapBatch),
    movements: (movements ?? []).map(mapMovement),
    auditLogs: []
  };
}

export async function loadSupabaseItemDetail(itemId: string): Promise<Pick<InventoryStore, "items" | "batches" | "movements">> {
  const supabase = requireSupabase();
  const [{ data: item, error: itemError }, { data: batches, error: batchesError }, { data: movements, error: movementsError }] =
    await Promise.all([
      supabase.from("inventory_items").select("*").eq("id", itemId).is("deleted_at", null).maybeSingle(),
      supabase.from("inventory_batches").select("*").eq("item_id", itemId).is("deleted_at", null).order("expiry_date", { ascending: true, nullsFirst: false }),
      supabase.from("stock_movements").select("*").eq("item_id", itemId).order("created_at", { ascending: false }).limit(500)
    ]);
  if (itemError) throw new Error(itemError.message);
  if (batchesError) throw new Error(batchesError.message);
  if (movementsError) throw new Error(movementsError.message);
  return {
    items: item ? [mapItem(item)] : [],
    batches: (batches ?? []).map(mapBatch),
    movements: (movements ?? []).map(mapMovement)
  };
}

export async function createSupabaseItem(
  input: Omit<InventoryItem, "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt" | "deletedAt">,
  userId: string
): Promise<InventoryItem> {
  const supabase = requireSupabase();
  const ownerId = isUuid(input.ownerId) ? input.ownerId : userId;
  const row = toItemRow({ ...input, ownerId, createdBy: userId, updatedBy: userId });
  const { data, error } = await supabase.from("inventory_items").insert(row).select().single();
  if (error) throw new Error(error.message);
  await writeAudit("inventory_items", data.id, "create", undefined, data, userId);
  return mapItem(data);
}

export async function updateSupabaseItem(id: string, input: Partial<InventoryItem>, userId: string): Promise<InventoryItem> {
  const supabase = requireSupabase();
  const { data: oldValue } = await supabase.from("inventory_items").select("*").eq("id", id).maybeSingle();
  const ownerId = input.ownerId === undefined ? undefined : isUuid(input.ownerId) ? input.ownerId : userId;
  const { data, error } = await supabase.from("inventory_items").update(toItemRow({ ...input, ownerId, updatedBy: userId })).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  await writeAudit("inventory_items", id, "update", oldValue, data, userId);
  return mapItem(data);
}

export async function softDeleteSupabaseItem(id: string, userId: string): Promise<void> {
  const supabase = requireSupabase();
  const { data: oldValue } = await supabase.from("inventory_items").select("*").eq("id", id).maybeSingle();
  const { data, error } = await supabase
    .from("inventory_items")
    .update({ deleted_at: new Date().toISOString(), updated_by: uuidOrUndefined(userId) })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  await writeAudit("inventory_items", id, "delete", oldValue, data, userId);
}

export async function createSupabaseBatch(
  input: Omit<InventoryBatch, "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt" | "deletedAt">,
  userId: string
): Promise<{ batch: InventoryBatch; movement: StockMovement }> {
  const supabase = requireSupabase();
  const purchaserId = isUuid(input.purchaserId) ? input.purchaserId : userId;
  const { data, error } = await supabase
    .from("inventory_batches")
    .insert(toBatchRow({ ...input, createdBy: userId, updatedBy: userId, purchaserId }))
    .select()
    .single();
  if (error) throw new Error(error.message);
  const batch = mapBatch(data);
  const movementInput: Partial<StockMovement> = {
    itemId: batch.itemId,
    batchId: batch.id,
    movementType: "in",
    quantityChange: batch.currentQuantity,
    quantityBefore: 0,
    quantityAfter: batch.currentQuantity,
    reason: "新增入库批次",
    operatorId: userId,
    notes: batch.notes
  };
  const { data: movementData, error: movementError } = await supabase.from("stock_movements").insert(toMovementRow(movementInput)).select().single();
  if (movementError) throw new Error(movementError.message);
  await writeAudit("inventory_batches", batch.id, "create", undefined, data, userId);
  return { batch, movement: mapMovement(movementData) };
}

export async function stockOutSupabaseBatch(
  batch: InventoryBatch,
  quantity: number,
  userId: string,
  reason: string,
  notes?: string
): Promise<{ batch: InventoryBatch; movement: StockMovement; error?: string }> {
  const supabase = requireSupabase();
  const result = deductFromSpecificBatch(batch, quantity, userId, reason, notes);
  if (result.error || !result.movement) return { batch, movement: result.movement as StockMovement, error: result.error };
  const { data, error } = await supabase
    .from("inventory_batches")
    .update({ current_quantity: result.batch.currentQuantity, updated_by: uuidOrUndefined(userId) })
    .eq("id", batch.id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  const { data: movementData, error: movementError } = await supabase.from("stock_movements").insert(toMovementRow(result.movement)).select().single();
  if (movementError) throw new Error(movementError.message);
  await writeAudit("inventory_batches", batch.id, "update", batch, data, userId);
  return { batch: mapBatch(data), movement: mapMovement(movementData) };
}

export async function stockOutSupabaseItem(
  itemId: string,
  batches: InventoryBatch[],
  quantity: number,
  userId: string,
  reason: string,
  notes?: string
): Promise<{ batches: InventoryBatch[]; movements: StockMovement[]; error?: string }> {
  const supabase = requireSupabase();
  const result = deductFromEarliestExpiringBatches(itemId, batches, quantity, userId, reason, notes);
  if (result.error) return result;
  const changed = result.batches.filter((batch) => {
    const oldBatch = batches.find((candidate) => candidate.id === batch.id);
    return oldBatch && oldBatch.currentQuantity !== batch.currentQuantity;
  });
  for (const batch of changed) {
    const { error } = await supabase
      .from("inventory_batches")
      .update({ current_quantity: batch.currentQuantity, updated_by: uuidOrUndefined(userId) })
      .eq("id", batch.id);
    if (error) throw new Error(error.message);
  }
  if (result.movements.length > 0) {
    const { error } = await supabase.from("stock_movements").insert(result.movements.map(toMovementRow));
    if (error) throw new Error(error.message);
  }
  await writeAudit("inventory_batches", itemId, "update", undefined, { quantity, reason }, userId);
  return result;
}

async function writeAudit(tableName: string, recordId: string, action: "create" | "update" | "delete" | "restore", oldValue: unknown, newValue: unknown, userId: string) {
  const supabase = requireSupabase();
  await supabase.from("audit_logs").insert(toAuditRow({ tableName, recordId, action, oldValue, newValue, operatorId: userId }));
}

function requireSupabase() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("未配置 Supabase 环境变量");
  return supabase;
}

function isUuid(value?: string) {
  return Boolean(value?.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i));
}

function uuidOrUndefined(value?: string) {
  return isUuid(value) ? value : undefined;
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { initialInventoryStore } from "@/data/mock-data";
import {
  createSupabaseBatch,
  createSupabaseItem,
  dataSource,
  ensureSupabaseProfile,
  loadSupabaseItemDetail,
  loadSupabaseStore,
  softDeleteSupabaseItem,
  stockOutSupabaseBatch,
  stockOutSupabaseItem,
  updateSupabaseItem
} from "@/lib/repositories/inventory-repository";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deductFromEarliestExpiringBatches, deductFromSpecificBatch } from "@/lib/inventory-utils";
import type { AuditLog, InventoryBatch, InventoryItem, InventoryStore, StockMovement } from "@/types/inventory";
import type { Profile } from "@/types/user";

interface InventoryContextValue extends InventoryStore {
  currentUser: Profile;
  activeItems: InventoryItem[];
  isSupabaseMode: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError?: string;
  refreshData: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | undefined>;
  signUp: (email: string, password: string, displayName?: string) => Promise<string | undefined>;
  signOut: () => Promise<void>;
  getItem: (id: string) => InventoryItem | undefined;
  getItemBatches: (itemId: string) => InventoryBatch[];
  getItemMovements: (itemId: string) => StockMovement[];
  createItem: (input: Omit<InventoryItem, "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt" | "deletedAt">) => Promise<InventoryItem>;
  updateItem: (id: string, input: Partial<InventoryItem>) => Promise<InventoryItem | undefined>;
  deleteItem: (id: string) => Promise<void>;
  createBatch: (input: Omit<InventoryBatch, "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt" | "deletedAt">) => Promise<InventoryBatch>;
  stockOutItem: (itemId: string, quantity: number, reason: string, notes?: string) => Promise<string | undefined>;
  stockOutBatch: (batchId: string, quantity: number, reason: string, notes?: string) => Promise<string | undefined>;
}

const mockUser = initialInventoryStore.profiles[0];
const emptyStore: InventoryStore = { profiles: [], categories: [], items: [], batches: [], movements: [], auditLogs: [] };
const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const isSupabaseMode = dataSource === "supabase";
  const [store, setStore] = useState<InventoryStore>(isSupabaseMode ? emptyStore : initialInventoryStore);
  const [currentUser, setCurrentUser] = useState<Profile>(mockUser);
  const [isAuthenticated, setIsAuthenticated] = useState(!isSupabaseMode);
  const [isLoading, setIsLoading] = useState(isSupabaseMode);
  const [authError, setAuthError] = useState<string>();

  const refreshData = useCallback(async () => {
    if (!isSupabaseMode) return;
    setIsLoading(true);
    try {
      const nextStore = await loadSupabaseStore();
      setStore(nextStore);
      setAuthError(undefined);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "加载 Supabase 数据失败");
    } finally {
      setIsLoading(false);
    }
  }, [isSupabaseMode]);

  useEffect(() => {
    if (!isSupabaseMode) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setAuthError("未配置 Supabase 环境变量，当前无法使用真实数据库模式");
      setIsLoading(false);
      return;
    }

    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }
      const profile = await ensureSupabaseProfile(data.user);
      setCurrentUser(profile);
      setIsAuthenticated(true);
      await refreshData();
    }).catch((error) => {
      setAuthError(error instanceof Error ? error.message : "读取登录状态失败");
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsAuthenticated(false);
        setCurrentUser(mockUser);
        setStore(emptyStore);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [isSupabaseMode, refreshData]);

  const audit = useCallback(
    (tableName: string, recordId: string, action: AuditLog["action"], oldValue?: unknown, newValue?: unknown): AuditLog => ({
      id: `audit-${crypto.randomUUID()}`,
      tableName,
      recordId,
      action,
      oldValue,
      newValue,
      operatorId: currentUser.id,
      createdAt: new Date().toISOString()
    }),
    [currentUser.id]
  );

  const value = useMemo<InventoryContextValue>(() => ({
    ...store,
    currentUser,
    isSupabaseMode,
    isAuthenticated,
    isLoading,
    authError,
    activeItems: store.items.filter((item) => !item.deletedAt),
    refreshData,
    signIn: async (email, password) => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return "未配置 Supabase 环境变量";
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return error.message;
      if (data.user) {
        const profile = await ensureSupabaseProfile(data.user);
        setCurrentUser(profile);
        setIsAuthenticated(true);
        await refreshData();
      }
      return undefined;
    },
    signUp: async (email, password, displayName) => {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) return "未配置 Supabase 环境变量";
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
      if (error) return error.message;
      if (data.user) {
        const profile = await ensureSupabaseProfile({ id: data.user.id, email: data.user.email });
        setCurrentUser(profile);
        setIsAuthenticated(true);
        await refreshData();
      }
      return data.session ? undefined : "注册成功。若 Supabase 开启邮箱确认，请先到邮箱完成确认后再登录。";
    },
    signOut: async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase?.auth.signOut();
      setIsAuthenticated(false);
      setCurrentUser(mockUser);
      setStore(emptyStore);
    },
    getItem: (id) => store.items.find((item) => item.id === id && !item.deletedAt),
    getItemBatches: (itemId) =>
      store.batches
        .filter((batch) => batch.itemId === itemId && !batch.deletedAt)
        .sort((a, b) => {
          const aTime = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
          const bTime = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        }),
    getItemMovements: (itemId) =>
      store.movements
        .filter((movement) => movement.itemId === itemId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    createItem: async (input) => {
      if (isSupabaseMode) {
        const item = await createSupabaseItem(input, currentUser.id);
        setStore((prev) => ({ ...prev, items: [item, ...prev.items] }));
        return item;
      }
      const now = new Date().toISOString();
      const item: InventoryItem = { ...input, id: `item-${crypto.randomUUID()}`, createdBy: currentUser.id, updatedBy: currentUser.id, createdAt: now, updatedAt: now };
      setStore((prev) => ({ ...prev, items: [item, ...prev.items], auditLogs: [audit("inventory_items", item.id, "create", undefined, item), ...prev.auditLogs] }));
      return item;
    },
    updateItem: async (id, input) => {
      if (isSupabaseMode) {
        const item = await updateSupabaseItem(id, input, currentUser.id);
        setStore((prev) => ({ ...prev, items: prev.items.map((candidate) => (candidate.id === id ? item : candidate)) }));
        return item;
      }
      let updated: InventoryItem | undefined;
      setStore((prev) => {
        const oldItem = prev.items.find((item) => item.id === id);
        const now = new Date().toISOString();
        const items = prev.items.map((item) => {
          if (item.id !== id) return item;
          updated = { ...item, ...input, updatedBy: currentUser.id, updatedAt: now };
          return updated;
        });
        return { ...prev, items, auditLogs: oldItem && updated ? [audit("inventory_items", id, "update", oldItem, updated), ...prev.auditLogs] : prev.auditLogs };
      });
      return updated;
    },
    deleteItem: async (id) => {
      if (isSupabaseMode) {
        await softDeleteSupabaseItem(id, currentUser.id);
        setStore((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
        return;
      }
      setStore((prev) => {
        const oldItem = prev.items.find((item) => item.id === id);
        const now = new Date().toISOString();
        return {
          ...prev,
          items: prev.items.map((item) => (item.id === id ? { ...item, deletedAt: now, updatedBy: currentUser.id, updatedAt: now } : item)),
          auditLogs: oldItem ? [audit("inventory_items", id, "delete", oldItem, { deletedAt: now }), ...prev.auditLogs] : prev.auditLogs
        };
      });
    },
    createBatch: async (input) => {
      if (isSupabaseMode) {
        const { batch, movement } = await createSupabaseBatch(input, currentUser.id);
        setStore((prev) => ({ ...prev, batches: [batch, ...prev.batches], movements: [movement, ...prev.movements] }));
        return batch;
      }
      const now = new Date().toISOString();
      const batch: InventoryBatch = { ...input, id: `batch-${crypto.randomUUID()}`, createdBy: currentUser.id, updatedBy: currentUser.id, createdAt: now, updatedAt: now };
      const movement: StockMovement = {
        id: `movement-${crypto.randomUUID()}`,
        itemId: batch.itemId,
        batchId: batch.id,
        movementType: "in",
        quantityChange: batch.currentQuantity,
        quantityBefore: 0,
        quantityAfter: batch.currentQuantity,
        reason: "新增入库批次",
        operatorId: currentUser.id,
        createdAt: now,
        notes: batch.notes
      };
      setStore((prev) => ({ ...prev, batches: [batch, ...prev.batches], movements: [movement, ...prev.movements], auditLogs: [audit("inventory_batches", batch.id, "create", undefined, batch), ...prev.auditLogs] }));
      return batch;
    },
    stockOutItem: async (itemId, quantity, reason, notes) => {
      const itemBatches = store.batches.filter((batch) => batch.itemId === itemId && !batch.deletedAt);
      if (isSupabaseMode) {
        const result = await stockOutSupabaseItem(itemId, itemBatches, quantity, currentUser.id, reason, notes);
        if (result.error) return result.error;
        setStore((prev) => ({
          ...prev,
          batches: prev.batches.map((batch) => result.batches.find((candidate) => candidate.id === batch.id) ?? batch),
          movements: [...result.movements, ...prev.movements]
        }));
        return undefined;
      }
      const result = deductFromEarliestExpiringBatches(itemId, store.batches, quantity, currentUser.id, reason, notes);
      if (result.error) return result.error;
      setStore((prev) => ({ ...prev, batches: result.batches, movements: [...result.movements, ...prev.movements], auditLogs: [audit("inventory_batches", itemId, "update", undefined, { quantity, reason }), ...prev.auditLogs] }));
      return undefined;
    },
    stockOutBatch: async (batchId, quantity, reason, notes) => {
      const batch = store.batches.find((candidate) => candidate.id === batchId);
      if (!batch) return "未找到批次";
      if (isSupabaseMode) {
        const result = await stockOutSupabaseBatch(batch, quantity, currentUser.id, reason, notes);
        if (result.error) return result.error;
        setStore((prev) => ({ ...prev, batches: prev.batches.map((candidate) => (candidate.id === batchId ? result.batch : candidate)), movements: [result.movement, ...prev.movements] }));
        return undefined;
      }
      const result = deductFromSpecificBatch(batch, quantity, currentUser.id, reason, notes);
      if (result.error || !result.movement) return result.error;
      setStore((prev) => ({ ...prev, batches: prev.batches.map((candidate) => (candidate.id === batchId ? result.batch : candidate)), movements: [result.movement!, ...prev.movements], auditLogs: [audit("inventory_batches", batchId, "update", batch, result.batch), ...prev.auditLogs] }));
      return undefined;
    }
  }), [audit, authError, currentUser, isAuthenticated, isLoading, isSupabaseMode, refreshData, store]);

  useEffect(() => {
    if (!isSupabaseMode) return;
    const missingDetail = store.items.some((item) => store.batches.every((batch) => batch.itemId !== item.id) && store.movements.every((movement) => movement.itemId !== item.id));
    if (!missingDetail) return;
    const itemId = store.items[0]?.id;
    if (!itemId) return;
    loadSupabaseItemDetail(itemId).catch(() => undefined);
  }, [isSupabaseMode, store.batches, store.items, store.movements]);

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) throw new Error("useInventory must be used within InventoryProvider");
  return context;
}

"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BatchForm } from "@/components/forms/batch-form";
import { InventoryItemForm } from "@/components/forms/inventory-item-form";
import { StockOutForm } from "@/components/forms/stock-out-form";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { useInventory } from "@/components/inventory/inventory-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { canCreate, canDelete, canEdit, canMoveStock } from "@/lib/permissions";
import type { InventoryFilters, InventoryItem } from "@/types/inventory";

const defaultFilters: InventoryFilters = {
  keyword: "",
  itemType: "all",
  categoryId: "all",
  location: "all",
  status: "all",
  manufacturer: "all",
  ownerId: "all",
  sortBy: "updated"
};

export default function InventoryPage() {
  const router = useRouter();
  const { categories, createItem, updateItem, deleteItem, createBatch, getItemBatches, stockOutItem, stockOutBatch, currentUser } = useInventory();
  const { showToast } = useToast();
  const [modal, setModal] = useState<
    | { type: "create" }
    | { type: "edit"; item: InventoryItem }
    | { type: "batch"; item: InventoryItem }
    | { type: "out"; item: InventoryItem }
    | null
  >(null);
  const [filters, setFilters] = useState<InventoryFilters>(() => {
    const searchParams = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
    return {
      ...defaultFilters,
      keyword: searchParams.get("keyword") ?? "",
      status: (searchParams.get("status") as InventoryFilters["status"]) ?? "all"
    };
  });

  const title = useMemo(() => {
    if (filters.status === "expiring_soon") return "即将过期";
    if (filters.status === "low_stock") return "低库存";
    return "库存列表";
  }, [filters.status]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 text-sm text-muted">按物品基本信息汇总展示，批次库存独立维护</p>
        </div>
        <Button variant="primary" disabled={!canCreate(currentUser.role)} onClick={() => setModal({ type: "create" })}>
          <Plus size={16} />
          新增物品
        </Button>
      </div>

      <InventoryTable
        filters={filters}
        setFilters={setFilters}
        onEdit={(item) => {
          if (!canEdit(currentUser.role)) return showToast("当前角色无编辑权限", "error");
          setModal({ type: "edit", item });
        }}
        onAddBatch={(item) => {
          if (!canMoveStock(currentUser.role)) return showToast("当前角色无入库权限", "error");
          setModal({ type: "batch", item });
        }}
        onStockOut={(item) => {
          if (!canMoveStock(currentUser.role)) return showToast("当前角色无出库权限", "error");
          setModal({ type: "out", item });
        }}
        onDelete={async (item) => {
          if (!canDelete(currentUser.role)) return showToast("当前角色无删除权限", "error");
          if (window.confirm(`确认删除“${item.name}”？该操作会执行软删除并写入审计日志。`)) {
            try {
              await deleteItem(item.id);
              showToast("已删除物品", "success");
            } catch (error) {
              showToast(error instanceof Error ? error.message : "删除失败", "error");
            }
          }
        }}
      />

      {modal?.type === "create" && (
        <Modal title="新增物品" onClose={() => setModal(null)}>
          <InventoryItemForm
            categories={categories}
            onCancel={() => setModal(null)}
            onSubmit={async (input) => {
              try {
                const item = await createItem(input);
                showToast("物品已新增", "success");
                setModal(null);
                router.push(`/inventory/${item.id}`);
              } catch (error) {
                showToast(error instanceof Error ? error.message : "新增失败", "error");
              }
            }}
          />
        </Modal>
      )}
      {modal?.type === "edit" && (
        <Modal title={`编辑：${modal.item.name}`} onClose={() => setModal(null)}>
          <InventoryItemForm
            categories={categories}
            initial={modal.item}
            onCancel={() => setModal(null)}
            onSubmit={async (input) => {
              try {
                await updateItem(modal.item.id, input);
                showToast("修改已保存", "success");
                setModal(null);
              } catch (error) {
                showToast(error instanceof Error ? error.message : "保存失败", "error");
              }
            }}
          />
        </Modal>
      )}
      {modal?.type === "batch" && (
        <Modal title={`新增入库批次：${modal.item.name}`} onClose={() => setModal(null)}>
          <BatchForm
            item={modal.item}
            onCancel={() => setModal(null)}
            onSubmit={async (input) => {
              try {
                await createBatch(input);
                showToast("入库批次已创建", "success");
                setModal(null);
              } catch (error) {
                showToast(error instanceof Error ? error.message : "入库失败", "error");
              }
            }}
          />
        </Modal>
      )}
      {modal?.type === "out" && (
        <Modal title={`出库：${modal.item.name}`} onClose={() => setModal(null)}>
          <StockOutForm
            batches={getItemBatches(modal.item.id)}
            onCancel={() => setModal(null)}
            onSubmit={async (quantity, reason, notes, batchId) => {
              const error = batchId ? await stockOutBatch(batchId, quantity, reason, notes) : await stockOutItem(modal.item.id, quantity, reason, notes);
              if (!error) {
                showToast("出库成功", "success");
                setModal(null);
              }
              return error;
            }}
          />
        </Modal>
      )}
    </div>
  );
}

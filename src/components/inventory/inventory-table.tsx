"use client";

import { Eye, LogIn, LogOut, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useInventory } from "@/components/inventory/inventory-provider";
import { CategoryBadge, StatusBadge, TypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import { summarizeItem } from "@/lib/inventory-utils";
import { canDelete, canEdit, canMoveStock } from "@/lib/permissions";
import type { InventoryFilters, InventoryItem, ItemStatus, ItemType } from "@/types/inventory";
import type { Profile } from "@/types/user";

const statusOptions: Array<["all" | ItemStatus, string]> = [
  ["all", "全部状态"],
  ["normal", "正常"],
  ["low_stock", "低库存"],
  ["expiring_soon", "即将过期"],
  ["expired", "已过期"],
  ["out_of_stock", "无库存"]
];

const typeOptions: Array<["all" | ItemType, string]> = [
  ["all", "全部类型"],
  ["reagent", "试剂"],
  ["consumable", "耗材"],
  ["equipment", "小型设备"],
  ["sample", "样品"],
  ["other", "其他"]
];

interface Props {
  filters: InventoryFilters;
  setFilters: (filters: InventoryFilters) => void;
  onEdit: (item: InventoryItem) => void;
  onAddBatch: (item: InventoryItem) => void;
  onStockOut: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void | Promise<void>;
}

export function InventoryTable({ filters, setFilters, onEdit, onAddBatch, onStockOut, onDelete }: Props) {
  const { activeItems, batches, categories, profiles, currentUser } = useInventoryForTable();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const rows = useMemo(() => {
    const lowered = filters.keyword.trim().toLowerCase();
    const filtered = activeItems
      .map((item) => {
        const itemBatches = batches.filter((batch) => batch.itemId === item.id && !batch.deletedAt);
        const summary = summarizeItem(item, itemBatches);
        const category = categories.find((candidate) => candidate.id === item.functionCategoryId);
        const owner = profiles.find((profile) => profile.id === item.ownerId);
        const searchText = [
          item.name,
          item.catalogNumber,
          item.manufacturer,
          item.casNumber,
          item.specification,
          item.defaultLocation,
          item.notes,
          item.tags.join(" "),
          category?.name
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return { item, summary, category, owner, batches: itemBatches, searchText };
      })
      .filter((row) => !lowered || row.searchText.includes(lowered))
      .filter((row) => filters.itemType === "all" || row.item.itemType === filters.itemType)
      .filter((row) => filters.categoryId === "all" || row.item.functionCategoryId === filters.categoryId)
      .filter((row) => filters.location === "all" || row.item.defaultLocation === filters.location || row.batches.some((batch) => batch.location === filters.location))
      .filter((row) => filters.status === "all" || row.summary.status === filters.status)
      .filter((row) => filters.manufacturer === "all" || row.item.manufacturer === filters.manufacturer)
      .filter((row) => filters.ownerId === "all" || row.item.ownerId === filters.ownerId);

    return filtered.sort((a, b) => {
      if (filters.sortBy === "quantity") return b.summary.totalQuantity - a.summary.totalQuantity;
      if (filters.sortBy === "expiry") {
        const aTime = a.summary.nearestExpiryDate ? new Date(a.summary.nearestExpiryDate).getTime() : Number.MAX_SAFE_INTEGER;
        const bTime = b.summary.nearestExpiryDate ? new Date(b.summary.nearestExpiryDate).getTime() : Number.MAX_SAFE_INTEGER;
        return aTime - bTime;
      }
      if (filters.sortBy === "updated") return new Date(b.item.updatedAt).getTime() - new Date(a.item.updatedAt).getTime();
      if (filters.sortBy === "purchase") {
        const latest = (item: InventoryItem) =>
          Math.max(0, ...batches.filter((batch) => batch.itemId === item.id).map((batch) => new Date(batch.purchaseDate).getTime()));
        return latest(b.item) - latest(a.item);
      }
      return a.item.name.localeCompare(b.item.name, "zh-CN");
    });
  }, [activeItems, batches, categories, filters, profiles]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const locations = uniq([...activeItems.map((item) => item.defaultLocation), ...batches.map((batch) => batch.location)]);
  const manufacturers = uniq(activeItems.map((item) => item.manufacturer));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-md bg-white p-4 shadow-soft ring-1 ring-line md:grid-cols-2 xl:grid-cols-4">
        <input className="rounded-md border border-line px-3 py-2 text-sm" placeholder="关键词搜索" value={filters.keyword} onChange={(event) => setFilters({ ...filters, keyword: event.target.value })} />
        <Select value={filters.itemType} onChange={(itemType) => setFilters({ ...filters, itemType: itemType as InventoryFilters["itemType"] })} options={typeOptions} />
        <Select
          value={filters.categoryId}
          onChange={(categoryId) => setFilters({ ...filters, categoryId })}
          options={[["all", "全部功能分类"], ...categories.map((category) => [category.id, category.name] as [string, string])]}
        />
        <Select value={filters.status} onChange={(status) => setFilters({ ...filters, status: status as InventoryFilters["status"] })} options={statusOptions} />
        <Select value={filters.location} onChange={(location) => setFilters({ ...filters, location })} options={[["all", "全部位置"], ...locations.map((location) => [location, location] as [string, string])]} />
        <Select value={filters.manufacturer} onChange={(manufacturer) => setFilters({ ...filters, manufacturer })} options={[["all", "全部厂家"], ...manufacturers.map((manufacturer) => [manufacturer, manufacturer] as [string, string])]} />
        <Select value={filters.ownerId} onChange={(ownerId) => setFilters({ ...filters, ownerId })} options={[["all", "全部负责人"], ...profiles.map((profile) => [profile.id, profile.displayName] as [string, string])]} />
        <Select
          value={filters.sortBy}
          onChange={(sortBy) => setFilters({ ...filters, sortBy: sortBy as InventoryFilters["sortBy"] })}
          options={[
            ["name", "按名称排序"],
            ["quantity", "按库存数量"],
            ["expiry", "按最近过期"],
            ["updated", "按更新时间"],
            ["purchase", "按购买日期"]
          ]}
        />
      </div>

      <div className="overflow-hidden rounded-md bg-white shadow-soft ring-1 ring-line">
        <div className="table-scroll overflow-x-auto">
          <table className="min-w-[1280px] w-full border-collapse text-left text-sm">
            <thead className="bg-panel text-xs text-muted">
              <tr>
                {["名称", "类型", "功能分类", "规格型号", "生产厂家", "货号", "当前总库存", "单位", "存放位置", "最近过期", "状态", "最近更新人", "最近更新时间", "操作"].map((header) => (
                  <th key={header} className="border-b border-line px-3 py-3 font-semibold">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map(({ item, summary, category }) => {
                const updater = profiles.find((profile) => profile.id === item.updatedBy);
                return (
                  <tr key={item.id} className="border-b border-line hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-ink">
                      <Link href={`/inventory/${item.id}`} className="hover:text-brand">
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <TypeBadge type={item.itemType} />
                    </td>
                    <td className="px-3 py-3">{category && <CategoryBadge name={category.name} />}</td>
                    <td className="px-3 py-3">{item.specification}</td>
                    <td className="px-3 py-3">{item.manufacturer}</td>
                    <td className="px-3 py-3">{item.catalogNumber || "-"}</td>
                    <td className="px-3 py-3 font-semibold">{summary.totalQuantity}</td>
                    <td className="px-3 py-3">{item.unit}</td>
                    <td className="px-3 py-3">{item.defaultLocation}</td>
                    <td className="px-3 py-3">{formatDate(summary.nearestExpiryDate)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={summary.status} />
                    </td>
                    <td className="px-3 py-3">{updater?.displayName ?? "-"}</td>
                    <td className="px-3 py-3">{formatDateTime(item.updatedAt)}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1">
                        <Link title="查看" href={`/inventory/${item.id}`} className="rounded-md p-2 text-muted hover:bg-slate-100 hover:text-ink">
                          <Eye size={16} />
                        </Link>
                        {canEdit(currentUser.role) && (
                          <Button title="编辑" variant="ghost" onClick={() => onEdit(item)}>
                            <Pencil size={16} />
                          </Button>
                        )}
                        {canMoveStock(currentUser.role) && (
                          <>
                            <Button title="入库" variant="ghost" onClick={() => onAddBatch(item)}>
                              <LogIn size={16} />
                            </Button>
                            <Button title="出库" variant="ghost" onClick={() => onStockOut(item)}>
                              <LogOut size={16} />
                            </Button>
                          </>
                        )}
                        {canDelete(currentUser.role) && (
                          <Button title="删除" variant="ghost" onClick={() => onDelete(item)}>
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {visibleRows.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-4 py-12 text-center text-muted">
                    没有符合条件的库存记录
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t border-line px-4 py-3 text-sm text-muted md:flex-row md:items-center md:justify-between">
          <span>共 {rows.length} 条结果，当前第 {safePage} / {pageCount} 页</span>
          <div className="flex items-center gap-2">
            <span>每页</span>
            <select className="rounded-md border border-line bg-white px-2 py-1" value={pageSize} onChange={(event) => {
              setPageSize(Math.min(100, Number(event.target.value)));
              setPage(1);
            }}>
              {[25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
            <Button disabled={safePage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>上一页</Button>
            <Button disabled={safePage >= pageCount} onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}>下一页</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return (
    <select className="rounded-md border border-line bg-white px-3 py-2 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([optionValue, label]) => (
        <option key={optionValue} value={optionValue}>
          {label}
        </option>
      ))}
    </select>
  );
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function useInventoryForTable() {
  return useInventory();
}

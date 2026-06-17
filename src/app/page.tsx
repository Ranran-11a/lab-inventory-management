"use client";

import { Clock, PackageCheck, PackageOpen, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { CategoryBadge, StatusBadge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/date-utils";
import { summarizeItem } from "@/lib/inventory-utils";
import { useInventory } from "@/components/inventory/inventory-provider";
import type { FunctionCategory, InventoryItem, InventorySummary } from "@/types/inventory";

type DashboardRow = { item: InventoryItem; summary: InventorySummary; category?: FunctionCategory };

export default function DashboardPage() {
  const { activeItems, batches, categories, movements, profiles } = useInventory();
  const summaries = activeItems.map((item) => ({
    item,
    summary: summarizeItem(item, batches.filter((batch) => batch.itemId === item.id)),
    category: categories.find((category) => category.id === item.functionCategoryId)
  }));
  const expiring = summaries.filter((row) => row.summary.status === "expiring_soon");
  const expired = summaries.filter((row) => row.summary.status === "expired");
  const low = summaries.filter((row) => row.summary.status === "low_stock");
  const activeBatches = batches.filter((batch) => !batch.deletedAt);
  const monthAdded = activeBatches.filter((batch) => batch.purchaseDate.startsWith("2026-06")).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">仪表盘</h1>
        <p className="mt-1 text-sm text-muted">实验室试剂、耗材、样品与小型设备库存概览</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Stat label="总物品种类数" value={activeItems.length} icon={<PackageOpen size={20} />} />
        <Stat label="总库存批次数" value={activeBatches.length} icon={<PackageCheck size={20} />} />
        <Stat label="低库存项目数" value={low.length} icon={<TriangleAlert size={20} />} />
        <Stat label="即将过期项目数" value={expiring.length} icon={<Clock size={20} />} />
        <Stat label="已过期项目数" value={expired.length} icon={<TriangleAlert size={20} />} />
        <Stat label="本月新增采购批次" value={monthAdded} icon={<PackageCheck size={20} />} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Reminder title="即将过期的试剂/耗材" rows={expiring} />
        <Reminder title="已过期的试剂/耗材" rows={expired} />
        <Reminder title="低库存的试剂/耗材" rows={low} />
        <section className="rounded-md bg-white p-4 shadow-soft ring-1 ring-line">
          <h2 className="font-semibold text-ink">最近更新的库存记录</h2>
          <div className="mt-3 divide-y divide-line">
            {movements.slice(0, 6).map((movement) => {
              const item = activeItems.find((candidate) => candidate.id === movement.itemId);
              const operator = profiles.find((profile) => profile.id === movement.operatorId);
              return (
                <div key={movement.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div>
                    <Link href={`/inventory/${movement.itemId}`} className="font-medium text-ink hover:text-brand">
                      {item?.name ?? movement.itemId}
                    </Link>
                    <div className="mt-1 text-muted">
                      {movement.movementType} {movement.quantityChange}，{operator?.displayName}
                    </div>
                  </div>
                  <span className="text-muted">{formatDateTime(movement.createdAt)}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-md bg-white p-4 shadow-soft ring-1 ring-line">
      <div className="flex items-center justify-between text-muted">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <div className="mt-3 text-3xl font-semibold text-ink">{value}</div>
    </div>
  );
}

function Reminder({
  title,
  rows
}: {
  title: string;
  rows: DashboardRow[];
}) {
  return (
    <section className="rounded-md bg-white p-4 shadow-soft ring-1 ring-line">
      <h2 className="font-semibold text-ink">{title}</h2>
      <div className="mt-3 divide-y divide-line">
        {rows.slice(0, 6).map((row) => (
          <Link key={row.item.id} href={`/inventory/${row.item.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-slate-50">
            <div className="min-w-0">
              <div className="font-medium text-ink">{row.item.name}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-muted">
                {row.category && <CategoryBadge name={row.category.name} />}
                <span>库存 {row.summary.totalQuantity}</span>
                <span>最近过期 {formatDate(row.summary.nearestExpiryDate)}</span>
              </div>
            </div>
            <StatusBadge status={row.summary.status} />
          </Link>
        ))}
        {rows.length === 0 && <div className="py-8 text-center text-sm text-muted">暂无记录</div>}
      </div>
    </section>
  );
}

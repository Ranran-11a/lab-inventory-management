import clsx from "clsx";
import type { BatchStatus, ItemStatus, ItemType } from "@/types/inventory";

const statusLabels: Record<ItemStatus | BatchStatus, string> = {
  normal: "正常",
  low_stock: "低库存",
  expiring_soon: "即将过期",
  expired: "已过期",
  out_of_stock: "无库存",
  used_up: "用完"
};

const itemTypeLabels: Record<ItemType, string> = {
  reagent: "试剂",
  consumable: "耗材",
  equipment: "小型设备",
  sample: "样品",
  other: "其他"
};

export function StatusBadge({ status }: { status: ItemStatus | BatchStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex whitespace-nowrap rounded px-2 py-1 text-xs font-medium",
        status === "normal" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        status === "low_stock" && "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
        status === "expiring_soon" && "bg-orange-50 text-orange-800 ring-1 ring-orange-200",
        status === "expired" && "bg-red-50 text-red-700 ring-1 ring-red-200",
        status === "out_of_stock" && "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
        status === "used_up" && "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

export function TypeBadge({ type }: { type: ItemType }) {
  return <span className="inline-flex whitespace-nowrap rounded bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-200">{itemTypeLabels[type]}</span>;
}

export function CategoryBadge({ name }: { name: string }) {
  return <span className="inline-flex whitespace-nowrap rounded bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-200">{name}</span>;
}

export function itemTypeLabel(type: ItemType): string {
  return itemTypeLabels[type];
}

export function statusLabel(status: ItemStatus | BatchStatus): string {
  return statusLabels[status];
}

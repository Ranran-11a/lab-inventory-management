"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { InventoryBatch, InventoryItem } from "@/types/inventory";

export function BatchForm({
  item,
  onSubmit,
  onCancel
}: {
  item: InventoryItem;
  onSubmit: (input: Omit<InventoryBatch, "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt" | "deletedAt">) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    lotNumber: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    expiryDate: "",
    purchasedQuantity: "1",
    currentQuantity: "1",
    unitPrice: "0",
    currency: "CNY",
    supplier: item.defaultSupplier ?? "",
    purchaserId: "user-editor",
    location: item.defaultLocation,
    invoiceNumber: "",
    orderNumber: "",
    notes: ""
  });
  const [errors, setErrors] = useState<string[]>([]);

  function submit() {
    const nextErrors: string[] = [];
    if (Number(form.purchasedQuantity) <= 0) nextErrors.push("购买数量必须大于 0");
    if (Number(form.currentQuantity) < 0) nextErrors.push("当前数量不能为负数");
    if (Number(form.currentQuantity) > Number(form.purchasedQuantity)) nextErrors.push("当前数量不能大于购买数量");
    if (Number(form.unitPrice) < 0) nextErrors.push("单价不能为负数");
    if (!form.purchaseDate) nextErrors.push("购买日期不能为空");
    if (!form.location.trim()) nextErrors.push("存放位置不能为空");
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;
    onSubmit({
      itemId: item.id,
      lotNumber: form.lotNumber || undefined,
      purchaseDate: form.purchaseDate,
      expiryDate: form.expiryDate || undefined,
      purchasedQuantity: Number(form.purchasedQuantity),
      currentQuantity: Number(form.currentQuantity),
      unitPrice: Number(form.unitPrice),
      currency: form.currency || "CNY",
      supplier: form.supplier || undefined,
      purchaserId: form.purchaserId,
      location: form.location,
      invoiceNumber: form.invoiceNumber || undefined,
      orderNumber: form.orderNumber || undefined,
      notes: form.notes || undefined
    });
  }

  return (
    <div className="space-y-4">
      {errors.length > 0 && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{errors.join("；")}</div>}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["批次号 / Lot No.", "lotNumber", "text"],
          ["购买日期", "purchaseDate", "date"],
          ["过期日期", "expiryDate", "date"],
          ["购买数量", "purchasedQuantity", "number"],
          ["当前数量", "currentQuantity", "number"],
          ["单价", "unitPrice", "number"],
          ["币种", "currency", "text"],
          ["供应商", "supplier", "text"],
          ["存放位置", "location", "text"],
          ["订单号", "orderNumber", "text"],
          ["发票号", "invoiceNumber", "text"]
        ].map(([label, key, type]) => (
          <label key={key} className="space-y-1 text-sm">
            <span className="font-medium text-ink">{label}</span>
            <input
              className="w-full rounded-md border border-line bg-white px-3 py-2"
              type={type}
              value={form[key as keyof typeof form]}
              onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            />
          </label>
        ))}
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-ink">备注</span>
        <textarea className="min-h-20 w-full rounded-md border border-line px-3 py-2" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </label>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>取消</Button>
        <Button variant="primary" onClick={submit}>
          保存入库
        </Button>
      </div>
    </div>
  );
}

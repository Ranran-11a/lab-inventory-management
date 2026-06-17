"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { InventoryBatch } from "@/types/inventory";

export function StockOutForm({
  batches,
  onSubmit,
  onCancel
}: {
  batches: InventoryBatch[];
  onSubmit: (quantity: number, reason: string, notes?: string, batchId?: string) => string | undefined | Promise<string | undefined>;
  onCancel: () => void;
}) {
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("实验使用");
  const [notes, setNotes] = useState("");
  const [batchId, setBatchId] = useState("auto");
  const [error, setError] = useState("");

  return (
    <div className="space-y-4">
      {error && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-ink">出库批次</span>
        <select className="w-full rounded-md border border-line bg-white px-3 py-2" value={batchId} onChange={(event) => setBatchId(event.target.value)}>
          <option value="auto">按最快过期批次自动扣减</option>
          {batches
            .filter((batch) => batch.currentQuantity > 0)
            .map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.lotNumber || batch.id}，剩余 {batch.currentQuantity}
              </option>
            ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-ink">出库数量</span>
        <input className="w-full rounded-md border border-line px-3 py-2" type="number" min="0" value={quantity} onChange={(event) => setQuantity(event.target.value)} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-ink">用途说明</span>
        <input className="w-full rounded-md border border-line px-3 py-2" value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-ink">备注</span>
        <textarea className="min-h-20 w-full rounded-md border border-line px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} />
      </label>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>取消</Button>
        <Button
          variant="primary"
          onClick={async () => {
            const result = await onSubmit(Number(quantity), reason, notes || undefined, batchId === "auto" ? undefined : batchId);
            if (result) setError(result);
          }}
        >
          确认出库
        </Button>
      </div>
    </div>
  );
}

"use client";

import { ArrowLeft, LogIn, LogOut, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { BatchForm } from "@/components/forms/batch-form";
import { InventoryItemForm } from "@/components/forms/inventory-item-form";
import { StockOutForm } from "@/components/forms/stock-out-form";
import { useInventory } from "@/components/inventory/inventory-provider";
import { CategoryBadge, itemTypeLabel, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/date-utils";
import { getBatchStatus, summarizeItem } from "@/lib/inventory-utils";
import { canEdit, canMoveStock } from "@/lib/permissions";

export default function InventoryDetailPage() {
  const params = useParams<{ id: string }>();
  const inventory = useInventory();
  const { showToast } = useToast();
  const item = inventory.getItem(params.id);
  const [modal, setModal] = useState<"edit" | "batch" | "out" | null>(null);
  if (!item) notFound();

  const batches = inventory.getItemBatches(item.id);
  const movements = inventory.getItemMovements(item.id);
  const summary = summarizeItem(item, batches);
  const category = inventory.categories.find((candidate) => candidate.id === item.functionCategoryId);
  const owner = inventory.profiles.find((profile) => profile.id === item.ownerId);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/inventory" className="inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
            <ArrowLeft size={16} />
            返回库存列表
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-ink">{item.name}</h1>
            <StatusBadge status={summary.status} />
            {category && <CategoryBadge name={category.name} />}
          </div>
        </div>
        <div className="flex gap-2">
          <Button disabled={!canEdit(inventory.currentUser.role)} onClick={() => setModal("edit")}>
            <Pencil size={16} />
            编辑
          </Button>
          <Button disabled={!canMoveStock(inventory.currentUser.role)} onClick={() => setModal("batch")}>
            <LogIn size={16} />
            入库
          </Button>
          <Button variant="primary" disabled={!canMoveStock(inventory.currentUser.role)} onClick={() => setModal("out")}>
            <LogOut size={16} />
            出库
          </Button>
        </div>
      </div>

      <section className="rounded-md bg-white p-5 shadow-soft ring-1 ring-line">
        <h2 className="font-semibold text-ink">基本信息</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Info label="名称" value={item.name} />
          <Info label="类型" value={itemTypeLabel(item.itemType)} />
          <Info label="功能分类" value={category?.name} />
          <Info label="标签" value={item.tags.join("，")} />
          <Info label="规格型号" value={item.specification} />
          <Info label="生产厂家" value={item.manufacturer} />
          <Info label="供应商" value={item.defaultSupplier} />
          <Info label="货号 / Catalog No." value={item.catalogNumber} />
          <Info label="CAS 号" value={item.casNumber} />
          <Info label="纯度 / 浓度" value={item.purityOrConcentration} />
          <Info label="包装规格" value={item.packageSize} />
          <Info label="单位" value={item.unit} />
          <Info label="最低库存阈值" value={String(item.minQuantity)} />
          <Info label="默认存放位置" value={item.defaultLocation} />
          <Info label="储存条件" value={item.storageCondition} />
          <Info label="安全信息" value={item.safetyLevel} />
          <Info label="负责人" value={owner?.displayName} />
          <Info label="备注" value={item.notes} wide />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="当前总数量" value={`${summary.totalQuantity} ${item.unit}`} />
        <Metric label="可用批次数" value={String(summary.availableBatchCount)} />
        <Metric label="最近过期日期" value={formatDate(summary.nearestExpiryDate)} />
        <Metric label="平均单价" value={formatCurrency(summary.averageUnitPrice)} />
        <Metric label="总库存估值" value={formatCurrency(summary.inventoryValue)} />
        <div className="rounded-md bg-white p-4 shadow-soft ring-1 ring-line">
          <div className="text-sm text-muted">状态标签</div>
          <div className="mt-3">
            <StatusBadge status={summary.status} />
          </div>
        </div>
      </section>

      <section className="rounded-md bg-white p-5 shadow-soft ring-1 ring-line">
        <h2 className="font-semibold text-ink">批次列表</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-panel text-xs text-muted">
              <tr>
                {["批次号", "购买日期", "过期日期", "购买数量", "当前剩余", "单价", "供应商", "采购人", "存放位置", "订单/发票", "状态", "备注"].map((header) => (
                  <th key={header} className="border-b border-line px-3 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} className="border-b border-line">
                  <td className="px-3 py-3">{batch.lotNumber || "-"}</td>
                  <td className="px-3 py-3">{formatDate(batch.purchaseDate)}</td>
                  <td className="px-3 py-3">{formatDate(batch.expiryDate)}</td>
                  <td className="px-3 py-3">{batch.purchasedQuantity}</td>
                  <td className="px-3 py-3 font-semibold">{batch.currentQuantity}</td>
                  <td className="px-3 py-3">{formatCurrency(batch.unitPrice, batch.currency)}</td>
                  <td className="px-3 py-3">{batch.supplier || "-"}</td>
                  <td className="px-3 py-3">{inventory.profiles.find((profile) => profile.id === batch.purchaserId)?.displayName ?? "-"}</td>
                  <td className="px-3 py-3">{batch.location}</td>
                  <td className="px-3 py-3">{batch.orderNumber || batch.invoiceNumber || "-"}</td>
                  <td className="px-3 py-3"><StatusBadge status={getBatchStatus(batch)} /></td>
                  <td className="px-3 py-3">{batch.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-md bg-white p-5 shadow-soft ring-1 ring-line">
        <h2 className="font-semibold text-ink">出入库记录</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-panel text-xs text-muted">
              <tr>
                {["操作类型", "关联批次", "变动数量", "操作前", "操作后", "操作人", "操作时间", "备注"].map((header) => (
                  <th key={header} className="border-b border-line px-3 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => {
                const batch = batches.find((candidate) => candidate.id === movement.batchId);
                return (
                  <tr key={movement.id} className="border-b border-line">
                    <td className="px-3 py-3">{movement.movementType}</td>
                    <td className="px-3 py-3">{batch?.lotNumber || movement.batchId || "-"}</td>
                    <td className="px-3 py-3 font-semibold">{movement.quantityChange}</td>
                    <td className="px-3 py-3">{movement.quantityBefore}</td>
                    <td className="px-3 py-3">{movement.quantityAfter}</td>
                    <td className="px-3 py-3">{inventory.profiles.find((profile) => profile.id === movement.operatorId)?.displayName ?? "-"}</td>
                    <td className="px-3 py-3">{formatDateTime(movement.createdAt)}</td>
                    <td className="px-3 py-3">{movement.notes || movement.reason || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {modal === "edit" && (
        <Modal title={`编辑：${item.name}`} onClose={() => setModal(null)}>
          <InventoryItemForm
            categories={inventory.categories}
            initial={item}
            onCancel={() => setModal(null)}
            onSubmit={async (input) => {
              try {
                await inventory.updateItem(item.id, input);
                showToast("修改已保存", "success");
                setModal(null);
              } catch (error) {
                showToast(error instanceof Error ? error.message : "保存失败", "error");
              }
            }}
          />
        </Modal>
      )}
      {modal === "batch" && (
        <Modal title={`新增入库批次：${item.name}`} onClose={() => setModal(null)}>
          <BatchForm
            item={item}
            onCancel={() => setModal(null)}
            onSubmit={async (input) => {
              try {
                await inventory.createBatch(input);
                showToast("入库批次已创建", "success");
                setModal(null);
              } catch (error) {
                showToast(error instanceof Error ? error.message : "入库失败", "error");
              }
            }}
          />
        </Modal>
      )}
      {modal === "out" && (
        <Modal title={`出库：${item.name}`} onClose={() => setModal(null)}>
          <StockOutForm
            batches={batches}
            onCancel={() => setModal(null)}
            onSubmit={async (quantity, reason, notes, batchId) => {
              const error = batchId ? await inventory.stockOutBatch(batchId, quantity, reason, notes) : await inventory.stockOutItem(item.id, quantity, reason, notes);
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

function Info({ label, value, wide = false }: { label: string; value?: string; wide?: boolean }) {
  return (
    <div className={wide ? "md:col-span-2 xl:col-span-4" : ""}>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 min-h-6 text-sm font-medium text-ink">{value || "-"}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white p-4 shadow-soft ring-1 ring-line">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-2 text-xl font-semibold text-ink">{value}</div>
    </div>
  );
}

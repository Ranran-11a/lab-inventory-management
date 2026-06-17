"use client";

import { Download, FileDown, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useInventory } from "@/components/inventory/inventory-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { csvTemplateHeaders, downloadCsv, exportInventoryCsv, parseImportCsv } from "@/lib/csv-utils";
import { summarizeItem } from "@/lib/inventory-utils";
import { canCreate } from "@/lib/permissions";
import type { ItemType } from "@/types/inventory";
import type { ImportPreviewRow } from "@/types/inventory";

export default function ImportExportPage() {
  const inventory = useInventory();
  const { showToast } = useToast();
  const [preview, setPreview] = useState<ImportPreviewRow[]>([]);
  const exportRows = useMemo(
    () =>
      inventory.activeItems.map((item) => ({
        item,
        summary: summarizeItem(item, inventory.batches.filter((batch) => batch.itemId === item.id)),
        batches: inventory.batches.filter((batch) => batch.itemId === item.id),
        categoryName: inventory.categories.find((category) => category.id === item.functionCategoryId)?.name ?? ""
      })),
    [inventory.activeItems, inventory.batches, inventory.categories]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">导入导出</h1>
        <p className="mt-1 text-sm text-muted">支持导出当前库存汇总，也支持 CSV 批量导入前预览和逐行校验</p>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-md bg-white p-5 shadow-soft ring-1 ring-line">
          <h2 className="font-semibold text-ink">CSV 导出</h2>
          <p className="mt-2 text-sm text-muted">导出字段包含物品基本信息、库存汇总、最近过期日期、厂家、平均单价和最近购买日期。</p>
          <Button
            className="mt-4"
            variant="primary"
            onClick={() => {
              downloadCsv("实验室库存导出.csv", exportInventoryCsv(exportRows));
              showToast("CSV 已生成", "success");
            }}
          >
            <FileDown size={16} />
            导出库存 CSV
          </Button>
        </section>
        <section className="rounded-md bg-white p-5 shadow-soft ring-1 ring-line">
          <h2 className="font-semibold text-ink">CSV 模板</h2>
          <p className="mt-2 text-sm text-muted">模板字段覆盖物品基本信息和首个批次信息。导入时会根据名称、规格型号、厂家、货号识别已有物品。</p>
          <Button className="mt-4" onClick={() => downloadCsv("库存导入模板.csv", `${csvTemplateHeaders.join(",")}\n`)}>
            <Download size={16} />
            下载 CSV 模板
          </Button>
        </section>
      </div>
      <section className="rounded-md bg-white p-5 shadow-soft ring-1 ring-line">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-semibold text-ink">CSV 导入预览</h2>
            <p className="mt-2 text-sm text-muted">当前 mock 模式只执行前端预览和校验；接入 Supabase 后可将有效行写入数据库。</p>
          </div>
          <div className="flex gap-2">
            {canCreate(inventory.currentUser.role) && (
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-medium text-white hover:bg-teal-800">
                <Upload size={16} />
                选择 CSV 文件
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    const rows = parseImportCsv(text);
                    setPreview(rows);
                    showToast(`已解析 ${rows.length} 行，${rows.filter((row) => !row.valid).length} 行有错误`, "info");
                  }}
                />
              </label>
            )}
            {canCreate(inventory.currentUser.role) && preview.length > 0 && (
              <Button
                onClick={async () => {
                  let success = 0;
                  let failed = 0;
                  for (const row of preview) {
                    if (!row.valid) {
                      failed += 1;
                      continue;
                    }
                    try {
                      const category =
                        inventory.categories.find((candidate) => candidate.name === row.raw["功能分类"]) ?? inventory.categories.find((candidate) => candidate.name === "其他") ?? inventory.categories[0];
                      const existing = inventory.activeItems.find(
                        (item) =>
                          item.name === row.raw["名称"] &&
                          item.specification === row.raw["规格型号"] &&
                          item.manufacturer === row.raw["生产厂家"] &&
                          (item.catalogNumber ?? "") === (row.raw["货号"] ?? "")
                      );
                      const item =
                        existing ??
                        (await inventory.createItem({
                          name: row.raw["名称"],
                          itemType: normalizeItemType(row.raw["类型"]),
                          functionCategoryId: category.id,
                          catalogNumber: row.raw["货号"] || undefined,
                          casNumber: row.raw["CAS号"] || undefined,
                          specification: row.raw["规格型号"],
                          manufacturer: row.raw["生产厂家"],
                          unit: row.raw["单位"],
                          minQuantity: 0,
                          defaultLocation: row.raw["存放位置"],
                          defaultSupplier: row.raw["供应商"] || undefined,
                          notes: row.raw["备注"] || undefined,
                          tags: []
                        }));
                      if (row.raw["购买数量"]) {
                        await inventory.createBatch({
                          itemId: item.id,
                          lotNumber: row.raw["批次号"] || undefined,
                          purchaseDate: row.raw["购买日期"] || new Date().toISOString().slice(0, 10),
                          expiryDate: row.raw["过期日期"] || undefined,
                          purchasedQuantity: Number(row.raw["购买数量"]),
                          currentQuantity: Number(row.raw["当前数量"] || row.raw["购买数量"]),
                          unitPrice: Number(row.raw["单价"] || 0),
                          currency: "CNY",
                          supplier: row.raw["供应商"] || undefined,
                          purchaserId: inventory.currentUser.id,
                          location: row.raw["存放位置"],
                          notes: row.raw["备注"] || undefined
                        });
                      }
                      success += 1;
                    } catch {
                      failed += 1;
                    }
                  }
                  showToast(`导入完成：成功 ${success} 行，失败 ${failed} 行`, failed > 0 ? "info" : "success");
                }}
              >
                写入数据库
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-panel text-xs text-muted">
              <tr>
                {["行号", "名称", "类型", "功能分类", "规格型号", "厂家", "批次号", "校验结果"].map((header) => (
                  <th key={header} className="border-b border-line px-3 py-3">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr key={row.rowNumber} className="border-b border-line">
                  <td className="px-3 py-3">{row.rowNumber}</td>
                  <td className="px-3 py-3">{row.raw["名称"]}</td>
                  <td className="px-3 py-3">{row.raw["类型"]}</td>
                  <td className="px-3 py-3">{row.raw["功能分类"]}</td>
                  <td className="px-3 py-3">{row.raw["规格型号"]}</td>
                  <td className="px-3 py-3">{row.raw["生产厂家"]}</td>
                  <td className="px-3 py-3">{row.raw["批次号"]}</td>
                  <td className={row.valid ? "px-3 py-3 text-emerald-700" : "px-3 py-3 text-red-700"}>{row.valid ? "通过" : row.errors.join("；")}</td>
                </tr>
              ))}
              {preview.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-muted">请选择 CSV 文件后查看预览</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function normalizeItemType(value: string): ItemType {
  if (value === "耗材" || value === "consumable") return "consumable";
  if (value === "小型设备" || value === "equipment") return "equipment";
  if (value === "样品" || value === "sample") return "sample";
  if (value === "其他" || value === "other") return "other";
  return "reagent";
}

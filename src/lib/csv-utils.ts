import Papa from "papaparse";
import type { ImportPreviewRow, InventoryBatch, InventoryItem, InventorySummary } from "@/types/inventory";

export const csvTemplateHeaders = [
  "名称",
  "类型",
  "功能分类",
  "规格型号",
  "生产厂家",
  "单位",
  "存放位置",
  "货号",
  "CAS号",
  "批次号",
  "购买日期",
  "过期日期",
  "购买数量",
  "当前数量",
  "单价",
  "供应商",
  "备注"
];

export function exportInventoryCsv(
  rows: Array<{ item: InventoryItem; summary: InventorySummary; batches: InventoryBatch[]; categoryName: string }>
): string {
  const records = rows.map(({ item, summary, batches, categoryName }) => {
    const newestBatch = [...batches].sort(
      (a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    )[0];
    return {
      名称: item.name,
      类型: item.itemType,
      功能分类: categoryName,
      规格型号: item.specification,
      生产厂家: item.manufacturer,
      货号: item.catalogNumber ?? "",
      CAS号: item.casNumber ?? "",
      当前总库存: summary.totalQuantity,
      单位: item.unit,
      存放位置: item.defaultLocation,
      最近过期日期: summary.nearestExpiryDate ?? "",
      平均单价: summary.averageUnitPrice.toFixed(2),
      库存估值: summary.inventoryValue.toFixed(2),
      最近购买日期: newestBatch?.purchaseDate ?? "",
      备注: item.notes ?? ""
    };
  });
  return Papa.unparse(records);
}

export function parseImportCsv(csvText: string): ImportPreviewRow[] {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim()
  });
  return result.data.map((raw, index) => validateImportRow(index + 2, raw));
}

export function validateImportRow(rowNumber: number, raw: Record<string, string>): ImportPreviewRow {
  const errors: string[] = [];
  ["名称", "类型", "功能分类", "规格型号", "生产厂家", "单位", "存放位置"].forEach((field) => {
    if (!raw[field]?.trim()) errors.push(`${field}不能为空`);
  });
  ["购买数量", "当前数量", "单价"].forEach((field) => {
    if (raw[field] && Number(raw[field]) < 0) errors.push(`${field}不能为负数`);
  });
  if (raw["购买日期"] && Number.isNaN(new Date(raw["购买日期"]).getTime())) errors.push("购买日期格式不正确");
  if (raw["过期日期"] && Number.isNaN(new Date(raw["过期日期"]).getTime())) errors.push("过期日期格式不正确");
  return { rowNumber, raw, valid: errors.length === 0, errors };
}

export function downloadCsv(filename: string, csvText: string): void {
  const blob = new Blob(["\ufeff", csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

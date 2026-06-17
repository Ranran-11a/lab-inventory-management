"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { FunctionCategory, InventoryItem } from "@/types/inventory";

const itemTypes = [
  ["reagent", "试剂"],
  ["consumable", "耗材"],
  ["equipment", "小型设备"],
  ["sample", "样品"],
  ["other", "其他"]
] as const;

interface Props {
  categories: FunctionCategory[];
  initial?: InventoryItem;
  onSubmit: (input: Omit<InventoryItem, "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt" | "deletedAt">) => void | Promise<void>;
  onCancel?: () => void;
}

export function InventoryItemForm({ categories, initial, onSubmit, onCancel }: Props) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    itemType: initial?.itemType ?? "reagent",
    functionCategoryId: initial?.functionCategoryId ?? categories[0]?.id ?? "",
    catalogNumber: initial?.catalogNumber ?? "",
    casNumber: initial?.casNumber ?? "",
    specification: initial?.specification ?? "",
    purityOrConcentration: initial?.purityOrConcentration ?? "",
    packageSize: initial?.packageSize ?? "",
    manufacturer: initial?.manufacturer ?? "",
    defaultSupplier: initial?.defaultSupplier ?? "",
    unit: initial?.unit ?? "",
    minQuantity: String(initial?.minQuantity ?? 0),
    defaultLocation: initial?.defaultLocation ?? "",
    storageCondition: initial?.storageCondition ?? "",
    safetyLevel: initial?.safetyLevel ?? "普通",
    ownerId: initial?.ownerId ?? "user-editor",
    notes: initial?.notes ?? "",
    tags: initial?.tags.join("，") ?? ""
  });
  const [errors, setErrors] = useState<string[]>([]);

  const requiredOk = useMemo(
    () => form.name && form.functionCategoryId && form.specification && form.manufacturer && form.unit && form.defaultLocation,
    [form]
  );

  function submit() {
    const nextErrors: string[] = [];
    if (!form.name.trim()) nextErrors.push("名称不能为空");
    if (!form.functionCategoryId) nextErrors.push("功能分类不能为空");
    if (!form.specification.trim()) nextErrors.push("规格型号不能为空");
    if (!form.manufacturer.trim()) nextErrors.push("生产厂家不能为空");
    if (!form.unit.trim()) nextErrors.push("单位不能为空");
    if (!form.defaultLocation.trim()) nextErrors.push("默认存放位置不能为空");
    if (Number(form.minQuantity) < 0) nextErrors.push("最低库存阈值不能为负数");
    setErrors(nextErrors);
    if (nextErrors.length > 0) return;
    onSubmit({
      name: form.name.trim(),
      itemType: form.itemType as InventoryItem["itemType"],
      functionCategoryId: form.functionCategoryId,
      catalogNumber: form.catalogNumber.trim() || undefined,
      casNumber: form.casNumber.trim() || undefined,
      specification: form.specification.trim(),
      purityOrConcentration: form.purityOrConcentration.trim() || undefined,
      packageSize: form.packageSize.trim() || undefined,
      manufacturer: form.manufacturer.trim(),
      defaultSupplier: form.defaultSupplier.trim() || undefined,
      unit: form.unit.trim(),
      minQuantity: Number(form.minQuantity) || 0,
      defaultLocation: form.defaultLocation.trim(),
      storageCondition: form.storageCondition.trim() || undefined,
      safetyLevel: form.safetyLevel as InventoryItem["safetyLevel"],
      ownerId: form.ownerId || undefined,
      notes: form.notes.trim() || undefined,
      tags: form.tags
        .split(/[，,]/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    });
  }

  return (
    <div className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
          {errors.map((error) => (
            <div key={error}>{error}</div>
          ))}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="名称 *" value={form.name} onChange={(name) => setForm({ ...form, name })} />
        <label className="space-y-1 text-sm">
          <span className="font-medium text-ink">类型 *</span>
          <select className="w-full rounded-md border border-line bg-white px-3 py-2" value={form.itemType} onChange={(event) => setForm({ ...form, itemType: event.target.value as InventoryItem["itemType"] })}>
            {itemTypes.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-ink">功能分类 *</span>
          <select className="w-full rounded-md border border-line bg-white px-3 py-2" value={form.functionCategoryId} onChange={(event) => setForm({ ...form, functionCategoryId: event.target.value })}>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <Field label="规格型号 *" value={form.specification} onChange={(specification) => setForm({ ...form, specification })} />
        <Field label="生产厂家 *" value={form.manufacturer} onChange={(manufacturer) => setForm({ ...form, manufacturer })} />
        <Field label="单位 *" value={form.unit} onChange={(unit) => setForm({ ...form, unit })} />
        <Field label="默认存放位置 *" value={form.defaultLocation} onChange={(defaultLocation) => setForm({ ...form, defaultLocation })} />
        <Field label="最低库存阈值" type="number" value={form.minQuantity} onChange={(minQuantity) => setForm({ ...form, minQuantity })} />
        <Field label="货号 / Catalog No." value={form.catalogNumber} onChange={(catalogNumber) => setForm({ ...form, catalogNumber })} />
        <Field label="CAS 号" value={form.casNumber} onChange={(casNumber) => setForm({ ...form, casNumber })} />
        <Field label="供应商" value={form.defaultSupplier} onChange={(defaultSupplier) => setForm({ ...form, defaultSupplier })} />
        <Field label="纯度 / 浓度" value={form.purityOrConcentration} onChange={(purityOrConcentration) => setForm({ ...form, purityOrConcentration })} />
        <Field label="包装规格" value={form.packageSize} onChange={(packageSize) => setForm({ ...form, packageSize })} />
        <Field label="储存条件" value={form.storageCondition} onChange={(storageCondition) => setForm({ ...form, storageCondition })} />
        <label className="space-y-1 text-sm">
          <span className="font-medium text-ink">安全信息</span>
          <select className="w-full rounded-md border border-line bg-white px-3 py-2" value={form.safetyLevel} onChange={(event) => setForm({ ...form, safetyLevel: event.target.value as NonNullable<InventoryItem["safetyLevel"]> })}>
            {["普通", "易燃", "腐蚀", "有毒", "生物危害"].map((level) => (
              <option key={level}>{level}</option>
            ))}
          </select>
        </label>
        <Field label="标签" value={form.tags} onChange={(tags) => setForm({ ...form, tags })} placeholder="DNA提取，抗体，无菌耗材" />
      </div>
      <label className="block space-y-1 text-sm">
        <span className="font-medium text-ink">备注</span>
        <textarea className="min-h-24 w-full rounded-md border border-line bg-white px-3 py-2" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      </label>
      <div className="flex justify-end gap-2">
        {onCancel && <Button onClick={onCancel}>取消</Button>}
        <Button variant="primary" onClick={submit} disabled={!requiredOk}>
          保存
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium text-ink">{label}</span>
      <input className="w-full rounded-md border border-line bg-white px-3 py-2" type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

"use client";

import { ShieldAlert } from "lucide-react";
import { useInventory } from "@/components/inventory/inventory-provider";
import { CategoryBadge } from "@/components/ui/badge";
import { canManageCategories } from "@/lib/permissions";

export default function CategoriesPage() {
  const { categories, activeItems, currentUser } = useInventory();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">分类管理</h1>
        <p className="mt-1 text-sm text-muted">当前版本内置默认功能分类，数据库 schema 已预留自定义分类管理能力</p>
      </div>
      {!canManageCategories(currentUser.role) && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <ShieldAlert size={18} />
          当前角色只能查看分类，只有 admin 可以管理分类。
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const count = activeItems.filter((item) => item.functionCategoryId === category.id).length;
          return (
            <section key={category.id} className="rounded-md bg-white p-4 shadow-soft ring-1 ring-line">
              <div className="flex items-center justify-between">
                <CategoryBadge name={category.name} />
                <span className="text-sm text-muted">排序 {category.sortOrder}</span>
              </div>
              <p className="mt-3 text-sm text-muted">{category.description}</p>
              <div className="mt-4 text-2xl font-semibold text-ink">{count}</div>
              <div className="text-sm text-muted">关联物品</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

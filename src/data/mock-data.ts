import type { FunctionCategory, InventoryBatch, InventoryItem, InventoryStore, StockMovement } from "@/types/inventory";
import type { Profile } from "@/types/user";

const now = "2026-06-17T10:00:00.000Z";

export const mockProfiles: Profile[] = [
  {
    id: "user-admin",
    email: "pi@example.com",
    displayName: "课题组管理员",
    role: "admin",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "user-editor",
    email: "student@example.com",
    displayName: "实验成员A",
    role: "editor",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "user-viewer",
    email: "viewer@example.com",
    displayName: "访问成员",
    role: "viewer",
    createdAt: now,
    updatedAt: now
  }
];

export const mockCategories: FunctionCategory[] = [
  "分子生物学",
  "细胞培养",
  "蛋白实验",
  "免疫实验",
  "PCR / qPCR",
  "电泳 / Western blot",
  "测序 / 建库",
  "化学分析",
  "显微成像",
  "缓冲液 / 溶液",
  "清洁 / 消毒",
  "通用耗材",
  "安全防护",
  "仪器配件",
  "其他"
].map((name, index) => ({
  id: `cat-${index + 1}`,
  name,
  description: `${name}相关物品`,
  sortOrder: index + 1,
  createdAt: now,
  updatedAt: now
}));

export const mockItems: InventoryItem[] = [];

export const mockBatches: InventoryBatch[] = [];

export const mockMovements: StockMovement[] = [];

export const initialInventoryStore: InventoryStore = {
  profiles: mockProfiles,
  categories: mockCategories,
  items: mockItems,
  batches: mockBatches,
  movements: mockMovements,
  auditLogs: []
};

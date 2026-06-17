"use client";

import { Boxes, ChartNoAxesCombined, FileSpreadsheet, FolderTree, Search, TimerReset, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ToastProvider } from "@/components/ui/toast";
import { useInventory } from "@/components/inventory/inventory-provider";
import { AuthPanel } from "@/components/auth/auth-panel";

const navItems = [
  { href: "/", label: "仪表盘", icon: ChartNoAxesCombined },
  { href: "/inventory", label: "库存列表", icon: Boxes },
  { href: "/inventory?status=expiring_soon", label: "即将过期", icon: TimerReset },
  { href: "/inventory?status=low_stock", label: "低库存", icon: TriangleAlert },
  { href: "/categories", label: "分类管理", icon: FolderTree },
  { href: "/import-export", label: "导入导出", icon: FileSpreadsheet }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isSupabaseMode, isAuthenticated, isLoading, authError, signOut } = useInventory();

  return (
    <ToastProvider>
      <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
        <aside className="border-r border-line bg-white">
          <div className="border-b border-line px-5 py-5">
            <div className="text-lg font-semibold text-ink">实验室库存管理系统</div>
            <div className="mt-1 text-xs text-muted">试剂与耗材协作维护</div>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-3 py-3 lg:block lg:space-y-1 lg:overflow-visible">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href.split("?")[0] && (item.href === "/" || pathname !== "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium ${
                    active ? "bg-teal-50 text-brand" : "text-muted hover:bg-slate-50 hover:text-ink"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0">
          <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-line bg-white/95 px-4 py-3 backdrop-blur md:flex-row md:items-center md:justify-between lg:px-6">
            <div className="relative w-full max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-muted" size={18} />
              <input
                className="w-full rounded-md border border-line bg-panel py-2 pl-10 pr-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-teal-100"
                placeholder="搜索名称、货号、厂家、CAS、规格、位置..."
                onKeyDown={(event) => {
                  if (event.key === "Enter") router.push(`/inventory?keyword=${encodeURIComponent(event.currentTarget.value)}`);
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="rounded bg-slate-100 px-2 py-1 text-muted">{currentUser.role}</span>
              <span className="font-medium text-ink">{currentUser.displayName}</span>
              {isSupabaseMode && isAuthenticated && (
                <button className="text-muted hover:text-ink" onClick={() => void signOut()}>
                  退出
                </button>
              )}
            </div>
          </header>
          <main className="px-4 py-5 lg:px-6">
            {!isSupabaseMode && (
              <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                当前是 mock 演示模式：数据只会保存在当前浏览器，不会同步到云端或其他成员。要多人共享保存，请在 Vercel 配置 Supabase 环境变量并重新部署。
              </div>
            )}
            {isSupabaseMode && authError && (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Supabase 连接异常：{authError}
              </div>
            )}
            {isSupabaseMode && isAuthenticated && currentUser.role === "viewer" && (
              <div className="mb-4 rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                当前账号是 viewer，只能查看，不能新增或编辑。请在 Supabase 的 profiles 表中把你的角色改为 admin 或 editor。
              </div>
            )}
            {isSupabaseMode && isLoading ? (
              <div className="rounded-md bg-white p-8 text-center text-sm text-muted shadow-soft ring-1 ring-line">正在加载...</div>
            ) : isSupabaseMode && !isAuthenticated ? (
              <AuthPanel />
            ) : (
              children
            )}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

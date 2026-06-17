"use client";

import { dataSource } from "@/lib/repositories/inventory-repository";

function mask(value?: string) {
  if (!value) return "未读取到";
  if (value.length <= 12) return "已读取到";
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

export default function DebugPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const explicitDataSource = process.env.NEXT_PUBLIC_DATA_SOURCE;
  const hasWritableSupabaseConfig = Boolean(supabaseUrl && (anonKey || publishableKey));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">部署诊断</h1>
        <p className="mt-1 text-sm text-muted">用于确认 Vercel 构建时是否读取到了 Supabase 环境变量。</p>
      </div>

      <section className="rounded-md bg-white p-5 shadow-soft ring-1 ring-line">
        <h2 className="font-semibold text-ink">当前模式</h2>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div>
            <dt className="text-muted">dataSource</dt>
            <dd className="mt-1 font-medium text-ink">{dataSource}</dd>
          </div>
          <div>
            <dt className="text-muted">是否具备 Supabase 配置</dt>
            <dd className="mt-1 font-medium text-ink">{hasWritableSupabaseConfig ? "是" : "否"}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-md bg-white p-5 shadow-soft ring-1 ring-line">
        <h2 className="font-semibold text-ink">公开环境变量</h2>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-muted">NEXT_PUBLIC_DATA_SOURCE</dt>
            <dd className="mt-1 font-mono text-ink">{explicitDataSource || "未设置"}</dd>
          </div>
          <div>
            <dt className="text-muted">NEXT_PUBLIC_SUPABASE_URL</dt>
            <dd className="mt-1 font-mono text-ink">{mask(supabaseUrl)}</dd>
          </div>
          <div>
            <dt className="text-muted">NEXT_PUBLIC_SUPABASE_ANON_KEY</dt>
            <dd className="mt-1 font-mono text-ink">{mask(anonKey)}</dd>
          </div>
          <div>
            <dt className="text-muted">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</dt>
            <dd className="mt-1 font-mono text-ink">{mask(publishableKey)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-md border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        如果这里显示 `dataSource = mock`，请在 Vercel 项目的 Environment Variables 中添加
        `NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 或
        `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`，并重新部署 Production。
      </section>
    </div>
  );
}

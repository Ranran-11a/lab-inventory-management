"use client";

import { useState } from "react";
import { useInventory } from "@/components/inventory/inventory-provider";
import { Button } from "@/components/ui/button";

export function AuthPanel() {
  const { signIn, signUp, authError } = useInventory();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState(authError ?? "");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setMessage("");
    const result = mode === "signin" ? await signIn(email, password) : await signUp(email, password, displayName);
    if (result) setMessage(result);
    setLoading(false);
  }

  return (
    <div className="mx-auto mt-12 max-w-md rounded-md bg-white p-6 shadow-soft ring-1 ring-line">
      <h1 className="text-xl font-semibold text-ink">{mode === "signin" ? "登录实验室库存系统" : "注册账号"}</h1>
      <p className="mt-2 text-sm text-muted">Supabase 免费版模式需要登录后访问。新注册用户默认是 viewer，需要 admin 调整角色。</p>
      <div className="mt-5 space-y-3">
        {mode === "signup" && (
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-ink">显示名称</span>
            <input className="w-full rounded-md border border-line px-3 py-2" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
        )}
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">邮箱</span>
          <input className="w-full rounded-md border border-line px-3 py-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium text-ink">密码</span>
          <input className="w-full rounded-md border border-line px-3 py-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {message && <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">{message}</div>}
        <Button className="w-full" variant="primary" disabled={loading || !email || !password} onClick={submit}>
          {loading ? "处理中..." : mode === "signin" ? "登录" : "注册"}
        </Button>
        <button className="w-full text-sm text-brand hover:underline" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "没有账号？注册" : "已有账号？登录"}
        </button>
      </div>
    </div>
  );
}

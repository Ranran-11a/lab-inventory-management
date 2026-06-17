"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Toast = { id: string; message: string; type: "success" | "error" | "info" };

const ToastContext = createContext<{ showToast: (message: string, type?: Toast["type"]) => void } | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((toast) => toast.id !== id)), 2800);
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-md px-4 py-3 text-sm shadow-soft ring-1 ${
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : toast.type === "error"
                  ? "bg-red-50 text-red-800 ring-red-200"
                  : "bg-white text-ink ring-line"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

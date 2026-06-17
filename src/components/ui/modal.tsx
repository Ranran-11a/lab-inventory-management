"use client";

import { X } from "lucide-react";
import { Button } from "./button";

export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/35 px-4 py-8">
      <div className="w-full max-w-4xl rounded-md bg-white shadow-soft ring-1 ring-line">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <Button variant="ghost" onClick={onClose} title="关闭">
            <X size={18} />
          </Button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

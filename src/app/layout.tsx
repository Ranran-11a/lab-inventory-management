import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { InventoryProvider } from "@/components/inventory/inventory-provider";

export const metadata: Metadata = {
  title: "实验室库存管理系统",
  description: "实验室试剂与耗材库存管理网站"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <InventoryProvider>
          <AppShell>{children}</AppShell>
        </InventoryProvider>
      </body>
    </html>
  );
}

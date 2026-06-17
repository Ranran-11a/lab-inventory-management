export function todayStart(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function daysUntil(dateString?: string): number | null {
  if (!dateString) return null;
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - todayStart().getTime()) / 86400000);
}

export function formatDate(dateString?: string): string {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(dateString)
  );
}

export function formatDateTime(dateString?: string): string {
  if (!dateString) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateString));
}

export function formatCurrency(amount: number, currency = "CNY"): string {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency }).format(amount || 0);
}

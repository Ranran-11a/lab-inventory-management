import type { UserRole } from "@/types/user";

export function canView(_role: UserRole): boolean {
  return true;
}

export function canCreate(role: UserRole): boolean {
  return role === "admin" || role === "editor";
}

export function canEdit(role: UserRole): boolean {
  return role === "admin" || role === "editor";
}

export function canMoveStock(role: UserRole): boolean {
  return role === "admin" || role === "editor";
}

export function canDelete(role: UserRole): boolean {
  return role === "admin";
}

export function canManageCategories(role: UserRole): boolean {
  return role === "admin";
}

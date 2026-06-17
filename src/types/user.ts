export type UserRole = "admin" | "editor" | "viewer";

export interface Profile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

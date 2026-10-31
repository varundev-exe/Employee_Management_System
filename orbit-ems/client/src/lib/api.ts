import { COOKIE_NAME } from "@shared/const";

export type EmsRole = "admin" | "hr" | "employee";
export type Employee = { id: number; employeeCode: string; firstName: string; lastName: string; email: string; phone?: string | null; jobTitle: string; departmentId?: number | null; department?: { id: number; name: string; color: string } | null; manager?: string | null; location?: string | null; status: string; employmentType: string; hireDate: string; salary?: number | string; userId?: number | null };
export type Department = { id: number; name: string; code: string; color: string; manager?: string | null; employeeCount?: number };
export type EmsBootstrap = { user: { id: number; name: string | null; email: string | null; role: EmsRole }; employeeProfile: Employee | null; stats: { activeEmployees: number; attendanceRate: number; pendingLeaves: number; newThisMonth: number }; departments: Array<{ name: string; color: string; employees: number }>; departmentList: Department[]; attendanceToday: { checkIn: string | null; checkOut: string | null; status: string } | null; activities: Array<{ id: number; actorName: string; action: string; entity: string; detail: string | null; createdAt: string }> };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let sessionHeaders: Record<string, string> = {};
  try {
    const raw = sessionStorage.getItem("manus-cookie");
    const prefix = `${COOKIE_NAME}=`;
    const token = raw?.split(";").find((part) => part.trim().startsWith(prefix))?.trim().slice(prefix.length);
    if (token) sessionHeaders = { Authorization: `Bearer ${token}` };
  } catch { /* sessionStorage is optional outside the embedded Preview */ }
  const response = await fetch(`/api/ems${path}`, { credentials: "include", ...init, headers: { ...sessionHeaders, "X-Orbit-Request": "1", ...(init?.body instanceof Blob ? {} : { "Content-Type": "application/json" }), ...init?.headers } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, blob: Blob, fileName: string, employeeId?: number, category?: "document" | "report") => request<T>(path, { method: "POST", body: blob, headers: { "Content-Type": blob.type || "application/octet-stream", "X-File-Name": encodeURIComponent(fileName), ...(employeeId ? { "X-Employee-Id": String(employeeId) } : {}), ...(category ? { "X-File-Category": category } : {}) } }),
};
export const initials = (first = "", last = "") => `${first.slice(0, 1)}${last.slice(0, 1)}`.toUpperCase() || "OR";
export const money = (value: number | string | null | undefined) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(value) || 0);
export const shortDate = (value: string | Date | null | undefined) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value)) : "—";

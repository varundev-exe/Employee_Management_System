export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";
export type Session = { token: string; email: string; role: Role };
export type Employee = {
  id: number; firstName: string; lastName: string; email: string; role: Role;
  phone: string | null; designation: string | null; salary: number | null;
  joiningDate: string | null; leaveBalance: number; departmentId: number | null;
  departmentName: string | null; managerId: number | null; managerName: string | null;
};
export type Department = { id: number; name: string; description: string | null; employeeCount: number };
export type Attendance = {
  id: number; employeeId: number; employeeName: string; workDate: string;
  checkIn: string | null; checkOut: string | null; status: string; workedMinutes: number | null;
};
export type Leave = {
  id: number; employeeId: number; employeeName: string; leaveType: string;
  startDate: string; endDate: string; days: number; reason: string | null;
  status: string; reviewedByName: string | null; reviewComment: string | null; createdAt: string;
};
export type Page<T> = {
  content: T[]; page: number; size: number; totalElements: number; totalPages: number; last: boolean;
};

const SESSION_KEY = "ems-session";
let memorySession: Session | null = null;
const apiBase = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function readSession(): Session | null {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    if (!value) return memorySession;
    const parsed = JSON.parse(value) as Session;
    if (parsed.token && parsed.email && ["ADMIN", "MANAGER", "EMPLOYEE"].includes(parsed.role)) return parsed;
  } catch { /* Keep the current tab session in memory when storage is unavailable. */ }
  return memorySession;
}

export function saveSession(session: Session | null) {
  memorySession = session;
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* The tab-scoped memory copy remains available until this page closes. */ }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const session = readSession();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (session?.token) headers.set("Authorization", `Bearer ${session.token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${apiBase}${path}`, { ...options, headers, credentials: "omit" });
  if (response.status === 401 && session) {
    saveSession(null);
    window.dispatchEvent(new Event("ems:unauthorized"));
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string; error?: string; detail?: string };
    throw new Error(body.message || body.detail || body.error || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  if (response.status === 201 && response.headers.get("content-length") === "0") return undefined as T;
  return response.json() as Promise<T>;
}

export function get<T>(path: string) { return api<T>(path); }
export function post<T>(path: string, body?: unknown) {
  return api<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) });
}
export function put<T>(path: string, body?: unknown) {
  return api<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) });
}
export function remove<T>(path: string) { return api<T>(path, { method: "DELETE" }); }
export const isManager = (role: Role) => role === "ADMIN" || role === "MANAGER";
export const initials = (name: string) => name.split(/[\s@._-]+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "EM";
export const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${value.slice(0, 10)}T12:00:00`)) : "—";
export const formatTime = (value?: string | null) => value ? value.slice(0, 5) : "—";

export type EmsRole = "admin" | "hr" | "employee";

export function roleFromIdentity(role: unknown): EmsRole {
  if (role === "admin" || role === "hr") return role;
  return "employee";
}

export function selfEmployeeScope(linkedProfileId: number | null, verifiedEmail: string | null) {
  if (linkedProfileId !== null) return { id: linkedProfileId };
  if (verifiedEmail) return { email: verifiedEmail };
  return { id: -1 };
}

export function canManagePeople(role: EmsRole | undefined): boolean {
  return role === "admin" || role === "hr";
}

export function canCoverLeaveBalance(entitled: number, used: number, requested: number): boolean {
  return [entitled, used, requested].every(Number.isFinite)
    && entitled >= 0
    && used >= 0
    && requested > 0
    && used + requested <= entitled;
}

export function mutationNeedsMarker(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

export function privateFileIsAccessible(input: {
  role: EmsRole;
  ownerEmployeeId: number | null;
  viewerEmployeeId: number | null;
  uploadedByUserId: number;
  viewerUserId: number;
}): boolean {
  if (canManagePeople(input.role)) return true;
  if (input.ownerEmployeeId !== null) return input.ownerEmployeeId === input.viewerEmployeeId;
  return input.uploadedByUserId === input.viewerUserId;
}

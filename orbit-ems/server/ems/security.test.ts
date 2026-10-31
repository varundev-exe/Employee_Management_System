import { describe, expect, it } from "vitest";
import { canCoverLeaveBalance, canManagePeople, mutationNeedsMarker, privateFileIsAccessible, roleFromIdentity, selfEmployeeScope } from "./security";

describe("EMS security policy", () => {
  it("maps the OAuth default role to least-privileged employee access", () => {
    expect(roleFromIdentity("user")).toBe("employee");
    expect(roleFromIdentity("employee")).toBe("employee");
    expect(roleFromIdentity("hr")).toBe("hr");
    expect(roleFromIdentity("admin")).toBe("admin");
    expect(roleFromIdentity("unexpected-role")).toBe("employee");
  });

  it("allows people administration only for HR and Admin", () => {
    expect(canManagePeople("admin")).toBe(true);
    expect(canManagePeople("hr")).toBe(true);
    expect(canManagePeople("employee")).toBe(false);
    expect(canManagePeople(undefined)).toBe(false);
  });

  it("prefers an explicit profile assignment to a different matching email", () => {
    expect(selfEmployeeScope(42, "another.profile@example.com")).toEqual({ id: 42 });
    expect(selfEmployeeScope(null, "person@example.com")).toEqual({ email: "person@example.com" });
    expect(selfEmployeeScope(null, null)).toEqual({ id: -1 });
  });

  it("requires a custom request marker for state changes only", () => {
    expect(mutationNeedsMarker("POST")).toBe(true);
    expect(mutationNeedsMarker("delete")).toBe(true);
    expect(mutationNeedsMarker("PATCH")).toBe(true);
    expect(mutationNeedsMarker("GET")).toBe(false);
  });

  it("prevents approvals that exceed an employee's remaining leave balance", () => {
    expect(canCoverLeaveBalance(24, 6, 18)).toBe(true);
    expect(canCoverLeaveBalance(24, 6, 18.1)).toBe(false);
    expect(canCoverLeaveBalance(0, 0, 1)).toBe(false);
    expect(canCoverLeaveBalance(24, 25, 1)).toBe(false);
  });

  it("does not let an employee enumerate or download another person's files", () => {
    const otherEmployeeFile = { role: "employee" as const, ownerEmployeeId: 17, viewerEmployeeId: 28, uploadedByUserId: 501, viewerUserId: 502 };
    expect(privateFileIsAccessible(otherEmployeeFile)).toBe(false);
    expect(privateFileIsAccessible({ ...otherEmployeeFile, ownerEmployeeId: null })).toBe(false);
    expect(privateFileIsAccessible({ ...otherEmployeeFile, ownerEmployeeId: 28 })).toBe(true);
    expect(privateFileIsAccessible({ ...otherEmployeeFile, ownerEmployeeId: null, uploadedByUserId: 502 })).toBe(true);
    expect(privateFileIsAccessible({ ...otherEmployeeFile, uploadedByUserId: 502 })).toBe(false);
    expect(privateFileIsAccessible({ ...otherEmployeeFile, role: "hr" })).toBe(true);
    expect(privateFileIsAccessible({ ...otherEmployeeFile, role: "admin" })).toBe(true);
  });
});

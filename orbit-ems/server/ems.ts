import { eq } from "drizzle-orm";
import { Router, type NextFunction, type Request, type Response } from "express";
import express from "express";
import { z } from "zod";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import type { AuthenticatedUser } from "./_core/sdk";
import { sdk } from "./_core/sdk";
import { canCoverLeaveBalance, canManagePeople, mutationNeedsMarker, privateFileIsAccessible, roleFromIdentity, selfEmployeeScope, type EmsRole } from "./ems/security";
import { storageGetSignedUrl, storagePut } from "./storage";
import { prisma } from "./ems/database";
import { buildAttendanceTrend } from "./ems/analytics";

const router = Router();
type EmsRequest = Request & { emsUser?: AuthenticatedUser; emsRole?: EmsRole };

class LeaveReviewConflict extends Error {
  constructor(readonly reason: "reviewed" | "balance") { super(reason); this.name = "LeaveReviewConflict"; }
}

const asyncRoute = (fn: (req: EmsRequest, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req as EmsRequest, res, next)).catch(next);

function actor(req: EmsRequest) {
  const user = req.emsUser!;
  return { id: user.id, name: user.name || user.email || "Team member", role: req.emsRole! };
}
const isManager = (req: EmsRequest) => canManagePeople(req.emsRole);
function forbidden(res: Response, message = "You do not have permission for this action.") {
  return res.status(403).json({ error: message });
}
function parseId(value: string): number | null {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
function dateOnly(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}
function dayKey(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
function effectiveRole(user: AuthenticatedUser): EmsRole {
  return roleFromIdentity(user.role);
}

router.use(asyncRoute(async (req, res, next) => {
  try {
    const user = await sdk.authenticateRequest(req);
    if (user.isCron || user.id < 1) return forbidden(res, "A signed-in team member is required.");
    req.emsUser = user;
    req.emsRole = effectiveRole(user);
    next();
  } catch {
    res.status(401).json({ error: "Sign in to access employee data." });
  }
}));
router.use((req, res, next) => {
  if (mutationNeedsMarker(req.method) && req.get("X-Orbit-Request") !== "1") {
    return res.status(403).json({ error: "This request could not be verified. Refresh the page and try again." });
  }
  next();
});

const employeeInclude = { department: { select: { id: true, name: true, color: true } } } as const;
const employeeFields = z.object({
  employeeCode: z.string().trim().min(2).max(24).optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().max(40).nullable().optional(),
  jobTitle: z.string().trim().min(1).max(120),
  departmentId: z.number().int().positive().nullable().optional(),
  manager: z.string().trim().max(120).nullable().optional(),
  location: z.string().trim().max(100).nullable().optional(),
  status: z.enum(["Active", "On leave", "Inactive"]).optional(),
  employmentType: z.enum(["Full-time", "Part-time", "Contract"]).optional(),
  hireDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  salary: z.number().min(0).max(10000000).optional(),
}).strict();

async function visibleEmployeeWhere(req: EmsRequest) {
  if (isManager(req)) return {};
  const profile = await prisma.employee.findFirst({ where: { userId: req.emsUser!.id }, select: { id: true } });
  return selfEmployeeScope(profile?.id ?? null, req.emsUser!.email ?? null);
}
async function linkedEmployee(req: EmsRequest) {
  const where = await visibleEmployeeWhere(req);
  return prisma.employee.findFirst({ where, include: employeeInclude });
}
function withoutSalary<T extends { salary?: unknown }>(record: T) {
  const copy = { ...record } as Record<string, unknown>;
  delete copy.salary;
  return copy;
}
async function recordActivity(req: EmsRequest, action: string, entity: string, entityId?: number, detail?: string) {
  const who = actor(req);
  await prisma.activity.create({ data: { actorUserId: who.id, actorName: who.name, action, entity, entityId, detail: detail?.slice(0, 500) } });
}

router.get("/bootstrap", asyncRoute(async (req, res) => {
  const today = dayKey();
  const thisMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const [employees, present, pendingLeaves, departments, activities, headcount, departmentCounts] = await Promise.all([
    prisma.employee.count({ where: { status: { not: "Inactive" } } }),
    prisma.attendance.count({ where: { workDate: today, status: { in: ["Present", "Late"] } } }),
    prisma.leaveRequest.count({ where: { status: "Pending" } }),
    prisma.department.findMany({ include: { _count: { select: { employees: true } } }, orderBy: { name: "asc" } }),
    prisma.activity.findMany({ where: req.emsRole === "employee" ? { actorUserId: req.emsUser!.id } : {}, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.employee.count({ where: { status: { not: "Inactive" }, hireDate: { gte: thisMonth } } }),
    prisma.department.findMany({ select: { name: true, color: true, _count: { select: { employees: true } } }, orderBy: { name: "asc" } }),
  ]);
  const profile = req.emsRole === "employee" ? await linkedEmployee(req) : null;
  const attendanceToday = req.emsRole === "employee" && profile
    ? await prisma.attendance.findUnique({ where: { employeeId_workDate: { employeeId: profile.id, workDate: today } } })
    : null;
  res.json({
    user: { id: req.emsUser!.id, name: req.emsUser!.name, email: req.emsUser!.email, role: req.emsRole },
    employeeProfile: profile ? (req.emsRole === "employee" ? withoutSalary(profile) : profile) : null,
    stats: { activeEmployees: employees, attendanceRate: employees ? Math.round((present / employees) * 100) : 0, pendingLeaves, newThisMonth: headcount },
    departments: departmentCounts.map((d) => ({ name: d.name, color: d.color, employees: d._count.employees })),
    departmentList: departments.map(({ _count, ...d }) => ({ ...d, employees: _count.employees })),
    attendanceToday: attendanceToday ? { checkIn: attendanceToday.checkIn, checkOut: attendanceToday.checkOut, status: attendanceToday.status } : null,
    activities,
  });
}));

router.get("/employees", asyncRoute(async (req, res) => {
  const page = Math.max(1, Math.min(200, Number(req.query.page) || 1));
  const pageSize = Math.max(1, Math.min(50, Number(req.query.pageSize) || 10));
  const q = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const departmentId = typeof req.query.departmentId === "string" ? Number(req.query.departmentId) : undefined;
  const scope = await visibleEmployeeWhere(req);
  const where = { AND: [scope, ...(q ? [{ OR: [{ firstName: { contains: q } }, { lastName: { contains: q } }, { email: { contains: q } }, { jobTitle: { contains: q } }] }] : []), ...(status ? [{ status }] : []), ...(Number.isSafeInteger(departmentId) && departmentId! > 0 ? [{ departmentId }] : [])] };
  const [records, total] = await Promise.all([
    prisma.employee.findMany({ where, include: employeeInclude, orderBy: [{ status: "asc" }, { lastName: "asc" }], skip: (page - 1) * pageSize, take: pageSize }),
    prisma.employee.count({ where }),
  ]);
  res.json({ items: records.map((r) => req.emsRole === "employee" ? withoutSalary(r) : r), total, page, pageSize });
}));
router.post("/employees", asyncRoute(async (req, res) => {
  if (!isManager(req)) return forbidden(res);
  const parsed = employeeFields.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Check the employee details and try again.", issues: parsed.error.issues });
  const v = parsed.data;
  const hireDate = dateOnly(v.hireDate);
  if (!hireDate) return res.status(400).json({ error: "Enter a valid hire date." });
  const record = await prisma.$transaction(async (tx) => {
    const employee = await tx.employee.create({ data: {
      employeeCode: v.employeeCode || `ORB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      firstName: v.firstName, lastName: v.lastName, email: v.email.toLowerCase(), phone: v.phone ?? null,
      jobTitle: v.jobTitle, departmentId: v.departmentId ?? null, manager: v.manager ?? null, location: v.location ?? null,
      status: v.status || "Active", employmentType: v.employmentType || "Full-time", hireDate, salary: v.salary ?? 0,
    }, include: employeeInclude });
    const year = new Date().getUTCFullYear();
    await tx.leaveBalance.createMany({ data: [
      { employeeId: employee.id, year, type: "Annual leave", entitled: 24, used: 0 },
      { employeeId: employee.id, year, type: "Sick leave", entitled: 10, used: 0 },
      { employeeId: employee.id, year, type: "Personal", entitled: 5, used: 0 },
      { employeeId: employee.id, year, type: "Parental", entitled: 60, used: 0 },
    ] });
    return employee;
  });
  await recordActivity(req, "added", "employee", record.id, `${record.firstName} ${record.lastName}`);
  res.status(201).json(record);
}));
router.get("/employees/:id", asyncRoute(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid employee id." });
  const record = await prisma.employee.findFirst({ where: { AND: [{ id }, await visibleEmployeeWhere(req)] }, include: employeeInclude });
  if (!record) return res.status(404).json({ error: "Employee not found." });
  res.json(req.emsRole === "employee" ? withoutSalary(record) : record);
}));
router.put("/employees/:id", asyncRoute(async (req, res) => {
  if (!isManager(req)) return forbidden(res);
  const id = parseId(req.params.id); const parsed = employeeFields.partial().safeParse(req.body);
  if (!id || !parsed.success || Object.keys(parsed.data).length === 0) return res.status(400).json({ error: "Provide valid employee details." });
  const v = parsed.data;
  const hireDate = v.hireDate ? dateOnly(v.hireDate) : null;
  if (v.hireDate && !hireDate) return res.status(400).json({ error: "Enter a valid hire date." });
  const data: Record<string, unknown> = { ...v };
  if (v.email) data.email = v.email.toLowerCase();
  if (hireDate) data.hireDate = hireDate;
  const record = await prisma.employee.update({ where: { id }, data: data as never, include: employeeInclude });
  await recordActivity(req, "updated", "employee", id, `${record.firstName} ${record.lastName}`);
  res.json(record);
}));
router.delete("/employees/:id", asyncRoute(async (req, res) => {
  if (!isManager(req)) return forbidden(res);
  const id = parseId(req.params.id); if (!id) return res.status(400).json({ error: "Invalid employee id." });
  const record = await prisma.employee.findUnique({ where: { id }, include: { _count: { select: { attendance: true, leaveRequests: true, payroll: true, performance: true, goals: true, documents: true } } } });
  if (!record) return res.status(404).json({ error: "Employee not found." });
  const { _count, ...employee } = record;
  if (Object.values(_count).some((n) => n > 0)) return res.status(409).json({ error: "This employee has a history record. Change the status to Inactive to preserve their records." });
  await prisma.employee.delete({ where: { id } });
  await recordActivity(req, "deleted", "employee", id, `${employee.firstName} ${employee.lastName}`);
  res.json({ success: true });
}));

router.get("/departments", asyncRoute(async (_req, res) => {
  const items = await prisma.department.findMany({ include: { _count: { select: { employees: true } } }, orderBy: { name: "asc" } });
  res.json(items.map(({ _count, ...d }) => ({ ...d, employeeCount: _count.employees })));
}));
const departmentBody = z.object({ name: z.string().trim().min(2).max(80), code: z.string().trim().min(2).max(20).regex(/^[A-Za-z0-9_-]+$/), manager: z.string().trim().max(120).nullable().optional(), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional() }).strict();
router.post("/departments", asyncRoute(async (req, res) => {
  if (!isManager(req)) return forbidden(res);
  const p = departmentBody.safeParse(req.body); if (!p.success) return res.status(400).json({ error: "Enter a department name and valid code." });
  const item = await prisma.department.create({ data: { ...p.data, code: p.data.code.toUpperCase(), color: p.data.color || "#6759E8" } });
  await recordActivity(req, "created", "department", item.id, item.name); res.status(201).json(item);
}));
router.put("/departments/:id", asyncRoute(async (req, res) => {
  if (!isManager(req)) return forbidden(res);
  const id = parseId(req.params.id); const p = departmentBody.partial().safeParse(req.body);
  if (!id || !p.success || !Object.keys(p.data).length) return res.status(400).json({ error: "Provide valid department details." });
  const data = { ...p.data, ...(p.data.code ? { code: p.data.code.toUpperCase() } : {}) };
  const item = await prisma.department.update({ where: { id }, data }); await recordActivity(req, "updated", "department", id, item.name); res.json(item);
}));
router.delete("/departments/:id", asyncRoute(async (req, res) => {
  if (!isManager(req)) return forbidden(res);
  const id = parseId(req.params.id); if (!id) return res.status(400).json({ error: "Invalid department id." });
  const item = await prisma.department.findUnique({ where: { id }, include: { _count: { select: { employees: true } } } });
  if (!item) return res.status(404).json({ error: "Department not found." });
  if (item._count.employees) return res.status(409).json({ error: "Reassign this department's employees before removing it." });
  await prisma.department.delete({ where: { id } }); await recordActivity(req, "deleted", "department", id, item.name); res.json({ success: true });
}));

router.get("/attendance", asyncRoute(async (req, res) => {
  const scope = await visibleEmployeeWhere(req);
  const from = dateOnly(typeof req.query.from === "string" ? req.query.from : "");
  const to = dateOnly(typeof req.query.to === "string" ? req.query.to : "");
  const employeeId = typeof req.query.employeeId === "string" ? Number(req.query.employeeId) : undefined;
  const employeeScope = Object.keys(scope).length ? { employee: scope } : {};
  const where = { ...employeeScope, ...(from || to ? { workDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}), ...(isManager(req) && employeeId ? { employeeId } : {}) };
  const items = await prisma.attendance.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } } }, orderBy: [{ workDate: "desc" }, { checkIn: "desc" }], take: 200 });
  res.json(items);
}));
router.post("/attendance/check-in", asyncRoute(async (req, res) => {
  const profile = isManager(req)
    ? Number.isSafeInteger(req.body?.employeeId) ? await prisma.employee.findUnique({ where: { id: req.body.employeeId } }) : null
    : await linkedEmployee(req);
  if (!profile) return res.status(409).json({ error: "Your account is not linked to an employee profile. Ask HR to connect your work email first." });
  const workDate = dayKey(); const prior = await prisma.attendance.findUnique({ where: { employeeId_workDate: { employeeId: profile.id, workDate } } });
  if (prior?.checkIn) return res.status(409).json({ error: "You are already checked in for today." });
  const at = new Date();
  const item = prior ? await prisma.attendance.update({ where: { id: prior.id }, data: { checkIn: at, status: "Present" } }) : await prisma.attendance.create({ data: { employeeId: profile.id, workDate, checkIn: at, status: "Present" } });
  await recordActivity(req, "checked in", "attendance", item.id); res.status(201).json(item);
}));
router.post("/attendance/check-out", asyncRoute(async (req, res) => {
  const profile = isManager(req)
    ? Number.isSafeInteger(req.body?.employeeId) ? await prisma.employee.findUnique({ where: { id: req.body.employeeId } }) : null
    : await linkedEmployee(req);
  if (!profile) return res.status(409).json({ error: "Your account is not linked to an employee profile." });
  const workDate = dayKey(); const prior = await prisma.attendance.findUnique({ where: { employeeId_workDate: { employeeId: profile.id, workDate } } });
  if (!prior?.checkIn) return res.status(409).json({ error: "Check in before checking out." });
  if (prior.checkOut) return res.status(409).json({ error: "You have already checked out." });
  const item = await prisma.attendance.update({ where: { id: prior.id }, data: { checkOut: new Date() } });
  await recordActivity(req, "checked out", "attendance", item.id); res.json(item);
}));

router.get("/leave", asyncRoute(async (req, res) => {
  const scope = await visibleEmployeeWhere(req);
  const where = Object.keys(scope).length ? { employee: scope } : {};
  const [items, balances] = await Promise.all([
    prisma.leaveRequest.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, email: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.leaveBalance.findMany({ where, include: { employee: { select: { firstName: true, lastName: true } } }, orderBy: [{ year: "desc" }, { type: "asc" }] }),
  ]);
  res.json({ items, balances });
}));
const leaveBody = z.object({ employeeId: z.number().int().positive().optional(), type: z.enum(["Annual leave", "Sick leave", "Personal", "Parental"]), startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), days: z.number().positive().max(365), reason: z.string().trim().min(5).max(1000) }).strict();
router.post("/leave", asyncRoute(async (req, res) => {
  const parsed = leaveBody.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: "Enter valid leave dates, duration and reason." });
  const employee = isManager(req)
    ? parsed.data.employeeId ? await prisma.employee.findUnique({ where: { id: parsed.data.employeeId }, include: employeeInclude }) : null
    : await linkedEmployee(req);
  if (!employee) return res.status(409).json({ error: isManager(req) ? "Select a valid employee profile for this leave request." : "Ask HR to link your account to an employee profile before applying for leave." });
  const { startDate, endDate, employeeId: _employeeId, ...rest } = parsed.data; const start = dateOnly(startDate)!; const end = dateOnly(endDate)!;
  if (end < start) return res.status(400).json({ error: "The end date must be on or after the start date." });
  const entitlement = { "Annual leave": 24, "Sick leave": 10, Personal: 5, Parental: 60 }[rest.type];
  const item = await prisma.$transaction(async (tx) => {
    await tx.leaveBalance.upsert({
      where: { employeeId_year_type: { employeeId: employee.id, year: start.getUTCFullYear(), type: rest.type } },
      create: { employeeId: employee.id, year: start.getUTCFullYear(), type: rest.type, entitled: entitlement, used: 0 },
      update: {},
    });
    return tx.leaveRequest.create({ data: { ...rest, employeeId: employee.id, startDate: start, endDate: end } });
  });
  await recordActivity(req, "submitted", "leave request", item.id, `${employee.firstName} ${employee.lastName}`); res.status(201).json(item);
}));
router.patch("/leave/:id", asyncRoute(async (req, res) => {
  if (!isManager(req)) return forbidden(res);
  const id = parseId(req.params.id); const p = z.object({ status: z.enum(["Approved", "Rejected"]) }).safeParse(req.body);
  if (!id || !p.success) return res.status(400).json({ error: "Choose approve or reject." });
  const reviewer = actor(req).name;
  let item;
  try {
    item = await prisma.$transaction(async (tx) => {
      const request = await tx.leaveRequest.findUnique({ where: { id } });
      if (!request || request.status !== "Pending") throw new LeaveReviewConflict("reviewed");
      if (p.data.status === "Approved") {
        const year = request.startDate.getUTCFullYear();
        const balance = await tx.leaveBalance.findUnique({ where: { employeeId_year_type: { employeeId: request.employeeId, year, type: request.type } } });
        if (!balance || !canCoverLeaveBalance(balance.entitled.toNumber(), balance.used.toNumber(), request.days.toNumber())) throw new LeaveReviewConflict("balance");
        const reservation = await tx.leaveBalance.updateMany({
          where: { employeeId: request.employeeId, year, type: request.type, used: { lte: balance.entitled.minus(request.days) } },
          data: { used: { increment: request.days } },
        });
        if (!reservation.count) throw new LeaveReviewConflict("balance");
      }
      const changed = await tx.leaveRequest.updateMany({ where: { id, status: "Pending" }, data: { status: p.data.status, reviewer, reviewedAt: new Date() } });
      if (!changed.count) throw new LeaveReviewConflict("reviewed");
      return tx.leaveRequest.findUnique({ where: { id } });
    });
  } catch (error) {
    if (error instanceof LeaveReviewConflict) return res.status(409).json({ error: error.reason === "balance" ? "This employee does not have enough leave balance for that request." : "This request has already been reviewed or no longer exists." });
    throw error;
  }
  if (!item) return res.status(409).json({ error: "This request has already been reviewed or no longer exists." });
  await recordActivity(req, p.data.status.toLowerCase(), "leave request", id); res.json(item);
}));

router.get("/payroll", asyncRoute(async (req, res) => {
  const scope = await visibleEmployeeWhere(req);
  const where = Object.keys(scope).length ? { employee: scope } : {};
  const items = await prisma.payroll.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } } }, orderBy: { periodEnd: "desc" }, take: 200 });
  res.json(items);
}));
const payrollBody = z.object({ employeeId: z.number().int().positive(), periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), baseSalary: z.number().min(0).max(10000000), deductions: z.number().min(0).max(10000000), status: z.enum(["Draft", "Processed"]).optional() }).strict();
router.post("/payroll", asyncRoute(async (req, res) => {
  if (!isManager(req)) return forbidden(res);
  const p = payrollBody.safeParse(req.body); if (!p.success) return res.status(400).json({ error: "Enter a valid employee, pay period and amounts." });
  const v = p.data; const end = dateOnly(v.periodEnd)!; const start = dateOnly(v.periodStart)!;
  if (start > end || v.deductions > v.baseSalary) return res.status(400).json({ error: "Check the pay period and ensure deductions do not exceed gross pay." });
  const item = await prisma.payroll.create({ data: { employeeId: v.employeeId, periodStart: start, periodEnd: end, baseSalary: v.baseSalary, deductions: v.deductions, netPay: v.baseSalary - v.deductions, status: v.status || "Draft" }, include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } } });
  await recordActivity(req, "created", "payroll", item.id, `Pay period ending ${v.periodEnd}`); res.status(201).json(item);
}));
router.patch("/payroll/:id", asyncRoute(async (req, res) => {
  if (!isManager(req)) return forbidden(res);
  const id = parseId(req.params.id); const p = z.object({ status: z.enum(["Draft", "Processed"]) }).safeParse(req.body);
  if (!id || !p.success) return res.status(400).json({ error: "Invalid payroll update." });
  const item = await prisma.payroll.update({ where: { id }, data: { status: p.data.status } }); await recordActivity(req, "updated", "payroll", id); res.json(item);
}));

router.get("/performance", asyncRoute(async (req, res) => {
  const scope = await visibleEmployeeWhere(req); const where = Object.keys(scope).length ? { employee: scope } : {};
  const [reviews, goals] = await Promise.all([
    prisma.performanceReview.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true, jobTitle: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.goal.findMany({ where, include: { employee: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { dueDate: "asc" }, take: 200 }),
  ]); res.json({ reviews, goals });
}));
router.post("/performance/reviews", asyncRoute(async (req, res) => {
  if (!isManager(req)) return forbidden(res);
  const p = z.object({ employeeId: z.number().int().positive(), rating: z.number().min(1).max(5), summary: z.string().trim().min(5).max(1200), period: z.string().trim().min(3).max(40) }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Enter a rating from 1–5, review notes and review period." });
  const item = await prisma.performanceReview.create({ data: { ...p.data, reviewer: actor(req).name } }); await recordActivity(req, "added review", "performance review", item.id); res.status(201).json(item);
}));
router.post("/performance/goals", asyncRoute(async (req, res) => {
  const p = z.object({ employeeId: z.number().int().positive().optional(), title: z.string().trim().min(3).max(180), description: z.string().trim().max(1000).nullable().optional(), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional() }).safeParse(req.body);
  if (!p.success) return res.status(400).json({ error: "Enter a valid goal." });
  const dueDate = p.data.dueDate ? dateOnly(p.data.dueDate) : null;
  if (p.data.dueDate && !dueDate) return res.status(400).json({ error: "Enter a valid goal due date." });
  const profile = isManager(req)
    ? p.data.employeeId ? await prisma.employee.findUnique({ where: { id: p.data.employeeId } }) : null
    : await linkedEmployee(req);
  if (!profile) return res.status(409).json({ error: isManager(req) ? "Select a valid employee profile for this goal." : "Ask HR to link your account to an employee profile before adding a goal." });
  const item = await prisma.goal.create({ data: { employeeId: profile.id, title: p.data.title, description: p.data.description ?? null, dueDate } });
  await recordActivity(req, "created goal", "performance goal", item.id); res.status(201).json(item);
}));
router.patch("/performance/goals/:id", asyncRoute(async (req, res) => {
  const id = parseId(req.params.id); const p = z.object({ progress: z.number().int().min(0).max(100).optional(), status: z.enum(["In progress", "Complete", "At risk"]).optional() }).strict().safeParse(req.body);
  if (!id || !p.success || !Object.keys(p.data).length) return res.status(400).json({ error: "Provide goal progress or status." });
  const existing = await prisma.goal.findUnique({ where: { id } }); if (!existing) return res.status(404).json({ error: "Goal not found." });
  if (!isManager(req)) { const profile = await linkedEmployee(req); if (!profile || profile.id !== existing.employeeId) return forbidden(res); }
  const item = await prisma.goal.update({ where: { id }, data: p.data }); await recordActivity(req, "updated goal", "performance goal", id); res.json(item);
}));

router.get("/reports/summary", asyncRoute(async (req, res) => {
  const scoped = await visibleEmployeeWhere(req); const employeeScope = Object.keys(scoped).length ? { employee: scoped } : {};
  const today = dayKey();
  const trendStart = new Date(today.getTime() - 6 * 86400000);
  const [departments, attendance, attendanceDays, leaves, reviews, headcount, payroll] = await Promise.all([
    prisma.department.findMany({ select: { name: true, color: true, _count: { select: { employees: true } } }, orderBy: { name: "asc" } }),
    prisma.attendance.count({ where: { ...employeeScope, workDate: { gte: trendStart, lte: today } } }),
    prisma.attendance.groupBy({ by: ["workDate"], where: { ...employeeScope, workDate: { gte: trendStart, lte: today } }, _count: { _all: true } }),
    prisma.leaveRequest.groupBy({ by: ["status"], where: employeeScope, _count: { _all: true } }),
    prisma.performanceReview.aggregate({ where: employeeScope, _avg: { rating: true } }),
    prisma.employee.count({ where: { status: "Active", ...(req.emsRole === "employee" ? { id: (await linkedEmployee(req))?.id ?? -1 } : {}) } }),
    isManager(req) ? prisma.payroll.aggregate({ _sum: { netPay: true }, where: { periodEnd: { gte: new Date(Date.now() - 180 * 86400000) } } }) : Promise.resolve({ _sum: { netPay: null } }),
  ]);
  const attendanceTrend = buildAttendanceTrend(trendStart, attendanceDays.map((x) => ({ workDate: x.workDate, count: x._count._all })));
  res.json({ departments: departments.map((d) => ({ name: d.name, color: d.color, employees: d._count.employees })), attendanceLast7Days: attendance, attendanceTrend, leaveRequests: leaves.map((x) => ({ status: x.status, count: x._count._all })), averageRating: reviews._avg.rating, activeEmployees: headcount, netPayrollLast6Months: payroll._sum.netPay });
}));
router.get("/activity", asyncRoute(async (req, res) => {
  if (!isManager(req)) return forbidden(res);
  res.json(await prisma.activity.findMany({ orderBy: { createdAt: "desc" }, take: 100 }));
}));

router.get("/settings/users", asyncRoute(async (req, res) => {
  if (req.emsRole !== "admin") return forbidden(res, "Only an Admin can manage user roles.");
  const db = await getDb(); if (!db) return res.status(503).json({ error: "User directory is currently unavailable." });
  const items = await db.select({ id: users.id, name: users.name, email: users.email, openId: users.openId, role: users.role, lastSignedIn: users.lastSignedIn }).from(users).orderBy(users.name);
  const linked = await prisma.employee.findMany({ where: { userId: { not: null } }, select: { id: true, userId: true, firstName: true, lastName: true } });
  res.json(items.map((u) => ({ ...u, role: u.role === "user" ? "employee" : u.role, employee: linked.find((e) => e.userId === u.id) || null, openId: undefined })));
}));
router.patch("/settings/users/:id", asyncRoute(async (req, res) => {
  if (req.emsRole !== "admin") return forbidden(res, "Only an Admin can manage user roles.");
  const id = parseId(req.params.id); const p = z.object({ role: z.enum(["admin", "hr", "employee"]).optional(), employeeId: z.number().int().positive().nullable().optional() }).strict().safeParse(req.body);
  if (!id || !p.success || !Object.keys(p.data).length) return res.status(400).json({ error: "Provide a valid role or employee assignment." });
  if (id === req.emsUser!.id && p.data.role && p.data.role !== "admin") return res.status(409).json({ error: "You cannot remove your own Admin access." });
  const db = await getDb(); if (!db) return res.status(503).json({ error: "User directory is currently unavailable." });
  const target = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1);
  if (!target.length) return res.status(404).json({ error: "User account not found." });
  if (p.data.role) await db.update(users).set({ role: p.data.role }).where(eq(users.id, id));
  if (p.data.employeeId !== undefined) {
    if (p.data.employeeId === null) await prisma.employee.updateMany({ where: { userId: id }, data: { userId: null } });
    else await prisma.employee.update({ where: { id: p.data.employeeId }, data: { userId: id } });
  }
  await recordActivity(req, "updated access", "user", id, p.data.role ? `Role set to ${p.data.role}` : "Employee profile assignment changed");
  res.json({ success: true });
}));

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const allowedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "text/csv", "text/plain", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
router.get("/documents", asyncRoute(async (req, res) => {
  const scope = await visibleEmployeeWhere(req);
  const where = { deletedAt: null, ...(!isManager(req) ? { OR: [{ employee: scope }, { employeeId: null, uploadedByUserId: req.emsUser!.id }] } : {}) };
  res.json(await prisma.documentRecord.findMany({ where, select: { id: true, employeeId: true, uploadedByUserId: true, fileName: true, mimeType: true, byteSize: true, category: true, createdAt: true, employee: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" }, take: 200 }));
}));
router.post("/documents", (req, res, next) => {
  expressRaw(req, res, next);
}, asyncRoute(async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) return res.status(400).json({ error: "Choose a document to upload." });
  if (req.body.length > MAX_FILE_BYTES) return res.status(413).json({ error: "Files must be 10 MB or smaller." });
  const mimeType = String(req.get("Content-Type") || "").split(";")[0].trim().toLowerCase();
  if (!allowedTypes.has(mimeType)) return res.status(415).json({ error: "Upload a PDF, DOCX, XLSX, CSV, TXT, PNG or JPEG file." });
  let fileName = String(req.get("X-File-Name") || "");
  try { fileName = decodeURIComponent(fileName); } catch { return res.status(400).json({ error: "The file name is malformed." }); }
  fileName = fileName.slice(0, 240).replace(/[\r\n\0]/g, "").trim();
  if (!fileName) return res.status(400).json({ error: "The uploaded file needs a name." });
  const extension = fileName.split(".").pop()?.toLowerCase();
  const extensionByType: Record<string, string[]> = { "application/pdf": ["pdf"], "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"], "text/csv": ["csv"], "text/plain": ["txt"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"] };
  if (!extensionByType[mimeType]?.includes(extension || "")) return res.status(415).json({ error: "The file extension and declared type do not match." });
  const rawEmployeeId = req.get("X-Employee-Id"); let employeeId: number | null = rawEmployeeId ? Number(rawEmployeeId) : null;
  const category = req.get("X-File-Category") === "report" ? "report" : "document";
  if (employeeId !== null && (!Number.isSafeInteger(employeeId) || employeeId < 1)) return res.status(400).json({ error: "Invalid employee profile." });
  if (req.emsRole === "employee") {
    const profile = await linkedEmployee(req);
    if (!profile || (employeeId !== null && employeeId !== profile.id)) return forbidden(res, "You can only upload a file to your own profile.");
    employeeId = profile.id;
  }
  if (category === "report" && !isManager(req)) return forbidden(res, "Only Admin and HR can store organization reports.");
  if (employeeId && !isManager(req)) {
    const profile = await linkedEmployee(req); if (!profile || profile.id !== employeeId) return forbidden(res);
  }
  const target = employeeId ? await prisma.employee.findUnique({ where: { id: employeeId } }) : null;
  if (employeeId && !target) return res.status(404).json({ error: "Employee profile not found." });
  const slug = fileName.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "file";
  const key = `ems/${category}/${employeeId || "shared"}/${crypto.randomUUID()}-${slug}`;
  const stored = await storagePut(key, req.body as Buffer, mimeType);
  const item = await prisma.documentRecord.create({ data: { employeeId, uploadedByUserId: req.emsUser!.id, fileName, mimeType, byteSize: req.body.length, objectKey: stored.key, category } });
  await recordActivity(req, "uploaded", category, item.id, fileName);
  res.status(201).json({ id: item.id, fileName: item.fileName, byteSize: item.byteSize, category: item.category, createdAt: item.createdAt });
}));
function expressRaw(req: Request, res: Response, next: NextFunction) {
  const contentType = String(req.headers["content-type"] || "").split(";")[0];
  if (contentType !== "application/octet-stream" && contentType !== "application/pdf" && !contentType.startsWith("image/") && contentType !== "text/csv" && contentType !== "text/plain" && contentType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && contentType !== "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    res.status(415).json({ error: "Upload files as a supported binary file." }); return;
  }
  express.raw({ type: () => true, limit: "10mb" })(req, res, next);
}
router.get("/documents/:id/download", asyncRoute(async (req, res) => {
  const id = parseId(req.params.id); if (!id) return res.status(400).json({ error: "Invalid document id." });
  const doc = await prisma.documentRecord.findFirst({ where: { id, deletedAt: null } });
  if (!doc) return res.status(404).json({ error: "Document not found." });
  if (!isManager(req)) { const profile = await linkedEmployee(req); if (!privateFileIsAccessible({ role: req.emsRole!, ownerEmployeeId: doc.employeeId, viewerEmployeeId: profile?.id ?? null, uploadedByUserId: doc.uploadedByUserId, viewerUserId: req.emsUser!.id })) return forbidden(res); }
  if (doc.category === "report" && !isManager(req)) return forbidden(res);
  const downloadUrl = await storageGetSignedUrl(doc.objectKey);
  res.json({ url: downloadUrl, fileName: doc.fileName });
}));
router.delete("/documents/:id", asyncRoute(async (req, res) => {
  const id = parseId(req.params.id); if (!id) return res.status(400).json({ error: "Invalid document id." });
  const doc = await prisma.documentRecord.findFirst({ where: { id, deletedAt: null } });
  if (!doc) return res.status(404).json({ error: "Document not found." });
  if (doc.category === "report" && !isManager(req)) return forbidden(res);
  if (!isManager(req)) { const profile = await linkedEmployee(req); if (!privateFileIsAccessible({ role: req.emsRole!, ownerEmployeeId: doc.employeeId, viewerEmployeeId: profile?.id ?? null, uploadedByUserId: doc.uploadedByUserId, viewerUserId: req.emsUser!.id })) return forbidden(res); }
  await prisma.documentRecord.update({ where: { id }, data: { deletedAt: new Date() } });
  await recordActivity(req, "archived", "document", id, doc.fileName); res.json({ success: true });
}));

router.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : "The request could not be completed.";
  const code = (err as { code?: string })?.code;
  if (code === "P2002") return res.status(409).json({ error: "A record with those details already exists." });
  if (code === "P2025") return res.status(404).json({ error: "The requested record was not found." });
  console.error("[EMS] Request failed:", message);
  return res.status(500).json({ error: "The request could not be completed. Please try again." });
});

export const emsRouter = router;
export async function disconnectEmsDatabase() { await prisma.$disconnect(); }

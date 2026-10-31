import "dotenv/config";
import { prisma } from "../server/ems/database";

const today = new Date();
const utcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const monthStart = (offset = 0) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset, 1));
const monthEnd = (offset = 0) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + offset + 1, 0));
const hired = (monthsAgo: number) => new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsAgo, 5));

const departments = [
  { name: "Engineering", code: "ENG", color: "#6759E8", manager: "Jordan Lee" },
  { name: "Product", code: "PRD", color: "#3D8CFF", manager: "Maya Chen" },
  { name: "Design", code: "DSN", color: "#E77EB8", manager: "Sofia Patel" },
  { name: "People & Culture", code: "PEO", color: "#37B79A", manager: "Taylor Brooks" },
  { name: "Revenue", code: "REV", color: "#E8A455", manager: "Alex Morgan" },
];
const people = [
  { employeeCode: "ORB-1042", firstName: "Jordan", lastName: "Lee", email: "jordan.lee@example.com", jobTitle: "Engineering Lead", department: "ENG", location: "New York", salary: 154000, monthsAgo: 28 },
  { employeeCode: "ORB-1043", firstName: "Maya", lastName: "Chen", email: "maya.chen@example.com", jobTitle: "Product Manager", department: "PRD", location: "San Francisco", salary: 139000, monthsAgo: 19 },
  { employeeCode: "ORB-1044", firstName: "Sofia", lastName: "Patel", email: "sofia.patel@example.com", jobTitle: "Senior Product Designer", department: "DSN", location: "Austin", salary: 127500, monthsAgo: 14 },
  { employeeCode: "ORB-1045", firstName: "Taylor", lastName: "Brooks", email: "taylor.brooks@example.com", jobTitle: "People Partner", department: "PEO", location: "New York", salary: 118000, monthsAgo: 23 },
  { employeeCode: "ORB-1046", firstName: "Alex", lastName: "Morgan", email: "alex.morgan@example.com", jobTitle: "Revenue Operations", department: "REV", location: "Chicago", salary: 121000, monthsAgo: 11 },
  { employeeCode: "ORB-1047", firstName: "Noah", lastName: "Williams", email: "noah.williams@example.com", jobTitle: "Frontend Engineer", department: "ENG", location: "Toronto", salary: 132000, monthsAgo: 7 },
  { employeeCode: "ORB-1048", firstName: "Amara", lastName: "Okafor", email: "amara.okafor@example.com", jobTitle: "Backend Engineer", department: "ENG", location: "London", salary: 142000, monthsAgo: 5 },
  { employeeCode: "ORB-1049", firstName: "Elena", lastName: "Rossi", email: "elena.rossi@example.com", jobTitle: "UX Researcher", department: "DSN", location: "Milan", salary: 106000, monthsAgo: 3 },
  { employeeCode: "ORB-1050", firstName: "Mateo", lastName: "Silva", email: "mateo.silva@example.com", jobTitle: "Product Analyst", department: "PRD", location: "Lisbon", salary: 98000, monthsAgo: 1 },
  { employeeCode: "ORB-1051", firstName: "Priya", lastName: "Nair", email: "priya.nair@example.com", jobTitle: "People Operations", department: "PEO", location: "Remote", salary: 93000, monthsAgo: 0 },
];

async function main() {
  const deptIds = new Map<string, number>();
  for (const department of departments) {
    const row = await prisma.department.upsert({ where: { code: department.code }, create: department, update: {} });
    deptIds.set(department.code, row.id);
  }
  const employees = [];
  for (const person of people) {
    const { department, monthsAgo, ...data } = person;
    const employee = await prisma.employee.upsert({
      where: { employeeCode: data.employeeCode },
      create: { ...data, departmentId: deptIds.get(department), hireDate: hired(monthsAgo), status: "Active", employmentType: "Full-time" },
      update: {},
    });
    employees.push(employee);
    await prisma.leaveBalance.upsert({
      where: { employeeId_year_type: { employeeId: employee.id, year: today.getUTCFullYear(), type: "Annual leave" } },
      create: { employeeId: employee.id, year: today.getUTCFullYear(), type: "Annual leave", entitled: 24, used: 6 }, update: {},
    });
    await prisma.leaveBalance.upsert({
      where: { employeeId_year_type: { employeeId: employee.id, year: today.getUTCFullYear(), type: "Sick leave" } },
      create: { employeeId: employee.id, year: today.getUTCFullYear(), type: "Sick leave", entitled: 10, used: 1 }, update: {},
    });
    const workDate = utcDay(today);
    await prisma.attendance.upsert({
      where: { employeeId_workDate: { employeeId: employee.id, workDate } },
      create: { employeeId: employee.id, workDate, checkIn: new Date(today.getTime() - (2 + (employee.id % 3)) * 3600000), status: employee.id % 8 === 0 ? "Late" : "Present" },
      update: {},
    });
    await prisma.payroll.upsert({
      where: { employeeId_periodEnd: { employeeId: employee.id, periodEnd: monthEnd(-1) } },
      create: { employeeId: employee.id, periodStart: monthStart(-1), periodEnd: monthEnd(-1), baseSalary: data.salary / 12, deductions: Math.round(data.salary / 12 * 0.16 * 100) / 100, netPay: Math.round(data.salary / 12 * 0.84 * 100) / 100, status: "Processed" },
      update: {},
    });
    const review = await prisma.performanceReview.findFirst({ where: { employeeId: employee.id, period: "Q3 2026" } });
    if (!review) await prisma.performanceReview.create({ data: { employeeId: employee.id, reviewer: departments.find((d) => d.code === department)!.manager, rating: 3.8 + (employee.id % 12) / 10, summary: "Strong ownership and thoughtful collaboration across the team.", period: "Q3 2026" } });
    const goal = await prisma.goal.findFirst({ where: { employeeId: employee.id, title: "Quarterly growth plan" } });
    if (!goal) await prisma.goal.create({ data: { employeeId: employee.id, title: "Quarterly growth plan", description: "Choose one skill to deepen and share learning with the team.", progress: (employee.id * 13) % 100, dueDate: monthEnd(1), status: "In progress" } });
  }
  const existingLeave = await prisma.leaveRequest.count();
  if (existingLeave === 0) {
    const leaveEmployee = employees[6];
    const startDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 18));
    await prisma.leaveRequest.create({ data: { employeeId: leaveEmployee.id, type: "Annual leave", startDate, endDate: new Date(startDate.getTime() + 2 * 86400000), days: 3, reason: "Family time planned in advance.", status: "Pending" } });
  }
  if (await prisma.activity.count() === 0) {
    await prisma.activity.createMany({ data: [
      { actorName: "Taylor Brooks", action: "approved leave", entity: "leave request", detail: "Leave request reviewed" },
      { actorName: "Maya Chen", action: "added a goal", entity: "performance goal", detail: "Quarterly growth plan" },
      { actorName: "Orbit system", action: "processed payroll", entity: "payroll", detail: "Monthly pay run completed" },
    ] });
  }
  console.log(`Seed complete: ${employees.length} employees, ${departments.length} departments. Existing rows were preserved.`);
}

main().catch((error) => { console.error("EMS seed failed:", error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); });

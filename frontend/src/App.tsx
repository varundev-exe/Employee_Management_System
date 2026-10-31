import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck2,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  FileDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import gsap from "gsap";
import {
  api,
  formatDate,
  formatTime,
  get,
  initials,
  isManager,
  post,
  put,
  readSession,
  remove,
  saveSession,
  type Attendance,
  type Department,
  type Employee,
  type Leave,
  type Page,
  type Role,
  type Session,
} from "./api";

const OrbitScene = lazy(() => import("./OrbitScene"));
type PageKey =
  | "overview"
  | "employees"
  | "departments"
  | "attendance"
  | "leave"
  | "reports"
  | "settings"
  | "payroll"
  | "performance"
  | "documents";
const pageTitle: Record<PageKey, string> = {
  overview: "Overview",
  employees: "Employees",
  departments: "Departments",
  attendance: "Attendance",
  leave: "Leave management",
  reports: "Reports",
  settings: "User access",
  payroll: "Payroll",
  performance: "Performance",
  documents: "Documents",
};
const today = () => new Date().toISOString().slice(0, 10);
const messageOf = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
const displayRole = (role: Role) =>
  role === "ADMIN"
    ? "Administrator"
    : role === "MANAGER"
      ? "Manager"
      : "Employee";

function StatusPill({ value }: { value: string }) {
  const v = value.toLowerCase();
  return (
    <span className={`status-pill ${v}`}>
      <i />
      {value.replaceAll("_", " ")}
    </span>
  );
}
function PageHeader({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: ReactNode;
  copy: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{copy}</p>
      </div>
      {action && <div className="heading-action">{action}</div>}
    </div>
  );
}
function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error";
}) {
  return (
    <div
      className={`notice ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header>
          <h2>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
function DeferredOrbit() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let timer = 0;
    const load = () => {
      timer = window.setTimeout(() => setReady(true), 320);
    };
    if (!("IntersectionObserver" in window)) {
      load();
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, []);
  return (
    <div ref={host} className="deferred-orbit" aria-hidden="true">
      {ready ? (
        <Suspense fallback={<div className="orb-fallback"><span /><i /></div>}>
          <OrbitScene />
        </Suspense>
      ) : (
        <div className="orb-fallback"><span /><i /></div>
      )}
    </div>
  );
}
function Loading() {
  return (
    <div className="loading-state">
      <i />
      Loading live data…
    </div>
  );
}
function ErrorState({ error, retry }: { error: string; retry: () => void }) {
  return (
    <div className="error-state">
      <p>{error}</p>
      <button className="button secondary" onClick={retry}>
        Try again
      </button>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await post<Session>("/api/auth/login", {
        email: String(form.get("email") || "").trim(),
        password: String(form.get("password") || ""),
      });
      saveSession(result);
      onLogin(result);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login-shell">
      <section className="login-card">
        <div className="brand-lockup">
          <span className="brand-mark">
            <i />
            <b />
          </span>
          <div>
            <strong>orbit</strong>
            <small>EMPLOYEE MANAGEMENT</small>
          </div>
        </div>
        <div className="login-copy">
          <span className="eyebrow">
            <i className="live-dot" /> EXISTING ORGANIZATION API
          </span>
          <h1>
            People, in
            <br />
            <em>clear perspective.</em>
          </h1>
          <p>
            Sign in with your employee account. Access is validated by the
            Spring Boot API.
          </p>
        </div>
        <form onSubmit={submit} className="login-form">
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              placeholder="you@company.com"
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Your password"
            />
          </label>
          {error && <Notice tone="error">{error}</Notice>}
          <button className="button primary wide" disabled={busy}>
            {busy ? "Signing in…" : "Sign in securely"}
            <ArrowRight size={16} />
          </button>
        </form>
        <div className="login-note">
          <ShieldCheck size={15} /> JWT authentication · Existing Spring
          Security
        </div>
        <footer>Only authorized organization accounts can sign in.</footer>
      </section>
      <aside className="login-art">
        <div className="art-kicker">
          <span>PEOPLE SYSTEMS</span>
          <span>01 / 04</span>
        </div>
        <div className="orb-fallback login-orb-fallback" aria-hidden="true">
          <span />
          <i />
        </div>
        <div className="art-caption">
          <b>01 — A CLEARER VIEW</b>
          <span>
            One considered space for the work that moves teams forward.
          </span>
        </div>
      </aside>
    </main>
  );
}

function Dashboard({
  session,
  profile,
  go,
}: {
  session: Session;
  profile: Employee | null;
  go: (page: PageKey) => void;
}) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Page<Employee> | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [myLeaves, setMyLeaves] = useState<Leave[]>([]);
  const [pending, setPending] = useState<Leave[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    let live = true;
    const from = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
    const work = async () => {
      setLoading(true);
      setError("");
      try {
        const results = await Promise.all([
          get<Department[]>("/api/departments"),
          profile
            ? get<Attendance[]>(
                `/api/attendance/me?from=${from}&to=${today()}`,
              ).catch(() => [])
            : Promise.resolve([]),
          profile
            ? get<Leave[]>("/api/leaves/me").catch(() => [])
            : Promise.resolve([]),
          isManager(session.role)
            ? get<Page<Employee>>(
                "/api/employees?page=0&size=100&sort=firstName,asc",
              ).catch(() => null)
            : Promise.resolve(null),
          isManager(session.role)
            ? get<Leave[]>("/api/leaves/pending").catch(() => [])
            : Promise.resolve([]),
        ]);
        if (!live) return;
        setDepartments(results[0]);
        setAttendance(results[1]);
        setMyLeaves(results[2]);
        setEmployees(results[3]);
        setPending(results[4]);
      } catch (e) {
        if (live) setError(messageOf(e));
      } finally {
        if (live) setLoading(false);
      }
    };
    void work();
    return () => {
      live = false;
    };
  }, [profile, session.role, reloadKey]);
  const attendanceToday = attendance.find((item) => item.workDate === today());
  const trend = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(Date.now() - (6 - index) * 86400000)
          .toISOString()
          .slice(0, 10);
        return {
          day: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(
            new Date(`${date}T12:00:00`),
          ),
          checkIns: attendance.filter((item) => item.workDate === date).length,
        };
      }),
    [attendance],
  );
  const pendingCount = isManager(session.role)
    ? pending.length
    : myLeaves.filter((item) => item.status === "PENDING").length;
  async function punch(action: "check-in" | "check-out") {
    setBusy(true);
    try {
      await post(`/api/attendance/${action}`);
      setReloadKey((v) => v + 1);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  if (error)
    return (
      <ErrorState error={error} retry={() => setReloadKey((v) => v + 1)} />
    );
  const kpis = [
    {
      title: isManager(session.role) ? "Team members" : "Your profile",
      value: isManager(session.role)
        ? (employees?.totalElements ?? 0)
        : profile
          ? 1
          : 0,
      sub: isManager(session.role)
        ? "Visible to your role"
        : profile?.designation || "Employee record",
      icon: UsersRound,
      tone: "violet",
    },
    {
      title: "Departments",
      value: departments.length,
      sub: "From the organization API",
      icon: Building2,
      tone: "blue",
    },
    {
      title: "Open leave requests",
      value: pendingCount,
      sub: isManager(session.role)
        ? "Awaiting your review"
        : "Your pending requests",
      icon: CalendarDays,
      tone: "amber",
    },
    {
      title: "Leave balance",
      value: profile ? profile.leaveBalance : "—",
      sub: "Available working days",
      icon: CalendarCheck2,
      tone: "mint",
    },
  ];
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow={`${new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date())} · ${displayRole(session.role)}`}
        title={
          <>
            Good day,{" "}
            <em>{profile?.firstName || session.email.split("@")[0]}.</em>
          </>
        }
        copy="A live view of the employee, department, attendance and leave data your account can access."
        action={
          <button
            className="button secondary"
            onClick={() => setReloadKey((v) => v + 1)}
          >
            <Activity size={15} /> Refresh
          </button>
        }
      />
      <section className="metric-grid">
        {kpis.map(({ title, value, sub, icon: Icon, tone }) => (
          <article className="metric-card" key={title}>
            <span className={`metric-icon ${tone}`}>
              <Icon size={18} />
            </span>
            <b>{value}</b>
            <strong>{title}</strong>
            <small>{sub}</small>
            <div className={`metric-spark ${tone}`}>
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </article>
        ))}
      </section>
      <section className="dashboard-grid">
        <article className="panel chart-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">PERSONAL ATTENDANCE</div>
              <h2>Last seven days</h2>
            </div>
            <button className="text-button" onClick={() => go("attendance")}>
              Open attendance <ArrowRight size={14} />
            </button>
          </div>
          <p className="panel-caption">
            Check-ins shown are from your own attendance history returned by the
            Java API.
          </p>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={trend}
                margin={{ left: -25, right: 6, top: 12, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="checkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6759e8" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6759e8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#eff0f5"
                  vertical={false}
                  strokeDasharray="3 5"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#999baa", fontSize: 11 }}
                  dy={9}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#999baa", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid #ececf2",
                    borderRadius: 9,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="checkIns"
                  name="Personal check-ins"
                  stroke="#6759e8"
                  strokeWidth={2.4}
                  fill="url(#checkFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel departments-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">ORGANIZATION</div>
              <h2>Departments</h2>
            </div>
            <button
              className="icon-button"
              aria-label="Open departments"
              onClick={() => go("departments")}
            >
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="department-list">
            {departments.slice(0, 6).map((dep) => (
              <div className="department-row" key={dep.id}>
                <span className="department-dot" />
                <b>{dep.name}</b>
                <span>{dep.employeeCount} people</span>
              </div>
            ))}
            {!departments.length && (
              <p className="empty-note">
                No departments are available to this account.
              </p>
            )}
          </div>
          <button className="text-button" onClick={() => go("departments")}>
            View departments <ArrowRight size={14} />
          </button>
        </article>
      </section>
      <section className="lower-grid">
        <article className="panel today-panel">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">YOUR WORKDAY</div>
              <h2>Attendance check-in</h2>
            </div>
            <Clock3 size={18} className="muted-icon" />
          </div>
          <p className="panel-caption">
            Check-in and check-out are recorded by the existing Java service.
          </p>
          {profile ? (
            <>
              <div className="today-status">
                {attendanceToday ? (
                  <>
                    <StatusPill value={attendanceToday.status} />
                    <span>
                      Started {formatTime(attendanceToday.checkIn)}
                      {attendanceToday.checkOut
                        ? ` · Finished ${formatTime(attendanceToday.checkOut)}`
                        : ""}
                    </span>
                  </>
                ) : (
                  <span>No check-in recorded for today.</span>
                )}
              </div>
              <div className="button-row">
                <button
                  className="button primary"
                  disabled={busy || Boolean(attendanceToday)}
                  onClick={() => void punch("check-in")}
                >
                  {busy ? "Updating…" : "Check in"}
                  <ArrowRight size={15} />
                </button>
                <button
                  className="button secondary"
                  disabled={
                    busy ||
                    !attendanceToday ||
                    Boolean(attendanceToday.checkOut)
                  }
                  onClick={() => void punch("check-out")}
                >
                  Check out
                </button>
              </div>
            </>
          ) : (
            <Notice>
              Your account has no employee profile, so personal attendance
              actions are unavailable.
            </Notice>
          )}
        </article>
        <article className="insight-card">
          <div className="eyebrow">LIVE SOURCE</div>
          <h2>
            One connected
            <br />
            people workspace.
          </h2>
          <p>
            Every number here is derived from endpoints already provided by this
            repository’s Spring Boot API.
          </p>
          <DeferredOrbit />
          <button className="insight-link" onClick={() => go("reports")}>
            Explore available reports <ArrowRight size={14} />
          </button>
        </article>
      </section>
    </div>
  );
}

function EmployeesView({
  session,
  profile,
  onProfile,
}: {
  session: Session;
  profile: Employee | null;
  onProfile: (value: Employee | null) => void;
}) {
  const [items, setItems] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pageInfo, setPageInfo] = useState<Page<Employee> | null>(null);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<
    "register" | "edit" | "assign" | "profile" | null
  >(null);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [busy, setBusy] = useState(false);
  const admin = session.role === "ADMIN";
  async function load() {
    setLoading(true);
    setError("");
    try {
      const depts = await get<Department[]>("/api/departments");
      setDepartments(depts);
      if (isManager(session.role)) {
        const q = new URLSearchParams({
          page: String(page),
          size: "10",
          sort: "firstName,asc",
        });
        if (search.trim()) q.set("search", search.trim());
        const result = await get<Page<Employee>>(`/api/employees?${q}`);
        setItems(result.content);
        setPageInfo(result);
      } else {
        setItems(profile ? [profile] : []);
        setPageInfo(null);
      }
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [page, search, session.role, profile?.id]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const v = Object.fromEntries(form.entries()) as Record<string, string>;
    try {
      if (modal === "register") {
        await post("/api/auth/register", {
          email: v.email.trim(),
          password: v.password,
          role: v.role,
          firstName: v.firstName.trim(),
          lastName: v.lastName.trim(),
        });
      } else if (modal === "profile" && selected) {
        const updated = await put<Employee>("/api/employees/me", {
          firstName: v.firstName.trim(),
          lastName: v.lastName.trim(),
          phone: v.phone || null,
        });
        onProfile(updated);
      } else if (modal === "edit" && selected) {
        await put(`/api/employees/${selected.id}`, {
          firstName: v.firstName.trim(),
          lastName: v.lastName.trim(),
          phone: v.phone || null,
          designation: v.designation || null,
          salary: v.salary ? Number(v.salary) : null,
          joiningDate: v.joiningDate || null,
        });
      } else if (modal === "assign" && selected) {
        await put(`/api/employees/${selected.id}/assignment`, {
          managerId: v.managerId ? Number(v.managerId) : null,
          departmentId: v.departmentId ? Number(v.departmentId) : null,
        });
      }
      setModal(null);
      await load();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function deleteEmployee(employee: Employee) {
    if (
      !window.confirm(
        `Delete ${employee.firstName} ${employee.lastName}? The existing API may reject deletion when related records exist.`,
      )
    )
      return;
    try {
      await remove(`/api/employees/${employee.id}`);
      await load();
    } catch (e) {
      setError(messageOf(e));
    }
  }
  const open = (kind: "edit" | "assign" | "profile", employee: Employee) => {
    setSelected(employee);
    setModal(kind);
  };
  if (loading) return <Loading />;
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="DIRECTORY · LIVE API"
        title="People directory"
        copy={
          isManager(session.role)
            ? "Search and review employees your account is permitted to see."
            : "Review and update your own employee profile."
        }
        action={
          admin ? (
            <button
              className="button primary"
              onClick={() => setModal("register")}
            >
              <Plus size={15} /> Add account
            </button>
          ) : !isManager(session.role) && profile ? (
            <button
              className="button secondary"
              onClick={() => open("profile", profile)}
            >
              <Pencil size={14} /> Update my profile
            </button>
          ) : null
        }
      />
      {error && <Notice tone="error">{error}</Notice>}
      {isManager(session.role) && (
        <div className="toolbar">
          <label className="search-field">
            <Search size={15} />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search name or email"
            />
          </label>
          <span className="toolbar-count">
            {pageInfo?.totalElements ?? 0} employees
          </span>
        </div>
      )}
      <div className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>EMPLOYEE</th>
                <th>ROLE / TITLE</th>
                <th>DEPARTMENT</th>
                <th>MANAGER</th>
                <th>JOINED</th>
                {isManager(session.role) && (
                  <th className="actions-cell">ACTIONS</th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((employee) => (
                <tr key={employee.id}>
                  <td>
                    <div className="person-cell">
                      <span className="avatar">
                        {initials(`${employee.firstName} ${employee.lastName}`)}
                      </span>
                      <span>
                        <b>
                          {employee.firstName} {employee.lastName}
                        </b>
                        <small>{employee.email}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    <b>{employee.role}</b>
                    <small className="subline">
                      {employee.designation || "—"}
                    </small>
                  </td>
                  <td>{employee.departmentName || "Unassigned"}</td>
                  <td>{employee.managerName || "—"}</td>
                  <td>{formatDate(employee.joiningDate)}</td>
                  {isManager(session.role) && (
                    <td className="actions-cell">
                      {admin ? (
                        <div className="row-actions">
                          <button
                            className="icon-button"
                            title="Edit employee"
                            onClick={() => open("edit", employee)}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="icon-button"
                            title="Assign manager or department"
                            onClick={() => open("assign", employee)}
                          >
                            <Building2 size={14} />
                          </button>
                          <button
                            className="icon-button danger"
                            title="Delete employee"
                            onClick={() => void deleteEmployee(employee)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && (
            <div className="empty-state">
              No employee profiles are visible for this account.
            </div>
          )}
        </div>
        {pageInfo && pageInfo.totalPages > 1 && (
          <div className="pagination">
            <span>
              Page {page + 1} of {pageInfo.totalPages}
            </span>
            <button
              className="button secondary"
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <button
              className="button secondary"
              disabled={pageInfo.last}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
      {modal && (
        <Modal
          title={
            modal === "register"
              ? "Create employee account"
              : modal === "assign"
                ? "Assign employee"
                : modal === "profile"
                  ? "Update your profile"
                  : "Edit employee"
          }
          onClose={() => setModal(null)}
        >
          <form className="modal-form" onSubmit={submit}>
            {modal === "register" ? (
              <>
                <div className="form-grid">
                  <label>
                    First name
                    <input name="firstName" required />
                  </label>
                  <label>
                    Last name
                    <input name="lastName" required />
                  </label>
                </div>
                <label>
                  Email
                  <input name="email" type="email" required />
                </label>
                <label>
                  Initial password
                  <input
                    name="password"
                    type="password"
                    minLength={8}
                    required
                    autoComplete="new-password"
                  />
                </label>
                <label>
                  Role
                  <select name="role" defaultValue="EMPLOYEE">
                    <option value="EMPLOYEE">Employee</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </label>
                <p className="field-note">
                  The existing backend restricts account creation to
                  administrators.
                </p>
              </>
            ) : modal === "assign" && selected ? (
              <>
                <label>
                  Department
                  <select
                    name="departmentId"
                    defaultValue={selected.departmentId ?? ""}
                  >
                    <option value="">No department</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Manager
                  <select
                    name="managerId"
                    defaultValue={selected.managerId ?? ""}
                  >
                    <option value="">No manager</option>
                    {items
                      .filter(
                        (e) => e.id !== selected.id && e.role === "MANAGER",
                      )
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.firstName} {e.lastName}
                        </option>
                      ))}
                  </select>
                </label>
              </>
            ) : selected ? (
              <>
                <div className="form-grid">
                  <label>
                    First name
                    <input
                      name="firstName"
                      defaultValue={selected.firstName}
                      required
                    />
                  </label>
                  <label>
                    Last name
                    <input
                      name="lastName"
                      defaultValue={selected.lastName}
                      required
                    />
                  </label>
                </div>
                <label>
                  Phone
                  <input
                    name="phone"
                    defaultValue={selected.phone || ""}
                    maxLength={20}
                  />
                </label>
                {modal === "edit" && (
                  <>
                    <label>
                      Designation
                      <input
                        name="designation"
                        defaultValue={selected.designation || ""}
                      />
                    </label>
                    <label>
                      Salary
                      <input
                        name="salary"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={selected.salary ?? ""}
                      />
                    </label>
                    <label>
                      Joining date
                      <input
                        name="joiningDate"
                        type="date"
                        defaultValue={selected.joiningDate || ""}
                      />
                    </label>
                  </>
                )}
              </>
            ) : null}
            <div className="modal-actions">
              <button
                className="button secondary"
                type="button"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy
                  ? "Saving…"
                  : modal === "register"
                    ? "Create account"
                    : modal === "assign"
                      ? "Save assignment"
                      : "Save changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function DepartmentsView({ session }: { session: Session }) {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<Department | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const admin = session.role === "ADMIN";
  async function load() {
    setLoading(true);
    setError("");
    try {
      setItems(await get<Department[]>("/api/departments"));
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!admin) return;
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const body = {
      name: String(form.get("name") || "").trim(),
      description: String(form.get("description") || "").trim() || null,
    };
    try {
      if (modal !== "new" && modal)
        await put(`/api/departments/${modal.id}`, body);
      else await post("/api/departments", body);
      setModal(null);
      await load();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function deleteDepartment(dep: Department) {
    if (!window.confirm(`Delete the ${dep.name} department?`)) return;
    try {
      await remove(`/api/departments/${dep.id}`);
      await load();
    } catch (e) {
      setError(messageOf(e));
    }
  }
  if (loading) return <Loading />;
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="ORGANIZATION · LIVE API"
        title="Departments"
        copy="Department names, descriptions and employee counts from the existing service."
        action={
          admin ? (
            <button className="button primary" onClick={() => setModal("new")}>
              <Plus size={15} /> Add department
            </button>
          ) : null
        }
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="department-cards">
        {items.map((dep, index) => (
          <article className="panel dept-card" key={dep.id}>
            <div className={`dept-symbol tone-${index % 4}`}>
              <Building2 size={19} />
            </div>
            <div className="dept-count">
              <b>{dep.employeeCount}</b>
              <span>people</span>
            </div>
            <h3>{dep.name}</h3>
            <p>{dep.description || "No description added."}</p>
            {admin && (
              <div className="card-actions">
                <button
                  className="button secondary"
                  onClick={() => setModal(dep)}
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  className="icon-button danger"
                  aria-label={`Delete ${dep.name}`}
                  onClick={() => void deleteDepartment(dep)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </article>
        ))}
        {!items.length && (
          <div className="empty-state panel">No departments found.</div>
        )}
      </div>
      {modal && (
        <Modal
          title={modal === "new" ? "Create department" : "Edit department"}
          onClose={() => setModal(null)}
        >
          <form className="modal-form" onSubmit={save}>
            <label>
              Name
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={modal === "new" ? "" : modal.name}
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                rows={3}
                maxLength={255}
                defaultValue={modal === "new" ? "" : modal.description || ""}
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Save department"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function AttendanceView({
  session,
  profile,
}: {
  session: Session;
  profile: Employee | null;
}) {
  const [items, setItems] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [from, setFrom] = useState(() =>
    new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(today());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      let target = selectedId;
      if (isManager(session.role)) {
        const page = await get<Page<Employee>>(
          "/api/employees?page=0&size=100&sort=firstName,asc",
        );
        setEmployees(page.content);
        if (!target)
          target = profile
            ? String(profile.id)
            : page.content[0]
              ? String(page.content[0].id)
              : "";
        if (target && target !== selectedId) setSelectedId(target);
      }
      const path =
        isManager(session.role) && target
          ? `/api/attendance/employee/${target}`
          : "/api/attendance/me";
      setItems(
        profile || isManager(session.role)
          ? await get<Attendance[]>(`${path}?from=${from}&to=${to}`)
          : [],
      );
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [session.role, selectedId, from, to, profile?.id]);
  async function punch(action: "check-in" | "check-out") {
    setBusy(true);
    setError("");
    try {
      await post(`/api/attendance/${action}`);
      await load();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  function exportCsv() {
    const rows = [
      ["Date", "Employee", "Status", "Check in", "Check out", "Worked minutes"],
      ...items.map((i) => [
        i.workDate,
        i.employeeName,
        i.status,
        i.checkIn || "",
        i.checkOut || "",
        i.workedMinutes ?? "",
      ]),
    ];
    downloadCsv("attendance.csv", rows);
  }
  if (loading) return <Loading />;
  const ownToday = items.find(
    (i) => i.employeeId === profile?.id && i.workDate === today(),
  );
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="TIME & PRESENCE · LIVE API"
        title="Attendance"
        copy="Check-in, check-out and history from the existing attendance service."
        action={
          <button className="button secondary" onClick={exportCsv}>
            <FileDown size={15} /> Export CSV
          </button>
        }
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="filter-bar">
        <label>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        {isManager(session.role) && (
          <label>
            Employee
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Choose employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      {profile && (
        <section className="panel attendance-action">
          <div>
            <div className="eyebrow">TODAY</div>
            <h2>
              {ownToday
                ? `${ownToday.status} · ${formatTime(ownToday.checkIn)}`
                : "No check-in recorded"}
            </h2>
            <p>
              Check-in times and late status are determined by the Java service.
            </p>
          </div>
          <div className="button-row">
            <button
              className="button primary"
              disabled={busy || Boolean(ownToday)}
              onClick={() => void punch("check-in")}
            >
              {busy ? "Updating…" : "Check in"}
            </button>
            <button
              className="button secondary"
              disabled={busy || !ownToday || Boolean(ownToday.checkOut)}
              onClick={() => void punch("check-out")}
            >
              Check out
            </button>
          </div>
        </section>
      )}
      <div className="panel table-panel">
        <div className="panel-heading table-title">
          <div>
            <div className="eyebrow">RECENT RECORDS</div>
            <h2>{items.length} entries</h2>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>DATE</th>
                {isManager(session.role) && <th>EMPLOYEE</th>}
                <th>STATUS</th>
                <th>CHECK IN</th>
                <th>CHECK OUT</th>
                <th>WORKED</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{formatDate(item.workDate)}</td>
                  {isManager(session.role) && <td>{item.employeeName}</td>}
                  <td>
                    <StatusPill value={item.status} />
                  </td>
                  <td>{formatTime(item.checkIn)}</td>
                  <td>{formatTime(item.checkOut)}</td>
                  <td>
                    {item.workedMinutes == null
                      ? "—"
                      : `${Math.floor(item.workedMinutes / 60)}h ${item.workedMinutes % 60}m`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && (
            <div className="empty-state">
              No attendance records in this range.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeaveView({
  session,
  profile,
}: {
  session: Session;
  profile: Employee | null;
}) {
  const [mine, setMine] = useState<Leave[]>([]);
  const [pending, setPending] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const own = profile
        ? await get<Leave[]>("/api/leaves/me").catch(() => [])
        : [];
      const team = isManager(session.role)
        ? await get<Leave[]>("/api/leaves/pending").catch(() => [])
        : [];
      setMine(own);
      setPending(team);
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [session.role, profile?.id]);
  async function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const f = new FormData(event.currentTarget);
    try {
      await post("/api/leaves", {
        leaveType: f.get("leaveType"),
        startDate: f.get("startDate"),
        endDate: f.get("endDate"),
        reason: f.get("reason"),
      });
      setShowForm(false);
      await load();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function review(leave: Leave, action: "approve" | "reject") {
    const comment =
      window.prompt(
        `${action === "approve" ? "Approval" : "Rejection"} comment (optional):`,
      ) || "";
    setBusy(true);
    try {
      await put(`/api/leaves/${leave.id}/${action}`, { comment });
      await load();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  async function cancel(leave: Leave) {
    if (!window.confirm("Cancel this pending leave request?")) return;
    setBusy(true);
    try {
      await api(`/api/leaves/${leave.id}/cancel`, { method: "PUT" });
      await load();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <Loading />;
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="TIME AWAY · LIVE API"
        title="Leave management"
        copy="Applications, balances and reviews backed by the existing leave service."
        action={
          <button className="button primary" onClick={() => setShowForm(true)}>
            <Plus size={15} /> Request leave
          </button>
        }
      />
      {error && <Notice tone="error">{error}</Notice>}
      {profile && (
        <div className="leave-balance">
          <span className="balance-icon">
            <CalendarDays size={18} />
          </span>
          <div>
            <b>{profile.leaveBalance}</b>
            <span>working days available</span>
          </div>
          <small>
            The server validates working days, balance and date overlap.
          </small>
        </div>
      )}
      {isManager(session.role) && (
        <section className="panel table-panel">
          <div className="panel-heading table-title">
            <div>
              <div className="eyebrow">TEAM QUEUE</div>
              <h2>
                Requests awaiting review{" "}
                <span className="count-badge">{pending.length}</span>
              </h2>
            </div>
          </div>
          <LeaveTable items={pending} manager onReview={review} busy={busy} />
        </section>
      )}
      <section className="panel table-panel leave-history">
        <div className="panel-heading table-title">
          <div>
            <div className="eyebrow">YOUR REQUESTS</div>
            <h2>Leave history</h2>
          </div>
        </div>
        <LeaveTable items={mine} onCancel={cancel} busy={busy} />
      </section>
      {showForm && (
        <Modal title="Request time off" onClose={() => setShowForm(false)}>
          <form className="modal-form" onSubmit={apply}>
            <label>
              Leave type
              <select name="leaveType" defaultValue="ANNUAL">
                <option value="ANNUAL">Annual</option>
                <option value="CASUAL">Casual</option>
                <option value="SICK">Sick</option>
              </select>
            </label>
            <div className="form-grid">
              <label>
                Start date
                <input name="startDate" type="date" min={today()} required />
              </label>
              <label>
                End date
                <input name="endDate" type="date" min={today()} required />
              </label>
            </div>
            <label>
              Reason
              <textarea name="reason" rows={3} maxLength={500} />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
function LeaveTable({
  items,
  manager = false,
  onReview,
  onCancel,
  busy,
}: {
  items: Leave[];
  manager?: boolean;
  onReview?: (leave: Leave, action: "approve" | "reject") => void;
  onCancel?: (leave: Leave) => void;
  busy: boolean;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {manager && <th>EMPLOYEE</th>}
            <th>TYPE</th>
            <th>DATES</th>
            <th>DAYS</th>
            <th>REASON</th>
            <th>STATUS</th>
            <th className="actions-cell">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {items.map((leave) => (
            <tr key={leave.id}>
              {manager && <td>{leave.employeeName}</td>}
              <td>{leave.leaveType}</td>
              <td>
                {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
              </td>
              <td>{leave.days}</td>
              <td>{leave.reason || "—"}</td>
              <td>
                <StatusPill value={leave.status} />
              </td>
              <td className="actions-cell">
                {manager && leave.status === "PENDING" && onReview ? (
                  <div className="row-actions">
                    <button
                      className="icon-button good"
                      title="Approve"
                      disabled={busy || leave.employeeId === undefined}
                      onClick={() => onReview(leave, "approve")}
                    >
                      <Check size={15} />
                    </button>
                    <button
                      className="icon-button danger"
                      title="Reject"
                      disabled={busy}
                      onClick={() => onReview(leave, "reject")}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : !manager && onCancel && leave.status === "PENDING" ? (
                  <button
                    className="button secondary small"
                    disabled={busy}
                    onClick={() => onCancel(leave)}
                  >
                    Cancel
                  </button>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && (
        <div className="empty-state">No leave requests to show.</div>
      )}
    </div>
  );
}

function ReportsView({
  session,
  profile,
}: {
  session: Session;
  profile: Employee | null;
}) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [d, e, a] = await Promise.all([
          get<Department[]>("/api/departments"),
          isManager(session.role)
            ? get<Page<Employee>>(
                "/api/employees?page=0&size=100&sort=firstName,asc",
              ).then((p) => p.content)
            : Promise.resolve(profile ? [profile] : []),
          profile
            ? get<Attendance[]>(
                `/api/attendance/me?from=${new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)}&to=${today()}`,
              ).catch(() => [])
            : Promise.resolve([]),
        ]);
        if (live) {
          setDepartments(d);
          setEmployees(e);
          setAttendance(a);
        }
      } catch (e) {
        if (live) setError(messageOf(e));
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
  }, [session.role, profile?.id]);
  function exportCsv() {
    const rows: Array<Array<string | number>> = [
      ["Department", "Employee count"],
      ...departments.map((d) => [d.name, d.employeeCount]),
      [],
      ["Employee", "Email", "Role", "Department", "Designation"],
      ...employees.map((e) => [
        `${e.firstName} ${e.lastName}`,
        e.email,
        e.role,
        e.departmentName || "",
        e.designation || "",
      ]),
      [],
      ["Attendance date", "Employee", "Status", "Check in", "Check out"],
      ...attendance.map((a) => [
        a.workDate,
        a.employeeName,
        a.status,
        a.checkIn || "",
        a.checkOut || "",
      ]),
    ];
    downloadCsv("employee-report.csv", rows);
  }
  if (loading) return <Loading />;
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="REPORTS · LIVE API DATA"
        title="Reports"
        copy="Export a CSV assembled only from records the existing backend returns to your account."
        action={
          <button className="button primary" onClick={exportCsv}>
            <ArrowDownToLine size={15} /> Download CSV
          </button>
        }
      />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="metric-grid report-metrics">
        <div className="metric-card">
          <span className="metric-icon violet">
            <UsersRound size={18} />
          </span>
          <b>{employees.length}</b>
          <strong>Visible employees</strong>
          <small>
            {isManager(session.role)
              ? "Current accessible page"
              : "Your own profile"}
          </small>
        </div>
        <div className="metric-card">
          <span className="metric-icon blue">
            <Building2 size={18} />
          </span>
          <b>{departments.length}</b>
          <strong>Departments</strong>
          <small>Live API response</small>
        </div>
        <div className="metric-card">
          <span className="metric-icon mint">
            <CalendarCheck2 size={18} />
          </span>
          <b>{attendance.length}</b>
          <strong>Your attendance entries</strong>
          <small>Last 30 days only</small>
        </div>
      </div>
      <Notice>
        Payroll, performance reviews and document records are not included
        because the current Java API does not expose those endpoints. This
        export does not invent values.
      </Notice>
    </div>
  );
}

function SettingsView({ session }: { session: Session }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setMessage("");
    const f = new FormData(form);
    try {
      const response = await post<{ message: string }>("/api/auth/register", {
        firstName: String(f.get("firstName") || "").trim(),
        lastName: String(f.get("lastName") || "").trim(),
        email: String(f.get("email") || "").trim(),
        password: String(f.get("password") || ""),
        role: f.get("role"),
      });
      setMessage(response?.message || "Account created.");
      form.reset();
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  }
  if (session.role !== "ADMIN")
    return (
      <div className="page-enter">
        <PageHeader
          eyebrow="ACCESS CONTROL"
          title="User access"
          copy="User creation is restricted by the existing backend."
        />
        <Notice>Your role does not have access to account registration.</Notice>
      </div>
    );
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="ADMINISTRATION · LIVE API"
        title="Create user account"
        copy="This frontend uses the existing admin-only registration endpoint; it does not add user-management APIs."
      />
      <div className="settings-layout">
        <section className="panel settings-card">
          <div className="panel-heading">
            <div>
              <div className="eyebrow">NEW ORGANIZATION ACCOUNT</div>
              <h2>Register employee</h2>
            </div>
            <ShieldCheck size={18} className="muted-icon" />
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          {message && <Notice>{message}</Notice>}
          <form className="modal-form" onSubmit={createAccount}>
            <div className="form-grid">
              <label>
                First name
                <input name="firstName" required />
              </label>
              <label>
                Last name
                <input name="lastName" required />
              </label>
            </div>
            <label>
              Email
              <input name="email" type="email" required />
            </label>
            <label>
              Initial password
              <input
                name="password"
                type="password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </label>
            <label>
              Role
              <select name="role" defaultValue="EMPLOYEE">
                <option value="EMPLOYEE">Employee</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <button className="button primary" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        </section>
        <aside className="panel settings-info">
          <div className="eyebrow">SECURITY BOUNDARY</div>
          <h3>Permissions stay server-side.</h3>
          <p>
            The React app shows or hides actions for convenience, but Spring
            Security remains the authority for every request.
          </p>
          <div className="access-row">
            <span>ADMIN</span>
            <span>Account registration, employee & department management</span>
          </div>
          <div className="access-row">
            <span>MANAGER</span>
            <span>Assigned team, attendance and leave reviews</span>
          </div>
          <div className="access-row">
            <span>EMPLOYEE</span>
            <span>Own profile, attendance and leave requests</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Unavailable({ page }: { page: PageKey }) {
  return (
    <div className="page-enter">
      <PageHeader
        eyebrow="BACKEND ENDPOINT REQUIRED"
        title={pageTitle[page]}
        copy="This screen is intentionally disabled until the existing Java backend exposes the required endpoints."
      />
      <div className="panel unavailable-panel">
        <span className="unavailable-icon">
          <Settings2 size={20} />
        </span>
        <h2>No API contract found</h2>
        <p>
          The repository currently provides APIs for login, employees,
          departments, attendance and leave. This frontend does not create fake
          payroll, performance or document records.
        </p>
        <span className="status-pill unavailable">
          <i />
          Not connected
        </span>
      </div>
    </div>
  );
}

function downloadCsv(name: string, rows: Array<Array<string | number>>) {
  const csv = rows
    .map((row) =>
      row
        .map((value) => {
          let text = String(value ?? "");
          if (/^[=+@\-\t\r]/.test(text)) text = `'${text}`;
          return `"${text.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export default function App() {
  const [session, setSession] = useState<Session | null>(() => readSession());
  const [profile, setProfile] = useState<Employee | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [page, setPage] = useState<PageKey>("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const node = document.querySelector(".content-area .page-enter");
    if (node)
      gsap.fromTo(
        node,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.28, ease: "power2.out" },
      );
  }, [page]);
  useEffect(() => {
    const handler = () => {
      saveSession(null);
      setSession(null);
      setProfile(null);
    };
    window.addEventListener("ems:unauthorized", handler);
    return () => window.removeEventListener("ems:unauthorized", handler);
  }, []);
  useEffect(() => {
    let live = true;
    if (!session) {
      setProfile(null);
      setProfileLoaded(true);
      return;
    }
    setProfileLoaded(false);
    get<Employee>("/api/employees/me")
      .then((value) => {
        if (live) setProfile(value);
      })
      .catch(() => {
        if (live) setProfile(null);
      })
      .finally(() => {
        if (live) setProfileLoaded(true);
      });
    return () => {
      live = false;
    };
  }, [session]);
  function signOut() {
    saveSession(null);
    setSession(null);
    setProfile(null);
    setPage("overview");
  }
  if (!session)
    return (
      <Login
        onLogin={(value) => {
          setSession(value);
          setProfileLoaded(false);
        }}
      />
    );
  if (!profileLoaded)
    return (
      <div className="boot-screen">
        <span className="brand-mark">
          <i />
          <b />
        </span>
        <p>Connecting to your organization…</p>
      </div>
    );
  const nav = [
    { key: "overview" as const, title: "Overview", icon: LayoutDashboard },
    { key: "employees" as const, title: "Employees", icon: UsersRound },
    { key: "departments" as const, title: "Departments", icon: Building2 },
    { key: "attendance" as const, title: "Attendance", icon: CalendarCheck2 },
    { key: "leave" as const, title: "Leave management", icon: CalendarDays },
    { key: "reports" as const, title: "Reports", icon: Activity },
  ];
  const unavailable: Array<{
    key: PageKey;
    title: string;
    icon: typeof WalletCards;
  }> = [
    { key: "payroll", title: "Payroll", icon: WalletCards },
    { key: "performance", title: "Performance", icon: BadgeCheck },
    { key: "documents", title: "Documents", icon: FileDown },
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">
            <i />
            <b />
          </span>
          <div>
            <strong>orbit</strong>
            <small>PEOPLE SYSTEMS</small>
          </div>
          <button
            className="icon-button close-nav"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X size={17} />
          </button>
        </div>
        <div className="workspace-chip">
          <span className="workspace-avatar">
            {initials(
              profile
                ? `${profile.firstName} ${profile.lastName}`
                : session.email,
            )}
          </span>
          <div>
            <b>
              {profile
                ? `${profile.firstName} ${profile.lastName}`
                : session.email}
            </b>
            <small>{displayRole(session.role)}</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {nav.map(({ key, title, icon: Icon }) => (
            <button
              key={key}
              className={`nav-item ${page === key ? "active" : ""}`}
              onClick={() => {
                setPage(key);
                setMobileOpen(false);
              }}
            >
              <Icon size={17} />
              <span>{title}</span>
              {key === "leave" && isManager(session.role) ? (
                <span className="nav-badge">API</span>
              ) : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="nav-label">NOT IN CURRENT API</div>
        <nav>
          {unavailable.map(({ key, title, icon: Icon }) => (
            <button
              key={key}
              className={`nav-item disabled-nav ${page === key ? "active" : ""}`}
              onClick={() => {
                setPage(key);
                setMobileOpen(false);
              }}
            >
              <Icon size={17} />
              <span>{title}</span>
            </button>
          ))}
        </nav>
        {session.role === "ADMIN" && (
          <>
            <div className="sidebar-divider" />
            <div className="nav-label">ADMINISTRATION</div>
            <button
              className={`nav-item ${page === "settings" ? "active" : ""}`}
              onClick={() => setPage("settings")}
            >
              <Settings2 size={17} />
              <span>User access</span>
            </button>
          </>
        )}
        <div className="sidebar-bottom">
          <div className="sidebar-callout">
            <span className="callout-orbit">
              <i />
            </span>
            <b>Connected to Java</b>
            <small>Spring Boot · JWT · REST API</small>
          </div>
          <button
            className="nav-item help-nav"
            onClick={() => setPage("reports")}
          >
            <CircleHelp size={16} />
            <span>About data access</span>
          </button>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button menu-toggle"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={19} />
            </button>
            <span>Workspace</span>
            <i>/</i>
            <b>{pageTitle[page]}</b>
          </div>
          <div className="topbar-right">
            <span className="api-indicator">
              <i /> API connected
            </span>
            <span className="user-pill">
              <span className="avatar small-avatar">
                {initials(
                  profile
                    ? `${profile.firstName} ${profile.lastName}`
                    : session.email,
                )}
              </span>
              <span>{displayRole(session.role)}</span>
            </span>
            <button
              className="icon-button signout"
              onClick={signOut}
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <main className="content-area" key={page}>
          {page === "overview" ? (
            <Dashboard session={session} profile={profile} go={setPage} />
          ) : page === "employees" ? (
            <EmployeesView
              session={session}
              profile={profile}
              onProfile={setProfile}
            />
          ) : page === "departments" ? (
            <DepartmentsView session={session} />
          ) : page === "attendance" ? (
            <AttendanceView session={session} profile={profile} />
          ) : page === "leave" ? (
            <LeaveView session={session} profile={profile} />
          ) : page === "reports" ? (
            <ReportsView session={session} profile={profile} />
          ) : page === "settings" ? (
            <SettingsView session={session} />
          ) : (
            <Unavailable page={page} />
          )}
        </main>
        <footer className="app-footer">
          <span>
            <i /> Live data comes from the repository’s existing Spring Boot API
          </span>
          <span>Orbit · Frontend only</span>
        </footer>
      </div>
    </div>
  );
}

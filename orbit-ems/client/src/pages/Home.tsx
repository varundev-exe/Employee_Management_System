import { api, money, shortDate, type EmsBootstrap } from "@/lib/api";
import { useAuth } from "@/_core/hooks/useAuth";
import OrbitScene from "@/components/OrbitSceneSlot";
import { ArrowDownRight, ArrowRight, ArrowUpRight, CalendarDays, Clock3, UsersRound, WalletCards } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { toast } from "sonner";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useLocation } from "wouter";

const labelDate = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
type AttendanceSummary = { attendanceTrend: Array<{ date: string; day: string; attendance: number }> };

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { node.textContent = `${value.toLocaleString()}${suffix}`; return; }
    const counter = { current: 0 };
    const tween = gsap.to(counter, { current: value, duration: 0.72, ease: "power2.out", onUpdate: () => { node.textContent = `${Math.round(counter.current).toLocaleString()}${suffix}`; } });
    return () => { tween.kill(); };
  }, [value, suffix]);
  return <span ref={ref}>0{suffix}</span>;
}

export default function Home() {
  const [location, setLocation] = useLocation(); const { user } = useAuth();
  const [data, setData] = useState<EmsBootstrap | null>(null); const [trend, setTrend] = useState<Array<{ day: string; attendance: number }>>([]); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const refresh = () => { setLoading(true); Promise.all([api.get<EmsBootstrap>("/bootstrap"), api.get<AttendanceSummary>("/reports/summary")]).then(([bootstrap, report]) => {
    setData(bootstrap); setTrend(report.attendanceTrend);
  }).catch((error) => toast.error(error.message)).finally(() => setLoading(false)); };
  useEffect(refresh, []);
  const activeCount = data?.stats.activeEmployees ?? 0;
  const attendanceCount = data?.stats.attendanceRate ?? 0;
  const kpis = useMemo(() => [
    { label: "Active people", value: activeCount, suffix: "", delta: "In your workspace", icon: UsersRound, tone: "violet", note: `${data?.stats.newThisMonth ?? 0} start dates this month` },
    { label: "Today’s attendance", value: attendanceCount, suffix: "%", delta: "Today", icon: Clock3, tone: "mint", note: "of active people checked in" },
    { label: "Open leave requests", value: data?.stats.pendingLeaves ?? 0, suffix: "", delta: (data?.stats.pendingLeaves ?? 0) ? "Needs review" : "No requests", icon: CalendarDays, tone: "amber", note: "across the team" },
    { label: "New this month", value: data?.stats.newThisMonth ?? 0, suffix: "", delta: "Month to date", icon: WalletCards, tone: "blue", note: "employee start dates" },
  ], [activeCount, attendanceCount, data]);
  const role = data?.user.role || user?.role || "employee";
  async function attendanceAction(action: "check-in" | "check-out") {
    setBusy(true); try { await api.post(`/attendance/${action}`); toast.success(action === "check-in" ? "You’re checked in." : "You’re checked out."); refresh(); } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  }

  return <div className="dashboard-page">
    <section className="welcome-row"><div><div className="eyebrow muted">{labelDate.toUpperCase()} <span className="welcome-sep">/</span> ORBIT WORKSPACE</div><h1>Good morning, <em>{(data?.user.name || user?.name || "there").split(" ")[0]}.</em></h1><p>Here’s what’s happening across your team today.</p></div><button className="secondary-button date-button" onClick={() => setLocation("/attendance")}><CalendarDays size={15} /> Today <span className="date-caret">⌄</span></button></section>
    <section className="metric-grid" aria-label="Team summary">{kpis.map(({ label, value, suffix, delta, icon: Icon, tone, note }) => <article className="metric-card" key={label}><div className="metric-card-top"><span className={`metric-icon ${tone}`}><Icon size={17} strokeWidth={1.8} /></span><span className={tone === "amber" ? "metric-small amber-text" : "metric-small"}>{delta}</span></div><span className="metric-value">{loading ? "—" : <AnimatedNumber value={value} suffix={suffix} />}</span><span className="metric-label">{label}</span><span className="metric-note">{note}</span><div className={`metric-sparkline ${tone}`} aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /><i /></div></article>)}</section>
    <section className="feature-row"><article className="panel attendance-panel"><div className="panel-heading"><div><div className="eyebrow muted">TEAM RHYTHM</div><h2>Attendance overview</h2></div><button className="text-link" onClick={() => setLocation("/attendance")}>View reports <ArrowRight size={14} /></button></div><div className="chart-legend"><span><i /> Daily check-ins</span><span className="chart-date">Past 7 days <span>⌄</span></span></div><div className="attendance-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={trend} margin={{ left: -25, right: 3, top: 12, bottom: 0 }}><defs><linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6759E8" stopOpacity={0.16} /><stop offset="95%" stopColor="#6759E8" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#eff0f5" vertical={false} strokeDasharray="3 5" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "#a1a4b0", fontSize: 11 }} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#a1a4b0", fontSize: 10 }} allowDecimals={false} domain={[0, "auto"]} /><Tooltip contentStyle={{ border: "1px solid #ececf2", borderRadius: 10, fontSize: 12, boxShadow: "0 8px 26px #18204c12" }} formatter={(v) => [`${v} check-ins`, "Attendance"]} /><Area type="monotone" dataKey="attendance" stroke="#6759E8" strokeWidth={2.4} fill="url(#attendanceFill)" dot={{ r: 3, fill: "#6759E8", stroke: "white", strokeWidth: 2 }} activeDot={{ r: 5 }} /></AreaChart></ResponsiveContainer></div></article>
    <article className="panel team-panel"><div className="panel-heading"><div><div className="eyebrow muted">YOUR ORBIT</div><h2>People by team</h2></div><button className="more-button" aria-label="Open departments" onClick={() => setLocation("/departments")}>•••</button></div><div className="team-bars">{(data?.departments || []).slice(0, 5).map((department) => <div className="team-row" key={department.name}><div className="team-label"><span><i style={{ background: department.color }} />{department.name}</span><b>{department.employees}</b></div><div className="team-track"><span style={{ width: `${Math.max(8, Math.round(department.employees / Math.max(activeCount, 1) * 100))}%`, background: department.color }} /></div></div>)}</div><button className="subtle-link team-link" onClick={() => setLocation("/employees")}>Explore the directory <ArrowRight size={14} /></button></article></section>
    <section className="lower-grid"><article className="panel activity-panel"><div className="panel-heading"><div><div className="eyebrow muted">AROUND THE TEAM</div><h2>Recent activity</h2></div><button className="text-link" onClick={() => setLocation("/reports")}>See all <ArrowRight size={14} /></button></div><div className="activity-list">{(data?.activities || []).slice(0, 4).map((activity, index) => <div className="activity-item" key={activity.id}><span className={`activity-avatar avatar-tone-${index % 4}`}>{activity.actorName.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span><div className="activity-copy"><b>{activity.actorName}</b><span>{activity.action} {activity.entity}{activity.detail ? ` · ${activity.detail}` : ""}</span></div><time>{shortDate(activity.createdAt)}</time></div>)}{!loading && !data?.activities.length && <p className="empty-note">Your team’s activity will appear here.</p>}</div></article>
    <article className="checkin-card"><div className="checkin-orbit"><OrbitScene className="checkin-scene" /></div><div className="eyebrow checkin-eyebrow">YOUR DAY, IN MOTION</div><h2>Find your<br />daily rhythm.</h2><p>Keep attendance in sync and let the team know you’re here.</p>{data?.employeeProfile ? <button className="checkin-button" disabled={busy || Boolean(data.attendanceToday?.checkOut)} onClick={() => attendanceAction(data.attendanceToday?.checkIn ? "check-out" : "check-in")}>{busy ? "Updating…" : data.attendanceToday?.checkOut ? "Day complete · Checked out" : data.attendanceToday?.checkIn ? "Check out · Started" : "Check in for today"}<span>→</span></button> : <button className="checkin-button" onClick={() => setLocation("/attendance")}>Explore attendance <span>→</span></button>}<span className="checkin-foot">{role === "employee" ? "Your attendance is visible to your HR team" : "Attendance records are securely stored"}</span></article></section>
    <div className="dashboard-endnote"><span><i className="small-ring" /> The little things make a great team.</span><button onClick={() => setLocation("/employees")}>Meet your people <ArrowUpRight size={13} /></button></div>
  </div>;
}

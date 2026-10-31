import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { api, type EmsBootstrap, type EmsRole } from "@/lib/api";
import { Activity, BarChart3, Building2, CalendarCheck2, CalendarDays, ChevronDown, CircleHelp, FileLock2, LayoutDashboard, LogOut, Menu, Search, Settings2, UsersRound, WalletCards, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { gsap } from "gsap";
import OrbitScene from "./OrbitSceneSlot";

const navItems = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Employees", path: "/employees", icon: UsersRound },
  { label: "Departments", path: "/departments", icon: Building2 },
  { label: "Attendance", path: "/attendance", icon: CalendarCheck2 },
  { label: "Leave", path: "/leave", icon: CalendarDays },
  { label: "Payroll", path: "/payroll", icon: WalletCards },
  { label: "Performance", path: "/performance", icon: BarChart3 },
  { label: "Reports", path: "/reports", icon: Activity },
];
const titles: Record<string, string> = { "/": "Overview", "/employees": "Employees", "/departments": "Departments", "/attendance": "Attendance", "/leave": "Leave management", "/payroll": "Payroll", "/performance": "Performance", "/reports": "Reports & analytics", "/documents": "Documents", "/settings": "Settings" };

export function LoginScreen() {
  const { loading, user } = useAuth();
  if (loading || user) return <div className="login-loading"><img src="/orbit-mark.svg" /><span>Preparing your workspace…</span></div>;
  return <main className="login-shell">
    <div className="login-panel">
      <div className="brand-lockup"><img src="/orbit-mark.svg" alt="" /><span>orbit</span></div>
      <div className="login-copy"><span className="eyebrow"><i className="live-dot" /> PEOPLE, IN PERSPECTIVE</span><h1>Your team,<br /><em>in good orbit.</em></h1><p>One clear view of the people who make things happen. Securely connected to your organization.</p></div>
      <button className="primary-button login-button" onClick={() => startLogin()}><span>Continue securely</span><span aria-hidden="true">→</span></button>
      <div className="login-security"><FileLock2 size={15} /> Protected with secure organization sign-in</div>
      <div className="login-footer"><span>© {new Date().getFullYear()} Orbit People Systems</span><span>Privacy-first by design</span></div>
    </div>
    <div className="login-art"><div className="art-kicker"><span>PEOPLE SYSTEMS</span><span>01 / 04</span></div><OrbitScene className="login-orbit" /><div className="art-caption"><b>01 — A CLEARER VIEW</b><span>Work, people and progress. In sync.</span></div><div className="art-grain" /></div>
  </main>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<EmsBootstrap | null>(null);
  const displayName = user?.name || user?.email?.split("@")[0] || "Team member";
  const title = titles[location] || "Overview";
  const role: EmsRole = user?.role === "admin" ? "admin" : user?.role === "hr" ? "hr" : "employee";

  useEffect(() => { api.get<EmsBootstrap>("/bootstrap").then(setData).catch((error) => { toast.error(error.message || "Workspace data could not be loaded."); }); }, []);
  useEffect(() => { setMobileOpen(false); window.scrollTo({ top: 0, behavior: "smooth" }); }, [location]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tween = gsap.fromTo(".app-content", { autoAlpha: 0, y: 7 }, { autoAlpha: 1, y: 0, duration: 0.26, ease: "power2.out", clearProps: "all" });
    return () => { tween.kill(); };
  }, [location]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); } if (event.key === "Escape") setSearchOpen(false); };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, []);
  const openSearch = () => { if (query.trim()) { setLocation(`/employees?q=${encodeURIComponent(query.trim())}`); setSearchOpen(false); return; } setSearchOpen(true); };
  const avatar = displayName.split(/[ .@_-]/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase();

  return <div className="app-frame">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="sidebar-brand"><img src="/orbit-mark.svg" alt="" /><div><b>orbit</b><span>PEOPLE SYSTEMS</span></div><button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={17} /></button></div>
      <div className="workspace-select"><div className="workspace-avatar">N</div><div><b>Northstar Studio</b><span>Workspace</span></div><ChevronDown size={14} /></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Main navigation">{navItems.map(({ label, path, icon: Icon }) => <button key={path} className={`nav-item ${location === path ? "nav-active" : ""}`} onClick={() => setLocation(path)}><Icon size={17} strokeWidth={1.8} /><span>{label}</span>{label === "Leave" && data?.stats.pendingLeaves ? <i className="nav-count">{data.stats.pendingLeaves}</i> : null}</button>)}</nav>
      <div className="sidebar-divider" /><div className="nav-label">MANAGE</div>
      <button className={`nav-item ${location === "/documents" ? "nav-active" : ""}`} onClick={() => setLocation("/documents")}><FileLock2 size={17} strokeWidth={1.8} /><span>Documents</span></button>
      {role === "admin" && <button className={`nav-item ${location === "/settings" ? "nav-active" : ""}`} onClick={() => setLocation("/settings")}><Settings2 size={17} strokeWidth={1.8} /><span>Settings</span></button>}
      <div className="sidebar-bottom"><div className="upgrade-card"><div className="upgrade-orb"><i /><b /></div><strong>People, in focus.</strong><span>Everything your team needs, together.</span><button onClick={() => setLocation("/reports")}>View people insights <span>↗</span></button></div><button className="nav-item help-item" onClick={() => toast.info("Need a hand? Ask your workspace administrator.")}><CircleHelp size={17} strokeWidth={1.8} /><span>Help center</span></button></div>
    </aside>
    {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <div className="workspace-main">
      <header className="topbar"><div className="topbar-left"><button className="icon-button menu-button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><span className="crumb-root">Workspace</span><span className="crumb-slash">/</span><strong>{title}</strong></div><div className="topbar-right"><button className="search-trigger" onClick={openSearch}><Search size={15} /><span>Search anything</span><kbd>⌘ K</kbd></button><span className="topbar-divider" /><button className="avatar-button" title={`${displayName} · ${role}`} onClick={() => { toast.message(`${displayName}`, { description: `${role.toUpperCase()} · ${user?.email || "Signed in"}` }); }}><span className="avatar">{avatar}</span><ChevronDown size={13} /></button><button className="topbar-logout" title="Sign out" onClick={() => logout()}><LogOut size={15} /></button></div></header>
      <main className="app-content" key={location}>{children}</main>
      <footer className="app-footer"><span><i className="status-dot" /> Your workspace is up to date</span><span>Orbit · Secure people operations</span></footer>
    </div>
    {searchOpen && <div className="search-backdrop" onMouseDown={() => setSearchOpen(false)}><form className="search-dialog" onSubmit={(e) => { e.preventDefault(); openSearch(); }} onMouseDown={(e) => e.stopPropagation()}><Search size={18} /><input autoFocus placeholder="Search people, teams, or pages…" value={query} onChange={(e) => setQuery(e.target.value)} /><kbd>ESC</kbd><button className="icon-button" type="button" onClick={() => setSearchOpen(false)} aria-label="Close search"><X size={16} /></button><p>Search employees and open the directory <span>↵</span></p></form></div>}
  </div>;
}

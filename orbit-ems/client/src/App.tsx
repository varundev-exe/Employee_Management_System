import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout, { LoginScreen } from "@/components/DashboardLayout";
import { lazy, Suspense } from "react";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";

const Home = lazy(() => import("@/pages/Home"));
const ModulePage = lazy(() => import("@/pages/ModulePage"));

function Workspace() {
  const { loading, user } = useAuth();
  if (loading) return <div className="login-loading"><img src="/orbit-mark.svg" alt="" /><span>Verifying your secure session…</span></div>;
  if (!user) return <LoginScreen />;
  return <DashboardLayout><Suspense fallback={<div className="loading-line"><i />Opening workspace…</div>}><Switch>
    <Route path="/" component={Home} />
    <Route path="/employees" component={() => <ModulePage module="employees" />} />
    <Route path="/departments" component={() => <ModulePage module="departments" />} />
    <Route path="/attendance" component={() => <ModulePage module="attendance" />} />
    <Route path="/leave" component={() => <ModulePage module="leave" />} />
    <Route path="/payroll" component={() => <ModulePage module="payroll" />} />
    <Route path="/performance" component={() => <ModulePage module="performance" />} />
    <Route path="/reports" component={() => <ModulePage module="reports" />} />
    <Route path="/documents" component={() => <ModulePage module="documents" />} />
    <Route path="/settings" component={() => <ModulePage module="settings" />} />
    <Route component={NotFound} />
  </Switch></Suspense></DashboardLayout>;
}
export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster richColors position="top-right" /><Workspace /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}

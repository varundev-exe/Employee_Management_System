import { lazy, Suspense } from "react";

const Scene = lazy(() => import("./OrbitScene"));

function StaticOrbitalMark({ className = "" }: { className?: string }) {
  return <div className={`orbit-static ${className}`} aria-hidden="true"><span /><i /><b /></div>;
}

export default function OrbitSceneSlot({ className = "" }: { className?: string }) {
  return <Suspense fallback={<StaticOrbitalMark className={className} />}><Scene className={className} /></Suspense>;
}

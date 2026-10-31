import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, Sparkles } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function OrbitalMark() {
  const core = useRef<THREE.Mesh>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (core.current) core.current.rotation.y += delta * 0.12;
    if (ringA.current) ringA.current.rotation.z += delta * 0.11;
    if (ringB.current) ringB.current.rotation.x += delta * 0.08;
    state.scene.rotation.y = THREE.MathUtils.damp(state.scene.rotation.y, (state.pointer.x || 0) * 0.12, 3, delta);
  });
  return <group>
    <Float speed={1.05} rotationIntensity={0.13} floatIntensity={0.16}>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.88, 3]} />
        <meshPhysicalMaterial color="#7470f2" roughness={0.24} metalness={0.35} clearcoat={0.9} clearcoatRoughness={0.2} />
      </mesh>
      <mesh ref={ringA} rotation={[0.82, 0.25, 0.26]}>
        <torusGeometry args={[1.38, 0.018, 10, 120]} />
        <meshBasicMaterial color="#a9a5ff" transparent opacity={0.74} />
      </mesh>
      <mesh ref={ringB} rotation={[-0.65, 0.25, -0.45]}>
        <torusGeometry args={[1.62, 0.012, 8, 120]} />
        <meshBasicMaterial color="#c6f8e3" transparent opacity={0.8} />
      </mesh>
      <mesh position={[1.02, 0.79, 0.62]}>
        <sphereGeometry args={[0.085, 16, 16]} />
        <meshBasicMaterial color="#c6f8e3" />
      </mesh>
      <mesh position={[-1.29, -0.17, -0.48]}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
    </Float>
    <Sparkles count={38} scale={4.6} size={1.7} speed={0.12} color="#c4c2ff" opacity={0.66} />
    <ambientLight intensity={1.1} />
    <pointLight position={[2, 3, 3]} intensity={3.8} color="#b8b4ff" />
    <pointLight position={[-2, -2, -1]} intensity={2} color="#69d8bb" />
  </group>;
}

export default function OrbitScene({ className = "" }: { className?: string }) {
  if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return <div className={`orbit-static ${className}`} aria-hidden="true"><span /><i /><b /></div>;
  }
  return <div className={`orbit-canvas ${className}`} aria-hidden="true">
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 5.4], fov: 42 }} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}>
      <OrbitalMark />
    </Canvas>
    <div className="scene-shine" />
  </div>;
}

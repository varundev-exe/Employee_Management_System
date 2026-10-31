import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles } from "@react-three/drei";
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
    state.scene.rotation.y = THREE.MathUtils.damp(state.scene.rotation.y, state.pointer.x * 0.1, 3, delta);
  });
  return <group>
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.14}>
      <mesh ref={core}>
        <icosahedronGeometry args={[0.85, 3]} />
        <meshPhysicalMaterial color="#756df0" roughness={0.24} metalness={0.3} clearcoat={0.9} />
      </mesh>
      <mesh ref={ringA} rotation={[0.82, 0.25, 0.26]}>
        <torusGeometry args={[1.36, 0.018, 10, 120]} />
        <meshBasicMaterial color="#b2aeff" transparent opacity={0.74} />
      </mesh>
      <mesh ref={ringB} rotation={[-0.65, 0.25, -0.45]}>
        <torusGeometry args={[1.6, 0.012, 8, 120]} />
        <meshBasicMaterial color="#c6f8e3" transparent opacity={0.8} />
      </mesh>
      <mesh position={[1.02, 0.79, 0.62]}><sphereGeometry args={[0.08, 16, 16]} /><meshBasicMaterial color="#c6f8e3" /></mesh>
    </Float>
    <Sparkles count={28} scale={4.2} size={1.4} speed={0.1} color="#c4c2ff" opacity={0.6} />
    <ambientLight intensity={1.1} />
    <pointLight position={[2, 3, 3]} intensity={3} color="#b8b4ff" />
  </group>;
}

export default function OrbitScene() {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return <div className="orb-fallback" aria-hidden="true"><span /><i /></div>;
  }
  return <div className="orb-scene" aria-hidden="true">
    <Canvas dpr={[1, 1.4]} camera={{ position: [0, 0, 5.1], fov: 43 }} gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}>
      <OrbitalMark />
    </Canvas>
  </div>;
}

import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";

/**
 * NASA Earth's Moon GLB globe (public domain). A marker is placed near the
 * lunar south pole to indicate the Haworth ice-target region.
 */
export default function MoonGlobe() {
  const { scene } = useGLTF("/models/moon.glb");
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.05;
  });
  return (
    <group>
      <primitive ref={ref} object={scene} scale={2.2} />
      {/* south-pole marker (approximate, on the rotating globe's axis) */}
      <mesh position={[0, -2.3, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#33d6ff" emissive="#33d6ff" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
}

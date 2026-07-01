import React, { useMemo } from "react";
import { Line } from "@react-three/drei";

/**
 * Draws the planned traverse (absolute world points {x,y,z}) plus the landing
 * site (green sphere) and ice target (cyan cone).
 */
export default function PathLine({ points, startWorld, goalWorld }) {
  const pts = useMemo(
    () => (points || []).map((p) => [p.x, p.y, p.z]),
    [points]
  );
  return (
    <group>
      {pts.length >= 2 && <Line points={pts} color="#33d6ff" lineWidth={3} />}
      {startWorld && (
        <mesh position={[startWorld.x, startWorld.y, startWorld.z]}>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color="#39ff14" emissive="#39ff14" emissiveIntensity={0.6} />
        </mesh>
      )}
      {goalWorld && (
        <mesh position={[goalWorld.x, goalWorld.y + 0.25, goalWorld.z]}>
          <coneGeometry args={[0.28, 0.6, 5]} />
          <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={0.7} />
        </mesh>
      )}
    </group>
  );
}

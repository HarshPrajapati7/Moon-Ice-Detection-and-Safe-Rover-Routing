import React from "react";
import { useTexture } from "@react-three/drei";

/**
 * Ground plane textured with the real OHRC window, with a hazard overlay.
 * The plane spans [-SIZE/2, SIZE/2] in the XZ world plane (y up).
 */
export default function Terrain({ size = 20 }) {
  const [terrain, hazard] = useTexture([
    "/data/terrain.png",
    "/data/hazard.png",
  ]);
  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow>
        <planeGeometry args={[size, size, 1, 1]} />
        <meshStandardMaterial map={terrain} roughness={1} metalness={0} />
      </mesh>
      {/* hazard overlay just above the surface */}
      <mesh position={[0, 0, 0.02]}>
        <planeGeometry args={[size, size, 1, 1]} />
        <meshBasicMaterial map={hazard} transparent opacity={0.75} depthWrite={false} />
      </mesh>
    </group>
  );
}

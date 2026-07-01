import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Procedural Chandrayaan-3 "Pragyan" rover:
 *  - gold MLI-wrapped chassis
 *  - tilted solar panel
 *  - navigation camera mast
 *  - six wheels (rocker-bogie layout) that ROTATE in proportion to the
 *    distance the rover actually travels each frame
 *  - small ISRO tricolour accent
 *
 * Wheel rotation is derived from the group's world-position delta, so the
 * wheels spin correctly whether the rover speeds up, slows down, or pauses.
 */
const GOLD = "#c8a23c";
const GOLD_DK = "#9c7c2a";
const PANEL = "#16245f";
const DARK = "#161619";
const TRI_SAFFRON = "#ff9933";
const TRI_GREEN = "#138808";

const WHEEL_R = 0.12;
const WHEEL_W = 0.11;
const WHEEL_POS = [
  [-0.34, -0.32], [0.34, -0.32],
  [-0.34, 0.0],   [0.34, 0.0],
  [-0.34, 0.32],  [0.34, 0.32],
];

function Wheel({ refCb }) {
  // The wheel group spins about its local X axis (the axle).
  return (
    <group ref={refCb}>
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[WHEEL_R, WHEEL_R, WHEEL_W, 20]} />
        <meshStandardMaterial color={DARK} metalness={0.4} roughness={0.7} />
      </mesh>
      {/* spokes / treads so rotation is clearly visible */}
      <mesh>
        <boxGeometry args={[WHEEL_W + 0.01, WHEEL_R * 2 * 0.92, 0.025]} />
        <meshStandardMaterial color="#3a3a40" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[WHEEL_W + 0.01, WHEEL_R * 2 * 0.92, 0.025]} />
        <meshStandardMaterial color="#3a3a40" />
      </mesh>
    </group>
  );
}

export default function PragyanRover() {
  const root = useRef();
  const wheels = useRef([]);
  const prev = useRef(new THREE.Vector3());
  const init = useRef(false);

  useFrame(() => {
    const g = root.current;
    if (!g) return;
    const p = new THREE.Vector3();
    g.getWorldPosition(p);
    if (!init.current) { prev.current.copy(p); init.current = true; return; }
    const d = p.distanceTo(prev.current);
    prev.current.copy(p);
    const dRot = d / WHEEL_R; // rolling without slipping
    for (const w of wheels.current) if (w) w.rotation.x += dRot;
  });

  return (
    <group ref={root}>
      {/* chassis (gold MLI) */}
      <mesh position={[0, 0.24, 0]} castShadow>
        <boxGeometry args={[0.56, 0.18, 0.78]} />
        <meshStandardMaterial color={GOLD} metalness={0.65} roughness={0.35} />
      </mesh>
      {/* lower body */}
      <mesh position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[0.5, 0.1, 0.7]} />
        <meshStandardMaterial color={GOLD_DK} metalness={0.6} roughness={0.45} />
      </mesh>

      {/* tilted solar panel */}
      <mesh position={[0, 0.42, -0.05]} rotation={[-0.32, 0, 0]} castShadow>
        <boxGeometry args={[0.62, 0.02, 0.66]} />
        <meshStandardMaterial color={PANEL} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* solar-cell grid lines */}
      {[-0.2, -0.07, 0.07, 0.2].map((x, i) => (
        <mesh key={i} position={[x, 0.435, -0.05]} rotation={[-0.32, 0, 0]}>
          <boxGeometry args={[0.01, 0.022, 0.64]} />
          <meshStandardMaterial color="#0b1540" />
        </mesh>
      ))}

      {/* navigation camera mast */}
      <mesh position={[0, 0.5, 0.3]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.34, 12]} />
        <meshStandardMaterial color="#888" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.66, 0.3]} castShadow>
        <boxGeometry args={[0.16, 0.06, 0.06]} />
        <meshStandardMaterial color={DARK} />
      </mesh>
      {/* camera "eyes" */}
      {[-0.045, 0.045].map((x, i) => (
        <mesh key={i} position={[x, 0.66, 0.335]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.02, 12]} />
          <meshStandardMaterial color="#0af" emissive="#0af" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* ISRO tricolour accent on the side */}
      <mesh position={[0.281, 0.27, 0.1]}>
        <boxGeometry args={[0.005, 0.05, 0.16]} />
        <meshStandardMaterial color={TRI_SAFFRON} emissive={TRI_SAFFRON} emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[0.281, 0.21, 0.1]}>
        <boxGeometry args={[0.005, 0.05, 0.16]} />
        <meshStandardMaterial color={TRI_GREEN} emissive={TRI_GREEN} emissiveIntensity={0.2} />
      </mesh>

      {/* rocker-bogie struts */}
      {[-0.3, 0.3].map((x, i) => (
        <mesh key={i} position={[x, 0.16, 0]}>
          <boxGeometry args={[0.03, 0.03, 0.7]} />
          <meshStandardMaterial color="#555" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}

      {/* six wheels */}
      {WHEEL_POS.map(([x, z], i) => (
        <group key={i} position={[x, WHEEL_R, z]}>
          <Wheel refCb={(el) => (wheels.current[i] = el)} />
        </group>
      ))}
    </group>
  );
}

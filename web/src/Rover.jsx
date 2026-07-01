import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import PragyanRover from "./PragyanRover.jsx";

function PragyanModel() {
  const { scene } = useGLTF("/models/pragyan.glb");
  const cloned = useMemo(() => scene.clone(), [scene]);
  return <primitive object={cloned} scale={0.5} />;
}

/**
 * Rover that travels along the traverse path. `progress` in [0,1] is driven by
 * the parent (play/pause + speed). Orients toward the direction of travel.
 */
export default function Rover({ points, progress, useModel }) {
  const ref = useRef();

  const curve = useMemo(() => {
    if (!points || points.length < 2) return null;
    const v = points.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    return new THREE.CatmullRomCurve3(v);
  }, [points]);

  useFrame(() => {
    if (!ref.current) return;
    if (!curve) {
      if (points && points.length) {
        const p = points[0];
        ref.current.position.set(p.x, p.y, p.z);
      }
      return;
    }
    const t = THREE.MathUtils.clamp(progress.current, 0, 1);
    const pos = curve.getPointAt(t);
    ref.current.position.copy(pos);
    const ahead = curve.getPointAt(Math.min(t + 0.01, 1));
    ref.current.lookAt(ahead.x, pos.y, ahead.z);
  });

  return (
    <group ref={ref}>
      {useModel ? <PragyanModel /> : <PragyanRover />}
    </group>
  );
}

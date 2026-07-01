import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Line } from "@react-three/drei";
import * as THREE from "three";
import PragyanRover from "./PragyanRover.jsx";
import { tangentFrame, cellPoint } from "./globeMath.js";

export const GLOBE_R = 6;
export const PATCH = 0.55;          // angular half-extent of the navigation cap
export const LIFT = 1.004;          // sit just above the surface
// Direction on the globe where the south-pole ice site is shown (camera-facing).
export const SITE_DIR = new THREE.Vector3(0.0, -0.5, 0.86).normalize();

/** NASA Moon GLB, recentred at the origin and scaled to radius GLOBE_R. */
function MoonBall({ onPick, grid, frame }) {
  const { scene } = useGLTF("/models/moon.glb");
  const fitted = useMemo(() => {
    const obj = scene.clone(true);
    const box = new THREE.Box3().setFromObject(obj);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y, size.z) / 2;
    const s = GLOBE_R / radius;
    obj.position.set(-c.x * s, -c.y * s, -c.z * s);
    obj.scale.setScalar(s);
    return obj;
  }, [scene]);

  const handleClick = (e) => {
    e.stopPropagation();
    onPick(e.point.clone());
  };
  return <primitive object={fitted} onClick={handleClick} />;
}

/** Impassable (hazard) cells rendered as a red point cloud on the surface. */
function Hazards({ grid, center, t1, t2 }) {
  const geom = useMemo(() => {
    const pts = [];
    const step = Math.max(1, Math.round(grid.w / 90)); // cap the count
    for (let r = 0; r < grid.h; r += step) {
      for (let c = 0; c < grid.w; c += step) {
        if (grid.cost[r * grid.w + c] < 0) {
          const p = cellPoint(grid, r, c, center, t1, t2, PATCH, GLOBE_R, LIFT);
          pts.push(p.x, p.y, p.z);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, [grid, center, t1, t2]);
  return (
    <points geometry={geom}>
      <pointsMaterial size={0.028} color="#ff5a36" sizeAttenuation transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}

/** Precise ice-deposit marker: small core with a thin surface ring. */
function IceMarker({ grid, center, t1, t2 }) {
  const { p, quat } = useMemo(() => {
    const pt = cellPoint(grid, grid.goal[0], grid.goal[1], center, t1, t2, PATCH, GLOBE_R, LIFT * 1.002);
    const n = pt.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
    return { p: pt, quat: q };
  }, [grid, center, t1, t2]);
  const ref = useRef();
  useFrame((s) => {
    if (ref.current) ref.current.material.emissiveIntensity = 0.5 + 0.3 * Math.sin(s.clock.elapsedTime * 2.5);
  });
  return (
    <group position={p} quaternion={quat}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.045, 20, 20]} />
        <meshStandardMaterial color="#bfefff" emissive="#45d3ff" emissiveIntensity={0.6} />
      </mesh>
      {/* thin geospatial target ring */}
      <mesh>
        <torusGeometry args={[0.12, 0.006, 12, 48]} />
        <meshBasicMaterial color="#45d3ff" transparent opacity={0.9} />
      </mesh>
      <pointLight color="#45d3ff" intensity={0.7} distance={2} />
    </group>
  );
}

/** Rover that drives the path along the sphere surface, oriented to the normal. */
function RoverOnGlobe({ points, progress }) {
  const ref = useRef();
  const curve = useMemo(
    () => (points.length >= 2 ? new THREE.CatmullRomCurve3(points) : null),
    [points]
  );
  const scratch = useMemo(() => ({
    m: new THREE.Matrix4(), up: new THREE.Vector3(),
    fwd: new THREE.Vector3(), right: new THREE.Vector3(),
  }), []);

  useFrame(() => {
    if (!ref.current) return;
    if (!curve) { if (points[0]) ref.current.position.copy(points[0]); return; }
    const t = THREE.MathUtils.clamp(progress.current, 0, 1);
    const pos = curve.getPointAt(t);
    const ahead = curve.getPointAt(Math.min(t + 0.01, 1));
    const { m, up, fwd, right } = scratch;
    up.copy(pos).normalize();
    fwd.copy(ahead).sub(pos);
    fwd.addScaledVector(up, -fwd.dot(up));
    if (fwd.lengthSq() < 1e-8) fwd.copy(t1Fallback(up));
    fwd.normalize();
    right.crossVectors(up, fwd).normalize();
    fwd.crossVectors(right, up).normalize();
    m.makeBasis(right, up, fwd);
    ref.current.position.copy(pos);
    ref.current.quaternion.setFromRotationMatrix(m);
  });

  return (
    <group ref={ref}>
      <group scale={0.18}>
        <PragyanRover />
      </group>
      {/* headlamp so the rover and nearby surface are lit even in shadow */}
      <pointLight position={[0, 0.45, 0]} intensity={1.3} distance={3.2} color="#fff3df" />
      {/* location beacon: thin pin + glowing marker, always visible */}
      <mesh position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 1.0, 8]} />
        <meshBasicMaterial color="#3de38c" transparent opacity={0.45} />
      </mesh>
      <mesh position={[0, 1.06, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#8effc0" emissive="#3de38c" emissiveIntensity={1.4} />
      </mesh>
    </group>
  );
}
function t1Fallback(up) {
  const ref = Math.abs(up.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  return new THREE.Vector3().crossVectors(ref, up).normalize();
}

/** Positions the camera to look at the navigation cap. */
function CameraRig({ center }) {
  const { camera } = useThree();
  useEffect(() => {
    const target = center.clone().multiplyScalar(GLOBE_R);
    camera.position.copy(center.clone().multiplyScalar(GLOBE_R + 7));
    camera.lookAt(target);
  }, [camera, center]);
  return null;
}

export default function GlobeScene({ grid, pathCells, startCell, progress, onPickCell, layers = { hazards: true, path: true, ice: true } }) {
  const center = SITE_DIR;
  const { t1, t2 } = useMemo(() => tangentFrame(center), [center]);

  const pathPoints = useMemo(
    () => pathCells.map(([r, c]) => cellPoint(grid, r, c, center, t1, t2, PATCH, GLOBE_R, LIFT * 1.001)),
    [grid, pathCells, center, t1, t2]
  );
  const startPoint = useMemo(
    () => cellPoint(grid, startCell[0], startCell[1], center, t1, t2, PATCH, GLOBE_R, LIFT),
    [grid, startCell, center, t1, t2]
  );

  const handlePick = (worldPoint) => {
    import("./globeMath.js").then(({ nearestCell }) => {
      const cell = nearestCell(grid, worldPoint, center, t1, t2, PATCH, 2);
      onPickCell(cell[0], cell[1]);
    });
  };

  return (
    <group>
      <MoonBall onPick={handlePick} grid={grid} frame={{ center, t1, t2 }} />
      {layers.hazards && <Hazards grid={grid} center={center} t1={t1} t2={t2} />}
      {layers.ice && <IceMarker grid={grid} center={center} t1={t1} t2={t2} />}
      {layers.path && pathPoints.length >= 2 && (
        <Line points={pathPoints.map((p) => [p.x, p.y, p.z])} color="#56d8ff" lineWidth={1.5} />
      )}
      <mesh position={startPoint}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color="#3de38c" emissive="#3de38c" emissiveIntensity={0.7} />
      </mesh>
      <RoverOnGlobe points={pathPoints} progress={progress} />
    </group>
  );
}

import React, { useMemo } from "react";
import * as THREE from "three";

/**
 * Data-driven 3D lunar terrain built directly from the exported grid:
 *  - vertex height = OHRC intensity (real surface relief proxy)
 *  - vertex colour = lunar grey, with impassable hazard cells tinted dark red
 * Cell (r,c) maps to world (x from c, z from r), identical to the planner and
 * path mapping, so visuals and planning are perfectly aligned.
 *
 * Clicking the mesh reports the (r,c) cell via onPick.
 */
export default function TerrainMesh({ grid, size = 20, relief = 1.6, onPick }) {
  const { geometry } = useMemo(() => {
    const { h, w, cost, height } = grid;
    const half = size / 2;
    const pos = new Float32Array(h * w * 3);
    const col = new Float32Array(h * w * 3);
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const i = r * w + c;
        const x = ((c / (w - 1)) * 2 - 1) * half;
        const z = ((r / (h - 1)) * 2 - 1) * half;
        const elev = height[i] * relief;
        pos[i * 3] = x; pos[i * 3 + 1] = elev; pos[i * 3 + 2] = z;
        const impassable = cost[i] < 0;
        const g = 0.32 + 0.55 * height[i]; // lunar grey shading
        if (impassable) { col[i*3] = 0.55; col[i*3+1] = 0.13; col[i*3+2] = 0.08; }
        else { col[i*3] = g; col[i*3+1] = g; col[i*3+2] = g * 0.97; }
      }
    }
    const idx = [];
    for (let r = 0; r < h - 1; r++) {
      for (let c = 0; c < w - 1; c++) {
        const a = r * w + c, b = r * w + c + 1, d = (r + 1) * w + c, e = (r + 1) * w + c + 1;
        idx.push(a, d, b, b, d, e);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return { geometry: geo };
  }, [grid, size, relief]);

  const handleClick = (e) => {
    e.stopPropagation();
    const { h, w } = grid;
    const half = size / 2;
    const p = e.point; // world coords
    const c = Math.round(((p.x / half) + 1) / 2 * (w - 1));
    const r = Math.round(((p.z / half) + 1) / 2 * (h - 1));
    if (onPick) onPick(r, c);
  };

  return (
    <mesh geometry={geometry} onClick={handleClick} receiveShadow castShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} />
    </mesh>
  );
}

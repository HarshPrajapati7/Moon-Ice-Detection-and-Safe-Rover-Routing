import * as THREE from "three";

// Maps the 2D navigation grid onto a small cap of the Moon sphere so the rover
// can drive on the globe surface near the detected ice region.

/** Orthonormal tangent basis (t1, t2) at a unit direction n. */
export function tangentFrame(n) {
  const ref = Math.abs(n.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
  const t1 = new THREE.Vector3().crossVectors(ref, n).normalize();
  const t2 = new THREE.Vector3().crossVectors(n, t1).normalize();
  return { t1, t2 };
}

/** Unit surface direction for grid cell (r,c) within a cap around `center`. */
export function cellDir(grid, r, c, center, t1, t2, patch, out) {
  const u = c / (grid.w - 1) - 0.5;
  const v = r / (grid.h - 1) - 0.5;
  out.copy(center).addScaledVector(t1, u * patch).addScaledVector(t2, v * patch).normalize();
  return out;
}

/** Surface point (radius R, optionally lifted) for grid cell (r,c). */
export function cellPoint(grid, r, c, center, t1, t2, patch, R, lift = 1.0) {
  const d = new THREE.Vector3();
  cellDir(grid, r, c, center, t1, t2, patch, d);
  return d.multiplyScalar(R * lift);
}

/** Nearest grid cell to a world point on the sphere (for click placement). */
export function nearestCell(grid, point, center, t1, t2, patch, step = 2) {
  const tn = point.clone().normalize();
  const d = new THREE.Vector3();
  let best = -2, br = 0, bc = 0;
  for (let r = 0; r < grid.h; r += step) {
    for (let c = 0; c < grid.w; c += step) {
      cellDir(grid, r, c, center, t1, t2, patch, d);
      const dot = d.dot(tn);
      if (dot > best) { best = dot; br = r; bc = c; }
    }
  }
  return [br, bc];
}

// Lightweight A* over the exported cost grid (8-connected).
// grid.cost is a flat row-major array; -1 marks impassable cells.

class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(item) {
    const a = this.a; a.push(item); let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].f <= a[i].f) break;
      [a[p], a[i]] = [a[i], a[p]]; i = p;
    }
  }
  pop() {
    const a = this.a; const top = a[0]; const last = a.pop();
    if (a.length) {
      a[0] = last; let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = 2 * i + 2; let m = i;
        if (l < a.length && a[l].f < a[m].f) m = l;
        if (r < a.length && a[r].f < a[m].f) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]]; i = m;
      }
    }
    return top;
  }
}

const NB = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];

/**
 * @param {{h:number,w:number,cost:number[]}} grid
 * @param {[number,number]} start [r,c]
 * @param {[number,number]} goal  [r,c]
 * @returns {Array<[number,number]>} path of [r,c] cells (empty if none)
 */
export function astar(grid, start, goal) {
  const { h, w, cost } = grid;
  const idx = (r, c) => r * w + c;
  const passable = (r, c) => r >= 0 && r < h && c >= 0 && c < w && cost[idx(r, c)] >= 0;
  if (!passable(start[0], start[1]) || !passable(goal[0], goal[1])) return [];

  const g = new Float64Array(h * w).fill(Infinity);
  const came = new Int32Array(h * w).fill(-1);
  const closed = new Uint8Array(h * w);
  const H = (r, c) => Math.hypot(r - goal[0], c - goal[1]);

  const open = new MinHeap();
  g[idx(start[0], start[1])] = 0;
  open.push({ r: start[0], c: start[1], f: H(start[0], start[1]) });

  while (open.size) {
    const cur = open.pop();
    const ci = idx(cur.r, cur.c);
    if (closed[ci]) continue;
    closed[ci] = 1;
    if (cur.r === goal[0] && cur.c === goal[1]) break;
    for (const [dr, dc] of NB) {
      const nr = cur.r + dr, nc = cur.c + dc;
      if (!passable(nr, nc)) continue;
      const ni = idx(nr, nc);
      if (closed[ni]) continue;
      const step = Math.hypot(dr, dc) * 0.5 * (cost[ci] + cost[ni]);
      const ng = g[ci] + step;
      if (ng < g[ni]) {
        g[ni] = ng; came[ni] = ci;
        open.push({ r: nr, c: nc, f: ng + H(nr, nc) });
      }
    }
  }

  const gi = idx(goal[0], goal[1]);
  if (came[gi] === -1 && gi !== idx(start[0], start[1])) return [];
  const path = [];
  let k = gi;
  while (k !== -1) { path.push([Math.floor(k / w), k % w]); k = came[k]; }
  path.reverse();
  return path;
}

/** Nearest passable cell to (r,c) within a small radius (for click snapping). */
export function nearestPassable(grid, r, c, maxR = 8) {
  const { h, w, cost } = grid;
  if (r >= 0 && r < h && c >= 0 && c < w && cost[r * w + c] >= 0) return [r, c];
  for (let rad = 1; rad <= maxR; rad++) {
    for (let dr = -rad; dr <= rad; dr++) {
      for (let dc = -rad; dc <= rad; dc++) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < h && nc >= 0 && nc < w && cost[nr * w + nc] >= 0)
          return [nr, nc];
      }
    }
  }
  return null;
}

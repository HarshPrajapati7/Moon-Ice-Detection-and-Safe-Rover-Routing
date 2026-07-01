import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import GlobeScene, { GLOBE_R } from "./GlobeScene.jsx";
import { astar, nearestPassable } from "./astar.js";

function pathLengthM(cells, grid) {
  if (!cells || cells.length < 2) return 0;
  let d = 0;
  for (let i = 0; i < cells.length - 1; i++)
    d += Math.hypot(cells[i][0] - cells[i + 1][0], cells[i][1] - cells[i + 1][1]);
  return d * grid.res_m;
}

/** Bilinear real lunar lat/lon for grid cell (r,c) from OHRC geometry corners. */
function cellLatLon(grid, r, c) {
  const g = grid && grid.geo;
  if (!g) return null;
  const u = c / (grid.w - 1), v = r / (grid.h - 1);
  const lat = (1 - v) * ((1 - u) * g.tl[0] + u * g.tr[0]) + v * ((1 - u) * g.bl[0] + u * g.br[0]);
  const lon = (1 - v) * ((1 - u) * g.tl[1] + u * g.tr[1]) + v * ((1 - u) * g.bl[1] + u * g.br[1]);
  return [lat, lon];
}
const fmtLat = (v) => (v == null ? "--" : `${Math.abs(v).toFixed(3)}\u00b0 ${v >= 0 ? "N" : "S"}`);
const fmtLon = (v) => (v == null ? "--" : `${Math.abs(v).toFixed(3)}\u00b0 ${v >= 0 ? "E" : "W"}`);

function TraverseController({ progress, playing, speed, onDone }) {
  useFrame((_, dt) => {
    if (!playing.current) return;
    progress.current = Math.min(progress.current + dt * speed.current, 1);
    if (progress.current >= 1) onDone();
  });
  return null;
}

export default function App() {
  const [grid, setGrid] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [start, setStart] = useState(null);
  const [pathCells, setPathCells] = useState([]);
  const [playing, setPlaying] = useState(true);
  const [done, setDone] = useState(false);
  const [tab, setTab] = useState("scene");
  const [layers, setLayers] = useState({ ice: true, hazards: true, path: true });
  const [light, setLight] = useState({ az: 210, el: 12, exposure: 2.3, ambient: 0.14 });

  const progress = useRef(0);
  const playingRef = useRef(true);
  const speed = useRef(0.09);
  const controls = useRef();
  const [roverCell, setRoverCell] = useState(null);

  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => {
    fetch("/data/grid.json").then((r) => r.json()).then((g) => {
      setGrid(g); setStart(g.start); setPathCells(astar(g, g.start, g.goal));
    }).catch(() => {});
    fetch("/data/metrics.json").then((r) => r.json()).then(setMetrics).catch(() => {});
  }, []);

  // sample the rover's current cell ~5x/sec for live coordinate readouts
  useEffect(() => {
    const id = setInterval(() => {
      if (!pathCells.length) return;
      const idx = Math.min(pathCells.length - 1, Math.round(progress.current * (pathCells.length - 1)));
      setRoverCell(pathCells[idx]);
    }, 200);
    return () => clearInterval(id);
  }, [pathCells]);

  const replan = (cell) => {
    if (!grid) return;
    setPathCells(astar(grid, cell, grid.goal));
    progress.current = 0; setDone(false); setPlaying(true);
  };
  const onPickCell = (r, c) => {
    if (!grid) return;
    const s = nearestPassable(grid, r, c, 12);
    if (s) { setStart(s); replan(s); }
  };

  const lenM = grid ? pathLengthM(pathCells, grid) : 0;
  const reachable = pathCells && pathCells.length > 1;
  const siteLL = grid ? cellLatLon(grid, grid.goal[0], grid.goal[1]) : null;
  const roverLL = grid && roverCell ? cellLatLon(grid, roverCell[0], roverCell[1]) : null;

  const sunPos = useMemo(() => {
    const az = (light.az * Math.PI) / 180, el = (light.el * Math.PI) / 180;
    const d = 30;
    return [d * Math.cos(el) * Math.cos(az), d * Math.sin(el), d * Math.cos(el) * Math.sin(az)];
  }, [light.az, light.el]);

  return (
    <div className="window">
      <div className="body">
        <div className="viewport">
          <div className="rtitle">StarBusterLabs</div>
          <div className="rtoolbar">
            <div className={"ic" + (layers.ice ? " on" : "")} title="Ice target" onClick={() => setLayers((l) => ({ ...l, ice: !l.ice }))}>{"\u2744"}</div>
            <div className={"ic" + (layers.hazards ? " on" : "")} title="Hazards" onClick={() => setLayers((l) => ({ ...l, hazards: !l.hazards }))}>{"\u26A0"}</div>
            <div className={"ic" + (layers.path ? " on" : "")} title="Route" onClick={() => setLayers((l) => ({ ...l, path: !l.path }))}>{"\u219D"}</div>
            <div className="ic" title={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>{playing ? "\u23F8" : "\u25B6"}</div>
            <div className="ic" title="Reset camera" onClick={() => controls.current && controls.current.reset()}>{"\u21BB"}</div>
            <div className="ic" title="Fullscreen" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()}>{"\u26F6"}</div>
          </div>

          <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0, GLOBE_R + 5], fov: 40, near: 0.01, far: 3000 }}
            style={{ width: "100%", height: "100%" }}>
            <color attach="background" args={["#000000"]} />
            <ambientLight intensity={light.ambient} />
            <directionalLight position={sunPos} intensity={light.exposure} />
            <Suspense fallback={null}>
              {grid && start && (
                <GlobeScene grid={grid} pathCells={pathCells} startCell={start}
                  progress={progress} onPickCell={onPickCell} layers={layers} />
              )}
              <TraverseController progress={progress} playing={playingRef} speed={speed}
                onDone={() => { setPlaying(false); setDone(true); }} />
              <OrbitControls ref={controls} makeDefault target={[0, 0, 0]} enableDamping
                dampingFactor={0.07} enablePan={false} rotateSpeed={0.5} zoomSpeed={0.9}
                minDistance={GLOBE_R + 0.2} maxDistance={GLOBE_R + 28} />
            </Suspense>
          </Canvas>

          <div className="rpass">{done ? "Traverse complete" : reachable ? "Rover en route \u2022 A* route active" : "No safe route from site"}</div>
          <div className="coordhud">
            <div><span>ROVER</span> {fmtLat(roverLL && roverLL[0])} &nbsp; {fmtLon(roverLL && roverLL[1])}</div>
            <div><span>ICE&nbsp;&nbsp;</span> {fmtLat(siteLL && siteLL[0])} &nbsp; {fmtLon(siteLL && siteLL[1])}</div>
            <div><span>RANGE</span> {lenM.toFixed(0)} m &nbsp; @ {grid ? grid.res_m : "-"} m/px</div>
          </div>
        </div>

        <RightPanel tab={tab} setTab={setTab} grid={grid} metrics={metrics} lenM={lenM}
          nodes={pathCells.length} reachable={reachable} done={done}
          layers={layers} setLayers={setLayers} light={light} setLight={setLight}
          onReset={() => controls.current && controls.current.reset()}
          playing={playing} setPlaying={setPlaying} onReplay={() => replan(start)}
          siteLL={siteLL} roverLL={roverLL} />
      </div>
    </div>
  );
}

function Section({ name, tag, children, open = false }) {
  const [o, setO] = useState(open);
  return (
    <div className="sec">
      <div className="sechead" onClick={() => setO((v) => !v)}>
        <span className="caret">{o ? "\u25BC" : "\u25B6"}</span>
        <span className="name">{name}</span>
        {tag && <span className="tag">{tag}</span>}
      </div>
      {o && <div className="secbody">{children}</div>}
    </div>
  );
}

function Check({ label, checked, onChange, value }) {
  return (
    <div className="crow">
      <span className={"cb" + (checked ? " checked" : "")} onClick={onChange} />
      <span className="lab">{label}</span>
      {value != null && <span className="val plain">{value}</span>}
    </div>
  );
}

function Slider({ label, value, min, max, step, fmt, onChange }) {
  return (
    <div className="crow">
      <span className="lab">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span className="val">{fmt ? fmt(value) : value}</span>
    </div>
  );
}

const KV = ({ k, v, cls }) => (
  <div className="kv"><span className="k">{k}</span><span className={"v " + (cls || "")}>{v}</span></div>
);

const TABS = ["scene", "ice", "rover", "data"];

function RightPanel({ tab, setTab, grid, metrics, lenM, nodes, reachable, done,
                      layers, setLayers, light, setLight, onReset, playing, setPlaying, onReplay,
                      siteLL, roverLL }) {
  const reg = metrics?.regression, cnn = metrics?.detection_cnn;
  const pct = (x) => (x == null ? "--" : (100 * x).toFixed(1) + "%");
  const f3 = (x) => (x == null ? "--" : x.toFixed(3));
  const set = (k) => (val) => setLight((s) => ({ ...s, [k]: val }));

  return (
    <div className="rpanel">
      <div className="prow">
        <span className="play" onClick={() => setPlaying((p) => !p)}>{playing ? "\u23F8" : "\u25B6"}</span>
        <span className="pill">TRAVERSE</span>
        <span className="spacer" />
        <span className="mode">{done ? "COMPLETE" : reachable ? "ACTIVE" : "BLOCKED"}</span>
      </div>

      <div className="ptabs">
        {TABS.map((t) => (
          <button key={t} className={"t" + (tab === t ? " active" : "")} onClick={() => setTab(t)}>{t.toUpperCase()}</button>
        ))}
      </div>

      <div className="psections">
        {tab === "scene" && (
          <>
            <Section name="Lighting" tag="Sun" open>
              <Slider label="Sun azimuth" value={light.az} min={0} max={360} step={1} fmt={(v) => v.toFixed(0) + "\u00b0"} onChange={set("az")} />
              <Slider label="Sun elevation" value={light.el} min={-5} max={60} step={1} fmt={(v) => v.toFixed(0) + "\u00b0"} onChange={set("el")} />
              <Slider label="Exposure" value={light.exposure} min={0.5} max={3.5} step={0.05} fmt={(v) => v.toFixed(2)} onChange={set("exposure")} />
              <Slider label="Ambient" value={light.ambient} min={0} max={0.6} step={0.01} fmt={(v) => v.toFixed(2)} onChange={set("ambient")} />
            </Section>
            <Section name="Layers" tag="3" open>
              <Check label="Ice target" checked={layers.ice} onChange={() => setLayers((l) => ({ ...l, ice: !l.ice }))} />
              <Check label="Hazards" checked={layers.hazards} onChange={() => setLayers((l) => ({ ...l, hazards: !l.hazards }))} />
              <Check label="Route" checked={layers.path} onChange={() => setLayers((l) => ({ ...l, path: !l.path }))} />
            </Section>
            <Section name="Camera">
              <div className="hint">Drag to orbit &middot; scroll to zoom &middot; click the Moon to reposition the rover.</div>
              <div className="secbtns"><button onClick={onReset}>Reset view</button><button onClick={onReplay}>Replay route</button></div>
            </Section>
          </>
        )}

        {tab === "ice" && (
          <>
            <Section name="Estimator" tag="U-Net" open>
              <KV k="R\u00b2 (active)" v={f3(reg?.r2_active)} cls="cyan" />
              <KV k="RMSE (active)" v={f3(reg?.rmse_active)} />
              <KV k="Detection IoU" v={f3(reg?.detect_iou)} />
              <KV k="Detection acc." v={pct(cnn?.accuracy)} />
              <KV k="ROC-AUC" v={f3(cnn?.roc_auc)} cls="cyan" />
              <KV k="PR-AUC" v={f3(cnn?.pr_auc)} />
            </Section>
            <Section name="Concentration map" open>
              <KV k="Site latitude" v={fmtLat(siteLL && siteLL[0])} cls="cyan" />
              <KV k="Site longitude" v={fmtLon(siteLL && siteLL[1])} cls="cyan" />
              <img className="figsm" src="/figures/haworth_gated_quantification.png" alt="ice map" loading="lazy" />
              <div className="hint">Volume is a model-based estimate with a 95% CI, not a direct measurement.</div>
            </Section>
            <Section name="CPR / DOP">
              <img className="figsm" src="/figures/haworth_cpr_dop_density.png" alt="cpr dop" loading="lazy" />
            </Section>
          </>
        )}

        {tab === "rover" && (
          <>
            <Section name="Status" open>
              <KV k="State" v={done ? "Arrived" : reachable ? "Moving" : "Blocked"} cls={reachable ? "cyan" : "warn"} />
              <KV k="Latitude" v={fmtLat(roverLL && roverLL[0])} cls="cyan" />
              <KV k="Longitude" v={fmtLon(roverLL && roverLL[1])} cls="cyan" />
              <KV k="Ground speed" v="0.05 m/s" />
              <KV k="Route distance" v={`${lenM.toFixed(0)} m`} />
              <KV k="Waypoints" v={nodes} />
              <KV k="Chassis" v="6-wheel rocker-bogie" />
            </Section>
            <Section name="Navigation" tag="A* / D* Lite" open>
              <KV k="Planner" v="A* (live) / D* Lite" />
              <KV k="Route status" v={reachable ? "Found" : "Blocked"} cls={reachable ? "cyan" : "warn"} />
              <img className="figsm" src="/figures/haworth_detection_gate.png" alt="gate" loading="lazy" />
            </Section>
          </>
        )}

        {tab === "data" && (
          <>
            <Section name="Datasets" open>
              <KV k="Radar" v="Ch-2 DFSAR (L-band CP)" />
              <KV k="Imagery" v="Ch-2 OHRC 0.25 m" />
              <KV k="Context" v="LRO Diviner / LEND" />
            </Section>
            <Section name="Georeference" tag="OHRC" open>
              <KV k="Tile centre lat" v={fmtLat(grid?.geo?.center?.[0])} cls="cyan" />
              <KV k="Tile centre lon" v={fmtLon(grid?.geo?.center?.[1])} cls="cyan" />
              <KV k="Cell size" v={grid ? `${grid.res_m} m` : "--"} />
              <KV k="Source" v={grid?.geo?.source ? "g_grd geometry" : "--"} />
              <div className="hint">Coordinates are interpolated from the OHRC g_grd geometry table.
                The traverse runs on this OHRC tile; the DFSAR ice model is a separate south-polar product.
                The 3D Moon texture is illustrative, not geo-registered.</div>
            </Section>
            <Section name="Training" open>
              <img className="figsm" src="/figures/training_curves.png" alt="training" loading="lazy" />
              <img className="figsm" src="/figures/roc_pr.png" alt="roc" loading="lazy" />
            </Section>
            <Section name="Corroboration">
              <img className="figsm" src="/figures/nasa_context.png" alt="context" loading="lazy" />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

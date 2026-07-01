# Moon Ice Detection and Safe Rover Routing

An end-to-end system for detecting and quantifying subsurface water-ice in
permanently shadowed lunar south-pole craters from **Chandrayaan-2 DFSAR**
compact-polarimetry radar, and planning a safe autonomous rover traverse to it.

**Team:** Star Busters &nbsp;|&nbsp; Bharatiya Antariksh Hackathon 2026 (PS 8)

---

## What it does

1. **Ice detection.** Circular Polarization Ratio (CPR) and Degree of Polarization
   (DOP) are computed from DFSAR compact-pol data. Because rough rock also raises
   CPR, we use the combined signature **CPR > 1.0 and DOP < 0.13**, refined by a
   physics-informed U-Net that regresses a *continuous ice-fraction* per pixel
   (not a binary mask).

2. **Volume estimation.** The ice fraction is related to effective permittivity via
   the Carrier regolith-density profile and the Looyenga–Landau–Lifshitz mixing
   model, then integrated over the L-band sensing depth. Total volume is reported
   as an **estimate with a 95% Monte-Carlo confidence interval** — not a single
   number.

3. **Autonomous rover traverse.** The ice map becomes the goal for a hazard-aware
   planner: **A\*** for the global route and **D\* Lite** for live replanning under
   a local sensor horizon, obeying a 15° terramechanic slope limit and avoiding
   boulders/shadows. Visualised in an interactive 3D mission viewer.

## Notebooks

| Notebook | Description |
|---|---|
| `ice_detection_training.ipynb`     | v1 — baseline segmentation approach |
| `ice_detection_training_v2.ipynb`  | v2 — real-calibrated, physics-gated, full validation suite |
| `ice_detection_training_v3.ipynb`  | **v3 — ice-fraction regression + quantification (primary)** |

## 3D Mission Viewer (`web/`)

Interactive React + Three.js app: the Moon with the detected ice site, hazard
field, and a Pragyan-style rover that drives a live A\* route to the ice. Click the
surface to redeploy the rover; the route re-plans in real time. Live lunar
coordinates are read from the Chandrayaan-2 OHRC geometry.

```bash
cd web
npm install
npm run dev      # http://localhost:5173
```

## Data

Chandrayaan-2 DFSAR + OHRC (ISRO PRADAN) and LRO Diviner / LEND (NASA PDS) are
publicly available; large raw products are not included in this repository.

## Honest scope

The ice-fraction estimator is trained on physics-based synthetic data calibrated
to real DFSAR statistics. Reported volumes are model-based estimates with quantified
uncertainty, not direct measurements. The CPR/DOP signature is a necessary, not
sufficient, condition for ice.

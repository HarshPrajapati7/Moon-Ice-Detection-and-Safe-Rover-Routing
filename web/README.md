# Lunar Ice Rover Traverse - 3D Web Simulation

Interactive 3D visualization of the autonomous Pragyan-style rover driving a
hazard-aware D* Lite traverse over real Chandrayaan-2 OHRC terrain to the
DFSAR-detected ice target. Built with React + Three.js (react-three-fiber).

## Run
```bash
cd web
npm install
npm run dev
```
Then open http://localhost:5173.

## What you see
- Real OHRC terrain as the ground, with a red hazard overlay (shadows/boulders).
- The planned traverse (cyan line), landing site (green), and ice target (cyan cone).
- A six-wheeled Pragyan rover driving the route; the wheels rotate in proportion
  to distance travelled. Play / Pause / Replay in the bottom-left.
- "View Moon Globe" switches to the NASA Earth's-Moon model with a south-pole
  marker.

## 3D models
- `public/models/moon.glb` - NASA "Earth's Moon" 3D model (public domain),
  downloaded from solarsystem.nasa.gov. Already included.
- `public/models/pragyan.glb` - optional. The Pragyan rover is rendered
  procedurally by default (no download needed). If you want the Sketchfab model
  instead, download it from
  https://sketchfab.com/3d-models/chandrayaan-3-pragyan-rover-indian-moon-rover-0e00ee56594b45069bcf5674300512ba
  (requires a Sketchfab account; respect the model's license and attribution),
  save it as `public/models/pragyan.glb`, and the app will use it automatically.

## Data
The terrain and traverse come from the navigation pipeline. Regenerate with:
```bash
python scripts/export_web_assets.py
```
which writes `public/data/{terrain.png, hazard.png, path.json, meta.json}`.

## Notes
- The OHRC tile used here is ~75 km from the Haworth ice target, so the terrain
  is representative real lunar terrain, not a co-registered overlay (see the main
  project README for the honest scope).

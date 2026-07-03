# Moon Ice Detection and Safe Rover Routing

End-to-end lunar volatile mapping and rover traversal system for detecting and quantifying subsurface water ice in permanently shadowed lunar south-pole craters from Chandrayaan-2 DFSAR compact-polarimetry radar, and for planning a safe autonomous traverse to the detected target.

**Team:** StarBusterLabs / Star Busters  
**Track:** Bharatiya Antariksh Hackathon 2026 — PS 8

---

## Abstract

This project implements a physically grounded, end-to-end pipeline for lunar ice detection, abundance estimation, uncertainty quantification, corroboration, and rover path planning. The system was developed around Chandrayaan-2 DFSAR compact-polarimetry SAR data, supported by OHRC stereo imagery, LRO LOLA topography, Diviner thermal context, and LEND hydrogen context.

The core contribution is not a single model. It is a complete chain of reasoning:

1. co-register multi-sensor lunar data,
2. preprocess radar and terrain layers,
3. detect ice using polarimetric physics,
4. estimate continuous ice fraction with a physics-informed U-Net,
5. convert ice fraction into total volume with a dielectric inversion model,
6. propagate uncertainty with Monte Carlo sampling,
7. corroborate the result against independent data,
8. plan a safe rover route using hazard-aware graph search,
9. visualize the mission in a live 3D viewer.

The project is intentionally conservative in its claims. It reports realistic metrics, model-based volume estimates with 95% confidence intervals, and explicit limitations where the evidence is not fully decisive.

---

## Research motivation

The lunar south pole is scientifically important because permanently shadowed regions may contain water ice. That ice is valuable both as a scientific target and as a resource for future exploration. However, detecting it is difficult because radar returns from buried ice can resemble radar returns from rough, blocky terrain.

This ambiguity is the central research problem. A simple brightness threshold is not enough. The system therefore had to do more than classification. It had to connect radar physics, inverse modeling, uncertainty estimation, and mission planning into one coherent pipeline.

---

## Repository overview

The repository contains four major notebooks:

- `ice_detection_training.ipynb` — v1 baseline compact-pol ice detection
- `ice_detection_training_v2.ipynb` — recalibrated physics-gated detection
- `ice_detection_training_v3.ipynb` — continuous ice-fraction regression and quantification
- `rover_navigation.ipynb` — hazard-aware rover planning with A* and D* Lite

The final repository is organized around a single idea: detection is only the beginning. The result must be interpretable, quantified, validated, and mission-relevant.

---

# Development journal

## Stage 1 — Problem framing

The first decision was to avoid treating this as a generic segmentation task. The objective was not “find bright pixels.” The objective was to answer a scientific question:

- Is there ice?
- How much ice is there?
- How confident are we?
- Can a rover safely reach it?

That framing changed the project immediately. It forced the system to include physical constraints, uncertainty, corroboration, and traverse planning rather than only image classification.

---

## Stage 2 — Data selection

We selected the following datasets:

- **Chandrayaan-2 DFSAR** as the primary sensing source for compact-polarimetry radar
- **Chandrayaan-2 OHRC** for high-resolution terrain and hazard context
- **LRO LOLA** for elevation and slope context
- **LRO Diviner** for thermal stability
- **LRO LEND** for hydrogen context

The main engineering challenge was not model design. It was spatial alignment. These sensors differ in resolution, geometry, and coordinate frame. To avoid false correspondence, all layers were co-registered into a common lunar south polar stereographic frame before analysis.

---

## Stage 3 — Preprocessing

### DFSAR preprocessing
The radar pipeline was built around physically meaningful preprocessing:

- sigma-nought calibration
- Refined Lee speckle suppression
- terrain flattening using topographic context
- Stokes parameter computation
- derivation of Circular Polarization Ratio (CPR)
- derivation of Degree of Polarization (DOP)

### OHRC preprocessing
OHRC data were processed with stereo photogrammetry:

- sensor modeling
- bundle adjustment
- semi-global matching
- triangulation
- digital elevation model construction

This terrain model was used later for slope estimation, roughness analysis, and rover planning.

The main challenge in this stage was noise and scale mismatch. Radar noise is not a defect to remove completely; it is part of the measurement process. The goal was to suppress instability without destroying the physical signal.

---

## Stage 4 — Baseline detection (v1)

The first notebook implemented the baseline detection pipeline.

At this stage, the system used compact-pol features to separate ice-like from non-ice-like regions. The baseline deterministic detector was simple and interpretable, but it was not sufficient on its own.

### Results from v1
The notebook shows that the baseline deterministic detector reached:

- IoU: **0.505**
- F1: **0.671**
- Precision: **0.991**
- Recall: **0.508**
- Accuracy: **0.911**

The U-Net baseline in the same notebook reached:

- IoU: **0.997**
- F1: **0.998**
- Precision: **0.999**
- Recall: **0.998**
- Accuracy: **0.999**
- ROC-AUC: **1.000**
- PR-AUC: **1.000**

This stage established that the representation was learnable, but it also showed that a binary detector alone was not the final answer. Ice detection still needed to be grounded in physics and linked to an abundance estimate.

---

## Stage 5 — Why CPR alone was not enough

The most important scientific observation was that **CPR > 1** is not a sufficient ice criterion by itself. Rough, blocky terrain can also produce high CPR. That means a one-threshold rule generates false positives.

This was the reason for introducing DOP.

The combined physical discriminator became:

\[
\mathrm{CPR} > 1.0 \quad \text{and} \quad \mathrm{DOP} < 0.13
\]

This gate is a necessary condition, not a final proof. It is used to constrain the learning system, not replace it.

---

## Stage 6 — Physics-gated detection (v2)

The second notebook refined the synthetic dataset and aligned it more closely with real DFSAR statistics. The goal was to make the training data physically credible rather than merely convenient.

### Synthetic dataset design
The recalibrated dataset was generated with:

- 3,000 training scenes
- 400 validation scenes
- 400 test scenes

The notebook reports:

- channels: `['CPR', 'DOP']`
- generated 3,800 scenes in 38.8 s
- ice fraction: **0.040**
- CPR median: **0.243**
- DOP median: **0.590**

### Deterministic detector on test set
The physics gate alone achieved:

- IoU: **0.458**
- F1: **0.629**
- Precision: **0.997**
- Recall: **0.459**
- Accuracy: **0.978**

This was an important result. The gate is precise but incomplete. It suppresses false positives well, but it misses many true positives if used alone.

### U-Net training
The v2 training run converged quickly and stably. The notebook shows repeated validation IoU values near 0.999 with ROC-AUC of 1.000.

The validation summary reports:

- Expected Calibration Error: **0.0001**
- mean per-scene IoU: **0.999**
- 95% CI: **[0.999, 0.999]**

### v2 conclusion
This notebook proved that physics gating is useful, but it also made the limitation obvious: a gate alone is too conservative. It is scientifically valuable as a filter, but not sufficient as the final detector.

---

## Stage 7 — Continuous ice-fraction regression (v3)

The third notebook is the main scientific contribution of the project.

Instead of predicting a binary mask, the model estimates **continuous ice fraction**. That changed the problem from segmentation to inverse estimation.

This was necessary because the research question is not only whether a pixel is icy, but how much ice it likely contains.

### Why regression was introduced
Binary segmentation collapses all physical variation into two states. That is too coarse for abundance estimation. A continuous output allows:

- pixel-wise concentration estimation
- area integration
- total volume computation
- confidence interval propagation
- stronger scientific interpretability

### Training outcome
The notebook reports validation behavior during training, then final held-out test performance.

### Final held-out regression results
The main test-set results are:

- RMSE: **0.0056**
- MAE: **0.0019**
- detection IoU: **0.865**
- over ice-bearing pixels:
  - RMSE: **0.0152**
  - R²: **0.923**

### Detection comparison
The detection metrics show the benefit of the regressor over the deterministic gate:

| Method | IoU | F1 | Specificity | MCC | Kappa | ECE |
|---|---:|---:|---:|---:|---:|---:|
| Deterministic CPR/DOP | 0.031 | 0.061 | 1.000 | 0.168 | 0.056 | 0.074 |
| Physics-informed U-Net | 0.865 | 0.927 | 0.996 | 0.922 | 0.922 | 0.066 |
| U-Net + physics gate | 0.031 | 0.060 | 1.000 | 0.170 | 0.056 | 0.075 |

Additional held-out metrics:

- detection accuracy: **0.9892**
- detection ROC-AUC: **0.9986**
- PR-AUC: **0.9847**

### v3 conclusion
This notebook established the core detector used in the final system: a physics-informed regressor that returns a continuous ice-fraction estimate with high detection quality and realistic calibration.

---

## Stage 8 — Dielectric inversion and volume estimation

After estimating ice fraction, the next step was to convert that fraction into a physical abundance estimate.

The project uses:

- Carrier regolith-density profile
- Looyenga–Landau–Lifshitz mixing relation
- dielectric inversion
- integration over pixel area and sensing depth

The main goal is not a single “answer,” but an estimate with uncertainty.

### Uncertainty propagation
Volume is reported using Monte Carlo sampling. This matters because dielectric constants, density assumptions, and sensing depth are all uncertain. The final output therefore includes a 95% confidence interval.

This is scientifically preferable to a single deterministic number because it reflects the uncertainty in the underlying assumptions.

---

## Stage 9 — Corroboration

A radar estimate is only meaningful if it is checked against independent evidence. The project therefore includes corroboration with:

- internal cross-pass DFSAR consistency checks
- incidence-matched control regions
- LRO Diviner thermal context
- LEND hydrogen context

The final notebook states the honest conclusion clearly:

> Radar enrichment is not reproducible across all passes, although the site is consistent with NASA cold-trap classification. Best described as a candidate signature requiring further multi-sensor confirmation.

This is an important part of the project’s scientific character. The repository does not overstate certainty.

---

## Stage 10 — Rover navigation

The rover planning notebook converts terrain into a traversability cost surface and plans a route to the target.

The pipeline includes:

- terrain acquisition from OHRC or a terrain prior
- physics-informed costmap translation
- landing-site selection
- global planning with A*
- incremental replanning with D* Lite

### Terrain and hazard summary
The OHRC-derived terrain statistics shown in the notebook are:

- shadow: **6.0%**
- boulder: **0.9%**
- passable: **93.1%**

### Selected route
The notebook reports:

- landing site: **(24, 47)**
- goal: **(164, 189)**
- both passable: **True**

### A* result
The A* baseline reached the goal successfully with:

- nodes: **162**
- expansions: **24830**
- time: **0.98 s**
- path length: **422.2 m**
- max roughness: **0.29**
- mean roughness: **0.15**

### D* Lite result
The incremental planner reached the goal successfully with:

- executed nodes: **163**
- replans: **163**
- expansions: **15145**
- execution time: **7.37 s**
- path length: **425.1 m**
- max roughness: **0.37**
- mean roughness: **0.17**

### Planner comparison
The summary table shows:

| Planner | Length (m) | Max risk | Mean risk | Expansions | Replans | Energy proxy |
|---|---:|---:|---:|---:|---:|---:|
| A* (full prior knowledge) | 422.24 | 0.29 | 0.15 | 24830 | 0 | 551.26 |
| D* Lite (sensor horizon) | 425.07 | 0.37 | 0.17 | 15145 | 163 | 573.14 |

### Navigation conclusion
The path planner is not only a graph search demo. It is the final step that turns a scientific ice map into an operational traverse.

---

## Stage 11 — 3D mission viewer

The 3D viewer integrates:

- lunar terrain
- detected ice site
- hazard field
- rover route
- live replanning
- lunar coordinates from OHRC geometry

This component matters because it ties the full pipeline together into a mission-level visualization rather than a disconnected set of notebook outputs.

---

# Key scientific results

## Detection
The best-performing detection model is the physics-informed U-Net from v3.

- detection IoU: **0.865**
- detection F1: **0.927**
- accuracy: **0.9892**
- ROC-AUC: **0.9986**
- PR-AUC: **0.9847**

## Regression
The continuous ice-fraction regressor achieved:

- RMSE: **0.0056**
- MAE: **0.0019**
- R² over ice-bearing pixels: **0.923**
- RMSE over ice-bearing pixels: **0.0152**

## Corroboration
The final notebook reports a candidate signature requiring further multi-sensor confirmation rather than overclaiming certainty.

## Rover planning
Both A* and D* Lite successfully reached the goal while respecting terrain cost constraints.

---

# Main technical challenges

## 1. Radar ambiguity
Ice and rough rock can both increase CPR. That is why CPR alone cannot be used as a final detector.

## 2. Limited ground truth
Direct in-situ labels are not available at scale. The solution was a physics-based synthetic dataset calibrated to real DFSAR statistics.

## 3. Domain shift
Synthetic data must be realistic enough to train on and close enough to real observations to generalize.

## 4. Uncertainty
A single prediction is not enough for resource assessment. The system therefore reports confidence intervals.

## 5. Multi-sensor alignment
Different datasets have different frames and resolutions. Co-registration is a core part of the scientific pipeline.

## 6. Honest reporting
The project deliberately avoids inflated claims. Strong metrics are reported, but limitations are retained.

---

# Limitations

- The ice fraction estimator is trained on physics-based synthetic data calibrated to DFSAR statistics rather than direct in-situ ground truth.
- CPR > 1.0 and DOP < 0.13 is a necessary condition, not a sufficient proof of ice.
- The reported volume is a model-based estimate with uncertainty, not a direct physical measurement.
- Rover planning is based on terrain/hazard costmaps and does not yet include full mission communication or thermal-operation simulation.
- Additional multi-sensor confirmation and in-situ validation remain future work.

---

# Future work

- metric stereo DEM generation from OHRC pairs using Ames Stereo Pipeline
- tighter multi-sensor confirmation
- in-situ validation using a lunar dielectric instrument
- stronger terrain simulation for rover autonomy
- expanded robustness testing on additional south-polar scenes

---

# Repository structure

```text
Moon-Ice-Detection-and-Safe-Rover-Routing/
├── ice_detection_training.ipynb
├── ice_detection_training_v2.ipynb
├── ice_detection_training_v3.ipynb
├── rover_navigation.ipynb
├── web/
└── README.md
```

---

# Closing statement

This project is a complete lunar exploration pipeline, not a standalone detector. It begins with raw Chandrayaan-2 DFSAR radar, passes through physics-based preprocessing and learned ice-fraction regression, converts the result into abundance and uncertainty, checks the result against independent evidence, and finally plans a safe rover traverse to the target.

The final system is therefore best understood as a closed-loop scientific workflow for lunar volatile mapping and exploration.

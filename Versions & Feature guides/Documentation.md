# Electricsim Platform: Scientific Research Simulation Suite & Comprehensive Documentation

Welcome to the definitive architectural and user-facing documentation for the **Electricsim Platform**. Electricsim is a zero-dependency, high-fidelity physics research simulation suite built with vanilla JavaScript (ES6+), HTML5 Canvas 2D, and CSS3, engineered with a unified dark research-laboratory design system (`research-theme.css`).

This document provides a three-dimensional view of the entire codebase and platform:
1. **Repository & Laboratory Hierarchical Tree**: Every lab, sublab, support system, engine, test suite, and module file organized systematically.
2. **Technical Documentation & Architecture**: Deep-dive code specifications, mathematical foundations, data models, rendering pipelines, state engines, numerical solvers, and cross-file relationships for every lab and sublab.
3. **Non-Technical & Visual Explanation**: Direct, intuitive guides describing what users see on screen, visual cues, colors, animations, step-by-step interactive controls, and the pedagogical mission of each laboratory.

---

## 1. Repository & Laboratory Hierarchical Tree

```text
Electricsim/ (Workspace Root)
│
├── Platform Shell & Shared Infrastructure
│   ├── index.html                           # Central research hub (Simulations [5] & Virtual Labs [4] sections, compact colored cards)
│   ├── hub-search.js                        # Instant search & keyword filtering hiding empty sections dynamically
│   ├── shared-bg.js                         # Shared dynamic background engine (ambient animated grid & particle glow)
│   ├── research-theme.css                   # Unified dark research design system (colors, glass panels, colored gradient card titles)
│   └── style.css                            # Core utility styles and shared structural base styles
│
├── Lab 1: Electrostatics Simulator (2D Charge Physics)
│   ├── electrostatics.html                  # Main viewport, HUD overlays, object creation modal, keyboard shortcuts popover
│   ├── script.js                            # Complete electrostatics computational engine:
│   │   ├── RigidBody & PointCharge Models   # Discrete point charges, continuous lines, rings, conducting/dielectric spheres
│   │   ├── BEM Linear System Solver         # Boundary-Element Method with partial-pivoting Gaussian elimination for induction
│   │   ├── Field & Potential Integrators    # Coulomb superposition, scalar electric potential (V), force vectors (F = qE)
│   │   ├── RK4 Field Line Tracing Engine    # 4th-order Runge-Kutta adaptive stream tracing with Path2D rendering
│   │   └── Marching Squares Contour Engine  # Iso-potential scalar grid sampling and contour segment reconstruction
│   └── (Uses research-theme.css & style.css)
│
├── Lab 2: Gauss's Law Explorer (Flux & Enclosed Charge)
│   ├── gauss.html                           # 3D-perspective canvas viewport, surface configuration panel, live verification HUD
│   ├── gauss.css                            # Specialized CSS styling for Gaussian geometry controls and HUD metrics
│   └── gauss.js                             # Gauss's Law computational & pseudo-3D graphics engine:
│       ├── Geometry & Symmetry Models       # Point charge, infinite line, infinite plane, conducting & non-conducting spheres
│       ├── Analytical Flux & Field Solvers  # Closed-form Gauss equations (Φ = ∮ E · dA = Q_enc / ε₀)
│       └── Pseudo-3D Vector Renderer        # Orthogonal/axonometric projections, flowing chevron field lines, normal vectors
│
├── Capacitor Physics Explorer & Capacitor Networks (Separated Standalone Pages)
│   ├── capacitor.html                       # Standalone Capacitor Physics Explorer (`data-cap-mode="physics"`)
│   ├── capacitor-networks.html              # Standalone Capacitor Networks Lab (`data-cap-mode="network"`)
│   ├── capacitor.css                        # Styling for geometry controls, dielectric selector, tree inspector, and responsive mobile header
│   └── capacitor.js                         # Dual-mode engine reading `document.body.dataset.capMode`:
│       ├── Physics Explorer Engine
│       │   ├── Geometry Models              # Parallel-plate, coaxial cylindrical, and concentric spherical capacitors
│       │   ├── Dielectric Polarization      # Relative permittivity (κ), dielectric breakdown limits, electric displacement
│       │   ├── Electrostatic Dynamics       # Live charging/discharging transient circuit animation with battery and resistor
│       │   └── Field & Charge Vector Engine # Dynamic E-field line density rendering and accumulated plate charge glyphs
│       └── Capacitor Networks Engine
│           ├── Hierarchical Network Tree    # Recursive Series-Parallel tree data structure (`createGroupNode`, `createCapNode`)
│           ├── Equivalent Capacitance (C_eq)# Bottom-up recursive reduction solver (Series harmonic sum, Parallel direct sum)
│           ├── Top-Down Charge/Voltage Dist # Recursive voltage divider and charge conservation solver across subnets
│           └── PCB Schematic Auto-Layout    # Dynamic 2D schematic generator with responsive empty state, trace routing, and badges
│
├── Lab 4: Conductivity & Resistivity Explorer (Drude Transport)
│   ├── conductivity.html                    # Microscopic lattice window, wire geometry sliders, live SI multimeter HUD
│   ├── conductivity.css                     # Custom styling for thermal gradients, lattice viewport, and material pickers
│   └── conductivity.js                      # Microscopic electron transport & material physics engine:
│       ├── Material Database                # Cu, Al, Au, Fe, Carbon (Graphite), Constantan (ρ₀, temperature coefficient α, density n)
│       ├── Drude Scattering Particle Model  # Free electron gas, random thermal velocities (v_th), and field acceleration (a = eE/m)
│       ├── Spatial Hash Collision Engine    # High-performance lattice ion collision detection via grid-bucket hashing
│       ├── Thermal Lattice Dynamics         # Temperature-dependent ion vibration amplitude and phonon scattering probability
│       └── Macroscopic Ohm/Joule Solver     # ρ(T) = ρ₀(1 + αΔT), R = ρL/A, drift velocity v_d, current I, and Joule power P
│
├── Lab 5: Semiconductor Physics Simulation (Atomic Bonds & Transport)
│   ├── semiconductor.html                   # Single-crystal panel, closeup transfer stage, band energy diagram, event logger
│   ├── semiconductor.css                    # Grid styling, carrier legend indicators, and transfer state animators
│   ├── semiconductor-model.js               # Headless semiconductor physics & discrete teaching engine:
│   │   ├── Bulk Equilibrium Solver         # Mass action law (np = nᵢ²), Fermi level (E_F), carrier densities (n, p), conductivity
│   │   ├── 2D Silicon Lattice Model         # 4×7 atomic core grid, 2-electron covalent shared bond states, vacancy tracking
│   │   ├── Impurity Dopant Substitution    # Group V donors (Phosphorus) and Group III acceptors (Boron) with freeze-out
│   │   ├── Discrete Event State Machine     # Thermal generation, recombination, donor ionization, acceptor capture, and valence hops
│   │   └── Directed Drift & Contact Flow   # Electric field carrier bias, contact charge injection/extraction conservation
│   ├── semiconductor.js                     # Interactive presentation & multi-canvas synchronization controller:
│   │   ├── Canvas 1: Crystal Lattice View   # Particle rendering, electron wave clouds, bond occupancy, dopant core badges
│   │   ├── Canvas 2: Transfer Closeup Stage # Step-by-step valence transfer visualization (source bond A → receiving vacancy B)
│   │   └── Canvas 3: Band Energy Diagram    # Valence band (E_v), conduction band (E_c), Fermi level (E_F), and impurity levels
│
├── Virtual Lab: Circuits Lab (DC & AC Dynamics Workspace + Dual-Channel Oscilloscope)
│   ├── dc-circuit.html                      # Single-screen (100dvh desktop, responsive mobile) canvas, inspector, fixed-grid scope, 1 µA default scale
│   ├── dc-circuit.css                       # Viewport flex/grid styling, 3-column mobile tool grid, jitter-free CSS Grid scope telemetry chips
│   ├── dc-circuit-model.js                  # Document schema v1, inductors, LEDs, Zeners, bounding boxes, and validation checks
│   ├── dc-circuit-topology.js               # Union-Find net compiler, reference domains, and wire-current balance recovery
│   ├── dc-circuit-solver.js                 # Modified Nodal Analysis (MNA) solver, adaptive backward Euler, diodes, Zeners & transformers
│   ├── dc-circuit-analysis.js               # Series-parallel resistor reduction helpers and RC time-constant analysis
│   ├── dc-circuit-editor.js                 # Grid snapping (24px), obstacle-aware orthogonal A* routing, and route splitting
│   ├── dc-circuit-simulation.js             # Simulation clock, state lifecycle, undo/redo history, and transient time budgeting
│   ├── dc-circuit-renderer.js               # Path2D schematic rendering, IEEE/IEC glyphs, current markers, optical/thermal glow
│   ├── dc-circuit-presets.js                # Built-in educational circuits (rectifiers, ripple filter, Zeners, RLC ringing, transformers)
│   └── dc-circuit.js                        # Controller, dual-channel oscilloscope engine, pointer/touch gestures, 1 µA auto calibration
│
├── Virtual Lab: Logic Lab (`logic.html`, Standalone Gates & Boolean Algebra)
│   ├── logic.html                           # Standalone Logic Lab workspace (no mode toggle), top Boolean bar, left component sidebar
│   ├── logic.css                            # Shared 100dvh desktop layout & compact mobile horizontal-scroll palette bar (`<= 980px`)
│   ├── logic-model.js                       # Schema v1 (up to 12 inputs A–P, 8 outputs F–V, gates, MSI blocks, SR/D latches, History)
│   ├── logic-evaluator.js                   # Kahn topological sort, cycle detection, adaptive 16-bit/multi-input evaluator & latch relaxation
│   ├── logic-expression.js                  # Gate-to-AST builder, bidirectional gate hover spans, 4 notation printers
│   ├── logic-simplify.js                    # Isolated exact SOP/POS minimizer and Gray-code K-map builder
│   ├── logic-synthesis.js                   # Deterministic synthesizer (Minimal SOP/POS, Universal NAND-only & NOR-only)
│   ├── logic-editor.js                      # 24px grid snapping, pin hit-testing, and obstacle-aware orthogonal wire router
│   ├── logic-renderer.js                    # Canvas 2D renderer with IEEE distinctive-shape gates, MSI blocks & glow wires
│   ├── logic-presets.js                     # Curated gate & combinational presets (including 2-bit Ripple Adder)
│   └── logic.js                             # Main controller syncing canvas gestures, formula bar, truth table, and K-map
│
├── Virtual Lab: Electronics Lab (`electronics.html`, Standalone 74xx IC Bench)
│   ├── electronics.html                     # Standalone 74xx hardware bench workspace (no mode toggle), X-Ray internals, mobile swipe palette
│   └── logic-ic-lab.js                      # Complete 74xx DIP IC bench engine:
│       ├── 17-Chip 74xx DIP Catalog         # 10 DIP-14 gate ICs (7404..7427) + 7 MSI/Sequential ICs (7474, 7475, 74279, 74283, 74157, 74148, 7493)
│       ├── 9 Bench Circuit Components       # 5V Battery, GND, Toggle Switch, DIP-4 Switch Bank, 220Ω Resistor, LED Lamp, 1Hz Clock, Probe, 7-Seg
│       ├── Closed-Circuit Net Solver        # Union-Find net solver enforcing true ground return (`hasTrueGround`), VCC/GND & short protection
│       ├── Obstacle-Aware Wire Router       # 4-orientation rotation (`R`), package-bypass routing, draggable segments, hops & junctions
│       ├── X-Ray Datasheet Renderer         # Translucent DIP package rendering internal IEEE mini-gates & live pin-to-gate traces
│       └── 9 Curated 74xx Bench Presets     # Ready-to-run IC benches covering gates, adders, multiplexers, decoders, counters & latches
│
├── Versions & Feature guides/ (Platform Documentation & Guides)
│   ├── Documentation.md                     # Central architectural specification and comprehensive platform reference
│   └── FEATURES_GUIDE.md                    # Concise user-facing feature catalog covering all 9 simulations & virtual labs
│
└── Supplementary Verification Scripts (Optional)
    ├── hub-search.test.js                   # Verifies hub search filtering, 9 simulation/lab cards, 2 sections, and ARIA attributes
    ├── semiconductor-model.test.js          # Verifies carrier equilibrium, mass-action law, and doping calculations
    ├── dc-circuit.test.js                   # Verifies KVL/KCL, series/parallel reductions, and RC curves
    ├── dc-circuit.math.test.js              # Verifies MNA matrix solver accuracy across 360 circuit meshes
    ├── dc-circuit.improvements.test.js      # Verifies undo/redo state preservation and wire current calculations
    ├── dc-circuit.interaction.test.js       # Verifies component placement previews and drag interactions
    ├── dc-circuit.browser.test.js           # Verifies interactive circuit editing and mobile responsiveness
    └── logic-ic-lab.test.js                 # 5 systematic verification scans (22 checks) for Electronics Lab 74xx physics, MSI blocks, latches, routing & UI
```

---

## 2. Technical Documentation & Architecture

This section details the inner architecture, computational algorithms, data structures, and mathematical pipelines powering each laboratory.

```
                           +-------------------------------------------+
                           |           Electricsim Platform            |
                           |   (Vanilla ES6+, Canvas 2D, Zero Deps)    |
                           +-------------------------------------------+
                                                 |
                 +-------------------------------+-------------------------------+
                 |                                                               |
                 v                                                               v
   [ SIMULATIONS (5 Interactive Explorers) ]                       [ VIRTUAL LABS (4 Workbenches) ]
   +----------------------------------------+                      +----------------------------------------+
   | 1. Electrostatics (- RK4 / MarchSq/BEM)|                      | 6. Capacitor Networks (- Series/Parallel|
   | 2. Conductivity (- Drude / Phonon Hash)|                      |       Reduction & Transient RC Solver) |
   | 3. Gauss's Law (- 3D Proj / Analyt. E) |                      | 7. Logic Lab (- Gate / MSI / Latch/Eval)|
   | 4. Capacitor Physics (- Dielectric/Geom)|                      | 8. Electronics Lab (- 17x 74xx DIP ICs  |
   | 5. Semiconductor (- Mass Action / Bond)|                      |       & Breadboard Pin Routing)          |
   +----------------------------------------+                      | 9. Circuits Lab (- MNA LU / Euler /     |
                                                                   |       Dual-Ch Oscilloscope & Analysis) |
                                                                   +----------------------------------------+
```

### Lab 1: Electrostatics Simulator (`electrostatics.html`, `script.js`)

#### 1. System Architecture & Numerical Foundations
The electrostatics engine solves classical Poisson and Laplace electrostatic boundary-value problems on a continuous 2D plane:
$$\nabla^2 V = -\frac{\rho}{\varepsilon_0}, \quad \mathbf{E} = -\nabla V, \quad \mathbf{F}_{ij} = \frac{1}{4\pi\varepsilon_0} \frac{q_i q_j}{r_{ij}^2} \hat{\mathbf{r}}_{ij}$$

- **Point Charge Primitive (`PointCharge`)**: Contains 2D spatial coordinates $(x, y)$, scalar charge $q$, visual radius, and kinematics flags.
- **Rigid Bodies (`RigidBody`)**: Composite objects modeling distributed charge geometries:
  - `point`: Single concentrated charge.
  - `line`: Linear array of discrete charge segments parameterized along length $L$.
  - `ring`: Circumferential ring distribution with radius $R$ and uniform angular charge elements.
  - `sphere_conduct`: Conducting sphere maintaining equipotential surfaces.
  - `sphere_dielectric`: Polarizable dielectric sphere with bound surface charge distribution.

#### 2. Induced Charge Solver (Boundary Element Method)
When conducting bodies are introduced into an external electric field $\mathbf{E}_{\text{ext}}$, mobile electrons redistribute until the internal field vanishes and the conductor surface forms a single equipotential $V_0$:
$$V(\mathbf{r}_i) = \sum_{j=1}^M A_{ij} \sigma_j + V_{\text{ext}}(\mathbf{r}_i) = V_0$$
The engine discretizes the conductor perimeter into $M$ boundary elements. It constructs an $M \times M$ influence coefficient matrix $A_{ij}$ and solves for the unknown surface charge density distribution $\sigma_j$ using a Gaussian elimination solver with partial pivoting (`solveLinearSystem`). This guarantees numerical stability against matrix singularity during tight proximity interactions.

#### 3. RK4 Electric Field Line Tracing
Rather than naive Euler forward marching, field lines are traced using a 4th-order Runge-Kutta numerical integration scheme (`rk4Step`):
$$\mathbf{k}_1 = \mathbf{E}(\mathbf{x}_n), \quad \mathbf{k}_2 = \mathbf{E}\left(\mathbf{x}_n + \frac{h}{2}\frac{\mathbf{k}_1}{\|\mathbf{k}_1\|}\right), \quad \mathbf{k}_3 = \mathbf{E}\left(\mathbf{x}_n + \frac{h}{2}\frac{\mathbf{k}_2}{\|\mathbf{k}_2\|}\right), \quad \mathbf{k}_4 = \mathbf{E}\left(\mathbf{x}_n + h\frac{\mathbf{k}_3}{\|\mathbf{k}_3\|}\right)$$
$$\mathbf{x}_{n+1} = \mathbf{x}_n + \frac{h}{6}\left(\frac{\mathbf{k}_1}{\|\mathbf{k}_1\|} + 2\frac{\mathbf{k}_2}{\|\mathbf{k}_2\|} + 2\frac{\mathbf{k}_3}{\|\mathbf{k}_3\|} + \frac{\mathbf{k}_4}{\|\mathbf{k}_4\|}\right)$$
Seed points are distributed radially around each positive charge with an angular density proportional to charge magnitude $|q|$. Step size $h$ adapts dynamically based on local field gradient $\|\nabla \mathbf{E}\|$ to avoid numerical divergence near point charges.

#### 4. Equipotential Contour Generation (Marching Squares)
Scalar potential values $V(x, y) = \sum \frac{k q_i}{r_i}$ are sampled over a uniform 2D grid. The Marching Squares algorithm evaluates 16 topological cell configurations, performing linear interpolation along cell edges to extract zero-crossing coordinates and assemble smooth, closed iso-potential contour paths.

---

### Lab 2: Gauss's Law Explorer (`gauss.html`, `gauss.js`, `gauss.css`)

#### 1. Core Physics & Analytical Formulations
Gauss's Law relates net electric flux $\Phi_E$ through any closed surface to the net enclosed charge $Q_{\text{enc}}$:
$$\Phi_E = \oint_{\mathcal{S}} \mathbf{E} \cdot d\mathbf{A} = \frac{Q_{\text{enc}}}{\varepsilon_0}$$
The engine analytically evaluates electric field $\mathbf{E}$, surface area $A$, and enclosed flux across five canonical geometries:
- **Point Charge**: Spherical Gaussian surface of radius $r$.
  $$E(r) = \frac{1}{4\pi\varepsilon_0} \frac{Q}{r^2}, \quad A = 4\pi r^2, \quad \Phi_E = E \cdot A = \frac{Q}{\varepsilon_0}$$
- **Infinite Line Charge**: Gaussian coaxial cylinder of radius $r$ and length $L$.
  $$\lambda = \frac{Q}{L_{\text{ref}}}, \quad Q_{\text{enc}} = \lambda L, \quad E(r) = \frac{\lambda}{2\pi\varepsilon_0 r}, \quad A_{\text{side}} = 2\pi r L, \quad \Phi_E = E \cdot A_{\text{side}}$$
- **Infinite Plane Charge**: Cylindrical Gaussian pillbox of cross-sectional area $A_{\text{box}}$ bisecting the charged sheet.
  $$\sigma = \frac{Q}{A_{\text{ref}}}, \quad Q_{\text{enc}} = \sigma A_{\text{box}}, \quad E = \frac{\sigma}{2\varepsilon_0}, \quad A_{\text{caps}} = 2 A_{\text{box}}, \quad \Phi_E = 2 E A_{\text{box}}$$
- **Conducting Sphere**: Sphere of radius $R$. Charge resides entirely on the outer surface ($r = R$).
  $$E(r < R) = 0, \quad Q_{\text{enc}}(r < R) = 0; \quad E(r \ge R) = \frac{Q}{4\pi\varepsilon_0 r^2}, \quad Q_{\text{enc}}(r \ge R) = Q$$
- **Non-Conducting Uniform Solid Sphere**: Uniform volume charge density $\rho = \frac{Q}{\frac{4}{3}\pi R^3}$.
  $$Q_{\text{enc}}(r < R) = Q \left(\frac{r}{R}\right)^3, \quad E(r < R) = \frac{Q r}{4\pi\varepsilon_0 R^3}; \quad E(r \ge R) = \frac{Q}{4\pi\varepsilon_0 r^2}$$

#### 2. Graphics Pipeline & Pseudo-3D Orthographic Projection
The visualization maps 3D spatial manifolds onto a 2D Canvas context:
- Cylindrical surfaces are projected as axonometric hulls with elliptical endcaps rendered via parametric arc functions.
- Flowing chevron indicators are distributed along field vectors, with phase coordinates $\phi(t) = (x + v t) \pmod \lambda$ driven by `requestAnimationFrame`.
- Outward normal vectors $\hat{\mathbf{n}}$ and differential area elements $d\mathbf{A}$ are rendered as emerald vectors, verifying $\mathbf{E} \cdot \hat{\mathbf{n}} > 0$ (positive flux) and $\mathbf{E} \cdot \hat{\mathbf{n}} < 0$ (negative flux).

---

### Simulation 4 & Virtual Lab 6: Capacitor Suite (`capacitor.html`, `capacitor-networks.html`, `capacitor.js`, `capacitor.css`)

Both standalone pages share the unified `capacitor.js` engine and `capacitor.css` stylesheet, booting into their dedicated workspace via `document.body.dataset.capMode` (`"physics"` on `capacitor.html`, `"network"` on `capacitor-networks.html`) with no mode switcher.

#### Capacitor Physics Explorer (`capacitor.html`)
1. **Geometry Solvers**:
   - **Parallel Plate**: $C = \frac{\kappa \varepsilon_0 A}{d}$, $E = \frac{V}{d}$, $U = \frac{1}{2} C V^2$, $u_E = \frac{1}{2} \varepsilon E^2$.
   - **Coaxial Cylinders**: $C = \frac{2\pi \kappa \varepsilon_0 L}{\ln(b / a)}$, $E(r) = \frac{V}{r \ln(b / a)}$.
   - **Concentric Spheres**: $C = 4\pi \kappa \varepsilon_0 \left(\frac{a b}{b - a}\right)$, $E(r) = \frac{V a b}{(b - a) r^2}$.
2. **Dielectric Materials Database**:
   - Vacuum ($\kappa = 1.0$), Air ($\kappa = 1.00059$), Paper ($\kappa = 3.5$), Glass ($\kappa = 7.0$), Mica ($\kappa = 6.0$), Strontium Titanate ($\kappa = 310$).
3. **Transient Circuit Dynamics**:
   - Implements a charging/discharging state engine with animated switch controls:
     $$V_C(t) = V_{\text{batt}} \left(1 - e^{-t / RC}\right) \quad \text{(charging)}, \qquad V_C(t) = V_0 e^{-t / RC} \quad \text{(discharging)}$$
   - Particle flow along connecting leads simulates real-time electron transport into plate boundaries.

#### Capacitor Networks (`capacitor-networks.html`)
1. **Hierarchical Tree Representation**:
   Complex networks are modeled as recursive N-ary trees:
   - Leaf Node: Individual capacitor entity with unique identifier and base capacitance $C$.
   - Group Node: Composite container with combination type (`series` or `parallel`) and an array of child nodes.
2. **Recursive Bottom-Up Reduction Engine (`computeCapacitance`)**:
   $$C_{\text{eq, parallel}} = \sum_{i=1}^k C_i, \qquad \frac{1}{C_{\text{eq, series}}} = \sum_{i=1}^k \frac{1}{C_i} \implies C_{\text{eq, series}} = \left(\sum_{i=1}^k C_i^{-1}\right)^{-1}$$
3. **Top-Down Voltage & Charge Distribution (`distributeVoltageCharge`)**:
   Given root supply voltage $V_{\text{total}}$:
   - If group is **Parallel**: Each branch receives identical potential difference $V_i = V_{\text{parent}}$, and charge splits according to branch capacitance: $Q_i = C_i V_{\text{parent}}$.
   - If group is **Series**: Total branch charge is conserved: $Q_{\text{branch}} = C_{\text{eq}} V_{\text{parent}}$. Each child node receives identical charge $Q_i = Q_{\text{branch}}$, and voltage drops divide inversely: $V_i = \frac{Q_{\text{branch}}}{C_i}$.
4. **Schematic Graph Generator**:
   The renderer performs depth-first bounding box layout calculations, routing orthogonal wire traces, terminal connector nodes, and voltage/charge callout badges.

---

### Lab 4: Conductivity & Resistivity Explorer (`conductivity.html`, `conductivity.js`, `conductivity.css`)

#### 1. Classical Drude Electron Transport
The engine models conduction electrons as a classical Fermi gas undergoing stochastic lattice scattering:
- **Acceleration**: Under applied electric field $E = \frac{V}{L}$, each electron accelerates:
  $$\mathbf{a} = \frac{e E}{m_e} \hat{\mathbf{x}}$$
- **Random Thermal Velocity**: Superimposed on drift motion is 2D Maxwell-Boltzmann thermal velocity:
  $$v_{\text{th}} = \sqrt{\frac{2 k_B T}{m_e}}$$
- **Collision Dynamics & Relaxation Time $\tau$**:
  Electrons collide with vibrating lattice ions. After each collision event, drift momentum resets to a randomized isotropic scattering angle:
  $$v_d = \frac{e E \tau}{m_e} = \mu E, \quad I = n e A v_d$$

#### 2. High-Performance Spatial Hash Collision Grid
To simulate hundreds of electrons colliding with a dense crystal lattice at 60 FPS:
- The wire canvas is partitioned into a uniform spatial grid of bucket size `GRID_CELL_SIZE = 30px`.
- Lattice ions register into their corresponding hash cells: $\text{key} = \lfloor x / 30 \rfloor + \lfloor y / 30 \rfloor \times W_{\text{grid}}$.
- Electron collision queries execute in $O(1)$ constant time by only checking adjacent neighboring buckets.

#### 3. Temperature Dependence & Phonon Scattering
Lattice ions undergo harmonic displacement representing thermal phonon vibrations:
$$r_{\text{vib}}(T) \propto \sqrt{T}$$
Higher temperatures expand effective scattering cross-sections, shortening mean free time $\tau$. Macroscopic temperature dependence follows empirical linear coefficients:
$$\rho(T) = \rho_0 \left[1 + \alpha (T - T_0)\right], \quad R = \frac{\rho(T) \cdot L}{A}, \quad P = I^2 R = \frac{V^2}{R}$$
Materials with negative temperature coefficients (e.g., Carbon $\alpha = -0.0005$) properly demonstrate thermal resistance reduction.

---

### Lab 5: Semiconductor Physics Simulation (`semiconductor.html`, `semiconductor-model.js`, `semiconductor.js`)

#### 1. Bulk Equilibrium Physics & Mass Action Law
The headless physics engine (`semiconductor-model.js`) evaluates equilibrium carrier statistics in silicon ($E_g = 1.12\text{ eV}$):
- **Intrinsic Carrier Concentration**:
  $$n_i(T) = 1.5 \times 10^{10} \left(\frac{T}{300}\right)^{1.5} \exp\left[\frac{E_g}{2 k_B}\left(\frac{1}{300} - \frac{1}{T}\right)\right] \text{ cm}^{-3}$$
- **Impurity Ionization & Freeze-Out**:
  $$f_{\text{ion}}(T) = \frac{1}{1 + \exp\left(\frac{85 - T}{16}\right)}, \quad N_d^+ = N_d \cdot f_{\text{ion}}(T), \quad N_a^- = N_a \cdot f_{\text{ion}}(T)$$
- **Mass Action Equilibrium Solution**:
  $$\Delta = N_d^+ - N_a^-, \quad n = \frac{|\Delta| + \sqrt{\Delta^2 + 4 n_i^2}}{2} \quad (\text{for } \Delta \ge 0), \quad p = \frac{n_i^2}{n}$$
- **Mobility & Conductivity**:
  $$\mu_n = \frac{1350 \cdot (300 / T)^{1.35}}{1 + \left(\frac{N_d + N_a}{8 \times 10^{17}}\right)^{0.42}}, \quad \sigma = e (n \mu_n + p \mu_p), \quad J = \sigma E$$
- **Fermi Level Offset**:
  $$E_F - E_i = k_B T \ln\left(\frac{n}{n_i}\right)$$

#### 2. Discrete 2D Crystal Lattice State Machine
The crystal represents a 4×7 matrix of silicon atoms. Every bond between neighboring atoms contains two discrete electron orbital slots:
- **Thermal Generation**: When thermal energy activates a bond electron, the electron transitions to the mobile `free` array, leaving behind a vacant orbital slot (`vacancy`) with net local charge $+e$.
- **Acceptor Capture**: Boron atoms (Group III) possess only 3 valence electrons, creating a neutral deficient state that captures an electron from an adjacent Si-Si bond, creating a fixed negative ion $B^-$ and a mobile valence vacancy (hole).
- **Donor Ionization**: Phosphorus atoms (Group V) introduce an extra fifth electron weakly bound ($E_d \approx 0.045\text{ eV}$), which readily ionizes into the conduction band without creating a valence vacancy.
- **Valence-Band Electron Hopping**: Holes do not move as independent physical entities. When a hole moves, an electron from an adjacent occupied bond hops into the vacancy. The source bond becomes the new vacancy.
- **Recombination**: A free conduction electron encounters a vacancy, relaxing back into the covalent bond and eliminating both mobile carriers.

#### 3. Multi-Canvas Synchronized Presentation
The controller coordinates three concurrent Canvas viewports:
1. `crystalCanvas`: Main lattice rendering showing atomic cores, covalent bond bars, electron wave clouds, free carrier drift, and external contact injection.
2. `transferCanvas`: Magnified, slow-motion diagnostic viewport capturing individual transfer steps:
   - State 1: Occupied source bond A and target vacancy B.
   - State 2: Electron transit along a curved path avoiding atomic nuclei.
   - State 3: Target vacancy filled, source bond A becoming the newly registered vacancy.
3. `energyCanvas`: Band diagram showing energy levels ($E_c, E_v, E_F, E_d, E_a$) with marker dots representing electron energy states.

---

### Lab 6: Circuits Lab (`dc-circuit.html`, `dc-circuit-*.js`)

```
+---------------------------------------------------------------------------------------+
|                                  Circuits Lab Stack                                   |
+---------------------------------------------------------------------------------------+
|  dc-circuit.js            UI Controller, Pointer/Touch Dragging, Pan/Zoom, Inspector  |
+---------------------------------------------------------------------------------------+
|  dc-circuit-editor.js     Orthogonal A* Wire Router, 24px Grid Snapping, Bend Split   |
+---------------------------------------------------------------------------------------+
|  dc-circuit-simulation.js Discrete Timeline, Event Loop, Undo/Redo Stacks, Backlog   |
+---------------------------------------------------------------------------------------+
|  dc-circuit-topology.js   Union-Find Net Compiler, Reference Domains, Wire Current Rec|
+---------------------------------------------------------------------------------------+
|  dc-circuit-solver.js     Modified Nodal Analysis (MNA), Backward Euler, Diode & Xfmr|
+---------------------------------------------------------------------------------------+
|  dc-circuit-renderer.js   Path2D Canvas Glyphs, IEEE/IEC Symbols, Heat Glow, Markers  |
+---------------------------------------------------------------------------------------+
|  dc-circuit-model.js      Schema v1 Specification, Component Data Models, Validation  |
+---------------------------------------------------------------------------------------+
```

#### 1. Mathematical Solver Engine: Modified Nodal Analysis (`dc-circuit-solver.js`)
Circuits Lab solves arbitrary electrical networks by constructing and solving the standard MNA linear-algebraic matrix system:
$$\begin{bmatrix} \mathbf{G} & \mathbf{B} \\ \mathbf{C} & \mathbf{D} \end{bmatrix} \begin{bmatrix} \mathbf{v} \\ \mathbf{j} \end{bmatrix} = \begin{bmatrix} \mathbf{i} \\ \mathbf{e} \end{bmatrix}$$
- $\mathbf{G} \in \mathbb{R}^{N \times N}$: Conductance matrix from linear resistors, lamps, and conductance companions.
- $\mathbf{B} \in \mathbb{R}^{N \times M}$ and $\mathbf{C} \in \mathbb{R}^{M \times N}$: Incidence matrices enforcing terminal voltage constraints for independent voltage sources, capacitors, and transformers.
- $\mathbf{D} \in \mathbb{R}^{M \times M}$: Inter-source dependencies (e.g., ideal transformer coupling ratios).
- $\mathbf{v}$: Unknown node potential vector; $\mathbf{j}$: Unknown branch current vector through constrained elements.

The solver performs row/column scaling followed by LU decomposition with partial pivoting (`linearSolve`).

#### 2. Transient Analysis: Adaptive Backward Euler with Step Doubling
Dynamic components (capacitors and transformers) are discretized across time steps $h$:
- **Capacitor Companion Model**: Companion conductance $G_C = \frac{C}{h}$ in parallel with history current source $I_{\text{eq}} = \frac{C}{h} v_C(t_n)$.
- **Step Doubling Error Control**: The solver calculates trial solutions at full step $h$ and two half-steps $h/2$. If local truncation error exceeds tolerance, step size adapts dynamically.
- **8ms Simulation Budgeting**: Simulation time advances incrementally. If numerical calculations exceed 8ms in a single animation frame, computation yields back to the browser event loop, accumulating unsimulated time in a visible backlog queue without blocking UI interaction.

#### 3. Nonlinear Elements: Practical Diodes & Ideal Transformers
- **Piecewise Linear Diode Model**: Diodes switch between forward conducting state ($V_D \ge 0.7\text{ V}, R_{\text{on}} = 10^{-3}\,\Omega$) and reverse blocking state ($V_D < 0.7\text{ V}, G_{\text{off}} = 10^{-12}\text{ S}$). Convergence is obtained via Newton-Raphson iteration.
- **Ideal AC Transformer Model**: Enforces turns ratio $N_p : N_s$:
  $$\frac{v_{\text{sec}}}{v_{\text{pri}}} = \frac{N_s}{N_p} = n, \quad i_{\text{pri}} = -n \cdot i_{\text{sec}}$$
  Includes magnetizing inductance $L_m = 10\text{ H}$ and winding resistance $R_w = 1\text{ m}\Omega$ to handle open-circuit and DC conditions gracefully.

#### 4. Topological Compilation & Current Recovery (`dc-circuit-topology.js`)
- **Union-Find Equivalence**: Wires and closed switches are collapsed into discrete electrical nets using a disjoint-set data structure.
- **Independent Reference Domains**: Disconnected circuit islands operate with independent floating reference nodes without introducing artificial cross-coupling.
- **Wire Current Recovery**: Solved component terminal currents are injected into junction graph nodes. A breadth-first spanning tree recovery resolves individual wire segment currents while flagging cyclic wire loops where segment currents are mathematically indeterminate.

#### 5. Obstacle-Aware Routing & Visual Engine (`dc-circuit-editor.js`, `dc-circuit-renderer.js`)
- **Collision-Aware Routing**: Wire paths evaluate outward terminal stubs, candidate bounding box lanes, and orthogonal A* waypoints to bypass component symbols.
- **Junction Splitting**: Clicking an existing wire segment splits it cleanly, inserting a junction and maintaining existing waypoint geometry.
- **Current Motion Integration**: Phase markers integrate signed distance $s(t) = \int I(t)\,dt$, guaranteeing that visual speed directly reflects current magnitude and reverses smoothly with alternating current.

#### 6. Virtual Dual-Channel Oscilloscope, Flow Scale & Topology Analysis (`dc-circuit-analysis.js`, `dc-circuit.html`, `dc-circuit.css`)
- **Oscilloscope Measurement Fidelity**: Samples true simulated node voltages (`CH1`) and component currents (`CH2`) across `scopeTargetSelect`, with `scopeTimebaseSelect`, `scopeZoomRippleBtn` (AC ripple magnification), `scopeInvertBtn`, `scopeClearBtn`, and real-time trigger stability matching physical scope measurements.
- **Fixed-Geometry Telemetry Readout (`.dc-scope-stats`)**: Uses a locked 7-cell CSS Grid (`minmax(0, 1fr)` / 2-column grid on mobile) with constant cell dimensions and monospace alignment (`font-variant-numeric: tabular-nums`) so rapidly updating `CH1 V(t)`, `Vrms`, `Vdc`, `Vpp`, `Freq`, `CH2 I(t)`, and `Energy` chips remain rock-steady with zero vertical jumping.
- **Default `1 µA` Flow Calibration**: `#flowScale` defaults automatically to `1 µA` (`value="0.000001"` `selected`) and calls `calibrate()` on initialization so sub-milliamp micro-currents animate smoothly on first launch without manual scaling.
- **Series-Parallel & RC Reduction Helper (`dc-circuit-analysis.js`)**: Provides symbolic series-parallel equivalent resistance ($R_\text{eq}$) graph reduction and $RC$ time constant ($\tau = R_\text{Th} C$) validation alongside the MNA matrix engine.

---

### Virtual Lab 7: Logic Lab (`logic.html`, `logic-model.js` – `logic.js`)

**Logic Lab** is a standalone digital gate, combinational MSI, and sequential latch simulator (`data-logic-mode="gates"`) running in a zero-scroll (`100dvh`) desktop shell (and responsive mobile layout at `<= 980px` with a swipeable 2-row horizontal component strip).

```
+---------------------------------------------------------------------------------------+
|                          Logic Lab Architecture (Standalone)                          |
+---------------------------------------------------------------------------------------+
| logic.js            UI, Formula Bar, K-Map, & Interactive Truth Table                 |
| logic-editor.js     Grid Workspace, Undo/Redo, Selection & 90° Wire Router            |
| logic-renderer.js   IEEE Gates, MSI Blocks, Sequential Latches & Live Wire Glow       |
| logic-synthesis.js  Deterministic SOP / POS / Universal NAND / Universal NOR          |
| logic-simplify.js   81-Cube Exact Boolean Minimizer (<= 4 variables)                  |
| logic-expression.js AST Builder & 4 Notations (Eng, Overbar, Symbolic, Code)          |
| logic-evaluator.js  16-Bit Bitwise Engine + Extended Multi-Input / MSI / Latch Eval   |
| logic-model.js      Schema v1, History Stack, 12 Inputs (A-P) & 8 Outputs (F-V)       |
+---------------------------------------------------------------------------------------+
```

#### 1. Hybrid Truth-Mask & Extended Evaluators (`logic-evaluator.js`)
- **16-Bit Bitwise Fast Path ($\le 4$ inputs `A, B, C, D`)**: Every signal's full 16-row truth table fits inside an unsigned 16-bit integer (`0xFF00`, `0xF0F0`, `0xCCCC`, `0xAAAA`), evaluated via Kahn topological sort and $O(1)$ bitwise instructions (`&`, `|`, `^`, `(~x) & 0xFFFF`).
- **Expanded I/O & MSI / Latch Support**: Supports up to **12 inputs (`A–P`)** and **8 outputs (`F–V`)**, combinational MSI functional blocks (`HA`, `FA`, `MUX2`, `MUX4`, `ENC42`, `DEC24`, `COMP2`), and sequential latches (`SR_LATCH`, `D_LATCH`) with stateful hold behavior. Any non-sequential feedback loop remaining with `inDegree > 0` after topological exhaustion is safely flagged `loop: true` without hanging.

#### 2. Expression AST & Bidirectional Gate Highlighting (`logic-expression.js`)
- Walks backward from active output terminals (`F–V`) to construct an operator-precedence AST (`NOT` > `AND`/`NAND` > `XOR`/`XNOR` > `OR`/`NOR`).
- Renders `<span class="logic-expr-gate" data-node-id="...">` wrappers so hovering any sub-expression in the Formula Bar illuminates the corresponding gate and its output wires on `#logicCanvas`.
- Supports 4 live notation printers: **Engineering** (`A·B + A'`), **Textbook Overbar** (`A·B + A̅`), **Symbolic** (`(A ∧ B) ∨ ¬A`), and **Code** (`(A && B) || !A`).

#### 3. Isolated 81-Cube Exact Boolean Minimizer (`logic-simplify.js`)
- **Complete Architectural Isolation**: Accepts only `{ vars, mask16 }` and returns plain data structures with zero DOM, canvas, or schematic coupling.
- **Exact $3^k \le 81$ Cube Search**: Enumerates all $3^k$ product cubes over $k \le 4$ active variables, extracts Prime Implicants by subsumption, locks in Essential Prime Implicants, and solves cyclic charts via branch-and-bound minimizing `(termCount, literalCount)`. Evaluates De Morgan dual on `(~truth) & fullMask` for exact Minimal POS.

#### 4. Deterministic 3-Column Universal Gate Synthesis (`logic-synthesis.js`)
- Rewrites valid combinational schematics into **Minimal SOP**, **Minimal POS**, **Universal NAND-Only**, or **Universal NOR-Only** aligned across fixed grid columns (`Inputs → Shared Inverters → Term Gates → Output Combining Gate → Outputs`), balancing fan-in chunks (`fanIn <= 4`) and self-verifying `newMask16 === oldMask16` prior to `History` commit.

---

### Virtual Lab 8: Electronics Lab — 74xx DIP Breadboard (`electronics.html`, `logic-ic-lab.js`)

**Electronics Lab** is a completely standalone 74xx-series breadboard workbench (`data-logic-mode="ic"`, decoupled from Logic Lab's gate palette) featuring authentic DIP ICs, closed-circuit power/ground physics, live pin telemetry, and responsive mobile swipe palettes.

#### 1. Expanded 17-Chip 74xx DIP Catalog (`IC_CATALOG`)
Integrated circuits are cataloged strictly by **74xx part numbers** using standard counterclockwise DIP-14 (bottom `1–7` with `7 = GND`, top `8–14` with `14 = +5V VCC`) and DIP-16 (bottom `1–8` with `8 = GND`, top `9–16` with `16 = +5V VCC`) pinouts:
- **1-Input Hex Inverter**: `7404` (`1→2, 3→4, 5→6, 9→8, 11→10, 13→12`)
- **2-Input Quad Gate ICs**: `7400` (NAND), `7402` (NOR, authentic reversed `2,3→1` pinout), `7408` (AND), `7432` (OR), `7486` (XOR), `74266` (XNOR)
- **3-Input Triple Gate ICs**: `7410` (NAND), `7411` (AND), `7427` (NOR)
- **Latches, Flip-Flops, MSI & Counters**: `7474` (Dual D Flip-Flop), `7475` (4-Bit Bistable Latch), `74279` (Quad $\overline{S}\overline{R}$ Latch), `74283` (4-Bit Binary Full Adder, DIP-16), `74157` (Quad 2-to-1 Multiplexer, DIP-16), `74148` (8-to-3 Priority Encoder, DIP-16), `7493` (4-Bit Binary Ripple Counter)

#### 2. Strict Closed-Circuit & Ground Return Solver (`evaluateICBench`)
- **9 Bench Components**: `Battery (+5V / −)`, `Switch`, `DIP-4 Switch Bank`, `1Hz Clock`, `220 Ω Resistor`, `LED Lamp`, `7-Segment Display`, `Logic Probe`, and `GND Terminal`.
- **Passband Passive & Switch Bridging**: Closed switches and `220 Ω` series resistors bridge connected nets via a Union-Find disjoint-set compiler.
- **True Ground Return Tracking (`net.hasTrueGround`)**: A net only qualifies as a valid ground return (`0V`) if connected to a real low-impedance `0V` sink (`Battery (−)`, `GND` terminal, an active-low powered IC gate output, or a closed standalone switch in `0` state). Open switches never provide a ground return path.
- **IC Power Rail Validation**: Unless the optional *Auto-Power VCC/GND* bench helper is enabled, every 74xx IC requires valid `VCC` and `GND` rails; reversed polarity triggers an immediate `⚠ REVERSE POWER!` fault.
- **Strict Lamp Illumination Physics**: An indicator Lamp illuminates **if and only if** `Anode === 1 (+5V)` **AND** `Cathode === 0 (GND)` with `cathodeNet.hasTrueGround === true`; otherwise an active anode without a ground return displays an amber **`OPEN GND`** badge.

#### 3. X-Ray Datasheet Overlay, Presets & Mobile Breadboard UX
- **Translucent X-Ray Package Rendering**: Every 74xx DIP chip renders internal IEEE gate symbols or MSI function labels plus internal traces linking pins to internal logic; hovering or selecting an IC populates the **Live Pin State Monitor** (`H` / `L` / `Z`) in the floating inspector.
- **Visual Wire State Differentiation**: `+5V (HIGH)` (glowing cyan `#3dd9ff`), `0V (Grounded LOW)` (slate-blue `#59677f` with `0V` badge), `OPEN` (dashed muted gray with `OPEN` badge), and `SHORT / CONTENTION` (red warning glow `#ff5a52`).
- **9 Ready-to-Run Presets & Mobile Ergonomics**: Includes 9 starter circuits (basic gates, MSI arithmetic/muxing, sequential latches/counters) and mirrors Logic Lab's 4-angle `R` rotation, obstacle-aware routing, parallel lane separation, and compact `<= 980px` horizontal 2-row swipe palette.

---

## 3. Non-Technical & User Experience Guide

This section is written from the user's perspective, providing a visual and experiential tour of what is seen on screen, how controls behave, and how each simulation imparts deep physical intuition.

```
+---------------------------------------------------------------------------------------+
|                                Electricsim Central Hub                                |
|    [ Kicker: Scientific simulation suite ]                                            |
|    Title: Electricsim Platform                                                        |
|    Dedication: Developed by Zeyad Mahmoud · Faculty of Engineering at Shoubra         |
|    Metrics: [ 9 modules ]  [ Live SI measurements ]  [ Cause->Effect ]                |
|                                                                                       |
|    [ Find a lab: Search by name or topic...                           ] [Clear]       |
|    Live Output: 9 modules                                                             |
+---------------------------------------------------------------------------------------+
|  SIMULATIONS  ----------------------------------------------------------------------  |
|  [ Electrostatics Simulator ]  [ Conductivity Explorer ]   [ Gauss's Law Explorer ]     |
|  [ Capacitor Physics Explorer ] [ Semiconductor Physics Simulation ]                    |
|                                                                                       |
|  VIRTUAL LABS  ---------------------------------------------------------------------  |
|  [ Capacitor Networks ]  [ Logic Lab ]  [ Electronics Lab ]  [ Circuits Lab ]         |
+---------------------------------------------------------------------------------------+
```

---

### Central Hub (`index.html`)
- **Two Dedicated Sections with Section Rules**: Divides the platform into **Simulations** (5 standalone physics & carrier explorers: *Electrostatics Simulator*, *Conductivity Explorer*, *Gauss's Law Explorer*, *Capacitor Physics Explorer*, and *Semiconductor Physics Simulation*) and **Virtual Labs** (4 interactive circuit & digital engineering workbenches: *Capacitor Networks*, *Logic Lab*, *Electronics Lab*, and *Circuits Lab*), separated by styled `.hub-section-header` title + divider rules.
- **Compact Color-Accented Cards**: Deep obsidian-black background paired with compact card heights (`92px` on desktop, `74px` on mobile), custom gradient accent colors (`--accent-a` / `--accent-b`) plus top edge shimmer bars per card (`data-card-accent`), and larger centered titles without secondary `.card-meta` upper labels.
- **Instant Search & Empty-Section Hiding**: Typing any topic or keyword dynamically filters across all 9 cards via `hub-search.js` and automatically hides empty section containers (`[data-hub-section]`). Pressing `Escape` or clicking `Clear` restores all 9 modules (`9 modules`).
- **Mobile Responsiveness**: Responsive layout (`<= 600px`, `<= 480px`) adapts seamlessly down to smartphone viewports with stacked hero headers and balanced 2-column or compact vertical cards.

---

### Lab 1: Electrostatics Simulator (`electrostatics.html`)

```
+---------------------------------------------------------------------------------------+
| Electrostatics Simulator                                              [ ? Shortcuts ] |
| HUD: Pos: (1.20, -0.45) m | E: 4.82e3 V/m | V: 1.25e3 V | Zoom: 1.0x  [ Hub Button  ] |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|               ( + ) --------> Field Lines (Cyan RK4 curves) --------> ( - )           |
|                 |                                                       |             |
|                 + - - - - - - [Equipotential Contours (Gold)] - - - - - +             |
|                                                                                       |
|       [ Conducting Sphere ] <--- Surface charges rearrange automatically              |
|                                                                                       |
+---------------------------------------------------------------------------------------+
| Toolbar: [ + Add Object ]  [ Clear All ]  [x] Field Lines  [x] Potentials  [x] Forces |
+---------------------------------------------------------------------------------------+
```

#### What You See on the Screen
- **The World Canvas**: An infinite dark workspace where electric charges live. Hovering your mouse moves an inspection reticle, continuously updating local field strength $\mathbf{E}$ (in V/m) and electric potential $V$ (in Volts).
- **Field Lines**: Smooth, luminous cyan streamlines radiating outward from positive charges and terminating on negative charges.
- **Equipotential Contours**: Shimmering golden concentric contours representing lines of equal voltage, running perpendicular to field lines everywhere.
- **Force Vectors**: Bright red vectors pointing along the direction of electrostatic forces ($F = qE$) acting on each object.

#### What You Can Do & How to Interact
1. **Adding Objects**: Click **+ Add Object** to open a configuration modal. Choose between a single Point Charge, Charged Line, Charged Ring, or Conducting/Dielectric Sphere. Adjust charge magnitude with a live slider.
2. **Dragging & Moving**: Click and drag any charge around the canvas. Field lines and voltage contours bend, stretch, and update in real time at 60 frames per second.
3. **Observing Induction on Conductors**: Place a neutral conducting sphere between positive and negative charges. Watch as negative surface charges rush to the positive side and positive charges get repelled to the other side, shielding the interior of the sphere to maintain zero internal field.
4. **Canvas Gestures**: Click and drag empty space to pan; scroll the mouse wheel or pinch on touchscreens to zoom. Press `Delete` or right-click any charge to remove it.

---

### Lab 2: Gauss's Law Explorer (`gauss.html`)

```
+---------------------------------------------------------------------------------------+
| Gauss's Law Explorer                                                    [ Hub Button ]|
| Concept: Enclosed charge  -->  Surface flux  -->  Phi = Q_enc / epsilon_0             |
+---------------------------------------------------------------------------------------+
|                                    | Surface Configuration                            |
|             Gaussian Cylinder      | Geometry: [ Infinite Line Charge v ]             |
|           /-------------------\    | Charge (Q): [======o=====] 10.0 uC               |
|          |    ========+========|   | Gauss Radius (r): [===o======] 2.5 m             |
|          |    |||||||||||||||| |   | Length (L): [========o===] 4.0 m                 |
|           \-------------------/    |--------------------------------------------------|
|             \--> E-field chevrons  | Live Measurements                                |
|                                    | Q_enclosed: 10.00 uC                             |
|                                    | E at surface: 1.44e4 V/m                         |
|                                    | Net Flux (Phi): 1.13e6 N*m^2/C                   |
|                                    | Gauss Verification: 100.00% MATCH                |
+---------------------------------------------------------------------------------------+
```

#### What You See on the Screen
- **3D Perspective Visualization**: A charge geometry (point, line, sheet, or sphere) suspended in 3D space, surrounded by a semi-transparent emerald Gaussian surface (sphere, cylinder, or pillbox).
- **Flowing Chevrons**: Directional field arrows flow outward through the Gaussian surface like water flowing through a translucent net.
- **Surface Normal Vectors**: Outward-pointing green arrows showing the orientation of surface area vectors $d\mathbf{A}$.
- **Verification HUD**: A live mathematical dashboard displaying $Q_{\text{enc}}$, Surface Area $A$, Field Strength $E$, Computed Surface Flux $\oint \mathbf{E} \cdot d\mathbf{A}$, and the theoretical value $\frac{Q_{\text{enc}}}{\varepsilon_0}$, confirming that they match to four decimal places.

#### What You Can Do & How to Interact
1. **Selecting Geometries**: Switch between a Point Charge, Infinite Line Charge, Infinite Plane, Conducting Sphere, and Solid Insulating Sphere.
2. **Changing Radius ($r$)**: Drag the radius slider. For a point charge, observe that doubling radius expands surface area by $4\times$, while field strength drops to $1/4\times$, keeping total flux crossing the surface **strictly constant**.
3. **Exploring Insulating Spheres**: Expand and contract the Gaussian surface inside and outside the solid sphere. Inside the sphere ($r < R$), see flux grow as more volume is enclosed; outside the sphere ($r > R$), see flux remain constant.

---

### Simulation 4 & Virtual Lab 6: Capacitor Physics Explorer (`capacitor.html`) & Capacitor Networks (`capacitor-networks.html`)

Both capabilities now launch as clean, dedicated standalone pages from the Hub without top-bar mode toggles:

```
+---------------------------------------------------------------------------------------+
| Capacitor Physics Explorer (capacitor.html)           | Capacitor Networks (capacitor-networks.html)
+-------------------------------------------------------+-------------------------------+
|       + Plate (+Q)                 |     +---[ C1: 10 uF ]---+                        |
|   =====================            | ----|                   |---- (Total C_eq = 15uF)|
|   |  Dielectric (k)   | E-Field    |     +---[ C2: 5 uF  ]---+                        |
|   ===================== Lines      |                                                  |
|       - Plate (-Q)                 | Hierarchy Inspector:                             |
| Sliders: Voltage, Area, Separation |  - Root: Parallel Group (C_eq = 15 uF)           |
| Measurements: C, Q, Stored Energy  |    |- C1: 10 uF (Q = 120 uC, V = 12 V)           |
+------------------------------------+--------------------------------------------------+
```

#### Capacitor Physics Explorer (`capacitor.html`)
- **What You See**: A high-resolution cross-section of a capacitor connected to a DC supply. Positive charges accumulate on one plate, negative charges on the other, while dense field lines span the dielectric gap.
- **Interactive Controls**:
  - Switch geometry between Parallel Plate, Cylindrical, and Spherical capacitors.
  - Slide plate separation distance $d$ closer and watch capacitance $C$ and stored charge $Q$ shoot upward.
  - Insert different dielectric slabs (Vacuum, Glass, Mica, Strontium Titanate) and observe the instantaneous drop in internal electric field and boost in capacitance.
  - Click **Charge / Discharge / Disconnect** to toggle switches and watch electrons flow through connecting wires into the capacitor during charging or discharge through a load resistor.

#### Capacitor Networks (`capacitor-networks.html`)
- **What You See**: An interactive circuit board canvas where complex series-parallel capacitor networks can be constructed and evaluated.
- **Interactive Controls**:
  - Add individual capacitors or group them in Series or Parallel.
  - Click on any component to edit its capacitance in microfarads ($\mu\text{F}$).
  - The tree inspector instantly calculates equivalent capacitance $C_{\text{eq}}$, total charge $Q_{\text{total}}$, and energy $U$.
  - Selecting any sub-branch reveals the exact voltage drop and stored charge across that specific component, teaching voltage division and charge conservation rules visually.

---

### Lab 4: Conductivity & Resistivity Explorer (`conductivity.html`)

```
+---------------------------------------------------------------------------------------+
| Conductivity & Resistivity Explorer                                     [ Hub Button ]|
| Concept: Material + Temperature  -->  Resistance R  -->  Current I                    |
+---------------------------------------------------------------------------------------+
|                                    | Wire Configuration                               |
|        (-) Terminal   (+) Terminal | Material: [ Copper (Cu)       v ]                |
|       +--------------------------+ | Length (L): [===o======] 1.0 m                   |
|       |  (e-) -> (O) <- (e-)     | | Area (A):   [======o===] 1.0 mm^2                |
|       |    (O)    \   (O)    (O) | | Temp (T):   [===o======] 20 °C (293 K)           |
|       |  (e-) --> (O)       (e-) | | Voltage:    [=====o====] 5.0 V                   |
|       +--------------------------+ |--------------------------------------------------|
|          Lattice Ion Vibrations    | Multimeter HUD                                   |
|                                    | Resistivity (rho): 1.68e-8 Ohm*m                 |
|                                    | Resistance (R):    0.017 Ohm                     |
|                                    | Current (I):       297.6 A                       |
|                                    | Drift Speed (v_d): 1.8 mm/s                      |
+---------------------------------------------------------------------------------------+
```

#### What You See on the Screen
- **Microscopic View**: The inside of a metal wire. Golden lattice ions sit in a regular crystal grid, vibrating with thermal energy. Cyan electron particles race through the lattice, undergoing constant billiard-ball collisions.
- **Thermal Heat Glow**: As temperature increases, the wire develops an amber thermal glow, and lattice ions shake violently.
- **Drift Motion vs. Chaos**: Without voltage, electrons bounce in random directions with zero net progress. When voltage is applied, an electric field arrow points down the wire, gently steering the chaotic swarm into a steady, collective drift velocity.
- **Multimeter HUD**: Real-time readouts of Resistivity $\rho$, Resistance $R$, Current $I$, Drift Velocity $v_d$, and dissipated Joule Power $P$.

#### What You Can Do & How to Interact
1. **Material Testing**: Switch between Copper, Aluminum, Gold, Iron, Carbon (Graphite), and Constantan. Notice how gold conducts with minimal resistance while iron exhibits frequent scattering.
2. **Heating & Cooling**: Drag temperature from $-200^\circ\text{C}$ to $+500^\circ\text{C}$. Watch the atoms vibrate with violent amplitude. In copper, collisions multiply and current drops; in Carbon, resistance decreases due to its negative temperature coefficient!
3. **Geometry Scaling**: Stretch wire length $L$ to watch resistance rise proportionally; widen cross-sectional area $A$ to provide more parallel paths, reducing resistance.

---

### Lab 5: Semiconductor Physics Simulation (`semiconductor.html`)

```
+---------------------------------------------------------------------------------------+
| Semiconductor Physics Simulation [ Intrinsic / N-type / P-type ]       [ Reset Sample]|
+---------------------------------------------------------------------------------------+
|  [Canvas 1: Silicon Crystal Lattice]     | [Canvas 3: Band Energy Diagram]            |
|       (Si) === (Si) === (Si)             |   Conduction Band (Ec)   [ - - - ] (Free e)|
|        ||       ||       ||              |   --------------------------------------   |
|       (Si) === ( P+ ) == (Si)            |   Donor Level (Ed)       [ . . . ]         |
|        ||       ||       ||              |   Fermi Level (Ef)       - - - - -         |
|       (Si) === (Si) === (Si)             |   Acceptor Level (Ea)                      |
|                                          |   --------------------------------------   |
|   Legend: [o] Bond [o] Free [o] Hole     |   Valence Band (Ev)      [ o o o ] (Bonds) |
|------------------------------------------+--------------------------------------------|
|  [Canvas 2: How a Hole is Filled - Slow Motion Closeup]                               |
|       Bond A (Occupied) -------> Electron Transfers -------> Bond B (Vacancy)         |
|       Step 1: State Identified  -> Step 2: Transit -> Step 3: Vacancy Relocated       |
|---------------------------------------------------------------------------------------|
|  Controls: [ Pause ] [ Step Event ] Speed: [ 1x v ] [ Follow Electron ] [ Follow Hole ]|
+---------------------------------------------------------------------------------------+
```

#### What You See on the Screen
- **The Crystal Lattice**: A 2D slice of a pure silicon crystal. Every pair of silicon atoms shares two bright covalent bond electrons.
- **The Three Carrier Types**:
  - *Bound Electrons* (White dots): Snugly seated inside covalent bond rungs.
  - *Conduction Electrons* (Cyan glowing spheres): Free to roam across the crystal.
  - *Holes* (Amber rings): Vacant bond slots where an electron is missing.
- **The Dopants**: Purple phosphorus cores ($P^+$) releasing donor electrons, and pink boron cores ($B^-$) capturing electrons to create holes.
- **The Magnified Closeup Viewport**: When an electron hops from bond to bond, this lower panel slows down time, highlighting Bond A and Bond B to demonstrate how hole motion is simply valence electrons moving in the opposite direction.
- **The Band Energy Diagram**: A synchronized vertical energy chart showing energy levels ($E_c, E_v, E_F$). Watch dots jump between the valence band, impurity levels, and conduction band.

#### What You Can Do & How to Interact
1. **Try Presets**: Click **Frozen (0 K)** (all carriers locked in bonds), **Warm crystal** (thermal generation creates electron-hole pairs), **N-type** (phosphorus doping floods crystal with free electrons), or **P-type + current** (boron doping creates abundant holes).
2. **Follow a Particle**: Click any electron or hole and press **Follow**. The camera tags that individual carrier, letting you track its path across the crystal.
3. **Step-by-Step Mode**: Pause the simulation and click **Step one event** to advance physics one reaction at a time: watch a single bond break, follow the electron into the conduction band, or watch a recombination event eliminate a carrier pair.

---

### Lab 6: Circuits Lab (`dc-circuit.html`)

```
+---------------------------------------------------------------------------------------+
| Circuits Lab  [ Undo ]  [ Redo ]  [ Clear ]                             [ Hub Button ]|
| Tools: [Move] [Resistor] [Lamp] [Capacitor] [Battery] [AC Source] [Diode] [Xfmr] [Wire]
+---------------------------------------------------------------------------------------+
| Examples: [ Half-wave rectifier v ]  Current scale: [ 1 µA v ]  [ Snap ] [Fit View]   |
|                                                                                       |
|         AC Source (~10V) ------[ Diode |>| ]------+-----[ Lamp (Glow 82%) ]           |
|                |                                  |                 |                 |
|                +----------------------------------+-----------------+                 |
|                                                   |                                   |
|                                                (Ground)                               |
|                                                                                       |
| Inspector: Diode D1 | State: Conducting (0.7V Drop) | Current: 93.0 mA | Power: 65.1 mW|
+---------------------------------------------------------------------------------------+
| Dual-Ch Oscilloscope: [Target v] [Timebase v] [AC Ripple] [Invert] [Clear]            |
|  CH1 V(t) |  Vrms  |  Vdc  |  Vpp  |  Freq  |  CH2 I(t)  |  Energy   (Fixed-Size Grid)|
|  ~~~~~~~~~~~~~~~~~~~~~ Dual-Channel Live Waveform Trace Canvas ~~~~~~~~~~~~~~~~~~~~~  |
+---------------------------------------------------------------------------------------+
| [ > Run ]  [ Step 0.01s ]  [ Reset ]   Time: 1.42 s   Speed: [ 1x v ]                 |
+---------------------------------------------------------------------------------------+
```

#### What You See on the Screen
- **The Blueprint Workspace**: A dark, grid-aligned electrical drafting workbench.
- **Component Symbols**: Highly detailed, standard IEEE/IEC schematic symbols:
  - *Batteries* with polarity marks (+ / -).
  - *AC Sources* displaying live sinusoidal waveforms.
  - *Resistors* with clean zigzag paths and value badges.
  - *Lamps* that visually glow brighter or dimmer in real time based on electrical power ($P = I^2 R$).
  - *Capacitors* showing accumulated charges on their plates.
  - *Diodes* displaying conduction arrows with reverse-bias cutoff.
  - *Transformers* featuring primary and secondary copper windings with iron-core isolation bars.
- **Virtual Dual-Channel Oscilloscope**: Expandable bottom waveform drawer displaying live dual-channel voltage (`CH1 V(t)`) and current (`CH2 I(t)`) traces alongside 7 rock-steady telemetry boxes (`CH1 V(t)`, `Vrms`, `Vdc`, `Vpp`, `Freq`, `CH2 I(t)`, `Energy`) with AC Ripple magnification, trace inversion, and timebase controls.
- **Flowing Current Dots (`1 µA` Default Scale)**: Animated markers moving along wires at speeds proportional to amperage, defaulting to `1 µA` flow sensitivity (`#flowScale`) so even tiny micro-ampere currents remain immediately visible. When AC reverses, markers decelerate smoothly, pause at zero, and reverse direction.
- **Interactive Inspector Drawer & Mobile Controls**: Clicking any component displays live voltage ($V_A - V_B$), current ($I_{A \to B}$), power dissipation, and frequency; on phones (`<= 600px`), component tools wrap into a compact 3-column grid and scope telemetry switches to a balanced 2-column grid.

#### What You Can Do & How to Interact
1. **Building from Scratch**: Select any component tool from the top palette and tap the canvas to place it. Select **Wire** and click between terminals; smart orthogonal routing automatically draws neat 90-degree corners around obstacles.
2. **Loading Educational Examples**: Open the **Examples** dropdown to instantly inspect pre-built master circuits:
   - *Half-Wave Rectifier*: Watch a diode block negative AC cycles, delivering pulsed DC to a lamp.
   - *Full-Wave Bridge Rectifier*: Watch four bridge diodes steer both positive and negative AC half-cycles so the load resistor always receives positive current.
   - *AC Step-Up Transformer*: Observe 10 V AC stepped up to 50 V AC on an isolated secondary winding.
   - *RC Charge & Discharge*: Close a switch to charge a capacitor, open it, and close a discharge switch to study exponential decay curves.
3. **Interactive Switching**: Click any switch symbol or tap `Spacebar` while running to toggle circuits on and off live.
4. **Desktop & Mobile Gestures**: Drag components with mouse or touch. Hold `Shift` or uncheck *Snap to grid* for free positioning. Two fingers pan and pinch-to-zoom without accidentally misplacing wires. Full Undo (`Ctrl+Z`) and Redo (`Ctrl+Shift+Z`) support guarantees risk-free experimentation.

---

### Virtual Lab 7: Logic Lab (`logic.html`)

```
+---------------------------------------------------------------------------------------+
| ← Electricsim   Logic Lab                                                  [Presets]  |
+---------------------------------------------------------------------------------------+
| LIVE BOOLEAN ALGEBRA                     [ Notation: A·B + A' v ] [ Copy ] [Simplify] |
|  F = (A · B) + (A · B') + (A · C)  ↳ Minimal SOP: F = A  [Apply Minimal] [NAND] [NOR] |
+---------------------+-------------------------------------------+---------------------+
| LEFT COMPONENT CARD | SCHEMATIC WORKSPACE                       | ANALYSIS DOCK       |
| [↖ Move / Edit    ] |                                           | [Table][K-Map][Simp]|
| [─●─ Wire] [✋ Pan] |   [A | 1] ●──┬──[AND]●──┐                 |  A B C │ F          |
| [Input (A-P)]       |              │          ├──[OR]●──●[F=1]  |  0 0 0 │ 0          |
| [Output (F-V)]      |   [B | 0] ●──┼──[AND]●──┘                 | ▶1 0 1 │ 1◀         |
| [AND][OR][NOT][NAND]|              └─[NOT]●┘                    |                     |
| [NOR][XOR][XNOR]    |   [C | 1] ●──────────────                 |  Σm(4, 5, 6, 7)     |
| [HA][FA][MUX][SR/D] |                                           |                     |
+---------------------+-------------------------------------------+---------------------+
```

#### What You See on the Screen
- **Standalone Gate & MSI/Latch Workspace**: Dedicated single-screen (`100dvh`) digital logic studio with a **Left Component Sidebar** (`Move / Edit`, `Wire`, `Pan`, up to 12 `Inputs (A–P)`, up to 8 `Outputs (F–V)`, `Const 1/0`, IEEE gates, combinational MSI blocks `HA`/`FA`/`MUX2`/`MUX4`/`ENC42`/`DEC24`/`COMP2`, and sequential `SR_LATCH`/`D_LATCH`), central schematic canvas, and Right Analysis Dock.
- **Live Boolean Formula Bar (Top)**: Displays the live Boolean algebra equation for active outputs and lets you hover any term to highlight the exact gate on the canvas, paired with a simplification preview (`✓ Minimal` or gate-saving hint).
- **Three-Tab Analysis Dock (Right)**:
  - **Truth Table**: Interactive input/output rows alongside canonical minterm (`Σm`) and maxterm (`ΠM`) lists.
  - **Karnaugh Map (K-Map)**: Gray-code 2D table with interactive Prime Implicant chips.
  - **Simplify & Convert**: One-click **Apply Minimal**, **NAND-Only**, and **NOR-Only** synthesis converters.
- **Responsive Mobile Layout (`<= 980px`)**: Converts the left sidebar into a sleek, space-saving **horizontal 2-row swipeable palette strip** (`grid-auto-flow: column; grid-template-rows: repeat(2, auto)`) while freeing the full phone viewport below for panning, wiring, and docking truth tables cleanly.
- **Built-In Gate Examples**:
  1. *Basic AND / OR circuit (`F = A·B + C`)*
  2. *Half Adder (`Carry F & Sum G`)*
  3. *1-Bit Full Adder (`Carry-Out F & Sum G`)*
  4. *2-to-1 Multiplexer (`F = A·C' + B·C`)*
  5. *De Morgan's Law (`(A·B)' = A' + B'`)*
  6. *Simplification Demo (`F = A·B + A·B' + A·C`)*

---

### Virtual Lab 8: Electronics Lab — 74xx DIP Breadboard (`electronics.html`)

```
+---------------------------------------------------------------------------------------+
| ← Electricsim   Electronics Lab (74xx IC Breadboard)         [Auto-Power]  [Presets]  |
+---------------------+-----------------------------------------------------------------+
| LEFT COMPONENT CARD | MAXIMIZED 74xx DIP BREADBOARD SIMULATION CANVAS                 |
| [↖ Move / Edit    ] |                                                                 |
| [─●─ Wire] [✋ Pan] |   [5V Battery] (+) ───────► Pin 14 (VCC)                        |
| [5V Bat] [Switch]   |                (−) ──┐   ┌───────────────────────────────┐      |
| [DIP-4 ] [1Hz Clk]  |   [SW A] ●───────────┼──►│ )   [X-Ray Mini Gates]        │      |
| [220 Ω ] [Lamp]     |   [SW B] ●───────────┼──►│ 1   2   3   4   5   6   7     │      |
| [7-Seg ] [Probe]    |                      │   └─────────┬───────────────┬─────┘      |
| [⏚ GND ]            |                      │             └──[220Ω]──►(Lamp)─┐         |
| 17x 74xx DIP ICs:   |                      └────────────────────────────────┴─► ⏚ GND |
| [7404..7427]        |                                                                 |
| [7474][7475][74279] |   [ Floating Top-Right Inspector + Live Pin State Monitor ]     |
| [74283][74157]..[93]|                                                                 |
+---------------------+-----------------------------------------------------------------+
```

#### What You See on the Screen
- **Completely Standalone 74xx Bench**: Launched directly from **Virtual Labs → Electronics Lab** (`electronics.html`), putting the breadboard canvas center stage with a dedicated Left Component Sidebar and floating top-right component inspector + **Live Pin State Monitor** (`H` / `L` / `Z`).
- **17 Authentic 74xx DIP-14 & DIP-16 ICs**: Select gate ICs (`7404`, `7400`, `7402`, `7408`, `7432`, `7486`, `74266`, `7410`, `7411`, `7427`) alongside latches, flip-flops, MSI & counters (`7474`, `7475`, `74279`, `74283`, `74157`, `74148`, `7493`). Toggle **X-Ray internal gates** to view internal logic inside translucent packages.
- **9 Physical Bench Components**: Wire a **5V Battery**, **Toggle Switches**, **DIP-4 Switch Bank**, **1 Hz Clock**, **220 Ω Resistors**, **Multi-Color Indicator Lamps**, **BCD 7-Segment Display**, **Logic Probe**, and **Ground (`⏚ GND`)**.
- **True Ground Return Enforcement & Auto-Power**: Indicator lamps only illuminate when their **Anode (`+`)** receives `+5V` AND their **Cathode (`−`)** has a closed return path to **Ground (`0V`)** or **Battery (`−`)** (`OPEN` dashed gray lines and amber **`OPEN GND`** badges flag incomplete return paths); optional **Auto-Power VCC/GND** helper supplies clean IC rails while prototyping.
- **Mobile Touch & Swipe Palette (`<= 980px`)**: Automatically arranges tools, parts, and 74xx chips into a compact **horizontal 2-row scrollable component bar** above a full-width touch canvas.
- **9 Curated 74xx IC Bench Presets**: Includes classic gate benches (`7408` AND, `7486 + 7408` Half Adder, `7411 + 7404` 3-Input Detector, `7400 + 7-Seg` Decoder, `7404 + 7408 + 7432` 2:1 Mux, `74266 + 7408` Equality Comparator) plus arithmetic, MSI muxing, and sequential latch/counter presets across the expanded catalog.

---

## 4. Verification & Supplementary Test Scripts

The Electricsim web application is **100% pure client-side web technology** (HTML5, Vanilla ES6+ JavaScript, CSS3). It runs directly in any modern web browser without Node.js, npm, bundlers, compilers, or local web servers.

To guarantee scientific precision and protect against regressions, the repository contains optional standalone test scripts (`*.test.js`). These files are written in standard, universal JavaScript with zero external runtime dependencies. They evaluate mathematical formulas, circuit matrices, and physics models directly:

| Script | Verification Focus | Checks |
| :--- | :--- | :--- |
| `hub-search.test.js` | Keyword search filtering, 9 simulation/lab cards across 2 Hub sections, UI aria attributes | 15 checks |
| `semiconductor-model.test.js` | Mass-action law ($np = n_i^2$), carrier freeze-out, doping transitions | 14 checks |
| `dc-circuit.test.js` | KVL/KCL balance, series/parallel networks, RC curves, lamp glow, oscilloscope & `1 µA` scale | 36 checks |
| `dc-circuit.math.test.js` | 360 randomized circuit meshes, MNA linear solver, AC transformers, diodes | 17 suites |
| `dc-circuit.improvements.test.js` | Undo/redo stability, time-slice budgeting, wire current caching | 24 checks |
| `dc-circuit.browser.test.js` / `.interaction.test.js` | UI verification tests for circuit drawing, touch gestures, and responsive screens | E2E browser checks |
| `logic-ic-lab.test.js` | 5 systematic scans: closed-circuit ground enforcement, 17x 74xx IC truth tables, MSI blocks, sequential latches, routing, 9 presets & standalone UI | 22 checks (5 scans) |

*(Note: These verification scripts are purely supplementary regression checks. The application itself requires only a browser to open `index.html`.)*

---
*Electricsim Platform — Developed by Zeyad Mahmoud. High-fidelity scientific computation for modern web engineering.*

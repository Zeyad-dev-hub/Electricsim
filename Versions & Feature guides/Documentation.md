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
│   ├── index.html                           # Central research hub entry point (cards, metrics, keyboard search)
│   ├── hub-search.js                        # Accessible, instant search & keyword filtering engine for lab cards
│   ├── shared-bg.js                         # Shared dynamic background engine (ambient animated grid & particle glow)
│   ├── research-theme.css                   # Unified dark research design system (colors, glass panels, HUD, typography)
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
├── Lab 3: Capacitor Physics & Network Builder Suite
│   ├── capacitor.html                       # Dual-mode container with top-bar mode switcher and interactive workspace
│   ├── capacitor.css                        # Styling for geometry controls, dielectric selector, and network tree inspector
│   └── capacitor.js                         # Dual-engine computational suite:
│       ├── Sublab 3A: Capacitor Physics Explorer
│       │   ├── Geometry Models              # Parallel-plate, coaxial cylindrical, and concentric spherical capacitors
│       │   ├── Dielectric Polarization      # Relative permittivity (κ), dielectric breakdown limits, electric displacement
│       │   ├── Electrostatic Dynamics       # Live charging/discharging transient circuit animation with battery and resistor
│       │   └── Field & Charge Vector Engine # Dynamic E-field line density rendering and accumulated plate charge glyphs
│       └── Sublab 3B: Capacitor Network Builder
│           ├── Hierarchical Network Tree    # Recursive Series-Parallel tree data structure (`createGroupNode`, `createCapNode`)
│           ├── Equivalent Capacitance (C_eq)# Bottom-up recursive reduction solver (Series harmonic sum, Parallel direct sum)
│           ├── Top-Down Charge/Voltage Dist # Recursive voltage divider and charge conservation solver across subnets
│           └── PCB Schematic Auto-Layout    # Dynamic 2D schematic generator with clean trace routing and live component tags
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
├── Lab 6: Circuits Lab (DC & AC Dynamics Workspace)
│   ├── dc-circuit.html                      # Single-screen (100dvh zero-scroll) schematic canvas, toolbar, inspector, timeline
│   ├── dc-circuit.css                       # Single-viewport flex/grid schematic styling, component symbols, floating HUD
│   ├── dc-circuit-model.js                  # Document schema v1, component factories, bounding boxes, and validation checks
│   ├── dc-circuit-topology.js               # Union-Find net compiler, reference domains, and wire-current balance recovery
│   ├── dc-circuit-solver.js                 # Modified Nodal Analysis (MNA) solver, adaptive backward Euler, diodes & transformers
│   ├── dc-circuit-editor.js                 # Grid snapping (24px), obstacle-aware orthogonal A* routing, and route splitting
│   ├── dc-circuit-simulation.js             # Simulation clock, state lifecycle, undo/redo history, and transient time budgeting
│   ├── dc-circuit-renderer.js               # Path2D schematic rendering, IEEE/IEC component glyphs, current markers, glow
│   ├── dc-circuit-presets.js                # Built-in educational circuits (rectifiers, transformers, RC ladders, bridges)
│   └── dc-circuit.js                        # Controller, pointer/touch gesture engine, keyboard shortcuts, inspector sync
│
├── Lab 7: Logic Circuits Lab (Dual-Mode: Logic Gates Simulator & 74xx Logic IC Lab)
│   ├── logic.html                           # Dual-mode workspace (top switcher, left component sidebars, maximized 100dvh canvas)
│   ├── logic.css                            # Zero-scroll 100dvh flex/grid layout, left palette sidebar, floating IC inspector
│   ├── Sublab 7A: Logic Gates Simulator
│   │   ├── logic-model.js                   # Schema v1 (max 4 inputs A–D, max 4 outputs F–Y, 8 gate types, fan-in 1..4, History)
│   │   ├── logic-evaluator.js               # Kahn topological sort, feedback cycle detection, 16-bit bitwise truth-mask evaluator
│   │   ├── logic-expression.js              # Gate-to-AST builder, bidirectional gate hover spans, 4 notation printers
│   │   ├── logic-simplify.js                # Isolated & optional 81-cube exact SOP/POS minimizer and Gray-code K-map builder
│   │   ├── logic-synthesis.js               # Deterministic 3-column synthesizer (Minimal SOP/POS, Universal NAND-only & NOR-only)
│   │   ├── logic-editor.js                  # 24px grid snapping, pin hit-testing, and obstacle-aware orthogonal wire router
│   │   ├── logic-renderer.js                # Canvas 2D renderer with IEEE distinctive-shape gates, inversion bubbles & glow wires
│   │   ├── logic-presets.js                 # 6 curated gate presets (Basic AND/OR, Half Adder, Full Adder, 2:1 Mux, De Morgan, Simplify)
│   │   └── logic.js                         # Main controller syncing canvas gestures, formula bar, truth table, and K-map
│   ├── Sublab 7B: Logic IC Lab (74xx Series DIP Breadboard Simulator)
│   │   └── logic-ic-lab.js                  # Complete 74xx DIP IC bench engine:
│   │       ├── 14-Pin 74xx IC Catalog       # 10 authentic TTL/CMOS DIP ICs by model number (7404, 7400, 7402, 7408, 7432, 7486, 74266, 7410, 7411, 7427)
│   │       ├── Bench Circuit Components     # 5V DC Battery, Toggle Switch, 220Ω Series Resistor, Multi-Color LED Lamp, GND, 1Hz Clock, BCD 7-Seg
│   │       ├── Closed-Circuit Net Solver    # Union-Find net solver enforcing true ground return paths (`hasTrueGround`), VCC/GND & short protection
│   │       ├── Obstacle-Aware Wire Router   # 4-orientation component rotation (`R`), package-bypass routing, draggable segments, hops & junctions
│   │       ├── X-Ray Datasheet Renderer     # Translucent DIP package rendering internal IEEE mini-gates and live pin-to-gate signal traces
│   │       └── Curated 74xx Bench Presets   # 6 ready-to-run IC benches (7408 Bench, Half Adder, 3-Input 7411, 7400 Counter, 2:1 Mux, 2-Bit Comparator)
│   └── logic-tests.html                     # Browser-native verification suite (65,536-function exact minimization, synthesis & IC ground checks)
│
├── Markdown Files/ (Platform Documentation & Reviews)
│   ├── Documentation.md                     # Central architectural specification and comprehensive platform reference
│   ├── DC_CIRCUIT_LAB_REVIEW.md             # DC Circuit Lab architectural audit, test reports, and verification review
│   ├── DC_CIRCUIT_LAB_IMPLEMENTATION_PLAN.md# Engineering specifications for circuit editor, solver, and interactions
│   ├── SEMICONDUCTOR_LAB_PLAN.md            # Physics requirements for single-crystal semiconductor simulation
│   └── SEMICONDUCTOR_RESTRUCTURE_PLAN.md    # Restructuring blueprint consolidating multi-scene models into unified crystal
│
└── Supplementary Verification Scripts (Optional)
    ├── hub-search.test.js                   # Verifies lab search filtering logic, 7 lab cards, and ARIA accessibility attributes
    ├── semiconductor-model.test.js          # Verifies carrier equilibrium, mass-action law, and doping calculations
    ├── dc-circuit.test.js                   # Verifies KVL/KCL, series/parallel reductions, and RC curves
    ├── dc-circuit.math.test.js              # Verifies MNA matrix solver accuracy across 360 circuit meshes
    ├── dc-circuit.improvements.test.js      # Verifies undo/redo state preservation and wire current calculations
    ├── dc-circuit.interaction.test.js       # Verifies component placement previews and drag interactions
    ├── dc-circuit.browser.test.js           # Verifies interactive circuit editing and mobile responsiveness
    └── logic-ic-lab.test.js                 # 3 full systematic verification scans (14 suites) for Logic IC Lab physics, routing & UI
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
         +-------------------+-------------------+-------------------+-------------------+
         |                   |                   |                   |                   |
         v                   v                   v                   v                   v
+-----------------+ +-----------------+ +-----------------+ +-----------------+ +-----------------+
| Electrostatics  | |   Gauss's Law   | |  Capacitor Lab  | |  Conductivity   | |  Semiconductor  |
| - RK4 Integrator| | - Pseudo-3D Proj| | - Geometry Model| | - Drude Model   | | - Covalent Bonds|
| - Marching Sq.  | | - Analytical E  | | - Transient RC  | | - Spatial Hash  | | - Mass Action   |
| - BEM Induction | | - Flux Line Chev| | - Tree Reduction| | - Phonon Scatter| | - Multi-Canvas  |
+-----------------+ +-----------------+ +-----------------+ +-----------------+ +-----------------+
         |                                                                               |
         +---------------------------------------+---------------------------------------+
                                                 |
                                                 v
                                  +-----------------------------+
                                  |        Circuits Lab         |
                                  | - MNA Matrix Solver (LU)    |
                                  | - Adaptive Backward Euler   |
                                  | - Obstacle-Aware Routing    |
                                  | - Union-Find Graph Topology |
                                  +-----------------------------+
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

### Lab 3: Capacitor Physics & Network Builder Suite (`capacitor.html`, `capacitor.js`, `capacitor.css`)

#### Sublab 3A: Capacitor Physics Explorer
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

#### Sublab 3B: Capacitor Network Builder
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

---

### Lab 7: Logic Circuits Lab (`logic.html`, `logic-*.js`, `logic-ic-lab.js`)

The **Logic Circuits Lab** is a dual-mode digital engineering suite modeled after the Capacitor Lab's top-bar mode switcher (`Logic Gates Simulator` and `Logic IC Lab`), built inside a zero-scroll (`100dvh`) single-viewport layout with dedicated Left Component Sidebars.

```
+---------------------------------------------------------------------------------------+
|                        Logic Circuits Lab (Dual-Mode Stack)                           |
+-------------------------------------------+-------------------------------------------+
|       Sublab 7A: Logic Gates Simulator    |         Sublab 7B: 74xx Logic IC Lab      |
+-------------------------------------------+-------------------------------------------+
| logic.js            UI, Formula & K-Map   | logic-ic-lab.js   Complete 74xx Engine:   |
| logic-editor.js     Grid & 90° Router     |  - 10 Authentic 14-Pin DIP ICs (7404..27) |
| logic-renderer.js   IEEE Gates & Glow     |  - X-Ray Datasheet Internal Gate Overlay  |
| logic-synthesis.js  SOP/POS/NAND/NOR      |  - Closed-Circuit Ground Return Solver    |
| logic-simplify.js   81-Cube Exact Solver  |  - Obstacle-Aware Router & 4-Way Rotation |
| logic-expression.js AST & 4 Notations     |  - Battery, Switch, 220Ω, Lamp, GND, Seg7 |
| logic-evaluator.js  16-Bit Bitwise Engine |  - 6 Ready-to-Run 74xx Breadboard Presets |
| logic-model.js      Schema v1 & History   |                                           |
+-------------------------------------------+-------------------------------------------+
```

#### Sublab 7A: Logic Gates Simulator (`logic-model.js` – `logic.js`)

##### 1. Single-Pass 16-Bit Bitwise Truth-Mask Evaluator (`logic-evaluator.js`)
Because the workspace supports at most $n \le 4$ input variables (`A, B, C, D`), every signal's complete 16-row truth table fits inside a single 16-bit unsigned integer (`0x0000`–`0xFFFF`):
- Input basis masks:
  $$\text{MASK}_A = \text{0xFF00}, \quad \text{MASK}_B = \text{0xF0F0}, \quad \text{MASK}_C = \text{0xCCCC}, \quad \text{MASK}_D = \text{0xAAAA}$$
- **Kahn Topological Sort & Cycle Detection**: Nodes with `inDegree === 0` initialize the evaluation queue. Any node remaining with `inDegree > 0` after queue exhaustion belongs to or depends on a combinational feedback loop and is flagged `loop: true` without hanging.
- **Bitwise Gate Evaluation**: Each gate evaluates all 16 input combinations simultaneously in $O(1)$ CPU bitwise instructions (`&`, `|`, `^`, `(~x) & 0xFFFF`).
- **Live Signal Extraction**: For active input switch states $(A, B, C, D) \in \{0, 1\}^4$, row index $r_{16} = (A \ll 3) \mid (B \ll 2) \mid (C \ll 1) \mid D$ extracts every wire's live logic state via `(mask >> r16) & 1`.

##### 2. Expression AST & Bidirectional Gate Highlighting (`logic-expression.js`)
- Walks backward from each output terminal (`F, G, H, Y`) to construct an operator-precedence AST (`NOT` > `AND`/`NAND` > `XOR`/`XNOR` > `OR`/`NOR`).
- Renders safe DOM `<span class="logic-expr-gate" data-node-id="...">` wrappers so hovering any sub-expression in the Formula Bar illuminates the corresponding gate and its output wires on `#logicCanvas`.
- Supports 4 live notation printers: **Engineering** (`A·B + A'`), **Textbook Overbar** (`A·B + A̅`), **Symbolic** (`(A ∧ B) ∨ ¬A`), and **Code** (`(A && B) || !A`).

##### 3. Isolated 81-Cube Exact Boolean Minimizer (`logic-simplify.js`)
- **Complete Architectural Isolation**: Accepts only `{ vars, mask16 }` and returns plain data structures. Zero DOM, canvas, or schematic coupling; if `logic-simplify.js` is omitted, the schematic editor, formula bar, and truth table operate uninterrupted.
- **Exact $3^k \le 81$ Cube Search**: Enumerates all $3^k$ product cubes over the $k \le 4$ active variables, filters valid implicants `(cMask & ~truth) === 0`, extracts Prime Implicants by subsumption, locks in Essential Prime Implicants, and solves any remaining cyclic chart via branch-and-bound minimizing `(termCount, literalCount)`.
- **Minimal POS via De Morgan Dual**: Evaluates `solveExactSop` on `(~truth) & fullMask` and applies De Morgan inversion (`AND ↔ OR`, literal negation flip) to produce exact Minimal POS.

##### 4. Deterministic 3-Column Universal Gate Synthesis (`logic-synthesis.js`)
- Rewrites any valid combinational schematic into **Minimal SOP**, **Minimal POS**, **Universal NAND-Only**, or **Universal NOR-Only** aligned across fixed grid columns (`Inputs → Shared Inverters → Term Gates → Output Combining Gate → Outputs`).
- Automatically chunks expressions with 5–8 prime implicants (such as 4-input XOR `0x6996`) into balanced 2-stage sub-trees so every gate strictly obeys `fanIn ≤ 4`, then self-verifies `newMask16 === oldMask16` before committing to `History`.

---

#### Sublab 7B: Logic IC Lab — 74xx Series DIP Breadboard Simulator (`logic-ic-lab.js`)

##### 1. Authentic 14-Pin 74xx Series DIP IC Catalog (`IC_CATALOG`)
All integrated circuits are presented in the Left Component Sidebar strictly by their **74xx model numbers** (never by gate name) and follow standard 14-pin Dual In-Line Package (DIP-14) counterclockwise pin numbering from the left half-moon notch (**Pins 1–7** along the bottom edge with **Pin 7 = GND**, and **Pins 8–14** along the top edge right-to-left with **Pin 14 = +5V VCC**):
- **1-Input Hex Inverter**:
  - `7404` (SN7404N): Hex Inverter (`1→2, 3→4, 5→6, 9→8, 11→10, 13→12`)
- **2-Input Quad Gate ICs**:
  - `7400` (SN7400N): Quad 2-Input NAND (`1,2→3 · 4,5→6 · 9,10→8 · 12,13→11`)
  - `7402` (SN7402N): Quad 2-Input NOR (`2,3→1 · 5,6→4 · 8,9→10 · 11,12→13` — authentic reversed pinout!)
  - `7408` (SN7408N): Quad 2-Input AND (`1,2→3 · 4,5→6 · 9,10→8 · 12,13→11`)
  - `7432` (SN7432N): Quad 2-Input OR (`1,2→3 · 4,5→6 · 9,10→8 · 12,13→11`)
  - `7486` (SN7486N): Quad 2-Input XOR (`1,2→3 · 4,5→6 · 9,10→8 · 12,13→11`)
  - `74266` (SN74266N): Quad 2-Input XNOR (`1,2→3 · 4,5→6 · 9,10→8 · 12,13→11`)
- **3-Input Triple Gate ICs**:
  - `7410` (SN7410N): Triple 3-Input NAND (`1,2,13→12 · 3,4,5→6 · 9,10,11→8`)
  - `7411` (SN7411N): Triple 3-Input AND (`1,2,13→12 · 3,4,5→6 · 9,10,11→8`)
  - `7427` (SN7427N): Triple 3-Input NOR (`1,2,13→12 · 3,4,5→6 · 9,10,11→8`)

##### 2. Strict Closed-Circuit & Ground Return Path Solver (`evaluateICBench`)
The bench solver enforces physical closed-circuit electricity rather than idealized single-wire logic:
- **Passband Passive & Switch Bridging**: Closed switches (`sw:in ↔ sw:out`, when `sw:in` is wired) and `220 Ω` series resistors (`r:a ↔ r:b`) bridge connected nets via a Union-Find disjoint-set compiler.
- **True Ground Return Tracking (`net.hasTrueGround`)**: A net only qualifies as a valid ground return (`0V`) if it is connected to a real low-impedance `0V` sink (`Battery (−)`, `GND` terminal, an active-low powered IC gate output, or a closed standalone switch in `0` state). Open switches never provide a ground return path.
- **IC Power Rail Validation**: Unless the optional *Auto-power VCC/GND* bench helper is enabled, every 74xx IC requires **Pin 14** connected to `+5V` AND **Pin 7** connected to a true ground return (`hasTrueGround`). Reversed polarity (`Pin 14 = 0V` and `Pin 7 = +5V`) triggers an immediate `⚠ REVERSE POWER!` fault.
- **Strict Lamp Illumination Physics**: An indicator Lamp (`anode`, `cathode`) illuminates **if and only if** `Anode === 1 (+5V)` **AND** `Cathode === 0 (GND)` with `cathodeNet.hasTrueGround === true`. If Anode is driven HIGH (`+5V`) while Cathode is left unweighted/open (or connected to an open switch), the lamp remains strictly **OFF** and displays an amber **`OPEN GND`** badge on the canvas.

##### 3. X-Ray Datasheet IC Overlay & Obstacle-Aware Wire Management
- **Translucent X-Ray Package Rendering**: Every 74xx DIP chip is drawn with a semi-transparent housing (`rgba(13, 19, 31, 0.80)`) revealing the internal mini IEEE gate symbols and internal metallic micro-traces linking each external pin to its internal gate input/output.
- **Visual Wire State Differentiation**:
  - `+5V (HIGH)`: Glowing cyan (`#3dd9ff`)
  - `0V (Grounded LOW)`: Solid slate-blue (`#59677f`) with `0V` badge
  - `OPEN (Unconnected / Floating)`: Dashed muted gray line (`setLineDash([5, 4])`) with `OPEN` badge
  - `SHORT / CONTENTION`: Red warning glow (`#ff5a52`)
- **Circuits-Lab-Grade Wire & Component Ergonomics**: Supports 4-angle component rotation (`R` key: `0°, 90°, 180°, 270°`), obstacle-aware orthogonal routing around DIP packages, automatic parallel lane separation, draggable wire segments, double-click route reset, T-junction dots, crossing bridge hops, and a maximized full-bleed simulation canvas with a floating top-right component inspector.

---

## 3. Non-Technical & User Experience Guide

This section is written from the user's perspective, providing a visual and experiential tour of what is seen on screen, how controls behave, and how each simulation imparts deep physical intuition.

```
+---------------------------------------------------------------------------------------+
|                                Electricsim Central Hub                                |
|    [ Kicker: Scientific simulation suite ]                                            |
|    Title: Electricsim Platform                                                        |
|    Dedication: Developed by Zeyad Mahmoud · Faculty of Engineering at Shoubra         |
|    Metrics: [ 7 interactive labs ]  [ Live SI measurements ]  [ Cause->Effect ]       |
|                                                                                       |
|    [ Find a lab: Search by name or topic...                           ] [Clear]       |
|    Live Output: 7 labs                                                                |
+---------------------------------------------------------------------------------------+
|  [Card 1] Electrostatics       |  [Card 2] Gauss's Law         |  [Card 3] Capacitors |
|--------------------------------+-------------------------------+----------------------|
|  [Card 4] Conductivity         |  [Card 5] Semiconductors      |  [Card 6] Circuits   |
|--------------------------------+-------------------------------+----------------------|
|  [Card 7] Logic Circuits Lab                                                          |
+---------------------------------------------------------------------------------------+
```

---

### Central Hub (`index.html`)
- **Atmosphere & Visual Style**: Deep obsidian-black background with a subtle, ambient glowing particle grid. Typography is crisp, modern, and technical, featuring streamlined centered-title lab cards across all 7 virtual laboratories and a dedicated academic attribution to the **Faculty of Engineering at Shoubra**.
- **Instant Search & Filtering**: A prominent search bar allows typing any topic or concept (e.g., *"charge"*, *"transient"*, *"silicon"*, *"boolean"*, *"karnaugh"*, *"resistor"*). Cards filter dynamically with zero lag. Pressing `Escape` or clicking `Clear` instantly restores all 7 cards.
- **Responsive Navigation**: Clean cards present centered laboratory titles and direct click-to-launch navigation. Works seamlessly on desktop displays, tablets, and smartphones down to 320px width.

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

### Lab 3: Capacitor Physics & Network Builder Suite (`capacitor.html`)

```
+---------------------------------------------------------------------------------------+
| Capacitor Simulator  [ ?? Physics Explorer ]  [ ?? Network Builder ]     [ Hub Button ]|
+---------------------------------------------------------------------------------------+
| [Physics Explorer View]            | [Network Builder View]                           |
|       + Plate (+Q)                 |     +---[ C1: 10 uF ]---+                        |
|   =====================            | ----|                   |---- (Total C_eq = 15uF)|
|   |  Dielectric (k)   | E-Field    |     +---[ C2: 5 uF  ]---+                        |
|   ===================== Lines      |                                                  |
|       - Plate (-Q)                 | Hierarchy Inspector:                             |
| Sliders: Voltage, Area, Separation |  - Root: Parallel Group (C_eq = 15 uF)           |
| Measurements: C, Q, Stored Energy  |    |- C1: 10 uF (Q = 120 uC, V = 12 V)           |
|                                    |    |- C2:  5 uF (Q =  60 uC, V = 12 V)           |
+---------------------------------------------------------------------------------------+
```

#### Sublab 3A: Physics Explorer View
- **What You See**: A high-resolution cross-section of a capacitor connected to a DC supply. Positive charges accumulate on one plate, negative charges on the other, while dense field lines span the dielectric gap.
- **Interactive Controls**:
  - Switch geometry between Parallel Plate, Cylindrical, and Spherical capacitors.
  - Slide plate separation distance $d$ closer and watch capacitance $C$ and stored charge $Q$ shoot upward.
  - Insert different dielectric slabs (Vacuum, Glass, Mica, Strontium Titanate) and observe the instantaneous drop in internal electric field and boost in capacitance.
  - Click **Charge / Discharge / Disconnect** to toggle switches and watch electrons flow through connecting wires into the capacitor during charging or discharge through a load resistor.

#### Sublab 3B: Network Builder View
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
| Examples: [ Half-wave rectifier v ]    [ Snap to Grid ] [ Keep Placing ] [Fit View]   |
|                                                                                       |
|         AC Source (~10V) ------[ Diode |>| ]------+-----[ Lamp (Glow 82%) ]           |
|                |                                  |                 |                 |
|                +----------------------------------+-----------------+                 |
|                                                   |                                   |
|                                                (Ground)                               |
|                                                                                       |
| Inspector: Diode D1 | State: Conducting (0.7V Drop) | Current: 93.0 mA | Power: 65.1 mW|
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
- **Flowing Current Dots**: Animated markers moving along wires at speeds directly proportional to amperage. When alternating current reverses, the markers smoothly decelerate, pause at zero, and reverse direction!
- **Interactive Inspector Drawer**: Clicking any component opens an inspector displaying live voltage ($V_A - V_B$), current ($I_{A \to B}$), power dissipation, and frequency.

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

### Lab 7: Logic Circuits Lab (`logic.html`)

```
+---------------------------------------------------------------------------------------+
| ← Electricsim  Logic Circuits Lab   [ Logic Gates Simulator | Logic IC Lab ]  [Presets]|
+---------------------------------------------------------------------------------------+
| [Sublab 7A: Logic Gates Simulator (100dvh Zero-Scroll Single Screen)]                 |
| LIVE BOOLEAN ALGEBRA                     [ Notation: A·B + A' v ] [ Copy ] [Simplify] |
|  F = (A · B) + (A · B') + (A · C)  ↳ Minimal SOP: F = A  [Apply Minimal] [NAND] [NOR] |
+---------------------+-------------------------------------------+---------------------+
| LEFT COMPONENT CARD | SCHEMATIC WORKSPACE                       | ANALYSIS DOCK       |
| [↖ Move / Edit    ] |                                           | [Table][K-Map][Simp]|
| [─●─ Wire] [✋ Pan] |   [A | 1] ●──┬──[AND]●──┐                 |  A B C │ F          |
| [Input (A-D)]       |              │          ├──[OR]●──●[F=1]  |  0 0 0 │ 0          |
| [Output (F-Y)]      |   [B | 0] ●──┼──[AND]●──┘                 | ▶1 0 1 │ 1◀         |
| [AND][OR][NOT][NAND]|              └─[NOT]●┘                    |                     |
| [NOR][XOR][XNOR]    |   [C | 1] ●──────────────                 |  Σm(4, 5, 6, 7)     |
+---------------------+-------------------------------------------+---------------------+
| [Sublab 7B: Logic IC Lab (Maximized 100dvh Canvas + Left Component Sidebar)]          |
+---------------------+-----------------------------------------------------------------+
| LEFT COMPONENT CARD | MAXIMIZED 74xx DIP BREADBOARD SIMULATION CANVAS                 |
| [↖ Move / Edit    ] |                                                                 |
| [─●─ Wire] [✋ Pan] |   [5V Battery] (+) ───────► Pin 14 (VCC)                        |
| [5V Bat] [Switch]   |                (−) ──┐   ┌───────────────────────────────┐      |
| [220 Ω ] [Lamp]     |                      │   │ 14  13  12  11  10   9   8    │      |
| [⏚ GND ] [1Hz Clk]  |   [SW A] ●───────────┼──►│ )   [X-Ray Mini Gates]        │      |
| [7-Seg BCD Display] |   [SW B] ●───────────┼──►│ 1   2   3   4   5   6   7     │      |
| 74xx Series DIP ICs:|                      │   └─────────┬───────────────┬─────┘      |
| [7404] [7400] [7402]|                      │             └──[220Ω]──►(Lamp)─┐         |
| [7408] [7432] [7486]|                      └────────────────────────────────┴─► ⏚ GND |
| [74266][7410] [7411]|                                                                 |
| [7427]              |                                                                 |
+---------------------+-----------------------------------------------------------------+
```

#### Sublab 7A: Logic Gates Simulator View
- **Zero-Scroll Single-Screen Workspace**: Fits 100% within a single desktop screen (`100dvh`) with a dedicated **Left Component Sidebar** (`Move / Edit`, `Wire`, `Pan`, `Input (A-D)`, `Output (F-Y)`, `Const 1/0`, and all 8 IEEE gates), a central schematic canvas, and the Right Analysis Dock.
- **Live Boolean Formula Bar (Top)**: As soon as you wire logic gates together, the exact Boolean algebra equation for each output (`F, G, H, Y`) appears above the schematic. Hovering your mouse over any bracketed term in the formula highlights the exact gate on the canvas that produces that term.
- **Quiet Simplification Preview**: Directly beneath your formula, an automatic preview tells you if your circuit can be simplified (for example, showing that `F = (A·B) + (A·B') + (A·C)` simplifies to `F = A` and saves 5 gates), or confirms `✓ Minimal` when no further reduction is possible.
- **Three-Tab Analysis Dock (Right)**:
  - **Truth Table**: Displays all input combinations (`2`, `4`, `8`, or `16` rows) alongside every output column, plus canonical minterm (`Σm`) and maxterm (`ΠM`) lists.
  - **Karnaugh Map (K-Map)**: A Gray-code 2D table with interactive Prime Implicant chips underneath.
  - **Simplify & Convert**: Compares your drawn circuit against its Minimal SOP and Minimal POS forms and provides one-click **Apply Minimal**, **NAND-Only**, and **NOR-Only** converters.
- **6 Built-In Gate Examples**:
  1. *Basic AND / OR circuit (`F = A·B + C`)*
  2. *Half Adder (`Carry F & Sum G`)*
  3. *1-Bit Full Adder (`Carry-Out F & Sum G`)*
  4. *2-to-1 Multiplexer (`F = A·C' + B·C`)*
  5. *De Morgan's Law (`(A·B)' = A' + B'`)*
  6. *Simplification Demo (`F = A·B + A·B' + A·C`)*

#### Sublab 7B: Logic IC Lab View (74xx Series DIP Breadboard)
- **Maximized Full-Screen Bench Canvas**: Places a compact **Left Component Sidebar** flush on the left edge and expands the interactive breadboard canvas across the entire remaining viewport width and height. Clicking any component opens a sleek floating inspector card in the top-right corner without shrinking the canvas.
- **10 Authentic 74xx DIP ICs by Model Number**: Select `7404`, `7400`, `7402`, `7408`, `7432`, `7486`, `74266`, `7410`, `7411`, or `7427` from the left sidebar. Toggle **X-Ray internal gates** to peer inside each translucent 14-pin DIP package and see the datasheet gate connections between pins!
- **Real Closed-Circuit Bench Components**: Wire a **5V Battery**, **Toggle Switches**, **220 Ω Resistors**, **Multi-Color Indicator Lamps**, **Ground (`⏚ GND`)**, **1 Hz Clock**, and **BCD 7-Segment Display**.
- **True Ground Return Enforcement**: Indicator lamps only illuminate when their **Anode (`+`)** receives `+5V` AND their **Cathode (`−`)** has a closed return path to **Ground (`0V`)** or **Battery (`−`)**. Unconnected/open wires render as dashed gray lines (`OPEN`), and ungrounded lamps display an amber **`OPEN GND`** diagnostic badge.
- **6 Curated 74xx IC Bench Presets**:
  1. *`7408` — Quad 2-Input AND Bench (Battery + Switches + Resistor + Lamp)*
  2. *`7486 + 7408` — 74xx Half Adder Breadboard (Sum & Carry Lamps)*
  3. *`7411 + 7404` — 3-Input Majority/All-High Detector & Inverter*
  4. *`7400 + 7-Seg` — Quad NAND Logic Decoder & Clock Bench*
  5. *`7404 + 7408 + 7432` — 2-to-1 Data Multiplexer Bench (D0, D1, Select)*
  6. *`74266 + 7408` — 2-Bit Equality Comparator Bench (A = B Detector)*

---

## 4. Verification & Supplementary Test Scripts

The Electricsim web application is **100% pure client-side web technology** (HTML5, Vanilla ES6+ JavaScript, CSS3). It runs directly in any modern web browser without Node.js, npm, bundlers, compilers, or local web servers.

To guarantee scientific precision and protect against regressions, the repository contains optional standalone test scripts (`*.test.js`). These files are written in standard, universal JavaScript with zero external runtime dependencies. They evaluate mathematical formulas, circuit matrices, and physics models directly:

| Script | Verification Focus | Checks |
| :--- | :--- | :--- |
| `hub-search.test.js` | Keyword search filtering, 7 centered-title lab cards, UI aria attributes | 15 checks |
| `semiconductor-model.test.js` | Mass-action law ($np = n_i^2$), carrier freeze-out, doping transitions | 14 checks |
| `dc-circuit.test.js` | KVL/KCL balance, series/parallel networks, RC curves, lamp glow | 28 checks |
| `dc-circuit.math.test.js` | 360 randomized circuit meshes, MNA linear solver, AC transformers, diodes | 17 suites |
| `dc-circuit.improvements.test.js` | Undo/redo stability, time-slice budgeting, wire current caching | 24 checks |
| `dc-circuit.browser.test.js` / `.interaction.test.js` | UI verification tests for circuit drawing, touch gestures, and responsive screens | E2E browser checks |
| `logic-ic-lab.test.js` | 3 full systematic scans: closed-circuit lamp ground enforcement, open-switch return isolation, 10 74xx IC truth tables, 4-way rotation, obstacle routing, and all 6 IC presets | 14 suites |
| `logic-tests.html` | Browser-native test suite: all 8 gate types, cycle detection, exhaustive 65,536-function SOP/POS minimization, NAND/NOR synthesis, and IC ground checks | 7 suites (65,536+ checks) |

*(Note: These verification scripts are purely supplementary regression checks. The application itself requires only a browser to open `index.html`.)*

---
*Electricsim Platform — Developed by Zeyad Mahmoud. High-fidelity scientific computation for modern web engineering.*

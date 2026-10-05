# Electricsim Platform: Scientific Research Simulation Suite

## Comprehensive Project Overview

Electricsim is an advanced, high-fidelity web-based physics simulation platform built entirely with vanilla JavaScript ES6+, HTML5 Canvas 2D, and CSS3. Designed with a sophisticated black research-lab aesthetic, the platform provides interactive computational laboratories for exploring classical electromagnetism, electrostatics, capacitance, charge transport, and semiconductor physics.

The application architecture utilizes a modular hub-and-spoke design where each simulation operates as an independent, self-contained engine supported by a unified design system (`research-theme.css`). Performance is optimized through batched rendering primitives, Path2D caching, custom Runge-Kutta (RK4) numerical integration for electric field lines, marching-squares algorithms for equipotential contour generation, and boundary-element method (BEM) linear solvers for conducting geometries.

---

## Architecture & File Directory

The hub uses normal document scrolling at every breakpoint; no desktop viewport lock is applied. Its six lab cards are text-only. `hub-search.js` filters card names, topics, and descriptions as users type, supports case-insensitive multiple keywords, provides a live result count/no-results message, and clears with its button or Escape. All cards remain available if JavaScript is disabled. Run `node hub-search.test.js` for 15 search/markup checks; scrolling and filtering were also verified at desktop and 390px mobile widths.

```text
Project Root
|
+-- index.html             Central hub interface with animated canvas background
+-- hub-search.js          Accessible name/topic filtering for the text-only lab cards
+-- research-theme.css     Unified black research-lab design system
+-- style.css              Shared base styles for electrostatics and transport
+-- shared-bg.js           Background animation engine for hub
|
+-- Electrostatics Module
    +-- electrostatics.html
    +-- script.js          Electrostatics simulation engine & BEM solver
|
+-- Gauss's Law Module
    +-- gauss.html
    +-- gauss.css
    +-- gauss.js           Flux explorer & pseudo-3D Gaussian surfaces
|
+-- Capacitor Lab Module
    +-- capacitor.html
    +-- capacitor.css
    +-- capacitor.js       Capacitance models & network builder engine
|
+-- Conductivity Explorer Module
    +-- conductivity.html
    +-- conductivity.css
    +-- conductivity.js    Drude-model electron drift & temperature transport
|
+-- Semiconductor Physics Lab Module
    +-- semiconductor.html
    +-- semiconductor.css
    +-- semiconductor.js   Single-crystal controller and Canvas renderers
    +-- semiconductor-model.js   Bond occupancy, carrier events and bulk physics
    +-- semiconductor-model.test.js   Conservation and transport regression checks
|
+-- Documentation.md       Technical specifications and project documentation
```

---

## Technology Stack & Engineering Standards

- **Core Runtime**: Vanilla JavaScript (ES6+ classes, typed arrays, floating-point numerical methods).
- **Graphics Pipeline**: HTML5 Canvas 2D context with `requestAnimationFrame`, Path2D batching, and device-pixel-ratio awareness.
- **Mathematical Rendering**: MathJax integration for precise typesetting of physical formulas on laboratory pages.
- **Typography & Styling**: Google Fonts (Inter), CSS Custom Properties, and responsive flex/grid layouts.
- **Interaction Model**: Pointer/touch event handling with `touch-action: none` to guarantee smooth dragging, inertial camera panning, pinch-to-zoom, and real-time HUD overlays.

---

## Detailed Module Specifications

### 1. Electrostatics Simulator (`electrostatics.html` / `script.js`)
Models discrete point charges, charged rods, rings, and conducting/non-conducting spheres. Implements real-time Coulomb force vectors, RK4 electric field line tracing, marching-squares equipotential contour mapping, and a partial-pivoting Gaussian elimination solver to simulate surface charge induction on conducting bodies.

### 2. Gauss's Law Explorer (`gauss.html` / `gauss.js`)
Visualizes electric flux through spherical, cylindrical, and planar Gaussian surfaces enclosing diverse charge geometries. Features active flowing chevron field lines, real-time calculation of enclosed charge ($Q_{enc}$), surface area ($A$), electric field ($E$), and direct verification of Gauss's Law ($\Phi = Q_{enc}/\varepsilon_0$).

### 3. Capacitor Physics Explorer (`capacitor.html` / `capacitor.js`)
Analyzes parallel-plate, cylindrical, and spherical capacitor geometries under variable dielectrics, voltages, and plate separations. Computes live capacitance, electric field strength, stored charge, and energy density with MathJax formula rendering.

### 4. Capacitor Network Builder (`capacitor.html` / `capacitor.js`)
Provides an interactive schematic canvas to construct and evaluate series and parallel capacitor networks. Computes equivalent capacitance, branch currents, and node voltages across multi-element circuits with clean PCB-style routing traces.

### 5. Conductivity Explorer (`conductivity.html` / `conductivity.js`)
Simulates microscopic electron drift velocity under the Drude scattering model across various material presets. Explores how temperature, cross-sectional area, length, and applied voltage impact resistivity $\rho(T)$, total resistance $R$, current $I$, and power dissipation $P$.

### 6. Semiconductor Physics Lab (`semiconductor.html` / `semiconductor.js`)
One straight silicon crystal shows two shared electrons per bond, mobile conduction electrons, and holes derived from vacant bond slots. Electron transfers fill vacancies and create new ones; holes have no independent animation path. Temperature drives excitation and recombination, phosphorus/boron substitution shows donor release and acceptor capture, and applied voltage produces free-electron drift and directed vacancy displacement. The attached energy diagram follows the same electron through valence, impurity, and conduction states. Includes compensation, contact exchange, polarity reversal, Pause/Step/Slow controls, particle following, accessible controls, reduced motion, and a responsive layout. The previous single-atom and separate transport scenes are removed.

Bulk equilibrium densities and currents are calculated separately from the representative particle counts. The lab uses a simplified 2D bonding diagram, approximate freeze-out and mobility, and a fixed silicon gap. Diffusion is explained in More detail; the main uniform-sample experiment visualizes drift. Decreasing visible dopant count explicitly prepares a fresh neutral sample. Run `node semiconductor-model.test.js` for model regression checks.

Transfer visualization uses preparation, a continuously visible electron marker, and a settled-state hold. A synchronized enlarged view identifies source bond A and receiving bond B, preserves the other bond state's occupancy, and keeps the receiving vacancy fixed until arrival. It distinguishes a valence transfer (a vacancy remains at A) from recombination (a free electron and hole disappear together). Valence transfers are restricted to adjacent bonds sharing a lattice atom, acceptors capture from a neighboring bond, and recombination selects the nearest available free electron. Paths are schematic teaching aids; lattice transfer markers route around the shared atomic core, and energy markers stay on allowed states. The lab reuses `research-theme.css` and `shared-bg.js`, with the same black/glass surfaces and indigo controls as the other labs. No new framework is introduced.

---

### 7. DC Circuit Lab (`dc-circuit.html`)

A deliberately minimal blank workspace. The toolbar contains only Move/edit, Resistor, Capacitor, Battery, and Wire, with Undo and Clear in the header and one Run/Pause button beneath the canvas. Click a component to edit its value/unit, rotate it, or delete it. There are no examples, analysis tabs, tables, plots, source transformations, reference tools, or save/load controls in the page.

Wire clicks immediately create connected junctions at the clicked positions. Clicking a terminal or existing wire ends the current route; Escape/right-click also ends it. Clicking a crossing creates one junction and joins all wires at that point. Crossings that have not been clicked remain disconnected. Both previews and committed wires route horizontally/vertically, adding a right-angle elbow when endpoints differ on both axes. Routing also remains orthogonal after moving/rotating components. An elbow is a geometric bend, not an electrical connection to other wires unless clicked. Terminal dots are reusable connection points. Undo reverses a complete click, including wire splitting, so branching does not leave partial edits.

Every component has live voltage and current readings above its symbol, alongside its component value: resistance for resistors, capacitance for capacitors, and source voltage for batteries. Resistance is not invented for a capacitor or battery. Labels use signed voltage A − B and current A → B. Negative battery current means the source is delivering current. Invalid circuits show unavailable readings and an explanatory error, not stale numbers.

The numerical graph/MNA solver remains independent of the reduced interface. It handles general resistor networks, checks ideal-source conflicts, and conserves branch current. No ground tool is needed for voltage drops: each disconnected circuit has an automatic local mathematical reference. Run advances capacitor charging at real-time speed using adaptive backward Euler and shows qualitative current-flow markers; Pause retains the capacitor state. Electrical edits pause playback and retain capacitor voltage when wires are added/removed. Layout edits do not change electrical state. Ideal battery shorts or incompatible directly connected capacitor/source voltages are reported rather than hidden with artificial resistance.

Readings refresh four times per second with three significant digits. Currents below 1 µA display as zero; other electrical readings stop at nano units, with no pico/femto prefixes. Very small capacitances are labeled <1 nF rather than falsely shown as zero. This affects display only: full-precision currents, voltages, and capacitor evolution stay in the solver.

Active files: `dc-circuit-model.js`, `dc-circuit-topology.js`, `dc-circuit-solver.js`, `dc-circuit-editor.js`, `dc-circuit-renderer.js`, and `dc-circuit.js`. Prior analysis/preset modules remain on disk for regression tests but are not loaded by the lab. The existing JavaScript/Canvas/research theme stack is unchanged. Run `node dc-circuit.test.js` for 23 regression checks and `node dc-circuit.math.test.js` for 13 extended groups (360 generated cases plus targeted invariants). Tests cover orthogonal routing, junction splitting and undo, Kirchhoff current/voltage laws, power balance, manufactured mesh solutions, superposition, scaling, geometry invariance, and analytical single/series-capacitor transient responses.

## Module Summaries

- **Electrostatics Simulator**: Models point charges, continuous distributions, and conducting spheres using RK4 field lines, equipotential contours, and BEM potential solvers.
- **Gauss's Law Explorer**: Illustrates electric flux through spherical, cylindrical, and planar Gaussian surfaces with real-time verification against enclosed charge.
- **Capacitor Physics Explorer**: Evaluates capacitance, stored energy, and dielectric boundary conditions across parallel-plate, cylindrical, and spherical geometries.
- **Capacitor Network Builder**: Computes equivalent capacitance and analyzes voltage distribution across complex series-parallel capacitor circuit diagrams.
- **Conductivity Explorer**: Simulates microscopic Drude electron drift velocity, lattice scattering, and temperature-dependent resistivity to analyze material resistance and power.
- **Semiconductor Physics Lab**: Follows bond electrons through thermal excitation, doping, vacancy transfers, and applied-voltage drift in one crystal with a synchronized energy diagram.
- **DC Circuit Lab**: A blank, click-to-wire circuit canvas with batteries, resistors, capacitors, and live component voltage/current/value labels.

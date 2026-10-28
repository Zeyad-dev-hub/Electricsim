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

A blank circuit workspace with Battery, Resistor, Lamp, Capacitor, Switch, Wire, and Ground. Move/edit and Pan are navigation tools. The header provides Undo, Redo, and Clear. Click or tap a component to edit its value/unit, rotate, or delete it; the inspector also shows signed voltage/current, detailed current, power, terminal potentials, and capacitor charge/energy. Switches start open and can be toggled through the inspector or Space on the focused canvas, including during playback. Lamps use an adjustable fixed resistance (100 Ω by default), participate in DC and capacitor transient solves, and glow according to accepted electrical power. Glow reaches 100% at 1 W; it is a teaching visualization without temperature-dependent filament resistance. The inspector reports Lit/Off and numerical glow independently of color.

Wire taps create explicit junctions, snapping free-space points to the 24-unit grid when Snap to grid is enabled. Tapping a terminal or existing wire finishes a route; Escape/right-click ends it. Tapping a crossing joins the wires at a junction dot. Unclicked crossings stay disconnected and have a visual gap. Automatic routes use outward terminal stubs and candidate lanes around symbol bodies; explicit bends survive route splitting. Drag a wire segment in Move/edit to adjust its route without a modifier key. Moving/rotating components and moving junctions preserve electrical identities. The Select list and Use selected endpoint button support keyboard wiring and ground attachment.

Component tools show a translucent placement preview. Press and slide to position a part, then release to add it; a canceled touch or second finger does not add anything. Rotate next (or R on the canvas) rotates the preview. Keep placing retains the tool and orientation for multiple additions; Escape returns to Move/edit. Duplicate prepares a copy of the selected component's value, orientation, and configured initial state with fresh terminal identities, ready to place. Drag previews move continuously, snapping only on release; disable Snap to grid or hold Shift for free movement. A completed drag produces one undo entry. Small finger jitter is treated as a tap. Empty-space dragging pans, and two fingers pan/pinch in every tool while discarding pending geometry or placement. Gesture suppression continues until both fingers have lifted. Escape, lost pointer capture, window blur, and tab hiding discard unfinished edits; undo also cancels an active draft. Canvas focus does not scroll the page, and opening/closing the inspector preserves the drawing's screen position.

Ground attaches to an existing terminal, junction, or clicked wire; it can also create a new junction on empty space. All ground symbols denote the same electrical net. Multiple grounds can join disconnected circuits or create an invalid ideal short. Selecting a ground glyph or its list entry allows removing only the attachment. Groundless islands continue to use labeled local references.

Voltage uses A − B and current uses A → B. Power follows the passive sign convention: negative power means energy is delivered. Battery symbols reflect the sign of their source voltage. Capacitor plate marks use charge rather than voltage alone: a fully visible mark represents approximately 2 mC, capped at five; exact charge and energy remain in the inspector. Below-resolution nonzero currents display `<1 µA` (with a negative indication when appropriate), rather than exact zero. Internal solver values are not rounded. A structured measurement table is available under Measurements and keyboard help.

Current markers accumulate signed travel distance from accepted simulated time. Equal current has equal spatial speed regardless of wire length, and linear speed ratios match current ratios below a disclosed display cap. Auto selects a common reference at the first Run and holds it through Pause/Resume until reset or an explicit scale selection. Manual scale choices make different current ranges inspectable. Marker phase is retained when an existing route is split. These are scaled conventional-current cues, not literal electron or signal speeds. Reduced-motion preference disables markers; selected-current arrows and numerical readings remain available.

Run/Pause, Step 0.01 s, Reset time, and 0.01×–100× time scales expose accepted physical time. Reset restores configured initial capacitor voltages without deleting the circuit. Switching retains voltage/time and can continue playback. Other electrical edits pause playback and retain compatible capacitor voltage. Geometry edits, including geometry undo/redo, preserve accepted state. Invalid edits show unavailable measurements while retaining the last accepted state for repair; no hidden resistance or leakage is inserted. Capacitance edits retain voltage and therefore change stored charge/energy. Resistor-only circuits have a simulation clock without repeated operating-point solves.

The graph/MNA solver uses adaptive backward Euler with step doubling, normalized matrix residual checks, and wire-current recovery. Cycle-edge currents remain indeterminate while bridge feeds in the same net retain unique currents. Redundant ground attachments do not introduce artificial loops. Transient work yields between attempts using an 8 ms budget; unresolved target time remains visible as backlog. A single solve cannot be preempted, so this budget is not a hard frame-time guarantee. Routes, path lengths, crossing geometry, and the canvas grid are cached; paused scenes redraw on interaction/resize rather than continuously.

Fit view and zoom buttons supplement wheel zoom; large wheel deltas are capped per event. Pan supports mouse and touch; two-finger gestures pan/pinch without editing components. Narrow screens place the inspector below the canvas and give the object selector its own row. Phone and coarse-pointer controls have at least 44 px touch targets; numeric inputs and selects use 16 px text to avoid focus zoom on iOS. Window-width changes refit the circuit. On the canvas, [ / ] selects components; arrows move by one grid step (Shift for one unit); R rotates; Ctrl/Cmd+D duplicates; Delete removes; Space toggles a selected switch or starts/pauses playback; Enter places at the center or uses a selected connection. No examples, plots, transformations, or save/load controls are restored. Wiring previews reuse cached routes, and unchanged measurement tables are retained between frames.

Active files: `dc-circuit-model.js`, `dc-circuit-topology.js`, `dc-circuit-solver.js`, `dc-circuit-editor.js`, `dc-circuit-simulation.js`, `dc-circuit-renderer.js`, and `dc-circuit.js`. Analysis/preset modules remain available for numerical tests without being loaded by the page. Validation: `node dc-circuit.test.js` (28 checks), `node dc-circuit.math.test.js` (13 groups including 360 generated cases), and `node dc-circuit.improvements.test.js` (24 checks). `dc-circuit.browser.test.js` uses Playwright with an installed Edge channel on Windows (override with `CIRCUIT_BROWSER_CHANNEL`) and Chromium elsewhere. It builds an RC circuit through actual UI actions and checks ground, charge retention, undo/redo, invalid-edit repair, step/reset, mobile widths, reduced motion, touch pan/pinch, and keyboard editing. Fresh touch-enabled phone contexts at 320, 390, and 412 px check component placement, wiring, switching during playback, lamp readings/glow, resistance edits, rotation, delete/undo, portrait/landscape overflow, and control sizes. These are Chromium device emulations, not physical-device or Safari verification. The browser runner serves the workspace on an ephemeral loopback port and writes screenshots to the system temp directory. It requires Playwright on the Node module path, but adds no production dependency.

`dc-circuit.interaction.test.js` adds browser checks for deferred placement, smooth drag previews, grid/free movement, one-step drag undo, stable inspector layout, Escape cancellation, fine keyboard movement, duplication, repeated rotated placement, background pan, wire reshaping, and touch pinch/cancellation/jitter behavior. Like the main browser test it uses Playwright and an installed browser channel; it adds no production dependency.

## Module Summaries

- **Electrostatics Simulator**: Models point charges, continuous distributions, and conducting spheres using RK4 field lines, equipotential contours, and BEM potential solvers.
- **Gauss's Law Explorer**: Illustrates electric flux through spherical, cylindrical, and planar Gaussian surfaces with real-time verification against enclosed charge.
- **Capacitor Physics Explorer**: Evaluates capacitance, stored energy, and dielectric boundary conditions across parallel-plate, cylindrical, and spherical geometries.
- **Capacitor Network Builder**: Computes equivalent capacitance and analyzes voltage distribution across complex series-parallel capacitor circuit diagrams.
- **Conductivity Explorer**: Simulates microscopic Drude electron drift velocity, lattice scattering, and temperature-dependent resistivity to analyze material resistance and power.
- **Semiconductor Physics Lab**: Follows bond electrons through thermal excitation, doping, vacancy transfers, and applied-voltage drift in one crystal with a synchronized energy diagram.
- **DC Circuit Lab**: A circuit canvas with batteries, resistors, lamps, capacitors, switches, live readings, smooth dragging, placement previews, and touch pan/pinch.

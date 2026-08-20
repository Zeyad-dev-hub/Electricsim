# Electricsim Platform: Scientific Research Simulation Suite

## Project Overview

Electricsim is a vanilla HTML, CSS, and JavaScript web platform for interactive scientific physics simulations. The project now uses a four-module hub-and-spoke architecture focused on electrostatics, Gauss's law, capacitance, and material conductivity.

The visual direction is a black, modern, professional research-lab interface with matte panels, fine grid textures, restrained glow accents, and high-contrast scientific readouts.

## Architecture

```text
index.html
  +-- electrostatics.html   + script.js        + style.css
  +-- gauss.html            + gauss.js         + gauss.css
  +-- capacitor.html        + capacitor.js     + capacitor.css
  +-- conductivity.html     + conductivity.js  + conductivity.css + style.css
  +-- research-theme.css
```

Each simulation module remains self-contained and keeps its own JavaScript engine. The shared `research-theme.css` file is loaded after module stylesheets so the new design can be applied without rewriting the physics logic.

## Current File Layout

```text
Project Root
|
+-- index.html             Hub page for the four simulations
+-- research-theme.css     Shared black scientific research theme
+-- style.css              Shared electrostatics/conductivity base styles
+-- script.js              Electrostatics physics engine
+-- electrostatics.html    Electrostatics page
+-- gauss.html             Gauss's Law explorer page
+-- gauss.css              Gauss's Law base styles
+-- gauss.js               Gauss's Law physics & visualization engine
+-- capacitor.html         Capacitor lab page
+-- capacitor.css          Capacitor base styles
+-- capacitor.js           Capacitor physics and network engine
+-- conductivity.html      Conductivity explorer page
+-- conductivity.css       Conductivity base styles
+-- conductivity.js        Drude-model conductivity simulation
+-- me.md                  Project summary
+-- Documentation.md       Current technical documentation
```

## Technology Stack

- Vanilla JavaScript ES6+
- HTML5 Canvas 2D rendering
- CSS custom properties, responsive layouts, and layered theme overrides
- MathJax on the Capacitor Lab page
- Google Fonts: Inter
- Native JavaScript math and data structures
- `requestAnimationFrame` animation loops

## Design System

### Visual Direction

The interface uses a black research-instrument style:

- Matte black background: `#000000`
- Graphite panels with thin borders and top specular highlight
- Subtle scientific grid overlays
- Compact professional controls
- Monospace numeric readouts
- Restrained accent colors per module
- Reduced decorative motion compared with the former glassmorphism-heavy style

### Shared Theme File

`research-theme.css` centralizes the look:

- Theme variables
- Panel and HUD styling
- Button and input styling
- Range slider styling
- Toggle styling
- Hub card styling
- Reduced-motion support
- Module-specific accent overrides

### Module Accent Colors

| Module | Accent | Usage |
|---|---:|---|
| Electrostatics | `#8b9dff` | Electric field / physics engine identity (Slate Blue) |
| Gauss's Law Explorer | `#37e0a1` | Gauss's Law and flux highlights (Emerald Green) |
| Capacitor Lab | `#3dd9ff` | Capacitance and measurement highlights (Cyan) |
| Conductivity Explorer | `#f6b944` | Material transport and resistance highlights (Amber Yellow) |

## Hub Page

`index.html` is the central navigation surface. It contains:

- A full-screen animated scientific canvas background
- A research-suite heading
- Four launch cards
- A footer credit line

The hub exposes:

1. Electrostatics Simulator
2. Gauss's Law Explorer
3. Capacitor Simulator
4. Conductivity Explorer

On desktop, the hub uses a single-page no-scroll layout where all elements fit dynamically within the viewport.

## Electrostatics Simulator

Files:

- `electrostatics.html`
- `script.js`
- `style.css`
- `research-theme.css`

Core capabilities:

- Point charges
- Charged rods
- Charged rings
- Conducting and non-conducting spheres
- Electric field line visualization
- Equipotential contour visualization
- Force vectors
- Probe HUD
- Distance and charge unit controls
- Undo/redo interactions
- Camera pan and zoom

Important formulas:

```text
F = k q1 q2 / r^2
E = k q / r^2
V = k q / r
```

Rendering and numerical methods include Runge-Kutta field-line integration, marching-squares equipotential contours, and a boundary-element style solver for conducting sphere behavior.

## Gauss's Law Explorer

Files:

- `gauss.html`
- `gauss.css`
- `gauss.js`
- `research-theme.css`

Core capabilities:

- 5 interactive charge geometries: Point Charge, Infinite Line Charge, Infinite Plane Charge, Conducting Sphere, and Non-Conducting Sphere.
- Pseudo-3D wireframe models for spherical, cylindrical, and planar Gaussian surfaces.
- Active flowing field lines using continuously moving chevron arrowheads showing field/flux direction.
- Geometry-constrained field line rendering to ensure visual comfort and clarity.
- Live calculations HUD showing enclosed charge ($Q_{enc}$), Gaussian surface area ($A$), field strength ($E$), electric flux ($\Phi_E$), and a real-time Gauss's Law verification check ($Q_{enc}/\varepsilon_0$).
- Toggleable surface normal ($dA$) vectors, electric field ($E$) vectors, and flux intersection glows.
- Mathematical rule overlay with real-time value substitution.

Important formulas:

```text
Point Charge / Spherical outside: E = q / (4 * pi * eps0 * r^2)
Conducting Sphere inside: E = 0
Non-conducting Sphere inside: E = (q * r) / (4 * pi * eps0 * R^3)
Line Charge: E = lambda / (2 * pi * eps0 * r)
Plane Charge: E = sigma / (2 * eps0)
Gauss's Law: Phi = Q_enc / eps0
```

## Capacitor Lab

Files:

- `capacitor.html`
- `capacitor.css`
- `capacitor.js`
- `research-theme.css`

Core capabilities:

- Parallel plate capacitor model
- Cylindrical capacitor model
- Spherical capacitor model
- Dielectric material selector
- Custom dielectric constant
- Voltage, geometry, and material controls
- Live capacitance, charge, energy, and field readouts
- Series and parallel capacitor network builder
- Formula modal with MathJax rendering

Important formulas:

```text
C = k eps0 A / d
Q = C V
U = 1/2 C V^2
C_parallel = sum(C_i)
1 / C_series = sum(1 / C_i)
```

## Conductivity Explorer

Files:

- `conductivity.html`
- `conductivity.css`
- `conductivity.js`
- `style.css`
- `research-theme.css`

Core capabilities:

- Drude-model electron drift visualization
- Material presets for common conductors
- Temperature-dependent resistivity
- Length, area, voltage, and temperature controls
- Live resistance, current, power, and drift velocity readouts
- Animated lattice atoms and electron motion

Important formulas:

```text
rho(T) = rho0 [1 + alpha(T - 20)]
R = rho L / A
I = V / R
P = V I
vd = I / (n e A)
```

## Responsive Behavior

The project is fully responsive and optimized for touch interactions on mobile phones and tablets. On smaller screens:

- **Touch Action Overrides**: All simulator canvases enforce `touch-action: none` to prevent browser scrolling, panning, or viewport bounce while dragging charges or adjusting nodes, providing extremely smooth touch controls.
- **Vertical Layout Stacking**: In both the Gauss's Law Explorer and Conductivity Explorer, the canvas, control sidebars, and HUD panels stack vertically in a clean scrollable flow on screens ≤768px, preventing clashing or overlapping overlays.
- **Capacitor Mobile Drawer**: The Capacitor Lab's control sidebar automatically transforms into a compact bottom drawer on mobile devices, maximizing canvas workspace.
- **Tablet Optimization (769px–1100px)**: Custom media queries scale down control panels and sidebar widths (e.g., in Electrostatics and Capacitor Lab) to prevent HUD collisions and maintain canvas visibility on iPads and mid-sized tablets.
- **Page Title Truncation**: Page headers automatically scale down and use text-overflow truncation on narrow screens (≤480px) to prevent layout wrapping.
- **Touch-Friendly Controls**: Slider tracks are optimized and slider thumbs are enlarged to 22px on touch devices for easier dragging.
- **Responsive Hub Grid**: The hub home page uses a 4-column grid on desktops, a 2x2 grid on tablets, and stacks into a single column on mobile.
- **Reduced Motion Support**: Detects `prefers-reduced-motion` to disable expensive CSS background animations and particle flow.

## Verification Notes

Current expected pages:

- `index.html`
- `electrostatics.html`
- `gauss.html`
- `capacitor.html`
- `conductivity.html`


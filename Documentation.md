# Electricsim Platform: Scientific Research Simulation Suite

## Comprehensive Project Overview

Electricsim is an advanced, high-fidelity web-based physics simulation platform built entirely with vanilla JavaScript ES6+, HTML5 Canvas 2D, and CSS3. Designed with a sophisticated black research-lab aesthetic, the platform provides interactive computational laboratories for exploring classical electromagnetism, electrostatics, capacitance, and charge transport phenomena. 

The application architecture utilizes a modular hub-and-spoke design where each simulation operates as an independent, self-contained engine supported by a unified design system (`research-theme.css`). Performance is optimized through batched rendering primitives, Path2D caching, custom Runge-Kutta (RK4) numerical integration for electric field lines, marching-squares algorithms for equipotential contour generation, and boundary-element method (BEM) linear solvers for conducting geometries.

---

## Architecture & File Directory

```text
Project Root
|
+-- index.html             Central hub interface with animated canvas background
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

### 3. Capacitor Lab (`capacitor.html` / `capacitor.js`)
Analyzes parallel-plate, cylindrical, and spherical capacitor geometries under variable dielectrics, voltages, and plate separations. Includes an interactive series-parallel network builder with dynamic schematic layout rendering, energy storage calculations, and MathJax formula integration.

### 4. Conductivity Explorer (`conductivity.html` / `conductivity.js`)
Simulates microscopic electron drift velocity under the Drude scattering model across various material presets. Explores how temperature, cross-sectional area, length, and applied voltage impact resistivity $\rho(T)$, total resistance $R$, current $I$, and power dissipation $P$.

---

## Module Summaries

- **Electrostatics Simulator**: Models point charges, continuous distributions, and conducting spheres using RK4 field lines, equipotential contours, and BEM potential solvers.
- **Gauss's Law Explorer**: Illustrates electric flux through spherical, cylindrical, and planar Gaussian surfaces with real-time verification against enclosed charge.
- **Capacitor Lab**: Evaluates capacitance, stored energy, and dielectric boundary conditions across parallel-plate, cylindrical, and spherical geometries alongside network builder circuits.
- **Conductivity Explorer**: Simulates microscopic Drude electron drift velocity, lattice scattering, and temperature-dependent resistivity to analyze material resistance and power.

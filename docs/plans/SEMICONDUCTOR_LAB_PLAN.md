# Semiconductor Physics Lab - Plan and Architecture

## 1. Product decision

Build one new hub destination named **Semiconductor Physics Lab**. It will be one
simulation page with a shared physical state and four progressive internal
workspaces:

1. **Atoms & Materials**
2. **Crystal & Thermal Carriers**
3. **Doping & Energy Bands**
4. **Carrier Transport**

These are not separate simulations or pages. Changing the material, temperature,
or dopant concentration in one workspace updates every other workspace. A learner
can move from an atom to a crystal, then to the band model and macroscopic current
without losing the experiment they constructed.

### Explicitly out of scope

- The lecture's basic resistor, inductor, capacitor, source, and simple-component
  introduction.
- Diode packages, diode circuits, BJT, and FET overviews.
- PN-junction and diode I-V behavior. Lecture 2 names the PN junction in its title,
  but the supplied slides stop at drift and diffusion. PN behavior belongs in the
  later dedicated junction lab and should consume the model built here.

The material classification comparison (conductor, semiconductor, insulator)
remains in scope because it teaches band structure rather than circuit components.

## 2. Learning journey

The persistent concept rail at the top of the lab will show:

`atomic structure -> bonds and bands -> carriers -> doping -> transport`

Each workspace answers one question:

| Workspace | Student question | Observable result |
| --- | --- | --- |
| Atoms & Materials | Why do materials conduct differently? | Shell occupancy, valence electrons, atomic core, and band-gap comparison change together. |
| Crystal & Thermal Carriers | How does a bound electron become mobile? | Heat breaks a representative covalent bond, creates an electron-hole pair, and later permits recombination. |
| Doping & Energy Bands | How can a few impurity atoms change an entire solid? | A substitutional donor or acceptor changes majority/minority carrier populations, Fermi level, conductivity, and resistivity. |
| Carrier Transport | What actually produces semiconductor current? | Animated carriers, concentration profiles, and current-density vectors distinguish drift from diffusion and show their sum. |

Every workspace follows the same visual grammar:

- **Cause controls** on the right.
- **Physical animation** in the central canvas.
- **Measured consequences** in a left/bottom HUD.
- **Energy-band or concentration graph** synchronized with the physical view.
- **Why it happened** sentence in an `aria-live` explanation region.
- **Equation inspector** that substitutes the current values instead of showing only
  a symbolic formula.

## 3. Lecture concept coverage

### Atoms & Materials

- Atomic number, neutral atoms, protons, and electrons.
- Electron shells and the shell capacity rule `N_e = 2n^2`.
- Energy increasing with distance from the nucleus.
- Atomic core versus valence shell; valence electrons.
- Silicon (`2, 8, 4`) and germanium (`2, 8, 18, 4`) atom presets.
- Conductor, semiconductor, and insulator classification.
- Band overlap, small band gap, and large band gap.
- Single-element group-IV semiconductors: silicon and germanium.
- Compound semiconductors from III-V and II-VI groups, including GaAs and
  representative light-emitting applications.
- Electron-volt meaning and conversion: `1 eV = 1.602176634e-19 J`.

The atom view will be clearly labeled as a pedagogical shell model, not a literal
classical orbit of an electron.

### Crystal & Thermal Carriers

- Four valence electrons and four covalent bonds in a 2D projection of the silicon
  lattice.
- Intrinsic material and the regular lattice.
- At `0 K`, a filled valence band, empty conduction band, no free carriers, and
  insulating behavior.
- Thermal excitation across the band gap.
- Electron-hole pair generation and recombination.
- Free electrons in the conduction band and holes in the valence band.
- Apparent hole movement caused by successive valence-electron bond changes.
- Intrinsic carrier density versus temperature for Si, Ge, and GaAs.
- Silicon and germanium band gaps from the lecture (`1.12 eV`, `0.67 eV`), with a
  documented GaAs material preset.
- `n_i = B T^(3/2) exp[-E_g/(2 k_B T)]` with consistent eV units.
- At `300 K`, the lecture's silicon reference `n_i ~= 1.5e10 cm^-3`.
- Intrinsic relations `n = p = n_i` and `np = n_i^2`.

The visible particle count will be representative, not one drawn particle per real
carrier. A scale badge will always distinguish the animated sample from the
calculated carrier density.

### Doping & Energy Bands

- Substitutional doping of a silicon lattice.
- Donors from group V, with phosphorus and arsenic choices.
- Acceptors from group III, with boron, aluminum, and gallium choices.
- N-type material: the donor's extra electron, donor ion, electron majority
  carriers, and thermally generated hole minority carriers.
- P-type material: the missing bond electron, acceptor ion, hole majority carriers,
  and electron minority carriers.
- The important distinction that a donor electron does not leave a valence-band
  hole.
- Light versus heavy doping across the lecture range, with a logarithmic
  concentration control.
- Simultaneous donor and acceptor concentrations so compensation and charge
  neutrality are visible rather than hidden.
- Majority and minority concentration calculations:

  `n = 0.5[(N_D-N_A) + sqrt((N_D-N_A)^2 + 4n_i^2)]`

  `p = n_i^2 / n`

  with the stable symmetric p-type form used when acceptors dominate.
- `np = n_i^2` and net charge-neutrality verification.
- Intrinsic Fermi level and movement of `E_F` toward `E_C` for N type or `E_V` for
  P type.
- A Fermi-Dirac occupation overlay:

  `f(E) = 1 / [1 + exp((E-E_F)/(k_B T))]`

- Temperature regimes: freeze-out, extrinsic, and intrinsic. The default lesson can
  use the lecture's full-ionization approximation, while an advanced toggle shows
  the more realistic low-temperature limitation.
- Conductivity and resistivity consequences of changing dopant density.

The doping animation will show local atomic causality and bulk consequences at the
same time: replacing one visible Si atom changes a bond, creates a donor electron or
acceptor hole, moves the Fermi level, changes the population counters, and changes
the material's calculated resistivity.

### Carrier Transport

- Drift and diffusion as distinct current mechanisms.
- Electric field from an applied potential difference.
- Electron drift opposite the electric field and hole drift with the field.
- `v_e = -mu_n E`, `v_h = mu_p E`.
- Lecture silicon reference mobilities at `300 K`: `mu_n = 1350` and
  `mu_p = 480 cm^2/(V s)`.
- Electron/hole mobility difference, with effective mass and scattering presented as
  the physical explanation.
- Semiconductor bar length and cross-section as a measuring geometry, not a basic
  circuit-component lesson.
- Current, current density, and conventional-current direction.
- Drift current densities:

  `J_n,drift = q n mu_n E`

  `J_p,drift = q p mu_p E`

- Conductivity and resistivity:

  `sigma = q(n mu_n + p mu_p)`

  `rho = 1/sigma`

- Carrier injection and a draggable, nonuniform concentration profile.
- Diffusion from high to low concentration without an electric field.
- Diffusion current densities and sign conventions:

  `J_n,diff = q D_n dn/dx`

  `J_p,diff = -q D_p dp/dx`

- Separate electron and hole vectors for drift, diffusion, and total current.
- Optional advanced overlays for the course-outline concepts of scattering,
  lifetime/recombination, and Hall deflection. These overlays stay inside the
  Transport workspace and do not become separate labs.

## 4. Interaction and visual architecture

### Single-page layout

```text
+--------------------------------------------------------------------------+
| Hub | Semiconductor Physics Lab | stage tabs | pause | reset | formulas |
+--------------------------------------------------------------------------+
| Persistent concept rail: atom -> lattice -> bands -> carriers -> current |
+------------------+-----------------------------------+-------------------+
| Live quantities  |                                   | Experiment        |
| n, p, ni, EF     |        MAIN PHYSICAL CANVAS       | material          |
| sigma, rho, J    |                                   | temperature       |
| charge neutrality|                                   | doping / field    |
+------------------+------------------------+----------+-------------------+
| Explanation / observation                | synchronized graph / bands   |
+------------------------------------------+------------------------------+
```

On narrow screens the order becomes: stage tabs, experiment controls, canvas,
measurements, graph, explanation. No content is accessible only through hover.

### Visual encoding

- Electron: blue filled particle with a minus sign.
- Hole: amber outlined particle with a plus/empty-bond shape.
- Silicon core: neutral silver/cyan node labeled `Si`.
- Donor: violet pentagonal marker labeled by element; ionized donor has a visible
  positive ring.
- Acceptor: rose triangular marker; ionized acceptor has a visible negative ring.
- Electric field: green arrows.
- Conventional current: white arrows.
- Every color encoding also has a shape, label, or line-pattern encoding.

Atomic, lattice, band, and macroscopic views use animated linking traces. For
example, clicking a thermally excited electron highlights its broken bond, the new
conduction-band particle, the matching hole, and its contribution to `n` and `p`.

### Guided exploration

- **Explore mode:** all valid controls are available.
- **Guided mode:** short observations progress from neutral Si atom to doped current
  transport. This is an overlay on the same simulation, not a second location.
- **Challenge cards:** reproduce selected lecture examples and predict the result
  before revealing it.
- Presets: `Intrinsic Si at 0 K`, `Intrinsic Si at 300 K`, `N-Si 1e17`, `P-Si
  1e16`, `Drift example`, and `Diffusion example`.

## 5. Physics engine

### Canonical state

```js
const state = {
  materialId: 'si',
  temperatureK: 300,
  donorId: 'p',
  acceptorId: 'b',
  donorDensityCm3: 0,
  acceptorDensityCm3: 0,
  fullIonizationApproximation: true,
  electricFieldVcm: 0,
  sampleLengthCm: 1e-4,
  sampleAreaCm2: 2.5e-9,
  electronProfile: [],
  holeProfile: [],
  activeStage: 'atoms',
  paused: false,
  reducedMotion: false
};
```

All calculated values are derived from this state in one pure `solvePhysics(state)`
function. Rendering code never invents or independently modifies a physical value.

### Derived result

`solvePhysics` returns `Eg`, `ni`, ionized donor/acceptor densities, `n`, `p`,
`EF`, `f(E)`, electron/hole mobility, diffusion constants, drift velocities,
conductivity, resistivity, all four current-density contributions, total current
density, total current, and charge-neutrality residual.

### Numerical and representational rules

- Use centimeters consistently inside the semiconductor equations because the
  lectures use `cm^-3`, `cm^2/(V s)`, and `A/cm^2`.
- Convert only at the UI boundary and always show units.
- Use `k_B = 8.617333262e-5 eV/K` when `E_g` is in eV. Separately teach the joule
  value and eV conversion.
- Use logarithmic sliders for carrier and dopant densities.
- Protect exponential calculations against overflow and underflow.
- Use a fixed-timestep animation loop; animation speed is a visual scale and never
  changes the numerical result.
- Visually magnify drift relative to thermal motion and label the magnification.
- Seed stochastic generation/recombination and scattering so presets are repeatable.
- Treat the lattice as a 2D instructional projection of a 3D crystal and label it.

### Material data

A frozen data table in `semiconductor.js` will contain material constants and source
notes. Silicon is the fully supported default. Germanium and GaAs support comparison
of band gap and intrinsic density. Conductor and insulator presets are qualitative
band-structure comparisons and do not pretend to use the semiconductor carrier
solver outside its valid domain.

## 6. Vanilla project structure

No framework, package manager, build tool, chart library, or new runtime dependency
is required.

```text
index.html               add one hub card
semiconductor.html       the single lab and accessible semantic UI
semiconductor.css        responsive lab-specific layout and visual encoding
semiconductor.js         state, solver, interaction, Canvas 2D rendering, charts
research-theme.css       reuse existing tokens/panels; only shared additions if needed
shared-bg.js             reuse unchanged
Documentation.md         add module and physics description after implementation
```

`semiconductor.js` will be internally organized into these sections/classes while
remaining a normal ES6 script consistent with the current project:

1. constants and material data;
2. canonical state and presets;
3. pure semiconductor solver;
4. DOM bindings and formatting;
5. stage controller;
6. `AtomRenderer`;
7. `LatticeRenderer`;
8. `BandRenderer`;
9. `TransportRenderer`;
10. graph and equation rendering;
11. accessibility summary;
12. animation loop and initialization.

## 7. Accessibility and inclusion requirements

- Full keyboard operation for stages, sliders, presets, graph handles, pause, reset,
  and step controls.
- Visible focus states and a logical focus order.
- Every canvas has an adjacent live textual description and numerical data table.
- Important updates use a polite `aria-live` region; continuous animation does not
  spam assistive technology.
- Color is never the sole distinction between electrons, holes, donors, acceptors,
  bands, or current mechanisms.
- High-contrast mode and reduced-motion behavior.
- Pause, single-step, and animation-speed controls.
- Plain-language explanation first, equation detail second.
- Symbols are introduced with their names and units.
- Responsive controls sized for touch and usable without browser zoom suppression.
- Tooltips and help remain available by focus/click, not hover only.
- Guided mode never blocks free exploration and remembers no hidden progress.

## 8. Source-quality corrections

The implementation teaches the lecture concepts but does not reproduce evident
slide mistakes or misleading simplifications:

- Dopant and carrier concentrations use `cm^-3`, not `cm^-2`.
- The drift worked example is implemented with `N_D = 1e16 cm^-3`, matching its
  arithmetic and `27 microampere` result; the printed `1e6` value is inconsistent.
- `valence shell` and `valence band` are distinct concepts in the UI.
- The explanation of lower hole mobility uses effective mass and scattering rather
  than presenting a stronger nuclear pull as the complete microscopic model.
- A hole is shown as an emergent missing-electron state, not as a positive atomic
  particle.
- The lecture's simple N-type temperature sketch is expanded into freeze-out,
  extrinsic, and intrinsic regimes when advanced realism is enabled.
- Sign conventions are displayed beside electron motion, hole motion, and
  conventional current to prevent direction confusion.

## 9. Verification plan

### Physics checks

- Intrinsic Si at `300 K`: `n = p = ni ~= 1.5e10 cm^-3` under the lecture model.
- N-type Si with `N_D = 1e17 cm^-3`: `n ~= 1e17 cm^-3` and
  `p ~= 2.25e3 cm^-3`.
- P-type Si with `N_A = 1e16 cm^-3`: `p ~= 1e16 cm^-3` and
  `n ~= 2.25e4 cm^-3`.
- All solved states satisfy `np ~= ni^2` and charge neutrality within numeric
  tolerance.
- Intrinsic resistivity example: approximately `2.28e5 ohm cm` with the lecture
  mobilities.
- P-type resistivity example: approximately `1.56 ohm cm` with the lecture inputs.
- Corrected drift example: `v_n = 6.75e6 cm/s`, `J_n = 1.08e4 A/cm^2`, and
  `I = 27 microampere`.
- Diffusion example with its implied `D_p = 12 cm^2/s`: `J_p(0) = 192 A/cm^2`
  and `I_p = 192 microampere`.
- Electron drift direction is opposite `E`; both electron and hole drift
  contributions produce conventional current along `E`.

### Product checks

- No console errors and no external dependency beyond the project's existing font
  request.
- Layout checked at desktop, tablet, and narrow mobile sizes.
- Keyboard-only completion of every guided observation.
- Reduced-motion mode has no essential information conveyed only by animation.
- Canvas state and the accessible text/table remain numerically identical.
- Reset returns every stage and derived quantity to the same documented preset.

## 10. Implementation sequence

### Phase 1 - Skeleton and solver

- Add the hub card and the single lab page.
- Build the responsive layout, stage navigation, shared state, material data, unit
  formatting, and pure solver.
- Add automated numeric assertions for the lecture examples.

### Phase 2 - Atomic and intrinsic views

- Implement atoms, shells, band classification, lattice bonds, temperature-driven
  generation/recombination, intrinsic-density graph, and synchronized band view.

### Phase 3 - Doping

- Implement substitutional donor/acceptor interactions, representative dopant
  scaling, majority/minority carriers, compensation, charge neutrality, Fermi
  level, and Fermi-Dirac overlay.

### Phase 4 - Transport

- Implement drift/scattering animation, bar geometry, conductivity/resistivity,
  draggable concentration profiles, diffusion, and current-vector decomposition.

### Phase 5 - Teaching and accessibility layer

- Add guided observations, challenge presets, equation substitution, live text
  descriptions, keyboard interactions, reduced motion, high contrast, and mobile
  refinements.

### Phase 6 - Verification and documentation

- Run every lecture-example assertion, test responsive and accessible behavior,
  visually inspect all workspaces, and update `Documentation.md`.

## 11. Definition of done

The lab is complete when a learner can start with a neutral silicon atom, inspect
its four valence electrons, construct the intrinsic lattice, heat it to create and
recombine an electron-hole pair, substitute a donor or acceptor, observe the Fermi
level and carrier populations change, apply an electric field or concentration
gradient, and explain the resulting current using both the animation and the
matching equations - all without leaving the single Semiconductor Physics Lab.

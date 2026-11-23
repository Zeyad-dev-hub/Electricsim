# ⚡ Electricsim — Physics Simulations & Virtual Engineering Labs

Electricsim is a zero-dependency, browser-native scientific simulation platform for electrostatics, Gaussian flux, dielectrics & capacitor networks, Drude conductivity, semiconductor physics, digital logic design, 74xx DIP electronics, and DC/AC circuit analysis.

Open [`index.html`](index.html) directly in any modern browser to launch the Hub.

---

## 📁 Project Structure

```text
Electricsim/
├── index.html                  # Main Hub landing page (5 Physics Simulations + 4 Virtual Labs)
├── README.md                   # Project overview & directory map
│
├── pages/                      # Standalone HTML pages for each simulation and virtual lab
│   ├── electrostatics.html     # Electrostatics Simulator (point charges, conductors, BEM, RK4 field lines)
│   ├── gauss.html              # Gauss's Law Explorer (3D flux & enclosed charge symmetry)
│   ├── capacitor.html          # Capacitor Physics Explorer (parallel-plate, cylindrical, spherical)
│   ├── capacitor-networks.html # Capacitor Networks Lab (nested series/parallel trees & schematics)
│   ├── conductivity.html       # Conductivity Explorer (Drude electron transport & thermal phonon scattering)
│   ├── semiconductor.html      # Semiconductor Physics Simulation (Si crystal bonds, doping & hole transport)
│   ├── logic.html              # Logic Lab (gates, MSI blocks, SR/D latches, Boolean algebra, K-maps, synthesis)
│   ├── logic-ic.html           # Logic IC Lab (classic 17x 74xx DIP IC digital bench with X-Ray internals)
│   ├── electronics.html        # 2D Electronics Lab (breadboards, AA/9V/PSU, DC motor RPM, variable resistors, pot, NPN, DMM, 17x 74xx ICs w/ X-Ray, 3-mode export)
│   └── dc-circuit.html         # Circuits Lab (DC/AC MNA solver, RLC transients, diodes/Zeners, dual-channel scope)
│
├── css/                        # Stylesheets & unified dark research theme
│   ├── research-theme.css      # Core dark research-lab design system & hub card accents
│   ├── style.css               # Shared base layout & utility styles
│   ├── gauss.css               # Gauss's Law Explorer styles
│   ├── capacitor.css           # Capacitor Physics & Capacitor Networks styles
│   ├── conductivity.css        # Conductivity Explorer styles
│   ├── semiconductor.css       # Semiconductor Lab styles
│   ├── dc-circuit.css          # Circuits Lab & dual-channel oscilloscope styles
│   └── logic.css               # Logic Lab & Electronics Lab responsive workspace styles
│
├── js/                         # Application & physics simulation engines
│   ├── shared-bg.js            # Ambient animated research-grid background canvas
│   ├── hub-search.js           # Hub keyword search & section filter
│   ├── script.js               # Electrostatics Simulator engine (BEM solver, RK4 field lines, marching squares)
│   ├── gauss.js                # Gauss's Law 3D projection & flux engine
│   ├── capacitor.js            # Dual-mode Capacitor Physics & Capacitor Networks engine
│   ├── conductivity.js         # Drude scattering & spatial-hash collision engine
│   ├── semiconductor-model.js  # Headless silicon lattice, doping & mass-action physics model
│   ├── semiconductor.js        # Multi-canvas Semiconductor Lab controller
│   ├── dc-circuit-model.js     # Circuits Lab document schema & component definitions
│   ├── dc-circuit-topology.js  # Union-Find net compiler & branch current recovery
│   ├── dc-circuit-solver.js    # Modified Nodal Analysis (MNA) & Newton-Raphson diode/Zener/transformer solver
│   ├── dc-circuit-analysis.js  # Equivalent resistance & analytical circuit helpers
│   ├── dc-circuit-editor.js    # Grid snapping & obstacle-aware orthogonal wire routing
│   ├── dc-circuit-simulation.js# Transient simulation clock & undo/redo state engine
│   ├── dc-circuit-renderer.js  # Schematic canvas renderer & current flow markers
│   ├── dc-circuit-presets.js   # Built-in DC/AC circuit presets
│   ├── dc-circuit.js           # Circuits Lab UI controller & dual-channel oscilloscope
│   ├── logic-model.js          # Logic Lab schema (gates, MSI blocks, SR/D latches, history)
│   ├── logic-evaluator.js      # Topological & sequential latch evaluator
│   ├── logic-expression.js     # Boolean AST builder & multi-notation formatter
│   ├── logic-simplify.js       # Exact Quine-McCluskey / Petrick minimizer & Karnaugh map builder
│   ├── logic-synthesis.js      # Minimal SOP/POS, NAND-only & NOR-only circuit synthesizer
│   ├── logic-editor.js         # Logic schematic editor & orthogonal wire router
│   ├── logic-renderer.js       # IEEE distinctive-shape gate & MSI renderer
│   ├── logic-presets.js        # Built-in combinational & sequential logic presets
│   ├── logic.js                # Logic Lab UI controller
│   ├── schematic-io.js         # Shared JSON & PNG iTXt save/load/drag-and-drop engine
│   ├── electronics-solver.js   # Unified hybrid analog + digital MNA solver & component overload/corruption physics
│   ├── electronics-components.js # Realistic 2D hardware renderer (breadboards, 2-leg LEDs, AA/9V/PSU, motors, DIP ICs)
│   ├── electronics-export.js   # 3-mode Electronics Lab exporter (JSON, 2D Bench PNG, textbook IEEE B&W Schematic PNG)
│   ├── logic-ic-classic.js     # Classic Logic IC Lab 74xx DIP IC bench engine (pages/logic-ic.html)
│   └── logic-ic-lab.js         # 2D Electronics Lab interactive controller, wire manager & presets
│
├── tests/                      # Automated Node.js & Playwright verification suites
│   ├── hub-search.test.js
│   ├── semiconductor-model.test.js
│   ├── dc-circuit.test.js
│   ├── dc-circuit.math.test.js
│   ├── dc-circuit.improvements.test.js
│   ├── dc-circuit.interaction.test.js
│   ├── dc-circuit.browser.test.js
│   ├── schematic-io.test.js
│   ├── electronics-lab-2d.test.js
│   └── logic-ic-lab.test.js
│
└── docs/                       # Platform documentation, user guides & design plans
    ├── Documentation.md        # Comprehensive technical architecture & mathematical documentation
    ├── FEATURES_GUIDE.md       # Plain-language user guide for every simulation and virtual lab
    └── plans/                  # Historical implementation & review documents
        ├── DC_CIRCUIT_LAB_IMPLEMENTATION_PLAN.md
        ├── DC_CIRCUIT_LAB_REVIEW.md
        ├── SEMICONDUCTOR_LAB_PLAN.md
        └── SEMICONDUCTOR_RESTRUCTURE_PLAN.md
```

---

## 🧪 Running Verification Tests (Optional)

The simulations run directly in the browser with zero build tools. To run the optional automated mathematical and UI verification suites with Node.js:

```bash
node tests/hub-search.test.js
node tests/semiconductor-model.test.js
node tests/dc-circuit.test.js
node tests/dc-circuit.math.test.js
node tests/dc-circuit.improvements.test.js
node tests/logic-ic-lab.test.js
node tests/electronics-lab-2d.test.js
node tests/schematic-io.test.js
```

---

*Developed by Zeyad Mahmoud — Faculty of Engineering at Shoubra.*

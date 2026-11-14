# DC Circuit Lab — implementation brief for GPT-6.1 Sol

Status: the original broad scope below has been superseded by the user's simplification request. The active lab is a blank canvas with batteries, resistors, capacitors, click-created wire junctions, and readings above components. Examples, analysis panels, plots, transformations, and save/load are removed from the interface. Numerical regression coverage remains in `dc-circuit.test.js`; existing labs are preserved.

## 1. Outcome and scope

Build a new, standalone `dc-circuit.html` lab inside Electricsim. Students must be able to assemble a DC circuit, inspect every component and branch, watch capacitors charge and discharge with physically calculated timing, simplify resistor networks, and transform equivalent voltage/current sources. Keep all activities in one workspace. Add a hub card when the lab is complete.

Use the existing stack: vanilla JavaScript, HTML, CSS, Canvas 2D, `requestAnimationFrame`, and the shared research theme. No framework, build system, external circuit service, or new production dependency. Headless tests may use Node's built-in test/assert facilities. Follow repository instructions and preserve existing work when implementation begins.

Required palette:

- Resistor, capacitor, ideal DC voltage source shown as a battery, and ideal DC current source.
- Wire, explicit junction, and ground/reference tools.
- An ideal open/closed switch, needed to demonstrate charging, isolation, and discharge without rewiring during playback.
- Voltage probe and branch-current inspection tools. Probes must not load or interrupt the circuit.

Support arbitrary linear R/C/source graphs, including bridges, multiple sources, parallel paths, open circuits, and multiple capacitors. Do not constrain circuits to a series/parallel tree. Exclude AC sources, inductors, semiconductor devices, dependent sources, and PCB fabrication from this implementation.

Deliver the complete required scope below; a visually convincing editor without a working general solver is incomplete.

## 2. Existing code to consult

Read `Documentation.md`, `research-theme.css`, `shared-bg.js`, `index.html`, `capacitor.html`, `capacitor.js`, and `semiconductor-model.js` before implementing.

- Reuse the shared black background, glass panels, Inter typography, indigo controls, cyan electrical accents, and amber charge accents.
- The capacitor lab provides symbol and explanatory UI references. Its `nState.network` is a recursive series/parallel tree and is **not** an appropriate topology or transient engine for this lab.
- The semiconductor model demonstrates a DOM-free module with Node regression checks. Follow that separation, not its semiconductor-specific equations.
- Do not import another lab's entire stylesheet or controller: global canvas, body, and control rules can conflict. Use the shared theme plus a scoped stylesheet.

## 3. Workspace and student workflow

Desktop layout:

```text
Hub | DC Circuit Lab | Examples | Undo / Redo | Save / Load
Build tools             Circuit canvas                 Inspector
R / C / Battery / I      Junctions and wire routes      Selected component
Wire / Switch / Ground  Component names and values     Value / units / polarity
                        Signed branch-current arrows  Terminal potentials
                        Optional node voltages        Current / power / charge
                        Selected measurement          Relevant explanation
Run / Pause | Step | Reset time | Time scale | Physical time
Analysis drawer: Waveforms | Simplify resistors | Transform source
```

Start with an editable 9 V / 1 kΩ / 1,000 µF charging example, paused at its initial condition, with the resistor, switch, and capacitor visibly connected. Include “Blank circuit.” Teach connecting two terminals with a short first-use hint; avoid a modal tutorial.

Normal operation:

1. Place components on a grid, rotate them, and connect terminals with orthogonal wires.
2. Select a component to edit its value using a number field and explicit unit selector. Optional sliders supplement the numeric inputs.
3. Run the circuit. Show electrical measurements immediately and capacitor state changing over time.
4. Select a branch or node for a persistent reading; select a capacitor to see its charge/voltage/current plot.
5. Open an analysis drawer for stepwise resistor reduction or source transformation without leaving the circuit.

Responsive behavior: collapse the palette to a toolbar, move the inspector below the canvas, and make analysis drawers full width. Preserve the canvas viewport and scroll access to controls. Include touch targets, keyboard placement/rotation/deletion, visible focus, screen-reader measurement tables, and reduced-motion support. Reduced motion stops decorative charge markers, not the electrical calculation.

## 4. Files and ownership

| File | Responsibility |
|---|---|
| `dc-circuit.html` | Semantic workspace, palette, inspector, analysis drawers, accessible result tables |
| `dc-circuit.css` | Scoped layout and responsive behavior using shared theme tokens |
| `dc-circuit-model.js` | Validated document schema, IDs, commands, undo/redo, serialization |
| `dc-circuit-topology.js` | Terminal connectivity, wire junctions, net compilation, branch tracing |
| `dc-circuit-solver.js` | Matrix assembly, linear solve, DC and transient solutions, diagnostics |
| `dc-circuit-analysis.js` | Resistor reductions, two-terminal equivalent resistance, source transforms |
| `dc-circuit-renderer.js` | Symbols, wire routes, labels, animation and hit geometry |
| `dc-circuit.js` | UI orchestration, editing, probes, physical clock, plots |
| `dc-circuit-presets.js` | Example circuit documents with expected teaching outcomes |
| `dc-circuit.test.js` | Numerical, graph, transformation, and state regression tests |

Use one browser namespace, `window.DCCircuit`, with ordered plain script tags. Pure modules should also expose CommonJS exports for tests, following the existing model pattern. Avoid unrelated globals and circular module dependencies. Prefer small functions within these files over an additional abstraction layer.

## 5. Data contracts — establish these before the editor

All stored electrical values use SI units. Display formatting is a separate layer. Do not parse units out of labels or use screen positions as connectivity.

```js
CircuitDocument = {
  schemaVersion: 1,
  components: [{
    id, type, label, terminals: [terminalAId, terminalBId],
    value, // ohms, farads, volts, or amperes according to type
    position: {x, y}, rotation,
    initialVoltage: 0, // capacitor only: Va - Vb
    closed: false     // switch only
  }],
  junctions: [{id, position: {x, y}}],
  wires: [{id, fromEndpoint, toEndpoint, waypoints: [{x, y}]}],
  referenceEndpoints: [endpointId],
  probes: [{id, kind, endpointsOrComponentId}],
  view: {panX, panY, zoom}
};

SimulationState = {
  time, capacitorVoltagesById, acceptedSolution, lastStepSize,
  running, timeScale, diagnostics, traceSamples
};

Solution = {
  nodeVoltages, // with reference-domain metadata
  componentResults, // {va, vb, voltage, current, power, charge?, energy?}
  branchResults, wireResults,
  diagnostics, residuals
};
```

Fields shown together in this sketch are type-specific in validation. Define discriminated component types; reject unknown fields/types or invalid values on import. Capacitors are ideal nonpolarized devices; terminal A is the positive voltage reference, not a restriction on voltage sign.

Stable IDs must survive rotation, wire rerouting, value edits, and saving. Solver state and plot buffers are separate from the saved circuit; initial capacitor voltages are saved. Saving/loading is local JSON with an explicit user action. Undo/redo records document commands, not animation frames.

Recommended pure API:

```js
compileCircuit(document) -> CompiledCircuit
validateCircuit(compiled, mode, initialState) -> Diagnostic[]
solveDC(compiled) -> Solution
initializeTransient(compiled, initialVoltages) -> SimulationState
advanceTransient(compiled, state, targetTime, tolerances) -> AdvanceResult
findResistorReductions(compiled, protectedTerminals) -> ReductionCandidate[]
applyReductionPreview(analysisGraph, candidate) -> ReductionStep
equivalentResistance(compiledResistorSubgraph, terminalA, terminalB) -> Result
previewSourceTransform(compiled, selectedComponentIds) -> TransformPreview
applySourceTransform(document, verifiedPreview) -> UndoableCommand
```

These functions must not access the DOM, Canvas, or wall clock. Do not mutate the caller's input state until a step/command is accepted.

## 6. Topology, nodes, branches, and ideal wires

Compile explicit terminal/wire connectivity using union-find. Closed ideal switches merge their terminals; open switches do not. All designated ground symbols represent the same reference net. A wire ending on another wire creates a junction by splitting that route. Crossings without a junction dot remain disconnected. Show a clear preview of whether a proposed connection will join a net.

Moving a component keeps its terminal IDs and connections. Deleting one removes or leaves visibly dangling attached connections according to one consistent editor rule; do not silently connect former neighbors. Round wire placement to the grid while preserving electrical identity.

Keep both representations:

- Electrical nets: equipotential wire-connected terminals used by the solver.
- Routed wire graph: physical segments and junctions used for branch highlighting and wire-current recovery.

A displayed branch is a maximal unbranched path between junctions or terminal boundaries. Give it a stable orientation and show its signed current. Every two-terminal component also has an exact signed current. Series-path grouping is a display aid; the numerical solver works with individual components.

For wire trees, recover segment currents from solved terminal injections by KCL, processing leaves toward a chosen root. Verify that all terminal injections at a net sum to zero. If the routed ideal-wire graph contains a loop, internal wire-segment currents may not be uniquely determined. Show “indeterminate within ideal wire loop,” highlight the loop, and keep unique component/branch measurements visible. Do not assign an arbitrary minimum-norm current and present it as physics. Suggest removing a redundant wire or adding explicit resistance if the student wants a defined current split.

Handle electrically disconnected islands separately. Groundless islands can use a clearly labeled local reference where the equations permit a solution. Label their potentials “relative to local reference”; cross-island voltage probes read “no common reference.” Choosing a gauge does not fix an actually underdetermined circuit or an inconsistent current source.

## 7. Numerical core: modified nodal analysis

Use modified nodal analysis (MNA) for general graphs, including bridges and multiple sources. For classroom circuit sizes, a dense `Float64Array` matrix and Gaussian elimination with scaled partial pivoting are sufficient. Start with a documented limit around 100 components; measure performance before increasing it.

Conventions must be identical in solver, labels, arrows, tests, and transforms:

- Component voltage: `v = Va - Vb`.
- Positive component current: A → B.
- Passive sign convention: `p = v * i`; positive power is absorbed, negative is delivered.
- A positive voltage-source value imposes `Va - Vb = Vs`; its solved current is A → B.
- A positive current-source value drives current A → B.

For resistor conductance `g = 1/R`, add `+g` to both terminal diagonals and `-g` to both cross entries, omitting reference-node rows/columns. For a current source `I` from A to B, subtract I from RHS A and add I to RHS B. For a voltage source, add one current unknown and the constraint row `Va - Vb = Vs`; stamp its current into terminal KCL equations with + at A and − at B.

DC mode opens capacitors. Transient mode stamps capacitor companion models. Distinguish a valid zero current from an unsolved/undefined current in the result type; never turn NaN into a displayed zero.

Validation and solver diagnostics must identify components/nets:

- Non-finite values; `R <= 0`; `C <= 0`; malformed endpoints.
- Nonzero ideal voltage across a short circuit.
- Inconsistent ideal voltage-source loops or incompatible capacitor initial constraints.
- Redundant ideal-source constraints with nonunique individual source currents.
- Current injection into an isolated network with no return path or energy-storage path compatible with the chosen analysis.
- Singular/ill-conditioned matrices and an inability to meet transient accuracy tolerances.

Use scale-aware pivot checks, row/column scaling as needed, and normalized residual checks. Do not quietly add leakage conductance, wire resistance, source resistance, or a hidden ground to force a solution. Preserve the last valid result with a visible “not current” indication when edits invalidate a circuit; stop marker animation and block Run until resolved.

## 8. Capacitor dynamics and actual elapsed time

The general solver must support more than one capacitor. Do not implement the whole lab as independent `1 - exp(-t/RC)` animations.

For capacitor voltage `v = Va - Vb` and current A → B:

```text
i = C dv/dt
qA = C v; qB = -qA
energy = 0.5 C v²

Backward Euler, step h:
g = C/h
i(new) = g * (v(new) - v(previous))
```

Stamp conductance g between the terminals and a history current source `-g * v(previous)` from A to B. Equivalently add `+g*v(previous)` to RHS A and its negative to RHS B. Keep signs in one reusable stamp function and test them explicitly. This companion-model approach is documented in [Qucs: energy-storage components](https://qucs.sourceforge.net/tech/node26.html); [Qucs: integration methods](https://qucs.sourceforge.net/tech/node24.html) describes the implicit integration family.

Use adaptive backward Euler with step doubling: compare one full step with two half steps from the same accepted state, estimate error in capacitor voltages, reject/refine when required, and accept the two-half-step result. Recompute stamps when h changes. Begin with 1e-5 relative and 1e-7 V absolute local voltage tolerances; validate the resulting global waveform accuracy against the fixtures below. Keep current estimates and plot samples consistent with the accepted substeps.

Bound the work per animation frame. At 1×, one simulated second should track one second of active wall-clock time within the tested circuit limits. Maintain explicit target physical time and accepted solver time. Never discard an unresolved time backlog or claim 1× while silently slowing the physics. If the solver cannot keep up, expose “calculating behind real time” and let the user choose a slower scale. Pause timing when the document is hidden and resume from the same physical state; do not integrate an unexplained tab-away interval.

Controls: Run/Pause, Step with a displayed physical Δt, Reset time, and time scale choices such as 0.01×, 0.1×, 1×, 10×, 100×. Auto-selecting a useful display scale may be offered explicitly, never hidden. Show physical time and current time scale together. Plot x axes always use physical seconds, with engineering units.

Initialization:

- Default all capacitor initial voltages to zero; permit per-capacitor initial voltage editing while paused.
- At t=0, solve the algebraic network with capacitor voltages constrained to their initial values to obtain consistent node voltages. Use an independent constraint basis when capacitor-voltage constraints are redundant. For example, parallel capacitors with equal initial voltage are valid and must work; unequal initial voltages connected by ideal wires are incompatible.
- Recover initial capacitor currents using the capacitive derivative equations and algebraic constraints, not arbitrary currents from redundant temporary voltage-source rows. In a parallel bank, current divides in proportion to capacitance. A converged right-hand-limit transient estimate is an acceptable implementation fallback if explicitly labeled as such; configured initial voltages must remain exact at t=0.
- Detect inconsistent ideal constraints. A capacitor connected directly across an ideal source at a different initial voltage requires an impulse, which this finite-step teaching solver must flag. Recommend an explicit series resistor; do not simulate a fictitious finite charging time. Consistent redundant capacitor initial constraints are distinct from nonunique currents in parallel ideal voltage sources.
- Isolated charged capacitors retain their voltage. A singular DC steady-state analysis does not automatically invalidate a well-posed transient state.

Editing policy:

- Moving/rerouting/probing does not affect simulation time or capacitor state.
- Topology, R/C values, source settings, and initial conditions are edited in paused setup mode; committing these prepares the configured initial state at t=0 and clearly updates the UI. This keeps C edits from silently inventing charge or energy.
- Toggling a switch is a scheduled event at the current simulated time. Preserve each capacitor's instantaneous voltage, revalidate the new topology, and restart with a small adaptive step. If the change would require an ideal impulse, pause with the relevant explanation.
- Reset time restores configured initial voltages, not always zero. Provide “Discharge initial state” to set selected/all initial capacitor voltages to zero before a new run.

Capacitor inspector:

- Signed terminal voltage, signed current, charge on each plate, stored energy, and initial voltage.
- Charging / discharging determined by the sign of `d(energy)/dt = v*i`, with a tolerance/deadband; near zero voltage use the predicted change in |v| to avoid a flickering label.
- “Empty (approximately 0 V)” uses a visible numerical tolerance and does not imply a disconnected capacitor.
- “Settled/charged” requires an existing finite equilibrium plus voltage and current sufficiently near it. Report retained charge for isolated capacitors separately.
- For a valid first-order circuit only, calculate `Rth` seen at the capacitor with independent voltage sources shorted and independent current sources opened; `tau = Rth*C`. Show the actual final voltage and `v(t) = Vfinal + (Vinitial - Vfinal) exp(-t/tau)` as an explanatory reference.
- At one tau, about 63.2% of a step is completed; at five tau, about 99.3%. Label the latter “approximately settled,” not exactly 100%.
- Do not apply a single tau to a general multi-capacitor circuit. Use numerical plots and “multiple time constants.” An ideal current source feeding an otherwise isolated capacitor gives a voltage ramp, not a fixed fully charged state.

Draw plate charge and a voltage indicator from solved q/v. Any percent indicator is relative to a defined selected step/final voltage; do not use battery voltage as a universal capacitor capacity. Current markers terminate at the plates; use a distinct field/charge-change cue in the dielectric so electrons do not appear to cross it.

## 9. Electrical measurements and animation

Provide independent display toggles: node potentials, component voltage drops, branch currents, and current markers. Default to component values plus a few uncluttered current arrows. Selecting a component exposes both terminal potentials (`A: ... V`, `B: ... V`), the signed difference, and current immediately. “Show all terminal voltages” must show readings at both sides of every component with collision-aware placement and leader lines.

Show units and significant digits appropriate to scale; never round a meaningful nA current to `0 A`. A current arrow follows its sign; its numeric label is authoritative. Conventional current is the default. An optional electron-flow overlay reverses direction and is explicitly labeled. Marker speed is a bounded visual mapping of |I|, not physical electron velocity; markers stop for zero/undefined current and while paused. Keep animation phase continuous across frames and polarity changes.

Selecting a junction highlights the incident branches and displays KCL with signed values. Selecting a component also displays power, clarifying source delivery versus absorption. The accessible table mirrors the same solver result as canvas labels; there must not be a second calculation path.

Record bounded trace buffers for selected capacitor voltage/current and optional branch probes. Mark switching events on the time axis. Retain actual accepted physical timestamps; downsample plots for rendering without changing physics.

## 10. Resistor simplification

Use an analysis copy, preserving the original circuit and its measurements. Students can select a two-terminal resistor subnetwork or use the full resistor-only load between chosen terminals. Show original and equivalent views within the analysis drawer, highlight the exact affected components, explain each rule, and offer Next, Back, and Reset derivation.

Series rule: two resistors sharing an internal node can combine only when that node has exactly two electrically active incident elements and is not a protected terminal, ground/reference, or external attachment. Screen proximity does not establish series connection. Parallel rule: resistors must share the same unordered pair of electrical nodes. Reversed terminal drawing order does not matter.

```text
Series:   Req = R1 + R2 + ...
Parallel: 1/Req = 1/R1 + 1/R2 + ...
```

Store reduction provenance: child resistor IDs, previous node mapping, equation, values, units, and before/after graph. The original graph remains authoritative for individual resistor current/voltage readings. A collapsed equivalent exposes only its external behavior; don't invent an internal voltage for a removed node.

When no series/parallel rule applies, report that honestly. For a bridge or other resistor-only two-terminal subnetwork, calculate equivalent resistance using a 1 A test source and the general solver, `Req = Vtest / 1 A`. Show “Numerical two-terminal equivalent; no further series/parallel reduction” with the original network beside it. Recognize open (`infinite R`) and short (`zero R`) terminal cases before solving. Delta–star derivation is optional future work, not required to compute a correct equivalent.

Do not absorb capacitors or active sources into a resistor group. Mixed circuits may still have valid resistor-only reductions if every external attachment is preserved. Keep local pedagogical reduction separate from DC steady-state equivalencing.

## 11. Voltage/current source transformation

A valid transformation replaces a two-terminal source **and its resistance**, retaining exactly the same external terminals. A bare ideal battery has no finite Norton counterpart. Selecting it should explain: “Select a series resistor with this battery to form a transformable source.” The palette can offer a clearly labeled practical-source preset with an explicit resistor. Do not silently add internal resistance.

Supported pairs:

- Thévenin: ideal voltage source Vs in series with finite positive Rs. The internal junction must have no third attachment, protected reference, or tapped connection.
- Norton: ideal current source In in parallel with finite positive Rp across the same two external nodes.

For ordered external terminals A/B and open-circuit voltage `Voc = Va - Vb`:

```text
Rth = Rn = R > 0
Norton current delivering toward A: In = Voc / R, arrow B → A
Thevenin voltage: Voc = In * R with the same external polarity
```

Map this explicitly to the solver's A→B current convention: if the current source's own terminal order is A,B, store `I = -Voc/R`. Never derive polarity from drawing rotation. Use topology and signed values to canonicalize pairs. The external equivalence of Thévenin and Norton networks is covered in [MIT OCW: Circuit Abstractions](https://ocw.mit.edu/courses/6-01sc-introduction-to-electrical-engineering-and-computer-science-i-spring-2011/pages/unit-3-circuits/circuit-abstractions/).

UI flow: select pair → highlight boundary A/B → show before/after symbols and substituted equation → compare load voltage/current → Apply or Cancel. Applying is one undoable document command, preserving the external connections, labels/probes where meaningful, and component placement readability. Clear or explicitly remap probes on internal elements that no longer exist.

Pause before applying; preserve external capacitor voltages and physical time for this verified equivalent resistive-source replacement. Rebuild the solver, check consistency, and continue only after the transformed network is valid. Keep the transform drawer's comparison traces separate from the live state.

Check terminal equivalence, not equality of internal currents/powers. Source internal current and resistor dissipation generally change under a transformation. If more than one eligible pair exists, require the student to choose the highlighted pair; never transform an arbitrary nearby resistor. Reject zero/infinite resistance, a tapped series junction, or a mismatched parallel pair with a concrete explanation.

## 12. Required example circuits

| Example | Demonstrates |
|---|---|
| Battery + one resistor | Ohm's law, terminal potentials, current/power signs |
| Two series resistors | Shared current and voltage division; one reduction |
| Two parallel resistors | Equal voltage, current split, KCL; one reduction |
| Mixed resistor network | Multiple reduction steps and traceable component provenance |
| Unbalanced bridge | General solver and numerical equivalent when local reductions stop |
| RC charge/discharge with switch | Physical tau, charge retention, a separate discharge path |
| Two-capacitor RC ladder | Coupled transients and more than one time constant |
| Thévenin ↔ Norton with resistor load | Same external load behavior before/after |
| Thévenin ↔ Norton with RC load | Same external transient with preserved initial state |

Examples should include short questions such as “Where does the current split?” or “What changes when capacitance doubles?” Keep them editable and resettable.

## 13. Implementation order and gates for Sol

Complete each gate before moving on. Keep the page usable at each stage.

1. **Document/topology contracts:** implement validated schemas, connectivity compilation, junction semantics, IDs, and a few serialized fixtures. Gate: graph tests pass independently of the UI.
2. **Resistive DC solver:** implement MNA, signs, source currents, residuals, and structured errors. Gate: series, parallel, bridge, multiple-source, open/short, and floating-reference fixtures pass.
3. **Working editor and measurements:** palette, wiring, selection, numeric units, undo/redo, save/load, labels, reference selection, and branch tracing. Gate: build a fresh circuit through the UI and match its analytical readings.
4. **Transient solver:** capacitor initialization, adaptive stepping, real-time clock, state-preserving switches, reset, traces, and capacitor status. Gate: RC and multi-capacitor numerical fixtures pass at different rendering frame rates.
5. **Resistor analysis drawer:** reduction provenance, stepwise highlighting, and numerical two-terminal fallback. Gate: equivalent terminal behavior is verified at every reduction step.
6. **Source transformation drawer:** eligibility, polarity, preview comparison, undoable apply, external capacitor-state preservation. Gate: load equivalence passes in both directions, orientations, and transient cases.
7. **Teaching visuals and integration:** uncluttered overlays, charge cues, examples, responsive/accessibility pass, hub card, and documentation. Gate: acceptance checklist below is complete with no regressions to other labs.

Do not spend the first phase polishing current particles while topology or equations remain placeholders. If a numerical case is unsupported, report its exact limitation in the UI and handoff; do not simulate a plausible-looking result.

## 14. Numerical acceptance fixtures

Use absolute plus relative comparisons and normalized KCL residuals. For ordinary well-conditioned DC fixtures target about 1e-9 relative solution accuracy; for transient fixtures target ≤0.2% of the step amplitude at specified checkpoints. Source-transformation external comparisons should match within solver tolerance. Use meaningful physical fixtures, not tests that merely duplicate stamping implementation.

| Fixture | Expected result |
|---|---|
| 12 V, 100 Ω + 200 Ω series | 40 mA; drops 4 V and 8 V; Req 300 Ω |
| 12 V across 100 Ω ∥ 200 Ω | 120 mA and 60 mA; total 180 mA; Req 66.666… Ω |
| 12 V divider, top 100 Ω / bottom 200 Ω | Node 8 V relative to battery negative; source current −40 mA in passive convention |
| Bridge: A=10 V, B=0 V; A-C=100 Ω, C-B=100 Ω, A-D=100 Ω, D-B=200 Ω, C-D=100 Ω | C=70/13 V; D=80/13 V; current C→D=−1/130 A; input current=11/130 A; Req=1300/11 Ω |
| 10 V step, 1 kΩ, 1,000 µF, initial 0 V | tau 1 s; vC(0)=0; i(0+)=10 mA; vC(1 s)=6.3212056 V; vC(5 s)=9.9326205 V |
| Same RC, C doubled | tau 2 s; time to the same fractional charge doubles |
| 10 V initial C discharging through 1 kΩ / 1,000 µF | vC(1 s)=3.6787944 V; voltage continuous at switch; energy decreases |
| Isolated charged capacitor | Voltage and energy retained; no fabricated leakage current |
| 1 mA feeding 1,000 µF to ground, initial 0 V | vC rises 1 V/s; no finite “fully charged” target |
| 12 V source + 100 Ω series driving 200 Ω | Load 8 V and 40 mA; Norton 120 mA B→A ∥ 100 Ω gives identical load readings |
| Negative/reversed version of source pair | Correct reversed signs, same external equivalence |
| Ideal source directly clamping incompatible initial capacitor voltage | Clear impulse/initial-condition diagnostic; no invented RC curve |

For the RC ladder, use two 1 kΩ resistors in a chain, 1,000 µF from each intermediate/output node to ground, 10 V step, and zero initial voltages. In SI units the state matrix is `[[-2,1],[1,-1]]`, input `[10,0]`; its poles are `(-3 ± sqrt(5))/2` s⁻¹, and both final capacitor voltages are 10 V. Compare samples with the independent two-mode analytical solution, and require convergence when tolerances tighten. Do not treat each capacitor as an independent one-second RC circuit.

Also verify topology invariance under rotation/rerouting, crossing-versus-junction semantics, polarity changes, wire-tree KCL currents, indeterminate wire loops, deletion, save/load round trips, undo/redo of edits and source transforms, and Back/Next in simplification derivations. Include a parallel capacitor bank with equal initial voltages (valid, equivalent C is the sum, currents proportional to C) and conflicting initial voltages (invalid without impedance). At resistive DC equilibrium, total signed component power should sum to approximately zero. During transients, verify capacitor energy change and integrated source/resistor energy within integration error.

## 15. Final acceptance and handoff

- A student can construct a new circuit using all required components and wires.
- Each solved component and branch exposes a current with an unambiguous direction; indeterminate ideal-wire cases are identified honestly.
- Both terminal potentials and signed voltage difference are available for every component.
- Capacitor charging/discharging timing follows physical component values, survives Pause/Resume, and produces correct plots and state labels.
- Series/parallel reductions explain each step and preserve the original measurements; a bridge gets a valid numerical equivalent without a fake series rule.
- Thévenin/Norton transformation changes the actual circuit and preserves external DC and RC-load behavior.
- Invalid configurations show actionable errors and stop misleading animation.
- All values, plots, animation directions, and accessible tables derive from one accepted solver result.
- Desktop and narrow-screen workflows, keyboard controls, touch wiring, and reduced motion are checked in the browser.
- Run model tests, syntax checks, browser console checks, and a smoke test of existing lab links. Record meaningful results in the implementation handoff.
- Update `index.html` and `Documentation.md`; deliver the new lab and explain any remaining limitations. Do not claim a numerically unsupported case works.

### Copy-ready instruction for GPT-6.1 Sol

Implement `DC_CIRCUIT_LAB_IMPLEMENTATION_PLAN.md` in the existing Electricsim repository. Read the current code and repository instructions first, preserve unrelated changes, and use vanilla HTML/CSS/JavaScript with the shared research theme. Follow the implementation gates in order, with a DOM-free general MNA solver, explicit topology, adaptive capacitor transients, node/branch measurements, resistor simplification, and reversible Thévenin/Norton transformation. Complete the required acceptance fixtures and browser workflows before handing off. Treat the listed physics conventions and invalid-case behavior as requirements. Do not substitute canned animations for solved circuit behavior or turn the existing capacitor tree builder into the general graph model.

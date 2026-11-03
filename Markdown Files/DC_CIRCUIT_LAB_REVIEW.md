# DC Circuit Lab: code review and improvement report

Review date: 6 October 2026

Implementation follow-up, 6 October 2026: the first improvement iteration now addresses current motion, retained simulation state, ground, bridge-current recovery, schematic routing/readability, time controls, keyboard/touch access, and bounded/cached rendering work. The findings below describe the pre-implementation snapshot. Current behavior and test commands are recorded in `Documentation.md`, section 7. Remaining engineering limits include the nonpreemptible dense solve, candidate-based routing in very crowded scenes, and the need for a full screen-reader audit.

Scope: improve the existing battery, resistor, capacitor, switch, and wire experience. **Ground is the only proposed new palette item.** Current sources, additional component families, and source-transformation tools are outside this iteration. This is a review and implementation roadmap; it does not change the running application.

## 1. Overall assessment

The lab has a credible numerical foundation and a deliberately small interface. Its strongest features are the separation of circuit connectivity from drawing geometry, a general modified nodal analysis solver, adaptive capacitor integration, explicit ideal-circuit error handling, and extensive mathematical regression tests.

The main opportunity is to make the displayed behavior communicate the solved physics more faithfully. Current markers already depend on current, but their positioning introduces misleading speed, direction, and continuity. Simulation state also needs stronger protection during undo and invalid edits. Ground can be added using much of the existing reference-net infrastructure, provided its topology and editing edge cases are addressed first.

Recommended order:

1. Correct current animation and preserve capacitor state reliably.
2. Improve topology diagnostics and wire-current recovery.
3. Add ground with explicit reference semantics and complete editing support.
4. Improve wiring clarity, symbols, labels, and selected-component information.
5. Add small time controls, accessibility improvements, and measured performance optimizations.

Keep the blank-canvas workflow. The old implementation plan explicitly records that examples, plots, analysis panels, transformations, and save/load were removed from the interface. Their absence is not treated here as an implementation defect or a reason to restore the old broad design.

## 2. Review method and confidence

Reviewed all ten `dc-circuit*.js` files, the circuit HTML/CSS, the circuit documentation, the prior implementation plan, and relevant shared-theme/background code. Findings describe the current working tree, including pre-existing local edits, rather than only committed code.

Executed:

- `node dc-circuit.test.js`: **26 checks passed**.
- `node dc-circuit.math.test.js`: **13 groups passed**, including the suite's reported 360 generated cases and targeted invariants.
- Additional temporary Node checks for marker phase behavior, unique wire currents adjacent to a wire loop, redundant ground references, and grounded-junction deletion.
- A small controller harness using DOM/renderer stubs to verify capacitor-state behavior through undo.

The assessment combines source inspection, mathematical analysis, and executable checks. It does **not** include a rendered browser inspection, touch-device testing, screen-reader testing, or measured frame-time profiling. Layout and performance recommendations below are therefore identified as design or engineering risks where appropriate; they are not claimed as visually verified defects on particular devices.

## 3. What exists today

| Area | Available in the active page | Existing infrastructure not exposed in the page |
|---|---|---|
| Components | Battery, resistor, capacitor, ideal switch | Current-source support in model/solver; excluded from this iteration |
| Wiring | Orthogonal routes, terminal connections, clicked junctions, splitting at clicked crossings | Waypoint data, branch tracing |
| Editing | Selection, grid-snapped component movement, rotation, deletion, value/unit editor | Document validation and serialization-compatible model |
| History | Undo button, Ctrl/Cmd+Z, Shift+Ctrl/Cmd+Z redo | No visible Redo button; history stores documents only |
| Simulation | Run/Pause, capacitor transient response, switch operation retaining voltage in valid cases | Direct DC solution API, residuals, additional result metadata |
| Measurements | Signed component voltage/current, values, selected-wire current | Node/terminal potentials, component power, capacitor charge/energy, optional renderer overlays |
| Visuals | Dark schematic canvas, A/B labels, moving wire markers, capacitor polarity marks, error highlighting | Electron-direction option, current arrows and other renderer options |
| Ground | No palette tool | `referenceEndpoints`, reference-net merging, reference domains, ground drawing |
| Analysis/examples | Not loaded by `dc-circuit.html` | Separate analysis and preset modules, used by regression tests |

The browser loads model → topology → solver → editor → renderer → controller. The analysis and preset modules are deliberately outside that active chain. Passing their tests does not establish that a corresponding UI feature is available.

## 4. Highest-priority findings

| Priority | Finding | Evidence | Recommended change |
|---|---|---|---|
| P1 | Marker motion can reverse while electrical current remains positive | Renderer formula; numerical RC reproduction | Integrate signed displacement incrementally |
| P1 | Equal currents move at different spatial speeds on different wire lengths | `pathPoint()` and fractional phase in `draw()` | Advance markers by path distance, independent of total route length |
| P1 | Undo resets capacitor state, even for a geometry change | Controller harness and `undo()` → `solve()` | Make history/state policy explicit; preserve state for geometry undo |
| P1 | A failed electrical edit discards the retained transient state | `solve()` sets `state=null` before attempting initialization | Retain last accepted state separately from validity of the edited document |
| P1 | Any loop makes every wire in that net indeterminate | `recoverWireCurrents()` and reproduced tree-tail case | Distinguish cycle edges from uniquely determined bridge edges |
| P1 for ground | Redundant reference links create artificial wire-current ambiguity | Added second reference on an already grounded net | Avoid redundant reference edges or use a nonredundant reference forest |
| P1 for ground | Deleting a grounded junction leaves invalid references | Deletion logic and schema reproduction | Remove dependent references/probes atomically |
| P2 | Current labels and motion can describe different accepted times | Labels refresh every 250 ms; visuals use latest solution | Adopt an explicit display snapshot policy |
| P2 | Tiny nonzero currents are printed as exact zero | `format()` hides magnitudes below 1 µA | Use a below-resolution indication or selected-value detail |
| P2 | Unsolved selected wires are described as wire-loop ambiguity | Selected-wire fallback text in renderer | Separate unsolved, zero, and indeterminate states |

P1 means correctness or misleading interpretation should be addressed before adding polish. P2 means meaningful usability, clarity, or maintainability work. These priorities describe this educational lab, not safety-critical software severity.

## 5. Current animation: make speed explain current intensity

### 5.1 Why the current implementation is misleading

The renderer currently uses:

```text
speed = 8 + min(20, 4 × log10(1 + |I| × 10^6))
fraction = wrap(elapsedPhase × speed × direction / 100 + markerOffset)
```

Three markers are placed on every wire, regardless of its length.

This has five consequences:

1. **Wire length changes apparent speed.** With constant current, spatial speed is proportional to route length. A 400-unit wire moves dots four times faster than a 100-unit wire carrying exactly the same current.
2. **Changing current moves the entire phase.** Position is recomputed from total elapsed phase multiplied by the new speed. A value edit or switch event can visibly relocate markers rather than smoothly changing their velocity.
3. **A decaying positive current can appear to reverse.** The position derivative includes an unwanted `elapsedPhase × changeInSpeed` term. Applying the existing formula to `I(t)=0.01 exp(-t)` gives an unwrapped phase velocity of approximately **−0.00150 cycles/s at t=8 s**, although current is still **+3.35 µA**, above the active marker threshold. This is a confirmed mathematical defect in the animation mapping.
4. **Large currents become indistinguishable.** Approximate traversal rates are 0.200 cycles/s at 1 mA, 0.240 at 10 mA, and 0.280 at both 100 mA and 1 A. The visual cannot communicate a 10:1 ratio across the latter two currents.
5. **Tiny currents stop abruptly.** At the simple-mode 1 µA threshold, dots disappear rather than gradually slowing toward zero.

The animation also advances from wall-clock `phase`, even if the transient solver is behind its target time. This can make the drawing imply progress that the solver has not accepted.

### 5.2 Recommended mapping

Use **signed incremental distance**, with one shared current scale across the displayed circuit:

```text
velocity = velocityReference × I / currentReference
distance = distance + velocity × acceptedDeltaTime
markerPosition = pointAtDistance(route, wrap(distance + markerOffset, routeLength))
```

Suggested initial visual calibration: 10 mA corresponds to 60 canvas-world units per simulated second, with nominal marker spacing of 24 world units. These are design starting values, not measured physical quantities.

For transient circuits, accumulate motion over accepted solver substeps where practical. That makes the animation respond to the integral of current, rather than only a last-frame sample. Wire-current recovery need not be performed on every substep initially: a bounded approximation from accepted endpoints is acceptable if its visual error is evaluated. For resistor-only circuits, advance an explicit simulation clock while Run is active; the current controller does not advance `state.time` when no capacitors exist.

Use route length to determine marker count, keeping roughly consistent spacing. It should not determine marker velocity. For an unbranched path, carry phase through connected segments or render a shared branch path so inserting a junction does not restart the pattern. Branch splitting/merging needs an explicit visual convention; independently looping dots must not be presented as tracked individual charges.

Use one stable global scale during a comparison. If auto-scaling recalibrates every frame during RC decay, it can accidentally hide the decay. Prefer an explicit scale adjustment or latch the scale when Run starts. In a very large dynamic range, offer an optional compressed scale with a clear indication that speed ratios are nonlinear. Any clipping should also be visible.

### 5.3 Direction and meaning

Keep conventional current as the default, matching the existing A → B sign convention. Add a small direction cue on a selected wire or component so the meaning survives Pause and reduced motion. An optional electron-flow display should reverse only the drawing, not change the signed current result or measurement labels.

Describe the motion as a **scaled current visualization**. Physical drift speed also depends on carrier density and wire cross-sectional area; this model contains neither. The relationship between current and drift velocity is explained in [OpenStax, Model of Conduction in Metals](https://openstax.org/books/university-physics-volume-2/pages/9-2-model-of-conduction-in-metals). Schematic dots should not be labeled as literal electron speeds or electrical signal propagation.

Stop movement immediately for an invalid solution, an open path with zero current, or an indeterminate wire current. A small display deadband may suppress numerical noise, but preserve the actual solver value and explain below-resolution readings. Do not smooth genuine current reversals into the wrong direction.

### 5.4 Acceptance criteria

- Equal current produces equal world-space speed on short and long wires at a common zoom.
- A 2:1 current ratio produces 2:1 speed in linear mode, within the unclipped display range.
- Positive RC charging current never produces backward motion.
- Resistance changes alter velocity without teleporting marker phase.
- Pause freezes motion; resume continues; reset has a deliberate phase policy.
- Inserting a junction does not change the apparent current or speed.
- Reducing the frame rate does not change physical time or total marker travel materially.
- Solver backlog does not let particles outrun the accepted electrical state.

## 6. Circuit logic and transient-state improvements

### 6.1 Preserve the solver architecture

Keep the existing general graph/MNA approach. Do not replace it with special-case series/parallel equations or independent capacitor curves. Existing tests already cover bridges, multiple sources, coupled RC behavior, voltage/current/power signs, and conservation.

Backward Euler with step doubling is a reasonable baseline. Its capacitor companion relation is `Inew = C/h × (Vnew − Vprevious)`, matching the method described in [Qucs energy-storage components](https://qucs.sourceforge.net/tech/node26.html). It is a first-order integration method; smaller accepted error and analytical convergence checks matter more than a visually smooth frame rate. See [Qucs integration methods](https://qucs.sourceforge.net/tech/node24.html).

### 6.2 Protect the last accepted capacitor state

`dc-circuit.js:22–29` clears the active state before attempting a solve. If initialization fails, the next repair no longer has the previously retained capacitor voltages and can fall back to initial values. An accidental invalid connection should not erase a charged circuit's history.

Maintain separate concepts:

- The editable document and its revision.
- The last accepted simulation state and its associated revision.
- Whether results are valid for the current document.

On an invalid edit, retain the previous accepted state internally, pause, and display unavailable results for the current circuit. Once repaired, attempt to reuse compatible capacitor states by stable component ID. Never display retained numbers as though they solve the invalid document.

Document changes also need an explicit history policy. `undo()` currently calls `solve()` without a prior state. In the controller harness, a capacitor charged to about **6.288 V** became **0 V** after undoing a document position change. Geometry-only undo/redo should preserve time and capacitor voltages just as direct movement currently does. For electrical undo, either preserve compatible state or restore a recorded event snapshot; choose and document one behavior. Reset should be an explicit control rather than an incidental effect of Undo.

### 6.3 Define value-edit semantics

Changing resistance or battery voltage while paused can preserve capacitor voltages and recompute consistent currents. Changing capacitance is a separate question: preserving voltage changes stored charge and energy; preserving charge changes voltage. The current controller implicitly preserves voltage by component ID.

For the simple lab, retain that voltage-preserving editing behavior but state it briefly when capacitance changes. Treat the edit as reconfiguring an ideal circuit, not as a model of physically moving capacitor plates. Allow initial capacitor voltage in an optional selected-component detail area if needed, without adding a component.

### 6.4 Improve initial-current and residual reporting

Initialization uses exact capacitor-voltage constraints, then estimates currents using a small transient step. That is an approximation, already represented by `initialCurrentEstimate`. Keep the exact voltage; assess the current estimate with a smaller-step convergence check for difficult cases rather than assuming `min(R) × min(C)` captures every network timescale.

The initialization path recovers wire currents but does not copy the recovered maximum KCL residual into the returned solution's residual field. Update it so diagnostics describe the actual estimated currents. Also make closed-switch current/power updates consistent across initialization and transient recovery: a known ideal-switch current with zero voltage implies zero power, while an undefined current should retain an explicit unavailable status.

Existing KCL reporting measures net injection balance. Extend checks to routed endpoints and normalize by current scale where useful; a fixed absolute number does not mean the same thing in microamp and amp circuits.

### 6.5 Keep unsupported ideal situations explicit

Continue rejecting a battery short and incompatible ideal capacitor/source constraints. Do not insert hidden resistance, leakage, or fabricated ground to force a plausible animation. Improve messages to identify the actual affected component/net and a concrete remedy, such as removing a short or using one of the existing resistors.

Separate topology validity from operating-point solvability and display completeness. An isolated charged capacitor is a meaningful retained state; an unknown voltage across disconnected reference domains is not zero volts.

## 7. Wire topology and ground

### 7.1 Recover all uniquely determined wire currents

`recoverWireCurrents()` detects a cycle anywhere in a net and marks all links in that net indeterminate. A tree branch attached to the loop can still have a uniquely determined current from its terminal injections.

Reproduction: add a three-wire loop at `node-a` in the series preset. The wire feeding R1 is reported as `current: null`, although R1 still carries a known 40 mA and that feed wire is not part of the loop.

Use bridge/cycle decomposition of the routed multigraph. Currents across bridges can be determined by summing injections on either side; currents on cycle edges retain the existing indeterminate treatment. Account for parallel edges and self-loops. Preserve known component currents throughout. Do not manufacture an arbitrary current split inside an ideal loop.

### 7.2 Ground behavior

Expose ground as a reference attachment using the existing `referenceEndpoints` mechanism rather than forcing a one-terminal item through the model's current two-terminal component schema.

Recommended interaction:

1. Select Ground and click a terminal, junction, or wire.
2. A wire click creates/splits a junction as one undoable action, then attaches the reference.
3. Draw a clear ground glyph and `0 V` identification on the selected net.
4. Support selecting, removing, and undoing the ground attachment independently of deleting the underlying circuit connection.
5. A standalone ground placed on empty space may create a junction if that workflow is useful; it must not silently connect nearby objects.

All ground symbols denote the same electrical net, matching current compilation behavior. This can join otherwise separate circuits and can short a source if ground is attached to both of its terminals. Explain that connection at placement time with a net preview and diagnose any resulting invalid circuit.

Adding a single reference to a valid floating circuit should change the voltage origin, not its branch currents or component voltage drops. Removing it should restore a clearly identified local reference without resetting capacitor voltage. Groundless circuits should remain supported.

### 7.3 Ground prerequisites confirmed in review

- **Redundant references:** compilation adds virtual ground links even when the endpoints are already wire-connected. Adding `V1:b` as a second reference to the already grounded series preset made three wire results indeterminate. Use a nonredundant reference forest and avoid interpreting bookkeeping edges as new physical current paths.
- **Deletion cleanup:** junction deletion removes junction/wires but leaves `referenceEndpoints` and dependent probes. A grounded-junction deletion therefore fails validation. Centralize endpoint deletion so all dependent records are cleaned together.
- **Visual geometry:** the current glyph mixes world-space and zoom-scaled offsets. Standardize its positioning and reserve space so it does not collide with A/B labels, wires, or readings.
- **Reference identity:** deduplicate attachments. Ensure stable net identification and explicit local-reference labels when disconnected islands exist.

Acceptance: one ground shifts node potentials only; multiple grounds correctly connect nets; repeated ground on the same net does not create fake current ambiguity; deleting/removing/undoing ground preserves schema validity and compatible capacitor state.

## 8. Visual communication and schematic readability

### 8.1 Connections and wire routing

The electrical model correctly distinguishes clicked junctions from unclicked crossings. Make that distinction visually unmistakable: use junction dots for connections and a small gap or bridge at nonconnected crossings. Show a snap-target halo and a preview of which net will be joined before the click.

Automatic routing currently considers terminal orientation and elbows, not component obstacles. Routes can pass through component bodies or coincide with other routes without electrical connection. Add short terminal-exit segments, obstacle-aware routing where practical, and manual segment/bend dragging. Keep terminal IDs and connectivity unchanged during route edits.

Empty-space junction placement is not snapped like component movement. Snap free-space wire points consistently, while preserving exact existing endpoint locations. Explain that moving a symbol onto a wire does not itself create a connection; highlight coincident-but-unconnected endpoints to reduce ambiguity.

### 8.2 Labels and selected detail

The label placer avoids previously placed labels, but not component geometry, wires, the viewport, or the editor panel. It also starts over each frame, so changing digit widths can shift labels between candidate positions.

Reserve symbol/terminal/inspector exclusion zones, stabilize previous placements, and prioritize selected readings. Keep ordinary component name/value and voltage/current compact; put power, exact values, and capacitor charge/energy in selected detail. Offer optional clutter reduction for dense circuits without removing access to measurements.

Use one explicit display-time policy. Today text refreshes at 4 Hz while capacitor marks and wire motion use the latest accepted solution. A timestamped display snapshot or coordinated throttling can prevent visibly inconsistent readings during fast transients. Formatting may be throttled, but electrical values must remain unrounded internally.

### 8.3 Battery polarity and signed readings

A positive battery value matches the existing long-plate A-side convention. Negative battery values are permitted, but the static symbol does not reverse polarity. Reflect actual polarity with clear +/− marks or document a signed-source convention directly beside the selected battery. Keep terminal A/B identities stable when values or rotation change.

For negative battery current, selected detail can say “delivering power” when the computed power is negative. Avoid labeling every negative current as delivered power: power also depends on voltage sign.

### 8.4 Capacitor visuals

The existing plate-mark count depends only on voltage: `min(5, ceil(|V|/2))`. Equal-voltage capacitors with different capacitances therefore show identical marks despite different stored charge. Marks saturate at five for magnitudes above 8 V, and even a very small nonzero voltage yields one mark.

Choose the intended meaning explicitly:

- If the marks represent **charge**, map them to `|Q| = C|V|` using a stable, disclosed visual scale.
- If the glow represents **voltage**, label it as voltage and use a continuous mapping.
- Preserve polarity from the sign of voltage. Provide exact Q and energy in selected detail rather than implying that a handful of glyphs is a literal charge count.

Charge/discharge state should use changes in stored energy or a clearly defined relation between voltage and current; current sign alone is insufficient for reversed-polarity capacitors. Near zero, use a tolerance rather than unstable sign changes.

Do not draw charges crossing the dielectric gap. Lead motion and plate accumulation can communicate charging while preserving the ideal capacitor model.

### 8.5 Color and appearance

Retain the restrained existing palette. Make cyan consistently mean current/readings, amber mean voltage or capacitor polarity cues, indigo mean selection/reference, and red mean invalid state. Use text, symbols, and line treatment alongside color.

An optional selected-net voltage tint can help after ground is available. Include a scale; never compare unrelated floating-island absolute voltages as if they share a reference. Resistor power highlighting may use solved power, but must not imply a modeled temperature, burn limit, or failure mode.

## 9. Interaction, time controls, and accessibility

### 9.1 Small controls with high value

Add a visible Redo control, Fit view, and Reset simulation. Fit infrastructure exists, but its bounds should include wire waypoints and labels, not just terminals/components. Reset should restore configured capacitor initial voltages and physical time without clearing the circuit.

Show accepted physical time beside Run/Pause. A compact optional Step/time-scale control would make very fast and very slow RC responses inspectable. Keep simulation time scale separate from visual current-speed scale. If “1×” is shown while the solver is behind, display the lag explicitly. Clear the “Calculating capacitor response…” message when the solver catches up; the current branch only sets that message and does not restore it automatically.

Run currently solves resistor-only circuits before playback, then primarily enables motion. That is reasonable for a static network, but the UI should describe Run as starting time/flow display rather than imply that the earlier readings were unsolved.

### 9.2 Touch and keyboard

Mouse navigation uses wheel zoom and right-drag pan. The page disables native touch gestures on the canvas and has no corresponding multitouch navigation. Add explicit zoom/fit controls plus deliberate pan/pinch support, with pointer-ID tracking so a second finger does not accidentally overwrite an existing drag.

Keyboard Enter acts at the canvas center, but there is no usable keyboard traversal among components or terminals. Add a selection list or canvas focus model: next/previous component, move by grid increment, rotate, delete, toggle switch, and select connection endpoints. Scope shortcuts to the workspace and avoid interfering with browser shortcuts or future text fields.

The canvas has `role="img"` despite supporting editing. Retain a useful summary, but provide a structured accessible component/measurement list and focusable actions. Updating one long aria-label every 250 ms is not a replacement for navigable results. Announce state changes and errors without announcing every numeric refresh.

### 9.3 Reduced motion and narrow screens

The shared background checks reduced motion; circuit flow markers do not. Respect the preference in the circuit renderer and retain static direction indicators and numerical results. Stop decorative redraw loops when their output is unchanged.

The absolute-positioned editor can obscure the upper-right circuit area. On narrow screens, use a compact drawer or panel outside the drawing area and keep Run/status visible. The canvas minimum height and toolbar wrapping warrant browser checks at small viewport heights. Test text zoom as well as screen width.

## 10. Performance, robustness, and maintainability

### 10.1 Measure and bound work

The solver performs dense matrix work on the UI thread. Up to 240 adaptive attempts can entail roughly 720 trial solves in one call, before final wire recovery. A count limit does not establish a safe frame-time budget.

Measure ordinary and near-limit circuits, then add a wall-time budget with resumable progress. Consider a worker if profiling shows sustained stalls. Preserve target time separately from accepted time rather than discarding backlog silently.

The renderer repeatedly rebuilds endpoint maps through `wireRoute()`, recomputes route lengths for each marker, and redraws the full grid while paused. Cache endpoint maps, routes, cumulative lengths, and stable label layouts by document/view revision. Render paused scenes on changes; active simulation still needs regular frames. Cache topology rather than recompiling it inside optional node-overlay drawing.

A 100-component cap does not bound wires, junctions, waypoints, or history size. Add reasonable limits or safeguards for those structures, particularly before any future import workflow. Deep wire graphs also warrant iterative traversal rather than unbounded recursion.

### 10.2 Harden interfaces

Keep three result states distinct: finite measurement, unavailable/unsolved, and physically indeterminate. The selected-wire label currently reports every missing/nonfinite result as “Indeterminate wire-loop current,” including absence of any valid solution.

Validate malformed nested records defensively if external documents are introduced. Current schema checks can throw when array entries are null rather than returning actionable validation errors. Guard nonfinite reciprocal conductances and invalid transient step sizes at module boundaries. These are robustness improvements, not evidence that ordinary tested circuits are failing.

### 10.3 Make the code easier to modify safely

Reformat dense one-line functions and extract the controller's editing, state-transition, and playback responsibilities. Centralize component metadata and endpoint cleanup. Use a shared display configuration for units, thresholds, and palette semantics.

Avoid reviving hidden features incidentally. For example, the model supports `current` but the active editor's `units` map does not; loading a current-source document into this controller would require separate work. Keep it outside this scope.

Align renderer viewport state with `doc.view` if persistence is added later; the active view currently lives separately. Update documentation to distinguish active UI, retained internal capabilities, and accepted next-step scope. Do not overwrite the old plan as though its superseded requirements were current obligations.

## 11. Implementation roadmap

| Phase | Deliverables | Completion gate |
|---|---|---|
| A: trust in motion and state | Incremental current motion, route-length independence, state-preserving geometry undo, failed-edit recovery | Animation invariants and charged-circuit history tests pass |
| B: topology and ground | Bridge-aware current recovery, reference-link handling, ground placement/removal/deletion | Ground changes reference correctly; no artificial ambiguity or lost charge |
| C: visual clarity | Crossing treatment, snap preview, polarity, stable labels, charge visualization, result-state wording | Dense/reversed/floating circuits remain understandable |
| D: operating controls | Physical clock, reset, fit, redo, optional compact time scale/step | Playback and reset semantics are clear and reproducible |
| E: accessibility and performance | Touch/keyboard paths, accessible measurements, reduced motion, caching and execution budget | Browser/device checks and measured frame-time goals pass |

Potential later conveniences such as local save/load, plots, or example pickers should be evaluated separately against the intentional interface simplification. None is required for the improvements above. No additional electrical component type beyond ground is needed.

## 12. Verification plan for the improvements

Keep the existing 39 passing groups. Add focused regressions for behavior they currently miss:

| Test | Required result |
|---|---|
| Equal-current wires of different lengths | Equal spatial marker speed |
| Parallel 100 Ω / 200 Ω loads at the same voltage | 2:1 marker speed in linear mode |
| RC decay of positive current | Smooth forward motion toward zero |
| Switch-driven current reversal | Direction changes without phase jump |
| Paused/resumed/hidden-tab run | No unexplained motion or simulated-time advance |
| Charged capacitor; move/rotate then undo | Voltage and time retained |
| Charged capacitor; invalid edit then repair | Last compatible state recoverable; invalid readings unavailable |
| Ideal-wire loop with tree tails | Loop currents undefined; bridge currents preserved |
| Ground on a floating circuit | Component voltage/current unchanged; selected net 0 V |
| Duplicate ground on an existing net | No fake cycle-induced ambiguity |
| Grounded junction deletion and undo | Valid schema, restored references, compatible state retained |
| Tiny finite, exact-zero, missing, and indeterminate values | Distinct, accurate display states |
| Negative battery and capacitor voltages | Correct symbol polarity and signed readings |
| Same voltage, unequal capacitance | Charge visual/detail reflects different Q |
| Constrained frame budget and backlog | UI remains responsive and timing claims remain accurate |

Browser acceptance should include desktop construction from blank, all four component rotations, nonconnected crossings, dense labels, 320–375 px widths, short landscape viewports, increased text size, touch-only navigation, keyboard-only editing, reduced motion, and console checks. Set numerical and performance thresholds before declaring these gates passed.

## 13. Source map

Line references identify the reviewed working-tree snapshot and will shift after edits.

| Source | Main review anchors |
|---|---|
| `dc-circuit.html` | Actual palette, editor controls, script loading, canvas semantics |
| `dc-circuit.css` | Absolute editor, canvas sizing, responsive controls |
| `dc-circuit.js:22–30` | Solve/commit and retained-state failure path |
| `dc-circuit.js:47–48` | Rotation and deletion cleanup |
| `dc-circuit.js:67–70` | Undo, pause/play, switch state retention |
| `dc-circuit.js:87–97` | Clock, backlog, readout cadence, render options |
| `dc-circuit-renderer.js:6` | Fraction-to-path-distance conversion |
| `dc-circuit-renderer.js:17–19` | Label collision strategy |
| `dc-circuit-renderer.js:27–34` | Capacitor marks and source/switch symbols |
| `dc-circuit-renderer.js:41–52` | Marker mapping, unavailable wire text, readings, ground glyph |
| `dc-circuit-topology.js` | `compileCircuit`, `referenceDomains`, `recoverWireCurrents`, `traceBranches` |
| `dc-circuit-solver.js` | `linearSolve`, `constraints`, `solve`, `initializeTransient`, `advanceTransient` |
| `dc-circuit-model.js` | Validation, `History`, deletion, display thresholds |
| `dc-circuit-editor.js` | Orthogonal routing, click-to-connect, junction splitting |
| `dc-circuit-analysis.js`, `dc-circuit-presets.js` | Retained internal capabilities and test fixtures |
| `dc-circuit.test.js`, `dc-circuit.math.test.js` | Existing validated physics/topology coverage |
| `Documentation.md`, `DC_CIRCUIT_LAB_IMPLEMENTATION_PLAN.md` | Active simplified scope versus superseded broad plan |

The recommended next iteration is a more trustworthy and readable version of the existing lab: proportional, continuous current motion; durable capacitor state; explicit ground; and clearer wiring and measurements.

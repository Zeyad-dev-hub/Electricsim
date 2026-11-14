# Semiconductor lab: one crystal, visible electron transitions

Status: core single-crystal restructure implemented on 2026-10-05. This specification
supersedes the four-workspace interface in SEMICONDUCTOR_LAB_PLAN.md. The main lab
implements bond occupancy, thermal events, donor/acceptor events, current flow,
contacts, playback controls, and linked energy states. Diffusion remains explanatory
content under More detail; the current uniform-sample engine visualizes drift.

## 1. The experience

One persistent crystal fills the main work area. Temperature, doping, and applied
voltage all act on that same structure. Remove the single-atom view, shell model,
Atoms tab, and separate transport-bar visualization. Retain the existing vanilla
HTML, CSS, JavaScript, and Canvas stack. Do not introduce a framework or a simple
components section.

Start with silicon, no dopants, no applied voltage, and a short explanation of the
visible bond electrons. Offer three approachable experiments: warm the crystal,
add a dopant, and switch on current. These are presets/actions within one view,
not navigation to different simulations.

## 2. Visual arrangement

- Place atom centers on straight, aligned rows and columns. Remove staggered rows,
  skew, and perspective. Keep horizontal and vertical bonds easy to follow.
- Label this as a simplified 2D bonding diagram; actual silicon has a 3D
  tetrahedral structure. Show outer bonding electrons, not all atomic electrons.
- Draw two shared electron slots per covalent bond. A hole is an unoccupied slot
  with a clear outline, rather than a separate positive particle.
- Distinguish bound electrons, free electrons, empty slots, and fixed dopant ions
  with shapes/labels as well as color. Keep atoms and bond positions stable while
  optional subtle thermal vibration occurs around their reference positions.
- Keep a compact energy diagram attached to the crystal: valence band, forbidden
  gap, conduction band, and relevant impurity levels. Energy is a separate axis,
  not physical height above the lattice.
- Selecting or following an electron highlights the same carrier in the crystal
  and energy diagram. Clearly identify these as two views of one electron.
- On desktop, place a short control panel beside the crystal. On phones, show
  crystal and primary actions first, controls next, and detailed values afterward.

## 3. Electron and hole behavior

### Bound electrons and thermal excitation

1. Begin with occupied bond slots and the matching valence-band representation.
2. When a thermal generation event occurs, highlight one occupied bond slot.
3. Animate its electron becoming mobile and its energy marker crossing the gap
   into the conduction band. Leave exactly one vacancy in the original bond.
4. Let the free electron move through the crystal with scattering. Increasing
   temperature changes the generation/recombination balance and carrier density;
   it should not merely speed up decorative motion.
5. During recombination, one free electron fills a vacancy and the corresponding
   energy marker returns to the valence band. Remove both carrier contributions
   through that one event.

Transitions are simplified teaching animations of allowed initial/final states;
they do not imply a stable electron state inside the forbidden gap. At 0 K with
current off, thermal generation stops and the intrinsic sample has no free
carriers. Warming occurs through the temperature control; no hidden temperature
changes when the learner clicks a particle.

### Hole motion

Store bond-slot occupancy. A neighboring bound electron visibly moves into an
empty slot, its destination becomes occupied, and its source becomes the new
vacancy. Repeat this sequence to show apparent hole motion opposite the electron
hops. A hole must never move independently of an electron transfer.

Include a slow explanation mode, a follow-hole highlight, and a one-event Step
button. For a rightward field, bias bound-electron hops leftward so the sequence
of vacancies progresses rightward. Random motion at zero field has no preferred
direction. Explain that localized hopping is a teaching representation of
valence-band transport, rather than a literal microscopic trajectory model.

## 4. Doping in the same structure

- Clicking a host site substitutes a donor or acceptor, with keyboard-accessible
  Add donor / Add acceptor actions providing the same feature.
- For a donor, show four bonding electrons plus its extra, weakly bound electron.
  Ionization releases that electron to the conduction band and leaves a fixed
  positive donor ion. It does not create a valence-band hole.
- For an acceptor, show the shortage of one bonding electron. An electron from a
  neighboring valence state fills the acceptor state, leaving a mobile vacancy
  and a fixed negative acceptor ion. P-type doping must not add free electrons.
- Show the substitution first, then the ionization/capture event, then the changed
  carrier populations. At low temperature, distinguish neutral from ionized
  impurities instead of always drawing charged ions and free carriers.
- Provide Intrinsic / N-type / P-type presets and a meaningful logarithmic amount
  control with an explicit Off position. Compensation belongs under More detail.
- Keep the identity and position of substituted sites stable during animation and
  resizing. Increasing amount must visibly affect the sample, not only a number.
- Distinguish drawn sample counts from bulk density in cm^-3. Use a documented,
  bounded representative scale; never imply that one click equals one literal
  atom per cubic centimetre or add arbitrary particle counts to density results.
- Start the simplified substitution model with Si; retain other material facts
  in expandable learning content. Any selectable material must have explicitly
  supported bonding/dopant behavior before being enabled in this interactive view.

## 5. Apply voltage and see current

Use an Apply voltage switch, signed voltage/strength control, and Reverse polarity
button. Small edge contacts establish the field across the sample. This is a
sample control, not a separate components lesson. Derive field from voltage and
sample length, then calculate current from carrier density and mobility.

- Free conduction electrons scatter while drifting opposite the electric field.
- Bound-electron transfers cause vacancies to progress with the field.
- Label electron drift, apparent hole drift, and conventional current separately.
- At zero voltage, thermal motion continues but field-driven net flow stops.
- Reversing polarity reverses drift bias without teleporting existing electrons.
- Handle contact entry/exit explicitly for sustained current; do not visibly wrap
  exiting electrons through the crystal to the other side.
- Report electron and hole current contributions and their sum. Make magnified
  animation speed explicit; it is not a literal velocity measurement.
- Keep default fields within the solver's supported mobility approximation.
  High-field presets require a stated approximation or a suitable extended model.

Diffusion and lecture calculations remain available in an expandable advanced
section in the same lab. They must use the same state and carrier representation,
not restore an unrelated moving-particle scene.

## 6. Controls and information hierarchy

Primary controls: Temperature; Dopant type and amount; Apply voltage and polarity.
Primary actions: Reset; Pause/Play; Step; Follow an electron; Follow a hole.
Primary results: free electrons, holes, and current, with units and scale labels.
Show a single short event explanation such as “This electron filled the empty
bond; the empty state is now one position to the right.”

Put Fermi level, mobility, resistivity, equations, material comparisons, numerical
density details, and lecture presets behind More detail. Preserve relevant lecture
content there without reviving the removed atom visualization. Use usable touch
targets, keyboard controls, reduced motion, and non-color-only distinctions.

## 7. Implementation architecture

Separate calculation, carrier transitions, and drawing so that visuals reflect
real state changes:

1. Physics model: material, temperature, dopant concentrations, ionization,
   mobility, applied field, equilibrium densities, and calculated currents.
2. Crystal model: stable atom IDs, atom species, fixed positions, a bond graph,
   electron-slot occupancy, impurity occupancy/charge, and contact boundaries.
3. Carrier/event engine: stable electron IDs and transitions for excitation,
   hopping, donor ionization, acceptor capture, recombination, and contact exchange.
   Derive holes from vacancies; do not give holes independent animation paths.
4. Population adapter: translate bulk model targets into representative sample
   populations through explicit transitions, avoiding arbitrary frame-by-frame
   spawning. Keep visual-event counts separate from quantitative solver outputs.
5. Renderers: crystal, attached energy diagram, event highlights, direction arrows,
   and responsive labels. All render the same state and event progress.
6. UI controller: validate and commit control changes, preserve selected sites,
   coordinate Pause/Step/Reset, and publish accessible explanations.

Use a fixed simulation timestep with time-scaled playback, seeded reproducible
events for verification, and requestAnimationFrame only for rendering. Pause must
freeze transitions, Step must advance one explainable event, and responsive
resizing must change geometry without changing charge state.

Retain semiconductor.html as the entry point and semiconductor.css for styling.
Keep semiconductor.js as the controller; extract model/engine/rendering code into
small plain JavaScript files where needed. Reuse validated solver functions after
reviewing their temperature and field limits. Replace drawAtomicView,
drawCrystalView, drawTransportView, stage navigation, and manualPairs bookkeeping.
The current sinusoidal hole motion and density-independent carrier animation
cannot serve as the foundation of this design.

## 8. Build order and completion checks

1. Replace the page structure and render a straight, stable lattice with correctly
   occupied shared bonds. Establish the visual legend and default intrinsic state.
2. Implement vacancy-derived hole motion first. Demonstrate one electron transfer
   and one vacancy displacement with Pause, Step, and Follow controls.
3. Add thermal excitation/recombination and synchronized energy-state markers.
4. Add donor/acceptor substitution, impurity state changes, and population mapping.
5. Add voltage, contacts, drift direction, reversal, and current readouts.
6. Restore supporting lecture details and verify desktop, phone, keyboard, reduced
   motion, and slider behavior end to end.

Acceptance examples:

- An intrinsic 0 K sample has filled bonds and no thermal carriers.
- A thermal event creates one conduction electron and one vacancy together.
- A recombination event removes one free electron and fills one vacancy together.
- A donor ionization adds a free electron without creating a valence vacancy.
- Acceptor capture produces a vacancy and leaves a fixed negative impurity.
- Every displayed hole displacement corresponds to a visible electron transfer.
- At zero field there is no directional drift; reversal reverses both drift signs.
- Electron counts/charge remain consistent through local events and contact flows.
- Pausing, stepping, slider changes, resetting, and resizing never duplicate or
  silently discard active particles or leave an impossible half-completed state.
- The energy marker and crystal electron always describe the same event.
- Concentration sliders respond from the first nonzero step and preserve a true
  Off state; physical densities remain distinct from representative particle counts.

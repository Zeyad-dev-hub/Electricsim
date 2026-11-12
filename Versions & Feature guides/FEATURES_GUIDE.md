# Electricsim — Complete Lab Features & Controls Guide

A plain-language reference for every lab, button, checkbox, slider, dropdown, and tool in Electricsim.

---

## 1. Electricsim Hub (`index.html`)

The starting page that connects all 7 simulations.

- **Find a lab (Search box):** Type any lab name or physics topic to filter the lab cards in real time.
- **Clear button:** Appears when you type in the search box; clears your search and shows all 7 labs again.
- **Lab count (`7 labs`):** Shows how many labs match your current search.
- **Lab cards:** Click any card to open that simulation.

---

## 2. Electrostatics Simulator (`electrostatics.html`)

Place positive and negative charges in 2D space and watch electric fields, voltage contours, and forces update live.

### Top Panel & Buttons
- **⌂ Hub:** Returns to the main Electricsim Hub page.
- **+ Add Object:** Opens the **New Object Properties** window so you can configure and place a new charged object on the canvas.
- **🗑 Clear All:** Removes every charge and object from the simulation canvas.
- **? (Keyboard Shortcuts):** Opens or closes a quick reference card listing keyboard shortcuts (`Ctrl+Z` Undo, `Ctrl+Y` Redo, `Delete` Remove selected, `Escape` Close window / Deselect, `Shift+Drag` Snap to grid).

### New Object Properties Window (opened by `+ Add Object`)
- **Shape Type:** Choose what kind of charged object to place:
  - *Point Charge* (single concentrated charge)
  - *Charged Rod* (straight line of charge)
  - *Ring Charge* (circular ring of charge)
  - *Non-Conducting Sphere* (charge spread throughout the sphere)
  - *Conducting Sphere* (charge distributed on the surface)
- **Total Charge Magnitude (|Q|):** Slider to set how strong the charge is (from `1` to `100` in your chosen charge unit).
- **Dimension (Radius/Length):** Slider to set the size of rods, rings, and spheres (disabled for Point Charges).
- **Charge Sign (`+ Positive` / `- Negative`):** Choose whether the object has a positive or negative charge.
- **Add to Simulation:** Places the new object onto the canvas.
- **× (Close):** Closes the window without adding an object.

### Visualization Panel (Bottom Right)
- **Field Lines (checkbox):** Shows or hides the electric field lines radiating from or toward charges.
- **Equipotential (checkbox):** Shows or hides contour lines connecting points with the same electric potential (voltage).
- **Force Vectors (checkbox):** Shows or hides arrows on each charge indicating the direction and strength of the electrostatic force acting on it.
- **Grid (checkbox):** Shows or hides the background measurement grid.
- **Connectors (checkbox):** Shows or hides dashed measurement lines connecting objects when more than one object is on the canvas.
- **Distance Scale (dropdown):** Changes the distance unit (`m`, `cm`, `mm`, `μm`, `nm`, `pm`) used for coordinates and object dimensions.
- **Charge Unit (dropdown):** Changes the charge unit (`C`, `mC`, `μC`, `nC`, `pC`, `fC`) used across the simulation.

### Probe Readings & Selected Object Panel (Bottom Left)
- **Probe Readings:** Moves with your mouse cursor and shows the live **Position**, **Electric Field (E)**, **Electric Potential (V)**, and **Camera Zoom** at that spot.
- **Selected Object:** Appears when you click or tap an object. Shows its **Type**, **Charge**, **Position**, **Net Force**, and **Potential (V)**.
  - **🗑 Remove Selected:** Deletes the currently selected object (especially handy on mobile/touchscreens).
  - *Tip:* **Double-click (or tap on mobile) the Position readout** to type exact `(X, Y)` coordinates for the selected object.

### Canvas Controls
- **Click & Drag an object:** Moves the object around (hold **Shift** while dragging to snap to the grid).
- **Drag empty space:** Pans the camera around the canvas.
- **Mouse wheel / Scroll:** Zooms the camera in and out.
- **Right-click an object:** Immediately removes that object.
- **Delete key:** Removes the currently selected object.

---

## 3. Gauss's Law Explorer (`gauss.html`)

See how electric flux through a closed Gaussian surface depends only on the charge enclosed inside it.

### Top Bar
- **⌂ Hub:** Returns to the main Electricsim Hub page.

### Surface Configuration (Right Panel)
- **Charge Geometry (dropdown):** Switches between 5 charge setups:
  - *Point Charge*
  - *Infinite Line Charge*
  - *Infinite Plane Charge*
  - *Conducting Sphere*
  - *Non-Conducting Sphere*
- **Total Charge (Q) slider:** Adjusts the charge amount from `-20.0 μC` to `+20.0 μC` (flips field direction when negative).
- **Gaussian Radius (r) slider:** Changes the size of the green Gaussian surface (sphere or cylinder).
- **Cylinder Length (L) slider:** *(Line Charge only)* Changes the length of the Gaussian cylinder.
- **Pillbox End Area (A) slider:** *(Plane Charge only)* Changes the end-cap area of the Gaussian pillbox.
- **Physical Sphere Radius (R) slider:** *(Conducting & Non-Conducting Spheres only)* Changes the physical radius of the charged sphere itself so you can place the Gaussian surface inside or outside it.

### Visualization Toggles (Right Panel)
- **Show Field Lines:** Turns the electric field lines on or off.
- **Flux Intersection Glow:** Highlights where electric field lines cross through the Gaussian surface.
- **Surface Normals (dA):** Shows or hides outward-pointing normal arrows on the Gaussian surface.
- **Animate Flow:** Starts or pauses the animated movement along the field lines.
- **↻ Reset Defaults:** Resets the geometry, sliders, and toggles back to their starting values.

### Bottom Panels
- **Live Measurements (Bottom Left):** Displays **Enclosed Charge ($Q_{enc}$)**, **Gaussian Surface Area ($A$)**, **Electric Field at Surface ($E$)**, **Computed Flux ($\Phi_E$)**, and the **Gauss Check ($Q_{enc}/\varepsilon_0$)** confirmation.
- **Formula Badge (Bottom Center):** Shows the active electric field formula and live calculation for the selected geometry.

---

## 4. Capacitor Lab (`capacitor.html`)

Explore how capacitor geometry and dielectrics store energy, or build series-parallel capacitor networks.

### Top Bar
- **⌂ Hub:** Returns to the main Electricsim Hub page.
- **🔭 Physics Explorer:** Switches to the single-capacitor physics simulation mode.
- **🔗 Network Builder:** Switches to the multi-capacitor series/parallel circuit builder mode.
- **? (Formulas):** Opens a popup showing the capacitance, electric field, energy, and series/parallel formulas.

### Mode 1: Physics Explorer
- **Geometry Model — Type (dropdown):** Choose *Parallel Plate*, *Cylindrical*, or *Spherical* capacitor.
- **Dielectric Material (dropdown):** Pick an insulating material between the plates (*Vacuum/Air*, *Teflon*, *Nylon*, *Paper*, *Glass*, or *Custom*).
- **Dielectric Constant (k) slider:** Appears when *Custom* is selected, letting you set any `k` from `1.0` to `100.0`.
- **Voltage Source (V) slider:** Sets the applied battery voltage (`0 V` to `100 V`).
- **Geometry Sliders (change depending on Type):**
  - *Parallel Plate:* **Plate Area (A)** and **Separation (d)**.
  - *Cylindrical:* **Inner Radius (a)**, **Outer Radius (b)**, and **Length (L)**.
  - *Spherical:* **Inner Radius (a)** and **Outer Radius (b)**.
- **Circuit Action *(Parallel Plate only)*:**
  - **⚡ Charge (Source):** Connects the capacitor to the voltage source so charge builds up on the plates.
  - **⏸ Hold (Isolated):** Disconnects the capacitor from everything so it holds its stored charge.
  - **⤓ Discharge (Resistor):** Connects a resistor across the plates so the stored charge drains away.
  - **↺ Reset Q = 0:** Instantly empties all charge from the plates.
  - **Time Multiplier slider:** Speeds up or slows down the charging and discharging animation (`0.1×` to `5.0×`).
- **Live Measurements HUD (Bottom Left):** Shows **Capacitance (C)**, **Stored Charge (Q)**, **Plate Voltage (Vc)**, **Energy (U)**, **Electric Field (E)**, and current **State**.

### Mode 2: Network Builder
- **Master Source (V) slider:** Sets the total voltage applied across the whole capacitor network (`1 V` to `100 V`).
- **Capacitance (μF) slider:** Sets the capacitance value (`1 μF` to `100 μF`) for the next capacitor you add.
- **⊕ Series:** Adds a new capacitor in series with the currently selected node in the tree.
- **⊕ Parallel:** Adds a new capacitor in parallel with the currently selected node in the tree.
- **Network Tree:** Click any capacitor or group in the list to select it (new components are added relative to your selection, and its individual readings appear in the HUD).
- **✕ Remove Selected:** Deletes the selected capacitor or group from the network.
- **🗑 Clear All:** Removes all capacitors from the network.
- **Equivalent Circuit HUD (Bottom Left):** Shows **Total C ($C_{eq}$)**, **Total Charge (Q)**, **Total Energy (U)**, and when an item is selected, **Selected Element** Capacitance, Voltage, Charge, and Energy.

### View Controls (Bottom Right, Both Modes)
- **Show Field Lines:** Shows or hides electric field lines inside the capacitor(s).
- **Show Charges:** Shows or hides `+` and `−` charge markers on the plates.
- **`-` / `+`:** Zooms out or zooms in on the canvas.
- **⤢ (Reset View):** Resets zoom and camera position back to `100%`.

---

## 5. Conductivity & Resistivity Explorer (`conductivity.html`)

Watch free electrons drift and collide with lattice atoms inside a wire as you change material, dimensions, temperature, and voltage.

### Top Bar
- **⌂ Hub:** Returns to the main Electricsim Hub page.

### Wire Properties (Right Panel)
- **Material (dropdown):** Choose from *Copper (Cu)*, *Aluminum (Al)*, *Gold (Au)*, *Iron (Fe)*, *Carbon (Graphite)*, or *Constantan*.
- **Length (L) slider:** Adjusts the wire length (`0.1 m` to `10.0 m`).
- **Cross-Sectional Area (A) slider:** Adjusts the wire thickness (`0.1 mm²` to `5.0 mm²`).
- **Temperature (T) slider:** Adjusts the wire temperature (`-100 °C` to `1000 °C`), changing lattice vibration and resistivity.
- **Applied Voltage (V) slider:** Sets the voltage across the wire (`0.0 V` to `240.0 V`), driving electron drift.
- **↻ Reset Defaults:** Restores all wire properties to their default starting values.

### Bottom Panels
- **Calculations HUD (Bottom Left):** Live readouts for **Base Resistivity ($\rho_{20}$)**, **Resistivity at T ($\rho_T$)**, **Resistance (R)**, **Current (I)**, **Power (P)**, and **Drift Velocity ($v_d$)**.
- **Formula Bar (Bottom Center):** Quick reference for $R = \rho L/A$, $\rho(T) = \rho_{20}[1 + \alpha(T - 20)]$, and $I = V/R$.

---

## 6. Semiconductor Physics Simulation (`semiconductor.html`)

Explore a silicon crystal lattice, see how heat and doping create free electrons and holes, and watch current flow when voltage is applied.

### Top Bar & Presets
- **← Electricsim:** Returns to the main Electricsim Hub page.
- **Reset sample:** Resets the crystal back to its default intrinsic room-temperature state.
- **Try it (Experiment Presets):**
  - **Frozen · 0 K:** Sets temperature to `0 K` with no free carriers—all electrons stay locked in bonds.
  - **Warm crystal:** Raises temperature to create thermally freed electrons and matching holes.
  - **N-type:** Adds Phosphorus donor atoms to supply extra free electrons.
  - **P-type + current:** Adds Boron acceptor atoms and turns on voltage so you can watch holes move.

### Crystal, Closeup & Playback Controls
- **Click a bond electron on the crystal:** Highlights that electron so you can follow its motion.
- **How a hole is filled (Closeup view):** Enlarged 3-step view showing a neighboring electron jumping into an empty bond (hole).
- **Ⅱ Pause / Resume:** Pauses or resumes the particle animation.
- **Step one event:** Advances the simulation by one single event while paused.
- **Speed (dropdown):** Changes animation speed (*Slow*, *Normal*, *Fast*).
- **Follow electron:** Highlights and tracks a free electron across the crystal and energy band diagram.
- **Follow hole:** Highlights and tracks a hole across the crystal.
- **Where is the electron’s energy? (Energy diagram):** Shows bound electrons in the lower valence band and free electrons in the upper conduction band.

### Right Control Panel
- **01 Temperature:**
  - **Temperature slider:** Adjusts crystal temperature from `0 K` to `700 K`.
  - **Room · 300 K button:** Jumps straight to room temperature (`300 K`).
- **02 Doping:**
  - **Replace silicon with (dropdown):** Choose *No dopant · intrinsic*, *Phosphorus · donor (N-type)*, *Boron · acceptor (P-type)*, or *Both · compensation*.
  - **Donor density / Acceptor density sliders:** Appear when a dopant is selected to control how much impurity is added.
  - **Click tool (dropdown) & Substitute a host atom button:** Appears when doping is active; lets you pick donor or acceptor and manually replace a silicon atom in the lattice.
- **03 Current flow:**
  - **Apply voltage (switch):** Turns the external electric field on or off.
  - **Potential difference slider:** Sets the applied voltage from `-0.20 V` to `+0.20 V`.
  - **⇄ Reverse polarity button:** Flips the voltage sign (`+` ↔ `−`) to reverse current direction.

### Results & Extra Details
- **What changed? (Live Results):** Shows live counts of **Bond electrons**, **Free electrons ($n$)**, **Mobile holes ($p$)**, and **Calculated current ($I$)**.
- **More detail (expandable section):** Contains physics notes, equations, and two accessibility switches:
  - **Reduced motion · manual stepping:** Switches to calmer, manual-stepping animation.
  - **High contrast:** Increases visual contrast for easier reading.

---

## 7. Circuits Lab (`dc-circuit.html`)

Build custom DC and AC circuits on a blank canvas, wire components together, run live simulations, and inspect voltage, current, and power.

### Top Bar
- **← Electricsim:** Returns to the main Electricsim Hub page.
- **Undo (`Ctrl+Z`) / Redo (`Ctrl+Shift+Z`):** Steps backward or forward through your edits.
- **Clear:** Clears the entire circuit canvas.

### Circuit Tools (Component Palette)
- **↖ Move / edit:** Select, drag, and edit components or wires.
- **▱ Resistor:** Places a resistor.
- **⊗ Lamp:** Places a light bulb that glows based on power.
- **⊣⊢ Capacitor:** Places a capacitor that charges and discharges over time.
- **⌇ Inductor:** Places an inductor (coil) that stores magnetic energy and opposes sudden changes in current.
- **＋− Battery:** Places a DC voltage source.
- **⊙→ Current:** Places a DC constant-current source.
- **∿ AC Source:** Places an alternating-current (sine wave) voltage source (default `0.5 Hz`: 1 second forward, 1 second backward).
- **▷| Diode:** Places a diode that conducts current in one direction.
- **▷|↗ LED:** Places a light-emitting diode that glows when forward-biased and warns if current exceeds safe limits.
- **▷⋕ Zener:** Places a Zener diode that regulates voltage in reverse breakdown.
- **‖ Transformer:** Places a step-up / step-down AC transformer.
- **╱ Switch:** Places a toggleable switch to open or close a path.
- **└─ Wire:** Click terminal dots or junctions to draw connecting wires.
- **⏚ Ground:** Places a `0 V` ground reference point.
- **✥ Pan:** Drag anywhere on the canvas to move the view.

### Placement Options & Navigation Bar
- **Snap to grid (checkbox):** Snaps components and wires to grid points when placed or moved (hold **Shift** while dragging to temporarily toggle).
- **Keep placing (checkbox):** Keeps the selected component tool active after you place one part, so you can place several in a row without re-clicking the tool.
- **Rotate next (button):** Appears while a placement tool is active; rotates the orientation of the next component before you place it (shortcut: `R`).
- **Examples (dropdown):** Loads ready-made circuits (such as *Ohm's law & switch*, *Series · voltage divider*, *Parallel · current split*, *Wheatstone bridge*, *RC charge & discharge*, *RL · inductor ramp & flyback diode*, *RLC · underdamped resonant ringing*, *Zener 5.1V regulator & LED load*, *Half-wave* & *Full-wave bridge rectifiers*, *Full-wave bridge + filter capacitor (ripple)*, and *AC transformer*).
- **Select (dropdown):** Lets you pick any component, wire, or node by name (useful for keyboard navigation).
- **Use selected endpoint (button):** Connects a wire from the selected terminal when wiring via keyboard/selection.
- **`−` / `+` / `Fit view`:** Zooms out, zooms in, or centers and fits the whole circuit on screen.

### Selected Object Inspector (appears when you click a part or node)
- **Value & Unit + Apply:** Change a component's resistance, capacitance, inductance, voltage, or current and click **Apply**.
- **Frequency (Hz) & Phase (°):** *(AC Source only)* Sets the AC frequency and starting phase angle.
- **Turns ratio (Np : Ns) + Apply turns ratio:** *(Transformer only)* Sets primary and secondary coil turns.
- **Close switch / Open switch:** *(Switch only)* Opens or closes the switch (works even while the simulation is running).
- **Duplicate / Rotate / Delete / Done:** Copies, rotates, deletes the selected item, or closes the inspector.

### Bottom Simulation & Flow Controls
- **▶ Run / Pause:** Starts or pauses the time-based simulation (needed to watch capacitors charge/discharge, inductors ramp, and AC signals oscillate).
- **Step 0.01 s:** Advances the simulation by a single `0.01 s` step while paused.
- **Reset time:** Resets the simulation clock back to `0 s`.
- **Time (dropdown):** Changes simulation playback speed (`0.01×` up to `100×`).
- **Flow markers (checkbox):** Shows or hides moving dots representing conventional current flow.
- **Current scale (dropdown):** Sets the visual speed reference for flow markers (*Auto* or fixed scales from `1 µA` to `10 A`).
- **Waveform Oscilloscope (expandable):** Displays live **CH1 V(t)** voltage and **CH2 I(t)** current waveforms:
  - **Probe target (dropdown):** Automatically probes the filtered load branch or selected part, or lets you pick a specific component.
  - **Ripple Vr(pp) & Vdc:** Measures peak-to-peak ripple voltage (`Vmin ↔ Vmax`), average DC voltage, and ripple percentage (especially useful when connecting a filter capacitor in parallel with a rectifier load).
  - **Reactive Energy:** Displays total stored energy across capacitors and inductors.
  - **Zoom Ripple (button):** Zooms the vertical axis onto the ripple envelope so small voltage fluctuations are easy to inspect.
  - **Clear Trace (button):** Clears the oscilloscope trace history.
- **Measurements and keyboard help (expandable):** Shows a full table of **Voltage**, **Current**, and **Power** for every component, plus keyboard shortcuts.

---

## 8. Logic Circuits Lab (`logic.html`)

This lab has two modes at the top: **Logic Gates Simulator** (digital logic + Boolean algebra) and **Logic IC Lab** (74xx hardware chip breadboard).

### Top Bar (Both Modes)
- **← Electricsim:** Returns to the main Electricsim Hub page.
- **Logic Gates Simulator / Logic IC Lab (tabs):** Switches between the two workspace modes.
- **Examples / IC Presets (dropdown):** Loads pre-built logic circuits or 74xx IC bench setups.
- **Undo / Redo / Clear:** Reverses edits, restores undone edits, or clears the canvas.

---

### Mode 1: Logic Gates Simulator

#### Live Boolean Algebra Bar (Top)
- **Focused output tabs (`F`, `G`, etc.):** Switch which output's equation, K-Map, and simplification are shown.
- **Notation (dropdown):** Changes how equations are written:
  - *Engineering* (`A·B + A'`)
  - *Textbook* (`A·B + Ā`)
  - *Symbolic* (`A ∧ B ∨ ¬A`)
  - *Code* (`A && B || !A`)
- **Copy:** Copies the current Boolean equation to your clipboard.
- **⚡ Simplify & Convert:** Opens the simplification preview bar / tab for the current circuit.
- **Quick Preview Buttons (`Apply Minimal`, `NAND-Only`, `NOR-Only`):** Appears in the preview bar to immediately rebuild the schematic into its minimal form or using only NAND / NOR gates.

#### Schematic Subbar
- **Snap to grid (checkbox):** Aligns gates and wires neatly to the background grid.
- **Keep placing (checkbox):** Lets you place multiple copies of the same gate or component in a row without re-selecting the tool each time.
- **↻ Rotate next (R):** Rotates the next component before placing it.
- **`−` / `+` / `Fit view`:** Zooms out, zooms in, or fits the entire schematic to the screen.

#### Left Component Palette
- **Cursor & Wiring:** **Move / Edit** (select/drag), **Wire** (connect pins), **Pan** (move canvas).
- **I/O & Constants:** **Input (A–P)** (up to 12 clickable `0/1` toggle inputs), **Output (F–V)** (up to 8 indicator probes), **Const 1** (always high), **Const 0** (always low).
- **Logic Gates:** **AND**, **OR**, **NOT**, **NAND**, **NOR**, **XOR**, **XNOR**, **Buffer**.
- **MSI Blocks & Plexers:** **Half Adder (HA)**, **Full Adder (FA)**, **2:1 Multiplexer (MUX 2:1)**, **4:1 Multiplexer (MUX 4:1)**, **4:2 Priority Encoder (ENC 4:2)**, **2:4 Decoder (DEC 2:4)**, **1-Bit Magnitude Comparator (COMP)**.
- **Sequential Latches:** **SR Latch** (Set/Reset memory) and **D Latch** (Data/Enable gated memory).

#### Right Inspector (when a gate or I/O is selected)
- **Gate Type (dropdown):** Change a placed gate into another gate type in place.
- **Input Pins (dropdown):** Change a basic gate between `2 inputs`, `3 inputs`, or `4 inputs`.
- **Symbol (dropdown):** Rename an Input (`A`–`P`) or Output (`F`–`V`).
- **Toggle State (0 ↔ 1):** Flips the selected input between `0` and `1` (you can also click the input's badge directly on the canvas).
- **↻ Rotate / Duplicate / Delete / Done:** Rotates, copies, removes the selected item, or closes the inspector.

#### Right Analysis Dock (3 Tabs)
- **Truth Table:** Shows input combinations (up to 64 rows for 6+ inputs) and resulting outputs. **Click any row** to apply those inputs directly to your schematic.
- **K-Map:** Shows the Karnaugh map for the focused output (and shows a slice indicator when more than 4 inputs are present). Click prime implicant chips below it to highlight groups, or click any cell to test that input state.
- **Simplify & Convert:** Compares your **Drawn Schematic**, **Minimal SOP**, and **Minimal POS**, lists **Prime Implicants**, and provides 4 one-click rebuild buttons:
  - **⚡ Rebuild Minimal SOP (AND / OR / NOT)**
  - **Rebuild Minimal POS (OR / AND / NOT)**
  - **Convert to Universal NAND-Only**
  - **Convert to Universal NOR-Only**

#### Bottom Metrics Footer
- Shows live counts for **Gates**, **Inputs**, **Outputs**, **Logic Depth**, **Est. CMOS transistors**, and whether the circuit is **✓ Combinational** or **Sequential Feedback**.

---

### Mode 2: Logic IC Lab (74xx Series DIP Bench)

#### Bench Options Subbar
- **🔬 X-Ray IC Internals (checkbox):** Shows semi-transparent internal gate diagrams, live MSI telemetry, and pin connections inside each 74xx chip.
- **⚡ Auto-Power (VCC/GND) (checkbox):** Automatically supplies `+5V` to VCC and `0V` to GND on all ICs so you don't have to wire power manually.
- **Snap to grid (checkbox):** Snaps chips, bench parts, and wires to the grid.
- **Keep placing (checkbox):** Keeps the selected part or IC active so you can place multiple copies in a row.
- **↻ Rotate next (R):** Rotates the next part before placing it.
- **`−` / `+` / `Fit view`:** Zooms out, zooms in, or fits the bench to the screen.

#### Left Component Palette
- **Cursor & Wiring:** **Move / Edit**, **Wire**, **Pan**.
- **Bench Components:**
  - **🔋 5V Battery:** Provides `+5V` (VCC) and `0V` (GND) power.
  - **⏚ GND:** Ground (`0V`) reference terminal.
  - **⏻ Switch:** Clickable ON/OFF toggle switch.
  - **🎛 DIP-4 Switch:** 4-channel DIP switch bank for driving 4-bit binary buses.
  - **〰 Resistor:** `220 Ω` current-limiting resistor.
  - **💡 Lamp:** Indicator LED that lights up when powered.
  - **📍 Logic Probe:** Test probe that displays `1 (HIGH)`, `0 (LOW)`, or `Z (FLOATING)` at any pin or wire.
  - **⏱ 1Hz Clock:** Automatically pulses `1` and `0` once per second (or click to step manually).
  - **🔢 7-Seg Display:** 7-segment hex display with 4 inputs (`A, B, C, D`).
- **74xx Series ICs (14-Pin & 16-Pin DIP):**
  - **7404:** Hex Inverter (6× NOT gates)
  - **7400:** Quad 2-Input NAND
  - **7402:** Quad 2-Input NOR
  - **7408:** Quad 2-Input AND
  - **7432:** Quad 2-Input OR
  - **7486:** Quad 2-Input XOR
  - **74266:** Quad 2-Input XNOR
  - **7410:** Triple 3-Input NAND
  - **7411:** Triple 3-Input AND
  - **7427:** Triple 3-Input NOR
  - **7474:** Dual Positive-Edge-Triggered D Flip-Flop
  - **7475:** 4-Bit Bistable D-Latch (16-pin)
  - **7493:** 4-Bit Binary Ripple Counter
  - **74148:** 8-to-3 Priority Encoder (16-pin)
  - **74157:** Quad 2-to-1 Multiplexer (16-pin)
  - **74279:** Quad SR-Latch (16-pin)
  - **74283:** 4-Bit Binary Full Adder (16-pin)

#### Right IC Bench Inspector (when a part or IC is selected)
- **Lamp Color (dropdown):** *(Lamp only)* Choose *Emerald Green*, *Cyan Blue*, *Amber Gold*, or *Ruby Red*.
- **Flip Switch (ON ↔ OFF):** *(Switch / Clock only)* Toggles the switch or clock state.
- **Live Pin State Monitor:** *(74xx IC only)* Shows whether the chip is powered and displays the live `HIGH` / `LOW` state of all 14 or 16 pins.
- **↻ Rotate (R) / Duplicate / Delete / Done:** Rotates, copies, removes the selected item, or closes the inspector.

#### Bottom IC Bench Footer
- Shows live counts for **74xx ICs**, **Powered**, **Switches**, **Lamps ON**, **Wires**, **I<sub>CC</sub> (mA)** supply current, **Power (mW)**, **t<sub>pd</sub> (ns)** propagation delay, and bench status.

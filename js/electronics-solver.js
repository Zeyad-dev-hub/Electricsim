(function (root) {
    'use strict';

    // =========================================================================
    // ELECTRONSIM — UNIFIED HYBRID ANALOG + DIGITAL ELECTRONICS BENCH SOLVER
    // =========================================================================
    // Computes real DC node voltages (V), branch currents (mA), LED/RGB brightness,
    // DC Motor RPM & polarity, Potentiometer voltage dividers, NPN 2N2222 BJT
    // switching, Digital Multimeter (V/mA/Ohm), Breadboard internal strip ties &
    // automatic component plug-in snapping, 17x 74xx DIP IC logic (4.0V-5.5V safe
    // window), and authentic component overload/corruption diagnostics.

    const LED_VF = {
        red: 2.0,
        amber: 2.1,
        emerald: 2.2,
        cyan: 3.0
    };

    const RGB_VF = {
        r: 2.0,
        g: 2.2,
        b: 3.0
    };

    // -------------------------------------------------------------------------
    // 1. BREADBOARD GEOMETRY & INTERNAL STRIP MAPPING (TRUE 0.1" = 36px DIP SCALE!)
    // -------------------------------------------------------------------------
    // Unified physical scale: 0.1" (2.54 mm) hole pitch = 36 px (~14.17 px/mm).
    // Half-size breadboard: 30 columns (x = -540..+504, step 36px; col 16 = 0!)
    //   Top rails: + at y=-324, - at y=-288  (EXACT 2U = 72px gap to Row a so vertical resistors plug directly from rail to 5-point strip!)
    //   Top strips a..e: y = -216, -180, -144, -108, -72  (Row e = -72 matches DIP-14/16 top pins!)
    //   Center DIP trough: y = -72..+72 (EXACT width of every 74xx DIP-14/16 IC!)
    //   Bottom strips f..j: y = +72, +108, +144, +180, +216 (Row f = +72 matches DIP-14/16 bottom pins!)
    //   Bottom rails: + at y=+288, - at y=+324 (EXACT 2U = 72px gap from Row j!)
    // Mini breadboard: 17 columns (x = -288..+288, step 36px), a..e and f..j strips only.

    function getBreadboardSpec(variant = 'half') {
        if (variant === 'mini') {
            return {
                variant: 'mini',
                cols: 17,
                startX: -288,
                pitch: 36,
                hasRails: false,
                width: 684,
                height: 516,
                topRows: [-216, -180, -144, -108, -72],
                botRows: [72, 108, 144, 180, 216]
            };
        }
        return {
            variant: 'half',
            cols: 30,
            startX: -540,
            pitch: 36,
            hasRails: true,
            width: 1188,
            height: 740,
            topRailPosY: -324,
            topRailNegY: -288,
            topRows: [-216, -180, -144, -108, -72],
            botRows: [72, 108, 144, 180, 216],
            botRailPosY: 288,
            botRailNegY: 324
        };
    }

    function rotateLocalPt(lx, ly, deg = 0) {
        const r = ((deg || 0) % 360 + 360) % 360;
        if (r === 90) return { x: -ly, y: lx };
        if (r === 180) return { x: -lx, y: -ly };
        if (r === 270) return { x: ly, y: -lx };
        return { x: lx, y: ly };
    }

    function getBreadboardHoles(comp) {
        const spec = getBreadboardSpec(comp.variant || 'half');
        const holes = [];
        const rot = comp.rotation || 0;
        const cx = comp.position.x;
        const cy = comp.position.y;
        const rowNamesTop = ['a', 'b', 'c', 'd', 'e'];
        const rowNamesBot = ['f', 'g', 'h', 'i', 'j'];

        const addHole = (pinId, lx, ly, stripId, role, title) => {
            const p = rotateLocalPt(lx, ly, rot);
            holes.push({
                key: `${comp.id}:${pinId}`,
                compId: comp.id,
                pin: pinId,
                lx,
                ly,
                x: cx + p.x,
                y: cy + p.y,
                dir: { dx: 0, dy: 0 },
                role,
                stripId: `${comp.id}:${stripId}`,
                title,
                isBreadboardHole: true
            });
        };

        for (let c = 0; c < spec.cols; c++) {
            const lx = spec.startX + c * spec.pitch;
            const colNum = c + 1;
            for (let r = 0; r < 5; r++) {
                const rn = rowNamesTop[r];
                addHole(`${rn}${colNum}`, lx, spec.topRows[r], `top_${colNum}`, 'io', `Breadboard ${rn.toUpperCase()}${colNum} (Top Strip ${colNum})`);
            }
            for (let r = 0; r < 5; r++) {
                const rn = rowNamesBot[r];
                addHole(`${rn}${colNum}`, lx, spec.botRows[r], `bot_${colNum}`, 'io', `Breadboard ${rn.toUpperCase()}${colNum} (Bottom Strip ${colNum})`);
            }
        }

        if (spec.hasRails) {
            // 25 rail holes arranged in 5 complete groups of 5 (matching real 400-point breadboards & Half_Breadboard.svg!)
            let railIdx = 1;
            for (let c = 0; c < spec.cols; c++) {
                // Skip divider gaps between the 5 five-hole rail groups (cols 0, 6, 12, 18, 24 -> keeps 5×5 = 25 holes on cols 2..6, 8..12, 14..18, 20..24, 26..30!)
                if (c === 0 || c === 6 || c === 12 || c === 18 || c === 24) continue;
                const lx = spec.startX + c * spec.pitch;
                addHole(`tp${railIdx}`, lx, spec.topRailPosY, 'rail_top_pos', 'vcc', `Breadboard Top + Rail #${railIdx}`);
                addHole(`tn${railIdx}`, lx, spec.topRailNegY, 'rail_top_neg', 'gnd', `Breadboard Top − Rail #${railIdx}`);
                addHole(`bp${railIdx}`, lx, spec.botRailPosY, 'rail_bot_pos', 'vcc', `Breadboard Bottom + Rail #${railIdx}`);
                addHole(`bn${railIdx}`, lx, spec.botRailNegY, 'rail_bot_neg', 'gnd', `Breadboard Bottom − Rail #${railIdx}`);
                railIdx++;
            }
        }
        return holes;
    }

    // -------------------------------------------------------------------------
    // 2. RESISTOR 4-BAND EIA COLOR CODE CALCULATOR
    // -------------------------------------------------------------------------
    const BAND_COLORS = [
        '#111111', // 0 Black
        '#7c3f1d', // 1 Brown
        '#dc2626', // 2 Red
        '#f97316', // 3 Orange
        '#eab308', // 4 Yellow
        '#16a34a', // 5 Green
        '#2563eb', // 6 Blue
        '#9333ea', // 7 Violet
        '#6b7280', // 8 Grey
        '#f8fafc'  // 9 White
    ];
    const MULT_COLORS = {
        '-2': '#cbd5e1', // Silver (0.01)
        '-1': '#d4af37', // Gold (0.1)
        0: '#111111',
        1: '#7c3f1d',
        2: '#dc2626',
        3: '#f97316',
        4: '#eab308',
        5: '#16a34a',
        6: '#2563eb',
        7: '#9333ea'
    };

    function getResistorBands(ohms) {
        const val = Math.max(1, Math.min(99e6, Number(ohms) || 220));
        let exp = Math.floor(Math.log10(val)) - 1;
        let sig = Math.round(val / Math.pow(10, exp));
        if (sig >= 100) {
            sig = Math.round(sig / 10);
            exp += 1;
        }
        if (sig < 10) {
            sig = sig * 10;
            exp -= 1;
        }
        const d1 = Math.max(0, Math.min(9, Math.floor(sig / 10)));
        const d2 = Math.max(0, Math.min(9, sig % 10));
        const multKey = Math.max(-2, Math.min(7, exp));
        return [
            BAND_COLORS[d1],
            BAND_COLORS[d2],
            MULT_COLORS[multKey] || '#111111',
            '#d4af37' // Gold ±5% tolerance band
        ];
    }

    function formatOhms(ohms) {
        const v = Number(ohms);
        if (!Number.isFinite(v)) return '—';
        if (v >= 1e6) return `${+(v / 1e6).toPrecision(3)} MΩ`;
        if (v >= 1e3) return `${+(v / 1e3).toPrecision(3)} kΩ`;
        return `${+v.toPrecision(3)} Ω`;
    }

    function formatCurrentMa(ma) {
        const a = Math.abs(ma);
        if (!Number.isFinite(a)) return '—';
        if (a >= 1000) return `${(ma / 1000).toFixed(2)} A`;
        if (a < 0.05 && a > 1e-4) return `${(ma * 1000).toFixed(0)} µA`;
        return `${ma.toFixed(1)} mA`;
    }

    // -------------------------------------------------------------------------
    // 3. LINEAR SOLVER (Gaussian Elimination with Partial Pivoting)
    // -------------------------------------------------------------------------
    function solveLinearSystem(A, b) {
        const n = b.length;
        if (n === 0) return [];
        const M = new Array(n);
        for (let i = 0; i < n; i++) {
            const row = new Float64Array(n + 1);
            for (let j = 0; j < n; j++) row[j] = A[i][j];
            row[n] = b[i];
            M[i] = row;
        }

        for (let col = 0; col < n; col++) {
            let pivotRow = col;
            let maxAbs = Math.abs(M[col][col]);
            for (let r = col + 1; r < n; r++) {
                const v = Math.abs(M[r][col]);
                if (v > maxAbs) {
                    maxAbs = v;
                    pivotRow = r;
                }
            }
            if (maxAbs < 1e-15) continue;
            if (pivotRow !== col) {
                const tmp = M[col];
                M[col] = M[pivotRow];
                M[pivotRow] = tmp;
            }
            const piv = M[col][col];
            const rowC = M[col];
            for (let r = col + 1; r < n; r++) {
                const rowR = M[r];
                const factor = rowR[col] / piv;
                if (Math.abs(factor) < 1e-18) continue;
                rowR[col] = 0;
                for (let j = col + 1; j <= n; j++) {
                    rowR[j] -= factor * rowC[j];
                }
            }
        }

        const x = new Float64Array(n);
        for (let i = n - 1; i >= 0; i--) {
            const piv = M[i][i];
            if (Math.abs(piv) < 1e-15) {
                x[i] = 0;
                continue;
            }
            let sum = M[i][n];
            for (let j = i + 1; j < n; j++) {
                sum -= M[i][j] * x[j];
            }
            x[i] = sum / piv;
        }
        return x;
    }

    // -------------------------------------------------------------------------
    // 4. HYBRID ANALOG + DIGITAL SOLVER
    // -------------------------------------------------------------------------
    /**
     * Evaluates a full Electronics Lab document with real analog voltages/currents,
     * breadboard plug-in connectivity, 17x 74xx DIP ICs, and component overload checks.
     *
     * @param {object} doc - Electronics bench document
     * @param {object} helpers - { IC_CATALOG, evalSingleGate, allICPins, getComponentPins, evalMsiIC }
     */
    function evaluateHybridBench(doc, helpers) {
        const { IC_CATALOG, evalSingleGate, allICPins } = helpers;
        const pins = allICPins(doc);

        // 4.1 Build topological ideal-wire equivalence classes (wires + closed switches + breadboard strips + plug-in snapped pins)
        const parent = new Map();
        const find = k => {
            let r = k;
            while (parent.get(r) !== r) r = parent.get(r);
            let cur = k;
            while (cur !== r) {
                const nxt = parent.get(cur);
                parent.set(cur, r);
                cur = nxt;
            }
            return r;
        };
        const union = (a, b) => {
            if (!parent.has(a) || !parent.has(b)) return;
            const ra = find(a);
            const rb = find(b);
            if (ra !== rb) parent.set(rb, ra);
        };

        for (const k of pins.keys()) parent.set(k, k);

        // Track explicitly wired pins (used for open-cathode / standalone switch semantics)
        const wireConnectedPins = new Set();
        const pluggedPinMap = new Map(); // compPinKey -> breadboardHoleKey

        // Connect breadboard internal strips & detect component pins plugged directly onto breadboard holes!
        const breadboardHoleSpatial = new Map(); // "x,y" -> hole
        const breadboardStripReps = new Map();   // stripId -> first hole key
        const breadboardNets = new Map();        // stripId -> Set(hole keys)

        for (const p of pins.values()) {
            if (p.isBreadboardHole) {
                const coordKey = `${Math.round(p.x)},${Math.round(p.y)}`;
                breadboardHoleSpatial.set(coordKey, p);
                if (!breadboardStripReps.has(p.stripId)) {
                    breadboardStripReps.set(p.stripId, p.key);
                    breadboardNets.set(p.stripId, new Set([p.key]));
                } else {
                    union(breadboardStripReps.get(p.stripId), p.key);
                    breadboardNets.get(p.stripId).add(p.key);
                }
            }
        }

        // Auto-snap any non-breadboard component pin sitting directly on top of a breadboard hole!
        if (breadboardHoleSpatial.size > 0) {
            for (const p of pins.values()) {
                if (p.isBreadboardHole) continue;
                const coordKey = `${Math.round(p.x)},${Math.round(p.y)}`;
                let hole = breadboardHoleSpatial.get(coordKey);
                if (!hole) {
                    // Check within ±4px tolerance
                    for (let dx = -4; dx <= 4 && !hole; dx++) {
                        for (let dy = -4; dy <= 4 && !hole; dy++) {
                            if (dx === 0 && dy === 0) continue;
                            hole = breadboardHoleSpatial.get(`${Math.round(p.x) + dx},${Math.round(p.y) + dy}`);
                        }
                    }
                }
                if (hole) {
                    union(p.key, hole.key);
                    pluggedPinMap.set(p.key, hole.key);
                }
            }
        }

        // Connect explicit wires
        for (const w of (doc.wires || [])) {
            if (pins.has(w.from) && pins.has(w.to)) {
                union(w.from, w.to);
                wireConnectedPins.add(w.from);
                wireConnectedPins.add(w.to);
            }
        }

        // Determine which pins have external connections (via wire OR via sharing a breadboard strip with another pin/wire)
        const stripOccupancy = new Map(); // stripId -> count of non-bb pins + wired bb holes on this strip
        for (const [compKey, holeKey] of pluggedPinMap.entries()) {
            const hole = pins.get(holeKey);
            if (hole) stripOccupancy.set(hole.stripId, (stripOccupancy.get(hole.stripId) || 0) + 1);
        }
        for (const wk of wireConnectedPins) {
            const p = pins.get(wk);
            if (p && p.isBreadboardHole) {
                stripOccupancy.set(p.stripId, (stripOccupancy.get(p.stripId) || 0) + 1);
            }
        }
        for (const [compKey, holeKey] of pluggedPinMap.entries()) {
            const hole = pins.get(holeKey);
            if (hole && (stripOccupancy.get(hole.stripId) || 0) >= 2) {
                wireConnectedPins.add(compKey);
            }
        }

        // Internal ideal ties for closed switches, pushbuttons, SPDT switches
        const standaloneSwitches = [];
        const openSeriesSwitches = [];
        for (const comp of (doc.components || [])) {
            if (comp.kind === 'switch') {
                const inKey = `${comp.id}:in`;
                const outKey = `${comp.id}:out`;
                const inW = wireConnectedPins.has(inKey);
                const outW = wireConnectedPins.has(outKey);
                if (inW && outW) {
                    if (comp.closed) union(inKey, outKey);
                    else openSeriesSwitches.push({ inKey, outKey });
                } else {
                    standaloneSwitches.push({ comp, activeKey: (inW && !outW) ? inKey : outKey });
                }
            } else if (comp.kind === 'pushbutton') {
                // 4-pin tactile button: a1-a2 paired, b1-b2 paired; when pressed, a connects to b
                union(`${comp.id}:a1`, `${comp.id}:a2`);
                union(`${comp.id}:b1`, `${comp.id}:b2`);
                const isClosed = Boolean(comp.pressed);
                if (isClosed) {
                    union(`${comp.id}:a1`, `${comp.id}:b1`);
                }
            } else if (comp.kind === 'spdt') {
                const comKey = `${comp.id}:com`;
                const isRight = (comp.positionThrow || comp.throwPos) === 'right';
                const targetKey = isRight ? `${comp.id}:t2` : `${comp.id}:t1`;
                union(comKey, targetKey);
            }
        }

        // Assign compact electrical node IDs (0..N-1) ONLY to non-isolated nets
        const rootToNode = new Map();
        const pinToNet = new Map();
        const nets = [];
        for (const k of pins.keys()) {
            const r = find(k);
            if (!rootToNode.has(r)) {
                const idx = nets.length;
                rootToNode.set(r, idx);
                nets.push({ id: idx, pins: [], hasTrueGround: false, value: null, conflict: false, voltage: null });
            }
            const nid = rootToNode.get(r);
            pinToNet.set(k, nid);
            nets[nid].pins.push(k);
        }

        const netOf = pinKey => pinToNet.get(pinKey);

        // Identify which nets are explicitly tied to Ground (0V) or to source negative terminals
        // Also track connected islands through all 2-terminal/multi-terminal components so series batteries stack cleanly!
        const islandParent = new Int32Array(nets.length);
        for (let i = 0; i < nets.length; i++) islandParent[i] = i;
        const iFind = x => {
            while (islandParent[x] !== x) { islandParent[x] = islandParent[islandParent[x]]; x = islandParent[x]; }
            return x;
        };
        const iUnion = (a, b) => {
            if (a === undefined || b === undefined) return;
            const ra = iFind(a), rb = iFind(b);
            if (ra !== rb) islandParent[rb] = ra;
        };

        for (const comp of (doc.components || [])) {
            if (comp.kind === 'battery' || comp.kind === 'battery9v' || comp.kind === 'psu') {
                iUnion(netOf(`${comp.id}:pos`), netOf(`${comp.id}:neg`));
            } else if (comp.kind === 'resistor') {
                iUnion(netOf(`${comp.id}:a`), netOf(`${comp.id}:b`));
            } else if (comp.kind === 'potentiometer') {
                iUnion(netOf(`${comp.id}:t1`), netOf(`${comp.id}:wiper`));
                iUnion(netOf(`${comp.id}:wiper`), netOf(`${comp.id}:t2`));
            } else if (comp.kind === 'lamp') {
                iUnion(netOf(`${comp.id}:anode`), netOf(`${comp.id}:cathode`));
            } else if (comp.kind === 'rgb_led') {
                iUnion(netOf(`${comp.id}:r`), netOf(`${comp.id}:gnd`));
                iUnion(netOf(`${comp.id}:g`), netOf(`${comp.id}:gnd`));
                iUnion(netOf(`${comp.id}:b`), netOf(`${comp.id}:gnd`));
            } else if (comp.kind === 'motor' || comp.kind === 'buzzer' || comp.kind === 'multimeter') {
                iUnion(netOf(`${comp.id}:pos`), netOf(`${comp.id}:neg`));
            } else if (comp.kind === 'npn') {
                iUnion(netOf(`${comp.id}:e`), netOf(`${comp.id}:b`));
                iUnion(netOf(`${comp.id}:c`), netOf(`${comp.id}:e`));
            } else if (comp.kind === 'ic') {
                const spec = IC_CATALOG[comp.model];
                if (spec) iUnion(netOf(`${comp.id}:${spec.vccPin || 14}`), netOf(`${comp.id}:${spec.gndPin || 7}`));
            }
        }

        // Determine reference (0V) nets:
        // 1) Every 'gnd' component net is 0V.
        // 2) For every battery/battery9v/psu whose 'neg' is NOT tied to another battery's 'pos' AND whose island doesn't already have an explicit 'gnd' tied elsewhere, or if no other source drives 'neg', tie 'neg' to 0V so standalone battery circuits have a clean 0V return!
        const sourcePosNets = new Set();
        const explicitGndNets = new Set();
        const islandsWithExplicitGnd = new Set();

        for (const comp of (doc.components || [])) {
            if (comp.kind === 'gnd') {
                const n = netOf(`${comp.id}:pin`);
                if (n !== undefined) {
                    explicitGndNets.add(n);
                    islandsWithExplicitGnd.add(iFind(n));
                }
            } else if (comp.kind === 'battery' || comp.kind === 'battery9v' || comp.kind === 'psu') {
                if (comp.kind === 'psu' && comp.enabled === false) continue;
                const np = netOf(`${comp.id}:pos`);
                if (np !== undefined) sourcePosNets.add(np);
            } else if (comp.kind === 'ic' && doc.autoPower) {
                const spec = IC_CATALOG[comp.model];
                const ng = netOf(`${comp.id}:${spec?.gndPin || 7}`);
                if (ng !== undefined) {
                    explicitGndNets.add(ng);
                    islandsWithExplicitGnd.add(iFind(ng));
                }
            }
        }

        const gndRefNets = new Set(explicitGndNets);
        const groundedIslands = new Set(islandsWithExplicitGnd);
        for (const comp of (doc.components || [])) {
            if (comp.kind === 'battery' || comp.kind === 'battery9v' || comp.kind === 'psu') {
                const nn = netOf(`${comp.id}:neg`);
                const np = netOf(`${comp.id}:pos`);
                if (nn === undefined) continue;
                // Don't ground neg if it's stacked on another source's pos (series batteries!) or if pos is tied to GND
                if (sourcePosNets.has(nn) || explicitGndNets.has(np)) continue;
                gndRefNets.add(nn);
                groundedIslands.add(iFind(nn));
            }
        }

        // Also mark which nets have a true low-impedance ground return path (for strict lamp/IC ground return checks)
        const trueGroundNets = new Set(gndRefNets);

        // Identify all active electrical nets that participate in at least one component
        const activeNetSet = new Set();
        const touchNet = nid => { if (nid !== undefined) activeNetSet.add(nid); };
        for (const comp of (doc.components || [])) {
            if (comp.kind === 'breadboard') continue;
            for (const p of helpers.getComponentPins(comp)) {
                touchNet(netOf(p.key));
            }
        }
        for (const n of gndRefNets) touchNet(n);

        // Map active non-ground nets to compact matrix indices 0..M-1
        const activeNets = [...activeNetSet];
        const netToMatIdx = new Map();
        const matIdxToNet = [];
        for (const nid of activeNets) {
            if (!gndRefNets.has(nid)) {
                netToMatIdx.set(nid, matIdxToNet.length);
                matIdxToNet.push(nid);
            }
        }
        const M = matIdxToNet.length;

        // Track IC output drivers across digital-analog relaxation passes
        const icOutputDrivers = new Map(); // pinKey -> { val: 0|1, vccV, gndV }
        const icStates = new Map();
        const lampStates = new Map();
        const rgbStates = new Map();
        const motorStates = new Map();
        const resistorStates = new Map();
        const potStates = new Map();
        const buzzerStates = new Map();
        const npnStates = new Map();
        const meterStates = new Map();
        const segStates = new Map();
        const probeStates = new Map();
        const sourceStates = new Map();

        // PWL state variables
        const ledOn = new Map();          // compId -> bool
        const rgbOn = new Map();          // "compId:ch" -> bool
        const npnState = new Map();       // compId -> { beOn: bool, gCe: number, icTarget: number }

        // Helper to solve one MNA pass given current PWL states & IC output drivers
        function runAnalogPass() {
            const A = Array.from({ length: M }, () => new Float64Array(M));
            const b = new Float64Array(M);

            const stampG = (nA, nB, g) => {
                const ia = netToMatIdx.get(nA);
                const ib = netToMatIdx.get(nB);
                if (ia !== undefined) A[ia][ia] += g;
                if (ib !== undefined) A[ib][ib] += g;
                if (ia !== undefined && ib !== undefined) {
                    A[ia][ib] -= g;
                    A[ib][ia] -= g;
                }
            };

            const stampI = (nFrom, nTo, current) => {
                // Conventional current flowing from nFrom -> nTo (adds +current to nTo, -current to nFrom)
                const ia = netToMatIdx.get(nFrom);
                const ib = netToMatIdx.get(nTo);
                if (ia !== undefined) b[ia] -= current;
                if (ib !== undefined) b[ib] += current;
            };

            const stampVsrc = (nPos, nNeg, v, rSeries) => {
                const g = 1 / Math.max(1e-4, rSeries);
                stampG(nPos, nNeg, g);
                stampI(nNeg, nPos, v * g);
            };

            // Tiny gmin to ground on every active node so floating nodes stay numerically finite (1e-11 S = 100 GOhm)
            for (let i = 0; i < M; i++) A[i][i] += 1e-11;

            // Stamp all components
            for (const comp of (doc.components || [])) {
                if (comp.kind === 'battery') {
                    const cells = Math.max(1, Math.min(4, Number(comp.cells) || (comp.voltage ? Math.round(comp.voltage / 1.5) : 3)));
                    const v = comp.voltage && !comp.cells ? Number(comp.voltage) : cells * 1.5;
                    const rInt = 0.2 * cells;
                    stampVsrc(netOf(`${comp.id}:pos`), netOf(`${comp.id}:neg`), v, rInt);
                } else if (comp.kind === 'battery9v') {
                    stampVsrc(netOf(`${comp.id}:pos`), netOf(`${comp.id}:neg`), 9.0, 1.5);
                } else if (comp.kind === 'psu') {
                    const enabled = comp.enabled !== false;
                    const v = enabled ? Math.max(0, Math.min(12, Number(comp.voltage ?? 5.0))) : 0;
                    if (enabled) {
                        stampVsrc(netOf(`${comp.id}:pos`), netOf(`${comp.id}:neg`), v, 0.05);
                    } else {
                        stampG(netOf(`${comp.id}:pos`), netOf(`${comp.id}:neg`), 1e-6);
                    }
                } else if (comp.kind === 'resistor') {
                    const ohms = Math.max(0.5, Number(comp.ohms) || 220);
                    stampG(netOf(`${comp.id}:a`), netOf(`${comp.id}:b`), 1 / ohms);
                } else if (comp.kind === 'potentiometer') {
                    const total = Math.max(10, Number(comp.ohms) || 10000);
                    const pos = Math.max(0, Math.min(1, comp.wiper ?? comp.knob ?? 0.5));
                    const r1 = Math.max(1, total * pos);
                    const r2 = Math.max(1, total * (1 - pos));
                    stampG(netOf(`${comp.id}:t1`), netOf(`${comp.id}:wiper`), 1 / r1);
                    stampG(netOf(`${comp.id}:wiper`), netOf(`${comp.id}:t2`), 1 / r2);
                } else if (comp.kind === 'lamp') {
                    const na = netOf(`${comp.id}:anode`);
                    const nc = netOf(`${comp.id}:cathode`);
                    const vf = LED_VF[comp.color || 'emerald'] || 2.2;
                    if (ledOn.get(comp.id)) {
                        // Forward-biased PWL diode: V = vf + I * 15 Ohm
                        stampVsrc(na, nc, vf, 15);
                    } else {
                        stampG(na, nc, 1e-8);
                    }
                } else if (comp.kind === 'rgb_led') {
                    const ng = netOf(`${comp.id}:gnd`);
                    for (const ch of ['r', 'g', 'b']) {
                        const na = netOf(`${comp.id}:${ch}`);
                        if (rgbOn.get(`${comp.id}:${ch}`)) {
                            stampVsrc(na, ng, RGB_VF[ch], 15);
                        } else {
                            stampG(na, ng, 1e-8);
                        }
                    }
                } else if (comp.kind === 'motor') {
                    // Brushed DC motor armature resistance 12 Ohm
                    stampG(netOf(`${comp.id}:pos`), netOf(`${comp.id}:neg`), 1 / 12);
                } else if (comp.kind === 'buzzer') {
                    stampG(netOf(`${comp.id}:pos`), netOf(`${comp.id}:neg`), 1 / 1000);
                } else if (comp.kind === 'npn') {
                    const ne = netOf(`${comp.id}:e`);
                    const nb = netOf(`${comp.id}:b`);
                    const nc = netOf(`${comp.id}:c`);
                    const st = npnState.get(comp.id) || { beOn: false, gCe: 1e-8, vceFloor: 0.2 };
                    if (st.beOn) {
                        stampVsrc(nb, ne, 0.7, 35);
                    } else {
                        stampG(nb, ne, 1e-8);
                    }
                    if (st.gCe > 1e-6) {
                        // Conductive collector-emitter path with 0.2V saturation floor
                        stampVsrc(nc, ne, st.vceFloor, 1 / st.gCe);
                    } else {
                        stampG(nc, ne, 1e-8);
                    }
                } else if (comp.kind === 'multimeter') {
                    const np = netOf(`${comp.id}:pos`);
                    const nn = netOf(`${comp.id}:neg`);
                    const mode = comp.mode || 'V';
                    if (mode === 'V') {
                        stampG(np, nn, 1e-7); // 10 MOhm voltmeter
                    } else if (mode === 'mA') {
                        stampG(np, nn, 10); // 0.1 Ohm ammeter shunt
                    } else if (mode === 'ohm') {
                        // Only inject ohmmeter test voltage if probes aren't powered externally
                        stampVsrc(np, nn, 1.0, 1000);
                    }
                } else if (comp.kind === 'clock') {
                    const nOut = netOf(`${comp.id}:out`);
                    const gndDummy = -1; // GND (not in netToMatIdx -> 0V)
                    stampVsrc(nOut, gndDummy, comp.value ? 5.0 : 0.0, 40);
                } else if (comp.kind === 'dip4') {
                    const bits = Array.isArray(comp.bits) ? comp.bits : [0, 0, 0, 0];
                    for (let bi = 0; bi < 4; bi++) {
                        const nk = netOf(`${comp.id}:B${bi}`);
                        if (bits[bi]) {
                            stampVsrc(nk, -1, 5.0, 40);
                        } else {
                            // Weak pull-down (100k) so inputs read LOW without shorting strong drivers
                            stampG(nk, -1, 1 / 100000);
                        }
                    }
                } else if (comp.kind === 'ic') {
                    const spec = IC_CATALOG[comp.model];
                    if (spec) {
                        const nVcc = netOf(`${comp.id}:${spec.vccPin || 14}`);
                        const nGnd = netOf(`${comp.id}:${spec.gndPin || 7}`);
                        if (doc.autoPower) {
                            stampVsrc(nVcc, -1, 5.0, 0.05);
                            stampG(nGnd, -1, 1000);
                        }
                        // Realistic quiescent IC load (~8 mA at 5V = 625 Ohm)
                        if (wireConnectedPins.has(`${comp.id}:${spec.vccPin || 14}`) && wireConnectedPins.has(`${comp.id}:${spec.gndPin || 7}`)) {
                            stampG(nVcc, nGnd, 1 / 625);
                        }
                    }
                }
            }

            // Standalone logic switches (1-terminal wired mode matching legacy Electronics Lab switches)
            for (const { comp, activeKey } of standaloneSwitches) {
                const nk = netOf(activeKey);
                if (comp.closed) {
                    stampVsrc(nk, -1, 5.0, 40);
                } else {
                    stampG(nk, -1, 1 / 100000);
                }
            }

            // Open series switches with a positive supply on one side provide a weak 100k pull-down on the load side
            // so IC gate inputs cleanly read LOW (0) without acting as a true ground return path!
            for (const sw of openSeriesSwitches) {
                const nIn = netOf(sw.inKey);
                const nOut = netOf(sw.outKey);
                if (sourcePosNets.has(nIn) && !sourcePosNets.has(nOut)) {
                    stampG(nOut, -1, 1 / 100000);
                } else if (sourcePosNets.has(nOut) && !sourcePosNets.has(nIn)) {
                    stampG(nIn, -1, 1 / 100000);
                }
            }

            // Stamp active 74xx IC output drivers
            for (const [pinKey, drv] of icOutputDrivers.entries()) {
                const nOut = netOf(pinKey);
                if (drv.val === 1) {
                    stampVsrc(nOut, -1, drv.vHigh, 60);
                } else if (drv.val === 0) {
                    stampVsrc(nOut, -1, drv.vLow, 15);
                }
            }

            const sol = solveLinearSystem(A, b);
            const nodeV = new Float64Array(nets.length);
            for (let i = 0; i < M; i++) {
                nodeV[matIdxToNet[i]] = sol[i];
            }
            return nodeV;
        }

        // Determine which nets have a real electrical driver (not completely floating at 1e-11 gmin)
        function computeDrivenNets() {
            const driven = new Set(gndRefNets);
            for (const comp of (doc.components || [])) {
                if (comp.kind === 'battery' || comp.kind === 'battery9v' || (comp.kind === 'psu' && comp.enabled !== false)) {
                    driven.add(netOf(`${comp.id}:pos`));
                    driven.add(netOf(`${comp.id}:neg`));
                } else if (comp.kind === 'clock') {
                    driven.add(netOf(`${comp.id}:out`));
                } else if (comp.kind === 'dip4') {
                    for (let i = 0; i < 4; i++) driven.add(netOf(`${comp.id}:B${i}`));
                } else if (comp.kind === 'ic' && doc.autoPower) {
                    const spec = IC_CATALOG[comp.model];
                    driven.add(netOf(`${comp.id}:${spec?.vccPin || 14}`));
                    driven.add(netOf(`${comp.id}:${spec?.gndPin || 7}`));
                }
            }
            for (const { activeKey } of standaloneSwitches) driven.add(netOf(activeKey));
            for (const sw of openSeriesSwitches) {
                const nIn = netOf(sw.inKey);
                const nOut = netOf(sw.outKey);
                if (sourcePosNets.has(nIn) && !sourcePosNets.has(nOut)) driven.add(nOut);
                else if (sourcePosNets.has(nOut) && !sourcePosNets.has(nIn)) driven.add(nIn);
            }
            for (const pinKey of icOutputDrivers.keys()) driven.add(netOf(pinKey));

            // Propagate driven status across resistive/conducting components
            let changed = true;
            while (changed) {
                changed = false;
                const prop = (a, b) => {
                    if (a === undefined || b === undefined) return;
                    if (driven.has(a) && !driven.has(b)) { driven.add(b); changed = true; }
                    if (driven.has(b) && !driven.has(a)) { driven.add(a); changed = true; }
                };
                for (const comp of (doc.components || [])) {
                    if (comp.kind === 'resistor') prop(netOf(`${comp.id}:a`), netOf(`${comp.id}:b`));
                    else if (comp.kind === 'potentiometer') {
                        prop(netOf(`${comp.id}:t1`), netOf(`${comp.id}:wiper`));
                        prop(netOf(`${comp.id}:wiper`), netOf(`${comp.id}:t2`));
                    } else if (comp.kind === 'motor' || comp.kind === 'buzzer') {
                        prop(netOf(`${comp.id}:pos`), netOf(`${comp.id}:neg`));
                    } else if (comp.kind === 'multimeter' && (comp.mode === 'mA' || comp.mode === 'ohm')) {
                        prop(netOf(`${comp.id}:pos`), netOf(`${comp.id}:neg`));
                    } else if (comp.kind === 'lamp' && ledOn.get(comp.id)) {
                        prop(netOf(`${comp.id}:anode`), netOf(`${comp.id}:cathode`));
                    } else if (comp.kind === 'rgb_led') {
                        for (const ch of ['r', 'g', 'b']) {
                            if (rgbOn.get(`${comp.id}:${ch}`)) prop(netOf(`${comp.id}:${ch}`), netOf(`${comp.id}:gnd`));
                        }
                    } else if (comp.kind === 'npn') {
                        const st = npnState.get(comp.id);
                        if (st?.beOn) prop(netOf(`${comp.id}:b`), netOf(`${comp.id}:e`));
                        if (st?.gCe > 1e-6) prop(netOf(`${comp.id}:c`), netOf(`${comp.id}:e`));
                    }
                }
            }
            return driven;
        }

        // Propagate true ground return paths through passive resistances/motors/closed paths for accurate open-cathode checks
        function computeGroundReturnNets() {
            const ret = new Set(trueGroundNets);
            let changed = true;
            while (changed) {
                changed = false;
                const prop = (a, b) => {
                    if (a === undefined || b === undefined) return;
                    if (ret.has(a) && !ret.has(b)) { ret.add(b); changed = true; }
                    if (ret.has(b) && !ret.has(a)) { ret.add(a); changed = true; }
                };
                for (const comp of (doc.components || [])) {
                    if (comp.kind === 'resistor') prop(netOf(`${comp.id}:a`), netOf(`${comp.id}:b`));
                    else if (comp.kind === 'potentiometer') {
                        prop(netOf(`${comp.id}:t1`), netOf(`${comp.id}:wiper`));
                        prop(netOf(`${comp.id}:wiper`), netOf(`${comp.id}:t2`));
                    } else if (comp.kind === 'motor' || comp.kind === 'buzzer') {
                        prop(netOf(`${comp.id}:pos`), netOf(`${comp.id}:neg`));
                    } else if (comp.kind === 'multimeter' && comp.mode === 'mA') {
                        prop(netOf(`${comp.id}:pos`), netOf(`${comp.id}:neg`));
                    } else if (comp.kind === 'npn') {
                        const st = npnState.get(comp.id);
                        if (st?.gCe > 1e-6) prop(netOf(`${comp.id}:c`), netOf(`${comp.id}:e`));
                    }
                }
            }
            return ret;
        }

        // Iterative Digital-Analog + PWL Relaxation Loop (up to 16 passes)
        let nodeV = new Float64Array(nets.length);
        let drivenNets = new Set();

        for (let pass = 0; pass < 16; pass++) {
            nodeV = runAnalogPass();
            drivenNets = computeDrivenNets();
            const curGndRet = computeGroundReturnNets();
            let stateChanged = false;

            // 1. Update LED PWL diode states
            for (const comp of (doc.components || [])) {
                if (comp.kind === 'lamp') {
                    const na = netOf(`${comp.id}:anode`);
                    const nc = netOf(`${comp.id}:cathode`);
                    const bothDriven = drivenNets.has(na) && drivenNets.has(nc) && curGndRet.has(nc);
                    const vf = LED_VF[comp.color || 'emerald'] || 2.2;
                    const vd = nodeV[na] - nodeV[nc];
                    const wasOn = Boolean(ledOn.get(comp.id));
                    const nextOn = bothDriven && (wasOn ? vd > vf - 0.05 : vd >= vf);
                    if (nextOn !== wasOn) {
                        ledOn.set(comp.id, nextOn);
                        stateChanged = true;
                    }
                } else if (comp.kind === 'rgb_led') {
                    const ng = netOf(`${comp.id}:gnd`);
                    for (const ch of ['r', 'g', 'b']) {
                        const na = netOf(`${comp.id}:${ch}`);
                        const key = `${comp.id}:${ch}`;
                        const bothDriven = drivenNets.has(na) && drivenNets.has(ng) && curGndRet.has(ng);
                        const vf = RGB_VF[ch];
                        const vd = nodeV[na] - nodeV[ng];
                        const wasOn = Boolean(rgbOn.get(key));
                        const nextOn = bothDriven && (wasOn ? vd > vf - 0.05 : vd >= vf);
                        if (nextOn !== wasOn) {
                            rgbOn.set(key, nextOn);
                            stateChanged = true;
                        }
                    }
                } else if (comp.kind === 'npn') {
                    const ne = netOf(`${comp.id}:e`);
                    const nb = netOf(`${comp.id}:b`);
                    const nc = netOf(`${comp.id}:c`);
                    const prev = npnState.get(comp.id) || { beOn: false, gCe: 1e-8, vceFloor: 0.2 };
                    const vbe = nodeV[nb] - nodeV[ne];
                    const vce = nodeV[nc] - nodeV[ne];
                    const beDriven = drivenNets.has(nb) && drivenNets.has(ne);
                    const nextBeOn = beDriven && (prev.beOn ? vbe > 0.65 : vbe >= 0.7);
                    const ib = nextBeOn ? Math.max(0, (vbe - 0.7) / 35) : 0;

                    let nextGCe = 1e-8;
                    if (nextBeOn && ib > 1e-6 && vce > 0.15) {
                        const icDesired = Math.min(0.8, 100 * ib); // beta = 100, cap 800 mA
                        const vOver = Math.max(0.05, vce - 0.2);
                        // Compute equivalent conductance capped at saturation (R_sat = 2 Ohm -> G = 0.5 S)
                        const targetG = Math.min(0.5, icDesired / vOver);
                        // Smooth damping for fast convergence
                        nextGCe = prev.gCe > 1e-5 ? (0.5 * prev.gCe + 0.5 * targetG) : targetG;
                    }
                    if (nextBeOn !== prev.beOn || Math.abs(nextGCe - prev.gCe) > Math.max(1e-5, prev.gCe * 0.08)) {
                        npnState.set(comp.id, { beOn: nextBeOn, gCe: nextGCe, vceFloor: 0.2 });
                        stateChanged = true;
                    }
                }
            }

            // 2. Evaluate all 17x 74xx DIP ICs (Safe operating window: 4.0V - 5.5V, Warning: 5.5V - 6.5V, Corrupted: >6.5V or Reverse)
            const gndReturnNets = computeGroundReturnNets();
            for (const comp of (doc.components || [])) {
                if (comp.kind !== 'ic') continue;
                const spec = IC_CATALOG[comp.model];
                if (!spec) continue;
                const vccKey = `${comp.id}:${spec.vccPin || 14}`;
                const gndKey = `${comp.id}:${spec.gndPin || 7}`;
                const nVcc = netOf(vccKey);
                const nGnd = netOf(gndKey);
                const vccConn = doc.autoPower || (wireConnectedPins.has(vccKey) && drivenNets.has(nVcc));
                const gndConn = doc.autoPower || (wireConnectedPins.has(gndKey) && drivenNets.has(nGnd));
                const vVcc = doc.autoPower ? 5.0 : (vccConn ? nodeV[nVcc] : null);
                const vGnd = doc.autoPower ? 0.0 : (gndConn ? nodeV[nGnd] : null);
                const hasGndReturn = doc.autoPower || gndReturnNets.has(nGnd);

                const supplyV = (vVcc !== null && vGnd !== null) ? (vVcc - vGnd) : null;
                const reversePower = Boolean(supplyV !== null && supplyV < -0.3);
                const overVoltageCorrupted = Boolean(supplyV !== null && supplyV > 6.5);
                const overVoltageWarn = Boolean(supplyV !== null && supplyV > 5.5 && supplyV <= 6.5);
                const underVoltage = Boolean(supplyV !== null && supplyV >= 0.3 && supplyV < 4.0);
                const corrupted = reversePower || overVoltageCorrupted;
                const powered = Boolean(supplyV !== null && hasGndReturn && supplyV >= 4.0 && !corrupted);

                const getLogicPinByKey = pk => {
                    const np = netOf(pk);
                    if (!wireConnectedPins.has(pk) || !drivenNets.has(np)) return null;
                    const vRel = nodeV[np] - (vGnd || 0);
                    if (vRel >= 2.0) return 1;
                    if (vRel <= 0.8) return 0;
                    return null;
                };
                const getLogicPin = pNum => getLogicPinByKey(`${comp.id}:${pNum}`);

                const gatesMap = new Map();
                let msiSummary = null;

                if (powered) {
                    if (spec.msi && typeof helpers.evalMsiIC === 'function') {
                        const msiRes = helpers.evalMsiIC(comp, spec, getLogicPinByKey, 'settle');
                        msiSummary = msiRes.summary;
                        const entries = msiRes.outPins instanceof Map
                            ? msiRes.outPins.entries()
                            : Object.entries(msiRes.outputs || {});
                        for (const [pNum, val] of entries) {
                            const outKey = `${comp.id}:${pNum}`;
                            if (val === 0 || val === 1) {
                                const prev = icOutputDrivers.get(outKey);
                                if (!prev || prev.val !== val) {
                                    icOutputDrivers.set(outKey, { val, vHigh: vVcc, vLow: (vGnd || 0) + 0.1 });
                                    stateChanged = true;
                                }
                            } else if (icOutputDrivers.has(outKey)) {
                                icOutputDrivers.delete(outKey);
                                stateChanged = true;
                            }
                        }
                    } else {
                        for (const g of (spec.gates || [])) {
                            const inVals = g.inputs.map(pNum => getLogicPin(pNum));
                            const outVal = evalSingleGate(g.type, inVals);
                            gatesMap.set(g.id, { outVal, inVals });
                            const outKey = `${comp.id}:${g.output}`;
                            if (outVal === 0 || outVal === 1) {
                                const prev = icOutputDrivers.get(outKey);
                                if (!prev || prev.val !== outVal) {
                                    icOutputDrivers.set(outKey, { val: outVal, vHigh: vVcc, vLow: (vGnd || 0) + 0.1 });
                                    stateChanged = true;
                                }
                            } else if (icOutputDrivers.has(outKey)) {
                                icOutputDrivers.delete(outKey);
                                stateChanged = true;
                            }
                        }
                    }
                } else {
                    // Remove any stale output drivers if IC lost power or became corrupted
                    const outPins = spec.msi ? (spec.outputs || []) : (spec.gates || []).map(g => g.output);
                    for (const pNum of outPins) {
                        const outKey = `${comp.id}:${pNum}`;
                        if (icOutputDrivers.has(outKey)) {
                            icOutputDrivers.delete(outKey);
                            stateChanged = true;
                        }
                    }
                }

                icStates.set(comp.id, {
                    powered,
                    reversePower,
                    overVoltageWarn,
                    overVoltageCorrupted,
                    underVoltage,
                    corrupted,
                    supplyV,
                    vccVal: vVcc !== null ? (vVcc >= 2.0 ? 1 : vVcc <= 0.8 ? 0 : null) : null,
                    gndVal: (vGnd !== null && hasGndReturn) ? (vGnd <= 0.8 ? 0 : vGnd >= 2.0 ? 1 : null) : null,
                    gates: gatesMap,
                    msiSummary
                });
            }

            if (!stateChanged) break;
        }

        // Sequential MSI edge-commit phase (7474 D-FF, 7475 Latch, 74279 SR-Latch, 7493 Counter)
        if (typeof helpers.evalMsiIC === 'function') {
            let msiCommittedChanged = false;
            for (const comp of (doc.components || [])) {
                if (comp.kind !== 'ic') continue;
                const spec = IC_CATALOG[comp.model];
                const st = icStates.get(comp.id);
                if (!spec || !spec.msi || !st || !st.powered) continue;
                const vccKey = `${comp.id}:${spec.vccPin || 14}`;
                const gndKey = `${comp.id}:${spec.gndPin || 7}`;
                const vVcc = doc.autoPower ? 5.0 : nodeV[netOf(vccKey)];
                const vGnd = doc.autoPower ? 0.0 : nodeV[netOf(gndKey)];
                const getLogicPinByKey = pk => {
                    const np = netOf(pk);
                    if (!wireConnectedPins.has(pk) || !drivenNets.has(np)) return null;
                    const vRel = nodeV[np] - (vGnd || 0);
                    if (vRel >= 2.0) return 1;
                    if (vRel <= 0.8) return 0;
                    return null;
                };
                const msiRes = helpers.evalMsiIC(comp, spec, getLogicPinByKey, 'commit');
                st.msiSummary = msiRes.summary;
                const entries = msiRes.outPins instanceof Map
                    ? msiRes.outPins.entries()
                    : Object.entries(msiRes.outputs || {});
                for (const [pNum, val] of entries) {
                    const outKey = `${comp.id}:${pNum}`;
                    if (val === 0 || val === 1) {
                        const prev = icOutputDrivers.get(outKey);
                        if (!prev || prev.val !== val) {
                            icOutputDrivers.set(outKey, { val, vHigh: vVcc, vLow: (vGnd || 0) + 0.1 });
                            msiCommittedChanged = true;
                        }
                    }
                }
            }
            if (msiCommittedChanged) {
                for (let extraPass = 0; extraPass < 6; extraPass++) {
                    nodeV = runAnalogPass();
                    drivenNets = computeDrivenNets();
                    const curGndRet = computeGroundReturnNets();
                    let ch = false;
                    for (const comp of (doc.components || [])) {
                        if (comp.kind === 'lamp') {
                            const na = netOf(`${comp.id}:anode`);
                            const nc = netOf(`${comp.id}:cathode`);
                            const bothDriven = drivenNets.has(na) && drivenNets.has(nc) && curGndRet.has(nc);
                            const vf = LED_VF[comp.color || 'emerald'] || 2.2;
                            const vd = nodeV[na] - nodeV[nc];
                            const wasOn = Boolean(ledOn.get(comp.id));
                            const nextOn = bothDriven && (wasOn ? vd > vf - 0.05 : vd >= vf);
                            if (nextOn !== wasOn) { ledOn.set(comp.id, nextOn); ch = true; }
                        }
                    }
                    if (!ch) break;
                }
            }
        }

        // Final solve with settled PWL + IC states
        nodeV = runAnalogPass();
        drivenNets = computeDrivenNets();
        const gndReturnNets = computeGroundReturnNets();

        // ---------------------------------------------------------------------
        // 5. EXTRACT VOLTAGES, CURRENTS, CONFLICTS, SHORTS & OVERLOAD FAULTS
        // ---------------------------------------------------------------------
        const pinValues = new Map();
        const pinVoltages = new Map();
        const pinConflicts = new Map();
        const nodeVoltages = new Map();
        const warnings = [];
        const faults = []; // { compId, kind, severity: 'error'|'warn', title, detail }

        // Detect net contention (two opposing strong drivers on the same net, e.g., two IC outputs or VCC+GND)
        const netStrongVals = new Map(); // netId -> Set(0 | 1)
        const recordDriver = (nid, bit) => {
            if (nid === undefined) return;
            if (!netStrongVals.has(nid)) netStrongVals.set(nid, new Set());
            netStrongVals.get(nid).add(bit);
        };
        for (const comp of (doc.components || [])) {
            if (comp.kind === 'battery' || comp.kind === 'battery9v' || (comp.kind === 'psu' && comp.enabled !== false && (comp.voltage ?? 5) >= 1.5)) {
                recordDriver(netOf(`${comp.id}:pos`), 1);
                recordDriver(netOf(`${comp.id}:neg`), 0);
            } else if (comp.kind === 'gnd') {
                recordDriver(netOf(`${comp.id}:pin`), 0);
            } else if (comp.kind === 'clock') {
                recordDriver(netOf(`${comp.id}:out`), comp.value ? 1 : 0);
            } else if (comp.kind === 'dip4') {
                const bits = Array.isArray(comp.bits) ? comp.bits : [0, 0, 0, 0];
                for (let b = 0; b < 4; b++) if (bits[b]) recordDriver(netOf(`${comp.id}:B${b}`), 1);
            }
        }
        for (const { comp, activeKey } of standaloneSwitches) {
            if (comp.closed) recordDriver(netOf(activeKey), 1);
        }
        for (const [pk, drv] of icOutputDrivers.entries()) {
            recordDriver(netOf(pk), drv.val);
        }

        let anyShort = false;
        for (let nid = 0; nid < nets.length; nid++) {
            const set = netStrongVals.get(nid);
            const hasConflict = Boolean(set && set.has(0) && set.has(1));
            nets[nid].conflict = hasConflict;
            if (hasConflict) anyShort = true;
            nets[nid].hasTrueGround = gndReturnNets.has(nid);
            const isDriven = drivenNets.has(nid);
            const v = isDriven ? nodeV[nid] : null;
            nets[nid].voltage = v;
            nodeVoltages.set(nid, v);
            nets[nid].value = v === null ? null : (v >= 2.0 ? 1 : v <= 0.8 ? 0 : null);
        }

        for (const [k, nid] of pinToNet.entries()) {
            const net = nets[nid];
            pinVoltages.set(k, net.voltage);
            pinConflicts.set(k, net.conflict);
            if (!wireConnectedPins.has(k) && !pluggedPinMap.has(k) && !gndRefNets.has(nid)) {
                // Keep standalone driven component pins readable (like battery:pos, clock:out)
                const p = pins.get(k);
                if (p && (p.role === 'vcc' || p.role === 'gnd' || p.role === 'out')) {
                    pinValues.set(k, net.value);
                } else {
                    pinValues.set(k, null);
                }
            } else {
                pinValues.set(k, net.value);
            }
        }

        // Compute per-component telemetry, states & overload/corruption diagnostics
        let totalCurrentMa = 0;
        let totalPowerMw = 0;
        let maxDelayNs = 0;

        for (const comp of (doc.components || [])) {
            if (comp.kind === 'battery' || comp.kind === 'battery9v' || comp.kind === 'psu') {
                const np = netOf(`${comp.id}:pos`);
                const nn = netOf(`${comp.id}:neg`);
                const cells = comp.kind === 'battery'
                    ? Math.max(1, Math.min(4, Number(comp.cells) || (comp.voltage ? Math.round(comp.voltage / 1.5) : 3)))
                    : 0;
                const nominalV = comp.kind === 'battery9v'
                    ? 9.0
                    : comp.kind === 'psu'
                    ? (comp.enabled === false ? 0 : Math.max(0, Math.min(12, Number(comp.voltage ?? 5.0))))
                    : (comp.voltage && !comp.cells ? Number(comp.voltage) : cells * 1.5);
                const rInt = comp.kind === 'battery9v' ? 1.5 : comp.kind === 'psu' ? 0.05 : 0.2 * cells;
                const vTerm = nodeV[np] - nodeV[nn];
                const iMa = Math.max(0, ((nominalV - vTerm) / rInt) * 1000);
                const shorted = iMa > 2500 || Boolean(nets[np]?.conflict && nets[nn]?.conflict);
                if (shorted) {
                    anyShort = true;
                    faults.push({
                        compId: comp.id,
                        kind: 'SHORT_CIRCUIT',
                        severity: 'error',
                        title: `${comp.label || 'Power Source'} Short Circuit!`,
                        detail: `Shorted directly across + and − (${formatCurrentMa(iMa)}). Remove direct + to − short!`
                    });
                }
                sourceStates.set(comp.id, { nominalV, vTerm, currentMa: iMa, shorted, cells });
            } else if (comp.kind === 'lamp') {
                const aKey = `${comp.id}:anode`;
                const cKey = `${comp.id}:cathode`;
                const na = netOf(aKey);
                const nc = netOf(cKey);
                const anodeWired = wireConnectedPins.has(aKey);
                const cathodeWired = wireConnectedPins.has(cKey);
                const va = anodeWired && drivenNets.has(na) ? nodeV[na] : null;
                const vc = cathodeWired && drivenNets.has(nc) ? nodeV[nc] : null;
                const hasGndReturn = gndReturnNets.has(nc);
                const vf = LED_VF[comp.color || 'emerald'] || 2.2;
                const vd = (va !== null && vc !== null) ? (va - vc) : null;
                const iMa = (ledOn.get(comp.id) && vd !== null) ? Math.max(0, ((vd - vf) / 15) * 1000) : 0;

                const lit = Boolean(anodeWired && cathodeWired && hasGndReturn && vd !== null && vd >= vf - 0.15 && iMa >= 0.15);
                const brightness = lit ? Math.min(1, Math.max(0.12, iMa / 20)) : 0;
                const reverseBreakdown = Boolean(vd !== null && vd < -5.5);
                const overloaded = Boolean(iMa > 35 || reverseBreakdown);
                const highCurrentWarn = Boolean(!overloaded && iMa > 25);

                let reason = 'off';
                if (lit) reason = 'lit';
                else if (anodeWired && cathodeWired && va !== null && vc !== null && va >= 2.0 && vc >= 2.0) reason = 'no_diff_high';
                else if (anodeWired && cathodeWired && vd !== null && vd < -0.3) reason = 'reverse_bias';
                else if (anodeWired && va !== null && va >= 2.0 && (!cathodeWired || !hasGndReturn)) reason = 'open_cathode';
                else if (cathodeWired && hasGndReturn && (!anodeWired || va === null)) reason = 'open_anode';
                else if (va !== null && va <= 0.8) reason = 'low_input';
                else if (vd !== null && vd > 0 && vd < vf) reason = 'under_vf';

                let faultText = null;
                if (iMa > 35) {
                    faultText = `LED OVERCURRENT: ${iMa.toFixed(0)} mA > 35 mA max! Add a series resistor (e.g. 220–470 Ω).`;
                    faults.push({ compId: comp.id, label: comp.label || 'LED', kind: 'LED_OVERCURRENT', severity: 'error', title: 'LED Burn-Out / Overcurrent!', detail: faultText, message: faultText });
                } else if (reverseBreakdown) {
                    faultText = `LED REVERSE BREAKDOWN: ${Math.abs(vd).toFixed(1)} V reverse > 5 V max! Flip LED polarity.`;
                    faults.push({ compId: comp.id, label: comp.label || 'LED', kind: 'LED_REVERSE', severity: 'error', title: 'LED Reverse Breakdown!', detail: faultText, message: faultText });
                } else if (highCurrentWarn) {
                    faultText = `High LED current: ${iMa.toFixed(1)} mA (> 20 mA recommended).`;
                    warnings.push({ compId: comp.id, label: comp.label || 'LED', kind: 'LED_HIGH_CURRENT', severity: 'warn', title: 'High LED Current', detail: faultText, message: faultText });
                }

                if (iMa > 0) {
                    totalCurrentMa += iMa;
                    totalPowerMw += iMa * Math.max(0, vd || 0);
                }

                lampStates.set(comp.id, {
                    lit,
                    brightness,
                    currentMa: iMa,
                    voltage: vd,
                    voltageDrop: vd,
                    overloaded,
                    corrupted: overloaded,
                    highCurrentWarn,
                    faultText,
                    anodeVal: va !== null ? (va >= 2.0 ? 1 : va <= 0.8 ? 0 : null) : null,
                    cathodeVal: (vc !== null && hasGndReturn) ? (vc <= 0.8 ? 0 : vc >= 2.0 ? 1 : null) : null,
                    anodeWired,
                    cathodeWired,
                    reason
                });
            } else if (comp.kind === 'rgb_led') {
                const gKey = `${comp.id}:gnd`;
                const ng = netOf(gKey);
                const gWired = wireConnectedPins.has(gKey) && drivenNets.has(ng) && gndReturnNets.has(ng);
                const chState = {};
                let anyOver = false;
                let maxMa = 0;
                for (const ch of ['r', 'g', 'b']) {
                    const ak = `${comp.id}:${ch}`;
                    const na = netOf(ak);
                    const wired = wireConnectedPins.has(ak) && drivenNets.has(na);
                    const vd = (wired && gWired) ? (nodeV[na] - nodeV[ng]) : 0;
                    const iMa = rgbOn.get(`${comp.id}:${ch}`) ? Math.max(0, ((vd - RGB_VF[ch]) / 15) * 1000) : 0;
                    const bright = Math.min(1, iMa / 20);
                    const over = iMa > 35;
                    if (over) anyOver = true;
                    maxMa = Math.max(maxMa, iMa);
                    totalCurrentMa += iMa;
                    totalPowerMw += iMa * Math.max(0, vd);
                    chState[ch] = { currentMa: iMa, brightness: bright, overloaded: over, voltage: vd };
                }
                let rgbFault = null;
                if (anyOver) {
                    rgbFault = `Channel current ${maxMa.toFixed(0)} mA > 35 mA max! Add series resistors on R/G/B legs.`;
                    faults.push({
                        compId: comp.id,
                        label: comp.label || 'RGB LED',
                        kind: 'RGB_OVERCURRENT',
                        severity: 'error',
                        title: 'RGB LED Channel Overcurrent!',
                        detail: rgbFault,
                        message: rgbFault
                    });
                }
                const rgbLit = Boolean(chState.r.currentMa > 0.1 || chState.g.currentMa > 0.1 || chState.b.currentMa > 0.1);
                rgbStates.set(comp.id, { ...chState, channels: chState, lit: rgbLit, overloaded: anyOver, corrupted: anyOver, faultText: rgbFault });
            } else if (comp.kind === 'resistor') {
                const na = netOf(`${comp.id}:a`);
                const nb = netOf(`${comp.id}:b`);
                const ohms = Math.max(0.5, Number(comp.ohms) || 220);
                const v = (drivenNets.has(na) && drivenNets.has(nb)) ? (nodeV[na] - nodeV[nb]) : 0;
                const iMa = Math.abs((v / ohms) * 1000);
                const powerW = Math.abs(v * (v / ohms));
                const corrupted = powerW > 0.35;
                const warn = !corrupted && powerW > 0.20;
                let resFault = null;
                if (corrupted) {
                    resFault = `Dissipating ${(powerW * 1000).toFixed(0)} mW (${powerW.toFixed(2)} W) > 0.25 W rated limit! Increase resistance or lower voltage.`;
                    faults.push({
                        compId: comp.id,
                        label: comp.label || formatOhms(ohms),
                        kind: 'RESISTOR_OVERHEAT',
                        severity: 'error',
                        title: `Resistor Overheating (${formatOhms(ohms)})!`,
                        detail: resFault,
                        message: resFault
                    });
                } else if (warn) {
                    resFault = `Dissipating ${(powerW * 1000).toFixed(0)} mW (> 200 mW).`;
                    warnings.push({
                        compId: comp.id,
                        label: comp.label || formatOhms(ohms),
                        kind: 'RESISTOR_WARM',
                        severity: 'warn',
                        title: 'Resistor Near 0.25 W Limit',
                        detail: resFault,
                        message: resFault
                    });
                }
                resistorStates.set(comp.id, { ohms, voltage: v, voltageDrop: Math.abs(v), currentMa: iMa, powerW, powerMw: powerW * 1000, corrupted, overloaded: corrupted, warn, faultText: resFault });
            } else if (comp.kind === 'potentiometer') {
                const n1 = netOf(`${comp.id}:t1`);
                const nw = netOf(`${comp.id}:wiper`);
                const n2 = netOf(`${comp.id}:t2`);
                const total = Math.max(10, Number(comp.ohms) || 10000);
                const pos = Math.max(0, Math.min(1, comp.wiper ?? comp.knob ?? 0.5));
                const r1 = Math.max(1, total * pos);
                const r2 = Math.max(1, total * (1 - pos));
                const v1 = drivenNets.has(n1) ? nodeV[n1] : null;
                const vw = drivenNets.has(nw) ? nodeV[nw] : null;
                const v2 = drivenNets.has(n2) ? nodeV[n2] : null;
                const i1Ma = (v1 !== null && vw !== null) ? ((v1 - vw) / r1) * 1000 : 0;
                const i2Ma = (vw !== null && v2 !== null) ? ((vw - v2) / r2) * 1000 : 0;
                const pW = ((i1Ma / 1000) ** 2) * r1 + ((i2Ma / 1000) ** 2) * r2;
                const maxPotW = Number(comp.maxWatts) || 0.5;
                const corrupted = pW > maxPotW;
                let potFault = null;
                if (corrupted) {
                    potFault = `Dissipating ${pW.toFixed(2)} W > ${maxPotW.toFixed(2)} W max! Avoid driving high-current loads directly through wiper at extreme end.`;
                    faults.push({
                        compId: comp.id,
                        label: comp.label || 'POT',
                        kind: 'POT_OVERHEAT',
                        severity: 'error',
                        title: 'Potentiometer Overheating!',
                        detail: potFault,
                        message: potFault
                    });
                }
                potStates.set(comp.id, { total, knob: pos, wiper: pos, r1, r2, wiperV: vw, vWiper: vw, i1Ma, i2Ma, powerW: pW, corrupted, overloaded: corrupted, faultText: potFault });
            } else if (comp.kind === 'motor') {
                const np = netOf(`${comp.id}:pos`);
                const nn = netOf(`${comp.id}:neg`);
                const bothConn = wireConnectedPins.has(`${comp.id}:pos`) && wireConnectedPins.has(`${comp.id}:neg`) && drivenNets.has(np) && drivenNets.has(nn);
                const vm = bothConn ? (nodeV[np] - nodeV[nn]) : 0;
                const iMa = (vm / 12) * 1000;
                const absV = Math.abs(vm);
                const signedRpm = absV > 0.5 ? Math.round(Math.sign(vm) * 1100 * (absV - 0.5)) : 0;
                const absRpm = Math.abs(signedRpm);
                const direction = signedRpm > 0 ? 'CW' : signedRpm < 0 ? 'CCW' : 'IDLE';
                const corrupted = absV > 12.2;
                const warn = !corrupted && absV > 9.5;
                let motFault = null;
                if (corrupted) {
                    motFault = `Applied ${absV.toFixed(1)} V exceeds 12.0 V max rating!`;
                    faults.push({
                        compId: comp.id,
                        label: comp.label || 'DC Motor',
                        kind: 'MOTOR_OVERVOLTAGE',
                        severity: 'error',
                        title: 'DC Motor Overvoltage Fault!',
                        detail: motFault,
                        message: motFault
                    });
                } else if (warn) {
                    motFault = `Running at ${absV.toFixed(1)} V (nominal 3–9 V).`;
                    warnings.push({
                        compId: comp.id,
                        label: comp.label || 'DC Motor',
                        kind: 'MOTOR_HIGH_V',
                        severity: 'warn',
                        title: 'DC Motor High Voltage',
                        detail: motFault,
                        message: motFault
                    });
                }
                if (Math.abs(iMa) > 0) {
                    totalCurrentMa += Math.abs(iMa);
                    totalPowerMw += Math.abs(iMa * vm);
                }
                motorStates.set(comp.id, {
                    voltage: vm,
                    currentMa: Math.abs(iMa),
                    rpm: corrupted ? 0 : absRpm,
                    signedRpm: corrupted ? 0 : signedRpm,
                    absRpm: corrupted ? 0 : absRpm,
                    spinning: !corrupted && absRpm > 0,
                    powerMw: Math.abs(iMa * vm),
                    direction: corrupted ? 'FAULT' : direction,
                    corrupted,
                    overloaded: corrupted,
                    warn,
                    faultText: motFault
                });
            } else if (comp.kind === 'buzzer') {
                const np = netOf(`${comp.id}:pos`);
                const nn = netOf(`${comp.id}:neg`);
                const bothConn = wireConnectedPins.has(`${comp.id}:pos`) && wireConnectedPins.has(`${comp.id}:neg`) && drivenNets.has(np) && drivenNets.has(nn);
                const vb = bothConn ? (nodeV[np] - nodeV[nn]) : 0;
                const iMa = vb > 0 ? (vb / 1000) * 1000 : 0;
                const corrupted = vb > 12.5;
                const active = !corrupted && vb >= 2.0;
                const freqHz = active ? (comp.freqHz || Math.round(1700 + Math.min(10, vb) * 140)) : 0;
                let buzFault = null;
                if (corrupted) {
                    buzFault = `Applied ${vb.toFixed(1)} V > 12 V max!`;
                    faults.push({
                        compId: comp.id,
                        label: comp.label || 'Buzzer',
                        kind: 'BUZZER_OVERVOLTAGE',
                        severity: 'error',
                        title: 'Piezo Buzzer Overvoltage!',
                        detail: buzFault,
                        message: buzFault
                    });
                }
                buzzerStates.set(comp.id, { voltage: vb, currentMa: iMa, active, sounding: active, intensity: Math.min(1, vb / 9), freqHz, corrupted, overloaded: corrupted, faultText: buzFault });
            } else if (comp.kind === 'npn') {
                const ne = netOf(`${comp.id}:e`);
                const nb = netOf(`${comp.id}:b`);
                const nc = netOf(`${comp.id}:c`);
                const st = npnState.get(comp.id) || { beOn: false, gCe: 1e-8, vceFloor: 0.2 };
                const vbe = (drivenNets.has(nb) && drivenNets.has(ne)) ? (nodeV[nb] - nodeV[ne]) : 0;
                const vce = (drivenNets.has(nc) && drivenNets.has(ne)) ? (nodeV[nc] - nodeV[ne]) : 0;
                const ibMa = st.beOn ? Math.max(0, ((vbe - 0.7) / 35) * 1000) : 0;
                const icMa = st.gCe > 1e-6 ? Math.max(0, ((vce - 0.2) * st.gCe) * 1000) : 0;
                const region = !st.beOn || ibMa < 0.01 ? 'CUTOFF' : (vce < 0.5 ? 'SATURATED' : 'ACTIVE');
                const corrupted = ibMa > 50 || icMa > 600;
                let npnFault = null;
                if (ibMa > 50) {
                    npnFault = `Base current ${ibMa.toFixed(0)} mA > 50 mA max! Add a 1 kΩ – 10 kΩ base resistor.`;
                    faults.push({
                        compId: comp.id,
                        label: comp.label || '2N2222',
                        kind: 'NPN_BASE_OVERCURRENT',
                        severity: 'error',
                        title: '2N2222 Base Overcurrent!',
                        detail: npnFault,
                        message: npnFault
                    });
                } else if (icMa > 600) {
                    npnFault = `Collector current ${icMa.toFixed(0)} mA > 600 mA max!`;
                    faults.push({
                        compId: comp.id,
                        label: comp.label || '2N2222',
                        kind: 'NPN_COLLECTOR_OVERCURRENT',
                        severity: 'error',
                        title: '2N2222 Collector Overcurrent!',
                        detail: npnFault,
                        message: npnFault
                    });
                }
                npnStates.set(comp.id, { vbe, vce, ibMa, icMa, region, mode: corrupted ? 'OVERLOAD' : region, conducting: region !== 'CUTOFF', corrupted, overloaded: corrupted, faultText: npnFault });
            } else if (comp.kind === 'multimeter') {
                const np = netOf(`${comp.id}:pos`);
                const nn = netOf(`${comp.id}:neg`);
                const bothWired = wireConnectedPins.has(`${comp.id}:pos`) && wireConnectedPins.has(`${comp.id}:neg`);
                const mode = comp.mode || 'V';
                let display = '0.00 V';
                let numeric = 0;
                if (mode === 'V') {
                    const v = (bothWired && drivenNets.has(np) && drivenNets.has(nn)) ? (nodeV[np] - nodeV[nn]) : 0;
                    numeric = v;
                    display = `${v >= 0 ? '' : '−'}${Math.abs(v).toFixed(2)} V`;
                } else if (mode === 'mA') {
                    const v = (bothWired && drivenNets.has(np) && drivenNets.has(nn)) ? (nodeV[np] - nodeV[nn]) : 0;
                    const ma = v * 10 * 1000; // 0.1 Ohm shunt -> I = V / 0.1 = 10*V A
                    numeric = ma;
                    display = Math.abs(ma) >= 1000 ? `${(ma / 1000).toFixed(2)} A` : `${ma.toFixed(1)} mA`;
                } else if (mode === 'ohm') {
                    const v = bothWired ? (nodeV[np] - nodeV[nn]) : 1.0;
                    if (!bothWired || v >= 0.998) {
                        display = 'OL Ω';
                        numeric = Infinity;
                    } else if (v > 1.02 || v < -0.02) {
                        display = 'LIVE!';
                        numeric = NaN;
                    } else {
                        const rx = Math.max(0, (1000 * v) / Math.max(1e-6, 1.0 - v));
                        numeric = rx;
                        display = formatOhms(rx);
                    }
                }
                meterStates.set(comp.id, { mode, display, numeric, connected: bothWired });
            } else if (comp.kind === 'ic') {
                const st = icStates.get(comp.id);
                const spec = IC_CATALOG[comp.model];
                if (st && spec) {
                    if (st.reversePower) {
                        const msg = `IC ${comp.model} Reverse Polarity (${st.supplyV.toFixed(1)} V)! Swap VCC & GND.`;
                        st.faultText = msg;
                        faults.push({
                            compId: comp.id,
                            label: comp.model,
                            kind: 'IC_REVERSE',
                            severity: 'error',
                            title: `IC ${comp.model} Reverse Polarity!`,
                            detail: msg,
                            message: msg
                        });
                    } else if (st.overVoltageCorrupted) {
                        const msg = `IC ${comp.model} Corrupted: ${st.supplyV.toFixed(1)} V > 5.5 V safe limit (max 6.5 V)! Use 3×AA (4.5V) or 5V PSU.`;
                        st.faultText = msg;
                        faults.push({
                            compId: comp.id,
                            label: comp.model,
                            kind: 'IC_OVERVOLTAGE',
                            severity: 'error',
                            title: `IC ${comp.model} Corrupted (Overvoltage)!`,
                            detail: msg,
                            message: msg
                        });
                    } else if (st.overVoltageWarn) {
                        const msg = `IC ${comp.model} Overvoltage Warning: ${st.supplyV.toFixed(1)} V > 5.5 V recommended max (4.0–5.5 V safe).`;
                        st.faultText = msg;
                        warnings.push({
                            compId: comp.id,
                            label: comp.model,
                            kind: 'IC_HIGH_VOLTAGE',
                            severity: 'warn',
                            title: `IC ${comp.model} Overvoltage Warning`,
                            detail: msg,
                            message: msg
                        });
                    } else if (st.powered) {
                        totalCurrentMa += spec.iccMa || 8;
                        totalPowerMw += (spec.iccMa || 8) * (st.supplyV || 5);
                        maxDelayNs += spec.tpdNs || 10;
                    }
                }
            } else if (comp.kind === 'seg7') {
                const a = pinValues.get(`${comp.id}:A`);
                const b = pinValues.get(`${comp.id}:B`);
                const c = pinValues.get(`${comp.id}:C`);
                const d = pinValues.get(`${comp.id}:D`);
                const anyConn = [a, b, c, d].some(v => v === 0 || v === 1);
                const val = anyConn
                    ? ((d === 1 ? 8 : 0) | (c === 1 ? 4 : 0) | (b === 1 ? 2 : 0) | (a === 1 ? 1 : 0))
                    : null;
                segStates.set(comp.id, { value: val, bits: [a, b, c, d] });
            } else if (comp.kind === 'probe') {
                const tipKey = `${comp.id}:tip`;
                const val = pinValues.get(tipKey);
                const v = pinVoltages.get(tipKey);
                const conflict = Boolean(pinConflicts.get(tipKey));
                probeStates.set(comp.id, { value: val, val, voltage: v, conflict });
            }
        }

        // ---------------------------------------------------------------------
        // 6. EXACT CLOSED-LOOP WIRE CURRENT COMPUTATION (KCL SPANNING-TREE FLOW)
        // ---------------------------------------------------------------------
        // Positive pinCurrentMa = current injected INTO the wire net from the component.
        // Negative pinCurrentMa = current drawn OUT OF the wire net into the component.
        const pinCurrentMa = new Map();
        const addPinI = (pk, ma) => {
            if (!pk || !Number.isFinite(ma) || Math.abs(ma) < 1e-6) return;
            pinCurrentMa.set(pk, (pinCurrentMa.get(pk) || 0) + ma);
        };

        const sourceRolePinsByNet = new Map();
        const markNetSourcePin = pk => {
            const nid = netOf(pk);
            if (nid === undefined) return;
            if (!sourceRolePinsByNet.has(nid)) sourceRolePinsByNet.set(nid, []);
            sourceRolePinsByNet.get(nid).push(pk);
        };

        for (const comp of (doc.components || [])) {
            if (comp.kind === 'battery' || comp.kind === 'battery9v' || (comp.kind === 'psu' && comp.enabled !== false)) {
                markNetSourcePin(`${comp.id}:pos`);
                markNetSourcePin(`${comp.id}:neg`);
            } else if (comp.kind === 'gnd') {
                markNetSourcePin(`${comp.id}:pin`);
            } else if (comp.kind === 'clock') {
                markNetSourcePin(`${comp.id}:out`);
            } else if (comp.kind === 'dip4') {
                for (let bi = 0; bi < 4; bi++) markNetSourcePin(`${comp.id}:B${bi}`);
            } else if (comp.kind === 'resistor') {
                const st = resistorStates.get(comp.id);
                if (st) {
                    const iSigned = (st.voltage / st.ohms) * 1000; // a -> b
                    addPinI(`${comp.id}:a`, -iSigned);
                    addPinI(`${comp.id}:b`, +iSigned);
                }
            } else if (comp.kind === 'potentiometer') {
                const st = potStates.get(comp.id);
                if (st) {
                    // i1Ma: t1 -> wiper, i2Ma: wiper -> t2
                    addPinI(`${comp.id}:t1`, -st.i1Ma);
                    addPinI(`${comp.id}:wiper`, +st.i1Ma - st.i2Ma);
                    addPinI(`${comp.id}:t2`, +st.i2Ma);
                }
            } else if (comp.kind === 'lamp') {
                const st = lampStates.get(comp.id);
                if (st && st.currentMa > 0) {
                    addPinI(`${comp.id}:anode`, -st.currentMa);
                    addPinI(`${comp.id}:cathode`, +st.currentMa);
                }
            } else if (comp.kind === 'rgb_led') {
                const st = rgbStates.get(comp.id);
                if (st) {
                    for (const ch of ['r', 'g', 'b']) {
                        const iCh = st[ch]?.currentMa || 0;
                        if (iCh > 0) {
                            addPinI(`${comp.id}:${ch}`, -iCh);
                            addPinI(`${comp.id}:gnd`, +iCh);
                        }
                    }
                }
            } else if (comp.kind === 'motor') {
                const st = motorStates.get(comp.id);
                if (st && Math.abs(st.voltage) > 0.01) {
                    const iSigned = (st.voltage / 12) * 1000; // pos -> neg
                    addPinI(`${comp.id}:pos`, -iSigned);
                    addPinI(`${comp.id}:neg`, +iSigned);
                }
            } else if (comp.kind === 'buzzer') {
                const st = buzzerStates.get(comp.id);
                if (st && st.currentMa > 0) {
                    addPinI(`${comp.id}:pos`, -st.currentMa);
                    addPinI(`${comp.id}:neg`, +st.currentMa);
                }
            } else if (comp.kind === 'npn') {
                const st = npnStates.get(comp.id);
                if (st) {
                    if (st.ibMa > 0) {
                        addPinI(`${comp.id}:b`, -st.ibMa);
                        addPinI(`${comp.id}:e`, +st.ibMa);
                    }
                    if (st.icMa > 0) {
                        addPinI(`${comp.id}:c`, -st.icMa);
                        addPinI(`${comp.id}:e`, +st.icMa);
                    }
                }
            } else if (comp.kind === 'multimeter' && comp.mode === 'mA') {
                const st = meterStates.get(comp.id);
                if (st && Math.abs(st.numeric) > 0) {
                    addPinI(`${comp.id}:pos`, -st.numeric);
                    addPinI(`${comp.id}:neg`, +st.numeric);
                }
            } else if (comp.kind === 'ic') {
                const spec = IC_CATALOG[comp.model];
                const st = icStates.get(comp.id);
                if (spec && st && st.powered && !doc.autoPower) {
                    const qMa = spec.iccMa || 8;
                    addPinI(`${comp.id}:${spec.vccPin || 14}`, -qMa);
                    addPinI(`${comp.id}:${spec.gndPin || 7}`, +qMa);
                }
            }
        }
        for (const { activeKey } of standaloneSwitches) markNetSourcePin(activeKey);
        for (const outKey of icOutputDrivers.keys()) markNetSourcePin(outKey);

        // Balance each net's KCL at its active source/reference pin(s) so open branches have strictly 0 mA
        for (let nid = 0; nid < nets.length; nid++) {
            const members = nets[nid].pins;
            let sumLoad = 0;
            for (const pk of members) sumLoad += (pinCurrentMa.get(pk) || 0);
            if (Math.abs(sumLoad) < 1e-6) continue;
            const srcs = sourceRolePinsByNet.get(nid);
            if (srcs && srcs.length) {
                const share = -sumLoad / srcs.length;
                for (const sk of srcs) addPinI(sk, share);
            }
        }

        // Build intra-net ideal zero-ohm graph (wires + breadboard plugs + breadboard strips + closed switches)
        const netAdj = new Map();
        const addNetEdge = (u, v, wire = null) => {
            if (!u || !v || u === v) return;
            if (!netAdj.has(u)) netAdj.set(u, []);
            if (!netAdj.has(v)) netAdj.set(v, []);
            netAdj.get(u).push({ to: v, wire, forward: true });
            netAdj.get(v).push({ to: u, wire, forward: false });
        };

        for (const w of (doc.wires || [])) {
            if (pins.has(w.from) && pins.has(w.to)) {
                addNetEdge(w.from, w.to, w);
            }
        }
        for (const [compPin, bbHole] of pluggedPinMap.entries()) {
            addNetEdge(compPin, bbHole, null);
        }
        for (const stripSet of breadboardNets.values()) {
            const stripList = [...stripSet];
            for (let i = 1; i < stripList.length; i++) {
                addNetEdge(stripList[i - 1], stripList[i], null);
            }
        }
        for (const comp of (doc.components || [])) {
            if (comp.kind === 'switch' && comp.closed) {
                const inK = `${comp.id}:in`, outK = `${comp.id}:out`;
                if (wireConnectedPins.has(inK) && wireConnectedPins.has(outK)) addNetEdge(inK, outK, null);
            } else if (comp.kind === 'pushbutton') {
                addNetEdge(`${comp.id}:a1`, `${comp.id}:a2`, null);
                addNetEdge(`${comp.id}:b1`, `${comp.id}:b2`, null);
                if (comp.pressed) addNetEdge(`${comp.id}:a1`, `${comp.id}:b1`, null);
            } else if (comp.kind === 'spdt') {
                const isRight = (comp.positionThrow || comp.throwPos) === 'right';
                addNetEdge(`${comp.id}:com`, isRight ? `${comp.id}:t2` : `${comp.id}:t1`, null);
            }
        }

        const wireCurrents = new Map(); // wireId -> { currentMa, signedMa, dir }
        for (const w of (doc.wires || [])) {
            wireCurrents.set(w.id, { currentMa: 0, signedMa: 0, dir: 0 });
        }

        // Post-order spanning tree accumulation per connected component
        const visited = new Set();
        for (const startNode of netAdj.keys()) {
            if (visited.has(startNode)) continue;
            const order = [];
            const parent = new Map();
            const stack = [startNode];
            visited.add(startNode);
            parent.set(startNode, null);
            while (stack.length) {
                const u = stack.pop();
                order.push(u);
                for (const edge of (netAdj.get(u) || [])) {
                    if (!visited.has(edge.to)) {
                        visited.add(edge.to);
                        parent.set(edge.to, { from: u, wire: edge.wire, forward: edge.forward });
                        stack.push(edge.to);
                    }
                }
            }
            const subSum = new Map();
            for (let i = order.length - 1; i >= 0; i--) {
                const u = order[i];
                const total = (pinCurrentMa.get(u) || 0) + (subSum.get(u) || 0);
                const pInfo = parent.get(u);
                if (pInfo) {
                    // Current flowing from pInfo.from -> u equals -total (since total entered the net from u's subtree)
                    const iFromToU = -total;
                    if (pInfo.wire) {
                        const signedFromTo = pInfo.forward ? iFromToU : -iFromToU;
                        const absMa = Math.abs(signedFromTo);
                        wireCurrents.set(pInfo.wire.id, {
                            currentMa: absMa,
                            signedMa: signedFromTo,
                            dir: absMa >= 0.15 ? (signedFromTo >= 0 ? 1 : -1) : 0
                        });
                    }
                    subSum.set(pInfo.from, (subSum.get(pInfo.from) || 0) + total);
                }
            }
        }

        const anyReverse = [...icStates.values()].some(s => s.reversePower);
        const iccMa = Math.round(totalCurrentMa * 10) / 10;
        const powerMw = Math.round(totalPowerMw * 10) / 10;

        return {
            pins,
            pinToNet,
            nets,
            pinValues,
            pinVoltages,
            pinConflicts,
            nodeVoltages,
            wireCurrents,
            pluggedPinMap,
            breadboardNets,
            icStates,
            lampStates,
            rgbStates,
            motorStates,
            resistorStates,
            potStates,
            buzzerStates,
            npnStates,
            meterStates,
            sourceStates,
            segStates,
            probeStates,
            anyShort,
            anyReverse,
            faults,
            warnings,
            telemetry: {
                iccMa,
                powerMw,
                propagationDelayNs: maxDelayNs
            }
        };
    }

    const ElectronicsSolver = {
        LED_VF,
        RGB_VF,
        getBreadboardSpec,
        getBreadboardHoles,
        getResistorBands,
        formatOhms,
        formatCurrentMa,
        evaluateHybridBench
    };

    root.ElectronicsSolver = ElectronicsSolver;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ElectronicsSolver;
    }
})(typeof window !== 'undefined' ? window : globalThis);

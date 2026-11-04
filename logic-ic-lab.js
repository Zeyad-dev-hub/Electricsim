(function (root) {
    'use strict';

    const GRID = 18;

    // =========================================================================
    // 1. AUTHENTIC 74xx SERIES DIP-14 IC CATALOG
    // =========================================================================
    // Pin numbering on a standard 14-pin DIP package:
    // Bottom row (left to right): Pins 1, 2, 3, 4, 5, 6, 7  (Pin 7 = GND)
    // Top row (right to left):    Pins 8, 9, 10, 11, 12, 13, 14 (Pin 14 = VCC)
    // Pin X offsets for the 7 columns: -108, -72, -36, 0, +36, +72, +108 (pitch = 36px = 2 * GRID)
    // Pin Y offsets: Top row = -72, Bottom row = +72

    function getDip14PinLocal(pinNumber) {
        if (pinNumber >= 1 && pinNumber <= 7) {
            return {
                pin: pinNumber,
                x: -108 + (pinNumber - 1) * 36,
                y: 72,
                innerY: 56,
                row: 'bottom'
            };
        }
        if (pinNumber >= 8 && pinNumber <= 14) {
            return {
                pin: pinNumber,
                x: -108 + (14 - pinNumber) * 36,
                y: -72,
                innerY: -56,
                row: 'top'
            };
        }
        return { pin: pinNumber, x: 0, y: 0, innerY: 0, row: 'bottom' };
    }

    const QUAD_STD_GATES = type => [
        { id: 'G1', type, inputs: [1, 2], output: 3, gx: -60, gy: 25, dir: 1 },
        { id: 'G2', type, inputs: [4, 5], output: 6, gx: 42, gy: 25, dir: 1 },
        { id: 'G3', type, inputs: [10, 9], output: 8, gx: 68, gy: -25, dir: 1 },
        { id: 'G4', type, inputs: [13, 12], output: 11, gx: -36, gy: -25, dir: 1 }
    ];

    const QUAD_7402_GATES = [
        { id: 'G1', type: 'NOR', inputs: [2, 3], output: 1, gx: -68, gy: 25, dir: -1 },
        { id: 'G2', type: 'NOR', inputs: [5, 6], output: 4, gx: 36, gy: 25, dir: -1 },
        { id: 'G3', type: 'NOR', inputs: [9, 8], output: 10, gx: 68, gy: -25, dir: -1 },
        { id: 'G4', type: 'NOR', inputs: [12, 11], output: 13, gx: -36, gy: -25, dir: -1 }
    ];

    const HEX_7404_GATES = [
        { id: 'G1', type: 'NOT', inputs: [1], output: 2, gx: -90, gy: 26, dir: 1 },
        { id: 'G2', type: 'NOT', inputs: [3], output: 4, gx: -18, gy: 26, dir: 1 },
        { id: 'G3', type: 'NOT', inputs: [5], output: 6, gx: 54, gy: 26, dir: 1 },
        { id: 'G4', type: 'NOT', inputs: [9], output: 8, gx: 90, gy: -26, dir: 1 },
        { id: 'G5', type: 'NOT', inputs: [11], output: 10, gx: 18, gy: -26, dir: 1 },
        { id: 'G6', type: 'NOT', inputs: [13], output: 12, gx: -54, gy: -26, dir: 1 }
    ];

    const TRIPLE_3IN_GATES = type => [
        { id: 'G1', type, inputs: [13, 1, 2], output: 12, gx: -64, gy: -4, dir: 1 },
        { id: 'G2', type, inputs: [3, 4, 5], output: 6, gx: 18, gy: 25, dir: 1 },
        { id: 'G3', type, inputs: [11, 10, 9], output: 8, gx: 56, gy: -25, dir: 1 }
    ];

    const IC_CATALOG = {
        '7404': {
            model: '7404',
            partNumber: 'SN74LS04N',
            description: 'Hex Inverter (6× 1-Input NOT Gates)',
            gateType: 'NOT',
            fanIn: 1,
            vccPin: 14,
            gndPin: 7,
            gates: HEX_7404_GATES
        },
        '7400': {
            model: '7400',
            partNumber: 'SN74LS00N',
            description: 'Quad 2-Input NAND Gate',
            gateType: 'NAND',
            fanIn: 2,
            vccPin: 14,
            gndPin: 7,
            gates: QUAD_STD_GATES('NAND')
        },
        '7402': {
            model: '7402',
            partNumber: 'SN74LS02N',
            description: 'Quad 2-Input NOR Gate (Reversed Pinout)',
            gateType: 'NOR',
            fanIn: 2,
            vccPin: 14,
            gndPin: 7,
            gates: QUAD_7402_GATES
        },
        '7408': {
            model: '7408',
            partNumber: 'SN74LS08N',
            description: 'Quad 2-Input AND Gate',
            gateType: 'AND',
            fanIn: 2,
            vccPin: 14,
            gndPin: 7,
            gates: QUAD_STD_GATES('AND')
        },
        '7432': {
            model: '7432',
            partNumber: 'SN74LS32N',
            description: 'Quad 2-Input OR Gate',
            gateType: 'OR',
            fanIn: 2,
            vccPin: 14,
            gndPin: 7,
            gates: QUAD_STD_GATES('OR')
        },
        '7486': {
            model: '7486',
            partNumber: 'SN74LS86N',
            description: 'Quad 2-Input Exclusive-OR (XOR) Gate',
            gateType: 'XOR',
            fanIn: 2,
            vccPin: 14,
            gndPin: 7,
            gates: QUAD_STD_GATES('XOR')
        },
        '74266': {
            model: '74266',
            partNumber: 'SN74LS266N',
            description: 'Quad 2-Input Exclusive-NOR (XNOR) Gate',
            gateType: 'XNOR',
            fanIn: 2,
            vccPin: 14,
            gndPin: 7,
            gates: QUAD_STD_GATES('XNOR')
        },
        '7410': {
            model: '7410',
            partNumber: 'SN74LS10N',
            description: 'Triple 3-Input NAND Gate',
            gateType: 'NAND',
            fanIn: 3,
            vccPin: 14,
            gndPin: 7,
            gates: TRIPLE_3IN_GATES('NAND')
        },
        '7411': {
            model: '7411',
            partNumber: 'SN74LS11N',
            description: 'Triple 3-Input AND Gate',
            gateType: 'AND',
            fanIn: 3,
            vccPin: 14,
            gndPin: 7,
            gates: TRIPLE_3IN_GATES('AND')
        },
        '7427': {
            model: '7427',
            partNumber: 'SN74LS27N',
            description: 'Triple 3-Input NOR Gate',
            gateType: 'NOR',
            fanIn: 3,
            vccPin: 14,
            gndPin: 7,
            gates: TRIPLE_3IN_GATES('NOR')
        }
    };

    // =========================================================================
    // 2. DOCUMENT MODEL & COMPONENT HELPERS
    // =========================================================================
    let nextUid = 1;
    function uid(prefix) {
        return `${prefix}_${nextUid++}`;
    }

    function blankICDoc() {
        return {
            autoPower: false,
            components: [],
            wires: []
        };
    }

    function cloneICDoc(doc) {
        return JSON.parse(JSON.stringify(doc));
    }

    function snapICPoint(pt, snap = true) {
        if (!snap) {
            return { x: Math.round(pt.x), y: Math.round(pt.y) };
        }
        return {
            x: Math.round(pt.x / GRID) * GRID,
            y: Math.round(pt.y / GRID) * GRID
        };
    }

    function rotateLocal(lx, ly, deg = 0) {
        const r = ((deg % 360) + 360) % 360;
        if (r === 90) return { x: -ly, y: lx };
        if (r === 180) return { x: -lx, y: -ly };
        if (r === 270) return { x: ly, y: -lx };
        return { x: lx, y: ly };
    }

    function createICComponent(kind, x, y, extra = {}) {
        const pos = { x: Math.round(x), y: Math.round(y) };
        const rotation = ((extra.rotation || 0) % 360 + 360) % 360;
        if (IC_CATALOG[kind]) {
            return {
                id: extra.id || uid('ic'),
                kind: 'ic',
                model: kind,
                position: pos,
                rotation,
                label: extra.label || kind
            };
        }
        if (kind === 'battery') {
            return {
                id: extra.id || uid('bat'),
                kind: 'battery',
                position: pos,
                rotation,
                voltage: 5,
                label: extra.label || '5V DC'
            };
        }
        if (kind === 'switch') {
            return {
                id: extra.id || uid('sw'),
                kind: 'switch',
                position: pos,
                rotation,
                closed: Boolean(extra.closed),
                label: extra.label || 'SW'
            };
        }
        if (kind === 'resistor') {
            return {
                id: extra.id || uid('res'),
                kind: 'resistor',
                position: pos,
                rotation,
                ohms: extra.ohms || 220,
                label: extra.label || '220Ω'
            };
        }
        if (kind === 'lamp') {
            return {
                id: extra.id || uid('lamp'),
                kind: 'lamp',
                position: pos,
                rotation,
                color: extra.color || 'emerald',
                label: extra.label || 'LED'
            };
        }
        if (kind === 'gnd') {
            return {
                id: extra.id || uid('gnd'),
                kind: 'gnd',
                position: pos,
                rotation,
                label: extra.label || 'GND'
            };
        }
        if (kind === 'clock') {
            return {
                id: extra.id || uid('clk'),
                kind: 'clock',
                position: pos,
                rotation,
                value: extra.value ? 1 : 0,
                running: extra.running !== false,
                label: extra.label || '1Hz CLK'
            };
        }
        if (kind === 'seg7') {
            return {
                id: extra.id || uid('seg'),
                kind: 'seg7',
                position: pos,
                rotation,
                label: extra.label || 'HEX'
            };
        }
        throw new Error(`Unknown IC Lab component kind: ${kind}`);
    }

    function buildPin(comp, pin, lx, ly, ldx, ldy, role, title, extra = {}) {
        const rot = comp.rotation || 0;
        const pRot = rotateLocal(lx, ly, rot);
        const dRot = rotateLocal(ldx, ldy, rot);
        return {
            key: `${comp.id}:${pin}`,
            compId: comp.id,
            pin: String(pin),
            role,
            title,
            x: comp.position.x + pRot.x,
            y: comp.position.y + pRot.y,
            dir: { dx: dRot.x, dy: dRot.y },
            ...extra
        };
    }

    function getComponentPins(comp) {
        if (comp.kind === 'ic') {
            const spec = IC_CATALOG[comp.model];
            const pins = [];
            for (let p = 1; p <= 14; p++) {
                const loc = getDip14PinLocal(p);
                let role = 'io';
                let title = `Pin ${p}`;
                if (p === 14) {
                    role = 'vcc';
                    title = 'Pin 14 (VCC +5V)';
                } else if (p === 7) {
                    role = 'gnd';
                    title = 'Pin 7 (GND 0V)';
                } else if (spec) {
                    for (let gi = 0; gi < spec.gates.length; gi++) {
                        const g = spec.gates[gi];
                        if (g.output === p) {
                            role = 'out';
                            title = `Pin ${p} (${g.id} ${g.type} Out)`;
                            break;
                        }
                        const inIdx = g.inputs.indexOf(p);
                        if (inIdx !== -1) {
                            role = 'in';
                            title = `Pin ${p} (${g.id} ${g.type} In)`;
                            break;
                        }
                    }
                }
                const ldy = loc.row === 'top' ? -1 : 1;
                pins.push(buildPin(comp, p, loc.x, loc.y, 0, ldy, role, title, { pinNumber: p, row: loc.row }));
            }
            return pins;
        }
        if (comp.kind === 'battery') {
            return [
                buildPin(comp, 'neg', -36, 0, -1, 0, 'gnd', 'Battery − (GND 0V)'),
                buildPin(comp, 'pos', 36, 0, 1, 0, 'vcc', 'Battery + (+5V VCC)')
            ];
        }
        if (comp.kind === 'switch') {
            return [
                buildPin(comp, 'in', -36, 0, -1, 0, 'in', 'Switch Supply Input (+5V)'),
                buildPin(comp, 'out', 36, 0, 1, 0, 'out', 'Switch Output Terminal')
            ];
        }
        if (comp.kind === 'resistor') {
            return [
                buildPin(comp, 'a', -36, 0, -1, 0, 'io', 'Resistor Lead A'),
                buildPin(comp, 'b', 36, 0, 1, 0, 'io', 'Resistor Lead B')
            ];
        }
        if (comp.kind === 'lamp') {
            return [
                buildPin(comp, 'anode', -36, 0, -1, 0, 'in', 'Lamp Anode (+ Input)'),
                buildPin(comp, 'cathode', 36, 0, 1, 0, 'gnd', 'Lamp Cathode (− to GND)')
            ];
        }
        if (comp.kind === 'gnd') {
            return [
                buildPin(comp, 'pin', 0, -18, 0, -1, 'gnd', 'Ground Reference (0V)')
            ];
        }
        if (comp.kind === 'clock') {
            return [
                buildPin(comp, 'out', 36, 0, 1, 0, 'out', 'Clock Pulse Output (0 ↔ 1)')
            ];
        }
        if (comp.kind === 'seg7') {
            return [
                buildPin(comp, 'A', -36, -54, -1, 0, 'in', 'BCD Bit 0 (LSB = 1)'),
                buildPin(comp, 'B', -36, -18, -1, 0, 'in', 'BCD Bit 1 (2)'),
                buildPin(comp, 'C', -36, 18, -1, 0, 'in', 'BCD Bit 2 (4)'),
                buildPin(comp, 'D', -36, 54, -1, 0, 'in', 'BCD Bit 3 (MSB = 8)')
            ];
        }
        return [];
    }

    function allICPins(doc) {
        const map = new Map();
        for (const comp of doc.components) {
            for (const p of getComponentPins(comp)) {
                map.set(p.key, p);
            }
        }
        return map;
    }

    function getComponentBounds(comp) {
        const { x, y } = comp.position;
        const rot = ((comp.rotation || 0) % 360 + 360) % 360;
        const swapped = rot === 90 || rot === 270;
        let w = 84, h = 52;
        if (comp.kind === 'ic') {
            w = 264;
            h = 148;
        } else if (comp.kind === 'seg7') {
            w = 84;
            h = 136;
        } else if (comp.kind === 'gnd') {
            w = 48;
            h = 46;
        }
        const rw = swapped ? h : w;
        const rh = swapped ? w : h;
        return {
            x: x - rw / 2,
            y: y - rh / 2,
            w: rw,
            h: rh,
            left: x - rw / 2,
            right: x + rw / 2,
            top: y - rh / 2,
            bottom: y + rh / 2
        };
    }

    function connectICWire(doc, pinAKey, pinBKey, waypoints = []) {
        if (!pinAKey || !pinBKey || pinAKey === pinBKey) return false;
        const exists = doc.wires.some(
            w => (w.from === pinAKey && w.to === pinBKey) || (w.from === pinBKey && w.to === pinAKey)
        );
        if (exists) return false;
        doc.wires.push({
            id: uid('w'),
            from: pinAKey,
            to: pinBKey,
            waypoints
        });
        return true;
    }

    // =========================================================================
    // 3. ELECTRICAL & DIGITAL LOGIC IC SOLVER
    // =========================================================================
    function evalSingleGate(type, vals) {
        if (!vals.length || vals.some(v => v !== 0 && v !== 1)) {
            return null;
        }
        switch (type) {
            case 'NOT':
                return vals[0] === 1 ? 0 : 1;
            case 'BUF':
                return vals[0] === 1 ? 1 : 0;
            case 'AND':
                return vals.every(v => v === 1) ? 1 : 0;
            case 'NAND':
                return vals.every(v => v === 1) ? 0 : 1;
            case 'OR':
                return vals.some(v => v === 1) ? 1 : 0;
            case 'NOR':
                return vals.some(v => v === 1) ? 0 : 1;
            case 'XOR':
                return vals.reduce((a, b) => a ^ b, 0);
            case 'XNOR':
                return vals.reduce((a, b) => a ^ b, 0) === 1 ? 0 : 1;
            default:
                return null;
        }
    }

    function evaluateICBench(doc) {
        const pins = allICPins(doc);
        const adj = new Map();
        const wireConnectedPins = new Set();

        for (const k of pins.keys()) {
            adj.set(k, new Set());
        }

        function addEdge(a, b) {
            if (!adj.has(a)) adj.set(a, new Set());
            if (!adj.has(b)) adj.set(b, new Set());
            adj.get(a).add(b);
            adj.get(b).add(a);
        }

        for (const w of doc.wires) {
            if (pins.has(w.from) && pins.has(w.to)) {
                addEdge(w.from, w.to);
                wireConnectedPins.add(w.from);
                wireConnectedPins.add(w.to);
            }
        }

        // Resistors conduct logic polarity between leads a and b
        // Closed switches conduct between in and out when in is wired
        for (const comp of doc.components) {
            if (comp.kind === 'resistor') {
                addEdge(`${comp.id}:a`, `${comp.id}:b`);
            } else if (comp.kind === 'switch' && comp.closed) {
                const inKey = `${comp.id}:in`;
                if (wireConnectedPins.has(inKey)) {
                    addEdge(inKey, `${comp.id}:out`);
                }
            }
        }

        // Find connected nets via BFS
        const pinToNet = new Map();
        const nets = [];
        for (const k of pins.keys()) {
            if (pinToNet.has(k)) continue;
            const netIdx = nets.length;
            const members = [];
            const queue = [k];
            pinToNet.set(k, netIdx);
            while (queue.length) {
                const cur = queue.shift();
                members.push(cur);
                const neighbors = adj.get(cur);
                if (!neighbors) continue;
                for (const nb of neighbors) {
                    if (!pinToNet.has(nb)) {
                        pinToNet.set(nb, netIdx);
                        queue.push(nb);
                    }
                }
            }
            nets.push({ id: netIdx, pins: members, value: null, conflict: false });
        }

        // Track strong vs weak drivers per net
        // Strong drivers: battery pos (1), battery neg (0), gnd (0), clock (0/1), standalone switch (0/1), IC gate outputs (0/1)
        // Weak drivers: open switch pull-down (0) so downstream inputs don't float when a series switch opens
        const baseStrongDrivers = new Map(); // pinKey -> 0 | 1
        const baseWeakDrivers = new Map();   // pinKey -> 0 | 1

        for (const comp of doc.components) {
            if (comp.kind === 'battery') {
                baseStrongDrivers.set(`${comp.id}:pos`, 1);
                baseStrongDrivers.set(`${comp.id}:neg`, 0);
            } else if (comp.kind === 'gnd') {
                baseStrongDrivers.set(`${comp.id}:pin`, 0);
            } else if (comp.kind === 'clock') {
                baseStrongDrivers.set(`${comp.id}:out`, comp.value ? 1 : 0);
            } else if (comp.kind === 'switch') {
                const inKey = `${comp.id}:in`;
                const outKey = `${comp.id}:out`;
                if (!wireConnectedPins.has(inKey)) {
                    // Standalone logic switch mode: closed = 1 (+5V), open = 0 (0V)
                    baseStrongDrivers.set(outKey, comp.closed ? 1 : 0);
                } else if (!comp.closed) {
                    // Series switch mode when open: weak pull-down to 0V
                    baseWeakDrivers.set(outKey, 0);
                }
            } else if (comp.kind === 'ic' && doc.autoPower) {
                baseStrongDrivers.set(`${comp.id}:14`, 1);
                baseStrongDrivers.set(`${comp.id}:7`, 0);
            }
        }

        const icOutputDrivers = new Map(); // pinKey -> 0 | 1
        const icStates = new Map();        // compId -> { powered, fault, gates: Map(gateId -> { outVal, inVals }) }

        function resolveNets() {
            for (const net of nets) {
                let hasStrong1 = false;
                let hasStrong0 = false;
                let hasWeak1 = false;
                let hasWeak0 = false;

                for (const pk of net.pins) {
                    if (baseStrongDrivers.has(pk)) {
                        const v = baseStrongDrivers.get(pk);
                        if (v === 1) hasStrong1 = true;
                        if (v === 0) hasStrong0 = true;
                    }
                    if (icOutputDrivers.has(pk)) {
                        const v = icOutputDrivers.get(pk);
                        if (v === 1) hasStrong1 = true;
                        if (v === 0) hasStrong0 = true;
                    }
                    if (baseWeakDrivers.has(pk)) {
                        const v = baseWeakDrivers.get(pk);
                        if (v === 1) hasWeak1 = true;
                        if (v === 0) hasWeak0 = true;
                    }
                }

                net.conflict = hasStrong1 && hasStrong0;
                if (net.conflict) {
                    net.value = 1; // energized fault net
                } else if (hasStrong1) {
                    net.value = 1;
                } else if (hasStrong0) {
                    net.value = 0;
                } else if (hasWeak1) {
                    net.value = 1;
                } else if (hasWeak0) {
                    net.value = 0;
                } else {
                    net.value = null;
                }
            }
        }

        function getPinValue(pinKey) {
            const netIdx = pinToNet.get(pinKey);
            if (netIdx === undefined) return null;
            return nets[netIdx].value;
        }

        resolveNets();

        // Iterative evaluation for multi-IC cascades & latches
        for (let iter = 0; iter < 16; iter++) {
            let changed = false;

            for (const comp of doc.components) {
                if (comp.kind !== 'ic') continue;
                const spec = IC_CATALOG[comp.model];
                if (!spec) continue;

                const vccVal = doc.autoPower ? 1 : getPinValue(`${comp.id}:${spec.vccPin}`);
                const gndVal = doc.autoPower ? 0 : getPinValue(`${comp.id}:${spec.gndPin}`);

                const reversePower = (vccVal === 0 && gndVal === 1);
                const powered = (vccVal === 1 && gndVal === 0);

                const gateResults = new Map();
                for (const g of spec.gates) {
                    const outKey = `${comp.id}:${g.output}`;
                    if (!powered) {
                        if (icOutputDrivers.has(outKey)) {
                            icOutputDrivers.delete(outKey);
                            changed = true;
                        }
                        gateResults.set(g.id, { outVal: null, inVals: g.inputs.map(p => getPinValue(`${comp.id}:${p}`)) });
                        continue;
                    }

                    const inVals = g.inputs.map(p => getPinValue(`${comp.id}:${p}`));
                    const outVal = evalSingleGate(g.type, inVals);
                    gateResults.set(g.id, { outVal, inVals });

                    const prev = icOutputDrivers.get(outKey) ?? null;
                    if (outVal === 0 || outVal === 1) {
                        if (prev !== outVal) {
                            icOutputDrivers.set(outKey, outVal);
                            changed = true;
                        }
                    } else if (icOutputDrivers.has(outKey)) {
                        icOutputDrivers.delete(outKey);
                        changed = true;
                    }
                }

                icStates.set(comp.id, {
                    powered,
                    reversePower,
                    vccVal,
                    gndVal,
                    gates: gateResults
                });
            }

            resolveNets();
            if (!changed) break;
        }

        // Evaluate lamps & 7-seg displays
        const lampStates = new Map();
        const segStates = new Map();

        for (const comp of doc.components) {
            if (comp.kind === 'lamp') {
                const anodeKey = `${comp.id}:anode`;
                const cathodeKey = `${comp.id}:cathode`;
                const anodeVal = getPinValue(anodeKey);
                const cathodeVal = getPinValue(cathodeKey);
                const cathodeWired = wireConnectedPins.has(cathodeKey);
                // Lamp lights up when Anode is HIGH (1) and Cathode is LOW (0) (or left unwired in probe mode)
                const lit = anodeVal === 1 && (cathodeVal === 0 || !cathodeWired);
                lampStates.set(comp.id, {
                    lit,
                    anodeVal,
                    cathodeVal,
                    cathodeWired
                });
            } else if (comp.kind === 'seg7') {
                const a = getPinValue(`${comp.id}:A`);
                const b = getPinValue(`${comp.id}:B`);
                const c = getPinValue(`${comp.id}:C`);
                const d = getPinValue(`${comp.id}:D`);
                const anyConnected = [a, b, c, d].some(v => v === 0 || v === 1);
                const val = anyConnected
                    ? ((d === 1 ? 8 : 0) | (c === 1 ? 4 : 0) | (b === 1 ? 2 : 0) | (a === 1 ? 1 : 0))
                    : null;
                segStates.set(comp.id, { value: val, bits: [a, b, c, d] });
            }
        }

        const pinValues = new Map();
        const pinConflicts = new Map();
        for (const k of pins.keys()) {
            const netIdx = pinToNet.get(k);
            const net = nets[netIdx];
            pinValues.set(k, net ? net.value : null);
            pinConflicts.set(k, Boolean(net && net.conflict));
        }

        const anyShort = nets.some(n => n.conflict);
        const anyReverse = [...icStates.values()].some(s => s.reversePower);

        return {
            pins,
            pinToNet,
            pinValues,
            pinConflicts,
            icStates,
            lampStates,
            segStates,
            anyShort,
            anyReverse
        };
    }

    // =========================================================================
    // 4. SMART OBSTACLE-AVOIDING WIRE ROUTER, LANE SHIFT & INTERSECTION HOPS
    // =========================================================================
    function simplifyPath(points) {
        if (!points.length) return [];
        const dedup = [points[0]];
        for (let i = 1; i < points.length; i++) {
            const prev = dedup[dedup.length - 1];
            const cur = points[i];
            if (Math.hypot(cur.x - prev.x, cur.y - prev.y) > 1e-4) {
                dedup.push(cur);
            }
        }
        if (dedup.length <= 2) return dedup;
        const out = [dedup[0]];
        for (let i = 1; i < dedup.length - 1; i++) {
            const a = out[out.length - 1];
            const b = dedup[i];
            const c = dedup[i + 1];
            const colX = Math.abs(a.x - b.x) < 1e-4 && Math.abs(b.x - c.x) < 1e-4;
            const colY = Math.abs(a.y - b.y) < 1e-4 && Math.abs(b.y - c.y) < 1e-4;
            if (!colX && !colY) out.push(b);
        }
        out.push(dedup[dedup.length - 1]);
        return out;
    }

    function orthogonalPath(anchors, verticalFirst = false) {
        if (!anchors.length) return [];
        const path = [{ x: anchors[0].x, y: anchors[0].y }];
        let vf = verticalFirst;
        for (let i = 1; i < anchors.length; i++) {
            const a = path[path.length - 1];
            const b = anchors[i];
            if (Math.abs(a.x - b.x) > 1e-4 && Math.abs(a.y - b.y) > 1e-4) {
                path.push(vf ? { x: a.x, y: b.y } : { x: b.x, y: a.y });
            }
            if (Math.hypot(path[path.length - 1].x - b.x, path[path.length - 1].y - b.y) > 1e-4) {
                path.push({ x: b.x, y: b.y });
            }
            if (path.length > 1) {
                const p1 = path[path.length - 1];
                const p0 = path[path.length - 2];
                vf = Math.abs(p1.x - p0.x) < 1e-4;
            }
        }
        return simplifyPath(path);
    }

    function pinStub(pin, stubLen = 18) {
        const dx = pin.dir?.dx ?? 0;
        const dy = pin.dir?.dy ?? 0;
        if (dx === 0 && dy === 0) return { x: pin.x, y: pin.y };
        return {
            x: pin.x + dx * stubLen,
            y: pin.y + dy * stubLen
        };
    }

    function segmentHitsBoxes(p, q, boxes) {
        let hits = 0;
        if (Math.abs(p.x - q.x) < 1e-4) {
            const minY = Math.min(p.y, q.y);
            const maxY = Math.max(p.y, q.y);
            for (const box of boxes) {
                if (p.x > box.left + 2 && p.x < box.right - 2 && maxY > box.top + 2 && minY < box.bottom - 2) {
                    hits++;
                }
            }
        } else if (Math.abs(p.y - q.y) < 1e-4) {
            const minX = Math.min(p.x, q.x);
            const maxX = Math.max(p.x, q.x);
            for (const box of boxes) {
                if (p.y > box.top + 2 && p.y < box.bottom - 2 && maxX > box.left + 2 && minX < box.right - 2) {
                    hits++;
                }
            }
        }
        return hits;
    }

    function routeICWire(p1, p2, waypoints = [], doc = null, laneShift = 0) {
        if (!p1 || !p2) return [];
        const s1 = pinStub(p1, 18);
        const s2 = pinStub(p2, 18);
        const p1Vert = Math.abs(p1.dir?.dy || 0) > 0.5;
        const p2Vert = Math.abs(p2.dir?.dy || 0) > 0.5;

        if (waypoints && waypoints.length) {
            return orthogonalPath([
                { x: p1.x, y: p1.y },
                s1,
                ...waypoints,
                s2,
                { x: p2.x, y: p2.y }
            ], p1Vert);
        }

        if (Math.abs(p1.x - p2.x) < 1 && (!p1Vert || (p1.y < p2.y ? (p1.dir?.dy || 0) >= 0 : (p1.dir?.dy || 0) <= 0))) {
            return [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }];
        }
        if (Math.abs(p1.y - p2.y) < 1 && !p1Vert && !p2Vert) {
            return [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }];
        }

        const midX = Math.round(((s1.x + s2.x) / 2) / GRID) * GRID + laneShift;
        const midY = Math.round(((s1.y + s2.y) / 2) / GRID) * GRID + laneShift;

        const candidates = [
            orthogonalPath([s1, { x: s1.x, y: midY }, { x: s2.x, y: midY }, s2], true),
            orthogonalPath([s1, { x: midX, y: s1.y }, { x: midX, y: s2.y }, s2], false),
            orthogonalPath([s1, s2], p1Vert),
            orthogonalPath([s1, s2], !p1Vert)
        ];

        const boxes = doc && doc.components
            ? doc.components.map(c => {
                const b = getComponentBounds(c);
                // Shrink pin margin slightly so a pin's own exit stub doesn't count as hitting its own package
                if (c.id === p1.compId || c.id === p2.compId) {
                    return {
                        left: b.left + 10,
                        right: b.right - 10,
                        top: b.top + 12,
                        bottom: b.bottom - 12
                    };
                }
                return b;
            })
            : [];

        if (boxes.length) {
            for (const box of boxes) {
                for (const y of [box.top - 18, box.bottom + 18]) {
                    candidates.push(orthogonalPath([s1, { x: s1.x, y }, { x: s2.x, y }, s2], true));
                }
                for (const x of [box.left - 18, box.right + 18]) {
                    candidates.push(orthogonalPath([s1, { x, y: s1.y }, { x, y: s2.y }, s2], false));
                }
            }
        }

        function scoreCandidate(inner, idx) {
            const full = simplifyPath([{ x: p1.x, y: p1.y }, ...inner, { x: p2.x, y: p2.y }]);
            let len = 0;
            let hits = 0;
            for (let i = 1; i < full.length; i++) {
                len += Math.hypot(full[i].x - full[i - 1].x, full[i].y - full[i - 1].y);
                if (boxes.length && i > 1 && i < full.length - 1) {
                    hits += segmentHitsBoxes(full[i - 1], full[i], boxes);
                }
            }
            const bends = Math.max(0, full.length - 2);
            return hits * 1e7 + len + bends * 18 + idx * 0.5;
        }

        let best = candidates[0];
        let bestScore = scoreCandidate(best, 0);
        for (let i = 1; i < candidates.length; i++) {
            const sc = scoreCandidate(candidates[i], i);
            if (sc < bestScore) {
                bestScore = sc;
                best = candidates[i];
            }
        }

        return simplifyPath([{ x: p1.x, y: p1.y }, ...best, { x: p2.x, y: p2.y }]);
    }

    function computeICWireGeometry(doc, pins, pinToNet = null) {
        const routes = new Map();
        const horizSegs = [];
        const vertSegs = [];

        for (const w of doc.wires) {
            const p1 = pins.get(w.from);
            const p2 = pins.get(w.to);
            const netId = pinToNet ? pinToNet.get(w.from) : w.from;
            let pts = routeICWire(p1, p2, w.waypoints, doc, 0);

            // Auto-separate overlapping parallel vertical or horizontal lanes on different nets
            if (!w.waypoints || !w.waypoints.length) {
                const shifts = [0, 18, -18, 36, -36];
                for (const sh of shifts) {
                    const tryPts = sh === 0 ? pts : routeICWire(p1, p2, null, doc, sh);
                    let overlap = false;
                    for (let i = 1; i < tryPts.length - 1; i++) {
                        const a = tryPts[i - 1];
                        const b = tryPts[i];
                        if (Math.abs(a.x - b.x) < 1e-4 && Math.abs(a.y - b.y) > 4) {
                            const minY = Math.min(a.y, b.y);
                            const maxY = Math.max(a.y, b.y);
                            if (vertSegs.some(v => v.netId !== netId && Math.abs(v.x - a.x) < 4 && Math.min(maxY, v.y2) - Math.max(minY, v.y1) > 4)) {
                                overlap = true;
                                break;
                            }
                        } else if (Math.abs(a.y - b.y) < 1e-4 && Math.abs(a.x - b.x) > 4) {
                            const minX = Math.min(a.x, b.x);
                            const maxX = Math.max(a.x, b.x);
                            if (horizSegs.some(h => h.netId !== netId && Math.abs(h.y - a.y) < 4 && Math.min(maxX, h.x2) - Math.max(minX, h.x1) > 4)) {
                                overlap = true;
                                break;
                            }
                        }
                    }
                    if (!overlap) {
                        pts = tryPts;
                        break;
                    }
                }
            }

            routes.set(w.id, pts);

            for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1];
                const b = pts[i];
                if (Math.abs(a.y - b.y) < 1e-4 && Math.abs(a.x - b.x) > 1) {
                    horizSegs.push({
                        wireId: w.id,
                        netId,
                        segIndex: i - 1,
                        a,
                        b,
                        y: a.y,
                        x1: Math.min(a.x, b.x),
                        x2: Math.max(a.x, b.x)
                    });
                } else if (Math.abs(a.x - b.x) < 1e-4 && Math.abs(a.y - b.y) > 1) {
                    vertSegs.push({
                        wireId: w.id,
                        netId,
                        segIndex: i - 1,
                        a,
                        b,
                        x: a.x,
                        y1: Math.min(a.y, b.y),
                        y2: Math.max(a.y, b.y)
                    });
                }
            }
        }

        const crossingsByWire = new Map();
        const junctions = [];
        const junctionSeen = new Set();

        function addJunction(x, y, netId) {
            const k = `${Math.round(x)},${Math.round(y)}`;
            if (junctionSeen.has(k)) return;
            junctionSeen.add(k);
            junctions.push({ x, y, netId });
        }

        for (const h of horizSegs) {
            for (const v of vertSegs) {
                if (h.wireId === v.wireId) continue;
                const sameNet = h.netId !== undefined && h.netId === v.netId;
                if (!sameNet) {
                    if (v.x > h.x1 + 7 && v.x < h.x2 - 7 && h.y > v.y1 + 4 && h.y < v.y2 - 4) {
                        if (!crossingsByWire.has(h.wireId)) crossingsByWire.set(h.wireId, []);
                        crossingsByWire.get(h.wireId).push({
                            x: v.x,
                            y: h.y,
                            segIndex: h.segIndex
                        });
                    }
                } else {
                    // Same signal net: T-junction or shared branch dot!
                    if (v.x >= h.x1 - 1 && v.x <= h.x2 + 1 && h.y >= v.y1 - 1 && h.y <= v.y2 + 1) {
                        const atEndH = Math.abs(v.x - h.x1) < 2 || Math.abs(v.x - h.x2) < 2;
                        const atEndV = Math.abs(h.y - v.y1) < 2 || Math.abs(h.y - v.y2) < 2;
                        if (!(atEndH && atEndV)) {
                            addJunction(v.x, h.y, h.netId);
                        }
                    }
                }
            }
        }

        return { routes, crossingsByWire, junctions, horizSegs, vertSegs };
    }

    // =========================================================================
    // 5. CURATED 74xx IC BENCH PRESETS
    // =========================================================================
    const IC_PRESETS = {
        ic_7408_bench: {
            title: '7408 — Quad 2-Input AND Bench (Battery + Switches + Resistor + Lamp)',
            description: '5V Battery powers Pin 14 (VCC) and Pin 7 (GND) of a 7408 IC. Two switches feed Gate 1 (Pins 1 & 2), and Output Pin 3 drives an LED Lamp through a 220Ω resistor.',
            build() {
                const doc = blankICDoc();
                const bat = createICComponent('battery', -288, -72, { id: 'bat1', label: '5V Supply' });
                const swA = createICComponent('switch', -252, 54, { id: 'swA', closed: true, label: 'SW A' });
                const swB = createICComponent('switch', -252, 126, { id: 'swB', closed: true, label: 'SW B' });
                const ic = createICComponent('7408', 0, 0, { id: 'ic7408', label: '7408' });
                const res = createICComponent('resistor', 180, 108, { id: 'r1', label: '220Ω' });
                const lamp = createICComponent('lamp', 306, 108, { id: 'lamp1', color: 'emerald', label: 'OUT LED' });
                const gnd = createICComponent('gnd', 378, 162, { id: 'gnd1' });

                doc.components.push(bat, swA, swB, ic, res, lamp, gnd);

                // Power: Battery + to Pin 14 (VCC), Battery - to Pin 7 (GND)
                connectICWire(doc, 'bat1:pos', 'ic7408:14', [{ x: -252, y: -108 }, { x: -108, y: -108 }]);
                connectICWire(doc, 'bat1:neg', 'ic7408:7', [{ x: -324, y: 180 }, { x: 108, y: 180 }]);

                // Switches powered from Battery +5V
                connectICWire(doc, 'bat1:pos', 'swA:in', [{ x: -288, y: 54 }]);
                connectICWire(doc, 'bat1:pos', 'swB:in', [{ x: -288, y: 126 }]);

                // Switch outputs to 7408 Gate 1 inputs (Pin 1 and Pin 2)
                connectICWire(doc, 'swA:out', 'ic7408:1', [{ x: -108, y: 54 }]);
                connectICWire(doc, 'swB:out', 'ic7408:2', [{ x: -72, y: 126 }]);

                // 7408 Gate 1 Output (Pin 3) -> 220Ω Resistor -> Lamp Anode -> Lamp Cathode -> GND
                connectICWire(doc, 'ic7408:3', 'r1:a', [{ x: -36, y: 108 }]);
                connectICWire(doc, 'r1:b', 'lamp1:anode');
                connectICWire(doc, 'lamp1:cathode', 'gnd1:pin', [{ x: 378, y: 108 }]);

                return doc;
            }
        },
        ic_half_adder: {
            title: '7486 + 7408 — 74xx Half Adder Breadboard (Sum & Carry Lamps)',
            description: 'Combines a 7486 (XOR) IC for Sum and a 7408 (AND) IC for Carry, driven by shared Switches A & B and powered from a 5V Battery.',
            build() {
                const doc = blankICDoc();
                const bat = createICComponent('battery', -360, -108, { id: 'bat1', label: '5V DC' });
                const swA = createICComponent('switch', -360, 0, { id: 'swA', closed: true, label: 'Input A' });
                const swB = createICComponent('switch', -360, 72, { id: 'swB', closed: true, label: 'Input B' });
                const icXor = createICComponent('7486', -72, -90, { id: 'ic7486' });
                const icAnd = createICComponent('7408', -72, 126, { id: 'ic7408' });
                const resSum = createICComponent('resistor', 162, -18, { id: 'rSum', label: '220Ω' });
                const lampSum = createICComponent('lamp', 288, -18, { id: 'lampSum', color: 'cyan', label: 'SUM (S)' });
                const resCar = createICComponent('resistor', 162, 198, { id: 'rCar', label: '220Ω' });
                const lampCar = createICComponent('lamp', 288, 198, { id: 'lampCar', color: 'amber', label: 'CARRY (C)' });
                const gndSum = createICComponent('gnd', 360, 36, { id: 'gnd1' });
                const gndCar = createICComponent('gnd', 360, 252, { id: 'gnd2' });

                doc.components.push(bat, swA, swB, icXor, icAnd, resSum, lampSum, resCar, lampCar, gndSum, gndCar);

                // Power both ICs
                connectICWire(doc, 'bat1:pos', 'ic7486:14', [{ x: -324, y: -180 }, { x: -180, y: -180 }]);
                connectICWire(doc, 'ic7486:14', 'ic7408:14', [{ x: -234, y: -162 }, { x: -234, y: 54 }, { x: -180, y: 54 }]);
                connectICWire(doc, 'bat1:neg', 'ic7486:7', [{ x: -396, y: -108 }, { x: -396, y: 18 }, { x: 36, y: 18 }]);
                connectICWire(doc, 'ic7486:7', 'ic7408:7', [{ x: 36, y: 234 }]);

                // Inputs A & B to both ICs (Pins 1 & 2)
                connectICWire(doc, 'swA:out', 'ic7486:1', [{ x: -180, y: 0 }]);
                connectICWire(doc, 'swA:out', 'ic7408:1', [{ x: -270, y: 0 }, { x: -270, y: 216 }, { x: -180, y: 216 }]);
                connectICWire(doc, 'swB:out', 'ic7486:2', [{ x: -144, y: 72 }, { x: -144, y: 0 }]);
                connectICWire(doc, 'swB:out', 'ic7408:2', [{ x: -252, y: 72 }, { x: -252, y: 234 }, { x: -144, y: 234 }]);

                // Outputs (Pin 3 of each IC) -> Resistor -> Lamp -> GND
                connectICWire(doc, 'ic7486:3', 'rSum:a');
                connectICWire(doc, 'rSum:b', 'lampSum:anode');
                connectICWire(doc, 'lampSum:cathode', 'gnd1:pin', [{ x: 360, y: -18 }]);

                connectICWire(doc, 'ic7408:3', 'rCar:a');
                connectICWire(doc, 'rCar:b', 'lampCar:anode');
                connectICWire(doc, 'lampCar:cathode', 'gnd2:pin', [{ x: 360, y: 198 }]);

                return doc;
            }
        },
        ic_7411_3input: {
            title: '7411 + 7404 — 3-Input Majority/All-High Detector & Inverter',
            description: 'Demonstrates the 3-input 7411 AND IC (Gate 2 on Pins 3, 4, 5 → Out Pin 6) feeding both an active Lamp and a 7404 Inverter (Pin 1 → Out Pin 2).',
            build() {
                const doc = blankICDoc();
                doc.autoPower = true;
                const sw1 = createICComponent('switch', -306, -36, { id: 'sw1', closed: true, label: 'IN 1' });
                const sw2 = createICComponent('switch', -306, 36, { id: 'sw2', closed: true, label: 'IN 2' });
                const sw3 = createICComponent('switch', -306, 108, { id: 'sw3', closed: true, label: 'IN 3' });
                const ic11 = createICComponent('7411', -54, -18, { id: 'ic7411' });
                const ic04 = createICComponent('7404', 252, -18, { id: 'ic7404' });
                const lampHigh = createICComponent('lamp', 90, 144, { id: 'lampHi', color: 'emerald', label: 'ALL HIGH' });
                const lampLow = createICComponent('lamp', 342, 144, { id: 'lampLo', color: 'red', label: 'INVERTED' });

                doc.components.push(sw1, sw2, sw3, ic11, ic04, lampHigh, lampLow);

                // Wire 3 switches to 7411 Gate 2 inputs (Pins 3, 4, 5)
                connectICWire(doc, 'sw1:out', 'ic7411:3', [{ x: -216, y: -36 }, { x: -216, y: 90 }, { x: -90, y: 90 }]);
                connectICWire(doc, 'sw2:out', 'ic7411:4', [{ x: -234, y: 36 }, { x: -234, y: 108 }, { x: -54, y: 108 }]);
                connectICWire(doc, 'sw3:out', 'ic7411:5', [{ x: -18, y: 108 }]);

                // 7411 Output Pin 6 -> ALL HIGH Lamp and 7404 Input Pin 1
                connectICWire(doc, 'ic7411:6', 'lampHi:anode', [{ x: 18, y: 144 }]);
                connectICWire(doc, 'ic7411:6', 'ic7404:1', [{ x: 18, y: 90 }, { x: 144, y: 90 }]);
                connectICWire(doc, 'ic7404:2', 'lampLo:anode', [{ x: 180, y: 144 }]);

                return doc;
            }
        },
        ic_7400_counter: {
            title: '7400 + 7-Seg — Quad NAND Logic Decoder & Clock Bench',
            description: 'Uses a 1Hz Clock and switches with a 7400 Quad NAND IC driving both an Indicator Lamp and a BCD 7-Segment Display.',
            build() {
                const doc = blankICDoc();
                doc.autoPower = true;
                const clk = createICComponent('clock', -288, -36, { id: 'clk1', value: 1, label: '1Hz CLK' });
                const sw = createICComponent('switch', -288, 54, { id: 'sw1', closed: true, label: 'ENABLE' });
                const ic00 = createICComponent('7400', -36, 0, { id: 'ic7400' });
                const lamp = createICComponent('lamp', 216, 108, { id: 'lamp1', color: 'cyan', label: 'NAND OUT' });
                const seg = createICComponent('seg7', 252, -36, { id: 'seg1' });

                doc.components.push(clk, sw, ic00, lamp, seg);

                connectICWire(doc, 'clk1:out', 'ic7400:1', [{ x: -198, y: -36 }, { x: -198, y: 72 }, { x: -144, y: 72 }]);
                connectICWire(doc, 'sw1:out', 'ic7400:2', [{ x: -108, y: 54 }]);
                connectICWire(doc, 'ic7400:3', 'lamp1:anode', [{ x: -72, y: 108 }]);
                connectICWire(doc, 'clk1:out', 'seg1:A', [{ x: -198, y: -36 }, { x: -198, y: -108 }, { x: 180, y: -108 }, { x: 180, y: -90 }]);
                connectICWire(doc, 'ic7400:3', 'seg1:B', [{ x: -72, y: 108 }, { x: 144, y: 108 }, { x: 144, y: -54 }]);

                return doc;
            }
        }
    };

    // =========================================================================
    // 6. CANVAS RENDERER (X-RAY DATASHEET IC OVERLAY & BENCH COMPONENTS)
    // =========================================================================
    const COLORS = {
        bg: '#06070b',
        wire0: '#59677f',
        wire1: '#3dd9ff',
        wire1Glow: 'rgba(61, 217, 255, 0.24)',
        wireFloat: '#6c788e',
        wireShort: '#ff5a52',
        icBodyXray: 'rgba(13, 19, 31, 0.80)',
        icBodyOpaque: '#10141f',
        icStroke: '#9fb0c7',
        icStrokePowered: '#3dd9ff',
        icStrokeFault: '#ff5a52',
        selected: '#8b9dff',
        text: '#e8eef7',
        muted: '#8fa0b5',
        vcc: '#ff6b6b',
        gnd: '#7d92b0',
        emerald: '#37e0a1',
        cyan: '#3dd9ff',
        amber: '#f6b944',
        red: '#ff5a52'
    };

    function roundedRect(ctx, x, y, w, h, r) {
        const radius = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

    function drawMiniGateShape(ctx, type, s = 1) {
        ctx.beginPath();
        if (type === 'AND' || type === 'NAND') {
            ctx.moveTo(-12 * s, -10 * s);
            ctx.lineTo(0, -10 * s);
            ctx.arc(0, 0, 10 * s, -Math.PI / 2, Math.PI / 2, false);
            ctx.lineTo(-12 * s, 10 * s);
            ctx.closePath();
        } else if (type === 'OR' || type === 'NOR' || type === 'XOR' || type === 'XNOR') {
            const bx = (type === 'XOR' || type === 'XNOR') ? -11 * s : -12 * s;
            ctx.moveTo(bx, -10 * s);
            ctx.quadraticCurveTo(3 * s, -10 * s, 12 * s, 0);
            ctx.quadraticCurveTo(3 * s, 10 * s, bx, 10 * s);
            ctx.quadraticCurveTo(bx + 5 * s, 0, bx, -10 * s);
            ctx.closePath();
        } else {
            // NOT or BUF
            ctx.moveTo(-10 * s, -9 * s);
            ctx.lineTo(9 * s, 0);
            ctx.lineTo(-10 * s, 9 * s);
            ctx.closePath();
        }
    }

    class ICRenderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.view = { panX: 0, panY: 0, zoom: 1 };
            this.width = 0;
            this.height = 0;
            this.dpr = 1;
            this.xrayMode = true;
            this.onResize = () => {};

            if (typeof ResizeObserver !== 'undefined') {
                new ResizeObserver(() => {
                    this.resize();
                    this.onResize();
                }).observe(canvas);
            }
            this.resize();
        }

        resize() {
            const rect = this.canvas.getBoundingClientRect();
            const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
            const w = Math.max(1, Math.round(rect.width || 700));
            const h = Math.max(1, Math.round(rect.height || 480));
            const cw = Math.round(w * dpr);
            const ch = Math.round(h * dpr);
            if (this.width === w && this.height === h && this.dpr === dpr && this.canvas.width === cw && this.canvas.height === ch) {
                return;
            }
            this.width = w;
            this.height = h;
            this.dpr = dpr;
            this.canvas.width = cw;
            this.canvas.height = ch;
        }

        world(clientX, clientY) {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (clientX - rect.left - this.width / 2 - this.view.panX) / this.view.zoom,
                y: (clientY - rect.top - this.height / 2 - this.view.panY) / this.view.zoom
            };
        }

        fit(doc) {
            if (!doc.components.length) {
                this.view = { panX: 0, panY: 0, zoom: 1 };
                return;
            }
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const c of doc.components) {
                const b = getComponentBounds(c);
                minX = Math.min(minX, b.x);
                maxX = Math.max(maxX, b.x + b.w);
                minY = Math.min(minY, b.y);
                maxY = Math.max(maxY, b.y + b.h);
            }
            minX -= 80;
            maxX += 80;
            minY -= 70;
            maxY += 70;
            const zoom = Math.max(0.4, Math.min(1.25, this.width / Math.max(240, maxX - minX), this.height / Math.max(200, maxY - minY)));
            this.view = {
                zoom,
                panX: -((minX + maxX) / 2) * zoom,
                panY: -((minY + maxY) / 2) * zoom
            };
        }

        drawGrid() {
            const ctx = this.ctx;
            const { panX, panY, zoom } = this.view;
            ctx.save();
            ctx.translate(this.width / 2 + panX, this.height / 2 + panY);
            ctx.scale(zoom, zoom);

            const left = (-this.width / 2 - panX) / zoom;
            const right = (this.width / 2 - panX) / zoom;
            const top = (-this.height / 2 - panY) / zoom;
            const bottom = (this.height / 2 - panY) / zoom;
            const step = zoom < 0.5 ? GRID * 2 : GRID;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
            ctx.beginPath();
            const r = Math.max(0.8 / zoom, 0.6);
            for (let x = Math.floor(left / step) * step; x <= right; x += step) {
                for (let y = Math.floor(top / step) * step; y <= bottom; y += step) {
                    ctx.moveTo(x + r, y);
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                }
            }
            ctx.fill();
            ctx.restore();
        }

        traceWireWithHops(points, crossings = []) {
            const ctx = this.ctx;
            const n = points.length;
            if (n < 2) return [];
            const hopR = 6.0;
            const rCorner = new Array(n).fill(0);
            for (let i = 1; i < n - 1; i++) {
                const len1 = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
                const len2 = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
                if (len1 > 4 && len2 > 4) {
                    rCorner[i] = Math.min(6, len1 * 0.35, len2 * 0.35);
                }
            }

            if (crossings && crossings.length) {
                for (let i = 1; i < n; i++) {
                    const pA = points[i - 1];
                    const pB = points[i];
                    if (Math.abs(pA.y - pB.y) < 1e-4 && Math.abs(pB.x - pA.x) > 1e-4) {
                        const segIndex = i - 1;
                        const y = pA.y;
                        for (const c of crossings) {
                            if (c.segIndex === segIndex || Math.abs(c.y - y) < 1e-3) {
                                const dStart = Math.abs(c.x - pA.x);
                                const dEnd = Math.abs(c.x - pB.x);
                                rCorner[i - 1] = Math.min(rCorner[i - 1], Math.max(0, dStart - hopR - 1));
                                rCorner[i] = Math.min(rCorner[i], Math.max(0, dEnd - hopR - 1));
                            }
                        }
                    }
                }
            }

            const renderedArcs = [];
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);

            for (let i = 1; i < n; i++) {
                const pA = points[i - 1];
                const pB = points[i];
                const segIndex = i - 1;
                const dx = pB.x - pA.x;
                const dy = pB.y - pA.y;
                const len = Math.hypot(dx, dy);
                if (len < 1e-4) continue;

                const ux = dx / len;
                const uy = dy / len;
                const segStart = {
                    x: pA.x + ux * rCorner[i - 1],
                    y: pA.y + uy * rCorner[i - 1]
                };
                const segEnd = {
                    x: pB.x - ux * rCorner[i],
                    y: pB.y - uy * rCorner[i]
                };

                const isHoriz = Math.abs(uy) < 1e-4 && Math.abs(ux) > 0.5;
                if (isHoriz && crossings && crossings.length) {
                    const dirX = ux > 0 ? 1 : -1;
                    const y = pA.y;
                    const minX = Math.min(segStart.x, segEnd.x) + hopR + 0.5;
                    const maxX = Math.max(segStart.x, segEnd.x) - hopR - 0.5;
                    const xs = crossings
                        .filter(c => (c.segIndex === segIndex || Math.abs(c.y - y) < 1e-3) && c.x >= minX && c.x <= maxX)
                        .map(c => c.x)
                        .sort((a, b) => (a - b) * dirX);

                    const spans = [];
                    for (const cx of xs) {
                        if (!spans.length) {
                            spans.push({ centerX: cx, radius: hopR });
                        } else {
                            const prev = spans[spans.length - 1];
                            const dist = Math.abs(cx - prev.centerX);
                            if (dist < 1.5) continue;
                            if (dist < prev.radius + hopR + 2) {
                                const leftEdge = prev.centerX - dirX * prev.radius;
                                const rightEdge = cx + dirX * hopR;
                                prev.centerX = (leftEdge + rightEdge) / 2;
                                prev.radius = Math.min(11, Math.abs(rightEdge - leftEdge) / 2);
                            } else {
                                spans.push({ centerX: cx, radius: hopR });
                            }
                        }
                    }

                    for (const span of spans) {
                        ctx.lineTo(span.centerX - dirX * span.radius, y);
                        ctx.arc(span.centerX, y, span.radius, dirX > 0 ? Math.PI : 0, dirX > 0 ? 0 : Math.PI, dirX < 0);
                        renderedArcs.push({
                            centerX: span.centerX,
                            y,
                            radius: span.radius,
                            dirX
                        });
                    }
                }
                ctx.lineTo(segEnd.x, segEnd.y);
                if (i < n - 1 && rCorner[i] > 0) {
                    const pNext = points[i + 1];
                    ctx.arcTo(pB.x, pB.y, pNext.x, pNext.y, rCorner[i]);
                }
            }
            return renderedArcs;
        }

        drawWire(points, state = {}) {
            if (!points || points.length < 2) return;
            const ctx = this.ctx;
            const { value, conflict, selected, crossings = [], preview = false } = state;

            if (value === 1 && !preview && !conflict) {
                ctx.save();
                ctx.strokeStyle = COLORS.wire1Glow;
                ctx.lineWidth = selected ? 9 : 6.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                this.traceWireWithHops(points, crossings);
                ctx.stroke();
                ctx.restore();
            }

            let strokeColor = COLORS.wireFloat;
            if (preview) {
                strokeColor = COLORS.cyan;
            } else if (conflict) {
                strokeColor = COLORS.wireShort;
            } else if (selected) {
                strokeColor = COLORS.selected;
            } else if (value === 1) {
                strokeColor = COLORS.wire1;
            } else if (value === 0) {
                strokeColor = COLORS.wire0;
            }
            const mainWidth = selected ? 3.4 : value === 1 ? 2.6 : 2.1;

            ctx.save();
            if (preview) ctx.setLineDash([6, 5]);
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = mainWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            const arcs = this.traceWireWithHops(points, crossings);
            ctx.stroke();

            if (!preview && arcs && arcs.length) {
                for (const a of arcs) {
                    ctx.beginPath();
                    ctx.arc(a.centerX, a.y, a.radius, a.dirX > 0 ? Math.PI : 0, a.dirX > 0 ? 0 : Math.PI, a.dirX < 0);
                    ctx.strokeStyle = COLORS.bg;
                    ctx.lineWidth = mainWidth + 4.0;
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(a.centerX, a.y, a.radius, a.dirX > 0 ? Math.PI : 0, a.dirX > 0 ? 0 : Math.PI, a.dirX < 0);
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = mainWidth;
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        drawICPackage(comp, evalData, isSelected, autoPower) {
            const ctx = this.ctx;
            const spec = IC_CATALOG[comp.model];
            if (!spec) return;
            const icState = evalData.icStates.get(comp.id);
            const powered = Boolean(icState && icState.powered);
            const reversePower = Boolean(icState && icState.reversePower);

            ctx.save();
            ctx.translate(comp.position.x, comp.position.y);
            if (comp.rotation) {
                ctx.rotate((comp.rotation * Math.PI) / 180);
            }

            const bodyW = 260;
            const bodyH = 114;
            const halfW = bodyW / 2;
            const halfH = bodyH / 2;

            // 1. Metallic DIP-14 legs & pin numbers
            for (let p = 1; p <= 14; p++) {
                const loc = getDip14PinLocal(p);
                const pinKey = `${comp.id}:${p}`;
                const val = evalData.pinValues.get(pinKey);
                const isTop = loc.row === 'top';
                const legY0 = isTop ? -halfH : halfH;
                const legY1 = loc.y;

                // Metallic shoulder & leg
                ctx.strokeStyle = val === 1 ? COLORS.cyan : (p === 14 && powered) ? COLORS.vcc : '#8c9bb3';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(loc.x, legY0);
                ctx.lineTo(loc.x, legY1);
                ctx.stroke();

                // Auto-power mini rail badge on pins 14 & 7
                if (autoPower && (p === 14 || p === 7)) {
                    ctx.fillStyle = p === 14 ? 'rgba(255, 107, 107, 0.22)' : 'rgba(125, 146, 176, 0.22)';
                    roundedRect(ctx, loc.x - 13, isTop ? legY1 - 18 : legY1 + 5, 26, 13, 3);
                    ctx.fill();
                    ctx.fillStyle = p === 14 ? '#ff8b8b' : '#b8c6db';
                    ctx.font = '700 8.5px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(p === 14 ? '+5V' : 'GND', loc.x, isTop ? legY1 - 11.5 : legY1 + 11.5);
                }
            }

            // 2. DIP-14 Package Body (Semi-Transparent X-Ray vs Opaque Ceramic)
            roundedRect(ctx, -halfW, -halfH, bodyW, bodyH, 8);
            ctx.fillStyle = this.xrayMode ? COLORS.icBodyXray : COLORS.icBodyOpaque;
            ctx.fill();

            ctx.lineWidth = isSelected ? 2.6 : 1.8;
            ctx.strokeStyle = reversePower
                ? COLORS.icStrokeFault
                : isSelected
                ? COLORS.selected
                : powered
                ? 'rgba(61, 217, 255, 0.65)'
                : COLORS.icStroke;
            ctx.stroke();

            // Left orientation half-moon notch
            ctx.beginPath();
            ctx.arc(-halfW, 0, 11, -Math.PI / 2, Math.PI / 2, false);
            ctx.fillStyle = '#06070b';
            ctx.fill();
            ctx.stroke();

            // Pin 1 orientation dot
            ctx.beginPath();
            ctx.arc(-halfW + 16, halfH - 14, 3.2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.fill();

            // 3. Pin Labels inside package rim (1..14, VCC, GND)
            ctx.font = '700 9.5px "JetBrains Mono", Consolas, monospace';
            ctx.textAlign = 'center';
            for (let p = 1; p <= 14; p++) {
                const loc = getDip14PinLocal(p);
                const isTop = loc.row === 'top';
                const labelY = isTop ? -halfH + 10 : halfH - 10;
                if (p === 14) {
                    ctx.fillStyle = '#ff8080';
                    ctx.fillText('14·VCC', loc.x + 2, labelY);
                } else if (p === 7) {
                    ctx.fillStyle = '#9db2ce';
                    ctx.fillText('7·GND', loc.x - 2, labelY);
                } else {
                    ctx.fillStyle = 'rgba(230, 238, 248, 0.78)';
                    ctx.fillText(String(p), loc.x, labelY);
                }
            }

            // 4. Semi-Transparent Datasheet Internal Gate Diagram (when X-Ray is ON)
            if (this.xrayMode) {
                // Subtle center watermark of IC model
                ctx.save();
                ctx.font = '800 22px "JetBrains Mono", Consolas, monospace';
                ctx.fillStyle = powered ? 'rgba(61, 217, 255, 0.11)' : 'rgba(255, 255, 255, 0.06)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(comp.model, 0, 0);
                ctx.restore();

                for (const g of spec.gates) {
                    const gState = icState?.gates?.get(g.id);
                    const outVal = gState ? gState.outVal : null;
                    const activeHigh = powered && outVal === 1;
                    const activeLow = powered && outVal === 0;

                    const dir = g.dir || 1;
                    const gx = g.gx;
                    const gy = g.gy;
                    const scale = spec.fanIn === 1 ? 0.78 : 0.88;

                    // Draw micro-traces from each input pin to the miniature gate input side
                    const numIn = g.inputs.length;
                    g.inputs.forEach((inPin, idx) => {
                        const pLoc = getDip14PinLocal(inPin);
                        const pinVal = evalData.pinValues.get(`${comp.id}:${inPin}`);
                        const offsetSpan = numIn === 1 ? 0 : numIn === 2 ? 4.5 : 6.5;
                        const targetY = gy + (numIn === 1 ? 0 : -offsetSpan + (idx / (numIn - 1)) * (offsetSpan * 2));
                        const targetX = gx - dir * 11 * scale;
                        const startY = pLoc.row === 'top' ? -halfH + 17 : halfH - 17;

                        ctx.beginPath();
                        ctx.moveTo(pLoc.x, startY);
                        const midY = (startY + targetY) / 2;
                        ctx.lineTo(pLoc.x, midY);
                        ctx.lineTo(targetX, midY);
                        ctx.lineTo(targetX, targetY);
                        ctx.strokeStyle = pinVal === 1
                            ? 'rgba(61, 217, 255, 0.85)'
                            : pinVal === 0
                            ? 'rgba(130, 150, 180, 0.52)'
                            : 'rgba(255, 255, 255, 0.22)';
                        ctx.lineWidth = pinVal === 1 ? 1.5 : 1.15;
                        ctx.stroke();
                    });

                    // Draw micro-trace from miniature gate output to the output pin
                    const outLoc = getDip14PinLocal(g.output);
                    const hasBubble = g.type === 'NAND' || g.type === 'NOR' || g.type === 'XNOR' || g.type === 'NOT';
                    const outTipX = gx + dir * ((hasBubble ? 14.5 : 11.5) * scale);
                    const outEndY = outLoc.row === 'top' ? -halfH + 17 : halfH - 17;

                    ctx.beginPath();
                    ctx.moveTo(outTipX, gy);
                    ctx.lineTo(outLoc.x, gy);
                    ctx.lineTo(outLoc.x, outEndY);
                    ctx.strokeStyle = activeHigh
                        ? '#3dd9ff'
                        : activeLow
                        ? 'rgba(143, 160, 181, 0.65)'
                        : 'rgba(255, 255, 255, 0.25)';
                    ctx.lineWidth = activeHigh ? 1.8 : 1.25;
                    ctx.stroke();

                    // Draw the miniature gate symbol itself
                    ctx.save();
                    ctx.translate(gx, gy);
                    if (dir < 0) ctx.scale(-1, 1);

                    drawMiniGateShape(ctx, g.type, scale);
                    ctx.fillStyle = activeHigh ? 'rgba(61, 217, 255, 0.20)' : 'rgba(17, 24, 39, 0.92)';
                    ctx.fill();
                    ctx.lineWidth = 1.4;
                    ctx.strokeStyle = activeHigh ? '#3dd9ff' : powered ? '#c5d3e8' : '#6e7d94';
                    ctx.stroke();

                    if (g.type === 'XOR' || g.type === 'XNOR') {
                        ctx.beginPath();
                        ctx.moveTo(-14.5 * scale, -10 * scale);
                        ctx.quadraticCurveTo(-9.5 * scale, 0, -14.5 * scale, 10 * scale);
                        ctx.stroke();
                    }

                    if (hasBubble) {
                        const bx = (g.type === 'NOT' ? 11.8 : 13.8) * scale;
                        ctx.beginPath();
                        ctx.arc(bx, 0, 2.3 * scale, 0, Math.PI * 2);
                        ctx.fillStyle = activeHigh ? '#3dd9ff' : '#10141f';
                        ctx.fill();
                        ctx.stroke();
                    }
                    ctx.restore();
                }

                // Model badge on left side near notch
                ctx.fillStyle = powered ? '#3dd9ff' : '#d5dfed';
                ctx.font = '700 11px "JetBrains Mono", Consolas, monospace';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(comp.model, -halfW + 16, 0);
            } else {
                // Opaque Black-Box Mode (for testing datasheet knowledge!)
                ctx.fillStyle = '#e8eef7';
                ctx.font = '700 18px "JetBrains Mono", Consolas, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(spec.partNumber, 0, -6);
                ctx.fillStyle = '#8fa0b5';
                ctx.font = '600 11px "Inter", sans-serif';
                ctx.fillText(`Model ${comp.model} · 14-Pin DIP`, 0, 14);
            }

            // Status / Fault pill on top border of IC
            if (reversePower) {
                ctx.fillStyle = 'rgba(255, 90, 82, 0.92)';
                roundedRect(ctx, -64, -8, 128, 16, 4);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.font = '700 9.5px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('⚠ REVERSE POWER!', 0, 0);
            }

            ctx.restore();
        }

        drawBenchComponent(comp, evalData, isSelected) {
            const ctx = this.ctx;
            ctx.save();
            ctx.translate(comp.position.x, comp.position.y);
            if (comp.rotation) {
                ctx.rotate((comp.rotation * Math.PI) / 180);
            }

            if (comp.kind === 'battery') {
                // Leads to -36 and +36
                ctx.strokeStyle = '#7d92b0';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(-36, 0);
                ctx.lineTo(-24, 0);
                ctx.stroke();

                ctx.strokeStyle = '#ff6b6b';
                ctx.beginPath();
                ctx.moveTo(24, 0);
                ctx.lineTo(36, 0);
                ctx.stroke();

                // Battery body: dark slate negative side + copper/amber positive cap
                roundedRect(ctx, -24, -18, 48, 36, 6);
                ctx.fillStyle = '#121722';
                ctx.fill();

                ctx.save();
                ctx.beginPath();
                ctx.rect(6, -18, 18, 36);
                ctx.clip();
                roundedRect(ctx, -24, -18, 48, 36, 6);
                ctx.fillStyle = 'rgba(255, 107, 107, 0.28)';
                ctx.fill();
                ctx.restore();

                ctx.lineWidth = isSelected ? 2.4 : 1.6;
                ctx.strokeStyle = isSelected ? COLORS.selected : '#b9c6da';
                roundedRect(ctx, -24, -18, 48, 36, 6);
                ctx.stroke();

                // Positive nub
                roundedRect(ctx, 24, -7, 4, 14, 2);
                ctx.fillStyle = '#ff6b6b';
                ctx.fill();

                // Labels
                ctx.font = '700 10.5px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#9db2ce';
                ctx.fillText('−', -15, -7);
                ctx.fillStyle = '#ff8080';
                ctx.fillText('+', 15, -7);
                ctx.fillStyle = '#f4f7fb';
                ctx.font = '700 10px "Inter", sans-serif';
                ctx.fillText('5V DC', -2, 8);
            } else if (comp.kind === 'switch') {
                const outVal = evalData.pinValues.get(`${comp.id}:out`);
                roundedRect(ctx, -26, -18, 52, 36, 7);
                ctx.fillStyle = comp.closed ? 'rgba(61, 217, 255, 0.12)' : '#10141f';
                ctx.fill();
                ctx.lineWidth = isSelected ? 2.4 : 1.6;
                ctx.strokeStyle = isSelected ? COLORS.selected : comp.closed ? '#3dd9ff' : '#9fb0c7';
                ctx.stroke();

                // Leads
                ctx.beginPath();
                ctx.moveTo(-36, 0);
                ctx.lineTo(-14, 0);
                ctx.moveTo(14, 0);
                ctx.lineTo(36, 0);
                ctx.strokeStyle = outVal === 1 ? '#3dd9ff' : '#8fa0b5';
                ctx.lineWidth = 2.4;
                ctx.stroke();

                // Switch blade
                ctx.beginPath();
                ctx.moveTo(-14, 0);
                if (comp.closed) {
                    ctx.lineTo(14, 0);
                } else {
                    ctx.lineTo(11, -11);
                }
                ctx.strokeStyle = comp.closed ? '#3dd9ff' : '#f6b944';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Contact terminals
                ctx.fillStyle = '#e8eef7';
                ctx.beginPath();
                ctx.arc(-14, 0, 3, 0, Math.PI * 2);
                ctx.arc(14, 0, 3, 0, Math.PI * 2);
                ctx.fill();

                // Label below
                ctx.fillStyle = comp.closed ? '#3dd9ff' : '#96a5ba';
                ctx.font = '700 9.5px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${comp.label || 'SW'}: ${comp.closed ? 'ON (1)' : 'OFF (0)'}`, 0, 28);
            } else if (comp.kind === 'resistor') {
                const valA = evalData.pinValues.get(`${comp.id}:a`);
                // Leads
                ctx.beginPath();
                ctx.moveTo(-36, 0);
                ctx.lineTo(-20, 0);
                ctx.moveTo(20, 0);
                ctx.lineTo(36, 0);
                ctx.strokeStyle = valA === 1 ? '#3dd9ff' : '#9fb0c7';
                ctx.lineWidth = 2.4;
                ctx.stroke();

                // Axial resistor body
                roundedRect(ctx, -20, -9, 40, 18, 5);
                ctx.fillStyle = '#2a241b';
                ctx.fill();
                ctx.lineWidth = isSelected ? 2.3 : 1.5;
                ctx.strokeStyle = isSelected ? COLORS.selected : '#d1b894';
                ctx.stroke();

                // 220 Ω Color bands (Red, Red, Brown, Gold)
                const bands = [
                    { x: -11, color: '#ff5252' },
                    { x: -4, color: '#ff5252' },
                    { x: 3, color: '#a16236' },
                    { x: 11, color: '#f6b944' }
                ];
                for (const b of bands) {
                    ctx.fillStyle = b.color;
                    ctx.fillRect(b.x, -8, 3, 16);
                }

                ctx.fillStyle = '#96a5ba';
                ctx.font = '600 9.5px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(comp.label || '220Ω', 0, 20);
            } else if (comp.kind === 'lamp') {
                const lState = evalData.lampStates.get(comp.id);
                const lit = Boolean(lState && lState.lit);
                const lampColor = COLORS[comp.color] || COLORS.emerald;

                // Leads (-36 Anode, +36 Cathode)
                ctx.beginPath();
                ctx.moveTo(-36, 0);
                ctx.lineTo(-18, 0);
                ctx.moveTo(18, 0);
                ctx.lineTo(36, 0);
                ctx.strokeStyle = lit ? lampColor : '#8fa0b5';
                ctx.lineWidth = 2.4;
                ctx.stroke();

                // Outer radial glow when ON
                if (lit) {
                    const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
                    grad.addColorStop(0, lampColor);
                    grad.addColorStop(0.45, lampColor + '55');
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, 0, 34, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Lamp housing & lens
                ctx.beginPath();
                ctx.arc(0, 0, 18, 0, Math.PI * 2);
                ctx.fillStyle = lit ? lampColor : '#121722';
                ctx.fill();
                ctx.lineWidth = isSelected ? 2.5 : 1.8;
                ctx.strokeStyle = isSelected ? COLORS.selected : lit ? '#ffffff' : '#9fb0c7';
                ctx.stroke();

                // Filament / LED inner dome reflection
                ctx.beginPath();
                ctx.arc(-5, -5, 5, 0, Math.PI * 2);
                ctx.fillStyle = lit ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255, 255, 255, 0.08)';
                ctx.fill();

                // Polarity markers (+ / -)
                ctx.font = '700 9px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ff9c95';
                ctx.fillText('+', -25, -8);
                ctx.fillStyle = '#9db2ce';
                ctx.fillText('−', 25, -8);

                ctx.fillStyle = lit ? '#ffffff' : '#96a5ba';
                ctx.font = '700 9.5px "Inter", sans-serif';
                ctx.fillText(`${comp.label || 'LED'}: ${lit ? 'ON' : 'OFF'}`, 0, 29);
            } else if (comp.kind === 'gnd') {
                ctx.strokeStyle = isSelected ? COLORS.selected : '#9db2ce';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(0, -18);
                ctx.lineTo(0, 0);
                ctx.moveTo(-14, 0);
                ctx.lineTo(14, 0);
                ctx.moveTo(-9, 6);
                ctx.lineTo(9, 6);
                ctx.moveTo(-4, 12);
                ctx.lineTo(4, 12);
                ctx.stroke();

                ctx.fillStyle = '#8fa0b5';
                ctx.font = '700 9px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('GND', 0, 23);
            } else if (comp.kind === 'clock') {
                const isHigh = comp.value === 1;
                roundedRect(ctx, -28, -18, 56, 36, 7);
                ctx.fillStyle = isHigh ? 'rgba(61, 217, 255, 0.16)' : '#10141f';
                ctx.fill();
                ctx.lineWidth = isSelected ? 2.4 : 1.7;
                ctx.strokeStyle = isSelected ? COLORS.selected : isHigh ? '#3dd9ff' : '#9fb0c7';
                ctx.stroke();

                // Lead to +36
                ctx.beginPath();
                ctx.moveTo(28, 0);
                ctx.lineTo(36, 0);
                ctx.strokeStyle = isHigh ? '#3dd9ff' : '#8fa0b5';
                ctx.lineWidth = 2.4;
                ctx.stroke();

                // Square wave icon
                ctx.beginPath();
                ctx.moveTo(-18, 4);
                ctx.lineTo(-12, 4);
                ctx.lineTo(-12, -6);
                ctx.lineTo(-2, -6);
                ctx.lineTo(-2, 4);
                ctx.lineTo(8, 4);
                ctx.lineTo(8, -6);
                ctx.lineTo(16, -6);
                ctx.strokeStyle = isHigh ? '#3dd9ff' : '#c5d3e8';
                ctx.lineWidth = 1.8;
                ctx.stroke();

                ctx.fillStyle = isHigh ? '#3dd9ff' : '#96a5ba';
                ctx.font = '700 9px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`CLK:${comp.value}`, 0, 12);
            } else if (comp.kind === 'seg7') {
                const segState = evalData.segStates.get(comp.id);
                const val = segState ? segState.value : null;

                roundedRect(ctx, -26, -64, 64, 128, 8);
                ctx.fillStyle = '#0c0f17';
                ctx.fill();
                ctx.lineWidth = isSelected ? 2.4 : 1.7;
                ctx.strokeStyle = isSelected ? COLORS.selected : '#9fb0c7';
                ctx.stroke();

                // Input leads & labels A, B, C, D
                const labels = ['A', 'B', 'C', 'D'];
                const ys = [-54, -18, 18, 54];
                ctx.font = '700 9px "JetBrains Mono", monospace';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                for (let i = 0; i < 4; i++) {
                    const bVal = segState?.bits?.[i];
                    ctx.beginPath();
                    ctx.moveTo(-36, ys[i]);
                    ctx.lineTo(-26, ys[i]);
                    ctx.strokeStyle = bVal === 1 ? '#3dd9ff' : '#7d92b0';
                    ctx.lineWidth = 2.2;
                    ctx.stroke();
                    ctx.fillStyle = bVal === 1 ? '#3dd9ff' : '#96a5ba';
                    ctx.fillText(labels[i], -21, ys[i]);
                }

                // 7-segment bars centered at x = 10, y = 0
                const MASKS = [
                    0b0111111, // 0
                    0b0000110, // 1
                    0b1011011, // 2
                    0b1001111, // 3
                    0b1100110, // 4
                    0b1101101, // 5
                    0b1111101, // 6
                    0b0000111, // 7
                    0b1111111, // 8
                    0b1101111, // 9
                    0b1110111, // A
                    0b1111100, // b
                    0b0111001, // C
                    0b1011110, // d
                    0b1111001, // E
                    0b1110001  // F
                ];
                const mask = val !== null ? MASKS[val & 0x0f] : 0;
                const segs = [
                    { bit: 0, x1: -2, y1: -36, x2: 20, y2: -36 }, // a (top)
                    { bit: 1, x1: 20, y1: -36, x2: 20, y2: 0 },   // b (top-right)
                    { bit: 2, x1: 20, y1: 0, x2: 20, y2: 36 },    // c (bot-right)
                    { bit: 3, x1: -2, y1: 36, x2: 20, y2: 36 },   // d (bottom)
                    { bit: 4, x1: -2, y1: 0, x2: -2, y2: 36 },    // e (bot-left)
                    { bit: 5, x1: -2, y1: -36, x2: -2, y2: 0 },   // f (top-left)
                    { bit: 6, x1: -2, y1: 0, x2: 20, y2: 0 }      // g (middle)
                ];
                ctx.lineCap = 'round';
                for (const s of segs) {
                    const on = Boolean(mask & (1 << s.bit));
                    ctx.beginPath();
                    ctx.moveTo(s.x1, s.y1);
                    ctx.lineTo(s.x2, s.y2);
                    ctx.strokeStyle = on ? '#3dd9ff' : 'rgba(255,255,255,0.08)';
                    ctx.lineWidth = on ? 4.2 : 3;
                    ctx.stroke();
                }
            }

            ctx.restore();
        }

        drawPinPad(pin, val, isHovered, isWireStart) {
            const ctx = this.ctx;
            ctx.save();
            ctx.beginPath();
            const r = isHovered || isWireStart ? 5.6 : 4.0;
            ctx.arc(pin.x, pin.y, r, 0, Math.PI * 2);
            ctx.fillStyle = isHovered || isWireStart
                ? '#f6b944'
                : val === 1
                ? '#3dd9ff'
                : val === 0
                ? '#1b2436'
                : '#141824';
            ctx.fill();
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = isHovered || isWireStart
                ? '#ffffff'
                : val === 1
                ? '#9beeff'
                : '#8fa0b5';
            ctx.stroke();
            ctx.restore();
        }

        render(doc, evalData, uiState = {}) {
            this.resize();
            const ctx = this.ctx;
            ctx.save();
            ctx.scale(this.dpr, this.dpr);
            ctx.fillStyle = COLORS.bg;
            ctx.fillRect(0, 0, this.width, this.height);

            this.drawGrid();

            ctx.save();
            ctx.translate(this.width / 2 + this.view.panX, this.height / 2 + this.view.panY);
            ctx.scale(this.view.zoom, this.view.zoom);

            // 1. Draw wires with smooth curved jump-overs at crossings
            const wireGeom = computeICWireGeometry(doc, evalData.pins, evalData.pinToNet);
            for (const w of doc.wires) {
                const pts = wireGeom.routes.get(w.id);
                const crossings = wireGeom.crossingsByWire.get(w.id) || [];
                const val = evalData.pinValues.get(w.from);
                const conflict = evalData.pinConflicts.get(w.from);
                const isSelected = uiState.selected && uiState.selected.kind === 'wire' && uiState.selected.id === w.id;
                this.drawWire(pts, { value: val, conflict, selected: isSelected, crossings });
            }

            // Draw T-junction dots where same-net wires branch
            if (wireGeom.junctions && wireGeom.junctions.length) {
                for (const j of wireGeom.junctions) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(j.x, j.y, 4.0, 0, Math.PI * 2);
                    ctx.fillStyle = COLORS.cyan;
                    ctx.fill();
                    ctx.lineWidth = 1.2;
                    ctx.strokeStyle = COLORS.bg;
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // Active wire drag preview
            if (uiState.wireStartPin && uiState.cursorWorld) {
                const endTarget = (uiState.hoverPinKey && evalData.pins.get(uiState.hoverPinKey)) || uiState.cursorWorld;
                const previewPts = routeICWire(uiState.wireStartPin, endTarget, [], doc);
                this.drawWire(previewPts, { preview: true });
            }

            // 2. Draw components
            for (const comp of doc.components) {
                const isSelected = uiState.selected && uiState.selected.kind === 'comp' && uiState.selected.id === comp.id;
                if (comp.kind === 'ic') {
                    this.drawICPackage(comp, evalData, isSelected, doc.autoPower);
                } else {
                    this.drawBenchComponent(comp, evalData, isSelected);
                }
            }

            // Ghost placement preview when a component/IC tool is selected
            if (uiState.ghostComp) {
                ctx.save();
                ctx.globalAlpha = 0.55;
                if (uiState.ghostComp.kind === 'ic') {
                    this.drawICPackage(uiState.ghostComp, evalData, false, doc.autoPower);
                } else {
                    this.drawBenchComponent(uiState.ghostComp, evalData, false);
                }
                ctx.restore();
            }

            // 3. Draw pin connection pads
            for (const [key, pin] of evalData.pins.entries()) {
                const val = evalData.pinValues.get(key);
                const isHovered = uiState.hoverPinKey === key;
                const isStart = uiState.wireStartPin && uiState.wireStartPin.key === key;
                this.drawPinPad(pin, val, isHovered, isStart);
            }

            // 4. Hover pin tooltip on canvas
            if (uiState.hoverPinKey && evalData.pins.has(uiState.hoverPinKey)) {
                const hp = evalData.pins.get(uiState.hoverPinKey);
                const v = evalData.pinValues.get(uiState.hoverPinKey);
                const stateStr = v === 1 ? 'HIGH (5V)' : v === 0 ? 'LOW (0V)' : 'OPEN';
                const label = `${hp.title} · ${stateStr}`;
                ctx.font = '600 11px "Inter", sans-serif';
                const tw = ctx.measureText(label).width + 14;
                const tx = hp.x - tw / 2;
                const ty = hp.y - 30;
                roundedRect(ctx, tx, ty, tw, 20, 5);
                ctx.fillStyle = 'rgba(10, 14, 24, 0.94)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(61, 217, 255, 0.55)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.fillStyle = '#f4f7fb';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, hp.x, ty + 10);
            }

            ctx.restore();
            ctx.restore();
        }
    }

    // =========================================================================
    // 7. INTERACTIVE UI CONTROLLER (WHEN RUNNING IN BROWSER)
    // =========================================================================
    function initICLabBrowser() {
        if (typeof document === 'undefined') return;
        const $ = id => document.getElementById(id);
        const canvas = $('icCanvas');
        if (!canvas) return;

        // Mode Switcher between Logic Gates Simulator & Logic IC Lab
        const btnGates = $('btnModeGates');
        const btnIC = $('btnModeIC');
        const gatesMain = $('gatesMain');
        const icMain = $('icMain');
        const gatesTopControls = $('gatesTopControls');
        const icTopControls = $('icTopControls');

        const renderer = new ICRenderer(canvas);
        let currentDoc = blankICDoc();
        const undoStack = [];
        const redoStack = [];

        let tool = 'select';
        let placementRotation = 0;
        let selected = null; // { kind: 'comp' | 'wire', id }
        let wireStartPin = null;
        let hoverPinKey = null;
        let cursorWorld = null;
        let dragState = null;
        let pinchState = null;
        const activePointers = new Map();
        let evalData = evaluateICBench(currentDoc);
        let frameScheduled = false;

        function scheduleRender() {
            if (frameScheduled) return;
            frameScheduled = true;
            requestAnimationFrame(() => {
                frameScheduled = false;
                let ghostComp = null;
                if (cursorWorld && isPlacementTool(tool)) {
                    const snap = $('icSnapToggle')?.checked;
                    const pos = snapICPoint(cursorWorld, snap);
                    ghostComp = createICComponent(tool, pos.x, pos.y, {
                        id: '__ghost__',
                        rotation: placementRotation
                    });
                }
                renderer.render(currentDoc, evalData, {
                    selected,
                    wireStartPin,
                    hoverPinKey,
                    cursorWorld,
                    ghostComp
                });
            });
        }

        function setHint(msg, isWarn = false) {
            const el = $('icToolHint');
            if (!el) return;
            el.textContent = msg;
            el.style.color = isWarn ? '#f6b944' : '#96a5ba';
        }

        function autoConnectDroppedComponent(doc, compId) {
            const comp = doc.components.find(c => c.id === compId);
            if (!comp) return;
            const myPins = getComponentPins(comp);
            const all = allICPins(doc);
            for (const mp of myPins) {
                for (const op of all.values()) {
                    if (op.compId === compId) continue;
                    if (Math.hypot(mp.x - op.x, mp.y - op.y) <= 6) {
                        connectICWire(doc, mp.key, op.key);
                    }
                }
            }
        }

        function commitDoc(nextDoc) {
            undoStack.push(cloneICDoc(currentDoc));
            if (undoStack.length > 60) undoStack.shift();
            redoStack.length = 0;
            currentDoc = nextDoc;
            recompute();
        }

        function recompute() {
            evalData = evaluateICBench(currentDoc);
            $('icUndoBtn').disabled = undoStack.length === 0;
            $('icRedoBtn').disabled = redoStack.length === 0;
            $('icAutoPowerToggle').checked = Boolean(currentDoc.autoPower);
            const rotBtn = $('icRotatePlacementBtn');
            if (rotBtn) rotBtn.hidden = !isPlacementTool(tool);
            syncInspector();
            syncSidebarSummary();
            syncFooter();
            scheduleRender();
        }

        function setTool(nextTool) {
            tool = nextTool;
            wireStartPin = null;
            document.querySelectorAll('#icToolsNav button[data-ic-tool]').forEach(btn => {
                btn.setAttribute('aria-pressed', String(btn.dataset.icTool === tool));
            });
            const rotBtn = $('icRotatePlacementBtn');
            if (rotBtn) rotBtn.hidden = !isPlacementTool(tool);
            if (IC_CATALOG[tool]) {
                setHint(`Click on the bench to place IC ${tool} (Press R to rotate · Pin 14 = VCC, Pin 7 = GND).`);
            } else if (tool === 'battery') {
                setHint('Click on the bench to place a 5V DC Battery (+5V and GND terminals · Press R to rotate).');
            } else if (tool === 'switch') {
                setHint('Click on the bench to place a Toggle Switch (Press R to rotate). Click any placed switch to flip it ON/OFF.');
            } else if (tool === 'resistor') {
                setHint('Click on the bench to place a 220 Ω series resistor (Press R to rotate).');
            } else if (tool === 'lamp') {
                setHint('Click on the bench to place an Indicator Lamp / LED (Press R to rotate).');
            } else if (tool === 'wire') {
                setHint('Drag from any pin pad to another pin pad (or existing wire) to connect. Drag wire segments to adjust routing.');
            } else {
                setHint('Click any Switch to toggle, drag from any pin to wire, drag wire segments to reroute, or press R to rotate.');
            }
            scheduleRender();
        }

        // Populate IC Presets dropdown
        const presetSelect = $('icExampleSelect');
        if (presetSelect) {
            for (const [id, p] of Object.entries(IC_PRESETS)) {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = p.title;
                presetSelect.appendChild(opt);
            }
            presetSelect.addEventListener('change', () => {
                const id = presetSelect.value;
                if (!id || !IC_PRESETS[id]) return;
                commitDoc(IC_PRESETS[id].build());
                selected = null;
                wireStartPin = null;
                renderer.fit(currentDoc);
                recompute();
                setHint(IC_PRESETS[id].description);
            });
        }

        // Mode switcher handlers
        function switchMode(mode) {
            const isIC = mode === 'ic';
            btnGates.classList.toggle('active', !isIC);
            btnGates.setAttribute('aria-selected', String(!isIC));
            btnIC.classList.toggle('active', isIC);
            btnIC.setAttribute('aria-selected', String(isIC));

            gatesMain.hidden = isIC;
            icMain.hidden = !isIC;
            gatesTopControls.hidden = isIC;
            icTopControls.hidden = !isIC;

            if (isIC) {
                renderer.resize();
                recompute();
            } else if (root.LogicLab && typeof root.LogicLab.onGatesModeShown === 'function') {
                root.LogicLab.onGatesModeShown();
            }
        }

        if (btnGates && btnIC) {
            btnGates.addEventListener('click', () => switchMode('gates'));
            btnIC.addEventListener('click', () => switchMode('ic'));
        }

        // Top controls
        $('icUndoBtn')?.addEventListener('click', () => {
            if (!undoStack.length) return;
            redoStack.push(cloneICDoc(currentDoc));
            currentDoc = undoStack.pop();
            selected = null;
            recompute();
        });

        $('icRedoBtn')?.addEventListener('click', () => {
            if (!redoStack.length) return;
            undoStack.push(cloneICDoc(currentDoc));
            currentDoc = redoStack.pop();
            selected = null;
            recompute();
        });

        $('icClearBtn')?.addEventListener('click', () => {
            commitDoc(blankICDoc());
            selected = null;
            wireStartPin = null;
            if (presetSelect) presetSelect.value = '';
            renderer.fit(currentDoc);
            recompute();
            setHint('IC Bench cleared. Place a 74xx IC, 5V Battery, Switches, Resistor, and Lamp.');
        });

        // Subbar toggles
        $('icXrayToggle')?.addEventListener('change', e => {
            renderer.xrayMode = e.target.checked;
            scheduleRender();
        });

        $('icAutoPowerToggle')?.addEventListener('change', e => {
            const next = cloneICDoc(currentDoc);
            next.autoPower = e.target.checked;
            commitDoc(next);
        });

        // Zoom controls
        const zoomBy = factor => {
            const nextZoom = Math.max(0.35, Math.min(2.2, renderer.view.zoom * factor));
            const ratio = nextZoom / renderer.view.zoom;
            renderer.view.panX *= ratio;
            renderer.view.panY *= ratio;
            renderer.view.zoom = nextZoom;
            scheduleRender();
        };
        $('icZoomInBtn')?.addEventListener('click', () => zoomBy(1.2));
        $('icZoomOutBtn')?.addEventListener('click', () => zoomBy(1 / 1.2));
        $('icFitBtn')?.addEventListener('click', () => {
            renderer.fit(currentDoc);
            scheduleRender();
        });

        // Tool buttons (support both click-to-select and drag-to-canvas)
        document.querySelectorAll('#icToolsNav button[data-ic-tool]').forEach(btn => {
            btn.addEventListener('click', () => setTool(btn.dataset.icTool));
            btn.addEventListener('pointerdown', e => {
                if (e.button !== 0 && e.pointerType === 'mouse') return;
                const nextTool = btn.dataset.icTool;
                if (!isPlacementTool(nextTool)) return;
                setTool(nextTool);
                dragState = {
                    type: 'toolbarDrag',
                    tool: nextTool,
                    startClientX: e.clientX,
                    startClientY: e.clientY
                };
            });
        });

        window.addEventListener('pointermove', e => {
            if (!dragState || dragState.type !== 'toolbarDrag') return;
            const rect = canvas.getBoundingClientRect();
            const over = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
            cursorWorld = over ? renderer.world(e.clientX, e.clientY) : null;
            scheduleRender();
        });

        window.addEventListener('pointerup', e => {
            if (!dragState || dragState.type !== 'toolbarDrag') return;
            const rect = canvas.getBoundingClientRect();
            const over = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
            const dist = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
            const activeTool = dragState.tool;
            dragState = null;
            if (over && dist > 12 && isPlacementTool(activeTool)) {
                const worldPt = renderer.world(e.clientX, e.clientY);
                const snap = $('icSnapToggle')?.checked && !e.shiftKey;
                const pos = snapICPoint(worldPt, snap);
                const next = cloneICDoc(currentDoc);
                const comp = createICComponent(activeTool, pos.x, pos.y, { rotation: placementRotation });
                next.components.push(comp);
                autoConnectDroppedComponent(next, comp.id);
                commitDoc(next);
                selected = { kind: 'comp', id: comp.id };
                if (!$('icRepeatToggle')?.checked) {
                    setTool('select');
                }
                recompute();
            }
        });

        $('icRotatePlacementBtn')?.addEventListener('click', () => {
            placementRotation = (placementRotation + 90) % 360;
            scheduleRender();
        });

        function rotateSelectedComponent() {
            if (!selected || selected.kind !== 'comp') return false;
            const next = cloneICDoc(currentDoc);
            const comp = next.components.find(c => c.id === selected.id);
            if (!comp) return false;
            comp.rotation = ((comp.rotation || 0) + 90) % 360;
            commitDoc(next);
            return true;
        }

        $('icRotateBtn')?.addEventListener('click', rotateSelectedComponent);

        // Quick-reference table rows click to select IC tool
        document.querySelectorAll('#icCatalogTableBody tr[data-ic-ref]').forEach(row => {
            row.addEventListener('click', () => {
                setTool(row.dataset.icRef);
            });
        });

        // Inspector controls
        $('icCloseInspectorBtn')?.addEventListener('click', () => {
            selected = null;
            syncInspector();
            scheduleRender();
        });

        $('icToggleSelectedBtn')?.addEventListener('click', () => {
            if (!selected || selected.kind !== 'comp') return;
            const comp = currentDoc.components.find(c => c.id === selected.id);
            if (!comp) return;
            if (comp.kind === 'switch') {
                comp.closed = !comp.closed;
                recompute();
            } else if (comp.kind === 'clock') {
                comp.value = comp.value ? 0 : 1;
                recompute();
            }
        });

        $('icLampColorSelect')?.addEventListener('change', e => {
            if (!selected || selected.kind !== 'comp') return;
            const next = cloneICDoc(currentDoc);
            const comp = next.components.find(c => c.id === selected.id);
            if (comp && comp.kind === 'lamp') {
                comp.color = e.target.value;
                commitDoc(next);
            }
        });

        $('icDuplicateBtn')?.addEventListener('click', () => {
            if (!selected || selected.kind !== 'comp') return;
            const orig = currentDoc.components.find(c => c.id === selected.id);
            if (!orig) return;
            const next = cloneICDoc(currentDoc);
            const copy = cloneICDoc(orig);
            copy.id = uid(orig.kind);
            copy.position = { x: orig.position.x + 36, y: orig.position.y + 36 };
            next.components.push(copy);
            commitDoc(next);
            selected = { kind: 'comp', id: copy.id };
            recompute();
        });

        function deleteSelected() {
            if (!selected) return;
            const next = cloneICDoc(currentDoc);
            if (selected.kind === 'wire') {
                next.wires = next.wires.filter(w => w.id !== selected.id);
            } else if (selected.kind === 'comp') {
                const cid = selected.id;
                next.components = next.components.filter(c => c.id !== cid);
                next.wires = next.wires.filter(w => !w.from.startsWith(cid + ':') && !w.to.startsWith(cid + ':'));
            }
            selected = null;
            commitDoc(next);
        }

        $('icDeleteBtn')?.addEventListener('click', deleteSelected);

        function syncInspector() {
            const card = $('icInspectorCard');
            if (!card) return;
            if (!selected) {
                card.hidden = true;
                return;
            }

            if (selected.kind === 'wire') {
                const w = currentDoc.wires.find(x => x.id === selected.id);
                if (!w) {
                    selected = null;
                    card.hidden = true;
                    return;
                }
                card.hidden = false;
                $('icInspectorTitle').textContent = 'Selected Bench Wire';
                const v = evalData.pinValues.get(w.from);
                $('icInspectorMeta').textContent = `Connects ${w.from} ↔ ${w.to} · Signal: ${v === 1 ? 'HIGH (+5V)' : v === 0 ? 'LOW (0V)' : 'OPEN'}. Drag any wire segment to reroute, or double-click the wire to reset routing.`;
                $('icLampColorWrap').hidden = true;
                $('icToggleSelectedBtn').hidden = true;
                $('icPinTableWrap').hidden = true;
                $('icDuplicateBtn').hidden = true;
                if ($('icRotateBtn')) $('icRotateBtn').hidden = true;
                return;
            }

            const comp = currentDoc.components.find(c => c.id === selected.id);
            if (!comp) {
                selected = null;
                card.hidden = true;
                return;
            }

            card.hidden = false;
            $('icDuplicateBtn').hidden = false;
            if ($('icRotateBtn')) $('icRotateBtn').hidden = false;
            $('icLampColorWrap').hidden = comp.kind !== 'lamp';
            $('icToggleSelectedBtn').hidden = comp.kind !== 'switch' && comp.kind !== 'clock';
            $('icPinTableWrap').hidden = comp.kind !== 'ic';

            if (comp.kind === 'ic') {
                const spec = IC_CATALOG[comp.model];
                const st = evalData.icStates.get(comp.id);
                $('icInspectorTitle').textContent = `IC ${spec.model} (${spec.partNumber})`;
                $('icInspectorMeta').textContent = `${spec.description} · Pin 14 = VCC (+5V), Pin 7 = GND (0V).`;

                const badge = $('icPowerBadge');
                if (st?.reversePower) {
                    badge.textContent = '⚠ REVERSE POWER';
                    badge.style.color = '#ff5a52';
                } else if (st?.powered) {
                    badge.textContent = '✓ POWERED (5V)';
                    badge.style.color = '#37e0a1';
                } else {
                    badge.textContent = 'UNPOWERED (Wire 14 & 7)';
                    badge.style.color = '#f6b944';
                }

                const grid = $('icPinoutGrid');
                grid.replaceChildren();
                const pins = getComponentPins(comp);
                for (const p of pins) {
                    const v = evalData.pinValues.get(p.key);
                    const pill = document.createElement('div');
                    pill.className = 'ic-pin-pill'
                        + (v === 1 ? ' is-high' : '')
                        + (p.pinNumber === 14 ? ' is-vcc' : '')
                        + (p.pinNumber === 7 ? ' is-gnd' : '');
                    const left = document.createElement('span');
                    left.textContent = `Pin ${p.pinNumber}`;
                    const right = document.createElement('strong');
                    right.textContent = p.pinNumber === 14
                        ? `VCC (${v === 1 ? '5V' : v === 0 ? '0V' : 'OPEN'})`
                        : p.pinNumber === 7
                        ? `GND (${v === 0 ? '0V' : v === 1 ? '5V' : 'OPEN'})`
                        : v === 1
                        ? '1 (5V)'
                        : v === 0
                        ? '0 (0V)'
                        : 'OPEN';
                    pill.append(left, right);
                    grid.appendChild(pill);
                }
            } else if (comp.kind === 'battery') {
                $('icInspectorTitle').textContent = '5V DC Bench Battery';
                $('icInspectorMeta').textContent = 'Supplies +5V (Logic 1) on the right red (+) terminal and 0V GND (Logic 0) on the left (−) terminal. Connect (+) to IC Pin 14 and (−) to IC Pin 7.';
            } else if (comp.kind === 'switch') {
                $('icInspectorTitle').textContent = `Toggle Switch (${comp.closed ? 'CLOSED / ON' : 'OPEN / OFF'})`;
                $('icInspectorMeta').textContent = 'Click directly on the switch on the bench (or press Space) to flip between HIGH (1) and LOW (0).';
                $('icToggleSelectedBtn').textContent = comp.closed ? 'Flip Switch → OFF (0)' : 'Flip Switch → ON (1)';
            } else if (comp.kind === 'resistor') {
                $('icInspectorTitle').textContent = '220 Ω Series Resistor';
                $('icInspectorMeta').textContent = 'Current-limiting series resistor (Red-Red-Brown-Gold) used between IC output pins and LED / Lamp indicators.';
            } else if (comp.kind === 'lamp') {
                const lst = evalData.lampStates.get(comp.id);
                $('icInspectorTitle').textContent = `Indicator Lamp (${lst?.lit ? 'ILLUMINATED' : 'OFF'})`;
                $('icInspectorMeta').textContent = 'Lights up when Anode (+) is driven HIGH (5V) and Cathode (−) returns to GND (0V).';
                $('icLampColorSelect').value = comp.color || 'emerald';
            } else if (comp.kind === 'gnd') {
                $('icInspectorTitle').textContent = 'Ground Terminal (0V)';
                $('icInspectorMeta').textContent = 'Provides a 0V (Logic 0) ground return path for IC Pin 7 and Lamp cathodes.';
            } else if (comp.kind === 'clock') {
                $('icInspectorTitle').textContent = '1 Hz Clock Pulse Generator';
                $('icInspectorMeta').textContent = 'Automatically oscillates between LOW (0V) and HIGH (+5V) every 0.5 seconds.';
                $('icToggleSelectedBtn').textContent = 'Step Clock Pulse (0 ↔ 1)';
            } else if (comp.kind === 'seg7') {
                const sst = evalData.segStates.get(comp.id);
                const hex = sst?.value !== null && sst?.value !== undefined ? sst.value.toString(16).toUpperCase() : '—';
                $('icInspectorTitle').textContent = `BCD 7-Segment Display (Showing: ${hex})`;
                $('icInspectorMeta').textContent = 'Decodes 4 binary inputs A (Bit 0), B (Bit 1), C (Bit 2), D (Bit 3) into hexadecimal digits 0–F.';
            }
        }

        function syncSidebarSummary() {
            const wrap = $('icActiveSummaryList');
            const badge = $('icBenchStatusBadge');
            if (!wrap || !badge) return;
            wrap.replaceChildren();

            const ics = currentDoc.components.filter(c => c.kind === 'ic');
            const lamps = currentDoc.components.filter(c => c.kind === 'lamp');

            if (evalData.anyReverse) {
                badge.textContent = '⚠ Reverse Polarity';
                badge.style.color = '#ff5a52';
            } else if (evalData.anyShort) {
                badge.textContent = '⚠ +5V/GND Short';
                badge.style.color = '#ff5a52';
            } else if (ics.length > 0 && ics.every(c => evalData.icStates.get(c.id)?.powered)) {
                badge.textContent = '✓ All ICs Powered';
                badge.style.color = '#37e0a1';
            } else if (ics.length > 0) {
                badge.textContent = '⚡ Unpowered IC';
                badge.style.color = '#f6b944';
            } else {
                badge.textContent = 'Bench Ready';
                badge.style.color = '#3dd9ff';
            }

            if (!ics.length && !lamps.length) {
                const empty = document.createElement('div');
                empty.className = 'ic-summary-item';
                empty.innerHTML = '<span>No ICs placed yet</span><small style="color:#8fa0b5;">Pick a 74xx IC or Preset above</small>';
                wrap.appendChild(empty);
                return;
            }

            for (const ic of ics) {
                const spec = IC_CATALOG[ic.model];
                const st = evalData.icStates.get(ic.id);
                const row = document.createElement('div');
                row.className = 'ic-summary-item';
                const statusText = st?.reversePower
                    ? '<strong style="color:#ff5a52;">⚠ Reverse VCC/GND</strong>'
                    : st?.powered
                    ? '<strong style="color:#37e0a1;">✓ Powered (5V)</strong>'
                    : '<strong style="color:#f6b944;">Unpowered (Pin 14/7)</strong>';
                row.innerHTML = `<span><strong>${ic.model}</strong> · <small style="color:#96a5ba;">${spec.gateType} (${spec.fanIn}-in)</small></span>${statusText}`;
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    selected = { kind: 'comp', id: ic.id };
                    syncInspector();
                    scheduleRender();
                });
                wrap.appendChild(row);
            }
        }

        function syncFooter() {
            const ics = currentDoc.components.filter(c => c.kind === 'ic');
            const poweredCount = ics.filter(c => evalData.icStates.get(c.id)?.powered).length;
            const switches = currentDoc.components.filter(c => c.kind === 'switch');
            const lampsLit = currentDoc.components.filter(c => c.kind === 'lamp' && evalData.lampStates.get(c.id)?.lit).length;

            $('icStatChips').textContent = String(ics.length);
            $('icStatPowered').textContent = `${poweredCount}/${ics.length}`;
            $('icStatSwitches').textContent = String(switches.length);
            $('icStatLamps').textContent = String(lampsLit);
            $('icStatWires').textContent = String(currentDoc.wires.length);

            const statusEl = $('icStatStatus');
            if (evalData.anyReverse) {
                statusEl.className = 'logic-status-err';
                statusEl.textContent = '⚠ Fault: Pin 14/7 Reverse Polarity';
            } else if (evalData.anyShort) {
                statusEl.className = 'logic-status-err';
                statusEl.textContent = '⚠ Fault: +5V shorted to GND';
            } else if (ics.length > 0 && poweredCount < ics.length) {
                statusEl.className = 'logic-status-warn';
                statusEl.textContent = '⚡ Connect Pin 14 → +5V & Pin 7 → GND (or enable Auto-Power)';
            } else {
                statusEl.className = 'logic-status-ok';
                statusEl.textContent = '✓ Bench Ready';
            }
        }

        // Hit-testing helpers
        function findNearestPin(worldPt, maxDist = 16 / renderer.view.zoom) {
            let best = null;
            let bestDist = maxDist;
            for (const p of evalData.pins.values()) {
                const d = Math.hypot(p.x - worldPt.x, p.y - worldPt.y);
                if (d < bestDist) {
                    bestDist = d;
                    best = p;
                }
            }
            return best;
        }

        function findHitComponent(worldPt) {
            for (let i = currentDoc.components.length - 1; i >= 0; i--) {
                const c = currentDoc.components[i];
                const b = getComponentBounds(c);
                if (worldPt.x >= b.x && worldPt.x <= b.x + b.w && worldPt.y >= b.y && worldPt.y <= b.y + b.h) {
                    return c;
                }
            }
            return null;
        }

        function distToSegment(pt, a, b) {
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len2 = dx * dx + dy * dy;
            if (len2 < 1e-6) return Math.hypot(pt.x - a.x, pt.y - a.y);
            const t = Math.max(0, Math.min(1, ((pt.x - a.x) * dx + (pt.y - a.y) * dy) / len2));
            return Math.hypot(pt.x - (a.x + t * dx), pt.y - (a.y + t * dy));
        }

        function findHitWire(worldPt) {
            const wireGeom = computeICWireGeometry(currentDoc, evalData.pins, evalData.pinToNet);
            const tol = 8 / renderer.view.zoom;
            for (const w of currentDoc.wires) {
                const pts = wireGeom.routes.get(w.id) || [];
                for (let i = 1; i < pts.length; i++) {
                    const a = pts[i - 1];
                    const b = pts[i];
                    if (distToSegment(worldPt, a, b) <= tol) {
                        const isVert = Math.abs(a.x - b.x) < 1e-4;
                        return {
                            wire: w,
                            segA: { ...a },
                            segB: { ...b },
                            verticalSegment: isVert
                        };
                    }
                }
            }
            return null;
        }

        const isPlacementTool = t => Boolean(IC_CATALOG[t] || ['battery', 'switch', 'resistor', 'lamp', 'gnd', 'clock', 'seg7'].includes(t));

        // Canvas Pointer Interactions
        canvas.addEventListener('pointerdown', e => {
            if (e.button !== 0 && e.pointerType === 'mouse') {
                if (e.button === 2) {
                    wireStartPin = null;
                    if (tool !== 'select') setTool('select');
                    scheduleRender();
                }
                return;
            }
            canvas.focus({ preventScroll: true });
            try { canvas.setPointerCapture(e.pointerId); } catch (_) {}

            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            if (activePointers.size === 2) {
                const pts = [...activePointers.values()];
                pinchState = {
                    dist: Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1,
                    midX: (pts[0].x + pts[1].x) / 2,
                    midY: (pts[0].y + pts[1].y) / 2,
                    zoom: renderer.view.zoom,
                    panX: renderer.view.panX,
                    panY: renderer.view.panY
                };
                dragState = null;
                wireStartPin = null;
                scheduleRender();
                return;
            }

            const worldPt = renderer.world(e.clientX, e.clientY);
            cursorWorld = worldPt;

            if (tool === 'pan') {
                dragState = {
                    type: 'pan',
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    startPanX: renderer.view.panX,
                    startPanY: renderer.view.panY
                };
                return;
            }

            if (isPlacementTool(tool)) {
                const snap = $('icSnapToggle')?.checked && !e.shiftKey;
                const pos = snapICPoint(worldPt, snap);
                const next = cloneICDoc(currentDoc);
                const comp = createICComponent(tool, pos.x, pos.y, { rotation: placementRotation });
                next.components.push(comp);
                autoConnectDroppedComponent(next, comp.id);
                commitDoc(next);
                selected = { kind: 'comp', id: comp.id };
                if (!$('icRepeatToggle')?.checked) {
                    setTool('select');
                }
                recompute();
                return;
            }

            // Check pin hit first (for wiring in both 'select' and 'wire' tools)
            const hitPin = findNearestPin(worldPt);
            if (hitPin) {
                if (wireStartPin && wireStartPin.key !== hitPin.key) {
                    const next = cloneICDoc(currentDoc);
                    if (connectICWire(next, wireStartPin.key, hitPin.key)) {
                        commitDoc(next);
                    }
                    wireStartPin = null;
                    recompute();
                    return;
                }
                wireStartPin = hitPin;
                dragState = {
                    type: 'wireDrag',
                    startPin: hitPin,
                    startClientX: e.clientX,
                    startClientY: e.clientY
                };
                scheduleRender();
                return;
            }

            // If we already have a wireStartPin and clicked on an existing wire, branch from that wire (T-junction)!
            const hitW = findHitWire(worldPt);
            if (wireStartPin && hitW) {
                const targetKey = hitW.wire.from !== wireStartPin.key ? hitW.wire.from : hitW.wire.to;
                if (targetKey && targetKey !== wireStartPin.key) {
                    const next = cloneICDoc(currentDoc);
                    const jPt = hitW.verticalSegment
                        ? { x: hitW.segA.x, y: Math.round(worldPt.y / GRID) * GRID }
                        : { x: Math.round(worldPt.x / GRID) * GRID, y: hitW.segA.y };
                    if (connectICWire(next, wireStartPin.key, targetKey, [jPt])) {
                        commitDoc(next);
                    }
                    wireStartPin = null;
                    recompute();
                    return;
                }
            }

            wireStartPin = null;

            // Check component hit
            const hitComp = findHitComponent(worldPt);
            if (hitComp) {
                selected = { kind: 'comp', id: hitComp.id };
                dragState = {
                    type: 'moveComp',
                    id: hitComp.id,
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    origPos: { ...hitComp.position },
                    baseDoc: cloneICDoc(currentDoc),
                    moved: false
                };
                syncInspector();
                scheduleRender();
                return;
            }

            // Check wire hit (select and allow dragging the wire segment to reroute!)
            if (hitW) {
                selected = { kind: 'wire', id: hitW.wire.id };
                dragState = {
                    type: 'moveWire',
                    id: hitW.wire.id,
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    segA: hitW.segA,
                    segB: hitW.segB,
                    verticalSegment: hitW.verticalSegment,
                    baseDoc: cloneICDoc(currentDoc),
                    moved: false
                };
                syncInspector();
                scheduleRender();
                return;
            }

            // Empty canvas drag = pan
            selected = null;
            syncInspector();
            dragState = {
                type: 'pan',
                startClientX: e.clientX,
                startClientY: e.clientY,
                startPanX: renderer.view.panX,
                startPanY: renderer.view.panY
            };
            scheduleRender();
        });

        canvas.addEventListener('pointermove', e => {
            if (activePointers.has(e.pointerId)) {
                activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            }
            if (pinchState && activePointers.size >= 2) {
                const pts = [...activePointers.values()];
                const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
                const midX = (pts[0].x + pts[1].x) / 2;
                const midY = (pts[0].y + pts[1].y) / 2;
                const nextZoom = Math.max(0.35, Math.min(2.2, pinchState.zoom * (dist / pinchState.dist)));
                const ratio = nextZoom / pinchState.zoom;
                const rect = canvas.getBoundingClientRect();
                const cx = pinchState.midX - rect.left - renderer.width / 2;
                const cy = pinchState.midY - rect.top - renderer.height / 2;
                renderer.view.zoom = nextZoom;
                renderer.view.panX = cx - (cx - pinchState.panX) * ratio + (midX - pinchState.midX);
                renderer.view.panY = cy - (cy - pinchState.panY) * ratio + (midY - pinchState.midY);
                scheduleRender();
                return;
            }

            const worldPt = renderer.world(e.clientX, e.clientY);
            cursorWorld = worldPt;

            if (!dragState) {
                const hp = findNearestPin(worldPt);
                const nextKey = hp ? hp.key : null;
                const hitW = !hp ? findHitWire(worldPt) : null;
                canvas.style.cursor = hp
                    ? 'crosshair'
                    : hitW
                    ? (hitW.verticalSegment ? 'ew-resize' : 'ns-resize')
                    : 'default';
                if (nextKey !== hoverPinKey) {
                    hoverPinKey = nextKey;
                    scheduleRender();
                } else if (wireStartPin || isPlacementTool(tool)) {
                    scheduleRender();
                }
                return;
            }

            if (dragState.type === 'pan') {
                renderer.view.panX = dragState.startPanX + (e.clientX - dragState.startClientX);
                renderer.view.panY = dragState.startPanY + (e.clientY - dragState.startClientY);
                scheduleRender();
                return;
            }

            if (dragState.type === 'wireDrag') {
                const hp = findNearestPin(worldPt);
                hoverPinKey = hp ? hp.key : null;
                scheduleRender();
                return;
            }

            if (dragState.type === 'moveComp') {
                const distPx = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
                if (distPx > 4) dragState.moved = true;
                if (!dragState.moved) return;

                const dx = (e.clientX - dragState.startClientX) / renderer.view.zoom;
                const dy = (e.clientY - dragState.startClientY) / renderer.view.zoom;
                const snap = $('icSnapToggle')?.checked && !e.shiftKey;
                const nextPos = snapICPoint({ x: dragState.origPos.x + dx, y: dragState.origPos.y + dy }, snap);
                const comp = currentDoc.components.find(c => c.id === dragState.id);
                if (comp) {
                    comp.position = nextPos;
                    evalData = evaluateICBench(currentDoc);
                    scheduleRender();
                }
                return;
            }

            if (dragState.type === 'moveWire') {
                const distPx = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
                if (distPx > 4) dragState.moved = true;
                if (!dragState.moved) return;

                const snap = $('icSnapToggle')?.checked && !e.shiftKey;
                const snapped = snapICPoint(worldPt, snap);
                const w = currentDoc.wires.find(x => x.id === dragState.id);
                if (!w) return;
                if (dragState.verticalSegment) {
                    w.waypoints = [
                        { x: snapped.x, y: dragState.segA.y },
                        { x: snapped.x, y: dragState.segB.y }
                    ];
                } else {
                    w.waypoints = [
                        { x: dragState.segA.x, y: snapped.y },
                        { x: dragState.segB.x, y: snapped.y }
                    ];
                }
                scheduleRender();
            }
        });

        function finishPointer(e) {
            activePointers.delete(e.pointerId);
            if (activePointers.size < 2) pinchState = null;
            if (!dragState) return;
            const action = dragState;
            dragState = null;
            const worldPt = renderer.world(e.clientX, e.clientY);

            if (action.type === 'wireDrag') {
                const endPin = findNearestPin(worldPt);
                if (endPin && endPin.key !== action.startPin.key) {
                    const next = cloneICDoc(currentDoc);
                    if (connectICWire(next, action.startPin.key, endPin.key)) {
                        commitDoc(next);
                        wireStartPin = null;
                        recompute();
                        return;
                    }
                }
                // Check if user dropped the wire onto an existing wire to create a T-junction branch!
                const hitW = findHitWire(worldPt);
                if (hitW) {
                    const targetKey = hitW.wire.from !== action.startPin.key ? hitW.wire.from : hitW.wire.to;
                    if (targetKey && targetKey !== action.startPin.key) {
                        const next = cloneICDoc(currentDoc);
                        const jPt = hitW.verticalSegment
                            ? { x: hitW.segA.x, y: Math.round(worldPt.y / GRID) * GRID }
                            : { x: Math.round(worldPt.x / GRID) * GRID, y: hitW.segA.y };
                        if (connectICWire(next, action.startPin.key, targetKey, [jPt])) {
                            commitDoc(next);
                            wireStartPin = null;
                            recompute();
                            return;
                        }
                    }
                }
                const distPx = Math.hypot(e.clientX - action.startClientX, e.clientY - action.startClientY);
                if (distPx > 10) {
                    wireStartPin = null;
                }
                scheduleRender();
                return;
            }

            if (action.type === 'moveComp') {
                if (action.moved) {
                    autoConnectDroppedComponent(currentDoc, action.id);
                    const movedDoc = cloneICDoc(currentDoc);
                    currentDoc = action.baseDoc;
                    commitDoc(movedDoc);
                } else {
                    const comp = currentDoc.components.find(c => c.id === action.id);
                    if (comp && comp.kind === 'switch') {
                        comp.closed = !comp.closed;
                        recompute();
                    } else if (comp && comp.kind === 'clock') {
                        comp.value = comp.value ? 0 : 1;
                        recompute();
                    }
                }
                return;
            }

            if (action.type === 'moveWire') {
                if (action.moved) {
                    const movedDoc = cloneICDoc(currentDoc);
                    currentDoc = action.baseDoc;
                    commitDoc(movedDoc);
                }
            }
        }

        canvas.addEventListener('pointerup', finishPointer);
        canvas.addEventListener('pointercancel', () => {
            activePointers.clear();
            pinchState = null;
            dragState = null;
            scheduleRender();
        });
        canvas.addEventListener('dblclick', e => {
            const worldPt = renderer.world(e.clientX, e.clientY);
            const hitW = findHitWire(worldPt);
            if (hitW && hitW.wire.waypoints && hitW.wire.waypoints.length) {
                const next = cloneICDoc(currentDoc);
                const w = next.wires.find(x => x.id === hitW.wire.id);
                if (w) {
                    w.waypoints = [];
                    commitDoc(next);
                }
            }
        });

        canvas.addEventListener('pointerleave', () => {
            if (!dragState) {
                cursorWorld = null;
                hoverPinKey = null;
                scheduleRender();
            }
        });
        canvas.addEventListener('contextmenu', e => e.preventDefault());

        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
            const nextZoom = Math.max(0.35, Math.min(2.2, renderer.view.zoom * factor));
            const ratio = nextZoom / renderer.view.zoom;
            const rect = canvas.getBoundingClientRect();
            const cx = e.clientX - rect.left - renderer.width / 2;
            const cy = e.clientY - rect.top - renderer.height / 2;
            renderer.view.panX = cx - (cx - renderer.view.panX) * ratio;
            renderer.view.panY = cy - (cy - renderer.view.panY) * ratio;
            renderer.view.zoom = nextZoom;
            scheduleRender();
        }, { passive: false });

        // Keyboard shortcuts when IC mode is active (matching Circuits Lab & Logic Gates Simulator)
        window.addEventListener('keydown', e => {
            if (icMain.hidden) return;
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    $('icRedoBtn')?.click();
                } else {
                    $('icUndoBtn')?.click();
                }
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                $('icRedoBtn')?.click();
                return;
            }
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                if (selected && selected.kind === 'comp') {
                    e.preventDefault();
                    $('icDuplicateBtn')?.click();
                }
                return;
            }
            if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                if (isPlacementTool(tool)) {
                    placementRotation = (placementRotation + 90) % 360;
                    scheduleRender();
                } else if (selected && selected.kind === 'comp') {
                    rotateSelectedComponent();
                }
                return;
            }
            if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') && selected && selected.kind === 'comp') {
                const next = cloneICDoc(currentDoc);
                const comp = next.components.find(c => c.id === selected.id);
                if (comp) {
                    e.preventDefault();
                    const step = e.shiftKey ? 2 : GRID;
                    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
                    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
                    comp.position = {
                        x: comp.position.x + dx,
                        y: comp.position.y + dy
                    };
                    commitDoc(next);
                }
                return;
            }
            if (e.key === '[' || e.key === ']') {
                const list = currentDoc.components;
                if (!list.length) return;
                e.preventDefault();
                const curIdx = (selected && selected.kind === 'comp') ? list.findIndex(c => c.id === selected.id) : -1;
                const dir = e.key === ']' ? 1 : -1;
                const nextIdx = (curIdx + dir + list.length) % list.length;
                selected = { kind: 'comp', id: list[nextIdx].id };
                syncInspector();
                scheduleRender();
                return;
            }
            if (e.key === 'Enter' && isPlacementTool(tool)) {
                e.preventDefault();
                const center = {
                    x: -renderer.view.panX / renderer.view.zoom,
                    y: -renderer.view.panY / renderer.view.zoom
                };
                const pos = snapICPoint(center, $('icSnapToggle')?.checked);
                const next = cloneICDoc(currentDoc);
                const comp = createICComponent(tool, pos.x, pos.y, { rotation: placementRotation });
                next.components.push(comp);
                commitDoc(next);
                selected = { kind: 'comp', id: comp.id };
                if (!$('icRepeatToggle')?.checked) setTool('select');
                recompute();
                return;
            }
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selected) {
                    e.preventDefault();
                    deleteSelected();
                }
                return;
            }
            if (e.key === 'Escape') {
                wireStartPin = null;
                if (tool !== 'select') setTool('select');
                scheduleRender();
                return;
            }
            if (e.key === ' ' && selected && selected.kind === 'comp') {
                e.preventDefault();
                $('icToggleSelectedBtn')?.click();
            }
        });

        // 1 Hz Clock Interval
        setInterval(() => {
            if (icMain.hidden) return;
            const clocks = currentDoc.components.filter(c => c.kind === 'clock' && c.running !== false);
            if (!clocks.length) return;
            for (const clk of clocks) {
                clk.value = clk.value ? 0 : 1;
            }
            recompute();
        }, 500);

        renderer.onResize = () => scheduleRender();
        recompute();
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initICLabBrowser);
        } else {
            initICLabBrowser();
        }
    }

    const exported = {
        GRID,
        IC_CATALOG,
        IC_PRESETS,
        blankICDoc,
        cloneICDoc,
        createICComponent,
        getComponentPins,
        getComponentBounds,
        connectICWire,
        routeICWire,
        computeICWireGeometry,
        evaluateICBench
    };

    if (root.LogicLab) {
        Object.assign(root.LogicLab, exported);
    } else {
        root.LogicICLab = exported;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exported;
    }
})(typeof window !== 'undefined' ? window : globalThis);

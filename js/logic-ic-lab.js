(function (root) {
    'use strict';

    const GRID = 18;

    function getSolverMod() {
        if (root.ElectronicsSolver) return root.ElectronicsSolver;
        if (typeof require === 'function') {
            try { return require('./electronics-solver.js'); } catch (_) { return null; }
        }
        return null;
    }

    function getArtMod() {
        if (root.ElectronicsArt) return root.ElectronicsArt;
        if (typeof require === 'function') {
            try { return require('./electronics-components.js'); } catch (_) { return null; }
        }
        return null;
    }

    function getExportMod() {
        if (root.ElectronicsExport) return root.ElectronicsExport;
        if (typeof require === 'function') {
            try { return require('./electronics-export.js'); } catch (_) { return null; }
        }
        return null;
    }

    function getHardwareMod() {
        if (root.HardwareRenderer) return root.HardwareRenderer;
        if (typeof require === 'function') {
            try { return require('./hardware-renderer.js'); } catch (_) { return null; }
        }
        return null;
    }

    const WIRE_PALETTE = [
        { id: 'auto',   label: 'Auto',   hex: null },
        { id: 'red',    label: 'Red',    hex: '#ef4444' },
        { id: 'black',  label: 'Black',  hex: '#334155' },
        { id: 'blue',   label: 'Blue',   hex: '#38bdf8' },
        { id: 'green',  label: 'Green',  hex: '#34d399' },
        { id: 'yellow', label: 'Yellow', hex: '#facc15' },
        { id: 'orange', label: 'Orange', hex: '#fb923c' },
        { id: 'purple', label: 'Purple', hex: '#c084fc' },
        { id: 'white',  label: 'White',  hex: '#e2e8f0' }
    ];

    const WIRE_COLOR_HEX = {
        red: '#ef4444',
        black: '#334155',
        blue: '#38bdf8',
        green: '#34d399',
        yellow: '#facc15',
        orange: '#fb923c',
        purple: '#c084fc',
        white: '#e2e8f0'
    };

    // =========================================================================
    // 1. AUTHENTIC 74xx SERIES DIP-14 IC CATALOG
    // =========================================================================
    // Pin numbering on a standard 14-pin DIP package:
    // Bottom row (left to right): Pins 1, 2, 3, 4, 5, 6, 7  (Pin 7 = GND)
    // Top row (right to left):    Pins 8, 9, 10, 11, 12, 13, 14 (Pin 14 = VCC)
    // Pin X offsets for the 7 columns: -108, -72, -36, 0, +36, +72, +108 (pitch = 36px = 2 * GRID)
    // Pin Y offsets: Top row = -72, Bottom row = +72

    function getDipPinLocal(pinNumber, pinCount = 14) {
        const half = pinCount / 2;
        const startX = pinCount === 16 ? -126 : -108;
        if (pinNumber >= 1 && pinNumber <= half) {
            return {
                pin: pinNumber,
                x: startX + (pinNumber - 1) * 36,
                y: 72,
                innerY: 56,
                row: 'bottom'
            };
        }
        if (pinNumber >= half + 1 && pinNumber <= pinCount) {
            return {
                pin: pinNumber,
                x: startX + (pinCount - pinNumber) * 36,
                y: -72,
                innerY: -56,
                row: 'top'
            };
        }
        return { pin: pinNumber, x: 0, y: 0, innerY: 0, row: 'bottom' };
    }

    function getDip14PinLocal(pinNumber) {
        return getDipPinLocal(pinNumber, 14);
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
            pinCount: 14,
            vccPin: 14,
            gndPin: 7,
            iccMa: 6.6,
            tpdNs: 9,
            gates: HEX_7404_GATES
        },
        '7400': {
            model: '7400',
            partNumber: 'SN74LS00N',
            description: 'Quad 2-Input NAND Gate',
            gateType: 'NAND',
            fanIn: 2,
            pinCount: 14,
            vccPin: 14,
            gndPin: 7,
            iccMa: 4.4,
            tpdNs: 9,
            gates: QUAD_STD_GATES('NAND')
        },
        '7402': {
            model: '7402',
            partNumber: 'SN74LS02N',
            description: 'Quad 2-Input NOR Gate (Reversed Pinout)',
            gateType: 'NOR',
            fanIn: 2,
            pinCount: 14,
            vccPin: 14,
            gndPin: 7,
            iccMa: 5.4,
            tpdNs: 10,
            gates: QUAD_7402_GATES
        },
        '7408': {
            model: '7408',
            partNumber: 'SN74LS08N',
            description: 'Quad 2-Input AND Gate',
            gateType: 'AND',
            fanIn: 2,
            pinCount: 14,
            vccPin: 14,
            gndPin: 7,
            iccMa: 8.8,
            tpdNs: 12,
            gates: QUAD_STD_GATES('AND')
        },
        '7432': {
            model: '7432',
            partNumber: 'SN74LS32N',
            description: 'Quad 2-Input OR Gate',
            gateType: 'OR',
            fanIn: 2,
            pinCount: 14,
            vccPin: 14,
            gndPin: 7,
            iccMa: 9.8,
            tpdNs: 14,
            gates: QUAD_STD_GATES('OR')
        },
        '7486': {
            model: '7486',
            partNumber: 'SN74LS86N',
            description: 'Quad 2-Input Exclusive-OR (XOR) Gate',
            gateType: 'XOR',
            fanIn: 2,
            pinCount: 14,
            vccPin: 14,
            gndPin: 7,
            iccMa: 10.0,
            tpdNs: 15,
            gates: QUAD_STD_GATES('XOR')
        },
        '74266': {
            model: '74266',
            partNumber: 'SN74LS266N',
            description: 'Quad 2-Input Exclusive-NOR (XNOR) Gate',
            gateType: 'XNOR',
            fanIn: 2,
            pinCount: 14,
            vccPin: 14,
            gndPin: 7,
            iccMa: 10.0,
            tpdNs: 16,
            gates: QUAD_STD_GATES('XNOR')
        },
        '7410': {
            model: '7410',
            partNumber: 'SN74LS10N',
            description: 'Triple 3-Input NAND Gate',
            gateType: 'NAND',
            fanIn: 3,
            pinCount: 14,
            vccPin: 14,
            gndPin: 7,
            iccMa: 3.3,
            tpdNs: 9,
            gates: TRIPLE_3IN_GATES('NAND')
        },
        '7411': {
            model: '7411',
            partNumber: 'SN74LS11N',
            description: 'Triple 3-Input AND Gate',
            gateType: 'AND',
            fanIn: 3,
            pinCount: 14,
            vccPin: 14,
            gndPin: 7,
            iccMa: 6.6,
            tpdNs: 12,
            gates: TRIPLE_3IN_GATES('AND')
        },
        '7427': {
            model: '7427',
            partNumber: 'SN74LS27N',
            description: 'Triple 3-Input NOR Gate',
            gateType: 'NOR',
            fanIn: 3,
            pinCount: 14,
            vccPin: 14,
            gndPin: 7,
            iccMa: 6.8,
            tpdNs: 10,
            gates: TRIPLE_3IN_GATES('NOR')
        },
        '7474': {
            model: '7474',
            partNumber: 'SN74LS74AN',
            description: 'Dual Positive-Edge D Flip-Flop w/ Preset & Clear',
            gateType: 'D-FF',
            fanIn: 4,
            pinCount: 14,
            vccPin: 14,
            gndPin: 7,
            iccMa: 8.5,
            tpdNs: 14,
            msi: true,
            pinLabels: {
                1: '1CLR\'', 2: '1D', 3: '1CLK', 4: '1PRE\'', 5: '1Q', 6: '1Q\'', 7: 'GND',
                8: '2Q\'', 9: '2Q', 10: '2PRE\'', 11: '2CLK', 12: '2D', 13: '2CLR\'', 14: 'VCC'
            },
            outputs: [5, 6, 8, 9],
            gates: []
        },
        '7475': {
            model: '7475',
            partNumber: 'SN74LS75N',
            description: '4-Bit Bistable Transparent D-Latch',
            gateType: 'D-LATCH',
            fanIn: 2,
            pinCount: 16,
            vccPin: 16,
            gndPin: 8,
            iccMa: 24.0,
            tpdNs: 15,
            msi: true,
            pinLabels: {
                1: '1Q\'', 2: '1D', 3: '2D', 4: 'EN12', 5: '4Q\'', 6: '3D', 7: '4D', 8: 'GND',
                9: '4Q', 10: '3Q\'', 11: '3Q', 12: 'EN34', 13: '2Q\'', 14: '2Q', 15: '1Q', 16: 'VCC'
            },
            outputs: [1, 5, 9, 10, 11, 13, 14, 15],
            gates: []
        },
        '74279': {
            model: '74279',
            partNumber: 'SN74LS279AN',
            description: 'Quad S-R Bistable Latch',
            gateType: 'SR-LATCH',
            fanIn: 2,
            pinCount: 16,
            vccPin: 16,
            gndPin: 8,
            iccMa: 12.0,
            tpdNs: 12,
            msi: true,
            pinLabels: {
                1: '1S', 2: '1R', 3: '1Q\'', 4: '1Q', 5: '2S', 6: '2R', 7: '2Q', 8: 'GND',
                9: '3S', 10: '3R', 11: '3Q', 12: '3Q\'', 13: '4S', 14: '4R', 15: '4Q', 16: 'VCC'
            },
            outputs: [3, 4, 7, 11, 12, 15],
            gates: []
        },
        '74283': {
            model: '74283',
            partNumber: 'SN74LS283N',
            description: '4-Bit Binary Full Adder with Fast Carry',
            gateType: '4B-ADD',
            fanIn: 9,
            pinCount: 16,
            vccPin: 16,
            gndPin: 8,
            iccMa: 34.0,
            tpdNs: 15,
            msi: true,
            pinLabels: {
                1: 'Σ2', 2: 'B2', 3: 'A2', 4: 'Σ1', 5: 'A1', 6: 'B1', 7: 'C0', 8: 'GND',
                9: 'C4', 10: 'Σ4', 11: 'B4', 12: 'A4', 13: 'Σ3', 14: 'A3', 15: 'B3', 16: 'VCC'
            },
            outputs: [1, 4, 9, 10, 13],
            gates: []
        },
        '74157': {
            model: '74157',
            partNumber: 'SN74LS157N',
            description: 'Quad 2-to-1 Data Selector / Multiplexer',
            gateType: 'MUX',
            fanIn: 3,
            pinCount: 16,
            vccPin: 16,
            gndPin: 8,
            iccMa: 19.5,
            tpdNs: 9,
            msi: true,
            pinLabels: {
                1: 'SEL', 2: '1A', 3: '1B', 4: '1Y', 5: '2A', 6: '2B', 7: '2Y', 8: 'GND',
                9: '3Y', 10: '3B', 11: '3A', 12: '4Y', 13: '4B', 14: '4A', 15: 'EN\'', 16: 'VCC'
            },
            outputs: [4, 7, 9, 12],
            gates: []
        },
        '74148': {
            model: '74148',
            partNumber: 'SN74LS148N',
            description: '8-to-3 Priority Encoder',
            gateType: 'ENC',
            fanIn: 8,
            pinCount: 16,
            vccPin: 16,
            gndPin: 8,
            iccMa: 25.0,
            tpdNs: 14,
            msi: true,
            pinLabels: {
                1: 'D4', 2: 'D5', 3: 'D6', 4: 'D7', 5: 'EI', 6: 'A2', 7: 'A1', 8: 'GND',
                9: 'A0', 10: 'D0', 11: 'D1', 12: 'D2', 13: 'D3', 14: 'GS', 15: 'EO', 16: 'VCC'
            },
            outputs: [6, 7, 9, 14, 15],
            gates: []
        },
        '7493': {
            model: '7493',
            partNumber: 'SN74LS93N',
            description: '4-Bit Binary Ripple Counter',
            gateType: 'COUNTER',
            fanIn: 3,
            pinCount: 14,
            vccPin: 14,
            gndPin: 7,
            iccMa: 28.0,
            tpdNs: 18,
            msi: true,
            pinLabels: {
                1: 'CLK', 2: 'R0(1)', 3: 'R0(2)', 4: 'NC', 5: 'NC', 6: 'NC', 7: 'GND',
                8: 'QC', 9: 'QB', 10: 'NC', 11: 'QD', 12: 'QA', 13: 'NC', 14: 'VCC'
            },
            outputs: [8, 9, 11, 12],
            gates: []
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

    const BREADBOARD_PLUGGABLE_KINDS = new Set([
        'lamp', 'rgb_led', 'resistor', 'pushbutton', 'spdt',
        'potentiometer', 'buzzer', 'npn', 'ic', 'seg7_10'
    ]);

    // Physical body footprint (in component-local coordinates) that covers breadboard
    // holes underneath a placed component, making those holes inaccessible to clicks/wires.
    function getComponentOcclusionLocalRect(comp) {
        if (!comp || comp.kind === 'breadboard') return null;
        if (comp.kind === 'ic') {
            const spec = IC_CATALOG[comp.model];
            const hw = (spec?.pinCount === 16) ? 150 : 132;
            return { left: -hw, right: hw, top: -76, bottom: 76 };
        }
        if (comp.kind === 'seg7_10') return { left: -82, right: 82, top: -112, bottom: 112 };
        if (comp.kind === 'pushbutton') return { left: -40, right: 40, top: -40, bottom: 40 };
        if (comp.kind === 'resistor') return { left: -74, right: 74, top: -15, bottom: 15 };
        if (comp.kind === 'lamp') return { left: -24, right: 24, top: -84, bottom: 6 };
        if (comp.kind === 'rgb_led') return { left: -58, right: 58, top: -82, bottom: 40 };
        if (comp.kind === 'spdt') return { left: -56, right: 56, top: -52, bottom: 40 };
        if (comp.kind === 'potentiometer') return { left: -48, right: 48, top: -82, bottom: 40 };
        if (comp.kind === 'buzzer') return { left: -44, right: 44, top: -74, bottom: 40 };
        if (comp.kind === 'npn') return { left: -42, right: 42, top: -56, bottom: 40 };
        const b = getComponentBounds(comp);
        const rot = ((comp.rotation || 0) % 360 + 360) % 360;
        const swapped = rot === 90 || rot === 270;
        const hw = (swapped ? b.h : b.w) / 2;
        const hh = (swapped ? b.w : b.h) / 2;
        return { left: -hw, right: hw, top: -hh, bottom: hh };
    }

    function isPointUnderComponent(doc, pt, ignoreCompId = null) {
        if (!doc || !pt || !Array.isArray(doc.components)) return false;
        for (const c of doc.components) {
            if (c.kind === 'breadboard' || c.id === ignoreCompId) continue;
            const rect = getComponentOcclusionLocalRect(c);
            if (!rect) continue;
            const dx = pt.x - c.position.x;
            const dy = pt.y - c.position.y;
            const rot = ((c.rotation || 0) % 360 + 360) % 360;
            const local = rotateLocal(dx, dy, (360 - rot) % 360);
            if (local.x >= rect.left && local.x <= rect.right && local.y >= rect.top && local.y <= rect.bottom) {
                return true;
            }
        }
        return false;
    }

    function isBreadboardHoleAccessible(doc, evalData, hole) {
        if (!hole || !hole.isBreadboardHole) return true;
        if (isPointUnderComponent(doc, hole)) return false;
        if (evalData && evalData.pluggedPinMap) {
            for (const holeKey of evalData.pluggedPinMap.values()) {
                if (holeKey === hole.key) return false;
            }
        }
        return true;
    }

    // Tinkercad-style Magnetic Breadboard Pin-to-Hole Snapping!
    // Finds the exact (dx, dy) translation within snapRadius that maximizes the number of
    // component pins landing directly inside open breadboard socket holes (dist <= 2px)
    // without double-stuffing a hole already occupied by another component!
    function snapCompToBreadboard(doc, comp, maxRadius = 44) {
        if (!doc || !comp || !BREADBOARD_PLUGGABLE_KINDS.has(comp.kind)) return null;
        const solverMod = getSolverMod();
        if (!solverMod || typeof solverMod.getBreadboardHoles !== 'function') return null;

        const boards = (doc.components || []).filter(c => c.kind === 'breadboard');
        if (!boards.length) return null;

        const compPins = getComponentPins(comp);
        if (!compPins.length) return null;

        // Track holes already occupied by OTHER placed components so dragging never causes accidental socket collisions!
        const occupiedOtherCoords = new Set();
        for (const other of doc.components) {
            if (other.kind === 'breadboard' || other.id === comp.id) continue;
            for (const op of getComponentPins(other)) {
                occupiedOtherCoords.add(`${Math.round(op.x)},${Math.round(op.y)}`);
            }
        }

        let bestSnap = null;

        for (const bb of boards) {
            const b = getComponentBounds(bb);
            if (
                comp.position.x < b.left - 54 || comp.position.x > b.right + 54 ||
                comp.position.y < b.top - 54 || comp.position.y > b.bottom + 54
            ) continue;

            const holes = solverMod.getBreadboardHoles(bb);
            const holeSet = new Map();
            for (const h of holes) {
                holeSet.set(`${Math.round(h.x)},${Math.round(h.y)}`, h);
            }

            const p0 = compPins[0];
            for (const h of holes) {
                const dx = h.x - p0.x;
                const dy = h.y - p0.y;
                const dist = Math.hypot(dx, dy);
                if (dist > maxRadius) continue;

                // Count how many pins of `comp` land squarely inside valid, unoccupied breadboard holes at this shift
                let matched = 0;
                let collision = false;
                const matchedHoles = [];
                for (const p of compPins) {
                    const coordKey = `${Math.round(p.x + dx)},${Math.round(p.y + dy)}`;
                    if (occupiedOtherCoords.has(coordKey)) {
                        collision = true;
                        break;
                    }
                    const mh = holeSet.get(coordKey);
                    if (mh) {
                        matched++;
                        matchedHoles.push(mh);
                    }
                }
                if (collision || matched < Math.min(2, compPins.length)) continue;

                if (
                    !bestSnap ||
                    matched > bestSnap.matched ||
                    (matched === bestSnap.matched && dist < bestSnap.dist)
                ) {
                    bestSnap = {
                        x: Math.round(comp.position.x + dx),
                        y: Math.round(comp.position.y + dy),
                        matched,
                        total: compPins.length,
                        dist,
                        holes: matchedHoles
                    };
                }
            }
        }
        return bestSnap;
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
            const comp = {
                id: extra.id || uid('ic'),
                kind: 'ic',
                model: kind,
                position: pos,
                rotation,
                label: extra.label || kind
            };
            if (IC_CATALOG[kind].msi) {
                comp.state = extra.state ? JSON.parse(JSON.stringify(extra.state)) : {
                    q: [0, 0, 0, 0],
                    qBar: [1, 1, 1, 1],
                    count: 0,
                    prevClk1: 0,
                    prevClk2: 0
                };
            }
            return comp;
        }
        if (kind === 'battery') {
            const cells = Math.max(1, Math.min(4, Math.round(extra.cells || (extra.voltage ? extra.voltage / 1.5 : 3))));
            const voltage = Math.round(cells * 1.5 * 10) / 10;
            return {
                id: extra.id || uid('bat'),
                kind: 'battery',
                position: pos,
                rotation,
                cells,
                voltage,
                label: extra.label || `${cells}×AA (${voltage.toFixed(1)}V)`
            };
        }
        if (kind === 'battery9v') {
            return {
                id: extra.id || uid('bat9'),
                kind: 'battery9v',
                position: pos,
                rotation,
                voltage: 9.0,
                label: extra.label || '9V PP3'
            };
        }
        if (kind === 'psu') {
            const voltage = Math.max(0, Math.min(12, Number(extra.voltage !== undefined ? extra.voltage : 5.0)));
            return {
                id: extra.id || uid('psu'),
                kind: 'psu',
                position: pos,
                rotation,
                voltage: Math.round(voltage * 10) / 10,
                enabled: extra.enabled !== false,
                label: extra.label || 'Bench PSU'
            };
        }
        if (kind === 'breadboard' || kind === 'breadboard_mini') {
            const variant = kind === 'breadboard_mini' ? 'mini' : (extra.variant || 'half');
            return {
                id: extra.id || uid('bb'),
                kind: 'breadboard',
                variant,
                position: pos,
                rotation: 0,
                label: extra.label || (variant === 'mini' ? 'Mini Breadboard' : 'Half Breadboard')
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
        if (kind === 'pushbutton') {
            return {
                id: extra.id || uid('btn'),
                kind: 'pushbutton',
                position: pos,
                rotation,
                pressed: Boolean(extra.pressed),
                latched: Boolean(extra.latched),
                label: extra.label || 'BTN'
            };
        }
        if (kind === 'spdt') {
            return {
                id: extra.id || uid('spdt'),
                kind: 'spdt',
                position: pos,
                rotation,
                positionThrow: extra.positionThrow === 'right' ? 'right' : 'left',
                label: extra.label || 'SPDT'
            };
        }
        if (kind === 'dip4') {
            return {
                id: extra.id || uid('dip'),
                kind: 'dip4',
                position: pos,
                rotation,
                bits: Array.isArray(extra.bits) ? [...extra.bits] : [0, 0, 0, 0],
                label: extra.label || 'DIP-4'
            };
        }
        if (kind === 'probe') {
            return {
                id: extra.id || uid('prb'),
                kind: 'probe',
                position: pos,
                rotation,
                label: extra.label || 'PROBE'
            };
        }
        if (kind === 'resistor') {
            const ohms = Math.max(1, Number(extra.ohms || 220));
            const solverMod = getSolverMod();
            const fmt = solverMod ? solverMod.formatOhms(ohms) : `${ohms}Ω`;
            return {
                id: extra.id || uid('res'),
                kind: 'resistor',
                position: pos,
                rotation,
                ohms,
                maxWatts: extra.maxWatts || 0.25,
                label: extra.label || fmt
            };
        }
        if (kind === 'potentiometer') {
            const ohms = Math.max(10, Number(extra.ohms || 10000));
            const wiper = Math.max(0, Math.min(1, Number(extra.wiper !== undefined ? extra.wiper : 0.5)));
            return {
                id: extra.id || uid('pot'),
                kind: 'potentiometer',
                position: pos,
                rotation,
                ohms,
                wiper,
                maxWatts: extra.maxWatts || 0.5,
                label: extra.label || 'POT'
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
        if (kind === 'rgb_led') {
            return {
                id: extra.id || uid('rgb'),
                kind: 'rgb_led',
                position: pos,
                rotation,
                label: extra.label || 'RGB LED'
            };
        }
        if (kind === 'motor') {
            return {
                id: extra.id || uid('mot'),
                kind: 'motor',
                position: pos,
                rotation,
                ratedV: extra.ratedV || 9,
                maxRpm: extra.maxRpm || 3600,
                ohms: extra.ohms || 30,
                label: extra.label || 'DC Motor'
            };
        }
        if (kind === 'buzzer') {
            return {
                id: extra.id || uid('buz'),
                kind: 'buzzer',
                position: pos,
                rotation,
                freqHz: extra.freqHz || 880,
                label: extra.label || 'Buzzer'
            };
        }
        if (kind === 'npn') {
            return {
                id: extra.id || uid('q'),
                kind: 'npn',
                position: pos,
                rotation,
                model: extra.model || '2N2222',
                label: extra.label || '2N2222'
            };
        }
        if (kind === 'multimeter') {
            return {
                id: extra.id || uid('dmm'),
                kind: 'multimeter',
                position: pos,
                rotation,
                mode: extra.mode || 'V',
                label: extra.label || 'DMM'
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
                freqHz: extra.freqHz || 1,
                label: extra.label || 'CLK'
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
        if (kind === 'seg7_10') {
            return {
                id: extra.id || uid('seg10'),
                kind: 'seg7_10',
                position: pos,
                rotation,
                label: extra.label || '7-SEG'
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
            const pinCount = spec?.pinCount || 14;
            const vccPin = spec?.vccPin || 14;
            const gndPin = spec?.gndPin || 7;
            const pins = [];
            for (let p = 1; p <= pinCount; p++) {
                const loc = getDipPinLocal(p, pinCount);
                let role = 'io';
                let title = `Pin ${p}`;
                if (p === vccPin) {
                    role = 'vcc';
                    title = `Pin ${p} (VCC +5V)`;
                } else if (p === gndPin) {
                    role = 'gnd';
                    title = `Pin ${p} (GND 0V)`;
                } else if (spec?.msi) {
                    const lbl = spec.pinLabels?.[p] || '';
                    const isOut = Array.isArray(spec.outputs) && spec.outputs.includes(p);
                    role = isOut ? 'out' : 'in';
                    title = `Pin ${p} (${lbl || spec.gateType} ${isOut ? 'Out' : 'In'})`;
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
            const cells = Math.max(1, Math.min(4, Math.round(comp.cells || (comp.voltage ? comp.voltage / 1.5 : 3))));
            const v = (cells * 1.5).toFixed(1);
            return [
                buildPin(comp, 'neg', -216, 0, -1, 0, 'gnd', `AA Pack − (0V Return)`),
                buildPin(comp, 'pos', 216, 0, 1, 0, 'vcc', `AA Pack + (+${v}V · ${cells}×AA)`)
            ];
        }
        if (comp.kind === 'battery9v') {
            return [
                buildPin(comp, 'neg', -36, -180, 0, -1, 'gnd', '9V Battery − Hex Snap Terminal (0V)'),
                buildPin(comp, 'pos', 36, -180, 0, -1, 'vcc', '9V Battery + Round Snap Terminal (+9.0V)')
            ];
        }
        if (comp.kind === 'psu') {
            const v = Number(comp.voltage !== undefined ? comp.voltage : 5).toFixed(1);
            return [
                buildPin(comp, 'neg', -180, 324, 0, 1, 'gnd', 'Bench PSU − (0V Return)'),
                buildPin(comp, 'pos', 180, 324, 0, 1, 'vcc', `Bench PSU + (+${v}V ${comp.enabled === false ? 'OFF' : 'ON'})`)
            ];
        }
        if (comp.kind === 'breadboard') {
            const solverMod = getSolverMod();
            return solverMod ? solverMod.getBreadboardHoles(comp) : [];
        }
        if (comp.kind === 'switch') {
            return [
                buildPin(comp, 'in', -36, 0, -1, 0, 'in', 'Switch Supply Input'),
                buildPin(comp, 'out', 36, 0, 1, 0, 'out', 'Switch Output Terminal')
            ];
        }
        if (comp.kind === 'pushbutton') {
            return [
                buildPin(comp, 'a1', -36, -36, -1, 0, 'io', 'Push Button A1 (Top-Left)'),
                buildPin(comp, 'b1', 36, -36, 1, 0, 'io', 'Push Button B1 (Top-Right)'),
                buildPin(comp, 'a2', -36, 36, -1, 0, 'io', 'Push Button A2 (Bottom-Left)'),
                buildPin(comp, 'b2', 36, 36, 1, 0, 'io', 'Push Button B2 (Bottom-Right)')
            ];
        }
        if (comp.kind === 'spdt') {
            return [
                buildPin(comp, 't1', -36, 36, 0, 1, 'io', 'SPDT Throw 1 (Left)'),
                buildPin(comp, 'com', 0, 36, 0, 1, 'io', 'SPDT Common (Center)'),
                buildPin(comp, 't2', 36, 36, 0, 1, 'io', 'SPDT Throw 2 (Right)')
            ];
        }
        if (comp.kind === 'dip4') {
            return [
                buildPin(comp, 'B0', 36, -54, 1, 0, 'out', 'DIP Switch 1 Output (Bit 0)'),
                buildPin(comp, 'B1', 36, -18, 1, 0, 'out', 'DIP Switch 2 Output (Bit 1)'),
                buildPin(comp, 'B2', 36, 18, 1, 0, 'out', 'DIP Switch 3 Output (Bit 2)'),
                buildPin(comp, 'B3', 36, 54, 1, 0, 'out', 'DIP Switch 4 Output (Bit 3)')
            ];
        }
        if (comp.kind === 'probe') {
            return [
                buildPin(comp, 'tip', -36, 0, -1, 0, 'in', 'Logic Probe Test Tip')
            ];
        }
        if (comp.kind === 'resistor') {
            return [
                buildPin(comp, 'a', -72, 0, -1, 0, 'io', 'Resistor Lead A'),
                buildPin(comp, 'b', 72, 0, 1, 0, 'io', 'Resistor Lead B')
            ];
        }
        if (comp.kind === 'potentiometer') {
            return [
                buildPin(comp, 't1', -36, 36, 0, 1, 'io', 'Potentiometer Terminal 1 (CCW)'),
                buildPin(comp, 'wiper', 0, 36, 0, 1, 'io', 'Potentiometer Wiper (Adjustable)'),
                buildPin(comp, 't2', 36, 36, 0, 1, 'io', 'Potentiometer Terminal 2 (CW)')
            ];
        }
        if (comp.kind === 'lamp') {
            return [
                buildPin(comp, 'anode', -18, 0, -1, 0, 'in', 'LED Anode (+ Long Leg)'),
                buildPin(comp, 'cathode', 18, 0, 1, 0, 'gnd', 'LED Cathode (− Flat Edge)')
            ];
        }
        if (comp.kind === 'rgb_led') {
            return [
                buildPin(comp, 'r', -54, 36, 0, 1, 'in', 'RGB LED Red Anode (R)'),
                buildPin(comp, 'gnd', -18, 36, 0, 1, 'gnd', 'RGB LED Common Cathode (−)'),
                buildPin(comp, 'g', 18, 36, 0, 1, 'in', 'RGB LED Green Anode (G)'),
                buildPin(comp, 'b', 54, 36, 0, 1, 'in', 'RGB LED Blue Anode (B)')
            ];
        }
        if (comp.kind === 'motor') {
            return [
                buildPin(comp, 'pos', -108, -18, -1, 0, 'in', 'DC Motor Terminal + (CW)'),
                buildPin(comp, 'neg', -108, 18, -1, 0, 'gnd', 'DC Motor Terminal − (Return)')
            ];
        }
        if (comp.kind === 'buzzer') {
            return [
                buildPin(comp, 'pos', -36, 36, 0, 1, 'in', 'Piezo Buzzer + (Positive)'),
                buildPin(comp, 'neg', 36, 36, 0, 1, 'gnd', 'Piezo Buzzer − (Return)')
            ];
        }
        if (comp.kind === 'npn') {
            return [
                buildPin(comp, 'e', -36, 36, 0, 1, 'io', 'NPN 2N2222 Emitter (E)'),
                buildPin(comp, 'b', 0, 36, 0, 1, 'in', 'NPN 2N2222 Base (B)'),
                buildPin(comp, 'c', 36, 36, 0, 1, 'io', 'NPN 2N2222 Collector (C)')
            ];
        }
        if (comp.kind === 'multimeter') {
            return [
                buildPin(comp, 'neg', -72, 252, 0, 1, 'gnd', 'Multimeter COM (− Black Probe)'),
                buildPin(comp, 'pos', 72, 252, 0, 1, 'in', 'Multimeter VΩmA (+ Red Probe)')
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
        if (comp.kind === 'seg7_10') {
            // Authentic 10-Pin Common-Cathode 5161AS 7-Segment Pinout (0.1" = 36px breadboard pitch!)
            // Top Row (Row d, y=-108): 10=g, 9=f, 8=COM, 7=a, 6=b
            // Bot Row (Row g, y=+108):  1=e, 2=d, 3=COM, 4=c, 5=dp
            return [
                buildPin(comp, 'g',    -72, -108, 0, -1, 'in',  'Pin 10 · Segment g (Middle)'),
                buildPin(comp, 'f',    -36, -108, 0, -1, 'in',  'Pin 9 · Segment f (Top-Left)'),
                buildPin(comp, 'com1',   0, -108, 0, -1, 'gnd', 'Pin 8 · Common Cathode (−)'),
                buildPin(comp, 'a',     36, -108, 0, -1, 'in',  'Pin 7 · Segment a (Top)'),
                buildPin(comp, 'b',     72, -108, 0, -1, 'in',  'Pin 6 · Segment b (Top-Right)'),
                buildPin(comp, 'e',    -72,  108, 0,  1, 'in',  'Pin 1 · Segment e (Bottom-Left)'),
                buildPin(comp, 'd',    -36,  108, 0,  1, 'in',  'Pin 2 · Segment d (Bottom)'),
                buildPin(comp, 'com2',   0,  108, 0,  1, 'gnd', 'Pin 3 · Common Cathode (−)'),
                buildPin(comp, 'c',     36,  108, 0,  1, 'in',  'Pin 4 · Segment c (Bottom-Right)'),
                buildPin(comp, 'dp',    72,  108, 0,  1, 'in',  'Pin 5 · Decimal Point (dp)')
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
            const spec = IC_CATALOG[comp.model];
            w = (spec?.pinCount === 16) ? 300 : 264;
            h = 148;
        } else if (comp.kind === 'breadboard') {
            const solverMod = getSolverMod();
            const spec = solverMod ? solverMod.getBreadboardSpec(comp.variant || 'half') : { width: 1188, height: 704 };
            w = spec.width;
            h = spec.height;
        } else if (comp.kind === 'battery') {
            const cells = Math.max(1, Math.min(4, Math.round(comp.cells || (comp.voltage ? comp.voltage / 1.5 : 3))));
            w = 456;
            h = Math.max(124, cells * 66 + 48);
        } else if (comp.kind === 'battery9v') {
            w = 204;
            h = 368;
        } else if (comp.kind === 'psu') {
            w = 900;
            h = 668;
        } else if (comp.kind === 'resistor') {
            w = 148;
            h = 40;
        } else if (comp.kind === 'motor') {
            w = 244;
            h = 152;
        } else if (comp.kind === 'multimeter') {
            w = 316;
            h = 524;
        } else if (comp.kind === 'potentiometer') {
            w = 104;
            h = 132;
        } else if (comp.kind === 'pushbutton') {
            w = 82;
            h = 82;
        } else if (comp.kind === 'spdt') {
            w = 112;
            h = 88;
        } else if (comp.kind === 'buzzer') {
            w = 96;
            h = 116;
        } else if (comp.kind === 'rgb_led') {
            w = 120;
            h = 116;
        } else if (comp.kind === 'npn') {
            w = 86;
            h = 96;
        } else if (comp.kind === 'lamp') {
            w = 56;
            h = 98;
        } else if (comp.kind === 'seg7_10') {
            w = 172;
            h = 224;
        } else if (comp.kind === 'seg7' || comp.kind === 'dip4') {
            w = 88;
            h = 152;
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

    function inferWireColor(doc, pinAKey, pinBKey) {
        const checkKey = k => {
            if (!k) return null;
            const [cid, pin] = k.split(':');
            const c = doc?.components?.find(x => x.id === cid);
            if (!c) return null;
            if (c.kind === 'gnd') return 'black';
            if ((c.kind === 'battery' || c.kind === 'battery9v' || c.kind === 'psu') && pin === 'pos') return 'red';
            if ((c.kind === 'battery' || c.kind === 'battery9v' || c.kind === 'psu') && pin === 'neg') return 'black';
            if (c.kind === 'ic') {
                const sp = IC_CATALOG[c.model];
                if (sp && String(sp.vccPin) === pin) return 'red';
                if (sp && String(sp.gndPin) === pin) return 'black';
            }
            if (c.kind === 'breadboard') {
                if (pin.startsWith('tp') || pin.startsWith('bp')) return 'red';
                if (pin.startsWith('tn') || pin.startsWith('bn')) return 'black';
            }
            return null;
        };
        const a = checkKey(pinAKey);
        const b = checkKey(pinBKey);
        if (a === 'red' || b === 'red') return 'red';
        if (a === 'black' || b === 'black') return 'black';
        return null;
    }

    function connectICWire(doc, pinAKey, pinBKey, waypoints = [], extra = {}) {
        if (!pinAKey || !pinBKey || pinAKey === pinBKey) return false;
        const exists = doc.wires.some(
            w => (w.from === pinAKey && w.to === pinBKey) || (w.from === pinBKey && w.to === pinAKey)
        );
        if (exists) return false;
        const chosenColor = (extra && extra.color && extra.color !== 'auto')
            ? extra.color
            : inferWireColor(doc, pinAKey, pinBKey);
        const wireObj = {
            id: (extra && extra.id) || uid('w'),
            from: pinAKey,
            to: pinBKey,
            waypoints: Array.isArray(waypoints) ? waypoints : []
        };
        if (chosenColor) wireObj.color = chosenColor;
        if (extra && extra.label) wireObj.label = extra.label;
        doc.wires.push(wireObj);
        return true;
    }

    function tidyAllWires(doc) {
        if (!doc || !Array.isArray(doc.wires)) return doc;
        for (const w of doc.wires) {
            w.waypoints = [];
            if (!w.color) {
                const inferred = inferWireColor(doc, w.from, w.to);
                if (inferred) w.color = inferred;
            }
        }
        return doc;
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

    function evalMsiIC(comp, spec, getPin, phase = 'settle') {
        if (!comp.state) {
            comp.state = {
                q: [0, 0, 0, 0],
                qBar: [1, 1, 1, 1],
                count: 0,
                prevClk1: 0,
                prevClk2: 0
            };
        }
        const st = comp.state;
        const isCommit = phase === 'commit';
        const P = (pin, def = 0) => {
            const v = getPin(`${comp.id}:${pin}`);
            return (v === 0 || v === 1) ? v : def;
        };
        const outPins = new Map();
        let summary = '';

        if (comp.model === '7474') {
            const clr1 = P(1, 1), d1 = P(2, 0), clk1 = P(3, 0), pre1 = P(4, 1);
            const clr2 = P(13, 1), d2 = P(12, 0), clk2 = P(11, 0), pre2 = P(10, 1);

            let q1 = st.q[0] ? 1 : 0;
            let qb1 = st.qBar[0] ? 1 : 0;
            if (pre1 === 0 && clr1 === 0) {
                q1 = 1; qb1 = 1;
            } else if (pre1 === 0) {
                q1 = 1; qb1 = 0;
            } else if (clr1 === 0) {
                q1 = 0; qb1 = 1;
            } else if (isCommit && st.prevClk1 === 0 && clk1 === 1) {
                q1 = d1; qb1 = d1 ? 0 : 1;
            }

            let q2 = st.q[1] ? 1 : 0;
            let qb2 = st.qBar[1] ? 1 : 0;
            if (pre2 === 0 && clr2 === 0) {
                q2 = 1; qb2 = 1;
            } else if (pre2 === 0) {
                q2 = 1; qb2 = 0;
            } else if (clr2 === 0) {
                q2 = 0; qb2 = 1;
            } else if (isCommit && st.prevClk2 === 0 && clk2 === 1) {
                q2 = d2; qb2 = d2 ? 0 : 1;
            }

            if (isCommit) {
                st.q[0] = q1; st.qBar[0] = qb1; st.prevClk1 = clk1;
                st.q[1] = q2; st.qBar[1] = qb2; st.prevClk2 = clk2;
            }
            outPins.set(5, q1); outPins.set(6, qb1);
            outPins.set(9, q2); outPins.set(8, qb2);
            summary = `Q1=${q1} Q2=${q2}`;
        } else if (comp.model === '7475') {
            const d1 = P(2, 0), d2 = P(3, 0), en12 = P(4, 0);
            const d3 = P(6, 0), d4 = P(7, 0), en34 = P(12, 0);
            const q = [...(st.q || [0, 0, 0, 0])];
            if (en12 === 1) { q[0] = d1; q[1] = d2; }
            if (en34 === 1) { q[2] = d3; q[3] = d4; }
            if (isCommit) {
                st.q = q;
                st.qBar = q.map(b => (b ? 0 : 1));
            }
            outPins.set(15, q[0]); outPins.set(1, q[0] ? 0 : 1);
            outPins.set(14, q[1]); outPins.set(13, q[1] ? 0 : 1);
            outPins.set(11, q[2]); outPins.set(10, q[2] ? 0 : 1);
            outPins.set(9, q[3]); outPins.set(5, q[3] ? 0 : 1);
            summary = `Q=${q[3]}${q[2]}${q[1]}${q[0]}`;
        } else if (comp.model === '74279') {
            const pairs = [
                { s: P(1, 0), r: P(2, 0), qPin: 4, qbPin: 3, idx: 0 },
                { s: P(5, 0), r: P(6, 0), qPin: 7, qbPin: null, idx: 1 },
                { s: P(9, 0), r: P(10, 0), qPin: 11, qbPin: 12, idx: 2 },
                { s: P(13, 0), r: P(14, 0), qPin: 15, qbPin: null, idx: 3 }
            ];
            const q = [...(st.q || [0, 0, 0, 0])];
            const qb = [...(st.qBar || [1, 1, 1, 1])];
            for (const p of pairs) {
                if (p.s === 1 && p.r === 0) { q[p.idx] = 1; qb[p.idx] = 0; }
                else if (p.s === 0 && p.r === 1) { q[p.idx] = 0; qb[p.idx] = 1; }
                else if (p.s === 1 && p.r === 1) { q[p.idx] = 0; qb[p.idx] = 0; }
                outPins.set(p.qPin, q[p.idx]);
                if (p.qbPin) outPins.set(p.qbPin, qb[p.idx]);
            }
            if (isCommit) { st.q = q; st.qBar = qb; }
            summary = `SR=${q[3]}${q[2]}${q[1]}${q[0]}`;
        } else if (comp.model === '74283') {
            const a = (P(12, 0) << 3) | (P(14, 0) << 2) | (P(3, 0) << 1) | P(5, 0);
            const b = (P(11, 0) << 3) | (P(15, 0) << 2) | (P(2, 0) << 1) | P(6, 0);
            const c0 = P(7, 0);
            const sum = a + b + c0;
            outPins.set(4, (sum >> 0) & 1);
            outPins.set(1, (sum >> 1) & 1);
            outPins.set(13, (sum >> 2) & 1);
            outPins.set(10, (sum >> 3) & 1);
            outPins.set(9, (sum >> 4) & 1);
            summary = `${a}+${b}+${c0}=${sum}`;
        } else if (comp.model === '74157') {
            const sel = P(1, 0);
            const enBar = P(15, 0);
            if (enBar === 1) {
                outPins.set(4, 0); outPins.set(7, 0); outPins.set(9, 0); outPins.set(12, 0);
                summary = 'DISABLED';
            } else {
                const y1 = sel ? P(3, 0) : P(2, 0);
                const y2 = sel ? P(6, 0) : P(5, 0);
                const y3 = sel ? P(10, 0) : P(11, 0);
                const y4 = sel ? P(13, 0) : P(14, 0);
                outPins.set(4, y1); outPins.set(7, y2); outPins.set(9, y3); outPins.set(12, y4);
                summary = `SEL=${sel ? 'B' : 'A'} Y=${y4}${y3}${y2}${y1}`;
            }
        } else if (comp.model === '74148') {
            const rawPins = [10, 11, 12, 13, 1, 2, 3, 4].map(p => getPin(`${comp.id}:${p}`));
            const eiRaw = getPin(`${comp.id}:5`);
            const activeLowMode = (eiRaw === 0) && rawPins.some(v => v === 0) && !rawPins.some(v => v === 1);
            if (activeLowMode) {
                let pri = -1;
                for (let i = 7; i >= 0; i--) {
                    if (rawPins[i] === 0) { pri = i; break; }
                }
                const valid = pri >= 0;
                const code = valid ? pri : 0;
                outPins.set(9, valid ? (((code >> 0) & 1) ^ 1) : 1);
                outPins.set(7, valid ? (((code >> 1) & 1) ^ 1) : 1);
                outPins.set(6, valid ? (((code >> 2) & 1) ^ 1) : 1);
                outPins.set(14, valid ? 0 : 1);
                outPins.set(15, valid ? 1 : 0);
                summary = valid ? `PRI=I${pri}' (${code})` : 'IDLE';
            } else {
                const d = [P(10, 0), P(11, 0), P(12, 0), P(13, 0), P(1, 0), P(2, 0), P(3, 0), P(4, 0)];
                let pri = -1;
                for (let i = 7; i >= 0; i--) {
                    if (d[i] === 1) { pri = i; break; }
                }
                const valid = pri >= 0 ? 1 : 0;
                const code = pri >= 0 ? pri : 0;
                outPins.set(9, (code >> 0) & 1);
                outPins.set(7, (code >> 1) & 1);
                outPins.set(6, (code >> 2) & 1);
                outPins.set(14, valid);
                outPins.set(15, valid ? 0 : 1);
                summary = valid ? `PRI=D${pri} (${code})` : 'IDLE';
            }
        } else if (comp.model === '7493') {
            const clk = P(1, 0);
            const r1 = P(2, 0), r2 = P(3, 0);
            let cnt = st.count || 0;
            if (r1 === 1 && r2 === 1) {
                cnt = 0;
            } else if (isCommit) {
                if (st.prevClk93 === undefined) {
                    st.prevClk93 = clk;
                } else if (st.prevClk93 === 1 && clk === 0) {
                    cnt = (cnt + 1) & 0x0F;
                }
            }
            if (isCommit) {
                st.count = cnt;
                st.prevClk93 = clk;
            }
            outPins.set(12, (cnt >> 0) & 1);
            outPins.set(9, (cnt >> 1) & 1);
            outPins.set(8, (cnt >> 2) & 1);
            outPins.set(11, (cnt >> 3) & 1);
            summary = `CNT=${cnt} (0x${cnt.toString(16).toUpperCase()})`;
        }

        return { outPins, summary };
    }

    function evaluateICBench(doc) {
        const solverMod = getSolverMod();
        if (solverMod && typeof solverMod.evaluateHybridBench === 'function') {
            const res = solverMod.evaluateHybridBench(doc, {
                IC_CATALOG,
                evalSingleGate,
                allICPins,
                getComponentPins,
                evalMsiIC
            });
            // Compute per-segment illumination for realistic 10-pin 7-segment displays (seg7_10)
            // directly from the untouched solver's pinVoltages & pinToNet maps!
            const seg7TenStates = new Map();
            const segNames = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'dp'];
            for (const comp of doc.components) {
                if (comp.kind !== 'seg7_10') continue;
                const vCom1 = res.pinVoltages ? res.pinVoltages.get(`${comp.id}:com1`) : null;
                const vCom2 = res.pinVoltages ? res.pinVoltages.get(`${comp.id}:com2`) : null;
                const vCom = (vCom1 !== null && vCom1 !== undefined && Number.isFinite(vCom1))
                    ? vCom1
                    : (vCom2 !== null && vCom2 !== undefined && Number.isFinite(vCom2) ? vCom2 : null);

                // Collect strong voltage source positive net IDs (> 3.6V) to detect direct un-resisted segment shorts
                const highSrcNets = new Set();
                for (const c of doc.components) {
                    if (c.kind === 'battery' || c.kind === 'battery9v' || c.kind === 'psu') {
                        const vp = res.pinVoltages ? res.pinVoltages.get(`${c.id}:pos`) : null;
                        if (vp !== null && vp > 3.6) {
                            const nid = res.pinToNet.get(`${c.id}:pos`);
                            if (nid !== undefined) highSrcNets.add(nid);
                        }
                    }
                }

                const segs = {};
                let litCount = 0;
                let anyOverloaded = false;
                for (const sn of segNames) {
                    const key = `${comp.id}:${sn}`;
                    const vSeg = res.pinVoltages ? res.pinVoltages.get(key) : null;
                    const drop = (vSeg !== null && vSeg !== undefined && vCom !== null) ? (vSeg - vCom) : 0;
                    const segNet = res.pinToNet.get(key);
                    const directHigh = segNet !== undefined && highSrcNets.has(segNet) && drop > 3.6;
                    const lit = drop >= 1.75 && !directHigh;
                    if (lit) litCount++;
                    if (directHigh) anyOverloaded = true;
                    segs[sn] = {
                        lit,
                        overloaded: directHigh,
                        voltageDrop: drop,
                        brightness: lit ? Math.max(0.45, Math.min(1, (drop - 1.5) / 2.2)) : 0
                    };
                }
                if (anyOverloaded && Array.isArray(res.faults)) {
                    res.faults.push({
                        compId: comp.id,
                        label: comp.label || '7-SEG',
                        message: '7-Segment pin connected directly to >3.6V without a 220Ω resistor!'
                    });
                }
                seg7TenStates.set(comp.id, { segs, litCount, overloaded: anyOverloaded });
            }
            res.seg7TenStates = seg7TenStates;
            return res;
        }

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
        // Closed switches conduct between in and out when both terminals are wired in series
        for (const comp of doc.components) {
            if (comp.kind === 'resistor') {
                addEdge(`${comp.id}:a`, `${comp.id}:b`);
            } else if (comp.kind === 'switch' && comp.closed) {
                const inKey = `${comp.id}:in`;
                const outKey = `${comp.id}:out`;
                if (wireConnectedPins.has(inKey) && wireConnectedPins.has(outKey)) {
                    addEdge(inKey, outKey);
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
            nets.push({ id: netIdx, pins: members, value: null, conflict: false, hasTrueGround: false });
        }

        // Track strong vs weak drivers per net
        // Strong drivers: battery pos (1), battery neg (0), gnd (0), clock (0/1), closed standalone switch (1), IC gate outputs (0/1)
        // Weak drivers: open logic switch pull-down (0) so IC gate inputs read LOW (0) without acting as a current sink to ground
        const baseStrongDrivers = new Map(); // pinKey -> 0 | 1
        const baseWeakDrivers = new Map();   // pinKey -> 0 | 1
        const openSeriesSwitches = [];       // { inKey, outKey }

        for (const comp of doc.components) {
            if (comp.kind === 'battery') {
                baseStrongDrivers.set(`${comp.id}:pos`, 1);
                baseStrongDrivers.set(`${comp.id}:neg`, 0);
            } else if (comp.kind === 'gnd') {
                baseStrongDrivers.set(`${comp.id}:pin`, 0);
            } else if (comp.kind === 'clock') {
                baseStrongDrivers.set(`${comp.id}:out`, comp.value ? 1 : 0);
            } else if (comp.kind === 'dip4') {
                const bits = Array.isArray(comp.bits) ? comp.bits : [0, 0, 0, 0];
                for (let b = 0; b < 4; b++) {
                    const key = `${comp.id}:B${b}`;
                    if (bits[b]) baseStrongDrivers.set(key, 1);
                    else baseWeakDrivers.set(key, 0);
                }
            } else if (comp.kind === 'switch') {
                const inKey = `${comp.id}:in`;
                const outKey = `${comp.id}:out`;
                const inWired = wireConnectedPins.has(inKey);
                const outWired = wireConnectedPins.has(outKey);
                if (inWired && outWired) {
                    if (!comp.closed) {
                        openSeriesSwitches.push({ inKey, outKey });
                    }
                } else {
                    // Standalone logic switch mode (works whether user wired 'out' or 'in'):
                    const activeKey = (inWired && !outWired) ? inKey : outKey;
                    if (comp.closed) {
                        baseStrongDrivers.set(activeKey, 1);
                    } else {
                        baseWeakDrivers.set(activeKey, 0);
                    }
                }
            } else if (comp.kind === 'ic' && doc.autoPower) {
                const spec = IC_CATALOG[comp.model];
                const vccPin = spec?.vccPin || 14;
                const gndPin = spec?.gndPin || 7;
                baseStrongDrivers.set(`${comp.id}:${vccPin}`, 1);
                baseStrongDrivers.set(`${comp.id}:${gndPin}`, 0);
            }
        }

        const icOutputDrivers = new Map(); // pinKey -> 0 | 1
        const icStates = new Map();        // compId -> { powered, fault, gates: Map(gateId -> { outVal, inVals }), msiSummary }

        function evalMsiIC(comp, spec, getPin, phase = 'settle') {
            if (!comp.state) {
                comp.state = {
                    q: [0, 0, 0, 0],
                    qBar: [1, 1, 1, 1],
                    count: 0,
                    prevClk1: 0,
                    prevClk2: 0
                };
            }
            const st = comp.state;
            const isCommit = phase === 'commit';
            const P = (pin, def = 0) => {
                const v = getPin(`${comp.id}:${pin}`);
                return (v === 0 || v === 1) ? v : def;
            };
            const outPins = new Map();
            let summary = '';

            if (comp.model === '7474') {
                // Dual Positive-Edge-Triggered D Flip-Flop w/ Preset & Clear (active-low PRE'/CLR' float HIGH)
                const clr1 = P(1, 1), d1 = P(2, 0), clk1 = P(3, 0), pre1 = P(4, 1);
                const clr2 = P(13, 1), d2 = P(12, 0), clk2 = P(11, 0), pre2 = P(10, 1);

                let q1 = st.q[0] ? 1 : 0;
                let qb1 = st.qBar[0] ? 1 : 0;
                if (pre1 === 0 && clr1 === 0) {
                    q1 = 1; qb1 = 1;
                } else if (pre1 === 0) {
                    q1 = 1; qb1 = 0;
                } else if (clr1 === 0) {
                    q1 = 0; qb1 = 1;
                } else if (isCommit && st.prevClk1 === 0 && clk1 === 1) {
                    q1 = d1; qb1 = d1 ? 0 : 1;
                }

                let q2 = st.q[1] ? 1 : 0;
                let qb2 = st.qBar[1] ? 1 : 0;
                if (pre2 === 0 && clr2 === 0) {
                    q2 = 1; qb2 = 1;
                } else if (pre2 === 0) {
                    q2 = 1; qb2 = 0;
                } else if (clr2 === 0) {
                    q2 = 0; qb2 = 1;
                } else if (isCommit && st.prevClk2 === 0 && clk2 === 1) {
                    q2 = d2; qb2 = d2 ? 0 : 1;
                }

                if (isCommit) {
                    st.q[0] = q1; st.qBar[0] = qb1; st.prevClk1 = clk1;
                    st.q[1] = q2; st.qBar[1] = qb2; st.prevClk2 = clk2;
                }
                outPins.set(5, q1); outPins.set(6, qb1);
                outPins.set(9, q2); outPins.set(8, qb2);
                summary = `Q1=${q1} Q2=${q2}`;
            } else if (comp.model === '7475') {
                // 4-Bit Bistable Transparent D-Latch
                const d1 = P(2, 0), d2 = P(3, 0), en12 = P(4, 0);
                const d3 = P(6, 0), d4 = P(7, 0), en34 = P(12, 0);
                const q = [...(st.q || [0, 0, 0, 0])];
                if (en12 === 1) { q[0] = d1; q[1] = d2; }
                if (en34 === 1) { q[2] = d3; q[3] = d4; }
                if (isCommit) {
                    st.q = q;
                    st.qBar = q.map(b => (b ? 0 : 1));
                }
                outPins.set(15, q[0]); outPins.set(1, q[0] ? 0 : 1);
                outPins.set(14, q[1]); outPins.set(13, q[1] ? 0 : 1);
                outPins.set(11, q[2]); outPins.set(10, q[2] ? 0 : 1);
                outPins.set(9, q[3]); outPins.set(5, q[3] ? 0 : 1);
                summary = `Q=${q[3]}${q[2]}${q[1]}${q[0]}`;
            } else if (comp.model === '74279') {
                // Quad S-R Bistable Latch (Active-HIGH S/R for intuitive bench operation)
                const pairs = [
                    { s: P(1, 0), r: P(2, 0), qPin: 4, qbPin: 3, idx: 0 },
                    { s: P(5, 0), r: P(6, 0), qPin: 7, qbPin: null, idx: 1 },
                    { s: P(9, 0), r: P(10, 0), qPin: 11, qbPin: 12, idx: 2 },
                    { s: P(13, 0), r: P(14, 0), qPin: 15, qbPin: null, idx: 3 }
                ];
                const q = [...(st.q || [0, 0, 0, 0])];
                const qb = [...(st.qBar || [1, 1, 1, 1])];
                for (const p of pairs) {
                    if (p.s === 1 && p.r === 0) { q[p.idx] = 1; qb[p.idx] = 0; }
                    else if (p.s === 0 && p.r === 1) { q[p.idx] = 0; qb[p.idx] = 1; }
                    else if (p.s === 1 && p.r === 1) { q[p.idx] = 0; qb[p.idx] = 0; }
                    outPins.set(p.qPin, q[p.idx]);
                    if (p.qbPin) outPins.set(p.qbPin, qb[p.idx]);
                }
                if (isCommit) { st.q = q; st.qBar = qb; }
                summary = `SR=${q[3]}${q[2]}${q[1]}${q[0]}`;
            } else if (comp.model === '74283') {
                // 4-Bit Binary Full Adder with Fast Carry
                const a = (P(12, 0) << 3) | (P(14, 0) << 2) | (P(3, 0) << 1) | P(5, 0);
                const b = (P(11, 0) << 3) | (P(15, 0) << 2) | (P(2, 0) << 1) | P(6, 0);
                const c0 = P(7, 0);
                const sum = a + b + c0;
                outPins.set(4, (sum >> 0) & 1);
                outPins.set(1, (sum >> 1) & 1);
                outPins.set(13, (sum >> 2) & 1);
                outPins.set(10, (sum >> 3) & 1);
                outPins.set(9, (sum >> 4) & 1);
                summary = `${a}+${b}+${c0}=${sum}`;
            } else if (comp.model === '74157') {
                // Quad 2-to-1 Data Multiplexer (Pin 1 = SEL, Pin 15 = EN' active-low)
                const sel = P(1, 0);
                const enBar = P(15, 0);
                if (enBar === 1) {
                    outPins.set(4, 0); outPins.set(7, 0); outPins.set(9, 0); outPins.set(12, 0);
                    summary = 'DISABLED';
                } else {
                    const y1 = sel ? P(3, 0) : P(2, 0);
                    const y2 = sel ? P(6, 0) : P(5, 0);
                    const y3 = sel ? P(10, 0) : P(11, 0);
                    const y4 = sel ? P(13, 0) : P(14, 0);
                    outPins.set(4, y1); outPins.set(7, y2); outPins.set(9, y3); outPins.set(12, y4);
                    summary = `SEL=${sel ? 'B' : 'A'} Y=${y4}${y3}${y2}${y1}`;
                }
            } else if (comp.model === '74148') {
                // 8-to-3 Priority Encoder (inputs 0..7 on pins 10,11,12,13,1,2,3,4; Pin 5 = EI'; outputs A0=9, A1=7, A2=6, GS=14, EO=15)
                const rawPins = [10, 11, 12, 13, 1, 2, 3, 4].map(p => getPin(`${comp.id}:${p}`));
                const eiRaw = getPin(`${comp.id}:5`);
                const activeLowMode = (eiRaw === 0) && rawPins.some(v => v === 0) && !rawPins.some(v => v === 1);
                if (activeLowMode) {
                    let pri = -1;
                    for (let i = 7; i >= 0; i--) {
                        if (rawPins[i] === 0) { pri = i; break; }
                    }
                    const valid = pri >= 0;
                    const code = valid ? pri : 0;
                    outPins.set(9, valid ? (((code >> 0) & 1) ^ 1) : 1);
                    outPins.set(7, valid ? (((code >> 1) & 1) ^ 1) : 1);
                    outPins.set(6, valid ? (((code >> 2) & 1) ^ 1) : 1);
                    outPins.set(14, valid ? 0 : 1);
                    outPins.set(15, valid ? 1 : 0);
                    summary = valid ? `PRI=I${pri}' (${code})` : 'IDLE';
                } else {
                    const d = [P(10, 0), P(11, 0), P(12, 0), P(13, 0), P(1, 0), P(2, 0), P(3, 0), P(4, 0)];
                    let pri = -1;
                    for (let i = 7; i >= 0; i--) {
                        if (d[i] === 1) { pri = i; break; }
                    }
                    const valid = pri >= 0 ? 1 : 0;
                    const code = pri >= 0 ? pri : 0;
                    outPins.set(9, (code >> 0) & 1);
                    outPins.set(7, (code >> 1) & 1);
                    outPins.set(6, (code >> 2) & 1);
                    outPins.set(14, valid);
                    outPins.set(15, valid ? 0 : 1);
                    summary = valid ? `PRI=D${pri} (${code})` : 'IDLE';
                }
            } else if (comp.model === '7493') {
                // 4-Bit Binary Ripple Counter (Pin 1 = CLK, Pins 2 & 3 = Reset R0(1)&R0(2); QA=12, QB=9, QC=8, QD=11)
                const clk = P(1, 0);
                const r1 = P(2, 0), r2 = P(3, 0);
                let cnt = st.count || 0;
                if (r1 === 1 && r2 === 1) {
                    cnt = 0;
                } else if (isCommit) {
                    if (st.prevClk93 === undefined) {
                        st.prevClk93 = clk;
                    } else if (st.prevClk93 === 1 && clk === 0) {
                        cnt = (cnt + 1) & 0x0F;
                    }
                }
                if (isCommit) {
                    st.count = cnt;
                    st.prevClk93 = clk;
                }
                outPins.set(12, (cnt >> 0) & 1);
                outPins.set(9, (cnt >> 1) & 1);
                outPins.set(8, (cnt >> 2) & 1);
                outPins.set(11, (cnt >> 3) & 1);
                summary = `CNT=${cnt} (0x${cnt.toString(16).toUpperCase()})`;
            }

            return { outPins, summary };
        }

        function resolveNets() {
            const netState = nets.map(net => {
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
                return { hasStrong1, hasStrong0, hasWeak1, hasWeak0 };
            });

            // If an open series switch has +5V (strong 1) on one side and no strong driver on the other,
            // provide a weak logic-0 pull-down on the load side for IC logic inputs (not a true ground sink).
            for (const sw of openSeriesSwitches) {
                const netA = pinToNet.get(sw.inKey);
                const netB = pinToNet.get(sw.outKey);
                if (netA === undefined || netB === undefined) continue;
                const stA = netState[netA];
                const stB = netState[netB];
                if (stA.hasStrong1 && !stB.hasStrong1 && !stB.hasStrong0) {
                    stB.hasWeak0 = true;
                } else if (stB.hasStrong1 && !stA.hasStrong1 && !stA.hasStrong0) {
                    stA.hasWeak0 = true;
                }
            }

            for (let i = 0; i < nets.length; i++) {
                const net = nets[i];
                const { hasStrong1, hasStrong0, hasWeak1, hasWeak0 } = netState[i];

                net.conflict = hasStrong1 && hasStrong0;
                net.hasTrueGround = hasStrong0 && !hasStrong1;
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

        function runCombinationalSettle(maxIter = 32) {
            for (let iter = 0; iter < maxIter; iter++) {
                let changed = false;

                for (const comp of doc.components) {
                    if (comp.kind !== 'ic') continue;
                    const spec = IC_CATALOG[comp.model];
                    if (!spec) continue;

                    const vccPinKey = `${comp.id}:${spec.vccPin}`;
                    const gndPinKey = `${comp.id}:${spec.gndPin}`;
                    const vccVal = doc.autoPower ? 1 : getPinValue(vccPinKey);
                    const gndVal = doc.autoPower ? 0 : getPinValue(gndPinKey);
                    const gndNet = nets[pinToNet.get(gndPinKey)];
                    const hasTrueGnd = doc.autoPower ? true : Boolean(gndNet && gndNet.hasTrueGround);

                    const reversePower = (vccVal === 0 && gndVal === 1);
                    const powered = (vccVal === 1 && gndVal === 0 && hasTrueGnd);

                    if (spec.msi) {
                        const outList = spec.outputs || [];
                        if (!powered) {
                            for (const p of outList) {
                                const outKey = `${comp.id}:${p}`;
                                if (icOutputDrivers.has(outKey)) {
                                    icOutputDrivers.delete(outKey);
                                    changed = true;
                                }
                            }
                            icStates.set(comp.id, {
                                powered,
                                reversePower,
                                vccVal,
                                gndVal,
                                gates: new Map(),
                                msiSummary: 'OFF'
                            });
                            continue;
                        }

                        const { outPins, summary } = evalMsiIC(comp, spec, getPinValue, 'settle');
                        for (const [p, outVal] of outPins.entries()) {
                            const outKey = `${comp.id}:${p}`;
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
                            gates: new Map(),
                            msiSummary: summary
                        });
                        continue;
                    }

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
        }

        // Phase A: Pre-edge combinational & latch settle
        runCombinationalSettle(32);

        // Phase B: Synchronous master-slave edge sample & commit using settled pre-edge net values
        const preEdgeNetValues = nets.map(n => n.value);
        const getPreEdgePinValue = pinKey => {
            const netIdx = pinToNet.get(pinKey);
            if (netIdx === undefined) return null;
            return preEdgeNetValues[netIdx];
        };

        let edgeChanged = false;
        for (const comp of doc.components) {
            if (comp.kind !== 'ic') continue;
            const spec = IC_CATALOG[comp.model];
            if (!spec || !spec.msi) continue;
            const st = icStates.get(comp.id);
            if (!st || !st.powered) continue;

            const { outPins, summary } = evalMsiIC(comp, spec, getPreEdgePinValue, 'commit');
            st.msiSummary = summary;
            for (const [p, outVal] of outPins.entries()) {
                const outKey = `${comp.id}:${p}`;
                const prev = icOutputDrivers.get(outKey) ?? null;
                if (outVal === 0 || outVal === 1) {
                    if (prev !== outVal) {
                        icOutputDrivers.set(outKey, outVal);
                        edgeChanged = true;
                    }
                } else if (icOutputDrivers.has(outKey)) {
                    icOutputDrivers.delete(outKey);
                    edgeChanged = true;
                }
            }
        }

        if (edgeChanged) {
            resolveNets();
            runCombinationalSettle(16);
        }

        // Evaluate lamps, 7-seg displays, and logic probes
        const lampStates = new Map();
        const segStates = new Map();
        const probeStates = new Map();

        for (const comp of doc.components) {
            if (comp.kind === 'lamp') {
                const anodeKey = `${comp.id}:anode`;
                const cathodeKey = `${comp.id}:cathode`;
                const anodeVal = getPinValue(anodeKey);
                const cathodeVal = getPinValue(cathodeKey);
                const anodeWired = wireConnectedPins.has(anodeKey);
                const cathodeWired = wireConnectedPins.has(cathodeKey);
                const cathodeNet = nets[pinToNet.get(cathodeKey)];
                const cathodeTrueGnd = Boolean(cathodeWired && cathodeVal === 0 && cathodeNet && cathodeNet.hasTrueGround);

                // Physical circuit rule: An LED/Lamp MUST have a complete, closed circuit to a true ground sink.
                // It CANNOT light up if the cathode is floating/open, behind an open switch, or ungrounded.
                let lit = false;
                let reason = 'off';

                if (anodeVal === 1 && cathodeTrueGnd) {
                    lit = true;
                    reason = 'lit';
                } else if (anodeVal === 1 && (!cathodeWired || cathodeVal === null || !cathodeTrueGnd) && cathodeVal !== 1) {
                    reason = 'open_cathode';
                } else if (cathodeTrueGnd && (!anodeWired || anodeVal === null)) {
                    reason = 'open_anode';
                } else if (!anodeWired && !cathodeWired) {
                    reason = 'unconnected';
                } else if (anodeVal === 1 && cathodeVal === 1) {
                    reason = 'no_diff_high';
                } else if (anodeVal === 0 && cathodeVal === 1) {
                    reason = 'reverse_bias';
                } else if (anodeVal === 0 && cathodeVal === 0) {
                    reason = 'low_input';
                } else {
                    reason = 'off';
                }

                lampStates.set(comp.id, {
                    lit,
                    anodeVal,
                    cathodeVal,
                    anodeWired,
                    cathodeWired,
                    reason
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
            } else if (comp.kind === 'probe') {
                const tipKey = `${comp.id}:tip`;
                const val = getPinValue(tipKey);
                const netIdx = pinToNet.get(tipKey);
                const conflict = Boolean(netIdx !== undefined && nets[netIdx]?.conflict);
                probeStates.set(comp.id, { value: val, val, conflict });
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

        // Compute realistic electrical & timing telemetry
        let iccMa = 0;
        let maxDelayNs = 0;
        for (const comp of doc.components) {
            if (comp.kind === 'ic') {
                const st = icStates.get(comp.id);
                const spec = IC_CATALOG[comp.model];
                if (st?.powered && spec) {
                    iccMa += spec.iccMa || 8.0;
                    maxDelayNs += spec.tpdNs || 10;
                }
            } else if (comp.kind === 'lamp') {
                if (lampStates.get(comp.id)?.lit) {
                    iccMa += 14.0;
                }
            } else if (comp.kind === 'seg7') {
                if (segStates.get(comp.id)?.value !== null) {
                    iccMa += 28.0;
                }
            }
        }
        if (anyShort) iccMa += 250.0;
        const powerMw = Math.round(iccMa * 5.0 * 10) / 10;
        iccMa = Math.round(iccMa * 10) / 10;

        return {
            pins,
            pinToNet,
            pinValues,
            pinConflicts,
            icStates,
            lampStates,
            segStates,
            probeStates,
            anyShort,
            anyReverse,
            telemetry: {
                iccMa,
                powerMw,
                propagationDelayNs: maxDelayNs
            }
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

        const boxes = doc && doc.components
            ? doc.components.filter(c => c.kind !== 'breadboard').map(c => {
                const b = getComponentBounds(c);
                // Keep inner body of endpoint components protected (so wires exiting a pin cannot cut backwards across their own housing!),
                // and pad non-endpoint components by 12px so wires detour cleanly around them!
                if (c.id === p1.compId || c.id === p2.compId) {
                    return {
                        left: b.left + 12,
                        right: b.right - 12,
                        top: b.top + 12,
                        bottom: b.bottom - 12
                    };
                }
                return {
                    left: b.left - 12,
                    right: b.right + 12,
                    top: b.top - 12,
                    bottom: b.bottom + 12
                };
            })
            : [];

        if (Math.abs(p1.x - p2.x) < 1 && (!p1Vert || (p1.y < p2.y ? (p1.dir?.dy || 0) >= 0 : (p1.dir?.dy || 0) <= 0))) {
            if (!boxes.length || segmentHitsBoxes(p1, p2, boxes) === 0) {
                return [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }];
            }
        }
        if (Math.abs(p1.y - p2.y) < 1 && !p1Vert && !p2Vert) {
            if (!boxes.length || segmentHitsBoxes(p1, p2, boxes) === 0) {
                return [{ x: p1.x, y: p1.y }, { x: p2.x, y: p2.y }];
            }
        }

        const midX = Math.round(((s1.x + s2.x) / 2) / GRID) * GRID + laneShift;
        const midY = Math.round(((s1.y + s2.y) / 2) / GRID) * GRID + laneShift;

        const candidates = [
            orthogonalPath([s1, { x: s1.x, y: midY }, { x: s2.x, y: midY }, s2], true),
            orthogonalPath([s1, { x: midX, y: s1.y }, { x: midX, y: s2.y }, s2], false),
            orthogonalPath([s1, s2], p1Vert),
            orthogonalPath([s1, s2], !p1Vert)
        ];

        if (boxes.length) {
            for (const box of boxes) {
                for (const y of [box.top - 24 + laneShift, box.bottom + 24 + laneShift]) {
                    candidates.push(orthogonalPath([s1, { x: s1.x, y }, { x: s2.x, y }, s2], true));
                }
                for (const x of [box.left - 24 + laneShift, box.right + 24 + laneShift]) {
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
                if (boxes.length) {
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

            // Auto-separate overlapping parallel vertical or horizontal lanes on different nets with generous 14px spacing
            if (!w.waypoints || !w.waypoints.length) {
                const shifts = [0, 14, -14, 28, -28, 42, -42, 56, -56, 70, -70];
                for (const sh of shifts) {
                    const tryPts = sh === 0 ? pts : routeICWire(p1, p2, null, doc, sh);
                    let overlap = false;
                    for (let i = 1; i < tryPts.length - 1; i++) {
                        const a = tryPts[i - 1];
                        const b = tryPts[i];
                        if (Math.abs(a.x - b.x) < 1e-4 && Math.abs(a.y - b.y) > 4) {
                            const minY = Math.min(a.y, b.y);
                            const maxY = Math.max(a.y, b.y);
                            if (vertSegs.some(v => v.netId !== netId && Math.abs(v.x - a.x) < 8 && Math.min(maxY, v.y2) - Math.max(minY, v.y1) > 4)) {
                                overlap = true;
                                break;
                            }
                        } else if (Math.abs(a.y - b.y) < 1e-4 && Math.abs(a.x - b.x) > 4) {
                            const minX = Math.min(a.x, b.x);
                            const maxX = Math.max(a.x, b.x);
                            if (horizSegs.some(h => h.netId !== netId && Math.abs(h.y - a.y) < 8 && Math.min(maxX, h.x2) - Math.max(minX, h.x1) > 4)) {
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
                const gndHi = createICComponent('gnd', 126, 216, { id: 'gndHi' });
                const gndLo = createICComponent('gnd', 378, 216, { id: 'gndLo' });

                doc.components.push(sw1, sw2, sw3, ic11, ic04, lampHigh, lampLow, gndHi, gndLo);

                // Wire 3 switches to 7411 Gate 2 inputs (Pins 3, 4, 5)
                connectICWire(doc, 'sw1:out', 'ic7411:3', [{ x: -216, y: -36 }, { x: -216, y: 90 }, { x: -90, y: 90 }]);
                connectICWire(doc, 'sw2:out', 'ic7411:4', [{ x: -234, y: 36 }, { x: -234, y: 108 }, { x: -54, y: 108 }]);
                connectICWire(doc, 'sw3:out', 'ic7411:5', [{ x: -18, y: 108 }]);

                // 7411 Output Pin 6 -> ALL HIGH Lamp and 7404 Input Pin 1
                connectICWire(doc, 'ic7411:6', 'lampHi:anode', [{ x: 18, y: 144 }]);
                connectICWire(doc, 'lampHi:cathode', 'gndHi:pin', [{ x: 126, y: 180 }]);
                connectICWire(doc, 'ic7411:6', 'ic7404:1', [{ x: 18, y: 90 }, { x: 144, y: 90 }]);
                connectICWire(doc, 'ic7404:2', 'lampLo:anode', [{ x: 180, y: 144 }]);
                connectICWire(doc, 'lampLo:cathode', 'gndLo:pin', [{ x: 378, y: 180 }]);

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
                const gnd1 = createICComponent('gnd', 252, 180, { id: 'gnd1' });

                doc.components.push(clk, sw, ic00, lamp, seg, gnd1);

                connectICWire(doc, 'clk1:out', 'ic7400:1', [{ x: -198, y: -36 }, { x: -198, y: 72 }, { x: -144, y: 72 }]);
                connectICWire(doc, 'sw1:out', 'ic7400:2', [{ x: -108, y: 54 }]);
                connectICWire(doc, 'ic7400:3', 'lamp1:anode', [{ x: -72, y: 108 }]);
                connectICWire(doc, 'lamp1:cathode', 'gnd1:pin', [{ x: 252, y: 144 }]);
                connectICWire(doc, 'clk1:out', 'seg1:A', [{ x: -198, y: -36 }, { x: -198, y: -108 }, { x: 180, y: -108 }, { x: 180, y: -90 }]);
                connectICWire(doc, 'ic7400:3', 'seg1:B', [{ x: -72, y: 108 }, { x: 144, y: 108 }, { x: 144, y: -54 }]);

                return doc;
            }
        },
        ic_mux_2to1: {
            title: '7404 + 7408 + 7432 — 2-to-1 Data Multiplexer Bench (D0, D1, Select)',
            description: 'Select switch S chooses between Data D0 (when S=0) and Data D1 (when S=1) using a 7404 Inverter, 7408 Quad AND, and 7432 Quad OR driving an indicator lamp.',
            build() {
                const doc = blankICDoc();
                doc.autoPower = true;
                const swD0 = createICComponent('switch', -378, -72, { id: 'swD0', closed: true, label: 'DATA D0' });
                const swD1 = createICComponent('switch', -378, 18, { id: 'swD1', closed: false, label: 'DATA D1' });
                const swSel = createICComponent('switch', -378, 108, { id: 'swSel', closed: false, label: 'SELECT S' });

                const ic04 = createICComponent('7404', -162, 126, { id: 'ic7404' });
                const ic08 = createICComponent('7408', -18, -36, { id: 'ic7408' });
                const ic32 = createICComponent('7432', 234, -36, { id: 'ic7432' });

                const res = createICComponent('resistor', 342, 126, { id: 'rMux', label: '220Ω' });
                const lamp = createICComponent('lamp', 450, 126, { id: 'lampMux', color: 'emerald', label: 'MUX OUT' });
                const gnd = createICComponent('gnd', 504, 198, { id: 'gndMux' });

                doc.components.push(swD0, swD1, swSel, ic04, ic08, ic32, res, lamp, gnd);

                // Select S -> 7404 Pin 1 (invert to S' on Pin 2) and 7408 Gate 2 Pin 5
                connectICWire(doc, 'swSel:out', 'ic7404:1', [{ x: -270, y: 108 }, { x: -270, y: 198 }]);
                connectICWire(doc, 'swSel:out', 'ic7408:5', [{ x: -270, y: 108 }, { x: 18, y: 108 }]);

                // Gate 1 of 7408 (Pins 1, 2 -> Out 3): D0 · S'
                connectICWire(doc, 'swD0:out', 'ic7408:1', [{ x: -126, y: -72 }, { x: -126, y: 36 }]);
                connectICWire(doc, 'ic7404:2', 'ic7408:2', [{ x: -234, y: 216 }, { x: -90, y: 216 }]);

                // Gate 2 of 7408 (Pins 4, 5 -> Out 6): D1 · S
                connectICWire(doc, 'swD1:out', 'ic7408:4', [{ x: -18, y: 18 }]);

                // Combine in 7432 OR Gate 1 (Pins 1, 2 -> Out 3)
                connectICWire(doc, 'ic7408:3', 'ic7432:1', [{ x: -54, y: 72 }, { x: 126, y: 72 }]);
                connectICWire(doc, 'ic7408:6', 'ic7432:2', [{ x: 54, y: 72 }, { x: 162, y: 72 }]);

                // Output Pin 3 of 7432 -> Resistor -> Lamp -> GND
                connectICWire(doc, 'ic7432:3', 'rMux:a', [{ x: 198, y: 126 }]);
                connectICWire(doc, 'rMux:b', 'lampMux:anode');
                connectICWire(doc, 'lampMux:cathode', 'gndMux:pin', [{ x: 504, y: 126 }]);

                return doc;
            }
        },
        ic_comparator_xnor: {
            title: '74266 + 7408 — 2-Bit Equality Comparator Bench (A = B Detector)',
            description: 'Compares two 2-bit binary numbers A(A1,A0) and B(B1,B0) using a 74266 Quad XNOR IC and a 7408 Quad AND IC. The EQUAL lamp illuminates when A1=B1 and A0=B0.',
            build() {
                const doc = blankICDoc();
                doc.autoPower = true;
                const swA0 = createICComponent('switch', -360, -90, { id: 'swA0', closed: true, label: 'A0' });
                const swB0 = createICComponent('switch', -360, -18, { id: 'swB0', closed: true, label: 'B0' });
                const swA1 = createICComponent('switch', -360, 54, { id: 'swA1', closed: false, label: 'A1' });
                const swB1 = createICComponent('switch', -360, 126, { id: 'swB1', closed: false, label: 'B1' });

                const icXnor = createICComponent('74266', -90, 0, { id: 'ic74266' });
                const icAnd = createICComponent('7408', 180, 0, { id: 'ic7408' });
                const lampEq = createICComponent('lamp', 360, 126, { id: 'lampEq', color: 'cyan', label: 'A = B' });
                const gndEq = createICComponent('gnd', 414, 198, { id: 'gndEq' });

                doc.components.push(swA0, swB0, swA1, swB1, icXnor, icAnd, lampEq, gndEq);

                // Bit 0 equality on 74266 Gate 1 (Pins 1, 2 -> Out 3)
                connectICWire(doc, 'swA0:out', 'ic74266:1', [{ x: -198, y: -90 }, { x: -198, y: 72 }]);
                connectICWire(doc, 'swB0:out', 'ic74266:2', [{ x: -162, y: -18 }, { x: -162, y: 72 }]);

                // Bit 1 equality on 74266 Gate 2 (Pins 4, 5 -> Out 6)
                connectICWire(doc, 'swA1:out', 'ic74266:4', [{ x: -90, y: 54 }]);
                connectICWire(doc, 'swB1:out', 'ic74266:5', [{ x: -54, y: 126 }]);

                // Combine both XNOR outputs in 7408 Gate 1 (Pins 1, 2 -> Out 3)
                connectICWire(doc, 'ic74266:3', 'ic7408:1', [{ x: -126, y: 108 }, { x: 72, y: 108 }]);
                connectICWire(doc, 'ic74266:6', 'ic7408:2', [{ x: -18, y: 90 }, { x: 108, y: 90 }]);

                // 7408 Out Pin 3 -> Lamp -> GND
                connectICWire(doc, 'ic7408:3', 'lampEq:anode', [{ x: 144, y: 126 }]);
                connectICWire(doc, 'lampEq:cathode', 'gndEq:pin', [{ x: 414, y: 126 }]);

                return doc;
            }
        },
        ic_74283_adder4: {
            title: '74283 + DIP-4 + 7-Seg — 4-Bit Binary Full Adder ALU Bench',
            description: 'Uses a 16-pin 74283 4-Bit Binary Full Adder IC driven by two 4-Channel DIP Switch Banks (A[3:0] and B[3:0]). Sum Σ[3:0] drives a Hex 7-Segment Display and Carry-Out (Pin 9) drives an Overflow Lamp.',
            build() {
                const doc = blankICDoc();
                doc.autoPower = true;
                const dipA = createICComponent('dip4', -324, -72, { id: 'dipA', bits: [1, 1, 0, 1], label: 'BUS A (11)' });
                const dipB = createICComponent('dip4', -324, 90, { id: 'dipB', bits: [1, 0, 1, 0], label: 'BUS B (5)' });
                const ic283 = createICComponent('74283', 0, 0, { id: 'ic74283' });
                const seg = createICComponent('seg7', 288, -36, { id: 'segSum' });
                const lampCout = createICComponent('lamp', 288, 126, { id: 'lampCout', color: 'amber', label: 'CARRY C4' });
                const gndCout = createICComponent('gnd', 342, 198, { id: 'gndCout' });
                const gndCin = createICComponent('gnd', 72, 144, { id: 'gndCin' });

                doc.components.push(dipA, dipB, ic283, seg, lampCout, gndCout, gndCin);

                // Tie C0 (Pin 7) to GND (0)
                connectICWire(doc, 'ic74283:7', 'gndCin:pin');

                // Bus A -> 74283 A1(5), A2(3), A3(14), A4(12)
                connectICWire(doc, 'dipA:B0', 'ic74283:5');
                connectICWire(doc, 'dipA:B1', 'ic74283:3');
                connectICWire(doc, 'dipA:B2', 'ic74283:14');
                connectICWire(doc, 'dipA:B3', 'ic74283:12');

                // Bus B -> 74283 B1(6), B2(2), B3(15), B4(11)
                connectICWire(doc, 'dipB:B0', 'ic74283:6');
                connectICWire(doc, 'dipB:B1', 'ic74283:2');
                connectICWire(doc, 'dipB:B2', 'ic74283:15');
                connectICWire(doc, 'dipB:B3', 'ic74283:11');

                // Sum outputs Σ1(4), Σ2(1), Σ3(13), Σ4(10) -> 7-Seg A, B, C, D
                connectICWire(doc, 'ic74283:4', 'segSum:A');
                connectICWire(doc, 'ic74283:1', 'segSum:B');
                connectICWire(doc, 'ic74283:13', 'segSum:C');
                connectICWire(doc, 'ic74283:10', 'segSum:D');

                // Carry Out C4 (Pin 9) -> Lamp -> GND
                connectICWire(doc, 'ic74283:9', 'lampCout:anode');
                connectICWire(doc, 'lampCout:cathode', 'gndCout:pin');

                return doc;
            }
        },
        ic_7493_counter: {
            title: '7493 + Clock + 7-Seg — 4-Bit Binary Ripple Counter Bench (0–F)',
            description: 'A 1 Hz Clock drives a 7493 4-Bit Binary Ripple Counter IC (CLK on Pin 1, Master Reset on Pins 2 & 3) connected to a 7-Segment Display and MSB Lamp.',
            build() {
                const doc = blankICDoc();
                doc.autoPower = true;
                const clk = createICComponent('clock', -306, -36, { id: 'clk1', value: 1, label: '1Hz CLK' });
                const swClr = createICComponent('switch', -306, 72, { id: 'swClr', closed: false, label: 'MASTER RESET' });
                const ic93 = createICComponent('7493', -18, 0, { id: 'ic7493' });
                const seg = createICComponent('seg7', 270, -18, { id: 'segCnt' });
                const lampMsb = createICComponent('lamp', 252, 126, { id: 'lampMsb', color: 'cyan', label: 'QD (MSB)' });
                const gndMsb = createICComponent('gnd', 306, 198, { id: 'gndMsb' });

                doc.components.push(clk, swClr, ic93, seg, lampMsb, gndMsb);

                // Clock -> CLK (Pin 1)
                connectICWire(doc, 'clk1:out', 'ic7493:1');
                // Master Reset switch -> R0(1) Pin 2 and R0(2) Pin 3
                connectICWire(doc, 'swClr:out', 'ic7493:2');
                connectICWire(doc, 'swClr:out', 'ic7493:3');

                // Outputs QA(12), QB(9), QC(8), QD(11) -> 7-Seg A, B, C, D
                connectICWire(doc, 'ic7493:12', 'segCnt:A');
                connectICWire(doc, 'ic7493:9', 'segCnt:B');
                connectICWire(doc, 'ic7493:8', 'segCnt:C');
                connectICWire(doc, 'ic7493:11', 'segCnt:D');

                // QD (Pin 11) -> MSB Lamp -> GND
                connectICWire(doc, 'ic7493:11', 'lampMsb:anode');
                connectICWire(doc, 'lampMsb:cathode', 'gndMsb:pin');

                return doc;
            }
        },
        ic_7474_register: {
            title: '7474 — Dual D Flip-Flop Shift Register & Toggle Divider Bench',
            description: 'Demonstrates the 7474 Dual Positive-Edge-Triggered D Flip-Flop IC with active-low Preset/Clear, clocked by a 1 Hz Clock and driving Q1 & Q2 state lamps.',
            build() {
                const doc = blankICDoc();
                doc.autoPower = true;
                const swD = createICComponent('switch', -324, -54, { id: 'swD', closed: true, label: 'DATA D1' });
                const clk = createICComponent('clock', -324, 36, { id: 'clk1', value: 1, label: '1Hz CLK' });
                const ic74 = createICComponent('7474', -18, 0, { id: 'ic7474' });
                const lampQ1 = createICComponent('lamp', 252, 108, { id: 'lampQ1', color: 'emerald', label: 'FF1 Q' });
                const lampQ2 = createICComponent('lamp', 252, -108, { id: 'lampQ2', color: 'cyan', label: 'FF2 Q' });
                const gnd1 = createICComponent('gnd', 306, 180, { id: 'gnd1' });
                const gnd2 = createICComponent('gnd', 306, -36, { id: 'gnd2' });
                const probe1 = createICComponent('probe', -216, 126, { id: 'prb1', label: 'Q1 PROBE' });

                doc.components.push(swD, clk, ic74, lampQ1, lampQ2, gnd1, gnd2, probe1);

                // FF1 Data (Pin 2) & Clock (Pin 3)
                connectICWire(doc, 'swD:out', 'ic7474:2');
                connectICWire(doc, 'clk1:out', 'ic7474:3');
                // Cascade FF1 Q (Pin 5) -> FF2 D (Pin 12), shared Clock -> FF2 CLK (Pin 11)
                connectICWire(doc, 'ic7474:5', 'ic7474:12');
                connectICWire(doc, 'clk1:out', 'ic7474:11');

                // FF1 Q (Pin 5) -> Lamp Q1 & Logic Probe
                connectICWire(doc, 'ic7474:5', 'lampQ1:anode');
                connectICWire(doc, 'lampQ1:cathode', 'gnd1:pin');
                connectICWire(doc, 'ic7474:5', 'prb1:tip');

                // FF2 Q (Pin 9) -> Lamp Q2
                connectICWire(doc, 'ic7474:9', 'lampQ2:anode');
                connectICWire(doc, 'lampQ2:cathode', 'gnd2:pin');

                return doc;
            }
        }
    };

    const BENCH_2D_PRESETS = {
        bb_7408_ic: {
            title: 'Breadboard + 7408 DIP-14 IC — Straddling Center Trough + LED',
            description: '7408 Quad AND DIP-14 IC plugs pin-for-pin across the exact breadboard center trough (Row e & Row f). Powered by 3×AA (4.5V) through the breadboard rails, two tactile buttons drive Gate 1 (Pins 1 & 2) to light a 220Ω-protected 5mm LED!',
            build() {
                const doc = blankICDoc();
                const bb = createICComponent('breadboard', 0, 0, { id: 'bb1', variant: 'half' });
                const bat = createICComponent('battery', -864, -216, { id: 'bat1', cells: 3, label: '3×AA (4.5V)' });
                // 7408 at (36, 0): Top pins 8..14 land in Row e (cols 14..20), Bottom pins 1..7 land in Row f (cols 14..20)!
                const ic = createICComponent('7408', 36, 0, { id: 'ic1', label: '7408' });
                const btnA = createICComponent('pushbutton', -324, 144, { id: 'btnA', latched: true, pressed: true, label: 'IN A' });
                const btnB = createICComponent('pushbutton', -180, 144, { id: 'btnB', latched: true, pressed: true, label: 'IN B' });
                const res = createICComponent('resistor', 288, 144, { id: 'res1', ohms: 220, label: '220Ω' });
                const led = createICComponent('lamp', 378, 180, { id: 'led1', color: 'emerald', label: 'OUT LED' });

                doc.components.push(bb, bat, ic, btnA, btnB, res, led);

                // Supply 3×AA (4.5V) into Top Rails & bridge to Bottom Rails (route negative cleanly below AA pack!)
                connectICWire(doc, 'bat1:pos', 'bb1:tp1', [], { color: 'red', label: '+4.5V' });
                connectICWire(doc, 'bat1:neg', 'bb1:tn1', [{ x: -1080, y: -72 }, { x: -630, y: -72 }, { x: -630, y: -288 }], { color: 'black', label: '0V' });
                connectICWire(doc, 'bb1:tp2', 'bb1:bp2', [], { color: 'red' });
                connectICWire(doc, 'bb1:tn2', 'bb1:bn2', [], { color: 'black' });

                // Power 7408 Pin 14 (e14 = VCC) and Pin 7 (f20 = GND) via straight breadboard jumpers
                connectICWire(doc, 'bb1:tp11', 'bb1:a14', [], { color: 'red' });
                connectICWire(doc, 'bb1:j20', 'bb1:bn16', [], { color: 'black' });

                // Feed Buttons A & B from Bottom + Rail and route outputs into Pin 1 (f14) & Pin 2 (f15)
                connectICWire(doc, 'bb1:bp5', 'bb1:j6', [], { color: 'red' });
                connectICWire(doc, 'bb1:bp8', 'bb1:j10', [], { color: 'red' });
                connectICWire(doc, 'bb1:h8', 'bb1:h14', [], { color: 'blue' });
                connectICWire(doc, 'bb1:i12', 'bb1:i15', [], { color: 'green' });

                // Route Gate 1 Output Pin 3 (f16) -> Resistor (h22..h26) -> 1U LED (i26..i27) -> Bottom − Rail
                connectICWire(doc, 'bb1:j16', 'bb1:j22', [], { color: 'yellow' });
                connectICWire(doc, 'bb1:j27', 'bb1:bn22', [], { color: 'black' });

                return doc;
            }
        },
        bb_wirefree_demo: {
            title: 'Tinkercad Wire-Free Breadboard — SPDT + Pot + NPN + Buzzer + LEDs',
            description: 'Every hardware component is scaled to exact 1U (0.1" = 36 px) Tinkercad breadboard pitch and plugs directly into the breadboard strips WITHOUT inter-component wires! Flip the SPDT switch, twist the Potentiometer, or toggle the Push Button.',
            build() {
                const doc = blankICDoc();
                const bb = createICComponent('breadboard', 0, 0, { id: 'bb1', variant: 'half' });
                const bat = createICComponent('battery', -864, -216, { id: 'bat1', cells: 3, label: '3×AA (4.5V)' });

                // TOP HALF: SPDT Slide Switch (d8,d9,d10) -> 220Ω Resistor (c10..c14) -> 1U Emerald LED (d14..d15) — ZERO WIRES BETWEEN PARTS!
                const spdt = createICComponent('spdt', -252, -144, { id: 'spdt1', positionThrow: 'right', label: 'MODE' });
                const res1 = createICComponent('resistor', -144, -144, { id: 'res1', ohms: 220, label: '220Ω' });
                const led1 = createICComponent('lamp', -54, -108, { id: 'led1', color: 'emerald', label: 'LED 1' });

                // TOP RIGHT: Rotary Potentiometer (d20,d21,d22) -> 220Ω Resistor (c21..c25) -> 1U Cyan LED (d25..d26) — ZERO WIRES BETWEEN PARTS!
                const pot = createICComponent('potentiometer', 180, -144, { id: 'pot1', ohms: 1000, wiper: 0.85, label: 'DIM' });
                const res2 = createICComponent('resistor', 252, -144, { id: 'res2', ohms: 220, label: '220Ω' });
                const led2 = createICComponent('lamp', 342, -108, { id: 'led2', color: 'cyan', label: 'DIM LED' });

                // BOTTOM HALF: Push Button (g6..i8) -> 1kΩ Base Resistor (h8..h12) -> NPN 2N2222 (i11,i12,i13) -> Piezo Buzzer (g13..g15) — ZERO WIRES BETWEEN PARTS!
                const btn = createICComponent('pushbutton', -324, 144, { id: 'btn1', latched: true, pressed: true, label: 'BEEP' });
                const rBase = createICComponent('resistor', -216, 144, { id: 'rBase', ohms: 1000, label: '1kΩ' });
                const q1 = createICComponent('npn', -144, 144, { id: 'q1', model: '2N2222', label: '2N2222' });
                const buz = createICComponent('buzzer', -72, 144, { id: 'buz1', rotation: 180, freqHz: 880, label: 'Buzzer' });

                doc.components.push(bb, bat, spdt, res1, led1, pot, res2, led2, btn, rBase, q1, buz);

                // Only crisp straight power-rail taps (zero wires between the plugged-in components!)
                connectICWire(doc, 'bat1:pos', 'bb1:tp1', [], { color: 'red', label: '+4.5V' });
                connectICWire(doc, 'bat1:neg', 'bb1:tn1', [{ x: -1080, y: -72 }, { x: -630, y: -72 }, { x: -630, y: -288 }], { color: 'black', label: '0V' });
                connectICWire(doc, 'bb1:tp2', 'bb1:bp2', [], { color: 'red' });
                connectICWire(doc, 'bb1:tn2', 'bb1:bn2', [], { color: 'black' });

                // Top-left SPDT COM (col 9) & LED1 cathode (col 15) rail taps
                connectICWire(doc, 'bb1:tp7', 'bb1:a9', [], { color: 'red' });
                connectICWire(doc, 'bb1:a15', 'bb1:tn12', [], { color: 'black' });

                // Top-right Pot T1 (col 20) to −, T2 (col 22) to +, LED2 cathode (col 26) to −
                connectICWire(doc, 'bb1:a20', 'bb1:tn16', [], { color: 'black' });
                connectICWire(doc, 'bb1:tp18', 'bb1:a22', [], { color: 'red' });
                connectICWire(doc, 'bb1:a26', 'bb1:tn21', [], { color: 'black' });

                // Bottom-left Button feed (col 6), NPN Emitter GND (col 11), Buzzer + feed (col 15)
                connectICWire(doc, 'bb1:bp5', 'bb1:j6', [], { color: 'red' });
                connectICWire(doc, 'bb1:j11', 'bb1:bn9', [], { color: 'black' });
                connectICWire(doc, 'bb1:bp12', 'bb1:j15', [], { color: 'red' });

                return doc;
            }
        },
        bb_button_led: {
            title: '2D Breadboard — 3×AA Pack + Push Button + 220Ω + 2-Leg LED',
            description: 'Half-size Breadboard powered by a 3×AA (4.5V) pack. The 6×6mm Push Button, 220Ω 1/4W Resistor, and 1U 5mm LED plug directly into vertical 0.1" breadboard strips with zero wires between them.',
            build() {
                const doc = blankICDoc();
                const bb = createICComponent('breadboard', 0, 0, { id: 'bb1', variant: 'half' });
                const bat = createICComponent('battery', -864, -216, { id: 'bat1', cells: 3, label: '3×AA (4.5V)' });
                // btn1 spans cols 8 & 10 (rows b & d); res1 spans cols 10 & 14 (row c); led1 spans cols 14 & 15 (row d, exact 1U!)
                const btn = createICComponent('pushbutton', -252, -144, { id: 'btn1', latched: true, pressed: true, label: 'BTN' });
                const res = createICComponent('resistor', -144, -144, { id: 'res1', ohms: 220, label: '220Ω' });
                const led = createICComponent('lamp', -54, -108, { id: 'led1', color: 'emerald', label: 'LED' });

                doc.components.push(bb, bat, btn, res, led);

                connectICWire(doc, 'bat1:pos', 'bb1:tp1', [], { color: 'red', label: 'V+' });
                connectICWire(doc, 'bat1:neg', 'bb1:tn1', [{ x: -1080, y: -72 }, { x: -630, y: -72 }, { x: -630, y: -288 }], { color: 'black', label: '−' });
                connectICWire(doc, 'bb1:tp6', 'bb1:a8', [], { color: 'red' });
                connectICWire(doc, 'bb1:a15', 'bb1:tn12', [], { color: 'black' });

                return doc;
            }
        },
        motor_pot_rpm: {
            title: 'DC Motor Speed Control — 9V Battery + Potentiometer + Multimeter',
            description: '9V Battery feeds a 5W rotary Potentiometer controlling a spinning DC Motor (click the Motor to inspect live RPM!) while a Digital Multimeter displays live motor voltage.',
            build() {
                const doc = blankICDoc();
                const bat9 = createICComponent('battery9v', -432, 0, { id: 'bat9', label: '9V PP3' });
                const pot = createICComponent('potentiometer', -108, -72, { id: 'pot1', ohms: 100, wiper: 0.72, maxWatts: 5.0, label: 'SPEED' });
                const mot = createICComponent('motor', 180, -72, { id: 'mot1', ratedV: 9, maxRpm: 3600, label: 'DC Motor' });
                const dmm = createICComponent('multimeter', 540, -36, { id: 'dmm1', mode: 'V', label: 'DMM' });

                doc.components.push(bat9, pot, mot, dmm);

                connectICWire(doc, 'bat9:pos', 'pot1:t2', [{ x: -396, y: -216 }, { x: -18, y: -216 }, { x: -18, y: 36 }, { x: -72, y: 36 }], { color: 'red', label: '+9V' });
                connectICWire(doc, 'bat9:neg', 'pot1:t1', [{ x: -468, y: -252 }, { x: -252, y: -252 }, { x: -252, y: 108 }, { x: -144, y: 108 }], { color: 'black' });
                connectICWire(doc, 'pot1:wiper', 'mot1:pos', [{ x: -108, y: 0 }, { x: 18, y: 0 }, { x: 18, y: -90 }], { color: 'orange', label: 'V_MOT' });
                connectICWire(doc, 'mot1:neg', 'bat9:neg', [{ x: 72, y: 108 }, { x: -252, y: 108 }, { x: -252, y: -252 }, { x: -468, y: -252 }], { color: 'black' });
                connectICWire(doc, 'dmm1:pos', 'mot1:pos', [{ x: 612, y: 270 }, { x: 36, y: 270 }, { x: 36, y: -90 }], { color: 'yellow' });
                connectICWire(doc, 'dmm1:neg', 'mot1:neg', [{ x: 468, y: 216 }, { x: 72, y: 216 }], { color: 'black' });

                return doc;
            }
        },
        overload_9v_demo: {
            title: '9V Overload Protection Demo — SPDT Switch: Bare LED vs 330Ω Protected',
            description: '9V Battery routed through a 3-terminal SPDT Switch (closed loop back to 9V −). Throw Right drives a bare LED directly (triggering 🔥 OVERLOAD!). Click the SPDT switch to throw Left through 330Ω and watch it recover.',
            build() {
                const doc = blankICDoc();
                const bat9 = createICComponent('battery9v', -432, 36, { id: 'bat9', label: '9V PP3' });
                const spdt = createICComponent('spdt', -108, 0, { id: 'spdt1', positionThrow: 'right', label: 'ROUTE' });
                const res = createICComponent('resistor', 108, -108, { id: 'res1', ohms: 330, label: '330Ω' });
                const ledSafe = createICComponent('lamp', 306, -108, { id: 'ledSafe', color: 'emerald', label: 'Safe LED' });
                const ledBare = createICComponent('lamp', 252, 108, { id: 'ledBare', color: 'red', label: 'Bare 9V LED' });

                doc.components.push(bat9, spdt, res, ledSafe, ledBare);

                connectICWire(doc, 'bat9:pos', 'spdt1:com', [{ x: -396, y: -180 }, { x: -216, y: -180 }, { x: -216, y: 90 }, { x: -108, y: 90 }], { color: 'red', label: '+9V' });
                connectICWire(doc, 'spdt1:t1', 'res1:a', [], { color: 'green' });
                connectICWire(doc, 'res1:b', 'ledSafe:anode', [], { color: 'green' });
                connectICWire(doc, 'ledSafe:cathode', 'bat9:neg', [{ x: 324, y: -216 }, { x: -468, y: -216 }], { color: 'black' });
                connectICWire(doc, 'spdt1:t2', 'ledBare:anode', [], { color: 'orange', label: 'NO RES!' });
                connectICWire(doc, 'ledBare:cathode', 'bat9:neg', [{ x: 396, y: 108 }, { x: 396, y: -216 }, { x: -468, y: -216 }], { color: 'black' });

                return doc;
            }
        },
        npn_motor_buzzer: {
            title: 'NPN 2N2222 Transistor Driver — 4.5V Button Switching 9V Motor & Buzzer',
            description: 'Low-voltage 3×AA (4.5V) Push Button drives a 2N2222 NPN Transistor base through 1 kΩ, switching a 9V DC Motor and Piezo Buzzer simultaneously (common negative return to batteries −).',
            build() {
                const doc = blankICDoc();
                const batCtrl = createICComponent('battery', -540, 198, { id: 'batCtrl', cells: 3, label: '3×AA Ctrl' });
                const btn = createICComponent('pushbutton', -180, 198, { id: 'btn1', latched: true, pressed: true, label: 'RUN' });
                const rBase = createICComponent('resistor', 18, 198, { id: 'rBase', ohms: 1000, label: '1kΩ' });
                const q1 = createICComponent('npn', 216, 180, { id: 'q1', model: '2N2222', label: '2N2222' });
                const bat9 = createICComponent('battery9v', -432, -162, { id: 'bat9', label: '9V Load' });
                const mot = createICComponent('motor', 72, -198, { id: 'mot1', ratedV: 9, maxRpm: 3600, label: 'DC Motor' });
                const buz = createICComponent('buzzer', 342, -198, { id: 'buz1', freqHz: 880, label: 'Buzzer' });

                doc.components.push(batCtrl, btn, rBase, q1, bat9, mot, buz);

                connectICWire(doc, 'batCtrl:pos', 'btn1:a1', [], { color: 'blue' });
                connectICWire(doc, 'btn1:b1', 'rBase:a', [], { color: 'blue' });
                connectICWire(doc, 'rBase:b', 'q1:b', [], { color: 'purple', label: 'BASE' });
                connectICWire(doc, 'q1:e', 'batCtrl:neg', [], { color: 'black' });
                connectICWire(doc, 'bat9:neg', 'batCtrl:neg', [{ x: -468, y: -378 }, { x: -792, y: -378 }, { x: -792, y: 198 }], { color: 'black' });
                connectICWire(doc, 'bat9:pos', 'mot1:pos', [{ x: -396, y: -342 }, { x: -108, y: -342 }, { x: -108, y: -216 }], { color: 'red', label: '+9V' });
                connectICWire(doc, 'bat9:pos', 'buz1:pos', [{ x: -396, y: -342 }, { x: 306, y: -342 }], { color: 'red' });
                connectICWire(doc, 'mot1:neg', 'q1:c', [], { color: 'orange', label: 'SINK' });
                connectICWire(doc, 'buz1:neg', 'q1:c', [], { color: 'orange' });

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
            this.showFlow = true;
            this.animTimeSec = 0;
            this.motorAngles = new Map();
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
            if (this.offscreen) return;
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
            const zoom = Math.max(0.22, Math.min(1.25, this.width / Math.max(240, maxX - minX), this.height / Math.max(200, maxY - minY)));
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
                    rCorner[i] = Math.min(14, len1 * 0.42, len2 * 0.42);
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
            const {
                value,
                conflict,
                selected,
                crossings = [],
                preview = false,
                color = null,
                label = '',
                dimmed = false,
                focused = false,
                voltage = null,
                currentMa = 0,
                flowDir = 0
            } = state;

            const customHex = color && WIRE_COLOR_HEX[color] ? WIRE_COLOR_HEX[color] : null;

            let strokeColor = customHex || COLORS.wireFloat;
            if (preview) {
                strokeColor = customHex || COLORS.cyan;
            } else if (conflict) {
                strokeColor = COLORS.wireShort;
            } else if (selected) {
                strokeColor = COLORS.selected;
            } else if (!customHex) {
                if (value === 1) strokeColor = COLORS.wire1;
                else if (value === 0) strokeColor = COLORS.wire0;
            }

            const mainWidth = selected ? 5.2 : focused ? 4.8 : (customHex ? 4.3 : (value === 1 ? 4.0 : 3.4));
            const hasActiveFlow = !preview && !conflict && currentMa >= 0.15 && flowDir !== 0;

            ctx.save();
            if (dimmed) ctx.globalAlpha = 0.28;

            // Layer 1 (Glossy 3-Layer Jumper Wire): Offset physical drop shadow so wires float above breadboard & parts
            if (!preview) {
                ctx.save();
                ctx.translate(0, 3.8);
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.44)';
                ctx.lineWidth = mainWidth + 2.4;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
                ctx.shadowBlur = 5;
                this.traceWireWithHops(points, crossings);
                ctx.stroke();
                ctx.restore();
            }

            // Soft live glow ONLY when wire carries real closed-loop current or is focused on hover
            if (!preview && !conflict && (focused || hasActiveFlow)) {
                ctx.save();
                ctx.strokeStyle = focused
                    ? 'rgba(56, 189, 248, 0.42)'
                    : (customHex ? customHex + '44' : COLORS.wire1Glow);
                ctx.lineWidth = mainWidth + 6.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                this.traceWireWithHops(points, crossings);
                ctx.stroke();
                ctx.restore();
            }

            // Layer 2A: High-contrast outer dark insulation rim (keeps wires crisp on both white breadboards & dark bench!)
            if (!preview) {
                ctx.save();
                if (value === null && !conflict && !selected && !customHex) {
                    ctx.setLineDash([5, 4]);
                }
                ctx.strokeStyle = 'rgba(2, 6, 23, 0.90)';
                ctx.lineWidth = mainWidth + 2.2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                this.traceWireWithHops(points, crossings);
                ctx.stroke();
                ctx.restore();
            }

            // Layer 2B: Solid colored PVC jumper jacket
            if (preview) {
                ctx.setLineDash([6, 5]);
            } else if (value === null && !conflict && !selected && !customHex) {
                ctx.setLineDash([5, 4]);
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = mainWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            const arcs = this.traceWireWithHops(points, crossings);
            ctx.stroke();

            // Layer 3: Thin semi-transparent white top highlight stripe for glossy 3D PVC tubing
            if (!preview && !conflict && mainWidth >= 3.0) {
                ctx.save();
                ctx.translate(0, -0.75);
                ctx.setLineDash([]);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
                ctx.lineWidth = 1.25;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                this.traceWireWithHops(points, crossings);
                ctx.stroke();
                ctx.restore();
            }

            // Molded DuPont Pin Header Boots at wire start & end terminals
            if (!preview && points.length >= 2) {
                const ends = [
                    { a: points[0], b: points[1] },
                    { a: points[points.length - 1], b: points[points.length - 2] }
                ];
                for (const { a, b } of ends) {
                    if (Math.hypot(b.x - a.x, b.y - a.y) < 1) continue;
                    const ang = Math.atan2(b.y - a.y, b.x - a.x);
                    ctx.save();
                    ctx.translate(a.x, a.y);
                    ctx.rotate(ang);
                    // Molded black polymer pin boot collar
                    roundedRect(ctx, 2, -4.0, 9.5, 8.0, 2.5);
                    ctx.fillStyle = '#0f172a';
                    ctx.fill();
                    ctx.strokeStyle = '#64748b';
                    ctx.lineWidth = 1.0;
                    ctx.stroke();
                    // Shiny nickel contact pin tip inserting into socket
                    ctx.beginPath();
                    ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = '#e2e8f0';
                    ctx.fill();
                    ctx.restore();
                }
            }

            // Animated current flow pulse dashes STRICTLY ONLY when real closed-loop current >= 0.15 mA flows!
            if (hasActiveFlow && this.showFlow) {
                const speed = Math.min(96, Math.max(26, 24 + Math.log10(1 + currentMa) * 26));
                ctx.save();
                ctx.setLineDash([5, 13]);
                ctx.lineDashOffset = -(flowDir * this.animTimeSec * speed);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
                ctx.lineWidth = 1.7;
                ctx.lineCap = 'round';
                this.traceWireWithHops(points, crossings);
                ctx.stroke();
                ctx.restore();
            }

            // Crisp bridge arcs at crossings (uses thin dark insulation rim instead of heavy black blotch so white breadboards stay clean!)
            if (!preview && arcs && arcs.length) {
                for (const a of arcs) {
                    const startA = a.dirX > 0 ? Math.PI : 0;
                    const endA = a.dirX > 0 ? 0 : Math.PI;
                    const ccw = a.dirX < 0;
                    ctx.beginPath();
                    ctx.arc(a.centerX, a.y, a.radius, startA, endA, ccw);
                    ctx.strokeStyle = 'rgba(2, 6, 23, 0.88)';
                    ctx.lineWidth = mainWidth + 2.2;
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(a.centerX, a.y, a.radius, startA, endA, ccw);
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = mainWidth;
                    ctx.stroke();

                    ctx.beginPath();
                    ctx.arc(a.centerX, a.y - 0.7, a.radius, startA, endA, ccw);
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.36)';
                    ctx.lineWidth = 1.1;
                    ctx.stroke();
                }
            }

            // Optional wire label pill — placed cleanly at the midpoint of the LONGEST straight segment (never colliding with bends or terminals!)
            if (!preview && label && points.length >= 2) {
                let bestLen = -1;
                let pA = points[0];
                let pB = points[1];
                for (let i = 1; i < points.length; i++) {
                    const segLen = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
                    if (segLen > bestLen) {
                        bestLen = segLen;
                        pA = points[i - 1];
                        pB = points[i];
                    }
                }
                const mx = (pA.x + pB.x) / 2;
                const my = (pA.y + pB.y) / 2;
                const isVert = Math.abs(pA.x - pB.x) < 1;
                const pillY = isVert ? my : my - 12;
                ctx.save();
                ctx.setLineDash([]);
                ctx.font = '700 8.5px "JetBrains Mono", monospace';
                const tw = ctx.measureText(label).width + 10;
                roundedRect(ctx, mx - tw / 2, pillY - 7, tw, 14, 4);
                ctx.fillStyle = 'rgba(10, 14, 24, 0.94)';
                ctx.fill();
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = 1.1;
                ctx.stroke();
                ctx.fillStyle = '#f8fafc';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, mx, pillY + 0.5);
                ctx.restore();
            }

            ctx.restore();
        }

        drawICPackage(comp, evalData, isSelected, autoPower) {
            const art = getArtMod();
            const spec = IC_CATALOG[comp.model];
            if (!spec) return;
            if (art && typeof art.drawRealisticICPackage === 'function') {
                art.drawRealisticICPackage(this.ctx, comp, spec, evalData, isSelected, this.xrayMode, autoPower, {
                    getDipPinLocal,
                    drawMiniGateShape,
                    COLORS
                });
                return;
            }
            const ctx = this.ctx;
            const icState = evalData.icStates.get(comp.id);
            const powered = Boolean(icState && icState.powered);
            const reversePower = Boolean(icState && icState.reversePower);
            const pinCount = spec.pinCount || 14;
            const vccPin = spec.vccPin || 14;
            const gndPin = spec.gndPin || 7;

            ctx.save();
            ctx.translate(comp.position.x, comp.position.y);
            if (comp.rotation) {
                ctx.rotate((comp.rotation * Math.PI) / 180);
            }

            const bodyW = pinCount === 16 ? 296 : 260;
            const bodyH = 114;
            const halfW = bodyW / 2;
            const halfH = bodyH / 2;

            // 1. Metallic DIP legs & pin numbers
            for (let p = 1; p <= pinCount; p++) {
                const loc = getDipPinLocal(p, pinCount);
                const pinKey = `${comp.id}:${p}`;
                const val = evalData.pinValues.get(pinKey);
                const isTop = loc.row === 'top';
                const legY0 = isTop ? -halfH : halfH;
                const legY1 = loc.y;

                // Metallic shoulder & leg
                ctx.strokeStyle = val === 1 ? COLORS.cyan : (p === vccPin && powered) ? COLORS.vcc : '#8c9bb3';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(loc.x, legY0);
                ctx.lineTo(loc.x, legY1);
                ctx.stroke();

                // Auto-power mini rail badge on VCC & GND pins
                if (autoPower && (p === vccPin || p === gndPin)) {
                    ctx.fillStyle = p === vccPin ? 'rgba(255, 107, 107, 0.22)' : 'rgba(125, 146, 176, 0.22)';
                    roundedRect(ctx, loc.x - 13, isTop ? legY1 - 18 : legY1 + 5, 26, 13, 3);
                    ctx.fill();
                    ctx.fillStyle = p === vccPin ? '#ff8b8b' : '#b8c6db';
                    ctx.font = '700 8.5px "JetBrains Mono", monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(p === vccPin ? '+5V' : 'GND', loc.x, isTop ? legY1 - 11.5 : legY1 + 11.5);
                }
            }

            // 2. DIP Package Body (Semi-Transparent X-Ray vs Opaque Ceramic)
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

            // 3. Pin Labels inside package rim (1..pinCount, VCC, GND, or MSI functional pin labels)
            ctx.font = '700 8.8px "JetBrains Mono", Consolas, monospace';
            ctx.textAlign = 'center';
            for (let p = 1; p <= pinCount; p++) {
                const loc = getDipPinLocal(p, pinCount);
                const isTop = loc.row === 'top';
                const labelY = isTop ? -halfH + 10 : halfH - 10;
                const customLbl = spec.pinLabels && spec.pinLabels[p];
                if (p === vccPin) {
                    ctx.fillStyle = '#ff8080';
                    ctx.fillText(`${p}·VCC`, loc.x, labelY);
                } else if (p === gndPin) {
                    ctx.fillStyle = '#9db2ce';
                    ctx.fillText(`${p}·GND`, loc.x, labelY);
                } else if (customLbl && this.xrayMode) {
                    ctx.fillStyle = 'rgba(230, 238, 248, 0.86)';
                    ctx.fillText(`${p}·${customLbl}`, loc.x, labelY);
                } else {
                    ctx.fillStyle = 'rgba(230, 238, 248, 0.78)';
                    ctx.fillText(String(p), loc.x, labelY);
                }
            }

            // 4. Semi-Transparent Datasheet Internal Diagram (when X-Ray is ON)
            if (this.xrayMode) {
                if (spec.msi) {
                    // MSI / Sequential Functional Core Block Diagram inside X-Ray package
                    const coreW = bodyW - 68;
                    const coreH = 52;
                    roundedRect(ctx, -coreW / 2, -coreH / 2, coreW, coreH, 6);
                    ctx.fillStyle = powered ? 'rgba(19, 31, 51, 0.90)' : 'rgba(15, 20, 32, 0.85)';
                    ctx.fill();
                    ctx.lineWidth = 1.4;
                    ctx.strokeStyle = powered ? 'rgba(61, 217, 255, 0.7)' : 'rgba(159, 176, 199, 0.45)';
                    ctx.stroke();

                    // Micro-traces from each signal pin to the MSI core
                    for (let p = 1; p <= pinCount; p++) {
                        if (p === vccPin || p === gndPin) continue;
                        const loc = getDipPinLocal(p, pinCount);
                        const isTop = loc.row === 'top';
                        const startY = isTop ? -halfH + 16 : halfH - 16;
                        const endY = isTop ? -coreH / 2 : coreH / 2;
                        const pinVal = evalData.pinValues.get(`${comp.id}:${p}`);
                        const isOut = (spec.outputs || []).includes(p);

                        ctx.beginPath();
                        ctx.moveTo(loc.x, startY);
                        ctx.lineTo(loc.x, endY);
                        ctx.strokeStyle = pinVal === 1
                            ? '#3dd9ff'
                            : pinVal === 0
                            ? 'rgba(143, 160, 181, 0.58)'
                            : 'rgba(255, 255, 255, 0.22)';
                        ctx.lineWidth = isOut && pinVal === 1 ? 2.0 : 1.3;
                        ctx.stroke();
                    }

                    // MSI Header & Live State Telemetry inside core
                    ctx.fillStyle = powered ? '#3dd9ff' : '#c5d3e8';
                    ctx.font = '800 11px "JetBrains Mono", Consolas, monospace';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`${spec.partNumber} · ${spec.gateType}`, 0, -11);

                    ctx.fillStyle = powered ? '#37e0a1' : '#8fa0b5';
                    ctx.font = '700 10.5px "JetBrains Mono", Consolas, monospace';
                    const summaryText = powered
                        ? (icState?.msiSummary || spec.gateType || spec.description)
                        : `UNPOWERED (Wire Pin ${vccPin} & ${gndPin})`;
                    ctx.fillText(summaryText, 0, 9);
                } else {
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
                            const pLoc = getDipPinLocal(inPin, pinCount);
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
                        const outLoc = getDipPinLocal(g.output, pinCount);
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
                }
            } else {
                // Opaque Black-Box Mode (for testing datasheet knowledge!)
                ctx.fillStyle = '#e8eef7';
                ctx.font = '700 18px "JetBrains Mono", Consolas, monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(spec.partNumber, 0, -6);
                ctx.fillStyle = '#8fa0b5';
                ctx.font = '600 11px "Inter", sans-serif';
                ctx.fillText(`Model ${comp.model} · ${pinCount}-Pin DIP`, 0, 14);
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

        drawBenchComponent(comp, evalData, isSelected, uiState = {}) {
            const ctx = this.ctx;
            const hw = getHardwareMod();
            const art = getArtMod();
            const solverMod = getSolverMod();
            ctx.save();
            ctx.translate(comp.position.x, comp.position.y);
            if (comp.rotation) {
                ctx.rotate((comp.rotation * Math.PI) / 180);
            }

            // 1. Unified Native-Vector 2.5D Studio Hardware Renderer (zero SVG masking, instant render, safe for offscreen PNG export!)
            if (hw) {
                let drawn = false;
                if (comp.kind === 'breadboard') {
                    const spec = solverMod ? solverMod.getBreadboardSpec(comp.variant || 'half') : null;
                    if (spec) drawn = hw.drawBreadboard(ctx, comp, spec, evalData, isSelected, uiState.hoverStripId || null);
                } else if (comp.kind === 'lamp') {
                    drawn = hw.drawLed(ctx, comp, evalData, isSelected);
                } else if (comp.kind === 'rgb_led') {
                    drawn = hw.drawRgbLed(ctx, comp, evalData, isSelected);
                } else if (comp.kind === 'resistor') {
                    drawn = hw.drawResistor(ctx, comp, evalData, isSelected, solverMod);
                } else if (comp.kind === 'motor') {
                    drawn = hw.drawMotor(ctx, comp, evalData, isSelected, this.motorAngles.get(comp.id) || 0);
                } else if (comp.kind === 'battery9v') {
                    drawn = hw.drawBattery9V(ctx, comp, evalData, isSelected);
                } else if (comp.kind === 'battery') {
                    drawn = hw.drawAAHolder(ctx, comp, evalData, isSelected);
                } else if (comp.kind === 'psu' && typeof hw.drawBenchPSU === 'function') {
                    drawn = hw.drawBenchPSU(ctx, comp, evalData, isSelected);
                } else if (comp.kind === 'multimeter' && typeof hw.drawMultimeter === 'function') {
                    drawn = hw.drawMultimeter(ctx, comp, evalData, isSelected);
                } else if (comp.kind === 'pushbutton') {
                    drawn = hw.drawPushButton(ctx, comp, evalData, isSelected);
                } else if (comp.kind === 'spdt') {
                    drawn = hw.drawSpdt(ctx, comp, evalData, isSelected);
                } else if (comp.kind === 'potentiometer') {
                    drawn = hw.drawPotentiometer(ctx, comp, evalData, isSelected, solverMod);
                } else if (comp.kind === 'buzzer') {
                    drawn = hw.drawBuzzer(ctx, comp, evalData, isSelected, this.animTimeSec);
                } else if (comp.kind === 'npn') {
                    drawn = hw.drawNpn(ctx, comp, evalData, isSelected);
                } else if (comp.kind === 'seg7_10') {
                    drawn = hw.drawSeg7TenPin(ctx, comp, evalData, isSelected);
                }
                if (drawn) {
                    ctx.restore();
                    return;
                }
            }

            if (art) {
                if (comp.kind === 'breadboard') {
                    const spec = solverMod ? solverMod.getBreadboardSpec(comp.variant || 'half') : null;
                    if (spec) {
                        art.drawBreadboard2D(ctx, comp, spec, evalData, isSelected, uiState.hoverStripId || null);
                    }
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'battery') {
                    art.drawAAHolder2D(ctx, comp, evalData, isSelected);
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'battery9v') {
                    art.drawBattery9V2D(ctx, comp, evalData, isSelected);
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'psu') {
                    art.drawBenchPSU2D(ctx, comp, evalData, isSelected);
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'lamp') {
                    art.drawLed2D(ctx, comp, evalData, isSelected);
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'rgb_led') {
                    art.drawRgbLed2D(ctx, comp, evalData, isSelected);
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'resistor') {
                    art.drawResistor2D(ctx, comp, evalData, isSelected, solverMod);
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'potentiometer') {
                    art.drawPotentiometer2D(ctx, comp, evalData, isSelected, solverMod);
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'pushbutton') {
                    art.drawPushButton2D(ctx, comp, evalData, isSelected);
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'spdt') {
                    art.drawSpdtSwitch2D(ctx, comp, evalData, isSelected);
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'motor') {
                    art.drawMotor2D(ctx, comp, evalData, isSelected, this.motorAngles.get(comp.id) || 0);
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'buzzer') {
                    art.drawBuzzer2D(ctx, comp, evalData, isSelected, this.animTimeSec);
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'npn') {
                    art.drawNpn2D(ctx, comp, evalData, isSelected);
                    ctx.restore();
                    return;
                }
                if (comp.kind === 'multimeter') {
                    art.drawMultimeter2D(ctx, comp, evalData, isSelected);
                    ctx.restore();
                    return;
                }
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
                ctx.strokeStyle = lit ? lampColor : lState?.anodeVal === 1 ? COLORS.wire1 : '#8fa0b5';
                ctx.lineWidth = 2.4;
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(18, 0);
                ctx.lineTo(36, 0);
                ctx.strokeStyle = lit ? lampColor : lState?.reason === 'open_cathode' ? '#f6b944' : lState?.cathodeVal === 0 ? COLORS.wire0 : '#8fa0b5';
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
                ctx.strokeStyle = isSelected ? COLORS.selected : lit ? '#ffffff' : lState?.reason === 'open_cathode' ? '#f6b944' : '#9fb0c7';
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
                ctx.fillStyle = lState?.reason === 'open_cathode' ? '#f6b944' : '#9db2ce';
                ctx.fillText('−', 25, -8);

                let statusLabel = 'OFF';
                let statusColor = '#96a5ba';
                if (lit) {
                    statusLabel = 'ON';
                    statusColor = '#ffffff';
                } else if (lState?.reason === 'open_cathode') {
                    statusLabel = 'NO GND';
                    statusColor = '#f6b944';
                } else if (lState?.reason === 'open_anode') {
                    statusLabel = 'OPEN +';
                    statusColor = '#f6b944';
                } else if (lState?.reason === 'reverse_bias') {
                    statusLabel = 'REV POL';
                    statusColor = '#ff5a52';
                } else if (lState?.reason === 'no_diff_high') {
                    statusLabel = 'NO DIFF';
                    statusColor = '#96a5ba';
                }

                ctx.fillStyle = statusColor;
                ctx.font = '700 9.5px "Inter", sans-serif';
                ctx.fillText(`${comp.label || 'LED'}: ${statusLabel}`, 0, 29);
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
            } else if (comp.kind === 'dip4') {
                const bits = Array.isArray(comp.bits) && comp.bits.length === 4 ? comp.bits : [0, 0, 0, 0];
                const hexVal = (bits[0] ? 1 : 0) | (bits[1] ? 2 : 0) | (bits[2] ? 4 : 0) | (bits[3] ? 8 : 0);

                roundedRect(ctx, -32, -64, 60, 128, 7);
                ctx.fillStyle = '#151c2c';
                ctx.fill();
                ctx.lineWidth = isSelected ? 2.4 : 1.7;
                ctx.strokeStyle = isSelected ? COLORS.selected : '#9fb0c7';
                ctx.stroke();

                const ys = [-54, -18, 18, 54];
                for (let i = 0; i < 4; i++) {
                    const on = Boolean(bits[i]);
                    const y = ys[i];
                    // Output lead to +36
                    ctx.beginPath();
                    ctx.moveTo(28, y);
                    ctx.lineTo(36, y);
                    ctx.strokeStyle = on ? '#3dd9ff' : '#7d92b0';
                    ctx.lineWidth = 2.4;
                    ctx.stroke();

                    // Slide rocker track
                    roundedRect(ctx, -22, y - 9, 36, 18, 4);
                    ctx.fillStyle = on ? 'rgba(61, 217, 255, 0.20)' : '#0b0e17';
                    ctx.fill();
                    ctx.strokeStyle = on ? '#3dd9ff' : '#59677f';
                    ctx.lineWidth = 1.2;
                    ctx.stroke();

                    // Rocker thumb
                    roundedRect(ctx, on ? -2 : -20, y - 7, 14, 14, 3);
                    ctx.fillStyle = on ? '#3dd9ff' : '#8fa0b5';
                    ctx.fill();

                    // Bit label
                    ctx.fillStyle = on ? '#e8eef7' : '#8fa0b5';
                    ctx.font = '700 8.5px "JetBrains Mono", monospace';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(`B${i}`, 17, y);
                }

                ctx.fillStyle = '#3dd9ff';
                ctx.font = '700 9.5px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${comp.label || 'DIP-4'} (${hexVal})`, -2, 76);
            } else if (comp.kind === 'probe') {
                const pst = evalData.probeStates ? evalData.probeStates.get(comp.id) : null;
                const val = pst ? pst.val : null;
                const conflict = pst ? pst.conflict : false;

                // Probe needle lead from -36 to -18
                ctx.beginPath();
                ctx.moveTo(-36, 0);
                ctx.lineTo(-18, 0);
                ctx.strokeStyle = conflict ? '#ff5a52' : val === 1 ? '#3dd9ff' : val === 0 ? '#37e0a1' : '#f6b944';
                ctx.lineWidth = 2.8;
                ctx.stroke();

                roundedRect(ctx, -18, -16, 52, 32, 7);
                ctx.fillStyle = '#0e1422';
                ctx.fill();
                ctx.lineWidth = isSelected ? 2.4 : 1.7;
                ctx.strokeStyle = isSelected
                    ? COLORS.selected
                    : conflict
                    ? '#ff5a52'
                    : val === 1
                    ? '#3dd9ff'
                    : val === 0
                    ? '#37e0a1'
                    : '#f6b944';
                ctx.stroke();

                ctx.font = '800 10px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = conflict ? '#ff5a52' : val === 1 ? '#3dd9ff' : val === 0 ? '#37e0a1' : '#f6b944';
                ctx.fillText(conflict ? 'SHORT' : val === 1 ? 'HI 5V' : val === 0 ? 'LO 0V' : 'Hi-Z', 8, 0);
            }

            ctx.restore();
        }

        drawPinPad(pin, val, isHovered, isWireStart) {
            const ctx = this.ctx;
            const zoom = this.view.zoom || 1;
            ctx.save();
            ctx.beginPath();
            let r = 4.0;
            if (isHovered || isWireStart) {
                const targetScreenR = 6.5 + Math.min(2.2, zoom * 1.1);
                const maxWorldR = pin.isBreadboardHole ? 9.5 : 18;
                r = Math.max(4.6, Math.min(maxWorldR, targetScreenR / zoom));
            }
            ctx.arc(pin.x, pin.y, r, 0, Math.PI * 2);
            ctx.fillStyle = isHovered || isWireStart
                ? '#f6b944'
                : val === 1
                ? '#3dd9ff'
                : val === 0
                ? '#243247'
                : '#141824';
            ctx.fill();
            ctx.lineWidth = (isHovered || isWireStart) ? Math.max(1.2, Math.min(4.5, 2.0 / zoom)) : 1.6;
            ctx.strokeStyle = isHovered || isWireStart
                ? '#ffffff'
                : val === 1
                ? '#9beeff'
                : val === 0
                ? '#657e9f'
                : '#424f63';
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

            // Determine hovered breadboard strip ID and hovered wire net for net focus highlight
            let hoverStripId = null;
            if (uiState.hoverPinKey && evalData.pins.has(uiState.hoverPinKey)) {
                const hp = evalData.pins.get(uiState.hoverPinKey);
                if (hp.stripId) hoverStripId = hp.stripId;
            }
            const hoverNetId = uiState.hoverWireNetId !== undefined && uiState.hoverWireNetId !== null
                ? uiState.hoverWireNetId
                : (uiState.hoverPinKey ? evalData.pinToNet.get(uiState.hoverPinKey) : null);

            // 1. Draw Breadboards FIRST (underneath all components & jumper wires)
            for (const comp of doc.components) {
                if (comp.kind !== 'breadboard') continue;
                const isSelected = uiState.selected && uiState.selected.kind === 'comp' && uiState.selected.id === comp.id;
                this.drawBenchComponent(comp, evalData, isSelected, { hoverStripId });
            }

            // 2. Draw non-breadboard 2D Fritzing components & realistic DIP ICs SECOND (underneath jumper wires!)
            for (const comp of doc.components) {
                if (comp.kind === 'breadboard') continue;
                const isSelected = uiState.selected && uiState.selected.kind === 'comp' && uiState.selected.id === comp.id;
                if (comp.kind === 'ic') {
                    this.drawICPackage(comp, evalData, isSelected, doc.autoPower);
                } else {
                    this.drawBenchComponent(comp, evalData, isSelected, uiState);
                }
            }

            // 3. Draw Glossy 3-Layer Jumper Wires ON TOP of breadboards & components so wires NEVER hide behind parts!
            const wireGeom = computeICWireGeometry(doc, evalData.pins, evalData.pinToNet);
            const wiredPinSet = new Set();
            for (const w of doc.wires) {
                wiredPinSet.add(w.from);
                wiredPinSet.add(w.to);
                const pts = wireGeom.routes.get(w.id);
                const crossings = wireGeom.crossingsByWire.get(w.id) || [];
                const val = evalData.pinValues.get(w.from);
                const voltage = evalData.pinVoltages ? evalData.pinVoltages.get(w.from) : null;
                const conflict = evalData.pinConflicts.get(w.from);
                const isSelected = uiState.selected && uiState.selected.kind === 'wire' && uiState.selected.id === w.id;
                const wNet = evalData.pinToNet.get(w.from);
                const focused = uiState.hoverWireId === w.id || (hoverNetId !== null && hoverNetId !== undefined && wNet === hoverNetId);
                const dimmed = (uiState.hoverWireId != null) && !focused && !isSelected;
                const wc = evalData.wireCurrents ? evalData.wireCurrents.get(w.id) : null;
                this.drawWire(pts, {
                    value: val,
                    voltage,
                    conflict,
                    selected: isSelected,
                    crossings,
                    color: w.color || null,
                    label: w.label || '',
                    focused,
                    dimmed,
                    currentMa: wc ? wc.currentMa : 0,
                    flowDir: wc ? wc.dir : 0
                });
            }

            // Draw T-junction dots where same-net wires branch
            if (wireGeom.junctions && wireGeom.junctions.length) {
                for (const j of wireGeom.junctions) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(j.x, j.y, 4.4, 0, Math.PI * 2);
                    ctx.fillStyle = COLORS.cyan;
                    ctx.fill();
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = COLORS.bg;
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // Active wire drag preview
            if (uiState.wireStartPin && uiState.cursorWorld) {
                const endTarget = (uiState.hoverPinKey && evalData.pins.get(uiState.hoverPinKey)) || uiState.cursorWorld;
                const previewPts = routeICWire(uiState.wireStartPin, endTarget, [], doc);
                this.drawWire(previewPts, { preview: true, color: uiState.activeWireColor || null });
            }

            // Ghost placement preview when a component/IC tool is selected
            if (uiState.ghostComp) {
                const gb = getComponentBounds(uiState.ghostComp);
                ctx.save();
                // Subtle cyan placement reticle behind ghost component
                roundedRect(ctx, gb.left - 8, gb.top - 8, gb.w + 16, gb.h + 16, 10);
                ctx.fillStyle = 'rgba(56, 189, 248, 0.07)';
                ctx.fill();
                ctx.setLineDash([5, 4]);
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
                ctx.lineWidth = 1.4;
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.globalAlpha = 0.78;
                if (uiState.ghostComp.kind === 'ic') {
                    this.drawICPackage(uiState.ghostComp, evalData, false, doc.autoPower);
                } else {
                    this.drawBenchComponent(uiState.ghostComp, evalData, false, uiState);
                }
                ctx.globalAlpha = 1;

                // Crisp placement hint tag right below ghost preview
                const hintTxt = uiState.ghostComp.kind === 'breadboard'
                    ? 'Click to place breadboard'
                    : 'Click to place · R to rotate';
                ctx.font = '700 10px "Inter", sans-serif';
                const hw = ctx.measureText(hintTxt).width + 14;
                roundedRect(ctx, uiState.ghostComp.position.x - hw / 2, gb.bottom + 10, hw, 18, 9);
                ctx.fillStyle = 'rgba(10, 15, 28, 0.92)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.fillStyle = '#bae6fd';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(hintTxt, uiState.ghostComp.position.x, gb.bottom + 19);
                ctx.restore();
            }

            // Tinkercad-style glowing emerald target socket rings when snapping a component into breadboard holes!
            if (Array.isArray(uiState.snapHoles) && uiState.snapHoles.length) {
                for (const h of uiState.snapHoles) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(h.x, h.y, 11, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(52, 211, 153, 0.34)';
                    ctx.fill();
                    ctx.strokeStyle = '#34d399';
                    ctx.lineWidth = 2.4;
                    ctx.stroke();
                    ctx.restore();
                }
            }

            // 4. Draw pin connection pads (skip idle/blocked breadboard holes & plugged-in pins hidden inside sockets)
            for (const [key, pin] of evalData.pins.entries()) {
                const isHovered = uiState.hoverPinKey === key;
                const isStart = uiState.wireStartPin && uiState.wireStartPin.key === key;
                if (pin.isBreadboardHole) {
                    if (!isHovered && !isStart && !wiredPinSet.has(key)) continue;
                    if (!isHovered && !isStart && !wiredPinSet.has(key) && isPointUnderComponent(doc, pin)) continue;
                } else if (evalData.pluggedPinMap && evalData.pluggedPinMap.has(key) && !isHovered && !isStart) {
                    // Plugged component legs sit cleanly inside breadboard sockets (shown by subtle cyan socket rings)
                    continue;
                }
                const val = evalData.pinValues.get(key);
                this.drawPinPad(pin, val, isHovered, isStart);
            }

            // Exit world-space zoom/pan transform so hover indicators render at crisp, zoom-compensated screen scale
            ctx.restore();

            // 5. Zoom-scaled, viewport-clamped hover pin or wire indicator (always sharp & legible at any zoom level!)
            const zoom = this.view.zoom || 1;
            const toScreen = (wx, wy) => ({
                x: this.width / 2 + this.view.panX + wx * zoom,
                y: this.height / 2 + this.view.panY + wy * zoom
            });
            const drawScreenTooltip = (anchorX, anchorY, label, fontSpec, borderColor, textColor, pinOffset) => {
                ctx.save();
                ctx.font = fontSpec;
                const padX = 10;
                const tw = Math.ceil(ctx.measureText(label).width) + padX * 2;
                const th = 26;
                const margin = 10;
                const tx = Math.max(margin, Math.min(this.width - margin - tw, anchorX - tw / 2));
                const aboveY = anchorY - pinOffset - th - 7;
                const placeBelow = aboveY < margin;
                const ty = placeBelow
                    ? Math.min(this.height - margin - th, anchorY + pinOffset + 7)
                    : Math.min(this.height - margin - th, aboveY);

                // Subtle drop shadow for crisp contrast over bright breadboard or meter bodies
                ctx.shadowColor = 'rgba(0, 0, 0, 0.48)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 3;
                roundedRect(ctx, tx, ty, tw, th, 6);
                ctx.fillStyle = 'rgba(9, 14, 24, 0.96)';
                ctx.fill();
                ctx.shadowColor = 'transparent';
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1.25;
                ctx.stroke();

                // Small pointer caret aimed at the hovered terminal/wire (seamless join with pill border)
                const caretX = Math.max(tx + 9, Math.min(tx + tw - 9, anchorX));
                ctx.beginPath();
                if (placeBelow) {
                    ctx.moveTo(caretX - 5.5, ty + 1);
                    ctx.lineTo(caretX, ty - 5);
                    ctx.lineTo(caretX + 5.5, ty + 1);
                } else {
                    ctx.moveTo(caretX - 5.5, ty + th - 1);
                    ctx.lineTo(caretX, ty + th + 5);
                    ctx.lineTo(caretX + 5.5, ty + th - 1);
                }
                ctx.fillStyle = 'rgba(9, 14, 24, 0.96)';
                ctx.fill();
                ctx.strokeStyle = borderColor;
                ctx.lineWidth = 1.25;
                ctx.stroke();

                ctx.fillStyle = textColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, tx + tw / 2, ty + th / 2 + 0.5);
                ctx.restore();
            };

            if (uiState.hoverPinKey && evalData.pins.has(uiState.hoverPinKey)) {
                const hp = evalData.pins.get(uiState.hoverPinKey);
                const v = evalData.pinValues.get(uiState.hoverPinKey);
                const volts = evalData.pinVoltages ? evalData.pinVoltages.get(uiState.hoverPinKey) : null;
                const vStr = (volts !== null && volts !== undefined && Number.isFinite(volts))
                    ? `${volts.toFixed(2)} V`
                    : (v === 1 ? 'HIGH' : v === 0 ? 'LOW (0V)' : 'OPEN');
                const pluggedTag = evalData.pluggedPinMap && evalData.pluggedPinMap.has(uiState.hoverPinKey)
                    ? ' · Plugged'
                    : '';
                const label = `${hp.title} · ${vStr}${pluggedTag}`;
                const sp = toScreen(hp.x, hp.y);
                const pinScreenOffset = Math.max(8, Math.min(13, 6.5 + zoom * 1.4));
                drawScreenTooltip(
                    sp.x,
                    sp.y,
                    label,
                    '600 12px "Inter", system-ui, sans-serif',
                    'rgba(61, 217, 255, 0.72)',
                    '#f4f7fb',
                    pinScreenOffset
                );
            } else if (uiState.hoverWireId && uiState.cursorWorld) {
                const hw = doc.wires.find(x => x.id === uiState.hoverWireId);
                if (hw) {
                    const volts = evalData.pinVoltages ? evalData.pinVoltages.get(hw.from) : null;
                    const wc = evalData.wireCurrents ? evalData.wireCurrents.get(hw.id) : null;
                    const vStr = (volts !== null && volts !== undefined && Number.isFinite(volts))
                        ? `${volts.toFixed(2)} V`
                        : 'Floating';
                    const iStr = wc && wc.currentMa >= 0.15 ? ` · ${wc.currentMa.toFixed(1)} mA` : ' · 0 mA (Open)';
                    const tag = hw.label ? `[${hw.label}] ` : '';
                    const label = `${tag}${vStr}${iStr} · Drag to route`;
                    const sp = toScreen(uiState.cursorWorld.x, uiState.cursorWorld.y);
                    drawScreenTooltip(
                        sp.x,
                        sp.y,
                        label,
                        '600 11.5px "JetBrains Mono", ui-monospace, monospace',
                        'rgba(56, 189, 248, 0.65)',
                        '#e2e8f0',
                        10
                    );
                }
            }

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
        let hoverWireId = null;
        let hoverWireNetId = null;
        let activeWireColor = 'auto';
        let soundEnabled = false;
        let activePushBtnId = null;
        let cursorWorld = null;
        let dragState = null;
        let pinchState = null;
        const activePointers = new Map();
        let evalData = evaluateICBench(currentDoc);
        let frameScheduled = false;

        // Optional Web Audio API synthesizer for Piezo Buzzer (opt-in via Sound toggle)
        let audioCtx = null;
        let buzzerOsc = null;
        let buzzerGain = null;

        function updateBuzzerAudio() {
            const activeBuzzers = [];
            if (evalData && evalData.buzzerStates) {
                for (const c of currentDoc.components) {
                    if (c.kind === 'buzzer') {
                        const st = evalData.buzzerStates.get(c.id);
                        if (st && st.sounding) activeBuzzers.push({ freq: st.freqHz || c.freqHz || 880, intensity: st.intensity || 0.7 });
                    }
                }
            }
            if (!soundEnabled || !activeBuzzers.length || (icMain && icMain.hidden)) {
                if (buzzerGain && audioCtx) {
                    try { buzzerGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.02); } catch (_) {}
                }
                return;
            }
            try {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                if (!AudioCtx) return;
                if (!audioCtx) audioCtx = new AudioCtx();
                if (audioCtx.state === 'suspended') audioCtx.resume();
                if (!buzzerOsc) {
                    buzzerOsc = audioCtx.createOscillator();
                    buzzerGain = audioCtx.createGain();
                    buzzerOsc.type = 'square';
                    buzzerGain.gain.value = 0;
                    buzzerOsc.connect(buzzerGain);
                    buzzerGain.connect(audioCtx.destination);
                    buzzerOsc.start();
                }
                const b = activeBuzzers[0];
                buzzerOsc.frequency.setTargetAtTime(b.freq, audioCtx.currentTime, 0.02);
                buzzerGain.gain.setTargetAtTime(0.05 * Math.max(0.25, b.intensity), audioCtx.currentTime, 0.02);
            } catch (_) {}
        }

        function syncZoomBadge() {
            const fitBtn = $('icFitBtn');
            if (!fitBtn) return;
            const pct = Math.round((renderer.view.zoom || 1) * 100);
            fitBtn.textContent = `Fit (${pct}%)`;
        }

        function scheduleRender() {
            syncZoomBadge();
            if (frameScheduled) return;
            frameScheduled = true;
            requestAnimationFrame(() => {
                frameScheduled = false;
                let ghostComp = null;
                let snapHoles = null;
                if (cursorWorld && isPlacementTool(tool)) {
                    const snap = $('icSnapToggle')?.checked;
                    const pos = snapICPoint(cursorWorld, snap);
                    ghostComp = createICComponent(tool, pos.x, pos.y, {
                        id: '__ghost__',
                        rotation: placementRotation
                    });
                    if (snap) {
                        const bbSnap = snapCompToBreadboard(currentDoc, ghostComp);
                        if (bbSnap) {
                            ghostComp.position = { x: bbSnap.x, y: bbSnap.y };
                            snapHoles = bbSnap.holes;
                        }
                    }
                } else if (dragState && dragState.type === 'moveComp' && dragState.snapHoles) {
                    snapHoles = dragState.snapHoles;
                }
                renderer.render(currentDoc, evalData, {
                    selected,
                    wireStartPin,
                    hoverPinKey,
                    hoverWireId,
                    hoverWireNetId,
                    activeWireColor,
                    cursorWorld,
                    ghostComp,
                    snapHoles
                });
            });
        }

        // Smooth animation loop for DC Motor rotor, Piezo Buzzer waves & live wire current pulses
        let lastAnimTs = performance.now();
        function animTick(ts) {
            const dt = Math.min(0.05, Math.max(0.001, (ts - lastAnimTs) / 1000));
            lastAnimTs = ts;
            let needsDraw = false;
            if (!icMain || !icMain.hidden) {
                renderer.animTimeSec += dt;
                if (evalData && evalData.motorStates) {
                    for (const [mid, mst] of evalData.motorStates.entries()) {
                        if (mst.spinning && mst.rpm > 1) {
                            const radPerSec = (mst.rpm / 60) * Math.PI * 2 * 0.14; // visually crisp rotor speed
                            const dir = mst.direction === 'CCW' ? -1 : 1;
                            const prev = renderer.motorAngles.get(mid) || 0;
                            renderer.motorAngles.set(mid, (prev + dir * radPerSec * dt) % (Math.PI * 2));
                            needsDraw = true;
                        }
                    }
                }
                if (evalData && evalData.buzzerStates) {
                    for (const bst of evalData.buzzerStates.values()) {
                        if (bst.sounding) { needsDraw = true; break; }
                    }
                }
                if (renderer.showFlow && evalData && evalData.wireCurrents) {
                    for (const wc of evalData.wireCurrents.values()) {
                        if (wc.currentMa >= 0.15) { needsDraw = true; break; }
                    }
                }
            }
            if (needsDraw) scheduleRender();
            requestAnimationFrame(animTick);
        }
        requestAnimationFrame(animTick);

        function setHint(msg, isWarn = false) {
            const el = $('icToolHint');
            if (!el) return;
            el.textContent = msg;
            el.title = msg;
            el.style.color = isWarn ? '#f6b944' : '#96a5ba';
        }

        function autoConnectDroppedComponent(doc, compId) {
            const comp = doc.components.find(c => c.id === compId);
            if (!comp || comp.kind === 'breadboard') return;
            // Never auto-generate invisible point-to-point wires if this component is plugged into a breadboard!
            // Breadboard strips already handle electrical continuity cleanly without hidden ghost wires.
            const solverMod = getSolverMod();
            const boards = doc.components.filter(c => c.kind === 'breadboard');
            const bbHoleCoords = new Set();
            if (solverMod && typeof solverMod.getBreadboardHoles === 'function') {
                for (const bb of boards) {
                    for (const h of solverMod.getBreadboardHoles(bb)) {
                        bbHoleCoords.add(`${Math.round(h.x)},${Math.round(h.y)}`);
                    }
                }
            }
            const myPins = getComponentPins(comp);
            if (myPins.some(mp => bbHoleCoords.has(`${Math.round(mp.x)},${Math.round(mp.y)}`))) {
                return;
            }
            const all = allICPins(doc);
            for (const mp of myPins) {
                if (mp.isBreadboardHole) continue;
                for (const op of all.values()) {
                    if (op.compId === compId || op.isBreadboardHole) continue;
                    if (bbHoleCoords.has(`${Math.round(op.x)},${Math.round(op.y)}`)) continue;
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

        function recompute(opts = {}) {
            evalData = evaluateICBench(currentDoc);
            $('icUndoBtn').disabled = undoStack.length === 0;
            $('icRedoBtn').disabled = redoStack.length === 0;
            if ($('icAutoPowerToggle')) $('icAutoPowerToggle').checked = Boolean(currentDoc.autoPower);
            const rotBtn = $('icRotatePlacementBtn');
            if (rotBtn) rotBtn.hidden = !isPlacementTool(tool);
            updateBuzzerAudio();
            if (!opts.skipInspectorRebuild) {
                syncInspector();
            }
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
                const sp = IC_CATALOG[tool];
                setHint(`Click on the bench to place IC ${tool} (${sp.partNumber} · ${sp.pinCount || 14}-Pin DIP · Safe 4.0–5.5V · Pin ${sp.vccPin || 14}=VCC, Pin ${sp.gndPin || 7}=GND).`);
            } else if (tool === 'breadboard') {
                setHint('Click on the bench to place a Half-Size Breadboard (30 columns + power rails). Drag ICs, LEDs & resistors right onto holes to plug them in!');
            } else if (tool === 'breadboard_mini') {
                setHint('Click on the bench to place a Mini Breadboard (17 columns). Drag parts onto holes for automatic strip continuity.');
            } else if (tool === 'battery') {
                setHint('Click on the bench to place a 1.5V–6.0V AA Battery Holder (1–4 AA cells, customizable in Inspector).');
            } else if (tool === 'battery9v') {
                setHint('Click on the bench to place a 9V PP3 Battery. Watch out: 9V will overload bare LEDs or 74xx ICs without protection!');
            } else if (tool === 'psu') {
                setHint('Click on the bench to place an Adjustable 0–12V Regulated Bench Power Supply.');
            } else if (tool === 'potentiometer') {
                setHint('Click on the bench to place a Rotary Potentiometer (3-terminal variable voltage divider).');
            } else if (tool === 'pushbutton') {
                setHint('Click on the bench to place a 4-Pin Tactile Push Button (press & hold, or switch to Latch mode in Inspector).');
            } else if (tool === 'spdt') {
                setHint('Click on the bench to place a 3-Terminal SPDT Slide Switch (click to route Common between Left & Right throws).');
            } else if (tool === 'motor') {
                setHint('Click on the bench to place a 2D DC Motor. Select it to view live RPM, direction & current telemetry!');
            } else if (tool === 'buzzer') {
                setHint('Click on the bench to place a Piezo Buzzer (enable Sound in the top bar to hear real audio tone).');
            } else if (tool === 'rgb_led') {
                setHint('Click on the bench to place a 4-Leg Common-Cathode RGB LED (R, GND, G, B).');
            } else if (tool === 'npn') {
                setHint('Click on the bench to place a 2N2222 NPN TO-92 Transistor (Emitter, Base, Collector).');
            } else if (tool === 'multimeter') {
                setHint('Click on the bench to place a Handheld Digital Multimeter (click its dial to cycle V / mA / Ω).');
            } else if (tool === 'switch') {
                setHint('Click on the bench to place a Toggle Switch (Press R to rotate). Click any placed switch to flip it ON/OFF.');
            } else if (tool === 'dip4') {
                setHint('Click on the bench to place a 4-Channel DIP Switch Bank (B0–B3). Click individual rockers on the bank to toggle bits.');
            } else if (tool === 'probe') {
                setHint('Click on the bench to place a Digital Logic Probe (HI / LO / Hi-Z / SHORT).');
            } else if (tool === 'resistor') {
                setHint('Click on the bench to place a Variable Axial 4-Band Resistor (edit Ω value live in Inspector!).');
            } else if (tool === 'lamp') {
                setHint('Click on the bench to place a 2-Leg 5mm LED (use a series resistor to prevent overcurrent damage!).');
            } else if (tool === 'seg7_10') {
                setHint('Click on the bench to place a real 10-Pin Common-Cathode 7-Segment Display (g,f,COM,a,b top · e,d,COM,c,dp bottom — plugs directly across breadboard trough!).');
            } else if (tool === 'wire') {
                setHint('Pick a jumper wire color above, then drag from any pin or breadboard hole to another to connect. Click Tidy Wires anytime!');
            } else {
                setHint('Drag parts onto breadboard holes to plug in · Click switches/buttons/DMM to operate · Drag from any pin to wire · Press R to rotate.');
            }
            scheduleRender();
        }

        // Populate Presets dropdown with grouped 2D Hardware & 74xx IC sections
        const presetSelect = $('icExampleSelect');
        if (presetSelect) {
            const allPresets = { ...BENCH_2D_PRESETS, ...IC_PRESETS };
            const grp2d = document.createElement('optgroup');
            grp2d.label = '⚡ 2D Hardware & Breadboard Demos';
            for (const [id, p] of Object.entries(BENCH_2D_PRESETS)) {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = p.title;
                grp2d.appendChild(opt);
            }
            const grpIc = document.createElement('optgroup');
            grpIc.label = '🔲 74xx Digital IC Presets';
            for (const [id, p] of Object.entries(IC_PRESETS)) {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = p.title;
                grpIc.appendChild(opt);
            }
            presetSelect.append(grp2d, grpIc);
            presetSelect.addEventListener('change', () => {
                const id = presetSelect.value;
                if (!id || !allPresets[id]) return;
                commitDoc(allPresets[id].build());
                selected = null;
                wireStartPin = null;
                renderer.fit(currentDoc);
                recompute();
                setHint(allPresets[id].description);
            });
        }

        // Mode switcher handlers (only when embedded alongside Gates mode)
        function switchMode(mode) {
            if (!btnGates || !btnIC || !gatesMain || !icMain) return;
            const isIC = mode === 'ic';
            btnGates.classList.toggle('active', !isIC);
            btnGates.setAttribute('aria-selected', String(!isIC));
            btnIC.classList.toggle('active', isIC);
            btnIC.setAttribute('aria-selected', String(isIC));

            gatesMain.hidden = isIC;
            icMain.hidden = !isIC;
            if (gatesTopControls) gatesTopControls.hidden = isIC;
            if (icTopControls) icTopControls.hidden = !isIC;

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
        } else {
            renderer.resize();
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
            setHint('Workbench cleared. Drag or click any hardware component from the left gallery to start building.');
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

        $('icSoundToggle')?.addEventListener('change', e => {
            soundEnabled = e.target.checked;
            updateBuzzerAudio();
        });

        $('icFlowToggle')?.addEventListener('change', e => {
            renderer.showFlow = e.target.checked;
            scheduleRender();
        });

        // Wire color swatch bar
        function syncWireSwatchUI() {
            document.querySelectorAll('#icWireColorBar button[data-wire-color]').forEach(btn => {
                btn.classList.toggle('is-active', btn.dataset.wireColor === activeWireColor);
            });
        }
        document.querySelectorAll('#icWireColorBar button[data-wire-color]').forEach(btn => {
            btn.addEventListener('click', () => {
                activeWireColor = btn.dataset.wireColor || 'auto';
                syncWireSwatchUI();
                if (selected && selected.kind === 'wire') {
                    const next = cloneICDoc(currentDoc);
                    const w = next.wires.find(x => x.id === selected.id);
                    if (w) {
                        if (activeWireColor === 'auto') delete w.color;
                        else w.color = activeWireColor;
                        commitDoc(next);
                    }
                }
            });
        });
        syncWireSwatchUI();

        // One-click Tidy Wires
        $('icTidyWiresBtn')?.addEventListener('click', () => {
            if (!currentDoc.wires.length) return;
            const next = cloneICDoc(currentDoc);
            tidyAllWires(next);
            commitDoc(next);
            setHint('✨ All jumper wires neatly routed into separated non-overlapping channels!');
        });

        // 3-Mode Save/Export + Open + Drag-and-Drop (JSON + 2D Bench PNG + IEEE B&W Schematic PNG)
        const io = root.ElectricsimIO;
        const expMod = getExportMod();

        const validateDocErrors = docObj => {
            if (!expMod || typeof expMod.validateElectronicsDoc !== 'function') {
                return (docObj && Array.isArray(docObj.components) && Array.isArray(docObj.wires)) ? [] : ['Invalid Electronics Lab document'];
            }
            const res = expMod.validateElectronicsDoc(docObj);
            if (Array.isArray(res)) return res;
            return res && res.ok ? [] : [res?.error || 'Invalid Electronics Lab document'];
        };

        function applyLoadedElectronicsDoc(docObj, meta = {}) {
            const loaded = cloneICDoc(docObj);
            commitDoc(loaded);
            selected = null;
            wireStartPin = null;
            if (presetSelect) presetSelect.value = '';
            renderer.fit(currentDoc);
            recompute();
            const srcLabel = meta.sourceKind === 'png' ? 'PNG Image' : 'JSON';
            const fname = meta.sourceFilename || 'circuit';
            setHint(`✓ Loaded "${fname}" (${srcLabel}) — ${loaded.components.length} components, ${loaded.wires.length} wires.`);
        }

        async function loadElectronicsFile(file) {
            if (!file || !io) return;
            const res = await io.readImportedFile(file, 'electronics', validateDocErrors);
            if (!res.ok) {
                setHint(`⚠ ${res.error || 'Could not load file.'}`, true);
                return;
            }
            applyLoadedElectronicsDoc(res.doc, res.meta);
        }

        $('icSaveJsonBtn')?.addEventListener('click', () => {
            if (!io) return;
            const fname = io.downloadSavedJson('electronics', currentDoc);
            setHint(`💾 Saved ${fname} — drag & drop it back onto the Electronics Lab anytime to reload!`);
        });

        $('icExportBenchPngBtn')?.addEventListener('click', async () => {
            if (!io || !expMod) return;
            try {
                const benchCanvas = expMod.renderBenchPictureCanvas(currentDoc, evalData, renderer, {
                    getComponentBounds,
                    allICPins,
                    computeICWireGeometry
                });
                if (!benchCanvas) {
                    setHint('⚠ Place at least one component before exporting Bench PNG.', true);
                    return;
                }
                const fname = await io.downloadBWImage(benchCanvas, 'electronics', currentDoc, `electricsim-bench-2d-${io.formatTimestamp()}`);
                setHint(`📷 Exported 2D Bench PNG (${fname}) — drag & drop this PNG back into Electronics Lab to edit!`);
            } catch (err) {
                setHint(`⚠ Bench PNG export failed: ${err?.message || err}`, true);
            }
        });

        $('icExportSchematicPngBtn')?.addEventListener('click', async () => {
            if (!io || !expMod) return;
            try {
                const schCanvas = expMod.renderTrueSchematicCanvas(currentDoc, evalData, {
                    IC_CATALOG,
                    getComponentBounds,
                    getComponentPins,
                    getDipPinLocal,
                    allICPins,
                    computeICWireGeometry,
                    getBreadboardSpec: getSolverMod()?.getBreadboardSpec,
                    formatOhms: getSolverMod()?.formatOhms
                });
                if (!schCanvas) {
                    setHint('⚠ Place at least one component before exporting Schematic PNG.', true);
                    return;
                }
                const fname = await io.downloadBWImage(schCanvas, 'electronics', currentDoc, `electricsim-schematic-bw-${io.formatTimestamp()}`);
                setHint(`📐 Exported IEEE B&W Schematic (${fname}) — drag & drop this PNG back into Electronics Lab to edit!`);
            } catch (err) {
                setHint(`⚠ Schematic PNG export failed: ${err?.message || err}`, true);
            }
        });

        $('icOpenBtn')?.addEventListener('click', () => {
            $('icOpenFileInput')?.click();
        });

        $('icOpenFileInput')?.addEventListener('change', e => {
            const file = e.target.files?.[0];
            if (file) loadElectronicsFile(file);
            e.target.value = '';
        });

        if (io && typeof io.attachDropZone === 'function') {
            io.attachDropZone({
                expectedLab: 'electronics',
                labTitle: 'Electronics Lab',
                validateFn: validateDocErrors,
                onLoad: (docObj, meta) => {
                    if (icMain && icMain.hidden) return;
                    applyLoadedElectronicsDoc(docObj, meta);
                },
                onError: msg => setHint(`⚠ ${msg}`, true)
            });
        }

        // Zoom controls
        const zoomBy = factor => {
            const nextZoom = Math.max(0.22, Math.min(2.2, renderer.view.zoom * factor));
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

        // Render pure-white technical IEEE schematic diagrams seamlessly inside each component card!
        function renderPaletteThumbnails() {
            const hw = getHardwareMod();
            const thumbs = document.querySelectorAll('#icToolsNav canvas.ic-part-thumb[data-thumb-kind]');
            if (!thumbs.length) return;
            for (const c of thumbs) {
                const kind = c.dataset.thumbKind;
                if (hw && typeof hw.drawIEEESymbolPreview === 'function') {
                    hw.drawIEEESymbolPreview(c, kind);
                }
            }
        }
        renderPaletteThumbnails();

        // Live Component Palette Search Filter
        const paletteSearch = $('icPaletteSearch');
        if (paletteSearch) {
            paletteSearch.addEventListener('input', () => {
                const q = paletteSearch.value.trim().toLowerCase();
                document.querySelectorAll('#icToolsNav .palette-section').forEach(sec => {
                    if (sec.dataset.keepVisible === 'true') return;
                    let visibleCount = 0;
                    sec.querySelectorAll('button[data-ic-tool]').forEach(btn => {
                        const hay = `${btn.textContent} ${btn.title || ''} ${btn.dataset.icTool || ''} ${btn.dataset.keywords || ''}`.toLowerCase();
                        const match = !q || hay.includes(q);
                        btn.hidden = !match;
                        if (match) visibleCount++;
                    });
                    sec.hidden = visibleCount === 0;
                });
            });
        }

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
                if (snap) {
                    const bbSnap = snapCompToBreadboard(next, comp);
                    if (bbSnap) comp.position = { x: bbSnap.x, y: bbSnap.y };
                }
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
            const next = cloneICDoc(currentDoc);
            const comp = next.components.find(c => c.id === selected.id);
            if (!comp) return;
            if (comp.kind === 'switch') {
                comp.closed = !comp.closed;
                commitDoc(next);
            } else if (comp.kind === 'spdt') {
                comp.positionThrow = comp.positionThrow === 'right' ? 'left' : 'right';
                commitDoc(next);
            } else if (comp.kind === 'pushbutton') {
                comp.pressed = !comp.pressed;
                commitDoc(next);
            } else if (comp.kind === 'psu') {
                comp.enabled = !(comp.enabled !== false);
                commitDoc(next);
            } else if (comp.kind === 'multimeter') {
                const modes = ['V', 'mA', 'ohm'];
                comp.mode = modes[(modes.indexOf(comp.mode || 'V') + 1) % modes.length];
                commitDoc(next);
            } else if (comp.kind === 'clock') {
                comp.value = comp.value ? 0 : 1;
                commitDoc(next);
            } else if (comp.kind === 'dip4') {
                const cur = (((comp.bits?.[0] ? 1 : 0) | (comp.bits?.[1] ? 2 : 0) | (comp.bits?.[2] ? 4 : 0) | (comp.bits?.[3] ? 8 : 0)) + 1) & 0x0f;
                comp.bits = [cur & 1, (cur >> 1) & 1, (cur >> 2) & 1, (cur >> 3) & 1];
                commitDoc(next);
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
            const dynBox = $('icDynamicControls');
            const faultBox = $('icFaultBox');
            if (dynBox) dynBox.replaceChildren();
            if (faultBox) {
                faultBox.hidden = true;
                faultBox.replaceChildren();
            }

            if (!selected) {
                card.hidden = true;
                return;
            }

            const solverMod = getSolverMod();

            function showFaultBanner(msg, severity = 'error') {
                if (!faultBox || !msg) return;
                faultBox.hidden = false;
                faultBox.className = `ic-fault-box is-${severity}`;
                faultBox.textContent = msg;
            }

            if (selected.kind === 'wire') {
                const w = currentDoc.wires.find(x => x.id === selected.id);
                if (!w) {
                    selected = null;
                    card.hidden = true;
                    return;
                }
                card.hidden = false;
                $('icInspectorTitle').textContent = 'Selected Jumper Wire';
                const v = evalData.pinValues.get(w.from);
                const volts = evalData.pinVoltages ? evalData.pinVoltages.get(w.from) : null;
                const vStr = (volts !== null && volts !== undefined && Number.isFinite(volts))
                    ? `${volts.toFixed(2)} V`
                    : (v === 1 ? 'HIGH' : v === 0 ? 'LOW (0V)' : 'OPEN');
                $('icInspectorMeta').textContent = `${w.from} ↔ ${w.to} · Live Net Voltage: ${vStr}. Drag wire segments to route or double-click to reset.`;
                $('icLampColorWrap').hidden = true;
                $('icToggleSelectedBtn').hidden = true;
                $('icPinTableWrap').hidden = true;
                $('icDuplicateBtn').hidden = true;
                if ($('icRotateBtn')) $('icRotateBtn').hidden = true;

                if (dynBox) {
                    const row1 = document.createElement('div');
                    row1.className = 'ic-dyn-row';
                    const lbl = document.createElement('span');
                    lbl.className = 'ic-dyn-label';
                    lbl.textContent = 'Wire Color:';
                    row1.appendChild(lbl);

                    const swWrap = document.createElement('div');
                    swWrap.className = 'ic-wire-swatches';
                    for (const p of WIRE_PALETTE) {
                        const b = document.createElement('button');
                        b.type = 'button';
                        b.className = 'ic-wire-swatch' + ((w.color || 'auto') === p.id ? ' is-active' : '');
                        b.title = p.label;
                        if (p.hex) b.style.background = p.hex;
                        else b.textContent = 'A';
                        b.addEventListener('click', () => {
                            const next = cloneICDoc(currentDoc);
                            const tw = next.wires.find(x => x.id === w.id);
                            if (tw) {
                                if (p.id === 'auto') delete tw.color;
                                else tw.color = p.id;
                                commitDoc(next);
                            }
                        });
                        swWrap.appendChild(b);
                    }
                    row1.appendChild(swWrap);
                    dynBox.appendChild(row1);

                    const row2 = document.createElement('div');
                    row2.className = 'ic-dyn-row';
                    const lbl2 = document.createElement('span');
                    lbl2.className = 'ic-dyn-label';
                    lbl2.textContent = 'Net Tag:';
                    const inp = document.createElement('input');
                    inp.type = 'text';
                    inp.className = 'ic-dyn-input';
                    inp.placeholder = 'e.g. +9V, CLK, MOTOR';
                    inp.value = w.label || '';
                    inp.addEventListener('change', () => {
                        const next = cloneICDoc(currentDoc);
                        const tw = next.wires.find(x => x.id === w.id);
                        if (tw) {
                            tw.label = inp.value.trim().slice(0, 14);
                            commitDoc(next);
                        }
                    });
                    row2.append(lbl2, inp);
                    dynBox.appendChild(row2);
                }
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
            if ($('icRotateBtn')) $('icRotateBtn').hidden = comp.kind === 'breadboard';
            $('icLampColorWrap').hidden = comp.kind !== 'lamp';
            $('icToggleSelectedBtn').hidden = comp.kind !== 'switch' && comp.kind !== 'clock' && comp.kind !== 'dip4' && comp.kind !== 'spdt' && comp.kind !== 'pushbutton';
            $('icPinTableWrap').hidden = comp.kind !== 'ic';

            if (comp.kind === 'ic') {
                const spec = IC_CATALOG[comp.model];
                const st = evalData.icStates.get(comp.id);
                const vccPin = spec.vccPin || 14;
                const gndPin = spec.gndPin || 7;
                const pinCount = spec.pinCount || 14;
                $('icInspectorTitle').textContent = `IC ${spec.model} (${spec.partNumber} · ${pinCount}-Pin DIP)`;
                $('icInspectorMeta').textContent = `${spec.description} · Safe VCC: 4.0V–5.5V (Pin ${vccPin}=VCC, Pin ${gndPin}=GND) · Icc ≈ ${spec.iccMa || 8} mA, tpd ≈ ${spec.tpdNs || 10} ns.`;

                const badge = $('icPowerBadge');
                if (st?.corrupted) {
                    badge.textContent = st.reversePower ? '🔥 CORRUPTED (REVERSE)' : `🔥 CORRUPTED (${st.supplyV?.toFixed(1)}V)`;
                    badge.style.color = '#ff5a52';
                    showFaultBanner(st.faultText || 'IC damaged due to supply voltage violation! Lower supply to 4.0–5.5V to recover.', 'error');
                } else if (st?.overVoltageWarn) {
                    badge.textContent = `⚠ OVER-V WARN (${st.supplyV?.toFixed(1)}V)`;
                    badge.style.color = '#f6b944';
                    showFaultBanner(st.faultText || `Supply ${st.supplyV?.toFixed(1)}V exceeds 5.5V spec. Use 3×AA (4.5V) or 5.0V Bench PSU.`, 'warn');
                } else if (st?.powered) {
                    badge.textContent = `✓ POWERED (${(st.supplyV || 5).toFixed(1)}V)`;
                    badge.style.color = '#37e0a1';
                } else if (st?.underVoltage) {
                    badge.textContent = `⚠ LOW V (${st.supplyV?.toFixed(1)}V < 4.0V)`;
                    badge.style.color = '#f6b944';
                    showFaultBanner(`Supply ${st.supplyV?.toFixed(1)}V is below 74xx minimum 4.0V threshold.`, 'warn');
                } else {
                    badge.textContent = `UNPOWERED (Wire ${vccPin} & ${gndPin})`;
                    badge.style.color = '#f6b944';
                }

                const grid = $('icPinoutGrid');
                grid.replaceChildren();
                const pins = getComponentPins(comp);
                for (const p of pins) {
                    const v = evalData.pinValues.get(p.key);
                    const volts = evalData.pinVoltages ? evalData.pinVoltages.get(p.key) : null;
                    const pill = document.createElement('div');
                    pill.className = 'ic-pin-pill'
                        + (v === 1 ? ' is-high' : v === 0 ? ' is-low' : ' is-open')
                        + (p.pinNumber === vccPin ? ' is-vcc' : '')
                        + (p.pinNumber === gndPin ? ' is-gnd' : '');
                    const left = document.createElement('span');
                    const pinLbl = spec.pinLabels && spec.pinLabels[p.pinNumber];
                    left.textContent = pinLbl ? `Pin ${p.pinNumber} (${pinLbl})` : `Pin ${p.pinNumber}`;
                    const right = document.createElement('strong');
                    const vDisp = (volts !== null && volts !== undefined) ? `${volts.toFixed(1)}V` : 'OPEN';
                    right.textContent = p.pinNumber === vccPin
                        ? `VCC (${vDisp})`
                        : p.pinNumber === gndPin
                        ? `GND (${vDisp})`
                        : v === 1
                        ? `1 (${vDisp})`
                        : v === 0
                        ? `0 (${vDisp})`
                        : 'OPEN';
                    pill.append(left, right);
                    grid.appendChild(pill);
                }
            } else if (comp.kind === 'battery') {
                const cells = Math.max(1, Math.min(4, Math.round(comp.cells || (comp.voltage ? comp.voltage / 1.5 : 3))));
                const v = (cells * 1.5).toFixed(1);
                const src = evalData.sourceStates?.get(comp.id);
                $('icInspectorTitle').textContent = `AA Battery Pack (${cells}×AA · ${v}V DC)`;
                $('icInspectorMeta').textContent = `Each AA cell delivers 1.5V (max 4×AA = 6.0V). Current draw: ${(src?.currentMa || 0).toFixed(1)} mA · 3×AA (4.5V) is safe for 74xx ICs; 4×AA (6.0V) triggers IC overvoltage warning.`;
                if (dynBox) {
                    const row = document.createElement('div');
                    row.className = 'ic-dyn-row';
                    const lbl = document.createElement('span');
                    lbl.className = 'ic-dyn-label';
                    lbl.textContent = 'AA Cells:';
                    const btnGroup = document.createElement('div');
                    btnGroup.className = 'ic-chip-group';
                    for (let c = 1; c <= 4; c++) {
                        const b = document.createElement('button');
                        b.type = 'button';
                        b.className = 'ic-dyn-chip' + (c === cells ? ' is-active' : '');
                        b.textContent = `${c}×AA (${(c * 1.5).toFixed(1)}V)`;
                        b.addEventListener('click', () => {
                            const next = cloneICDoc(currentDoc);
                            const tc = next.components.find(x => x.id === comp.id);
                            if (tc) {
                                tc.cells = c;
                                tc.voltage = Math.round(c * 1.5 * 10) / 10;
                                tc.label = `${c}×AA (${tc.voltage.toFixed(1)}V)`;
                                commitDoc(next);
                            }
                        });
                        btnGroup.appendChild(b);
                    }
                    row.append(lbl, btnGroup);
                    dynBox.appendChild(row);
                }
            } else if (comp.kind === 'battery9v') {
                const src = evalData.sourceStates?.get(comp.id);
                $('icInspectorTitle').textContent = '9V PP3 Alkaline Battery (9.0V DC)';
                $('icInspectorMeta').textContent = `Fixed 9.0V supply · Live draw: ${(src?.currentMa || 0).toFixed(1)} mA. Ideal for 9V DC Motors & Buzzers. Warning: Direct 9V will overload bare LEDs (>30mA) and damage 74xx ICs (>6.5V)!`;
            } else if (comp.kind === 'psu') {
                const v = Number(comp.voltage !== undefined ? comp.voltage : 5);
                const on = comp.enabled !== false;
                const src = evalData.sourceStates?.get(comp.id);
                $('icInspectorTitle').textContent = `Bench Power Supply (${on ? `${v.toFixed(1)}V ON` : 'STANDBY OFF'})`;
                $('icInspectorMeta').textContent = `Regulated 0.0–12.0V laboratory supply · Output: ${(src?.currentMa || 0).toFixed(1)} mA (${((src?.currentMa || 0) * v).toFixed(0)} mW).`;
                if (dynBox) {
                    const rowTop = document.createElement('div');
                    rowTop.className = 'ic-dyn-row';
                    const pwrBtn = document.createElement('button');
                    pwrBtn.type = 'button';
                    pwrBtn.className = 'ic-dyn-chip' + (on ? ' is-active' : '');
                    pwrBtn.textContent = on ? '⚡ Output: ON (Click to Turn OFF)' : '⏻ Output: OFF (Click to Turn ON)';
                    pwrBtn.addEventListener('click', () => {
                        const next = cloneICDoc(currentDoc);
                        const tc = next.components.find(x => x.id === comp.id);
                        if (tc) { tc.enabled = !(tc.enabled !== false); commitDoc(next); }
                    });
                    rowTop.appendChild(pwrBtn);
                    dynBox.appendChild(rowTop);

                    const rowSl = document.createElement('div');
                    rowSl.className = 'ic-dyn-row';
                    const lbl = document.createElement('span');
                    lbl.className = 'ic-dyn-label';
                    lbl.textContent = `Voltage: ${v.toFixed(1)} V`;
                    const sl = document.createElement('input');
                    sl.type = 'range';
                    sl.min = '0';
                    sl.max = '12';
                    sl.step = '0.05';
                    sl.value = String(v);
                    sl.className = 'ic-dyn-slider';
                    let preDragDoc = null;
                    sl.addEventListener('pointerdown', e => {
                        e.stopPropagation();
                        preDragDoc = cloneICDoc(currentDoc);
                    });
                    sl.addEventListener('input', () => {
                        const nv = Math.round(parseFloat(sl.value) * 20) / 20;
                        comp.voltage = nv;
                        lbl.textContent = `Voltage: ${nv.toFixed(2)} V`;
                        recompute({ skipInspectorRebuild: true });
                        const liveSrc = evalData.sourceStates?.get(comp.id);
                        const isOn = comp.enabled !== false;
                        $('icInspectorTitle').textContent = `Bench Power Supply (${isOn ? `${nv.toFixed(2)}V ON` : 'STANDBY OFF'})`;
                        $('icInspectorMeta').textContent = `Regulated 0.0–12.0V laboratory supply · Output: ${(liveSrc?.currentMa || 0).toFixed(1)} mA (${((liveSrc?.currentMa || 0) * nv).toFixed(0)} mW).`;
                        presetsRow.querySelectorAll('.ic-dyn-chip').forEach(btn => {
                            const pv = parseFloat(btn.dataset.pv);
                            btn.classList.toggle('is-active', Math.abs(nv - pv) < 0.08);
                        });
                    });
                    sl.addEventListener('change', () => {
                        if (preDragDoc) {
                            undoStack.push(preDragDoc);
                            if (undoStack.length > 60) undoStack.shift();
                            redoStack.length = 0;
                            preDragDoc = null;
                        }
                        recompute();
                    });
                    rowSl.append(lbl, sl);
                    dynBox.appendChild(rowSl);

                    const presetsRow = document.createElement('div');
                    presetsRow.className = 'ic-chip-group';
                    for (const pv of [3.3, 5.0, 6.0, 9.0, 12.0]) {
                        const b = document.createElement('button');
                        b.type = 'button';
                        b.dataset.pv = String(pv);
                        b.className = 'ic-dyn-chip' + (Math.abs(v - pv) < 0.08 ? ' is-active' : '');
                        b.textContent = `${pv.toFixed(1)}V`;
                        b.addEventListener('click', () => {
                            const next = cloneICDoc(currentDoc);
                            const tc = next.components.find(x => x.id === comp.id);
                            if (tc) { tc.voltage = pv; tc.enabled = true; commitDoc(next); }
                        });
                        presetsRow.appendChild(b);
                    }
                    dynBox.appendChild(presetsRow);
                }
            } else if (comp.kind === 'resistor') {
                const ohms = comp.ohms || 220;
                const rst = evalData.resistorStates?.get(comp.id);
                const fmt = solverMod ? solverMod.formatOhms(ohms) : `${ohms}Ω`;
                $('icInspectorTitle').textContent = `Variable Resistor (${fmt} · 1/4W)`;
                $('icInspectorMeta').textContent = `Drop: ${(rst?.voltageDrop || 0).toFixed(2)} V · Current: ${(rst?.currentMa || 0).toFixed(1)} mA · Power: ${(rst?.powerMw || 0).toFixed(0)} mW / 250 mW max.`;
                if (rst?.overloaded) {
                    showFaultBanner(rst.faultText || 'Resistor overheating (> 250 mW)! Increase resistance.', 'error');
                }
                if (dynBox) {
                    // Live 4-band EIA color stripe preview
                    if (solverMod) {
                        const bands = solverMod.getResistorBands(ohms);
                        const bandRow = document.createElement('div');
                        bandRow.className = 'ic-res-band-preview';
                        for (const c of bands) {
                            const dot = document.createElement('span');
                            dot.className = 'ic-res-band-dot';
                            dot.style.background = c;
                            bandRow.appendChild(dot);
                        }
                        const txt = document.createElement('small');
                        txt.textContent = `EIA 4-Band · ${fmt} ±5%`;
                        bandRow.appendChild(txt);
                        dynBox.appendChild(bandRow);
                    }

                    // Custom numeric Ω input + unit selector
                    const rowInp = document.createElement('div');
                    rowInp.className = 'ic-dyn-row';
                    let unitMult = 1;
                    let dispVal = ohms;
                    if (ohms >= 1e6) { unitMult = 1e6; dispVal = +(ohms / 1e6).toFixed(2); }
                    else if (ohms >= 1e3) { unitMult = 1e3; dispVal = +(ohms / 1e3).toFixed(2); }

                    const numInp = document.createElement('input');
                    numInp.type = 'number';
                    numInp.min = '1';
                    numInp.max = '9999';
                    numInp.step = 'any';
                    numInp.className = 'ic-dyn-input';
                    numInp.value = String(dispVal);

                    const unitSel = document.createElement('select');
                    unitSel.className = 'ic-dyn-select';
                    [['1', 'Ω'], ['1000', 'kΩ'], ['1000000', 'MΩ']].forEach(([val, txt]) => {
                        const o = document.createElement('option');
                        o.value = val;
                        o.textContent = txt;
                        if (Number(val) === unitMult) o.selected = true;
                        unitSel.appendChild(o);
                    });

                    const applyRes = () => {
                        const vNum = Math.max(1, parseFloat(numInp.value) || 1);
                        const mult = Number(unitSel.value) || 1;
                        const newOhms = Math.min(10e6, Math.max(1, Math.round(vNum * mult)));
                        const next = cloneICDoc(currentDoc);
                        const tc = next.components.find(x => x.id === comp.id);
                        if (tc) {
                            tc.ohms = newOhms;
                            tc.label = solverMod ? solverMod.formatOhms(newOhms) : `${newOhms}Ω`;
                            commitDoc(next);
                        }
                    };
                    numInp.addEventListener('change', applyRes);
                    unitSel.addEventListener('change', applyRes);
                    rowInp.append(numInp, unitSel);
                    dynBox.appendChild(rowInp);

                    // Quick E12 resistance chips
                    const chips = document.createElement('div');
                    chips.className = 'ic-chip-group';
                    for (const val of [100, 220, 330, 470, 1000, 4700, 10000, 100000]) {
                        const b = document.createElement('button');
                        b.type = 'button';
                        b.className = 'ic-dyn-chip' + (ohms === val ? ' is-active' : '');
                        b.textContent = solverMod ? solverMod.formatOhms(val) : `${val}Ω`;
                        b.addEventListener('click', () => {
                            const next = cloneICDoc(currentDoc);
                            const tc = next.components.find(x => x.id === comp.id);
                            if (tc) {
                                tc.ohms = val;
                                tc.label = solverMod ? solverMod.formatOhms(val) : `${val}Ω`;
                                commitDoc(next);
                            }
                        });
                        chips.appendChild(b);
                    }
                    dynBox.appendChild(chips);
                }
            } else if (comp.kind === 'potentiometer') {
                const pst = evalData.potStates?.get(comp.id);
                const wiper = comp.wiper !== undefined ? comp.wiper : 0.5;
                const totalOhms = comp.ohms || 10000;
                const fmt = solverMod ? solverMod.formatOhms(totalOhms) : `${totalOhms}Ω`;
                $('icInspectorTitle').textContent = `Rotary Potentiometer (${fmt} · ${Math.round(wiper * 100)}%)`;
                $('icInspectorMeta').textContent = `Wiper Voltage: ${(pst?.vWiper || 0).toFixed(2)} V · T1–Wiper: ${solverMod ? solverMod.formatOhms(pst?.r1 || 0) : ''} · Wiper–T2: ${solverMod ? solverMod.formatOhms(pst?.r2 || 0) : ''}.`;
                if (dynBox) {
                    const rowSl = document.createElement('div');
                    rowSl.className = 'ic-dyn-row';
                    const lbl = document.createElement('span');
                    lbl.className = 'ic-dyn-label';
                    lbl.textContent = `Knob Position: ${Math.round(wiper * 100)}%`;
                    const sl = document.createElement('input');
                    sl.type = 'range';
                    sl.min = '0';
                    sl.max = '100';
                    sl.step = '0.5';
                    sl.value = String(Math.round(wiper * 1000) / 10);
                    sl.className = 'ic-dyn-slider';
                    let preDragDoc = null;
                    sl.addEventListener('pointerdown', e => {
                        e.stopPropagation();
                        preDragDoc = cloneICDoc(currentDoc);
                    });
                    sl.addEventListener('input', () => {
                        const pct = parseFloat(sl.value);
                        comp.wiper = Math.max(0, Math.min(1, pct / 100));
                        lbl.textContent = `Knob Position: ${Math.round(pct)}%`;
                        recompute({ skipInspectorRebuild: true });
                        const livePst = evalData.potStates?.get(comp.id);
                        $('icInspectorTitle').textContent = `Rotary Potentiometer (${fmt} · ${Math.round(pct)}%)`;
                        $('icInspectorMeta').textContent = `Wiper Voltage: ${(livePst?.vWiper || 0).toFixed(2)} V · T1–Wiper: ${solverMod ? solverMod.formatOhms(livePst?.r1 || 0) : ''} · Wiper–T2: ${solverMod ? solverMod.formatOhms(livePst?.r2 || 0) : ''}.`;
                        pctChips.querySelectorAll('.ic-dyn-chip').forEach(btn => {
                            btn.classList.toggle('is-active', Math.abs(pct - Number(btn.dataset.pct)) < 2);
                        });
                    });
                    sl.addEventListener('change', () => {
                        if (preDragDoc) {
                            undoStack.push(preDragDoc);
                            if (undoStack.length > 60) undoStack.shift();
                            redoStack.length = 0;
                            preDragDoc = null;
                        }
                        recompute();
                    });
                    rowSl.append(lbl, sl);
                    dynBox.appendChild(rowSl);

                    const pctChips = document.createElement('div');
                    pctChips.className = 'ic-chip-group';
                    for (const pVal of [0, 25, 50, 75, 100]) {
                        const b = document.createElement('button');
                        b.type = 'button';
                        b.dataset.pct = String(pVal);
                        b.className = 'ic-dyn-chip' + (Math.abs(Math.round(wiper * 100) - pVal) < 2 ? ' is-active' : '');
                        b.textContent = `${pVal}%`;
                        b.addEventListener('click', () => {
                            const next = cloneICDoc(currentDoc);
                            const tc = next.components.find(x => x.id === comp.id);
                            if (tc) { tc.wiper = pVal / 100; commitDoc(next); }
                        });
                        pctChips.appendChild(b);
                    }
                    dynBox.appendChild(pctChips);

                    const chips = document.createElement('div');
                    chips.className = 'ic-chip-group';
                    for (const val of [100, 1000, 10000, 100000]) {
                        const b = document.createElement('button');
                        b.type = 'button';
                        b.className = 'ic-dyn-chip' + (totalOhms === val ? ' is-active' : '');
                        b.textContent = solverMod ? solverMod.formatOhms(val) : `${val}Ω`;
                        b.addEventListener('click', () => {
                            const next = cloneICDoc(currentDoc);
                            const tc = next.components.find(x => x.id === comp.id);
                            if (tc) { tc.ohms = val; commitDoc(next); }
                        });
                        chips.appendChild(b);
                    }
                    dynBox.appendChild(chips);
                }
            } else if (comp.kind === 'motor') {
                const mst = evalData.motorStates?.get(comp.id) || { rpm: 0, direction: 'IDLE', voltage: 0, currentMa: 0, powerMw: 0 };
                $('icInspectorTitle').textContent = `DC Motor (${mst.rpm} RPM · ${mst.direction})`;
                $('icInspectorMeta').textContent = `Rated ${comp.ratedV || 9}V (Max ${comp.maxRpm || 3600} RPM). Swap +/− polarity to reverse rotation direction (CW ↔ CCW).`;
                if (mst.overloaded) {
                    showFaultBanner(mst.faultText || 'DC Motor over-voltage fault (>12V)! Reduce supply voltage.', 'error');
                }
                if (dynBox) {
                    const cardEl = document.createElement('div');
                    cardEl.className = 'ic-motor-telemetry';
                    cardEl.innerHTML = `
                        <div class="ic-motor-rpm-big">${mst.rpm.toLocaleString()} <span>RPM</span></div>
                        <div class="ic-motor-stats-row">
                            <span>Dir: <strong>${mst.direction}</strong></span>
                            <span>Volt: <strong>${mst.voltage.toFixed(2)} V</strong></span>
                            <span>Draw: <strong>${mst.currentMa.toFixed(0)} mA</strong></span>
                        </div>`;
                    dynBox.appendChild(cardEl);
                }
            } else if (comp.kind === 'pushbutton') {
                $('icInspectorTitle').textContent = `Tactile Push Button (${comp.pressed ? 'PRESSED / CLOSED' : 'RELEASED / OPEN'})`;
                $('icInspectorMeta').textContent = comp.latched
                    ? 'Latched Mode: Click the button cap on the bench (or Space) to toggle CLOSED ↔ OPEN.'
                    : 'Momentary Mode: Press and hold the button cap on the bench to close contacts A1-A2 ↔ B1-B2.';
                $('icToggleSelectedBtn').textContent = comp.pressed ? 'Release Button' : 'Press Button';
                if (dynBox) {
                    const group = document.createElement('div');
                    group.className = 'ic-chip-group';
                    const bMom = document.createElement('button');
                    bMom.type = 'button';
                    bMom.className = 'ic-dyn-chip' + (!comp.latched ? ' is-active' : '');
                    bMom.textContent = 'Momentary (Hold)';
                    bMom.addEventListener('click', () => {
                        const next = cloneICDoc(currentDoc);
                        const tc = next.components.find(x => x.id === comp.id);
                        if (tc) { tc.latched = false; tc.pressed = false; commitDoc(next); }
                    });
                    const bLat = document.createElement('button');
                    bLat.type = 'button';
                    bLat.className = 'ic-dyn-chip' + (comp.latched ? ' is-active' : '');
                    bLat.textContent = 'Latched (Toggle)';
                    bLat.addEventListener('click', () => {
                        const next = cloneICDoc(currentDoc);
                        const tc = next.components.find(x => x.id === comp.id);
                        if (tc) { tc.latched = true; commitDoc(next); }
                    });
                    group.append(bMom, bLat);
                    dynBox.appendChild(group);
                }
            } else if (comp.kind === 'spdt') {
                const isRight = comp.positionThrow === 'right';
                $('icInspectorTitle').textContent = `3-Terminal SPDT Switch (COM → ${isRight ? 'T2 Right' : 'T1 Left'})`;
                $('icInspectorMeta').textContent = 'Single-Pole Double-Throw switch routes center Common (COM) to either Throw 1 (Left) or Throw 2 (Right). Click switch on bench or press Space.';
                $('icToggleSelectedBtn').textContent = isRight ? 'Slide Left (COM → T1)' : 'Slide Right (COM → T2)';
            } else if (comp.kind === 'multimeter') {
                const mst = evalData.meterStates?.get(comp.id) || { mode: comp.mode || 'V', display: '0.00 V' };
                $('icInspectorTitle').textContent = `Digital Multimeter (${mst.display})`;
                $('icInspectorMeta').textContent = 'Connect Red (+) and Black (COM) probes in parallel for Volts (V), in series for Current (mA), or across unpowered parts for Resistance (Ω).';
                if (dynBox) {
                    const group = document.createElement('div');
                    group.className = 'ic-chip-group';
                    [['V', 'V (Volts)'], ['mA', 'mA (Current)'], ['ohm', 'Ω (Ohms)']].forEach(([m, label]) => {
                        const b = document.createElement('button');
                        b.type = 'button';
                        b.className = 'ic-dyn-chip' + ((comp.mode || 'V') === m ? ' is-active' : '');
                        b.textContent = label;
                        b.addEventListener('click', () => {
                            const next = cloneICDoc(currentDoc);
                            const tc = next.components.find(x => x.id === comp.id);
                            if (tc) { tc.mode = m; commitDoc(next); }
                        });
                        group.appendChild(b);
                    });
                    dynBox.appendChild(group);
                }
            } else if (comp.kind === 'buzzer') {
                const bst = evalData.buzzerStates?.get(comp.id) || { sounding: false, voltage: 0, freqHz: comp.freqHz || 880 };
                $('icInspectorTitle').textContent = `Piezo Buzzer (${bst.sounding ? `SOUNDING · ${bst.freqHz} Hz` : 'SILENT'})`;
                $('icInspectorMeta').textContent = `Voltage: ${bst.voltage.toFixed(2)} V · Turn on "🔊 Sound" in the subbar to hear the live piezo tone.`;
                if (dynBox) {
                    const rowSl = document.createElement('div');
                    rowSl.className = 'ic-dyn-row';
                    const lbl = document.createElement('span');
                    lbl.className = 'ic-dyn-label';
                    lbl.textContent = `Pitch: ${comp.freqHz || 880} Hz`;
                    const sl = document.createElement('input');
                    sl.type = 'range';
                    sl.min = '220';
                    sl.max = '2400';
                    sl.step = '10';
                    sl.value = String(comp.freqHz || 880);
                    sl.className = 'ic-dyn-slider';
                    let preDragDoc = null;
                    sl.addEventListener('pointerdown', e => {
                        e.stopPropagation();
                        preDragDoc = cloneICDoc(currentDoc);
                    });
                    sl.addEventListener('input', () => {
                        comp.freqHz = Number(sl.value);
                        lbl.textContent = `Pitch: ${comp.freqHz} Hz`;
                        recompute({ skipInspectorRebuild: true });
                        const liveBst = evalData.buzzerStates?.get(comp.id) || { sounding: false, voltage: 0, freqHz: comp.freqHz };
                        $('icInspectorTitle').textContent = `Piezo Buzzer (${liveBst.sounding ? `SOUNDING · ${comp.freqHz} Hz` : 'SILENT'})`;
                    });
                    sl.addEventListener('change', () => {
                        if (preDragDoc) {
                            undoStack.push(preDragDoc);
                            if (undoStack.length > 60) undoStack.shift();
                            redoStack.length = 0;
                            preDragDoc = null;
                        }
                        recompute();
                    });
                    rowSl.append(lbl, sl);
                    dynBox.appendChild(rowSl);
                }
            } else if (comp.kind === 'npn') {
                const qst = evalData.npnStates?.get(comp.id) || { mode: 'CUTOFF', ibMa: 0, icMa: 0, vbe: 0, vce: 0 };
                $('icInspectorTitle').textContent = `NPN 2N2222 Transistor (${qst.mode})`;
                $('icInspectorMeta').textContent = `Pinout (flat face): E (Left) · B (Center) · C (Right) · Ib = ${qst.ibMa.toFixed(2)} mA · Ic = ${qst.icMa.toFixed(1)} mA · Vbe = ${qst.vbe.toFixed(2)}V · Vce = ${qst.vce.toFixed(2)}V.`;
                if (qst.overloaded) {
                    showFaultBanner(qst.faultText || 'Transistor overcurrent! Add a base resistor (≥ 1 kΩ).', 'error');
                }
            } else if (comp.kind === 'rgb_led') {
                const rst = evalData.rgbStates?.get(comp.id);
                $('icInspectorTitle').textContent = `4-Leg RGB LED (${rst?.lit ? 'ILLUMINATED' : 'OFF'})`;
                $('icInspectorMeta').textContent = `Common Cathode (2nd leg) · R: ${(rst?.channels?.r?.currentMa || 0).toFixed(1)} mA · G: ${(rst?.channels?.g?.currentMa || 0).toFixed(1)} mA · B: ${(rst?.channels?.b?.currentMa || 0).toFixed(1)} mA.`;
                if (rst?.overloaded) {
                    showFaultBanner(rst.faultText || 'RGB LED channel overcurrent (>30 mA)! Add series resistors.', 'error');
                }
            } else if (comp.kind === 'breadboard') {
                const pluggedCount = evalData.pluggedPinMap
                    ? [...evalData.pluggedPinMap.values()].filter(h => h.startsWith(comp.id + ':')).length
                    : 0;
                $('icInspectorTitle').textContent = comp.variant === 'mini' ? 'Mini Breadboard (17 Columns)' : 'Half-Size Breadboard (30 Cols + Rails)';
                $('icInspectorMeta').textContent = `${pluggedCount} component lead(s) currently plugged into internal spring clips. Hover any hole to highlight its connected copper strip in green! Dragging this breadboard moves plugged-in parts with it.`;
            } else if (comp.kind === 'switch') {
                $('icInspectorTitle').textContent = `Toggle Switch (${comp.closed ? 'CLOSED / ON' : 'OPEN / OFF'})`;
                $('icInspectorMeta').textContent = 'Click directly on the switch on the bench (or press Space) to flip between HIGH (1) and LOW (0).';
                $('icToggleSelectedBtn').textContent = comp.closed ? 'Flip Switch → OFF (0)' : 'Flip Switch → ON (1)';
            } else if (comp.kind === 'dip4') {
                const b = comp.bits || [0, 0, 0, 0];
                const val = (b[0] ? 1 : 0) | (b[1] ? 2 : 0) | (b[2] ? 4 : 0) | (b[3] ? 8 : 0);
                $('icInspectorTitle').textContent = `4-Channel DIP Switch Bank (Value: ${val} / 0x${val.toString(16).toUpperCase()})`;
                $('icInspectorMeta').textContent = `Click individual rockers B0–B3 on the bench to toggle bits [${b[3]},${b[2]},${b[1]},${b[0]}], or press Space to increment the 4-bit binary word.`;
                $('icToggleSelectedBtn').textContent = `Increment 4-Bit Word (${val} → ${(val + 1) & 15})`;
            } else if (comp.kind === 'probe') {
                const pst = evalData.probeStates?.get(comp.id);
                const status = pst?.conflict ? 'SHORT CONFLICT' : pst?.val === 1 ? 'HIGH' : pst?.val === 0 ? 'LOW (0V GND)' : 'Hi-Z (Floating)';
                $('icInspectorTitle').textContent = `Digital Logic Probe (${status})`;
                $('icInspectorMeta').textContent = 'High-impedance logic test probe that measures live TTL voltage levels without loading the circuit.';
            } else if (comp.kind === 'lamp') {
                const lst = evalData.lampStates.get(comp.id);
                const ma = lst?.currentMa !== undefined ? ` · ${lst.currentMa.toFixed(1)} mA` : '';
                if (lst?.overloaded) {
                    $('icInspectorTitle').textContent = `5mm LED (${comp.label || 'LED'} — 🔥 OVERCURRENT${ma})`;
                    $('icInspectorMeta').textContent = 'Too much current is flowing through this LED (> 30 mA max). Insert a 220 Ω–330 Ω series resistor to protect it!';
                    showFaultBanner(lst.faultText || 'LED damaged by excessive current (>30 mA)! Add a series resistor.', 'error');
                } else if (lst?.lit) {
                    $('icInspectorTitle').textContent = `5mm LED (${comp.label || 'LED'} — ILLUMINATED${ma})`;
                    $('icInspectorMeta').textContent = `✓ Conducting safely at ${(lst.voltageDrop || 2.2).toFixed(2)} V forward drop (${(lst.currentMa || 12).toFixed(1)} mA).`;
                } else if (lst?.reason === 'open_cathode') {
                    $('icInspectorTitle').textContent = `5mm LED (${comp.label || 'LED'} — OFF: OPEN GND)`;
                    $('icInspectorMeta').textContent = '⚠ Open Circuit: Anode (+) is energized, but Cathode (−) is NOT grounded! Connect Cathode (−) to GND (0V) or Battery (−).';
                } else if (lst?.reason === 'open_anode') {
                    $('icInspectorTitle').textContent = `5mm LED (${comp.label || 'LED'} — OFF: OPEN ANODE)`;
                    $('icInspectorMeta').textContent = '⚠ Open Circuit: Cathode (−) is grounded, but Anode (+) is floating.';
                } else if (lst?.reason === 'reverse_bias') {
                    $('icInspectorTitle').textContent = `5mm LED (${comp.label || 'LED'} — OFF: REVERSED)`;
                    $('icInspectorMeta').textContent = '⚠ Reverse Polarity: Cathode (−) is at higher voltage than Anode (+). The LED blocks reverse current.';
                } else if (lst?.reason === 'under_vf') {
                    $('icInspectorTitle').textContent = `5mm LED (${comp.label || 'LED'} — OFF: BELOW Vf)`;
                    $('icInspectorMeta').textContent = `Forward voltage (${(lst.voltageDrop || 0).toFixed(2)} V) is below this LED's threshold (~2.0–3.0 V). Increase battery cells or voltage.`;
                } else if (lst?.reason === 'no_diff_high') {
                    $('icInspectorTitle').textContent = `5mm LED (${comp.label || 'LED'} — OFF: 0V DROP)`;
                    $('icInspectorMeta').textContent = 'Both Anode (+) and Cathode (−) are at the same voltage. Current requires a potential difference.';
                } else {
                    $('icInspectorTitle').textContent = `5mm LED (${comp.label || 'LED'} — OFF)`;
                    $('icInspectorMeta').textContent = 'Lights up when Anode (+ long leg) exceeds Cathode (− flat edge) by ~2.0–3.0 V through a current-limiting resistor.';
                }
                $('icLampColorSelect').value = comp.color || 'emerald';
            } else if (comp.kind === 'gnd') {
                $('icInspectorTitle').textContent = 'Ground Terminal (0V)';
                $('icInspectorMeta').textContent = 'Provides a 0V ground return path for ICs, LEDs, Motors, and power supplies.';
            } else if (comp.kind === 'clock') {
                $('icInspectorTitle').textContent = '1 Hz Clock Pulse Generator';
                $('icInspectorMeta').textContent = 'Automatically oscillates between LOW (0V) and HIGH (+5V) every 0.5 seconds.';
                $('icToggleSelectedBtn').textContent = 'Step Clock Pulse (0 ↔ 1)';
            } else if (comp.kind === 'seg7_10') {
                const st = evalData.seg7TenStates?.get(comp.id);
                const litList = st ? Object.entries(st.segs).filter(([, v]) => v.lit).map(([k]) => k.toUpperCase()) : [];
                $('icInspectorTitle').textContent = `10-Pin 7-Segment Display (5161AS · ${litList.length}/8 Lit)`;
                $('icInspectorMeta').textContent = `Authentic 10-pin Common Cathode pinout (Top: g, f, COM, a, b · Bottom: e, d, COM, c, dp). Connect COM (Pin 3 or 8) to 0V and drive segments via 220Ω resistors. Active: ${litList.length ? litList.join(', ') : 'None'}.`;
                if (st?.overloaded) {
                    showFaultBanner('Segment connected directly to >3.6V without a 220Ω series resistor!', 'error');
                }
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
            const motors = currentDoc.components.filter(c => c.kind === 'motor');
            const faults = evalData.faults || [];
            const warnings = evalData.warnings || [];

            if (faults.length > 0) {
                badge.textContent = `🔥 ${faults.length} Fault${faults.length > 1 ? 's' : ''}!`;
                badge.style.color = '#ff5a52';
            } else if (evalData.anyReverse) {
                badge.textContent = '⚠ Reverse Polarity';
                badge.style.color = '#ff5a52';
            } else if (evalData.anyShort) {
                badge.textContent = '⚠ Power/GND Short';
                badge.style.color = '#ff5a52';
            } else if (warnings.length > 0) {
                badge.textContent = `⚠ ${warnings.length} Warning${warnings.length > 1 ? 's' : ''}`;
                badge.style.color = '#f6b944';
            } else if (ics.length > 0 && ics.every(c => evalData.icStates.get(c.id)?.powered)) {
                badge.textContent = '✓ All ICs Powered';
                badge.style.color = '#37e0a1';
            } else if (ics.length > 0) {
                badge.textContent = '⚡ Unpowered IC';
                badge.style.color = '#f6b944';
            } else {
                badge.textContent = '✓ Bench Ready';
                badge.style.color = '#3dd9ff';
            }

            // Show active component faults right at the top of the sidebar summary!
            for (const f of faults) {
                const row = document.createElement('div');
                row.className = 'ic-summary-item is-fault';
                row.innerHTML = `<span style="color:#fca5a5;"><strong>🔥 ${f.label || f.compId}</strong></span><strong style="color:#ff5a52;font-size:11px;">${f.message}</strong>`;
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    selected = { kind: 'comp', id: f.compId };
                    syncInspector();
                    scheduleRender();
                });
                wrap.appendChild(row);
            }

            if (!ics.length && !lamps.length && !motors.length && !faults.length) {
                const empty = document.createElement('div');
                empty.className = 'ic-summary-item';
                empty.innerHTML = '<span>Empty Workbench</span><small style="color:#8fa0b5;">Place a Breadboard, 2D Part, IC, or Preset above</small>';
                wrap.appendChild(empty);
                return;
            }

            for (const mot of motors) {
                const mst = evalData.motorStates?.get(mot.id);
                const row = document.createElement('div');
                row.className = 'ic-summary-item';
                const statusHtml = mst?.overloaded
                    ? `<strong style="color:#ff5a52;">🔥 OVER-V (${mst.voltage.toFixed(1)}V)</strong>`
                    : mst?.spinning
                    ? `<strong style="color:#38bdf8;">⚙ ${mst.rpm} RPM (${mst.direction})</strong>`
                    : '<strong style="color:#8fa0b5;">0 RPM (IDLE)</strong>';
                row.innerHTML = `<span><strong>${mot.label || 'DC Motor'}</strong> · <small style="color:#96a5ba;">Actuator</small></span>${statusHtml}`;
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    selected = { kind: 'comp', id: mot.id };
                    syncInspector();
                    scheduleRender();
                });
                wrap.appendChild(row);
            }

            for (const ic of ics) {
                const spec = IC_CATALOG[ic.model];
                const st = evalData.icStates.get(ic.id);
                const row = document.createElement('div');
                row.className = 'ic-summary-item';
                const statusText = st?.corrupted
                    ? `<strong style="color:#ff5a52;">🔥 ${st.reversePower ? 'Reverse Power' : `${st.supplyV?.toFixed(1)}V Fried`}</strong>`
                    : st?.overVoltageWarn
                    ? `<strong style="color:#f6b944;">⚠ ${st.supplyV?.toFixed(1)}V (>5.5V)</strong>`
                    : st?.powered
                    ? `<strong style="color:#37e0a1;">✓ ${st.msiSummary || `Powered (${(st.supplyV || 5).toFixed(1)}V)`}</strong>`
                    : `<strong style="color:#f6b944;">Unpowered (Pin ${spec.vccPin || 14}/${spec.gndPin || 7})</strong>`;
                const metaTag = spec.msi ? spec.gateType : `${spec.gateType} (${spec.fanIn}-in)`;
                row.innerHTML = `<span><strong>${ic.model}</strong> · <small style="color:#96a5ba;">${metaTag}</small></span>${statusText}`;
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    selected = { kind: 'comp', id: ic.id };
                    syncInspector();
                    scheduleRender();
                });
                wrap.appendChild(row);
            }

            for (const lamp of lamps) {
                const lst = evalData.lampStates.get(lamp.id);
                const row = document.createElement('div');
                row.className = 'ic-summary-item';
                const statusHtml = lst?.overloaded
                    ? `<strong style="color:#ff5a52;">🔥 POP (${lst.currentMa?.toFixed(0)}mA)</strong>`
                    : lst?.lit
                    ? `<strong style="color:#37e0a1;">✓ ON (${(lst.currentMa || 12).toFixed(1)}mA)</strong>`
                    : lst?.reason === 'open_cathode'
                    ? '<strong style="color:#f6b944;">⚠ Open Cathode</strong>'
                    : lst?.reason === 'reverse_bias'
                    ? '<strong style="color:#ff5a52;">⚠ Reversed</strong>'
                    : '<strong style="color:#8fa0b5;">OFF</strong>';
                row.innerHTML = `<span><strong>${lamp.label || 'LED'}</strong> · <small style="color:#96a5ba;">5mm LED</small></span>${statusHtml}`;
                row.style.cursor = 'pointer';
                row.addEventListener('click', () => {
                    selected = { kind: 'comp', id: lamp.id };
                    syncInspector();
                    scheduleRender();
                });
                wrap.appendChild(row);
            }
        }

        function syncFooter() {
            const ics = currentDoc.components.filter(c => c.kind === 'ic');
            const poweredCount = ics.filter(c => evalData.icStates.get(c.id)?.powered).length;
            const switches = currentDoc.components.filter(c => ['switch', 'dip4', 'pushbutton', 'spdt'].includes(c.kind));
            const lampsLit = currentDoc.components.filter(c => (c.kind === 'lamp' && evalData.lampStates.get(c.id)?.lit) || (c.kind === 'rgb_led' && evalData.rgbStates?.get(c.id)?.lit)).length;

            if ($('icStatChips')) $('icStatChips').textContent = String(ics.length);
            if ($('icStatPowered')) $('icStatPowered').textContent = `${poweredCount}/${ics.length}`;
            if ($('icStatSwitches')) $('icStatSwitches').textContent = String(switches.length);
            if ($('icStatLamps')) $('icStatLamps').textContent = String(lampsLit);
            if ($('icStatWires')) $('icStatWires').textContent = String(currentDoc.wires.length);
            if ($('icStatCurrent') && evalData.telemetry) {
                $('icStatCurrent').textContent = `${evalData.telemetry.iccMa.toFixed(1)} mA`;
            }
            if ($('icStatPower') && evalData.telemetry) {
                $('icStatPower').textContent = `${evalData.telemetry.powerMw.toFixed(0)} mW`;
            }
            if ($('icStatDelay') && evalData.telemetry) {
                $('icStatDelay').textContent = `${evalData.telemetry.propagationDelayNs} ns`;
            }

            const statusEl = $('icStatStatus');
            const faults = evalData.faults || [];
            const warnings = evalData.warnings || [];
            if (faults.length > 0) {
                statusEl.className = 'logic-status-err';
                statusEl.textContent = `🔥 Fault: ${faults[0].message}`;
            } else if (evalData.anyReverse) {
                statusEl.className = 'logic-status-err';
                statusEl.textContent = '⚠ Fault: VCC/GND Reverse Polarity';
            } else if (evalData.anyShort) {
                statusEl.className = 'logic-status-err';
                statusEl.textContent = '⚠ Fault: Power rail shorted to GND';
            } else if (warnings.length > 0) {
                statusEl.className = 'logic-status-warn';
                statusEl.textContent = `⚠ ${warnings[0].message}`;
            } else if (ics.length > 0 && poweredCount < ics.length) {
                statusEl.className = 'logic-status-warn';
                statusEl.textContent = '⚡ Connect VCC (4.0–5.5V) & GND (or enable Auto-Power)';
            } else {
                statusEl.className = 'logic-status-ok';
                statusEl.textContent = '✓ Bench Healthy';
            }
        }

        // Hit-testing helpers — strictly blocks breadboard holes covered by components or occupied by plugged legs!
        function findNearestPin(worldPt, maxDist = 14 / renderer.view.zoom) {
            // Build fast set of holes currently occupied by plugged-in component legs
            const occupiedHoles = new Set();
            if (evalData && evalData.pluggedPinMap) {
                for (const holeKey of evalData.pluggedPinMap.values()) {
                    occupiedHoles.add(holeKey);
                }
            }

            // Clamp world-space radii strictly below half of breadboard pitch (18px) so adjacent holes NEVER overlap!
            const pinMaxDist = Math.min(maxDist, 14);
            const bbMaxDist = Math.min(maxDist, (tool === 'wire' || wireStartPin) ? 12.5 : 10.5);

            // If cursor is directly over a non-breadboard component's body, NEVER grab a hidden breadboard hole underneath it!
            const cursorOverComp = isPointUnderComponent(currentDoc, worldPt);

            let bestNonBB = null;
            let bestNonBBDist = pinMaxDist;
            let bestBB = null;
            let bestBBDist = bbMaxDist;

            for (const p of evalData.pins.values()) {
                const d = Math.hypot(p.x - worldPt.x, p.y - worldPt.y);
                if (p.isBreadboardHole) {
                    if (cursorOverComp) continue;
                    if (d >= bestBBDist) continue;
                    if (occupiedHoles.has(p.key)) continue;
                    if (isPointUnderComponent(currentDoc, p)) continue;
                    bestBBDist = d;
                    bestBB = p;
                } else {
                    if (d >= bestNonBBDist) continue;
                    // Once a component pin is plugged into a breadboard socket, wire via the open holes of its strip!
                    // Prevents accidental wire grabs when trying to click/toggle/drag components on a breadboard.
                    if (evalData.pluggedPinMap && evalData.pluggedPinMap.has(p.key)) continue;
                    bestNonBBDist = d;
                    bestNonBB = p;
                }
            }
            return bestNonBB || bestBB;
        }

        function findHitComponent(worldPt) {
            // Check non-breadboard components FIRST so parts plugged into a breadboard are always selected/dragged cleanly!
            for (let i = currentDoc.components.length - 1; i >= 0; i--) {
                const c = currentDoc.components[i];
                if (c.kind === 'breadboard') continue;
                const b = getComponentBounds(c);
                if (worldPt.x >= b.x && worldPt.x <= b.x + b.w && worldPt.y >= b.y && worldPt.y <= b.y + b.h) {
                    return c;
                }
            }
            // Then check breadboards underneath
            for (let i = currentDoc.components.length - 1; i >= 0; i--) {
                const c = currentDoc.components[i];
                if (c.kind !== 'breadboard') continue;
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

        function findHitWire(worldPt, tol = 8 / renderer.view.zoom) {
            const wireGeom = computeICWireGeometry(currentDoc, evalData.pins, evalData.pinToNet);
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

        const isPlacementTool = t => Boolean(
            IC_CATALOG[t] || [
                'battery', 'battery9v', 'psu', 'breadboard', 'breadboard_mini',
                'switch', 'pushbutton', 'spdt', 'dip4', 'probe',
                'resistor', 'potentiometer', 'lamp', 'rgb_led',
                'motor', 'buzzer', 'npn', 'multimeter',
                'gnd', 'clock', 'seg7', 'seg7_10'
            ].includes(t)
        );

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
                if (snap) {
                    const bbSnap = snapCompToBreadboard(next, comp);
                    if (bbSnap) comp.position = { x: bbSnap.x, y: bbSnap.y };
                }
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
            const pinRadius = ((tool === 'wire' || wireStartPin)
                ? (e.pointerType === 'touch' ? 24 : 16)
                : (e.pointerType === 'touch' ? 16 : 11)) / renderer.view.zoom;
            const wireRadius = (e.pointerType === 'touch' ? 14 : 8) / renderer.view.zoom;
            const hitPin = findNearestPin(worldPt, pinRadius);
            if (hitPin) {
                if (wireStartPin && wireStartPin.key !== hitPin.key) {
                    const next = cloneICDoc(currentDoc);
                    if (connectICWire(next, wireStartPin.key, hitPin.key, [], { color: activeWireColor })) {
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
            const hitW = findHitWire(worldPt, wireRadius);
            if (wireStartPin && hitW) {
                const targetKey = hitW.wire.from !== wireStartPin.key ? hitW.wire.from : hitW.wire.to;
                if (targetKey && targetKey !== wireStartPin.key) {
                    const next = cloneICDoc(currentDoc);
                    const jPt = hitW.verticalSegment
                        ? { x: hitW.segA.x, y: Math.round(worldPt.y / GRID) * GRID }
                        : { x: Math.round(worldPt.x / GRID) * GRID, y: hitW.segA.y };
                    if (connectICWire(next, wireStartPin.key, targetKey, [jPt], { color: activeWireColor })) {
                        commitDoc(next);
                    }
                    wireStartPin = null;
                    recompute();
                    return;
                }
            }

            wireStartPin = null;

            // In Wire mode, clicking empty space or a blocked hole under a component cancels wire drawing
            // instead of accidentally dragging the breadboard or toggling switches underneath!
            if (tool === 'wire') {
                scheduleRender();
                return;
            }

            // Check component hit
            const hitComp = findHitComponent(worldPt);
            if (hitComp) {
                selected = { kind: 'comp', id: hitComp.id };

                // Momentary Push Button press-and-hold!
                if (hitComp.kind === 'pushbutton' && !hitComp.latched) {
                    hitComp.pressed = true;
                    activePushBtnId = hitComp.id;
                    recompute();
                }

                // If dragging a breadboard, capture plugged-in child components so they travel smoothly with it!
                let pluggedChildren = [];
                if (hitComp.kind === 'breadboard' && evalData.pluggedPinMap) {
                    const childIds = new Set();
                    for (const [compPinKey, bbHoleKey] of evalData.pluggedPinMap.entries()) {
                        if (bbHoleKey.startsWith(hitComp.id + ':')) {
                            const cid = compPinKey.split(':')[0];
                            if (cid && cid !== hitComp.id) childIds.add(cid);
                        }
                    }
                    pluggedChildren = [...childIds]
                        .map(cid => currentDoc.components.find(c => c.id === cid))
                        .filter(Boolean)
                        .map(c => ({ id: c.id, origPos: { ...c.position } }));
                }

                dragState = {
                    type: 'moveComp',
                    id: hitComp.id,
                    startClientX: e.clientX,
                    startClientY: e.clientY,
                    origPos: { ...hitComp.position },
                    pluggedChildren,
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
                const nextZoom = Math.max(0.22, Math.min(2.2, pinchState.zoom * (dist / pinchState.dist)));
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
                const nextWireId = hitW ? hitW.wire.id : null;
                const nextWireNet = hitW ? evalData.pinToNet.get(hitW.wire.from) : null;
                canvas.style.cursor = hp
                    ? 'crosshair'
                    : hitW
                    ? (hitW.verticalSegment ? 'ew-resize' : 'ns-resize')
                    : 'default';
                if (nextKey !== hoverPinKey || nextWireId !== hoverWireId) {
                    hoverPinKey = nextKey;
                    hoverWireId = nextWireId;
                    hoverWireNetId = nextWireNet !== undefined ? nextWireNet : null;
                    scheduleRender();
                } else if (wireStartPin || isPlacementTool(tool) || hoverWireId) {
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
                if (distPx > 4) {
                    dragState.moved = true;
                    if (activePushBtnId) {
                        const pb = currentDoc.components.find(c => c.id === activePushBtnId);
                        if (pb && !pb.latched) pb.pressed = false;
                        activePushBtnId = null;
                    }
                }
                if (!dragState.moved) return;

                const dx = (e.clientX - dragState.startClientX) / renderer.view.zoom;
                const dy = (e.clientY - dragState.startClientY) / renderer.view.zoom;
                const snap = $('icSnapToggle')?.checked && !e.shiftKey;
                const nextPos = snapICPoint({ x: dragState.origPos.x + dx, y: dragState.origPos.y + dy }, snap);
                const comp = currentDoc.components.find(c => c.id === dragState.id);
                if (comp) {
                    comp.position = nextPos;
                    dragState.snapHoles = null;
                    if (snap && comp.kind !== 'breadboard') {
                        const bbSnap = snapCompToBreadboard(currentDoc, comp);
                        if (bbSnap) {
                            comp.position = { x: bbSnap.x, y: bbSnap.y };
                            dragState.snapHoles = bbSnap.holes;
                        }
                    }
                    const deltaX = comp.position.x - dragState.origPos.x;
                    const deltaY = comp.position.y - dragState.origPos.y;
                    if (dragState.pluggedChildren && dragState.pluggedChildren.length) {
                        for (const ch of dragState.pluggedChildren) {
                            const childComp = currentDoc.components.find(c => c.id === ch.id);
                            if (childComp) {
                                childComp.position = {
                                    x: ch.origPos.x + deltaX,
                                    y: ch.origPos.y + deltaY
                                };
                            }
                        }
                    }
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

            if (activePushBtnId) {
                const pb = currentDoc.components.find(c => c.id === activePushBtnId);
                activePushBtnId = null;
                if (pb && !pb.latched && pb.pressed) {
                    pb.pressed = false;
                    recompute();
                }
            }

            if (!dragState) return;
            const action = dragState;
            dragState = null;
            const worldPt = renderer.world(e.clientX, e.clientY);

            if (action.type === 'wireDrag') {
                const pinRadius = (e.pointerType === 'touch' ? 24 : 16) / renderer.view.zoom;
                const wireRadius = (e.pointerType === 'touch' ? 14 : 8) / renderer.view.zoom;
                const endPin = findNearestPin(worldPt, pinRadius);
                if (endPin && endPin.key !== action.startPin.key) {
                    const next = cloneICDoc(currentDoc);
                    if (connectICWire(next, action.startPin.key, endPin.key, [], { color: activeWireColor })) {
                        commitDoc(next);
                        wireStartPin = null;
                        recompute();
                        return;
                    }
                }
                // Check if user dropped the wire onto an existing wire to create a T-junction branch!
                const hitW = findHitWire(worldPt, wireRadius);
                if (hitW) {
                    const targetKey = hitW.wire.from !== action.startPin.key ? hitW.wire.from : hitW.wire.to;
                    if (targetKey && targetKey !== action.startPin.key) {
                        const next = cloneICDoc(currentDoc);
                        const jPt = hitW.verticalSegment
                            ? { x: hitW.segA.x, y: Math.round(worldPt.y / GRID) * GRID }
                            : { x: Math.round(worldPt.x / GRID) * GRID, y: hitW.segA.y };
                        if (connectICWire(next, action.startPin.key, targetKey, [jPt], { color: activeWireColor })) {
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
                        const next = cloneICDoc(currentDoc);
                        const tc = next.components.find(c => c.id === action.id);
                        if (tc) { tc.closed = !tc.closed; commitDoc(next); }
                    } else if (comp && comp.kind === 'spdt') {
                        const next = cloneICDoc(currentDoc);
                        const tc = next.components.find(c => c.id === action.id);
                        if (tc) { tc.positionThrow = tc.positionThrow === 'right' ? 'left' : 'right'; commitDoc(next); }
                    } else if (comp && comp.kind === 'pushbutton' && comp.latched) {
                        const next = cloneICDoc(currentDoc);
                        const tc = next.components.find(c => c.id === action.id);
                        if (tc) { tc.pressed = !tc.pressed; commitDoc(next); }
                    } else if (comp && comp.kind === 'multimeter') {
                        const next = cloneICDoc(currentDoc);
                        const tc = next.components.find(c => c.id === action.id);
                        if (tc) {
                            const modes = ['V', 'mA', 'ohm'];
                            tc.mode = modes[(modes.indexOf(tc.mode || 'V') + 1) % modes.length];
                            commitDoc(next);
                        }
                    } else if (comp && comp.kind === 'psu') {
                        // Direct on-bench clicks on the PSU front panel:
                        //   • OUTPUT ON / STANDBY switch (x=136..364, y=-3..+59)
                        //   • M1 (3.3V), M2 (5.0V), M3 (9.0V), M4 (12.0V) preset memory keys (y=-54..-18)
                        const dx = worldPt.x - comp.position.x;
                        const dy = worldPt.y - comp.position.y;
                        const rot = ((comp.rotation || 0) % 360 + 360) % 360;
                        const rad = (-rot * Math.PI) / 180;
                        const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
                        const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
                        if (lx >= 136 && lx <= 364 && ly >= -3 && ly <= 59) {
                            const next = cloneICDoc(currentDoc);
                            const tc = next.components.find(c => c.id === action.id);
                            if (tc) { tc.enabled = !(tc.enabled !== false); commitDoc(next); }
                        } else if (ly >= -54 && ly <= -18) {
                            const memKeys = [[151, 3.3], [217, 5.0], [283, 9.0], [349, 12.0]];
                            for (const [mx, mv] of memKeys) {
                                if (Math.abs(lx - mx) <= 29) {
                                    const next = cloneICDoc(currentDoc);
                                    const tc = next.components.find(c => c.id === action.id);
                                    if (tc) { tc.voltage = mv; tc.enabled = true; commitDoc(next); }
                                    break;
                                }
                            }
                        }
                    } else if (comp && comp.kind === 'clock') {
                        const next = cloneICDoc(currentDoc);
                        const tc = next.components.find(c => c.id === action.id);
                        if (tc) { tc.value = tc.value ? 0 : 1; commitDoc(next); }
                    } else if (comp && comp.kind === 'dip4') {
                        const next = cloneICDoc(currentDoc);
                        const tc = next.components.find(c => c.id === action.id);
                        if (tc) {
                            if (!Array.isArray(tc.bits) || tc.bits.length !== 4) tc.bits = [0, 0, 0, 0];
                            const dx = worldPt.x - comp.position.x;
                            const dy = worldPt.y - comp.position.y;
                            const rot = ((comp.rotation || 0) % 360 + 360) % 360;
                            const rad = (-rot * Math.PI) / 180;
                            const localY = dx * Math.sin(rad) + dy * Math.cos(rad);
                            const idx = localY < -36 ? 0 : localY < 0 ? 1 : localY < 36 ? 2 : 3;
                            tc.bits[idx] = tc.bits[idx] ? 0 : 1;
                            commitDoc(next);
                        }
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
                hoverWireId = null;
                hoverWireNetId = null;
                scheduleRender();
            }
        });
        canvas.addEventListener('contextmenu', e => e.preventDefault());

        canvas.addEventListener('wheel', e => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
            const nextZoom = Math.max(0.22, Math.min(2.2, renderer.view.zoom * factor));
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

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault();
                $('icSaveJsonBtn')?.click();
                return;
            }
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
                    autoConnectDroppedComponent(next, comp.id);
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
                autoConnectDroppedComponent(next, comp.id);
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

        renderer.onResize = () => {
            renderPaletteThumbnails();
            scheduleRender();
        };
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
        BENCH_2D_PRESETS,
        WIRE_PALETTE,
        blankICDoc,
        cloneICDoc,
        createICComponent,
        getComponentPins,
        getComponentBounds,
        getComponentOcclusionLocalRect,
        isPointUnderComponent,
        isBreadboardHoleAccessible,
        snapCompToBreadboard,
        connectICWire,
        tidyAllWires,
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

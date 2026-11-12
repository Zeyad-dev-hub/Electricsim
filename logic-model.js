(function (root) {
    'use strict';
    const L = root.LogicLab || (root.LogicLab = {});

    const GRID = 24;
    const INPUT_NAMES = ['A', 'B', 'C', 'D', 'E', 'I', 'J', 'K', 'L', 'M', 'N', 'P'];
    const OUTPUT_NAMES = ['F', 'G', 'H', 'Y', 'Z', 'W', 'U', 'V'];
    const GATE_TYPES = [
        'AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 'BUF',
        'HA', 'FA', 'MUX2', 'MUX4', 'ENC42', 'DEC24', 'COMP2', 'SR_LATCH', 'D_LATCH'
    ];
    const BLOCK_TYPES = new Set(['HA', 'FA', 'MUX2', 'MUX4', 'ENC42', 'DEC24', 'COMP2', 'SR_LATCH', 'D_LATCH']);
    const SINGLE_INPUT_GATES = new Set(['NOT', 'BUF']);
    const INVERTING_GATES = new Set(['NOT', 'NAND', 'NOR', 'XNOR']);

    const BLOCK_SPECS = {
        HA: {
            type: 'HA',
            label: 'HA',
            subLabel: 'Half Adder',
            category: 'arithmetic',
            accent: '#38bdf8',
            w: 108,
            h: 80,
            inputs: [
                { pin: 'in0', label: 'A', y: -18 },
                { pin: 'in1', label: 'B', y: 18 }
            ],
            outputs: [
                { pin: 'out', label: 'S', y: -18 },
                { pin: 'out1', label: 'C', y: 18 }
            ]
        },
        FA: {
            type: 'FA',
            label: 'FA',
            subLabel: 'Full Adder',
            category: 'arithmetic',
            accent: '#0ea5e9',
            w: 112,
            h: 96,
            inputs: [
                { pin: 'in0', label: 'A', y: -24 },
                { pin: 'in1', label: 'B', y: 0 },
                { pin: 'in2', label: 'Cin', y: 24 }
            ],
            outputs: [
                { pin: 'out', label: 'S', y: -18 },
                { pin: 'out1', label: 'Cout', y: 18 }
            ]
        },
        MUX2: {
            type: 'MUX2',
            label: 'MUX 2:1',
            subLabel: 'Data Selector',
            category: 'plexer',
            accent: '#a855f7',
            w: 112,
            h: 96,
            inputs: [
                { pin: 'in0', label: 'D0', y: -24 },
                { pin: 'in1', label: 'D1', y: 0 },
                { pin: 'in2', label: 'S', y: 24 }
            ],
            outputs: [
                { pin: 'out', label: 'Y', y: 0 }
            ]
        },
        MUX4: {
            type: 'MUX4',
            label: 'MUX 4:1',
            subLabel: '4-Ch Selector',
            category: 'plexer',
            accent: '#9333ea',
            w: 118,
            h: 148,
            inputs: [
                { pin: 'in0', label: 'D0', y: -50 },
                { pin: 'in1', label: 'D1', y: -30 },
                { pin: 'in2', label: 'D2', y: -10 },
                { pin: 'in3', label: 'D3', y: 10 },
                { pin: 'in4', label: 'S1', y: 32 },
                { pin: 'in5', label: 'S0', y: 52 }
            ],
            outputs: [
                { pin: 'out', label: 'Y', y: 0 }
            ]
        },
        ENC42: {
            type: 'ENC42',
            label: 'ENC 4:2',
            subLabel: 'Priority Enc',
            category: 'plexer',
            accent: '#ec4899',
            w: 118,
            h: 116,
            inputs: [
                { pin: 'in0', label: 'D0', y: -36 },
                { pin: 'in1', label: 'D1', y: -12 },
                { pin: 'in2', label: 'D2', y: 12 },
                { pin: 'in3', label: 'D3', y: 36 }
            ],
            outputs: [
                { pin: 'out', label: 'Y1', y: -24 },
                { pin: 'out1', label: 'Y0', y: 0 },
                { pin: 'out2', label: 'V', y: 24 }
            ]
        },
        DEC24: {
            type: 'DEC24',
            label: 'DEC 2:4',
            subLabel: '2:4 Decoder',
            category: 'plexer',
            accent: '#6366f1',
            w: 118,
            h: 116,
            inputs: [
                { pin: 'in0', label: 'A1', y: -18 },
                { pin: 'in1', label: 'A0', y: 18 }
            ],
            outputs: [
                { pin: 'out', label: 'Y0', y: -36 },
                { pin: 'out1', label: 'Y1', y: -12 },
                { pin: 'out2', label: 'Y2', y: 12 },
                { pin: 'out3', label: 'Y3', y: 36 }
            ]
        },
        COMP2: {
            type: 'COMP2',
            label: 'COMP',
            subLabel: 'Magnitude',
            category: 'arithmetic',
            accent: '#14b8a6',
            w: 114,
            h: 96,
            inputs: [
                { pin: 'in0', label: 'A', y: -18 },
                { pin: 'in1', label: 'B', y: 18 }
            ],
            outputs: [
                { pin: 'out', label: 'A>B', y: -24 },
                { pin: 'out1', label: 'A=B', y: 0 },
                { pin: 'out2', label: 'A<B', y: 24 }
            ]
        },
        SR_LATCH: {
            type: 'SR_LATCH',
            label: 'SR Latch',
            subLabel: 'Bistable NOR',
            category: 'sequential',
            accent: '#f59e0b',
            w: 114,
            h: 88,
            stateful: true,
            inputs: [
                { pin: 'in0', label: 'S', y: -18 },
                { pin: 'in1', label: 'R', y: 18 }
            ],
            outputs: [
                { pin: 'out', label: 'Q', y: -18 },
                { pin: 'out1', label: "Q'", y: 18 }
            ]
        },
        D_LATCH: {
            type: 'D_LATCH',
            label: 'D Latch',
            subLabel: 'Gated Memory',
            category: 'sequential',
            accent: '#10b981',
            w: 114,
            h: 88,
            stateful: true,
            inputs: [
                { pin: 'in0', label: 'D', y: -18 },
                { pin: 'in1', label: 'EN', y: 18 }
            ],
            outputs: [
                { pin: 'out', label: 'Q', y: -18 },
                { pin: 'out1', label: "Q'", y: 18 }
            ]
        }
    };

    const CMOS_TRANSISTORS = {
        NOT: () => 2,
        BUF: () => 4,
        NAND: n => 2 * n,
        NOR: n => 2 * n,
        AND: n => 2 * n + 2,
        OR: n => 2 * n + 2,
        XOR: n => 8 * Math.max(1, n - 1),
        XNOR: n => 8 * Math.max(1, n - 1),
        HA: () => 16,
        FA: () => 28,
        MUX2: () => 14,
        MUX4: () => 36,
        ENC42: () => 22,
        DEC24: () => 20,
        COMP2: () => 18,
        SR_LATCH: () => 8,
        D_LATCH: () => 18
    };

    let serial = 0;
    const uid = prefix => `${prefix}-${Date.now().toString(36)}-${++serial}`;
    const clone = value => JSON.parse(JSON.stringify(value));
    const snapValue = v => Math.round(v / GRID) * GRID;
    const snapPoint = (p, enabled = true) => enabled
        ? { x: snapValue(p.x), y: snapValue(p.y) }
        : { x: Math.round(p.x), y: Math.round(p.y) };

    function blank() {
        return {
            schemaVersion: 1,
            inputs: [],
            outputs: [],
            gates: [],
            consts: [],
            wires: [],
            view: { panX: 0, panY: 0, zoom: 1 }
        };
    }

    function nextInputName(doc) {
        const used = new Set((doc?.inputs || []).map(i => i.name));
        return INPUT_NAMES.find(n => !used.has(n)) || null;
    }

    function nextOutputName(doc) {
        const used = new Set((doc?.outputs || []).map(o => o.name));
        return OUTPUT_NAMES.find(n => !used.has(n)) || null;
    }

    function createInput(doc, x, y, preferredName = null, value = 0) {
        const used = new Set((doc?.inputs || []).map(i => i.name));
        if (used.size >= INPUT_NAMES.length) return null;
        const name = (preferredName && INPUT_NAMES.includes(preferredName) && !used.has(preferredName))
            ? preferredName
            : nextInputName(doc);
        if (!name) return null;
        return {
            id: uid('in'),
            name,
            value: value ? 1 : 0,
            position: { x, y }
        };
    }

    function createOutput(doc, x, y, preferredName = null) {
        const used = new Set((doc?.outputs || []).map(o => o.name));
        if (used.size >= OUTPUT_NAMES.length) return null;
        const name = (preferredName && OUTPUT_NAMES.includes(preferredName) && !used.has(preferredName))
            ? preferredName
            : nextOutputName(doc);
        if (!name) return null;
        return {
            id: uid('out'),
            name,
            position: { x, y }
        };
    }

    function normalizeFanIn(type, fanIn = 2) {
        if (BLOCK_SPECS[type]) return BLOCK_SPECS[type].inputs.length;
        if (SINGLE_INPUT_GATES.has(type)) return 1;
        const n = Math.round(Number(fanIn) || 2);
        return Math.max(2, Math.min(4, n));
    }

    function createGate(type, x, y, fanIn = 2, label = null) {
        const upper = String(type || 'AND').toUpperCase();
        if (!GATE_TYPES.includes(upper)) throw new Error(`Unknown gate type: ${type}`);
        const id = uid('gate');
        const spec = BLOCK_SPECS[upper];
        const gate = {
            id,
            type: upper,
            label: label || `${upper}-${serial}`,
            fanIn: normalizeFanIn(upper, fanIn),
            position: { x, y },
            rotation: 0
        };
        if (spec && spec.stateful) {
            gate.state = { q: 0, qBar: 1, invalid: false };
        }
        return gate;
    }

    function createConst(value, x, y) {
        return {
            id: uid('const'),
            value: value ? 1 : 0,
            position: { x, y }
        };
    }

    function pinKey(nodeId, pin) {
        return `${nodeId}:${pin}`;
    }

    function gatePinOffsets(fanIn) {
        if (fanIn === 1) return [0];
        if (fanIn === 2) return [-16, 16];
        if (fanIn === 3) return [-24, 0, 24];
        if (fanIn === 4) return [-24, -8, 8, 24];
        const step = 18;
        const start = -((fanIn - 1) * step) / 2;
        return Array.from({ length: fanIn }, (_, i) => Math.round(start + i * step));
    }

    function rotateOffset(lx, ly, rotation = 0) {
        const rad = ((rotation || 0) * Math.PI) / 180;
        const c = Math.round(Math.cos(rad));
        const s = Math.round(Math.sin(rad));
        return {
            x: lx * c - ly * s,
            y: lx * s + ly * c,
            dx: c,
            dy: s
        };
    }

    function nodePins(node, kind) {
        const { x, y } = node.position;
        if (kind === 'input' || kind === 'const') {
            return [{
                key: pinKey(node.id, 'out'),
                nodeId: node.id,
                nodeKind: kind,
                pin: 'out',
                role: 'out',
                index: 0,
                x: x + 36,
                y,
                dir: { dx: 1, dy: 0 }
            }];
        }
        if (kind === 'output') {
            return [{
                key: pinKey(node.id, 'in0'),
                nodeId: node.id,
                nodeKind: 'output',
                pin: 'in0',
                role: 'in',
                index: 0,
                x: x - 36,
                y,
                dir: { dx: -1, dy: 0 }
            }];
        }
        if (kind === 'gate') {
            const rot = node.rotation || 0;
            const spec = BLOCK_SPECS[node.type];
            if (spec) {
                const halfW = spec.w / 2;
                const pins = [];
                spec.inputs.forEach((inp, idx) => {
                    const r = rotateOffset(-halfW, inp.y, rot);
                    pins.push({
                        key: pinKey(node.id, inp.pin),
                        nodeId: node.id,
                        nodeKind: 'gate',
                        pin: inp.pin,
                        label: inp.label,
                        role: 'in',
                        index: idx,
                        x: x + r.x,
                        y: y + r.y,
                        dir: { dx: -r.dx, dy: -r.dy }
                    });
                });
                spec.outputs.forEach((outp, idx) => {
                    const outR = rotateOffset(halfW, outp.y, rot);
                    pins.push({
                        key: pinKey(node.id, outp.pin),
                        nodeId: node.id,
                        nodeKind: 'gate',
                        pin: outp.pin,
                        label: outp.label,
                        role: 'out',
                        index: idx,
                        x: x + outR.x,
                        y: y + outR.y,
                        dir: { dx: outR.dx, dy: outR.dy }
                    });
                });
                return pins;
            }

            const fanIn = normalizeFanIn(node.type, node.fanIn);
            const ys = gatePinOffsets(fanIn);
            const pins = ys.map((ly, idx) => {
                const r = rotateOffset(-48, ly, rot);
                return {
                    key: pinKey(node.id, `in${idx}`),
                    nodeId: node.id,
                    nodeKind: 'gate',
                    pin: `in${idx}`,
                    role: 'in',
                    index: idx,
                    x: x + r.x,
                    y: y + r.y,
                    dir: { dx: -r.dx, dy: -r.dy }
                };
            });
            const outR = rotateOffset(48, 0, rot);
            pins.push({
                key: pinKey(node.id, 'out'),
                nodeId: node.id,
                nodeKind: 'gate',
                pin: 'out',
                role: 'out',
                index: 0,
                x: x + outR.x,
                y: y + outR.y,
                dir: { dx: outR.dx, dy: outR.dy }
            });
            return pins;
        }
        return [];
    }

    function allPins(doc) {
        const map = new Map();
        for (const n of doc.inputs) for (const p of nodePins(n, 'input')) map.set(p.key, p);
        for (const n of doc.consts) for (const p of nodePins(n, 'const')) map.set(p.key, p);
        for (const n of doc.gates) for (const p of nodePins(n, 'gate')) map.set(p.key, p);
        for (const n of doc.outputs) for (const p of nodePins(n, 'output')) map.set(p.key, p);
        return map;
    }

    function nodeBounds(node, kind) {
        const { x, y } = node.position;
        if (kind === 'input' || kind === 'const') {
            return { left: x - 34, right: x + 24, top: y - 18, bottom: y + 18 };
        }
        if (kind === 'output') {
            return { left: x - 24, right: x + 34, top: y - 18, bottom: y + 18 };
        }
        const vertical = Math.abs(Math.sin(((node.rotation || 0) * Math.PI) / 180)) > 0.5;
        const spec = BLOCK_SPECS[node.type];
        if (spec) {
            const hw = (vertical ? spec.h : spec.w) / 2 - 8;
            const hh = (vertical ? spec.w : spec.h) / 2 - 4;
            return { left: x - hw, right: x + hw, top: y - hh, bottom: y + hh };
        }
        const hw = vertical ? 26 : 30;
        const hh = vertical ? 30 : 26;
        return { left: x - hw, right: x + hw, top: y - hh, bottom: y + hh };
    }

    function isPlacementTool(tool) {
        return tool === 'input' || tool === 'output' || tool === 'const1' || tool === 'const0' || GATE_TYPES.includes(tool);
    }

    function findNode(doc, nodeId) {
        for (const n of doc.inputs) if (n.id === nodeId) return { kind: 'input', node: n };
        for (const n of doc.outputs) if (n.id === nodeId) return { kind: 'output', node: n };
        for (const n of doc.gates) if (n.id === nodeId) return { kind: 'gate', node: n };
        for (const n of doc.consts) if (n.id === nodeId) return { kind: 'const', node: n };
        return null;
    }

    function connectWire(doc, endA, endB, waypoints = []) {
        const pins = allPins(doc);
        const keyA = typeof endA === 'string' ? endA : pinKey(endA.nodeId, endA.pin);
        const keyB = typeof endB === 'string' ? endB : pinKey(endB.nodeId, endB.pin);
        const pinA = pins.get(keyA);
        const pinB = pins.get(keyB);
        if (!pinA || !pinB) return null;
        if (pinA.role === pinB.role) return null;
        const fromPin = pinA.role === 'out' ? pinA : pinB;
        const toPin = pinA.role === 'in' ? pinA : pinB;

        // Single-driver rule: each input pin accepts at most one incoming wire.
        doc.wires = doc.wires.filter(w => !(w.to.nodeId === toPin.nodeId && w.to.pin === toPin.pin));
        const wire = {
            id: uid('wire'),
            from: { nodeId: fromPin.nodeId, pin: fromPin.pin },
            to: { nodeId: toPin.nodeId, pin: toPin.pin },
            waypoints: clone(waypoints || [])
        };
        doc.wires.push(wire);
        return wire;
    }

    function removeNode(doc, nodeId) {
        doc.inputs = doc.inputs.filter(n => n.id !== nodeId);
        doc.outputs = doc.outputs.filter(n => n.id !== nodeId);
        doc.gates = doc.gates.filter(n => n.id !== nodeId);
        doc.consts = doc.consts.filter(n => n.id !== nodeId);
        doc.wires = doc.wires.filter(w => w.from.nodeId !== nodeId && w.to.nodeId !== nodeId);
    }

    function removeWire(doc, wireId) {
        doc.wires = doc.wires.filter(w => w.id !== wireId);
    }

    function setGateFanIn(doc, gateId, fanIn) {
        const gate = doc.gates.find(g => g.id === gateId);
        if (!gate || BLOCK_SPECS[gate.type]) return false;
        const next = normalizeFanIn(gate.type, fanIn);
        if (next === gate.fanIn) return false;
        gate.fanIn = next;
        doc.wires = doc.wires.filter(w => {
            if (w.to.nodeId !== gateId) return true;
            const idx = Number(String(w.to.pin).replace('in', ''));
            return Number.isInteger(idx) && idx < next;
        });
        return true;
    }

    function setGateType(doc, gateId, type) {
        const gate = doc.gates.find(g => g.id === gateId);
        const upper = String(type || '').toUpperCase();
        if (!gate || !GATE_TYPES.includes(upper)) return false;
        gate.type = upper;
        const spec = BLOCK_SPECS[upper];
        if (spec && spec.stateful && !gate.state) {
            gate.state = { q: 0, qBar: 1, invalid: false };
        }
        const nextFanIn = normalizeFanIn(upper, gate.fanIn);
        gate.fanIn = nextFanIn;
        const validOutPins = new Set(spec ? spec.outputs.map(o => o.pin) : ['out']);
        doc.wires = doc.wires.filter(w => {
            if (w.from.nodeId === gateId && !validOutPins.has(w.from.pin)) return false;
            if (w.to.nodeId !== gateId) return true;
            const idx = Number(String(w.to.pin).replace('in', ''));
            return Number.isInteger(idx) && idx < nextFanIn;
        });
        return true;
    }

    function validateDocument(doc) {
        const errors = [];
        if (!doc || doc.schemaVersion !== 1) return ['Invalid logic document schemaVersion.'];
        if (!Array.isArray(doc.inputs) || !Array.isArray(doc.outputs) || !Array.isArray(doc.gates) || !Array.isArray(doc.consts) || !Array.isArray(doc.wires)) {
            return ['Document collections must be arrays.'];
        }
        if (doc.inputs.length > INPUT_NAMES.length) errors.push(`Maximum of ${INPUT_NAMES.length} inputs exceeded.`);
        if (doc.outputs.length > OUTPUT_NAMES.length) errors.push(`Maximum of ${OUTPUT_NAMES.length} outputs exceeded.`);

        const ids = new Set();
        const checkId = id => {
            if (!id || typeof id !== 'string' || ids.has(id)) errors.push(`Duplicate or invalid id: ${id}`);
            ids.add(id);
        };
        const inNames = new Set();
        for (const inp of doc.inputs) {
            checkId(inp.id);
            if (!INPUT_NAMES.includes(inp.name) || inNames.has(inp.name)) errors.push(`Invalid or duplicate input name: ${inp.name}`);
            inNames.add(inp.name);
        }
        const outNames = new Set();
        for (const out of doc.outputs) {
            checkId(out.id);
            if (!OUTPUT_NAMES.includes(out.name) || outNames.has(out.name)) errors.push(`Invalid or duplicate output name: ${out.name}`);
            outNames.add(out.name);
        }
        for (const g of doc.gates) {
            checkId(g.id);
            if (!GATE_TYPES.includes(g.type)) errors.push(`Invalid gate type: ${g.type}`);
            const spec = BLOCK_SPECS[g.type];
            if (spec) {
                if (g.fanIn !== spec.inputs.length) errors.push(`${g.type} must have fanIn ${spec.inputs.length}.`);
            } else if (SINGLE_INPUT_GATES.has(g.type)) {
                if (g.fanIn !== 1) errors.push(`${g.type} must have fanIn 1.`);
            } else if (g.fanIn < 2 || g.fanIn > 4) {
                errors.push(`${g.type} fanIn must be 2..4.`);
            }
        }
        for (const c of doc.consts) checkId(c.id);

        const pins = allPins(doc);
        const occupiedInputs = new Set();
        for (const w of doc.wires) {
            checkId(w.id);
            const fk = pinKey(w.from?.nodeId, w.from?.pin);
            const tk = pinKey(w.to?.nodeId, w.to?.pin);
            const fp = pins.get(fk);
            const tp = pins.get(tk);
            if (!fp || fp.role !== 'out') errors.push(`Wire ${w.id} has invalid source pin ${fk}.`);
            if (!tp || tp.role !== 'in') errors.push(`Wire ${w.id} has invalid target pin ${tk}.`);
            if (occupiedInputs.has(tk)) errors.push(`Multiple wires connected to input pin ${tk}.`);
            occupiedInputs.add(tk);
        }
        return errors;
    }

    class History {
        constructor(initial = blank()) {
            this.current = clone(initial);
            this.undoStack = [];
            this.redoStack = [];
        }
        get doc() {
            return this.current;
        }
        commit(next) {
            const serialized = JSON.stringify(next);
            if (serialized === JSON.stringify(this.current)) return false;
            this.undoStack.push(clone(this.current));
            if (this.undoStack.length > 100) this.undoStack.shift();
            this.current = clone(next);
            this.redoStack.length = 0;
            return true;
        }
        replaceSilent(next) {
            this.current = clone(next);
        }
        undo() {
            if (!this.undoStack.length) return null;
            this.redoStack.push(clone(this.current));
            this.current = this.undoStack.pop();
            return this.current;
        }
        redo() {
            if (!this.redoStack.length) return null;
            this.undoStack.push(clone(this.current));
            this.current = this.redoStack.pop();
            return this.current;
        }
    }

    Object.assign(L, {
        GRID,
        INPUT_NAMES,
        OUTPUT_NAMES,
        GATE_TYPES,
        BLOCK_TYPES,
        BLOCK_SPECS,
        SINGLE_INPUT_GATES,
        INVERTING_GATES,
        CMOS_TRANSISTORS,
        uid,
        clone,
        snapValue,
        snapPoint,
        blank,
        nextInputName,
        nextOutputName,
        createInput,
        createOutput,
        normalizeFanIn,
        createGate,
        createConst,
        pinKey,
        gatePinOffsets,
        nodePins,
        allPins,
        nodeBounds,
        isPlacementTool,
        findNode,
        connectWire,
        removeNode,
        removeWire,
        setGateFanIn,
        setGateType,
        validateDocument,
        History
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = L;
    }
})(typeof window !== 'undefined' ? window : globalThis);

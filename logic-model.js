(function (root) {
    'use strict';
    const L = root.LogicLab || (root.LogicLab = {});

    const GRID = 24;
    const INPUT_NAMES = ['A', 'B', 'C', 'D'];
    const OUTPUT_NAMES = ['F', 'G', 'H', 'Y'];
    const GATE_TYPES = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR', 'BUF'];
    const SINGLE_INPUT_GATES = new Set(['NOT', 'BUF']);
    const INVERTING_GATES = new Set(['NOT', 'NAND', 'NOR', 'XNOR']);
    const CMOS_TRANSISTORS = {
        NOT: () => 2,
        BUF: () => 4,
        NAND: n => 2 * n,
        NOR: n => 2 * n,
        AND: n => 2 * n + 2,
        OR: n => 2 * n + 2,
        XOR: n => 8 * Math.max(1, n - 1),
        XNOR: n => 8 * Math.max(1, n - 1)
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
        if (SINGLE_INPUT_GATES.has(type)) return 1;
        const n = Math.round(Number(fanIn) || 2);
        return Math.max(2, Math.min(4, n));
    }

    function createGate(type, x, y, fanIn = 2, label = null) {
        const upper = String(type || 'AND').toUpperCase();
        if (!GATE_TYPES.includes(upper)) throw new Error(`Unknown gate type: ${type}`);
        const id = uid('gate');
        return {
            id,
            type: upper,
            label: label || `${upper}-${serial}`,
            fanIn: normalizeFanIn(upper, fanIn),
            position: { x, y },
            rotation: 0
        };
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
        return [-24, -8, 8, 24];
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
            const fanIn = normalizeFanIn(node.type, node.fanIn);
            const ys = gatePinOffsets(fanIn);
            const rot = node.rotation || 0;
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
        if (!gate) return false;
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
        const nextFanIn = normalizeFanIn(upper, gate.fanIn);
        gate.fanIn = nextFanIn;
        doc.wires = doc.wires.filter(w => {
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
        if (doc.inputs.length > 4) errors.push('Maximum of 4 inputs (A-D) exceeded.');
        if (doc.outputs.length > 4) errors.push('Maximum of 4 outputs (F-Y) exceeded.');

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
            if (SINGLE_INPUT_GATES.has(g.type) && g.fanIn !== 1) errors.push(`${g.type} must have fanIn 1.`);
            if (!SINGLE_INPUT_GATES.has(g.type) && (g.fanIn < 2 || g.fanIn > 4)) errors.push(`${g.type} fanIn must be 2..4.`);
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

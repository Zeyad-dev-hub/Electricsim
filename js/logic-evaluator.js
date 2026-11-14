(function (root) {
    'use strict';
    const L = typeof module !== 'undefined' && module.exports
        ? require('./logic-model.js')
        : (root.LogicLab || (root.LogicLab = {}));

    const FULL_MASK = 0xFFFF;
    const VAR_MASKS = {
        A: 0xFF00,
        B: 0xF0F0,
        C: 0xCCCC,
        D: 0xAAAA
    };
    const VAR_SHIFTS = { A: 3, B: 2, C: 1, D: 0 };
    const POS_MASKS = [0xFF00, 0xF0F0, 0xCCCC, 0xAAAA];
    const POS_SHIFTS = [3, 2, 1, 0];

    function getInputShiftMap(doc) {
        const sortedInputs = [...(doc?.inputs || [])].sort(
            (a, b) => L.INPUT_NAMES.indexOf(a.name) - L.INPUT_NAMES.indexOf(b.name)
        );
        const allInABCD = sortedInputs.length <= 4 && sortedInputs.every(inp => inp.name in VAR_SHIFTS);
        const shiftById = new Map();
        const maskById = new Map();
        const shiftByName = new Map();
        sortedInputs.forEach((inp, idx) => {
            if (allInABCD) {
                const sh = VAR_SHIFTS[inp.name];
                shiftById.set(inp.id, sh);
                shiftByName.set(inp.name, sh);
                maskById.set(inp.id, VAR_MASKS[inp.name]);
            } else if (idx < 4) {
                const sh = POS_SHIFTS[idx];
                shiftById.set(inp.id, sh);
                shiftByName.set(inp.name, sh);
                maskById.set(inp.id, POS_MASKS[idx]);
            } else {
                shiftById.set(inp.id, null);
                shiftByName.set(inp.name, null);
                maskById.set(inp.id, inp.value ? FULL_MASK : 0);
            }
        });
        return { sortedInputs, allInABCD, shiftById, shiftByName, maskById };
    }

    function evalGateMask(type, masks) {
        switch (type) {
            case 'NOT':
                return (~masks[0]) & FULL_MASK;
            case 'BUF':
                return masks[0] & FULL_MASK;
            case 'AND':
                return masks.reduce((acc, m) => acc & m, FULL_MASK) & FULL_MASK;
            case 'NAND':
                return (~masks.reduce((acc, m) => acc & m, FULL_MASK)) & FULL_MASK;
            case 'OR':
                return masks.reduce((acc, m) => acc | m, 0) & FULL_MASK;
            case 'NOR':
                return (~masks.reduce((acc, m) => acc | m, 0)) & FULL_MASK;
            case 'XOR':
                return masks.reduce((acc, m) => acc ^ m, 0) & FULL_MASK;
            case 'XNOR':
                return (~masks.reduce((acc, m) => acc ^ m, 0)) & FULL_MASK;
            default:
                return 0;
        }
    }

    function evalGateLive(type, lives) {
        const b = lives.map(v => (v ? 1 : 0));
        switch (type) {
            case 'NOT':
                return b[0] ? 0 : 1;
            case 'BUF':
                return b[0] ? 1 : 0;
            case 'AND':
                return b.every(v => v === 1) ? 1 : 0;
            case 'NAND':
                return b.every(v => v === 1) ? 0 : 1;
            case 'OR':
                return b.some(v => v === 1) ? 1 : 0;
            case 'NOR':
                return b.some(v => v === 1) ? 0 : 1;
            case 'XOR':
                return b.reduce((acc, v) => acc ^ v, 0);
            case 'XNOR':
                return b.reduce((acc, v) => acc ^ v, 0) ? 0 : 1;
            default:
                return 0;
        }
    }

    function evalBlockOutputs(type, inMasks, inLives, gateObj, updateState = true) {
        const M = i => (inMasks[i] ?? 0) & FULL_MASK;
        const V = i => (inLives[i] ? 1 : 0);
        const pinMasks = {};
        const pinLives = {};

        switch (type) {
            case 'HA': {
                const A = M(0), B = M(1);
                const a = V(0), b = V(1);
                pinMasks.out = (A ^ B) & FULL_MASK;
                pinMasks.out1 = (A & B) & FULL_MASK;
                pinLives.out = a ^ b;
                pinLives.out1 = a & b;
                break;
            }
            case 'FA': {
                const A = M(0), B = M(1), Cin = M(2);
                const a = V(0), b = V(1), cin = V(2);
                pinMasks.out = (A ^ B ^ Cin) & FULL_MASK;
                pinMasks.out1 = ((A & B) | (Cin & (A ^ B))) & FULL_MASK;
                pinLives.out = a ^ b ^ cin;
                pinLives.out1 = (a & b) | (cin & (a ^ b));
                break;
            }
            case 'MUX2': {
                const D0 = M(0), D1 = M(1), S = M(2);
                const d0 = V(0), d1 = V(1), s = V(2);
                pinMasks.out = (((~S) & D0) | (S & D1)) & FULL_MASK;
                pinLives.out = s ? d1 : d0;
                break;
            }
            case 'MUX4': {
                const D0 = M(0), D1 = M(1), D2 = M(2), D3 = M(3), S1 = M(4), S0 = M(5);
                const d = [V(0), V(1), V(2), V(3)];
                const sel = (V(4) << 1) | V(5);
                pinMasks.out = (
                    ((~S1) & (~S0) & D0) |
                    ((~S1) & S0 & D1) |
                    (S1 & (~S0) & D2) |
                    (S1 & S0 & D3)
                ) & FULL_MASK;
                pinLives.out = d[sel];
                break;
            }
            case 'ENC42': {
                const D0 = M(0), D1 = M(1), D2 = M(2), D3 = M(3);
                const d0 = V(0), d1 = V(1), d2 = V(2), d3 = V(3);
                pinMasks.out = (D3 | D2) & FULL_MASK;
                pinMasks.out1 = (D3 | ((~D2) & D1)) & FULL_MASK;
                pinMasks.out2 = (D3 | D2 | D1 | D0) & FULL_MASK;
                pinLives.out = (d3 | d2) ? 1 : 0;
                pinLives.out1 = (d3 | ((!d2) & d1)) ? 1 : 0;
                pinLives.out2 = (d3 | d2 | d1 | d0) ? 1 : 0;
                break;
            }
            case 'DEC24': {
                const A1 = M(0), A0 = M(1);
                const a1 = V(0), a0 = V(1);
                pinMasks.out = ((~A1) & (~A0)) & FULL_MASK;
                pinMasks.out1 = ((~A1) & A0) & FULL_MASK;
                pinMasks.out2 = (A1 & (~A0)) & FULL_MASK;
                pinMasks.out3 = (A1 & A0) & FULL_MASK;
                pinLives.out = (!a1 && !a0) ? 1 : 0;
                pinLives.out1 = (!a1 && a0) ? 1 : 0;
                pinLives.out2 = (a1 && !a0) ? 1 : 0;
                pinLives.out3 = (a1 && a0) ? 1 : 0;
                break;
            }
            case 'COMP2': {
                const A = M(0), B = M(1);
                const a = V(0), b = V(1);
                pinMasks.out = (A & (~B)) & FULL_MASK;
                pinMasks.out1 = (~(A ^ B)) & FULL_MASK;
                pinMasks.out2 = ((~A) & B) & FULL_MASK;
                pinLives.out = (a > b) ? 1 : 0;
                pinLives.out1 = (a === b) ? 1 : 0;
                pinLives.out2 = (a < b) ? 1 : 0;
                break;
            }
            case 'SR_LATCH': {
                const S = M(0), R = M(1);
                const s = V(0), r = V(1);
                if (gateObj && !gateObj.state) {
                    gateObj.state = { q: 0, qBar: 1, invalid: false, mode: 'HOLD' };
                }
                const prevQ = gateObj?.state ? (gateObj.state.q ? 1 : 0) : 0;
                let q = prevQ;
                let qBar = gateObj?.state ? (gateObj.state.qBar ? 1 : 0) : 1;
                let invalid = false;
                let mode = 'HOLD';
                if (s === 1 && r === 0) {
                    q = 1; qBar = 0; mode = 'SET';
                } else if (s === 0 && r === 1) {
                    q = 0; qBar = 1; mode = 'RESET';
                } else if (s === 1 && r === 1) {
                    q = 0; qBar = 0; invalid = true; mode = 'INVALID';
                } else {
                    qBar = q ? 0 : 1;
                    mode = 'HOLD';
                }
                if (updateState && gateObj) {
                    gateObj.state = { q, qBar, invalid, mode };
                }
                const qMask = q ? FULL_MASK : 0;
                pinMasks.out = ((S | ((~R) & qMask)) & (~(S & R))) & FULL_MASK;
                pinMasks.out1 = ((~S) & (R | (~qMask))) & FULL_MASK;
                pinLives.out = q;
                pinLives.out1 = qBar;
                break;
            }
            case 'D_LATCH': {
                const D = M(0), EN = M(1);
                const d = V(0), en = V(1);
                if (gateObj && !gateObj.state) {
                    gateObj.state = { q: 0, qBar: 1, invalid: false, mode: 'LATCHED' };
                }
                const prevQ = gateObj?.state ? (gateObj.state.q ? 1 : 0) : 0;
                const q = en === 1 ? d : prevQ;
                const qBar = q ? 0 : 1;
                const mode = en === 1 ? 'TRANSPARENT' : 'LATCHED';
                if (updateState && gateObj) {
                    gateObj.state = { q, qBar, invalid: false, mode };
                }
                const qMask = q ? FULL_MASK : 0;
                const nextQMask = ((EN & D) | ((~EN) & qMask)) & FULL_MASK;
                pinMasks.out = nextQMask;
                pinMasks.out1 = (~nextQMask) & FULL_MASK;
                pinLives.out = q;
                pinLives.out1 = qBar;
                break;
            }
        }
        return { pinMasks, pinLives };
    }

    function getSourcePinMask(srcNode, pinName = 'out') {
        if (!srcNode) return 0;
        if (srcNode.pinMasks && pinName in srcNode.pinMasks) return srcNode.pinMasks[pinName];
        return srcNode.mask ?? 0;
    }

    function getSourcePinLive(srcNode, pinName = 'out') {
        if (!srcNode) return null;
        if (srcNode.pinLives && pinName in srcNode.pinLives) return srcNode.pinLives[pinName];
        return srcNode.live ?? null;
    }

    function activeRow16(doc) {
        const { shiftById } = getInputShiftMap(doc);
        let row = 0;
        for (const inp of doc.inputs) {
            if (inp.value) {
                const shift = shiftById.get(inp.id);
                if (shift !== undefined && shift !== null) row |= (1 << shift);
            }
        }
        return row;
    }

    function evaluateCircuit(doc, opts = {}) {
        const updateStateful = opts.updateStateful !== false;
        const { maskById } = getInputShiftMap(doc);
        const allIds = [];
        const nodeKindById = new Map();
        const nodeObjById = new Map();

        for (const n of doc.inputs) { allIds.push(n.id); nodeKindById.set(n.id, 'input'); nodeObjById.set(n.id, n); }
        for (const n of doc.consts) { allIds.push(n.id); nodeKindById.set(n.id, 'const'); nodeObjById.set(n.id, n); }
        for (const n of doc.gates) { allIds.push(n.id); nodeKindById.set(n.id, 'gate'); nodeObjById.set(n.id, n); }
        for (const n of doc.outputs) { allIds.push(n.id); nodeKindById.set(n.id, 'output'); nodeObjById.set(n.id, n); }

        const outgoing = new Map(allIds.map(id => [id, []]));
        const incomingByPin = new Map();
        const inDegree = new Map(allIds.map(id => [id, 0]));

        for (const w of doc.wires) {
            const u = w.from?.nodeId;
            const v = w.to?.nodeId;
            if (!nodeKindById.has(u) || !nodeKindById.has(v)) continue;
            outgoing.get(u).push({ toId: v, wire: w });
            incomingByPin.set(L.pinKey(v, w.to.pin), w);
            inDegree.set(v, (inDegree.get(v) || 0) + 1);
        }

        // Kahn's topological sort
        const queue = [];
        for (const id of allIds) {
            if (inDegree.get(id) === 0) queue.push(id);
        }

        const order = [];
        for (let i = 0; i < queue.length; i++) {
            const u = queue[i];
            order.push(u);
            for (const edge of outgoing.get(u)) {
                const nextDeg = inDegree.get(edge.toId) - 1;
                inDegree.set(edge.toId, nextDeg);
                if (nextDeg === 0) queue.push(edge.toId);
            }
        }

        const visited = new Set(order);
        const loopNodeIds = new Set(allIds.filter(id => !visited.has(id)));
        let hasLoop = loopNodeIds.size > 0;
        let hasFeedback = false;

        const row16 = activeRow16(doc);
        const nodes = new Map();
        const wires = new Map();

        // Initialize loop nodes
        for (const id of loopNodeIds) {
            nodes.set(id, {
                id,
                kind: nodeKindById.get(id),
                valid: false,
                floating: false,
                loop: true,
                mask: 0,
                live: null,
                depth: 0
            });
        }

        function evalSingleNode(id, allowFeedback = false) {
            const kind = nodeKindById.get(id);
            const obj = nodeObjById.get(id);

            if (kind === 'input') {
                const mask = maskById.get(id) ?? (VAR_MASKS[obj.name] ?? (obj.value ? FULL_MASK : 0));
                nodes.set(id, {
                    id,
                    kind,
                    valid: true,
                    floating: false,
                    loop: false,
                    mask,
                    live: obj.value ? 1 : 0,
                    depth: 0
                });
            } else if (kind === 'const') {
                const mask = obj.value ? FULL_MASK : 0;
                nodes.set(id, {
                    id,
                    kind,
                    valid: true,
                    floating: false,
                    loop: false,
                    mask,
                    live: obj.value ? 1 : 0,
                    depth: 0
                });
            } else if (kind === 'gate') {
                const fanIn = L.normalizeFanIn(obj.type, obj.fanIn);
                const spec = L.BLOCK_SPECS && L.BLOCK_SPECS[obj.type];
                const inMasks = [];
                const inLives = [];
                let floating = false;
                let loopTainted = false;
                let maxParentDepth = 0;

                for (let idx = 0; idx < fanIn; idx++) {
                    const w = incomingByPin.get(L.pinKey(id, `in${idx}`));
                    if (!w) {
                        floating = true;
                        continue;
                    }
                    const src = nodes.get(w.from.nodeId);
                    if (!src || (src.loop && !allowFeedback)) {
                        loopTainted = true;
                    } else if (!src.valid) {
                        floating = true;
                    } else {
                        inMasks.push(getSourcePinMask(src, w.from.pin));
                        inLives.push(getSourcePinLive(src, w.from.pin));
                        if (src.depth > maxParentDepth) maxParentDepth = src.depth;
                    }
                }

                if (loopTainted) {
                    nodes.set(id, {
                        id,
                        kind,
                        valid: false,
                        floating: false,
                        loop: true,
                        mask: 0,
                        live: null,
                        depth: maxParentDepth + 1
                    });
                } else if (floating || inMasks.length < fanIn) {
                    nodes.set(id, {
                        id,
                        kind,
                        valid: false,
                        floating: true,
                        loop: false,
                        mask: 0,
                        live: null,
                        depth: maxParentDepth + 1
                    });
                } else if (spec) {
                    const { pinMasks, pinLives } = evalBlockOutputs(obj.type, inMasks, inLives, obj, updateStateful);
                    nodes.set(id, {
                        id,
                        kind,
                        valid: true,
                        floating: false,
                        loop: false,
                        mask: pinMasks.out ?? 0,
                        live: pinLives.out ?? 0,
                        pinMasks,
                        pinLives,
                        state: obj.state ? { ...obj.state } : null,
                        depth: maxParentDepth + 1
                    });
                } else {
                    const mask = evalGateMask(obj.type, inMasks);
                    const live = evalGateLive(obj.type, inLives);
                    if (updateStateful) obj._lastLive = live;
                    nodes.set(id, {
                        id,
                        kind,
                        valid: true,
                        floating: false,
                        loop: false,
                        mask,
                        live,
                        pinMasks: { out: mask },
                        pinLives: { out: live },
                        depth: maxParentDepth + 1
                    });
                }
            } else if (kind === 'output') {
                const w = incomingByPin.get(L.pinKey(id, 'in0'));
                if (!w) {
                    nodes.set(id, {
                        id,
                        kind,
                        valid: false,
                        floating: true,
                        loop: false,
                        mask: 0,
                        live: null,
                        depth: 0
                    });
                } else {
                    const src = nodes.get(w.from.nodeId);
                    if (!src || (src.loop && !allowFeedback)) {
                        nodes.set(id, {
                            id,
                            kind,
                            valid: false,
                            floating: false,
                            loop: true,
                            mask: 0,
                            live: null,
                            depth: 0
                        });
                    } else if (!src.valid) {
                        nodes.set(id, {
                            id,
                            kind,
                            valid: false,
                            floating: true,
                            loop: false,
                            mask: 0,
                            live: null,
                            depth: src.depth
                        });
                    } else {
                        const outMask = getSourcePinMask(src, w.from.pin);
                        const outLive = getSourcePinLive(src, w.from.pin);
                        nodes.set(id, {
                            id,
                            kind,
                            valid: true,
                            floating: false,
                            loop: false,
                            mask: outMask,
                            live: outLive,
                            depth: src.depth
                        });
                    }
                }
            }
        }

        // Evaluate visited nodes in topological order
        for (const id of order) {
            evalSingleNode(id, false);
        }

        // Iterative sequential relaxation for gate-level feedback loops (e.g. cross-coupled NOR/NAND SR latches)
        if (loopNodeIds.size > 0) {
            const loopGates = [...loopNodeIds].filter(id => nodeKindById.get(id) === 'gate');
            const loopOutputs = [...loopNodeIds].filter(id => nodeKindById.get(id) === 'output');
            if (loopGates.length >= 2) {
                loopGates.forEach((id, idx) => {
                    const g = nodeObjById.get(id);
                    const seed = g._lastLive !== undefined ? g._lastLive : (idx % 2);
                    const seedMask = seed ? FULL_MASK : 0;
                    nodes.set(id, {
                        id,
                        kind: 'gate',
                        valid: true,
                        floating: false,
                        loop: false,
                        feedback: true,
                        mask: seedMask,
                        live: seed,
                        pinMasks: { out: seedMask },
                        pinLives: { out: seed },
                        depth: 1
                    });
                });

                let converged = false;
                let anyFloatingInLoop = false;
                for (let iter = 0; iter < 16; iter++) {
                    let changed = false;
                    anyFloatingInLoop = false;
                    for (const id of loopGates) {
                        const prevLive = nodes.get(id)?.live;
                        evalSingleNode(id, true);
                        const curr = nodes.get(id);
                        if (!curr.valid || curr.floating) {
                            anyFloatingInLoop = true;
                            break;
                        }
                        curr.feedback = true;
                        if (curr.live !== prevLive) changed = true;
                    }
                    if (anyFloatingInLoop) break;
                    if (!changed) {
                        converged = true;
                        break;
                    }
                }

                if (converged && !anyFloatingInLoop) {
                    hasLoop = false;
                    hasFeedback = true;
                    for (const id of loopOutputs) {
                        evalSingleNode(id, true);
                    }
                } else {
                    for (const id of loopNodeIds) {
                        nodes.set(id, {
                            id,
                            kind: nodeKindById.get(id),
                            valid: false,
                            floating: anyFloatingInLoop,
                            loop: !anyFloatingInLoop,
                            mask: 0,
                            live: null,
                            depth: 0
                        });
                    }
                }
            }
        }

        // Populate wire live state
        for (const w of doc.wires) {
            const src = nodes.get(w.from?.nodeId);
            const dst = nodes.get(w.to?.nodeId);
            const inLoop = Boolean((src && src.loop) || (dst && dst.loop));
            const pinLive = src && src.valid && !inLoop ? getSourcePinLive(src, w.from.pin) : null;
            const pinMask = src && src.valid ? getSourcePinMask(src, w.from.pin) : 0;
            wires.set(w.id, {
                id: w.id,
                valid: Boolean(src && src.valid && !inLoop),
                loop: inLoop,
                floating: Boolean(!inLoop && (!src || !src.valid)),
                live: pinLive,
                mask: pinMask
            });
        }

        // Compute circuit cost metrics
        let maxDepth = 0;
        let transistors = 0;
        for (const g of doc.gates) {
            const n = nodes.get(g.id);
            if (n && n.depth > maxDepth) maxDepth = n.depth;
            const fn = L.CMOS_TRANSISTORS[g.type];
            transistors += fn ? fn(L.normalizeFanIn(g.type, g.fanIn)) : 4;
        }

        return {
            hasLoop,
            hasFeedback,
            loopNodeIds,
            order,
            row16,
            nodes,
            wires,
            stats: {
                gates: doc.gates.length,
                inputs: doc.inputs.length,
                outputs: doc.outputs.length,
                wires: doc.wires.length,
                depth: maxDepth,
                transistors
            }
        };
    }

    function extractTruthTable(doc, evaluation = evaluateCircuit(doc)) {
        const { sortedInputs, shiftByName } = getInputShiftMap(doc);
        const sortedOutputs = [...doc.outputs].sort(
            (a, b) => L.OUTPUT_NAMES.indexOf(a.name) - L.OUTPUT_NAMES.indexOf(b.name)
        );
        const vars = sortedInputs.map(i => i.name);
        const k = vars.length;
        const maxVars = Math.min(k, 6);
        const rowCount = 1 << maxVars;
        const rows = [];

        const useDirectEval = k > 4;

        const outputSummaries = new Map();
        for (const out of sortedOutputs) {
            const n = evaluation.nodes.get(out.id);
            outputSummaries.set(out.name, {
                id: out.id,
                name: out.name,
                valid: Boolean(n && n.valid),
                loop: Boolean(n && n.loop),
                floating: Boolean(!n || n.floating),
                mask16: n && n.valid ? n.mask : 0,
                minterms: [],
                maxterms: []
            });
        }

        const savedValues = sortedInputs.map(inp => inp.value);

        for (let idx = 0; idx < rowCount; idx++) {
            const inputBits = [];
            let r16 = 0;
            let isActive = true;

            for (let j = 0; j < k; j++) {
                const bit = j < maxVars ? ((idx >> (maxVars - 1 - j)) & 1) : (sortedInputs[j].value ? 1 : 0);
                inputBits.push(bit);
                const shift = shiftByName.get(vars[j]);
                if (bit && shift !== undefined && shift !== null) r16 |= (1 << shift);
                if ((savedValues[j] ? 1 : 0) !== bit) isActive = false;
            }

            let rowEval = null;
            if (useDirectEval) {
                for (let j = 0; j < k; j++) sortedInputs[j].value = inputBits[j];
                rowEval = evaluateCircuit(doc, { updateStateful: false });
            }

            const outValues = {};
            for (const out of sortedOutputs) {
                const summary = outputSummaries.get(out.name);
                if (summary.valid) {
                    const bit = rowEval
                        ? (rowEval.nodes.get(out.id)?.live ?? 0)
                        : ((summary.mask16 >> r16) & 1);
                    outValues[out.name] = bit;
                    if (bit === 1) summary.minterms.push(idx);
                    else summary.maxterms.push(idx);
                } else if (summary.loop) {
                    outValues[out.name] = '↻';
                } else {
                    outValues[out.name] = '?';
                }
            }

            rows.push({
                index: idx,
                r16,
                inputBits,
                outputs: outValues,
                active: isActive
            });
        }

        if (useDirectEval) {
            for (let j = 0; j < k; j++) sortedInputs[j].value = savedValues[j];
        }

        return {
            vars,
            inputs: sortedInputs,
            outputs: sortedOutputs,
            rows,
            outputSummaries
        };
    }

    Object.assign(L, {
        FULL_MASK,
        VAR_MASKS,
        VAR_SHIFTS,
        POS_MASKS,
        POS_SHIFTS,
        getInputShiftMap,
        evalGateMask,
        evalGateLive,
        evalBlockOutputs,
        getSourcePinMask,
        getSourcePinLive,
        activeRow16,
        evaluateCircuit,
        extractTruthTable
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = L;
    }
})(typeof window !== 'undefined' ? window : globalThis);

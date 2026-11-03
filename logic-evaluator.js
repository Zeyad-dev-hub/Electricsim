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

    function activeRow16(doc) {
        let row = 0;
        for (const inp of doc.inputs) {
            if (inp.value) {
                const shift = VAR_SHIFTS[inp.name];
                if (shift !== undefined) row |= (1 << shift);
            }
        }
        return row;
    }

    function evaluateCircuit(doc) {
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
        const hasLoop = loopNodeIds.size > 0;

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

        // Evaluate visited nodes in topological order
        for (const id of order) {
            const kind = nodeKindById.get(id);
            const obj = nodeObjById.get(id);

            if (kind === 'input') {
                const mask = VAR_MASKS[obj.name] ?? 0;
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
                const pinMasks = [];
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
                    if (!src || src.loop) {
                        loopTainted = true;
                    } else if (!src.valid) {
                        floating = true;
                    } else {
                        pinMasks.push(src.mask);
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
                } else if (floating || pinMasks.length < fanIn) {
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
                } else {
                    const mask = evalGateMask(obj.type, pinMasks);
                    nodes.set(id, {
                        id,
                        kind,
                        valid: true,
                        floating: false,
                        loop: false,
                        mask,
                        live: (mask >> row16) & 1,
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
                    if (!src || src.loop) {
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
                        nodes.set(id, {
                            id,
                            kind,
                            valid: true,
                            floating: false,
                            loop: false,
                            mask: src.mask,
                            live: src.live,
                            depth: src.depth
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
            wires.set(w.id, {
                id: w.id,
                valid: Boolean(src && src.valid && !inLoop),
                loop: inLoop,
                floating: Boolean(!inLoop && (!src || !src.valid)),
                live: src && src.valid && !inLoop ? src.live : null,
                mask: src && src.valid ? src.mask : 0
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
        const sortedInputs = [...doc.inputs].sort(
            (a, b) => L.INPUT_NAMES.indexOf(a.name) - L.INPUT_NAMES.indexOf(b.name)
        );
        const sortedOutputs = [...doc.outputs].sort(
            (a, b) => L.OUTPUT_NAMES.indexOf(a.name) - L.OUTPUT_NAMES.indexOf(b.name)
        );
        const vars = sortedInputs.map(i => i.name);
        const k = vars.length;
        const rowCount = 1 << k;
        const rows = [];

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

        for (let idx = 0; idx < rowCount; idx++) {
            const inputBits = [];
            let r16 = 0;
            let isActive = true;

            for (let j = 0; j < k; j++) {
                const bit = (idx >> (k - 1 - j)) & 1;
                inputBits.push(bit);
                const shift = VAR_SHIFTS[vars[j]];
                if (bit) r16 |= (1 << shift);
                if ((sortedInputs[j].value ? 1 : 0) !== bit) isActive = false;
            }

            const outValues = {};
            for (const out of sortedOutputs) {
                const summary = outputSummaries.get(out.name);
                if (summary.valid) {
                    const bit = (summary.mask16 >> r16) & 1;
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
        evalGateMask,
        activeRow16,
        evaluateCircuit,
        extractTruthTable
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = L;
    }
})(typeof window !== 'undefined' ? window : globalThis);

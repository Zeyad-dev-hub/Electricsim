(function (root) {
    'use strict';
    const L = typeof module !== 'undefined' && module.exports
        ? require('./logic-simplify.js')
        : (root.LogicLab || (root.LogicLab = {}));

    // Deterministic column X positions (multiples of 24px grid)
    const COL_X = {
        input: -312,
        inverter: -144,
        term: 48,
        chunk: 216,
        chunkInv: 336,
        combine: 240,
        combineDeep: 456,
        output: 408,
        outputDeep: 600
    };

    function createInverterGate(doc, mode, x, y, srcNodeId) {
        if (mode === 'nand') {
            const g = L.createGate('NAND', x, y, 2);
            doc.gates.push(g);
            L.connectWire(doc, { nodeId: srcNodeId, pin: 'out' }, { nodeId: g.id, pin: 'in0' });
            L.connectWire(doc, { nodeId: srcNodeId, pin: 'out' }, { nodeId: g.id, pin: 'in1' });
            return g.id;
        }
        if (mode === 'nor') {
            const g = L.createGate('NOR', x, y, 2);
            doc.gates.push(g);
            L.connectWire(doc, { nodeId: srcNodeId, pin: 'out' }, { nodeId: g.id, pin: 'in0' });
            L.connectWire(doc, { nodeId: srcNodeId, pin: 'out' }, { nodeId: g.id, pin: 'in1' });
            return g.id;
        }
        const g = L.createGate('NOT', x, y, 1);
        doc.gates.push(g);
        L.connectWire(doc, { nodeId: srcNodeId, pin: 'out' }, { nodeId: g.id, pin: 'in0' });
        return g.id;
    }

    function synthesizeCircuit(sourceDoc, { mode = 'sop', targetOutputName = null } = {}) {
        if (!L.simplify || !L.evaluateCircuit) {
            throw new Error('Simplifier and evaluator are required for circuit synthesis.');
        }

        const evaluation = L.evaluateCircuit(sourceDoc);
        const sortedInputs = [...sourceDoc.inputs].sort(
            (a, b) => L.INPUT_NAMES.indexOf(a.name) - L.INPUT_NAMES.indexOf(b.name)
        );
        const allOutputs = [...sourceDoc.outputs].sort(
            (a, b) => L.OUTPUT_NAMES.indexOf(a.name) - L.OUTPUT_NAMES.indexOf(b.name)
        );
        const outputsToBuild = targetOutputName
            ? allOutputs.filter(o => o.name === targetOutputName)
            : allOutputs;

        const validOutputs = outputsToBuild.filter(o => {
            const n = evaluation.nodes.get(o.id);
            return Boolean(n && n.valid && !n.loop);
        });

        if (!validOutputs.length) {
            throw new Error('Connect at least one valid, loop-free output before converting.');
        }

        const vars = sortedInputs.map(i => i.name);
        const nextDoc = L.blank();
        nextDoc.view = L.clone(sourceDoc.view || { panX: 0, panY: 0, zoom: 1 });

        // 1. Place inputs in Column 0
        const inputMap = new Map();
        const inCount = sortedInputs.length;
        sortedInputs.forEach((inp, idx) => {
            const y = L.snapValue((idx - (inCount - 1) / 2) * 96);
            const created = L.createInput(nextDoc, COL_X.input, y, inp.name, inp.value);
            nextDoc.inputs.push(created);
            inputMap.set(inp.name, created.id);
        });

        // Shared inverter cache in Column 1 (varName -> inverter gate id)
        const inverterMap = new Map();
        let invIndex = 0;
        function getLiteralSignal(varName, negated) {
            const rawId = inputMap.get(varName);
            if (!negated) return rawId;
            if (inverterMap.has(varName)) return inverterMap.get(varName);
            const varIdx = vars.indexOf(varName);
            const baseY = varIdx >= 0
                ? L.snapValue((varIdx - (inCount - 1) / 2) * 96 + 24)
                : L.snapValue((invIndex++) * 72);
            const invId = createInverterGate(nextDoc, mode, COL_X.inverter, baseY, rawId);
            inverterMap.set(varName, invId);
            return invId;
        }

        // Pre-simplify each valid output
        const plans = validOutputs.map(out => {
            const mask16 = evaluation.nodes.get(out.id).mask;
            const simp = L.simplify({ vars, mask16 });
            return { out, mask16, simp };
        });

        const needsDeepStage = plans.some(p => {
            const list = mode === 'pos' || mode === 'nor' ? p.simp.pos.clauses : p.simp.sop.terms;
            return list.length > 4;
        });

        const combineX = needsDeepStage ? COL_X.combineDeep : COL_X.combine;
        const outputX = needsDeepStage ? COL_X.outputDeep : COL_X.output;

        let termRowCursor = 0;
        const totalTermsEstimate = plans.reduce((acc, p) => {
            const list = mode === 'pos' || mode === 'nor' ? p.simp.pos.clauses : p.simp.sop.terms;
            return acc + Math.max(1, list.length);
        }, 0);

        const nextTermY = () => {
            const y = L.snapValue((termRowCursor - (totalTermsEstimate - 1) / 2) * 72);
            termRowCursor++;
            return y;
        };

        // Shared first-level term gate cache so multi-output circuits reuse identical product/sum gates
        const sharedTermGateMap = new Map();

        plans.forEach((plan, outIdx) => {
            const { out, simp } = plan;
            const outY = L.snapValue((outIdx - (plans.length - 1) / 2) * 120);
            const outNode = L.createOutput(nextDoc, outputX, outY, out.name);
            nextDoc.outputs.push(outNode);

            const form = (mode === 'pos' || mode === 'nor') ? simp.pos : simp.sop;
            const items = (mode === 'pos' || mode === 'nor') ? form.clauses : form.terms;

            // Constant 0 or 1 output
            if (form.constant === 0 || form.constant === 1) {
                const cY = nextTermY();
                const cNode = L.createConst(form.constant, COL_X.term, cY);
                nextDoc.consts.push(cNode);
                L.connectWire(nextDoc, { nodeId: cNode.id, pin: 'out' }, { nodeId: outNode.id, pin: 'in0' });
                return;
            }

            if (mode === 'sop' || mode === 'pos') {
                const termGateType = mode === 'sop' ? 'AND' : 'OR';
                const combineGateType = mode === 'sop' ? 'OR' : 'AND';

                const termSignals = items.map(item => {
                    if (item.literals.length === 1) {
                        const lit = item.literals[0];
                        return getLiteralSignal(lit.var, lit.negated);
                    }
                    const cacheKey = `${mode}:${termGateType}:${item.literals.map(l => (l.negated ? '!' : '') + l.var).join(',')}`;
                    if (sharedTermGateMap.has(cacheKey)) return sharedTermGateMap.get(cacheKey);

                    const g = L.createGate(termGateType, COL_X.term, nextTermY(), item.literals.length);
                    nextDoc.gates.push(g);
                    item.literals.forEach((lit, idx) => {
                        const sigId = getLiteralSignal(lit.var, lit.negated);
                        L.connectWire(nextDoc, { nodeId: sigId, pin: 'out' }, { nodeId: g.id, pin: `in${idx}` });
                    });
                    sharedTermGateMap.set(cacheKey, g.id);
                    return g.id;
                });

                if (termSignals.length === 1) {
                    L.connectWire(nextDoc, { nodeId: termSignals[0], pin: 'out' }, { nodeId: outNode.id, pin: 'in0' });
                } else if (termSignals.length <= 4) {
                    const comb = L.createGate(combineGateType, combineX, outY, termSignals.length);
                    nextDoc.gates.push(comb);
                    termSignals.forEach((sigId, idx) => {
                        L.connectWire(nextDoc, { nodeId: sigId, pin: 'out' }, { nodeId: comb.id, pin: `in${idx}` });
                    });
                    L.connectWire(nextDoc, { nodeId: comb.id, pin: 'out' }, { nodeId: outNode.id, pin: 'in0' });
                } else {
                    const chunkSignals = [];
                    for (let i = 0; i < termSignals.length; i += 4) {
                        const slice = termSignals.slice(i, i + 4);
                        if (slice.length === 1) {
                            chunkSignals.push(slice[0]);
                        } else {
                            const cg = L.createGate(combineGateType, COL_X.chunk, outY + (i === 0 ? -48 : 48), slice.length);
                            nextDoc.gates.push(cg);
                            slice.forEach((sigId, idx) => {
                                L.connectWire(nextDoc, { nodeId: sigId, pin: 'out' }, { nodeId: cg.id, pin: `in${idx}` });
                            });
                            chunkSignals.push(cg.id);
                        }
                    }
                    const finalGate = L.createGate(combineGateType, combineX, outY, chunkSignals.length);
                    nextDoc.gates.push(finalGate);
                    chunkSignals.forEach((sigId, idx) => {
                        L.connectWire(nextDoc, { nodeId: sigId, pin: 'out' }, { nodeId: finalGate.id, pin: `in${idx}` });
                    });
                    L.connectWire(nextDoc, { nodeId: finalGate.id, pin: 'out' }, { nodeId: outNode.id, pin: 'in0' });
                }
                return;
            }

            // Universal gate modes: 'nand' (from SOP) or 'nor' (from POS)
            const uType = mode === 'nand' ? 'NAND' : 'NOR';

            if (items.length === 1) {
                const only = items[0];
                if (only.literals.length === 1) {
                    const lit = only.literals[0];
                    const sigId = getLiteralSignal(lit.var, lit.negated);
                    L.connectWire(nextDoc, { nodeId: sigId, pin: 'out' }, { nodeId: outNode.id, pin: 'in0' });
                } else {
                    // Single multi-literal term/clause: e.g. A·B = NAND(NAND(A,B), NAND(A,B))
                    const first = L.createGate(uType, COL_X.term, nextTermY(), only.literals.length);
                    nextDoc.gates.push(first);
                    only.literals.forEach((lit, idx) => {
                        const sigId = getLiteralSignal(lit.var, lit.negated);
                        L.connectWire(nextDoc, { nodeId: sigId, pin: 'out' }, { nodeId: first.id, pin: `in${idx}` });
                    });
                    const secondId = createInverterGate(nextDoc, mode, combineX, outY, first.id);
                    L.connectWire(nextDoc, { nodeId: secondId, pin: 'out' }, { nodeId: outNode.id, pin: 'in0' });
                }
                return;
            }

            // items.length >= 2: each item becomes a signal carrying ¬(item)
            const barItemSignals = items.map(item => {
                if (item.literals.length === 1) {
                    const lit = item.literals[0];
                    // Need ¬(lit): if lit is positive X, ¬X is inverted input; if lit is ¬X, ¬(¬X) is raw X!
                    return getLiteralSignal(lit.var, !lit.negated);
                }
                const cacheKey = `${mode}:${uType}:${item.literals.map(l => (l.negated ? '!' : '') + l.var).join(',')}`;
                if (sharedTermGateMap.has(cacheKey)) return sharedTermGateMap.get(cacheKey);

                const g = L.createGate(uType, COL_X.term, nextTermY(), item.literals.length);
                nextDoc.gates.push(g);
                item.literals.forEach((lit, idx) => {
                    const sigId = getLiteralSignal(lit.var, lit.negated);
                    L.connectWire(nextDoc, { nodeId: sigId, pin: 'out' }, { nodeId: g.id, pin: `in${idx}` });
                });
                sharedTermGateMap.set(cacheKey, g.id);
                return g.id;
            });

            if (barItemSignals.length <= 4) {
                const comb = L.createGate(uType, combineX, outY, barItemSignals.length);
                nextDoc.gates.push(comb);
                barItemSignals.forEach((sigId, idx) => {
                    L.connectWire(nextDoc, { nodeId: sigId, pin: 'out' }, { nodeId: comb.id, pin: `in${idx}` });
                });
                L.connectWire(nextDoc, { nodeId: comb.id, pin: 'out' }, { nodeId: outNode.id, pin: 'in0' });
            } else {
                // 5..8 terms: chunk into groups of <= 4, invert multi-item chunks, then combine with final NAND/NOR
                const chunkBarSignals = [];
                for (let i = 0; i < barItemSignals.length; i += 4) {
                    const slice = barItemSignals.slice(i, i + 4);
                    if (slice.length === 1) {
                        chunkBarSignals.push(slice[0]);
                    } else {
                        const rowOffset = i === 0 ? -48 : 48;
                        const cg = L.createGate(uType, COL_X.chunk, outY + rowOffset, slice.length);
                        nextDoc.gates.push(cg);
                        slice.forEach((sigId, idx) => {
                            L.connectWire(nextDoc, { nodeId: sigId, pin: 'out' }, { nodeId: cg.id, pin: `in${idx}` });
                        });
                        const invCgId = createInverterGate(nextDoc, mode, COL_X.chunkInv, outY + rowOffset, cg.id);
                        chunkBarSignals.push(invCgId);
                    }
                }
                const finalGate = L.createGate(uType, combineX, outY, chunkBarSignals.length);
                nextDoc.gates.push(finalGate);
                chunkBarSignals.forEach((sigId, idx) => {
                    L.connectWire(nextDoc, { nodeId: sigId, pin: 'out' }, { nodeId: finalGate.id, pin: `in${idx}` });
                });
                L.connectWire(nextDoc, { nodeId: finalGate.id, pin: 'out' }, { nodeId: outNode.id, pin: 'in0' });
            }
        });

        // Preserve any unconnected outputs so user nodes are not lost
        const unconnectedOutputs = outputsToBuild.filter(o => !validOutputs.includes(o));
        unconnectedOutputs.forEach((out, idx) => {
            const outY = L.snapValue(((plans.length + idx) - (outputsToBuild.length - 1) / 2) * 120);
            const outNode = L.createOutput(nextDoc, outputX, outY, out.name);
            nextDoc.outputs.push(outNode);
        });

        // Self-verification: assert every synthesized output matches original truth mask
        const verifyEval = L.evaluateCircuit(nextDoc);
        for (const plan of plans) {
            const newOut = nextDoc.outputs.find(o => o.name === plan.out.name);
            const newRes = newOut ? verifyEval.nodes.get(newOut.id) : null;
            if (!newRes || !newRes.valid || newRes.mask !== plan.mask16) {
                throw new Error(`Synthesis verification failed for output ${plan.out.name}.`);
            }
        }

        return nextDoc;
    }

    Object.assign(L, {
        synthesizeCircuit
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = L;
    }
})(typeof window !== 'undefined' ? window : globalThis);

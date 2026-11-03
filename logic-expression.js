(function (root) {
    'use strict';
    const L = typeof module !== 'undefined' && module.exports
        ? require('./logic-evaluator.js')
        : (root.LogicLab || (root.LogicLab = {}));

    const NOTATION_STYLES = {
        compact: { label: "Engineering (A·B + A')", and: ' · ', or: ' + ', xor: ' ⊕ ' },
        overbar: { label: 'Textbook (A·B + A\u0305)', and: ' · ', or: ' + ', xor: ' ⊕ ' },
        symbolic: { label: 'Symbolic (A ∧ B ∨ ¬A)', and: ' ∧ ', or: ' ∨ ', xor: ' ⊕ ' },
        code: { label: 'Code (A && B || !A)', and: ' && ', or: ' || ', xor: ' ^ ' }
    };

    const PRECEDENCE = {
        VAR: 5,
        CONST: 5,
        HOLE: 5,
        LOOP: 5,
        BUF: 5,
        NOT: 4,
        NAND: 4,
        NOR: 4,
        XNOR: 4,
        AND: 3,
        XOR: 2,
        OR: 1
    };

    function buildOutputAst(doc, outputNodeId) {
        const nodeObjById = new Map();
        const nodeKindById = new Map();
        for (const n of doc.inputs) { nodeObjById.set(n.id, n); nodeKindById.set(n.id, 'input'); }
        for (const n of doc.consts) { nodeObjById.set(n.id, n); nodeKindById.set(n.id, 'const'); }
        for (const n of doc.gates) { nodeObjById.set(n.id, n); nodeKindById.set(n.id, 'gate'); }
        for (const n of doc.outputs) { nodeObjById.set(n.id, n); nodeKindById.set(n.id, 'output'); }

        const incomingByPin = new Map();
        for (const w of doc.wires) {
            if (w.to && w.from) {
                incomingByPin.set(L.pinKey(w.to.nodeId, w.to.pin), w);
            }
        }

        function walk(nodeId, ancestors) {
            if (!nodeId || !nodeKindById.has(nodeId)) {
                return { kind: 'hole', nodeId: null };
            }
            if (ancestors.has(nodeId)) {
                return { kind: 'loop', nodeId };
            }
            const kind = nodeKindById.get(nodeId);
            const obj = nodeObjById.get(nodeId);

            if (kind === 'input') {
                return { kind: 'var', name: obj.name, nodeId };
            }
            if (kind === 'const') {
                return { kind: 'const', value: obj.value ? 1 : 0, nodeId };
            }
            if (kind === 'output') {
                const w = incomingByPin.get(L.pinKey(nodeId, 'in0'));
                if (!w) return { kind: 'hole', nodeId };
                const nextAnc = new Set(ancestors);
                nextAnc.add(nodeId);
                return walk(w.from.nodeId, nextAnc);
            }
            if (kind === 'gate') {
                const fanIn = L.normalizeFanIn(obj.type, obj.fanIn);
                const nextAnc = new Set(ancestors);
                nextAnc.add(nodeId);
                const args = [];
                for (let i = 0; i < fanIn; i++) {
                    const w = incomingByPin.get(L.pinKey(nodeId, `in${i}`));
                    if (!w) {
                        args.push({ kind: 'hole', nodeId });
                    } else {
                        args.push(walk(w.from.nodeId, nextAnc));
                    }
                }
                return {
                    kind: 'gate',
                    op: obj.type,
                    args,
                    nodeId
                };
            }
            return { kind: 'hole', nodeId };
        }

        return walk(outputNodeId, new Set());
    }

    function countAstLiterals(ast) {
        if (!ast) return 0;
        if (ast.kind === 'var') return 1;
        if (ast.kind === 'gate') {
            return ast.args.reduce((sum, child) => sum + countAstLiterals(child), 0);
        }
        return 0;
    }

    function astPrecedence(ast) {
        if (!ast) return 5;
        if (ast.kind !== 'gate') return 5;
        return PRECEDENCE[ast.op] || 1;
    }

    function isAtomicAst(ast) {
        if (!ast) return true;
        return ast.kind === 'var' || ast.kind === 'const' || ast.kind === 'hole' || ast.kind === 'loop';
    }

    function formatAst(ast, style = 'compact') {
        const cfg = NOTATION_STYLES[style] || NOTATION_STYLES.compact;
        if (!ast) return '□';

        if (ast.kind === 'var') return ast.name;
        if (ast.kind === 'const') return String(ast.value);
        if (ast.kind === 'hole') return '□';
        if (ast.kind === 'loop') return '↻';

        if (ast.kind === 'gate') {
            const op = ast.op;
            if (op === 'BUF') {
                return formatAst(ast.args[0], style);
            }
            if (op === 'NOT') {
                const child = ast.args[0];
                const inner = formatAst(child, style);
                const atomic = isAtomicAst(child);
                if (style === 'compact') {
                    return atomic ? `${inner}'` : `(${inner})'`;
                }
                if (style === 'overbar') {
                    return atomic ? `${inner}\u0305` : `¬(${inner})`;
                }
                if (style === 'code') {
                    return atomic ? `!${inner}` : `!(${inner})`;
                }
                return atomic ? `¬${inner}` : `¬(${inner})`;
            }

            // Binary / multi-input gates
            const baseOp = op === 'NAND' ? 'AND' : op === 'NOR' ? 'OR' : op === 'XNOR' ? 'XOR' : op;
            const inverted = op === 'NAND' || op === 'NOR' || op === 'XNOR';
            const sep = baseOp === 'AND' ? cfg.and : baseOp === 'OR' ? cfg.or : cfg.xor;
            const myPrec = PRECEDENCE[baseOp];

            const parts = ast.args.map(arg => {
                const text = formatAst(arg, style);
                if (arg.kind === 'gate' && arg.op !== 'BUF') {
                    const childPrec = astPrecedence(arg);
                    if (childPrec < myPrec || (arg.op !== baseOp && childPrec === myPrec)) {
                        return `(${text})`;
                    }
                }
                return text;
            });

            const joined = parts.join(sep);
            if (!inverted) return joined;

            if (style === 'compact') return `(${joined})'`;
            if (style === 'code') return `!(${joined})`;
            return `¬(${joined})`;
        }

        return '□';
    }

    // Builds a safe DOM tree of <span> elements with data-node-id for bidirectional hover highlighting
    function buildAstDom(ast, style = 'compact', docRef = document) {
        const cfg = NOTATION_STYLES[style] || NOTATION_STYLES.compact;
        const span = (text, nodeId, cls = 'logic-expr-token') => {
            const el = docRef.createElement('span');
            el.className = cls;
            if (nodeId) el.dataset.nodeId = nodeId;
            if (text !== null && text !== undefined) el.textContent = text;
            return el;
        };

        function render(node) {
            if (!node) return span('□', null, 'logic-expr-hole');
            if (node.kind === 'var') return span(node.name, node.nodeId, 'logic-expr-var');
            if (node.kind === 'const') return span(String(node.value), node.nodeId, 'logic-expr-const');
            if (node.kind === 'hole') return span('□', node.nodeId, 'logic-expr-hole');
            if (node.kind === 'loop') return span('↻', node.nodeId, 'logic-expr-loop');

            if (node.kind === 'gate') {
                const op = node.op;
                const wrap = span(null, node.nodeId, 'logic-expr-gate');

                if (op === 'BUF') {
                    wrap.appendChild(render(node.args[0]));
                    return wrap;
                }

                if (op === 'NOT') {
                    const child = node.args[0];
                    const atomic = isAtomicAst(child);
                    if (style === 'compact') {
                        if (!atomic) wrap.appendChild(docRef.createTextNode('('));
                        wrap.appendChild(render(child));
                        if (!atomic) wrap.appendChild(docRef.createTextNode(')'));
                        wrap.appendChild(docRef.createTextNode("'"));
                        return wrap;
                    }
                    if (style === 'overbar') {
                        if (atomic && (child.kind === 'var' || child.kind === 'const')) {
                            const childEl = render(child);
                            childEl.textContent = `${childEl.textContent}\u0305`;
                            wrap.appendChild(childEl);
                        } else {
                            wrap.appendChild(docRef.createTextNode('¬('));
                            wrap.appendChild(render(child));
                            wrap.appendChild(docRef.createTextNode(')'));
                        }
                        return wrap;
                    }
                    const prefix = style === 'code' ? '!' : '¬';
                    wrap.appendChild(docRef.createTextNode(atomic ? prefix : `${prefix}(`));
                    wrap.appendChild(render(child));
                    if (!atomic) wrap.appendChild(docRef.createTextNode(')'));
                    return wrap;
                }

                const baseOp = op === 'NAND' ? 'AND' : op === 'NOR' ? 'OR' : op === 'XNOR' ? 'XOR' : op;
                const inverted = op === 'NAND' || op === 'NOR' || op === 'XNOR';
                const sep = baseOp === 'AND' ? cfg.and : baseOp === 'OR' ? cfg.or : cfg.xor;
                const myPrec = PRECEDENCE[baseOp];

                if (inverted) {
                    const open = style === 'compact' ? '(' : style === 'code' ? '!(' : '¬(';
                    wrap.appendChild(docRef.createTextNode(open));
                }

                node.args.forEach((arg, idx) => {
                    if (idx > 0) wrap.appendChild(docRef.createTextNode(sep));
                    let needParens = false;
                    if (arg.kind === 'gate' && arg.op !== 'BUF') {
                        const childPrec = astPrecedence(arg);
                        if (childPrec < myPrec || (arg.op !== baseOp && childPrec === myPrec)) {
                            needParens = true;
                        }
                    }
                    if (needParens) wrap.appendChild(docRef.createTextNode('('));
                    wrap.appendChild(render(arg));
                    if (needParens) wrap.appendChild(docRef.createTextNode(')'));
                });

                if (inverted) {
                    wrap.appendChild(docRef.createTextNode(style === 'compact' ? ")'" : ')'));
                }

                return wrap;
            }

            return span('□', null, 'logic-expr-hole');
        }

        return render(ast);
    }

    function formatLiteral(varName, negated, style = 'compact') {
        if (!negated) return varName;
        if (style === 'compact') return `${varName}'`;
        if (style === 'overbar') return `${varName}\u0305`;
        if (style === 'code') return `!${varName}`;
        return `¬${varName}`;
    }

    function formatProductTerm(literals, style = 'compact') {
        const cfg = NOTATION_STYLES[style] || NOTATION_STYLES.compact;
        if (!literals || !literals.length) return '1';
        return literals.map(l => formatLiteral(l.var, l.negated, style)).join(cfg.and);
    }

    function formatSumClause(literals, style = 'compact', wrapParens = false) {
        const cfg = NOTATION_STYLES[style] || NOTATION_STYLES.compact;
        if (!literals || !literals.length) return '0';
        const inner = literals.map(l => formatLiteral(l.var, l.negated, style)).join(cfg.or);
        return (wrapParens && literals.length > 1) ? `(${inner})` : inner;
    }

    function formatSopTerms(terms, constantValue = null, style = 'compact') {
        const cfg = NOTATION_STYLES[style] || NOTATION_STYLES.compact;
        if (constantValue === 0 || constantValue === '0') return '0';
        if (constantValue === 1 || constantValue === '1') return '1';
        if (!terms || !terms.length) return '0';
        return terms.map(t => {
            const s = formatProductTerm(t.literals, style);
            return (terms.length > 1 && t.literals.length > 1 && style === 'code') ? `(${s})` : s;
        }).join(cfg.or);
    }

    function formatPosClauses(clauses, constantValue = null, style = 'compact') {
        const cfg = NOTATION_STYLES[style] || NOTATION_STYLES.compact;
        if (constantValue === 0 || constantValue === '0') return '0';
        if (constantValue === 1 || constantValue === '1') return '1';
        if (!clauses || !clauses.length) return '1';
        return clauses.map(c => formatSumClause(c.literals, style, clauses.length > 1)).join(cfg.and);
    }

    Object.assign(L, {
        NOTATION_STYLES,
        PRECEDENCE,
        buildOutputAst,
        countAstLiterals,
        formatAst,
        buildAstDom,
        formatLiteral,
        formatProductTerm,
        formatSumClause,
        formatSopTerms,
        formatPosClauses
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = L;
    }
})(typeof window !== 'undefined' ? window : globalThis);

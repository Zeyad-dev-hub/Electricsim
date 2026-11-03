/* Isolated & optional Boolean algebra simplification and K-map engine.
 * Pure data in, pure data out. Zero DOM, Canvas, or schematic dependencies. */
(function (root) {
    'use strict';
    const L = root.LogicLab || (root.LogicLab = {});

    const VAR_SHIFTS = { A: 3, B: 2, C: 1, D: 0 };

    function projectMaskToVars(vars, mask16) {
        const k = vars.length;
        const numRows = 1 << k;
        let truth = 0;
        for (let idx = 0; idx < numRows; idx++) {
            let r16 = 0;
            for (let j = 0; j < k; j++) {
                const bit = (idx >> (k - 1 - j)) & 1;
                if (bit) r16 |= (1 << VAR_SHIFTS[vars[j]]);
            }
            if ((mask16 >> r16) & 1) {
                truth |= (1 << idx);
            }
        }
        return truth;
    }

    // Cache the 3^k cube structures per variable count k (k = 0..4)
    const CUBE_CACHE = new Map();

    function getCubesForCount(k) {
        if (CUBE_CACHE.has(k)) return CUBE_CACHE.get(k);
        const numRows = 1 << k;
        const total = Math.pow(3, k);
        const cubes = [];

        for (let code = 0; code < total; code++) {
            const digits = [];
            let temp = code;
            for (let j = k - 1; j >= 0; j--) {
                // 0 = negated, 1 = positive, 2 = dash ('-')
                digits[j] = temp % 3;
                temp = Math.floor(temp / 3);
            }

            let cMask = 0;
            const minterms = [];
            for (let idx = 0; idx < numRows; idx++) {
                let match = true;
                for (let j = 0; j < k; j++) {
                    if (digits[j] === 2) continue;
                    const bit = (idx >> (k - 1 - j)) & 1;
                    if (bit !== digits[j]) {
                        match = false;
                        break;
                    }
                }
                if (match) {
                    cMask |= (1 << idx);
                    minterms.push(idx);
                }
            }

            let literalCount = 0;
            let key = '';
            for (let j = 0; j < k; j++) {
                key += digits[j] === 2 ? '-' : String(digits[j]);
                if (digits[j] !== 2) literalCount++;
            }

            cubes.push({
                digits,
                key,
                cMask,
                minterms,
                literalCount
            });
        }

        CUBE_CACHE.set(k, cubes);
        return cubes;
    }

    function materializeCube(cube, vars) {
        const literals = [];
        for (let j = 0; j < vars.length; j++) {
            if (cube.digits[j] === 1) {
                literals.push({ var: vars[j], negated: false });
            } else if (cube.digits[j] === 0) {
                literals.push({ var: vars[j], negated: true });
            }
        }
        return {
            key: cube.key,
            cMask: cube.cMask,
            minterms: [...cube.minterms],
            literalCount: cube.literalCount,
            literals
        };
    }

    function computeTwoLevelCost(terms) {
        if (!terms || !terms.length) {
            return { terms: 0, literals: 0, gates: 0, transistors: 0 };
        }
        if (terms.length === 1 && terms[0].literals.length === 1) {
            const neg = terms[0].literals[0].negated;
            return {
                terms: 1,
                literals: 1,
                gates: neg ? 1 : 0,
                transistors: neg ? 2 : 0
            };
        }

        const negVars = new Set();
        let literals = 0;
        let termGates = 0;
        let transistors = 0;

        for (const t of terms) {
            literals += t.literals.length;
            for (const l of t.literals) {
                if (l.negated) negVars.add(l.var);
            }
            if (t.literals.length >= 2) {
                termGates++;
                transistors += 2 * t.literals.length + 2;
            }
        }

        const notGates = negVars.size;
        transistors += notGates * 2;

        let combineGates = 0;
        if (terms.length >= 2 && terms.length <= 4) {
            combineGates = 1;
            transistors += 2 * terms.length + 2;
        } else if (terms.length > 4) {
            const chunks = Math.ceil(terms.length / 4);
            combineGates = chunks + 1;
            transistors += chunks * 10 + (2 * chunks + 2);
        }

        return {
            terms: terms.length,
            literals,
            gates: notGates + termGates + combineGates,
            transistors
        };
    }

    function solveExactSop(vars, truth) {
        const k = vars.length;
        const numRows = 1 << k;
        const fullMask = (1 << numRows) - 1;
        const cleanTruth = truth & fullMask;

        if (cleanTruth === 0) {
            return {
                constant: 0,
                terms: [],
                primeImplicants: [],
                essentialKeys: [],
                cost: { terms: 0, literals: 0, gates: 0, transistors: 0 }
            };
        }
        if (cleanTruth === fullMask) {
            return {
                constant: 1,
                terms: [],
                primeImplicants: [],
                essentialKeys: [],
                cost: { terms: 0, literals: 0, gates: 0, transistors: 0 }
            };
        }

        const baseCubes = getCubesForCount(k);
        const notTruth = (~cleanTruth) & fullMask;

        // 1. Valid implicants of truth
        const implicants = baseCubes.filter(c => c.cMask !== 0 && (c.cMask & notTruth) === 0);

        // 2. Prime implicants: no strictly larger implicant (with fewer literals) covers all its minterms
        const primeCubes = implicants.filter(c => !implicants.some(
            other => other !== c && other.literalCount < c.literalCount && (c.cMask & ~other.cMask) === 0
        ));

        // Sort prime implicants deterministically: fewer literals first, then key
        primeCubes.sort((a, b) => (a.literalCount - b.literalCount) || a.key.localeCompare(b.key));

        // 3. Essential prime implicants
        const essentialSet = new Set();
        let coveredMask = 0;

        for (let m = 0; m < numRows; m++) {
            if (!((cleanTruth >> m) & 1)) continue;
            const covering = primeCubes.filter(pi => (pi.cMask >> m) & 1);
            if (covering.length === 1) {
                essentialSet.add(covering[0]);
            }
        }

        const chosen = [...essentialSet];
        for (const pi of chosen) coveredMask |= pi.cMask;

        const remainingTruth = cleanTruth & ~coveredMask;

        // 4. Exact branch-and-bound cover over remaining non-essential PIs
        if (remainingTruth !== 0) {
            const candidates = primeCubes.filter(
                pi => !essentialSet.has(pi) && (pi.cMask & remainingTruth) !== 0
            );
            const n = candidates.length;
            const suffixUnion = new Array(n + 1).fill(0);
            for (let i = n - 1; i >= 0; i--) {
                suffixUnion[i] = suffixUnion[i + 1] | candidates[i].cMask;
            }

            let bestPick = candidates;
            let bestTerms = n + 1;
            let bestLiterals = Infinity;

            function search(idx, needed, currentPick, currentLiterals) {
                if (needed === 0) {
                    if (
                        currentPick.length < bestTerms ||
                        (currentPick.length === bestTerms && currentLiterals < bestLiterals)
                    ) {
                        bestTerms = currentPick.length;
                        bestLiterals = currentLiterals;
                        bestPick = [...currentPick];
                    }
                    return;
                }
                if (idx >= n) return;
                if (currentPick.length > bestTerms) return;
                if (currentPick.length === bestTerms && currentLiterals >= bestLiterals) return;
                if ((needed & suffixUnion[idx]) !== needed) return;

                const cand = candidates[idx];
                if ((cand.cMask & needed) !== 0) {
                    currentPick.push(cand);
                    search(idx + 1, needed & ~cand.cMask, currentPick, currentLiterals + cand.literalCount);
                    currentPick.pop();
                }
                search(idx + 1, needed, currentPick, currentLiterals);
            }

            search(0, remainingTruth, [], 0);
            chosen.push(...bestPick);
        }

        chosen.sort((a, b) => (a.literalCount - b.literalCount) || a.key.localeCompare(b.key));

        const terms = chosen.map(c => materializeCube(c, vars));
        const primeImplicants = primeCubes.map(c => ({
            ...materializeCube(c, vars),
            essential: essentialSet.has(c)
        }));

        return {
            constant: null,
            terms,
            primeImplicants,
            essentialKeys: [...essentialSet].map(c => c.key),
            cost: computeTwoLevelCost(terms)
        };
    }

    function solveExactPos(vars, truth) {
        const k = vars.length;
        const numRows = 1 << k;
        const fullMask = (1 << numRows) - 1;
        const cleanTruth = truth & fullMask;

        if (cleanTruth === 0) {
            return {
                constant: 0,
                clauses: [],
                cost: { terms: 0, literals: 0, gates: 0, transistors: 0 }
            };
        }
        if (cleanTruth === fullMask) {
            return {
                constant: 1,
                clauses: [],
                cost: { terms: 0, literals: 0, gates: 0, transistors: 0 }
            };
        }

        const invTruth = (~cleanTruth) & fullMask;
        const invSop = solveExactSop(vars, invTruth);
        const clauses = invSop.terms.map(t => ({
            key: t.key,
            cMask: t.cMask,
            maxterms: [...t.minterms],
            literalCount: t.literalCount,
            literals: t.literals.map(l => ({
                var: l.var,
                negated: !l.negated
            }))
        }));

        return {
            constant: null,
            clauses,
            cost: computeTwoLevelCost(clauses)
        };
    }

    function buildKMap(vars, truth, sopTerms = []) {
        const k = vars.length;
        let rowVars = [];
        let colVars = [];
        let rowCodes = [0];
        let colCodes = [0];
        let rowLabels = [''];
        let colLabels = [''];

        if (k === 1) {
            rowVars = [];
            colVars = [vars[0]];
            rowCodes = [0];
            colCodes = [0, 1];
            rowLabels = [''];
            colLabels = ['0', '1'];
        } else if (k === 2) {
            rowVars = [vars[0]];
            colVars = [vars[1]];
            rowCodes = [0, 1];
            colCodes = [0, 1];
            rowLabels = ['0', '1'];
            colLabels = ['0', '1'];
        } else if (k === 3) {
            rowVars = [vars[0]];
            colVars = [vars[1], vars[2]];
            rowCodes = [0, 1];
            colCodes = [0, 1, 3, 2]; // Gray code: 00, 01, 11, 10
            rowLabels = ['0', '1'];
            colLabels = ['00', '01', '11', '10'];
        } else if (k === 4) {
            rowVars = [vars[0], vars[1]];
            colVars = [vars[2], vars[3]];
            rowCodes = [0, 1, 3, 2];
            colCodes = [0, 1, 3, 2];
            rowLabels = ['00', '01', '11', '10'];
            colLabels = ['00', '01', '11', '10'];
        }

        const colShift = colVars.length;
        const cells = [];

        for (let r = 0; r < rowCodes.length; r++) {
            const row = [];
            for (let c = 0; c < colCodes.length; c++) {
                const minterm = (rowCodes[r] << colShift) | colCodes[c];
                const value = (truth >> minterm) & 1;
                const groups = [];
                sopTerms.forEach((term, gIdx) => {
                    if ((term.cMask >> minterm) & 1) groups.push(gIdx);
                });
                row.push({
                    row: r,
                    col: c,
                    minterm,
                    value,
                    groups
                });
            }
            cells.push(row);
        }

        return {
            vars,
            rowVars,
            colVars,
            rowLabels,
            colLabels,
            cells
        };
    }

    function simplify({ vars = [], mask16 = 0, truthMask = null, style = 'compact' } = {}) {
        const cleanVars = [...vars];
        const k = cleanVars.length;
        const numRows = 1 << k;
        const fullMask = (1 << numRows) - 1;
        const truth = truthMask !== null ? (truthMask & fullMask) : projectMaskToVars(cleanVars, mask16);

        const minterms = [];
        const maxterms = [];
        for (let idx = 0; idx < numRows; idx++) {
            if ((truth >> idx) & 1) minterms.push(idx);
            else maxterms.push(idx);
        }

        const sop = solveExactSop(cleanVars, truth);
        const pos = solveExactPos(cleanVars, truth);
        const kmap = buildKMap(cleanVars, truth, sop.terms);

        const formatSop = L.formatSopTerms
            ? s => L.formatSopTerms(sop.terms, sop.constant, s || style)
            : () => '';
        const formatPos = L.formatPosClauses
            ? s => L.formatPosClauses(pos.clauses, pos.constant, s || style)
            : () => '';

        return {
            vars: cleanVars,
            truth,
            mask16,
            minterms,
            maxterms,
            sop: {
                ...sop,
                expression: formatSop(style),
                format: formatSop
            },
            pos: {
                ...pos,
                expression: formatPos(style),
                format: formatPos
            },
            kmap
        };
    }

    Object.assign(L, {
        hasSimplifier: true,
        projectMaskToVars,
        solveExactSop,
        solveExactPos,
        buildKMap,
        simplify
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = L;
    }
})(typeof window !== 'undefined' ? window : globalThis);

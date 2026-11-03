(function () {
    'use strict';
    const L = window.LogicLab;
    const $ = id => document.getElementById(id);
    const canvas = $('logicCanvas');
    if (!canvas || !L) return;

    const renderer = new L.Renderer(canvas);
    const history = new L.History(L.blank());
    const hasSimplifier = typeof L.simplify === 'function';

    let tool = 'select';
    let placementRotation = 0;
    let selected = null;          // { kind: 'gate'|'input'|'output'|'const'|'wire', id }
    let focusedOutputName = 'F';
    let activeDockTab = 'table';
    let activeKmapGroup = null;
    let hoverNodeId = null;
    let hoverPinKey = null;
    let wireStartPin = null;
    let cursorWorld = null;
    let dragState = null;
    let pinchState = null;
    let draftDoc = null;
    const activePointers = new Map();

    let evaluation = null;
    let truthTable = null;
    let simplifiedByOutput = new Map();
    let frameScheduled = false;

    const doc = () => draftDoc || history.doc;

    function scheduleRender() {
        if (frameScheduled) return;
        frameScheduled = true;
        requestAnimationFrame(() => {
            frameScheduled = false;
            drawCanvas();
        });
    }

    function setHint(text, isError = false) {
        const el = $('toolHint');
        if (!el) return;
        el.textContent = text;
        el.style.color = isError ? '#ff7a72' : '#96a5ba';
    }

    function ensureFocusedOutput() {
        const outs = doc().outputs;
        if (!outs.length) {
            focusedOutputName = 'F';
            return;
        }
        if (!outs.some(o => o.name === focusedOutputName)) {
            const sorted = [...outs].sort((a, b) => L.OUTPUT_NAMES.indexOf(a.name) - L.OUTPUT_NAMES.indexOf(b.name));
            focusedOutputName = sorted[0].name;
        }
    }

    function recomputeAll() {
        renderer.invalidate();
        ensureFocusedOutput();
        evaluation = L.evaluateCircuit(doc());
        truthTable = L.extractTruthTable(doc(), evaluation);
        simplifiedByOutput.clear();

        if (hasSimplifier) {
            const style = $('notationSelect')?.value || 'compact';
            for (const out of truthTable.outputs) {
                const summary = truthTable.outputSummaries.get(out.name);
                if (summary && summary.valid) {
                    simplifiedByOutput.set(
                        out.name,
                        L.simplify({
                            vars: truthTable.vars,
                            mask16: summary.mask16,
                            style
                        })
                    );
                }
            }
        }

        syncHeaderAndTools();
        syncFormulaBar();
        syncInspector();
        syncDock();
        syncFooter();
        scheduleRender();
    }

    function syncHeaderAndTools() {
        $('undoBtn').disabled = history.undoStack.length === 0;
        $('redoBtn').disabled = history.redoStack.length === 0;

        const maxInputsReached = doc().inputs.length >= L.INPUT_NAMES.length;
        const maxOutputsReached = doc().outputs.length >= L.OUTPUT_NAMES.length;
        $('toolInputBtn').disabled = maxInputsReached;
        $('toolOutputBtn').disabled = maxOutputsReached;

        if ((tool === 'input' && maxInputsReached) || (tool === 'output' && maxOutputsReached)) {
            setTool('select');
        }

        document.querySelectorAll('.logic-tools button[data-tool]').forEach(btn => {
            btn.setAttribute('aria-pressed', String(btn.dataset.tool === tool));
        });

        const isGateTool = L.GATE_TYPES.includes(tool);
        $('rotatePlacementBtn').hidden = !isGateTool;

        if (!hasSimplifier) {
            $('openSimplifyBtn').hidden = true;
            $('simplifyPreviewBar').hidden = true;
            $('tabBtnKmap').hidden = true;
            $('tabBtnSimplify').hidden = true;
        }
    }

    function setFormulaHoverNode(nodeId) {
        if (hoverNodeId === nodeId) return;
        hoverNodeId = nodeId;
        document.querySelectorAll('#formulaLines .logic-expr-gate').forEach(el => {
            el.classList.toggle('hovered', Boolean(nodeId && el.dataset.nodeId === nodeId));
        });
        scheduleRender();
    }

    function syncFormulaBar() {
        const style = $('notationSelect')?.value || 'compact';
        const tabsWrap = $('formulaOutputTabs');
        const linesWrap = $('formulaLines');
        tabsWrap.replaceChildren();
        linesWrap.replaceChildren();

        const outs = truthTable.outputs;
        if (!outs.length) {
            const emptyRow = document.createElement('div');
            emptyRow.className = 'logic-formula-row';
            emptyRow.textContent = 'Add an Output (F–Y) and connect gates to see the live Boolean equation.';
            linesWrap.appendChild(emptyRow);
            $('simplifyPreviewBar').hidden = true;
            return;
        }

        if (outs.length > 1) {
            for (const out of outs) {
                const pill = document.createElement('button');
                pill.type = 'button';
                pill.className = 'logic-output-pill';
                pill.textContent = `Output ${out.name}`;
                pill.setAttribute('aria-pressed', String(out.name === focusedOutputName));
                pill.addEventListener('click', () => {
                    focusedOutputName = out.name;
                    activeKmapGroup = null;
                    syncFormulaBar();
                    syncDock();
                });
                tabsWrap.appendChild(pill);
            }
        }

        for (const out of outs) {
            const row = document.createElement('div');
            row.className = 'logic-formula-row' + (out.name === focusedOutputName ? ' focused' : '');
            row.addEventListener('click', () => {
                if (focusedOutputName !== out.name) {
                    focusedOutputName = out.name;
                    activeKmapGroup = null;
                    syncFormulaBar();
                    syncDock();
                }
            });

            const lhs = document.createElement('span');
            lhs.className = 'logic-formula-lhs';
            lhs.textContent = `${out.name} =`;

            const ast = L.buildOutputAst(doc(), out.id);
            const rhs = document.createElement('span');
            rhs.className = 'logic-formula-rhs';
            const domTree = L.buildAstDom(ast, style, document);
            rhs.appendChild(domTree);

            // Attach hover listeners to gate sub-expressions
            rhs.querySelectorAll('.logic-expr-gate').forEach(gateSpan => {
                gateSpan.addEventListener('mouseover', e => {
                    e.stopPropagation();
                    setFormulaHoverNode(gateSpan.dataset.nodeId || null);
                });
                gateSpan.addEventListener('mouseout', e => {
                    e.stopPropagation();
                    setFormulaHoverNode(null);
                });
            });

            const evalNode = evaluation.nodes.get(out.id);
            const pill = document.createElement('span');
            const isOne = evalNode?.valid && evalNode.live === 1;
            pill.className = 'logic-formula-live-pill' + (isOne ? ' is-one' : '');
            pill.textContent = evalNode?.loop
                ? 'Loop ↻'
                : evalNode?.valid
                ? `Now: ${evalNode.live}`
                : 'Unconnected ?';

            row.append(lhs, rhs, pill);
            linesWrap.appendChild(row);
        }

        // Update quiet simplification preview for focused output
        const previewBar = $('simplifyPreviewBar');
        if (!hasSimplifier) {
            previewBar.hidden = true;
            return;
        }

        const focusedOut = outs.find(o => o.name === focusedOutputName) || outs[0];
        const simp = focusedOut ? simplifiedByOutput.get(focusedOut.name) : null;
        if (!simp) {
            previewBar.hidden = true;
            return;
        }

        previewBar.hidden = false;
        const ast = L.buildOutputAst(doc(), focusedOut.id);
        const drawnLiterals = L.countAstLiterals(ast);
        const drawnGates = doc().gates.length;

        const sopCost = simp.sop.cost;
        const posCost = simp.pos.cost;
        const usePos = posCost.literals > 0 && posCost.literals < sopCost.literals;
        const bestForm = usePos ? simp.pos : simp.sop;
        const bestLabel = usePos ? 'Minimal POS' : 'Minimal SOP';

        const savedGates = Math.max(0, drawnGates - sopCost.gates);
        const savedLiterals = Math.max(0, drawnLiterals - bestForm.literals);

        $('simplifyPreviewBadge').textContent = (savedGates === 0 && savedLiterals === 0)
            ? '✓ Minimal'
            : bestLabel;
        $('simplifyPreviewExpr').textContent = `${focusedOut.name} = ${bestForm.expression}`;

        if (savedGates > 0 || savedLiterals > 0) {
            const parts = [];
            if (savedGates > 0) parts.push(`saves ${savedGates} gate${savedGates > 1 ? 's' : ''}`);
            if (savedLiterals > 0) parts.push(`saves ${savedLiterals} literal${savedLiterals > 1 ? 's' : ''}`);
            $('simplifyPreviewMeta').textContent = `(${parts.join(' · ')})`;
        } else {
            $('simplifyPreviewMeta').textContent = `(${sopCost.gates} gate${sopCost.gates === 1 ? '' : 's'} · ${bestForm.literals} literal${bestForm.literals === 1 ? '' : 's'})`;
        }
    }

    function syncInspector() {
        const card = $('inspectorCard');
        const gateCtrls = $('gateInspectorControls');
        const ioCtrls = $('ioInspectorControls');
        const toggleValBtn = $('toggleSelectedValueBtn');
        const rotateBtn = $('rotateSelectedBtn');
        const dupBtn = $('duplicateSelectedBtn');

        if (!selected) {
            card.hidden = true;
            return;
        }

        if (selected.kind === 'wire') {
            const w = doc().wires.find(x => x.id === selected.id);
            if (!w) {
                selected = null;
                card.hidden = true;
                return;
            }
            card.hidden = false;
            $('inspectorTitle').textContent = 'Selected Wire';
            gateCtrls.hidden = true;
            ioCtrls.hidden = true;
            toggleValBtn.hidden = true;
            rotateBtn.hidden = true;
            dupBtn.hidden = true;
            return;
        }

        const found = L.findNode(doc(), selected.id);
        if (!found) {
            selected = null;
            card.hidden = true;
            return;
        }

        card.hidden = false;
        const { kind, node } = found;

        if (kind === 'gate') {
            $('inspectorTitle').textContent = `${node.type} Gate`;
            gateCtrls.hidden = false;
            ioCtrls.hidden = true;
            toggleValBtn.hidden = true;
            rotateBtn.hidden = false;
            dupBtn.hidden = false;

            $('inspectorGateType').value = node.type;
            const single = L.SINGLE_INPUT_GATES.has(node.type);
            $('inspectorFanIn').hidden = single;
            $('inspectorFanInLabel').hidden = single;
            if (!single) {
                $('inspectorFanIn').value = String(node.fanIn);
            }
        } else if (kind === 'input') {
            $('inspectorTitle').textContent = `Input ${node.name}`;
            gateCtrls.hidden = true;
            ioCtrls.hidden = false;
            toggleValBtn.hidden = false;
            toggleValBtn.textContent = `State: ${node.value ? '1 (High)' : '0 (Low)'} · Click to Toggle`;
            rotateBtn.hidden = true;
            dupBtn.hidden = true;

            $('inspectorIoLabel').textContent = 'Input Variable';
            const sel = $('inspectorIoName');
            sel.replaceChildren();
            const used = new Set(doc().inputs.filter(i => i.id !== node.id).map(i => i.name));
            for (const name of L.INPUT_NAMES) {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = used.has(name) ? `${name} (swap)` : name;
                opt.selected = name === node.name;
                sel.appendChild(opt);
            }
        } else if (kind === 'output') {
            $('inspectorTitle').textContent = `Output ${node.name}`;
            gateCtrls.hidden = true;
            ioCtrls.hidden = false;
            toggleValBtn.hidden = true;
            rotateBtn.hidden = true;
            dupBtn.hidden = true;

            $('inspectorIoLabel').textContent = 'Output Symbol';
            const sel = $('inspectorIoName');
            sel.replaceChildren();
            const used = new Set(doc().outputs.filter(o => o.id !== node.id).map(o => o.name));
            for (const name of L.OUTPUT_NAMES) {
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = used.has(name) ? `${name} (swap)` : name;
                opt.selected = name === node.name;
                sel.appendChild(opt);
            }
        } else if (kind === 'const') {
            $('inspectorTitle').textContent = `Constant ${node.value ? '1' : '0'}`;
            gateCtrls.hidden = true;
            ioCtrls.hidden = true;
            toggleValBtn.hidden = false;
            toggleValBtn.textContent = `Constant Value: ${node.value ? '1' : '0'} · Click to Flip`;
            rotateBtn.hidden = true;
            dupBtn.hidden = false;
        }
    }

    function syncDock() {
        document.querySelectorAll('.logic-dock-tabs button[data-tab]').forEach(btn => {
            btn.setAttribute('aria-selected', String(btn.dataset.tab === activeDockTab));
        });
        $('panelTable').hidden = activeDockTab !== 'table';
        $('panelKmap').hidden = activeDockTab !== 'kmap' || !hasSimplifier;
        $('panelSimplify').hidden = activeDockTab !== 'simplify' || !hasSimplifier;

        renderTruthTablePanel();
        if (hasSimplifier) {
            renderKmapPanel();
            renderSimplifyPanel();
        }
    }

    function renderTruthTablePanel() {
        const thead = $('truthTableHead');
        const tbody = $('truthTableBody');
        const idCard = $('functionIdentityCard');
        thead.replaceChildren();
        tbody.replaceChildren();
        idCard.replaceChildren();

        const { vars, outputs, rows, outputSummaries } = truthTable;

        const headRow = document.createElement('tr');
        if (vars.length === 0) {
            const th = document.createElement('th');
            th.textContent = 'Const';
            headRow.appendChild(th);
        } else {
            for (const v of vars) {
                const th = document.createElement('th');
                th.textContent = v;
                headRow.appendChild(th);
            }
        }

        if (outputs.length === 0) {
            const th = document.createElement('th');
            th.className = 'out-col';
            th.textContent = 'Out';
            headRow.appendChild(th);
        } else {
            for (const o of outputs) {
                const th = document.createElement('th');
                th.className = 'out-col';
                th.textContent = o.name;
                headRow.appendChild(th);
            }
        }
        thead.appendChild(headRow);

        for (const r of rows) {
            const tr = document.createElement('tr');
            if (r.active) tr.className = 'active-row';
            tr.title = 'Click to apply this input state on the schematic';
            tr.addEventListener('click', () => {
                applyInputCombination(r.inputBits);
            });

            if (vars.length === 0) {
                const td = document.createElement('td');
                td.textContent = '—';
                tr.appendChild(td);
            } else {
                for (const bit of r.inputBits) {
                    const td = document.createElement('td');
                    td.className = bit ? 'val-1' : 'val-0';
                    td.textContent = String(bit);
                    tr.appendChild(td);
                }
            }

            if (outputs.length === 0) {
                const td = document.createElement('td');
                td.className = 'out-col val-0';
                td.textContent = '—';
                tr.appendChild(td);
            } else {
                for (const o of outputs) {
                    const val = r.outputs[o.name];
                    const td = document.createElement('td');
                    td.className = 'out-col ' + (val === 1 ? 'val-1' : 'val-0');
                    td.textContent = String(val);
                    tr.appendChild(td);
                }
            }
            tbody.appendChild(tr);
        }

        // Populate Function Identity Card for focused output
        const focusedSummary = outputSummaries.get(focusedOutputName) || (outputs[0] && outputSummaries.get(outputs[0].name));
        if (!focusedSummary || !focusedSummary.valid) {
            const dt = document.createElement('dt');
            dt.textContent = 'Status';
            const dd = document.createElement('dd');
            dd.textContent = focusedSummary?.loop ? 'Feedback loop detected' : 'Connect all gate inputs to view minterms';
            idCard.append(dt, dd);
            return;
        }

        const addRow = (label, value) => {
            const dt = document.createElement('dt');
            dt.textContent = label;
            const dd = document.createElement('dd');
            dd.textContent = value;
            idCard.append(dt, dd);
        };

        addRow(`Output ${focusedSummary.name} Minterms`, focusedSummary.minterms.length ? `Σm(${focusedSummary.minterms.join(', ')})` : '∅ (Always 0)');
        addRow(`Output ${focusedSummary.name} Maxterms`, focusedSummary.maxterms.length ? `ΠM(${focusedSummary.maxterms.join(', ')})` : '∅ (Always 1)');
        addRow('16-Bit Truth Mask', `0x${focusedSummary.mask16.toString(16).toUpperCase().padStart(4, '0')}`);
    }

    function applyInputCombination(bits) {
        const sortedInputs = [...doc().inputs].sort(
            (a, b) => L.INPUT_NAMES.indexOf(a.name) - L.INPUT_NAMES.indexOf(b.name)
        );
        if (!sortedInputs.length) return;
        sortedInputs.forEach((inp, idx) => {
            if (idx < bits.length) inp.value = bits[idx] ? 1 : 0;
        });
        recomputeAll();
    }

    function applyMintermIndex(mintermIndex) {
        const k = truthTable.vars.length;
        const bits = [];
        for (let j = 0; j < k; j++) {
            bits.push((mintermIndex >> (k - 1 - j)) & 1);
        }
        applyInputCombination(bits);
    }

    function renderKmapPanel() {
        const container = $('kmapContainer');
        const chipsWrap = $('kmapGroupChips');
        container.replaceChildren();
        chipsWrap.replaceChildren();

        $('kmapOutputLabel').textContent = `Output ${focusedOutputName}`;
        const simp = simplifiedByOutput.get(focusedOutputName);
        if (!simp) {
            const p = document.createElement('p');
            p.className = 'logic-panel-hint';
            p.textContent = 'Wire a complete combinational circuit to Output ' + focusedOutputName + ' to generate its Karnaugh map.';
            container.appendChild(p);
            return;
        }

        const { kmap, sop } = simp;
        const style = $('notationSelect')?.value || 'compact';
        const activeRow = truthTable.rows.find(r => r.active);
        const activeMinterm = activeRow ? activeRow.index : -1;

        const table = document.createElement('table');
        table.className = 'logic-kmap-table';

        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        const corner = document.createElement('th');
        const rowVarText = kmap.rowVars.join('');
        const colVarText = kmap.colVars.join('');
        corner.textContent = rowVarText && colVarText ? `${rowVarText} \\ ${colVarText}` : (colVarText || 'Const');
        trHead.appendChild(corner);

        for (const colLbl of kmap.colLabels) {
            const th = document.createElement('th');
            th.textContent = colLbl;
            trHead.appendChild(th);
        }
        thead.appendChild(trHead);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        kmap.cells.forEach((rowCells, rIdx) => {
            const tr = document.createElement('tr');
            const rowHeader = document.createElement('th');
            rowHeader.textContent = kmap.rowLabels[rIdx];
            tr.appendChild(rowHeader);

            for (const cell of rowCells) {
                const td = document.createElement('td');
                const inHighlightGroup = activeKmapGroup !== null && cell.groups.includes(activeKmapGroup);
                td.className = 'logic-kmap-cell'
                    + (cell.value === 1 ? ' is-one' : '')
                    + (cell.minterm === activeMinterm ? ' active-minterm' : '')
                    + (inHighlightGroup ? ' group-highlight' : '');
                td.title = `m${cell.minterm} · Click to set inputs to this cell`;
                td.textContent = String(cell.value);

                const sub = document.createElement('span');
                sub.className = 'logic-kmap-mindex';
                sub.textContent = `m${cell.minterm}`;
                td.appendChild(sub);

                td.addEventListener('click', () => {
                    applyMintermIndex(cell.minterm);
                });
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);

        // Render clickable Prime Implicant group chips
        if (sop.constant === 0 || sop.constant === 1) {
            const badge = document.createElement('span');
            badge.className = 'logic-panel-hint';
            badge.textContent = sop.constant === 1 ? 'Constant 1 (all cells covered)' : 'Constant 0 (no 1-cells)';
            chipsWrap.appendChild(badge);
            return;
        }

        sop.terms.forEach((term, gIdx) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'logic-group-chip' + (activeKmapGroup === gIdx ? ' active' : '');
            const termStr = L.formatProductTerm(term.literals, style);
            chip.textContent = `${termStr}  [m${term.minterms.join(',m')}]`;
            chip.addEventListener('mouseenter', () => {
                activeKmapGroup = gIdx;
                renderKmapPanel();
            });
            chip.addEventListener('click', () => {
                activeKmapGroup = activeKmapGroup === gIdx ? null : gIdx;
                renderKmapPanel();
            });
            chipsWrap.appendChild(chip);
        });
    }

    function renderSimplifyPanel() {
        $('simplifyOutputLabel').textContent = `Output ${focusedOutputName}`;
        const style = $('notationSelect')?.value || 'compact';
        const outObj = doc().outputs.find(o => o.name === focusedOutputName) || doc().outputs[0];
        const simp = simplifiedByOutput.get(focusedOutputName);
        const piList = $('primeImplicantList');
        piList.replaceChildren();

        const hasValidSimp = Boolean(outObj && simp);
        $('applySopBtn').disabled = !hasValidSimp;
        $('applyPosBtn').disabled = !hasValidSimp;
        $('convertNandBtn').disabled = !hasValidSimp;
        $('convertNorBtn').disabled = !hasValidSimp;

        if (!outObj) {
            $('cardDrawnExpr').textContent = 'No output placed';
            $('cardDrawnCost').textContent = '—';
            $('cardSopExpr').textContent = '—';
            $('cardSopCost').textContent = '—';
            $('cardPosExpr').textContent = '—';
            $('cardPosCost').textContent = '—';
            return;
        }

        const ast = L.buildOutputAst(doc(), outObj.id);
        const drawnStr = L.formatAst(ast, style);
        const drawnLiterals = L.countAstLiterals(ast);
        $('cardDrawnExpr').textContent = `${outObj.name} = ${drawnStr}`;
        $('cardDrawnCost').textContent = `${doc().gates.length} gates · ${drawnLiterals} literals · ${evaluation.stats.transistors} CMOS transistors`;

        if (!simp) {
            $('cardSopExpr').textContent = 'Connect all gate inputs first';
            $('cardSopCost').textContent = '—';
            $('cardPosExpr').textContent = '—';
            $('cardPosCost').textContent = '—';
            return;
        }

        const sopExpr = simp.sop.format(style);
        const posExpr = simp.pos.format(style);
        $('cardSopExpr').textContent = `${outObj.name} = ${sopExpr}`;
        $('cardSopCost').textContent = `${simp.sop.cost.gates} gates · ${simp.sop.cost.literals} literals · ${simp.sop.cost.transistors} CMOS transistors`;

        $('cardPosExpr').textContent = `${outObj.name} = ${posExpr}`;
        $('cardPosCost').textContent = `${simp.pos.cost.gates} gates · ${simp.pos.cost.literals} literals · ${simp.pos.cost.transistors} CMOS transistors`;

        if (!simp.sop.primeImplicants.length) {
            const li = document.createElement('li');
            li.textContent = `Constant function (${outObj.name} = ${simp.sop.constant}) — no prime implicants needed.`;
            piList.appendChild(li);
            return;
        }

        for (const pi of simp.sop.primeImplicants) {
            const li = document.createElement('li');
            const code = document.createElement('code');
            code.textContent = L.formatProductTerm(pi.literals, style);
            const meta = document.createElement('span');
            meta.style.color = pi.essential ? '#37e0a1' : '#96a5ba';
            meta.textContent = `${pi.essential ? '★ Essential' : 'Prime'} · m(${pi.minterms.join(', ')})`;
            li.append(code, meta);
            piList.appendChild(li);
        }
    }

    function syncFooter() {
        const s = evaluation.stats;
        $('statGates').textContent = String(s.gates);
        $('statInputs').textContent = String(s.inputs);
        $('statOutputs').textContent = String(s.outputs);
        $('statDepth').textContent = String(s.depth);
        $('statTransistors').textContent = String(s.transistors);

        const statusEl = $('statStatus');
        if (evaluation.hasLoop) {
            statusEl.className = 'logic-status-err';
            statusEl.textContent = '⚠ Feedback loop detected';
        } else {
            const anyFloatingOut = doc().outputs.some(o => !evaluation.nodes.get(o.id)?.valid);
            if (anyFloatingOut) {
                statusEl.className = 'logic-status-warn';
                statusEl.textContent = '● Unconnected pins present';
            } else {
                statusEl.className = 'logic-status-ok';
                statusEl.textContent = '✓ Valid combinational circuit';
            }
        }
    }

    function drawCanvas() {
        const currentDoc = doc();
        const geom = renderer.geometry(currentDoc);
        let wirePreviewPath = null;
        if (wireStartPin && cursorWorld) {
            const snapPin = L.findSnapPin(
                currentDoc,
                cursorWorld,
                18 / renderer.view.zoom,
                wireStartPin.role === 'out' ? 'in' : 'out',
                geom.pins
            );
            wirePreviewPath = L.previewWireRoute(currentDoc, wireStartPin, snapPin || cursorWorld);
        }

        let placementPreview = null;
        if (cursorWorld && L.isPlacementTool(tool) && (!dragState || dragState.type === 'place' || dragState.type === 'toolbarDrag')) {
            const snap = $('snapToggle').checked && !dragState?.freeSnap;
            placementPreview = {
                tool,
                point: L.snapPoint(cursorWorld, snap),
                rotation: placementRotation
            };
        }

        let dragSnapPreview = null;
        if (dragState && dragState.type === 'moveNode' && dragState.moved && $('snapToggle').checked && !dragState.freeSnap) {
            const found = L.findNode(currentDoc, dragState.id);
            if (found) {
                dragSnapPreview = {
                    kind: found.kind,
                    node: found.node,
                    point: L.snapPoint(found.node.position, true)
                };
            }
        }

        // Dynamic canvas cursor feedback
        if (tool === 'pan' || (dragState && dragState.type === 'pan')) {
            canvas.style.cursor = dragState ? 'grabbing' : 'grab';
        } else if (L.isPlacementTool(tool) || tool === 'wire' || wireStartPin) {
            canvas.style.cursor = 'crosshair';
        } else if (dragState && dragState.type === 'moveNode' && dragState.moved) {
            canvas.style.cursor = 'grabbing';
        } else if (hoverPinKey) {
            canvas.style.cursor = 'crosshair';
        } else {
            canvas.style.cursor = 'default';
        }

        renderer.render(currentDoc, evaluation, {
            selected,
            hoverNodeId,
            hoverPinKey,
            wireStartPin,
            wirePreviewPath,
            placementPreview,
            dragSnapPreview
        });
    }

    function setTool(nextTool) {
        tool = nextTool;
        wireStartPin = null;
        if (dragState && dragState.type !== 'toolbarDrag') {
            dragState = null;
            draftDoc = null;
        }
        syncHeaderAndTools();

        if (tool === 'select') {
            setHint('Click an input [0/1] badge to toggle it. Drag any component to move it, or drag from a pin dot to wire.');
        } else if (tool === 'wire') {
            setHint('Click or drag from any pin dot to a compatible target pin (Escape cancels).');
        } else if (tool === 'input') {
            const nextName = L.nextInputName(doc());
            setHint(nextName ? `Click on the canvas to place Input ${nextName} (up to 4 inputs A–D).` : 'Maximum of 4 inputs (A–D) reached.');
        } else if (tool === 'output') {
            const nextName = L.nextOutputName(doc());
            setHint(nextName ? `Click on the canvas to place Output ${nextName} (up to 4 outputs F–Y).` : 'Maximum of 4 outputs (F–Y) reached.');
        } else if (tool === 'const1' || tool === 'const0') {
            setHint(`Click on the canvas to place a constant ${tool === 'const1' ? '1' : '0'} source.`);
        } else if (tool === 'pan') {
            setHint('Drag anywhere on the canvas to pan the viewport.');
        } else {
            setHint(`Click on the canvas to place ${tool}. Press R to rotate before placing.`);
        }
        scheduleRender();
    }

    function autoConnectDroppedNode(targetDoc, nodeId) {
        const found = L.findNode(targetDoc, nodeId);
        if (!found) return;
        const myPins = L.nodePins(found.node, found.kind);
        const all = L.allPins(targetDoc);
        const occupiedInputs = new Set(targetDoc.wires.map(w => L.pinKey(w.to.nodeId, w.to.pin)));
        for (const mp of myPins) {
            for (const other of all.values()) {
                if (other.nodeId === nodeId || other.role === mp.role) continue;
                const inPin = mp.role === 'in' ? mp : other;
                if (occupiedInputs.has(inPin.key)) continue;
                if (Math.hypot(mp.x - other.x, mp.y - other.y) <= 8) {
                    if (L.connectWire(targetDoc, mp, other)) {
                        occupiedInputs.add(inPin.key);
                    }
                }
            }
        }
    }

    function placeElementAt(worldPt, freeSnap = false) {
        const snap = $('snapToggle').checked && !freeSnap;
        const pt = L.snapPoint(worldPt, snap);
        const next = L.clone(history.doc);
        let created = null;
        let createdKind = null;

        if (tool === 'input') {
            created = L.createInput(next, pt.x, pt.y);
            if (!created) {
                setHint('Maximum of 4 inputs (A–D) reached.', true);
                return false;
            }
            next.inputs.push(created);
            createdKind = 'input';
        } else if (tool === 'output') {
            created = L.createOutput(next, pt.x, pt.y);
            if (!created) {
                setHint('Maximum of 4 outputs (F–Y) reached.', true);
                return false;
            }
            next.outputs.push(created);
            focusedOutputName = created.name;
            createdKind = 'output';
        } else if (tool === 'const1' || tool === 'const0') {
            created = L.createConst(tool === 'const1' ? 1 : 0, pt.x, pt.y);
            next.consts.push(created);
            createdKind = 'const';
        } else if (L.GATE_TYPES.includes(tool)) {
            created = L.createGate(tool, pt.x, pt.y, 2);
            created.rotation = placementRotation;
            next.gates.push(created);
            createdKind = 'gate';
        }

        if (created) {
            autoConnectDroppedNode(next, created.id);
            history.commit(next);
            selected = { kind: createdKind, id: created.id };
            if (!$('repeatToggle').checked && !freeSnap) {
                setTool('select');
            }
            recomputeAll();
            return true;
        }
        return false;
    }

    function runSynthesis(mode) {
        try {
            const nextDoc = L.synthesizeCircuit(doc(), { mode });
            history.commit(nextDoc);
            selected = null;
            renderer.fit(doc());
            recomputeAll();
            const modeLabel = mode === 'sop'
                ? 'Minimal SOP (AND/OR/NOT)'
                : mode === 'pos'
                ? 'Minimal POS (OR/AND/NOT)'
                : mode === 'nand'
                ? 'Universal NAND-Only'
                : 'Universal NOR-Only';
            setHint(`Rebuilt circuit in ${modeLabel} form (all 16 truth-table rows verified). Press Undo to restore.`);
        } catch (err) {
            setHint(err.message || 'Cannot synthesize circuit.', true);
        }
    }

    // Populate examples dropdown (starts on empty workspace, matching Circuits Lab)
    const exampleSelect = $('exampleSelect');
    for (const [id, preset] of Object.entries(L.PRESETS)) {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = preset.name;
        exampleSelect.appendChild(opt);
    }

    exampleSelect.addEventListener('change', () => {
        const id = exampleSelect.value;
        if (!id) {
            history.commit(L.blank());
            selected = null;
            wireStartPin = null;
            activeKmapGroup = null;
            renderer.fit(doc());
            recomputeAll();
            setHint('Workspace cleared. Place inputs (A–D), gates, and outputs (F–Y), or choose an example.');
            return;
        }
        const preset = L.PRESETS[id];
        if (!preset) return;
        history.commit(L.makePreset(id));
        selected = null;
        wireStartPin = null;
        activeKmapGroup = null;
        renderer.fit(doc());
        recomputeAll();
        setHint(preset.description);
    });

    // Header buttons
    $('undoBtn').addEventListener('click', () => {
        if (history.undo()) {
            selected = null;
            wireStartPin = null;
            recomputeAll();
        }
    });

    $('redoBtn').addEventListener('click', () => {
        if (history.redo()) {
            selected = null;
            wireStartPin = null;
            recomputeAll();
        }
    });

    $('clearBtn').addEventListener('click', () => {
        history.commit(L.blank());
        selected = null;
        wireStartPin = null;
        exampleSelect.value = '';
        renderer.fit(doc());
        recomputeAll();
        setHint('Workspace cleared. Add inputs (A–D), gates, and outputs (F–Y).');
    });

    // Formula bar controls
    $('notationSelect').addEventListener('change', () => {
        recomputeAll();
    });

    $('copyFormulaBtn').addEventListener('click', () => {
        const style = $('notationSelect').value;
        const lines = truthTable.outputs.map(out => {
            const ast = L.buildOutputAst(doc(), out.id);
            return `${out.name} = ${L.formatAst(ast, style)}`;
        });
        const text = lines.join('\n') || '';
        if (navigator.clipboard && text) {
            navigator.clipboard.writeText(text).then(() => {
                $('copyFormulaBtn').textContent = 'Copied ✓';
                setTimeout(() => { $('copyFormulaBtn').textContent = 'Copy'; }, 1200);
            }).catch(() => {});
        }
    });

    $('openSimplifyBtn').addEventListener('click', () => {
        activeDockTab = 'simplify';
        syncDock();
    });

    $('quickApplySopBtn').addEventListener('click', () => runSynthesis('sop'));
    $('quickNandBtn').addEventListener('click', () => runSynthesis('nand'));
    $('quickNorBtn').addEventListener('click', () => runSynthesis('nor'));

    $('applySopBtn').addEventListener('click', () => runSynthesis('sop'));
    $('applyPosBtn').addEventListener('click', () => runSynthesis('pos'));
    $('convertNandBtn').addEventListener('click', () => runSynthesis('nand'));
    $('convertNorBtn').addEventListener('click', () => runSynthesis('nor'));

    // Tool buttons: support both clicking to select tool AND dragging directly onto the canvas
    document.querySelectorAll('.logic-tools button[data-tool]').forEach(btn => {
        btn.addEventListener('click', () => {
            setTool(btn.dataset.tool);
        });
        btn.addEventListener('pointerdown', e => {
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            const nextTool = btn.dataset.tool;
            if (!L.isPlacementTool(nextTool) || btn.disabled) return;
            setTool(nextTool);
            dragState = {
                type: 'toolbarDrag',
                tool: nextTool,
                startClientX: e.clientX,
                startClientY: e.clientY,
                freeSnap: e.shiftKey
            };
        });
    });

    window.addEventListener('pointermove', e => {
        if (!dragState || dragState.type !== 'toolbarDrag') return;
        const rect = canvas.getBoundingClientRect();
        const overCanvas = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        dragState.freeSnap = e.shiftKey;
        if (overCanvas) {
            cursorWorld = renderer.world(e.clientX, e.clientY);
        } else {
            cursorWorld = null;
        }
        scheduleRender();
    });

    window.addEventListener('pointerup', e => {
        if (!dragState || dragState.type !== 'toolbarDrag') return;
        const rect = canvas.getBoundingClientRect();
        const overCanvas = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        const dist = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
        dragState = null;
        if (overCanvas && dist > 12) {
            const worldPt = renderer.world(e.clientX, e.clientY);
            cursorWorld = worldPt;
            placeElementAt(worldPt, e.shiftKey);
        }
    });

    $('rotatePlacementBtn').addEventListener('click', () => {
        placementRotation = (placementRotation + 90) % 360;
        scheduleRender();
    });

    // Zoom buttons (zoom smoothly around viewport center)
    const zoomBy = factor => {
        const nextZoom = Math.max(0.3, Math.min(2.4, renderer.view.zoom * factor));
        const ratio = nextZoom / renderer.view.zoom;
        renderer.view.panX *= ratio;
        renderer.view.panY *= ratio;
        renderer.view.zoom = nextZoom;
        scheduleRender();
    };
    $('zoomInBtn').addEventListener('click', () => zoomBy(1.2));
    $('zoomOutBtn').addEventListener('click', () => zoomBy(1 / 1.2));
    $('fitBtn').addEventListener('click', () => {
        renderer.fit(doc());
        scheduleRender();
    });

    // Inspector events
    $('closeInspectorBtn').addEventListener('click', () => {
        selected = null;
        syncInspector();
        scheduleRender();
    });

    $('inspectorGateType').addEventListener('change', e => {
        if (!selected || selected.kind !== 'gate') return;
        const next = L.clone(doc());
        if (L.setGateType(next, selected.id, e.target.value)) {
            history.commit(next);
            recomputeAll();
        }
    });

    $('inspectorFanIn').addEventListener('change', e => {
        if (!selected || selected.kind !== 'gate') return;
        const next = L.clone(doc());
        if (L.setGateFanIn(next, selected.id, Number(e.target.value))) {
            history.commit(next);
            recomputeAll();
        }
    });

    $('inspectorIoName').addEventListener('change', e => {
        if (!selected) return;
        const next = L.clone(doc());
        const found = L.findNode(next, selected.id);
        if (!found) return;
        const nextName = e.target.value;
        const oldName = found.node.name;
        if (found.kind === 'input') {
            const existing = next.inputs.find(i => i.id !== found.node.id && i.name === nextName);
            if (existing) existing.name = oldName;
        } else if (found.kind === 'output') {
            const existing = next.outputs.find(o => o.id !== found.node.id && o.name === nextName);
            if (existing) existing.name = oldName;
        }
        found.node.name = nextName;
        if (found.kind === 'output') focusedOutputName = found.node.name;
        history.commit(next);
        recomputeAll();
    });

    $('toggleSelectedValueBtn').addEventListener('click', () => {
        if (!selected) return;
        const found = L.findNode(doc(), selected.id);
        if (!found || (found.kind !== 'input' && found.kind !== 'const')) return;
        found.node.value = found.node.value ? 0 : 1;
        recomputeAll();
    });

    $('rotateSelectedBtn').addEventListener('click', () => {
        if (!selected || selected.kind !== 'gate') return;
        const next = L.clone(doc());
        const g = next.gates.find(x => x.id === selected.id);
        if (!g) return;
        g.rotation = ((g.rotation || 0) + 90) % 360;
        history.commit(next);
        recomputeAll();
    });

    $('duplicateSelectedBtn').addEventListener('click', () => {
        if (!selected) return;
        const found = L.findNode(doc(), selected.id);
        if (!found) return;
        const next = L.clone(doc());
        if (found.kind === 'gate') {
            const copy = L.createGate(found.node.type, found.node.position.x + 48, found.node.position.y + 48, found.node.fanIn);
            copy.rotation = found.node.rotation || 0;
            next.gates.push(copy);
            history.commit(next);
            selected = { kind: 'gate', id: copy.id };
            recomputeAll();
        } else if (found.kind === 'const') {
            const copy = L.createConst(found.node.value, found.node.position.x + 48, found.node.position.y + 48);
            next.consts.push(copy);
            history.commit(next);
            selected = { kind: 'const', id: copy.id };
            recomputeAll();
        }
    });

    function deleteSelected() {
        if (!selected) return;
        const next = L.clone(doc());
        if (selected.kind === 'wire') {
            L.removeWire(next, selected.id);
        } else {
            L.removeNode(next, selected.id);
        }
        history.commit(next);
        selected = null;
        recomputeAll();
    }

    $('deleteSelectedBtn').addEventListener('click', deleteSelected);

    // Dock tab buttons
    document.querySelectorAll('.logic-dock-tabs button[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            activeDockTab = btn.dataset.tab;
            syncDock();
        });
    });

    function abandonPointers() {
        activePointers.clear();
        pinchState = null;
        if (dragState) {
            dragState = null;
            draftDoc = null;
            renderer.invalidate();
            scheduleRender();
        }
    }

    // Canvas pointer & touch interactions
    canvas.addEventListener('pointerdown', e => {
        if (e.button !== 0 && e.pointerType === 'mouse') {
            if (e.button === 2) {
                wireStartPin = null;
                if (dragState) {
                    dragState = null;
                    draftDoc = null;
                    renderer.invalidate();
                }
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
            draftDoc = null;
            wireStartPin = null;
            renderer.invalidate();
            scheduleRender();
            return;
        }

        const worldPt = renderer.world(e.clientX, e.clientY);
        cursorWorld = worldPt;
        const isTouch = e.pointerType === 'touch';
        const currentDoc = history.doc;
        const geom = renderer.geometry(currentDoc);

        if (tool === 'pan') {
            dragState = {
                type: 'pan',
                startClientX: e.clientX,
                startClientY: e.clientY,
                startPanX: renderer.view.panX,
                startPanY: renderer.view.panY
            };
            scheduleRender();
            return;
        }

        // Press-slide-release placement for all placeable tools
        if (L.isPlacementTool(tool)) {
            dragState = {
                type: 'place',
                tool,
                startClientX: e.clientX,
                startClientY: e.clientY,
                freeSnap: e.shiftKey
            };
            scheduleRender();
            return;
        }

        const preferNode = tool === 'select' && !wireStartPin;
        const hit = L.hitTest(currentDoc, worldPt, {
            touch: isTouch,
            zoom: renderer.view.zoom,
            preferNode,
            pins: geom.pins,
            routes: geom.routes
        });

        // Pin click or drag wiring (works in both 'wire' and 'select' modes)
        if (hit && hit.kind === 'pin') {
            if (wireStartPin) {
                if (wireStartPin.role !== hit.pin.role && wireStartPin.nodeId !== hit.pin.nodeId) {
                    const next = L.clone(currentDoc);
                    if (L.connectWire(next, wireStartPin, hit.pin)) {
                        history.commit(next);
                        wireStartPin = null;
                        recomputeAll();
                        return;
                    }
                }
                wireStartPin = hit.pin;
                scheduleRender();
                return;
            }
            wireStartPin = hit.pin;
            dragState = {
                type: 'wireDrag',
                startPin: hit.pin,
                startClientX: e.clientX,
                startClientY: e.clientY,
                moved: false
            };
            scheduleRender();
            return;
        }

        if (tool === 'wire') {
            wireStartPin = null;
            scheduleRender();
            return;
        }

        // Clicking empty space or a node while wireStartPin was active cancels wireStartPin
        if (wireStartPin) {
            wireStartPin = null;
        }

        if (hit && (hit.kind === 'gate' || hit.kind === 'input' || hit.kind === 'output' || hit.kind === 'const')) {
            const wasSelected = Boolean(selected && selected.id === hit.id);
            selected = { kind: hit.kind, id: hit.id };
            if (hit.kind === 'output') focusedOutputName = hit.node.name;

            // Note: Do NOT rebuild DOM or toggle inspector height during pointerdown so canvas bounds never shift mid-click!
            dragState = {
                type: 'moveNode',
                kind: hit.kind,
                id: hit.id,
                onToggle: Boolean(hit.onToggle),
                wasSelected,
                moved: false,
                freeSnap: e.shiftKey,
                startClientX: e.clientX,
                startClientY: e.clientY,
                startWorldX: worldPt.x,
                startWorldY: worldPt.y,
                startNodeX: hit.node.position.x,
                startNodeY: hit.node.position.y,
                baseDoc: L.clone(currentDoc)
            };
            scheduleRender();
            return;
        }

        if (hit && hit.kind === 'wire') {
            selected = { kind: 'wire', id: hit.id };
            const segIdx = hit.segmentIndex;
            const path = hit.path || [];
            const segA = path[segIdx] || worldPt;
            const segB = path[segIdx + 1] || worldPt;
            dragState = {
                type: 'moveWire',
                id: hit.id,
                moved: false,
                freeSnap: e.shiftKey,
                startClientX: e.clientX,
                startClientY: e.clientY,
                verticalSegment: Math.abs(segA.x - segB.x) < 1e-4,
                segA: { ...segA },
                segB: { ...segB },
                baseDoc: L.clone(currentDoc)
            };
            scheduleRender();
            return;
        }

        // Empty space: clear selection & pan
        selected = null;
        wireStartPin = null;
        dragState = {
            type: 'pan',
            startClientX: e.clientX,
            startClientY: e.clientY,
            startPanX: renderer.view.panX,
            startPanY: renderer.view.panY,
            clearedSelection: true
        };
        scheduleRender();
    });

    canvas.addEventListener('pointermove', e => {
        if (activePointers.has(e.pointerId)) {
            activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }
        if (pinchState && activePointers.size === 2) {
            const pts = [...activePointers.values()];
            const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y) || 1;
            const midX = (pts[0].x + pts[1].x) / 2;
            const midY = (pts[0].y + pts[1].y) / 2;
            const scale = dist / pinchState.dist;
            const nextZoom = Math.max(0.3, Math.min(2.4, pinchState.zoom * scale));
            const ratio = nextZoom / pinchState.zoom;
            const rect = canvas.getBoundingClientRect();
            const cx = pinchState.midX - rect.left - renderer.width / 2;
            const cy = pinchState.midY - rect.top - renderer.height / 2;
            renderer.view.panX = cx - (cx - pinchState.panX) * ratio + (midX - pinchState.midX);
            renderer.view.panY = cy - (cy - pinchState.panY) * ratio + (midY - pinchState.midY);
            renderer.view.zoom = nextZoom;
            scheduleRender();
            return;
        }

        const worldPt = renderer.world(e.clientX, e.clientY);
        cursorWorld = worldPt;
        const currentDoc = doc();
        const geom = renderer.geometry(currentDoc);

        const nearPin = L.findSnapPin(currentDoc, worldPt, 14 / renderer.view.zoom, null, geom.pins);
        const nextHoverPinKey = nearPin ? nearPin.key : null;
        const pinChanged = nextHoverPinKey !== hoverPinKey;
        hoverPinKey = nextHoverPinKey;

        if (!dragState) {
            if (wireStartPin || L.isPlacementTool(tool) || pinChanged) {
                scheduleRender();
            }
            return;
        }

        if (dragState.type === 'place') {
            dragState.freeSnap = e.shiftKey;
            scheduleRender();
            return;
        }

        if (dragState.type === 'pan') {
            renderer.view.panX = dragState.startPanX + (e.clientX - dragState.startClientX);
            renderer.view.panY = dragState.startPanY + (e.clientY - dragState.startClientY);
            scheduleRender();
            return;
        }

        if (dragState.type === 'wireDrag') {
            const distPx = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
            if (distPx > 6) dragState.moved = true;
            scheduleRender();
            return;
        }

        if (dragState.type === 'moveNode') {
            const distPx = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
            if (distPx > 4) dragState.moved = true;
            if (!dragState.moved) return;

            dragState.freeSnap = e.shiftKey;
            if (!draftDoc) {
                draftDoc = L.clone(dragState.baseDoc);
            }
            const found = L.findNode(draftDoc, dragState.id);
            if (!found) return;

            const dxWorld = worldPt.x - dragState.startWorldX;
            const dyWorld = worldPt.y - dragState.startWorldY;
            found.node.position = {
                x: Math.round(dragState.startNodeX + dxWorld),
                y: Math.round(dragState.startNodeY + dyWorld)
            };
            renderer.invalidate();
            scheduleRender();
            return;
        }

        if (dragState.type === 'moveWire') {
            const distPx = Math.hypot(e.clientX - dragState.startClientX, e.clientY - dragState.startClientY);
            if (distPx > 4) dragState.moved = true;
            if (!dragState.moved) return;

            dragState.freeSnap = e.shiftKey;
            if (!draftDoc) {
                draftDoc = L.clone(dragState.baseDoc);
            }
            const w = draftDoc.wires.find(x => x.id === dragState.id);
            if (!w) return;
            if (dragState.verticalSegment) {
                const x = Math.round(worldPt.x);
                w.waypoints = [
                    { x, y: dragState.segA.y },
                    { x, y: dragState.segB.y }
                ];
            } else {
                const y = Math.round(worldPt.y);
                w.waypoints = [
                    { x: dragState.segA.x, y },
                    { x: dragState.segB.x, y }
                ];
            }
            renderer.invalidate();
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
        cursorWorld = worldPt;

        if (action.type === 'place') {
            placeElementAt(worldPt, e.shiftKey);
            return;
        }

        if (action.type === 'pan') {
            if (action.clearedSelection) {
                syncInspector();
            }
            scheduleRender();
            return;
        }

        if (action.type === 'wireDrag') {
            const geom = renderer.geometry(history.doc);
            const endPin = L.findSnapPin(
                history.doc,
                worldPt,
                20 / renderer.view.zoom,
                action.startPin.role === 'out' ? 'in' : 'out',
                geom.pins
            );
            if (endPin && endPin.key !== action.startPin.key && endPin.nodeId !== action.startPin.nodeId) {
                const next = L.clone(history.doc);
                if (L.connectWire(next, action.startPin, endPin)) {
                    history.commit(next);
                    wireStartPin = null;
                    recomputeAll();
                    return;
                }
            }
            // If user dragged far and released on empty space, cancel wire instead of leaving it stuck!
            const distPx = Math.hypot(e.clientX - action.startClientX, e.clientY - action.startClientY);
            if (distPx > 10) {
                wireStartPin = null;
            }
            scheduleRender();
            return;
        }

        if (action.type === 'moveNode') {
            if (action.moved && draftDoc) {
                const found = L.findNode(draftDoc, action.id);
                if (found) {
                    const snap = $('snapToggle').checked && !e.shiftKey;
                    found.node.position = L.snapPoint(found.node.position, snap);
                    autoConnectDroppedNode(draftDoc, action.id);
                }
                const committed = draftDoc;
                draftDoc = null;
                history.commit(committed);
                recomputeAll();
                return;
            }
            draftDoc = null;
            if (action.kind === 'input' || action.kind === 'const') {
                if (action.onToggle || action.wasSelected || action.kind === 'const') {
                    const found = L.findNode(history.doc, action.id);
                    if (found) {
                        found.node.value = found.node.value ? 0 : 1;
                        recomputeAll();
                        return;
                    }
                }
            }
            syncFormulaBar();
            syncInspector();
            syncDock();
            scheduleRender();
            return;
        }

        if (action.type === 'moveWire') {
            if (action.moved && draftDoc) {
                const w = draftDoc.wires.find(x => x.id === action.id);
                if (w && w.waypoints) {
                    const snap = $('snapToggle').checked && !e.shiftKey;
                    w.waypoints = w.waypoints.map(pt => L.snapPoint(pt, snap));
                }
                const committed = draftDoc;
                draftDoc = null;
                history.commit(committed);
                recomputeAll();
                return;
            }
            draftDoc = null;
            syncInspector();
            scheduleRender();
            return;
        }
    }

    canvas.addEventListener('pointerup', finishPointer);
    canvas.addEventListener('pointercancel', abandonPointers);
    canvas.addEventListener('lostpointercapture', abandonPointers);
    canvas.addEventListener('pointerleave', e => {
        if (!dragState) {
            cursorWorld = null;
            hoverPinKey = null;
            scheduleRender();
        }
    });
    canvas.addEventListener('dblclick', e => {
        const worldPt = renderer.world(e.clientX, e.clientY);
        const geom = renderer.geometry(history.doc);
        const hit = L.hitTest(history.doc, worldPt, {
            touch: false,
            zoom: renderer.view.zoom,
            preferNode: true,
            pins: geom.pins,
            routes: geom.routes
        });
        if (hit && hit.kind === 'wire' && hit.wire.waypoints?.length) {
            const next = L.clone(history.doc);
            const w = next.wires.find(x => x.id === hit.id);
            if (w) {
                w.waypoints = [];
                history.commit(next);
                recomputeAll();
            }
        }
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('blur', abandonPointers);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) abandonPointers();
    });

    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        const nextZoom = Math.max(0.3, Math.min(2.4, renderer.view.zoom * factor));
        const ratio = nextZoom / renderer.view.zoom;
        const rect = canvas.getBoundingClientRect();
        const cx = e.clientX - rect.left - renderer.width / 2;
        const cy = e.clientY - rect.top - renderer.height / 2;
        renderer.view.panX = cx - (cx - renderer.view.panX) * ratio;
        renderer.view.panY = cy - (cy - renderer.view.panY) * ratio;
        renderer.view.zoom = nextZoom;
        scheduleRender();
    }, { passive: false });

    // Keyboard shortcuts
    window.addEventListener('keydown', e => {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                if (history.redo()) recomputeAll();
            } else if (history.undo()) {
                recomputeAll();
            }
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            if (history.redo()) recomputeAll();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
            if (selected) {
                e.preventDefault();
                $('duplicateSelectedBtn').click();
            }
            return;
        }
        if (e.key === 'Escape') {
            wireStartPin = null;
            if (tool !== 'select') setTool('select');
            scheduleRender();
            return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selected) {
                e.preventDefault();
                deleteSelected();
            }
            return;
        }
        if (e.key.toLowerCase() === 'r') {
            if (L.GATE_TYPES.includes(tool)) {
                placementRotation = (placementRotation + 90) % 360;
                scheduleRender();
            } else if (selected && selected.kind === 'gate') {
                $('rotateSelectedBtn').click();
            }
            return;
        }
        if (e.key === ' ' && selected && (selected.kind === 'input' || selected.kind === 'const')) {
            e.preventDefault();
            $('toggleSelectedValueBtn').click();
            return;
        }
        if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') && selected && selected.kind !== 'wire') {
            const next = L.clone(history.doc);
            const found = L.findNode(next, selected.id);
            if (found) {
                e.preventDefault();
                const step = e.shiftKey ? 2 : L.GRID;
                const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
                const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
                found.node.position = {
                    x: found.node.position.x + dx,
                    y: found.node.position.y + dy
                };
                history.commit(next);
                recomputeAll();
            }
            return;
        }
        if (e.key === '[' || e.key === ']') {
            const d = history.doc;
            const list = [
                ...d.inputs.map(n => ({ kind: 'input', id: n.id })),
                ...d.consts.map(n => ({ kind: 'const', id: n.id })),
                ...d.gates.map(n => ({ kind: 'gate', id: n.id })),
                ...d.outputs.map(n => ({ kind: 'output', id: n.id }))
            ];
            if (!list.length) return;
            e.preventDefault();
            const curIdx = selected ? list.findIndex(item => item.id === selected.id) : -1;
            const dir = e.key === ']' ? 1 : -1;
            const nextIdx = (curIdx + dir + list.length) % list.length;
            selected = list[nextIdx];
            syncInspector();
            scheduleRender();
        }
    });

    renderer.onResize = () => {
        scheduleRender();
    };

    // Initial fit & render
    renderer.fit(doc());
    recomputeAll();
})();

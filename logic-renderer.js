(function (root) {
    'use strict';
    const L = root.LogicLab || (root.LogicLab = {});

    const COLORS = {
        bg: '#06070b',
        wire0: '#59677f',
        wire1: '#3dd9ff',
        wire1Glow: 'rgba(61, 217, 255, 0.22)',
        wireFloat: '#7b879c',
        wireLoop: '#ff5a52',
        gateFill: '#0e111a',
        gateFillActive: '#111827',
        gateStroke: '#b9c6da',
        gateStroke1: '#3dd9ff',
        gateStrokeLoop: '#ff5a52',
        selected: '#8b9dff',
        hoverHalo: 'rgba(61, 217, 255, 0.32)',
        text: '#e8eef7',
        muted: '#8fa0b5',
        amber: '#f6b944',
        emerald: '#37e0a1',
        pinFill: '#141824',
        pinHover: '#f6b944'
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

    function traceGateBody(ctx, type) {
        ctx.beginPath();
        if (type === 'AND' || type === 'NAND') {
            ctx.moveTo(-26, -26);
            ctx.lineTo(0, -26);
            ctx.arc(0, 0, 26, -Math.PI / 2, Math.PI / 2, false);
            ctx.lineTo(-26, 26);
            ctx.closePath();
            return;
        }
        if (type === 'OR' || type === 'NOR' || type === 'XOR' || type === 'XNOR') {
            const backX = (type === 'XOR' || type === 'XNOR') ? -24 : -26;
            ctx.moveTo(backX, -26);
            ctx.quadraticCurveTo(6, -26, 26, 0);
            ctx.quadraticCurveTo(6, 26, backX, 26);
            ctx.quadraticCurveTo(backX + 10, 0, backX, -26);
            ctx.closePath();
            return;
        }
        // NOT or BUF
        ctx.moveTo(-24, -22);
        ctx.lineTo(20, 0);
        ctx.lineTo(-24, 22);
        ctx.closePath();
    }

    function inputLeadStopX(type, ly) {
        if (type === 'AND' || type === 'NAND') return -26;
        if (type === 'NOT' || type === 'BUF') return -24;
        const t = Math.min(1, Math.abs(ly) / 26);
        const curveDepth = (1 - t * t) * 9;
        const base = (type === 'XOR' || type === 'XNOR') ? -24 : -26;
        return base + curveDepth;
    }

    class Renderer {
        constructor(canvas) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.view = { panX: 0, panY: 0, zoom: 1 };
            this.width = 0;
            this.height = 0;
            this.dpr = 1;
            this.gridKey = '';
            this.gridLayer = null;
            this.routeCache = null;
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
            const w = Math.max(1, Math.round(rect.width || 600));
            const h = Math.max(1, Math.round(rect.height || 420));
            const cw = Math.round(w * dpr);
            const ch = Math.round(h * dpr);
            if (this.width === w && this.height === h && this.dpr === dpr && this.canvas.width === cw && this.canvas.height === ch) {
                return;
            }
            if (this.width && this.height && (this.width !== w || this.height !== h)) {
                this.view.panX += (this.width - w) / 2;
                this.view.panY += (this.height - h) / 2;
            }
            this.width = w;
            this.height = h;
            this.dpr = dpr;
            this.canvas.width = cw;
            this.canvas.height = ch;
            this.gridKey = '';
        }

        invalidate() {
            this.routeCache = null;
        }

        world(clientX, clientY) {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: (clientX - rect.left - this.width / 2 - this.view.panX) / this.view.zoom,
                y: (clientY - rect.top - this.height / 2 - this.view.panY) / this.view.zoom
            };
        }

        center() {
            return {
                x: -this.view.panX / this.view.zoom,
                y: -this.view.panY / this.view.zoom
            };
        }

        fit(doc) {
            const pins = [...L.allPins(doc).values()];
            if (!pins.length && !doc.inputs.length && !doc.gates.length && !doc.outputs.length && !doc.consts.length) {
                this.view = { panX: 0, panY: 0, zoom: 1 };
                return;
            }
            const pts = [
                ...pins,
                ...doc.inputs.map(n => n.position),
                ...doc.outputs.map(n => n.position),
                ...doc.gates.map(n => n.position),
                ...doc.consts.map(n => n.position)
            ];
            const minX = Math.min(...pts.map(p => p.x)) - 110;
            const maxX = Math.max(...pts.map(p => p.x)) + 110;
            const minY = Math.min(...pts.map(p => p.y)) - 90;
            const maxY = Math.max(...pts.map(p => p.y)) + 90;
            const zoom = Math.max(0.35, Math.min(1.35, this.width / Math.max(200, maxX - minX), this.height / Math.max(180, maxY - minY)));
            this.view = {
                zoom,
                panX: -((minX + maxX) / 2) * zoom,
                panY: -((minY + maxY) / 2) * zoom
            };
        }

        geometry(doc) {
            if (this.routeCache && this.routeCache.doc === doc) {
                return this.routeCache;
            }
            const pins = L.allPins(doc);
            if (typeof L.computeAllWireGeometry === 'function') {
                const wireGeom = L.computeAllWireGeometry(doc, pins);
                this.routeCache = {
                    doc,
                    pins,
                    routes: wireGeom.routes,
                    crossingsByWire: wireGeom.crossingsByWire,
                    verticalSegments: wireGeom.verticalSegments,
                    junctions: wireGeom.junctions
                };
            } else {
                const routes = new Map();
                for (const w of doc.wires) {
                    routes.set(w.id, L.wireRoute(doc, w, pins));
                }
                this.routeCache = {
                    doc,
                    pins,
                    routes,
                    crossingsByWire: new Map(),
                    verticalSegments: [],
                    junctions: []
                };
            }
            return this.routeCache;
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
            // Adaptive grid step when zoomed far out so dot count stays fast and crisp
            const step = zoom < 0.45 ? L.GRID * 2 : L.GRID;

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

        traceSmoothWireWithHops(points, crossings = []) {
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

            // Clamp corner radii near any horizontal crossing so every crossing has room for its full hop arc
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

                    const segCrossXs = crossings
                        .filter(c => (c.segIndex === segIndex || Math.abs(c.y - y) < 1e-3) && c.x >= minX && c.x <= maxX)
                        .map(c => c.x)
                        .sort((a, b) => (a - b) * dirX);

                    const spans = [];
                    for (const cx of segCrossXs) {
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
                        ctx.arc(
                            span.centerX,
                            y,
                            span.radius,
                            dirX > 0 ? Math.PI : 0,
                            dirX > 0 ? 0 : Math.PI,
                            dirX < 0
                        );
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

        drawWirePath(points, state = {}) {
            if (!points || points.length < 2) return;
            const ctx = this.ctx;
            const { live, loop, floating, selected, preview, crossings = [] } = state;

            if (live === 1 && !preview && !loop) {
                ctx.save();
                ctx.strokeStyle = COLORS.wire1Glow;
                ctx.lineWidth = selected ? 9 : 6.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                this.traceSmoothWireWithHops(points, crossings);
                ctx.stroke();
                ctx.restore();
            }

            ctx.save();
            let mainStroke = COLORS.wire0;
            let mainWidth = 2.1;
            if (preview) {
                mainStroke = COLORS.selected;
                ctx.setLineDash([6, 5]);
                mainWidth = 2.2;
            } else if (loop) {
                mainStroke = COLORS.wireLoop;
                mainWidth = selected ? 3.4 : 2.6;
            } else if (floating) {
                mainStroke = selected ? COLORS.selected : COLORS.wireFloat;
                ctx.setLineDash([5, 4]);
                mainWidth = selected ? 2.6 : 1.9;
            } else if (live === 1) {
                mainStroke = selected ? '#9beeff' : COLORS.wire1;
                mainWidth = selected ? 3.3 : 2.5;
            } else {
                mainStroke = selected ? COLORS.selected : COLORS.wire0;
                mainWidth = selected ? 2.9 : 2.1;
            }

            ctx.strokeStyle = mainStroke;
            ctx.lineWidth = mainWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            const renderedArcs = this.traceSmoothWireWithHops(points, crossings);
            ctx.stroke();
            ctx.restore();

            return { renderedArcs, mainStroke, mainWidth, preview };
        }

        drawBridgeHopOverpasses(hopPasses) {
            if (!hopPasses || !hopPasses.length) return;
            const ctx = this.ctx;
            for (const item of hopPasses) {
                if (!item || !item.renderedArcs || !item.renderedArcs.length || item.preview) continue;
                const { renderedArcs, mainStroke, mainWidth } = item;

                // Subtle bridge halo strictly along the upper arch curve (never cutting the vertical wire below!)
                ctx.save();
                ctx.strokeStyle = COLORS.bg;
                ctx.lineWidth = mainWidth + 3.2;
                ctx.lineCap = 'butt';
                ctx.beginPath();
                for (const a of renderedArcs) {
                    ctx.moveTo(
                        a.centerX + a.radius * Math.cos(1.15 * Math.PI),
                        a.y + a.radius * Math.sin(1.15 * Math.PI)
                    );
                    ctx.arc(a.centerX, a.y, a.radius, 1.15 * Math.PI, 1.85 * Math.PI, false);
                }
                ctx.stroke();

                // Re-stroke the full semicircular arch cleanly on top of the vertical wire
                ctx.strokeStyle = mainStroke;
                ctx.lineWidth = mainWidth;
                ctx.lineCap = 'round';
                ctx.beginPath();
                for (const a of renderedArcs) {
                    ctx.moveTo(a.centerX - a.radius, a.y);
                    ctx.arc(a.centerX, a.y, a.radius, Math.PI, 0, false);
                }
                ctx.stroke();
                ctx.restore();
            }
        }

        drawJunctions(junctions, evaluation, hoverNodeId) {
            if (!junctions || !junctions.length) return;
            const ctx = this.ctx;
            for (const j of junctions) {
                const nodeEval = evaluation?.nodes.get(j.nodeId);
                const isOne = Boolean(nodeEval?.valid && nodeEval.live === 1);
                const isLoop = Boolean(nodeEval?.loop);
                const isHover = Boolean(hoverNodeId && hoverNodeId === j.nodeId);

                if (isOne && !isLoop) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(j.x, j.y, 6.5, 0, Math.PI * 2);
                    ctx.fillStyle = COLORS.wire1Glow;
                    ctx.fill();
                    ctx.restore();
                }

                ctx.save();
                ctx.beginPath();
                ctx.arc(j.x, j.y, isHover ? 4.4 : 3.6, 0, Math.PI * 2);
                ctx.fillStyle = isLoop
                    ? COLORS.wireLoop
                    : isHover
                    ? COLORS.selected
                    : isOne
                    ? COLORS.wire1
                    : COLORS.wire0;
                ctx.fill();
                ctx.restore();
            }
        }

        drawInputNode(node, kind, evalNode, isSelected, isHovered, alpha = 1) {
            const ctx = this.ctx;
            const { x, y } = node.position;
            const isOne = Boolean(node.value);
            const label = kind === 'input' ? node.name : 'CONST';

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);

            if (isHovered || isSelected) {
                ctx.strokeStyle = isSelected ? COLORS.selected : COLORS.wire1;
                ctx.lineWidth = 2.4;
                roundedRect(ctx, -38, -22, 66, 44, 10);
                ctx.stroke();
            }

            // Lead to output pin at +36
            ctx.strokeStyle = isOne ? COLORS.wire1 : COLORS.wire0;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(24, 0);
            ctx.lineTo(36, 0);
            ctx.stroke();

            // Outer housing with subtle depth gradient
            const inGrad = ctx.createLinearGradient(0, -18, 0, 18);
            if (isOne) {
                inGrad.addColorStop(0, '#142338');
                inGrad.addColorStop(1, '#0b121e');
            } else {
                inGrad.addColorStop(0, '#141926');
                inGrad.addColorStop(1, '#0b0e16');
            }
            ctx.fillStyle = inGrad;
            ctx.strokeStyle = isSelected ? COLORS.selected : (isOne ? COLORS.wire1 : COLORS.gateStroke);
            ctx.lineWidth = isSelected ? 2.3 : 1.7;
            roundedRect(ctx, -34, -18, 58, 36, 8);
            ctx.fill();
            ctx.stroke();

            // Variable or Constant label fitted cleanly inside left compartment (-34..+1)
            ctx.fillStyle = COLORS.text;
            ctx.font = kind === 'const'
                ? '700 9.5px Inter, system-ui, sans-serif'
                : '700 13px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, -16.5, 0.5, 29);

            // Toggle pill [0 / 1]
            ctx.fillStyle = isOne ? 'rgba(61, 217, 255, 0.22)' : 'rgba(255, 255, 255, 0.06)';
            ctx.strokeStyle = isOne ? COLORS.wire1 : 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 1.2;
            roundedRect(ctx, 1, -12, 19, 24, 5);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isOne ? COLORS.wire1 : COLORS.muted;
            ctx.font = '700 13px Inter, system-ui, sans-serif';
            ctx.fillText(isOne ? '1' : '0', 10.5, 0.5);

            ctx.restore();
        }

        drawOutputNode(node, evalNode, isSelected, isHovered, alpha = 1) {
            const ctx = this.ctx;
            const { x, y } = node.position;
            const valid = Boolean(evalNode && evalNode.valid);
            const loop = Boolean(evalNode && evalNode.loop);
            const live = valid ? evalNode.live : null;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);

            if (isHovered || isSelected) {
                ctx.strokeStyle = isSelected ? COLORS.selected : COLORS.wire1;
                ctx.lineWidth = 2.4;
                roundedRect(ctx, -28, -22, 66, 44, 10);
                ctx.stroke();
            }

            // Lead from input pin at -36
            ctx.strokeStyle = loop ? COLORS.wireLoop : (live === 1 ? COLORS.wire1 : COLORS.wire0);
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(-36, 0);
            ctx.lineTo(-24, 0);
            ctx.stroke();

            // Glow when logic 1
            if (live === 1) {
                const grad = ctx.createRadialGradient(5, 0, 2, 5, 0, 28);
                grad.addColorStop(0, 'rgba(61, 217, 255, 0.28)');
                grad.addColorStop(1, 'rgba(61, 217, 255, 0)');
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(5, 0, 28, 0, Math.PI * 2);
                ctx.fill();
            }

            const outGrad = ctx.createLinearGradient(0, -18, 0, 18);
            if (live === 1) {
                outGrad.addColorStop(0, '#15253b');
                outGrad.addColorStop(1, '#0b1320');
            } else {
                outGrad.addColorStop(0, '#141926');
                outGrad.addColorStop(1, '#0b0e16');
            }
            ctx.fillStyle = outGrad;
            ctx.strokeStyle = isSelected
                ? COLORS.selected
                : loop
                ? COLORS.wireLoop
                : live === 1
                ? COLORS.wire1
                : valid
                ? COLORS.gateStroke
                : COLORS.amber;
            ctx.lineWidth = isSelected ? 2.2 : 1.7;
            roundedRect(ctx, -24, -18, 58, 36, 8);
            ctx.fill();
            ctx.stroke();

            const valStr = loop ? '↻' : valid ? String(live) : '?';
            ctx.fillStyle = loop ? COLORS.wireLoop : live === 1 ? COLORS.wire1 : valid ? COLORS.text : COLORS.amber;
            ctx.font = '700 13px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${node.name} = ${valStr}`, 5, 0.5);

            ctx.restore();
        }

        drawGateNode(gate, evalNode, isSelected, isHovered, alpha = 1) {
            const ctx = this.ctx;
            const { x, y } = gate.position;
            const type = gate.type;
            const fanIn = L.normalizeFanIn(type, gate.fanIn);
            const pinYs = L.gatePinOffsets(fanIn);
            const inverted = L.INVERTING_GATES.has(type);
            const valid = Boolean(evalNode && evalNode.valid);
            const loop = Boolean(evalNode && evalNode.loop);
            const live = valid ? evalNode.live : null;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            ctx.rotate(((gate.rotation || 0) * Math.PI) / 180);

            if (isHovered || isSelected) {
                ctx.fillStyle = isHovered ? COLORS.hoverHalo : 'rgba(139, 157, 255, 0.16)';
                roundedRect(ctx, -44, -32, 88, 64, 14);
                ctx.fill();
            }

            // Input lead lines from x = -48 to gate back wall
            ctx.strokeStyle = COLORS.gateStroke;
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            for (const ly of pinYs) {
                ctx.moveTo(-48, ly);
                ctx.lineTo(inputLeadStopX(type, ly), ly);
            }
            // Output lead line to x = +48
            const frontX = (type === 'NOT' || type === 'BUF') ? 20 : 26;
            const leadStartX = inverted ? frontX + 11 : frontX;
            ctx.moveTo(leadStartX, 0);
            ctx.lineTo(48, 0);
            ctx.stroke();

            // Extra XOR / XNOR input arc
            if (type === 'XOR' || type === 'XNOR') {
                ctx.strokeStyle = isSelected ? COLORS.selected : (live === 1 ? COLORS.wire1 : COLORS.gateStroke);
                ctx.lineWidth = 2.0;
                ctx.beginPath();
                ctx.moveTo(-31, -26);
                ctx.quadraticCurveTo(-21, 0, -31, 26);
                ctx.stroke();
            }

            // Gate main body with subtle surface depth gradient and active glow
            if (live === 1 && !loop) {
                ctx.save();
                ctx.shadowColor = 'rgba(61, 217, 255, 0.28)';
                ctx.shadowBlur = 12;
                traceGateBody(ctx, type);
                ctx.strokeStyle = 'rgba(61, 217, 255, 0.35)';
                ctx.lineWidth = 3.2;
                ctx.stroke();
                ctx.restore();
            }

            const bodyGrad = ctx.createLinearGradient(0, -26, 0, 26);
            if (live === 1) {
                bodyGrad.addColorStop(0, '#16253b');
                bodyGrad.addColorStop(1, '#0c1422');
            } else {
                bodyGrad.addColorStop(0, '#141926');
                bodyGrad.addColorStop(1, '#0b0e16');
            }
            ctx.fillStyle = bodyGrad;
            ctx.strokeStyle = isSelected
                ? COLORS.selected
                : loop
                ? COLORS.wireLoop
                : live === 1
                ? COLORS.gateStroke1
                : COLORS.gateStroke;
            ctx.lineWidth = isSelected ? 2.5 : 2.0;
            traceGateBody(ctx, type);
            ctx.fill();
            ctx.stroke();

            // Inversion bubble for NOT, NAND, NOR, XNOR
            if (inverted) {
                const bx = frontX + 5.5;
                ctx.fillStyle = COLORS.gateFill;
                ctx.beginPath();
                ctx.arc(bx, 0, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
            }

            // Subtle gate label fitted cleanly inside the widest interior region of each gate body
            ctx.save();
            const labelX = (type === 'NOT' || type === 'BUF')
                ? -9.5
                : (type === 'XOR' || type === 'XNOR')
                ? 1.5
                : -1.5;
            const maxLabelW = (type === 'NOT' || type === 'BUF') ? 18 : 24;
            ctx.translate(labelX, 0);
            ctx.rotate(-((gate.rotation || 0) * Math.PI) / 180);
            ctx.fillStyle = live === 1 ? COLORS.wire1 : COLORS.muted;
            ctx.font = (type.length >= 4 || type === 'NOT' || type === 'BUF')
                ? '600 8.5px Inter, system-ui, sans-serif'
                : '600 9.2px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(type, 0, 0.5, maxLabelW);
            ctx.restore();

            ctx.restore();
        }

        drawPins(pins, evaluation, hoverPinKey, activeWireStartPin) {
            const ctx = this.ctx;
            for (const pin of pins.values()) {
                const isHover = hoverPinKey === pin.key;
                const isStart = activeWireStartPin && activeWireStartPin.key === pin.key;
                const isCompatibleTarget = activeWireStartPin && activeWireStartPin.role !== pin.role && activeWireStartPin.nodeId !== pin.nodeId;
                const nodeEval = evaluation?.nodes.get(pin.nodeId);
                const r = (isHover || isStart) ? 5.5 : isCompatibleTarget ? 4.4 : 3.6;

                if (isHover || isStart || isCompatibleTarget) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(pin.x, pin.y, (isHover || isStart) ? 9.5 : 7.5, 0, Math.PI * 2);
                    ctx.fillStyle = (isHover || isStart) ? 'rgba(246, 185, 68, 0.24)' : 'rgba(61, 217, 255, 0.16)';
                    ctx.fill();
                    ctx.restore();
                }

                ctx.beginPath();
                ctx.arc(pin.x, pin.y, r, 0, Math.PI * 2);
                if (isHover || isStart) {
                    ctx.fillStyle = COLORS.pinHover;
                    ctx.fill();
                } else if (isCompatibleTarget) {
                    ctx.fillStyle = COLORS.wire1;
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1.2;
                    ctx.fill();
                    ctx.stroke();
                } else {
                    ctx.fillStyle = (pin.role === 'out' && nodeEval?.valid && nodeEval.live === 1)
                        ? COLORS.wire1
                        : COLORS.pinFill;
                    ctx.strokeStyle = COLORS.gateStroke;
                    ctx.lineWidth = 1.4;
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }

        render(doc, evaluation, uiState = {}) {
            this.resize();
            if (this.width <= 0 || this.height <= 0 || !this.canvas.width || !this.canvas.height) return;

            const ctx = this.ctx;
            const { panX, panY, zoom } = this.view;
            const { pins, routes, crossingsByWire, verticalSegments, junctions } = this.geometry(doc);
            const {
                selected = null,
                hoverNodeId = null,
                hoverPinKey = null,
                wireStartPin = null,
                wirePreviewPath = null,
                placementPreview = null,
                dragSnapPreview = null
            } = uiState;

            // Clear the entire physical backing store in device pixels so zooming/moving never leaves ghost trails
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = COLORS.bg;
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            // Set HiDPI logical pixel transform, draw background grid, then enter world coordinates
            ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
            this.drawGrid();

            ctx.save();
            ctx.translate(this.width / 2 + panX, this.height / 2 + panY);
            ctx.scale(zoom, zoom);

            // 1. Draw wires (with rounded corners and curved intersection bridge hops)
            const hopPasses = [];
            for (const w of doc.wires) {
                const path = routes.get(w.id);
                const wEval = evaluation?.wires.get(w.id);
                const isSel = selected && selected.kind === 'wire' && selected.id === w.id;
                const isHoverSrc = hoverNodeId && w.from.nodeId === hoverNodeId;
                const pass = this.drawWirePath(path, {
                    live: wEval?.live,
                    loop: wEval?.loop,
                    floating: wEval?.floating,
                    selected: isSel || isHoverSrc,
                    crossings: crossingsByWire?.get(w.id) || []
                });
                if (pass && pass.renderedArcs && pass.renderedArcs.length) {
                    hopPasses.push(pass);
                }
            }

            // 1a. Render overpass arches on top of vertical wires (with zero cut below the arch)
            this.drawBridgeHopOverpasses(hopPasses);

            // 1b. Draw solder dots on shared fan-out T-junctions
            this.drawJunctions(junctions, evaluation, hoverNodeId);

            // 2. Active wire preview (also computes live curved hops over vertical wires!)
            if (wirePreviewPath && wirePreviewPath.length >= 2) {
                const previewCrossings = [];
                if (verticalSegments && verticalSegments.length) {
                    for (let i = 1; i < wirePreviewPath.length; i++) {
                        const a = wirePreviewPath[i - 1];
                        const b = wirePreviewPath[i];
                        if (Math.abs(a.y - b.y) < 1e-4 && Math.abs(a.x - b.x) > 14) {
                            const minX = Math.min(a.x, b.x);
                            const maxX = Math.max(a.x, b.x);
                            const y = a.y;
                            for (const v of verticalSegments) {
                                const minY = Math.min(v.a.y, v.b.y);
                                const maxY = Math.max(v.a.y, v.b.y);
                                if (v.a.x > minX + 7 && v.a.x < maxX - 7 && y > minY + 3 && y < maxY - 3) {
                                    previewCrossings.push({ x: v.a.x, y, segIndex: i - 1 });
                                }
                            }
                        }
                    }
                }
                this.drawWirePath(wirePreviewPath, { preview: true, crossings: previewCrossings });
            }

            // 2b. Snapped target shadow while dragging a node smoothly
            if (dragSnapPreview) {
                const { kind, node, point } = dragSnapPreview;
                const ghost = { ...node, position: point };
                if (kind === 'gate') {
                    this.drawGateNode(ghost, null, false, false, 0.28);
                } else if (kind === 'input' || kind === 'const') {
                    this.drawInputNode(ghost, kind, null, false, false, 0.28);
                } else if (kind === 'output') {
                    this.drawOutputNode(ghost, null, false, false, 0.28);
                }
            }

            // 3. Draw nodes
            for (const inp of doc.inputs) {
                const isSel = selected && selected.id === inp.id;
                const isHov = hoverNodeId === inp.id;
                this.drawInputNode(inp, 'input', evaluation?.nodes.get(inp.id), isSel, isHov, 1);
            }
            for (const c of doc.consts) {
                const isSel = selected && selected.id === c.id;
                const isHov = hoverNodeId === c.id;
                this.drawInputNode(c, 'const', evaluation?.nodes.get(c.id), isSel, isHov, 1);
            }
            for (const g of doc.gates) {
                const isSel = selected && selected.id === g.id;
                const isHov = hoverNodeId === g.id;
                this.drawGateNode(g, evaluation?.nodes.get(g.id), isSel, isHov, 1);
            }
            for (const out of doc.outputs) {
                const isSel = selected && selected.id === out.id;
                const isHov = hoverNodeId === out.id;
                this.drawOutputNode(out, evaluation?.nodes.get(out.id), isSel, isHov, 1);
            }

            // 4. Translucent placement preview for ALL tools (inputs, outputs, constants, and gates)
            if (placementPreview) {
                const { tool, point, rotation = 0 } = placementPreview;
                if (L.GATE_TYPES.includes(tool)) {
                    this.drawGateNode(
                        { type: tool, fanIn: L.normalizeFanIn(tool, 2), position: point, rotation },
                        null,
                        false,
                        false,
                        0.58
                    );
                } else if (tool === 'input') {
                    const nextName = L.nextInputName(doc);
                    if (nextName) {
                        this.drawInputNode(
                            { name: nextName, value: 0, position: point },
                            'input',
                            null,
                            false,
                            false,
                            0.58
                        );
                    }
                } else if (tool === 'output') {
                    const nextName = L.nextOutputName(doc);
                    if (nextName) {
                        this.drawOutputNode(
                            { name: nextName, position: point },
                            null,
                            false,
                            false,
                            0.58
                        );
                    }
                } else if (tool === 'const1' || tool === 'const0') {
                    this.drawInputNode(
                        { value: tool === 'const1' ? 1 : 0, position: point },
                        'const',
                        null,
                        false,
                        false,
                        0.58
                    );
                }
            }

            // 5. Draw terminal pins
            this.drawPins(pins, evaluation, hoverPinKey, wireStartPin);

            // 6. Empty workspace prompt (matching Circuits Lab)
            if (!doc.inputs.length && !doc.gates.length && !doc.outputs.length && !doc.consts.length && !placementPreview) {
                ctx.save();
                ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
                ctx.fillStyle = COLORS.muted;
                ctx.font = '500 13px Inter, system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    'Place inputs (A–D), logic gates, and outputs (F–Y), then connect their pins — or choose an example above.',
                    this.width / 2,
                    this.height / 2
                );
                ctx.restore();
            }

            ctx.restore();
        }
    }

    Object.assign(L, {
        COLORS,
        Renderer
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = L;
    }
})(typeof window !== 'undefined' ? window : globalThis);

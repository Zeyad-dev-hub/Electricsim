(function (root) {
    'use strict';

    // =========================================================================
    // ELECTRICSIM — ELECTRONICS LAB 3-MODE EXPORT & TRUE IEEE SCHEMATIC ENGINE
    // =========================================================================
    // Mode 1: Save JSON (.electronics.json) — full editable bench state
    // Mode 2: Save Bench PNG — high-DPI full-color 2D physical bench snapshot
    //         (with embedded ElectricsimData PNG iTXt chunk for drag & drop!)
    // Mode 3: Save Schematic PNG — true textbook IEEE Black & White schematic
    //         translating every 2D physical part into its standard symbol
    //         (with embedded ElectricsimData PNG iTXt chunk for drag & drop!)

    const VALID_KINDS = new Set([
        'ic', 'battery', 'battery9v', 'psu', 'gnd', 'switch', 'pushbutton', 'spdt',
        'dip4', 'resistor', 'potentiometer', 'lamp', 'rgb_led', 'motor', 'buzzer',
        'npn', 'multimeter', 'clock', 'probe', 'seg7', 'seg7_10', 'breadboard'
    ]);

    function validateElectronicsDoc(doc) {
        const errors = [];
        if (!doc || typeof doc !== 'object') return ['Invalid electronics bench document.'];
        if (!Array.isArray(doc.components) || !Array.isArray(doc.wires)) {
            return ['Document must contain components and wires arrays.'];
        }
        if (doc.components.length > 300) errors.push('Maximum of 300 bench components exceeded.');
        if (doc.wires.length > 2000) errors.push('Maximum of 2000 bench wires exceeded.');
        const ids = new Set();
        for (const c of doc.components) {
            if (!c || typeof c !== 'object') { errors.push('Invalid component entry.'); continue; }
            if (!c.id || typeof c.id !== 'string' || ids.has(c.id)) {
                errors.push(`Missing or duplicate component id: ${c.id}`);
            }
            ids.add(c.id);
            if (!VALID_KINDS.has(c.kind)) errors.push(`Unknown Electronics Lab component kind: ${c.kind}`);
            if (!c.position || !Number.isFinite(c.position.x) || !Number.isFinite(c.position.y)) {
                errors.push(`Component ${c.id} has invalid position.`);
            }
        }
        for (const w of doc.wires) {
            if (!w || typeof w !== 'object' || typeof w.from !== 'string' || typeof w.to !== 'string') {
                errors.push('Invalid wire entry.');
            }
        }
        return errors;
    }

    function computeDocWorldBounds(doc, helpers, excludeBreadboards = false) {
        const { getComponentBounds, allICPins, computeICWireGeometry } = helpers;
        const comps = (doc.components || []).filter(c => !excludeBreadboards || c.kind !== 'breadboard');
        if (!comps.length) return null;

        const xs = [];
        const ys = [];
        const pushPt = (x, y) => {
            if (Number.isFinite(x) && Number.isFinite(y)) { xs.push(x); ys.push(y); }
        };

        for (const c of comps) {
            const b = getComponentBounds(c);
            if (b) {
                const left = b.left !== undefined ? b.left : b.x;
                const top = b.top !== undefined ? b.top : b.y;
                const right = b.right !== undefined ? b.right : (b.x + b.w);
                const bottom = b.bottom !== undefined ? b.bottom : (b.y + b.h);
                pushPt(left, top);
                pushPt(right, bottom);
            }
        }
        const pins = allICPins(doc);
        for (const p of pins.values()) {
            if (excludeBreadboards && p.isBreadboardHole) continue;
            pushPt(p.x, p.y);
        }
        const geom = computeICWireGeometry(doc, pins);
        for (const path of geom.routes.values()) {
            for (const pt of path) pushPt(pt.x, pt.y);
        }
        if (!xs.length) return null;
        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys)
        };
    }

    // -------------------------------------------------------------------------
    // MODE 2: HIGH-DPI 2D PHYSICAL BENCH SNAPSHOT PNG
    // -------------------------------------------------------------------------
    function renderBenchPictureCanvas(doc, evalData, liveRenderer, helpers) {
        if (!doc || !(doc.components || []).length) return null;
        const bounds = computeDocWorldBounds(doc, helpers, false);
        if (!bounds) return null;

        const pad = 64;
        const minX = bounds.minX - pad;
        const maxX = bounds.maxX + pad;
        const minY = bounds.minY - pad;
        const maxY = bounds.maxY + pad;
        const w = Math.max(640, Math.ceil(maxX - minX));
        const h = Math.max(380, Math.ceil(maxY - minY));
        const dpr = Math.max(1, Math.min(2.2, 3400 / Math.max(w, h)));

        const off = document.createElement('canvas');
        off.width = Math.round(w * dpr);
        off.height = Math.round(h * dpr);

        const prevCanvas = liveRenderer.canvas;
        const prevCtx = liveRenderer.ctx;
        const prevW = liveRenderer.width;
        const prevH = liveRenderer.height;
        const prevDpr = liveRenderer.dpr;
        const prevView = { ...liveRenderer.view };
        const prevOffscreen = liveRenderer.offscreen;

        try {
            liveRenderer.canvas = off;
            liveRenderer.ctx = off.getContext('2d');
            liveRenderer.width = w;
            liveRenderer.height = h;
            liveRenderer.dpr = dpr;
            liveRenderer.offscreen = true;
            liveRenderer.view = {
                zoom: 1,
                panX: -((minX + maxX) / 2),
                panY: -((minY + maxY) / 2)
            };
            liveRenderer.render(doc, evalData, { exportMode: true });
        } finally {
            liveRenderer.canvas = prevCanvas;
            liveRenderer.ctx = prevCtx;
            liveRenderer.width = prevW;
            liveRenderer.height = prevH;
            liveRenderer.dpr = prevDpr;
            liveRenderer.view = prevView;
            liveRenderer.offscreen = prevOffscreen;
        }
        return off;
    }

    // -------------------------------------------------------------------------
    // MODE 3: TRUE TEXTBOOK IEEE BLACK & WHITE CIRCUIT SCHEMATIC PNG
    // -------------------------------------------------------------------------
    function strokePts(ctx, pts, width = 2) {
        if (!pts || pts.length < 2) return;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();
    }

    function drawSchematicSymbol(ctx, comp, evalData, helpers) {
        const { IC_CATALOG, getDipPinLocal } = helpers;
        const Solver = root.ElectronicsSolver;

        ctx.save();
        ctx.translate(comp.position.x, comp.position.y);
        if (comp.rotation) ctx.rotate((comp.rotation * Math.PI) / 180);
        ctx.strokeStyle = '#000000';
        ctx.fillStyle = '#000000';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const drawText = (txt, x, y, size = 10, bold = true) => {
            ctx.save();
            ctx.translate(x, y);
            if (comp.rotation) ctx.rotate((-comp.rotation * Math.PI) / 180);
            ctx.font = `${bold ? '700' : '500'} ${size}px "Inter", system-ui, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const tw = ctx.measureText(txt).width + 6;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-tw / 2, -size * 0.65, tw, size * 1.3);
            ctx.fillStyle = '#000000';
            ctx.fillText(txt, 0, 0);
            ctx.restore();
        };

        if (comp.kind === 'battery' || comp.kind === 'battery9v' || comp.kind === 'psu') {
            const isPsu = comp.kind === 'psu';
            const cells = comp.kind === 'battery'
                ? Math.max(1, Math.min(4, Number(comp.cells) || (comp.voltage ? Math.round(comp.voltage / 1.5) : 3)))
                : (comp.kind === 'battery9v' ? 2 : 1);
            const vNom = comp.kind === 'battery9v'
                ? 9.0
                : isPsu
                ? Number(comp.voltage ?? 5.0)
                : (comp.voltage && !comp.cells ? Number(comp.voltage) : cells * 1.5);

            if (isPsu) {
                // Bench PSU: circle DC voltage source between (-54, 90) and (+54, 90)
                strokePts(ctx, [{ x: -54, y: 90 }, { x: -54, y: 0 }, { x: -24, y: 0 }], 2);
                strokePts(ctx, [{ x: 24, y: 0 }, { x: 54, y: 0 }, { x: 54, y: 90 }], 2);
                ctx.beginPath();
                ctx.arc(0, 0, 24, 0, Math.PI * 2);
                ctx.fillStyle = '#ffffff';
                ctx.fill();
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.font = '700 12px "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#000000';
                ctx.fillText('−   +', 0, 0);
                drawText(`PSU · ${vNom.toFixed(1)} V`, 0, -36, 10.5);
            } else {
                // Standard IEEE Multi-Cell Battery Symbol (AA: ±108,0 | 9V: ±90,0)
                const pinX = comp.kind === 'battery9v' ? 90 : 108;
                const drawCells = Math.min(4, Math.max(1, cells));
                const span = drawCells * 12;
                strokePts(ctx, [{ x: -pinX, y: 0 }, { x: -span / 2, y: 0 }], 2);
                strokePts(ctx, [{ x: span / 2, y: 0 }, { x: pinX, y: 0 }], 2);
                for (let i = 0; i < drawCells; i++) {
                    const xNeg = -span / 2 + i * 12;
                    const xPos = xNeg + 6;
                    // Short thick negative plate
                    strokePts(ctx, [{ x: xNeg, y: -11 }, { x: xNeg, y: 11 }], 3.4);
                    // Long thin positive plate
                    strokePts(ctx, [{ x: xPos, y: -22 }, { x: xPos, y: 22 }], 1.8);
                    if (i < drawCells - 1) {
                        strokePts(ctx, [{ x: xPos, y: 0 }, { x: xPos + 6, y: 0 }], 1.6);
                    }
                }
                ctx.font = '700 11px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('−', -span / 2 - 14, -14);
                ctx.fillText('+', span / 2 + 14, -14);
                const lbl = comp.kind === 'battery9v' ? '9 V' : `${vNom.toFixed(1)} V (${cells}×AA)`;
                drawText(lbl, 0, -34, 10.5);
            }
        } else if (comp.kind === 'gnd') {
            strokePts(ctx, [{ x: 0, y: -18 }, { x: 0, y: 4 }], 2);
            strokePts(ctx, [{ x: -14, y: 4 }, { x: 14, y: 4 }], 2.2);
            strokePts(ctx, [{ x: -9, y: 9 }, { x: 9, y: 9 }], 2.0);
            strokePts(ctx, [{ x: -4, y: 14 }, { x: 4, y: 14 }], 1.8);
            drawText('GND', 0, 24, 9);
        } else if (comp.kind === 'resistor') {
            // IEEE 6-peak zig-zag resistor symbol (pins at ±72, 0)
            strokePts(ctx, [
                { x: -72, y: 0 }, { x: -30, y: 0 },
                { x: -25, y: -10 }, { x: -15, y: 10 }, { x: -5, y: -10 },
                { x: 5, y: 10 }, { x: 15, y: -10 }, { x: 25, y: 10 },
                { x: 30, y: 0 }, { x: 72, y: 0 }
            ], 2.0);
            const ohmsText = Solver ? Solver.formatOhms(comp.ohms || 220) : `${comp.ohms || 220} Ω`;
            const rLabel = comp.label && !/[ΩkM]/i.test(comp.label) ? `${comp.label} · ${ohmsText}` : ohmsText;
            drawText(rLabel, 0, -22, 10.5);
        } else if (comp.kind === 'potentiometer') {
            // IEEE Potentiometer symbol (zig-zag resistor + perpendicular wiper arrow, Tinkercad 1U pins at y=36)
            strokePts(ctx, [
                { x: -36, y: 36 }, { x: -36, y: 0 }, { x: -24, y: 0 },
                { x: -20, y: -9 }, { x: -12, y: 9 }, { x: -4, y: -9 },
                { x: 4, y: 9 }, { x: 12, y: -9 }, { x: 20, y: 9 },
                { x: 24, y: 0 }, { x: 36, y: 0 }, { x: 36, y: 36 }
            ], 2.0);
            strokePts(ctx, [{ x: 0, y: 36 }, { x: 0, y: 11 }], 2.0);
            strokePts(ctx, [{ x: -6, y: 18 }, { x: 0, y: 11 }, { x: 6, y: 18 }], 2.0);
            const ohmsText = Solver ? Solver.formatOhms(comp.ohms || 10000) : `${comp.ohms || 10000} Ω`;
            drawText(`POT · ${ohmsText} (${Math.round((comp.wiper ?? comp.knob ?? 0.5) * 100)}%)`, 0, -24, 10.5);
        } else if (comp.kind === 'lamp') {
            // IEEE LED symbol (diode triangle + cathode bar + 2 light-emission arrows, Tinkercad 1U pins at ±18,0)
            strokePts(ctx, [{ x: -18, y: 0 }, { x: -10, y: 0 }], 2);
            strokePts(ctx, [{ x: 10, y: 0 }, { x: 18, y: 0 }], 2);
            ctx.beginPath();
            ctx.moveTo(-10, -11);
            ctx.lineTo(-10, 11);
            ctx.lineTo(10, 0);
            ctx.closePath();
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.stroke();
            strokePts(ctx, [{ x: 10, y: -11 }, { x: 10, y: 11 }], 2.4);
            strokePts(ctx, [{ x: -2, y: -13 }, { x: 6, y: -23 }], 1.6);
            strokePts(ctx, [{ x: 2, y: -23 }, { x: 6, y: -23 }, { x: 6, y: -19 }], 1.6);
            strokePts(ctx, [{ x: 6, y: -11 }, { x: 14, y: -21 }], 1.6);
            strokePts(ctx, [{ x: 10, y: -21 }, { x: 14, y: -21 }, { x: 14, y: -17 }], 1.6);
            drawText(`${comp.label || 'LED'} (${comp.color || 'green'})`, 0, 22, 9.5);
        } else if (comp.kind === 'rgb_led') {
            // Clean 3-channel common-cathode schematic block (pins at y=36)
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-60, -24, 120, 40);
            ctx.lineWidth = 2;
            ctx.strokeRect(-60, -24, 120, 40);
            for (const [lx, tag] of [[-54, 'R'], [-18, '−'], [18, 'G'], [54, 'B']]) {
                strokePts(ctx, [{ x: lx, y: 16 }, { x: lx, y: 36 }], 2);
                drawText(tag, lx, 0, 9.5);
            }
            drawText('RGB LED', 0, -16, 9.5);
        } else if (comp.kind === 'switch') {
            strokePts(ctx, [{ x: -36, y: 0 }, { x: -14, y: 0 }], 2);
            strokePts(ctx, [{ x: 14, y: 0 }, { x: 36, y: 0 }], 2);
            strokePts(ctx, [{ x: -14, y: 0 }, comp.closed ? { x: 14, y: 0 } : { x: 12, y: -14 }], 2.2);
            for (const cx of [-14, 14]) {
                ctx.beginPath(); ctx.arc(cx, 0, 3, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 1.8; ctx.stroke();
            }
            drawText(`${comp.label || 'SW'} (${comp.closed ? 'ON' : 'OFF'})`, 0, 18, 9.5);
        } else if (comp.kind === 'pushbutton') {
            // Standard momentary pushbutton bridge switch symbol across paired pins (±36, ±36)
            strokePts(ctx, [{ x: -36, y: -36 }, { x: -16, y: -36 }, { x: -16, y: 36 }, { x: -36, y: 36 }], 2);
            strokePts(ctx, [{ x: 36, y: -36 }, { x: 16, y: -36 }, { x: 16, y: 36 }, { x: 36, y: 36 }], 2);
            const yBar = comp.pressed ? 0 : -11;
            strokePts(ctx, [{ x: -16, y: yBar }, { x: 16, y: yBar }], 2.4);
            strokePts(ctx, [{ x: 0, y: yBar }, { x: 0, y: yBar - 14 }], 2);
            strokePts(ctx, [{ x: -9, y: yBar - 14 }, { x: 9, y: yBar - 14 }], 2.4);
            for (const cx of [-16, 16]) {
                ctx.beginPath(); ctx.arc(cx, 0, 3.2, 0, Math.PI * 2); ctx.fillStyle = '#000000'; ctx.fill();
            }
            drawText(comp.label || 'PUSH', 0, 44, 9.5);
        } else if (comp.kind === 'spdt') {
            // 3-Terminal SPDT Switch (pins at -36/0/+36, y=36)
            strokePts(ctx, [{ x: -36, y: 36 }, { x: -36, y: -6 }, { x: -16, y: -6 }], 2);
            strokePts(ctx, [{ x: 36, y: 36 }, { x: 36, y: -6 }, { x: 16, y: -6 }], 2);
            strokePts(ctx, [{ x: 0, y: 36 }, { x: 0, y: 8 }], 2);
            const targetX = (comp.positionThrow || comp.throwPos) === 'right' ? 16 : -16;
            strokePts(ctx, [{ x: 0, y: 8 }, { x: targetX, y: -6 }], 2.4);
            for (const [cx, cy] of [[-16, -6], [16, -6], [0, 8]]) {
                ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 1.8; ctx.stroke();
            }
            drawText('SPDT', 0, -24, 9.5);
        } else if (comp.kind === 'motor') {
            // IEEE DC Motor Circle (M) symbol (pins at -108, ±18)
            strokePts(ctx, [{ x: -108, y: -18 }, { x: -34, y: -18 }, { x: -34, y: -10 }, { x: -24, y: -10 }], 2);
            strokePts(ctx, [{ x: -108, y: 18 }, { x: -34, y: 18 }, { x: -34, y: 10 }, { x: -24, y: 10 }], 2);
            ctx.beginPath();
            ctx.arc(4, 0, 26, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 2.2;
            ctx.stroke();
            ctx.font = '800 20px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#000000';
            ctx.fillText('M', 4, 1);
            const ms = evalData?.motorStates?.get(comp.id);
            const rpmVal = ms ? Math.round(Math.abs(ms.absRpm ?? ms.rpm ?? 0)) : 0;
            drawText(rpmVal > 0 ? `DC MOTOR · ${rpmVal} RPM` : 'DC MOTOR', 4, -38, 10);
        } else if (comp.kind === 'buzzer') {
            // Piezo Buzzer symbol (Tinkercad 2U breadboard pins at ±36, 36)
            strokePts(ctx, [{ x: -36, y: 36 }, { x: -18, y: 36 }, { x: -18, y: 12 }], 2);
            strokePts(ctx, [{ x: 36, y: 36 }, { x: 18, y: 36 }, { x: 18, y: 12 }], 2);
            ctx.beginPath();
            ctx.arc(0, 12, 24, Math.PI, 0, false);
            ctx.closePath();
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.stroke();
            drawText('BUZZER', 0, -24, 10);
        } else if (comp.kind === 'npn') {
            // Authentic IEEE NPN Bipolar Junction Transistor Symbol (Tinkercad 1U pins: E: -36,36, B: 0,36, C: +36,36)
            ctx.beginPath();
            ctx.arc(0, -4, 22, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 1.8;
            ctx.stroke();
            strokePts(ctx, [{ x: -11, y: 4 }, { x: 11, y: 4 }], 3.0);
            strokePts(ctx, [{ x: 0, y: 4 }, { x: 0, y: 36 }], 2);
            strokePts(ctx, [{ x: -6, y: 4 }, { x: -18, y: 14 }, { x: -36, y: 36 }], 2);
            ctx.beginPath();
            ctx.moveTo(-16, 12);
            ctx.lineTo(-10, 11);
            ctx.lineTo(-13, 17);
            ctx.closePath();
            ctx.fillStyle = '#000000';
            ctx.fill();
            strokePts(ctx, [{ x: 6, y: 4 }, { x: 18, y: 14 }, { x: 36, y: 36 }], 2);
            drawText('2N2222 (NPN)', 0, -34, 9.5);
            drawText('E', -36, 48, 9);
            drawText('B', 0, 48, 9);
            drawText('C', 36, 48, 9);
        } else if (comp.kind === 'multimeter') {
            // Digital Multimeter symbol (pins at ±36, 126)
            strokePts(ctx, [{ x: -36, y: 126 }, { x: -36, y: 40 }, { x: -18, y: 26 }], 2);
            strokePts(ctx, [{ x: 36, y: 126 }, { x: 36, y: 40 }, { x: 18, y: 26 }], 2);
            ctx.beginPath();
            ctx.arc(0, 0, 30, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 2.2;
            ctx.stroke();
            const mode = comp.mode || 'V';
            const sym = mode === 'mA' ? 'A' : mode === 'ohm' ? 'Ω' : 'V';
            ctx.font = '800 20px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#000000';
            ctx.fillText(sym, 0, 1);
            const mst = evalData?.meterStates?.get(comp.id);
            drawText(mst ? `DMM: ${mst.display}` : 'DMM', 0, -40, 10);
        } else if (comp.kind === 'ic') {
            const spec = IC_CATALOG[comp.model];
            if (spec) {
                const pinCount = spec.pinCount || 14;
                const halfW = pinCount === 16 ? 150 : 132;
                const halfH = 56;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-halfW, -halfH, halfW * 2, halfH * 2);
                ctx.lineWidth = 2.2;
                ctx.strokeRect(-halfW, -halfH, halfW * 2, halfH * 2);
                // Orientation notch
                ctx.beginPath();
                ctx.arc(-halfW, 0, 10, -Math.PI / 2, Math.PI / 2, false);
                ctx.stroke();

                ctx.font = '700 8.5px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                for (let p = 1; p <= pinCount; p++) {
                    const loc = getDipPinLocal(p, pinCount);
                    const yEdge = loc.row === 'top' ? -halfH : halfH;
                    strokePts(ctx, [{ x: loc.x, y: yEdge }, { x: loc.x, y: loc.y }], 1.8);
                    const lbl = p === (spec.vccPin || 14) ? `${p}·VCC`
                        : p === (spec.gndPin || 7) ? `${p}·GND`
                        : (spec.msi && spec.pinLabels?.[p]) ? `${p}·${spec.pinLabels[p]}` : String(p);
                    ctx.fillStyle = '#000000';
                    ctx.fillText(lbl, loc.x, loc.row === 'top' ? -halfH + 11 : halfH - 11);
                }
                ctx.font = '800 13px "JetBrains Mono", monospace';
                ctx.fillStyle = '#000000';
                ctx.fillText(spec.partNumber, 0, -6);
                ctx.font = '600 9.5px "Inter", sans-serif';
                ctx.fillText(spec.description, 0, 10);
            }
        } else if (comp.kind === 'seg7_10') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-80, -86, 160, 172);
            ctx.lineWidth = 2.2;
            ctx.strokeRect(-80, -86, 160, 172);
            const topPins = [[-72, 'g'], [-36, 'f'], [0, 'COM'], [36, 'a'], [72, 'b']];
            const botPins = [[-72, 'e'], [-36, 'd'], [0, 'COM'], [36, 'c'], [72, 'dp']];
            for (const [px, lbl] of topPins) {
                strokePts(ctx, [{ x: px, y: -108 }, { x: px, y: -86 }], 1.8);
                drawText(lbl, px, -72, 8.5);
            }
            for (const [px, lbl] of botPins) {
                strokePts(ctx, [{ x: px, y: 86 }, { x: px, y: 108 }], 1.8);
                drawText(lbl, px, 72, 8.5);
            }
            drawText('7-SEG (10-PIN)', 0, 0, 10.5);
        } else if (comp.kind === 'dip4' || comp.kind === 'seg7' || comp.kind === 'clock' || comp.kind === 'probe') {
            const w = (comp.kind === 'dip4' || comp.kind === 'seg7') ? 60 : 56;
            const h = (comp.kind === 'dip4' || comp.kind === 'seg7') ? 132 : 34;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(-w / 2, -h / 2, w, h);
            ctx.lineWidth = 2;
            ctx.strokeRect(-w / 2, -h / 2, w, h);
            if (typeof helpers.getComponentPins === 'function') {
                for (const pin of helpers.getComponentPins(comp)) {
                    const lx = pin.x - comp.position.x;
                    const ly = pin.y - comp.position.y;
                    const rx = comp.rotation ? 0 : lx;
                    if (!comp.rotation) {
                        const edgeX = rx > 0 ? w / 2 : -w / 2;
                        strokePts(ctx, [{ x: edgeX, y: ly }, { x: lx, y: ly }], 1.8);
                    }
                }
            }
            const title = comp.kind === 'dip4' ? 'DIP-4' : comp.kind === 'seg7' ? '7-SEG' : comp.kind === 'clock' ? 'CLK 1Hz' : 'PROBE';
            drawText(title, 0, 0, 10);
        }

        ctx.restore();
    }

    function renderTrueSchematicCanvas(doc, evalData, helpers) {
        if (!doc || !(doc.components || []).length) return null;
        const hasNonBB = doc.components.some(c => c.kind !== 'breadboard');
        const bounds = computeDocWorldBounds(doc, helpers, hasNonBB);
        if (!bounds) return null;

        const pad = 72;
        const minX = bounds.minX - pad;
        const maxX = bounds.maxX + pad;
        const minY = bounds.minY - pad;
        const maxY = bounds.maxY + pad;
        const w = Math.max(640, Math.ceil(maxX - minX));
        const h = Math.max(380, Math.ceil(maxY - minY));
        const dpr = Math.max(1, Math.min(2.5, 3400 / Math.max(w, h)));

        const off = document.createElement('canvas');
        off.width = Math.round(w * dpr);
        off.height = Math.round(h * dpr);
        const ctx = off.getContext('2d');

        // Pure crisp white paper background
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, off.width, off.height);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.save();
        ctx.translate(w / 2 - (minX + maxX) / 2, h / 2 - (minY + maxY) / 2);

        const pins = helpers.allICPins(doc);
        const geom = helpers.computeICWireGeometry(doc, pins, evalData?.pinToNet);

        // 1. Draw breadboard internal net bus lines (clean black schematic connections for strips linking 2+ items)
        if (evalData && evalData.breadboardNets) {
            const activePointsByStrip = new Map();
            const addStripPt = (stripId, pt) => {
                if (!activePointsByStrip.has(stripId)) activePointsByStrip.set(stripId, []);
                activePointsByStrip.get(stripId).push(pt);
            };
            for (const [compPinKey, holeKey] of (evalData.pluggedPinMap || new Map()).entries()) {
                const hole = pins.get(holeKey);
                if (hole) addStripPt(hole.stripId, { x: hole.x, y: hole.y });
            }
            for (const wire of (doc.wires || [])) {
                for (const k of [wire.from, wire.to]) {
                    const p = pins.get(k);
                    if (p && p.isBreadboardHole) addStripPt(p.stripId, { x: p.x, y: p.y });
                }
            }
            for (const pts of activePointsByStrip.values()) {
                if (pts.length < 2) continue;
                pts.sort((a, b) => (a.x !== b.x ? a.x - b.x : a.y - b.y));
                strokePts(ctx, [pts[0], pts[pts.length - 1]], 2.0);
                for (const pt of pts) {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 3.4, 0, Math.PI * 2);
                    ctx.fillStyle = '#000000';
                    ctx.fill();
                }
            }
        }

        // 2. Draw all orthogonal wires in pure black with white-haloed bridge hops
        for (const wire of (doc.wires || [])) {
            const path = geom.routes.get(wire.id);
            if (!path || path.length < 2) continue;
            const crossings = geom.crossingsByWire?.get(wire.id) || [];
            ctx.save();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2.0;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(path[0].x, path[0].y);
            for (let i = 1; i < path.length; i++) {
                const a = path[i - 1], b = path[i];
                const segCross = crossings.filter(c => c.segIndex === i - 1).sort((p, q) => (b.x > a.x ? p.x - q.x : q.x - p.x));
                if (segCross.length && Math.abs(a.y - b.y) < 1e-4) {
                    const dir = b.x > a.x ? 1 : -1;
                    for (const c of segCross) {
                        const r = 6;
                        ctx.lineTo(c.x - dir * r, a.y);
                        ctx.arc(c.x, a.y, r, dir > 0 ? Math.PI : 0, dir > 0 ? 0 : Math.PI, dir < 0);
                    }
                }
                ctx.lineTo(b.x, b.y);
            }
            ctx.stroke();
            ctx.restore();

            // Optional wire label tag in clean black text
            if (wire.label && path.length >= 2) {
                const mid = path[Math.floor(path.length / 2)];
                ctx.save();
                ctx.font = '700 9px "JetBrains Mono", monospace';
                const tw = ctx.measureText(wire.label).width + 6;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(mid.x - tw / 2, mid.y - 14, tw, 13);
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(wire.label, mid.x, mid.y - 7.5);
                ctx.restore();
            }
        }

        // 3. Draw solid black schematic solder dots at wire junctions
        for (const j of (geom.junctions || [])) {
            ctx.beginPath();
            ctx.arc(j.x, j.y, 3.6, 0, Math.PI * 2);
            ctx.fillStyle = '#000000';
            ctx.fill();
        }

        // 4. Draw standard IEEE schematic symbol for every non-breadboard component
        for (const comp of (doc.components || [])) {
            if (comp.kind === 'breadboard') continue;
            drawSchematicSymbol(ctx, comp, evalData, helpers);
        }

        // 5. Subtle IEEE Title Block in bottom-right corner
        ctx.restore();
        ctx.save();
        ctx.fillStyle = '#475569';
        ctx.font = '600 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('Electricsim · Engineering Schematic (Drag & drop PNG to edit)', w - 16, h - 12);
        ctx.restore();

        return off;
    }

    const ElectronicsExport = {
        VALID_KINDS,
        validateElectronicsDoc,
        renderBenchPictureCanvas,
        renderTrueSchematicCanvas
    };

    root.ElectronicsExport = ElectronicsExport;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ElectronicsExport;
    }
})(typeof window !== 'undefined' ? window : globalThis);

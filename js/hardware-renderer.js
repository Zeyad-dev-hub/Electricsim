(function (root) {
    'use strict';

    // =========================================================================
    // ELECTRICSIM — UNIFIED NATIVE-VECTOR 2.5D STUDIO HARDWARE RENDERER
    // =========================================================================
    // 100% original, zero-masking parametric Canvas 2D vector engine inspired
    // by Tinkercad Circuits. Every component shares:
    //   • Unified elevated top-down 2.5D perspective & top-left (-35°) lighting
    //   • Consistent two-layer physical contact + ambient drop shadows
    //   • Unified tinned-copper / brushed-chrome metallic lead shader
    //   • Exact 1 U = 36 px (0.1") breadboard pin-to-hole calibration (0.0 px error)
    //   • Instant 0 ms render with zero external assets & zero canvas tainting
    //   • Pure-white creative IEEE technical schematic renderer for palette cards

    function rRect(ctx, x, y, w, h, r) {
        const rad = Math.max(0, Math.min(r, w / 2, h / 2));
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.arcTo(x + w, y, x + w, y + h, rad);
        ctx.arcTo(x + w, y + h, x, y + h, rad);
        ctx.arcTo(x, y + h, x, y, rad);
        ctx.arcTo(x, y, x + w, y, rad);
        ctx.closePath();
    }

    // Two-layer studio drop shadow helper (soft ambient + tight contact shadow)
    function withPhysicalShadow(ctx, drawFn, ambientBlur = 12, ambientY = 5, contactBlur = 3.5, contactY = 1.8) {
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.44)';
        ctx.shadowBlur = ambientBlur;
        ctx.shadowOffsetX = 1.2;
        ctx.shadowOffsetY = ambientY;
        drawFn();
        ctx.restore();

        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.56)';
        ctx.shadowBlur = contactBlur;
        ctx.shadowOffsetX = 0.5;
        ctx.shadowOffsetY = contactY;
        drawFn();
        ctx.restore();
    }

    // Unified single-piece tinned-copper / brushed-nickel lead shader
    function drawMetallicLead(ctx, pts, width = 3.4) {
        if (!pts || pts.length < 2) return;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Contact shadow beneath lead
        ctx.save();
        ctx.translate(0.8, 2.0);
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.34)';
        ctx.lineWidth = width + 1.4;
        ctx.stroke();
        ctx.restore();

        // Dark oxidized hairline rim
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = width + 1.4;
        ctx.stroke();

        // Brushed nickel-silver core
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = width;
        ctx.stroke();

        // Top specular highlight spine
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.lineWidth = Math.max(1.0, width * 0.34);
        ctx.stroke();

        // Crisp rounded solder tip at final pin endpoint
        const tip = pts[pts.length - 1];
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, width * 0.52, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
    }

    // Curved glossy insulated jumper/exit wire (for batteries & DC motor)
    function drawInsulatedLead(ctx, p0, c1, c2, p1, outerCol, mainCol, width = 4.4) {
        ctx.save();
        ctx.lineCap = 'round';
        // Soft drop shadow
        ctx.save();
        ctx.translate(0, 2.8);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p1.x, p1.y);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.lineWidth = width + 2.2;
        ctx.stroke();
        ctx.restore();

        // Outer insulation border
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p1.x, p1.y);
        ctx.strokeStyle = outerCol;
        ctx.lineWidth = width + 1.8;
        ctx.stroke();

        // Main colored PVC jacket
        ctx.strokeStyle = mainCol;
        ctx.lineWidth = width;
        ctx.stroke();

        // Glossy top specular line
        ctx.save();
        ctx.translate(0, -0.7);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();

        // Exposed tinned wire tip at p1
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 2.7, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
    }

    // Auto-counter-rotated pill badge (ALWAYS upright at 0°, 90°, 180°, 270°!)
    function drawPillBadge(ctx, x, y, text, severity = 'info') {
        if (!text) return;
        ctx.save();
        ctx.translate(x, y);
        if (typeof ctx.getTransform === 'function') {
            const tm = ctx.getTransform();
            const ang = Math.atan2(tm.b, tm.a);
            if (Math.abs(ang) > 0.01) ctx.rotate(-ang);
        }
        ctx.font = '800 10.5px "JetBrains Mono", Consolas, monospace';
        const tw = ctx.measureText(text).width + 14;
        const th = 19;
        rRect(ctx, -tw / 2, -th / 2, tw, th, 9.5);
        if (severity === 'error') {
            ctx.fillStyle = 'rgba(153, 27, 27, 0.96)';
            ctx.strokeStyle = '#fca5a5';
        } else if (severity === 'warn') {
            ctx.fillStyle = 'rgba(120, 53, 15, 0.96)';
            ctx.strokeStyle = '#fcd34d';
        } else if (severity === 'ok') {
            ctx.fillStyle = 'rgba(6, 78, 59, 0.94)';
            ctx.strokeStyle = '#34d399';
        } else {
            ctx.fillStyle = 'rgba(10, 15, 28, 0.92)';
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.52)';
        }
        ctx.fill();
        ctx.lineWidth = 1.25;
        ctx.stroke();

        ctx.fillStyle = severity === 'error' ? '#fef2f2'
            : severity === 'warn' ? '#fef3c7'
            : severity === 'ok' ? '#a7f3d0'
            : '#f1f5f9';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0.5);
        ctx.restore();
    }

    function drawMicroTag(ctx, x, y, text, color = '#f8fafc') {
        ctx.save();
        ctx.translate(x, y);
        if (typeof ctx.getTransform === 'function') {
            const tm = ctx.getTransform();
            const ang = Math.atan2(tm.b, tm.a);
            if (Math.abs(ang) > 0.01) ctx.rotate(-ang);
        }
        ctx.font = '800 9px "JetBrains Mono", Consolas, monospace';
        const tw = Math.max(14, ctx.measureText(text).width + 6);
        rRect(ctx, -tw / 2, -6.5, tw, 13, 3.5);
        ctx.fillStyle = 'rgba(10, 15, 28, 0.88)';
        ctx.fill();
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 0.5);
        ctx.restore();
    }

    function drawSelectionFrame(ctx, x, y, w, h) {
        ctx.save();
        ctx.setLineDash([6, 4]);
        rRect(ctx, x, y, w, h, 10);
        ctx.strokeStyle = '#8b9dff';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();
    }

    // =========================================================================
    // 1. NATIVE-VECTOR 2.5D SOLDERLESS BREADBOARD (HALF 30-COL & MINI 17-COL)
    // =========================================================================
    function drawBreadboard(ctx, comp, spec, evalData, isSelected, hoverStripId) {
        if (!spec) return false;
        const w = spec.width;
        const h = spec.height;
        const hw = w / 2;
        const hh = h / 2;
        const isHalf = spec.variant !== 'mini';

        // 1. Physical cast shadow + subtle 3D bottom lip (2.5D thickness)
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -hw, -hh, w, h, 14);
            ctx.fillStyle = '#cfcec7';
            ctx.fill();
        }, 22, 9, 5, 3);

        // 2. Main molded off-white ABS body with subtle top-left directional studio sheen
        const bodyGrad = ctx.createLinearGradient(-hw, -hh, hw * 0.4, hh);
        bodyGrad.addColorStop(0, '#f3f2ee');
        bodyGrad.addColorStop(0.45, '#eae9e4');
        bodyGrad.addColorStop(1, '#deddd7');
        rRect(ctx, -hw, -hh, w, h - 5, 13);
        ctx.fillStyle = bodyGrad;
        ctx.fill();

        // Crisp upper bevel catch-light
        ctx.save();
        rRect(ctx, -hw + 1, -hh + 1, w - 2, h - 7, 12);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();

        // Molded interlocking side dovetail tabs (left & right edges like real breadboards)
        ctx.save();
        ctx.fillStyle = '#dcdbd5';
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
        ctx.lineWidth = 1.1;
        for (const ty of (isHalf ? [-190, 190] : [-120, 120])) {
            // Right protruding tab
            rRect(ctx, hw - 2, ty - 16, 8, 32, 3);
            ctx.fill();
            ctx.stroke();
            // Left recessed notch
            rRect(ctx, -hw - 1, ty - 16, 7, 32, 2);
            ctx.fillStyle = '#c9c8c2';
            ctx.fill();
            ctx.fillStyle = '#dcdbd5';
        }
        ctx.restore();

        // 3. Recessed center DIP-IC trough (-38..+38, cleanly framing Row e=-72 and Row f=+72)
        const trGrad = ctx.createLinearGradient(0, -34, 0, 34);
        trGrad.addColorStop(0, '#c8c7c1');
        trGrad.addColorStop(0.18, '#d8d7d1');
        trGrad.addColorStop(0.84, '#dddcda');
        trGrad.addColorStop(1, '#f4f3ef');
        rRect(ctx, -hw + 14, -34, w - 28, 68, 6);
        ctx.fillStyle = trGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(100, 116, 139, 0.24)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // 4. Power Rail Divider Grooves, Red (+) & Blue (−) Silkscreen Stripes (Half Breadboard)
        if (isHalf) {
            // Subtle molded snap-off rail channel grooves at ±256 (clean 2U=72px rail-to-strip separation)
            for (const gy of [-256, 256]) {
                ctx.beginPath();
                ctx.moveTo(-hw + 14, gy);
                ctx.lineTo(hw - 14, gy);
                ctx.strokeStyle = 'rgba(100, 116, 139, 0.28)';
                ctx.lineWidth = 1.6;
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-hw + 14, gy + 1.5);
                ctx.lineTo(hw - 14, gy + 1.5);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
                ctx.lineWidth = 1.0;
                ctx.stroke();
            }

            // Crisp Red (+) and Blue (−) Power Bus Lines
            const lineL = -hw + 32;
            const lineR = hw - 32;
            ctx.lineCap = 'round';
            ctx.lineWidth = 3.2;

            ctx.strokeStyle = '#dc2626';
            ctx.beginPath();
            ctx.moveTo(lineL, -347); ctx.lineTo(lineR, -347);
            ctx.moveTo(lineL, 267);  ctx.lineTo(lineR, 267);
            ctx.stroke();

            ctx.strokeStyle = '#2563eb';
            ctx.beginPath();
            ctx.moveTo(lineL, -267); ctx.lineTo(lineR, -267);
            ctx.moveTo(lineL, 347);  ctx.lineTo(lineR, 347);
            ctx.stroke();

            // Bold + and − Rail Polarity Symbols
            ctx.font = '900 14px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#dc2626';
            ctx.fillText('+', -hw + 18, spec.topRailPosY);
            ctx.fillText('+', hw - 18, spec.topRailPosY);
            ctx.fillText('+', -hw + 18, spec.botRailPosY);
            ctx.fillText('+', hw - 18, spec.botRailPosY);

            ctx.fillStyle = '#2563eb';
            ctx.fillText('−', -hw + 18, spec.topRailNegY);
            ctx.fillText('−', hw - 18, spec.topRailNegY);
            ctx.fillText('−', -hw + 18, spec.botRailNegY);
            ctx.fillText('−', hw - 18, spec.botRailNegY);
        }

        // 5. Crisp Silkscreen Row Letters (a..e, f..j) & Column Numbers (1, 5, 10, 15, 20, 25, 30)
        ctx.font = '800 11px "JetBrains Mono", Consolas, monospace';
        ctx.fillStyle = '#526071';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const topNames = ['a', 'b', 'c', 'd', 'e'];
        const botNames = ['f', 'g', 'h', 'i', 'j'];
        for (let r = 0; r < 5; r++) {
            ctx.fillText(topNames[r], -hw + 19, spec.topRows[r]);
            ctx.fillText(topNames[r], hw - 19, spec.topRows[r]);
            ctx.fillText(botNames[r], -hw + 19, spec.botRows[r]);
            ctx.fillText(botNames[r], hw - 19, spec.botRows[r]);
        }
        for (let c = 0; c < spec.cols; c++) {
            const colNum = c + 1;
            if (colNum === 1 || colNum % 5 === 0 || colNum === spec.cols) {
                const lx = spec.startX + c * spec.pitch;
                ctx.fillText(String(colNum), lx, -241);
                ctx.fillText(String(colNum), lx, 241);
            }
        }

        // 6. Dynamic Breadboard Tie-Point Row / Rail Hover Highlight
        if (hoverStripId && hoverStripId.startsWith(comp.id + ':')) {
            const localStrip = hoverStripId.slice(comp.id.length + 1);
            ctx.save();
            ctx.fillStyle = 'rgba(56, 189, 248, 0.28)';
            ctx.strokeStyle = 'rgba(14, 165, 233, 0.88)';
            ctx.lineWidth = 2.2;
            if (localStrip.startsWith('top_') || localStrip.startsWith('bot_')) {
                const isTop = localStrip.startsWith('top_');
                const colNum = parseInt(localStrip.split('_')[1], 10);
                if (colNum >= 1 && colNum <= spec.cols) {
                    const lx = spec.startX + (colNum - 1) * spec.pitch;
                    const y0 = isTop ? spec.topRows[0] - 14 : spec.botRows[0] - 14;
                    const sh = (isTop ? spec.topRows[4] - spec.topRows[0] : spec.botRows[4] - spec.botRows[0]) + 28;
                    rRect(ctx, lx - 13, y0, 26, sh, 7);
                    ctx.fill();
                    ctx.stroke();
                }
            } else if (isHalf && localStrip.startsWith('rail_')) {
                const ry = localStrip === 'rail_top_pos' ? spec.topRailPosY
                    : localStrip === 'rail_top_neg' ? spec.topRailNegY
                    : localStrip === 'rail_bot_pos' ? spec.botRailPosY
                    : spec.botRailNegY;
                rRect(ctx, spec.startX + 22, ry - 12, (spec.cols - 2) * spec.pitch + 28, 24, 7);
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        }

        // 7. 3D Chamfered Tie-Point Socket Wells with Subtle Internal Metallic Spring Glint
        const drawSocketHole = (lx, ly) => {
            // Outer recessed square chamfer bevel
            ctx.fillStyle = '#c4c3bc';
            ctx.fillRect(lx - 6.8, ly - 6.8, 13.6, 13.6);
            // Bottom-right bright chamfer catch-light
            ctx.fillStyle = '#f8f8f5';
            ctx.fillRect(lx - 5.8, ly + 5.2, 12.6, 1.6);
            ctx.fillRect(lx + 5.2, ly - 5.8, 1.6, 12.6);
            // Deep charcoal socket well
            ctx.fillStyle = '#1b1f27';
            ctx.fillRect(lx - 4.8, ly - 4.8, 9.6, 9.6);
            // Subtle metallic spring clip shimmer inside socket
            ctx.fillStyle = 'rgba(148, 163, 184, 0.34)';
            ctx.fillRect(lx - 3.6, ly - 1.2, 1.8, 2.4);
            ctx.fillRect(lx + 1.8, ly - 1.2, 1.8, 2.4);
        };

        for (let c = 0; c < spec.cols; c++) {
            const lx = spec.startX + c * spec.pitch;
            for (let r = 0; r < 5; r++) {
                drawSocketHole(lx, spec.topRows[r]);
                drawSocketHole(lx, spec.botRows[r]);
            }
            if (isHalf && !(c === 0 || c === 6 || c === 12 || c === 18 || c === 24)) {
                drawSocketHole(lx, spec.topRailPosY);
                drawSocketHole(lx, spec.topRailNegY);
                drawSocketHole(lx, spec.botRailPosY);
                drawSocketHole(lx, spec.botRailNegY);
            }
        }

        // 8. Clean Subtle Metallic-Cyan Socket Collar on Plugged-In Component Holes
        if (evalData && evalData.pluggedPinMap && evalData.pins) {
            for (const holeKey of evalData.pluggedPinMap.values()) {
                if (!holeKey.startsWith(comp.id + ':')) continue;
                const holePin = evalData.pins.get(holeKey);
                if (!holePin) continue;
                const lx = holePin.lx !== undefined ? holePin.lx : (holePin.x - comp.position.x);
                const ly = holePin.ly !== undefined ? holePin.ly : (holePin.y - comp.position.y);
                ctx.save();
                rRect(ctx, lx - 6.2, ly - 6.2, 12.4, 12.4, 3);
                ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(14, 165, 233, 0.85)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            }
        }

        // Outer crisp silhouette border
        rRect(ctx, -hw, -hh, w, h, 14);
        ctx.strokeStyle = isSelected ? '#8b9dff' : 'rgba(15, 23, 42, 0.58)';
        ctx.lineWidth = isSelected ? 3.4 : 2.0;
        ctx.stroke();
        return true;
    }

    // =========================================================================
    // 2. 3-TERMINAL SPDT SLIDE SWITCH — TRUE TOP-DOWN 2.5D (ZERO MASKING!)
    // =========================================================================
    // Exact 1U pins: T1 (-36, +36), COM (0, +36), T2 (+36, +36)
    function drawSpdt(ctx, comp, evalData, isSelected) {
        const right = (comp.positionThrow || comp.throwPos) === 'right';

        // 1. Three single-piece native tinned pins exiting cleanly from bottom face into exact 1U holes
        drawMetallicLead(ctx, [{ x: -36, y: 12 }, { x: -36, y: 36 }], 3.8);
        drawMetallicLead(ctx, [{ x: 0, y: 12 }, { x: 0, y: 36 }], 3.8);
        drawMetallicLead(ctx, [{ x: 36, y: 12 }, { x: 36, y: 36 }], 3.8);

        // 2. Molded dark-polymer lower body lip + brushed-steel outer metal frame (104 x 46px, y=-34..+12)
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -52, -32, 104, 48, 6);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
        }, 12, 5, 3, 2);

        // Dark polymer lower skirt visible along bottom edge (2.5D elevation)
        rRect(ctx, -52, -28, 104, 44, 6);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        // Brushed steel upper housing plate
        const steelGrad = ctx.createLinearGradient(-52, -34, 52, 10);
        steelGrad.addColorStop(0, '#cbd5e1');
        steelGrad.addColorStop(0.28, '#94a3b8');
        steelGrad.addColorStop(0.62, '#64748b');
        steelGrad.addColorStop(1, '#475569');
        rRect(ctx, -52, -34, 104, 44, 5.5);
        ctx.fillStyle = steelGrad;
        ctx.fill();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 4 folded stainless steel crimp ears along top & bottom edges
        ctx.fillStyle = '#334155';
        for (const cx of [-38, 30]) {
            rRect(ctx, cx, -34, 8, 4.5, 1); ctx.fill();
            rRect(ctx, cx, 5.5, 8, 4.5, 1); ctx.fill();
        }

        // Inner dark bezel frame
        rRect(ctx, -43, -26, 86, 28, 3.5);
        ctx.fillStyle = '#1e2430';
        ctx.fill();
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Deep recessed slide track slot
        rRect(ctx, -34, -21, 68, 18, 2.5);
        const slotGrad = ctx.createLinearGradient(0, -21, 0, -3);
        slotGrad.addColorStop(0, '#04060a');
        slotGrad.addColorStop(0.55, '#0b101b');
        slotGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = slotGrad;
        ctx.fill();

        // Subtle exposed copper contact trace on active side inside slot
        ctx.fillStyle = right ? 'rgba(52, 211, 153, 0.28)' : 'rgba(56, 189, 248, 0.28)';
        rRect(ctx, right ? -31 : 7, -15, 24, 6, 1.5);
        ctx.fill();

        // 3. Physically Sliding Ridged Matte-Black Tactile Actuator Knob
        const kx = right ? 16 : -16;
        // Directional shadow inside slot
        ctx.save();
        rRect(ctx, kx - 13.5, -22, 27, 23, 3.5);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
        ctx.fill();
        ctx.restore();

        // Molded ridged black slider block
        const knobGrad = ctx.createLinearGradient(kx - 14, -25, kx + 14, -1);
        knobGrad.addColorStop(0, '#475569');
        knobGrad.addColorStop(0.25, '#272f3d');
        knobGrad.addColorStop(0.75, '#111622');
        knobGrad.addColorStop(1, '#090c14');
        rRect(ctx, kx - 14, -24.5, 28, 24, 3.5);
        ctx.fillStyle = knobGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.55)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Tactile vertical grip ribs on slider thumb
        for (const rx of [-7.5, -2.5, 2.5, 7.5]) {
            ctx.beginPath();
            ctx.moveTo(kx + rx, -21);
            ctx.lineTo(kx + rx, -4);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(kx + rx + 1.2, -21);
            ctx.lineTo(kx + rx + 1.2, -4);
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.58)';
            ctx.lineWidth = 1.0;
            ctx.stroke();
        }

        // Tiny glowing direction indicator pip on top of steel rim
        ctx.beginPath();
        ctx.arc(right ? 46 : -46, -12, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = right ? '#34d399' : '#38bdf8';
        ctx.fill();

        drawPillBadge(ctx, 0, -48, `${comp.label || 'SPDT'} · ${right ? 'T2 →' : '← T1'}`, 'info');
        if (isSelected) drawSelectionFrame(ctx, -58, -40, 116, 84);
        return true;
    }

    // =========================================================================
    // 3. ROTARY POTENTIOMETER — TRUE TOP-DOWN 2.5D BLUE TRIMPOT DIAL
    // =========================================================================
    // Exact 1U pins: T1 (-36, +36), Wiper (0, +36), T2 (+36, +36)
    function drawPotentiometer(ctx, comp, evalData, isSelected, solverMod) {
        const wiper = Math.max(0, Math.min(1, Number(comp.wiper ?? comp.knob ?? 0.5)));
        const ohms = Number(comp.ohms) || 10000;
        const st = evalData?.potStates?.get(comp.id);
        const fmt = solverMod ? solverMod.formatOhms(ohms) : `${ohms}Ω`;

        // 1. Three single-piece native tinned leads exiting cleanly into (-36, 36), (0, 36), (+36, 36)
        drawMetallicLead(ctx, [{ x: -36, y: 12 }, { x: -36, y: 36 }], 3.8);
        drawMetallicLead(ctx, [{ x: 0, y: 12 }, { x: 0, y: 36 }], 3.8);
        drawMetallicLead(ctx, [{ x: 36, y: 12 }, { x: 36, y: 36 }], 3.8);

        // 2. Molded Cobalt-Blue Square Housing (82 x 74px, y=-58..+16) with 2.5D thickness
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -41, -56, 82, 74, 8);
            ctx.fillStyle = '#172554';
            ctx.fill();
        }, 12, 5, 3.5, 2);

        // Lower 3D thickness lip
        rRect(ctx, -41, -52, 82, 70, 8);
        ctx.fillStyle = '#1e3a8a';
        ctx.fill();

        // Top molded blue ABS deck
        const blueGrad = ctx.createLinearGradient(-41, -58, 41, 14);
        blueGrad.addColorStop(0, '#3b82f6');
        blueGrad.addColorStop(0.45, '#2563eb');
        blueGrad.addColorStop(1, '#1d4ed8');
        rRect(ctx, -41, -58, 82, 70, 8);
        ctx.fillStyle = blueGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Subtle recessed corner screw indents
        for (const [sx, sy] of [[-33, -50], [33, -50], [-33, 4], [33, 4]]) {
            ctx.beginPath();
            ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
            ctx.fill();
        }

        // 3. Brushed Metallic Circular Nut / Bushing Ring & Calibration Scale at (0, -23)
        const cx = 0, cy = -23;
        const startAng = (135 * Math.PI) / 180;
        const sweepAng = (270 * Math.PI) / 180;
        const curAng = startAng + wiper * sweepAng;

        // Metallic bezel collar
        const rimGrad = ctx.createLinearGradient(cx - 30, cy - 30, cx + 30, cy + 30);
        rimGrad.addColorStop(0, '#e2e8f0');
        rimGrad.addColorStop(0.5, '#94a3b8');
        rimGrad.addColorStop(1, '#475569');
        ctx.beginPath();
        ctx.arc(cx, cy, 31, 0, Math.PI * 2);
        ctx.fillStyle = rimGrad;
        ctx.fill();

        // Dark recessed dial well
        ctx.beginPath();
        ctx.arc(cx, cy, 27.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        // Calibration ticks around 270° arc
        for (let i = 0; i <= 10; i++) {
            const a = startAng + (i / 10) * sweepAng;
            const r1 = i % 5 === 0 ? 22.5 : 24;
            const r2 = 26.8;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
            ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
            ctx.strokeStyle = i / 10 <= wiper + 0.01 ? '#38bdf8' : 'rgba(148, 163, 184, 0.45)';
            ctx.lineWidth = i % 5 === 0 ? 1.6 : 1.0;
            ctx.stroke();
        }

        // Active wiper progress arc
        ctx.beginPath();
        ctx.arc(cx, cy, 24.5, startAng, curAng);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.stroke();

        // 4. Knurled Matte-Charcoal Rotary Knob with Fluted Grip & Pointer Notch
        ctx.save();
        ctx.translate(cx, cy);
        // Subtle shadow under knob
        ctx.beginPath();
        ctx.arc(1.2, 2.2, 20.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fill();

        // Fluted knurled outer rim
        ctx.rotate(curAng);
        ctx.beginPath();
        const teeth = 18;
        for (let i = 0; i < teeth * 2; i++) {
            const a = (i / (teeth * 2)) * Math.PI * 2;
            const rr = i % 2 === 0 ? 20.5 : 19.0;
            if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
            else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // Brushed dark-metallic top cap
        const capGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 17.5);
        capGrad.addColorStop(0, '#64748b');
        capGrad.addColorStop(0.55, '#334155');
        capGrad.addColorStop(1, '#0f172a');
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fillStyle = capGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(226, 232, 240, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.stroke();

        // High-contrast crisp amber/white pointer indicator groove
        ctx.beginPath();
        ctx.moveTo(3, 0);
        ctx.lineTo(15.5, 0);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        if (st?.overloaded) {
            drawPillBadge(ctx, 0, -72, `🔥 POT HOT · ${(st.powerW || 0).toFixed(2)}W`, 'error');
        } else {
            drawPillBadge(ctx, 0, -72, `${comp.label || 'POT'} · ${fmt} (${Math.round(wiper * 100)}%)`, 'info');
        }
        if (isSelected) drawSelectionFrame(ctx, -48, -64, 96, 108);
        return true;
    }

    // =========================================================================
    // 4. 4-PIN TACTILE PUSH BUTTON — TRUE TOP-DOWN 2.5D 6x6mm SWITCH (4 LEGS ONLY!)
    // =========================================================================
    // Exact 2U x 2U pins: (-36, -36), (+36, -36), (-36, +36), (+36, +36)
    function drawPushButton(ctx, comp, evalData, isSelected) {
        const down = Boolean(comp.pressed);

        // 1. Exactly 4 single-piece gull-wing metallic legs landing cleanly at (±36, ±36) — ZERO double legs!
        drawMetallicLead(ctx, [{ x: -24, y: -24 }, { x: -36, y: -24 }, { x: -36, y: -36 }], 3.6);
        drawMetallicLead(ctx, [{ x: 24, y: -24 },  { x: 36, y: -24 },  { x: 36, y: -36 }], 3.6);
        drawMetallicLead(ctx, [{ x: -24, y: 24 },  { x: -36, y: 24 },  { x: -36, y: 36 }], 3.6);
        drawMetallicLead(ctx, [{ x: 24, y: 24 },   { x: 36, y: 24 },   { x: 36, y: 36 }], 3.6);

        // 2. Molded charcoal polymer base (62 x 62px) with 2.5D thickness
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -31, -30, 62, 62, 6);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
        }, 11, 5, 3, 1.8);

        rRect(ctx, -31, -31, 62, 62, 6);
        ctx.fillStyle = '#1e2430';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 3. Brushed stainless-steel top bezel plate (54 x 54px)
        const plateGrad = ctx.createLinearGradient(-27, -27, 27, 27);
        plateGrad.addColorStop(0, '#e2e8f0');
        plateGrad.addColorStop(0.35, '#cbd5e1');
        plateGrad.addColorStop(0.75, '#94a3b8');
        plateGrad.addColorStop(1, '#64748b');
        rRect(ctx, -27, -27, 54, 54, 4.5);
        ctx.fillStyle = plateGrad;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // 4 dark circular corner heat-stake rivets with tiny specular catch-lights
        for (const [rx, ry] of [[-19, -19], [19, -19], [-19, 19], [19, 19]]) {
            ctx.beginPath();
            ctx.arc(rx, ry, 4.3, 0, Math.PI * 2);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(rx - 1.1, ry - 1.1, 1.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
            ctx.fill();
        }

        // Recessed actuator ring well
        ctx.beginPath();
        ctx.arc(0, 0, 18.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        // 4. Tactile Plunger Cap (physically depresses with collapsed shadow when pressed!)
        const capR = down ? 14.8 : 16.2;
        if (!down) {
            ctx.beginPath();
            ctx.arc(1.5, 2.5, capR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
            ctx.fill();
        }
        const capGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, capR);
        if (down) {
            capGrad.addColorStop(0, '#334155');
            capGrad.addColorStop(0.7, '#18202c');
            capGrad.addColorStop(1, '#0b1019');
        } else {
            capGrad.addColorStop(0, '#475569');
            capGrad.addColorStop(0.55, '#1e293b');
            capGrad.addColorStop(1, '#090d16');
        }
        ctx.beginPath();
        ctx.arc(0, down ? 0.6 : 0, capR, 0, Math.PI * 2);
        ctx.fillStyle = capGrad;
        ctx.fill();

        // Subtle tactile ring rim (soft emerald when ON, brushed metal when OFF)
        ctx.strokeStyle = down ? '#34d399' : 'rgba(148, 163, 184, 0.55)';
        ctx.lineWidth = down ? 2.2 : 1.3;
        ctx.stroke();

        // Specular crescent highlight on plunger cap
        ctx.beginPath();
        ctx.arc(-1, down ? -0.4 : -1, capR * 0.68, Math.PI * 1.15, Math.PI * 1.72);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1.6;
        ctx.lineCap = 'round';
        ctx.stroke();

        const tag = comp.label || 'BTN';
        drawPillBadge(ctx, 0, 50, down ? `${tag} · ON` : tag, down ? 'ok' : 'info');
        if (isSelected) drawSelectionFrame(ctx, -44, -44, 88, 88);
        return true;
    }

    // =========================================================================
    // 5. VARIABLE 4-BAND AXIAL RESISTOR — SINGLE-PASS CLIPPED 3D DOG-BONE BODY
    // =========================================================================
    // Exact 4U pins: (-72, 0) and (+72, 0)
    function drawResistor(ctx, comp, evalData, isSelected, solverMod) {
        const ohms = Math.max(1, Number(comp.ohms) || 220);
        const st = evalData?.resistorStates?.get(comp.id);
        const bands = solverMod ? solverMod.getResistorBands(ohms) : ['#dc2626', '#dc2626', '#7c3f1d', '#d4af37'];
        const fmt = solverMod ? solverMod.formatOhms(ohms) : `${ohms}Ω`;
        const hot = Boolean(st?.overloaded);

        // 1. Single-piece tinned axial leads running straight into exact 4U (±72, 0) sockets
        drawMetallicLead(ctx, [{ x: -38, y: 0 }, { x: -72, y: 0 }], 3.6);
        drawMetallicLead(ctx, [{ x: 38, y: 0 }, { x: 72, y: 0 }], 3.6);

        // Helper for authentic dog-bone ceramic axial resistor silhouette
        const traceDogBone = () => {
            ctx.beginPath();
            ctx.moveTo(-36, -11.5);
            ctx.bezierCurveTo(-41, -11.5, -42, -7, -42, 0);
            ctx.bezierCurveTo(-42, 7, -41, 11.5, -36, 11.5);
            ctx.lineTo(-27, 11.5);
            ctx.bezierCurveTo(-22, 11.5, -20, 9.2, -15, 9.2);
            ctx.lineTo(15, 9.2);
            ctx.bezierCurveTo(20, 9.2, 22, 11.5, 27, 11.5);
            ctx.lineTo(36, 11.5);
            ctx.bezierCurveTo(41, 11.5, 42, 7, 42, 0);
            ctx.bezierCurveTo(42, -7, 41, -11.5, 36, -11.5);
            ctx.lineTo(27, -11.5);
            ctx.bezierCurveTo(22, -11.5, 20, -9.2, 15, -9.2);
            ctx.lineTo(-15, -9.2);
            ctx.bezierCurveTo(-20, -9.2, -22, -11.5, -27, -11.5);
            ctx.closePath();
        };

        // Physical 2-layer shadow under dog-bone ceramic body
        withPhysicalShadow(ctx, () => {
            traceDogBone();
            ctx.fillStyle = '#8a6334';
            ctx.fill();
        }, 10, 4.5, 3, 1.8);

        // 2. Single clipped pass: ceramic base + 4 dynamic EIA bands + continuous 3D cylindrical lighting OVER the bands!
        ctx.save();
        traceDogBone();
        ctx.clip();

        // Warm ceramic beige cylinder base
        const bodyGrad = ctx.createLinearGradient(0, -12, 0, 12);
        if (hot) {
            bodyGrad.addColorStop(0, '#78350f');
            bodyGrad.addColorStop(0.5, '#451a03');
            bodyGrad.addColorStop(1, '#1c0a00');
        } else {
            bodyGrad.addColorStop(0, '#f7e5c3');
            bodyGrad.addColorStop(0.28, '#e6c592');
            bodyGrad.addColorStop(0.72, '#c59b62');
            bodyGrad.addColorStop(1, '#8c6638');
        }
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(-44, -14, 88, 28);

        // 4 EIA Color Bands — organically clipped to the curved dog-bone shoulders & waist!
        const bandSpecs = [
            { x: -31.5, w: 6.8, col: bands[0] || '#dc2626' }, // Digit 1 (left shoulder)
            { x: -13.5, w: 6.4, col: bands[1] || '#dc2626' }, // Digit 2 (waist)
            { x: -0.5,  w: 6.4, col: bands[2] || '#7c3f1d' }, // Multiplier (waist)
            { x: 24.5,  w: 6.2, col: bands[3] || '#d4af37' }  // Tolerance (right shoulder)
        ];
        for (const b of bandSpecs) {
            ctx.fillStyle = b.col;
            ctx.fillRect(b.x, -14, b.w, 28);
        }

        // Continuous cylindrical studio sheen + bottom shadow OVER BOTH ceramic & bands (zero flat paste seam!)
        const sheenGrad = ctx.createLinearGradient(0, -12, 0, 12);
        sheenGrad.addColorStop(0.0,  'rgba(255, 255, 255, 0.28)');
        sheenGrad.addColorStop(0.22, 'rgba(255, 255, 255, 0.44)');
        sheenGrad.addColorStop(0.38, 'rgba(255, 255, 255, 0.04)');
        sheenGrad.addColorStop(0.68, 'rgba(0, 0, 0, 0.06)');
        sheenGrad.addColorStop(1.0,  'rgba(0, 0, 0, 0.42)');
        ctx.fillStyle = sheenGrad;
        ctx.fillRect(-44, -14, 88, 28);
        ctx.restore();

        // Crisp subtle rim around dog-bone body
        traceDogBone();
        ctx.strokeStyle = hot ? '#ef4444' : 'rgba(69, 44, 18, 0.55)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Overheat thermal bloom
        if (hot) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 38);
            g.addColorStop(0, 'rgba(255, 130, 50, 0.72)');
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, 38, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            drawPillBadge(ctx, 0, -24, `🔥 HOT · ${(st.powerW || 0).toFixed(2)}W`, 'error');
        }

        drawPillBadge(ctx, 0, 23, fmt, 'info');
        if (isSelected) drawSelectionFrame(ctx, -78, -20, 156, 40);
        return true;
    }

    // =========================================================================
    // 6. 5mm LED — AUTHENTIC TRANSLUCENT GLASS DOME + INTERNAL LEAD FRAME
    // =========================================================================
    // Exact 1U pins: Anode (-18, 0), Cathode (+18, 0)
    const LED_PALETTES = {
        red:     { main: '#dc2626', bright: '#ff5252', dark: '#5c0e14', glow: '#ff3b30', core: '#ffe4e6' },
        emerald: { main: '#16a34a', bright: '#4ade80', dark: '#0b4423', glow: '#22c55e', core: '#dcfce7' },
        green:   { main: '#16a34a', bright: '#4ade80', dark: '#0b4423', glow: '#22c55e', core: '#dcfce7' },
        amber:   { main: '#d97706', bright: '#fbbf24', dark: '#5c2d06', glow: '#f59e0b', core: '#fef3c7' },
        cyan:    { main: '#0284c7', bright: '#38bdf8', dark: '#0c3554', glow: '#06b6d4', core: '#e0f2fe' }
    };

    function drawLed(ctx, comp, evalData, isSelected) {
        const st = evalData?.lampStates?.get(comp.id) || { lit: false, brightness: 0, overloaded: false, currentMa: 0 };
        const pal = LED_PALETTES[comp.color || 'emerald'] || LED_PALETTES.emerald;
        const lit = Boolean(st.lit && !st.overloaded);
        const br = lit ? Math.max(0.35, Math.min(1, st.brightness || 0.85)) : 0;

        // 1. Two clean single-piece untinted chrome leads landing directly into (-18, 0) and (+18, 0)
        // Left Anode (+) has classic slight kink; right Cathode (−) drops cleanly straight
        drawMetallicLead(ctx, [{ x: -9, y: -15 }, { x: -18, y: -8 }, { x: -18, y: 0 }], 3.2);
        drawMetallicLead(ctx, [{ x: 9, y: -15 },  { x: 18, y: -8 },  { x: 18, y: 0 }], 3.2);

        // 5mm LED silhouette path (rounded dome + flat right cathode flange)
        const traceLedDome = () => {
            ctx.beginPath();
            ctx.moveTo(-21, -14);
            ctx.lineTo(-21, -20);
            ctx.lineTo(-18.5, -20);
            ctx.lineTo(-18.5, -45);
            ctx.arc(0, -45, 18.5, Math.PI, 0, false);
            ctx.lineTo(18.5, -20);
            ctx.lineTo(19.5, -20); // Authentic clipped flat cathode edge on right!
            ctx.lineTo(19.5, -14);
            ctx.closePath();
        };

        // Physical shadow under dome
        withPhysicalShadow(ctx, () => {
            traceLedDome();
            ctx.fillStyle = pal.dark;
            ctx.fill();
        }, 12, 5, 3, 2);

        // 2. Translucent Epoxy Dome Fill
        ctx.save();
        traceLedDome();
        if (st.overloaded) {
            const bGrad = ctx.createRadialGradient(-4, -46, 3, 0, -40, 28);
            bGrad.addColorStop(0, '#7c2d12');
            bGrad.addColorStop(0.55, '#1f2937');
            bGrad.addColorStop(1, '#090d16');
            ctx.fillStyle = bGrad;
        } else if (lit) {
            const lGrad = ctx.createRadialGradient(-4, -46, 3, 0, -42, 28);
            lGrad.addColorStop(0, '#ffffff');
            lGrad.addColorStop(0.26, pal.core);
            lGrad.addColorStop(0.58, pal.bright);
            lGrad.addColorStop(0.88, pal.main);
            lGrad.addColorStop(1, pal.dark);
            ctx.fillStyle = lGrad;
        } else {
            const oGrad = ctx.createLinearGradient(-19, -62, 19, -15);
            oGrad.addColorStop(0, pal.bright);
            oGrad.addColorStop(0.38, pal.main);
            oGrad.addColorStop(1, pal.dark);
            ctx.globalAlpha = 0.84;
            ctx.fillStyle = oGrad;
        }
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.clip();

        // 3. Authentic Internal Metal Lead Frame (Anode Post + Angled Cathode Reflector Cup + Gold Bond Wire + Die)
        ctx.fillStyle = lit ? 'rgba(255, 255, 255, 0.56)' : 'rgba(226, 232, 240, 0.44)';
        // Left Anode Post
        ctx.fillRect(-10.5, -36, 4.2, 23);
        // Right Cathode Anvil / Cup
        ctx.beginPath();
        ctx.moveTo(2, -39);
        ctx.lineTo(11.5, -39);
        ctx.lineTo(11.5, -13);
        ctx.lineTo(6.2, -13);
        ctx.lineTo(6.2, -29);
        ctx.lineTo(2, -33);
        ctx.closePath();
        ctx.fill();

        // Hair-thin golden bond wire
        ctx.beginPath();
        ctx.moveTo(-6.5, -35);
        ctx.quadraticCurveTo(0, -42, 6.2, -38);
        ctx.strokeStyle = lit ? '#fef08a' : 'rgba(250, 204, 21, 0.58)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Glowing semiconductor die on cathode cup when lit
        if (lit) {
            ctx.beginPath();
            ctx.arc(6.2, -38, 3.8, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }

        // Translucent molded collar band at base
        ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
        ctx.fillRect(-21, -20, 41, 4.5);

        // Glass specular crescent highlight on upper-left dome
        ctx.beginPath();
        ctx.ellipse(-7.5, -49, 4.2, 10.5, 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.44)';
        ctx.fill();
        ctx.restore();

        // Crisp outer glass edge
        traceLedDome();
        ctx.strokeStyle = st.overloaded ? '#ef4444' : (lit ? pal.core : pal.bright);
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 4. Additive Radial Optical Halo when lit (or scorched flare when popped)
        if (lit) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const rOuter = 30 + br * 28;
            const g = ctx.createRadialGradient(0, -42, 4, 0, -42, rOuter);
            g.addColorStop(0, pal.core);
            g.addColorStop(0.28, pal.glow);
            g.addColorStop(0.62, pal.main + '55');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = 0.52 + br * 0.44;
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, -42, rOuter, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (st.overloaded) {
            // Crack lightning mark across burned dome
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(-6, -54); ctx.lineTo(1, -44); ctx.lineTo(-4, -38); ctx.lineTo(6, -28);
            ctx.strokeStyle = '#fb923c';
            ctx.lineWidth = 1.8;
            ctx.stroke();
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(0, -42, 3, 0, -42, 36);
            g.addColorStop(0, 'rgba(255, 160, 80, 0.82)');
            g.addColorStop(0.45, 'rgba(239, 68, 68, 0.58)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, -42, 36, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Subtle + / − polarity micro-markers
        ctx.font = '800 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fca5a5';
        ctx.fillText('+', -26, -2);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('−', 26, -2);

        if (st.overloaded) {
            drawPillBadge(ctx, 0, -78, `🔥 POP · ${(st.currentMa || 0).toFixed(0)}mA`, 'error');
        } else if (lit && st.currentMa > 0.2) {
            drawPillBadge(ctx, 0, 20, `${comp.label || 'LED'} · ${st.currentMa.toFixed(1)}mA`, 'ok');
        } else {
            drawPillBadge(ctx, 0, 20, comp.label || 'LED', 'info');
        }

        if (isSelected) drawSelectionFrame(ctx, -28, -70, 56, 80);
        return true;
    }

    // =========================================================================
    // 7. 4-LEG RGB LED — CLEAR/DIFFUSED 5mm DOME WITH LIVE R+G+B MIXING
    // =========================================================================
    // Exact 1U pins: R (-54, +36), COM- (-18, +36), G (+18, +36), B (+54, +36)
    function drawRgbLed(ctx, comp, evalData, isSelected) {
        const st = evalData?.rgbStates?.get(comp.id) || {
            r: { brightness: 0, currentMa: 0 },
            g: { brightness: 0, currentMa: 0 },
            b: { brightness: 0, currentMa: 0 },
            overloaded: false
        };
        const rVal = Math.round(255 * Math.min(1, st.r.brightness || 0));
        const gVal = Math.round(255 * Math.min(1, st.g.brightness || 0));
        const bVal = Math.round(255 * Math.min(1, st.b.brightness || 0));
        const maxB = Math.max(st.r.brightness || 0, st.g.brightness || 0, st.b.brightness || 0);
        const lit = !st.overloaded && maxB > 0.05;

        // 1. Four clean single-piece splayed chrome leads landing at exact (-54, -18, +18, +54 @ y=+36)
        drawMetallicLead(ctx, [{ x: -16, y: -4 }, { x: -46, y: 16 }, { x: -54, y: 36 }], 3.0);
        drawMetallicLead(ctx, [{ x: -6,  y: -4 }, { x: -15, y: 16 }, { x: -18, y: 36 }], 3.0);
        drawMetallicLead(ctx, [{ x: 6,   y: -4 }, { x: 15,  y: 16 }, { x: 18,  y: 36 }], 3.0);
        drawMetallicLead(ctx, [{ x: 16,  y: -4 }, { x: 46,  y: 16 }, { x: 54,  y: 36 }], 3.0);

        // 5mm Frosted Clear RGB Dome (bottom rim at y=-4, hemispherical crown centered at y=-42)
        const traceRgbDome = () => {
            ctx.beginPath();
            ctx.moveTo(-26, -4);
            ctx.lineTo(-26, -11);
            ctx.lineTo(-23, -11);
            ctx.lineTo(-23, -42);
            ctx.arc(0, -42, 23, Math.PI, 0, false);
            ctx.lineTo(23, -11);
            ctx.lineTo(26, -11);
            ctx.lineTo(26, -4);
            ctx.closePath();
        };

        withPhysicalShadow(ctx, () => {
            traceRgbDome();
            ctx.fillStyle = '#334155';
            ctx.fill();
        }, 12, 5, 3, 2);

        ctx.save();
        traceRgbDome();
        if (st.overloaded) {
            ctx.fillStyle = '#291515';
        } else if (lit) {
            const mGrad = ctx.createRadialGradient(-4, -44, 4, 0, -38, 34);
            mGrad.addColorStop(0, '#ffffff');
            mGrad.addColorStop(0.32, `rgba(${Math.min(255, rVal + 80)}, ${Math.min(255, gVal + 80)}, ${Math.min(255, bVal + 80)}, 0.96)`);
            mGrad.addColorStop(0.75, `rgba(${rVal}, ${gVal}, ${bVal}, 0.90)`);
            mGrad.addColorStop(1, 'rgba(30, 41, 59, 0.90)');
            ctx.fillStyle = mGrad;
        } else {
            const cGrad = ctx.createLinearGradient(-24, -64, 24, -4);
            cGrad.addColorStop(0, '#f1f5f9');
            cGrad.addColorStop(0.4, '#cbd5e1');
            cGrad.addColorStop(1, '#64748b');
            ctx.globalAlpha = 0.84;
            ctx.fillStyle = cGrad;
        }
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.clip();

        // Internal 4-post RGB lead frame
        ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
        for (const px of [-14, -5, 5, 14]) {
            ctx.fillRect(px - 1.5, -34, 3, 30);
        }
        // Subtle frosted glass specular highlight
        ctx.beginPath();
        ctx.ellipse(-9, -46, 5, 12, 0.35, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
        ctx.fill();
        ctx.restore();

        traceRgbDome();
        ctx.strokeStyle = st.overloaded ? '#ef4444' : (lit ? `rgb(${rVal},${gVal},${bVal})` : '#e2e8f0');
        ctx.lineWidth = 1.5;
        ctx.stroke();

        if (lit) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(0, -40, 5, 0, -40, 48);
            g.addColorStop(0, `rgba(${rVal},${gVal},${bVal},0.92)`);
            g.addColorStop(0.55, `rgba(${rVal},${gVal},${bVal},0.40)`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, -40, 48, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        drawMicroTag(ctx, -54, 49, 'R', '#fca5a5');
        drawMicroTag(ctx, -18, 49, '−', '#e2e8f0');
        drawMicroTag(ctx,  18, 49, 'G', '#86efac');
        drawMicroTag(ctx,  54, 49, 'B', '#93c5fd');

        if (st.overloaded) drawPillBadge(ctx, 0, -80, '🔥 RGB OVERCURRENT!', 'error');
        if (isSelected) drawSelectionFrame(ctx, -62, -72, 124, 126);
        return true;
    }

    // =========================================================================
    // 8. PIEZO BUZZER — AUTHENTIC TOP-DOWN 12mm MATTE-BLACK CYLINDER
    // =========================================================================
    // Exact 2U pins: + (-36, +36), − (+36, +36)
    function drawBuzzer(ctx, comp, evalData, isSelected, animTimeSec = 0) {
        const st = evalData?.buzzerStates?.get(comp.id) || { sounding: false, active: false, freqHz: comp.freqHz || 880 };
        const active = Boolean(st.sounding || st.active);
        const cy = -22;

        // 1. Two single-piece native tinned pins exiting cleanly into exact 2U (±36, +36)
        drawMetallicLead(ctx, [{ x: -24, y: -4 }, { x: -36, y: 12 }, { x: -36, y: 36 }], 3.6);
        drawMetallicLead(ctx, [{ x: 24,  y: -4 }, { x: 36,  y: 12 }, { x: 36,  y: 36 }], 3.6);

        // Animated acoustic sound wave rings radiating cleanly when energized
        if (active) {
            for (let k = 0; k < 3; k++) {
                const phase = (animTimeSec * 2.2 + k / 3) % 1;
                const rad = 34 + phase * 32;
                ctx.beginPath();
                ctx.arc(0, cy, rad, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - phase) * 0.85})`;
                ctx.lineWidth = 2.6;
                ctx.stroke();
            }
        }

        // 2. Matte-Black Cylindrical 12mm Piezo Housing (r = 31px) with 2.5D thickness lip
        withPhysicalShadow(ctx, () => {
            ctx.beginPath();
            ctx.arc(0, cy + 2, 31, 0, Math.PI * 2);
            ctx.fillStyle = '#090d16';
            ctx.fill();
        }, 14, 6, 4, 2);

        // Subtle 2.5D cylindrical lower skirt
        ctx.beginPath();
        ctx.arc(0, cy + 3.2, 31, 0, Math.PI * 2);
        ctx.fillStyle = '#0b101b';
        ctx.fill();

        // Main top matte-charcoal ABS cylinder face
        const bodyGrad = ctx.createRadialGradient(-10, cy - 10, 4, 0, cy, 32);
        bodyGrad.addColorStop(0, '#3f4a5c');
        bodyGrad.addColorStop(0.45, '#1e2430');
        bodyGrad.addColorStop(0.88, '#111622');
        bodyGrad.addColorStop(1, '#080b12');
        ctx.beginPath();
        ctx.arc(0, cy, 31, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        ctx.strokeStyle = active ? 'rgba(56, 189, 248, 0.72)' : 'rgba(148, 163, 184, 0.42)';
        ctx.lineWidth = active ? 2.0 : 1.3;
        ctx.stroke();

        // Molded inner step rim
        ctx.beginPath();
        ctx.arc(0, cy, 25.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Molded circular '+' polarity emblem on positive side
        ctx.beginPath();
        ctx.arc(-18, cy, 5.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(248, 250, 252, 0.55)';
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(-20.8, cy); ctx.lineTo(-15.2, cy);
        ctx.moveTo(-18, cy - 2.8); ctx.lineTo(-18, cy + 2.8);
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        // 3. Recessed Center Sound Port revealing Gleaming Brass Piezo Disc inside!
        ctx.beginPath();
        ctx.arc(0, cy, 10.2, 0, Math.PI * 2);
        ctx.fillStyle = '#04060a';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        const brassGrad = ctx.createRadialGradient(-2, cy - 2, 1, 0, cy, 8);
        brassGrad.addColorStop(0, '#fef08a');
        brassGrad.addColorStop(0.55, '#d97706');
        brassGrad.addColorStop(1, '#78350f');
        ctx.beginPath();
        ctx.arc(0, cy, 7.4, 0, Math.PI * 2);
        ctx.fillStyle = brassGrad;
        ctx.fill();

        // Tiny concentric silver ceramic center on piezo disc
        ctx.beginPath();
        ctx.arc(0, cy, 3.8, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();

        drawMicroTag(ctx, -46, 28, '+', '#fca5a5');
        drawMicroTag(ctx, 46, 28, '−', '#cbd5e1');

        drawPillBadge(ctx, 0, -68, active ? `🔊 ${Math.round(st.freqHz || 880)} Hz` : (comp.label || 'Buzzer'), active ? 'ok' : 'info');
        if (isSelected) drawSelectionFrame(ctx, -46, -60, 92, 104);
        return true;
    }

    // =========================================================================
    // 9. DYNAMIC 1–4x AA BATTERY PACK — RENDERS LITERALLY 1, 2, 3, OR 4 AA CELLS!
    // =========================================================================
    // Exact pins: neg (-108, 0), pos (+108, 0)
    function drawAAHolder(ctx, comp, evalData, isSelected) {
        const cells = Math.max(1, Math.min(4, Math.round(comp.cells || (comp.voltage ? comp.voltage / 1.5 : 3))));
        const st = evalData?.sourceStates?.get(comp.id);
        const vNom = (cells * 1.5).toFixed(1);

        const cellH = 32;
        const gap = 5;
        const padY = 12;
        const dh = cells * cellH + (cells - 1) * gap + padY * 2;
        const dw = 158;
        const hw = dw / 2;
        const hh = dh / 2;

        // 1. Clean insulated exit wires from molded side grommets to (-108, 0) and (+108, 0)
        drawInsulatedLead(ctx, { x: -hw, y: 0 }, { x: -92, y: 0 }, { x: -98, y: 0 }, { x: -108, y: 0 }, '#334155', '#1e293b', 4.6);
        drawInsulatedLead(ctx, { x: hw, y: 0 },  { x: 92, y: 0 },  { x: 98, y: 0 },  { x: 108, y: 0 },  '#7f1d1d', '#ef4444', 4.6);

        // 2. Molded Matte-Black Ribbed Battery Holder Chassis
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -hw, -hh, dw, dh, 8);
            ctx.fillStyle = '#090d16';
            ctx.fill();
        }, 16, 6, 4, 2.2);

        rRect(ctx, -hw, -hh, dw, dh, 8);
        const trayGrad = ctx.createLinearGradient(0, -hh, 0, hh);
        trayGrad.addColorStop(0, '#272f3d');
        trayGrad.addColorStop(0.5, '#151b26');
        trayGrad.addColorStop(1, '#0b0f17');
        ctx.fillStyle = trayGrad;
        ctx.fill();
        ctx.strokeStyle = st?.shorted ? '#ef4444' : '#475569';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Recessed inner battery cavity
        rRect(ctx, -hw + 6, -hh + 6, dw - 12, dh - 12, 5);
        ctx.fillStyle = '#070a10';
        ctx.fill();

        // 3. Draw Each Individual Cylindrical AA 1.5V Cell (Alternating polarity orientation like a real series pack!)
        const startY = -hh + padY;
        for (let i = 0; i < cells; i++) {
            const cy = startY + i * (cellH + gap) + cellH / 2;
            const posRight = (i % 2 === 0);
            const cellX = posRight ? -hw + 16 : -hw + 12;
            const cellW = dw - 28;

            // Metallic coiled negative tension spring
            ctx.save();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.6;
            const spX = posRight ? -hw + 8 : hw - 15;
            ctx.beginPath();
            for (let s = 0; s < 3; s++) {
                ctx.moveTo(spX + s * 2.6, cy - 7 + s);
                ctx.lineTo(spX + s * 2.6, cy + 7 - s);
            }
            ctx.stroke();
            ctx.restore();

            // Positive button terminal nub
            const nubX = posRight ? cellX + cellW : cellX - 5;
            rRect(ctx, nubX, cy - 6, 5, 12, 2);
            ctx.fillStyle = '#cbd5e1';
            ctx.fill();

            // Cylindrical AA cell body (matte charcoal wrap + copper-gold positive crown)
            ctx.save();
            rRect(ctx, cellX, cy - cellH / 2 + 1, cellW, cellH - 2, 4);
            ctx.clip();

            const wrapGrad = ctx.createLinearGradient(0, cy - cellH / 2, 0, cy + cellH / 2);
            wrapGrad.addColorStop(0, '#334155');
            wrapGrad.addColorStop(0.26, '#475569');
            wrapGrad.addColorStop(0.5, '#1e293b');
            wrapGrad.addColorStop(1, '#090d16');
            ctx.fillStyle = wrapGrad;
            ctx.fillRect(cellX, cy - cellH / 2, cellW, cellH);

            // Anodized copper-gold crown (32% of cell length on positive end)
            const crownW = cellW * 0.32;
            const crownX = posRight ? (cellX + cellW - crownW) : cellX;
            const goldGrad = ctx.createLinearGradient(0, cy - cellH / 2, 0, cy + cellH / 2);
            goldGrad.addColorStop(0, '#92400e');
            goldGrad.addColorStop(0.28, '#fcd34d');
            goldGrad.addColorStop(0.55, '#d97706');
            goldGrad.addColorStop(1, '#78350f');
            ctx.fillStyle = goldGrad;
            ctx.fillRect(crownX, cy - cellH / 2, crownW, cellH);

            // Specular cylindrical top reflection strip
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.fillRect(cellX, cy - cellH / 2 + 4, cellW, 5.5);
            ctx.restore();

            // Crisp cell outline
            rRect(ctx, cellX, cy - cellH / 2 + 1, cellW, cellH - 2, 4);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
            ctx.lineWidth = 1.0;
            ctx.stroke();

            // Accurate "AA 1.5V" Typography + Polarity Marks
            ctx.font = '800 9.5px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#e2e8f0';
            ctx.fillText('AA · 1.5V', posRight ? -16 : 16, cy + 0.5);
            ctx.fillStyle = '#0f172a';
            ctx.font = '900 11px "JetBrains Mono", monospace';
            ctx.fillText('+', posRight ? (cellX + cellW - 14) : (cellX + 14), cy + 0.5);
        }

        // Side polarity markers
        ctx.font = '900 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('−', -108, -16);
        ctx.fillStyle = '#f87171';
        ctx.fillText('+', 108, -16);

        drawPillBadge(ctx, 0, -hh - 17, `${cells}×AA · ${vNom}V`, 'info');
        if (st?.shorted) drawPillBadge(ctx, 0, hh + 18, '⚡ SHORT CIRCUIT!', 'error');
        if (isSelected) drawSelectionFrame(ctx, -114, -hh - 8, 228, dh + 16);
        return true;
    }

    // =========================================================================
    // 10. 9V PP3 ALKALINE BATTERY WITH MOLDED SNAP-ON CONNECTOR CAP
    // =========================================================================
    // Exact pins: neg (-90, 0), pos (+90, 0)
    function drawBattery9V(ctx, comp, evalData, isSelected) {
        const st = evalData?.sourceStates?.get(comp.id);
        const w = 108, h = 154, top = -74;

        // 1. Curved Glossy Insulated Red (+) & Black (−) Snap-Cap Leads to (±90, 0)
        drawInsulatedLead(ctx, { x: -30, y: top - 13 }, { x: -74, y: top - 13 }, { x: -86, y: -36 }, { x: -90, y: 0 }, '#334155', '#1e293b', 4.6);
        drawInsulatedLead(ctx, { x: 30,  y: top - 13 }, { x: 74,  y: top - 13 }, { x: 86,  y: -36 }, { x: 90,  y: 0 }, '#7f1d1d', '#ef4444', 4.6);

        // 2. Molded Black 9V Snap-On Terminal Connector Cap seated cleanly over chrome studs
        ctx.fillStyle = '#cbd5e1';
        rRect(ctx, -31, top - 6, 18, 7, 2); ctx.fill();
        rRect(ctx, 13,  top - 6, 18, 7, 2); ctx.fill();

        withPhysicalShadow(ctx, () => {
            rRect(ctx, -38, top - 21, 76, 17, 5);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
        }, 8, 3, 2, 1);

        const capGrad = ctx.createLinearGradient(-38, top - 21, 38, top - 4);
        capGrad.addColorStop(0, '#334155');
        capGrad.addColorStop(0.45, '#1e293b');
        capGrad.addColorStop(1, '#0b0f17');
        rRect(ctx, -38, top - 21, 76, 17, 5);
        ctx.fillStyle = capGrad;
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 3. Metallic Rectangular PP3 9V Battery Housing
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -w / 2, top, w, h, 9);
            ctx.fillStyle = '#090d16';
            ctx.fill();
        }, 18, 7, 4, 2);

        ctx.save();
        rRect(ctx, -w / 2, top, w, h, 9);
        ctx.clip();

        // Charcoal brushed aluminum body
        const bodyGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        bodyGrad.addColorStop(0, '#111827');
        bodyGrad.addColorStop(0.25, '#334155');
        bodyGrad.addColorStop(0.5, '#1e293b');
        bodyGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(-w / 2, top, w, h);

        // Anodized copper-gold upper crown (top 31%)
        const goldGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        goldGrad.addColorStop(0, '#92400e');
        goldGrad.addColorStop(0.28, '#fde047');
        goldGrad.addColorStop(0.54, '#d97706');
        goldGrad.addColorStop(1, '#78350f');
        ctx.fillStyle = goldGrad;
        ctx.fillRect(-w / 2, top, w, 48);

        // Crisp metallic dividing pinstripe & longitudinal vertical sheen
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.fillRect(-w / 2, top + 48, w, 1.8);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(-w / 2 + 15, top, 14, h);
        ctx.restore();

        rRect(ctx, -w / 2, top, w, h, 9);
        ctx.strokeStyle = st?.shorted ? '#ef4444' : '#64748b';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Crisp embossed typography
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 14px "JetBrains Mono", monospace';
        ctx.fillText('−        +', 0, top + 24);
        ctx.fillStyle = '#fbbf24';
        ctx.font = '800 34px "Inter", sans-serif';
        ctx.fillText('9V', 0, top + 92);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '700 10.5px "JetBrains Mono", monospace';
        ctx.fillText('ALKALINE PP3', 0, top + 126);

        ctx.font = '900 13px "JetBrains Mono", monospace';
        ctx.fillStyle = '#cbd5e1'; ctx.fillText('−', -90, 18);
        ctx.fillStyle = '#f87171'; ctx.fillText('+', 90, 18);

        drawPillBadge(ctx, 0, top + h + 18, '9V PP3', 'info');
        if (st?.shorted) drawPillBadge(ctx, 0, top - 36, '⚡ SHORT CIRCUIT!', 'error');
        if (isSelected) drawSelectionFrame(ctx, -98, -100, 196, 198);
        return true;
    }

    // =========================================================================
    // 11. BRUSHED 130-SIZE HOBBY DC MOTOR + MACHINED ENCODER SPINNER
    // =========================================================================
    // Exact pins: pos (-108, -18), neg (-108, +18)
    function drawMotor(ctx, comp, evalData, isSelected, animAngleRad = 0) {
        const st = evalData?.motorStates?.get(comp.id) || { rpm: 0, spinning: false, direction: 'IDLE', voltage: 0, currentMa: 0, overloaded: false };

        // 1. Clean Red (+) and Black (−) Insulated Leads soldered to Copper Terminal Lugs -> (-108, ±18)
        drawInsulatedLead(ctx, { x: -74, y: -18 }, { x: -88, y: -18 }, { x: -96, y: -18 }, { x: -108, y: -18 }, '#7f1d1d', '#ef4444', 4.2);
        drawInsulatedLead(ctx, { x: -74, y: 18 },  { x: -88, y: 18 },  { x: -96, y: 18 },  { x: -108, y: 18 },  '#334155', '#1e293b', 4.2);

        // Copper-brass solder terminal lugs
        ctx.fillStyle = '#d97706';
        rRect(ctx, -78, -23, 12, 10, 2); ctx.fill();
        rRect(ctx, -78, 13, 12, 10, 2);  ctx.fill();

        // 2. Main Brushed Galvanized-Steel Can + Molded Yellow Endbell (-68..+78, -42..+42)
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -68, -42, 146, 84, 9);
            ctx.fillStyle = '#334155';
            ctx.fill();
        }, 16, 6, 4, 2);

        ctx.save();
        rRect(ctx, -68, -42, 146, 84, 9);
        ctx.clip();

        // Cylindrical brushed steel housing gradient
        const canGrad = ctx.createLinearGradient(0, -42, 0, 42);
        canGrad.addColorStop(0, '#64748b');
        canGrad.addColorStop(0.22, '#e2e8f0');
        canGrad.addColorStop(0.42, '#94a3b8');
        canGrad.addColorStop(0.76, '#475569');
        canGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = canGrad;
        ctx.fillRect(-50, -42, 128, 84);

        // Molded yellow-amber nylon endbell on left (-68..-48)
        const bellGrad = ctx.createLinearGradient(0, -42, 0, 42);
        bellGrad.addColorStop(0, '#eab308');
        bellGrad.addColorStop(0.28, '#fef08a');
        bellGrad.addColorStop(0.6, '#ca8a04');
        bellGrad.addColorStop(1, '#713f12');
        ctx.fillStyle = bellGrad;
        ctx.fillRect(-68, -42, 22, 84);

        // Seam groove between endbell and steel can
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        ctx.fillRect(-47, -42, 2.2, 84);

        // Stamped oval motor cooling ventilation slots
        ctx.fillStyle = '#0f172a';
        rRect(ctx, 30, -28, 22, 9, 4.5); ctx.fill();
        rRect(ctx, 30, 19,  22, 9, 4.5); ctx.fill();

        // Subtle stamped housing markings
        ctx.font = '800 10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(15, 23, 42, 0.52)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DC-130 · 9V', 6, 0);
        ctx.restore();

        rRect(ctx, -68, -42, 146, 84, 9);
        ctx.strokeStyle = st.overloaded ? '#ef4444' : '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3. Stepped Nose Bearing Boss + Machined Steel Shaft (+78..+110)
        const noseGrad = ctx.createLinearGradient(0, -16, 0, 16);
        noseGrad.addColorStop(0, '#94a3b8');
        noseGrad.addColorStop(0.35, '#f1f5f9');
        noseGrad.addColorStop(1, '#334155');
        rRect(ctx, 78, -16, 12, 32, 3);
        ctx.fillStyle = noseGrad;
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Machined steel drive shaft
        rRect(ctx, 90, -4.5, 18, 9, 2);
        ctx.fillStyle = noseGrad;
        ctx.fill();

        // 4. Machined Rotating Slotted Encoder Hub / Spinner Disc at (+104, 0)
        ctx.save();
        ctx.translate(104, 0);

        if (st.spinning && st.rpm > 20) {
            const blurAlpha = Math.min(0.42, 0.12 + (st.rpm / 3600) * 0.30);
            ctx.beginPath();
            ctx.arc(0, 0, 31, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(56, 189, 248, ${blurAlpha})`;
            ctx.fill();
        }

        // Physical shadow under spinner
        ctx.beginPath();
        ctx.arc(1.5, 3, 25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();

        ctx.rotate(animAngleRad || 0);

        // Dark anodized encoder disc
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = st.spinning ? '#38bdf8' : '#94a3b8';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // 4 crisp machined radial encoder cutouts + 1 gold index blade for crystal-clear rotation visibility
        for (let b = 0; b < 4; b++) {
            ctx.save();
            ctx.rotate((b * Math.PI) / 2);
            ctx.beginPath();
            ctx.moveTo(6, -3.5);
            ctx.lineTo(22, -6.5);
            ctx.arc(0, 0, 22, -0.29, 0.29);
            ctx.lineTo(6, 3.5);
            ctx.closePath();
            ctx.fillStyle = b === 0 ? '#facc15' : '#38bdf8';
            ctx.fill();
            ctx.restore();
        }

        // Machined brass shaft collet nut
        ctx.beginPath();
        ctx.arc(0, 0, 6.8, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.restore();

        // Polarity tags
        ctx.font = '800 10.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fca5a5'; ctx.fillText('+', -108, -31);
        ctx.fillStyle = '#94a3b8'; ctx.fillText('−', -108, 33);

        if (st.overloaded) {
            drawPillBadge(ctx, 10, -60, `🔥 OVER-V (${st.voltage.toFixed(1)}V)`, 'error');
        } else if (st.spinning) {
            drawPillBadge(ctx, 10, -60, `${st.rpm.toLocaleString()} RPM · ${st.direction}`, 'ok');
        } else {
            drawPillBadge(ctx, 10, -60, 'DC MOTOR · 0 RPM', 'info');
        }
        if (isSelected) drawSelectionFrame(ctx, -118, -56, 256, 112);
        return true;
    }

    // =========================================================================
    // 12. NPN 2N2222 TO-92 TRANSISTOR — TRUE 2.5D D-SHAPED EPOXY PACKAGE
    // =========================================================================
    // Exact 1U pins: E (-36, +36), B (0, +36), C (+36, +36)
    function drawNpn(ctx, comp, evalData, isSelected) {
        const st = evalData?.npnStates?.get(comp.id) || { mode: 'CUTOFF', corrupted: false, overloaded: false };
        const conducting = st.mode === 'SATURATED' || st.mode === 'ACTIVE';
        const fault = Boolean(st.corrupted || st.overloaded);

        // 1. Three single-piece splayed chrome legs exiting smoothly from the epoxy base to (-36, 0, +36 @ y=+36)
        drawMetallicLead(ctx, [{ x: -14, y: -2 }, { x: -34, y: 14 }, { x: -36, y: 36 }], 3.5);
        drawMetallicLead(ctx, [{ x: 0,   y: -2 }, { x: 0,   y: 36 }], 3.5);
        drawMetallicLead(ctx, [{ x: 14,  y: -2 }, { x: 34,  y: 14 }, { x: 36,  y: 36 }], 3.5);

        // 2. Authentic D-Shaped TO-92 Matte-Black Epoxy Housing (compact ±25px width so adjacent breadboard parts have clean breathing room!)
        const traceTo92 = () => {
            ctx.beginPath();
            ctx.moveTo(-25, -2);
            ctx.lineTo(-25, -28);
            ctx.bezierCurveTo(-25, -50, 25, -50, 25, -28);
            ctx.lineTo(25, -2);
            ctx.closePath();
        };

        withPhysicalShadow(ctx, () => {
            traceTo92();
            ctx.fillStyle = '#090d16';
            ctx.fill();
        }, 12, 5, 3, 2);

        // Curved epoxy crown top bevel
        traceTo92();
        const epoxyGrad = ctx.createLinearGradient(-25, -48, 25, 0);
        epoxyGrad.addColorStop(0, '#334155');
        epoxyGrad.addColorStop(0.28, '#1e2430');
        epoxyGrad.addColorStop(0.75, '#0f141e');
        epoxyGrad.addColorStop(1, '#070a10');
        ctx.fillStyle = epoxyGrad;
        ctx.fill();
        ctx.strokeStyle = fault ? '#ef4444' : (conducting ? '#34d399' : '#475569');
        ctx.lineWidth = fault || conducting ? 1.8 : 1.3;
        ctx.stroke();

        // Beveled flat front laser-marked face
        rRect(ctx, -20, -32, 40, 26, 3);
        ctx.fillStyle = '#141923';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Crisp laser-etched part markings
        ctx.font = '800 8.8px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(comp.model || '2N2222', 0, -23);
        ctx.font = '700 7.5px "JetBrains Mono", monospace';
        ctx.fillStyle = conducting ? '#34d399' : '#64748b';
        ctx.fillText('NPN · TO-92', 0, -12.5);

        // Subtle emerald conduction halo when active/saturated
        if (conducting && !fault) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(0, -22, 4, 0, -22, 34);
            g.addColorStop(0, 'rgba(52, 211, 153, 0.36)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, -22, 34, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        drawMicroTag(ctx, -36, 49, 'E', '#f8fafc');
        drawMicroTag(ctx,   0, 49, 'B', '#f0abfc');
        drawMicroTag(ctx,  36, 49, 'C', '#fdba74');

        if (fault) {
            drawPillBadge(ctx, 0, -68, '🔥 BJT OVERCURRENT!', 'error');
        } else {
            drawPillBadge(ctx, 0, -68, `${comp.model || '2N2222'} · ${conducting ? 'ON' : 'OFF'}`, conducting ? 'ok' : 'info');
        }
        if (isSelected) drawSelectionFrame(ctx, -46, -60, 92, 108);
        return true;
    }

    // =========================================================================
    // 13. 10-PIN COMMON-CATHODE 7-SEGMENT DISPLAY (5161AS — UNIFIED DIP-10)
    // =========================================================================
    // Top Row (y=-108): g(-72), f(-36), COM(0), a(+36), b(+72)
    // Bot Row (y=+108): e(-72), d(-36), COM(0), c(+36), dp(+72)
    function drawSeg7TenPin(ctx, comp, evalData, isSelected) {
        const st = evalData?.seg7TenStates?.get(comp.id) || { segs: {}, overloaded: false };

        // 1. Ten single-piece tinned pins extending cleanly to Row d (-108) and Row g (+108)
        for (const px of [-72, -36, 0, 36, 72]) {
            drawMetallicLead(ctx, [{ x: px, y: -96 }, { x: px, y: -108 }], 3.8);
            drawMetallicLead(ctx, [{ x: px, y: 96 },  { x: px, y: 108 }],  3.8);
        }

        // 2. Unified Molded Polymer 5161AS Display Housing (164 x 200px) with 2.5D bevel
        const dw = 164, dh = 200;
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -dw / 2, -dh / 2, dw, dh, 8);
            ctx.fillStyle = '#090d16';
            ctx.fill();
        }, 16, 6, 4, 2);

        // Light-silver perimeter frame (authentic 5161AS side flange)
        const rimGrad = ctx.createLinearGradient(-dw / 2, -dh / 2, dw / 2, dh / 2);
        rimGrad.addColorStop(0, '#e2e8f0');
        rimGrad.addColorStop(0.5, '#cbd5e1');
        rimGrad.addColorStop(1, '#94a3b8');
        rRect(ctx, -dw / 2, -dh / 2, dw, dh, 7);
        ctx.fillStyle = rimGrad;
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Recessed matte-black optical display face
        rRect(ctx, -68, -76, 136, 152, 5);
        ctx.fillStyle = '#0d111a';
        ctx.fill();
        ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 3. Seven Slanted Chamfered Hexagonal LED Diffuser Bars + Decimal Point
        const segPolys = {
            a: [[-26, -58], [28, -58], [34, -52], [26, -46], [-22, -46], [-30, -52]],
            b: [[34, -50], [40, -44], [36, -6], [30, 0], [24, -6], [28, -44]],
            c: [[30, 4], [36, 10], [32, 48], [26, 54], [20, 48], [24, 10]],
            d: [[-34, 58], [20, 58], [26, 52], [18, 46], [-30, 46], [-38, 52]],
            e: [[-34, 4], [-28, 10], [-32, 48], [-38, 54], [-44, 48], [-40, 10]],
            f: [[-28, -50], [-22, -44], [-26, -6], [-32, 0], [-38, -6], [-34, -44]],
            g: [[-28, 0], [-20, -6], [24, -6], [30, 0], [22, 6], [-22, 6]]
        };

        for (const [name, pts] of Object.entries(segPolys)) {
            const sInfo = st.segs[name];
            const on = Boolean(sInfo && sInfo.lit && !sInfo.overloaded);
            const br = on ? Math.max(0.45, Math.min(1, sInfo.brightness || 0.9)) : 0;

            ctx.beginPath();
            pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
            ctx.closePath();
            ctx.fillStyle = on ? `rgba(255, 59, 48, ${0.50 + br * 0.50})` : '#242b3b';
            ctx.fill();

            if (on) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 16;
                ctx.fillStyle = '#ff7b72';
                ctx.fill();
                ctx.restore();
            }
        }

        // Decimal Point (dp)
        const dpOn = Boolean(st.segs.dp && st.segs.dp.lit && !st.segs.dp.overloaded);
        ctx.beginPath();
        ctx.arc(48, 52, 6.2, 0, Math.PI * 2);
        ctx.fillStyle = dpOn ? '#ff3b30' : '#242b3b';
        ctx.fill();
        if (dpOn) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#ff8a80';
            ctx.fill();
            ctx.restore();
        }

        // Crisp 10-Pin Silkscreen Labels along the Top & Bottom Rims
        ctx.font = '900 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const [px, lbl, col] of [[-72, 'g', '#0f172a'], [-36, 'f', '#0f172a'], [0, 'COM', '#b91c1c'], [36, 'a', '#0f172a'], [72, 'b', '#0f172a']]) {
            ctx.fillStyle = col;
            ctx.fillText(lbl, px, -88);
        }
        for (const [px, lbl, col] of [[-72, 'e', '#0f172a'], [-36, 'd', '#0f172a'], [0, 'COM', '#b91c1c'], [36, 'c', '#0f172a'], [72, 'dp', '#b45309']]) {
            ctx.fillStyle = col;
            ctx.fillText(lbl, px, 88);
        }

        if (st.overloaded) {
            drawPillBadge(ctx, 0, -124, '🔥 SEG OVERCURRENT! Add 220Ω', 'error');
        }
        if (isSelected) drawSelectionFrame(ctx, -88, -112, 176, 224);
        return true;
    }

    // =========================================================================
    // 14. CREATIVE PURE-WHITE TECHNICAL SCHEMATICS FOR COMPONENT PALETTE CARDS
    // =========================================================================
    // Renders crisp, architectural white-ink IEEE/IEC electrical schematics directly
    // onto each component card's own matched background color (100% transparent
    // canvas — zero mismatched inner box, zero aspect-ratio distortion!).
    const DESIGNATOR_MAP = {
        breadboard:      'BB',
        breadboard_mini: 'BB',
        battery:         'BT1',
        battery9v:       'BT9',
        psu:             'PSU',
        resistor:        'R1',
        potentiometer:   'RV1',
        pushbutton:      'SW1',
        spdt:            'SW2',
        dip4:            'DIP4',
        lamp:            'D1',
        rgb_led:         'LED',
        motor:           'M1',
        buzzer:          'LS1',
        npn:             'Q1',
        multimeter:      'DMM',
        seg7_10:         'DS1',
        seg7:            'DS1'
    };

    function drawIEEESymbolPreview(canvas, kind) {
        if (!canvas) return;
        const dpr = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);
        const isSpan2 = Boolean(canvas.closest && canvas.closest('.palette-span-2'));
        const rect = (typeof canvas.getBoundingClientRect === 'function') ? canvas.getBoundingClientRect() : null;
        const w = Math.max(96, Math.round((rect && rect.width > 40) ? rect.width : (isSpan2 ? 228 : 108)));
        const h = Math.max(54, Math.round((rect && rect.height > 24) ? rect.height : (isSpan2 ? 64 : 62)));
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // Pure crisp white technical engraving palette (100% colorless!)
        const W_PRIMARY = '#ffffff';
        const W_MED     = 'rgba(255, 255, 255, 0.80)';
        const W_SUBTLE  = 'rgba(255, 255, 255, 0.40)';
        const W_HAIR    = 'rgba(255, 255, 255, 0.18)';
        const W_WASH    = 'rgba(255, 255, 255, 0.09)';

        // 1. Subtle architectural L-shaped corner drafting registration brackets
        ctx.save();
        ctx.strokeStyle = W_HAIR;
        ctx.lineWidth = 1.0;
        const m = 4.5, tk = 5;
        ctx.beginPath();
        // Top-left
        ctx.moveTo(m, m + tk); ctx.lineTo(m, m); ctx.lineTo(m + tk, m);
        // Top-right
        ctx.moveTo(w - m - tk, m); ctx.lineTo(w - m, m); ctx.lineTo(w - m, m + tk);
        // Bottom-left
        ctx.moveTo(m, h - m - tk); ctx.lineTo(m, h - m); ctx.lineTo(m + tk, h - m);
        // Bottom-right
        ctx.moveTo(w - m - tk, h - m); ctx.lineTo(w - m, h - m); ctx.lineTo(w - m, h - m - tk);
        ctx.stroke();

        // Crisp top-left IEEE reference designator tag in muted pure white
        const des = DESIGNATOR_MAP[kind] || '';
        if (des) {
            ctx.font = '700 7.5px "JetBrains Mono", Consolas, monospace';
            ctx.fillStyle = W_SUBTLE;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(des, 9, 6);
        }
        ctx.restore();

        // 2. Centered Pure-White IEEE Schematic Symbol
        ctx.save();
        ctx.translate(w / 2, h / 2 + 1);
        ctx.strokeStyle = W_PRIMARY;
        ctx.fillStyle = W_PRIMARY;
        ctx.lineWidth = 1.85;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Precision hollow-ring CAD terminal pad
        const pad = (x, y, filled = false) => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            if (filled) {
                ctx.fillStyle = W_PRIMARY;
                ctx.fill();
            } else {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
                ctx.fill();
                ctx.strokeStyle = W_PRIMARY;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            ctx.restore();
        };

        const line = (pts, col = W_PRIMARY, lw = 1.85) => {
            ctx.save();
            ctx.strokeStyle = col;
            ctx.lineWidth = lw;
            ctx.beginPath();
            pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
            ctx.stroke();
            ctx.restore();
        };

        if (kind === 'breadboard' || kind === 'breadboard_mini') {
            const bw = kind === 'breadboard' ? 76 : 56;
            const bh = kind === 'breadboard' ? 40 : 32;
            rRect(ctx, -bw / 2, -bh / 2, bw, bh, 3.5);
            ctx.fillStyle = W_WASH;
            ctx.fill();
            ctx.strokeStyle = W_PRIMARY;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            if (kind === 'breadboard') {
                line([[-bw / 2 + 5, -bh / 2 + 5], [bw / 2 - 5, -bh / 2 + 5]], W_MED, 1.1);
                line([[-bw / 2 + 5, bh / 2 - 5],  [bw / 2 - 5, bh / 2 - 5]],  W_MED, 1.1);
            }
            ctx.save();
            ctx.setLineDash([2.5, 2.5]);
            line([[-bw / 2 + 4, 0], [bw / 2 - 4, 0]], W_SUBTLE, 1.1);
            ctx.restore();
            ctx.fillStyle = W_PRIMARY;
            const cols = kind === 'breadboard' ? 9 : 6;
            for (let c = 0; c < cols; c++) {
                const x = -bw / 2 + 9 + c * ((bw - 18) / (cols - 1));
                for (const y of [-9.5, -4.8, 4.8, 9.5]) {
                    ctx.fillRect(x - 0.9, y - 0.9, 1.8, 1.8);
                }
            }
        } else if (kind === 'battery' || kind === 'battery9v') {
            const cells = kind === 'battery9v' ? 3 : 2;
            const span = cells * 12;
            line([[-36, 0], [-span / 2, 0]], W_MED, 1.5);
            line([[span / 2, 0], [36, 0]],   W_MED, 1.5);
            for (let i = 0; i < cells; i++) {
                const xN = -span / 2 + i * 12;
                const xP = xN + 6;
                line([[xN, -7.5], [xN, 7.5]], W_PRIMARY, 2.8);
                line([[xP, -15],  [xP, 15]],  W_PRIMARY, 1.6);
                if (i < cells - 1) line([[xP, 0], [xP + 6, 0]], W_MED, 1.3);
            }
            ctx.font = '800 9.5px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = W_MED;     ctx.fillText('−', -28, -11);
            ctx.fillStyle = W_PRIMARY; ctx.fillText('+', 28, -11);
            pad(-36, 0); pad(36, 0);
        } else if (kind === 'psu') {
            line([[-52, 0], [-18, 0]], W_MED, 1.5);
            line([[18, 0],  [52, 0]],  W_MED, 1.5);
            ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fillStyle = W_WASH; ctx.fill();
            ctx.strokeStyle = W_PRIMARY; ctx.lineWidth = 1.8; ctx.stroke();
            ctx.font = '800 10.5px "JetBrains Mono", monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = W_PRIMARY; ctx.fillText('−  +', 0, 0.5);
            // Variable source diagonal sweep arrow
            line([[-19, 19], [19, -19]], W_MED, 1.4);
            line([[13, -19], [19, -19], [19, -13]], W_MED, 1.4);
            pad(-52, 0); pad(52, 0);
        } else if (kind === 'resistor') {
            line([[-38, 0], [-23, 0]], W_MED, 1.5);
            line([[23, 0],  [38, 0]],  W_MED, 1.5);
            line([[-23, 0], [-19, -8.5], [-11.5, 8.5], [-4, -8.5], [3.5, 8.5], [11, -8.5], [18.5, 8.5], [23, 0]], W_PRIMARY, 1.9);
            pad(-38, 0); pad(38, 0);
        } else if (kind === 'potentiometer') {
            line([[-36, 6], [-21, 6]], W_MED, 1.5);
            line([[21, 6],  [36, 6]],  W_MED, 1.5);
            line([[-21, 6], [-17, -1.5], [-10, 13.5], [-3, -1.5], [4, 13.5], [11, -1.5], [18, 13.5], [21, 6]], W_PRIMARY, 1.85);
            line([[0, -20], [0, -4.5]], W_PRIMARY, 1.8);
            line([[-4.5, -9.5], [0, -4], [4.5, -9.5]], W_PRIMARY, 1.8);
            pad(-36, 6); pad(36, 6); pad(0, -20);
        } else if (kind === 'pushbutton') {
            line([[-36, 8], [-13, 8]], W_MED, 1.5);
            line([[13, 8],  [36, 8]],  W_MED, 1.5);
            pad(-13, 8, true); pad(13, 8, true);
            line([[-15, -2], [15, -2]], W_PRIMARY, 2.2);
            line([[0, -2], [0, -14]],   W_PRIMARY, 1.7);
            line([[-9, -14], [9, -14]], W_PRIMARY, 2.2);
            pad(-36, 8); pad(36, 8);
        } else if (kind === 'spdt') {
            line([[-36, 0], [-14, 0]], W_MED, 1.5);
            line([[14, -11], [36, -11]], W_MED, 1.5);
            line([[14, 11],  [36, 11]],  W_MED, 1.5);
            line([[-14, 0], [13, -11]], W_PRIMARY, 2.1);
            pad(-14, 0, true); pad(14, -11); pad(14, 11);
            pad(-36, 0); pad(36, -11); pad(36, 11);
        } else if (kind === 'dip4') {
            rRect(ctx, -36, -21, 72, 42, 3.5);
            ctx.fillStyle = W_WASH; ctx.fill();
            ctx.strokeStyle = W_MED; ctx.lineWidth = 1.4; ctx.stroke();
            for (let i = 0; i < 4; i++) {
                const y = -12.5 + i * 8.4;
                line([[-26, y], [-7, y]], W_MED, 1.4);
                line([[7, y], [26, y]],   W_MED, 1.4);
                line([[-7, y], [7, i % 2 === 0 ? y : y - 4]], W_PRIMARY, 1.8);
                pad(-7, y, true);
            }
        } else if (kind === 'lamp') {
            line([[-36, 4], [-10, 4]], W_MED, 1.5);
            line([[10, 4],  [36, 4]],  W_MED, 1.5);
            ctx.beginPath();
            ctx.moveTo(-10, -7.5); ctx.lineTo(-10, 15.5); ctx.lineTo(10, 4); ctx.closePath();
            ctx.fillStyle = W_WASH; ctx.fill();
            ctx.strokeStyle = W_PRIMARY; ctx.lineWidth = 1.9; ctx.stroke();
            line([[10, -7.5], [10, 15.5]], W_PRIMARY, 2.2);
            // Photon emission arrows
            line([[-2, -9], [6, -18]], W_MED, 1.4);
            line([[2, -18], [6, -18], [6, -14]], W_MED, 1.4);
            line([[7, -7], [15, -16]], W_MED, 1.4);
            line([[11, -16], [15, -16], [15, -12]], W_MED, 1.4);
            pad(-36, 4); pad(36, 4);
        } else if (kind === 'rgb_led') {
            for (const dy of [-12.5, 0, 12.5]) {
                line([[-32, dy], [-8, dy]], W_MED, 1.4);
                ctx.beginPath(); ctx.moveTo(-8, dy - 4.2); ctx.lineTo(-8, dy + 4.2); ctx.lineTo(5, dy); ctx.closePath();
                ctx.fillStyle = W_WASH; ctx.fill();
                ctx.strokeStyle = W_PRIMARY; ctx.lineWidth = 1.5; ctx.stroke();
                line([[5, dy - 4.2], [5, dy + 4.2]], W_PRIMARY, 1.7);
                line([[5, dy], [20, dy]], W_MED, 1.4);
            }
            line([[20, -12.5], [20, 12.5]], W_MED, 1.5);
            line([[20, 0], [34, 0]], W_MED, 1.5);
            pad(34, 0);
        } else if (kind === 'motor') {
            line([[-38, 0], [-20, 0]], W_MED, 1.5);
            line([[20, 0],  [38, 0]],  W_MED, 1.5);
            ctx.fillStyle = W_PRIMARY;
            ctx.fillRect(-20, -5.5, 4.5, 11);
            ctx.fillRect(15.5, -5.5, 4.5, 11);
            ctx.beginPath(); ctx.arc(0, 0, 15.5, 0, Math.PI * 2);
            ctx.fillStyle = W_WASH; ctx.fill();
            ctx.strokeStyle = W_PRIMARY; ctx.lineWidth = 1.9; ctx.stroke();
            ctx.font = '800 14px "Inter", sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = W_PRIMARY; ctx.fillText('M', 0, 0.5);
            pad(-38, 0); pad(38, 0);
        } else if (kind === 'buzzer') {
            line([[-10, 9], [-10, 20]], W_MED, 1.5);
            line([[10, 9],  [10, 20]],  W_MED, 1.5);
            ctx.beginPath(); ctx.arc(0, 9, 15, Math.PI, 0, false); ctx.closePath();
            ctx.fillStyle = W_WASH; ctx.fill();
            ctx.strokeStyle = W_PRIMARY; ctx.lineWidth = 1.85; ctx.stroke();
            for (const r of [19, 24]) {
                ctx.beginPath(); ctx.arc(0, 7, r, -Math.PI * 0.72, -Math.PI * 0.28);
                ctx.strokeStyle = W_MED; ctx.lineWidth = 1.3; ctx.stroke();
            }
            pad(-10, 20); pad(10, 20);
        } else if (kind === 'npn') {
            ctx.beginPath(); ctx.arc(2, 0, 17, 0, Math.PI * 2);
            ctx.fillStyle = W_WASH; ctx.fill();
            ctx.strokeStyle = W_SUBTLE; ctx.lineWidth = 1.3; ctx.stroke();
            line([[-32, 0], [-6, 0]], W_MED, 1.6);
            line([[-6, -10.5], [-6, 10.5]], W_PRIMARY, 2.6);
            line([[-6, -4.5], [13, -16], [13, -22]], W_PRIMARY, 1.7);
            line([[-6, 4.5],  [13, 16],  [13, 22]],  W_PRIMARY, 1.7);
            ctx.beginPath();
            ctx.moveTo(11, 14.8); ctx.lineTo(3.5, 14.5); ctx.lineTo(7.5, 9); ctx.closePath();
            ctx.fillStyle = W_PRIMARY; ctx.fill();
            pad(-32, 0); pad(13, -22); pad(13, 22);
        } else if (kind === 'multimeter') {
            line([[-36, 0], [-17, 0]], W_MED, 1.5);
            line([[17, 0],  [36, 0]],  W_MED, 1.5);
            ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2);
            ctx.fillStyle = W_WASH; ctx.fill();
            ctx.strokeStyle = W_PRIMARY; ctx.lineWidth = 1.85; ctx.stroke();
            ctx.font = '800 9.5px "JetBrains Mono", monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = W_PRIMARY; ctx.fillText('V·A·Ω', 0, 0.5);
            pad(-36, 0); pad(36, 0);
        } else if (kind === 'seg7_10' || kind === 'seg7') {
            rRect(ctx, -22, -17, 44, 34, 3);
            ctx.fillStyle = W_WASH; ctx.fill();
            ctx.strokeStyle = W_PRIMARY; ctx.lineWidth = 1.6; ctx.stroke();
            for (const px of [-14, -7, 0, 7, 14]) {
                line([[px, -17], [px, -23]], W_MED, 1.3);
                line([[px, 17],  [px, 23]],  W_MED, 1.3);
            }
            ctx.font = '800 17px "JetBrains Mono", monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = W_PRIMARY; ctx.fillText('8.', 1, 1);
        } else {
            rRect(ctx, -22, -14, 44, 28, 3);
            ctx.fillStyle = W_WASH; ctx.fill();
            ctx.strokeStyle = W_PRIMARY; ctx.lineWidth = 1.7; ctx.stroke();
            ctx.font = '800 9.5px "JetBrains Mono", monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = W_PRIMARY; ctx.fillText(kind.toUpperCase(), 0, 0);
        }

        ctx.restore();
    }

    const exported = {
        drawBreadboard,
        drawSpdt,
        drawPotentiometer,
        drawPushButton,
        drawResistor,
        drawLed,
        drawRgbLed,
        drawBuzzer,
        drawAAHolder,
        drawBattery9V,
        drawMotor,
        drawNpn,
        drawSeg7TenPin,
        drawIEEESymbolPreview,
        drawPillBadge,
        drawMetallicLead
    };

    root.HardwareRenderer = exported;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exported;
    }
})(typeof window !== 'undefined' ? window : globalThis);

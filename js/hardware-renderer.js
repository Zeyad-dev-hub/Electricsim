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

    // Unified single-piece matte tinned-copper / brushed-nickel lead shader (lightweight, zero harsh glare)
    function drawMetallicLead(ctx, pts, width = 3.4) {
        if (!pts || pts.length < 2) return;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Subtle contact shadow beneath lead
        ctx.save();
        ctx.translate(0.7, 1.8);
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.30)';
        ctx.lineWidth = width + 1.2;
        ctx.stroke();
        ctx.restore();

        // Crisp dark oxidized rim
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = width + 1.3;
        ctx.stroke();

        // Clean matte brushed nickel-silver core (no harsh reflection stripe)
        ctx.strokeStyle = '#c5ceda';
        ctx.lineWidth = width;
        ctx.stroke();

        // Crisp rounded solder tip at final pin endpoint
        const tip = pts[pts.length - 1];
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, width * 0.50, 0, Math.PI * 2);
        ctx.fillStyle = '#d3dce6';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.9;
        ctx.stroke();
        ctx.restore();
    }

    // Curved matte insulated jumper/exit wire (for batteries & DC motor)
    function drawInsulatedLead(ctx, p0, c1, c2, p1, outerCol, mainCol, width = 4.6) {
        ctx.save();
        ctx.lineCap = 'round';
        // Soft drop shadow
        ctx.save();
        ctx.translate(0, 2.6);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p1.x, p1.y);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.38)';
        ctx.lineWidth = width + 2.0;
        ctx.stroke();
        ctx.restore();

        // Outer insulation border
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, p1.x, p1.y);
        ctx.strokeStyle = outerCol;
        ctx.lineWidth = width + 1.8;
        ctx.stroke();

        // Clean matte colored PVC jacket
        ctx.strokeStyle = mainCol;
        ctx.lineWidth = width;
        ctx.stroke();

        // Exposed tinned wire tip at p1
        ctx.beginPath();
        ctx.arc(p1.x, p1.y, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = '#cbd5e1';
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

        // Clean matte brushed steel upper housing plate (no shiny reflections)
        rRect(ctx, -52, -34, 104, 44, 5.5);
        ctx.fillStyle = '#9aa7b8';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 4 folded stainless steel crimp ears along top & bottom edges
        ctx.fillStyle = '#475569';
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
        ctx.fillStyle = '#090d16';
        ctx.fill();

        // Subtle exposed copper contact trace on active side inside slot
        ctx.fillStyle = right ? 'rgba(52, 211, 153, 0.28)' : 'rgba(56, 189, 248, 0.28)';
        rRect(ctx, right ? -31 : 7, -15, 24, 6, 1.5);
        ctx.fill();

        // 3. Physically Sliding Ridged Matte-Black Tactile Actuator Knob (zero shiny glare)
        const kx = right ? 16 : -16;
        // Directional shadow inside slot
        ctx.save();
        rRect(ctx, kx - 13.5, -22, 27, 23, 3.5);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
        ctx.fill();
        ctx.restore();

        // Matte molded black slider block
        rRect(ctx, kx - 14, -24.5, 28, 24, 3.5);
        ctx.fillStyle = '#1f2734';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Tactile vertical grip grooves on slider thumb (clean matte)
        for (const rx of [-7.5, -2.5, 2.5, 7.5]) {
            ctx.beginPath();
            ctx.moveTo(kx + rx, -21);
            ctx.lineTo(kx + rx, -4);
            ctx.strokeStyle = '#0b1019';
            ctx.lineWidth = 1.6;
            ctx.stroke();
        }

        // Tiny direction indicator pip on top of steel rim
        ctx.beginPath();
        ctx.arc(right ? 46 : -46, -12, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = right ? '#34d399' : '#38bdf8';
        ctx.fill();

        drawPillBadge(ctx, 0, -48, `${comp.label || 'SPDT'} · ${right ? 'T2 →' : '← T1'}`, 'info');
        if (isSelected) drawSelectionFrame(ctx, -58, -40, 116, 84);
        return true;
    }

    // =========================================================================
    // 3. CLASSIC SILVER ROTARY POTENTIOMETER (ALPHA RV16 / TINKERCAD STYLE)
    // =========================================================================
    // Exact 1U pins: T1 (-36, +36), Wiper (0, +36), T2 (+36, +36)
    function drawPotentiometer(ctx, comp, evalData, isSelected, solverMod) {
        const wiper = Math.max(0, Math.min(1, Number(comp.wiper ?? comp.knob ?? 0.5)));
        const ohms = Number(comp.ohms) || 10000;
        const st = evalData?.potStates?.get(comp.id);
        const fmt = solverMod ? solverMod.formatOhms(ohms) : `${ohms}Ω`;
        const shortCode = ohms >= 1e6 ? `B${Math.round(ohms / 1e6)}M`
            : ohms >= 1e3 ? `B${Math.round(ohms / 1e3)}K`
            : `B${Math.round(ohms)}`;

        // 1. Three matte tinned solder-lug leads exiting cleanly into exact 1U holes (-36, 0, +36 @ y=+36)
        drawMetallicLead(ctx, [{ x: -36, y: 8 }, { x: -36, y: 36 }], 3.8);
        drawMetallicLead(ctx, [{ x: 0, y: 8 }, { x: 0, y: 36 }], 3.8);
        drawMetallicLead(ctx, [{ x: 36, y: 8 }, { x: 36, y: 36 }], 3.8);

        const cx = 0, cy = -30;

        // 2. Phenolic Brown-Amber Terminal Wafer Base projecting under the silver metal shell
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -43, -10, 86, 24, 4);
            ctx.fillStyle = '#5c3317';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(cx, cy, 41, 0, Math.PI * 2);
            ctx.fillStyle = '#64748b';
            ctx.fill();
        }, 12, 5, 3.5, 2);

        rRect(ctx, -43, -10, 86, 24, 4);
        ctx.fillStyle = '#784421';
        ctx.fill();
        ctx.strokeStyle = '#3f220f';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 3 stamped brass terminal rivet eyelets on phenolic wafer
        for (const px of [-36, 0, 36]) {
            rRect(ctx, px - 5.5, 1, 11, 10, 2);
            ctx.fillStyle = '#b6c2cf';
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(px, 6, 2.2, 0, Math.PI * 2);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
        }

        // 3. Round Stamped Matte-Silver Aluminum Housing Can (r = 41px)
        // Outer subtle steel edge lip
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 41, 0, Math.PI * 2);
        ctx.fillStyle = '#5a6677';
        ctx.fill();

        // Flat-shaded brushed silver metal body (no harsh glare)
        const bodyGrad = ctx.createLinearGradient(cx - 41, cy - 41, cx + 41, cy + 41);
        bodyGrad.addColorStop(0, '#cfd8e3');
        bodyGrad.addColorStop(0.55, '#b1bcc9');
        bodyGrad.addColorStop(1, '#8b97a7');
        ctx.beginPath();
        ctx.arc(cx, cy, 40.5, 0, Math.PI * 2);
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Stamped metal side crimping tabs & anti-rotation lug
        ctx.fillStyle = '#8b97a7';
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.1;
        rRect(ctx, -44, cy - 6, 5, 12, 1.5); ctx.fill(); ctx.stroke();
        rRect(ctx, 39, cy - 6, 5, 12, 1.5);  ctx.fill(); ctx.stroke();

        // Recessed concentric stamped step ring on aluminum housing
        ctx.beginPath();
        ctx.arc(cx, cy, 34, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        // Crisp stamped resistance marking (e.g. B10K) along top rim of silver can
        ctx.font = '800 8.5px "JetBrains Mono", Consolas, monospace';
        ctx.fillStyle = '#334155';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(shortCode, cx, cy - 31.5);

        // 4. Calibrated 270° Tick Scale around Hex Nut
        const startAng = (135 * Math.PI) / 180;
        const sweepAng = (270 * Math.PI) / 180;
        const curAng = startAng + wiper * sweepAng;

        for (let i = 0; i <= 10; i++) {
            const a = startAng + (i / 10) * sweepAng;
            const r1 = i % 5 === 0 ? 27.5 : 29;
            const r2 = 32.5;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
            ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
            ctx.strokeStyle = i / 10 <= wiper + 0.01 ? '#0284c7' : '#475569';
            ctx.lineWidth = i % 5 === 0 ? 1.8 : 1.1;
            ctx.stroke();
        }

        // 5. Machined 6-Sided Steel Hex Mounting Nut + Washer Collar
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3 + Math.PI / 6;
            const px = Math.cos(a) * 24.5;
            const py = Math.sin(a) * 24.5;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#9aa6b6';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Threaded circular bushing ring inside hex nut
        ctx.beginPath();
        ctx.arc(0, 0, 18.8, 0, Math.PI * 2);
        ctx.fillStyle = '#738194';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Subtle inner shadow beneath rotary knob
        ctx.beginPath();
        ctx.arc(0.8, 1.8, 16.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.fill();

        // 6. Classic Knurled Rotary Knob with Machined Silver Cap & High-Contrast Pointer Line
        ctx.rotate(curAng);
        ctx.beginPath();
        const teeth = 18;
        for (let i = 0; i < teeth * 2; i++) {
            const a = (i / (teeth * 2)) * Math.PI * 2;
            const rr = i % 2 === 0 ? 16.5 : 15.1;
            if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
            else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = '#252d3b';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Matte brushed-silver rotary shaft top face
        ctx.beginPath();
        ctx.arc(0, 0, 12.6, 0, Math.PI * 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Crisp dark machined D-shaft pointer groove + high-visibility teal/cyan arrow tip
        ctx.beginPath();
        ctx.moveTo(1.5, 0);
        ctx.lineTo(13.8, 0);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3.6;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(5.5, 0);
        ctx.lineTo(13.2, 0);
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 1.8;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        if (st?.overloaded) {
            drawPillBadge(ctx, 0, -86, `🔥 POT HOT · ${(st.powerW || 0).toFixed(2)}W`, 'error');
        } else {
            drawPillBadge(ctx, 0, -86, `${comp.label || 'POT'} · ${fmt} (${Math.round(wiper * 100)}%)`, 'info');
        }
        if (isSelected) drawSelectionFrame(ctx, -50, -78, 100, 122);
        return true;
    }

    // =========================================================================
    // 4. 4-PIN TACTILE PUSH BUTTON — CLEAN MATTE 2.5D 6x6mm SWITCH (4 LEGS ONLY!)
    // =========================================================================
    // Exact 2U x 2U pins: (-36, -36), (+36, -36), (-36, +36), (+36, +36)
    function drawPushButton(ctx, comp, evalData, isSelected) {
        const down = Boolean(comp.pressed);

        // 1. Exactly 4 single-piece gull-wing metallic legs landing cleanly at (±36, ±36)
        drawMetallicLead(ctx, [{ x: -24, y: -24 }, { x: -36, y: -24 }, { x: -36, y: -36 }], 3.6);
        drawMetallicLead(ctx, [{ x: 24, y: -24 },  { x: 36, y: -24 },  { x: 36, y: -36 }], 3.6);
        drawMetallicLead(ctx, [{ x: -24, y: 24 },  { x: -36, y: 24 },  { x: -36, y: 36 }], 3.6);
        drawMetallicLead(ctx, [{ x: 24, y: 24 },   { x: 36, y: 24 },   { x: 36, y: 36 }], 3.6);

        // 2. Molded charcoal polymer base (62 x 62px) with subtle 2.5D shadow
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -31, -30, 62, 62, 6);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
        }, 10, 4.5, 3, 1.8);

        rRect(ctx, -31, -31, 62, 62, 6);
        ctx.fillStyle = '#1e2430';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 3. Clean matte brushed steel top bezel plate (no shiny reflections)
        rRect(ctx, -27, -27, 54, 54, 4.5);
        ctx.fillStyle = '#adb8c6';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 4 matte dark corner heat-stake rivets
        ctx.fillStyle = '#1e293b';
        for (const [rx, ry] of [[-19, -19], [19, -19], [-19, 19], [19, 19]]) {
            ctx.beginPath();
            ctx.arc(rx, ry, 4.2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Recessed actuator ring well
        ctx.beginPath();
        ctx.arc(0, 0, 18.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();

        // 4. Clean Matte Tactile Plunger Cap (depresses cleanly when pressed, zero specular glare)
        const capR = down ? 14.8 : 16.2;
        if (!down) {
            ctx.beginPath();
            ctx.arc(1.2, 2.2, capR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
            ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(0, down ? 0.6 : 0, capR, 0, Math.PI * 2);
        ctx.fillStyle = down ? '#1a2230' : '#263042';
        ctx.fill();

        // Subtle tactile ring rim (soft emerald when ON, muted slate when OFF)
        ctx.strokeStyle = down ? '#34d399' : '#64748b';
        ctx.lineWidth = down ? 2.2 : 1.3;
        ctx.stroke();

        const tag = comp.label || 'BTN';
        drawPillBadge(ctx, 0, 50, down ? `${tag} · ON` : tag, down ? 'ok' : 'info');
        if (isSelected) drawSelectionFrame(ctx, -44, -44, 88, 88);
        return true;
    }

    // =========================================================================
    // 5. VARIABLE 4-BAND AXIAL RESISTOR — CLEAN MATTE CERAMIC DOG-BONE BODY
    // =========================================================================
    // Exact 4U pins: (-72, 0) and (+72, 0)
    function drawResistor(ctx, comp, evalData, isSelected, solverMod) {
        const ohms = Math.max(1, Number(comp.ohms) || 220);
        const st = evalData?.resistorStates?.get(comp.id);
        const bands = solverMod ? solverMod.getResistorBands(ohms) : ['#dc2626', '#dc2626', '#7c3f1d', '#d4af37'];
        const fmt = solverMod ? solverMod.formatOhms(ohms) : `${ohms}Ω`;
        const hot = Boolean(st?.overloaded);

        // 1. Single-piece matte tinned axial leads running straight into exact 4U (±72, 0) sockets
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

        // Physical shadow under dog-bone ceramic body
        withPhysicalShadow(ctx, () => {
            traceDogBone();
            ctx.fillStyle = '#8a6334';
            ctx.fill();
        }, 9, 4, 3, 1.6);

        // 2. Single clipped pass: matte ceramic base + 4 dynamic EIA bands + subtle matte lower cylindrical shading (zero shiny streak!)
        ctx.save();
        traceDogBone();
        ctx.clip();

        // Warm matte ceramic beige body
        const bodyGrad = ctx.createLinearGradient(0, -12, 0, 12);
        if (hot) {
            bodyGrad.addColorStop(0, '#78350f');
            bodyGrad.addColorStop(0.55, '#451a03');
            bodyGrad.addColorStop(1, '#1c0a00');
        } else {
            bodyGrad.addColorStop(0, '#ebd3a7');
            bodyGrad.addColorStop(0.6, '#d6b27c');
            bodyGrad.addColorStop(1, '#9d7544');
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

        // Subtle matte underside depth shading only (no glossy white sheen!)
        const shadeGrad = ctx.createLinearGradient(0, -12, 0, 12);
        shadeGrad.addColorStop(0.0, 'rgba(0, 0, 0, 0.04)');
        shadeGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.03)');
        shadeGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.30)');
        ctx.fillStyle = shadeGrad;
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
    // 9. DYNAMIC 1–4x AA BATTERY PACK — TINKERCAD REALISTIC SCALE (1..4 AA CELLS)
    // =========================================================================
    // Exact 36px-grid pins: neg (-216, 0), pos (+216, 0)
    function drawAAHolder(ctx, comp, evalData, isSelected) {
        const cells = Math.max(1, Math.min(4, Math.round(comp.cells || (comp.voltage ? comp.voltage / 1.5 : 3))));
        const st = evalData?.sourceStates?.get(comp.id);
        const vNom = (cells * 1.5).toFixed(1);

        const cellH = 56;
        const gap = 8;
        const padY = 18;
        const dh = cells * cellH + (cells - 1) * gap + padY * 2;
        const dw = 312;
        const hw = dw / 2;
        const hh = dh / 2;

        // 1. Clean matte insulated exit wires from molded side grommets to (-216, 0) and (+216, 0)
        drawInsulatedLead(ctx, { x: -hw, y: 0 }, { x: -182, y: 0 }, { x: -196, y: 0 }, { x: -216, y: 0 }, '#334155', '#1e293b', 5.6);
        drawInsulatedLead(ctx, { x: hw, y: 0 },  { x: 182, y: 0 },  { x: 196, y: 0 },  { x: 216, y: 0 },  '#7f1d1d', '#dc2626', 5.6);

        // Molded rubber strain-relief grommets at wire exit ports
        ctx.fillStyle = '#0f172a';
        rRect(ctx, -hw - 8, -9, 10, 18, 3); ctx.fill();
        rRect(ctx, hw - 2, -9, 10, 18, 3);  ctx.fill();

        // 2. Molded Matte-Black Ribbed Battery Holder Chassis
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -hw, -hh, dw, dh, 12);
            ctx.fillStyle = '#090d16';
            ctx.fill();
        }, 18, 7, 4, 2.5);

        rRect(ctx, -hw, -hh, dw, dh, 12);
        ctx.fillStyle = '#181f2c';
        ctx.fill();
        ctx.strokeStyle = st?.shorted ? '#ef4444' : '#475569';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Molded internal rib divider walls & recessed battery cavity
        rRect(ctx, -hw + 10, -hh + 10, dw - 20, dh - 20, 7);
        ctx.fillStyle = '#0a0e16';
        ctx.fill();

        // 3. Draw Each Individual Cylindrical AA 1.5V Cell (Alternating polarity orientation!)
        const startY = -hh + padY;
        for (let i = 0; i < cells; i++) {
            const cy = startY + i * (cellH + gap) + cellH / 2;
            const posRight = (i % 2 === 0);
            const cellX = posRight ? -hw + 28 : -hw + 20;
            const cellW = dw - 48;

            // Metallic coiled negative tension spring
            ctx.save();
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2.2;
            const spX = posRight ? -hw + 13 : hw - 26;
            ctx.beginPath();
            for (let s = 0; s < 4; s++) {
                ctx.moveTo(spX + s * 3.8, cy - 13 + s * 1.4);
                ctx.lineTo(spX + s * 3.8, cy + 13 - s * 1.4);
            }
            ctx.stroke();
            ctx.restore();

            // Positive button terminal nub (matte brushed steel)
            const nubX = posRight ? cellX + cellW : cellX - 8;
            rRect(ctx, nubX, cy - 10, 8, 20, 2.5);
            ctx.fillStyle = '#b6c2cf';
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1;
            ctx.stroke();

            // Cylindrical AA cell body (clean matte charcoal wrap + matte copper-gold positive crown)
            ctx.save();
            rRect(ctx, cellX, cy - cellH / 2 + 1, cellW, cellH - 2, 6);
            ctx.clip();

            const wrapGrad = ctx.createLinearGradient(0, cy - cellH / 2, 0, cy + cellH / 2);
            wrapGrad.addColorStop(0, '#303b4c');
            wrapGrad.addColorStop(0.55, '#1e2633');
            wrapGrad.addColorStop(1, '#0e131c');
            ctx.fillStyle = wrapGrad;
            ctx.fillRect(cellX, cy - cellH / 2, cellW, cellH);

            // Matte copper-bronze crown (31% of cell length on positive end)
            const crownW = cellW * 0.31;
            const crownX = posRight ? (cellX + cellW - crownW) : cellX;
            const goldGrad = ctx.createLinearGradient(0, cy - cellH / 2, 0, cy + cellH / 2);
            goldGrad.addColorStop(0, '#d99a3c');
            goldGrad.addColorStop(0.55, '#b87622');
            goldGrad.addColorStop(1, '#784912');
            ctx.fillStyle = goldGrad;
            ctx.fillRect(crownX, cy - cellH / 2, crownW, cellH);

            // Crisp seam line between crown and wrap
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(posRight ? crownX : crownX + crownW - 1.5, cy - cellH / 2, 1.5, cellH);
            ctx.restore();

            // Crisp cell outline
            rRect(ctx, cellX, cy - cellH / 2 + 1, cellW, cellH - 2, 6);
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Authentic "AA · 1.5V ALKALINE" Typography + Polarity Marks
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '800 13px "JetBrains Mono", monospace';
            ctx.fillText('AA · 1.5V', posRight ? -30 : 30, cy - 6);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '700 9.5px "JetBrains Mono", monospace';
            ctx.fillText('ALKALINE LR6', posRight ? -30 : 30, cy + 10);

            ctx.fillStyle = '#0f172a';
            ctx.font = '900 18px "JetBrains Mono", monospace';
            ctx.fillText('+', posRight ? (cellX + cellW - 26) : (cellX + 26), cy + 1);
        }

        // Side polarity markers
        ctx.font = '900 16px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('−', -216, -20);
        ctx.fillStyle = '#f87171';
        ctx.fillText('+', 216, -20);

        drawPillBadge(ctx, 0, -hh - 20, `${cells}×AA · ${vNom}V`, 'info');
        if (st?.shorted) drawPillBadge(ctx, 0, hh + 22, '⚡ SHORT CIRCUIT!', 'error');
        if (isSelected) drawSelectionFrame(ctx, -224, -hh - 10, 448, dh + 20);
        return true;
    }

    // =========================================================================
    // 10. 9V PP3 ALKALINE BATTERY — STUDIO WIRE-FREE WITH EXPOSED SNAP TERMINALS
    // =========================================================================
    // Exact 36px-grid top snap terminals: neg (-36, -180), pos (+36, -180)
    // Zero protruding side wires — authentic top hexagonal female (−) & round male (+) studs!
    function drawBattery9V(ctx, comp, evalData, isSelected) {
        const st = evalData?.sourceStates?.get(comp.id);
        const w = 188, h = 296, top = -148;
        const hw = w / 2;

        // 1. Subtle Top Terminal Base Shadow & Recessed Dark Phenolic Insulator Deck
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -hw, top, w, h, 14);
            ctx.fillStyle = '#090d16';
            ctx.fill();
        }, 20, 8, 5, 2.5);

        // Recessed top phenolic insulator plate sitting just above top shoulder (-156..-144)
        rRect(ctx, -hw + 18, top - 9, w - 36, 14, 5);
        ctx.fillStyle = '#141923';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // 2. Authentic Machined Nickel-Steel Top Snap-Fastener Terminals at (-36, -180) & (+36, -180)
        // LEFT (−) NEGATIVE: Wider Flared Hexagonal Female Snap Socket (classic 9V PP3 negative!)
        ctx.save();
        ctx.translate(-36, top - 22);
        // Vertical metal collar neck rising from insulator plate
        rRect(ctx, -18, 2, 36, 16, 2);
        ctx.fillStyle = '#8b98a8';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        // Flared hexagonal female cup rim centered around pin tip (-36, -180 -> local y = -10)
        ctx.beginPath();
        const hexR = 20;
        for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            const px = Math.cos(a) * hexR;
            const py = -10 + Math.sin(a) * 10.5;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#bcc7d4';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Inner dark socket recess inside female hex snap
        ctx.beginPath();
        ctx.ellipse(0, -10, 11.5, 5.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.restore();

        // RIGHT (+) POSITIVE: Smaller Circular Male Snap Stud (classic 9V PP3 positive!)
        ctx.save();
        ctx.translate(36, top - 22);
        // Machined cylindrical collar base
        rRect(ctx, -12, 2, 24, 16, 2);
        ctx.fillStyle = '#9aa7b8';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        // Rolled circular male snap stud head centered around pin tip (+36, -180 -> local y = -10)
        ctx.beginPath();
        ctx.ellipse(0, -10, 14.5, 9.2, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#cbd5e1';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Inner stamped rivet dimple
        ctx.beginPath();
        ctx.ellipse(0, -10, 7.2, 4.4, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#7b899b';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.0;
        ctx.stroke();
        ctx.restore();

        // 3. Matte Anodized Rectangular PP3 9V Battery Housing (clean beveled industrial jacket)
        ctx.save();
        rRect(ctx, -hw, top, w, h, 14);
        ctx.clip();

        // Matte charcoal-graphite lower casing
        const bodyGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
        bodyGrad.addColorStop(0, '#161d29');
        bodyGrad.addColorStop(0.5, '#242e3f');
        bodyGrad.addColorStop(1, '#101621');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(-hw, top, w, h);

        // Warm matte copper-bronze upper crown (top 32%)
        const goldGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
        goldGrad.addColorStop(0, '#9c5f1c');
        goldGrad.addColorStop(0.46, '#cf8f36');
        goldGrad.addColorStop(1, '#824b13');
        ctx.fillStyle = goldGrad;
        ctx.fillRect(-hw, top, w, 96);

        // Subtle rolled metallic crimping rim along top & bottom edges of steel jacket
        ctx.fillStyle = '#334155';
        ctx.fillRect(-hw, top, w, 6);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-hw, top + 95, w, 3);
        ctx.fillStyle = 'rgba(203, 213, 225, 0.25)';
        ctx.fillRect(-hw, top + 98, w, 1.5);
        ctx.fillStyle = '#0b1019';
        ctx.fillRect(-hw, top + h - 7, w, 7);
        ctx.restore();

        // Crisp outer casing border
        rRect(ctx, -hw, top, w, h, 14);
        ctx.strokeStyle = st?.shorted ? '#ef4444' : '#475569';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Subtle recessed inner panel border on charcoal lower section
        rRect(ctx, -hw + 14, top + 112, w - 28, h - 128, 7);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // 4. Precision Industrial Polarity Symbols & Battery Typography
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Crisp polarity badges directly aligned under Left (−) and Right (+) terminals!
        ctx.fillStyle = '#0f172a';
        ctx.font = '900 24px "JetBrains Mono", monospace';
        ctx.fillText('−', -36, top + 36);
        ctx.fillText('+', 36, top + 36);

        ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
        ctx.font = '800 9.5px "JetBrains Mono", monospace';
        ctx.fillText('9V INDUSTRIAL', 0, top + 74);

        // Bold 9V headline
        ctx.fillStyle = '#f59e0b';
        ctx.font = '800 60px "Inter", sans-serif';
        ctx.fillText('9V', 0, top + 162);

        // Clean technical rating block
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '800 12.5px "JetBrains Mono", monospace';
        ctx.fillText('ALKALINE · 6LR61', 0, top + 214);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '700 10px "JetBrains Mono", monospace';
        ctx.fillText('9.0V DC · PP3 CELL', 0, top + 236);

        // Subtle bottom barcode-style industrial detail strip
        ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
        const barW = [3, 1.5, 4, 2, 1.5, 3.5, 2, 4.5, 1.5, 3, 2, 3.5, 1.5, 4, 2];
        let bx = -44;
        for (const bw of barW) {
            ctx.fillRect(bx, top + 258, bw, 12);
            bx += bw + 3.2;
        }

        drawPillBadge(ctx, 0, top + h + 20, '9V PP3', 'info');
        if (st?.shorted) drawPillBadge(ctx, 0, top - 56, '⚡ SHORT CIRCUIT!', 'error');
        if (isSelected) drawSelectionFrame(ctx, -hw - 8, top - 46, w + 16, h + 60);
        return true;
    }

    // =========================================================================
    // SHARED PRECISION 7-SEGMENT VECTOR DIGIT RENDERER (FOR PSU & MULTIMETER!)
    // =========================================================================
    const SEG7_GLYPHS = {
        '0': 0b0111111, '1': 0b0000110, '2': 0b1011011, '3': 0b1001111,
        '4': 0b1100110, '5': 0b1101101, '6': 0b1111101, '7': 0b0000111,
        '8': 0b1111111, '9': 0b1101101 | 0b0000010, '-': 0b1000000,
        'O': 0b0111111, 'L': 0b0111000, 'F': 0b1110001, 'E': 0b1111001,
        'r': 0b1010000, ' ': 0
    };
    SEG7_GLYPHS['9'] = 0b1101111;

    function drawSevenSegChar(ctx, ch, x, y, digitW, digitH, onColor, ghostColor, slant = 0.08) {
        const mask = SEG7_GLYPHS[ch] !== undefined ? SEG7_GLYPHS[ch] : 0;
        const t = Math.max(2.2, digitH * 0.115);
        const halfT = t * 0.5;
        const gap = Math.max(0.9, t * 0.24);
        const hw = digitW;
        const hh = digitH;
        const midY = hh / 2;

        const drawH = (sx, sy, len, isOn) => {
            const fill = isOn ? onColor : ghostColor;
            if (!fill) return;
            ctx.beginPath();
            ctx.moveTo(sx + halfT, sy);
            ctx.lineTo(sx + len - halfT, sy);
            ctx.lineTo(sx + len, sy + halfT);
            ctx.lineTo(sx + len - halfT, sy + t);
            ctx.lineTo(sx + halfT, sy + t);
            ctx.lineTo(sx, sy + halfT);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
        };

        const drawV = (sx, sy, len, isOn) => {
            const fill = isOn ? onColor : ghostColor;
            if (!fill) return;
            ctx.beginPath();
            ctx.moveTo(sx + halfT, sy);
            ctx.lineTo(sx + t, sy + halfT);
            ctx.lineTo(sx + t, sy + len - halfT);
            ctx.lineTo(sx + halfT, sy + len);
            ctx.lineTo(sx, sy + len - halfT);
            ctx.lineTo(sx, sy + halfT);
            ctx.closePath();
            ctx.fillStyle = fill;
            ctx.fill();
        };

        ctx.save();
        ctx.translate(x, y);
        if (slant) ctx.transform(1, 0, -slant, 1, hh * slant * 0.5, 0);

        const hLen = hw - t - gap * 2;
        const vLen = midY - t * 0.5 - gap * 2;
        // a (top), b (top-right), c (bot-right), d (bottom), e (bot-left), f (top-left), g (middle)
        drawH(halfT + gap, 0, hLen, Boolean(mask & 1));
        drawV(hw - t, halfT + gap, vLen, Boolean(mask & 2));
        drawV(hw - t, midY + gap, vLen, Boolean(mask & 4));
        drawH(halfT + gap, hh - t, hLen, Boolean(mask & 8));
        drawV(0, midY + gap, vLen, Boolean(mask & 16));
        drawV(0, halfT + gap, vLen, Boolean(mask & 32));
        drawH(halfT + gap, midY - halfT, hLen, Boolean(mask & 64));
        ctx.restore();
    }

    // Draws a right-aligned string of vector 7-segment characters with decimal points
    function drawSevenSegString(ctx, str, rightX, topY, digitW, digitH, spacing, onColor, ghostColor, minSlots = 4) {
        const tokens = [];
        for (let i = 0; i < str.length; i++) {
            const c = str[i];
            if (c === '.' && tokens.length > 0) {
                tokens[tokens.length - 1].dot = true;
            } else if (c === '.') {
                tokens.push({ ch: ' ', dot: true });
            } else {
                tokens.push({ ch: c, dot: false });
            }
        }
        while (tokens.length < minSlots) {
            tokens.unshift({ ch: ' ', dot: false });
        }
        const totalW = tokens.length * digitW + (tokens.length - 1) * spacing;
        let curX = rightX - totalW;
        const dotR = Math.max(2.0, digitH * 0.068);
        for (const tok of tokens) {
            drawSevenSegChar(ctx, tok.ch, curX, topY, digitW, digitH, onColor, ghostColor);
            if (tok.dot) {
                ctx.beginPath();
                ctx.arc(curX + digitW + spacing * 0.32, topY + digitH - dotR * 1.05, dotR, 0, Math.PI * 2);
                ctx.fillStyle = onColor;
                ctx.fill();
            }
            curX += digitW + spacing;
        }
    }

    function drawTorxScrew(ctx, x, y, r = 7.5) {
        ctx.save();
        ctx.translate(x, y);
        ctx.beginPath();
        ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0e16';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = '#475569';
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // Hex socket recess
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            const px = Math.cos(a) * (r * 0.48);
            const py = Math.sin(a) * (r * 0.48);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.restore();
    }

    // =========================================================================
    // 10B. FLAGSHIP LABORATORY BENCH DC POWER SUPPLY (EPS-1205D PRO — 864x548px)
    // =========================================================================
    // Exact 36px-grid pins: neg (-180, +324), pos (+180, +324)
    // Interactive front-panel controls:
    //   • M1 (3.3V), M2 (5.0V), M3 (9.0V), M4 (12.0V) preset keys
    //   • OUTPUT ON / STANDBY switch button
    function drawBenchPSU(ctx, comp, evalData, isSelected) {
        const vSet = Number(comp.voltage !== undefined ? comp.voltage : 5.0);
        const enabled = comp.enabled !== false;
        const st = evalData?.sourceStates?.get(comp.id);
        const iMa = st ? Math.abs(st.currentMa || 0) : 0;
        const shorted = Boolean(st?.shorted);
        const powerW = enabled ? (vSet * iMa) / 1000 : 0;

        const w = 864, h = 548;
        const hw = w / 2;
        const top = -290;
        const bot = top + h; // +258

        // 1. Heavy Molded Rubber Benchtop Feet with Anti-Vibration Tread
        ctx.fillStyle = '#070a11';
        rRect(ctx, -hw + 44, bot - 6, 92, 24, 6); ctx.fill();
        rRect(ctx, hw - 136, bot - 6, 92, 24, 6); ctx.fill();
        ctx.fillStyle = '#1e293b';
        rRect(ctx, -hw + 54, bot + 10, 72, 4, 2); ctx.fill();
        rRect(ctx, hw - 126, bot + 10, 72, 4, 2); ctx.fill();

        // 2. Shrouded 4mm Banana Terminal Drop Leads to Exact 36px-Grid Pins (-180, 324) & (+180, 324)
        drawMetallicLead(ctx, [{ x: -180, y: 214 }, { x: -180, y: 324 }], 7.2);
        drawMetallicLead(ctx, [{ x: 180, y: 214 },  { x: 180, y: 324 }],  7.2);

        // 3. Multi-Layer Industrial Instrument Chassis (Outer Rubberized Bumper Frame + Anodized Aluminum Faceplate)
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -hw, top, w, h, 26);
            ctx.fillStyle = '#080c14';
            ctx.fill();
        }, 32, 13, 8, 4);

        // Outer protective molded dark-graphite bumper shell
        rRect(ctx, -hw, top, w, h, 26);
        const shellGrad = ctx.createLinearGradient(0, top, 0, bot);
        shellGrad.addColorStop(0, '#2c3749');
        shellGrad.addColorStop(0.5, '#1d2534');
        shellGrad.addColorStop(1, '#121824');
        ctx.fillStyle = shellGrad;
        ctx.fill();
        ctx.strokeStyle = shorted ? '#ef4444' : '#4b5b73';
        ctx.lineWidth = 3.0;
        ctx.stroke();

        // Molded protective corner bumper notches (Keysight / Rigol style!)
        ctx.strokeStyle = '#0d131e';
        ctx.lineWidth = 2.4;
        for (const [cx, cy, sx, sy] of [
            [-hw + 2, top + 2, 1, 1], [hw - 2, top + 2, -1, 1],
            [-hw + 2, bot - 2, 1, -1], [hw - 2, bot - 2, -1, -1]
        ]) {
            ctx.beginPath();
            ctx.moveTo(cx + sx * 46, cy);
            ctx.lineTo(cx + sx * 46, cy + sy * 12);
            ctx.moveTo(cx, cy + sy * 46);
            ctx.lineTo(cx + sx * 12, cy + sy * 46);
            ctx.stroke();
        }

        // Recessed Matte Brushed-Charcoal Aluminum Front Faceplate
        rRect(ctx, -hw + 22, top + 22, w - 44, h - 44, 16);
        const faceGrad = ctx.createLinearGradient(0, top + 22, 0, bot - 22);
        faceGrad.addColorStop(0, '#242f40');
        faceGrad.addColorStop(0.45, '#1d2635');
        faceGrad.addColorStop(1, '#161e2b');
        ctx.fillStyle = faceGrad;
        ctx.fill();
        ctx.strokeStyle = '#090e17';
        ctx.lineWidth = 2.4;
        ctx.stroke();

        // 4 Recessed Corner Hex/Torx Faceplate Fasteners
        drawTorxScrew(ctx, -hw + 40, top + 40, 6.5);
        drawTorxScrew(ctx,  hw - 40, top + 40, 6.5);
        drawTorxScrew(ctx, -hw + 40, bot - 40, 6.5);
        drawTorxScrew(ctx,  hw - 40, bot - 40, 6.5);

        // Recessed Side Heat-Sink Ventilation Louver Grilles (Left & Right Sides)
        for (let i = 0; i < 10; i++) {
            const ly = top + 92 + i * 24;
            ctx.fillStyle = '#0b1019';
            rRect(ctx, -hw + 34, ly, 22, 9, 3); ctx.fill();
            rRect(ctx, hw - 56, ly, 22, 9, 3);  ctx.fill();
            ctx.fillStyle = '#334155';
            ctx.fillRect(-hw + 36, ly + 8, 18, 1.2);
            ctx.fillRect(hw - 54, ly + 8, 18, 1.2);
        }

        // 4. Precision Engraved Brand & Model Header Strip
        ctx.fillStyle = '#38bdf8';
        rRect(ctx, -hw + 70, top + 44, 6, 26, 2);
        ctx.fill();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '900 22px "Inter", sans-serif';
        ctx.fillText('ELECTRICSIM', -hw + 86, top + 53);
        ctx.fillStyle = '#64748b';
        ctx.font = '800 10.5px "JetBrains Mono", monospace';
        ctx.fillText('PRECISION LABORATORY INSTRUMENTS', -hw + 86, top + 69);

        ctx.fillStyle = '#cbd5e1';
        ctx.font = '800 14.5px "JetBrains Mono", monospace';
        ctx.fillText('EPS-1205D PRO', -hw + 290, top + 53);
        ctx.fillStyle = '#64748b';
        ctx.font = '700 10.5px "JetBrains Mono", monospace';
        ctx.fillText('PROGRAMMABLE LINEAR DC SUPPLY', -hw + 290, top + 69);

        // Right-aligned dual rating & safety badge
        rRect(ctx, hw - 246, top + 42, 176, 32, 6);
        ctx.fillStyle = '#0d131f';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.textAlign = 'center';
        ctx.fillStyle = '#38bdf8';
        ctx.font = '800 14.5px "JetBrains Mono", monospace';
        ctx.fillText('0–12.0V · 5.0A MAX', hw - 158, top + 58);

        // Subtle horizontal hairline separator under header
        ctx.beginPath();
        ctx.moveTo(-hw + 70, top + 84);
        ctx.lineTo(hw - 70, top + 84);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 5. FLAGSHIP RECESSED SMOKED-GLASS INSTRUMENT DISPLAY BAY (Upper Left)
        const dispX = -hw + 70, dispY = top + 98, dispW = 458, dispH = 264;
        // Outer machined bezel recess
        rRect(ctx, dispX - 4, dispY - 4, dispW + 8, dispH + 8, 14);
        ctx.fillStyle = '#0b1019';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Deep smoked OLED/VFD glass display panel
        rRect(ctx, dispX, dispY, dispW, dispH, 10);
        const glassGrad = ctx.createLinearGradient(0, dispY, 0, dispY + dispH);
        glassGrad.addColorStop(0, '#04080f');
        glassGrad.addColorStop(0.5, '#070c15');
        glassGrad.addColorStop(1, '#09101c');
        ctx.fillStyle = glassGrad;
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Top inner bezel depth shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(dispX + 6, dispY + 2, dispW - 12, 5);

        // Left Telemetry Channels (Voltage, Current, Power) + Right Status Annunciator Column
        const colSplitX = dispX + dispW - 96;
        ctx.beginPath();
        ctx.moveTo(colSplitX, dispY + 12);
        ctx.lineTo(colSplitX, dispY + dispH - 40);
        ctx.moveTo(dispX + 14, dispY + 104);
        ctx.lineTo(colSplitX - 10, dispY + 104);
        ctx.moveTo(dispX + 14, dispY + 190);
        ctx.lineTo(colSplitX - 10, dispY + 190);
        ctx.moveTo(dispX + 14, dispY + dispH - 36);
        ctx.lineTo(dispX + dispW - 14, dispY + dispH - 36);
        ctx.strokeStyle = '#162032';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // --- CHANNEL 1: TRUE VECTOR 7-SEGMENT VOLTAGE READOUT (EMERALD VFD) ---
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#64748b';
        ctx.font = '800 11.5px "JetBrains Mono", monospace';
        ctx.fillText('CH1 · OUTPUT VOLTAGE', dispX + 18, dispY + 19);

        const vDigitsStr = enabled ? vSet.toFixed(2) : '0.00';
        const vOnCol = enabled ? (shorted ? '#f87171' : '#34d399') : '#1c2a3a';
        const vGhostCol = enabled ? 'rgba(52, 211, 153, 0.08)' : 'rgba(51, 65, 85, 0.14)';
        drawSevenSegString(ctx, vDigitsStr, colSplitX - 52, dispY + 34, 34, 58, 12, vOnCol, vGhostCol, 4);

        ctx.textAlign = 'left';
        ctx.font = '800 30px "JetBrains Mono", monospace';
        ctx.fillStyle = enabled ? (shorted ? '#fca5a5' : '#6ee7b7') : '#293548';
        ctx.fillText('V', colSplitX - 40, dispY + 76);

        // --- CHANNEL 2: TRUE VECTOR 7-SEGMENT CURRENT READOUT (AMBER VFD) ---
        ctx.fillStyle = '#64748b';
        ctx.font = '800 11.5px "JetBrains Mono", monospace';
        ctx.fillText('OUTPUT CURRENT', dispX + 18, dispY + 118);

        const curInAmps = !enabled || iMa >= 1000;
        const cDigitsStr = !enabled ? '0.00' : (curInAmps ? (iMa / 1000).toFixed(2) : iMa.toFixed(1));
        const cOnCol = enabled ? (shorted ? '#ef4444' : '#fbbf24') : '#1c2a3a';
        const cGhostCol = enabled ? 'rgba(251, 191, 36, 0.08)' : 'rgba(51, 65, 85, 0.14)';
        drawSevenSegString(ctx, cDigitsStr, colSplitX - 58, dispY + 131, 29, 48, 10, cOnCol, cGhostCol, 4);

        ctx.font = '800 22px "JetBrains Mono", monospace';
        ctx.fillStyle = enabled ? '#fcd34d' : '#293548';
        ctx.fillText(curInAmps ? 'A' : 'mA', colSplitX - 46, dispY + 166);

        // --- CHANNEL 3: LIVE POWER TELEMETRY BAR (ICE CYAN) ---
        ctx.textAlign = 'left';
        ctx.fillStyle = '#64748b';
        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.fillText('POWER', dispX + 18, dispY + 209);

        const pwrText = !enabled ? '0.00 W' : (powerW >= 1 ? `${powerW.toFixed(2)} W` : `${Math.round(powerW * 1000)} mW`);
        ctx.textAlign = 'right';
        ctx.fillStyle = enabled ? '#38bdf8' : '#293548';
        ctx.font = '800 18px "JetBrains Mono", monospace';
        ctx.fillText(pwrText, colSplitX - 16, dispY + 209);

        // --- RIGHT STATUS ANNUNCIATOR COLUMN (CV / CC / OVP / OCP) ---
        const drawAnnunciator = (ay, label, active, activeBg, activeBorder, activeText) => {
            rRect(ctx, colSplitX + 12, ay, 72, 28, 5);
            ctx.fillStyle = active ? activeBg : '#0d1422';
            ctx.fill();
            ctx.strokeStyle = active ? activeBorder : '#1e293b';
            ctx.lineWidth = 1.4;
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = active ? activeText : '#334155';
            ctx.font = '800 12.5px "JetBrains Mono", monospace';
            ctx.fillText(label, colSplitX + 48, ay + 14.5);
        };
        drawAnnunciator(dispY + 18,  'CV',  enabled && !shorted, 'rgba(34, 197, 94, 0.22)',  '#22c55e', '#4ade80');
        drawAnnunciator(dispY + 56,  'CC',  shorted,             'rgba(239, 68, 68, 0.26)',  '#ef4444', '#fca5a5');
        drawAnnunciator(dispY + 114, 'OVP', enabled,             'rgba(56, 189, 248, 0.16)', '#0284c7', '#7dd3fc');
        drawAnnunciator(dispY + 152, 'OCP', enabled,             'rgba(245, 158, 11, 0.16)', '#d97706', '#fcd34d');

        // --- BOTTOM LIVE SEGMENTED LED LOAD BAR-GRAPH ---
        const barX = dispX + 74, barY = dispY + dispH - 24, barW = dispW - 92;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#64748b';
        ctx.font = '800 9.5px "JetBrains Mono", monospace';
        ctx.fillText('LOAD', dispX + 18, barY + 5);
        const loadFrac = !enabled ? 0 : (shorted ? 1 : Math.min(1, iMa / 500));
        const totalBars = 30;
        const litBars = Math.round(loadFrac * totalBars);
        for (let i = 0; i < totalBars; i++) {
            const bx = barX + i * (barW / totalBars);
            const col = i < 18 ? '#22c55e' : i < 25 ? '#f59e0b' : '#ef4444';
            ctx.fillStyle = i < litBars ? col : '#131d2d';
            rRect(ctx, bx, barY, (barW / totalBars) - 3, 10, 1.5);
            ctx.fill();
        }

        // 6. RIGHT CONTROL BAY: MACHINED KNURLED VOLTAGE & CURRENT ENCODER KNOBS + PRESET KEYS + OUTPUT BUTTON
        const ctrlX = dispX + dispW + 22;
        const ctrlW = (hw - 70) - ctrlX;
        rRect(ctx, ctrlX, dispY - 4, ctrlW, dispH + 8, 12);
        ctx.fillStyle = '#18202e';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Precision Machined Multi-Step Knurled Rotary Encoder Knob
        const drawProKnob = (kx, ky, rad, frac, label, maxUnit, accentCol, majorLabels) => {
            const startA = (135 * Math.PI) / 180;
            const sweepA = (270 * Math.PI) / 180;
            const curA = startA + Math.max(0, Math.min(1, frac)) * sweepA;

            // Fine + major radial calibration ticks & printed scale values
            for (let i = 0; i <= 12; i++) {
                const a = startA + (i / 12) * sweepA;
                const major = (i % 3 === 0);
                const r1 = rad + 6;
                const r2 = rad + (major ? 14 : 10);
                ctx.beginPath();
                ctx.moveTo(kx + Math.cos(a) * r1, ky + Math.sin(a) * r1);
                ctx.lineTo(kx + Math.cos(a) * r2, ky + Math.sin(a) * r2);
                ctx.strokeStyle = i / 12 <= frac + 0.01 ? accentCol : '#475569';
                ctx.lineWidth = major ? 2.2 : 1.2;
                ctx.stroke();
            }
            // Printed min / mid / max legends around knob
            if (majorLabels) {
                ctx.font = '700 9.5px "JetBrains Mono", monospace';
                ctx.fillStyle = '#94a3b8';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const lblAngs = [startA, startA + sweepA * 0.5, startA + sweepA];
                for (let j = 0; j < 3; j++) {
                    const lr = rad + 23;
                    ctx.fillText(majorLabels[j], kx + Math.cos(lblAngs[j]) * lr, ky + Math.sin(lblAngs[j]) * lr);
                }
            }

            // Recessed bezel collar shadow
            ctx.save();
            ctx.translate(kx, ky);
            ctx.beginPath();
            ctx.arc(0, 0, rad + 4, 0, Math.PI * 2);
            ctx.fillStyle = '#090d16';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(2, 4, rad, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.52)';
            ctx.fill();

            // 24-tooth knurled outer skirt
            ctx.rotate(curA);
            ctx.beginPath();
            const teeth = 24;
            for (let i = 0; i < teeth * 2; i++) {
                const a = (i / (teeth * 2)) * Math.PI * 2;
                const rr = i % 2 === 0 ? rad : rad - 2.2;
                if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
                else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
            }
            ctx.closePath();
            ctx.fillStyle = '#18202c';
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.4;
            ctx.stroke();

            // Chamfered brushed-aluminum inner accent ring
            ctx.beginPath();
            ctx.arc(0, 0, rad * 0.78, 0, Math.PI * 2);
            ctx.fillStyle = '#8b99ab';
            ctx.fill();

            // Matte anodized dark-graphite center cap
            ctx.beginPath();
            ctx.arc(0, 0, rad * 0.70, 0, Math.PI * 2);
            ctx.fillStyle = '#1e2736';
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.4;
            ctx.stroke();

            // Recessed center finger-dimple
            ctx.beginPath();
            ctx.arc(rad * 0.34, 0, rad * 0.14, 0, Math.PI * 2);
            ctx.fillStyle = '#0f172a';
            ctx.fill();

            // High-visibility machined pointer notch
            ctx.beginPath();
            ctx.moveTo(rad * 0.52, 0);
            ctx.lineTo(rad - 3, 0);
            ctx.strokeStyle = accentCol;
            ctx.lineWidth = 4.6;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();

            ctx.textAlign = 'center';
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '800 12px "JetBrains Mono", monospace';
            ctx.fillText(label, kx, ky + rad + 21);
            ctx.fillStyle = '#64748b';
            ctx.font = '700 8.5px "JetBrains Mono", monospace';
            ctx.fillText(maxUnit, kx, ky + rad + 32);
        };

        drawProKnob(196, top + 161, 41, vSet / 12, 'VOLTAGE', 'COARSE · FINE', '#34d399', ['0V', '6V', '12V']);
        drawProKnob(318, top + 161, 31, 0.80, 'CURRENT', 'LIMIT 5A', '#fbbf24', ['0A', '2.5A', '5A']);

        // Interactive Silicone Preset Memory Keys: M1 (3.3V), M2 (5.0V), M3 (9.0V), M4 (12V)
        // Centered along y = top + 257 (-33) inside the right control bay!
        const memPresets = [
            { tag: 'M1', v: 3.3,  x: 151 },
            { tag: 'M2', v: 5.0,  x: 217 },
            { tag: 'M3', v: 9.0,  x: 283 },
            { tag: 'M4', v: 12.0, x: 349 }
        ];
        for (const mp of memPresets) {
            const isAct = enabled && Math.abs(vSet - mp.v) < 0.08;
            const ky = top + 257;
            rRect(ctx, mp.x - 28, ky - 16, 56, 32, 6);
            ctx.fillStyle = isAct ? '#10314a' : '#0f172a';
            ctx.fill();
            ctx.strokeStyle = isAct ? '#38bdf8' : '#334155';
            ctx.lineWidth = isAct ? 1.8 : 1.3;
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isAct ? '#7dd3fc' : '#94a3b8';
            ctx.font = '800 9.5px "JetBrains Mono", monospace';
            ctx.fillText(mp.tag, mp.x, ky - 5);
            ctx.fillStyle = isAct ? '#f8fafc' : '#64748b';
            ctx.font = '800 10px "JetBrains Mono", monospace';
            ctx.fillText(`${mp.v}V`, mp.x, ky + 7);
        }

        // Heavy Tactile Guarded OUTPUT ON / STANDBY Button (centered at x = 250, y = top + 318 = +28)
        const btnX = 250, btnY = top + 318;
        // Recessed guard bezel around output switch
        rRect(ctx, btnX - 114, btnY - 31, 228, 62, 11);
        ctx.fillStyle = '#090d16';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Main tactile switch cap
        rRect(ctx, btnX - 108, btnY - 25, 216, 50, 8);
        ctx.fillStyle = enabled ? '#064e3b' : '#1b2434';
        ctx.fill();
        ctx.strokeStyle = enabled ? '#34d399' : '#475569';
        ctx.lineWidth = 2.4;
        ctx.stroke();

        // Glowing LED bar indicator inside output button
        rRect(ctx, btnX - 90, btnY - 12, 10, 24, 3);
        ctx.fillStyle = enabled ? '#22c55e' : '#334155';
        ctx.fill();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = enabled ? '#ecfdf5' : '#94a3b8';
        ctx.font = '900 17.5px "JetBrains Mono", monospace';
        ctx.fillText(enabled ? 'OUTPUT  ON' : 'STANDBY OFF', btnX + 12, btnY + 1);

        // 7. LOWER RECESSED ANODIZED TERMINAL MANIFOLD WITH HEAVY-DUTY 4MM BINDING POSTS
        const termY = top + 380;
        rRect(ctx, -hw + 70, termY, w - 140, 126, 12);
        ctx.fillStyle = '#141c29';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Engraved safety specs along top-left & top-right of terminal manifold
        ctx.textAlign = 'left';
        ctx.fillStyle = '#64748b';
        ctx.font = '800 10px "JetBrains Mono", monospace';
        ctx.fillText('DC OUTPUT TERMINALS · ISOLATED', -hw + 90, termY + 18);
        ctx.textAlign = 'right';
        ctx.fillText('⚠ MAX ±60V TO EARTH · 5A CONTINUOUS', hw - 90, termY + 18);

        // Subtle brass ground-strap link indicator between NEG (−) and EARTH (⏚)
        ctx.beginPath();
        ctx.moveTo(-132, termY + 72);
        ctx.lineTo(-48, termY + 72);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 3.0;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        const drawProBindingPost = (bx, by, ringCol, capCol, sym, label, sub) => {
            // Recessed circular panel socket grommet
            ctx.beginPath();
            ctx.arc(bx, by, 44, 0, Math.PI * 2);
            ctx.fillStyle = '#090d16';
            ctx.fill();
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Machined 6-sided steel hex locknut base
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (i * Math.PI) / 3;
                const px = bx + Math.cos(a) * 38;
                const py = by + Math.sin(a) * 38;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = '#64748b';
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.8;
            ctx.stroke();

            // 12-flute scalloped color-coded thumb-nut insulator collar
            ctx.beginPath();
            const flutes = 12;
            for (let i = 0; i < flutes * 2; i++) {
                const a = (i / (flutes * 2)) * Math.PI * 2;
                const rr = i % 2 === 0 ? 31.5 : 28.5;
                const px = bx + Math.cos(a) * rr;
                const py = by + Math.sin(a) * rr;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = capCol;
            ctx.fill();
            ctx.strokeStyle = ringCol;
            ctx.lineWidth = 2.8;
            ctx.stroke();

            // Machined inner brass contact sleeve
            ctx.beginPath();
            ctx.arc(bx, by, 17, 0, Math.PI * 2);
            ctx.fillStyle = '#b48a3e';
            ctx.fill();
            ctx.strokeStyle = '#1e293b';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Deep 4mm banana jack bore
            ctx.beginPath();
            ctx.arc(bx, by, 11, 0, Math.PI * 2);
            ctx.fillStyle = '#04060a';
            ctx.fill();

            // Polarity symbol + clean technical silkscreen
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#f8fafc';
            ctx.font = '900 26px "JetBrains Mono", monospace';
            ctx.fillText(sym, bx + 52, by - 14);
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '800 13px "JetBrains Mono", monospace';
            ctx.fillText(label, bx + 52, by + 8);
            ctx.fillStyle = '#64748b';
            ctx.font = '700 9.5px "JetBrains Mono", monospace';
            ctx.fillText(sub, bx + 52, by + 24);
        };

        drawProBindingPost(-180, termY + 72, '#94a3b8', '#151c28', '−', 'NEG 0V', 'RETURN');
        drawProBindingPost(0,    termY + 72, '#22c55e', '#14532d', '⏚', 'GND',    'CHASSIS');
        drawProBindingPost(180,  termY + 72, '#fca5a5', '#b91c1c', '+', 'POS +V', '0–12V');

        if (shorted) {
            drawPillBadge(ctx, 0, top - 28, '⚡ PSU SHORT CIRCUIT · OVERCURRENT TRIP!', 'error');
        }
        if (isSelected) drawSelectionFrame(ctx, -hw - 12, top - 12, w + 24, h + 82);
        return true;
    }

    // =========================================================================
    // 10C. FLUKE-GRADE RUGGED HANDHELD DIGITAL MULTIMETER (DMM-87V TRUE RMS)
    // =========================================================================
    // Exact 36px-grid pins: neg (-72, +252), pos (+72, +252)
    function drawMultimeter(ctx, comp, evalData, isSelected) {
        const st = evalData?.meterStates?.get(comp.id) || { mode: comp.mode || 'V', display: '0.00 V', numeric: 0 };
        const mode = comp.mode || st.mode || 'V';
        const w = 296, h = 440;
        const hw = w / 2;
        const top = -224;
        const bot = top + h; // +216

        // Sculpted ergonomic tapered Fluke rubber holster silhouette (subtle waist grip curves!)
        const traceHolster = () => {
            ctx.beginPath();
            ctx.moveTo(-hw + 28, top);
            ctx.lineTo(hw - 28, top);
            ctx.quadraticCurveTo(hw, top, hw, top + 28);
            ctx.lineTo(hw, top + 148);
            ctx.quadraticCurveTo(hw - 7, top + 230, hw - 4, top + 318);
            ctx.lineTo(hw - 2, bot - 28);
            ctx.quadraticCurveTo(hw - 2, bot, hw - 30, bot);
            ctx.lineTo(-hw + 30, bot);
            ctx.quadraticCurveTo(-hw + 2, bot, -hw + 2, bot - 28);
            ctx.lineTo(-hw + 4, top + 318);
            ctx.quadraticCurveTo(-hw + 7, top + 230, -hw, top + 148);
            ctx.lineTo(-hw, top + 28);
            ctx.quadraticCurveTo(-hw, top, -hw + 28, top);
            ctx.closePath();
        };

        // 1. Matte probe terminal drop leads + molded strain-relief probe boots to (±72, +252)
        drawMetallicLead(ctx, [{ x: -72, y: 196 }, { x: -72, y: 252 }], 5.2);
        drawMetallicLead(ctx, [{ x: 72, y: 196 },  { x: 72, y: 252 }],  5.2);
        // Molded black & red probe plug exit collars emerging from bottom of meter
        ctx.fillStyle = '#1e293b';
        rRect(ctx, -82, bot - 4, 20, 14, 4); ctx.fill();
        ctx.fillStyle = '#b91c1c';
        rRect(ctx, 62, bot - 4, 20, 14, 4);  ctx.fill();

        // 2. Protective Mustard-Yellow Rugged Elastomer Rubber Holster
        withPhysicalShadow(ctx, () => {
            traceHolster();
            ctx.fillStyle = '#090d16';
            ctx.fill();
        }, 26, 10, 6, 3);

        traceHolster();
        const holGrad = ctx.createLinearGradient(0, top, 0, bot);
        holGrad.addColorStop(0, '#f0be16');
        holGrad.addColorStop(0.5, '#dfaa0d');
        holGrad.addColorStop(1, '#bd8908');
        ctx.fillStyle = holGrad;
        ctx.fill();
        ctx.strokeStyle = '#926406';
        ctx.lineWidth = 2.6;
        ctx.stroke();

        // Top molded lanyard/tilt-stand notch + reinforced corner bumper seams
        rRect(ctx, -32, top + 3, 64, 6, 3);
        ctx.fillStyle = '#a17206';
        ctx.fill();

        // Sculpted rubber ergonomic waist grip ribs
        ctx.fillStyle = '#b38007';
        for (let i = 0; i < 6; i++) {
            const gy = top + 168 + i * 22;
            rRect(ctx, -hw + 5, gy, 7, 10, 3); ctx.fill();
            rRect(ctx, hw - 12, gy, 7, 10, 3); ctx.fill();
        }

        // Recessed Dark-Graphite Inner Instrument Chassis
        rRect(ctx, -hw + 16, top + 16, w - 32, h - 32, 18);
        const bodyGrad = ctx.createLinearGradient(0, top + 16, 0, bot - 16);
        bodyGrad.addColorStop(0, '#232b38');
        bodyGrad.addColorStop(0.5, '#1b222e');
        bodyGrad.addColorStop(1, '#141a24');
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        ctx.strokeStyle = '#0a0e16';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // 3. Top Industrial Brand & Safety Plate
        ctx.fillStyle = '#facc15';
        rRect(ctx, -hw + 28, top + 28, 4.5, 16, 2);
        ctx.fill();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#facc15';
        ctx.font = '900 13.5px "Inter", sans-serif';
        ctx.fillText('ELECTRICSIM', -hw + 38, top + 36);
        ctx.textAlign = 'right';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '800 9.5px "JetBrains Mono", monospace';
        ctx.fillText('87V · TRUE RMS', hw - 28, top + 36);

        // 4. Deeply Recessed Backlit Transflective Olive-Sage LCD Display Window
        const lcdX = -hw + 26, lcdY = top + 50, lcdW = w - 52, lcdH = 108;
        // Outer molded dark bezel frame
        rRect(ctx, lcdX, lcdY, lcdW, lcdH, 10);
        ctx.fillStyle = '#0a0f18';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Transflective sage-olive LCD panel with subtle top bezel shadow
        rRect(ctx, lcdX + 7, lcdY + 7, lcdW - 14, lcdH - 14, 6);
        const lcdGrad = ctx.createLinearGradient(0, lcdY + 7, 0, lcdY + lcdH - 7);
        lcdGrad.addColorStop(0, '#8ea991');
        lcdGrad.addColorStop(0.16, '#a0bc9f');
        lcdGrad.addColorStop(1, '#92ae94');
        ctx.fillStyle = lcdGrad;
        ctx.fill();
        ctx.strokeStyle = '#3f5443';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Inner top depth shadow cast by LCD bezel lip
        ctx.fillStyle = 'rgba(15, 28, 18, 0.22)';
        ctx.fillRect(lcdX + 9, lcdY + 8, lcdW - 18, 4);

        // LCD Top Annunciator Bar (AUTO · DC · Mode + tiny battery icon)
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#18281c';
        ctx.font = '800 9.5px "JetBrains Mono", monospace';
        ctx.fillText(mode === 'V' ? 'AUTO  DC' : mode === 'mA' ? 'AUTO  DC mA' : 'AUTO  OHMS', lcdX + 15, lcdY + 14);
        ctx.textAlign = 'right';
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.fillText('TRUE RMS', lcdX + lcdW - 34, lcdY + 15);
        // Tiny LCD battery indicator icon in top-right
        ctx.strokeStyle = '#18281c';
        ctx.lineWidth = 1.1;
        ctx.strokeRect(lcdX + lcdW - 28, lcdY + 15, 11, 6.5);
        ctx.fillStyle = '#18281c';
        ctx.fillRect(lcdX + lcdW - 17, lcdY + 17, 2, 2.5);
        ctx.fillRect(lcdX + lcdW - 26, lcdY + 17, 7, 2.5);

        // Parse display string into numeric part + unit for authentic vector 7-segment LCD digits!
        const rawDisp = String(st.display || '0.00 V').trim();
        const dispMatch = rawDisp.match(/^([+-]?\d+(?:\.\d+)?|OL)\s*(.*)$/);
        let numPart = dispMatch ? dispMatch[1] : '0.00';
        const unitPart = dispMatch ? dispMatch[2] : (mode === 'V' ? 'V' : mode === 'mA' ? 'mA' : 'Ω');
        let isNeg = false;
        if (numPart.startsWith('-')) {
            isNeg = true;
            numPart = numPart.slice(1);
        } else if (numPart.startsWith('+')) {
            numPart = numPart.slice(1);
        }

        // Negative polarity sign on left of LCD when negative
        if (isNeg) {
            ctx.fillStyle = '#0e1b11';
            ctx.fillRect(lcdX + 16, lcdY + 49, 12, 3.5);
        }

        // Authentic Vector 7-Segment Dark-LCD Digits + Ghost Backdrop!
        drawSevenSegString(
            ctx,
            numPart.slice(0, 5),
            lcdX + lcdW - 46,
            lcdY + 30,
            23,
            40,
            7,
            '#0e1b11',
            'rgba(14, 27, 17, 0.09)',
            4
        );

        // Crisp LCD Unit Annunciator beside digits
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0e1b11';
        ctx.font = '900 17px "JetBrains Mono", monospace';
        ctx.fillText(unitPart, lcdX + lcdW - 40, lcdY + 61);

        // Authentic Graduated Analog Bar-Graph Ruler along bottom of LCD
        const barX = lcdX + 15, barY = lcdY + lcdH - 22, barW = lcdW - 30;
        const mag = Math.min(1, Math.abs(Number(st.numeric) || 0) / (mode === 'V' ? 12 : mode === 'mA' ? 100 : 10000));
        const segCount = 26;
        const activeSegs = Math.round(mag * segCount);
        for (let i = 0; i < segCount; i++) {
            const sx = barX + i * (barW / segCount);
            const major = (i % 5 === 0);
            ctx.fillStyle = i < activeSegs ? '#0e1b11' : 'rgba(14, 27, 17, 0.14)';
            ctx.fillRect(sx, barY + (major ? 0 : 2.5), (barW / segCount) - 1.8, major ? 8.5 : 6);
        }

        // 5. Row of 4 Raised Molded Silicone Function Keys + Secondary Legends Above
        const fnKeys = [
            { lbl: 'HOLD', sub: 'AUTO', bg: '#334155', fg: '#e2e8f0' },
            { lbl: 'MIN MAX', sub: 'PEAK', bg: '#334155', fg: '#e2e8f0' },
            { lbl: 'RANGE', sub: 'MAN', bg: '#334155', fg: '#e2e8f0' },
            { lbl: 'MODE', sub: 'SELECT', bg: '#d4a00d', fg: '#0f172a' }
        ];
        for (let i = 0; i < 4; i++) {
            const bx = -87 + i * 58;
            const by = top + 179;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = i === 3 ? '#facc15' : '#64748b';
            ctx.font = '800 7px "JetBrains Mono", monospace';
            ctx.fillText(fnKeys[i].sub, bx, by - 14.5);

            // Tactile bottom 3D button skirt
            rRect(ctx, bx - 23, by - 8, 46, 20, 5.5);
            ctx.fillStyle = '#090d16';
            ctx.fill();
            // Raised silicone key cap
            rRect(ctx, bx - 23, by - 10, 46, 19, 5.5);
            ctx.fillStyle = fnKeys[i].bg;
            ctx.fill();
            ctx.strokeStyle = i === 3 ? '#fef08a' : '#475569';
            ctx.lineWidth = 1.0;
            ctx.stroke();

            ctx.fillStyle = fnKeys[i].fg;
            ctx.font = '800 8px "Inter", sans-serif';
            ctx.fillText(fnKeys[i].lbl, bx, by - 0.5);
        }

        // 6. Precision Fluke-Style Central Rotary Range Selector Deck
        const dialY = top + 281;
        const dialR = 50;

        // Subtle circular silkscreen calibration track around dial
        ctx.beginPath();
        ctx.arc(0, dialY, dialR + 9, -Math.PI * 1.25, Math.PI * 0.25);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Fine perimeter detent ticks around dial
        for (let i = 0; i < 16; i++) {
            const a = (i / 16) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (dialR + 4), dialY + Math.sin(a) * (dialR + 4));
            ctx.lineTo(Math.cos(a) * (dialR + 7), dialY + Math.sin(a) * (dialR + 7));
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
            ctx.lineWidth = 1.1;
            ctx.stroke();
        }

        const modePositions = [
            { id: 'off',  ang: -Math.PI * 0.68, lbl: 'OFF',  col: '#94a3b8' },
            { id: 'V',    ang: -Math.PI * 0.34, lbl: 'V⎓',   col: '#facc15' },
            { id: 'mA',   ang: 0,               lbl: 'mA⎓',  col: '#38bdf8' },
            { id: 'ohm',  ang:  Math.PI * 0.34, lbl: 'Ω',    col: '#34d399' },
            { id: 'cont', ang:  Math.PI * 0.68, lbl: '•)))', col: '#94a3b8' }
        ];

        for (const mp of modePositions) {
            const a = mp.ang - Math.PI / 2;
            const isAct = mp.id === mode;
            ctx.beginPath();
            ctx.moveTo(Math.cos(a) * (dialR + 5), dialY + Math.sin(a) * (dialR + 5));
            ctx.lineTo(Math.cos(a) * (dialR + 13), dialY + Math.sin(a) * (dialR + 13));
            ctx.strokeStyle = isAct ? mp.col : '#64748b';
            ctx.lineWidth = isAct ? 3.2 : 1.6;
            ctx.stroke();

            const rLbl = dialR + 26;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = isAct ? mp.col : '#cbd5e1';
            ctx.font = isAct ? '900 13.5px "JetBrains Mono", monospace' : '800 11.5px "JetBrains Mono", monospace';
            ctx.fillText(mp.lbl, Math.cos(a) * rLbl, dialY + Math.sin(a) * rLbl);
        }

        // Deep recessed circular selector well
        ctx.beginPath();
        ctx.arc(0, dialY, dialR + 3, 0, Math.PI * 2);
        ctx.fillStyle = '#070a11';
        ctx.fill();

        // Sculpted Tapered Ergonomic Selector Knob
        const dialAngle = mode === 'V' ? -Math.PI * 0.34 : mode === 'mA' ? 0 : Math.PI * 0.34;
        ctx.save();
        ctx.translate(0, dialY);

        // Dial dish base
        ctx.beginPath();
        ctx.arc(0, 0, dialR - 1, 0, Math.PI * 2);
        ctx.fillStyle = '#242e3e';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Subtle inner machined circle groove
        ctx.beginPath();
        ctx.arc(0, 0, dialR - 9, 0, Math.PI * 2);
        ctx.strokeStyle = '#151c27';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        ctx.rotate(dialAngle);
        // Sculpted tapered ergonomic thumb bar (wider tail grip, tapered pointer nose!)
        ctx.beginPath();
        ctx.moveTo(-7, -dialR + 5);
        ctx.lineTo(7, -dialR + 5);
        ctx.lineTo(13, dialR - 9);
        ctx.quadraticCurveTo(13, dialR - 5, 8, dialR - 5);
        ctx.lineTo(-8, dialR - 5);
        ctx.quadraticCurveTo(-13, dialR - 5, -13, dialR - 9);
        ctx.closePath();
        ctx.fillStyle = '#121822';
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Tactile thumb grip ribs on handle
        ctx.fillStyle = '#334155';
        for (const gy of [-6, 2, 10, 18, 26]) {
            ctx.fillRect(-6, gy, 12, 2.2);
        }

        // High-contrast pointer nose wedge
        ctx.beginPath();
        ctx.moveTo(0, -dialR + 8);
        ctx.lineTo(-5.5, -dialR + 22);
        ctx.lineTo(5.5, -dialR + 22);
        ctx.closePath();
        ctx.fillStyle = mode === 'V' ? '#facc15' : mode === 'mA' ? '#38bdf8' : '#34d399';
        ctx.fill();
        ctx.restore();

        // 7. Bottom Recessed 4mm Safety Probe Jack Deck: COM (−) at -72, VΩmA (+) at +72
        rRect(ctx, -hw + 24, top + 346, w - 48, 68, 10);
        ctx.fillStyle = '#10151f';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        for (const [jx, bg, ring, tag, sub] of [
            [-72, '#0f172a', '#94a3b8', 'COM', '− BLACK'],
            [72,  '#b91c1c', '#fca5a5', 'VΩmA', '+ RED']
        ]) {
            const jy = top + 382;
            // Outer molded safety recess ring
            ctx.beginPath();
            ctx.arc(jx, jy, 21.5, 0, Math.PI * 2);
            ctx.fillStyle = '#070a10';
            ctx.fill();

            // Shrouded colored insulator collar
            ctx.beginPath();
            ctx.arc(jx, jy, 17.5, 0, Math.PI * 2);
            ctx.fillStyle = bg;
            ctx.fill();
            ctx.strokeStyle = ring;
            ctx.lineWidth = 2.8;
            ctx.stroke();

            // Inner brass split-contact sleeve
            ctx.beginPath();
            ctx.arc(jx, jy, 10.5, 0, Math.PI * 2);
            ctx.fillStyle = '#b48a3e';
            ctx.fill();

            // Deep 4mm probe socket bore
            ctx.beginPath();
            ctx.arc(jx, jy, 6.8, 0, Math.PI * 2);
            ctx.fillStyle = '#04060a';
            ctx.fill();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#e2e8f0';
            ctx.font = '800 9px "JetBrains Mono", monospace';
            ctx.fillText(tag, jx, top + 356);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '700 7.8px "JetBrains Mono", monospace';
            ctx.fillText(sub, jx, top + 407);
        }

        // Center CAT III / Fused Safety Triangle Emblem between Jacks
        ctx.save();
        ctx.translate(0, top + 368);
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(9, 7);
        ctx.lineTo(-9, 7);
        ctx.closePath();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.font = '900 8.5px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 2);
        ctx.restore();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#94a3b8';
        ctx.font = '800 7.5px "JetBrains Mono", monospace';
        ctx.fillText('CAT III 600V', 0, top + 388);
        ctx.fillStyle = '#64748b';
        ctx.font = '700 7px "JetBrains Mono", monospace';
        ctx.fillText('400mA FUSED', 0, top + 399);

        if (isSelected) drawSelectionFrame(ctx, -hw - 8, top - 8, w + 16, h + 46);
        return true;
    }

    // =========================================================================
    // 11. BRUSHED 130-SIZE HOBBY DC MOTOR + MACHINED ENCODER SPINNER (MATTE)
    // =========================================================================
    // Exact pins: pos (-108, -18), neg (-108, +18)
    function drawMotor(ctx, comp, evalData, isSelected, animAngleRad = 0) {
        const st = evalData?.motorStates?.get(comp.id) || { rpm: 0, spinning: false, direction: 'IDLE', voltage: 0, currentMa: 0, overloaded: false };

        // 1. Clean Red (+) and Black (−) Matte Insulated Leads soldered to Copper Terminal Lugs -> (-108, ±18)
        drawInsulatedLead(ctx, { x: -74, y: -18 }, { x: -88, y: -18 }, { x: -96, y: -18 }, { x: -108, y: -18 }, '#7f1d1d', '#dc2626', 4.4);
        drawInsulatedLead(ctx, { x: -74, y: 18 },  { x: -88, y: 18 },  { x: -96, y: 18 },  { x: -108, y: 18 },  '#334155', '#1e293b', 4.4);

        // Copper-brass solder terminal lugs
        ctx.fillStyle = '#c27821';
        rRect(ctx, -78, -23, 12, 10, 2); ctx.fill();
        rRect(ctx, -78, 13, 12, 10, 2);  ctx.fill();

        // 2. Main Matte Galvanized-Steel Can + Molded Yellow Endbell (-68..+78, -42..+42)
        withPhysicalShadow(ctx, () => {
            rRect(ctx, -68, -42, 146, 84, 9);
            ctx.fillStyle = '#334155';
            ctx.fill();
        }, 14, 6, 4, 2);

        ctx.save();
        rRect(ctx, -68, -42, 146, 84, 9);
        ctx.clip();

        // Clean matte cylindrical steel housing gradient (no harsh mirror glare)
        const canGrad = ctx.createLinearGradient(0, -42, 0, 42);
        canGrad.addColorStop(0, '#a7b4c4');
        canGrad.addColorStop(0.52, '#8b99ab');
        canGrad.addColorStop(1, '#586578');
        ctx.fillStyle = canGrad;
        ctx.fillRect(-50, -42, 128, 84);

        // Molded yellow-amber nylon endbell on left (-68..-48)
        const bellGrad = ctx.createLinearGradient(0, -42, 0, 42);
        bellGrad.addColorStop(0, '#eab308');
        bellGrad.addColorStop(0.55, '#ca8a04');
        bellGrad.addColorStop(1, '#854d0e');
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
        ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DC-130 · 9V', 6, 0);
        ctx.restore();

        rRect(ctx, -68, -42, 146, 84, 9);
        ctx.strokeStyle = st.overloaded ? '#ef4444' : '#64748b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 3. Stepped Nose Bearing Boss + Machined Steel Shaft (+78..+110)
        rRect(ctx, 78, -16, 12, 32, 3);
        ctx.fillStyle = '#9aa7b8';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Machined steel drive shaft
        rRect(ctx, 90, -4.5, 18, 9, 2);
        ctx.fillStyle = '#b4c0ce';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 0.9;
        ctx.stroke();

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

        // Clean matte light-silver perimeter frame (authentic 5161AS side flange)
        rRect(ctx, -dw / 2, -dh / 2, dw, dh, 7);
        ctx.fillStyle = '#c2ccd8';
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
        drawBenchPSU,
        drawMultimeter,
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

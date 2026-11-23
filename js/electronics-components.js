(function (root) {
    'use strict';

    // =========================================================================
    // ELECTRONSIM — STUDIO-GRADE 2D PHYSICAL HARDWARE ARTWORK LIBRARY
    // =========================================================================
    // Unified true-to-life millimeter scale: 0.1" (2.54 mm) = 36 px (~14.17 px/mm)
    // Every 74xx DIP-14 / DIP-16 IC plugs PIN-FOR-PIN into Breadboard Row e (-72)
    // and Row f (+72), straddling the center DIP trough identically to real life!

    function rRect(ctx, x, y, w, h, r) {
        const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + w, y, x + w, y + h, radius);
        ctx.arcTo(x + w, y + h, x, y + h, radius);
        ctx.arcTo(x, y + h, x, y, radius);
        ctx.arcTo(x, y, x + w, y, radius);
        ctx.closePath();
    }

    function drawMetalLeg(ctx, pts, width = 3.8) {
        if (!pts || pts.length < 2) return;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Soft drop shadow
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.lineWidth = width + 2.2;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y + 1.5);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y + 1.5);
        ctx.stroke();

        // Dark outer nickel-steel casing
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = width + 1.4;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();

        // Tinned silver core
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = width;
        ctx.stroke();

        // Specular metallic glint
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = Math.max(1, width * 0.34);
        ctx.stroke();
        ctx.restore();
    }

    function drawFaultBadge(ctx, x, y, text, severity = 'error') {
        ctx.save();
        ctx.font = '800 12px "Inter", sans-serif';
        const padX = 12;
        const tw = ctx.measureText(text).width + padX * 2;
        const th = 26;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        rRect(ctx, x - tw / 2, y - th / 2, tw, th, 13);
        ctx.fillStyle = severity === 'warn' ? 'rgba(217, 119, 6, 0.96)' : 'rgba(220, 38, 38, 0.97)';
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = severity === 'warn' ? '#fde68a' : '#fecaca';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y + 0.5);
        ctx.restore();
    }

    // -------------------------------------------------------------------------
    // 1. REALISTIC 3D-MOLDED BREADBOARD (TRUE 36px = 0.1" DIP PITCH!)
    // -------------------------------------------------------------------------
    function drawBreadboard2D(ctx, comp, arg3, arg4, arg5, arg6) {
        const Solver = root.ElectronicsSolver;
        if (!Solver) return;
        // Support both (ctx, comp, evalData, isSelected, hoverStripId) and (ctx, comp, spec, evalData, isSelected, hoverStripId)
        const hasSpecArg = arg3 && typeof arg3 === 'object' && typeof arg3.pitch === 'number';
        const spec = hasSpecArg ? arg3 : Solver.getBreadboardSpec(comp.variant || 'half');
        const evalData = hasSpecArg ? arg4 : arg3;
        const isSelected = hasSpecArg ? arg5 : arg4;
        const hoverStripId = hasSpecArg ? arg6 : arg5;

        const hw = spec.width / 2;
        const hh = spec.height / 2;

        // 1. Molded warm-ivory ABS plastic body + realistic side interlocking tabs + ambient shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.58)';
        ctx.shadowBlur = 32;
        ctx.shadowOffsetY = 12;

        // Side dovetail mounting tabs (authentic 400-point breadboard detail)
        ctx.fillStyle = '#e5e7eb';
        rRect(ctx, -hw - 10, -hh * 0.45, 14, 38, 3);
        ctx.fill();
        rRect(ctx, -hw - 10, hh * 0.25, 14, 38, 3);
        ctx.fill();

        // Main ABS body
        rRect(ctx, -hw, -hh, spec.width, spec.height, 14);
        const bodyGrad = ctx.createLinearGradient(0, -hh, 0, hh);
        bodyGrad.addColorStop(0, '#f8f9fa');
        bodyGrad.addColorStop(0.48, '#eef0f4');
        bodyGrad.addColorStop(1, '#dcdfe6');
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        ctx.restore();

        // Outer beveled molded rim + top inner highlight
        rRect(ctx, -hw, -hh, spec.width, spec.height, 14);
        ctx.strokeStyle = isSelected ? '#8b9dff' : '#94a3b8';
        ctx.lineWidth = isSelected ? 4 : 2.2;
        ctx.stroke();

        rRect(ctx, -hw + 3, -hh + 3, spec.width - 6, spec.height - 6, 11);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 2. Center DIP IC Trough Groove (y = -50..+50, sits EXACTLY between Row e (-72) and Row f (+72)!)
        const troughY = -48;
        const troughH = 96;
        rRect(ctx, -hw + 18, troughY, spec.width - 36, troughH, 8);
        const troughGrad = ctx.createLinearGradient(0, troughY, 0, troughY + troughH);
        troughGrad.addColorStop(0, '#c4cbd6');
        troughGrad.addColorStop(0.18, '#dde2ea');
        troughGrad.addColorStop(0.5, '#e8ecf2');
        troughGrad.addColorStop(0.82, '#d5dce6');
        troughGrad.addColorStop(1, '#bcc5d3');
        ctx.fillStyle = troughGrad;
        ctx.fill();
        ctx.strokeStyle = '#aeb8c7';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Subtle embossed trough centerline
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.32)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-hw + 34, 0);
        ctx.lineTo(hw - 34, 0);
        ctx.stroke();

        // 3. Power rail divider channels & bold printed red (+) / blue (−) rail lines
        if (spec.hasRails) {
            for (const gy of [-244, 244]) {
                ctx.fillStyle = '#cbd5e1';
                ctx.fillRect(-hw + 14, gy - 2, spec.width - 28, 4);
                ctx.fillStyle = 'rgba(255,255,255,0.65)';
                ctx.fillRect(-hw + 14, gy + 2, spec.width - 28, 1.5);
            }

            const railLeft = spec.startX + 18;
            const railRight = spec.startX + (spec.cols - 1) * spec.pitch - 18;

            // Bold red (+) stripes
            ctx.lineWidth = 4.2;
            ctx.lineCap = 'round';
            ctx.strokeStyle = '#dc2626';
            ctx.beginPath();
            ctx.moveTo(railLeft, spec.topRailPosY - 22);
            ctx.lineTo(railRight, spec.topRailPosY - 22);
            ctx.moveTo(railLeft, spec.botRailPosY - 19);
            ctx.lineTo(railRight, spec.botRailPosY - 19);
            ctx.stroke();

            // Bold blue (−) stripes
            ctx.strokeStyle = '#2563eb';
            ctx.beginPath();
            ctx.moveTo(railLeft, spec.topRailNegY + 19);
            ctx.lineTo(railRight, spec.topRailNegY + 19);
            ctx.moveTo(railLeft, spec.botRailNegY + 22);
            ctx.lineTo(railRight, spec.botRailNegY + 22);
            ctx.stroke();

            // Crisp printed + and − rail polarity symbols
            ctx.font = '800 20px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#dc2626';
            ctx.fillText('+', -hw + 26, spec.topRailPosY);
            ctx.fillText('+', hw - 26, spec.topRailPosY);
            ctx.fillText('+', -hw + 26, spec.botRailPosY);
            ctx.fillText('+', hw - 26, spec.botRailPosY);
            ctx.fillStyle = '#2563eb';
            ctx.fillText('−', -hw + 26, spec.topRailNegY);
            ctx.fillText('−', hw - 26, spec.topRailNegY);
            ctx.fillText('−', -hw + 26, spec.botRailNegY);
            ctx.fillText('−', hw - 26, spec.botRailNegY);
        }

        // 4. Crisp molded row letters (a..e, f..j) and column numbers (1, 5, 10, 15, 20, 25, 30)
        ctx.font = '800 14px "JetBrains Mono", monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const topRowLetters = ['a', 'b', 'c', 'd', 'e'];
        const botRowLetters = ['f', 'g', 'h', 'i', 'j'];
        for (let r = 0; r < 5; r++) {
            ctx.fillText(topRowLetters[r], -hw + 22, spec.topRows[r]);
            ctx.fillText(topRowLetters[r], hw - 22, spec.topRows[r]);
            ctx.fillText(botRowLetters[r], -hw + 22, spec.botRows[r]);
            ctx.fillText(botRowLetters[r], hw - 22, spec.botRows[r]);
        }

        ctx.font = '800 13px "JetBrains Mono", monospace';
        ctx.fillStyle = '#64748b';
        for (let c = 0; c < spec.cols; c++) {
            const colNum = c + 1;
            if (colNum === 1 || colNum % 5 === 0) {
                const lx = spec.startX + c * spec.pitch;
                ctx.fillText(String(colNum), lx, -241);
                ctx.fillText(String(colNum), lx, 241);
            }
        }

        // 5. Highlight active hovered internal strip/rail in bright translucent emerald!
        const holes = Solver.getBreadboardHoles(comp);
        if (hoverStripId) {
            const matching = holes.filter(h => h.stripId === hoverStripId);
            if (matching.length > 0) {
                const minLx = Math.min(...matching.map(h => h.lx));
                const maxLx = Math.max(...matching.map(h => h.lx));
                const minLy = Math.min(...matching.map(h => h.ly));
                const maxLy = Math.max(...matching.map(h => h.ly));
                rRect(ctx, minLx - 12, minLy - 12, (maxLx - minLx) + 24, (maxLy - minLy) + 24, 8);
                ctx.fillStyle = 'rgba(34, 197, 94, 0.26)';
                ctx.fill();
                ctx.strokeStyle = '#16a34a';
                ctx.lineWidth = 2.6;
                ctx.stroke();
            }
        }

        // Plugged-in pin lookup for emerald connection rings
        const pluggedHoles = new Set();
        if (evalData && evalData.pluggedPinMap) {
            for (const holeKey of evalData.pluggedPinMap.values()) {
                pluggedHoles.add(holeKey);
            }
        }

        // 6. Render 3D chamfered breadboard sockets with recessed phosphor-bronze contact jaws!
        for (const h of holes) {
            const isPlugged = pluggedHoles.has(h.key);
            const isHovStrip = hoverStripId && h.stripId === hoverStripId;
            const v = evalData?.pinVoltages?.get(h.key);

            // Chamfered molded top bevel
            ctx.fillStyle = '#b4bdc9';
            ctx.fillRect(h.lx - 7.5, h.ly - 7.5, 15, 15);
            // Bottom-right lit bevel lip
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(h.lx - 6.5, h.ly + 6, 13.5, 1.6);
            ctx.fillRect(h.lx + 6, h.ly - 6.5, 1.6, 13.5);

            // Deep dark square socket cavity
            ctx.fillStyle = isPlugged
                ? '#15803d'
                : isHovStrip
                ? '#166534'
                : '#161d29';
            ctx.fillRect(h.lx - 5.2, h.ly - 5.2, 10.4, 10.4);

            // Subtle metallic spring clip sheen inside socket
            if (!isPlugged) {
                ctx.fillStyle = 'rgba(148, 163, 184, 0.34)';
                ctx.fillRect(h.lx - 4.2, h.ly - 1.5, 1.8, 3);
                ctx.fillRect(h.lx + 2.4, h.ly - 1.5, 1.8, 3);
            } else {
                // Live emerald/cyan plugged-in contact ring
                ctx.strokeStyle = (v !== null && v !== undefined && v >= 2.0) ? '#06b6d4' : '#22c55e';
                ctx.lineWidth = 2.4;
                ctx.strokeRect(h.lx - 8.5, h.ly - 8.5, 17, 17);
            }
        }
    }

    // -------------------------------------------------------------------------
    // 2. STUDIO-GRADE 2-LEG 5MM LED (kind: 'lamp', pins -36,0 & +36,0)
    // -------------------------------------------------------------------------
    function drawLed2D(ctx, comp, evalData, isSelected) {
        const st = evalData?.lampStates?.get(comp.id) || { lit: false, brightness: 0, currentMa: 0, overloaded: false, reason: 'off' };
        const colorKey = comp.color || 'emerald';
        const palette = {
            emerald: { main: '#22c55e', bright: '#86efac', core: '#ecfdf5', dark: '#14532d', glow: 'rgba(34, 197, 94,' },
            cyan:    { main: '#38bdf8', bright: '#bae6fd', core: '#f0f9ff', dark: '#0c4a6e', glow: 'rgba(56, 189, 248,' },
            amber:   { main: '#f59e0b', bright: '#fde68a', core: '#fffbeb', dark: '#78350f', glow: 'rgba(245, 158, 11,' },
            red:     { main: '#ef4444', bright: '#fca5a5', core: '#fef2f2', dark: '#7f1d1d', glow: 'rgba(239, 68, 68,' }
        }[colorKey] || { main: '#22c55e', bright: '#86efac', core: '#ecfdf5', dark: '#14532d', glow: 'rgba(34, 197, 94,' };

        // 2 Realistic Bent Tinned Silver Legs spanning (-36, 0) to (+36, 0) (2 breadboard holes!)
        // Left Anode (+) leg with classic bend kink
        drawMetalLeg(ctx, [
            { x: -10, y: -18 },
            { x: -14, y: -8 },
            { x: -24, y: -6 },
            { x: -29, y: 0 },
            { x: -36, y: 0 }
        ], 3.8);
        // Right Cathode (−) straight angled leg
        drawMetalLeg(ctx, [
            { x: 10, y: -18 },
            { x: 20, y: 0 },
            { x: 36, y: 0 }
        ], 3.8);

        // Realistic optical bloom when lit & healthy
        const b = st.overloaded ? 0 : (st.brightness || 0);
        if (st.lit && b > 0) {
            ctx.save();
            const rad = 54 + b * 44;
            const bloom = ctx.createRadialGradient(0, -52, 6, 0, -52, rad);
            bloom.addColorStop(0, `${palette.glow}${0.78 * b})`);
            bloom.addColorStop(0.45, `${palette.glow}${0.32 * b})`);
            bloom.addColorStop(1, `${palette.glow}0)`);
            ctx.fillStyle = bloom;
            ctx.beginPath();
            ctx.arc(0, -52, rad, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // True-scale 5mm Domed Epoxy Glass LED Body (~54px wide x 72px tall)
        ctx.save();
        if (isSelected) {
            ctx.strokeStyle = '#8b9dff';
            ctx.lineWidth = 2.6;
            rRect(ctx, -38, -94, 76, 82, 18);
            ctx.stroke();
        }

        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 5;

        // Dome silhouette with molded bottom flange & flat cathode bevel on right
        ctx.beginPath();
        ctx.moveTo(-29, -16);
        ctx.lineTo(-29, -23);
        ctx.lineTo(-25, -23);
        ctx.lineTo(-25, -56);
        ctx.arc(0, -56, 25, Math.PI, 0, false);
        ctx.lineTo(25, -23);
        ctx.lineTo(26.5, -23); // Clipped flat cathode rim
        ctx.lineTo(26.5, -16);
        ctx.closePath();

        if (st.overloaded) {
            const burnGrad = ctx.createRadialGradient(-6, -58, 4, 0, -52, 34);
            burnGrad.addColorStop(0, '#78350f');
            burnGrad.addColorStop(0.55, '#1f2937');
            burnGrad.addColorStop(1, '#090d16');
            ctx.fillStyle = burnGrad;
        } else if (st.lit && b > 0) {
            const litGrad = ctx.createRadialGradient(-6, -58, 4, 0, -52, 34);
            litGrad.addColorStop(0, '#ffffff');
            litGrad.addColorStop(0.28, palette.core);
            litGrad.addColorStop(0.58, palette.bright);
            litGrad.addColorStop(0.88, palette.main);
            litGrad.addColorStop(1, palette.dark);
            ctx.fillStyle = litGrad;
        } else {
            const offGrad = ctx.createLinearGradient(-25, -75, 25, -18);
            offGrad.addColorStop(0, palette.bright);
            offGrad.addColorStop(0.35, palette.main);
            offGrad.addColorStop(1, palette.dark);
            ctx.globalAlpha = 0.72;
            ctx.fillStyle = offGrad;
        }
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Outer glass edge rim
        ctx.strokeStyle = isSelected ? '#8b9dff' : (st.overloaded ? '#ef4444' : (st.lit ? palette.bright : palette.main));
        ctx.lineWidth = isSelected ? 2.6 : 1.8;
        ctx.stroke();

        // Translucent molded bottom collar ring
        ctx.fillStyle = st.overloaded ? 'rgba(15,23,42,0.75)' : (st.lit ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)');
        ctx.fillRect(-28, -22, 54, 5.5);

        // Internal Lead Frame: Left Anode Post + Right Cathode Reflector Cup + Bond Wire + Glowing Die!
        ctx.fillStyle = st.lit ? 'rgba(255,255,255,0.52)' : 'rgba(203,213,225,0.50)';
        // Left Anode Post
        ctx.fillRect(-13, -44, 5.5, 27);
        // Right Cathode Cup/Anvil
        ctx.beginPath();
        ctx.moveTo(3, -48);
        ctx.lineTo(15, -48);
        ctx.lineTo(15, -17);
        ctx.lineTo(8.5, -17);
        ctx.lineTo(8.5, -36);
        ctx.lineTo(3, -41);
        ctx.closePath();
        ctx.fill();
        // Tiny golden wire-bond arc from anode post to cathode cup
        ctx.strokeStyle = st.lit ? '#fef08a' : 'rgba(250, 204, 21, 0.55)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-8, -43);
        ctx.quadraticCurveTo(0, -52, 8, -47);
        ctx.stroke();
        // Bright glowing LED die core on cup when lit
        if (st.lit && !st.overloaded) {
            ctx.beginPath();
            ctx.arc(8, -47, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }

        // Sculpted curved glass specular reflection highlights
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 3.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -56, 17.5, Math.PI * 1.12, Math.PI * 1.48);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-18, -46);
        ctx.lineTo(-18, -28);
        ctx.stroke();

        // Popped/cracked electric spark if overloaded
        if (st.overloaded) {
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 3.0;
            ctx.beginPath();
            ctx.moveTo(-15, -66); ctx.lineTo(-4, -52); ctx.lineTo(10, -61);
            ctx.moveTo(-4, -52); ctx.lineTo(4, -36);
            ctx.stroke();
            drawFaultBadge(ctx, 0, -104, `⚡ ${Math.round(st.currentMa)}mA BURN-OUT!`, 'error');
        } else if (st.highCurrentWarn) {
            drawFaultBadge(ctx, 0, -104, `⚠ ${st.currentMa.toFixed(0)}mA`, 'warn');
        }
        ctx.restore();

        // Clean polarity markers & live status
        ctx.font = '800 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f87171';
        ctx.fillText('+', -36, -16);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('−', 36, -16);

        ctx.font = '700 11.5px "Inter", sans-serif';
        if (st.overloaded) {
            ctx.fillStyle = '#ff6b6b';
            ctx.fillText('OVERLOAD', 0, 20);
        } else if (st.lit) {
            ctx.fillStyle = palette.bright;
            ctx.fillText(`${comp.label || 'LED'} · ${st.currentMa.toFixed(1)}mA`, 0, 20);
        } else if (st.reason === 'open_cathode') {
            ctx.fillStyle = '#f6b944';
            ctx.fillText('OPEN −', 0, 20);
        } else if (st.reason === 'reverse_bias') {
            ctx.fillStyle = '#ff776e';
            ctx.fillText('REV BIAS', 0, 20);
        } else {
            ctx.fillStyle = '#96a5ba';
            ctx.fillText(comp.label || 'LED', 0, 20);
        }
    }

    // -------------------------------------------------------------------------
    // 3. STUDIO-GRADE 4-LEG RGB LED (kind: 'rgb_led', pins -54,-18,+18,+54 @ y=36)
    // -------------------------------------------------------------------------
    function drawRgbLed2D(ctx, comp, evalData, isSelected) {
        const st = evalData?.rgbStates?.get(comp.id) || {
            r: { brightness: 0, currentMa: 0 },
            g: { brightness: 0, currentMa: 0 },
            b: { brightness: 0, currentMa: 0 },
            overloaded: false
        };

        // 4 Splayed tinned metal legs (exact 36px pitch -> 4 adjacent breadboard cols!)
        drawMetalLeg(ctx, [{ x: -16, y: -6 }, { x: -34, y: 12 }, { x: -54, y: 36 }], 3.6);
        drawMetalLeg(ctx, [{ x: -5.5, y: -6 }, { x: -12, y: 12 }, { x: -18, y: 36 }], 3.8);
        drawMetalLeg(ctx, [{ x: 5.5, y: -6 }, { x: 12, y: 12 }, { x: 18, y: 36 }], 3.6);
        drawMetalLeg(ctx, [{ x: 16, y: -6 }, { x: 34, y: 12 }, { x: 54, y: 36 }], 3.6);

        const rVal = Math.round(255 * Math.min(1, st.r.brightness));
        const gVal = Math.round(255 * Math.min(1, st.g.brightness));
        const bVal = Math.round(255 * Math.min(1, st.b.brightness));
        const maxB = Math.max(st.r.brightness, st.g.brightness, st.b.brightness);

        if (!st.overloaded && maxB > 0.05) {
            const bloom = ctx.createRadialGradient(0, -48, 6, 0, -48, 86);
            bloom.addColorStop(0, `rgba(${rVal},${gVal},${bVal},${0.82 * maxB})`);
            bloom.addColorStop(0.5, `rgba(${rVal},${gVal},${bVal},${0.32 * maxB})`);
            bloom.addColorStop(1, `rgba(${rVal},${gVal},${bVal},0)`);
            ctx.fillStyle = bloom;
            ctx.beginPath();
            ctx.arc(0, -48, 86, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.48)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 5;

        // Frosted clear 5mm dome (~60px wide x 76px tall)
        ctx.beginPath();
        ctx.moveTo(-31, -6);
        ctx.lineTo(-31, -13);
        ctx.lineTo(-27, -13);
        ctx.lineTo(-27, -48);
        ctx.arc(0, -48, 27, Math.PI, 0, false);
        ctx.lineTo(27, -13);
        ctx.lineTo(31, -13);
        ctx.lineTo(31, -6);
        ctx.closePath();

        if (st.overloaded) {
            ctx.fillStyle = '#291515';
        } else if (maxB > 0.05) {
            const grad = ctx.createRadialGradient(-6, -52, 4, 0, -44, 38);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.45, `rgb(${Math.max(40, rVal)},${Math.max(40, gVal)},${Math.max(40, bVal)})`);
            grad.addColorStop(1, `rgba(${rVal},${gVal},${bVal},0.85)`);
            ctx.fillStyle = grad;
        } else {
            const offG = ctx.createLinearGradient(-27, -70, 27, -8);
            offG.addColorStop(0, 'rgba(241, 245, 249, 0.65)');
            offG.addColorStop(0.5, 'rgba(203, 213, 225, 0.42)');
            offG.addColorStop(1, 'rgba(148, 163, 184, 0.25)');
            ctx.fillStyle = offG;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = isSelected ? '#8b9dff' : (st.overloaded ? '#ef4444' : '#cbd5e1');
        ctx.lineWidth = isSelected ? 2.8 : 1.8;
        ctx.stroke();

        // 3 Internal R/G/B Die Points
        const dies = [
            { x: -10, col: st.r.brightness > 0.05 ? '#ff4d4d' : 'rgba(239,68,68,0.4)' },
            { x: 0,   col: st.g.brightness > 0.05 ? '#4ade80' : 'rgba(34,197,94,0.4)' },
            { x: 10,  col: st.b.brightness > 0.05 ? '#60a5fa' : 'rgba(59,130,246,0.4)' }
        ];
        for (const d of dies) {
            ctx.beginPath();
            ctx.arc(d.x, -34, 4, 0, Math.PI * 2);
            ctx.fillStyle = d.col;
            ctx.fill();
        }

        // Specular curved highlight
        ctx.strokeStyle = 'rgba(255,255,255,0.72)';
        ctx.lineWidth = 3.6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, -48, 19, Math.PI * 1.12, Math.PI * 1.48);
        ctx.stroke();
        ctx.restore();

        // Leg color-coded tags
        ctx.font = '800 11.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#f87171'; ctx.fillText('R', -54, 52);
        ctx.fillStyle = '#94a3b8'; ctx.fillText('−', -18, 52);
        ctx.fillStyle = '#4ade80'; ctx.fillText('G', 18, 52);
        ctx.fillStyle = '#60a5fa'; ctx.fillText('B', 54, 52);

        if (st.overloaded) {
            drawFaultBadge(ctx, 0, -94, '⚡ RGB OVERLOAD!', 'error');
        }
    }

    // -------------------------------------------------------------------------
    // 4. STUDIO-GRADE 1-4x AA BATTERY HOLDER (kind: 'battery', pins -108,0 / +108,0)
    // -------------------------------------------------------------------------
    function drawAAHolder2D(ctx, comp, evalData, isSelected) {
        const cells = Math.max(1, Math.min(4, Number(comp.cells) || (comp.voltage ? Math.round(comp.voltage / 1.5) : 3)));
        const voltage = comp.voltage && !comp.cells ? Number(comp.voltage) : cells * 1.5;
        const st = evalData?.sourceStates?.get(comp.id);

        // True-scale 50mm x 14.5mm AA cells in ribbed matte-black ABS tray
        const cellH = 38;
        const cellGap = 6;
        const innerH = cells * cellH + (cells - 1) * cellGap;
        const packW = 186;
        const packH = Math.max(66, innerH + 26);
        const packTop = -packH / 2;

        // Thick curved PVC insulated exit leads to (-108, 0) and (+108, 0)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = 5.2;
        // Black negative lead
        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(-packW / 2 + 2, 0);
        ctx.lineTo(-108, 0);
        ctx.stroke();
        // Red positive lead
        ctx.strokeStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(packW / 2 - 2, 0);
        ctx.lineTo(108, 0);
        ctx.stroke();
        // Subtle wire shine
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = 'rgba(255,255,255,0.22)';
        ctx.beginPath();
        ctx.moveTo(-packW / 2 + 2, -1); ctx.lineTo(-108, -1);
        ctx.moveTo(packW / 2 - 2, -1); ctx.lineTo(108, -1);
        ctx.stroke();
        ctx.restore();

        // Molded matte-black ABS battery tray with ambient shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.58)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 8;
        rRect(ctx, -packW / 2, packTop, packW, packH, 10);
        const trayGrad = ctx.createLinearGradient(0, packTop, 0, packTop + packH);
        trayGrad.addColorStop(0, '#222938');
        trayGrad.addColorStop(0.5, '#121722');
        trayGrad.addColorStop(1, '#090c14');
        ctx.fillStyle = trayGrad;
        ctx.fill();
        ctx.restore();

        rRect(ctx, -packW / 2, packTop, packW, packH, 10);
        ctx.strokeStyle = isSelected ? '#8b9dff' : (st?.shorted ? '#ef4444' : '#475569');
        ctx.lineWidth = isSelected ? 3.2 : 2.0;
        ctx.stroke();

        // Recessed inner bay
        rRect(ctx, -packW / 2 + 8, packTop + 8, packW - 16, packH - 16, 6);
        ctx.fillStyle = '#06080f';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Render 1..4 ultra-realistic cylindrical AA cells with alternating polarity & coiled springs!
        const cellW = packW - 40;
        const startY = -innerH / 2;
        for (let i = 0; i < cells; i++) {
            const by = startY + i * (cellH + cellGap);
            const flip = i % 2 === 1;
            const bx = -cellW / 2;

            // Stainless negative coil spring + chrome positive contact button
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2.0;
            if (!flip) {
                // Positive chrome button nub on right
                rRect(ctx, bx + cellW - 1, by + cellH / 2 - 7, 7, 14, 2);
                ctx.fillStyle = '#e2e8f0';
                ctx.fill();
                // Coiled negative spring on left
                ctx.beginPath();
                ctx.moveTo(bx - 10, by + 7);
                ctx.lineTo(bx - 2, by + 13);
                ctx.lineTo(bx - 9, by + 19);
                ctx.lineTo(bx - 2, by + 25);
                ctx.lineTo(bx - 10, by + 31);
                ctx.stroke();
            } else {
                rRect(ctx, bx - 6, by + cellH / 2 - 7, 7, 14, 2);
                ctx.fillStyle = '#e2e8f0';
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(bx + cellW + 10, by + 7);
                ctx.lineTo(bx + cellW + 2, by + 13);
                ctx.lineTo(bx + cellW + 9, by + 19);
                ctx.lineTo(bx + cellW + 2, by + 25);
                ctx.lineTo(bx + cellW + 10, by + 31);
                ctx.stroke();
            }

            // Cylindrical matte-black body gradient
            const cellGrad = ctx.createLinearGradient(0, by, 0, by + cellH);
            cellGrad.addColorStop(0, '#1e2430');
            cellGrad.addColorStop(0.24, '#475569');
            cellGrad.addColorStop(0.45, '#1f2937');
            cellGrad.addColorStop(1, '#090d16');
            rRect(ctx, bx, by, cellW, cellH, 4.5);
            ctx.fillStyle = cellGrad;
            ctx.fill();

            // Copper-gold Duracell-style anodized positive crown (32% of cell length)
            const capW = Math.round(cellW * 0.32);
            const capX = flip ? bx : (bx + cellW - capW);
            const capGrad = ctx.createLinearGradient(0, by, 0, by + cellH);
            capGrad.addColorStop(0, '#92400e');
            capGrad.addColorStop(0.26, '#fcd34d');
            capGrad.addColorStop(0.48, '#d97706');
            capGrad.addColorStop(1, '#78350f');
            ctx.fillStyle = capGrad;
            rRect(ctx, capX, by, capW, cellH, 3.5);
            ctx.fill();

            // Specular cylindrical gloss highlight strip across full AA battery
            ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
            ctx.fillRect(bx + 3, by + 4.5, cellW - 6, 4.5);

            // Crisp metallic rim around cell
            rRect(ctx, bx, by, cellW, cellH, 4.5);
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.65)';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Crisp + and AA 1.5V markings
            ctx.fillStyle = '#0f172a';
            ctx.font = '800 14px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('+', capX + capW / 2, by + cellH / 2 + 0.5);

            ctx.fillStyle = '#e2e8f0';
            ctx.font = '800 12px "JetBrains Mono", monospace';
            const bodyCenterX = flip ? (bx + capW + (cellW - capW) / 2) : (bx + (cellW - capW) / 2);
            ctx.fillText('AA · 1.5V', bodyCenterX, by + cellH / 2 + 0.5);
        }

        // Polarity & Voltage Label
        ctx.font = '800 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#94a3b8'; ctx.fillText('−', -104, -18);
        ctx.fillStyle = '#f87171'; ctx.fillText('+', 104, -18);
        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 14px "Inter", sans-serif';
        ctx.fillText(`${cells}×AA Pack · ${voltage.toFixed(1)}V`, 0, packTop + packH + 20);

        if (st?.shorted) {
            drawFaultBadge(ctx, 0, packTop - 22, '⚡ SHORT CIRCUIT!', 'error');
        }
    }

    // -------------------------------------------------------------------------
    // 5. STUDIO-GRADE 9V PP3 ALKALINE BATTERY (kind: 'battery9v', pins -90,0 / +90,0)
    // -------------------------------------------------------------------------
    function drawBattery9V2D(ctx, comp, evalData, isSelected) {
        const st = evalData?.sourceStates?.get(comp.id);
        const w = 116, h = 162, top = -92;

        // Curved insulated Red (+) & Black (−) snap-clip leads to (-90, 0) and (+90, 0)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = 5.2;
        ctx.strokeStyle = '#334155';
        ctx.beginPath();
        ctx.moveTo(-26, top - 14);
        ctx.bezierCurveTo(-76, top - 14, -90, top + 30, -90, 0);
        ctx.stroke();
        ctx.strokeStyle = '#dc2626';
        ctx.beginPath();
        ctx.moveTo(26, top - 14);
        ctx.bezierCurveTo(76, top - 14, 90, top + 30, 90, 0);
        ctx.stroke();
        ctx.restore();

        // Realistic molded black 9V snap-on cap bridging top studs
        rRect(ctx, -40, top - 22, 80, 18, 5);
        ctx.fillStyle = '#111827';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Chrome snap terminal rims peeking under cap (left hexagonal -, right round +)
        ctx.fillStyle = '#cbd5e1';
        rRect(ctx, -34, top - 6, 22, 7, 2);
        ctx.fill();
        rRect(ctx, 12, top - 6, 22, 7, 2);
        ctx.fill();

        // Main Rectangular PP3 Metallic-Sheen Body with ambient shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.58)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 9;
        rRect(ctx, -w / 2, top, w, h, 10);
        const bodyGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        bodyGrad.addColorStop(0, '#0f172a');
        bodyGrad.addColorStop(0.24, '#334155');
        bodyGrad.addColorStop(0.45, '#1e293b');
        bodyGrad.addColorStop(1, '#070a12');
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        ctx.restore();

        // Copper-gold anodized top crown (top 32%)
        ctx.save();
        rRect(ctx, -w / 2, top, w, h, 10);
        ctx.clip();
        const goldGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        goldGrad.addColorStop(0, '#92400e');
        goldGrad.addColorStop(0.26, '#fde047');
        goldGrad.addColorStop(0.50, '#d97706');
        goldGrad.addColorStop(1, '#78350f');
        ctx.fillStyle = goldGrad;
        ctx.fillRect(-w / 2, top, w, 50);

        // Crisp metallic divider pinstripe
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.fillRect(-w / 2, top + 50, w, 2);

        // Vertical specular metal highlight band
        ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.fillRect(-w / 2 + 16, top, 14, h);
        ctx.restore();

        rRect(ctx, -w / 2, top, w, h, 10);
        ctx.strokeStyle = isSelected ? '#8b9dff' : (st?.shorted ? '#ef4444' : '#64748b');
        ctx.lineWidth = isSelected ? 3.2 : 2.0;
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 15px "JetBrains Mono", monospace';
        ctx.fillText('−        +', 0, top + 25);

        ctx.fillStyle = '#fbbf24';
        ctx.font = '800 36px "Inter", sans-serif';
        ctx.fillText('9V', 0, top + 98);
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillText('ALKALINE PP3', 0, top + 132);

        ctx.font = '800 14px "JetBrains Mono", monospace';
        ctx.fillStyle = '#94a3b8'; ctx.fillText('−', -90, 20);
        ctx.fillStyle = '#f87171'; ctx.fillText('+', 90, 20);

        if (st?.shorted) {
            drawFaultBadge(ctx, 0, top - 34, '⚡ 9V SHORT CIRCUIT!', 'error');
        }
    }

    // -------------------------------------------------------------------------
    // 6. STUDIO-GRADE LAB BENCH POWER SUPPLY (kind: 'psu', pins -54,90 / +54,90)
    // -------------------------------------------------------------------------
    function drawBenchPSU2D(ctx, comp, evalData, isSelected) {
        const st = evalData?.sourceStates?.get(comp.id);
        const enabled = comp.enabled !== false;
        const vSet = Number(comp.voltage ?? 5.0);
        const iMa = st ? st.currentMa : 0;

        const w = 236, h = 160, top = -88;

        // Brushed gunmetal laboratory enclosure with shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.58)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 9;
        rRect(ctx, -w / 2, top, w, h, 14);
        const grad = ctx.createLinearGradient(0, top, 0, top + h);
        grad.addColorStop(0, '#334155');
        grad.addColorStop(0.15, '#1e293b');
        grad.addColorStop(1, '#0b1120');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        rRect(ctx, -w / 2, top, w, h, 14);
        ctx.strokeStyle = isSelected ? '#8b9dff' : (st?.shorted ? '#ef4444' : '#64748b');
        ctx.lineWidth = isSelected ? 3.2 : 2.0;
        ctx.stroke();

        // Recessed front faceplate bezel
        rRect(ctx, -w / 2 + 10, top + 10, w - 20, h - 20, 8);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Recessed dual digital LED display glass window
        rRect(ctx, -100, top + 18, 142, 66, 7);
        ctx.fillStyle = '#030711';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Live crisp Voltage (Emerald) & Current (Amber) digital readout
        ctx.font = '800 24px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = enabled ? '#34d399' : '#334155';
        ctx.fillText(`${enabled ? vSet.toFixed(1) : 'OFF'} V`, -88, top + 40);
        ctx.font = '700 16px "JetBrains Mono", monospace';
        ctx.fillStyle = enabled ? '#fbbf24' : '#334155';
        ctx.fillText(`${enabled ? (iMa >= 1000 ? (iMa / 1000).toFixed(2) + ' A' : iMa.toFixed(1) + ' mA') : '0.0 mA'}`, -88, top + 66);

        // Right-side Rotary Voltage Control Knob + Illuminated Output LED
        const knobX = 76, knobY = top + 52;
        ctx.beginPath();
        ctx.arc(knobX, knobY, 21, 0, Math.PI * 2);
        const kGrad = ctx.createRadialGradient(knobX - 5, knobY - 5, 3, knobX, knobY, 22);
        kGrad.addColorStop(0, '#475569');
        kGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = kGrad;
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        // Knob indicator angle proportional to 0..12V
        const kAng = (-135 + (Math.min(12, Math.max(0, vSet)) / 12) * 270) * (Math.PI / 180);
        ctx.save();
        ctx.translate(knobX, knobY);
        ctx.rotate(kAng);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -17); ctx.stroke();
        ctx.restore();

        // Illuminated green Output ON indicator
        ctx.beginPath();
        ctx.arc(knobX, top + 20, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = enabled ? '#22c55e' : '#334155';
        ctx.fill();
        if (enabled) {
            ctx.strokeStyle = 'rgba(34,197,94,0.45)';
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Front label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '800 11px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('REGULATED DC BENCH PSU · 0–12V', -16, top + 98);

        // Shrouded Machined Banana Binding Posts at (-54, 90) and (+54, 90)
        drawMetalLeg(ctx, [{ x: -54, y: 66 }, { x: -54, y: 90 }], 4.4);
        drawMetalLeg(ctx, [{ x: 54, y: 66 }, { x: 54, y: 90 }], 4.4);

        for (const [bx, fill, ring, sym] of [[-54, '#0f172a', '#94a3b8', '−'], [54, '#dc2626', '#fca5a5', '+']]) {
            ctx.beginPath();
            ctx.arc(bx, 44, 15, 0, Math.PI * 2);
            ctx.fillStyle = fill;
            ctx.fill();
            ctx.strokeStyle = ring;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(bx, 44, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#020617';
            ctx.fill();
            ctx.font = '800 13px "JetBrains Mono", monospace';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(sym, bx + (bx < 0 ? -24 : 24), 44);
        }

        if (st?.shorted) {
            drawFaultBadge(ctx, 0, top - 24, '⚡ PSU SHORT CIRCUIT!', 'error');
        }
    }

    // -------------------------------------------------------------------------
    // 7. STUDIO-GRADE 1/4W AXIAL 4-BAND RESISTOR (kind: 'resistor', pins -72,0 / +72,0)
    // -------------------------------------------------------------------------
    function drawResistor2D(ctx, comp, evalData, isSelected) {
        const Solver = root.ElectronicsSolver;
        const st = evalData?.resistorStates?.get(comp.id);
        const ohms = Number(comp.ohms) || 220;
        const bands = Solver ? Solver.getResistorBands(ohms) : ['#dc2626', '#dc2626', '#7c3f1d', '#d4af37'];

        // Overheat glow if power > 0.25W
        if (st?.corrupted || st?.warn) {
            const g = ctx.createRadialGradient(0, 0, 8, 0, 0, 56);
            g.addColorStop(0, st.corrupted ? 'rgba(239, 68, 68, 0.65)' : 'rgba(245, 158, 11, 0.4)');
            g.addColorStop(1, 'rgba(239, 68, 68, 0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, 0, 56, 0, Math.PI * 2);
            ctx.fill();
        }

        // Thick metallic bent axial leads spanning 4 breadboard holes (-72..+72)
        drawMetalLeg(ctx, [{ x: -72, y: 0 }, { x: -44, y: 0 }], 4.2);
        drawMetalLeg(ctx, [{ x: 44, y: 0 }, { x: 72, y: 0 }], 4.2);

        // Sculpted 90x34 ceramic dog-bone resistor body with ambient shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;

        ctx.beginPath();
        ctx.moveTo(-45, -12);
        ctx.quadraticCurveTo(-40, -18, -30, -18);
        ctx.lineTo(-20, -14);
        ctx.lineTo(20, -14);
        ctx.lineTo(30, -18);
        ctx.quadraticCurveTo(40, -18, 45, -12);
        ctx.lineTo(45, 12);
        ctx.quadraticCurveTo(40, 18, 30, 18);
        ctx.lineTo(20, 14);
        ctx.lineTo(-20, 14);
        ctx.lineTo(-30, 18);
        ctx.quadraticCurveTo(-40, 18, -45, 12);
        ctx.closePath();

        const bodyGrad = ctx.createLinearGradient(0, -18, 0, 18);
        if (st?.corrupted) {
            bodyGrad.addColorStop(0, '#78350f');
            bodyGrad.addColorStop(0.42, '#451a03');
            bodyGrad.addColorStop(1, '#1c1917');
        } else {
            bodyGrad.addColorStop(0, '#faecd8');
            bodyGrad.addColorStop(0.28, '#e8c796');
            bodyGrad.addColorStop(0.68, '#c69a63');
            bodyGrad.addColorStop(1, '#856034');
        }
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Clip to ceramic dog-bone & paint bold glossy 4 EIA color bands
        ctx.save();
        ctx.clip();
        const bandXs = [-29, -13, 3, 27];
        const bandWs = [8.5, 8.5, 8.5, 7.2];
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = bands[i];
            ctx.fillRect(bandXs[i] - bandWs[i] / 2, -20, bandWs[i], 40);
        }
        // Cylindrical specular sheen wrapping over ceramic & bands
        const glossGrad = ctx.createLinearGradient(0, -16, 0, -4);
        glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = glossGrad;
        ctx.fillRect(-46, -15, 92, 11);
        // Underside shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        ctx.fillRect(-46, 9, 92, 9);
        ctx.restore();

        ctx.strokeStyle = isSelected ? '#8b9dff' : (st?.corrupted ? '#ef4444' : '#6b4e27');
        ctx.lineWidth = isSelected ? 2.8 : 1.6;
        ctx.stroke();
        ctx.restore();

        // Crisp value label
        ctx.fillStyle = st?.corrupted ? '#ff6b6b' : '#e2e8f0';
        ctx.font = '800 12.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(Solver ? Solver.formatOhms(ohms) : `${ohms}Ω`, 0, 31);

        if (st?.corrupted) {
            drawFaultBadge(ctx, 0, -38, `🔥 ${(st.powerW * 1000).toFixed(0)}mW OVERHEAT!`, 'error');
        } else if (st?.warn) {
            drawFaultBadge(ctx, 0, -38, `⚠ ${(st.powerW * 1000).toFixed(0)}mW`, 'warn');
        }
    }

    // -------------------------------------------------------------------------
    // 8. STUDIO-GRADE WH148 ROTARY POTENTIOMETER (pins -36,72 / 0,72 / +36,72)
    // -------------------------------------------------------------------------
    function drawPotentiometer2D(ctx, comp, evalData, isSelected) {
        const Solver = root.ElectronicsSolver;
        const st = evalData?.potStates?.get(comp.id);
        const knob = Math.max(0, Math.min(1, comp.wiper ?? comp.knob ?? 0.5));
        const total = Number(comp.ohms) || 10000;

        // 3 solder-lug metal legs aligned to 3 adjacent 36px breadboard columns!
        drawMetalLeg(ctx, [{ x: -30, y: 28 }, { x: -36, y: 72 }], 4.0);
        drawMetalLeg(ctx, [{ x: 0, y: 34 }, { x: 0, y: 72 }], 4.0);
        drawMetalLeg(ctx, [{ x: 30, y: 28 }, { x: 36, y: 72 }], 4.0);

        // Phenolic brown PCB terminal skirt at bottom
        rRect(ctx, -42, 18, 84, 24, 5);
        ctx.fillStyle = '#78350f';
        ctx.fill();
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Large 108px machined blue-anodized & aluminum potentiometer body with shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.54)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 7;
        ctx.beginPath();
        ctx.arc(0, -10, 52, 0, Math.PI * 2);
        const blueGrad = ctx.createRadialGradient(-16, -24, 6, 0, -10, 54);
        blueGrad.addColorStop(0, '#60a5fa');
        blueGrad.addColorStop(0.55, '#1d4ed8');
        blueGrad.addColorStop(1, '#172554');
        ctx.fillStyle = blueGrad;
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(0, -10, 52, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? '#8b9dff' : (st?.corrupted ? '#ef4444' : '#93c5fd');
        ctx.lineWidth = isSelected ? 3.2 : 2.0;
        ctx.stroke();

        // Calibrated radial scale tick marks
        ctx.save();
        ctx.translate(0, -10);
        for (let t = 0; t <= 10; t++) {
            const ta = ((-135 + t * 27) - 90) * (Math.PI / 180);
            const major = t % 5 === 0;
            ctx.strokeStyle = major ? '#f8fafc' : 'rgba(226, 232, 240, 0.55)';
            ctx.lineWidth = major ? 2.2 : 1.4;
            ctx.beginPath();
            ctx.moveTo(Math.cos(ta) * 38, Math.sin(ta) * 38);
            ctx.lineTo(Math.cos(ta) * (major ? 47 : 44), Math.sin(ta) * (major ? 47 : 44));
            ctx.stroke();
        }

        // Machined hexagonal mounting nut + brushed aluminum threaded collar
        ctx.beginPath();
        for (let h = 0; h < 6; h++) {
            const a = (h * Math.PI) / 3;
            const hx = Math.cos(a) * 33;
            const hy = Math.sin(a) * 33;
            if (h === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        const nutGrad = ctx.createLinearGradient(-30, -30, 30, 30);
        nutGrad.addColorStop(0, '#f1f5f9');
        nutGrad.addColorStop(0.5, '#94a3b8');
        nutGrad.addColorStop(1, '#64748b');
        ctx.fillStyle = nutGrad;
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Rotatable knurled anodized black dial cap (-135 deg to +135 deg)
        const angle = (-135 + knob * 270) * (Math.PI / 180);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        const capG = ctx.createRadialGradient(-6, -6, 3, 0, 0, 25);
        capG.addColorStop(0, '#334155');
        capG.addColorStop(1, '#090d16');
        ctx.fillStyle = capG;
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Brushed inner aluminum cap + glowing cyan pointer line
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(0, -22);
        ctx.stroke();
        ctx.restore();

        // Pin & Value Labels
        ctx.font = '800 12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#94a3b8'; ctx.fillText('1', -36, 88);
        ctx.fillStyle = '#38bdf8'; ctx.fillText('W', 0, 88);
        ctx.fillStyle = '#94a3b8'; ctx.fillText('2', 36, 88);

        ctx.fillStyle = '#f8fafc';
        ctx.font = '700 13px "Inter", sans-serif';
        ctx.fillText(`${Solver ? Solver.formatOhms(total) : total + 'Ω'} · ${Math.round(knob * 100)}%`, 0, -76);

        if (st?.corrupted) {
            drawFaultBadge(ctx, 0, -100, '🔥 POT OVERHEAT!', 'error');
        }
    }

    // -------------------------------------------------------------------------
    // 9. STUDIO-GRADE 6x6mm TACTILE PUSH BUTTON (pins ±36, ±36)
    // -------------------------------------------------------------------------
    function drawPushButton2D(ctx, comp, evalData, isSelected) {
        const down = Boolean(comp.pressed);

        // 4 stamped metallic legs at (±36, ±36) — exact 2x2 breadboard pitch!
        drawMetalLeg(ctx, [{ x: -32, y: -36 }, { x: -36, y: -36 }], 4.2);
        drawMetalLeg(ctx, [{ x: 32, y: -36 }, { x: 36, y: -36 }], 4.2);
        drawMetalLeg(ctx, [{ x: -32, y: 36 }, { x: -36, y: 36 }], 4.2);
        drawMetalLeg(ctx, [{ x: 32, y: 36 }, { x: 36, y: 36 }], 4.2);

        // Outer black molded nylon switch base (78x78) with shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.52)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 6;
        rRect(ctx, -39, -39, 78, 78, 9);
        ctx.fillStyle = '#111827';
        ctx.fill();
        ctx.restore();

        // Stamped brushed-aluminum top retention plate
        rRect(ctx, -35, -35, 70, 70, 7);
        const steel = ctx.createLinearGradient(-35, -35, 35, 35);
        steel.addColorStop(0, '#f1f5f9');
        steel.addColorStop(0.45, '#cbd5e1');
        steel.addColorStop(1, '#64748b');
        ctx.fillStyle = steel;
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#8b9dff' : (down ? '#38bdf8' : '#334155');
        ctx.lineWidth = isSelected ? 3.2 : 2.0;
        ctx.stroke();

        // 4 molded black corner melt-rivets
        for (const [rx, ry] of [[-25, -25], [25, -25], [-25, 25], [25, 25]]) {
            ctx.beginPath();
            ctx.arc(rx, ry, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = '#0f172a';
            ctx.fill();
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        // Recessed center collar
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();

        // Raised 3D tactile plunger cap (visibly depresses when pressed!)
        ctx.save();
        if (!down) {
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 4;
        }
        ctx.beginPath();
        ctx.arc(0, down ? 1.5 : -2.5, 21, 0, Math.PI * 2);
        const capGrad = ctx.createRadialGradient(-6, down ? -3 : -8, 4, 0, 0, 23);
        capGrad.addColorStop(0, down ? '#7dd3fc' : '#64748b');
        capGrad.addColorStop(0.55, down ? '#0284c7' : '#1e293b');
        capGrad.addColorStop(1, down ? '#0369a1' : '#090d16');
        ctx.fillStyle = capGrad;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = down ? '#bae6fd' : '#334155';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = down ? '#38bdf8' : '#cbd5e1';
        ctx.font = '700 12px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(comp.latched ? (down ? 'BTN (ON)' : 'BTN (OFF)') : (down ? 'PRESSED' : (comp.label || 'PUSH BTN')), 0, 56);
    }

    // -------------------------------------------------------------------------
    // 10. STUDIO-GRADE 3-PIN SPDT SLIDE SWITCH (pins -36,36 / 0,36 / +36,36)
    // -------------------------------------------------------------------------
    function drawSpdtSwitch2D(ctx, comp, evalData, isSelected) {
        const right = (comp.positionThrow || comp.throwPos) === 'right';

        // 3 metal pins at exact 36px breadboard pitch!
        drawMetalLeg(ctx, [{ x: -36, y: 12 }, { x: -36, y: 36 }], 4.0);
        drawMetalLeg(ctx, [{ x: 0, y: 12 }, { x: 0, y: 36 }], 4.0);
        drawMetalLeg(ctx, [{ x: 36, y: 12 }, { x: 36, y: 36 }], 4.0);

        // Crimped stainless-steel switch casing (108x44) with shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.52)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 6;
        rRect(ctx, -54, -28, 108, 44, 6);
        const metal = ctx.createLinearGradient(0, -28, 0, 16);
        metal.addColorStop(0, '#f1f5f9');
        metal.addColorStop(0.45, '#cbd5e1');
        metal.addColorStop(1, '#64748b');
        ctx.fillStyle = metal;
        ctx.fill();
        ctx.restore();

        rRect(ctx, -54, -28, 108, 44, 6);
        ctx.strokeStyle = isSelected ? '#8b9dff' : '#334155';
        ctx.lineWidth = isSelected ? 3.2 : 2.0;
        ctx.stroke();

        // Side mounting rivets
        for (const rx of [-45, 45]) {
            ctx.beginPath();
            ctx.arc(rx, -6, 3.8, 0, Math.PI * 2);
            ctx.fillStyle = '#334155';
            ctx.fill();
        }

        // Deep recessed slide channel
        rRect(ctx, -36, -16, 72, 20, 4);
        ctx.fillStyle = '#070a12';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Chunky ribbed black slide actuator
        const knobX = right ? 4 : -34;
        rRect(ctx, knobX, -24, 30, 36, 4.5);
        const actGrad = ctx.createLinearGradient(knobX, -24, knobX, 12);
        actGrad.addColorStop(0, '#334155');
        actGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = actGrad;
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        // Grip ribs
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.6;
        for (let r = 6; r <= 24; r += 6) {
            ctx.beginPath();
            ctx.moveTo(knobX + r, -18);
            ctx.lineTo(knobX + r, 6);
            ctx.stroke();
        }

        // Terminal labels
        ctx.font = '800 11.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = !right ? '#38bdf8' : '#94a3b8'; ctx.fillText('T1', -36, 52);
        ctx.fillStyle = '#f8fafc'; ctx.fillText('COM', 0, 52);
        ctx.fillStyle = right ? '#38bdf8' : '#94a3b8'; ctx.fillText('T2', 36, 52);
    }

    // -------------------------------------------------------------------------
    // 11. STUDIO-GRADE 130 HOBBY DC MOTOR (pins -108,-18 & -108,+18)
    // -------------------------------------------------------------------------
    function drawMotor2D(ctx, comp, evalData, isSelected, animAngleRad = 0) {
        const st = evalData?.motorStates?.get(comp.id) || { voltage: 0, currentMa: 0, rpm: 0, absRpm: 0, direction: 'STOPPED', corrupted: false };

        // Copper-brass motor brush tabs + leads to (-108, ±18)
        drawMetalLeg(ctx, [{ x: -72, y: -18 }, { x: -108, y: -18 }], 4.2);
        drawMetalLeg(ctx, [{ x: -72, y: 18 }, { x: -108, y: 18 }], 4.2);

        // Solder lug copper tabs on rear endbell
        ctx.fillStyle = '#d97706';
        rRect(ctx, -84, -23, 14, 10, 2); ctx.fill();
        rRect(ctx, -84, 13, 14, 10, 2); ctx.fill();

        // Ambient shadow under motor body
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.58)';
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 9;

        // Rear molded dark-nylon brush endbell
        rRect(ctx, -74, -48, 28, 96, 8);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // Main brushed zinc-steel 130 hobby motor housing (104 x 106)
        rRect(ctx, -50, -53, 104, 106, 10);
        const steelGrad = ctx.createLinearGradient(0, -53, 0, 53);
        steelGrad.addColorStop(0, '#64748b');
        steelGrad.addColorStop(0.22, '#f8fafc');
        steelGrad.addColorStop(0.45, '#cbd5e1');
        steelGrad.addColorStop(0.78, '#94a3b8');
        steelGrad.addColorStop(1, '#334155');
        ctx.fillStyle = steelGrad;
        ctx.fill();
        ctx.restore();

        rRect(ctx, -50, -53, 104, 106, 10);
        ctx.strokeStyle = isSelected ? '#8b9dff' : (st.corrupted ? '#ef4444' : '#334155');
        ctx.lineWidth = isSelected ? 3.2 : 2.0;
        ctx.stroke();

        // Stamped top & bottom cooling vent slots on motor can
        ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
        rRect(ctx, -30, -44, 62, 7, 3.5); ctx.fill();
        rRect(ctx, -30, 37, 62, 7, 3.5); ctx.fill();

        // Laser-stamped motor specification plate
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 15px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('DC MOTOR', 2, -10);
        ctx.font = '700 12px "JetBrains Mono", monospace';
        ctx.fillStyle = '#334155';
        ctx.fillText('FA-130 · 3–12V', 2, 11);

        // Front machined brass bearing boss + polished steel shaft
        ctx.fillStyle = '#b45309';
        rRect(ctx, 54, -20, 12, 40, 3);
        ctx.fill();
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(66, -6, 26, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(66, -4, 26, 3);

        // Large aerodynamic sculpted 3-blade rotor/propeller at x = +90
        ctx.save();
        ctx.translate(90, 0);
        ctx.rotate(animAngleRad);

        // Spinning motion-blur halo when running
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.fillStyle = st.absRpm > 0 ? 'rgba(56, 189, 248, 0.18)' : 'rgba(148, 163, 184, 0.10)';
        ctx.fill();
        ctx.strokeStyle = st.corrupted ? '#ef4444' : (st.absRpm > 0 ? '#38bdf8' : '#64748b');
        ctx.lineWidth = 2.2;
        ctx.stroke();

        for (let b = 0; b < 3; b++) {
            const a = (b * Math.PI * 2) / 3;
            ctx.save();
            ctx.rotate(a);
            ctx.beginPath();
            ctx.moveTo(-4, -6);
            ctx.quadraticCurveTo(-9, -20, -4, -33);
            ctx.quadraticCurveTo(0, -36, 5, -32);
            ctx.quadraticCurveTo(8, -18, 4, -6);
            ctx.closePath();
            ctx.fillStyle = b === 0 ? '#f59e0b' : '#e2e8f0';
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.restore();

        // Polarity marks
        ctx.font = '800 13px "JetBrains Mono", monospace';
        ctx.fillStyle = '#f87171'; ctx.fillText('+', -96, -34);
        ctx.fillStyle = '#94a3b8'; ctx.fillText('−', -96, 34);

        // Prominent RPM Telemetry Pill
        if (st.corrupted) {
            drawFaultBadge(ctx, 8, -78, `⚡ ${Math.abs(st.voltage).toFixed(1)}V MAX!`, 'error');
        } else if (isSelected || st.absRpm > 0) {
            const rpmText = st.absRpm > 0
                ? `${st.absRpm.toLocaleString()} RPM · ${st.direction}`
                : '0 RPM · IDLE';
            ctx.save();
            ctx.font = '800 13.5px "JetBrains Mono", monospace';
            const tw = ctx.measureText(rpmText).width + 22;
            rRect(ctx, 8 - tw / 2, -88, tw, 26, 13);
            ctx.fillStyle = isSelected ? 'rgba(14, 165, 233, 0.96)' : 'rgba(15, 23, 42, 0.92)';
            ctx.fill();
            ctx.strokeStyle = st.absRpm > 0 ? '#38bdf8' : '#64748b';
            ctx.lineWidth = 1.8;
            ctx.stroke();
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(rpmText, 8, -75);
            ctx.restore();
        }
    }

    // -------------------------------------------------------------------------
    // 12. STUDIO-GRADE PIEZO BUZZER (kind: 'buzzer', pins -18,72 & +18,72)
    // -------------------------------------------------------------------------
    function drawBuzzer2D(ctx, comp, evalData, isSelected, animTimeSec = 0) {
        const st = evalData?.buzzerStates?.get(comp.id) || { active: false, freqHz: 0, corrupted: false };

        drawMetalLeg(ctx, [{ x: -18, y: 36 }, { x: -18, y: 72 }], 3.8);
        drawMetalLeg(ctx, [{ x: 18, y: 36 }, { x: 18, y: 72 }], 3.8);

        // Expanding animated acoustic wave rings when active
        if (st.active) {
            for (let k = 0; k < 3; k++) {
                const phase = (animTimeSec * 2.2 + k / 3) % 1;
                const rad = 52 + phase * 38;
                ctx.beginPath();
                ctx.arc(0, -10, rad, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - phase) * 0.72})`;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        }

        // Matte-black cylindrical piezo enclosure (104px diameter) with shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.54)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 7;
        ctx.beginPath();
        ctx.arc(0, -10, 50, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(-14, -24, 6, 0, -10, 52);
        grad.addColorStop(0, '#334155');
        grad.addColorStop(0.55, '#111827');
        grad.addColorStop(1, '#020617');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(0, -10, 50, 0, Math.PI * 2);
        ctx.strokeStyle = isSelected ? '#8b9dff' : (st.corrupted ? '#ef4444' : (st.active ? '#38bdf8' : '#475569'));
        ctx.lineWidth = isSelected ? 3.2 : 2.0;
        ctx.stroke();

        // Recessed top bezel ring
        ctx.beginPath();
        ctx.arc(0, -10, 41, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Metallic brass sound diaphragm aperture
        ctx.beginPath();
        ctx.arc(0, -10, 17, 0, Math.PI * 2);
        ctx.fillStyle = st.active ? '#fbbf24' : '#94a3b8';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -10, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = '#070a12';
        ctx.fill();

        // Embossed + polarity symbol
        ctx.font = '800 14px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#f87171'; ctx.fillText('+', -26, -28);
        ctx.fillStyle = '#f87171'; ctx.fillText('+', -18, 88);
        ctx.fillStyle = '#94a3b8'; ctx.fillText('−', 18, 88);

        if (st.corrupted) {
            drawFaultBadge(ctx, 0, -76, '⚡ OVERVOLTAGE!', 'error');
        } else if (st.active) {
            ctx.fillStyle = '#38bdf8';
            ctx.font = '800 13px "JetBrains Mono", monospace';
            ctx.fillText(`🔊 ${st.freqHz} Hz`, 0, -74);
        }
    }

    // -------------------------------------------------------------------------
    // 13. STUDIO-GRADE NPN 2N2222 TRANSISTOR (TO-92, pins -36,54 / 0,54 / +36,54)
    // -------------------------------------------------------------------------
    function drawNpn2D(ctx, comp, evalData, isSelected) {
        const st = evalData?.npnStates?.get(comp.id) || { conducting: false, region: 'CUTOFF', icMa: 0, corrupted: false };

        // 3 Splayed formed metal leads matching 3 adjacent 36px breadboard columns!
        drawMetalLeg(ctx, [{ x: -18, y: 8 }, { x: -28, y: 26 }, { x: -36, y: 54 }], 3.8);
        drawMetalLeg(ctx, [{ x: 0, y: 8 }, { x: 0, y: 54 }], 3.8);
        drawMetalLeg(ctx, [{ x: 18, y: 8 }, { x: 28, y: 26 }, { x: 36, y: 54 }], 3.8);

        // Sculpted TO-92 flat-front D-body (78 x 64) with shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.52)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 6;
        ctx.beginPath();
        ctx.moveTo(-38, 12);
        ctx.lineTo(-38, -32);
        ctx.quadraticCurveTo(0, -58, 38, -32);
        ctx.lineTo(38, 12);
        ctx.closePath();

        const grad = ctx.createLinearGradient(-38, -44, 38, 12);
        grad.addColorStop(0, '#3b475c');
        grad.addColorStop(0.45, '#141b2b');
        grad.addColorStop(1, '#04070e');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();

        ctx.beginPath();
        ctx.moveTo(-38, 12);
        ctx.lineTo(-38, -32);
        ctx.quadraticCurveTo(0, -58, 38, -32);
        ctx.lineTo(38, 12);
        ctx.closePath();
        ctx.strokeStyle = isSelected ? '#8b9dff' : (st.corrupted ? '#ef4444' : (st.conducting ? '#34d399' : '#64748b'));
        ctx.lineWidth = isSelected ? 3.2 : 2.0;
        ctx.stroke();

        // Top molded bevel ridge
        ctx.beginPath();
        ctx.moveTo(-31, -28);
        ctx.quadraticCurveTo(0, -48, 31, -28);
        ctx.strokeStyle = 'rgba(255,255,255,0.16)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Crisp laser-etched markings
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '800 14px "JetBrains Mono", monospace';
        ctx.fillText('2N2222A', 0, -18);
        ctx.fillStyle = st.conducting ? '#34d399' : '#94a3b8';
        ctx.font = '700 11.5px "JetBrains Mono", monospace';
        ctx.fillText('NPN · BJT', 0, -1);

        // Leg labels E, B, C
        ctx.font = '800 12.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#94a3b8'; ctx.fillText('E', -36, 70);
        ctx.fillStyle = '#fbbf24'; ctx.fillText('B', 0, 70);
        ctx.fillStyle = '#38bdf8'; ctx.fillText('C', 36, 70);

        if (st.corrupted) {
            drawFaultBadge(ctx, 0, -68, '⚡ BJT OVERLOAD!', 'error');
        }
    }

    // -------------------------------------------------------------------------
    // 14. STUDIO-GRADE FLUKE-STYLE DIGITAL MULTIMETER (pins -36,126 & +36,126)
    // -------------------------------------------------------------------------
    function drawMultimeter2D(ctx, comp, evalData, isSelected) {
        const st = evalData?.meterStates?.get(comp.id) || { mode: comp.mode || 'V', display: '0.00 V' };
        const mode = comp.mode || 'V';

        // Probe leads exiting shrouded bottom banana jacks at (-36, 126) and (+36, 126)
        drawMetalLeg(ctx, [{ x: -36, y: 104 }, { x: -36, y: 126 }], 4.6);
        drawMetalLeg(ctx, [{ x: 36, y: 104 }, { x: 36, y: 126 }], 4.6);

        // Rugged dark rubberized shock holster (184 x 244) with shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 28;
        ctx.shadowOffsetY = 10;
        rRect(ctx, -92, -124, 184, 240, 22);
        const holGrad = ctx.createLinearGradient(-92, 0, 92, 0);
        holGrad.addColorStop(0, '#0f172a');
        holGrad.addColorStop(0.5, '#1e293b');
        holGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = holGrad;
        ctx.fill();
        ctx.restore();

        rRect(ctx, -92, -124, 184, 240, 22);
        ctx.strokeStyle = isSelected ? '#8b9dff' : '#475569';
        ctx.lineWidth = isSelected ? 3.4 : 2.2;
        ctx.stroke();

        // Rugged Fluke-yellow instrument faceplate
        rRect(ctx, -80, -112, 160, 216, 14);
        const yel = ctx.createLinearGradient(0, -112, 0, 104);
        yel.addColorStop(0, '#fde047');
        yel.addColorStop(0.45, '#eab308');
        yel.addColorStop(1, '#a16207');
        ctx.fillStyle = yel;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Recessed high-contrast backlit LCD display bezel
        rRect(ctx, -68, -100, 136, 62, 7);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        rRect(ctx, -63, -95, 126, 52, 5);
        ctx.fillStyle = '#112620';
        ctx.fill();
        ctx.strokeStyle = '#1e3a32';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Mode annunciator in top-left of LCD
        ctx.fillStyle = 'rgba(74, 222, 128, 0.72)';
        ctx.font = '700 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(mode === 'V' ? 'AUTO DC V' : mode === 'mA' ? 'AUTO DC mA' : 'AUTO Ω', -56, -90);

        // Large crisp LCD digits
        ctx.fillStyle = '#4ade80';
        ctx.font = '800 24px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(st.display || '0.00 V', 0, -64, 118);

        // Subtle tactile function buttons row under LCD
        for (const [bx, lbl] of [[-42, 'HOLD'], [0, 'RANGE'], [42, 'MODE']]) {
            rRect(ctx, bx - 18, -30, 36, 13, 4);
            ctx.fillStyle = '#1e293b';
            ctx.fill();
            ctx.fillStyle = '#cbd5e1';
            ctx.font = '700 7.5px "Inter", sans-serif';
            ctx.fillText(lbl, bx, -23.5);
        }

        // Crisp range legends around central rotary selector dial
        ctx.fillStyle = '#0f172a';
        ctx.font = '800 14px "JetBrains Mono", monospace';
        ctx.fillText('V', -48, 0);
        ctx.fillText('mA', 0, -10);
        ctx.fillText('Ω', 48, 0);

        // Sculpted Central Rotary Selector Dial
        const dialAngle = mode === 'V' ? -Math.PI * 0.35 : mode === 'mA' ? 0 : Math.PI * 0.35;
        ctx.save();
        ctx.translate(0, 26);
        ctx.beginPath();
        ctx.arc(0, 0, 32, 0, Math.PI * 2);
        const dGrad = ctx.createRadialGradient(-8, -8, 4, 0, 0, 33);
        dGrad.addColorStop(0, '#334155');
        dGrad.addColorStop(1, '#090d16');
        ctx.fillStyle = dGrad;
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.rotate(dialAngle);
        rRect(ctx, -6, -28, 12, 54, 4);
        ctx.fillStyle = '#475569';
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(-3, -25, 6, 12);
        ctx.restore();

        // Bottom Shrouded Banana Probe Jacks: COM (−) at -36, VΩmA (+) at +36
        for (const [jx, bg, ring, sym, tag] of [
            [-36, '#0f172a', '#475569', '−', 'COM'],
            [36, '#dc2626', '#fca5a5', '+', 'VΩmA']
        ]) {
            ctx.beginPath();
            ctx.arc(jx, 78, 14, 0, Math.PI * 2);
            ctx.fillStyle = bg;
            ctx.fill();
            ctx.strokeStyle = ring;
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(jx, 78, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = '#020617';
            ctx.fill();
            ctx.font = '800 9px "JetBrains Mono", monospace';
            ctx.fillStyle = '#0f172a';
            ctx.fillText(tag, jx, 98);
        }
    }

    // -------------------------------------------------------------------------
    // 15. REALISTIC 2D DIP-14 / DIP-16 IC PACKAGE (EXACT BREADBOARD TROUGH FIT!)
    // -------------------------------------------------------------------------
    function drawRealisticICPackage(ctx, comp, spec, evalData, isSelected, xray, autoPower, helpers) {
        const { getDipPinLocal, drawMiniGateShape, COLORS } = helpers;
        const st = evalData.icStates.get(comp.id);
        const powered = Boolean(st?.powered);
        const reverse = Boolean(st?.reversePower);
        const corrupted = Boolean(st?.corrupted);
        const overWarn = Boolean(st?.overVoltageWarn);
        const pinCount = spec.pinCount || 14;
        const halfW = pinCount === 16 ? 150 : 132;
        const halfH = 56;
        const vccPin = spec.vccPin || 14;
        const gndPin = spec.gndPin || 7;

        ctx.save();
        ctx.translate(comp.position.x, comp.position.y);
        if (comp.rotation) ctx.rotate((comp.rotation * Math.PI) / 180);

        // 1. Realistic bent silver tinned DIP legs protruding into Breadboard Row e (-72) & Row f (+72)
        for (let p = 1; p <= pinCount; p++) {
            const loc = getDipPinLocal(p, pinCount);
            const val = evalData.pinValues.get(`${comp.id}:${p}`);
            const conflict = evalData.pinConflicts.get(`${comp.id}:${p}`);
            const yBody = loc.row === 'top' ? -halfH : halfH;
            const yTip = loc.y;
            const dir = loc.row === 'top' ? -1 : 1;

            ctx.beginPath();
            ctx.moveTo(loc.x - 6.0, yBody);
            ctx.lineTo(loc.x + 6.0, yBody);
            ctx.lineTo(loc.x + 6.0, yBody + dir * 5.5);
            ctx.lineTo(loc.x + 3.4, yBody + dir * 9);
            ctx.lineTo(loc.x + 3.4, yTip);
            ctx.lineTo(loc.x - 3.4, yTip);
            ctx.lineTo(loc.x - 3.4, yBody + dir * 9);
            ctx.lineTo(loc.x - 6.0, yBody + dir * 5.5);
            ctx.closePath();

            const legGrad = ctx.createLinearGradient(loc.x - 6, 0, loc.x + 6, 0);
            if (conflict) {
                legGrad.addColorStop(0, '#dc2626');
                legGrad.addColorStop(0.5, '#fca5a5');
                legGrad.addColorStop(1, '#991b1b');
            } else if (val === 1 && !corrupted) {
                legGrad.addColorStop(0, '#0284c7');
                legGrad.addColorStop(0.5, '#7dd3fc');
                legGrad.addColorStop(1, '#0369a1');
            } else {
                legGrad.addColorStop(0, '#64748b');
                legGrad.addColorStop(0.45, '#f1f5f9');
                legGrad.addColorStop(1, '#475569');
            }
            ctx.fillStyle = legGrad;
            ctx.fill();
            ctx.strokeStyle = 'rgba(15, 23, 42, 0.75)';
            ctx.lineWidth = 0.9;
            ctx.stroke();
        }

        // 2. Molded 3D Charcoal-Black Epoxy DIP Body (translucent when X-Ray is ON)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.62)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;
        rRect(ctx, -halfW, -halfH, halfW * 2, halfH * 2, 7);
        const bodyGrad = ctx.createLinearGradient(0, -halfH, 0, halfH);
        if (corrupted) {
            bodyGrad.addColorStop(0, xray ? 'rgba(69, 10, 10, 0.88)' : '#2d1111');
            bodyGrad.addColorStop(1, xray ? 'rgba(28, 7, 7, 0.92)' : '#140707');
        } else {
            bodyGrad.addColorStop(0, xray ? 'rgba(28, 34, 48, 0.84)' : '#2a303c');
            bodyGrad.addColorStop(0.16, xray ? 'rgba(17, 22, 32, 0.86)' : '#1c212b');
            bodyGrad.addColorStop(0.84, xray ? 'rgba(13, 17, 25, 0.88)' : '#141820');
            bodyGrad.addColorStop(1, xray ? 'rgba(8, 11, 17, 0.90)' : '#0b0e14');
        }
        ctx.fillStyle = bodyGrad;
        ctx.fill();
        ctx.restore();

        // Chamfered 3D inner molded ridge
        rRect(ctx, -halfW + 4.5, -halfH + 4.5, (halfW - 4.5) * 2, (halfH - 4.5) * 2, 4);
        ctx.strokeStyle = xray ? 'rgba(148, 163, 184, 0.16)' : 'rgba(255, 255, 255, 0.10)';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Outer package border
        rRect(ctx, -halfW, -halfH, halfW * 2, halfH * 2, 7);
        ctx.lineWidth = isSelected ? 2.8 : 1.8;
        ctx.strokeStyle = isSelected
            ? COLORS.selected
            : corrupted
            ? '#ef4444'
            : overWarn
            ? '#f59e0b'
            : powered
            ? '#475569'
            : '#334155';
        ctx.stroke();

        // Molded Pin-1 orientation semicircle notch on left edge + molded Pin-1 circular dimple
        ctx.beginPath();
        ctx.arc(-halfW, 0, 12, -Math.PI / 2, Math.PI / 2, false);
        ctx.fillStyle = '#06080d';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        const pin1Loc = getDipPinLocal(1, pinCount);
        ctx.beginPath();
        ctx.arc(pin1Loc.x, halfH - 14, 4.4, 0, Math.PI * 2);
        ctx.fillStyle = '#0b0e14';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 3. Pin numbers & power rail tags printed cleanly along edges
        ctx.font = '700 8.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let p = 1; p <= pinCount; p++) {
            const loc = getDipPinLocal(p, pinCount);
            const labelY = loc.row === 'top' ? -halfH + 10 : halfH - 10;
            const customLbl = spec.msi && spec.pinLabels && spec.pinLabels[p];
            if (p === vccPin) {
                ctx.fillStyle = corrupted ? '#ff6b6b' : '#f87171';
                ctx.fillText(`${p}·V+`, loc.x, labelY);
            } else if (p === gndPin) {
                ctx.fillStyle = '#94a3b8';
                ctx.fillText(`${p}·GND`, loc.x, labelY);
            } else if (customLbl && xray) {
                ctx.fillStyle = '#cbd5e1';
                ctx.fillText(customLbl, loc.x, labelY);
            } else {
                ctx.fillStyle = '#64748b';
                ctx.fillText(String(p), loc.x, labelY);
            }
        }

        // 4. X-Ray Internals (preserved!) OR Authentic Laser-Etched Silver Epoxy Markings!
        if (xray && !corrupted) {
            if (spec.msi) {
                rRect(ctx, -halfW + 18, -halfH + 18, (halfW - 18) * 2, (halfH - 18) * 2, 6);
                ctx.fillStyle = powered ? 'rgba(14, 24, 39, 0.72)' : 'rgba(11, 14, 22, 0.55)';
                ctx.fill();
                ctx.strokeStyle = powered ? 'rgba(61, 217, 255, 0.35)' : 'rgba(148, 163, 184, 0.2)';
                ctx.lineWidth = 1.2;
                ctx.stroke();

                ctx.fillStyle = powered ? '#f4f7fb' : '#96a5ba';
                ctx.font = '700 12.5px "Inter", sans-serif';
                ctx.fillText(`${spec.partNumber} · ${spec.gateType}`, 0, -10);
                ctx.font = '700 10.5px "JetBrains Mono", monospace';
                ctx.fillStyle = powered ? '#3dd9ff' : '#64748b';
                ctx.fillText(powered ? (st?.msiSummary || spec.description) : 'WIRE VCC (4–5.5V) & GND', 0, 10);
            } else {
                for (const g of spec.gates) {
                    const gState = st?.gates?.get(g.id);
                    const outHigh = powered && gState?.outVal === 1;
                    const outLoc = getDipPinLocal(g.output, pinCount);
                    const gOutX = g.gx + (g.dir || 1) * 14;
                    const gInX = g.gx - (g.dir || 1) * 13;

                    for (let ii = 0; ii < g.inputs.length; ii++) {
                        const inPin = g.inputs[ii];
                        const inLoc = getDipPinLocal(inPin, pinCount);
                        const inHigh = powered && gState?.inVals?.[ii] === 1;
                        const spreadY = g.inputs.length === 1 ? 0 : (ii - (g.inputs.length - 1) / 2) * 8;
                        ctx.strokeStyle = inHigh ? '#3dd9ff' : 'rgba(148, 163, 184, 0.35)';
                        ctx.lineWidth = inHigh ? 1.7 : 1.1;
                        ctx.beginPath();
                        ctx.moveTo(inLoc.x, inLoc.row === 'top' ? -halfH + 16 : halfH - 16);
                        ctx.lineTo(inLoc.x, g.gy + spreadY);
                        ctx.lineTo(gInX, g.gy + spreadY);
                        ctx.stroke();
                    }

                    ctx.strokeStyle = outHigh ? '#3dd9ff' : 'rgba(148, 163, 184, 0.35)';
                    ctx.lineWidth = outHigh ? 1.8 : 1.1;
                    ctx.beginPath();
                    ctx.moveTo(gOutX, g.gy);
                    ctx.lineTo(outLoc.x, g.gy);
                    ctx.lineTo(outLoc.x, outLoc.row === 'top' ? -halfH + 16 : halfH - 16);
                    ctx.stroke();

                    ctx.save();
                    ctx.translate(g.gx, g.gy);
                    if (g.dir === -1) ctx.scale(-1, 1);
                    drawMiniGateShape(ctx, g.type, 1.0);
                    ctx.fillStyle = outHigh ? 'rgba(14, 42, 66, 0.92)' : 'rgba(18, 24, 36, 0.92)';
                    ctx.fill();
                    ctx.strokeStyle = outHigh ? '#3dd9ff' : '#8fa0b5';
                    ctx.lineWidth = 1.4;
                    ctx.stroke();
                    ctx.restore();
                }

                ctx.fillStyle = 'rgba(226, 232, 240, 0.16)';
                ctx.font = '800 13px "JetBrains Mono", monospace';
                ctx.fillText(spec.partNumber, 0, 0);
            }
        } else {
            for (const ex of [-halfW + 30, halfW - 30]) {
                ctx.beginPath();
                ctx.arc(ex, 0, 9, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
                ctx.fill();
            }

            ctx.fillStyle = corrupted ? '#fca5a5' : '#cbd5e1';
            ctx.font = '800 15px "JetBrains Mono", monospace';
            ctx.fillText(spec.partNumber, 0, -8);
            ctx.fillStyle = corrupted ? '#f87171' : '#94a3b8';
            ctx.font = '600 9.5px "Inter", sans-serif';
            ctx.fillText(spec.description, 0, 9);
            ctx.fillStyle = 'rgba(148, 163, 184, 0.45)';
            ctx.font = '600 8px "JetBrains Mono", monospace';
            ctx.fillText('TI · 4.0–5.5V · DIP-' + pinCount, 0, 23);
        }

        // 5. Status / Corruption Badge
        if (corrupted) {
            const msg = reverse
                ? '⚡ REVERSE POLARITY!'
                : `🔥 OVERVOLTAGE (${st.supplyV.toFixed(1)}V > 5.5V)!`;
            drawFaultBadge(ctx, 0, 0, msg, 'error');
        } else if (overWarn) {
            drawFaultBadge(ctx, 0, -halfH - 16, `⚠ ${st.supplyV.toFixed(1)}V (> 5.5V)`, 'warn');
        } else if (!powered && st?.underVoltage) {
            drawFaultBadge(ctx, 0, -halfH - 16, `LOW V (${st.supplyV.toFixed(1)}V < 4V)`, 'warn');
        } else if (autoPower && powered) {
            ctx.fillStyle = '#34d399';
            ctx.font = '700 8.5px "JetBrains Mono", monospace';
            ctx.fillText('⚡ AUTO-5V', halfW - 34, -halfH - 10);
        }

        ctx.restore();
    }

    const ElectronicsArt = {
        rRect,
        drawMetalLeg,
        drawFaultBadge,
        drawBreadboard2D,
        drawLed2D,
        drawRgbLed2D,
        drawAAHolder2D,
        drawBattery9V2D,
        drawBenchPSU2D,
        drawResistor2D,
        drawPotentiometer2D,
        drawPushButton2D,
        drawSpdtSwitch2D,
        drawMotor2D,
        drawBuzzer2D,
        drawNpn2D,
        drawMultimeter2D,
        drawRealisticICPackage
    };

    root.ElectronicsArt = ElectronicsArt;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ElectronicsArt;
    }
})(typeof window !== 'undefined' ? window : globalThis);

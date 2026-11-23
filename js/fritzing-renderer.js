(function (root) {
    'use strict';

    // =========================================================================
    // ELECTRICSIM — FRITZING SVG HARDWARE REALISM RENDERER (CC-BY-SA 3.0)
    // =========================================================================
    // Loads official Fritzing Parts Library breadboard SVGs from
    // `../assets/fritzing/` into cached HTMLImageElement objects, calibrates
    // every component's physical pins (0.1" = 36 px) to ElectricSim's grid,
    // applies two-layer physical contact + drop shadows, composites live
    // simulation overlays (spinning DC motor shaft, lighter-blended LED glows,
    // live 4-band resistor rings, rotary potentiometer needle, 10-pin 7-seg
    // segment illumination, breadboard strip hover highlight), and renders
    // crisp IEEE standard schematic diagrams for the component gallery sidebar.
    //
    // Hardware vector graphics adapted from Fritzing Parts Library (CC-BY-SA 3.0)
    // https://fritzing.org | https://github.com/fritzing/fritzing-parts

    const ASSET_BASE = '../assets/fritzing/';

    const ASSET_MANIFEST = {
        breadboard_half: 'Half_Breadboard.svg',
        breadboard_full: 'breadboard2.svg',
        dc_motor: 'dc_motor.svg',
        battery_9v: '9v_battery.svg',
        battery_2aa: 'battery_holder_2aa.svg',
        battery_4aa: 'battery_holder.svg',
        resistor: 'resistor_220.svg',
        led: 'led_red.svg',
        rgb_led: 'rgb_led.svg',
        cap_ceramic: 'capacitor_ceramic.svg',
        cap_electrolytic: 'capacitor_electrolytic.svg',
        pushbutton: 'pushbutton.svg',
        pushbutton_pressed: 'pushbutton_pressed.svg',
        slide_switch: 'slide_switch.svg',
        slide_switch_right: 'slide_switch_right.svg',
        potentiometer: 'potentiometer.svg',
        buzzer: 'buzzer.svg',
        npn: 'npn_transistor.svg',
        seg7_10: 'seg7_10pin.svg',
        dip_14: 'dip_14.svg',
        dip_16: 'dip_16.svg'
    };

    const imageCache = new Map(); // key -> { img, ready, failed, src }
    const loadListeners = new Set();
    let preloadStarted = false;

    function preloadAll(onUpdate) {
        if (typeof onUpdate === 'function') loadListeners.add(onUpdate);
        if (typeof Image === 'undefined') return;
        if (preloadStarted) return;
        preloadStarted = true;

        for (const [key, filename] of Object.entries(ASSET_MANIFEST)) {
            const img = new Image();
            const entry = { img, ready: false, failed: false, src: ASSET_BASE + filename };
            imageCache.set(key, entry);
            img.onload = () => {
                entry.ready = true;
                for (const fn of loadListeners) {
                    try { fn(key, entry); } catch (_) {}
                }
            };
            img.onerror = () => {
                entry.failed = true;
            };
            img.src = entry.src;
        }
    }

    function getImg(key) {
        const entry = imageCache.get(key);
        if (entry && entry.ready && entry.img && entry.img.naturalWidth > 0) {
            return entry.img;
        }
        return null;
    }

    function getStatus() {
        let ready = 0, failed = 0;
        const failedKeys = [];
        for (const [k, v] of imageCache.entries()) {
            if (v.ready) ready++;
            if (v.failed) { failed++; failedKeys.push(k); }
        }
        return { total: Object.keys(ASSET_MANIFEST).length, ready, failed, failedKeys };
    }

    // -------------------------------------------------------------------------
    // SHARED DRAWING PRIMITIVES (2-LAYER SHADOWS, LEADS, BADGES)
    // -------------------------------------------------------------------------
    function rRect(ctx, x, y, w, h, r) {
        const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
        ctx.beginPath();
        ctx.moveTo(x + rad, y);
        ctx.arcTo(x + w, y, x + w, y + h, rad);
        ctx.arcTo(x + w, y + h, x, y + h, rad);
        ctx.arcTo(x, y + h, x, y, rad);
        ctx.arcTo(x, y, x + w, y, rad);
        ctx.closePath();
    }

    // Two-Layer Physical Shadow:
    // Pass 1: Soft ambient drop shadow (shadowBlur = 12, offsetY = 5)
    // Pass 2: Tight dark contact shadow (shadowBlur = 4, offsetY = 2)
    function drawImageWithPhysicalShadow(ctx, img, dx, dy, dw, dh, extraRim = false) {
        if (!img) return;
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.48)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 5;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();

        ctx.save();
        ctx.shadowColor = extraRim ? 'rgba(226, 232, 240, 0.24)' : 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = extraRim ? 5 : 4;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = extraRim ? 0 : 2;
        ctx.drawImage(img, dx, dy, dw, dh);
        ctx.restore();
    }

    function drawMetalLead(ctx, pts, width = 3.8) {
        if (!pts || pts.length < 2) return;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.strokeStyle = 'rgba(2, 6, 23, 0.72)';
        ctx.lineWidth = width + 2.0;
        ctx.stroke();

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = width;
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1.1, width * 0.34);
        ctx.stroke();
        ctx.restore();
    }

    function drawPillBadge(ctx, x, y, text, severity = 'info') {
        if (!text) return;
        ctx.save();
        ctx.translate(x, y);
        // Automatically counter-rotate pill badges so text ALWAYS stays upright at 0°, 90°, 180°, 270°!
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
        ctx.lineWidth = 1.3;
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

    function drawSelectionFrame(ctx, x, y, w, h) {
        ctx.save();
        ctx.setLineDash([7, 4]);
        rRect(ctx, x, y, w, h, 10);
        ctx.strokeStyle = '#8b9dff';
        ctx.lineWidth = 2.4;
        ctx.stroke();
        ctx.restore();
    }

    // -------------------------------------------------------------------------
    // 1. FRITZING BREADBOARD RENDERER (Half_Breadboard.svg EXACT 400-HOLE ALIGN)
    // -------------------------------------------------------------------------
    // Half_Breadboard.svg viewBox = 0 0 292.41 189 (9.0 units per 0.1" hole!).
    // ScaleX = 36 / 9 = 4.000 -> Col 1 (x=13.40) maps to -540, Col 30 (274.40) -> +504!
    // Sliced seamlessly along horizontal tie-point zones so top/bottom rails,
    // rows a..e (-216..-72), center DIP trough (-72..+72), and rows f..j (+72..+216)
    // align to 0.0 px error with electronics-solver.js!
    function drawFritzingBreadboard(ctx, comp, spec, evalData, isSelected, hoverStripId) {
        const img = getImg('breadboard_half');
        if (!img) return false;

        const w = spec.width;
        const h = spec.height;
        const halfW = w / 2;
        const halfH = h / 2;
        const isHalf = spec.variant !== 'mini';

        // Physical two-layer shadow under breadboard body
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetY = 8;
        rRect(ctx, -halfW, -halfH, w, h, 14);
        ctx.fillStyle = '#e8e8e6';
        ctx.fill();
        ctx.restore();

        // Clip cleanly to rounded breadboard silhouette
        ctx.save();
        rRect(ctx, -halfW, -halfH, w, h, 14);
        ctx.clip();

        if (isHalf) {
            // SVG native coords: width 292.41, height 189; col1 x=13.40 -> world -540 => dx = -593.6
            const S = 4.0;
            const dxMain = -593.6;
            const dwMain = 292.41 * S; // 1169.64

            // Fill subtle breadboard base ivory so seam transitions are invisible
            ctx.fillStyle = '#e7e7e4';
            ctx.fillRect(-halfW, -halfH, w, h);

            // Slice 1: Top Power Rail (SVG y=0..28.5, Z=9 -> -324, Y=18 -> -288 => top=-360, EXACT 2U=72px above Row a!)
            // Rail holes in Half_Breadboard.svg are at x=16.75 (shifted -5.65 from col2=22.40 -> +22.6px right!)
            ctx.save();
            ctx.beginPath();
            ctx.rect(-halfW + 18, -halfH, w - 36, 124);
            ctx.clip();
            ctx.drawImage(img, 0, 0, 292.41, 28.5, dxMain + 22.6, -360, dwMain, 28.5 * S);
            ctx.restore();

            // Slice 2: Top Main Rows a..e (SVG y=36..87 -> J=45..-216, F=81..-72 => top=-252)
            ctx.drawImage(img, 0, 36, 292.41, 51, dxMain, -252, dwMain, 51 * S);

            // Slice 3: Center DIP Trough (SVG y=87..102 smoothly spanning -48..+48 — exact DIP-14/16 trough!)
            ctx.drawImage(img, 0, 87, 292.41, 15, dxMain, -48, dwMain, 96);

            // Slice 4: Bottom Main Rows f..j (SVG y=102..153 -> E=108..+72, A=144..+216 => top=+48)
            ctx.drawImage(img, 0, 102, 292.41, 51, dxMain, 48, dwMain, 51 * S);

            // Slice 5: Bottom Power Rail (SVG y=160.5..189 -> X=171..+288, W=180..+324 => top=+246, EXACT 2U=72px below Row j!)
            ctx.save();
            ctx.beginPath();
            ctx.rect(-halfW + 18, 246, w - 36, 124);
            ctx.clip();
            ctx.drawImage(img, 0, 160.5, 292.41, 28.5, dxMain + 22.6, 246, dwMain, 28.5 * S);
            ctx.restore();

            // Cleanly mask SVG's baked-in edge margins, sideways column numbers & offset rail lines before drawing crisp aligned markings
            ctx.fillStyle = '#e7e7e4';
            ctx.fillRect(-halfW, -halfH, (spec.startX - 14) - (-halfW), h);
            const rightMaskX = spec.startX + (spec.cols - 1) * spec.pitch + 14;
            ctx.fillRect(rightMaskX, -halfH, halfW - rightMaskX, h);
            ctx.fillRect(-halfW, -halfH, w, 32);       // top outer rim (-370..-338)
            ctx.fillRect(-halfW, -274, w, 45);         // clean 2U gap between top − rail (-288) & row a (-216)
            ctx.fillRect(-halfW, 229, w, 45);          // clean 2U gap between row j (+216) & bottom + rail (+288)
            ctx.fillRect(-halfW, 338, w, 32);          // bottom outer rim (+338..+370)

            // Subtle physical plastic divider groove separating power rails from 5-point terminal strips
            ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(-halfW + 24, -256); ctx.lineTo(halfW - 24, -256);
            ctx.moveTo(-halfW + 24, 256); ctx.lineTo(halfW - 24, 256);
            ctx.stroke();

            // Clean red (+) and blue (−) rail lines across full width (top & bottom)
            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 3.2;
            ctx.beginPath(); ctx.moveTo(-halfW + 30, -347); ctx.lineTo(halfW - 30, -347); ctx.stroke();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 3.2;
            ctx.beginPath(); ctx.moveTo(-halfW + 30, -267); ctx.lineTo(halfW - 30, -267); ctx.stroke();

            ctx.strokeStyle = '#dc2626';
            ctx.lineWidth = 3.2;
            ctx.beginPath(); ctx.moveTo(-halfW + 30, 267); ctx.lineTo(halfW - 30, 267); ctx.stroke();
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 3.2;
            ctx.beginPath(); ctx.moveTo(-halfW + 30, 347); ctx.lineTo(halfW - 30, 347); ctx.stroke();
        } else {
            // Mini Breadboard (17 cols: x=-288..+288, no rails) sliced from Half_Breadboard.svg cols 1..17!
            const S = 4.0;
            const srcX = 13.40 - 12; // margin left of col 1
            const srcW = 16 * 9.0 + 24; // 17 cols + margins
            const dx = -288 - 12 * S;
            const dw = srcW * S;
            ctx.fillStyle = '#e7e7e4';
            ctx.fillRect(-halfW, -halfH, w, h);
            ctx.drawImage(img, srcX, 36, srcW, 51, dx, -252, dw, 51 * S);
            ctx.drawImage(img, srcX, 87, srcW, 15, dx, -48, dw, 96);
            ctx.drawImage(img, srcX, 102, srcW, 51, dx, 48, dw, 51 * S);

            // Mask SVG baked-in edge letters & top/bottom sideways numbers cleanly
            ctx.fillStyle = '#e7e7e4';
            ctx.fillRect(-halfW, -halfH, (spec.startX - 14) - (-halfW), h);
            const rightMaskX = spec.startX + (spec.cols - 1) * spec.pitch + 14;
            ctx.fillRect(rightMaskX, -halfH, halfW - rightMaskX, h);
            ctx.fillRect(-halfW, -halfH, w, 24);
            ctx.fillRect(-halfW, 228, w, 24);
        }

        // Crisp Breadboard Row Letters (a..e, f..j) & Column Numbers (1, 5, 10, 15, 20, 25, 30)
        ctx.font = '800 11px "JetBrains Mono", Consolas, monospace';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const topNames = ['a', 'b', 'c', 'd', 'e'];
        const botNames = ['f', 'g', 'h', 'i', 'j'];
        for (let r = 0; r < 5; r++) {
            ctx.fillText(topNames[r], -halfW + 17, spec.topRows[r]);
            ctx.fillText(topNames[r], halfW - 17, spec.topRows[r]);
            ctx.fillText(botNames[r], -halfW + 17, spec.botRows[r]);
            ctx.fillText(botNames[r], halfW - 17, spec.botRows[r]);
        }
        for (let c = 0; c < spec.cols; c++) {
            const colNum = c + 1;
            if (colNum === 1 || colNum % 5 === 0 || colNum === spec.cols) {
                const lx = spec.startX + c * spec.pitch;
                ctx.fillText(String(colNum), lx, -241);
                ctx.fillText(String(colNum), lx, 241);
            }
        }
        if (isHalf) {
            ctx.font = '900 14px "Inter", sans-serif';
            ctx.fillStyle = '#dc2626';
            ctx.fillText('+', -halfW + 18, spec.topRailPosY);
            ctx.fillText('+', halfW - 18, spec.topRailPosY);
            ctx.fillText('+', -halfW + 18, spec.botRailPosY);
            ctx.fillText('+', halfW - 18, spec.botRailPosY);
            ctx.fillStyle = '#2563eb';
            ctx.fillText('−', -halfW + 18, spec.topRailNegY);
            ctx.fillText('−', halfW - 18, spec.topRailNegY);
            ctx.fillText('−', -halfW + 18, spec.botRailNegY);
            ctx.fillText('−', halfW - 18, spec.botRailNegY);
        }

        // Dynamic Breadboard Tie-Point Row / Rail Hover Highlight (rgba(56, 189, 248, 0.35))
        if (hoverStripId && hoverStripId.startsWith(comp.id + ':')) {
            const localStrip = hoverStripId.slice(comp.id.length + 1);
            ctx.save();
            ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
            ctx.strokeStyle = 'rgba(14, 165, 233, 0.92)';
            ctx.lineWidth = 2.4;
            if (localStrip.startsWith('top_') || localStrip.startsWith('bot_')) {
                const isTop = localStrip.startsWith('top_');
                const colNum = parseInt(localStrip.split('_')[1], 10);
                if (colNum >= 1 && colNum <= spec.cols) {
                    const lx = spec.startX + (colNum - 1) * spec.pitch;
                    const y0 = isTop ? spec.topRows[0] - 15 : spec.botRows[0] - 15;
                    const sh = (isTop ? spec.topRows[4] - spec.topRows[0] : spec.botRows[4] - spec.botRows[0]) + 30;
                    rRect(ctx, lx - 14, y0, 28, sh, 7);
                    ctx.fill();
                    ctx.stroke();
                }
            } else if (isHalf && localStrip.startsWith('rail_')) {
                const ry = localStrip === 'rail_top_pos' ? spec.topRailPosY
                    : localStrip === 'rail_top_neg' ? spec.topRailNegY
                    : localStrip === 'rail_bot_pos' ? spec.botRailPosY
                    : spec.botRailNegY;
                rRect(ctx, spec.startX + 22, ry - 13, (spec.cols - 2) * spec.pitch + 28, 26, 7);
                ctx.fill();
                ctx.stroke();
            }
            ctx.restore();
        }

        // Subtle refined socket collar around plugged-in component legs
        if (evalData && evalData.pluggedPinMap && evalData.pins) {
            for (const holeKey of evalData.pluggedPinMap.values()) {
                if (!holeKey.startsWith(comp.id + ':')) continue;
                const holePin = evalData.pins.get(holeKey);
                if (!holePin) continue;
                const lx = holePin.lx !== undefined ? holePin.lx : (holePin.x - comp.position.x);
                const ly = holePin.ly !== undefined ? holePin.ly : (holePin.y - comp.position.y);
                ctx.save();
                rRect(ctx, lx - 6, ly - 6, 12, 12, 3);
                ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
                ctx.lineWidth = 1.4;
                ctx.stroke();
                ctx.restore();
            }
        }

        ctx.restore();

        // Outer breadboard crisp rim + selection ring
        rRect(ctx, -halfW, -halfH, w, h, 14);
        ctx.strokeStyle = isSelected ? '#8b9dff' : 'rgba(15, 23, 42, 0.65)';
        ctx.lineWidth = isSelected ? 3.5 : 2.2;
        ctx.stroke();

        return true;
    }

    // -------------------------------------------------------------------------
    // 2. FRITZING LED + LIGHTER-BLENDED RADIAL BLOOM (led_red.svg)
    // -------------------------------------------------------------------------
    const LED_COLORS = {
        red:     { hex: '#ef4444', glow: '#ff4d4d', core: '#ffe4e6', filter: 'none' },
        emerald: { hex: '#22c55e', glow: '#4ade80', core: '#dcfce7', filter: 'hue-rotate(112deg) saturate(1.35)' },
        green:   { hex: '#22c55e', glow: '#4ade80', core: '#dcfce7', filter: 'hue-rotate(112deg) saturate(1.35)' },
        amber:   { hex: '#f59e0b', glow: '#fbbf24', core: '#fef3c7', filter: 'hue-rotate(36deg) saturate(1.45) brightness(1.12)' },
        cyan:    { hex: '#06b6d4', glow: '#38bdf8', core: '#e0f2fe', filter: 'hue-rotate(192deg) saturate(1.35) brightness(1.08)' }
    };

    function drawFritzingLed(ctx, comp, evalData, isSelected) {
        const img = getImg('led');
        if (!img) return false;

        const st = evalData?.lampStates?.get(comp.id) || { lit: false, brightness: 0, overloaded: false, currentMa: 0 };
        const pal = LED_COLORS[comp.color || 'emerald'] || LED_COLORS.emerald;
        const lit = Boolean(st.lit && !st.overloaded);
        const br = lit ? Math.max(0.32, Math.min(1, st.brightness || 0.85)) : 0;

        // Tinkercad 1U (36px) straight vertical breadboard legs plugging directly into (-18, 0) & (+18, 0)!
        drawMetalLead(ctx, [{ x: -11, y: -14 }, { x: -18, y: -6 }, { x: -18, y: 0 }], 3.2);
        drawMetalLead(ctx, [{ x: 11, y: -14 }, { x: 18, y: -6 }, { x: 18, y: 0 }], 3.2);

        // Compact Tinkercad 5mm LED proportions (46 x 84px -> ~1.28U wide, sits cleanly on 2 adjacent holes!)
        const dw = 46, dh = 84;
        ctx.save();
        if (st.overloaded) {
            ctx.filter = 'brightness(0.38) contrast(1.45) saturate(0.45)';
        } else if (pal.filter !== 'none') {
            ctx.filter = pal.filter + (lit ? ' brightness(1.22)' : ' brightness(0.88)');
        } else if (lit) {
            ctx.filter = 'brightness(1.18)';
        }
        drawImageWithPhysicalShadow(ctx, img, -dw / 2, -dh - 2, dw, dh, true);
        ctx.restore();

        // Additive Radial Color Halo (globalCompositeOperation = 'lighter') proportional to branch current
        if (lit) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const rOuter = 36 + br * 30;
            const g = ctx.createRadialGradient(0, -54, 4, 0, -54, rOuter);
            g.addColorStop(0, pal.core);
            g.addColorStop(0.28, pal.glow);
            g.addColorStop(0.62, pal.hex + '66');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.globalAlpha = 0.55 + br * 0.45;
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, -54, rOuter, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else if (st.overloaded) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(0, -54, 3, 0, -54, 40);
            g.addColorStop(0, 'rgba(255, 180, 120, 0.85)');
            g.addColorStop(0.45, 'rgba(239, 68, 68, 0.65)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, -54, 40, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Crisp + / − leg markers
        ctx.font = '800 9.5px "JetBrains Mono", monospace';
        ctx.fillStyle = '#fca5a5';
        ctx.textAlign = 'center';
        ctx.fillText('+', -27, -2);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('−', 27, -2);

        if (st.overloaded) {
            drawPillBadge(ctx, 0, -98, `🔥 POP · ${(st.currentMa || 0).toFixed(0)}mA`, 'error');
        } else if (lit && st.currentMa > 0.2) {
            drawPillBadge(ctx, 0, 20, `${comp.label || 'LED'} · ${st.currentMa.toFixed(1)}mA`, 'ok');
        } else {
            drawPillBadge(ctx, 0, 20, comp.label || 'LED', 'info');
        }

        if (isSelected) drawSelectionFrame(ctx, -32, -92, 64, 102);
        return true;
    }

    // -------------------------------------------------------------------------
    // 3. FRITZING 4-LEG RGB LED (rgb_led.svg — COMPACT TINKERCAD 1U PITCH!)
    // -------------------------------------------------------------------------
    function drawFritzingRgbLed(ctx, comp, evalData, isSelected) {
        const img = getImg('rgb_led');
        if (!img) return false;

        const st = evalData?.rgbStates?.get(comp.id) || {
            r: { brightness: 0, currentMa: 0 },
            g: { brightness: 0, currentMa: 0 },
            b: { brightness: 0, currentMa: 0 },
            overloaded: false
        };

        // 4 splayed legs matching 4 consecutive breadboard columns (-54, -18, +18, +54 @ y=+36)
        drawMetalLead(ctx, [{ x: -24, y: 0 }, { x: -46, y: 18 }, { x: -54, y: 36 }], 3.2);
        drawMetalLead(ctx, [{ x: -8, y: 0 }, { x: -16, y: 18 }, { x: -18, y: 36 }], 3.2);
        drawMetalLead(ctx, [{ x: 8, y: 0 }, { x: 16, y: 18 }, { x: 18, y: 36 }], 3.2);
        drawMetalLead(ctx, [{ x: 24, y: 0 }, { x: 46, y: 18 }, { x: 54, y: 36 }], 3.2);

        // Compact Tinkercad 5mm RGB dome (76 x 104px, never blocks upper breadboard rows!)
        const dw = 76, dh = 104;
        drawImageWithPhysicalShadow(ctx, img, -dw / 2, -dh + 18, dw, dh, true);

        const rVal = Math.round(255 * Math.min(1, st.r.brightness || 0));
        const gVal = Math.round(255 * Math.min(1, st.g.brightness || 0));
        const bVal = Math.round(255 * Math.min(1, st.b.brightness || 0));
        const maxB = Math.max(st.r.brightness || 0, st.g.brightness || 0, st.b.brightness || 0);

        if (!st.overloaded && maxB > 0.05) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(0, -48, 5, 0, -48, 52);
            g.addColorStop(0, `rgba(${rVal},${gVal},${bVal},0.92)`);
            g.addColorStop(0.55, `rgba(${rVal},${gVal},${bVal},0.42)`);
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, -48, 52, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.font = '800 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        for (const [lx, tag, col] of [[-54, 'R', '#f87171'], [-18, '−', '#cbd5e1'], [18, 'G', '#4ade80'], [54, 'B', '#60a5fa']]) {
            ctx.fillStyle = col;
            ctx.fillText(tag, lx, 50);
        }
        if (st.overloaded) drawPillBadge(ctx, 0, -96, '🔥 RGB OVERCURRENT!', 'error');
        if (isSelected) drawSelectionFrame(ctx, -62, -92, 124, 138);
        return true;
    }

    // -------------------------------------------------------------------------
    // 4. FRITZING AXIAL RESISTOR + DYNAMIC 4-BAND EIA RINGS (EXACT 4U = 144px!)
    // -------------------------------------------------------------------------
    function drawFritzingResistor(ctx, comp, evalData, isSelected, solverMod) {
        const img = getImg('resistor');
        if (!img) return false;

        const ohms = Math.max(1, Number(comp.ohms) || 220);
        const st = evalData?.resistorStates?.get(comp.id);
        const bands = solverMod ? solverMod.getResistorBands(ohms) : ['#dc2626', '#dc2626', '#7c3f1d', '#d4af37'];
        const fmt = solverMod ? solverMod.formatOhms(ohms) : `${ohms}Ω`;

        // Compact Tinkercad 1/4W axial resistor spanning EXACT 4U (-72..+72), sleek 27px body fits between adjacent rows!
        const dw = 152;
        const dh = 27;
        drawImageWithPhysicalShadow(ctx, img, -dw / 2, -dh / 2, dw, dh, true);

        // Dynamic 4-Band EIA Color Rings composited cleanly over the axial cylinder body
        ctx.save();
        const bodyGrad = ctx.createLinearGradient(0, -10.5, 0, 10.5);
        bodyGrad.addColorStop(0, '#f3dec0');
        bodyGrad.addColorStop(0.28, '#e3c396');
        bodyGrad.addColorStop(0.75, '#c49d68');
        bodyGrad.addColorStop(1, '#967241');
        rRect(ctx, -29, -10.5, 58, 21, 4);
        ctx.fillStyle = st?.overloaded ? '#451a03' : bodyGrad;
        ctx.fill();

        const bandXs = [-21.5, -9.5, 2.5, 16.5];
        for (let i = 0; i < 4; i++) {
            ctx.fillStyle = bands[i] || '#111111';
            ctx.fillRect(bandXs[i], -10.5, 6.6, 21);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
            ctx.fillRect(bandXs[i], -9.2, 6.6, 4.2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
            ctx.fillRect(bandXs[i], 6.4, 6.6, 4.1);
        }
        ctx.restore();

        if (st?.overloaded) {
            drawPillBadge(ctx, 0, -24, `🔥 HOT · ${(st.powerW || 0).toFixed(2)}W`, 'error');
        }
        drawPillBadge(ctx, 0, 24, fmt, 'info');
        if (isSelected) drawSelectionFrame(ctx, -78, -20, 156, 40);
        return true;
    }

    // -------------------------------------------------------------------------
    // 5. FRITZING DC MOTOR + ROTATING SLOTTED ENCODER / PROPELLER (dc_motor.svg)
    // -------------------------------------------------------------------------
    function drawFritzingMotor(ctx, comp, evalData, isSelected, animAngleRad = 0) {
        const img = getImg('dc_motor');
        if (!img) return false;

        const st = evalData?.motorStates?.get(comp.id) || { rpm: 0, spinning: false, direction: 'IDLE', voltage: 0, currentMa: 0, overloaded: false };

        // Leads connecting left motor terminals to exact pin sockets (-108, -18) and (-108, +18)
        drawMetalLead(ctx, [{ x: -108, y: -18 }, { x: -78, y: -18 }], 4.0);
        drawMetalLead(ctx, [{ x: -108, y: 18 }, { x: -78, y: 18 }], 4.0);

        // dc_motor.svg: vb 120.132 x 55.721 (aspect 2.156 -> 228 x 106 px)
        const dw = 228, dh = 106;
        drawImageWithPhysicalShadow(ctx, img, -96, -dh / 2, dw, dh, true);

        // Polarity tags
        ctx.font = '800 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fca5a5';
        ctx.fillText('+', -108, -31);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('−', -108, 34);

        // Dynamic Spinning Slotted Encoder Wheel + Aerodynamic Rotor over right-side spindle (+106, 0)
        const sx = 104, sy = 0;
        ctx.save();
        ctx.translate(sx, sy);

        // Motion-blur halo when spinning
        if (st.spinning && st.rpm > 20) {
            const blurAlpha = Math.min(0.45, 0.12 + (st.rpm / 3600) * 0.35);
            ctx.beginPath();
            ctx.arc(0, 0, 38, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(56, 189, 248, ${blurAlpha * 0.35})`;
            ctx.fill();
            ctx.strokeStyle = `rgba(56, 189, 248, ${blurAlpha})`;
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }

        ctx.rotate(animAngleRad || 0);

        // Slotted optical encoder disc + 3 high-contrast fan blades
        ctx.beginPath();
        ctx.arc(0, 0, 26, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // 6 radial encoder slots
        for (let i = 0; i < 6; i++) {
            const a = (i * Math.PI) / 3;
            ctx.save();
            ctx.rotate(a);
            ctx.fillStyle = i === 0 ? '#f59e0b' : '#e2e8f0';
            rRect(ctx, 11, -2.6, 11, 5.2, 2);
            ctx.fill();
            ctx.restore();
        }

        // 3 bright propeller blades
        for (let b = 0; b < 3; b++) {
            ctx.save();
            ctx.rotate((b * Math.PI * 2) / 3);
            ctx.beginPath();
            ctx.moveTo(6, -3);
            ctx.quadraticCurveTo(22, -12, 36, -4);
            ctx.quadraticCurveTo(38, 0, 34, 5);
            ctx.quadraticCurveTo(20, 8, 6, 3);
            ctx.closePath();
            ctx.fillStyle = b === 0 ? '#fbbf24' : '#38bdf8';
            ctx.fill();
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = 1.2;
            ctx.stroke();
            ctx.restore();
        }

        // Brass center shaft nut
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.restore();

        // Live RPM telemetry pill
        if (st.overloaded) {
            drawPillBadge(ctx, 14, -72, `🔥 OVER-V (${st.voltage.toFixed(1)}V)`, 'error');
        } else if (st.spinning) {
            drawPillBadge(ctx, 14, -72, `${st.rpm.toLocaleString()} RPM · ${st.direction}`, 'ok');
        } else {
            drawPillBadge(ctx, 14, -72, 'DC MOTOR · 0 RPM', 'info');
        }

        if (isSelected) drawSelectionFrame(ctx, -118, -68, 266, 136);
        return true;
    }

    // -------------------------------------------------------------------------
    // 6. FRITZING 9V BATTERY & AA BATTERY HOLDER (9v_battery.svg, battery_holder.svg)
    // -------------------------------------------------------------------------
    function drawFritzingBattery9V(ctx, comp, evalData, isSelected) {
        const img = getImg('battery_9v');
        if (!img) return false;
        const st = evalData?.sourceStates?.get(comp.id);

        // Curved insulated Red (+) & Black (−) snap-clip leads to (-90, 0) & (+90, 0)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-24, -84); ctx.bezierCurveTo(-72, -84, -86, -44, -90, 0);
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 6.2; ctx.stroke();
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3.8; ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(24, -84); ctx.bezierCurveTo(72, -84, 86, -44, 90, 0);
        ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 6.2; ctx.stroke();
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3.8; ctx.stroke();
        ctx.restore();

        // 9v_battery.svg (vb 95.269 x 151.872 -> 114 x 182 px)
        const dw = 114, dh = 182;
        drawImageWithPhysicalShadow(ctx, img, -dw / 2, -dh / 2, dw, dh, true);

        ctx.font = '900 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('−', -90, 18);
        ctx.fillStyle = '#f87171';
        ctx.fillText('+', 90, 18);

        drawPillBadge(ctx, 0, 104, '9V PP3', 'info');
        if (st?.shorted) drawPillBadge(ctx, 0, -106, '⚡ SHORT CIRCUIT!', 'error');
        if (isSelected) drawSelectionFrame(ctx, -98, -100, 196, 200);
        return true;
    }

    function drawFritzingAAHolder(ctx, comp, evalData, isSelected) {
        const cells = Math.max(1, Math.min(4, Math.round(comp.cells || (comp.voltage ? comp.voltage / 1.5 : 3))));
        const img = getImg(cells <= 2 ? 'battery_2aa' : 'battery_4aa') || getImg('battery_4aa');
        if (!img) return false;
        const st = evalData?.sourceStates?.get(comp.id);
        const vNom = (cells * 1.5).toFixed(1);

        // Curved insulated exit wires to (-108, 0) & (+108, 0)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-78, 0); ctx.lineTo(-108, 0);
        ctx.strokeStyle = '#475569'; ctx.lineWidth = 6.2; ctx.stroke();
        ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 3.8; ctx.stroke();

        ctx.beginPath(); ctx.moveTo(78, 0); ctx.lineTo(108, 0);
        ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 6.2; ctx.stroke();
        ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3.8; ctx.stroke();
        ctx.restore();

        const dw = 178;
        const dh = Math.max(82, cells * 38 + 26);
        drawImageWithPhysicalShadow(ctx, img, -dw / 2, -dh / 2, dw, dh, true);

        ctx.font = '900 13px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('−', -108, -16);
        ctx.fillStyle = '#f87171';
        ctx.fillText('+', 108, -16);

        drawPillBadge(ctx, 0, -dh / 2 - 17, `${cells}×AA · ${vNom}V`, 'info');
        if (st?.shorted) drawPillBadge(ctx, 0, dh / 2 + 18, '⚡ SHORT CIRCUIT!', 'error');
        if (isSelected) drawSelectionFrame(ctx, -114, -dh / 2 - 8, 228, dh + 16);
        return true;
    }

    // -------------------------------------------------------------------------
    // 7. FRITZING PUSH BUTTON — TINKERCAD 2U x 2U COMPACT FOOTPRINT (±36, ±36)
    // -------------------------------------------------------------------------
    function drawFritzingPushButton(ctx, comp, evalData, isSelected) {
        const down = Boolean(comp.pressed);
        const img = getImg(down ? 'pushbutton_pressed' : 'pushbutton') || getImg('pushbutton');
        if (!img) return false;

        // 4 crisp metallic legs terminating cleanly into exact 2x2 breadboard sockets (±36, ±36)
        drawMetalLead(ctx, [{ x: -24, y: -24 }, { x: -36, y: -36 }], 3.6);
        drawMetalLead(ctx, [{ x: 24, y: -24 }, { x: 36, y: -36 }], 3.6);
        drawMetalLead(ctx, [{ x: -24, y: 24 }, { x: -36, y: 36 }], 3.6);
        drawMetalLead(ctx, [{ x: 24, y: 24 }, { x: 36, y: 36 }], 3.6);

        // Compact Tinkercad 6x6mm tactile housing (58 x 74px -> fits strictly inside 2x2 breadboard holes!)
        const dw = 58, dh = 74;
        drawImageWithPhysicalShadow(ctx, img, -dw / 2, -dh / 2, dw, dh, true);

        // Vivid LED-ring press indicator around cap
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.strokeStyle = down ? '#34d399' : 'rgba(248, 113, 113, 0.85)';
        ctx.lineWidth = down ? 3.0 : 1.9;
        ctx.stroke();

        const tag = comp.label || 'BTN';
        drawPillBadge(ctx, 0, 48, down ? `${tag} · ON` : tag, down ? 'ok' : 'info');
        if (isSelected) drawSelectionFrame(ctx, -44, -44, 88, 88);
        return true;
    }

    // -------------------------------------------------------------------------
    // 8. FRITZING SPDT SLIDE SWITCH — TINKERCAD COMPACT 3-HOLE PITCH (-36/0/+36 @ y=+36)
    // -------------------------------------------------------------------------
    function drawFritzingSpdt(ctx, comp, evalData, isSelected) {
        const right = (comp.positionThrow || comp.throwPos) === 'right';
        const img = getImg(right ? 'slide_switch_right' : 'slide_switch') || getImg('slide_switch');
        if (!img) return false;

        // Compact Tinkercad breadboard SPDT height (dw=116, dh=86px) with exact 1U (36px) pin pitch at (-36, 36), (0, 36), (+36, 36)!
        drawMetalLead(ctx, [{ x: -36, y: 12 }, { x: -36, y: 36 }], 3.6);
        drawMetalLead(ctx, [{ x: 0, y: 12 }, { x: 0, y: 36 }], 3.6);
        drawMetalLead(ctx, [{ x: 36, y: 12 }, { x: 36, y: 36 }], 3.6);

        const dw = 114, dh = 86;
        drawImageWithPhysicalShadow(ctx, img, -dw / 2, -52, dw, dh, true);

        drawPillBadge(ctx, 0, -64, `${comp.label || 'SPDT'} · ${right ? 'T2 →' : '← T1'}`, 'info');
        if (isSelected) drawSelectionFrame(ctx, -58, -56, 116, 100);
        return true;
    }

    // -------------------------------------------------------------------------
    // 9. FRITZING ROTARY POTENTIOMETER — TINKERCAD COMPACT 3-HOLE BREADBOARD POT (-36/0/+36 @ y=+36)
    // -------------------------------------------------------------------------
    function drawFritzingPotentiometer(ctx, comp, evalData, isSelected, solverMod) {
        const img = getImg('potentiometer');
        if (!img) return false;

        const wiper = Math.max(0, Math.min(1, Number(comp.wiper ?? comp.knob ?? 0.5)));
        const ohms = Number(comp.ohms) || 10000;
        const st = evalData?.potStates?.get(comp.id);
        const fmt = solverMod ? solverMod.formatOhms(ohms) : `${ohms}Ω`;

        // 3 straight metallic legs plugging directly into 3 consecutive breadboard holes (-36, 36), (0, 36), (+36, 36)!
        drawMetalLead(ctx, [{ x: -36, y: 6 }, { x: -36, y: 36 }], 3.8);
        drawMetalLead(ctx, [{ x: 0, y: 6 }, { x: 0, y: 36 }], 3.8);
        drawMetalLead(ctx, [{ x: 36, y: 6 }, { x: 36, y: 36 }], 3.8);

        // Compact Tinkercad breadboard trimpot housing (96 x 116px, never dwarfs breadboard!)
        const dw = 96, dh = 116;
        drawImageWithPhysicalShadow(ctx, img, -dw / 2, -84, dw, dh, true);

        // Live Rotary Wiper Indicator Ring & High-Contrast Knurled Dial over knob center (0, -34)
        const cx = 0, cy = -34, kr = 30;
        const startAng = (135 * Math.PI) / 180;
        const sweepAng = (270 * Math.PI) / 180;
        const curAng = startAng + wiper * sweepAng;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, kr + 10, 0, Math.PI * 2);
        ctx.fillStyle = '#1e293b';
        ctx.fill();
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.0;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, kr + 4, startAng, startAng + sweepAng);
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 4.5;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, kr + 4, startAng, curAng);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4.0;
        ctx.lineCap = 'round';
        ctx.stroke();

        const kGrad = ctx.createRadialGradient(cx - 7, cy - 7, 3, cx, cy, kr - 4);
        kGrad.addColorStop(0, '#64748b');
        kGrad.addColorStop(0.55, '#334155');
        kGrad.addColorStop(1, '#0f172a');
        ctx.beginPath();
        ctx.arc(cx, cy, kr - 4, 0, Math.PI * 2);
        ctx.fillStyle = kGrad;
        ctx.fill();
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.translate(cx, cy);
        ctx.rotate(curAng);
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(kr - 6, 0);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 4.0;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        if (st?.overloaded) {
            drawPillBadge(ctx, 0, -92, `🔥 POT HOT · ${(st.powerW || 0).toFixed(2)}W`, 'error');
        } else {
            drawPillBadge(ctx, 0, -90, `${comp.label || 'POT'} · ${fmt} (${Math.round(wiper * 100)}%)`, 'info');
        }
        if (isSelected) drawSelectionFrame(ctx, -54, -84, 108, 130);
        return true;
    }

    // -------------------------------------------------------------------------
    // 10. FRITZING PIEZO BUZZER — TINKERCAD 2U BREADBOARD PLUGGABLE (±36 @ y=+36)
    // -------------------------------------------------------------------------
    function drawFritzingBuzzer(ctx, comp, evalData, isSelected, animTimeSec = 0) {
        const img = getImg('buzzer');
        if (!img) return false;

        const st = evalData?.buzzerStates?.get(comp.id) || { sounding: false, active: false, freqHz: comp.freqHz || 880 };
        const active = Boolean(st.sounding || st.active);

        // 2 straight legs at exact 2U breadboard spacing (-36, 36) & (+36, 36)!
        drawMetalLead(ctx, [{ x: -36, y: 4 }, { x: -36, y: 36 }], 3.6);
        drawMetalLead(ctx, [{ x: 36, y: 4 }, { x: 36, y: 36 }], 3.6);

        if (active) {
            for (let k = 0; k < 3; k++) {
                const phase = (animTimeSec * 2.2 + k / 3) % 1;
                const rad = 42 + phase * 36;
                ctx.beginPath();
                ctx.arc(0, -24, rad, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - phase) * 0.85})`;
                ctx.lineWidth = 3.0;
                ctx.stroke();
            }
        }

        // Compact Tinkercad 12mm piezo buzzer (84 x 96px)
        const dw = 84, dh = 96;
        drawImageWithPhysicalShadow(ctx, img, -dw / 2, -74, dw, dh, true);

        ctx.font = '800 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fca5a5';
        ctx.fillText('+', -46, 30);
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('−', 46, 30);

        drawPillBadge(ctx, 0, -86, active ? `🔊 ${Math.round(st.freqHz || 880)} Hz` : (comp.label || 'Buzzer'), active ? 'ok' : 'info');
        if (isSelected) drawSelectionFrame(ctx, -50, -78, 100, 122);
        return true;
    }

    // -------------------------------------------------------------------------
    // 11. FRITZING NPN TRANSISTOR — TINKERCAD COMPACT 1U E-B-C PITCH (-36/0/+36 @ y=+36!)
    // -------------------------------------------------------------------------
    function drawFritzingNpn(ctx, comp, evalData, isSelected) {
        const img = getImg('npn');
        if (!img) return false;

        const st = evalData?.npnStates?.get(comp.id) || { mode: 'CUTOFF', corrupted: false };
        const conducting = st.mode === 'SATURATED' || st.mode === 'ACTIVE';

        // npn_transistor.svg: vb 16.527 x 24.081, pins at 1.08, 8.26, 15.45 (pitch 7.185 -> S=5.01 = 36px EXACT!)
        // Compact height (dh = 92px) anchored so ALL 3 pins (E, B, C) land at EXACT (-36, 36), (0, 36), (+36, 36) = 1U!
        const S = 36 / 7.185;
        const dw = 16.527 * S; // 82.8
        const dh = 92;
        const dx = -8.26 * S;  // center Base pin at x=0 EXACTLY!
        const dy = 36 - dh;    // leg tips at y=+36 (1U!) EXACTLY!
        drawImageWithPhysicalShadow(ctx, img, dx, dy, dw, dh, true);

        if (conducting) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const g = ctx.createRadialGradient(0, -24, 4, 0, -24, 38);
            g.addColorStop(0, 'rgba(52, 211, 153, 0.55)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(0, -24, 38, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // High-contrast micro pin tags (crisp on both dark bench & white breadboard)
        ctx.font = '800 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const [lx, tag, col] of [[-36, 'E', '#f8fafc'], [0, 'B', '#f0abfc'], [36, 'C', '#fdba74']]) {
            ctx.save();
            rRect(ctx, lx - 7.5, 42, 15, 13, 3.5);
            ctx.fillStyle = 'rgba(10, 15, 28, 0.88)';
            ctx.fill();
            ctx.fillStyle = col;
            ctx.fillText(tag, lx, 49);
            ctx.restore();
        }

        if (st.corrupted) {
            drawPillBadge(ctx, 0, -74, '🔥 BJT OVERCURRENT!', 'error');
        } else {
            drawPillBadge(ctx, 0, -74, `${comp.model || '2N2222'} · ${conducting ? 'ON' : 'OFF'}`, conducting ? 'ok' : 'info');
        }
        if (isSelected) drawSelectionFrame(ctx, -46, -62, 92, 108);
        return true;
    }

    // -------------------------------------------------------------------------
    // 12. REALISTIC 10-PIN 7-SEGMENT DISPLAY (seg7_10pin.svg — 10 REAL PINS!)
    // -------------------------------------------------------------------------
    // Standard 5161AS Common-Cathode 10-pin pinout straddling breadboard trough:
    // Top Row (y=-108, Row d):  Pin 10=g (-72), 9=f (-36), 8=COM (0), 7=a (+36), 6=b (+72)
    // Bot Row (y=+108, Row g):  Pin 1=e  (-72), 2=d (-36), 3=COM (0), 4=c (+36), 5=dp (+72)
    function drawFritzingSeg7TenPin(ctx, comp, evalData, isSelected) {
        const img = getImg('seg7_10');
        const st = evalData?.seg7TenStates?.get(comp.id) || { segs: {}, overloaded: false };

        // Metallic pins sticking straight out into Row d (-108) and Row g (+108)
        for (const px of [-72, -36, 0, 36, 72]) {
            drawMetalLead(ctx, [{ x: px, y: -96 }, { x: px, y: -108 }], 4.0);
            drawMetalLead(ctx, [{ x: px, y: 96 }, { x: px, y: 108 }], 4.0);
        }

        // Fritzing 10-pin 7-segment body (vb 34.632 x 52.92 -> scaled cleanly to 164 x 204 px)
        const dw = 164, dh = 204;
        if (img) {
            drawImageWithPhysicalShadow(ctx, img, -dw / 2, -dh / 2, dw, dh, true);
        } else {
            rRect(ctx, -dw / 2, -dh / 2, dw, dh, 8);
            ctx.fillStyle = '#181c24';
            ctx.fill();
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Matte black display face overlay for crisp glowing red LED segments
        rRect(ctx, -64, -78, 128, 156, 6);
        ctx.fillStyle = '#0f131b';
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Draw 7 classic hexagonal LED segments + Decimal Point (dp)
        const segPolys = {
            a: [[-28, -58], [26, -58], [32, -52], [24, -46], [-24, -46], [-32, -52]],
            b: [[32, -50], [38, -44], [34, -6], [28, 0], [22, -6], [26, -44]],
            c: [[28, 4], [34, 10], [30, 48], [24, 54], [18, 48], [22, 10]],
            d: [[-34, 58], [20, 58], [26, 52], [18, 46], [-30, 46], [-38, 52]],
            e: [[-34, 4], [-28, 10], [-32, 48], [-38, 54], [-44, 48], [-40, 10]],
            f: [[-30, -50], [-24, -44], [-28, -6], [-34, 0], [-40, -6], [-36, -44]],
            g: [[-30, 0], [-22, -6], [22, -6], [28, 0], [20, 6], [-24, 6]]
        };

        for (const [name, pts] of Object.entries(segPolys)) {
            const sInfo = st.segs[name];
            const on = Boolean(sInfo && sInfo.lit && !sInfo.overloaded);
            const br = on ? Math.max(0.4, Math.min(1, sInfo.brightness || 0.9)) : 0;

            ctx.beginPath();
            pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
            ctx.closePath();
            ctx.fillStyle = on ? `rgba(255, 59, 48, ${0.45 + br * 0.55})` : '#262d3d';
            ctx.fill();

            if (on) {
                ctx.save();
                ctx.globalCompositeOperation = 'lighter';
                ctx.shadowColor = '#ef4444';
                ctx.shadowBlur = 16;
                ctx.fillStyle = '#ff6b6b';
                ctx.fill();
                ctx.restore();
            }
        }

        // Decimal point (dp)
        const dpOn = Boolean(st.segs.dp && st.segs.dp.lit && !st.segs.dp.overloaded);
        ctx.beginPath();
        ctx.arc(46, 52, 6.5, 0, Math.PI * 2);
        ctx.fillStyle = dpOn ? '#ff3b30' : '#262d3d';
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

        // Crisp 10-pin labels right along the light-grey top & bottom Fritzing rims
        ctx.font = '900 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const [px, lbl, col] of [[-72, 'g', '#0f172a'], [-36, 'f', '#0f172a'], [0, 'COM', '#b91c1c'], [36, 'a', '#0f172a'], [72, 'b', '#0f172a']]) {
            ctx.fillStyle = col;
            ctx.fillText(lbl, px, -89);
        }
        for (const [px, lbl, col] of [[-72, 'e', '#0f172a'], [-36, 'd', '#0f172a'], [0, 'COM', '#b91c1c'], [36, 'c', '#0f172a'], [72, 'dp', '#b45309']]) {
            ctx.fillStyle = col;
            ctx.fillText(lbl, px, 89);
        }

        if (st.overloaded) {
            drawPillBadge(ctx, 0, -126, '🔥 SEG OVERCURRENT! Add 220Ω', 'error');
        }
        if (isSelected) drawSelectionFrame(ctx, -88, -114, 176, 228);
        return true;
    }

    // -------------------------------------------------------------------------
    // 13. COLORLESS MONOCHROME IEEE SCHEMATIC DIAGRAMS FOR SIDEBAR PALETTE GALLERY
    // -------------------------------------------------------------------------
    // Renders distortion-free, crisp colorless monochrome IEEE electrical symbols
    // over each component card's own matched surface color for a studio CAD look.
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

        // Pure colorless monochrome technical ink palette
        const INK = 'rgba(248, 250, 252, 0.94)';
        const INK_SOFT = 'rgba(226, 232, 240, 0.68)';
        const INK_FILL = 'rgba(255, 255, 255, 0.10)';

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.strokeStyle = INK;
        ctx.fillStyle = INK;
        ctx.lineWidth = 1.9;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        const dot = (x, y, r = 2.5) => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = INK;
            ctx.fill();
            ctx.restore();
        };

        const line = (pts, col = INK, lw = 1.9) => {
            ctx.save();
            ctx.strokeStyle = col;
            ctx.lineWidth = lw;
            ctx.beginPath();
            pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
            ctx.stroke();
            ctx.restore();
        };

        if (kind === 'breadboard' || kind === 'breadboard_mini') {
            const bw = kind === 'breadboard' ? 78 : 58;
            const bh = kind === 'breadboard' ? 42 : 34;
            rRect(ctx, -bw / 2, -bh / 2, bw, bh, 4);
            ctx.fillStyle = INK_FILL;
            ctx.fill();
            ctx.strokeStyle = INK;
            ctx.lineWidth = 1.6;
            ctx.stroke();
            if (kind === 'breadboard') {
                line([[-bw / 2 + 5, -bh / 2 + 5], [bw / 2 - 5, -bh / 2 + 5]], INK_SOFT, 1.3);
                line([[-bw / 2 + 5, bh / 2 - 5], [bw / 2 - 5, bh / 2 - 5]], INK_SOFT, 1.3);
            }
            // Center DIP trough dashed line
            ctx.save();
            ctx.setLineDash([3, 3]);
            line([[-bw / 2 + 4, 0], [bw / 2 - 4, 0]], INK_SOFT, 1.2);
            ctx.restore();
            // Tie-point matrix dots
            ctx.fillStyle = INK;
            const cols = kind === 'breadboard' ? 9 : 6;
            for (let c = 0; c < cols; c++) {
                const x = -bw / 2 + 9 + c * ((bw - 18) / (cols - 1));
                for (const y of [-10, -5, 5, 10]) {
                    ctx.fillRect(x - 1, y - 1, 2, 2);
                }
            }
        } else if (kind === 'battery' || kind === 'battery9v') {
            // IEEE Multi-cell DC Battery symbol (pure monochrome)
            const cells = kind === 'battery9v' ? 3 : 2;
            const span = cells * 12;
            line([[-38, 0], [-span / 2, 0]]);
            line([[span / 2, 0], [38, 0]]);
            for (let i = 0; i < cells; i++) {
                const xN = -span / 2 + i * 12;
                const xP = xN + 6;
                line([[xN, -8], [xN, 8]], INK, 3.0);
                line([[xP, -16], [xP, 16]], INK, 1.8);
                if (i < cells - 1) line([[xP, 0], [xP + 6, 0]], INK_SOFT, 1.4);
            }
            ctx.font = '800 10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = INK_SOFT; ctx.fillText('−', -30, -12);
            ctx.fillStyle = INK; ctx.fillText('+', 28, -12);
            dot(-38, 0); dot(38, 0);
        } else if (kind === 'psu') {
            // IEEE Adjustable DC Voltage Source circle + diagonal variable arrow (perfectly circular)
            line([[-48, 0], [-18, 0]]);
            line([[18, 0], [48, 0]]);
            ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2);
            ctx.fillStyle = INK_FILL; ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 1.9; ctx.stroke();
            ctx.font = '800 11px "JetBrains Mono", monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = INK; ctx.fillText('−  +', 0, 0.5);
            line([[-20, 20], [20, -20]], INK_SOFT, 1.7);
            line([[14, -20], [20, -20], [20, -14]], INK_SOFT, 1.7);
            dot(-48, 0); dot(48, 0);
        } else if (kind === 'resistor') {
            // IEEE 6-peak Zig-Zag Resistor symbol
            line([[-40, 0], [-24, 0], [-20, -9], [-12, 9], [-4, -9], [4, 9], [12, -9], [20, 9], [24, 0], [40, 0]], INK, 2.0);
            dot(-40, 0); dot(40, 0);
        } else if (kind === 'potentiometer') {
            // IEEE Potentiometer (Zig-Zag + Wiper Arrow)
            line([[-38, 6], [-22, 6], [-18, -2], [-10, 14], [-2, -2], [6, 14], [14, -2], [20, 6], [38, 6]], INK, 1.9);
            line([[0, -22], [0, -5]], INK, 2.0);
            line([[-5, -10], [0, -4], [5, -10]], INK, 2.0);
            dot(-38, 6); dot(38, 6); dot(0, -22);
        } else if (kind === 'pushbutton') {
            // IEEE Tactile Pushbutton Bridge Symbol
            line([[-38, 8], [-14, 8]]);
            line([[14, 8], [38, 8]]);
            dot(-14, 8); dot(14, 8);
            line([[-16, -2], [16, -2]], INK, 2.3);
            line([[0, -2], [0, -14]], INK, 1.9);
            line([[-9, -14], [9, -14]], INK, 2.3);
            dot(-38, 8); dot(38, 8);
        } else if (kind === 'spdt') {
            // IEEE SPDT 3-Terminal Throw Switch Symbol
            line([[-38, 0], [-14, 0]]);
            line([[14, -12], [38, -12]]);
            line([[14, 12], [38, 12]]);
            line([[-14, 0], [14, -12]], INK, 2.2);
            dot(-14, 0); dot(14, -12); dot(14, 12);
        } else if (kind === 'dip4') {
            // 4-Channel SPST Switch Bank Symbol (monochrome)
            rRect(ctx, -34, -22, 68, 44, 4);
            ctx.fillStyle = INK_FILL; ctx.fill();
            ctx.strokeStyle = INK_SOFT; ctx.lineWidth = 1.5; ctx.stroke();
            for (let i = 0; i < 4; i++) {
                const y = -13 + i * 8.8;
                line([[-24, y], [-7, y]], INK, 1.6);
                line([[7, y], [24, y]], INK, 1.6);
                line([[-7, y], [7, i % 2 === 0 ? y : y - 4.2]], INK, 1.9);
            }
        } else if (kind === 'lamp') {
            // IEEE LED Symbol (Diode Triangle + Cathode Bar + Light Arrows)
            line([[-38, 4], [-10, 4]]);
            line([[10, 4], [38, 4]]);
            ctx.beginPath();
            ctx.moveTo(-10, -8); ctx.lineTo(-10, 16); ctx.lineTo(10, 4); ctx.closePath();
            ctx.fillStyle = INK_FILL;
            ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 2.0; ctx.stroke();
            line([[10, -8], [10, 16]], INK, 2.3);
            line([[-2, -10], [6, -19]], INK_SOFT, 1.6);
            line([[2, -19], [6, -19], [6, -15]], INK_SOFT, 1.6);
            line([[7, -8], [15, -17]], INK_SOFT, 1.6);
            line([[11, -17], [15, -17], [15, -13]], INK_SOFT, 1.6);
            dot(-38, 4); dot(38, 4);
        } else if (kind === 'rgb_led') {
            // IEEE 3-Diode Common-Cathode RGB Symbol (monochrome)
            for (const dy of [-13, 0, 13]) {
                line([[-32, dy], [-8, dy]], INK, 1.6);
                ctx.beginPath(); ctx.moveTo(-8, dy - 4.5); ctx.lineTo(-8, dy + 4.5); ctx.lineTo(6, dy); ctx.closePath();
                ctx.fillStyle = INK_FILL; ctx.fill();
                ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
                line([[6, dy - 4.5], [6, dy + 4.5]], INK, 1.8);
                line([[6, dy], [22, dy]], INK_SOFT, 1.5);
            }
            line([[22, -13], [22, 13]], INK_SOFT, 1.7);
            line([[22, 0], [36, 0]], INK_SOFT, 1.7);
            dot(36, 0);
        } else if (kind === 'motor') {
            // IEEE DC Motor (M) Circle Symbol with Brush Blocks
            line([[-40, 0], [-20, 0]]);
            line([[20, 0], [40, 0]]);
            ctx.fillStyle = INK;
            ctx.fillRect(-20, -6, 5, 12);
            ctx.fillRect(15, -6, 5, 12);
            ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2);
            ctx.fillStyle = INK_FILL; ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 2.0; ctx.stroke();
            ctx.font = '800 15px "Inter", sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = INK; ctx.fillText('M', 0, 1);
            dot(-40, 0); dot(40, 0);
        } else if (kind === 'buzzer') {
            // IEEE Piezo Buzzer Hemispherical Symbol + Sound Waves
            line([[-10, 10], [-10, 22]]);
            line([[10, 10], [10, 22]]);
            ctx.beginPath(); ctx.arc(0, 10, 16, Math.PI, 0, false); ctx.closePath();
            ctx.fillStyle = INK_FILL; ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 1.9; ctx.stroke();
            for (const r of [20, 25]) {
                ctx.beginPath(); ctx.arc(0, 8, r, -Math.PI * 0.72, -Math.PI * 0.28);
                ctx.strokeStyle = INK_SOFT; ctx.lineWidth = 1.4; ctx.stroke();
            }
            dot(-10, 22); dot(10, 22);
        } else if (kind === 'npn') {
            // Authentic IEEE NPN BJT Symbol (pure monochrome)
            ctx.beginPath(); ctx.arc(2, 0, 18, 0, Math.PI * 2);
            ctx.fillStyle = INK_FILL; ctx.fill();
            ctx.strokeStyle = INK_SOFT; ctx.lineWidth = 1.4; ctx.stroke();
            line([[-34, 0], [-6, 0]], INK, 1.9);
            line([[-6, -11], [-6, 11]], INK, 2.8);
            line([[-6, -5], [14, -18], [14, -24]], INK, 1.9);
            line([[-6, 5], [14, 18], [14, 24]], INK, 1.9);
            // Emitter outward arrowhead
            ctx.beginPath();
            ctx.moveTo(12, 16.5); ctx.lineTo(4, 16); ctx.lineTo(8, 10); ctx.closePath();
            ctx.fillStyle = INK; ctx.fill();
            dot(-34, 0); dot(14, -24); dot(14, 24);
        } else if (kind === 'multimeter') {
            // IEEE Voltmeter / Multimeter Circle (V·A·Ω)
            line([[-38, 0], [-17, 0]]);
            line([[17, 0], [38, 0]]);
            ctx.beginPath(); ctx.arc(0, 0, 17, 0, Math.PI * 2);
            ctx.fillStyle = INK_FILL; ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 1.9; ctx.stroke();
            ctx.font = '800 10.5px "JetBrains Mono", monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = INK; ctx.fillText('V·A·Ω', 0, 0.5);
            dot(-38, 0); dot(38, 0);
        } else if (kind === 'seg7_10' || kind === 'seg7') {
            // 10-Pin 7-Segment IEEE Block Symbol with 5 top + 5 bottom pins (pure monochrome)
            rRect(ctx, -22, -18, 44, 36, 3);
            ctx.fillStyle = INK_FILL; ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
            for (const px of [-14, -7, 0, 7, 14]) {
                line([[px, -18], [px, -25]], INK_SOFT, 1.5);
                line([[px, 18], [px, 25]], INK_SOFT, 1.5);
            }
            ctx.font = '800 18px "JetBrains Mono", monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = INK; ctx.fillText('8.', 1, 1);
        } else {
            // Generic IEEE IC Block
            rRect(ctx, -22, -14, 44, 28, 3);
            ctx.fillStyle = INK_FILL; ctx.fill();
            ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
            ctx.font = '800 10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = INK; ctx.fillText(kind.toUpperCase(), 0, 0);
        }

        ctx.restore();
    }

    const exported = {
        ASSET_BASE,
        ASSET_MANIFEST,
        preloadAll,
        getImg,
        getStatus,
        drawFritzingBreadboard,
        drawFritzingLed,
        drawFritzingRgbLed,
        drawFritzingResistor,
        drawFritzingMotor,
        drawFritzingBattery9V,
        drawFritzingAAHolder,
        drawFritzingPushButton,
        drawFritzingSpdt,
        drawFritzingPotentiometer,
        drawFritzingBuzzer,
        drawFritzingNpn,
        drawFritzingSeg7TenPin,
        drawIEEESymbolPreview
    };

    root.FritzingRenderer = exported;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = exported;
    }
})(typeof window !== 'undefined' ? window : globalThis);

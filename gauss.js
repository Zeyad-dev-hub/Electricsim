// ============================================================
// Gauss's Law Explorer — Physics & Visualization Engine
// ============================================================

const canvas = document.getElementById('gaussCanvas');
const ctx = canvas.getContext('2d');
let width, height;

// ─── Constants ───────────────────────────────────────────────
const EPSILON_0 = 8.854187817e-12;       // C²/(N·m²)
const K_COULOMB = 8.9875517923e9;        // N·m²/C²

// ─── State ────────────────────────────────────────────────────
let state = {
    geometry: 'point',
    charge: 10.0,            // μC
    gaussRadius: 2.5,        // m
    cylinderLength: 4.0,     // m
    pillboxArea: 4.0,        // m²
    sphereRadius: 1.5,       // m
    showFieldLines: true,
    showFluxMarkers: true,
    showNormals: true,
    animateFlow: true,
    time: 0
};

// ─── Physics Calculations ─────────────────────────────────────
function solvePhysics() {
    const Q = state.charge * 1e-6; // convert μC to C
    const r = state.gaussRadius;
    const L = state.cylinderLength;
    const A_end = state.pillboxArea;
    const R = state.sphereRadius;

    let qEnclosed = 0;
    let surfaceArea = 0;
    let electricField = 0;
    let flux = 0;
    let fluxCheck = 0;

    switch (state.geometry) {
        case 'point':
            qEnclosed = Q;
            surfaceArea = 4 * Math.PI * r * r;
            electricField = K_COULOMB * Math.abs(qEnclosed) / (r * r);
            flux = electricField * surfaceArea * Math.sign(qEnclosed);
            fluxCheck = qEnclosed / EPSILON_0;
            break;

        case 'line':
            // Total charge Q corresponds to the charge of a 4.0m section (reference)
            // Linear charge density lambda = Q / 4.0
            const lambda = Q / 4.0;
            qEnclosed = lambda * L;
            surfaceArea = 2 * Math.PI * r * L; // only the curved side wall transfers flux
            electricField = (2 * K_COULOMB * Math.abs(lambda)) / r;
            flux = electricField * surfaceArea * Math.sign(qEnclosed);
            fluxCheck = qEnclosed / EPSILON_0;
            break;

        case 'plane':
            // Total charge Q corresponds to the charge of a 4.0m² area (reference)
            // Surface charge density sigma = Q / 4.0
            const sigma = Q / 4.0;
            qEnclosed = sigma * A_end;
            surfaceArea = 2 * A_end; // two caps of area A_end, side walls have zero flux
            electricField = Math.abs(sigma) / (2 * EPSILON_0);
            flux = electricField * surfaceArea * Math.sign(qEnclosed);
            fluxCheck = qEnclosed / EPSILON_0;
            break;

        case 'sphere_cond':
            if (r < R) {
                qEnclosed = 0; // charge is entirely on the outer surface (at r = R)
                electricField = 0;
                surfaceArea = 4 * Math.PI * r * r;
                flux = 0;
            } else {
                qEnclosed = Q;
                electricField = K_COULOMB * Math.abs(qEnclosed) / (r * r);
                surfaceArea = 4 * Math.PI * r * r;
                flux = electricField * surfaceArea * Math.sign(qEnclosed);
            }
            fluxCheck = qEnclosed / EPSILON_0;
            break;

        case 'sphere_solid':
            if (r < R) {
                // Uniformly distributed volume charge density
                // Q_enc = Q * (r/R)^3
                qEnclosed = Q * Math.pow(r / R, 3);
                electricField = K_COULOMB * Math.abs(Q) * r / Math.pow(R, 3);
                surfaceArea = 4 * Math.PI * r * r;
                flux = electricField * surfaceArea * Math.sign(Q);
            } else {
                qEnclosed = Q;
                electricField = K_COULOMB * Math.abs(qEnclosed) / (r * r);
                surfaceArea = 4 * Math.PI * r * r;
                flux = electricField * surfaceArea * Math.sign(qEnclosed);
            }
            fluxCheck = qEnclosed / EPSILON_0;
            break;
    }

    return {
        qEnclosed: qEnclosed * 1e6, // return in μC
        surfaceArea,
        electricField: electricField / 1000, // return in kN/C
        flux,
        fluxCheck
    };
}

// ─── UI Sync ──────────────────────────────────────────────────
const ui = {
    geometrySelect: document.getElementById('geometrySelect'),
    chargeSlider: document.getElementById('chargeSlider'),
    chargeVal: document.getElementById('chargeVal'),
    radiusSlider: document.getElementById('radiusSlider'),
    radiusVal: document.getElementById('radiusVal'),
    lengthSlider: document.getElementById('lengthSlider'),
    lengthVal: document.getElementById('lengthVal'),
    areaSlider: document.getElementById('areaSlider'),
    areaVal: document.getElementById('areaVal'),
    sphereRadiusSlider: document.getElementById('sphereRadiusSlider'),
    sphereRadiusVal: document.getElementById('sphereRadiusVal'),
    
    groupGaussRadius: document.getElementById('groupGaussRadius'),
    groupCylinderLength: document.getElementById('groupCylinderLength'),
    groupPillboxArea: document.getElementById('groupPillboxArea'),
    groupSphereRadius: document.getElementById('groupSphereRadius'),
    
    toggleFieldLines: document.getElementById('toggleFieldLines'),
    toggleFluxMarkers: document.getElementById('toggleFluxMarkers'),
    toggleNormals: document.getElementById('toggleNormals'),
    toggleAnimate: document.getElementById('toggleAnimate'),
    resetBtn: document.getElementById('resetBtn'),

    // HUD Elements
    gaussQenc: document.getElementById('gaussQenc'),
    gaussArea: document.getElementById('gaussArea'),
    gaussE: document.getElementById('gaussE'),
    gaussFlux: document.getElementById('gaussFlux'),
    gaussFluxCheck: document.getElementById('gaussFluxCheck'),
    gaussCheckStatus: document.getElementById('gaussCheckStatus'),

    // Formula Panel
    formulaPanel: document.getElementById('formulaPanel'),
    formulaTitle: document.getElementById('formulaTitle'),
    formulaText: document.getElementById('formulaText'),
    formulaCalculation: document.getElementById('formulaCalculation')
};

// Toggle inputs based on geometry
function updateVisibleControls() {
    const geo = state.geometry;
    ui.groupCylinderLength.style.display = (geo === 'line') ? 'flex' : 'none';
    ui.groupPillboxArea.style.display = (geo === 'plane') ? 'flex' : 'none';
    ui.groupSphereRadius.style.display = (geo === 'sphere_cond' || geo === 'sphere_solid') ? 'flex' : 'none';
}

function updateHUD(results) {
    ui.gaussQenc.textContent = `${results.qEnclosed.toFixed(3)} μC`;
    ui.gaussArea.textContent = `${results.surfaceArea.toFixed(2)} m²`;
    ui.gaussE.textContent = `${results.electricField.toFixed(2)} kN/C`;
    
    // Express flux in scientific notation: 1.23e6 style but beautifully formatted
    ui.gaussFlux.textContent = formatFlux(results.flux);
    ui.gaussFluxCheck.textContent = formatFlux(results.fluxCheck);
    
    // Check comparison (within float threshold)
    const diff = Math.abs(results.flux - results.fluxCheck);
    const maxVal = Math.max(Math.abs(results.flux), Math.abs(results.fluxCheck));
    if (maxVal === 0 || diff / maxVal < 0.001) {
        ui.gaussCheckStatus.textContent = '✓ Flux matches enclosed charge / ε₀';
        ui.gaussCheckStatus.style.color = '#37e0a1';
    } else {
        ui.gaussCheckStatus.textContent = '✗ Flux mismatch (numerical deviation)';
        ui.gaussCheckStatus.style.color = '#ff5a52';
    }
}

function formatFlux(value) {
    if (value === 0) return '0 N·m²/C';
    const sign = value < 0 ? '-' : '';
    const absVal = Math.abs(value);
    const exp = Math.floor(Math.log10(absVal));
    const base = absVal / Math.pow(10, exp);
    return `${sign}${base.toFixed(2)} × 10⁶ N·m²/C`;
}

function updateFormulaCard(results) {
    const Q = state.charge;
    const r = state.gaussRadius;
    const R = state.sphereRadius;
    const L = state.cylinderLength;
    const A = state.pillboxArea;

    let titleText = '';
    let formulaText = '';
    let calcText = '';

    switch (state.geometry) {
        case 'point':
            titleText = 'Point Charge Rule';
            formulaText = 'E = Q_enc / (4πε₀r²)';
            calcText = `E = ${Math.abs(Q).toFixed(1)} μC / (4π · ε₀ · (${r.toFixed(1)} m)²)\nE = ${results.electricField.toFixed(2)} kN/C`;
            break;
        case 'line':
            const lambda = Q / 4.0;
            titleText = 'Infinite Line Charge Rule';
            formulaText = 'E = λ / (2πε₀r)   [λ = Q_enc / L]';
            calcText = `λ = ${lambda.toFixed(2)} μC/m\nE = ${Math.abs(lambda).toFixed(2)} μC/m / (2π · ε₀ · ${r.toFixed(1)} m)\nE = ${results.electricField.toFixed(2)} kN/C`;
            break;
        case 'plane':
            const sigma = Q / 4.0;
            titleText = 'Infinite Plane Charge Rule';
            formulaText = 'E = σ / (2ε₀)   [σ = Q_enc / A]';
            calcText = `σ = ${sigma.toFixed(2)} μC/m²\nE = ${Math.abs(sigma).toFixed(2)} μC/m² / (2 · ε₀)\nE = ${results.electricField.toFixed(2)} kN/C (Constant field)`;
            break;
        case 'sphere_cond':
            titleText = 'Conducting Sphere Rule';
            if (r < R) {
                formulaText = 'Inside: E = 0';
                calcText = `r = ${r.toFixed(1)} m  <  R = ${R.toFixed(1)} m\nCharges reside entirely on the outer surface (at R).\nE = 0 kN/C`;
            } else {
                formulaText = 'Outside: E = Q_enc / (4πε₀r²)';
                calcText = `r = ${r.toFixed(1)} m  ≥  R = ${R.toFixed(1)} m\nE = ${Math.abs(Q).toFixed(1)} μC / (4π · ε₀ · (${r.toFixed(1)} m)²)\nE = ${results.electricField.toFixed(2)} kN/C`;
            }
            break;
        case 'sphere_solid':
            titleText = 'Solid Non-Conducting Sphere';
            if (r < R) {
                formulaText = 'Inside: E = Q · r / (4πε₀R³)';
                calcText = `r = ${r.toFixed(1)} m  <  R = ${R.toFixed(1)} m\nE = (${Math.abs(Q).toFixed(1)} μC · ${r.toFixed(1)} m) / (4π · ε₀ · (${R.toFixed(1)} m)³)\nE = ${results.electricField.toFixed(2)} kN/C`;
            } else {
                formulaText = 'Outside: E = Q_enc / (4πε₀r²)';
                calcText = `r = ${r.toFixed(1)} m  ≥  R = ${R.toFixed(1)} m\nE = ${Math.abs(Q).toFixed(1)} μC / (4π · ε₀ · (${r.toFixed(1)} m)²)\nE = ${results.electricField.toFixed(2)} kN/C`;
            }
            break;
    }

    ui.formulaTitle.textContent = titleText;
    ui.formulaText.textContent = formulaText;
    ui.formulaCalculation.textContent = calcText;
}

// ─── Resize Handler ───────────────────────────────────────────
function resize() {
    const container = canvas.parentElement;
    width = canvas.width = container.clientWidth;
    height = canvas.height = container.clientHeight;
}
window.addEventListener('resize', resize);

// ─── Setup Event Listeners ────────────────────────────────────
ui.geometrySelect.addEventListener('change', e => {
    state.geometry = e.target.value;
    updateVisibleControls();
    triggerSync();
});

ui.chargeSlider.addEventListener('input', e => {
    state.charge = parseFloat(e.target.value);
    ui.chargeVal.textContent = `${state.charge.toFixed(1)} μC`;
    triggerSync();
});

ui.radiusSlider.addEventListener('input', e => {
    state.gaussRadius = parseFloat(e.target.value);
    ui.radiusVal.textContent = `${state.gaussRadius.toFixed(1)} m`;
    triggerSync();
});

ui.lengthSlider.addEventListener('input', e => {
    state.cylinderLength = parseFloat(e.target.value);
    ui.lengthVal.textContent = `${state.cylinderLength.toFixed(1)} m`;
    triggerSync();
});

ui.areaSlider.addEventListener('input', e => {
    state.pillboxArea = parseFloat(e.target.value);
    ui.areaVal.textContent = `${state.pillboxArea.toFixed(1)} m²`;
    triggerSync();
});

ui.sphereRadiusSlider.addEventListener('input', e => {
    state.sphereRadius = parseFloat(e.target.value);
    ui.sphereRadiusVal.textContent = `${state.sphereRadius.toFixed(1)} m`;
    triggerSync();
});

// Checkboxes
ui.toggleFieldLines.addEventListener('change', e => { state.showFieldLines = e.target.checked; });
ui.toggleFluxMarkers.addEventListener('change', e => { state.showFluxMarkers = e.target.checked; });
ui.toggleNormals.addEventListener('change', e => { state.showNormals = e.target.checked; });
ui.toggleAnimate.addEventListener('change', e => { state.animateFlow = e.target.checked; });

// Reset Button
ui.resetBtn.addEventListener('click', () => {
    state.geometry = 'point';
    state.charge = 10.0;
    state.gaussRadius = 2.5;
    state.cylinderLength = 4.0;
    state.pillboxArea = 4.0;
    state.sphereRadius = 1.5;
    state.showFieldLines = true;
    state.showFluxMarkers = true;
    state.showNormals = true;
    state.animateFlow = true;

    ui.geometrySelect.value = 'point';
    ui.chargeSlider.value = 10;
    ui.chargeVal.textContent = '10.0 μC';
    ui.radiusSlider.value = 2.5;
    ui.radiusVal.textContent = '2.5 m';
    ui.lengthSlider.value = 4.0;
    ui.lengthVal.textContent = '4.0 m';
    ui.areaSlider.value = 4.0;
    ui.areaVal.textContent = '4.0 m²';
    ui.sphereRadiusSlider.value = 1.5;
    ui.sphereRadiusVal.textContent = '1.5 m';
    
    ui.toggleFieldLines.checked = true;
    ui.toggleFluxMarkers.checked = true;
    ui.toggleNormals.checked = true;
    ui.toggleAnimate.checked = true;

    updateVisibleControls();
    triggerSync();
});

function triggerSync() {
    const results = solvePhysics();
    updateHUD(results);
    updateFormulaCard(results);
}

// ─── Rendering Helper Utilities ──────────────────────────────
function adjustAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Draw elegant vector arrow
function drawArrow(x1, y1, x2, y2, color, width = 1.5, size = 6) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
}

// Draw dashed/dotted ellipse (useful for wireframe 3D spheres/cylinders)
function drawWireframeEllipse(cx, cy, rx, ry, dash = [5, 5], color = 'rgba(55, 224, 161, 0.4)') {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

// ═══════════════════════════════════════════════════════════════
// ─── PHYSICS GRAPHICS RENDERING ───────────────────────────────
// ═══════════════════════════════════════════════════════════════

function renderLoop() {
    if (state.animateFlow) {
        state.time += 0.007;
    }

    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height * 0.48; // slightly offset from center to leave room for bottom cards
    const scale = Math.min(width, height) * 0.082; // pixels per meter

    // Draw the active physics scene
    drawScene(centerX, centerY, scale);

    requestAnimationFrame(renderLoop);
}

function drawScene(cx, cy, scale) {
    const geo = state.geometry;
    const r_px = state.gaussRadius * scale;
    const R_px = state.sphereRadius * scale;
    const L_px = state.cylinderLength * scale;
    const Q = state.charge;

    const colorCharge = Q >= 0 ? '#ff5a52' : '#38a3ff'; // Red or Blue
    const colorGauss = '#37e0a1'; // Emerald Green
    const colorFlux = '#3dd9ff';  // Cyan

    // Sleek, professional electric field colors (ice blue / white)
    const colorFieldPath = 'rgba(224, 242, 254, 0.12)';       // Faint ice blue for paths
    const colorFieldParticle = 'rgba(255, 255, 255, 0.85)';    // Bright white for flowing particles
    const colorFieldVector = 'rgba(224, 242, 254, 0.88)';      // Clear ice blue for E-field vector arrows

    // ─── Step 1: Draw Charge Geometry Underneath ──────────────────
    switch (geo) {
        case 'point':
            // Glowing core
            const pGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 14);
            pGrad.addColorStop(0, '#ffffff');
            pGrad.addColorStop(0.3, colorCharge);
            pGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = pGrad;
            ctx.beginPath();
            ctx.arc(cx, cy, 14, 0, Math.PI * 2);
            ctx.fill();

            // Label text inside
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(Q >= 0 ? '+' : '−', cx, cy);
            break;

        case 'line':
            // Vertical charged rod
            const rodW = 10;
            ctx.save();
            // Outer glow
            ctx.shadowColor = colorCharge;
            ctx.shadowBlur = 12;
            const rodGrad = ctx.createLinearGradient(cx - rodW/2, 0, cx + rodW/2, 0);
            rodGrad.addColorStop(0, adjustAlpha(colorCharge, 0.9));
            rodGrad.addColorStop(0.5, '#ffffff');
            rodGrad.addColorStop(1, adjustAlpha(colorCharge, 0.9));
            ctx.fillStyle = rodGrad;
            ctx.beginPath();
            ctx.rect(cx - rodW/2, 0, rodW, height);
            ctx.fill();
            ctx.restore();

            // Plus/minus signs along the line
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = 'bold 9px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const signCount = Math.floor(height / 45);
            for (let i = 0; i < signCount; i++) {
                const sy = 25 + i * 45;
                // Don't draw too close to center where label is
                if (Math.abs(sy - cy) > 20) {
                    ctx.fillText(Q >= 0 ? '+' : '−', cx, sy);
                }
            }
            break;

        case 'plane':
            // Horizontal plane tilted in perspective (crosses at center Y)
            const planeH = 6;
            ctx.save();
            ctx.shadowColor = colorCharge;
            ctx.shadowBlur = 8;
            ctx.fillStyle = adjustAlpha(colorCharge, 0.2);
            ctx.strokeStyle = adjustAlpha(colorCharge, 0.6);
            ctx.lineWidth = 1;
            
            // Perspective parallelogram
            ctx.beginPath();
            ctx.moveTo(cx - 320, cy + 40);
            ctx.lineTo(cx + 280, cy + 40);
            ctx.lineTo(cx + 320, cy - 40);
            ctx.lineTo(cx - 280, cy - 40);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();

            // Draw grid lines on the plane for depth
            ctx.strokeStyle = adjustAlpha(colorCharge, 0.15);
            ctx.lineWidth = 0.5;
            for (let i = -5; i <= 5; i++) {
                const frac = i / 5;
                // horizontal slices
                ctx.beginPath();
                ctx.moveTo(cx - 300 + frac * 20, cy + frac * 40);
                ctx.lineTo(cx + 300 + frac * 20, cy + frac * 40);
                ctx.stroke();
            }
            
            // Plus/minus signs on plane
            ctx.fillStyle = adjustAlpha(colorCharge, 0.7);
            ctx.font = 'bold 8px Inter, sans-serif';
            ctx.fillText(Q >= 0 ? '++++++++++++' : '------------', cx, cy - 6);
            break;

        case 'sphere_cond':
        case 'sphere_solid':
            // Draw physical sphere
            ctx.save();
            
            if (geo === 'sphere_cond') {
                // Conducting sphere has charge only on surface
                ctx.strokeStyle = adjustAlpha(colorCharge, 0.8);
                ctx.lineWidth = 2.5;
                // Glow
                ctx.shadowColor = colorCharge;
                ctx.shadowBlur = 10;
                ctx.fillStyle = 'rgba(255,255,255,0.02)';
                ctx.beginPath();
                ctx.arc(cx, cy, R_px, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();

                // Surface charge signs
                ctx.fillStyle = colorCharge;
                ctx.font = 'bold 9px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const count = 12;
                for (let i = 0; i < count; i++) {
                    const angle = (i / count) * Math.PI * 2;
                    const sx = cx + Math.cos(angle) * (R_px + 7);
                    const sy = cy + Math.sin(angle) * (R_px + 7);
                    ctx.fillText(Q >= 0 ? '+' : '−', sx, sy);
                }
            } else {
                // Non-conducting sphere has charge distributed throughout volume
                const sGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, R_px);
                sGrad.addColorStop(0, adjustAlpha(colorCharge, 0.45));
                sGrad.addColorStop(0.7, adjustAlpha(colorCharge, 0.22));
                sGrad.addColorStop(1, adjustAlpha(colorCharge, 0.12));
                ctx.fillStyle = sGrad;
                ctx.strokeStyle = adjustAlpha(colorCharge, 0.5);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(cx, cy, R_px, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                ctx.restore();

                // Volume charge signs distributed in concentric rings
                ctx.fillStyle = adjustAlpha(colorCharge, 0.5);
                ctx.font = 'bold 8px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const rings = [
                    { r: R_px * 0.3, count: 4 },
                    { r: R_px * 0.65, count: 8 }
                ];
                rings.forEach(ring => {
                    for (let i = 0; i < ring.count; i++) {
                        const angle = (i / ring.count) * Math.PI * 2 + (ring.r * 0.1);
                        const sx = cx + Math.cos(angle) * ring.r;
                        const sy = cy + Math.sin(angle) * ring.r;
                        ctx.fillText(Q >= 0 ? '+' : '−', sx, sy);
                    }
                });
                ctx.fillText(Q >= 0 ? '+' : '−', cx, cy); // center sign
            }

            // Draw sphere wireframe lines for depth
            drawWireframeEllipse(cx, cy, R_px, R_px * 0.35, [3, 4], adjustAlpha(colorCharge, 0.15));
            drawWireframeEllipse(cx, cy, R_px * 0.35, R_px, [3, 4], adjustAlpha(colorCharge, 0.15));

            // Physical radius R dimension line
            drawArrow(cx, cy, cx + R_px * Math.cos(Math.PI / 4), cy + R_px * Math.sin(Math.PI / 4), 'rgba(255,255,255,0.25)', 1, 4);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '500 9px SF Mono, monospace';
            ctx.fillText('R', cx + (R_px/2) * Math.cos(Math.PI / 4) + 8, cy + (R_px/2) * Math.sin(Math.PI / 4) + 2);
            break;
    }

    // ─── Step 2: Draw Gaussian Surface Wireframe (Semi-transparent) ───
    ctx.save();
    // Subtle breathing animation for Gaussian surface
    const breathing = Math.sin(state.time * 2) * 0.012;
    const current_r_px = r_px * (1 + (state.animateFlow ? breathing : 0));

    ctx.fillStyle = 'rgba(55, 224, 161, 0.04)';
    ctx.strokeStyle = colorGauss;
    ctx.lineWidth = 1.8;

    switch (geo) {
        case 'point':
        case 'sphere_cond':
        case 'sphere_solid':
            // Draw outer sphere circle
            ctx.beginPath();
            ctx.arc(cx, cy, current_r_px, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw 3D wireframe rings (latitude/longitude)
            drawWireframeEllipse(cx, cy, current_r_px, current_r_px * 0.38, [4, 4], adjustAlpha(colorGauss, 0.35));
            drawWireframeEllipse(cx, cy, current_r_px * 0.38, current_r_px, [4, 4], adjustAlpha(colorGauss, 0.35));
            break;

        case 'line':
            // Gaussian Cylinder
            const capRx = current_r_px;
            const capRy = current_r_px * 0.28;
            const topY = cy - L_px / 2;
            const botY = cy + L_px / 2;

            // Draw barrel body
            ctx.beginPath();
            ctx.moveTo(cx - capRx, topY);
            ctx.lineTo(cx + capRx, topY);
            ctx.lineTo(cx + capRx, botY);
            ctx.lineTo(cx - capRx, botY);
            ctx.closePath();
            ctx.fill();

            // Draw curved sides & caps outline
            ctx.beginPath();
            ctx.moveTo(cx - capRx, topY);
            ctx.lineTo(cx - capRx, botY);
            ctx.moveTo(cx + capRx, topY);
            ctx.lineTo(cx + capRx, botY);
            ctx.stroke();

            // Top Cap Ellipse
            ctx.beginPath();
            ctx.ellipse(cx, topY, capRx, capRy, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Bottom Cap Ellipse
            ctx.beginPath();
            ctx.ellipse(cx, botY, capRx, capRy, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Intermediate dashed ellipses to show body volume
            drawWireframeEllipse(cx, cy, capRx, capRy, [4, 4], adjustAlpha(colorGauss, 0.3));
            break;

        case 'plane':
            // Gaussian Pillbox cylinder vertical
            // Ends have area A_end, so end cap radius depends on A_end
            const endRx = Math.sqrt(state.pillboxArea / Math.PI) * scale;
            const endRy = endRx * 0.28;
            // The cylinder extends to distance r above and below the horizontal plane
            const pTopY = cy - r_px;
            const pBotY = cy + r_px;

            // Barrel body fill
            ctx.beginPath();
            ctx.moveTo(cx - endRx, pTopY);
            ctx.lineTo(cx + endRx, pTopY);
            ctx.lineTo(cx + endRx, pBotY);
            ctx.lineTo(cx - endRx, pBotY);
            ctx.closePath();
            ctx.fill();

            // Side walls outline
            ctx.beginPath();
            ctx.moveTo(cx - endRx, pTopY);
            ctx.lineTo(cx - endRx, pBotY);
            ctx.moveTo(cx + endRx, pTopY);
            ctx.lineTo(cx + endRx, pBotY);
            ctx.stroke();

            // Top Cap Ellipse
            ctx.beginPath();
            ctx.ellipse(cx, pTopY, endRx, endRy, 0, 0, Math.PI * 2);
            ctx.stroke();

            // Bottom Cap Ellipse
            ctx.beginPath();
            ctx.ellipse(cx, pBotY, endRx, endRy, 0, 0, Math.PI * 2);
            ctx.stroke();
            break;
    }
    ctx.restore();

    // ─── Step 3: Draw Field Lines with Flowing Arrows ──────────────
    if (!state.showFieldLines || Q === 0) return;

    const direction = Q >= 0 ? 1 : -1; // +1 outward, -1 inward
    const arrowSize = 5;               // arrowhead triangle size
    const arrowSpacing = 55;           // px between consecutive arrows on a line
    const animSpeed = 80;              // px/second equivalent

    // Helper: draw a single arrowhead chevron at (x, y) pointing in direction (dx, dy)
    function drawChevron(x, y, dx, dy, alpha) {
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        const nx = dx / len, ny = dy / len;
        const s = arrowSize;

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.moveTo(x + nx * s, y + ny * s);
        ctx.lineTo(x - nx * s * 0.5 + ny * s * 0.55, y - ny * s * 0.5 - nx * s * 0.55);
        ctx.lineTo(x - nx * s * 0.5 - ny * s * 0.55, y - ny * s * 0.5 + nx * s * 0.55);
        ctx.closePath();
        ctx.fill();
    }

    switch (geo) {
        case 'point':
        case 'sphere_cond':
        case 'sphere_solid': {
            // Dynamic line count based on charge
            const lineCount = Math.min(20, Math.max(8, Math.round(Math.abs(Q) * 0.7) + 6));

            // Start radius: outside the conducting sphere shell, from center for solid/point
            const fieldStart = (geo === 'sphere_cond') ? R_px + 2 : ((geo === 'sphere_solid') ? 2 : 6);
            // How far field lines extend beyond the Gaussian surface
            const fieldEnd = current_r_px + Math.min(width, height) * 0.28;

            for (let i = 0; i < lineCount; i++) {
                const angle = (i / lineCount) * Math.PI * 2;
                const cos_a = Math.cos(angle);
                const sin_a = Math.sin(angle);

                // Inside conducting sphere: no field lines at all
                if (geo === 'sphere_cond') {
                    // Draw line from just outside conductor to fieldEnd
                    const x1 = cx + cos_a * fieldStart;
                    const y1 = cy + sin_a * fieldStart;
                    const x2 = cx + cos_a * fieldEnd;
                    const y2 = cy + sin_a * fieldEnd;

                    // Subtle path line
                    ctx.strokeStyle = colorFieldPath;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                } else if (geo === 'sphere_solid') {
                    // Field exists everywhere (including inside)
                    const x1 = cx + cos_a * 2;
                    const y1 = cy + sin_a * 2;
                    const x2 = cx + cos_a * fieldEnd;
                    const y2 = cy + sin_a * fieldEnd;

                    ctx.strokeStyle = colorFieldPath;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                } else {
                    // Point charge: from center out
                    const x1 = cx + cos_a * fieldStart;
                    const y1 = cy + sin_a * fieldStart;
                    const x2 = cx + cos_a * fieldEnd;
                    const y2 = cy + sin_a * fieldEnd;

                    ctx.strokeStyle = colorFieldPath;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }

                // Animated flowing arrowheads along the line
                if (state.animateFlow) {
                    const totalLength = fieldEnd - fieldStart;
                    const arrowCount = Math.max(2, Math.floor(totalLength / arrowSpacing));
                    const animOffset = (state.time * animSpeed) % arrowSpacing;

                    for (let a = 0; a < arrowCount; a++) {
                        let dist;
                        if (direction > 0) {
                            // Outward flow
                            dist = fieldStart + animOffset + a * arrowSpacing;
                        } else {
                            // Inward flow
                            dist = fieldEnd - animOffset - a * arrowSpacing;
                        }

                        if (dist < fieldStart || dist > fieldEnd) continue;

                        // Skip if inside conductor
                        if (geo === 'sphere_cond' && dist < R_px) continue;

                        const ax = cx + cos_a * dist;
                        const ay = cy + sin_a * dist;

                        // Fade near endpoints
                        const t = (dist - fieldStart) / totalLength;
                        const alpha = Math.min(1, Math.min(t * 5, (1 - t) * 5)) * 0.85;

                        drawChevron(ax, ay, cos_a * direction, sin_a * direction, alpha);
                    }
                }

                // Intersection glow and vectors at Gaussian surface
                let intersects = true;
                if (geo === 'sphere_cond' && r_px < R_px) intersects = false;

                if (intersects) {
                    const ix = cx + cos_a * current_r_px;
                    const iy = cy + sin_a * current_r_px;

                    if (state.showFluxMarkers) {
                        ctx.fillStyle = colorFlux;
                        ctx.shadowColor = colorFlux;
                        ctx.shadowBlur = 6;
                        ctx.beginPath();
                        ctx.arc(ix, iy, 3.5, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.shadowBlur = 0;
                    }

                    const vecScale = 20;
                    if (state.showNormals) {
                        drawArrow(ix, iy, ix + cos_a * vecScale, iy + sin_a * vecScale, colorGauss, 1.5, 5);
                    }

                    const eSign = Q >= 0 ? 1 : -1;
                    let eMag = vecScale;
                    if (geo === 'sphere_solid' && current_r_px < R_px) {
                        eMag = vecScale * (current_r_px / R_px);
                    }
                    drawArrow(ix, iy, ix + cos_a * eMag * eSign, iy + sin_a * eMag * eSign, colorFieldVector, 1.5, 5);
                }
            }
            break;
        }

        case 'line': {
            // Field lines ONLY within the Gaussian cylinder region
            const topY_cyl = cy - L_px / 2;
            const botY_cyl = cy + L_px / 2;

            // Dynamic count proportional to charge (3–12 lines, evenly spaced within the cylinder)
            const lineCountCyl = Math.min(12, Math.max(3, Math.round(Math.abs(Q) * 0.5) + 3));
            const cylHeight = botY_cyl - topY_cyl;
            const yStep = cylHeight / (lineCountCyl + 1);

            // How far the lines extend beyond the cylinder wall
            const fieldExtend = Math.min(width * 0.3, 200);

            ctx.save();
            for (let i = 1; i <= lineCountCyl; i++) {
                const ly = topY_cyl + i * yStep;

                // Left line: from rod (cx) to cx - r_px - fieldExtend
                const leftEnd = cx - current_r_px - fieldExtend;
                const rightEnd = cx + current_r_px + fieldExtend;

                // Draw subtle path lines
                ctx.strokeStyle = colorFieldPath;
                ctx.lineWidth = 1;

                // Left path
                ctx.beginPath();
                ctx.moveTo(cx - 8, ly); // start just outside rod
                ctx.lineTo(leftEnd, ly);
                ctx.stroke();

                // Right path
                ctx.beginPath();
                ctx.moveTo(cx + 8, ly);
                ctx.lineTo(rightEnd, ly);
                ctx.stroke();

                // Flowing arrowheads — LEFT side
                if (state.animateFlow) {
                    const totalLen = current_r_px + fieldExtend - 8;
                    const arrowCount = Math.max(2, Math.floor(totalLen / arrowSpacing));
                    const animOffset = (state.time * animSpeed) % arrowSpacing;

                    for (let a = 0; a < arrowCount; a++) {
                        let dist;
                        if (direction > 0) {
                            dist = 8 + animOffset + a * arrowSpacing; // outward from rod
                        } else {
                            dist = totalLen + 8 - animOffset - a * arrowSpacing;
                        }
                        if (dist < 8 || dist > totalLen + 8) continue;

                        const t = (dist - 8) / totalLen;
                        const alpha = Math.min(1, Math.min(t * 4, (1 - t) * 4)) * 0.85;

                        // Left side arrow (pointing left for positive)
                        drawChevron(cx - dist, ly, -direction, 0, alpha);
                        // Right side arrow (pointing right for positive)
                        drawChevron(cx + dist, ly, direction, 0, alpha);
                    }
                }

                // Intersection markers at the cylinder walls
                const ix_left = cx - current_r_px;
                const ix_right = cx + current_r_px;

                if (state.showFluxMarkers) {
                    ctx.fillStyle = colorFlux;
                    ctx.shadowColor = colorFlux;
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(ix_left, ly, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(ix_right, ly, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                const vecScale = 20;
                const eSign = Q >= 0 ? 1 : -1;

                if (state.showNormals) {
                    drawArrow(ix_left, ly, ix_left - vecScale, ly, colorGauss, 1.5, 5);
                    drawArrow(ix_right, ly, ix_right + vecScale, ly, colorGauss, 1.5, 5);
                }

                drawArrow(ix_left, ly, ix_left - vecScale * eSign, ly, colorFieldVector, 1.5, 5);
                drawArrow(ix_right, ly, ix_right + vecScale * eSign, ly, colorFieldVector, 1.5, 5);
            }
            ctx.restore();
            break;
        }

        case 'plane': {
            // Field lines only within/near the Gaussian pillbox region
            const endRx_plane = Math.sqrt(state.pillboxArea / Math.PI) * scale;

            // Dynamic count proportional to charge (3–10 lines within pillbox width)
            const lineCountPlane = Math.min(10, Math.max(3, Math.round(Math.abs(Q) * 0.4) + 3));
            const xStep = (endRx_plane * 2) / (lineCountPlane + 1);

            // How far lines extend beyond the pillbox caps
            const fieldExtendY = Math.min(height * 0.25, 180);

            ctx.save();
            for (let i = 1; i <= lineCountPlane; i++) {
                const px = (cx - endRx_plane) + i * xStep;

                const topEnd = cy - current_r_px - fieldExtendY;
                const botEnd = cy + current_r_px + fieldExtendY;

                // Draw subtle path lines
                ctx.strokeStyle = colorFieldPath;
                ctx.lineWidth = 1;

                // Upward from plane
                ctx.beginPath();
                ctx.moveTo(px, cy - 4);
                ctx.lineTo(px, topEnd);
                ctx.stroke();

                // Downward from plane
                ctx.beginPath();
                ctx.moveTo(px, cy + 4);
                ctx.lineTo(px, botEnd);
                ctx.stroke();

                // Flowing arrowheads — UP side
                if (state.animateFlow) {
                    const totalLen = current_r_px + fieldExtendY - 4;
                    const arrowCount = Math.max(2, Math.floor(totalLen / arrowSpacing));
                    const animOffset = (state.time * animSpeed) % arrowSpacing;

                    for (let a = 0; a < arrowCount; a++) {
                        let dist;
                        if (direction > 0) {
                            dist = 4 + animOffset + a * arrowSpacing;
                        } else {
                            dist = totalLen + 4 - animOffset - a * arrowSpacing;
                        }
                        if (dist < 4 || dist > totalLen + 4) continue;

                        const t = (dist - 4) / totalLen;
                        const alpha = Math.min(1, Math.min(t * 4, (1 - t) * 4)) * 0.85;

                        // Up arrow (pointing up for positive)
                        drawChevron(px, cy - dist, 0, -direction, alpha);
                        // Down arrow (pointing down for positive)
                        drawChevron(px, cy + dist, 0, direction, alpha);
                    }
                }

                // Intersection markers at the pillbox caps
                const iy_top = cy - current_r_px;
                const iy_bot = cy + current_r_px;

                if (state.showFluxMarkers) {
                    ctx.fillStyle = colorFlux;
                    ctx.shadowColor = colorFlux;
                    ctx.shadowBlur = 6;
                    ctx.beginPath();
                    ctx.arc(px, iy_top, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.beginPath();
                    ctx.arc(px, iy_bot, 3.5, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.shadowBlur = 0;
                }

                const vecScale = 20;
                const eSign = Q >= 0 ? 1 : -1;

                if (state.showNormals) {
                    drawArrow(px, iy_top, px, iy_top - vecScale, colorGauss, 1.5, 5);
                    drawArrow(px, iy_bot, px, iy_bot + vecScale, colorGauss, 1.5, 5);
                }

                drawArrow(px, iy_top, px, iy_top - vecScale * eSign, colorFieldVector, 1.5, 5);
                drawArrow(px, iy_bot, px, iy_bot + vecScale * eSign, colorFieldVector, 1.5, 5);
            }
            ctx.restore();
            break;
        }
    }
}

// ─── Init ─────────────────────────────────────────────────────
resize();
updateVisibleControls();
triggerSync();
requestAnimationFrame(renderLoop);

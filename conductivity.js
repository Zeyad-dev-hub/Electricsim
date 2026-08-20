// ============================================================
// Conductivity & Resistivity — Drude Model Physics Explorer
// ============================================================

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
let width, height;

// ─── Material Database ────────────────────────────────────────
const MATERIALS = {
    cu:  { name: 'Copper',     rho0: 1.68e-8,  alpha: 0.00386,  n: 8.5e28,  color: '#d4875e', lattice: '#b87333' },
    al:  { name: 'Aluminum',   rho0: 2.82e-8,  alpha: 0.00390,  n: 6.0e28,  color: '#b0b3b6', lattice: '#8a8d90' },
    au:  { name: 'Gold',       rho0: 2.44e-8,  alpha: 0.00340,  n: 5.9e28,  color: '#e8c94a', lattice: '#c9a832' },
    fe:  { name: 'Iron',       rho0: 9.71e-8,  alpha: 0.00500,  n: 1.7e29,  color: '#808488', lattice: '#606468' },
    c:   { name: 'Carbon',     rho0: 3.50e-5,  alpha: -0.00050, n: 1.0e29,  color: '#505050', lattice: '#383838' },
    con: { name: 'Constantan', rho0: 4.90e-7,  alpha: 0.00001,  n: 3.4e28,  color: '#a08060', lattice: '#806040' }
};

// ─── State ────────────────────────────────────────────────────
let currentMaterial = 'cu';
let lengthM = 1.0;
let areaMM2 = 1.0;
let tempC = 20;
let voltage = 5.0;

let rhoT = 0, resistance = 0, current = 0, driftVelocity = 0;
const E_CHARGE = 1.602e-19;

// ─── Simulation Particles ─────────────────────────────────────
let atoms = [];
let electrons = [];
const ELECTRON_COUNT = 120;
const ATOM_RADIUS = 6;
const ELECTRON_RADIUS = 3.5;
let wire = { x: 0, y: 0, w: 0, h: 0 };

// Sprite caches (offscreen canvases)
let atomSprite = null;
let electronSprite = null;
let electronGlowSprite = null;
let currentSpriteMatKey = '';

// Spatial hash grid for fast collision lookup
let spatialGrid = {};
const GRID_CELL_SIZE = 30; // px

// ─── Resize ───────────────────────────────────────────────────
function resize() {
    const container = canvas.parentElement;
    width = canvas.width = container.clientWidth;
    height = canvas.height = container.clientHeight;
    computeWireBounds();
    generateAtomLattice();
    initElectrons();
}
window.addEventListener('resize', resize);

function computeWireBounds() {
    const lenFrac = 0.30 + (lengthM / 10) * 0.55;
    const areaFrac = 0.15 + (areaMM2 / 5) * 0.40;
    const wW = width * lenFrac;
    const wH = height * areaFrac;
    wire.x = (width - wW) / 2;
    wire.y = (height - wH) / 2;
    wire.w = wW;
    wire.h = wH;
}

// ─── Atom Lattice ─────────────────────────────────────────────
function generateAtomLattice() {
    atoms = [];
    const spacing = ATOM_RADIUS * 4.5;
    const cols = Math.floor(wire.w / spacing);
    const rows = Math.floor(wire.h / spacing);
    const offsetX = wire.x + (wire.w - (cols - 1) * spacing) / 2;
    const offsetY = wire.y + (wire.h - (rows - 1) * spacing) / 2;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            atoms.push({
                baseX: offsetX + c * spacing,
                baseY: offsetY + r * spacing,
                x: offsetX + c * spacing,
                y: offsetY + r * spacing,
                phase: Math.random() * Math.PI * 2,
                freq: 0.8 + Math.random() * 1.5,
                orbitalPhase: Math.random() * Math.PI * 2
            });
        }
    }
    rebuildSpatialGrid();
    rebuildAtomSprite();
    rebuildElectronSprites();
}

// ─── Spatial Hash Grid ────────────────────────────────────────
function cellKey(cx, cy) { return `${cx},${cy}`; }

function rebuildSpatialGrid() {
    spatialGrid = {};
    // Use BASE positions (static) so we don't rebuild every frame
    for (const atom of atoms) {
        const cx = Math.floor(atom.baseX / GRID_CELL_SIZE);
        const cy = Math.floor(atom.baseY / GRID_CELL_SIZE);
        const key = cellKey(cx, cy);
        if (!spatialGrid[key]) spatialGrid[key] = [];
        spatialGrid[key].push(atom);
    }
}

function getNearbyAtoms(x, y) {
    const cx = Math.floor(x / GRID_CELL_SIZE);
    const cy = Math.floor(y / GRID_CELL_SIZE);
    const nearby = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const key = cellKey(cx + dx, cy + dy);
            if (spatialGrid[key]) {
                for (const a of spatialGrid[key]) nearby.push(a);
            }
        }
    }
    return nearby;
}

// ─── Sprite Caching ───────────────────────────────────────────
function rebuildAtomSprite() {
    const mat = MATERIALS[currentMaterial];
    if (currentSpriteMatKey === currentMaterial && atomSprite) return;
    currentSpriteMatKey = currentMaterial;

    const size = ATOM_RADIUS * 2 + 4;
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    const cx = c.getContext('2d');
    const center = size;

    // Sphere body gradient
    const grad = cx.createRadialGradient(
        center - ATOM_RADIUS * 0.3, center - ATOM_RADIUS * 0.3, ATOM_RADIUS * 0.05,
        center, center, ATOM_RADIUS
    );
    grad.addColorStop(0, lightenColor(mat.lattice, 60));
    grad.addColorStop(0.6, mat.lattice);
    grad.addColorStop(1, adjustAlpha(mat.lattice, 0.8));
    cx.fillStyle = grad;
    cx.beginPath();
    cx.arc(center, center, ATOM_RADIUS, 0, Math.PI * 2);
    cx.fill();

    // Specular
    cx.beginPath();
    cx.arc(center - ATOM_RADIUS * 0.25, center - ATOM_RADIUS * 0.25, ATOM_RADIUS * 0.35, 0, Math.PI * 2);
    cx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    cx.fill();

    atomSprite = c;
}

function rebuildElectronSprites() {
    // Electron body sprite
    const size = Math.ceil(ELECTRON_RADIUS * 2 + 4);
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    const cx = c.getContext('2d');
    const center = size;

    const grad = cx.createRadialGradient(
        center - ELECTRON_RADIUS * 0.3, center - ELECTRON_RADIUS * 0.3, ELECTRON_RADIUS * 0.05,
        center, center, ELECTRON_RADIUS
    );
    grad.addColorStop(0, '#c8e4ff');
    grad.addColorStop(0.4, '#7bbfff');
    grad.addColorStop(1, '#2a8aec');
    cx.fillStyle = grad;
    cx.beginPath();
    cx.arc(center, center, ELECTRON_RADIUS, 0, Math.PI * 2);
    cx.fill();

    // Specular
    cx.beginPath();
    cx.arc(center - ELECTRON_RADIUS * 0.2, center - ELECTRON_RADIUS * 0.2, ELECTRON_RADIUS * 0.25, 0, Math.PI * 2);
    cx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    cx.fill();

    electronSprite = c;

    // Glow sprite
    const glowR = ELECTRON_RADIUS * 3.5;
    const g = document.createElement('canvas');
    const gSize = Math.ceil(glowR * 2 + 4);
    g.width = g.height = gSize;
    const gx = g.getContext('2d');
    const gc = gSize / 2;
    const gg = gx.createRadialGradient(gc, gc, 0, gc, gc, glowR);
    gg.addColorStop(0, 'rgba(80, 160, 255, 0.18)');
    gg.addColorStop(1, 'rgba(60, 120, 255, 0)');
    gx.fillStyle = gg;
    gx.beginPath();
    gx.arc(gc, gc, glowR, 0, Math.PI * 2);
    gx.fill();

    electronGlowSprite = g;
}

// ─── Electrons ────────────────────────────────────────────────
function initElectrons() {
    electrons = [];
    for (let i = 0; i < ELECTRON_COUNT; i++) electrons.push(createElectron());
}

function createElectron() {
    const margin = 10;
    return {
        x: wire.x + margin + Math.random() * (wire.w - 2 * margin),
        y: wire.y + margin + Math.random() * (wire.h - 2 * margin),
        vx: 0, vy: 0,
        thermalAngle: Math.random() * Math.PI * 2,
        thermalSpeed: 0.5 + Math.random() * 1.5,
        scatterTimer: Math.random() * 60,
        trail: [],
        pulsePhase: Math.random() * Math.PI * 2
    };
}

// ─── Physics Calculation ──────────────────────────────────────
function updatePhysics() {
    const mat = MATERIALS[currentMaterial];
    const areaM2 = areaMM2 * 1e-6;
    const dT = tempC - 20;
    rhoT = mat.rho0 * (1 + mat.alpha * dT);
    if (rhoT < 0) rhoT = mat.rho0 * 0.01;
    resistance = (rhoT * lengthM) / areaM2;
    current = resistance > 0 ? voltage / resistance : 0;
    driftVelocity = (mat.n > 0 && areaM2 > 0) ? current / (mat.n * E_CHARGE * areaM2) : 0;
    updateHUD(mat);
}

function formatSI(value, unit) {
    const abs = Math.abs(value);
    if (abs === 0) return `0 ${unit}`;
    if (abs >= 1e12) return `${(value / 1e12).toFixed(2)} T${unit}`;
    if (abs >= 1e9)  return `${(value / 1e9).toFixed(2)} G${unit}`;
    if (abs >= 1e6)  return `${(value / 1e6).toFixed(2)} M${unit}`;
    if (abs >= 1e3)  return `${(value / 1e3).toFixed(2)} k${unit}`;
    if (abs >= 1)    return `${value.toFixed(4)} ${unit}`;
    if (abs >= 1e-3) return `${(value * 1e3).toFixed(3)} m${unit}`;
    if (abs >= 1e-6) return `${(value * 1e6).toFixed(3)} μ${unit}`;
    if (abs >= 1e-9) return `${(value * 1e9).toFixed(3)} n${unit}`;
    return `${value.toExponential(2)} ${unit}`;
}

function updateHUD(mat) {
    document.getElementById('baseResVal').textContent = formatSI(mat.rho0, 'Ω·m');
    document.getElementById('currResVal').textContent = formatSI(rhoT, 'Ω·m');
    document.getElementById('resVal').textContent = formatSI(resistance, 'Ω');
    document.getElementById('currVal').textContent = formatSI(current, 'A');
    document.getElementById('driftVal').textContent = formatSI(driftVelocity, 'm/s');
    document.getElementById('powerVal').textContent = formatSI(voltage * current, 'W');
}

// ─── UI Wiring ────────────────────────────────────────────────
const ui = {
    matSelect:  document.getElementById('materialSelect'),
    lenSlider:  document.getElementById('lengthSlider'),
    areaSlider: document.getElementById('areaSlider'),
    tempSlider: document.getElementById('tempSlider'),
    voltSlider: document.getElementById('voltageSlider'),
    lenVal:     document.getElementById('lengthVal'),
    areaVal:    document.getElementById('areaVal'),
    tempVal:    document.getElementById('tempVal'),
    voltVal:    document.getElementById('voltageVal'),
    resetBtn:   document.getElementById('resetBtn')
};

ui.matSelect.addEventListener('change', e => { currentMaterial = e.target.value; currentSpriteMatKey = ''; rebuildAtomSprite(); updatePhysics(); });
ui.lenSlider.addEventListener('input', e => {
    lengthM = parseFloat(e.target.value); ui.lenVal.textContent = `${lengthM.toFixed(1)} m`;
    computeWireBounds(); generateAtomLattice(); updatePhysics();
});
ui.areaSlider.addEventListener('input', e => {
    areaMM2 = parseFloat(e.target.value); ui.areaVal.textContent = `${areaMM2.toFixed(1)} mm²`;
    computeWireBounds(); generateAtomLattice(); updatePhysics();
});
ui.tempSlider.addEventListener('input', e => { tempC = parseFloat(e.target.value); ui.tempVal.textContent = `${tempC} °C`; updatePhysics(); });
ui.voltSlider.addEventListener('input', e => { voltage = parseFloat(e.target.value); ui.voltVal.textContent = `${voltage.toFixed(1)} V`; updatePhysics(); });
ui.resetBtn.addEventListener('click', () => {
    ui.matSelect.value = 'cu'; currentMaterial = 'cu';
    ui.lenSlider.value = 1.0; lengthM = 1.0; ui.lenVal.textContent = '1.0 m';
    ui.areaSlider.value = 1.0; areaMM2 = 1.0; ui.areaVal.textContent = '1.0 mm²';
    ui.tempSlider.value = 20; tempC = 20; ui.tempVal.textContent = '20 °C';
    ui.voltSlider.value = 5.0; voltage = 5.0; ui.voltVal.textContent = '5.0 V';
    computeWireBounds(); generateAtomLattice(); initElectrons(); updatePhysics();
});

// ─── Simulation Step ──────────────────────────────────────────
let time = 0;
let lastTimestamp = 0;
let physicsAccumulator = 0;
const FIXED_TIME_STEP = 1000 / 60; // 16.666 ms

// Note: This steps the physics exactly 1 logic frame (16.6ms equivalent)
function stepSimulationFixed() {
    time += 0.0166; 

    const mat = MATERIALS[currentMaterial];
    const vibAmp = Math.max(0.2, ((tempC + 273) / 293) * 1.5);

    for (const atom of atoms) {
        atom.x = atom.baseX + Math.sin(time * atom.freq * 4 + atom.phase) * vibAmp;
        atom.y = atom.baseY + Math.cos(time * atom.freq * 3.7 + atom.phase * 1.3) * vibAmp;
    }
    // Spatial grid uses base positions — no rebuild needed here

    // visual E field maps the actual drift velocity to a comfortable pixel speed
    const v_mm = driftVelocity * 1000; 
    let driftPush = 0;
    if (v_mm > 0) {
        // Power-law scales visible flow smoothly from low to very high currents
        driftPush = Math.pow(v_mm, 0.45) * 1.2; 
    }
    // Cap at a high but reasonable visible value
    driftPush = Math.min(driftPush, 14.0);

    const scatterMeanTime = Math.max(12, 80 / Math.max(1, (tempC + 273) / 293));

    for (const e of electrons) {
        e.pulsePhase += 0.08;
        
        // Electric field push (left to right drift)
        e.vx += driftPush * 0.04;
        
        // Smooth continuous thermal drift (tiny nudge per frame, not jerky jumps)
        e.thermalAngle += (Math.random() - 0.5) * 0.15;
        e.vx += Math.cos(e.thermalAngle) * e.thermalSpeed * 0.06;
        e.vy += Math.sin(e.thermalAngle) * e.thermalSpeed * 0.06;
        
        // Gentle vertical centering force — prevents edge clustering
        const wireCenter = wire.y + wire.h / 2;
        const yOffset = (e.y - wireCenter) / (wire.h / 2); // -1 to +1
        e.vy -= yOffset * 0.015; // subtle pull toward center
        
        // High damping for buttery smooth gliding
        e.vx *= 0.985;
        e.vy *= 0.985;

        e.scatterTimer -= 1.0;
        if (e.scatterTimer <= 0) {
            // Gentle scatter: small angle nudge + slight speed variation
            e.thermalAngle += (Math.random() - 0.5) * Math.PI * 0.5;
            e.thermalSpeed = 0.8 + Math.random() * 0.8;
            e.scatterTimer = scatterMeanTime * (0.5 + Math.random());
        }

        // Pure velocity-based soft repulsion — spatial grid lookup
        const nearby = getNearbyAtoms(e.x, e.y);
        for (const atom of nearby) {
            const dx = e.x - atom.x;
            const dy = e.y - atom.y;
            const distSq = dx * dx + dy * dy;
            const softRadius = ATOM_RADIUS + ELECTRON_RADIUS + 5;
            if (distSq < softRadius * softRadius && distSq > 0.1) {
                const dist = Math.sqrt(distSq);
                const nx = dx / dist, ny = dy / dist;
                // Very gentle repulsion — produces smooth curves
                const forceMag = Math.max(0, (softRadius - dist)) * 0.03;
                e.vx += nx * forceMag;
                e.vy += ny * forceMag;
            }
        }

        // Dynamic speed limit
        const maxSpeed = (2.5 + driftPush * 1.2);
        const speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
        if (speed > maxSpeed) { 
            // Soft clamp (ease toward max instead of hard cut)
            const factor = maxSpeed / speed;
            e.vx *= 0.95 + 0.05 * factor;
            e.vy *= 0.95 + 0.05 * factor;
        }

        e.x += e.vx;
        e.y += e.vy;

        e.trail.push({ x: e.x, y: e.y });
        if (e.trail.length > 10) e.trail.shift();

        // Screen wrapping
        if (e.x > wire.x + wire.w + 5) { 
            e.x -= (wire.w + 10);
            e.trail = []; 
        }
        if (e.x < wire.x - 5) { 
            e.x += (wire.w + 10);
            e.trail = []; 
        }
        // Soft wall bounce (high energy absorption)
        if (e.y < wire.y + ELECTRON_RADIUS + 2) { 
            e.y = wire.y + ELECTRON_RADIUS + 2; 
            e.vy = Math.abs(e.vy) * 0.3; 
        }
        if (e.y > wire.y + wire.h - ELECTRON_RADIUS - 2) { 
            e.y = wire.y + wire.h - ELECTRON_RADIUS - 2; 
            e.vy = -Math.abs(e.vy) * 0.3; 
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// ─── RENDERING ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

function render(timestamp = 0) {
    if (!lastTimestamp) lastTimestamp = timestamp;
    let dt = timestamp - lastTimestamp;
    
    // Prevent huge jumps if tab was inactive
    if (dt > 100 || dt <= 0) dt = FIXED_TIME_STEP;
    
    lastTimestamp = timestamp;

    // Fix Your Timestep implementation for perfect simulation smoothness
    physicsAccumulator += dt;
    // Cap accumulator to avoid death spirals from massive lag
    if (physicsAccumulator > 50) physicsAccumulator = 50; 

    while (physicsAccumulator >= FIXED_TIME_STEP) {
        stepSimulationFixed();
        physicsAccumulator -= FIXED_TIME_STEP;
    }

    ctx.clearRect(0, 0, width, height);
    drawBackground();
    drawWire();
    drawHeatGlow();
    drawTerminals();
    drawAtoms();
    drawElectrons();
    drawFieldArrows();
    drawLabels();
    requestAnimationFrame(render);
}

function drawBackground() {
    ctx.clearRect(0, 0, width, height);
}

function drawWire() {
    const mat = MATERIALS[currentMaterial];
    const r = 10;

    // Drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 8;
    ctx.beginPath();
    ctx.roundRect(wire.x, wire.y, wire.w, wire.h, r);
    ctx.fillStyle = 'rgba(0,0,0,0.01)';
    ctx.fill();
    ctx.restore();

    // Wire body — 3D metallic gradient
    ctx.beginPath();
    ctx.roundRect(wire.x, wire.y, wire.w, wire.h, r);
    const wireGrad = ctx.createLinearGradient(wire.x, wire.y, wire.x, wire.y + wire.h);
    wireGrad.addColorStop(0, adjustAlpha(mat.color, 0.20));
    wireGrad.addColorStop(0.12, adjustAlpha(mat.color, 0.10));
    wireGrad.addColorStop(0.5, adjustAlpha(mat.color, 0.04));
    wireGrad.addColorStop(0.88, adjustAlpha(mat.color, 0.10));
    wireGrad.addColorStop(1, adjustAlpha(mat.color, 0.16));
    ctx.fillStyle = wireGrad;
    ctx.fill();

    // Border
    ctx.strokeStyle = adjustAlpha(mat.color, 0.35);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Top edge highlight for 3D
    ctx.beginPath();
    ctx.moveTo(wire.x + r, wire.y + 0.5);
    ctx.lineTo(wire.x + wire.w - r, wire.y + 0.5);
    ctx.strokeStyle = adjustAlpha(mat.color, 0.25);
    ctx.lineWidth = 1;
    ctx.stroke();
}

function drawHeatGlow() {
    const heatIntensity = Math.max(0, (tempC - 100) / 900);
    if (heatIntensity <= 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const heatGrad = ctx.createRadialGradient(
        wire.x + wire.w / 2, wire.y + wire.h / 2, 0,
        wire.x + wire.w / 2, wire.y + wire.h / 2, Math.max(wire.w, wire.h) * 0.6
    );
    heatGrad.addColorStop(0, `rgba(255, 120, 40, ${(heatIntensity * 0.12).toFixed(4)})`);
    heatGrad.addColorStop(0.5, `rgba(255, 60, 20, ${(heatIntensity * 0.04).toFixed(4)})`);
    heatGrad.addColorStop(1, 'rgba(255, 30, 10, 0)');
    ctx.fillStyle = heatGrad;
    ctx.beginPath();
    ctx.roundRect(wire.x - 20, wire.y - 20, wire.w + 40, wire.h + 40, 20);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
}

function drawTerminals() {
    const termW = 22;
    const termH = Math.min(wire.h * 0.55, 120);
    const termY = wire.y + (wire.h - termH) / 2;
    const pulse = Math.sin(time * 3) * 0.15 + 0.85;

    // Left (−) terminal
    ctx.save();
    ctx.shadowColor = 'rgba(10, 132, 255, 0.3)';
    ctx.shadowBlur = 12 * pulse;
    ctx.fillStyle = `rgba(10, 132, 255, ${(0.18 * pulse).toFixed(3)})`;
    ctx.strokeStyle = `rgba(10, 132, 255, ${(0.5 * pulse).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(wire.x - termW - 8, termY, termW, termH, 5);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#6ab8ff';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('−', wire.x - termW / 2 - 8, wire.y + wire.h / 2);

    // Right (+) terminal
    ctx.save();
    ctx.shadowColor = 'rgba(255, 69, 58, 0.3)';
    ctx.shadowBlur = 12 * pulse;
    ctx.fillStyle = `rgba(255, 69, 58, ${(0.18 * pulse).toFixed(3)})`;
    ctx.strokeStyle = `rgba(255, 69, 58, ${(0.5 * pulse).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(wire.x + wire.w + 8, termY, termW, termH, 5);
    ctx.fill(); ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#ff9a93';
    ctx.fillText('+', wire.x + wire.w + termW / 2 + 8, wire.y + wire.h / 2);

    // Dashed lead wires
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(wire.x - termW - 8, wire.y + wire.h / 2);
    ctx.lineTo(wire.x - termW - 50, wire.y + wire.h / 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(wire.x + wire.w + termW + 8, wire.y + wire.h / 2);
    ctx.lineTo(wire.x + wire.w + termW + 50, wire.y + wire.h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawAtoms() {
    const mat = MATERIALS[currentMaterial];
    const spriteSize = atomSprite ? atomSprite.width : 0;
    const halfSprite = spriteSize / 2;

    for (const atom of atoms) {
        if (atom.x < wire.x - 5 || atom.x > wire.x + wire.w + 5 ||
            atom.y < wire.y - 5 || atom.y > wire.y + wire.h + 5) continue;

        // Draw cached atom sprite (no per-frame gradient creation!)
        if (atomSprite) {
            ctx.drawImage(atomSprite, atom.x - halfSprite, atom.y - halfSprite);
        }
    }
}

function drawElectrons() {
    // Clip to wire bounds
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(wire.x - 2, wire.y - 2, wire.w + 4, wire.h + 4, 10);
    ctx.clip();

    const glowHalf = electronGlowSprite ? electronGlowSprite.width / 2 : 0;
    const bodyHalf = electronSprite ? electronSprite.width / 2 : 0;

    for (const e of electrons) {
        if (e.x < wire.x - 10 || e.x > wire.x + wire.w + 10) continue;

        const speed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
        const speedNorm = Math.min(1, speed / 4);

        // Smooth bezier trail
        if (e.trail.length > 2) {
            ctx.beginPath();
            ctx.moveTo(e.trail[0].x, e.trail[0].y);
            // Use quadratic bezier curves through midpoints for silky smooth paths
            for (let i = 1; i < e.trail.length - 1; i++) {
                const mx = (e.trail[i].x + e.trail[i + 1].x) * 0.5;
                const my = (e.trail[i].y + e.trail[i + 1].y) * 0.5;
                ctx.quadraticCurveTo(e.trail[i].x, e.trail[i].y, mx, my);
            }
            // Connect to the last point
            const last = e.trail[e.trail.length - 1];
            ctx.lineTo(last.x, last.y);
            ctx.strokeStyle = `rgba(100, 180, 255, ${(0.18 * speedNorm).toFixed(3)})`;
            ctx.lineWidth = 1.8;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
        }

        // Cached glow sprite
        if (electronGlowSprite) {
            ctx.drawImage(electronGlowSprite, e.x - glowHalf, e.y - glowHalf);
        }

        // Cached body sprite
        if (electronSprite) {
            ctx.drawImage(electronSprite, e.x - bodyHalf, e.y - bodyHalf);
        }
    }

    ctx.restore();
}

function drawFieldArrows() {
    if (voltage < 0.05) return;

    const arrowCount = Math.max(3, Math.min(8, Math.floor(wire.w / 80)));
    const arrowY = wire.y - 18;
    const startX = wire.x + 40;
    const endX = wire.x + wire.w - 40;
    const spacing = (endX - startX) / Math.max(1, arrowCount - 1);
    const dashOffset = (time * 30) % 20;

    for (let i = 0; i < arrowCount; i++) {
        const ax = startX + i * spacing;
        const arrowLen = 22;

        ctx.setLineDash([4, 3]);
        ctx.lineDashOffset = -dashOffset;
        ctx.strokeStyle = 'rgba(255, 200, 50, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ax - arrowLen / 2, arrowY);
        ctx.lineTo(ax + arrowLen / 2, arrowY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        ctx.fillStyle = 'rgba(255, 200, 50, 0.35)';
        ctx.beginPath();
        ctx.moveTo(ax + arrowLen / 2 + 2, arrowY);
        ctx.lineTo(ax + arrowLen / 2 - 4, arrowY - 3.5);
        ctx.lineTo(ax + arrowLen / 2 - 4, arrowY + 3.5);
        ctx.closePath();
        ctx.fill();
    }

    ctx.fillStyle = 'rgba(255, 200, 50, 0.4)';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('E →', wire.x + wire.w / 2, arrowY - 12);
}

function drawLabels() {
    const mat = MATERIALS[currentMaterial];
    const label = mat.name + ' Wire';
    ctx.font = '600 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    const labelW = ctx.measureText(label).width + 24;
    const labelX = wire.x + wire.w / 2;
    const labelY = wire.y + wire.h + 22;

    // Badge background
    ctx.fillStyle = adjustAlpha(mat.color, 0.12);
    ctx.beginPath();
    ctx.roundRect(labelX - labelW / 2, labelY - 10, labelW, 22, 6);
    ctx.fill();
    ctx.strokeStyle = adjustAlpha(mat.color, 0.25);
    ctx.lineWidth = 0.5;
    ctx.stroke();

    ctx.fillStyle = adjustAlpha(mat.color, 0.85);
    ctx.fillText(label, labelX, labelY + 4);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.fillText(`L = ${lengthM.toFixed(1)} m`, labelX, labelY + 26);

    // Area label (rotated)
    ctx.save();
    ctx.translate(wire.x - 45, wire.y + wire.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`A = ${areaMM2.toFixed(1)} mm²`, 0, 0);
    ctx.restore();

    // Drift label
    if (voltage > 0.05) {
        ctx.fillStyle = 'rgba(100, 180, 255, 0.3)';
        ctx.font = '500 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('e⁻ drift →', labelX, labelY + 42);
    }

    // Temp badge at high temperatures
    if (tempC > 100) {
        const tLabel = `${tempC}°C`;
        ctx.font = '600 10px Inter, sans-serif';
        const tW = ctx.measureText(tLabel).width + 14;
        const heatAlpha = Math.min(0.8, (tempC - 100) / 500);
        ctx.fillStyle = `rgba(255, 100, 40, ${(heatAlpha * 0.2).toFixed(3)})`;
        ctx.beginPath();
        ctx.roundRect(wire.x + wire.w - tW - 5, wire.y + 5, tW, 18, 4);
        ctx.fill();
        ctx.fillStyle = `rgba(255, 150, 80, ${heatAlpha.toFixed(3)})`;
        ctx.textAlign = 'center';
        ctx.fillText(tLabel, wire.x + wire.w - tW / 2 - 5, wire.y + 17);
    }
}

// ─── Utilities ────────────────────────────────────────────────
function adjustAlpha(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lightenColor(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
    return `rgb(${r}, ${g}, ${b})`;
}

// ─── Init ─────────────────────────────────────────────────────


resize();
updatePhysics();
requestAnimationFrame(render);

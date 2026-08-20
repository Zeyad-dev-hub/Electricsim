const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const addChargeBtn = document.getElementById('addChargeBtn');
const addChargeModal = document.getElementById('addChargeModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const createChargeBtn = document.getElementById('createChargeBtn');
const chargeMagnitudeInput = document.getElementById('chargeMagnitude');
const magnitudeVal = document.getElementById('magnitudeVal');
const shapeDimensionInput = document.getElementById('shapeDimension');
const dimensionVal = document.getElementById('dimensionVal');
const dimensionGroup = document.getElementById('dimensionGroup');
const chargeCountDisplay = document.getElementById('chargeCount');
const shapeTypeSelect = document.getElementById('shapeType');
const clearAllBtn = document.getElementById('clearAllBtn');
const shortcutsBtn = document.getElementById('shortcutsBtn');
const shortcutsPanel = document.getElementById('shortcutsPanel');
const welcomeOverlay = document.getElementById('welcomeOverlay');

// HUD
const hudPos = document.getElementById('hudPos');
const hudE = document.getElementById('hudE');
const hudV = document.getElementById('hudV');
const hudZoom = document.getElementById('hudZoom');
const selectedInfoDiv = document.getElementById('selectedInfo');
const selType = document.getElementById('selType');
const selCharge = document.getElementById('selCharge');
const selPos = document.getElementById('selPos');
const selForce = document.getElementById('selForce');
const selPotential = document.getElementById('selPotential');

// Toggle checkboxes
const toggleFieldLines = document.getElementById('toggleFieldLines');
const toggleEquipotential = document.getElementById('toggleEquipotential');
const toggleForceVectors = document.getElementById('toggleForceVectors');
const toggleGrid = document.getElementById('toggleGrid');
const toggleConnectors = document.getElementById('toggleConnectors');

// Physics Constants
const k = 5000; // Visual scaling constant for Coulomb's law (rendering only)
const K_COULOMB = 8.9875517923e9; // Real Coulomb constant N⋅m²/C²
const minRadius = 15;
const maxRadius = 30;
const PIXELS_PER_UNIT = 100; // 100 pixels = 1 display unit

// Application State
let objects = []; // Contains rigid bodies/groups
let primitiveCharges = []; // Flat array of all point charges for fast physics
let draggingObject = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let width, height;
let mouseWorldX = 0;
let mouseWorldY = 0;
let selectedObject = null;
let shiftHeld = false;
const gridSpacing = 100; // 100px = 1 display unit

// Scale unit system — 100px = 1 unit, selector picks what that unit physically is
const SCALE_UNITS = {
    m: { label: 'm', metersPerUnit: 1 },
    cm: { label: 'cm', metersPerUnit: 0.01 },
    mm: { label: 'mm', metersPerUnit: 0.001 },
    um: { label: 'μm', metersPerUnit: 1e-6 },
    nm: { label: 'nm', metersPerUnit: 1e-9 },
    pm: { label: 'pm', metersPerUnit: 1e-12 }
};
let currentScaleKey = 'm';

// Charge unit system — slider value is in selected charge units
const CHARGE_UNITS = {
    C:  { label: 'C',  coulombsPerUnit: 1 },
    mC: { label: 'mC', coulombsPerUnit: 1e-3 },
    uC: { label: 'μC', coulombsPerUnit: 1e-6 },
    nC: { label: 'nC', coulombsPerUnit: 1e-9 },
    pC: { label: 'pC', coulombsPerUnit: 1e-12 },
    fC: { label: 'fC', coulombsPerUnit: 1e-15 }
};
let currentChargeKey = 'uC';

function getChargeLabel() {
    return CHARGE_UNITS[currentChargeKey].label;
}

function getCoulombsPerUnit() {
    return CHARGE_UNITS[currentChargeKey].coulombsPerUnit;
}

function getUnitLabel() {
    return SCALE_UNITS[currentScaleKey].label;
}

function getMetersPerUnit() {
    return SCALE_UNITS[currentScaleKey].metersPerUnit;
}

// Convert world pixels to display units: 100px = 1 unit
function pxToUnit(px) {
    return px / PIXELS_PER_UNIT;
}

// Convert pixel distance to real meters (for physics calculations)
function pxToMeters(px) {
    return (px / PIXELS_PER_UNIT) * getMetersPerUnit();
}

// Format a world-pixel distance for display with unit suffix
function formatDistance(px, decimals = 2) {
    return `${pxToUnit(px).toFixed(decimals)} ${getUnitLabel()}`;
}

// Format a coordinate pair
function formatCoord(wxPx, wyPx, decimals = 2) {
    const x = pxToUnit(wxPx);
    const y = pxToUnit(-wyPx); // negate Y so up = positive
    return `(${x.toFixed(decimals)}, ${y.toFixed(decimals)}) ${getUnitLabel()}`;
}

// --- Real Physics Conversion Factors ---
// Visual simulation uses k=5000 with dimensionless charges and pixel distances.
// Real physics uses K_COULOMB with Coulombs and meters.
// These factors convert visual values → real SI values using the selected charge unit.
function getEFieldScale() {
    const mpu = getMetersPerUnit();
    const cpu = getCoulombsPerUnit();
    return (K_COULOMB * cpu * PIXELS_PER_UNIT * PIXELS_PER_UNIT) / (k * mpu * mpu);
}

function getVoltageScale() {
    const mpu = getMetersPerUnit();
    const cpu = getCoulombsPerUnit();
    return (K_COULOMB * cpu * PIXELS_PER_UNIT) / (k * mpu);
}

function getForceScale() {
    const mpu = getMetersPerUnit();
    const cpu = getCoulombsPerUnit();
    return (K_COULOMB * cpu * cpu * PIXELS_PER_UNIT * PIXELS_PER_UNIT) / (k * mpu * mpu);
}

// Format value with SI prefix for readability
function formatSI(value, unit) {
    const abs = Math.abs(value);
    if (abs === 0) return `0 ${unit}`;
    if (abs >= 1e12) return `${(value / 1e12).toFixed(2)} T${unit}`;
    if (abs >= 1e9) return `${(value / 1e9).toFixed(2)} G${unit}`;
    if (abs >= 1e6) return `${(value / 1e6).toFixed(2)} M${unit}`;
    if (abs >= 1e3) return `${(value / 1e3).toFixed(2)} k${unit}`;
    if (abs >= 1) return `${value.toFixed(2)} ${unit}`;
    if (abs >= 1e-3) return `${(value * 1e3).toFixed(2)} m${unit}`;
    if (abs >= 1e-6) return `${(value * 1e6).toFixed(2)} μ${unit}`;
    if (abs >= 1e-9) return `${(value * 1e9).toFixed(2)} n${unit}`;
    if (abs >= 1e-12) return `${(value * 1e12).toFixed(2)} p${unit}`;
    return `${value.toExponential(2)} ${unit}`;
}

// Undo / Redo
let undoStack = [];
let redoStack = [];
const MAX_UNDO = 40;

// Camera & Viewport
let viewport = { x: 0, y: 0, zoom: 1.0, initialized: false };
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartViewportX = 0;
let panStartViewportY = 0;

// Field line cache
let fieldLineCache = [];
let fieldLinesDirty = true;

// Aurora animation time
let auroraTime = 0;

function screenToWorld(sx, sy) {
    return {
        x: sx / viewport.zoom + viewport.x,
        y: sy / viewport.zoom + viewport.y
    };
}

function worldToScreen(wx, wy) {
    return {
        x: (wx - viewport.x) * viewport.zoom,
        y: (wy - viewport.y) * viewport.zoom
    };
}

// Resize handling
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
    // Center viewport on world origin (0,0) at first load
    if (!viewport.initialized) {
        viewport.x = -width / 2;
        viewport.y = -height / 2;
        viewport.initialized = true;
    }
    fieldLinesDirty = true;
}
window.addEventListener('resize', resize);
resize();

// --- Serialization for Undo/Redo ---
function serializeState() {
    return objects.map(obj => ({
        cx: obj.cx,
        cy: obj.cy,
        totalQ: obj.totalQ,
        type: obj.type,
        dimension: obj.dimension,
        chargeAngles: obj.charges.map(c => c.angle || 0)
    }));
}

function restoreState(state) {
    objects = [];
    primitiveCharges = [];
    for (const s of state) {
        addObject(s.cx, s.cy, s.totalQ, s.type, s.dimension, true);
    }
    selectedObject = null;
    updateStats();
    updateWelcomeOverlay();
    fieldLinesDirty = true;
}

function pushUndo() {
    undoStack.push(serializeState());
    if (undoStack.length > MAX_UNDO) undoStack.shift();
    redoStack = [];
}

function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(serializeState());
    const prev = undoStack.pop();
    restoreState(prev);
}

function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(serializeState());
    const next = redoStack.pop();
    restoreState(next);
}

// --- Welcome Overlay ---
function updateWelcomeOverlay() {
    if (objects.length === 0) {
        welcomeOverlay.classList.remove('fade-out');
        welcomeOverlay.style.display = 'flex';
    } else {
        welcomeOverlay.classList.add('fade-out');
        setTimeout(() => {
            if (objects.length > 0) welcomeOverlay.style.display = 'none';
        }, 600);
    }
}

// --- Selection ---
function selectObject(obj) {
    selectedObject = obj;
    if (obj) {
        selectedInfoDiv.classList.remove('hidden');
        const typeNames = {
            point: 'Point Charge',
            rod: 'Charged Rod',
            ring: 'Ring Charge',
            sphere_non_cond: 'Non-Cond. Sphere',
            sphere_cond: 'Conducting Sphere'
        };
        selType.textContent = typeNames[obj.type] || obj.type;
        selCharge.textContent = `${obj.totalQ > 0 ? '+' : ''}${obj.totalQ} ${getChargeLabel()}`;
        selPos.textContent = formatCoord(obj.cx, obj.cy);
    } else {
        selectedInfoDiv.classList.add('hidden');
    }
}

function deleteSelected() {
    if (!selectedObject) return;
    pushUndo();
    const idx = objects.indexOf(selectedObject);
    if (idx >= 0) {
        primitiveCharges = primitiveCharges.filter(c => !selectedObject.charges.includes(c));
        objects.splice(idx, 1);
        selectObject(null);
        updateStats();
        updateWelcomeOverlay();
        fieldLinesDirty = true;
    }
}

// --- Input & Modals ---
shapeTypeSelect.addEventListener('change', (e) => {
    if (e.target.value === 'point') {
        dimensionGroup.style.opacity = '0.4';
        dimensionGroup.style.pointerEvents = 'none';
    } else {
        dimensionGroup.style.opacity = '1';
        dimensionGroup.style.pointerEvents = 'auto';
    }
});

addChargeBtn.addEventListener('click', () => {
    addChargeModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
    addChargeModal.classList.add('hidden');
});

// Close modal on backdrop click
addChargeModal.addEventListener('click', (e) => {
    if (e.target === addChargeModal) {
        addChargeModal.classList.add('hidden');
    }
});

chargeMagnitudeInput.addEventListener('input', (e) => {
    magnitudeVal.textContent = `${e.target.value} ${getChargeLabel()}`;
});

shapeDimensionInput.addEventListener('input', (e) => {
    dimensionVal.textContent = formatDistance(parseInt(e.target.value));
});

createChargeBtn.addEventListener('click', () => {
    const qValue = parseInt(chargeMagnitudeInput.value);
    const sign = parseInt(document.querySelector('input[name="chargeSign"]:checked').value);
    const shape = shapeTypeSelect.value;
    const dimension = parseInt(shapeDimensionInput.value);

    pushUndo();
    const worldCenter = screenToWorld(width / 2, height / 2);
    addObject(worldCenter.x, worldCenter.y, qValue * sign, shape, dimension);

    addChargeModal.classList.add('hidden');
    updateWelcomeOverlay();
    fieldLinesDirty = true;
});

// Clear All
clearAllBtn.addEventListener('click', () => {
    if (objects.length === 0) return;
    pushUndo();
    objects = [];
    primitiveCharges = [];
    selectedObject = null;
    updateStats();
    updateWelcomeOverlay();
    fieldLinesDirty = true;
});

// Shortcuts panel
shortcutsBtn.addEventListener('click', () => {
    shortcutsPanel.classList.toggle('hidden');
});

// --- Keyboard ---
document.addEventListener('keydown', (e) => {
    if (e.key === 'Shift') shiftHeld = true;

    if (e.key === 'Escape') {
        addChargeModal.classList.add('hidden');
        shortcutsPanel.classList.add('hidden');
        selectObject(null);
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if not in an input
        if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'SELECT') {
            deleteSelected();
        }
    }

    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    }
    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift') shiftHeld = false;
});

// --- Camera Interaction ---
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const worldBefore = screenToWorld(mx, my);

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    viewport.zoom *= zoomFactor;
    viewport.zoom = Math.max(0.1, Math.min(viewport.zoom, 10));

    hudZoom.textContent = viewport.zoom.toFixed(2);

    const worldAfter = screenToWorld(mx, my);
    viewport.x -= (worldAfter.x - worldBefore.x);
    viewport.y -= (worldAfter.y - worldBefore.y);
    fieldLinesDirty = true;
});

// --- Mouse Interaction ---
canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);

    for (let i = objects.length - 1; i >= 0; i--) {
        if (objects[i].contains(wx, wy)) {
            pushUndo();
            const obj = objects[i];
            primitiveCharges = primitiveCharges.filter(c => !obj.charges.includes(c));
            if (selectedObject === obj) selectObject(null);
            objects.splice(i, 1);
            updateStats();
            updateWelcomeOverlay();
            fieldLinesDirty = true;
            break;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);

    mouseWorldX = wx;
    mouseWorldY = wy;

    if (draggingObject) {
        let targetX = wx - dragOffsetX;
        let targetY = wy - dragOffsetY;

        // Snap to grid
        if (shiftHeld) {
            targetX = Math.round(targetX / gridSpacing) * gridSpacing;
            targetY = Math.round(targetY / gridSpacing) * gridSpacing;
        }

        draggingObject.moveTo(targetX, targetY);
        fieldLinesDirty = true;

        // Update selection info live
        if (selectedObject === draggingObject) {
            selPos.textContent = formatCoord(draggingObject.cx, draggingObject.cy);
        }
    } else if (isPanning) {
        const dx = sx - panStartX;
        const dy = sy - panStartY;
        viewport.x = panStartViewportX - dx / viewport.zoom;
        viewport.y = panStartViewportY - dy / viewport.zoom;
        canvas.style.cursor = 'grabbing';
        fieldLinesDirty = true;
    } else {
        let hovered = objects.some(obj => obj.contains(wx, wy));
        canvas.style.cursor = hovered ? 'grab' : 'crosshair';
    }

    // Update HUD with real physics values
    if (primitiveCharges.length > 0) {
        const { Ex, Ey, V } = calculateFieldAndPotential(wx, wy);
        const emag = Math.sqrt(Ex * Ex + Ey * Ey);
        hudPos.textContent = formatCoord(wx, wy).replace(` ${getUnitLabel()}`, '');
        hudE.textContent = formatSI(emag * getEFieldScale(), 'N/C');
        hudV.textContent = formatSI(V * getVoltageScale(), 'V');
    } else {
        hudPos.textContent = formatCoord(wx, wy).replace(` ${getUnitLabel()}`, '');
        hudE.textContent = '—';
        hudV.textContent = '—';
    }
});

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 2) return; // right click handled by contextmenu
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { x: wx, y: wy } = screenToWorld(sx, sy);
    let hit = false;

    for (let i = objects.length - 1; i >= 0; i--) {
        if (objects[i].contains(wx, wy)) {
            draggingObject = objects[i];
            dragOffsetX = wx - objects[i].cx;
            dragOffsetY = wy - objects[i].cy;
            selectObject(objects[i]);
            hit = true;
            break;
        }
    }

    if (!hit) {
        selectObject(null);
        isPanning = true;
        panStartX = sx;
        panStartY = sy;
        panStartViewportX = viewport.x;
        panStartViewportY = viewport.y;
    }
});

canvas.addEventListener('mouseup', () => {
    if (draggingObject) {
        fieldLinesDirty = true;
        draggingObject = null;
    }
    if (isPanning) {
        isPanning = false;
        canvas.style.cursor = 'crosshair';
    }
});

canvas.addEventListener('mouseleave', () => {
    draggingObject = null;
    isPanning = false;
});

// --- Touch Support ---
let lastTouchDist = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const sx = touch.clientX - rect.left;
        const sy = touch.clientY - rect.top;
        const { x: wx, y: wy } = screenToWorld(sx, sy);
        let hit = false;

        for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i].contains(wx, wy)) {
                draggingObject = objects[i];
                dragOffsetX = wx - objects[i].cx;
                dragOffsetY = wy - objects[i].cy;
                selectObject(objects[i]);
                hit = true;
                break;
            }
        }

        if (!hit) {
            isPanning = true;
            panStartX = sx;
            panStartY = sy;
            panStartViewportX = viewport.x;
            panStartViewportY = viewport.y;
        }
    } else if (e.touches.length === 2) {
        // Pinch-to-zoom start
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const sx = touch.clientX - rect.left;
        const sy = touch.clientY - rect.top;
        const { x: wx, y: wy } = screenToWorld(sx, sy);
        mouseWorldX = wx;
        mouseWorldY = wy;

        if (draggingObject) {
            draggingObject.moveTo(wx - dragOffsetX, wy - dragOffsetY);
            fieldLinesDirty = true;
        } else if (isPanning) {
            const dx = sx - panStartX;
            const dy = sy - panStartY;
            viewport.x = panStartViewportX - dx / viewport.zoom;
            viewport.y = panStartViewportY - dy / viewport.zoom;
            fieldLinesDirty = true;
        }
    } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (lastTouchDist > 0) {
            const scale = dist / lastTouchDist;
            viewport.zoom *= scale;
            viewport.zoom = Math.max(0.1, Math.min(viewport.zoom, 10));
            hudZoom.textContent = viewport.zoom.toFixed(2);
            fieldLinesDirty = true;
        }
        lastTouchDist = dist;
    }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) {
        if (draggingObject) { fieldLinesDirty = true; draggingObject = null; }
        isPanning = false;
        lastTouchDist = 0;
    }
});

// --- Physics Data Structures ---
class PointCharge {
    constructor(x, y, q) {
        this.x = x;
        this.y = y;
        this.q = q;
        const absQ = Math.abs(q);
        this.radius = Math.max(8, minRadius + (absQ / 100) * (maxRadius - minRadius));
    }
}

// --- Gaussian Elimination Solver (Partial Pivoting) for Conducting Sphere ---
function solveLinearSystem(A, b) {
    const n = A.length;
    const M = A.map((row, i) => [...row, b[i]]);

    for (let col = 0; col < n; col++) {
        let maxVal = Math.abs(M[col][col]);
        let maxRow = col;
        for (let row = col + 1; row < n; row++) {
            if (Math.abs(M[row][col]) > maxVal) {
                maxVal = Math.abs(M[row][col]);
                maxRow = row;
            }
        }
        [M[col], M[maxRow]] = [M[maxRow], M[col]];
        if (Math.abs(M[col][col]) < 1e-12) continue;

        for (let row = col + 1; row < n; row++) {
            const factor = M[row][col] / M[col][col];
            for (let j = col; j <= n; j++) {
                M[row][j] -= factor * M[col][j];
            }
        }
    }

    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
        if (Math.abs(M[i][i]) < 1e-12) continue;
        x[i] = M[i][n];
        for (let j = i + 1; j < n; j++) {
            x[i] -= M[i][j] * x[j];
        }
        x[i] /= M[i][i];
    }

    return x;
}

class RigidBody {
    constructor(x, y, totalQ, type) {
        this.cx = x;
        this.cy = y;
        this.totalQ = totalQ;
        this.type = type;
        this.dimension = 60;
        this.charges = [];
        this.surfacePotential = null;
    }

    addToWorld() {
        objects.push(this);
        this.charges.forEach(c => primitiveCharges.push(c));
        updateStats();
    }

    updatePrimitives(newCx, newCy) {
        const dx = newCx - this.cx;
        const dy = newCy - this.cy;
        this.cx = newCx;
        this.cy = newCy;
        for (let c of this.charges) {
            c.x += dx;
            c.y += dy;
        }
    }

    moveTo(x, y) {
        this.updatePrimitives(x, y);
    }

    contains(mx, my) {
        const dx = mx - this.cx;
        const dy = my - this.cy;
        const distSq = dx * dx + dy * dy;
        const hitPad = 20 / viewport.zoom;
        const broadDist = this.dimension + hitPad;
        if (distSq > broadDist * broadDist) return false;

        // Click inside sphere/ring outline = hit
        if ((this.type === 'sphere_cond' || this.type === 'sphere_non_cond' || this.type === 'ring')
            && distSq <= this.dimension * this.dimension) {
            return true;
        }

        for (let c of this.charges) {
            const dcx = mx - c.x;
            const dcy = my - c.y;
            const minHit = Math.max(hitPad * hitPad, c.radius * c.radius);
            if (dcx * dcx + dcy * dcy <= minHit) return true;
        }

        if (distSq <= hitPad * hitPad) return true;
        return false;
    }

    updateConductingPhysics() {
        if (this.type !== 'sphere_cond') return;

        const N = this.charges.length;
        const radius = this.dimension;
        const absQTotal = Math.max(Math.abs(this.totalQ), 1);
        // Maximum any single sub-charge can hold (prevents runaway)
        const qClamp = absQTotal * 5;

        // Pin charges to exact positions on the sphere circumference
        for (let i = 0; i < N; i++) {
            const c = this.charges[i];
            c.x = this.cx + Math.cos(c.angle) * radius;
            c.y = this.cy + Math.sin(c.angle) * radius;
        }

        // Sanitize: if any charge is corrupted, reset everything
        let corrupted = false;
        for (const c of this.charges) {
            if (!isFinite(c.q) || !isFinite(c.displayQ)) { corrupted = true; break; }
        }
        if (corrupted) {
            const qEach = this.totalQ / N;
            for (const c of this.charges) {
                c.q = qEach;
                c.displayQ = qEach;
            }
        }

        // Minimum distance for external potential — prevents blow-up on overlap
        // Use half the sphere radius as floor (not 1px)
        const minExtDist = Math.max(radius * 0.5, 10);

        // Compute external potential at each surface point
        const Vext = new Array(N).fill(0);
        for (let i = 0; i < N; i++) {
            const ci = this.charges[i];
            for (const extC of primitiveCharges) {
                if (this.charges.includes(extC)) continue;
                const dx = ci.x - extC.x;
                const dy = ci.y - extC.y;
                const dist = Math.max(Math.sqrt(dx * dx + dy * dy), minExtDist);
                Vext[i] += (k * extC.q) / dist;
            }
        }

        // Build (N+1) x (N+1) BEM system:
        // For each node i: sum_{j!=i}(k * q_j / d_ij) - V_0 = -V_ext_i
        // Constraint: sum(q_i) = Q_total
        const size = N + 1;
        const A = [];
        const b = [];

        for (let i = 0; i < N; i++) {
            const row = new Array(size).fill(0);
            for (let j = 0; j < N; j++) {
                if (i === j) continue;
                const dx = this.charges[i].x - this.charges[j].x;
                const dy = this.charges[i].y - this.charges[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                row[j] = k / Math.max(dist, 0.1);
            }
            row[N] = -1;
            A.push(row);
            b.push(-Vext[i]);
        }

        // Charge conservation constraint row
        const constraintRow = new Array(size).fill(0);
        for (let j = 0; j < N; j++) constraintRow[j] = 1;
        A.push(constraintRow);
        b.push(this.totalQ);

        // Solve for [q_1, ..., q_N, V_0]
        const solution = solveLinearSystem(A, b);

        // Validate + clamp solution
        let valid = true;
        for (let i = 0; i <= N; i++) {
            if (!isFinite(solution[i])) { valid = false; break; }
        }
        // Also reject if any q_i is wildly out of range
        if (valid) {
            for (let i = 0; i < N; i++) {
                if (Math.abs(solution[i]) > qClamp * 10) { valid = false; break; }
            }
        }

        // Smooth lerp factor
        const lerpSpeed = 0.12;

        if (valid) {
            for (let i = 0; i < N; i++) {
                // Clamp target to prevent extreme oscillation
                const targetQ = Math.max(-qClamp, Math.min(qClamp, solution[i]));
                this.charges[i].q += (targetQ - this.charges[i].q) * lerpSpeed;
                // Guard against NaN creep
                if (!isFinite(this.charges[i].q)) this.charges[i].q = this.totalQ / N;
                this.charges[i].displayQ += (this.charges[i].q - this.charges[i].displayQ) * lerpSpeed * 0.8;
                if (!isFinite(this.charges[i].displayQ)) this.charges[i].displayQ = this.charges[i].q;
            }
            this.surfacePotential = solution[N];
            if (!isFinite(this.surfacePotential)) this.surfacePotential = null;
        } else {
            // Fallback: gently lerp toward uniform distribution
            const qEach = this.totalQ / N;
            for (let i = 0; i < N; i++) {
                this.charges[i].q += (qEach - this.charges[i].q) * lerpSpeed;
                if (!isFinite(this.charges[i].q)) this.charges[i].q = qEach;
                this.charges[i].displayQ += (this.charges[i].q - this.charges[i].displayQ) * lerpSpeed * 0.8;
                if (!isFinite(this.charges[i].displayQ)) this.charges[i].displayQ = this.charges[i].q;
            }
            this.surfacePotential = null;
        }
    }

    draw(ctx, showForceVectors) {
        const isSelected = selectedObject === this;

        // --- Selection ring ---
        if (isSelected) {
            const selRadius = this.type === 'point' ? this.charges[0].radius + 8 : this.dimension + 10;
            ctx.beginPath();
            ctx.arc(this.cx, this.cy, selRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Selection glow
            const selGlow = ctx.createRadialGradient(this.cx, this.cy, selRadius * 0.5, this.cx, this.cy, selRadius * 1.5);
            selGlow.addColorStop(0, 'rgba(251, 191, 36, 0.06)');
            selGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
            ctx.fillStyle = selGlow;
            ctx.beginPath();
            ctx.arc(this.cx, this.cy, selRadius * 1.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // --- Draw charge bodies ---
        for (let c of this.charges) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
            ctx.fillStyle = c.q > 0 ? '#ef4444' : '#3b82f6';
            ctx.fill();

            ctx.strokeStyle = c.q > 0 ? '#b91c1c' : '#1d4ed8';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (this.charges.length === 1) {
                ctx.fillStyle = 'white';
                ctx.font = `bold ${c.radius}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(c.q > 0 ? '+' : '−', c.x, c.y + 1);
            }
        }

        // Draw structural outline
        if (this.type === 'ring' || this.type === 'sphere_cond' || this.type === 'sphere_non_cond') {
            ctx.beginPath();
            ctx.arc(this.cx, this.cy, this.dimension, 0, Math.PI * 2);
            if (this.type === 'sphere_non_cond') {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            } else if (this.type === 'sphere_cond') {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            } else {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            }
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        } else if (this.type === 'rod') {
            ctx.beginPath();
            ctx.moveTo(this.cx - this.dimension / 2, this.cy);
            ctx.lineTo(this.cx + this.dimension / 2, this.cy);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        // --- Force Vector ---
        if (!showForceVectors) return;

        let Fx = 0;
        let Fy = 0;

        for (let selfC of this.charges) {
            for (let extC of primitiveCharges) {
                if (this.charges.includes(extC)) continue;
                const dx = selfC.x - extC.x;
                const dy = selfC.y - extC.y;
                const rSq = dx * dx + dy * dy;
                if (rSq < 100) continue;

                const r = Math.sqrt(rSq);
                const forceMag = (k * extC.q * selfC.q) / rSq;

                Fx += forceMag * (dx / r);
                Fy += forceMag * (dy / r);
            }
        }

        const fMag = Math.sqrt(Fx * Fx + Fy * Fy);
        if (fMag > 0.01) {
            const arrowLen = Math.min(200, Math.max(30, Math.log1p(fMag) * 18));
            const scale = arrowLen / fMag;
            const endX = this.cx + Fx * scale;
            const endY = this.cy + Fy * scale;

            const angle = Math.atan2(Fy, Fx);
            const headLen = 8 / viewport.zoom;
            const invZoom = 1 / viewport.zoom;

            // Draw arrow shaft + arrowhead
            ctx.beginPath();
            ctx.moveTo(this.cx, this.cy);
            ctx.lineTo(endX, endY);
            ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
            ctx.moveTo(endX, endY);
            ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
            ctx.strokeStyle = '#00ffcc';
            ctx.lineWidth = 2 * invZoom;
            ctx.stroke();

            // Force magnitude label (zoom-aware sizing)
            const realFMag = fMag * getForceScale();
            const textStr = formatSI(realFMag, 'N');

            ctx.save();
            const fontSize = 12 * invZoom;
            ctx.font = `600 ${fontSize}px Inter, sans-serif`;

            const labelOffset = 14 * invZoom;
            const tX = endX + labelOffset * Math.cos(angle);
            const tY = endY + labelOffset * Math.sin(angle);

            ctx.textAlign = Math.cos(angle) >= 0 ? 'left' : 'right';
            ctx.textBaseline = Math.sin(angle) >= 0 ? 'top' : 'bottom';

            // Text outline for readability
            ctx.lineJoin = 'round';
            ctx.lineWidth = 3 * invZoom;
            ctx.strokeStyle = 'rgba(10, 15, 30, 0.9)';
            ctx.strokeText(textStr, tX, tY);

            ctx.fillStyle = '#00ffcc';
            ctx.fillText(textStr, tX, tY);
            ctx.restore();
        }
    }
}

function addObject(x, y, totalQ, type, dimension = 60, skipRecordUndo = false) {
    const obj = new RigidBody(x, y, totalQ, type);
    obj.dimension = dimension;

    if (type === 'point') {
        obj.charges.push(new PointCharge(x, y, totalQ));
    }
    else if (type === 'ring') {
        const radius = dimension;
        const nPoints = Math.max(8, Math.floor(radius / 4));
        const qPerPoint = totalQ / nPoints;
        for (let i = 0; i < nPoints; i++) {
            const angle = (i / nPoints) * Math.PI * 2;
            obj.charges.push(new PointCharge(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius,
                qPerPoint
            ));
        }
        obj.charges.forEach(c => c.radius = 4);
    }
    else if (type === 'rod') {
        const length = dimension;
        const nPoints = Math.max(5, Math.floor(length / 8));
        const qPerPoint = totalQ / nPoints;
        for (let i = 0; i < nPoints; i++) {
            const px = x - length / 2 + (i / (nPoints - 1)) * length;
            obj.charges.push(new PointCharge(px, y, qPerPoint));
        }
        obj.charges.forEach(c => c.radius = 4);
    }
    else if (type === 'sphere_non_cond') {
        const radius = dimension;
        const spacing = 12;
        let points = [];
        for (let dx = -radius; dx <= radius; dx += spacing) {
            for (let dy = -radius; dy <= radius; dy += spacing) {
                if (dx * dx + dy * dy <= radius * radius) {
                    points.push({ x: x + dx, y: y + dy });
                }
            }
        }
        if (points.length === 0) points.push({ x, y });
        const qPerPoint = totalQ / points.length;
        points.forEach(p => obj.charges.push(new PointCharge(p.x, p.y, qPerPoint)));
        obj.charges.forEach(c => c.radius = 3);
    }
    else if (type === 'sphere_cond') {
        const radius = dimension;
        const nPoints = Math.max(12, Math.floor(radius / 4));
        const qPerPoint = totalQ / nPoints;
        for (let i = 0; i < nPoints; i++) {
            const angle = (i / nPoints) * Math.PI * 2;
            let charge = new PointCharge(
                x + Math.cos(angle) * radius,
                y + Math.sin(angle) * radius,
                qPerPoint
            );
            charge.angle = angle;
            obj.charges.push(charge);
        }
        obj.charges.forEach(c => c.radius = 4);
    }

    obj.addToWorld();
    fieldLinesDirty = true;
}

function updateStats() {
    chargeCountDisplay.textContent = `Objects: ${objects.length} | Total Primitives: ${primitiveCharges.length}`;
}

// --- Field & Physics Math ---
function calculateFieldAndPotential(x, y) {
    let Ex = 0;
    let Ey = 0;
    let V = 0;

    for (let charge of primitiveCharges) {
        const dx = x - charge.x;
        const dy = y - charge.y;
        const rSq = dx * dx + dy * dy;

        if (rSq < 10) continue;

        const r = Math.sqrt(rSq);
        const eMag = (k * charge.q) / rSq;
        Ex += eMag * (dx / r);
        Ey += eMag * (dy / r);
        V += (k * charge.q) / r;
    }

    return { Ex, Ey, V };
}

// --- RK4 Field Line Integration ---
function getFieldDirClamped(x, y, sign) {
    let Ex = 0, Ey = 0;
    for (let charge of primitiveCharges) {
        const dx = x - charge.x;
        const dy = y - charge.y;
        let rSq = dx * dx + dy * dy;
        if (rSq < 50) rSq = 50;
        const r = Math.sqrt(rSq);
        const eMag = (k * charge.q) / rSq;
        Ex += eMag * (dx / r);
        Ey += eMag * (dy / r);
    }
    const mag = Math.sqrt(Ex * Ex + Ey * Ey);
    if (mag < 0.0001) return { dx: 0, dy: 0, mag: 0 };
    return { dx: (Ex / mag) * sign, dy: (Ey / mag) * sign, mag };
}

function computeFieldLines() {
    const stepSize = 5;
    const maxSteps = 350;

    const pad = 100 / viewport.zoom;
    const minWx = viewport.x - pad;
    const maxWx = viewport.x + width / viewport.zoom + pad;
    const minWy = viewport.y - pad;
    const maxWy = viewport.y + height / viewport.zoom + pad;

    const lines = [];

    for (const obj of objects) {
        const sign = obj.totalQ > 0 ? 1 : -1;
        const numLines = Math.min(24, Math.max(6, Math.floor(Math.abs(obj.totalQ) * 0.15)));
        const angleStep = (Math.PI * 2) / numLines;

        const emitRadius = obj.type === 'point'
            ? obj.charges[0].radius + 2
            : obj.dimension + 3;

        for (let i = 0; i < numLines; i++) {
            const angle = i * angleStep;
            let tx = obj.cx + Math.cos(angle) * emitRadius;
            let ty = obj.cy + Math.sin(angle) * emitRadius;

            const pts = [{ x: tx, y: ty }];
            let stopped = false;

            for (let step = 0; step < maxSteps && !stopped; step++) {
                const k1 = getFieldDirClamped(tx, ty, sign);
                if (k1.mag === 0) break;

                const k2 = getFieldDirClamped(tx + k1.dx * stepSize * 0.5, ty + k1.dy * stepSize * 0.5, sign);
                const k3 = getFieldDirClamped(tx + k2.dx * stepSize * 0.5, ty + k2.dy * stepSize * 0.5, sign);
                const k4 = getFieldDirClamped(tx + k3.dx * stepSize, ty + k3.dy * stepSize, sign);

                tx += (k1.dx + 2 * k2.dx + 2 * k3.dx + k4.dx) * stepSize / 6;
                ty += (k1.dy + 2 * k2.dy + 2 * k3.dy + k4.dy) * stepSize / 6;

                if (isNaN(tx) || isNaN(ty)) break;

                pts.push({ x: tx, y: ty });

                for (const otherObj of objects) {
                    if (otherObj === obj) continue;
                    for (const oc of otherObj.charges) {
                        const distSq = (tx - oc.x) ** 2 + (ty - oc.y) ** 2;
                        const stopR = Math.max(oc.radius, 6);
                        if (distSq < stopR * stopR) {
                            stopped = true;
                            break;
                        }
                    }
                    if (stopped) break;
                }

                if (pts.length > 10) {
                    for (const sc of obj.charges) {
                        const distSq = (tx - sc.x) ** 2 + (ty - sc.y) ** 2;
                        if (distSq < sc.radius * sc.radius) {
                            stopped = true;
                            break;
                        }
                    }
                }

                if (tx < minWx || tx > maxWx || ty < minWy || ty > maxWy) {
                    stopped = true;
                }
            }

            if (pts.length >= 2) {
                lines.push({ pts, color: obj.totalQ > 0 ? [255, 69, 58] : [10, 132, 255] });
            }
        }
    }

    return lines;
}

function drawFieldLines(ctx) {
    if (fieldLinesDirty) {
        fieldLineCache = computeFieldLines();
        fieldLinesDirty = false;
    }

    for (const line of fieldLineCache) {
        const { pts, color } = line;
        const totalPts = pts.length;
        const segSize = Math.max(1, Math.floor(totalPts / 5));

        for (let si = 0; si < totalPts - 1; si++) {
            const progress = si / totalPts;
            const alpha = 0.5 * (1 - progress * 0.8);
            if (si === 0) {
                ctx.beginPath();
                ctx.moveTo(pts[0].x, pts[0].y);
            }
            ctx.lineTo(pts[si + 1].x, pts[si + 1].y);

            if ((si + 1) % segSize === 0 || si === totalPts - 2) {
                ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha.toFixed(3)})`;
                ctx.lineWidth = 1.2;
                ctx.stroke();
                if (si < totalPts - 2) {
                    ctx.beginPath();
                    ctx.moveTo(pts[si + 1].x, pts[si + 1].y);
                }
            }
        }

        // Draw directional arrows along the line
        const arrowInterval = Math.max(15, Math.floor(totalPts / 5));
        for (let ai = arrowInterval; ai < totalPts - 2; ai += arrowInterval) {
            const p0 = pts[ai];
            const p1 = pts[ai + 1];
            const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
            const headLen = 5;
            const progress = ai / totalPts;
            const alpha = 0.5 * (1 - progress * 0.7);

            ctx.beginPath();
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p0.x - headLen * Math.cos(angle - Math.PI / 5), p0.y - headLen * Math.sin(angle - Math.PI / 5));
            ctx.moveTo(p0.x, p0.y);
            ctx.lineTo(p0.x - headLen * Math.cos(angle + Math.PI / 5), p0.y - headLen * Math.sin(angle + Math.PI / 5));
            ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }
    }
}

// --- Equipotential Lines (Enhanced) ---
function drawEquipotentialLines(ctx) {
    if (primitiveCharges.length === 0) return;

    const cellSize = 14;
    const wLeft = viewport.x;
    const wTop = viewport.y;
    const wRight = viewport.x + width / viewport.zoom;
    const wBottom = viewport.y + height / viewport.zoom;

    const cols = Math.ceil((wRight - wLeft) / cellSize) + 1;
    const rows = Math.ceil((wBottom - wTop) / cellSize) + 1;

    if (cols * rows > 18000) return;

    // Compute potential grid
    const grid = new Float32Array(cols * rows);
    let maxV = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const wx = wLeft + c * cellSize;
            const wy = wTop + r * cellSize;
            let V = 0;
            for (const charge of primitiveCharges) {
                const dx = wx - charge.x;
                const dy = wy - charge.y;
                const rSq = dx * dx + dy * dy;
                if (rSq < 50) { V += (k * charge.q) / Math.sqrt(50); continue; }
                V += (k * charge.q) / Math.sqrt(rSq);
            }
            grid[r * cols + c] = V;
            const absV = Math.abs(V);
            if (absV > maxV && absV < 1e6) maxV = absV;
        }
    }

    if (maxV < 1) return;

    // Logarithmic level spacing for better detail near charges
    const numLevels = 16;
    const levels = [];
    for (let i = 1; i <= numLevels; i++) {
        const t = i / (numLevels + 1);
        const v = maxV * (Math.pow(t, 0.6)); // power curve for more levels near zero
        levels.push(v);
        levels.push(-v);
    }
    levels.sort((a, b) => a - b);

    // Color functions
    const posColor = (alpha) => `rgba(239, 68, 68, ${alpha.toFixed(3)})`;
    const negColor = (alpha) => `rgba(59, 130, 246, ${alpha.toFixed(3)})`;
    const posColorFill = (alpha) => `rgba(239, 68, 68, ${alpha.toFixed(3)})`;
    const negColorFill = (alpha) => `rgba(59, 130, 246, ${alpha.toFixed(3)})`;

    // --- Draw filled contour bands (heat-map style) ---
    for (let li = 0; li < levels.length - 1; li++) {
        const lo = levels[li];
        const hi = levels[li + 1];
        const mid = (lo + hi) / 2;

        // Skip the zero-crossing band
        if (lo < 0 && hi > 0) continue;

        const intensity = Math.abs(mid) / maxV;
        const fillAlpha = Math.min(0.06, 0.005 + intensity * 0.055);

        if (fillAlpha < 0.003) continue;

        ctx.fillStyle = mid > 0 ? posColorFill(fillAlpha) : negColorFill(fillAlpha);

        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const v = grid[r * cols + c];
                if (v >= lo && v < hi) {
                    ctx.fillRect(
                        wLeft + c * cellSize,
                        wTop + r * cellSize,
                        cellSize, cellSize
                    );
                }
            }
        }
    }

    // --- Draw contour lines via marching squares ---
    for (const level of levels) {
        const isPositive = level > 0;
        const relIntensity = Math.abs(level) / maxV;
        const alpha = Math.min(0.55, 0.12 + 0.43 * relIntensity);
        const lineW = 0.8 + relIntensity * 1.2;

        ctx.beginPath();

        for (let r = 0; r < rows - 1; r++) {
            for (let c = 0; c < cols - 1; c++) {
                const tl = grid[r * cols + c];
                const tr = grid[r * cols + c + 1];
                const br = grid[(r + 1) * cols + c + 1];
                const bl = grid[(r + 1) * cols + c];

                let code = 0;
                if (tl > level) code |= 8;
                if (tr > level) code |= 4;
                if (br > level) code |= 2;
                if (bl > level) code |= 1;

                if (code === 0 || code === 15) continue;

                const x0 = wLeft + c * cellSize;
                const y0 = wTop + r * cellSize;

                const lerp = (a, b) => {
                    const d = b - a;
                    if (Math.abs(d) < 0.001) return 0.5;
                    return (level - a) / d;
                };

                const top = { x: x0 + lerp(tl, tr) * cellSize, y: y0 };
                const right = { x: x0 + cellSize, y: y0 + lerp(tr, br) * cellSize };
                const bottom = { x: x0 + lerp(bl, br) * cellSize, y: y0 + cellSize };
                const left = { x: x0, y: y0 + lerp(tl, bl) * cellSize };

                const segments = [];
                switch (code) {
                    case 1: case 14: segments.push([left, bottom]); break;
                    case 2: case 13: segments.push([bottom, right]); break;
                    case 3: case 12: segments.push([left, right]); break;
                    case 4: case 11: segments.push([top, right]); break;
                    case 5: segments.push([left, top], [bottom, right]); break;
                    case 6: case 9: segments.push([top, bottom]); break;
                    case 7: case 8: segments.push([left, top]); break;
                    case 10: segments.push([top, right], [left, bottom]); break;
                }

                for (const seg of segments) {
                    ctx.moveTo(seg[0].x, seg[0].y);
                    ctx.lineTo(seg[1].x, seg[1].y);
                }
            }
        }

        ctx.strokeStyle = isPositive ? posColor(alpha) : negColor(alpha);
        ctx.lineWidth = lineW;
        ctx.stroke();
    }

    // --- Draw contour voltage labels at right viewport edge ---
    ctx.save();
    ctx.font = `${9 / viewport.zoom}px Inter`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const level of levels) {
        if (Math.abs(level) < maxV * 0.05) continue; // skip near-zero labels
        // Find where this contour intersects the right edge of viewport
        const rightCol = cols - 2;
        for (let r = 0; r < rows - 1; r++) {
            const v0 = grid[r * cols + rightCol];
            const v1 = grid[(r + 1) * cols + rightCol];
            if ((v0 - level) * (v1 - level) < 0) {
                const t = (level - v0) / (v1 - v0);
                const labelY = wTop + (r + t) * cellSize;
                const labelX = wRight - 2 * cellSize;
                const isPos = level > 0;
                const alpha = Math.min(0.7, 0.2 + 0.5 * (Math.abs(level) / maxV));
                ctx.fillStyle = isPos ? posColor(alpha) : negColor(alpha);
                const realV = level * getVoltageScale();
                const labelText = formatSI(realV, 'V');
                ctx.fillText(labelText, labelX, labelY);
                break; // one label per level
            }
        }
    }
    ctx.restore();
}

// --- Dot Grid Background (Batched) ---
function drawGrid(ctx) {
    const dotRadius = 1.2;

    const wLeft = viewport.x;
    const wTop = viewport.y;
    const wRight = viewport.x + width / viewport.zoom;
    const wBottom = viewport.y + height / viewport.zoom;

    const startX = Math.floor(wLeft / gridSpacing) * gridSpacing;
    const startY = Math.floor(wTop / gridSpacing) * gridSpacing;

    // Batched drawing with Path2D
    const path = new Path2D();
    for (let gx = startX; gx <= wRight; gx += gridSpacing) {
        for (let gy = startY; gy <= wBottom; gy += gridSpacing) {
            path.moveTo(gx + dotRadius, gy);
            path.arc(gx, gy, dotRadius, 0, Math.PI * 2);
        }
    }
    ctx.fillStyle = 'rgba(244, 247, 251, 0.045)';
    ctx.fill(path);
}

// --- Render Loop ---
function render() {
    // Clear solid background transparently to show background canvas
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(-viewport.x, -viewport.y);

    // Draw grid
    if (toggleGrid.checked) {
        drawGrid(ctx);
    }

    // Draw equipotential lines
    if (toggleEquipotential.checked && primitiveCharges.length > 0) {
        drawEquipotentialLines(ctx);
    }

    // Draw field lines
    if (toggleFieldLines.checked && primitiveCharges.length > 0) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        drawFieldLines(ctx);
    }

    // Draw dashed connectors between objects
    if (toggleConnectors.checked && objects.length > 1) {
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1;

        for (let i = 0; i < objects.length; i++) {
            for (let j = i + 1; j < objects.length; j++) {
                let o1 = objects[i];
                let o2 = objects[j];

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.beginPath();
                ctx.moveTo(o1.cx, o1.cy);
                ctx.lineTo(o2.cx, o2.cy);
                ctx.stroke();

                let dx = o2.cx - o1.cx;
                let dy = o2.cy - o1.cy;
                let dist = Math.sqrt(dx * dx + dy * dy);
                let distDisplay = formatDistance(dist);
                let angleDeg = Math.atan2(-dy, dx) * (180 / Math.PI); // negate dy for standard math coords
                if (angleDeg < 0) angleDeg += 360;

                let midX = (o1.cx + o2.cx) / 2;
                let midY = (o1.cy + o2.cy) / 2;

                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = `11px monospace`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.save();
                ctx.translate(midX, midY - 14 / viewport.zoom);
                ctx.scale(1 / viewport.zoom, 1 / viewport.zoom);
                ctx.fillText(`${distDisplay} | ${angleDeg.toFixed(1)}°`, 0, 0);
                ctx.restore();
            }
        }
        ctx.setLineDash([]);
    }

    // Draw objects
    const showForce = toggleForceVectors.checked;
    for (let obj of objects) {
        if (obj.type === 'sphere_cond') obj.updateConductingPhysics();
        obj.draw(ctx, showForce);
    }

    ctx.restore();

    // --- Draw probe crosshair at mouse position (screen space) ---
    if (primitiveCharges.length > 0) {
        const sp = worldToScreen(mouseWorldX, mouseWorldY);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(sp.x - 15, sp.y);
        ctx.lineTo(sp.x + 15, sp.y);
        ctx.moveTo(sp.x, sp.y - 15);
        ctx.lineTo(sp.x, sp.y + 15);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    if (selectedObject) updateSelectedPhysics();

    requestAnimationFrame(render);
}

function updateSelectedPhysics() {
    if (!selectedObject || primitiveCharges.length === 0) {
        if (selForce) selForce.textContent = '—';
        if (selPotential) selPotential.textContent = '—';
        return;
    }

    // --- Net force on selected object from all external charges ---
    let Fx = 0;
    let Fy = 0;

    for (let currentCharge of selectedObject.charges) {
        for (let extC of primitiveCharges) {
            if (selectedObject.charges.includes(extC)) continue;

            const dx = currentCharge.x - extC.x;
            const dy = currentCharge.y - extC.y;
            const rSq = dx * dx + dy * dy;
            if (rSq < 100) continue;

            const r = Math.sqrt(rSq);
            const forceMag = (k * extC.q * currentCharge.q) / rSq;
            Fx += forceMag * (dx / r);
            Fy += forceMag * (dy / r);
        }
    }

    const fMagVisual = Math.sqrt(Fx * Fx + Fy * Fy);
    const realFMag = fMagVisual * getForceScale();

    // --- Potential at the object ---
    let realV;
    if (selectedObject.type === 'sphere_cond' && selectedObject.surfacePotential !== null) {
        // Conducting sphere: use exact surface potential from matrix solver
        realV = selectedObject.surfacePotential * getVoltageScale();
    } else {
        let objV = 0;
        for (let extC of primitiveCharges) {
            if (selectedObject.charges.includes(extC)) continue;
            const dx = selectedObject.cx - extC.x;
            const dy = selectedObject.cy - extC.y;
            const dist = Math.max(Math.sqrt(dx * dx + dy * dy), minRadius);
            objV += (k * extC.q) / dist;
        }
        realV = objV * getVoltageScale();
    }

    if (selForce) selForce.textContent = formatSI(realFMag, 'N');
    if (selPotential) selPotential.textContent = formatSI(realV, 'V');
}

// --- Interactive Editable Position ---
selPos.addEventListener('dblclick', () => {
    if (!selectedObject) return;

    // Prevent multiple double-clicks from nesting inputs
    if (selPos.querySelector('input')) return;

    const currentText = selPos.textContent.replace(' m', '').replace('(', '').replace(')', '');
    const parts = currentText.split(',');
    if (parts.length !== 2) return;

    const xStr = parts[0].trim();
    const yStr = parts[1].trim();

    selPos.innerHTML = `<input type="number" id="editPosX" value="${xStr}" step="0.1" style="width: 55px; background: rgba(0,0,0,0.5); color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; padding: 2px;"> , <input type="number" id="editPosY" value="${yStr}" step="0.1" style="width: 55px; background: rgba(0,0,0,0.5); color: #fff; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; padding: 2px;"> m`;

    const inputX = document.getElementById('editPosX');
    const inputY = document.getElementById('editPosY');
    if (!inputX || !inputY) return;

    inputX.focus();

    const finishEdit = () => {
        if (!selectedObject) return;
        const newX = parseFloat(inputX.value);
        const newY = parseFloat(inputY.value);
        if (!isNaN(newX) && !isNaN(newY)) {
            pushUndo();
            selectedObject.moveTo(newX * PIXELS_PER_UNIT, -newY * PIXELS_PER_UNIT);
            fieldLinesDirty = true;
        }
        selPos.textContent = formatCoord(selectedObject.cx, selectedObject.cy);
    };

    const cancelEdit = () => {
        if (!selectedObject) return;
        selPos.textContent = formatCoord(selectedObject.cx, selectedObject.cy);
    };

    const handleKey = (e) => {
        if (e.key === 'Enter') finishEdit();
        else if (e.key === 'Escape') cancelEdit();
    };

    inputX.addEventListener('keydown', handleKey);
    inputY.addEventListener('keydown', handleKey);
});

// --- Scale Selector Logic ---
const scaleUnitSelect = document.getElementById('scaleUnit');
const scaleReadoutUnit = document.getElementById('scaleReadoutUnit');
const chargeUnitSelect = document.getElementById('chargeUnit');
const chargeReadoutUnit = document.getElementById('chargeReadoutUnit');

function updateScaleUI() {
    const label = getUnitLabel();
    scaleReadoutUnit.textContent = label;

    // Update all HUD unit labels
    document.querySelectorAll('.hud-unit-label').forEach(s => s.textContent = label);

    // Refresh selected object display
    if (selectedObject) {
        selPos.textContent = formatCoord(selectedObject.cx, selectedObject.cy);
    }

    if (shapeDimensionInput && dimensionVal) {
        dimensionVal.textContent = formatDistance(parseInt(shapeDimensionInput.value));
    }

    fieldLinesDirty = true;
}

function updateChargeUI() {
    const label = getChargeLabel();
    if (chargeReadoutUnit) chargeReadoutUnit.textContent = label;

    // Update all charge-unit-label spans
    document.querySelectorAll('.charge-unit-label').forEach(s => s.textContent = label);

    // Refresh modal slider readout
    if (chargeMagnitudeInput && magnitudeVal) {
        magnitudeVal.textContent = `${chargeMagnitudeInput.value} ${label}`;
    }

    // Refresh selected object charge display
    if (selectedObject) {
        selCharge.textContent = `${selectedObject.totalQ > 0 ? '+' : ''}${selectedObject.totalQ} ${label}`;
    }

    fieldLinesDirty = true;
}

scaleUnitSelect.addEventListener('change', (e) => {
    currentScaleKey = e.target.value;
    updateScaleUI();
});

chargeUnitSelect.addEventListener('change', (e) => {
    currentChargeKey = e.target.value;
    updateChargeUI();
});

// Start visual loop
render();

// No initial charges — the canvas starts empty
updateStats();
updateWelcomeOverlay();

// Initialize labels to match slider defaults
dimensionVal.textContent = formatDistance(parseInt(shapeDimensionInput.value));
magnitudeVal.textContent = `${chargeMagnitudeInput.value} ${getChargeLabel()}`;

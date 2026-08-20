// Constants
const EPSILON0 = 8.854e-12; // F/m
const PI = Math.PI;

// Application State
let mode = 'physics'; // 'physics' or 'network'
let simTime = 0;
let animationFrameId;

// Camera System - Fixed position, no panning (capacitor is unmovable)
let camera = {
    zoom: 1.0
};

// Physics Explorer State
let pState = {
    type: 'parallel', 
    k: 1.0, 
    V: 12,
    A: 0.05, 
    d: 0.015, 
    cylA: 0.005,
    cylB: 0.015,
    cylL: 0.5,
    sphA: 0.005,
    sphB: 0.015,
    showField: true,
    showCharges: true,
    C: 0, Q: 0, U: 0, E: 0
};

// Network Builder State - Tree-based structure
let nState = {
    voltage: 12,
    network: null,  // Root node of tree structure
    totalC: 0,
    totalQ: 0,
    totalU: 0,
    selectedNodeId: null,
    nextId: 1
};

// DOM Elements
const canvas = document.getElementById('capacitorCanvas');
const ctx = canvas.getContext('2d');
const zoomLabel = document.getElementById('zoomLabel');

// ==========================================
// Initialization
// ==========================================
function init() {
    setupUI();
    setupZoomControls();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    updatePhysics();
    updateNetwork();
    
    requestAnimationFrame(renderLoop);
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
}

// ==========================================
// Formatting - Fixed μ unit bug
// ==========================================
function formatEng(val, unit) {
    if (val === 0) return `0.00 ${unit}`;
    const abs = Math.abs(val);
    if (abs >= 1) return `${val.toFixed(2)} ${unit}`;
    if (abs >= 1e-3) return `${(val * 1e3).toFixed(2)} m${unit}`;
    if (abs >= 1e-6) return `${(val * 1e6).toFixed(2)} \u03BC${unit}`;
    if (abs >= 1e-9) return `${(val * 1e9).toFixed(2)} n${unit}`;
    if (abs >= 1e-12) return `${(val * 1e12).toFixed(2)} p${unit}`;
    return `${(val * 1e15).toFixed(2)} f${unit}`;
}

// ==========================================
// Zoom Controls (no panning - capacitor is fixed)
// ==========================================
function setupZoomControls() {
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const wheel = e.deltaY < 0 ? 1 : -1;
        
        let zoomFactor = Math.exp(wheel * zoomIntensity);
        let newZoom = camera.zoom * zoomFactor;
        
        // Clamp
        if (newZoom < 0.3) newZoom = 0.3;
        if (newZoom > 4.0) newZoom = 4.0;
        
        camera.zoom = newZoom;
        updateZoomLabel();
    }, {passive: false});

    // Touch support: pinch-to-zoom
    let lastTouchDist = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            lastTouchDist = Math.sqrt(dx * dx + dy * dy);
        }
    }, {passive: false});
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (e.touches.length === 2 && lastTouchDist > 0) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const scale = dist / lastTouchDist;
            camera.zoom = Math.max(0.3, Math.min(4.0, camera.zoom * scale));
            lastTouchDist = dist;
            updateZoomLabel();
        }
    }, {passive: false});
    
    canvas.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) lastTouchDist = 0;
    });

    document.getElementById('btnZoomIn').addEventListener('click', () => {
        camera.zoom = Math.min(4.0, camera.zoom * 1.2);
        updateZoomLabel();
    });
    document.getElementById('btnZoomOut').addEventListener('click', () => {
        camera.zoom = Math.max(0.3, camera.zoom / 1.2);
        updateZoomLabel();
    });
    document.getElementById('btnZoomReset').addEventListener('click', () => {
        camera.zoom = 1.0;
        updateZoomLabel();
    });
}

function updateZoomLabel() {
    zoomLabel.innerText = `${Math.round(camera.zoom * 100)}%`;
}

// ==========================================
// Setup & Physics Logic
// ==========================================
function setupUI() {
    // Mode Switching
    document.getElementById('btnModePhysics').addEventListener('click', () => switchMode('physics'));
    document.getElementById('btnModeNetwork').addEventListener('click', () => switchMode('network'));

    // Modals & Panels
    document.getElementById('btnFormulas').addEventListener('click', () => {
        document.getElementById('formulasModal').classList.remove('hidden');
        if (window.MathJax) MathJax.typesetPromise();
    });
    document.getElementById('btnCloseFormulas').addEventListener('click', () => {
        document.getElementById('formulasModal').classList.add('hidden');
    });

    document.getElementById('toggleEField').addEventListener('change', e => pState.showField = e.target.checked);
    document.getElementById('toggleCharges').addEventListener('change', e => pState.showCharges = e.target.checked);

    // Explorer State Handlers
    document.getElementById('selGeometry').addEventListener('change', (e) => {
        pState.type = e.target.value;
        document.querySelectorAll('.dynamic-controls').forEach(el => el.classList.add('hidden'));
        document.getElementById(`controls-${pState.type}`).classList.remove('hidden');
        document.getElementById('rowE').classList.toggle('hidden', pState.type !== 'parallel');
        updatePhysics();
    });

    document.getElementById('selDielectric').addEventListener('change', (e) => {
        const val = e.target.value;
        const customGroup = document.getElementById('customDielectricGroup');
        if (val === 'custom') {
            customGroup.classList.remove('hidden');
            pState.k = parseFloat(document.getElementById('sliderK').value);
        } else {
            customGroup.classList.add('hidden');
            pState.k = parseFloat(val);
        }
        updatePhysics();
    });

    document.getElementById('sliderK').addEventListener('input', (e) => {
        pState.k = parseFloat(e.target.value);
        document.getElementById('valK').innerText = pState.k.toFixed(1);
        updatePhysics();
    });
    document.getElementById('sliderV').addEventListener('input', (e) => {
        pState.V = parseFloat(e.target.value);
        document.getElementById('valV').innerText = `${pState.V}V`;
        updatePhysics();
    });

    // Sliders definition
    const binders = [
        { slider: 'sliderArea', prop: 'A', idVal: 'valArea', format: v => `${v.toFixed(2)}m²` },
        { slider: 'sliderDist', prop: 'd', idVal: 'valDist', format: v => `${v.toFixed(1)}mm`, scale: 1/1000 },
        { slider: 'sliderCylA', prop: 'cylA', idVal: 'valCylA', format: v => `${v.toFixed(1)}mm`, scale: 1/1000, pair: 'sliderCylB', enforce: '<' },
        { slider: 'sliderCylB', prop: 'cylB', idVal: 'valCylB', format: v => `${v.toFixed(1)}mm`, scale: 1/1000, pair: 'sliderCylA', enforce: '>' },
        { slider: 'sliderCylL', prop: 'cylL', idVal: 'valCylL', format: v => `${v.toFixed(2)}m` },
        { slider: 'sliderSphA', prop: 'sphA', idVal: 'valSphA', format: v => `${v.toFixed(1)}mm`, scale: 1/1000, pair: 'sliderSphB', enforce: '<' },
        { slider: 'sliderSphB', prop: 'sphB', idVal: 'valSphB', format: v => `${v.toFixed(1)}mm`, scale: 1/1000, pair: 'sliderSphA', enforce: '>' }
    ];

    binders.forEach(b => {
        document.getElementById(b.slider).addEventListener('input', (e) => {
            let val = parseFloat(e.target.value);
            if (b.pair) {
                let pairVal = parseFloat(document.getElementById(b.pair).value);
                if (b.enforce === '<' && val >= pairVal) val = pairVal - 0.1;
                if (b.enforce === '>' && val <= pairVal) val = pairVal + 0.1;
                e.target.value = val;
            }
            pState[b.prop] = b.scale ? val * b.scale : val;
            document.getElementById(b.idVal).innerText = b.format(val);
            updatePhysics();
        });
    });

    // Network Handlers
    document.getElementById('netSliderV').addEventListener('input', (e) => {
        nState.voltage = parseFloat(e.target.value);
        document.getElementById('valNetV').innerText = `${nState.voltage}V`;
        updateNetwork();
    });
    document.getElementById('netSliderC').addEventListener('input', (e) => {
        document.getElementById('valNetC').innerHTML = `${e.target.value}&mu;F`;
    });
    document.getElementById('btnAddSeries').addEventListener('click', () => addNetworkNode('series'));
    document.getElementById('btnAddParallel').addEventListener('click', () => addNetworkNode('parallel'));

    document.getElementById('btnRemoveNode').addEventListener('click', removeSelectedNode);
    document.getElementById('btnClearNetwork').addEventListener('click', () => {
        nState.network = null;
        nState.selectedNodeId = null;
        nState.nextId = 1;
        updateNetworkList();
        updateNetwork();
    });
}

function switchMode(newMode) {
    mode = newMode;
    document.getElementById('btnModePhysics').className = mode === 'physics' ? 'btn-primary' : 'btn-secondary';
    document.getElementById('btnModeNetwork').className = mode === 'network' ? 'btn-primary' : 'btn-secondary';

    if (mode === 'physics') {
        document.getElementById('physicsSidebar').classList.remove('hidden');
        document.getElementById('physicsHud').classList.remove('hidden');
        document.getElementById('networkSidebar').classList.add('hidden');
        document.getElementById('networkHud').classList.add('hidden');
    } else {
        document.getElementById('physicsSidebar').classList.add('hidden');
        document.getElementById('physicsHud').classList.add('hidden');
        document.getElementById('networkSidebar').classList.remove('hidden');
        document.getElementById('networkHud').classList.remove('hidden');
    }

    // Reset zoom when changing modes
    camera.zoom = 1.0;
    updateZoomLabel();
}

// ==========================================
// Physics Calculations - Improved logic
// ==========================================
function updatePhysics() {
    const eps = pState.k * EPSILON0;
    
    if (pState.type === 'parallel') {
        // C = κε₀A/d
        pState.C = (eps * pState.A) / pState.d;
        // E = V/d (uniform field between plates)
        pState.E = pState.V / pState.d; 
    } else if (pState.type === 'cylindrical') {
        // C = 2πκε₀L / ln(b/a)
        const ratio = pState.cylB / pState.cylA;
        if (ratio <= 1) { pState.C = 0; pState.E = 0; }
        else {
            pState.C = (2 * PI * eps * pState.cylL) / Math.log(ratio);
            // E_max at inner conductor surface: E = V / (a·ln(b/a))
            pState.E = pState.V / (pState.cylA * Math.log(ratio));
        }
    } else if (pState.type === 'spherical') {
        // C = 4πκε₀(ab/(b-a))
        const diff = pState.sphB - pState.sphA;
        if (diff <= 0) { pState.C = 0; pState.E = 0; }
        else {
            pState.C = 4 * PI * eps * ((pState.sphA * pState.sphB) / diff);
            // E_max at inner surface: E = V·b / (a·(b-a))
            pState.E = (pState.V * pState.sphB) / (pState.sphA * diff);
        }
    }
    
    // Q = CV, U = ½CV²
    pState.Q = pState.C * pState.V;
    pState.U = 0.5 * pState.C * pState.V * pState.V;

    // Update HUD
    document.getElementById('hudC').innerText = formatEng(pState.C, 'F');
    document.getElementById('hudQ').innerText = formatEng(pState.Q, 'C');
    document.getElementById('hudU').innerText = formatEng(pState.U, 'J');
    document.getElementById('hudE').innerText = formatEng(pState.E, 'V/m');
}

// Tree-based network node structure
// Each node is either:
//  { id, type: 'cap', C: farads }
//  { id, type: 'series', children: [...nodes] }
//  { id, type: 'parallel', children: [...nodes] }

function createCapNode(cFarads) {
    return { id: nState.nextId++, type: 'cap', C: cFarads };
}

function createGroupNode(groupType, children) {
    return { id: nState.nextId++, type: groupType, children: children || [] };
}

function addNetworkNode(conType) {
    const capUF = parseFloat(document.getElementById('netSliderC').value) * 1e-6;
    const newCap = createCapNode(capUF);
    
    if (!nState.network) {
        // First node - just a standalone capacitor
        nState.network = newCap;
    } else if (nState.selectedNodeId) {
        // Add relative to selected node
        const parent = findParent(nState.network, nState.selectedNodeId);
        if (parent && (parent.type === 'series' || parent.type === 'parallel')) {
            if (conType === parent.type) {
                // Same type as parent group - just add alongside
                parent.children.push(newCap);
            } else {
                // Different type - wrap selected + new in a new group
                const selectedNode = findNodeById(nState.network, nState.selectedNodeId);
                const selectedIdx = parent.children.indexOf(selectedNode);
                const wrapper = createGroupNode(conType, [selectedNode, newCap]);
                parent.children[selectedIdx] = wrapper;
            }
        } else if (!parent) {
            // Selected is root
            const wrapper = createGroupNode(conType, [nState.network, newCap]);
            nState.network = wrapper;
        }
    } else {
        // No selection - wrap root with new in a group
        if (nState.network.type === conType) {
            // Root is already same group type, just append
            nState.network.children.push(newCap);
        } else if (nState.network.type === 'cap') {
            // Wrap root cap + new cap in group
            nState.network = createGroupNode(conType, [nState.network, newCap]);
        } else {
            // Root is a different group type, wrap everything
            nState.network = createGroupNode(conType, [nState.network, newCap]);
        }
    }
    
    nState.selectedNodeId = newCap.id;
    updateNetworkList();
    updateNetwork();
    autoFitNetworkZoom();
}

function addGroupNode(groupType) {
    const capUF = parseFloat(document.getElementById('netSliderC').value) * 1e-6;
    const cap1 = createCapNode(capUF);
    const cap2 = createCapNode(capUF);
    const group = createGroupNode(groupType, [cap1, cap2]);
    
    if (!nState.network) {
        nState.network = group;
    } else if (nState.selectedNodeId) {
        const parent = findParent(nState.network, nState.selectedNodeId);
        if (parent && (parent.type === 'series' || parent.type === 'parallel')) {
            // Add the group as a sibling next to selected
            const selectedNode = findNodeById(nState.network, nState.selectedNodeId);
            const idx = parent.children.indexOf(selectedNode);
            parent.children.splice(idx + 1, 0, group);
        } else {
            // Selected is root - wrap in series
            nState.network = createGroupNode('series', [nState.network, group]);
        }
    } else {
        // No selection - add to root
        if (nState.network.type === 'series' || nState.network.type === 'parallel') {
            nState.network.children.push(group);
        } else {
            nState.network = createGroupNode('series', [nState.network, group]);
        }
    }
    
    nState.selectedNodeId = group.id;
    updateNetworkList();
    updateNetwork();
    autoFitNetworkZoom();
}

function removeSelectedNode() {
    if (!nState.selectedNodeId || !nState.network) return;
    
    if (nState.network.id === nState.selectedNodeId) {
        nState.network = null;
        nState.selectedNodeId = null;
    } else {
        const parent = findParent(nState.network, nState.selectedNodeId);
        if (parent) {
            parent.children = parent.children.filter(c => c.id !== nState.selectedNodeId);
            // If parent has only 1 child left, collapse it
            if (parent.children.length === 1) {
                collapseGroupNode(parent);
            }
            nState.selectedNodeId = null;
        }
    }
    
    updateNetworkList();
    updateNetwork();
    autoFitNetworkZoom();
}

function collapseGroupNode(node) {
    if (node.children && node.children.length === 1) {
        const child = node.children[0];
        // Replace this node in the parent with the single child
        const grandparent = findParent(nState.network, node.id);
        if (grandparent) {
            const idx = grandparent.children.indexOf(node);
            grandparent.children[idx] = child;
        } else if (nState.network.id === node.id) {
            nState.network = child;
        }
    }
}

function findNodeById(node, id) {
    if (!node) return null;
    if (node.id === id) return node;
    if (node.children) {
        for (const child of node.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
    }
    return null;
}

function findParent(root, targetId) {
    if (!root || !root.children) return null;
    for (const child of root.children) {
        if (child.id === targetId) return root;
        const found = findParent(child, targetId);
        if (found) return found;
    }
    return null;
}

function computeCapacitance(node) {
    if (!node) return 0;
    if (node.type === 'cap') {
        node._C = node.C;
        return node._C;
    }
    if (node.type === 'series') {
        let invSum = 0;
        for (const child of node.children) {
            const c = computeCapacitance(child);
            if (c > 0) invSum += 1.0 / c;
        }
        node._C = invSum > 0 ? 1.0 / invSum : 0;
        return node._C;
    }
    if (node.type === 'parallel') {
        let sum = 0;
        for (const child of node.children) {
            sum += computeCapacitance(child);
        }
        node._C = sum;
        return node._C;
    }
    return 0;
}

function distributeVoltageCharge(node, V) {
    if (!node) return;
    node._V = V;
    node._Q = (node._C || 0) * V;
    node._U = 0.5 * (node._C || 0) * V * V;

    if (node.type === 'parallel') {
        for (const child of node.children) {
            distributeVoltageCharge(child, V);
        }
    } else if (node.type === 'series') {
        for (const child of node.children) {
            if (child._C > 0) {
                // Series components share the total group charge: Q_eq = C_eq * V_total
                distributeVoltageCharge(child, node._Q / child._C);
            } else {
                distributeVoltageCharge(child, 0);
            }
        }
    }
}

function countNodes(node) {
    if (!node) return 0;
    if (node.type === 'cap') return 1;
    let count = 0;
    if (node.children) {
        for (const child of node.children) count += countNodes(child);
    }
    return count;
}

// Build the network list display in the sidebar
function updateNetworkList() {
    const listEl = document.getElementById('networkList');
    if (!listEl) return;
    
    if (!nState.network) {
        listEl.innerHTML = '<p style="color:#64748b; font-size:0.75rem; text-align:center;">No components yet</p>';
        return;
    }
    
    listEl.innerHTML = renderNodeHTML(nState.network, 0);
    
    // Bind click events
    listEl.querySelectorAll('.net-node-item').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(el.dataset.nodeId);
            nState.selectedNodeId = (nState.selectedNodeId === id) ? null : id;
            updateNetworkList();
            updateNetwork();
        });
    });
}

function renderNodeHTML(node, depth) {
    const indent = depth * 12;
    const isSelected = nState.selectedNodeId === node.id;
    const selectedClass = isSelected ? 'selected' : '';
    
    if (node.type === 'cap') {
        return `<div class="net-node-item cap-node ${selectedClass}" data-node-id="${node.id}" style="padding-left:${indent + 8}px">
            [C] ${formatEng(node.C, 'F')}
        </div>`;
    }
    
    const typeLabel = node.type === 'series' ? 'Series' : 'Parallel';
    const typePrefix = node.type === 'series' ? '[S]' : '[P]';
    let html = `<div class="net-node-item group-node ${selectedClass}" data-node-id="${node.id}" style="padding-left:${indent + 8}px">
        ${typePrefix} ${typeLabel} (${node.children.length})
    </div>`;
    
    for (const child of node.children) {
        html += renderNodeHTML(child, depth + 1);
    }
    return html;
}

// Auto-fit zoom so the entire network is visible and centered
function autoFitNetworkZoom() {
    if (!nState.network) {
        camera.zoom = 1.0;
        updateZoomLabel();
        return;
    }
    
    const nodeCount = countNodes(nState.network);
    const spacing = 160;
    const batteryWidth = 120;
    const totalWidth = batteryWidth + Math.max(1, nodeCount) * spacing + 120;
    
    const isMobile = window.innerWidth <= 768;
    const availableWidth = isMobile ? window.innerWidth - 40 : window.innerWidth - 380;
    
    const fitZoom = availableWidth / totalWidth;
    camera.zoom = Math.min(1.5, Math.max(0.3, fitZoom));
    updateZoomLabel();
}

function getSubscript(num) {
    const subs = {'0':'₀','1':'₁','2':'₂','3':'₃','4':'₄','5':'₅','6':'₆','7':'₇','8':'₈','9':'₉'};
    return String(num).split('').map(c => subs[c] || c).join('');
}

function getNodePath(root, targetId) {
    if (!root) return null;
    if (root.id === targetId) {
        let name = root.type === 'cap' ? `C` : (root.type === 'series' ? 'Series' : 'Parallel');
        return [name];
    }
    if (root.children) {
        for (let i = 0; i < root.children.length; i++) {
            const child = root.children[i];
            const path = getNodePath(child, targetId);
            if (path) {
                let currentName = root.type === 'series' ? 'Series' : 'Parallel';
                let childIndex = i + 1;
                let sub = getSubscript(childIndex);
                let childName = child.type === 'cap' ? `C${sub}` : (child.type === 'series' ? `Series${sub}` : `Parallel${sub}`);
                path[0] = childName;
                return [currentName, ...path];
            }
        }
    }
    return null;
}

function updateNetwork() {
    if (nState.network) {
        nState.totalC = computeCapacitance(nState.network);
        nState.totalQ = nState.totalC * nState.voltage;
        nState.totalU = 0.5 * nState.totalC * nState.voltage * nState.voltage;
        distributeVoltageCharge(nState.network, nState.voltage);
    } else {
        nState.totalC = 0; nState.totalQ = 0; nState.totalU = 0;
    }

    document.getElementById('hudNetC').innerText = formatEng(nState.totalC, 'F');
    document.getElementById('hudNetQ').innerText = formatEng(nState.totalQ, 'C');
    document.getElementById('hudNetU').innerText = formatEng(nState.totalU, 'J');

    const selWrapper = document.getElementById('selCapInfoWrapper');
    if (nState.selectedNodeId && nState.network) {
        const selNode = findNodeById(nState.network, nState.selectedNodeId);
        if (selNode) {
            selWrapper.classList.remove('hidden');
            let typeName = selNode.type === 'cap' ? 'Capacitor' : (selNode.type === 'series' ? 'Series Group' : 'Parallel Group');
            
            const pathArray = getNodePath(nState.network, nState.selectedNodeId);
            const pathText = pathArray ? pathArray.join(' > ') : typeName;
            document.getElementById('selNodeTitle').textContent = `[${pathText}]`;
            
            document.getElementById('selNetC').innerText = formatEng(selNode._C || 0, 'F');
            document.getElementById('selNetV').innerText = formatEng(selNode._V || 0, 'V');
            document.getElementById('selNetQ').innerText = formatEng(selNode._Q || 0, 'C');
            document.getElementById('selNetU').innerText = formatEng(selNode._U || 0, 'J');
        } else {
            selWrapper.classList.add('hidden');
        }
    } else {
        if (selWrapper) selWrapper.classList.add('hidden');
    }
}

// ==========================================
// Rendering Engine
// ==========================================
function renderLoop() {
    simTime += 0.016; // ~60fps time step
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width;
    const h = canvas.height;
    
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    
    ctx.save();
    // Scale for DPR
    ctx.scale(dpr, dpr);
    
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    // Center of visible area - offset right on desktop to account for sidebar
    // On mobile (sidebar at bottom), center normally
    const isMobile = vw <= 768;
    const centerX = isMobile ? vw / 2 : vw / 2 + 80;
    const centerY = isMobile ? vh / 2 - 60 : vh / 2;  // Shift up slightly on mobile for bottom sidebar
    
    // Apply zoom centered
    ctx.translate(centerX, centerY);
    ctx.scale(camera.zoom, camera.zoom);

    if (mode === 'physics') renderPhysics3D();
    else renderNetwork3D();
    
    ctx.restore();
    
    animationFrameId = requestAnimationFrame(renderLoop);
}

// ==========================================
// Isometric Drawing Helpers
// ==========================================

// Draw isometric block (3D box) with front, side, and top faces
function drawIsoBlock(ctx, x, y, width, height, depth, colorFront, colorSide, colorTop) {
    // Front face
    ctx.fillStyle = colorFront;
    ctx.fillRect(x, y, width, height);
    // Side face
    ctx.fillStyle = colorSide;
    ctx.beginPath(); 
    ctx.moveTo(x+width, y); 
    ctx.lineTo(x+width+depth, y-depth*0.5); 
    ctx.lineTo(x+width+depth, y+height-depth*0.5); 
    ctx.lineTo(x+width, y+height); 
    ctx.closePath();
    ctx.fill();
    // Top face
    ctx.fillStyle = colorTop;
    ctx.beginPath(); 
    ctx.moveTo(x, y); 
    ctx.lineTo(x+depth, y-depth*0.5); 
    ctx.lineTo(x+width+depth, y-depth*0.5); 
    ctx.lineTo(x+width, y); 
    ctx.closePath();
    ctx.fill();
}

// Draw an isometric cylinder using stacked ellipses for a proper 3D look
function drawIsoCylinder(ctx, cx, cy, radiusX, radiusY, length, colorBody, colorTop, colorEdge, direction = 'horizontal') {
    if (direction === 'horizontal') {
        // Cylinder extends along X axis (left-right), so we see circular face from the side
        // Body: draw extruded shape
        const bodyGrad = ctx.createLinearGradient(cx, cy - radiusY, cx, cy + radiusY);
        bodyGrad.addColorStop(0, colorTop);
        bodyGrad.addColorStop(0.3, colorBody);
        bodyGrad.addColorStop(0.7, colorBody);
        bodyGrad.addColorStop(1, colorEdge);
        
        // Back ellipse (partially hidden)
        ctx.fillStyle = colorEdge;
        ctx.beginPath();
        ctx.ellipse(cx + length, cy, radiusX * 0.6, radiusY, 0, 0, PI * 2);
        ctx.fill();
        
        // Body rectangle between ellipses
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(cx, cy - radiusY);
        ctx.lineTo(cx + length, cy - radiusY);
        ctx.lineTo(cx + length, cy + radiusY);
        ctx.lineTo(cx, cy + radiusY);
        ctx.closePath();
        ctx.fill();
        
        // Top highlight
        ctx.fillStyle = colorTop;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(cx, cy - radiusY, length, radiusY * 0.4);
        ctx.globalAlpha = 1.0;
        
        // Front ellipse
        const frontGrad = ctx.createRadialGradient(cx - radiusX*0.2, cy - radiusY*0.2, 0, cx, cy, radiusX);
        frontGrad.addColorStop(0, colorTop);
        frontGrad.addColorStop(0.6, colorBody);
        frontGrad.addColorStop(1, colorEdge);
        ctx.fillStyle = frontGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, radiusX * 0.6, radiusY, 0, 0, PI * 2);
        ctx.fill();
        
        // Edge stroke
        ctx.strokeStyle = colorEdge;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, cy, radiusX * 0.6, radiusY, 0, 0, PI * 2);
        ctx.stroke();
        
    } else {
        // Vertical cylinder (used for isometric view)
        // This draws a cylinder standing up with isometric projection
        const isoSkew = 0.4; // Isometric squash factor for ellipses
        
        // Back ellipse (top of cylinder, partially behind body)
        ctx.fillStyle = colorEdge;
        ctx.beginPath();
        ctx.ellipse(cx, cy - length/2, radiusX, radiusX * isoSkew, 0, 0, PI * 2);
        ctx.fill();
        
        // Body gradient
        const bodyGrad = ctx.createLinearGradient(cx - radiusX, 0, cx + radiusX, 0);
        bodyGrad.addColorStop(0, colorEdge);
        bodyGrad.addColorStop(0.2, colorBody);
        bodyGrad.addColorStop(0.5, colorTop);
        bodyGrad.addColorStop(0.8, colorBody);
        bodyGrad.addColorStop(1, colorEdge);
        
        // Body (connect top and bottom ellipses)
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.moveTo(cx - radiusX, cy - length/2);
        ctx.lineTo(cx - radiusX, cy + length/2);
        ctx.ellipse(cx, cy + length/2, radiusX, radiusX * isoSkew, 0, PI, 0, true);
        ctx.lineTo(cx + radiusX, cy - length/2);
        ctx.closePath();
        ctx.fill();
        
        // Front ellipse (bottom cap, only bottom half visible)
        ctx.fillStyle = colorEdge;
        ctx.beginPath();
        ctx.ellipse(cx, cy + length/2, radiusX, radiusX * isoSkew, 0, 0, PI);
        ctx.fill();
        
        // Top ellipse (fully visible on top)
        const topGrad = ctx.createRadialGradient(cx - radiusX*0.2, cy - length/2 - radiusX*isoSkew*0.2, 0, cx, cy - length/2, radiusX);
        topGrad.addColorStop(0, colorTop);
        topGrad.addColorStop(0.7, colorBody);
        topGrad.addColorStop(1, colorEdge);
        ctx.fillStyle = topGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy - length/2, radiusX, radiusX * isoSkew, 0, 0, PI * 2);
        ctx.fill();
        
        // Edge strokes
        ctx.strokeStyle = colorEdge;
        ctx.lineWidth = 1.5;
        // Left edge
        ctx.beginPath(); ctx.moveTo(cx - radiusX, cy - length/2); ctx.lineTo(cx - radiusX, cy + length/2); ctx.stroke();
        // Right edge
        ctx.beginPath(); ctx.moveTo(cx + radiusX, cy - length/2); ctx.lineTo(cx + radiusX, cy + length/2); ctx.stroke();
        // Top ellipse outline
        ctx.beginPath(); ctx.ellipse(cx, cy - length/2, radiusX, radiusX * isoSkew, 0, 0, PI * 2); ctx.stroke();
        // Bottom ellipse (front half only)
        ctx.beginPath(); ctx.ellipse(cx, cy + length/2, radiusX, radiusX * isoSkew, 0, 0, PI); ctx.stroke();
    }
}

// ==========================================
// Dynamic Field Lines with Moving Arrows
// ==========================================

function drawArrowHead(x, y, angle, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.6, -size * 0.5);
    ctx.lineTo(-size * 0.3, 0);
    ctx.lineTo(-size * 0.6, size * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawFieldLineWithArrows(x1, y1, x2, y2, color, arrowColor, numArrows) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    
    // Draw the line itself
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Draw animated arrows along the line
    const speed = 0.3; // arrows per second travel speed
    for (let i = 0; i < numArrows; i++) {
        // Each arrow has a phase offset
        let t = ((simTime * speed) + (i / numArrows)) % 1.0;
        let ax = x1 + dx * t;
        let ay = y1 + dy * t;
        
        // Fade in/out near ends
        let alpha = 1.0;
        if (t < 0.1) alpha = t / 0.1;
        if (t > 0.9) alpha = (1.0 - t) / 0.1;
        
        ctx.globalAlpha = alpha;
        drawArrowHead(ax, ay, angle, 6, arrowColor);
        ctx.globalAlpha = 1.0;
    }
}

// Radial field lines for cylindrical/spherical
function drawRadialFieldLine(cx, cy, startR, endR, angle, color, arrowColor, numArrows) {
    const x1 = cx + Math.cos(angle) * startR;
    const y1 = cy + Math.sin(angle) * startR;
    const x2 = cx + Math.cos(angle) * endR;
    const y2 = cy + Math.sin(angle) * endR;
    
    drawFieldLineWithArrows(x1, y1, x2, y2, color, arrowColor, numArrows);
}

// ==========================================
// Physics Mode Rendering
// ==========================================
function renderPhysics3D() {
    const d = pState.d * 1000 * 15; // Visual separation scale
    const baseW = 18; // Plate thickness (reduced for sleeker look)
    
    if (pState.type === 'parallel') {
        renderParallelPlate(d, baseW);
    } else if (pState.type === 'cylindrical') {
        renderCylindrical();
    } else if (pState.type === 'spherical') {
        renderSpherical();
    }
}

function renderParallelPlate(d, baseW) {
    const plateH = 200 * Math.max(0.4, pState.A); 
    const isoDepth = 150;
    
    // Center the plates symmetrically: total span = baseW + d + baseW
    const totalSpan = baseW + d + baseW;
    const leftEdge = -totalSpan / 2;
    
    // Positive plate (+) is the LEFT plate, Negative (-) is the RIGHT plate
    // This allows + to be drawn further back in the isometric depth properly
    const posX = leftEdge;                    // Left plate = positive  
    const negX = leftEdge + baseW + d;        // Right plate = negative
    const gapStartX = leftEdge + baseW;       // Where the gap between plates begins
    const gapEndX = leftEdge + baseW + d;     // Where the gap ends
    
    ctx.lineWidth = 1;

    // Draw Left Plate (+, positive) first (furthest behind in isometric view left-to-right)
    const posGrad = ctx.createLinearGradient(posX, -plateH/2, posX + baseW, plateH/2);
    posGrad.addColorStop(0, '#fca5a5');
    posGrad.addColorStop(0.3, '#ef4444');
    posGrad.addColorStop(0.7, '#dc2626');
    posGrad.addColorStop(1, '#991b1b');
    drawIsoBlock(ctx, posX, -plateH/2, baseW, plateH, isoDepth, posGrad, '#991b1b', '#fca5a5');
    
    // Subtle edge highlight on positive plate
    ctx.strokeStyle = 'rgba(252, 165, 165, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(posX, -plateH/2);
    ctx.lineTo(posX, plateH/2);
    ctx.stroke();

    // Dielectric (Glassy block between plates)
    if (pState.k > 1.0) {
        ctx.globalAlpha = 0.5;
        drawIsoBlock(ctx, gapStartX, -plateH/2, d, plateH, isoDepth, 
            'rgba(34, 211, 238, 0.4)', 'rgba(6, 182, 212, 0.6)', 'rgba(103, 232, 249, 0.5)');
        ctx.globalAlpha = 1.0;
        ctx.fillStyle = '#fff'; ctx.textAlign='center'; ctx.font='bold 20px "SF Mono"';
        ctx.fillText(`κ=${pState.k}`, 0, 0);
    }

    // Draw Dynamic Field Lines with Moving Arrows between plates (+ to − direction: left to right)
    if (pState.showField && pState.V > 0) {
        const fieldColor = 'rgba(253, 224, 71, 0.4)';
        const arrowColor = '#fde047';
        const amtY = Math.max(3, Math.floor(plateH / 35));
        const startX = gapStartX + 5;
        const endX = gapEndX - 5;
        
        for (let j = 0; j < 3; j++) {
            let zOff = j * (isoDepth / 3);
            let isoXOff = zOff;
            let isoYOff = -(zOff * 0.4);
            
            for (let i = 0; i <= amtY; i++) {
                let py = (-plateH/2 + 15) + i * ((plateH - 30) / amtY);
                
                // Field direction: from + plate to − plate (left to right)
                let lx1 = startX + isoXOff;   // start near + plate
                let ly1 = py + isoYOff;
                let lx2 = endX + isoXOff;     // end near − plate
                let ly2 = py + isoYOff;
                
                // Reduce alpha for depth layers
                ctx.globalAlpha = 1.0 - j * 0.25;
                drawFieldLineWithArrows(lx1, ly1, lx2, ly2, fieldColor, arrowColor, 3);
                ctx.globalAlpha = 1.0;
            }
        }
    }

    // Draw Right Plate (−, negative) last (closest in isometric view)
    const negGrad = ctx.createLinearGradient(negX, -plateH/2, negX + baseW, plateH/2);
    negGrad.addColorStop(0, '#93c5fd');
    negGrad.addColorStop(0.3, '#3b82f6');
    negGrad.addColorStop(0.7, '#2563eb');
    negGrad.addColorStop(1, '#1e3a8a');
    drawIsoBlock(ctx, negX, -plateH/2, baseW, plateH, isoDepth, negGrad, '#1e3a8a', '#93c5fd');
    
    // Subtle edge highlight on negative plate
    ctx.strokeStyle = 'rgba(147, 197, 253, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(negX, -plateH/2);
    ctx.lineTo(negX, plateH/2);
    ctx.stroke();

    // Draw Charges on plate surfaces
    if (pState.showCharges && pState.V > 0) {
        ctx.font = 'bold 16px Inter';
        ctx.textAlign = 'center';
        const chargeSpacing = 35;
        const numCharges = Math.max(2, Math.floor(plateH / chargeSpacing));
        
        for (let j = 0; j < 3; j++) {
            let zOff = j * (isoDepth / 3);
            let isoXOff = zOff;
            let isoYOff = -(zOff * 0.4);
            let alpha = 1.0 - j * 0.2;
            
            ctx.globalAlpha = alpha;
            for (let i = 1; i < numCharges; i++) {
                let y = (-plateH/2 + 10) + i * chargeSpacing + isoYOff;
                
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                // + on positive plate (left, inner face)
                ctx.fillText('+', posX + baseW - 8 + isoXOff, y + 6);
                // − on negative plate (right, inner face)
                ctx.fillText('−', negX + 8 + isoXOff, y + 6);
            }
        }
        ctx.globalAlpha = 1.0;
    }
    
    // Labels below plates
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 14px "SF Mono"'; ctx.textAlign = 'center';
    ctx.fillText('+', posX + baseW/2, plateH/2 + 25);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('−', negX + baseW/2, plateH/2 + 25);
}

function renderCylindrical() {
    const a = pState.cylA * 1000 * 8;   // Inner radius visual
    const b = pState.cylB * 1000 * 8;   // Outer radius visual
    const L = pState.cylL * 350;        // Visual length
    
    // Isometric angle
    const isoSkew = 0.4;
    
    // ---- Outer Cylinder (transparent shell, back half first) ----
    // Back half of outer cylinder body
    const outerBodyGrad = ctx.createLinearGradient(-b, 0, b, 0);
    outerBodyGrad.addColorStop(0, 'rgba(59, 130, 246, 0.5)');
    outerBodyGrad.addColorStop(0.15, 'rgba(59, 130, 246, 0.15)');
    outerBodyGrad.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)');
    outerBodyGrad.addColorStop(0.85, 'rgba(59, 130, 246, 0.15)');
    outerBodyGrad.addColorStop(1, 'rgba(59, 130, 246, 0.5)');
    
    // Back part of outer cylinder body
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = outerBodyGrad;
    ctx.beginPath();
    ctx.moveTo(-b, -L/2);
    ctx.lineTo(-b, L/2);
    ctx.ellipse(0, L/2, b, b * isoSkew, 0, PI, 0, true);
    ctx.lineTo(b, -L/2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
    
    // Top ellipse of outer cylinder (back half)
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.ellipse(0, -L/2, b, b * isoSkew, 0, PI, 0);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // ---- Dielectric fill between inner and outer ----
    if (pState.k > 1.0) {
        const dielGrad = ctx.createLinearGradient(-b, 0, b, 0);
        dielGrad.addColorStop(0, 'rgba(34, 211, 238, 0.35)');
        dielGrad.addColorStop(0.3, 'rgba(34, 211, 238, 0.08)');
        dielGrad.addColorStop(0.7, 'rgba(34, 211, 238, 0.08)');
        dielGrad.addColorStop(1, 'rgba(34, 211, 238, 0.35)');
        
        ctx.fillStyle = dielGrad;
        ctx.beginPath();
        ctx.moveTo(-b, -L/2);
        ctx.lineTo(-b, L/2);
        ctx.ellipse(0, L/2, b, b * isoSkew, 0, PI, 0, true);
        ctx.lineTo(b, -L/2);
        ctx.ellipse(0, -L/2, b, b * isoSkew, 0, 0, PI, true);
        ctx.closePath();
        ctx.fill();
        
        // Dielectric label
        ctx.fillStyle = '#67e8f9'; ctx.font = 'bold 16px "SF Mono"'; ctx.textAlign = 'center';
        ctx.fillText(`κ=${pState.k}`, 0, L/2 + b * isoSkew + 25);
    }
    
    // ---- Inner Cylinder (solid conductor +) ----
    const innerGrad = ctx.createLinearGradient(-a, 0, a, 0);
    innerGrad.addColorStop(0, '#991b1b');
    innerGrad.addColorStop(0.3, '#ef4444');
    innerGrad.addColorStop(0.5, '#fca5a5');
    innerGrad.addColorStop(0.7, '#ef4444');
    innerGrad.addColorStop(1, '#991b1b');
    
    // Inner cylinder body
    ctx.fillStyle = innerGrad;
    ctx.beginPath();
    ctx.moveTo(-a, -L/2);
    ctx.lineTo(-a, L/2);
    ctx.ellipse(0, L/2, a, a * isoSkew, 0, PI, 0, true);
    ctx.lineTo(a, -L/2);
    ctx.closePath();
    ctx.fill();
    
    // Bottom cap of inner cylinder (front half)
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.ellipse(0, L/2, a, a * isoSkew, 0, 0, PI);
    ctx.fill();
    
    // Top cap of inner cylinder  
    const topCapGrad = ctx.createRadialGradient(-a*0.2, -L/2 - a*isoSkew*0.2, 0, 0, -L/2, a);
    topCapGrad.addColorStop(0, '#fca5a5');
    topCapGrad.addColorStop(0.6, '#ef4444');
    topCapGrad.addColorStop(1, '#991b1b');
    ctx.fillStyle = topCapGrad;
    ctx.beginPath();
    ctx.ellipse(0, -L/2, a, a * isoSkew, 0, 0, PI * 2);
    ctx.fill();
    
    // Inner cylinder edge strokes
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-a, -L/2); ctx.lineTo(-a, L/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(a, -L/2); ctx.lineTo(a, L/2); ctx.stroke();
    ctx.strokeStyle = '#fca5a5';
    ctx.beginPath(); ctx.ellipse(0, -L/2, a, a * isoSkew, 0, 0, PI * 2); ctx.stroke();
    
    // ---- Dynamic Field Lines with Arrows (radial, between inner and outer) ----
    if (pState.showField && pState.V > 0) {
        const fieldColor = 'rgba(253, 224, 71, 0.35)';
        const arrowColor = '#fde047';
        const numAngles = 12;
        const numYLayers = Math.max(2, Math.floor(L / 60));
        
        for (let yi = 0; yi <= numYLayers; yi++) {
            let py = -L/2 + 20 + yi * ((L - 40) / numYLayers);
            let yAlpha = 0.8;
            
            for (let ai = 0; ai < numAngles; ai++) {
                let angle = (ai / numAngles) * PI * 2;
                
                // Only draw the arrows that would be visible from front (roughly PI/2 to -PI/2)
                let cosA = Math.cos(angle);
                let sinA = Math.sin(angle);
                
                // Project to isometric
                let innerX = cosA * a;
                let innerIsoY = py + sinA * a * isoSkew;
                let outerX = cosA * b;
                let outerIsoY = py + sinA * b * isoSkew;
                
                // Depth-based visibility
                let depthAlpha = sinA < -0.3 ? 0.2 : (sinA > 0.3 ? 0.7 : 0.5);
                
                ctx.globalAlpha = yAlpha * depthAlpha;
                drawFieldLineWithArrows(innerX, innerIsoY, outerX, outerIsoY, fieldColor, arrowColor, 2);
            }
        }
        ctx.globalAlpha = 1.0;
    }
    
    // ---- Charges on inner conductor surface ----
    if (pState.showCharges && pState.V > 0) {
        ctx.font = 'bold 14px Inter'; ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        const numC = 8;
        for (let yi = 0; yi < 3; yi++) {
            let py = -L/2 + L * 0.2 + yi * (L * 0.3);
            for (let ci = 0; ci < numC; ci++) {
                let angle = (ci / numC) * PI * 2;
                let cosA = Math.cos(angle);
                let sinA = Math.sin(angle);
                // Only show front-facing charges
                if (sinA > -0.2) {
                    let cx_ = cosA * (a + 3);
                    let cy_ = py + sinA * (a + 3) * isoSkew;
                    let alpha = 0.3 + 0.7 * Math.max(0, sinA + 0.2);
                    ctx.globalAlpha = alpha;
                    ctx.fillText('+', cx_, cy_ + 5);
                }
            }
        }
        ctx.globalAlpha = 1.0;
    }
    
    // ---- Front half of outer cylinder ----
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = outerBodyGrad;
    ctx.beginPath();
    ctx.moveTo(-b, -L/2);
    ctx.lineTo(-b, L/2);
    ctx.ellipse(0, L/2, b, b * isoSkew, 0, PI, PI*2);
    ctx.lineTo(b, -L/2);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
    
    // Outer cylinder edge strokes (front)
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-b, -L/2); ctx.lineTo(-b, L/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(b, -L/2); ctx.lineTo(b, L/2); ctx.stroke();
    // Top ellipse front half
    ctx.beginPath(); ctx.ellipse(0, -L/2, b, b * isoSkew, 0, 0, PI); ctx.stroke();
    // Bottom ellipse
    ctx.beginPath(); ctx.ellipse(0, L/2, b, b * isoSkew, 0, 0, PI); ctx.stroke();
    
    // ---- Labels ----
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 14px "SF Mono"'; ctx.textAlign = 'center';
    ctx.fillText('Inner (+)', 0, L/2 + b * isoSkew + 45);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Outer (−)', 0, L/2 + b * isoSkew + 65);
}

function renderSpherical() {
    const a = pState.sphA * 1000 * 15;
    const b = pState.sphB * 1000 * 15;

    // Outer Sphere (Glassy - back half hint)
    ctx.globalAlpha = 0.15;
    const bgGlow = ctx.createRadialGradient(0, 0, b * 0.5, 0, 0, b * 1.2);
    bgGlow.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
    bgGlow.addColorStop(1, 'rgba(59, 130, 246, 0)');
    ctx.fillStyle = bgGlow;
    ctx.beginPath(); ctx.arc(0, 0, b * 1.2, 0, PI*2); ctx.fill();
    ctx.globalAlpha = 1.0;

    // Inner Sphere (+)
    const g1 = ctx.createRadialGradient(-a*0.3, -a*0.3, 0, 0, 0, a);
    g1.addColorStop(0, '#fca5a5'); g1.addColorStop(0.5, '#ef4444'); g1.addColorStop(1, '#7f1d1d');
    ctx.fillStyle = g1;
    ctx.beginPath(); ctx.arc(0, 0, a, 0, PI*2); ctx.fill();

    // Dielectric glow
    if (pState.k > 1.0) {
        const gk = ctx.createRadialGradient(0,0,a, 0,0,b);
        gk.addColorStop(0, 'rgba(34, 211, 238, 0.4)'); gk.addColorStop(1, 'rgba(34, 211, 238, 0.02)');
        ctx.fillStyle = gk;
        ctx.beginPath(); ctx.arc(0, 0, b, 0, PI*2); ctx.fill();
        
        ctx.fillStyle = '#67e8f9'; ctx.font = 'bold 16px "SF Mono"'; ctx.textAlign = 'center';
        ctx.fillText(`κ=${pState.k}`, 0, b + 30);
    }

    // Dynamic radial field lines with arrows
    if (pState.showField && pState.V > 0) {
        const fieldColor = 'rgba(253, 224, 71, 0.35)';
        const arrowColor = '#fde047';
        const numLines = 16;
        
        for (let i = 0; i < numLines; i++) {
            let angle = (i / numLines) * PI * 2 + simTime * 0.05;
            drawRadialFieldLine(0, 0, a + 3, b - 3, angle, fieldColor, arrowColor, 2);
        }
    }

    // Outer Sphere (Glassy shell)
    const g2 = ctx.createRadialGradient(-b*0.3, -b*0.3, b*0.1, 0, 0, b);
    g2.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    g2.addColorStop(0.3, 'rgba(59, 130, 246, 0.05)');
    g2.addColorStop(0.8, 'rgba(59, 130, 246, 0.2)');
    g2.addColorStop(1, 'rgba(59, 130, 246, 0.6)');
    ctx.fillStyle = g2;
    ctx.beginPath(); ctx.arc(0, 0, b, 0, PI*2); ctx.fill();
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.stroke();
    
    // Charges on inner sphere
    if (pState.showCharges && pState.V > 0) {
        ctx.font = 'bold 14px Inter'; ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.textAlign = 'center';
        for (let i = 0; i < 8; i++) {
            let angle = (i / 8) * PI * 2;
            ctx.fillText('+', Math.cos(angle) * (a + 12), Math.sin(angle) * (a + 12) + 5);
        }
    }
    
    // Labels
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 14px "SF Mono"'; ctx.textAlign = 'center';
    ctx.fillText('Inner (+)', 0, b + 50);
    ctx.fillStyle = '#3b82f6';
    ctx.fillText('Outer (−)', 0, b + 70);
}

// ==========================================
// Network Mode Rendering - Tree-based recursive
// ==========================================
function drawEngineeringGrid(xMin, xMax, yMin, yMax, zoom) {
    ctx.save();
    
    // Minor grid lines every 25px
    ctx.strokeStyle = '#0f1219';
    ctx.lineWidth = 0.5 / zoom;
    ctx.beginPath();
    
    let startX = Math.floor(xMin / 25) * 25;
    for (let x = startX; x <= xMax; x += 25) {
        if (x % 100 !== 0) {
            ctx.moveTo(x, yMin);
            ctx.lineTo(x, yMax);
        }
    }
    let startY = Math.floor(yMin / 25) * 25;
    for (let y = startY; y <= yMax; y += 25) {
        if (y % 100 !== 0) {
            ctx.moveTo(xMin, y);
            ctx.lineTo(xMax, y);
        }
    }
    ctx.stroke();

    // Major grid lines every 100px
    ctx.strokeStyle = '#1a1f2e';
    ctx.lineWidth = 1 / zoom;
    ctx.beginPath();
    
    let startXMajor = Math.floor(xMin / 100) * 100;
    for (let x = startXMajor; x <= xMax; x += 100) {
        ctx.moveTo(x, yMin);
        ctx.lineTo(x, yMax);
    }
    let startYMajor = Math.floor(yMin / 100) * 100;
    for (let y = startYMajor; y <= yMax; y += 100) {
        ctx.moveTo(xMin, y);
        ctx.lineTo(xMax, y);
    }
    ctx.stroke();
    
    ctx.restore();
}

function renderNetwork3D() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isMobile = vw <= 768;
    const centerX = isMobile ? vw / 2 : vw / 2 + 80;
    const centerY = isMobile ? vh / 2 - 60 : vh / 2;
    const zoom = camera.zoom;

    const xMin = -centerX / zoom;
    const xMax = (vw - centerX) / zoom;
    const yMin = -centerY / zoom;
    const yMax = (vh - centerY) / zoom;

    // Draw the engineering grid
    drawEngineeringGrid(xMin, xMax, yMin, yMax, zoom);

    if (!nState.network) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '22px Inter'; ctx.textAlign = 'center';
        ctx.fillText("Workspace Empty — Add capacitors from sidebar", 0, 0);
        return;
    }

    // Measure the total width needed
    const layout = measureNode(nState.network);
    const batteryWidth = 120;
    const endDist = 40; // Final wire length
    const totalDrawWidth = batteryWidth + layout.width + endDist;
    const offsetX = -totalDrawWidth / 2;
    
    ctx.save();
    ctx.translate(offsetX, 0);
    
    // Draw Battery — 2D circle with polarity
    draw2DVoltageSource(0, 0, nState.voltage);

    // Initial bus line
    drawDynamicWire(50, 0, batteryWidth, 0);
    
    // Recursively render the tree
    const endX = renderNodeTree(nState.network, batteryWidth, 0);
    
    // Final wire to close circuit
    drawDynamicWire(endX, 0, endX + 40, 0);
    
    // Ground symbol at end
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    const gx = endX + 40;
    ctx.beginPath(); ctx.moveTo(gx, -15); ctx.lineTo(gx, 15); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + 6, -10); ctx.lineTo(gx + 6, 10); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx + 12, -5); ctx.lineTo(gx + 12, 5); ctx.stroke();
    
    ctx.restore();
}

// Measure node width and height for layout
function measureNode(node) {
    if (node.type === 'cap') {
        return { width: 120, height: 50 };
    }
    
    if (node.type === 'series') {
        let totalW = 0;
        let maxH = 50;
        for (let i = 0; i < node.children.length; i++) {
            const m = measureNode(node.children[i]);
            totalW += m.width;
            if (i < node.children.length - 1) {
                totalW += 30; // spacing between series elements
            }
            maxH = Math.max(maxH, m.height);
        }
        return { width: totalW, height: maxH };
    }
    
    if (node.type === 'parallel') {
        let maxW = 0;
        let totalH = 0;
        const vSpacing = 70;
        for (let i = 0; i < node.children.length; i++) {
            const m = measureNode(node.children[i]);
            maxW = Math.max(maxW, m.width);
            totalH += m.height;
            if (i > 0) totalH += vSpacing;
        }
        return { width: maxW + 80, height: totalH };
    }
    
    return { width: 100, height: 50 };
}

// Render a node tree recursively and return the x coordinate of the output
function renderNodeTree(node, startX, centerY) {
    const isSelected = nState.selectedNodeId === node.id;
    
    if (node.type === 'cap') {
        // Draw wire -> cap -> wire
        drawDynamicWire(startX, centerY, startX + 30, centerY);
        drawCapacitorSymbol(startX + 30, centerY, node, isSelected);
        drawDynamicWire(startX + 90, centerY, startX + 120, centerY);
        return startX + 120;
    }
    
    if (node.type === 'series') {
        // Selection highlight
        if (isSelected) {
            const layout = measureNode(node);
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.roundRect(startX - 5, centerY - layout.height/2 - 15, layout.width + 10, layout.height + 30, 4);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        let cx_ = startX;
        for (let i = 0; i < node.children.length; i++) {
            const child = node.children[i];
            cx_ = renderNodeTree(child, cx_, centerY);
            if (i < node.children.length - 1) {
                // Wire between series elements
                drawDynamicWire(cx_, centerY, cx_ + 30, centerY);
                cx_ += 30;
            }
        }

        return cx_;
    }
    
    if (node.type === 'parallel') {
        const layout = measureNode(node);
        const vSpacing = 70;
        
        // Calculate vertical positions for each child
        const childLayouts = node.children.map(c => measureNode(c));
        let totalH = 0;
        for (let i = 0; i < childLayouts.length; i++) {
            totalH += childLayouts[i].height;
            if (i > 0) totalH += vSpacing;
        }
        
        const childCenters = [];
        let currentY = centerY - totalH / 2;
        for (let i = 0; i < childLayouts.length; i++) {
            currentY += childLayouts[i].height / 2;
            childCenters.push(currentY);
            currentY += childLayouts[i].height / 2 + vSpacing;
        }
        
        // Junction points
        const junctionX = startX + 20;
        const innerWidth = layout.width - 80;
        const mergeX = startX + layout.width - 20;
        
        // Selection highlight
        if (isSelected) {
            ctx.strokeStyle = '#eab308';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.roundRect(startX - 5, centerY - totalH/2 - 20, layout.width + 10, totalH + 40, 4);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        // Wire to junction
        drawDynamicWire(startX, centerY, junctionX, centerY);
        
        // Junction dot (left)
        ctx.fillStyle = '#0b0d14';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(junctionX, centerY, 3, 0, PI * 2); ctx.fill(); ctx.stroke();
        
        // Vertical bus lines — clean wire style
        const topY = Math.min(...childCenters);
        const bottomY = Math.max(...childCenters);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(junctionX, topY); ctx.lineTo(junctionX, bottomY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(mergeX, topY); ctx.lineTo(mergeX, bottomY); ctx.stroke();
        
        // Draw each branch
        for (let i = 0; i < node.children.length; i++) {
            const cy = childCenters[i];
            
            // Wire from left bus to child
            drawDynamicWire(junctionX, cy, junctionX + 20, cy);
            
            // Render child node
            const childEnd = renderNodeTree(node.children[i], junctionX + 20, cy);
            
            // Wire from child to right bus
            drawDynamicWire(childEnd, cy, mergeX, cy);
            
            // Branch dots (black with slate border)
            ctx.fillStyle = '#0b0d14';
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(junctionX, cy, 3, 0, PI * 2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.arc(mergeX, cy, 3, 0, PI * 2); ctx.fill(); ctx.stroke();
        }
        
        // Merge junction dot (right)
        ctx.fillStyle = '#0b0d14';
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(mergeX, centerY, 3, 0, PI * 2); ctx.fill(); ctx.stroke();
        
        // Wire out from merge
        drawDynamicWire(mergeX, centerY, startX + layout.width, centerY);
        
        return startX + layout.width;
    }
    
    return startX;
}

// Dynamic wire — solid PCB trace with voltage-scaled current arrows
function drawDynamicWire(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);

    // Solid wire — clean line style
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

// 2D voltage source symbol — standard circle with +/- polarity signs
function draw2DVoltageSource(x, y, voltage) {
    const r = 15; // 30px diameter
    const cx = x + 25;
    
    // Wire leads
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(cx - r, y);
    ctx.moveTo(cx + r, y);
    ctx.lineTo(x + 50, y);
    ctx.stroke();

    // Circle Body
    ctx.fillStyle = '#0b0d14'; // Solid dark to hide grid behind
    ctx.beginPath();
    ctx.arc(cx, y, r, 0, PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Polarity signs inside the circle
    ctx.font = 'bold 12px "SF Mono", monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', cx - 6, y);
    ctx.fillText('−', cx + 6, y);

    // Voltage label below
    ctx.font = 'bold 11px "SF Mono"';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(`${voltage}V`, cx, y + r + 15);
}

// Capacitor component symbol — standard parallel plates schematic style with always-on monospaced metadata
function drawCapacitorSymbol(x, y, node, isSelected) {
    const CVal = node.C;
    const VVal = node._V || 0;
    const QVal = node._Q || 0;
    const voltRatio = nState.voltage > 0 ? Math.min(1, VVal / nState.voltage) : 0;
    
    const w = 60;
    const plateH = 28;
    const plateThick = 2;
    const gapW = 8;
    const cx = x + w / 2;
    const leftPlateX = cx - gapW / 2 - plateThick;
    const rightPlateX = cx + gapW / 2;
    const gapLeft = leftPlateX + plateThick;
    const gapRight = rightPlateX;
    const gapWidth = gapRight - gapLeft;

    // Selection outline — solid yellow, no glow
    if (isSelected) {
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(x + 2, y - plateH / 2 - 6, w - 4, plateH + 12, 4);
        ctx.stroke();
    }

    // ---- Animated field dot traversing the gap (only when selected and has voltage) ----
    if (isSelected && voltRatio > 0.01) {
        const ft = ((simTime * 1.8) % 1.0);
        const fadeAlpha = voltRatio * 0.9 * (1.0 - Math.abs(ft - 0.5) * 2.2);
        if (fadeAlpha > 0) {
            const fpx = gapLeft + gapWidth * ft;
            ctx.save();
            ctx.globalAlpha = Math.max(0, fadeAlpha);
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(fpx, y, 1.8, 0, PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    // ---- Left plate — clean slate line ----
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = plateThick;
    ctx.beginPath();
    ctx.moveTo(leftPlateX + plateThick/2, y - plateH / 2);
    ctx.lineTo(leftPlateX + plateThick/2, y + plateH / 2);
    ctx.stroke();

    // ---- Right plate — clean slate line ----
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = plateThick;
    ctx.beginPath();
    ctx.moveTo(rightPlateX + plateThick/2, y - plateH / 2);
    ctx.lineTo(rightPlateX + plateThick/2, y + plateH / 2);
    ctx.stroke();

    // ---- Wire leads — solid ----
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(leftPlateX, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rightPlateX + plateThick, y); ctx.lineTo(x + w, y); ctx.stroke();

    // ---- Polarity labels (+ / -) ----
    ctx.font = 'bold 10px "SF Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.fillText('+', leftPlateX - 6, y - 4);
    ctx.fillText('−', rightPlateX + plateThick + 6, y - 4);

    // ---- Value/Data label ----
    const totalCaps = countNodes(nState.network);
    ctx.textAlign = 'center';
    
    if (totalCaps <= 1) {
        // Show just the capacitance below
        const valText = formatEng(CVal, 'F');
        ctx.font = '11px "SF Mono"';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(valText, cx, y + 30);
    } else {
        // Show full metadata block: capacitance, voltage, charge
        const cText = formatEng(CVal, 'F');
        const vText = formatEng(VVal, 'V');
        const qText = formatEng(QVal, 'C');
        
        ctx.font = '11px "SF Mono"';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(cText, cx, y + 28);
        ctx.fillText(vText, cx, y + 40);
        ctx.fillText(qText, cx, y + 52);
    }
}

// Start sequence
window.onload = init;

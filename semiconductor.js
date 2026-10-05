/* One crystal, shared with an energy-state view. Plain Canvas + JavaScript. */
(() => {
    'use strict';
    const { Crystal, solve, density, clamp } = window.SemiconductorModel;
    const $ = id => document.getElementById(id);
    const defaults = { temperature: 300, donor: 0, acceptor: 0, voltage: .1, power: false, length: 2, area: .25 };
    let config = { ...defaults };
    let crystal = new Crystal(config);
    let physics = solve(config);
    let paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let reducedMotion = paused;
    let speed = 1, follow = '', trackedElectron = null, elapsed = 0, accumulator = 0;
    let previousFrame = performance.now(), previousMessage = '';
    let placement = 'donor';
    const canvas = $('crystalCanvas'), ctx = canvas.getContext('2d');
    const energyCanvas = $('energyCanvas'), energyCtx = energyCanvas.getContext('2d');
    const transferCanvas = $('transferCanvas'), transferCtx = transferCanvas.getContext('2d');
    const sizes = new Map();
    const colors = { bound: '#cad3df', free: '#3dd9ff', hole: '#f6b944', donor: '#a99bff', acceptor: '#ff91ac', focus: '#3dd9ff' };
    const transferProgress = event => {
        const t = clamp((event.progress - .22) / .56, 0, 1);
        return t * t * (3 - 2 * t);
    };
    const fillsHole = e => e && ['hop', 'acceptor', 'recombine', 'contactFill'].includes(e.type);
    const visibleEvent = () => crystal.event || ((paused || crystal.time < crystal.settleUntil) ? crystal.lastEvent : null);
    // A single marker identifies the same electron throughout the schematic transfer.
    function travelingElectron(a, b, t, avoid) {
        let bend = {x:0,y:0};
        if (avoid) {
            const dx=b.x-a.x, dy=b.y-a.y, length=Math.hypot(dx,dy)||1;
            const normal={x:-dy/length,y:dx/length};
            const distance=(avoid.x-(a.x+b.x)/2)*normal.x+(avoid.y-(a.y+b.y)/2)*normal.y;
            const offset=-Math.sign(distance || 1)*Math.max(0,22-Math.abs(distance));
            bend={x:normal.x*offset,y:normal.y*offset};
        }
        return {x:a.x+(b.x-a.x)*t+4*t*(1-t)*bend.x, y:a.y+(b.y-a.y)*t+4*t*(1-t)*bend.y};
    }
    function cloud(context, p, strength) {
        if (strength <= 0) return;
        const gradient = context.createRadialGradient(p.x, p.y, 0, p.x, p.y, 15);
        gradient.addColorStop(0, `rgba(61,217,255,${strength * .55})`);
        gradient.addColorStop(1, 'rgba(61,217,255,0)');
        context.fillStyle = gradient; context.fillRect(p.x - 15, p.y - 15, 30, 30);
    }
    const superscript = text => String(text).split('').map(c => ({ '-':'⁻', '0':'⁰', '1':'¹', '2':'²', '3':'³', '4':'⁴', '5':'⁵', '6':'⁶', '7':'⁷', '8':'⁸', '9':'⁹' })[c] || c).join('');
    function scientific(value, digits = 2) {
        if (!Number.isFinite(value)) return '∞';
        if (value === 0) return '0';
        const [mantissa, exponent] = value.toExponential(digits).split('e');
        return `${mantissa} × 10${superscript(Number(exponent))}`;
    }
    function current(value) {
        if (value === 0) return '0 A';
        const magnitude = Math.abs(value);
        if (magnitude < 1e-9) return `${(value * 1e12).toFixed(2)} pA`;
        if (magnitude < 1e-6) return `${(value * 1e9).toFixed(2)} nA`;
        if (magnitude < 1e-3) return `${(value * 1e6).toFixed(2)} µA`;
        return `${(value * 1e3).toFixed(2)} mA`;
    }
    const visibleDopants = value => value <= 0 ? 0 : Math.min(6, Math.ceil(value / 11));
    function updatePhysics() {
        crystal.config = { ...config };
        physics = solve(config);
        $('temperatureOut').textContent = `${config.temperature} K`;
        $('donorOut').textContent = config.donor ? `${scientific(density(config.donor), 1)} cm⁻³` : 'Off';
        $('acceptorOut').textContent = config.acceptor ? `${scientific(density(config.acceptor), 1)} cm⁻³` : 'Off';
        $('voltageOut').textContent = `${config.voltage > 0 ? '+' : ''}${config.voltage.toFixed(2)} V`;
        $('currentOut').textContent = current(physics.current);
        $('nOut').textContent = `n = ${scientific(physics.n)} cm⁻³`;
        $('pOut').textContent = `p = ${scientific(physics.p)} cm⁻³`;
        $('sampleType').textContent = config.donor === 0 && config.acceptor === 0 ? 'Intrinsic'
            : config.donor === config.acceptor ? 'Compensated' : config.donor > config.acceptor ? 'N-type · electrons' : 'P-type · holes';
        $('currentDirection').textContent = physics.field > 0 ? 'Conventional current →' : physics.field < 0 ? '← Conventional current' : 'No field-driven current';
        $('currentHint').textContent = physics.field === 0 ? 'No directed drift. Thermal motion and random electron transfers can continue.'
            : `Field ${physics.field > 0 ? '→' : '←'} · free electrons drift ${physics.field > 0 ? '←' : '→'}. Bond-electron transfers move holes ${physics.field > 0 ? '→' : '←'}.`;
        $('physicalReadouts').innerHTML = [
            ['Intrinsic density nᵢ', `${scientific(physics.ni)} cm⁻³`],
            ['Electron current', current(physics.in)], ['Hole current', current(physics.ip)],
            ['Electric field', `${physics.field.toFixed(0)} V/cm`],
            ['Electron mobility', `${physics.muN.toFixed(0)} cm²/(V·s)`], ['Hole mobility', `${physics.muP.toFixed(0)} cm²/(V·s)`],
            ['Conductivity', `${scientific(physics.sigma)} S/cm`], ['Resistivity', `${scientific(physics.rho)} Ω·cm`],
            ['Fermi shift Eꜰ − Eᵢ', `${physics.fermi.toFixed(3)} eV`], ['Sample L / A', '2 µm / 0.25 µm²']
        ].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
        document.querySelectorAll('input[type="range"]').forEach(input => {
            input.style.setProperty('--fill', `${100 * (Number(input.value) - Number(input.min)) / (Number(input.max) - Number(input.min))}%`);
            input.setAttribute('aria-valuetext', document.querySelector(`output[for="${input.id}"]`).textContent);
        });
    }
    function syncControls() {
        $('temperatureSlider').value = config.temperature;
        $('donorSlider').value = config.donor;
        $('acceptorSlider').value = config.acceptor;
        $('voltageSlider').value = config.voltage;
        $('powerToggle').checked = config.power;
        $('reducedMotionToggle').checked = reducedMotion;
        $('pauseBtn').textContent = paused ? '▶ Play' : 'Ⅱ Pause';
        $('pauseBtn').setAttribute('aria-pressed', String(paused));
        $('followElectronBtn').setAttribute('aria-pressed', String(follow === 'electron'));
        $('followHoleBtn').setAttribute('aria-pressed', String(follow === 'hole'));
        updateControlVisibility();
        updatePhysics();
    }
    function updateControlVisibility() {
        const mode = $('dopingSelect').value;
        $('donorControl').hidden = mode !== 'donor' && mode !== 'both';
        $('acceptorControl').hidden = mode !== 'acceptor' && mode !== 'both';
        $('placementControls').hidden = mode === 'intrinsic';
        $('placementSelect').hidden = mode !== 'both';
        $('placementLabel').hidden = mode !== 'both';
        if (mode === 'donor' || mode === 'acceptor') placement = mode;
        $('placementSelect').value = placement;
        $('sceneHint').textContent = mode === 'intrinsic' ? 'Click a bond electron to follow it.' : `Click a Si atom to substitute ${placement === 'donor' ? 'phosphorus' : 'boron'}. Click an electron to inspect it.`;
        $('addDopantBtn').textContent = `+ Place ${placement === 'donor' ? 'phosphorus donor' : 'boron acceptor'}`;
        $('addDopantBtn').disabled = crystal.dopants.filter(d => d.kind === placement).length >= 6;
        $('dopingHint').textContent = mode === 'intrinsic' ? 'Pure silicon. Heat creates matched electron–hole pairs.'
            : mode === 'donor' ? 'Phosphorus has an extra electron. After ionization, the electron is mobile while P⁺ stays fixed.'
            : mode === 'acceptor' ? 'Boron captures a neighboring bond electron. That electron’s old position becomes a mobile hole.'
            : 'Donors supply electrons; acceptors capture them. Their effects compensate when concentrations balance.';
    }
    function prepareDopants(preferredSite) {
        crystal.finishEvent();
        const targets = { donor: visibleDopants(config.donor), acceptor: visibleDopants(config.acceptor) };
        const counts = kind => crystal.dopants.filter(d => d.kind === kind).length;
        const rebuild = counts('donor') > targets.donor || counts('acceptor') > targets.acceptor;
        const oldSites = crystal.dopants.map(d => ({ kind: d.kind, atom: d.atom }));
        if (rebuild) { crystal = new Crystal(config); trackedElectron = null; }
        for (const kind of ['donor', 'acceptor']) {
            while (counts(kind) < targets[kind]) {
                const old = oldSites.filter(d => d.kind === kind)[counts(kind)];
                if (!crystal.addDopant(kind, preferredSite ?? old?.atom)) break;
                preferredSite = undefined;
            }
        }
        if (rebuild) crystal.message = 'Dopant count decreased: a new neutral sample is prepared. Step or play to watch it reach its new state.';
        updateControlVisibility();
        updatePhysics();
        refresh();
    }
    function addDopantAt(site) {
        const count = crystal.dopants.filter(d => d.kind === placement).length;
        if (count >= 6) return;
        config[placement] = count * 11 + 1;
        prepareDopants(site);
        syncControls();
    }
    function preset(name) {
        config = { ...defaults };
        if (name === 'cold') config.temperature = 0;
        if (name === 'warm') config.temperature = 550;
        if (name === 'n') config.donor = 41;
        if (name === 'p') { config.acceptor = 41; config.power = true; }
        crystal = new Crystal(config);
        trackedElectron = null;
        $('dopingSelect').value = name === 'n' ? 'donor' : name === 'p' ? 'acceptor' : 'intrinsic';
        prepareDopants();
        if (name === 'cold') crystal.message = 'At 0 K, bond states are filled. There are no thermally generated conduction electrons or holes.';
        follow = name === 'p' ? 'hole' : '';
        paused = reducedMotion;
        syncControls(); refresh();
    }
    $('temperatureSlider').addEventListener('input', e => { config.temperature = Number(e.target.value); updatePhysics(); refresh(); });
    $('roomBtn').addEventListener('click', () => { config.temperature = 300; syncControls(); });
    $('dopingSelect').addEventListener('change', e => {
        const mode = e.target.value;
        config.donor = mode === 'donor' || mode === 'both' ? config.donor || 1 : 0;
        config.acceptor = mode === 'acceptor' || mode === 'both' ? config.acceptor || 1 : 0;
        prepareDopants(); syncControls();
    });
    for (const kind of ['donor', 'acceptor']) $(kind + 'Slider').addEventListener('input', e => { config[kind] = Number(e.target.value); prepareDopants(); });
    $('placementSelect').addEventListener('change', e => { placement = e.target.value; updateControlVisibility(); });
    $('addDopantBtn').addEventListener('click', () => addDopantAt());
    $('powerToggle').addEventListener('change', e => { config.power = e.target.checked; updatePhysics(); });
    $('voltageSlider').addEventListener('input', e => { config.voltage = Number(e.target.value); updatePhysics(); });
    $('reverseBtn').addEventListener('click', () => { config.voltage = config.voltage === 0 ? -.1 : -config.voltage; syncControls(); });
    $('pauseBtn').addEventListener('click', () => { paused = !paused; if (!paused && reducedMotion) { reducedMotion = false; } syncControls(); });
    $('stepBtn').addEventListener('click', () => { paused = true; crystal.step(); syncControls(); refresh(); });
    $('speedSelect').addEventListener('change', e => { speed = Number(e.target.value); });
    $('followElectronBtn').addEventListener('click', () => { follow = follow === 'electron' ? '' : 'electron'; trackedElectron = null; syncControls(); });
    $('followHoleBtn').addEventListener('click', () => { follow = follow === 'hole' ? '' : 'hole'; trackedElectron = null; syncControls(); });
    $('reducedMotionToggle').addEventListener('change', e => { reducedMotion = e.target.checked; if (reducedMotion) paused = true; syncControls(); });
    $('contrastToggle').addEventListener('change', e => document.body.classList.toggle('high-contrast', e.target.checked));
    $('resetBtn').addEventListener('click', () => preset('intrinsic'));
    document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => preset(button.dataset.preset)));

    function resize(target) {
        const { width, height } = target.getBoundingClientRect();
        const dpr = Math.min(devicePixelRatio || 1, 2);
        if (target.width !== Math.round(width * dpr) || target.height !== Math.round(height * dpr)) {
            target.width = Math.round(width * dpr); target.height = Math.round(height * dpr);
        }
        target.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
        sizes.set(target, { w: width, h: height });
    }
    const observer = new ResizeObserver(entries => entries.forEach(entry => resize(entry.target)));
    observer.observe(canvas); observer.observe(energyCanvas); observer.observe(transferCanvas);
    function point(p) { const { w, h } = sizes.get(canvas); return { x: 22 + p.x * (w - 44), y: 40 + p.y * (h - 80) }; }
    function line(context, a, b, color, width = 1, dash = []) {
        context.save(); context.strokeStyle = color; context.lineWidth = width; context.setLineDash(dash);
        context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke(); context.restore();
    }
    function arrow(context, a, b, color, dash = []) {
        line(context, a, b, color, 1.5, dash);
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        line(context, b, { x: b.x - 6 * Math.cos(angle - .5), y: b.y - 6 * Math.sin(angle - .5) }, color, 1.5);
        line(context, b, { x: b.x - 6 * Math.cos(angle + .5), y: b.y - 6 * Math.sin(angle + .5) }, color, 1.5);
    }
    function text(context, value, x, y, color = '#bad0df', size = 11, align = 'left') {
        context.fillStyle = color; context.font = `500 ${size}px system-ui,sans-serif`; context.textAlign = align; context.textBaseline = 'middle'; context.fillText(value, x, y);
    }
    function dot(context, p, r, color, hollow = false) {
        context.beginPath(); context.arc(p.x, p.y, r, 0, Math.PI * 2);
        if (hollow) { context.strokeStyle = color; context.lineWidth = 1.8; context.stroke(); }
        else { context.fillStyle = color; context.fill(); }
    }
    function halo(p, r = 10, color = colors.focus) { dot(ctx, p, r, color, true); }
    function focusId() {
        const id = trackedElectron || crystal.event?.electron || crystal.followElectron;
        return id && (crystal.event?.electron === id || crystal.free.some(e => e.id === id)
            || crystal.slots.some(s => s.electron === id) || crystal.dopants.some(d => d.electron === id)) ? id : null;
    }
    function drawCrystal() {
        const { w, h } = sizes.get(canvas), narrow = w < 500;
        ctx.clearRect(0, 0, w, h);
        const event = crystal.event;
        const filling = fillsHole(event), tFill = filling ? transferProgress(event) : 0;
        // A regular, unskewed bond graph. The two dots at each bond center are shared electrons.
        for (const bond of crystal.bonds) line(ctx, point(crystal.atoms[bond.a]), point(crystal.atoms[bond.b]), '#38404d', 1.5);
        for (const slot of crystal.slots) {
            const p = point(slot);
            if (filling && slot.electron === event.electron) continue;
            if (filling && slot.id === event.destination && tFill === 1) continue;
            ctx.save();
            if (!filling && (slot.electron === event?.electron || (event && slot.id === event.destination))) ctx.globalAlpha = 1 - transferProgress(event);
            if (slot.electron) {
                dot(ctx, p, narrow ? 2.7 : 3.3, colors.bound);
                if (follow === 'electron' && slot.electron === focusId()) halo(p);
            } else {
                dot(ctx, p, narrow ? 4.6 : 5.4, slot.reserved !== null ? colors.acceptor : colors.hole, true);
                if (follow === 'hole' && slot.id === crystal.followHole) halo(p, 11, colors.hole);
            }
            ctx.restore();
        }
        for (const atom of crystal.atoms) {
            const p = point(atom), d = crystal.dopants.find(item => item.atom === atom.id);
            const color = atom.kind === 'donor' ? colors.donor : atom.kind === 'acceptor' ? colors.acceptor : '#8995a7';
            dot(ctx, p, narrow ? 10 : 13, atom.kind === 'si' ? '#10141c' : atom.kind === 'donor' ? '#242035' : '#30202a');
            dot(ctx, p, narrow ? 10 : 13, color, true);
            const symbol = atom.kind === 'si' ? 'Si' : atom.kind === 'donor' ? (d.ionized ? 'P⁺' : 'P') : (d.ionized ? 'B⁻' : 'B');
            text(ctx, symbol, p.x, p.y + .5, color, narrow ? 9 : 11, 'center');
            if (d?.electron) {
                const extra = point(crystal.donorPosition(atom));
                ctx.save(); if (d.electron === event?.electron) ctx.globalAlpha = 1 - transferProgress(event);
                dot(ctx, extra, 3.5, colors.donor); line(ctx, p, extra, '#927aac', 1, [2,3]);
                ctx.restore();
            }
        }
        for (const electron of crystal.free) {
            if (filling && electron.id === event.electron) continue;
            const p = point(electron);
            ctx.save(); if (electron.id === event?.electron) ctx.globalAlpha = 1 - transferProgress(event);
            ctx.shadowBlur = 6; ctx.shadowColor = colors.free;
            dot(ctx, p, 4.5, colors.free); ctx.restore();
            text(ctx, '−', p.x, p.y, '#06304a', 10, 'center');
            if (follow === 'electron' && electron.id === focusId()) halo(p, 11);
        }
        // Contacts are boundaries; electrons leaving are collected, not wrapped around.
        const on = physics.field !== 0;
        ctx.fillStyle = on ? '#515b75' : '#252b35';
        ctx.fillRect(10, 76, 7, h - 152); ctx.fillRect(w - 17, 76, 7, h - 152);
        if (on) {
            const right = physics.field > 0;
            text(ctx, right ? '+' : '−', 14, 63, '#8df1c6', 15, 'center');
            text(ctx, right ? '−' : '+', w - 14, 63, '#8df1c6', 15, 'center');
            const start = { x: w * .28, y: 20 }, end = { x: w * .72, y: 20 };
            arrow(ctx, right ? start : end, right ? end : start, '#80e5ba');
            text(ctx, `Electric field ${right ? '→' : '←'}`, w / 2, 39, '#95e7c7', 11, 'center');
            text(ctx, `Free electrons ${right ? '←' : '→'}`, w * .27, h - 22, colors.free, narrow ? 10 : 12, 'center');
            text(ctx, `Holes ${right ? '→' : '←'} via electron hops`, w * .74, h - 22, colors.hole, narrow ? 9 : 12, 'center');
        } else text(ctx, config.temperature === 0 ? '0 K · no thermal generation' : 'Voltage off · no preferred flow direction', w / 2, 24, '#91b2c9', narrow ? 10 : 12, 'center');
        const showEvent = visibleEvent();
        if (showEvent) {
            const a = point(showEvent.from), b = point(showEvent.to);
            const t = event ? transferProgress(event) : 1;
            if (fillsHole(showEvent)) {
                // Endpoint rings stay fixed. Only the electron changes position.
                if (event) {
                    if (showEvent.source !== undefined && t > 0) dot(ctx, a, 5.4, t === 1 ? colors.hole : '#586578', true);
                    let core;
                    if (showEvent.source !== undefined) {
                        const fromBond=crystal.bonds[crystal.slots[showEvent.source].bond];
                        const toBond=crystal.bonds[crystal.slots[showEvent.destination].bond];
                        const shared=[fromBond.a,fromBond.b].find(id=>id===toBond.a||id===toBond.b);
                        if (shared !== undefined) core=point(crystal.atoms[shared]);
                    }
                    const moving = travelingElectron(a, b, t, core);
                    cloud(ctx, moving, .7);
                    dot(ctx, moving, narrow ? 3.6 : 4.2, showEvent.source !== undefined || t === 1 ? colors.bound : colors.free);
                }
                dot(ctx, a, 10, t === 1 && showEvent.source !== undefined ? colors.hole : '#8591ac', true);
                dot(ctx, b, 10, t === 1 ? colors.free : colors.hole, true);
                text(ctx, 'A', a.x, a.y - 18, colors.bound, 10, 'center');
                text(ctx, 'B', b.x, b.y + 18, t === 1 ? colors.free : colors.hole, 10, 'center');
                return;
            }
            // Occupancy shifts between neighboring states. No bouncing particle or moving hole.
            cloud(ctx, a, 1 - t); cloud(ctx, b, t);
            if (event) {
                if (t > 0 && t < 1) {
                    ctx.save(); ctx.globalAlpha = Math.sin(t * Math.PI) * .45;
                    line(ctx, a, b, colors.free, 3); ctx.restore();
                }
                ctx.save(); ctx.globalAlpha = t;
                dot(ctx, b, 3.5, colors.free); ctx.restore();
                if (['hop', 'acceptor', 'excite', 'contactExtract'].includes(event.type)) {
                    ctx.save(); ctx.globalAlpha = t;
                    dot(ctx, a, narrow ? 4.6 : 5.4, colors.hole, true); ctx.restore();
                }
            }
            if (['hop', 'acceptor'].includes(showEvent.type)) {
                dot(ctx, a, 8, t === 1 ? colors.hole : colors.free, true);
                dot(ctx, b, 8, t === 0 ? colors.hole : colors.free, true);
                text(ctx, t === 1 ? 'new vacancy' : 'source', a.x, a.y - 20, t === 1 ? colors.hole : colors.bound, 9, 'center');
                text(ctx, t === 1 ? 'filled' : 'vacancy', b.x, b.y + 20, t === 1 ? colors.free : colors.hole, 9, 'center');
            }
        }
    }
    function drawTransfer() {
        const c = transferCtx, {w,h} = sizes.get(transferCanvas), e = visibleEvent();
        c.clearRect(0,0,w,h);
        if (!fillsHole(e)) {
            text(c, 'An electron fills an empty state in a neighboring bond.', w/2, 52, colors.bound, w < 400 ? 10 : 12, 'center');
            text(c, 'Watch the amber vacancy stay in place until the electron arrives.', w/2, 78, '#8fa0b5', w < 400 ? 9 : 11, 'center');
            return;
        }
        const t = crystal.event ? transferProgress(e) : 1;
        const sourceOnLeft = e.from.x <= e.to.x;
        const a = {x:w*(sourceOnLeft ? .23 : .77),y:72}, b = {x:w*(sourceOnLeft ? .77 : .23),y:72};
        const hasSourceBond = e.source !== undefined;
        const partner = slotId => {
            const slot = crystal.slots[slotId];
            return crystal.bonds[slot.bond].slots.map(i=>crystal.slots[i]).find(s=>s.id!==slotId);
        };
        function bond(p, label, slotId) {
            c.fillStyle = '#10151f'; c.fillRect(p.x-48,p.y-23,96,46);
            const latticeBond=crystal.bonds[crystal.slots[slotId].bond];
            line(c,{x:p.x-36,y:p.y},{x:p.x+36,y:p.y},'#46516a',1.5);
            [latticeBond.a,latticeBond.b].forEach((atomId,index)=>{
                const atom=crystal.atoms[atomId], position={x:p.x+(index?36:-36),y:p.y};
                const color=atom.kind==='donor'?colors.donor:atom.kind==='acceptor'?colors.acceptor:'#8c99ae';
                dot(c,position,10,'#10141c'); dot(c,position,10,color,true);
                text(c,atom.kind==='si'?'Si':atom.kind==='donor'?'P':'B',position.x,position.y,color,8,'center');
            });
            text(c,label,p.x,22,colors.bound,w<400?10:12,'center');
            // The other state in this bond is read from the actual crystal.
            const other = partner(slotId);
            dot(c,{x:p.x,y:p.y+11},4,other.electron ? colors.bound : colors.hole,!other.electron);
        }
        if (hasSourceBond) bond(a,'A · source bond',e.source);
        else text(c,e.type==='recombine'?'A · free electron':'A · contact',a.x,22,colors.bound,w<400?10:12,'center');
        bond(b,e.type==='acceptor'?'B · acceptor bond':'B · receiving bond',e.destination);
        // Active slots are the upper state in each enlarged pair.
        a.y-=9; b.y-=9;
        const pathStart = {x:a.x+(b.x>a.x?53:-53),y:44}, pathEnd={x:b.x+(b.x>a.x?-53:53),y:44};
        arrow(c,pathStart,pathEnd,'#37475b',[3,5]);
        if (hasSourceBond && t>0) dot(c,a,6,t===1?colors.hole:'#586578',true);
        if (t<1) dot(c,b,7,colors.hole,true);
        const moving = travelingElectron(a,b,t,{x:(a.x+b.x)/2,y:a.y+1});
        cloud(c,moving,.8); dot(c,moving,5,hasSourceBond || t===1 ? colors.bound : colors.free); text(c,'−',moving.x,moving.y,'#04141b',10,'center');
        text(c,t===1?(hasSourceBond?'Hole now here':'Electron captured'):t===0?'Electron starts here':'Electron transferring',a.x,113,t===1&&hasSourceBond?colors.hole:'#8fa0b5',w<400?9:11,'center');
        text(c,t===1?'Filled · electron arrived':'Hole waits here',b.x,113,t===1?colors.free:colors.hole,w<400?9:11,'center');
    }
    function energyLevel(id) {
        if (crystal.free.some(p => p.id === id)) return 31;
        const donor = crystal.dopants.find(d => d.electron === id);
        if (donor) return 62;
        const slot = crystal.slots.find(s => s.electron === id);
        return slot?.reserved !== null && slot?.reserved !== undefined ? 99 : 124;
    }
    function drawEnergy() {
        const { w, h } = sizes.get(energyCanvas), c = energyCtx, left = 31;
        c.clearRect(0, 0, w, h);
        c.fillStyle = '#0a2830'; c.fillRect(left, 17, w - left - 4, 28);
        c.fillStyle = '#28231a'; c.fillRect(left, 111, w - left - 4, 28);
        text(c, 'Conduction band', left + 8, 31, colors.free, w < 400 ? 10 : 11);
        text(c, 'Valence band', left + 8, 125, '#d5d6c4', w < 400 ? 10 : 11);
        arrow(c, { x: 12, y: 135 }, { x: 12, y: 16 }, '#7d9fb6');
        text(c, 'E', 12, 6, '#a3bdcf', 10, 'center');
        text(c, 'Gap · 1.12 eV', left + 8, 79, '#7c9eb5', 10);
        if (config.donor) { line(c, {x:left,y:62}, {x:w-4,y:62}, '#a18bc1', 1, [4,4]); text(c, 'Donor', left + 8, 56, colors.donor, 9); }
        if (config.acceptor) { line(c, {x:left,y:99}, {x:w-4,y:99}, '#aa7e92', 1, [4,4]); text(c, 'Acceptor', left + 8, 94, colors.acceptor, 9); }
        const dotStart = Math.max(w * .54, 160), dotWidth = Math.max(50, w - dotStart - 20);
        crystal.free.filter(p => p.id !== focusId()).forEach((p, i) => dot(c, { x: dotStart + i * dotWidth / Math.max(13, crystal.free.length), y: 31 }, 3, colors.free));
        crystal.holes().forEach((p, i) => dot(c, { x: dotStart + i * dotWidth / Math.max(13, crystal.holes().length), y: 125 }, 4, colors.hole, true));
        const e = crystal.event, id = focusId();
        if (id) {
            let y = energyLevel(id);
            if (e && e.electron === id) {
                const levels = { excite:[124,31], recombine:[31,124], donor:[62,31], acceptor:[124,99],
                    donorCapture:[e.source === undefined ? 31 : 124,62], acceptorRelease:[99,e.destination === undefined ? 31 : 124], hop:[124,124], contactFill:[124,124], contactExtract:[124,124] };
                const pair = levels[e.type] || [124,124];
                // Allowed-state populations change; the forbidden gap never hosts the electron.
                y = transferProgress(e) < .5 ? pair[0] : pair[1];
                if (pair[0] !== pair[1]) arrow(c, { x:w*.79,y:pair[0] }, {x:w*.79,y:pair[1]}, colors.focus, [3,3]);
            }
            dot(c, { x:w*.79,y }, 5, colors.focus);
            dot(c, { x:w*.79,y }, 9, colors.focus, true);
        }
    }
    canvas.addEventListener('click', event => {
        const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
        const atom = crystal.atoms.find(a => Math.hypot(point(a).x - x, point(a).y - y) < 17);
        if (atom && atom.kind === 'si' && $('dopingSelect').value !== 'intrinsic') { addDopantAt(atom.id); return; }
        const free = crystal.free.find(e => Math.hypot(point(e).x - x, point(e).y - y) < 12);
        const slot = crystal.slots.find(s => Math.hypot(point(s).x - x, point(s).y - y) < 9);
        if (free || slot?.electron) {
            paused = true; follow = 'electron'; trackedElectron = free?.id || slot.electron;
            crystal.message = free ? 'Selected electron: free in the conduction band. Play to follow its motion, or Step to inspect the next event.'
                : 'Selected electron: bound in a covalent bond, in the valence band. Heat can excite a bond electron into the conduction band.';
        } else if (slot && slot.reserved === null) {
            paused = true; follow = 'hole'; trackedElectron = null; crystal.followHole = slot.id;
            crystal.message = 'Selected hole: this bond slot is empty. Step to watch a neighboring electron fill it and leave a new vacancy.';
        }
        syncControls(); refresh();
    });
    function refresh() {
        const counts = crystal.counts();
        $('boundCount').textContent = counts.bound;
        $('freeCount').textContent = counts.free;
        $('holeCount').textContent = counts.holes;
        if (previousMessage !== crystal.message) { $('eventText').textContent = crystal.message; previousMessage = crystal.message; }
        $('eventTitle').textContent = paused ? 'PAUSED · STEP THROUGH THE ELECTRON TRANSFER' : crystal.event ? 'LIVE EVENT · FOLLOW THE HIGHLIGHTED ELECTRON' : 'WATCH WHAT CHANGES';
        $('crystalDescription').textContent = `Straight silicon bonding diagram. ${counts.bound} occupied bond states, ${counts.free} free electrons, and ${counts.holes} mobile empty states. ${crystal.message}`;
        const event = crystal.event;
        const displayEvent = event || ((paused || crystal.time < crystal.settleUntil) ? crystal.lastEvent : null);
        const stage = event ? (event.progress < .22 ? 0 : event.progress < .78 ? 1 : 2) : displayEvent ? 2 : -1;
        const vacancyTransfer = ['hop', 'acceptor'].includes(displayEvent?.type);
        const labels = vacancyTransfer ? ['1 · Occupied bond + vacancy', '2 · Electron fills vacancy', '3 · Source becomes the hole']
            : ['1 · Initial electron state', '2 · Occupancy changes', '3 · New state established'];
        ['transferBefore', 'transferDuring', 'transferAfter'].forEach((id, i) => {
            $(id).textContent = labels[i]; $(id).classList.toggle('active', i === stage);
        });
        const filling = fillsHole(displayEvent);
        $('transferExplanation').textContent = filling
            ? stage === 0 ? 'A holds the highlighted electron. B has an empty state—the amber ring. White dots show the other occupied bond states.'
                : stage === 1 ? 'Follow the highlighted electron from A into B. The receiving vacancy stays at B until that electron arrives.'
                : vacancyTransfer ? 'B is filled. A is now missing an electron: the hole has shifted opposite to the electron transfer. One hole before, one hole after.'
                : displayEvent.type === 'recombine' ? 'The free electron has filled B. Recombination removes one free electron and one hole; it creates no new hole at A.'
                : 'An electron from the contact has filled B. The contact supplies the charge.'
            : 'Choose P-type + current to follow a neighboring bond electron into a hole. A free electron can also fill a hole through recombination.';
        $('energyDescription').textContent = event?.type === 'excite' ? 'The highlighted electron is being excited from the valence band to the conduction band. This is the same electron leaving a bond above.'
            : event?.type === 'donor' ? 'The highlighted donor electron rises from its shallow donor level to the conduction band. No valence-band hole is created.'
            : event?.type === 'acceptor' ? 'A valence electron enters the acceptor state. Its original valence state becomes a hole.'
            : 'Free electrons occupy the conduction band; bond electrons and mobile vacancies belong to the valence band. This vertical axis shows energy, not height in the crystal.';
    }
    function animate(now) {
        const delta = Math.min((now - previousFrame) / 1000, .1); previousFrame = now;
        if (!paused && !document.hidden) {
            accumulator += delta * speed;
            while (accumulator >= 1 / 60) { crystal.tick(1 / 60); accumulator -= 1 / 60; }
        } else accumulator = 0;
        if (sizes.has(canvas) && sizes.has(energyCanvas) && sizes.has(transferCanvas)) { drawCrystal(); drawEnergy(); drawTransfer(); }
        elapsed += delta;
        if (elapsed > .12) { refresh(); elapsed = 0; }
        requestAnimationFrame(animate);
    }
    syncControls(); refresh(); resize(canvas); resize(energyCanvas); resize(transferCanvas); requestAnimationFrame(animate);
    window.semiconductorLab = Object.freeze({
        getState: () => ({ ...config, paused, follow, counts: crystal.counts(), event: crystal.event?.type || null }),
        getResult: () => ({ ...physics }),
        inspect: () => ({ ...crystal.invariant(), contactCount: crystal.contactCount, dopants: crystal.dopants.length })
    });
})();

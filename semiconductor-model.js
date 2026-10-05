/* Shared physics and discrete teaching model. No rendering or DOM dependencies. */
(function (root) {
    'use strict';
    const Q = 1.602176634e-19;
    const KB = 8.617333262e-5;
    const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
    const density = value => Number(value) <= 0 ? 0 : 10 ** (12 + (Number(value) - 1) / 10);
    function solve(config) {
        const T = config.temperature;
        const ni = T <= 0 ? 0 : 1.5e10 * (T / 300) ** 1.5 * Math.exp(1.12 / (2 * KB) * (1 / 300 - 1 / T));
        // Smooth teaching approximation for freeze-out, not a dopant-specific fit.
        const fraction = T <= 0 ? 0 : 1 / (1 + Math.exp((85 - T) / 16));
        const nd = density(config.donor) * fraction;
        const na = density(config.acceptor) * fraction;
        const delta = nd - na;
        const major = (Math.abs(delta) + Math.hypot(delta, 2 * ni)) / 2;
        const minor = major > 0 ? ni * ni / major : 0;
        const n = delta >= 0 ? major : minor;
        const p = delta >= 0 ? minor : major;
        const mobility = (300 / Math.max(80, T)) ** 1.35 / (1 + ((nd + na) / 8e17) ** 0.42);
        const muN = 1350 * mobility, muP = 480 * mobility;
        const field = config.power ? config.voltage / (config.length * 1e-4) : 0;
        const jn = Q * n * muN * field, jp = Q * p * muP * field;
        const area = config.area * 1e-8;
        const sigma = Q * (n * muN + p * muP);
        return { T, ni, nd, na, n, p, fraction, field, muN, muP, jn, jp,
            in: jn * area, ip: jp * area, current: (jn + jp) * area,
            sigma, rho: sigma ? 1 / sigma : Infinity,
            fermi: ni > 0 && n > 0 ? clamp(KB * T * Math.log(n / ni), -.55, .55) : 0 };
    }
    class Crystal {
        constructor(config) {
            this.config = { ...config };
            this.seed = 7341;
            this.serial = 0;
            this.time = 0;
            this.event = null;
            this.lastEvent = null;
            this.settleUntil = 0;
            this.free = [];
            this.pending = [];
            this.netOut = 0;
            this.contactCount = 0;
            this.followHole = null;
            this.followElectron = null;
            this.atoms = [];
            this.slots = [];
            this.bonds = [];
            this.dopants = [];
            this.message = 'Each bond holds two shared electrons. Warm the crystal, add a dopant, or apply voltage.';
            for (let row = 0; row < 4; row++) for (let col = 0; col < 7; col++) {
                this.atoms.push({ id: row * 7 + col, row, col, x: .1 + col * .8 / 6, y: .17 + row * .66 / 3, kind: 'si' });
            }
            for (const atom of this.atoms) {
                if (atom.col < 6) this.addBond(atom, this.atoms[atom.id + 1]);
                if (atom.row < 3) this.addBond(atom, this.atoms[atom.id + 7]);
            }
            this.initialElectrons = this.slots.length;
        }
        random() { this.seed = (1664525 * this.seed + 1013904223) >>> 0; return this.seed / 4294967296; }
        id() { return `e${++this.serial}`; }
        addBond(a, b) {
            const bond = { id: this.bonds.length, a: a.id, b: b.id, slots: [] };
            for (let i = 0; i < 2; i++) {
                const slot = { id: this.slots.length, bond: bond.id, x: (a.x + b.x) / 2 + (a.col === b.col ? (i ? .008 : -.008) : 0),
                    y: (a.y + b.y) / 2 + (a.row === b.row ? (i ? .012 : -.012) : 0), electron: this.id(), reserved: null };
                bond.slots.push(slot.id); this.slots.push(slot);
            }
            this.bonds.push(bond);
        }
        holes() { return this.slots.filter(s => s.electron === null && s.reserved === null); }
        occupied() { return this.slots.filter(s => s.electron !== null && s.reserved === null); }
        counts() {
            return { bound: this.slots.filter(s => s.electron !== null).length,
                free: this.free.length, holes: this.holes().length,
                donorBound: this.dopants.filter(d => d.kind === 'donor' && d.electron).length };
        }
        invariant() {
            const ids = [...this.slots.map(s => s.electron).filter(Boolean), ...this.free.map(e => e.id),
                ...this.dopants.filter(d => d.kind === 'donor' && d.electron).map(d => d.electron)];
            return { unique: new Set(ids).size === ids.length,
                conserved: ids.length + this.netOut === this.initialElectrons,
                electrons: ids.length, expected: this.initialElectrons - this.netOut };
        }
        choose(items) { return items[Math.floor(this.random() * items.length)]; }
        donorPosition(atom) { return { x: atom.x + .025, y: atom.y - .045 }; }
        neighbors(hole, occupied) {
            const target = this.bonds[hole.bond];
            // Only adjacent bonds sharing a lattice atom can exchange a valence electron.
            return occupied.filter(s => {
                const b = this.bonds[s.bond];
                return b.id !== target.id && [b.a, b.b].some(id => id === target.a || id === target.b);
            });
        }
        makeFree(id, from) {
            this.free.push({ id, x: from.x, y: from.y, vx: (this.random() - .5) * .11, vy: (this.random() - .5) * .1, age: 0 });
        }
        addDopant(kind, atomId) {
            this.finishEvent();
            const hosts = this.atoms.filter(a => a.kind === 'si');
            const atom = hosts.find(a => a.id === atomId) || this.choose(hosts.filter(a => a.col > 0 && a.col < 6)) || hosts[0];
            if (!atom) return false;
            const d = { atom: atom.id, kind, ionized: false, electron: null, slot: null };
            if (kind === 'donor') { d.electron = this.id(); this.initialElectrons++; }
            else {
                const bond = this.bonds.find(b => (b.a === atom.id || b.b === atom.id) && b.slots.some(i => this.slots[i].electron && this.slots[i].reserved === null));
                if (!bond) return false;
                const slot = bond.slots.map(i => this.slots[i]).find(s => s.electron && s.reserved === null);
                slot.electron = null; slot.reserved = atom.id; d.slot = slot.id;
                this.initialElectrons--;
            }
            atom.kind = kind; this.dopants.push(d);
            this.message = kind === 'donor' ? 'Phosphorus replaces silicon: four electrons bond; its extra electron starts weakly bound.'
                : 'Boron replaces silicon with one fewer valence electron. Its empty acceptor state can capture a bond electron.';
            return true;
        }
        start(type, from, to, electron, extra = {}) {
            const field = Math.abs(solve(this.config).field);
            const duration = type === 'hop' ? 2.8 - .3 * clamp(field / 1000, 0, 1) : type === 'acceptor' || type === 'recombine' ? 2.5 : 1.8;
            this.event = { type, from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y }, electron, progress: 0, duration, ...extra };
            const messages = {
                excite: 'Heat excites a bound electron. It enters the conduction band and leaves an empty bond state.',
                recombine: 'A conduction electron fills an empty bond. The free electron and hole disappear together.',
                hop: 'Watch the electron fill the empty slot. Its old slot becomes the next hole.',
                donor: 'The donor releases its extra electron into the conduction band. The positive donor ion stays fixed.',
                acceptor: 'A bond electron fills the acceptor state. Its old bond now contains a mobile hole; the acceptor becomes negative.',
                donorCapture: 'On cooling, a donor recaptures an electron and becomes neutral.',
                acceptorRelease: 'On cooling, the acceptor releases its captured electron and becomes neutral.',
                contactFill: 'A contact electron fills this hole. A separate electron will leave at the opposite contact.',
                contactExtract: 'This bond electron leaves through the contact, creating a new hole in the sample.'
            };
            this.message = messages[type];
            if (type === 'hop') this.followHole = extra.destination;
        }
        finishEvent() {
            const e = this.event;
            if (!e) return;
            const source = e.source === undefined ? null : this.slots[e.source];
            const destination = e.destination === undefined ? null : this.slots[e.destination];
            const dopant = e.dopant === undefined ? null : this.dopants[e.dopant];
            if (e.type === 'excite') { source.electron = null; this.makeFree(e.electron, e.to); this.followHole = source.id; this.followElectron = e.electron; }
            if (e.type === 'hop') { destination.electron = source.electron; source.electron = null; this.followHole = source.id; }
            if (e.type === 'recombine') { this.free = this.free.filter(p => p.id !== e.electron); destination.electron = e.electron; }
            if (e.type === 'donor') { dopant.electron = null; dopant.ionized = true; this.makeFree(e.electron, e.to); this.followElectron = e.electron; }
            if (e.type === 'acceptor') { source.electron = null; destination.electron = e.electron; dopant.ionized = true; this.followHole = source.id; }
            if (e.type === 'donorCapture') {
                if (source) source.electron = null; else this.free = this.free.filter(p => p.id !== e.electron);
                dopant.electron = e.electron; dopant.ionized = false;
            }
            if (e.type === 'acceptorRelease') {
                source.electron = null; dopant.ionized = false;
                if (destination) destination.electron = e.electron; else this.makeFree(e.electron, e.to);
            }
            if (e.type === 'contactFill') { destination.electron = e.electron; this.netOut--; this.pendingHoleContact = e.exitSide; this.contactCount++; }
            if (e.type === 'contactExtract') { source.electron = null; this.netOut++; this.pendingHoleContact = null; this.followHole = source.id; this.contactCount++; }
            this.followElectron = e.type === 'contactExtract' ? null : e.electron;
            this.lastEvent = { ...e, progress: 1 };
            this.event = null;
            this.settleUntil = this.time + (['hop', 'acceptor', 'recombine'].includes(e.type) ? 1.15 : .65);
        }
        nextEvent(preferHop = false) {
            if (this.event) return;
            const physics = solve(this.config);
            const holes = this.holes(), occupied = this.occupied();
            if (this.pendingHoleContact !== undefined && this.pendingHoleContact !== null) {
                const left = this.pendingHoleContact === 'left';
                const source = occupied.slice().sort((a, b) => left ? a.x - b.x : b.x - a.x)[0];
                if (source) this.start('contactExtract', source, { x: left ? 0 : 1, y: source.y }, source.electron, { source: source.id });
                return;
            }
            // Neutral impurity states are resolved before equilibrium carrier events.
            for (const kind of ['donor', 'acceptor']) {
                const group = this.dopants.filter(d => d.kind === kind);
                const target = Math.round(group.length * physics.fraction);
                const active = group.filter(d => d.ionized);
                if (active.length < target) {
                    const d = group.find(d => !d.ionized), atom = this.atoms[d.atom], index = this.dopants.indexOf(d);
                    if (kind === 'donor') this.start('donor', this.donorPosition(atom), { x: atom.x + .055, y: atom.y - .09 }, d.electron, { dopant: index });
                    else {
                        const dest = this.slots[d.slot];
                        const source = this.neighbors(dest, occupied).sort((a, b) => Math.hypot(a.x - dest.x, a.y - dest.y) - Math.hypot(b.x - dest.x, b.y - dest.y))[0];
                        if (source) this.start('acceptor', source, dest, source.electron, { source: source.id, destination: dest.id, dopant: index });
                    }
                    return;
                }
                if (active.length > target) {
                    const d = active[0], atom = this.atoms[d.atom], index = this.dopants.indexOf(d);
                    if (kind === 'donor') {
                        const source = this.free[0] || occupied[0];
                        if (source) this.start('donorCapture', source, this.donorPosition(atom), source.electron || source.id,
                            { dopant: index, ...(source.electron ? { source: source.id } : {}) });
                    } else {
                        const source = this.slots[d.slot], dest = holes[0];
                        this.start('acceptorRelease', source, dest || { x: atom.x + .04, y: atom.y - .07 }, source.electron,
                            { dopant: index, source: source.id, ...(dest ? { destination: dest.id } : {}) });
                    }
                    return;
                }
            }
            const donorCount = this.dopants.filter(d => d.kind === 'donor' && d.ionized).length;
            const acceptorCount = this.dopants.filter(d => d.kind === 'acceptor' && d.ionized).length;
            const thermal = clamp(Math.round((Math.log10(Math.max(physics.ni, 1)) - 7) / 1.6), 0, 7);
            const targetN = Math.max(0, donorCount - acceptorCount) + thermal;
            const targetP = Math.max(0, acceptorCount - donorCount) + thermal;
            if (this.free.length > targetN && holes.length > targetP) {
                this.recombine(holes[0]); return;
            }
            if (this.free.length + this.pending.length < targetN && holes.length < targetP) {
                const source = this.choose(occupied);
                if (source) this.start('excite', source, { x: clamp(source.x + .04, .08, .92), y: clamp(source.y - .08, .12, .9) }, source.electron, { source: source.id });
                return;
            }
            if (!preferHop && thermal > 0 && this.free.length && holes.length && this.random() < .13) {
                this.recombine(this.choose(holes)); return;
            }
            if (holes.length && occupied.length) {
                const hole = holes.find(s => s.id === this.followHole) || this.choose(holes);
                const direction = Math.sign(physics.field);
                if (direction && (direction > 0 ? hole.x > .82 : hole.x < .18)) {
                    this.start('contactFill', { x: direction > 0 ? 1 : 0, y: hole.y }, hole, this.id(),
                        { destination: hole.id, exitSide: direction > 0 ? 'left' : 'right' });
                    return;
                }
                const candidates = this.neighbors(hole, occupied);
                let source;
                if (direction) source = candidates.filter(s => (s.x - hole.x) * direction > .025).sort((a,b) =>
                    Math.abs(a.y-hole.y)-Math.abs(b.y-hole.y) || Math.hypot(a.x-hole.x,a.y-hole.y)-Math.hypot(b.x-hole.x,b.y-hole.y))[0];
                if (!source) source = this.choose(candidates);
                if (source) this.start('hop', source, hole, source.electron, { source: source.id, destination: hole.id });
            }
        }
        recombine(hole) {
            const electron = hole && this.free.slice().sort((a,b) => Math.hypot(a.x-hole.x,a.y-hole.y)-Math.hypot(b.x-hole.x,b.y-hole.y))[0];
            if (electron && hole) this.start('recombine', electron, hole, electron.id, { destination: hole.id });
        }
        tick(dt) {
            this.time += dt;
            const physics = solve(this.config);
            for (const p of this.free.slice()) {
                if (this.event?.electron === p.id) continue;
                p.age += dt;
                if (this.random() < dt * 3) { p.vx = (this.random() - .5) * .14; p.vy = (this.random() - .5) * .13; }
                p.x += (p.vx - clamp(physics.field / 1000, -1, 1) * .16) * dt;
                p.y += p.vy * dt;
                if (p.y < .1 || p.y > .9) { p.y = clamp(p.y, .1, .9); p.vy *= -1; }
                if (p.x < .035 || p.x > .965) {
                    if (physics.field) {
                        this.free = this.free.filter(e => e.id !== p.id);
                        this.netOut++; this.contactCount++;
                        this.pending.push({ delay: .25, y: p.y });
                    } else { p.x = clamp(p.x, .035, .965); p.vx *= -1; }
                }
            }
            for (const p of this.pending.slice()) {
                p.delay -= dt;
                if (p.delay <= 0) {
                    this.makeFree(this.id(), { x: physics.field >= 0 ? .96 : .04, y: p.y });
                    this.netOut--; this.contactCount++; this.pending.splice(this.pending.indexOf(p), 1);
                }
            }
            if (!this.event && this.time >= this.settleUntil) this.nextEvent();
            if (this.event) {
                this.event.progress = Math.min(1, this.event.progress + dt / this.event.duration);
                if (this.event.progress >= 1) this.finishEvent();
            }
        }
        step() { if (!this.event) this.nextEvent(true); this.finishEvent(); }
    }
    const api = { Crystal, solve, density, clamp };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.SemiconductorModel = api;
})(typeof window !== 'undefined' ? window : globalThis);

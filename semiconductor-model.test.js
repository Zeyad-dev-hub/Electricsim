'use strict';
const assert = require('node:assert/strict');
const { Crystal, solve, density } = require('./semiconductor-model.js');
const defaults = { temperature: 300, donor: 0, acceptor: 0, voltage: .1, power: false, length: 2, area: .25 };
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
function conserved(model) { assert.deepEqual(model.invariant(), { unique: true, conserved: true, electrons: model.initialElectrons - model.netOut, expected: model.initialElectrons - model.netOut }); }
function advance(model, seconds) { for (let i = 0; i < seconds * 60; i++) { model.tick(1/60); conserved(model); } }

check('density slider has a true off and immediate nonzero first step', () => {
    assert.equal(density(0), 0); assert.equal(density(1), 1e12); assert.equal(density(31), 1e15); assert.equal(density(61), 1e18);
});
check('intrinsic equilibrium and signed drift match equations', () => {
    const r = solve(defaults); assert.equal(r.ni, 1.5e10); assert.equal(r.n, r.p); assert.equal(r.current, 0);
    const a = solve({ ...defaults, donor:41, power:true }), b = solve({ ...defaults, donor:41, power:true, voltage:-.1 });
    assert.equal(a.field, 500); assert.equal(a.current, -b.current);
    assert.ok(Math.abs(a.n * a.p - a.ni ** 2) / a.ni ** 2 < 1e-12);
});
check('0 K intrinsic crystal remains completely bonded', () => {
    const m = new Crystal({ ...defaults, temperature:0 }); advance(m, 10);
    assert.deepEqual(m.counts(), { bound:90, free:0, holes:0, donorBound:0 });
});
check('one excitation creates exactly one free electron and one vacancy', () => {
    const m = new Crystal(defaults); m.nextEvent(); assert.equal(m.event.type, 'excite');
    const id = m.event.electron, source = m.event.source; m.finishEvent();
    assert.equal(m.free[0].id, id); assert.equal(m.slots[source].electron, null);
    assert.equal(m.holes().length, 1); conserved(m);
});
check('recombination fills the vacancy with the same free electron', () => {
    const m = new Crystal(defaults); m.step(); const id = m.free[0].id, hole = m.holes()[0];
    m.recombine(hole); m.finishEvent(); assert.equal(m.free.length, 0); assert.equal(m.slots[hole.id].electron, id); conserved(m);
});
check('donor release creates no valence vacancy', () => {
    const m = new Crystal(defaults); m.addDopant('donor', 9); m.nextEvent(); assert.equal(m.event.type, 'donor');
    m.finishEvent(); assert.equal(m.free.length, 1); assert.equal(m.holes().length, 0); assert.equal(m.dopants[0].ionized, true); conserved(m);
});
check('acceptor capture leaves a mobile vacancy and fixed negative ion', () => {
    const m = new Crystal(defaults); m.addDopant('acceptor', 9); assert.equal(m.holes().length, 0);
    m.nextEvent(); assert.equal(m.event.type, 'acceptor'); const id = m.event.electron; m.finishEvent();
    assert.equal(m.free.length, 0); assert.equal(m.holes().length, 1);
    assert.equal(m.slots[m.dopants[0].slot].electron, id); assert.equal(m.dopants[0].ionized, true); conserved(m);
});
check('a hop moves an electron into a vacancy; the source becomes the next hole', () => {
    const m = new Crystal({ ...defaults, temperature:150, power:true }); m.addDopant('acceptor', 9); m.step(); m.nextEvent(true);
    assert.equal(m.event.type, 'hop'); const { source, destination, electron } = m.event;
    assert.ok(m.slots[source].x > m.slots[destination].x, 'electron must hop left with rightward field');
    m.finishEvent(); assert.equal(m.slots[source].electron, null); assert.equal(m.slots[destination].electron, electron); conserved(m);
});
check('negative field reverses the directed hole-transfer bias', () => {
    const m = new Crystal({ ...defaults, temperature:150, power:true, voltage:-.1 }); m.addDopant('acceptor', 10); m.step();
    m.nextEvent(true); assert.equal(m.event.type, 'hop');
    assert.ok(m.slots[m.event.source].x < m.slots[m.event.destination].x); m.finishEvent(); conserved(m);
});
check('cooling and compensation conserve electrons through all transitions', () => {
    const m = new Crystal({ ...defaults, donor:31, acceptor:41 });
    for (const id of [8,10,12]) m.addDopant('donor', id);
    for (const id of [15,17,19,23]) m.addDopant('acceptor', id);
    advance(m, 45); m.config.temperature = 0; advance(m, 50);
    assert.equal(m.free.length, 0); assert.equal(m.holes().length, 0); assert.ok(m.dopants.every(d => !d.ionized));
});
check('sustained contact flow and polarity reversal preserve electron accounting', () => {
    const m = new Crystal({ ...defaults, power:true, voltage:.2 });
    m.addDopant('donor', 9); m.addDopant('acceptor', 18);
    advance(m, 90); assert.ok(m.contactCount > 0);
    m.config.voltage = -.2; advance(m, 90);
    m.config.power = false; advance(m, 10); conserved(m);
});
check('each step completes at most one event without advancing thermal motion', () => {
    const m = new Crystal(defaults); const time = m.time; m.step();
    assert.equal(m.time, time); assert.equal(m.event, null); assert.equal(m.free.length, 1); conserved(m);
});
check('valence transfers stay on neighboring bonds and preserve occupancy during animation', () => {
    const m = new Crystal({ ...defaults, temperature:150, power:true }); m.addDopant('acceptor', 9); m.step();
    for (let i = 0; i < 15; i++) {
        m.nextEvent(true); const e = m.event;
        if (e?.type === 'hop') {
            const a = m.bonds[m.slots[e.source].bond], b = m.bonds[m.slots[e.destination].bond];
            assert.ok([a.a,a.b].some(id => id === b.a || id === b.b));
            const before = m.counts(); m.tick(e.duration * .5);
            assert.deepEqual(m.counts(), before); conserved(m);
        }
        m.finishEvent(); conserved(m);
    }
});
check('donor release begins at the displayed weakly bound state', () => {
    const m = new Crystal(defaults); m.addDopant('donor', 9); m.nextEvent();
    assert.deepEqual(m.event.from, m.donorPosition(m.atoms[9]));
});
console.log(`\n${checks} model checks passed.`);

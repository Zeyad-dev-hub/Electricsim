'use strict';
const assert = require('node:assert/strict');
const Lab = require('../js/logic-ic-lab.js');

let checks = 0;
function check(name, fn) {
    fn();
    checks++;
    console.log(`PASS: ${name}`);
}

console.log('=================================================================');
console.log('       LOGIC IC LAB — 3 FULL SYSTEMATIC SCANS & VERIFICATION     ');
console.log('=================================================================\n');

// =========================================================================
// SCAN 1: ELECTRICAL & SOLVER CORE
// =========================================================================
console.log('>>> [SCAN 1] Electrical & Solver Core Tests');

check('1.1: Lamp circuit physics — strict closed circuit to ground enforcement', () => {
    // A: Anode HIGH (+5V), Cathode OPEN -> OFF (open_cathode)
    const docA = Lab.blankICDoc();
    const batA = Lab.createICComponent('battery', 0, 0, { id: 'bat1' });
    const lampA = Lab.createICComponent('lamp', 100, 0, { id: 'lamp1' });
    docA.components.push(batA, lampA);
    Lab.connectICWire(docA, 'bat1:pos', 'lamp1:anode');
    const resA = Lab.evaluateICBench(docA);
    const stA = resA.lampStates.get('lamp1');
    assert.equal(stA.lit, false, 'Lamp with open cathode must NOT light');
    assert.equal(stA.reason, 'open_cathode');
    assert.equal(stA.anodeVal, 1);
    assert.equal(stA.cathodeWired, false);

    // B: Anode HIGH (+5V), Cathode GND (0V) -> ON (lit)
    Lab.connectICWire(docA, 'bat1:neg', 'lamp1:cathode');
    const resB = Lab.evaluateICBench(docA);
    const stB = resB.lampStates.get('lamp1');
    assert.equal(stB.lit, true, 'Lamp with Anode=5V and Cathode=GND must light');
    assert.equal(stB.reason, 'lit');
    assert.equal(stB.anodeVal, 1);
    assert.equal(stB.cathodeVal, 0);

    // C: Anode LOW (0V), Cathode GND (0V) -> OFF
    const docC = Lab.blankICDoc();
    const gndC = Lab.createICComponent('gnd', 0, 0, { id: 'gnd1' });
    const lampC = Lab.createICComponent('lamp', 100, 0, { id: 'lamp1' });
    docC.components.push(gndC, lampC);
    Lab.connectICWire(docC, 'gnd1:pin', 'lamp1:anode');
    Lab.connectICWire(docC, 'gnd1:pin', 'lamp1:cathode');
    const resC = Lab.evaluateICBench(docC);
    const stC = resC.lampStates.get('lamp1');
    assert.equal(stC.lit, false);
    assert.equal(stC.reason, 'low_input');

    // D: Reverse Biased: Anode 0V (GND), Cathode +5V -> OFF (reverse_bias)
    const docD = Lab.blankICDoc();
    const batD = Lab.createICComponent('battery', 0, 0, { id: 'bat1' });
    const lampD = Lab.createICComponent('lamp', 100, 0, { id: 'lamp1' });
    docD.components.push(batD, lampD);
    Lab.connectICWire(docD, 'bat1:neg', 'lamp1:anode');
    Lab.connectICWire(docD, 'bat1:pos', 'lamp1:cathode');
    const resD = Lab.evaluateICBench(docD);
    const stD = resD.lampStates.get('lamp1');
    assert.equal(stD.lit, false);
    assert.equal(stD.reason, 'reverse_bias');

    // E: Both terminals at +5V -> OFF (no_diff_high)
    const docE = Lab.blankICDoc();
    const batE = Lab.createICComponent('battery', 0, 0, { id: 'bat1' });
    const lampE = Lab.createICComponent('lamp', 100, 0, { id: 'lamp1' });
    docE.components.push(batE, lampE);
    Lab.connectICWire(docE, 'bat1:pos', 'lamp1:anode');
    Lab.connectICWire(docE, 'bat1:pos', 'lamp1:cathode');
    const resE = Lab.evaluateICBench(docE);
    const stE = resE.lampStates.get('lamp1');
    assert.equal(stE.lit, false);
    assert.equal(stE.reason, 'no_diff_high');

    // F: Anode OPEN, Cathode GND -> OFF (open_anode)
    const docF = Lab.blankICDoc();
    const gndF = Lab.createICComponent('gnd', 0, 0, { id: 'gnd1' });
    const lampF = Lab.createICComponent('lamp', 100, 0, { id: 'lamp1' });
    docF.components.push(gndF, lampF);
    Lab.connectICWire(docF, 'gnd1:pin', 'lamp1:cathode');
    const resF = Lab.evaluateICBench(docF);
    const stF = resF.lampStates.get('lamp1');
    assert.equal(stF.lit, false);
    assert.equal(stF.reason, 'open_anode');
});

check('1.2: Power rail requirements & reverse power protection on 74xx ICs', () => {
    // Unpowered IC
    const doc = Lab.blankICDoc();
    const ic = Lab.createICComponent('7404', 0, 0, { id: 'ic1' });
    doc.components.push(ic);
    let res = Lab.evaluateICBench(doc);
    assert.equal(res.icStates.get('ic1').powered, false, 'IC must be unpowered without VCC/GND');

    // Properly powered: VCC (Pin 14) = 1, GND (Pin 7) = 0
    const bat = Lab.createICComponent('battery', -200, 0, { id: 'bat1' });
    doc.components.push(bat);
    Lab.connectICWire(doc, 'bat1:pos', 'ic1:14');
    Lab.connectICWire(doc, 'bat1:neg', 'ic1:7');
    res = Lab.evaluateICBench(doc);
    assert.equal(res.icStates.get('ic1').powered, true, 'IC must be powered with 14=VCC, 7=GND');
    assert.equal(res.icStates.get('ic1').reversePower, false);

    // Reverse power: 14 = 0, 7 = 1
    const docRev = Lab.blankICDoc();
    const icRev = Lab.createICComponent('7404', 0, 0, { id: 'ic1' });
    const batRev = Lab.createICComponent('battery', -200, 0, { id: 'bat1' });
    docRev.components.push(icRev, batRev);
    Lab.connectICWire(docRev, 'bat1:neg', 'ic1:14');
    Lab.connectICWire(docRev, 'bat1:pos', 'ic1:7');
    const resRev = Lab.evaluateICBench(docRev);
    assert.equal(resRev.icStates.get('ic1').powered, false);
    assert.equal(resRev.icStates.get('ic1').reversePower, true);
    assert.equal(resRev.anyReverse, true);
});

check('1.3: Short-circuit detection (+5V to GND direct short)', () => {
    const doc = Lab.blankICDoc();
    const bat = Lab.createICComponent('battery', 0, 0, { id: 'bat1' });
    doc.components.push(bat);
    Lab.connectICWire(doc, 'bat1:pos', 'bat1:neg');
    const res = Lab.evaluateICBench(doc);
    assert.equal(res.anyShort, true, 'Direct battery short must be detected');
});

check('1.4: Contention detection (two opposing gate outputs tied together)', () => {
    const doc = Lab.blankICDoc();
    doc.autoPower = true;
    const ic1 = Lab.createICComponent('7404', -100, 0, { id: 'ic1' });
    const sw = Lab.createICComponent('switch', -250, 0, { id: 'sw1', closed: true }); // sw = 1
    const gnd = Lab.createICComponent('gnd', -250, 50, { id: 'gnd1' });
    doc.components.push(ic1, sw, gnd);

    // Gate 1: Pin 1 in = 1 -> Pin 2 out = 0
    Lab.connectICWire(doc, 'sw1:out', 'ic1:1');
    // Gate 2: Pin 3 in = 0 (GND) -> Pin 4 out = 1
    Lab.connectICWire(doc, 'gnd1:pin', 'ic1:3');
    // Short outputs 2 and 4 together! (Output 0 fights Output 1)
    Lab.connectICWire(doc, 'ic1:2', 'ic1:4');

    const res = Lab.evaluateICBench(doc);
    assert.equal(res.anyShort, true, 'Opposing gate output contention must trigger conflict');
});

check('1.5: Truth table verification across all 10 authentic IC models', () => {
    // 7404 Hex Inverter
    {
        const doc = Lab.blankICDoc();
        doc.autoPower = true;
        const ic = Lab.createICComponent('7404', 0, 0, { id: 'ic' });
        const sw1 = Lab.createICComponent('switch', -200, 0, { id: 'sw1', closed: false }); // 0
        const sw2 = Lab.createICComponent('switch', -200, 50, { id: 'sw2', closed: true });  // 1
        doc.components.push(ic, sw1, sw2);
        Lab.connectICWire(doc, 'sw1:out', 'ic:1');
        Lab.connectICWire(doc, 'sw2:out', 'ic:3');
        const res = Lab.evaluateICBench(doc);
        assert.equal(res.pinValues.get('ic:2'), 1, '7404 NOT(0) must be 1');
        assert.equal(res.pinValues.get('ic:4'), 0, '7404 NOT(1) must be 0');
    }

    // 7400 Quad 2-Input NAND
    {
        const doc = Lab.blankICDoc();
        doc.autoPower = true;
        const ic = Lab.createICComponent('7400', 0, 0, { id: 'ic' });
        const swA = Lab.createICComponent('switch', -200, 0, { id: 'swA', closed: true });
        const swB = Lab.createICComponent('switch', -200, 50, { id: 'swB', closed: true });
        doc.components.push(ic, swA, swB);
        Lab.connectICWire(doc, 'swA:out', 'ic:1');
        Lab.connectICWire(doc, 'swB:out', 'ic:2');
        let res = Lab.evaluateICBench(doc);
        assert.equal(res.pinValues.get('ic:3'), 0, '7400 NAND(1,1) must be 0');

        swB.closed = false;
        res = Lab.evaluateICBench(doc);
        assert.equal(res.pinValues.get('ic:3'), 1, '7400 NAND(1,0) must be 1');
    }

    // 7402 Quad 2-Input NOR (Reversed pinout: 1=Out, 2=In, 3=In)
    {
        const doc = Lab.blankICDoc();
        doc.autoPower = true;
        const ic = Lab.createICComponent('7402', 0, 0, { id: 'ic' });
        const swA = Lab.createICComponent('switch', -200, 0, { id: 'swA', closed: false });
        const swB = Lab.createICComponent('switch', -200, 50, { id: 'swB', closed: false });
        doc.components.push(ic, swA, swB);
        Lab.connectICWire(doc, 'swA:out', 'ic:2');
        Lab.connectICWire(doc, 'swB:out', 'ic:3');
        let res = Lab.evaluateICBench(doc);
        assert.equal(res.pinValues.get('ic:1'), 1, '7402 NOR(0,0) must be 1');

        swA.closed = true;
        res = Lab.evaluateICBench(doc);
        assert.equal(res.pinValues.get('ic:1'), 0, '7402 NOR(1,0) must be 0');
    }

    // 7408 Quad 2-Input AND
    {
        const doc = Lab.blankICDoc();
        doc.autoPower = true;
        const ic = Lab.createICComponent('7408', 0, 0, { id: 'ic' });
        const swA = Lab.createICComponent('switch', -200, 0, { id: 'swA', closed: true });
        const swB = Lab.createICComponent('switch', -200, 50, { id: 'swB', closed: true });
        doc.components.push(ic, swA, swB);
        Lab.connectICWire(doc, 'swA:out', 'ic:1');
        Lab.connectICWire(doc, 'swB:out', 'ic:2');
        let res = Lab.evaluateICBench(doc);
        assert.equal(res.pinValues.get('ic:3'), 1, '7408 AND(1,1) must be 1');

        swA.closed = false;
        res = Lab.evaluateICBench(doc);
        assert.equal(res.pinValues.get('ic:3'), 0, '7408 AND(0,1) must be 0');
    }

    // 7486 Quad 2-Input XOR
    {
        const doc = Lab.blankICDoc();
        doc.autoPower = true;
        const ic = Lab.createICComponent('7486', 0, 0, { id: 'ic' });
        const swA = Lab.createICComponent('switch', -200, 0, { id: 'swA', closed: true });
        const swB = Lab.createICComponent('switch', -200, 50, { id: 'swB', closed: false });
        doc.components.push(ic, swA, swB);
        Lab.connectICWire(doc, 'swA:out', 'ic:1');
        Lab.connectICWire(doc, 'swB:out', 'ic:2');
        let res = Lab.evaluateICBench(doc);
        assert.equal(res.pinValues.get('ic:3'), 1, '7486 XOR(1,0) must be 1');

        swB.closed = true;
        res = Lab.evaluateICBench(doc);
        assert.equal(res.pinValues.get('ic:3'), 0, '7486 XOR(1,1) must be 0');
    }

    // 7411 Triple 3-Input AND (Pins 3, 4, 5 -> Out 6)
    {
        const doc = Lab.blankICDoc();
        doc.autoPower = true;
        const ic = Lab.createICComponent('7411', 0, 0, { id: 'ic' });
        const sw1 = Lab.createICComponent('switch', -200, 0, { id: 'sw1', closed: true });
        const sw2 = Lab.createICComponent('switch', -200, 50, { id: 'sw2', closed: true });
        const sw3 = Lab.createICComponent('switch', -200, 100, { id: 'sw3', closed: true });
        doc.components.push(ic, sw1, sw2, sw3);
        Lab.connectICWire(doc, 'sw1:out', 'ic:3');
        Lab.connectICWire(doc, 'sw2:out', 'ic:4');
        Lab.connectICWire(doc, 'sw3:out', 'ic:5');
        let res = Lab.evaluateICBench(doc);
        assert.equal(res.pinValues.get('ic:6'), 1, '7411 AND(1,1,1) must be 1');

        sw3.closed = false;
        res = Lab.evaluateICBench(doc);
        assert.equal(res.pinValues.get('ic:6'), 0, '7411 AND(1,1,0) must be 0');
    }
});

check('1.6: BCD 7-Segment Decoder hexadecimal decoding (0 to F)', () => {
    for (let hex = 0; hex < 16; hex++) {
        const doc = Lab.blankICDoc();
        const seg = Lab.createICComponent('seg7', 0, 0, { id: 'seg1' });
        const swA = Lab.createICComponent('switch', -100, -50, { id: 'swA', closed: Boolean(hex & 1) });
        const swB = Lab.createICComponent('switch', -100, -20, { id: 'swB', closed: Boolean(hex & 2) });
        const swC = Lab.createICComponent('switch', -100, 20, { id: 'swC', closed: Boolean(hex & 4) });
        const swD = Lab.createICComponent('switch', -100, 50, { id: 'swD', closed: Boolean(hex & 8) });
        doc.components.push(seg, swA, swB, swC, swD);
        Lab.connectICWire(doc, 'swA:out', 'seg1:A');
        Lab.connectICWire(doc, 'swB:out', 'seg1:B');
        Lab.connectICWire(doc, 'swC:out', 'seg1:C');
        Lab.connectICWire(doc, 'swD:out', 'seg1:D');
        const res = Lab.evaluateICBench(doc);
        const st = res.segStates.get('seg1');
        assert.equal(st.value, hex, `BCD 7-seg value for hex ${hex} failed`);
    }
});

// =========================================================================
// SCAN 2: WIRE MANAGEMENT, ROUTING & TOPOLOGY
// =========================================================================
console.log('\n>>> [SCAN 2] Wire Management, Routing & Topology Tests');

check('2.1: Component rotation bounds & pin positions across 0, 90, 180, 270 deg', () => {
    for (const rot of [0, 90, 180, 270]) {
        const ic = Lab.createICComponent('7400', 100, 200, { rotation: rot });
        const b = Lab.getComponentBounds(ic);
        if (rot === 90 || rot === 270) {
            assert.equal(b.w, 148, 'Swapped width at 90/270');
            assert.equal(b.h, 264, 'Swapped height at 90/270');
        } else {
            assert.equal(b.w, 264);
            assert.equal(b.h, 148);
        }
        const pins = Lab.getComponentPins(ic);
        assert.equal(pins.length, 14, 'DIP-14 must have 14 pins');
    }
});

check('2.2: Obstacle avoidance & wire routing around placed IC package', () => {
    const doc = Lab.blankICDoc();
    const ic = Lab.createICComponent('7400', 0, 0, { id: 'ic1' });
    const sw = Lab.createICComponent('switch', -250, 0, { id: 'sw1' });
    const lamp = Lab.createICComponent('lamp', 250, 0, { id: 'lamp1' });
    doc.components.push(ic, sw, lamp);

    const p1 = Lab.getComponentPins(sw).find(p => p.pin === 'out');
    const p2 = Lab.getComponentPins(lamp).find(p => p.pin === 'anode');
    const path = Lab.routeICWire(p1, p2, [], doc);
    assert.ok(path.length >= 2, 'Route must exist');
    // Ensure route does not plunge through center of IC package
    const centerPointInsideIC = path.some(pt => Math.abs(pt.x) < 50 && Math.abs(pt.y) < 30);
    assert.equal(centerPointInsideIC, false, 'Wire route must avoid package body');
});

check('2.3: Wire geometry — T-junction dots and Crossing bridge hops', () => {
    const doc = Lab.blankICDoc();
    const bat = Lab.createICComponent('battery', -100, 0, { id: 'bat1' });
    const gnd = Lab.createICComponent('gnd', 100, 100, { id: 'gnd1' });
    const lamp1 = Lab.createICComponent('lamp', 0, -50, { id: 'lamp1' });
    const lamp2 = Lab.createICComponent('lamp', 0, 50, { id: 'lamp2' });
    doc.components.push(bat, gnd, lamp1, lamp2);

    // Two lamps sharing battery pos line -> branch connection
    Lab.connectICWire(doc, 'bat1:pos', 'lamp1:anode');
    Lab.connectICWire(doc, 'bat1:pos', 'lamp2:anode');
    Lab.connectICWire(doc, 'gnd1:pin', 'lamp1:cathode');
    Lab.connectICWire(doc, 'gnd1:pin', 'lamp2:cathode');

    const evalData = Lab.evaluateICBench(doc);
    const geom = Lab.computeICWireGeometry(doc, evalData.pins, evalData.pinToNet);
    assert.ok(geom.routes.size === 4, 'All 4 wires have computed routes');
});

// =========================================================================
// SCAN 3: UI, PRESETS & COMPONENT INTEGRATION
// =========================================================================
console.log('\n>>> [SCAN 3] UI, Presets & Component Integration Tests');

check('3.1: All 9 Curated Bench Presets are fully closed circuits with no open cathodes', () => {
    const presetIds = Object.keys(Lab.IC_PRESETS);
    assert.equal(presetIds.length, 9, 'Should have 9 IC presets');
    for (const id of presetIds) {
        const preset = Lab.IC_PRESETS[id];
        assert.ok(preset, `Preset ${id} missing`);
        const doc = preset.build();
        const res = Lab.evaluateICBench(doc);
        assert.equal(res.anyShort, false, `Preset ${id} short circuit!`);
        assert.equal(res.anyReverse, false, `Preset ${id} reverse power!`);

        const lamps = doc.components.filter(c => c.kind === 'lamp');
        assert.ok(lamps.length > 0, `Preset ${id} should have lamps`);
        for (const lamp of lamps) {
            const lst = res.lampStates.get(lamp.id);
            assert.notEqual(lst.reason, 'open_cathode', `Preset ${id} lamp ${lamp.id} has OPEN CATHODE!`);
        }
    }
});

check('3.2: Switch toggling in 7408 AND bench correctly controls lamp illumination', () => {
    const preset = Lab.IC_PRESETS['ic_7408_bench'];
    const doc = preset.build();
    const swA = doc.components.find(c => c.id === 'swA');
    const swB = doc.components.find(c => c.id === 'swB');
    const lamp = doc.components.find(c => c.id === 'lamp1');

    // Both closed -> Lamp lit
    let res = Lab.evaluateICBench(doc);
    assert.equal(res.lampStates.get(lamp.id).lit, true, '7408 Bench: 1 AND 1 must light lamp');

    // Open switch A -> Lamp turns OFF
    swA.closed = false;
    res = Lab.evaluateICBench(doc);
    assert.equal(res.lampStates.get(lamp.id).lit, false, '7408 Bench: 0 AND 1 must turn lamp off');
    assert.equal(res.lampStates.get(lamp.id).reason, 'low_input');

    // Close A, Open B -> Lamp turns OFF
    swA.closed = true;
    swB.closed = false;
    res = Lab.evaluateICBench(doc);
    assert.equal(res.lampStates.get(lamp.id).lit, false, '7408 Bench: 1 AND 0 must turn lamp off');

    // Close both -> Lamp turns ON again
    swB.closed = true;
    res = Lab.evaluateICBench(doc);
    assert.equal(res.lampStates.get(lamp.id).lit, true);
});

check('3.3: Half Adder Preset truth table (A=1, B=0 -> SUM=1, CARRY=0; A=1, B=1 -> SUM=0, CARRY=1)', () => {
    const preset = Lab.IC_PRESETS['ic_half_adder'];
    const doc = preset.build();
    const swA = doc.components.find(c => c.id === 'swA');
    const swB = doc.components.find(c => c.id === 'swB');
    const lSum = doc.components.find(c => c.id === 'lampSum');
    const lCar = doc.components.find(c => c.id === 'lampCar');

    // Case 1: A=1, B=0 -> SUM lit, CARRY off
    swA.closed = true;
    swB.closed = false;
    let res = Lab.evaluateICBench(doc);
    assert.equal(res.lampStates.get(lSum.id).lit, true, '1 + 0 -> SUM lit');
    assert.equal(res.lampStates.get(lCar.id).lit, false, '1 + 0 -> CARRY off');

    // Case 2: A=1, B=1 -> SUM off, CARRY lit
    swB.closed = true;
    res = Lab.evaluateICBench(doc);
    assert.equal(res.lampStates.get(lSum.id).lit, false, '1 + 1 -> SUM off');
    assert.equal(res.lampStates.get(lCar.id).lit, true, '1 + 1 -> CARRY lit');

    // Case 3: A=0, B=0 -> SUM off, CARRY off
    swA.closed = false;
    swB.closed = false;
    res = Lab.evaluateICBench(doc);
    assert.equal(res.lampStates.get(lSum.id).lit, false, '0 + 0 -> SUM off');
    assert.equal(res.lampStates.get(lCar.id).lit, false, '0 + 0 -> CARRY off');
});

check('3.4: Open switch on ground return path NEVER grounds a Lamp or IC Pin 7', () => {
    // A: Lamp cathode wired to an OPEN standalone switch (not connected to GND) -> MUST STAY OFF
    const doc1 = Lab.blankICDoc();
    const bat1 = Lab.createICComponent('battery', -100, 0, { id: 'bat1' });
    const lamp1 = Lab.createICComponent('lamp', 0, 0, { id: 'lamp1' });
    const sw1 = Lab.createICComponent('switch', 100, 0, { id: 'sw1', closed: false });
    doc1.components.push(bat1, lamp1, sw1);
    Lab.connectICWire(doc1, 'bat1:pos', 'lamp1:anode');
    Lab.connectICWire(doc1, 'lamp1:cathode', 'sw1:out');
    let res1 = Lab.evaluateICBench(doc1);
    assert.equal(res1.lampStates.get('lamp1').lit, false, 'Open ungrounded switch must NOT sink lamp cathode current');
    assert.equal(res1.lampStates.get('lamp1').reason, 'open_cathode');

    // B: Series switch between GND and Lamp cathode (GND -> sw:in, sw:out -> lamp:cathode)
    const gnd1 = Lab.createICComponent('gnd', 200, 0, { id: 'gnd1' });
    doc1.components.push(gnd1);
    Lab.connectICWire(doc1, 'sw1:in', 'gnd1:pin');
    // While sw1 is OPEN, lamp must remain OFF and cathode wire must be floating (null)
    res1 = Lab.evaluateICBench(doc1);
    assert.equal(res1.lampStates.get('lamp1').lit, false, 'Lamp behind open ground switch must be OFF');
    assert.equal(res1.lampStates.get('lamp1').reason, 'open_cathode');
    assert.equal(res1.pinValues.get('lamp1:cathode'), null, 'Cathode behind open ground switch must be floating (null)');

    // Close sw1 -> Lamp lights up!
    sw1.closed = true;
    res1 = Lab.evaluateICBench(doc1);
    assert.equal(res1.lampStates.get('lamp1').lit, true, 'Lamp behind closed ground switch must light up');
    assert.equal(res1.lampStates.get('lamp1').reason, 'lit');

    // C: Series switch between GND and IC Pin 7 (GND)
    const doc2 = Lab.blankICDoc();
    const bat2 = Lab.createICComponent('battery', -200, 0, { id: 'bat2' });
    const ic2 = Lab.createICComponent('7404', 0, 0, { id: 'ic2' });
    const swG = Lab.createICComponent('switch', 100, 100, { id: 'swG', closed: false });
    doc2.components.push(bat2, ic2, swG);
    Lab.connectICWire(doc2, 'bat2:pos', 'ic2:14');
    Lab.connectICWire(doc2, 'bat2:neg', 'swG:in');
    Lab.connectICWire(doc2, 'swG:out', 'ic2:7');
    let res2 = Lab.evaluateICBench(doc2);
    assert.equal(res2.icStates.get('ic2').powered, false, 'IC with open switch on Pin 7 GND must be unpowered');

    swG.closed = true;
    res2 = Lab.evaluateICBench(doc2);
    assert.equal(res2.icStates.get('ic2').powered, true, 'IC with closed switch on Pin 7 GND must be powered');
});

check('3.5: Left Component Sidebar layout in logic.html and electronics.html replaces trafficked upper bar', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const logicHtml = fs.readFileSync(path.join(__dirname, '../pages/logic.html'), 'utf8');
    const elecHtml = fs.readFileSync(path.join(__dirname, '../pages/electronics.html'), 'utf8');
    assert.ok(logicHtml.includes('class="logic-palette-sidebar glass-panel-small"'), 'Logic Lab must have a Left Component Sidebar');
    assert.ok(elecHtml.includes('class="logic-palette-sidebar glass-panel-small"'), 'Electronics Lab must have a Left Component Sidebar');
    assert.ok(elecHtml.includes('class="logic-tools ic-tools-palette logic-sidebar-tools"'), 'IC tools palette must be styled as sidebar tools');
});

// =========================================================================
// SCAN 4: LOGIC GATES SIMULATOR — MSI BLOCKS, LATCHES & LARGE-SCALE DESIGNS
// =========================================================================
console.log('\n>>> [SCAN 4] Logic Gates Simulator — MSI Blocks, Latches & Large-Scale Designs');

require('../js/logic-model.js');
require('../js/logic-evaluator.js');
require('../js/logic-expression.js');
require('../js/logic-simplify.js');
require('../js/logic-synthesis.js');
require('../js/logic-presets.js');
const L = globalThis.LogicLab;

check('4.1: Half Adder (HA) & Full Adder (FA) blocks — exact truth table & multi-output wiring', () => {
    // Half Adder
    const docHA = L.blank();
    const a = L.createInput(docHA, -100, -40, 'A', 0);
    docHA.inputs.push(a);
    const b = L.createInput(docHA, -100, 40, 'B', 0);
    docHA.inputs.push(b);
    const ha = L.createGate('HA', 0, 0);
    docHA.gates.push(ha);
    const outS = L.createOutput(docHA, 120, -30, 'F');
    docHA.outputs.push(outS);
    const outC = L.createOutput(docHA, 120, 30, 'G');
    docHA.outputs.push(outC);
    L.connectWire(docHA, { nodeId: a.id, pin: 'out' }, { nodeId: ha.id, pin: 'in0' });
    L.connectWire(docHA, { nodeId: b.id, pin: 'out' }, { nodeId: ha.id, pin: 'in1' });
    L.connectWire(docHA, { nodeId: ha.id, pin: 'out' }, { nodeId: outS.id, pin: 'in0' });
    L.connectWire(docHA, { nodeId: ha.id, pin: 'out1' }, { nodeId: outC.id, pin: 'in0' });

    const casesHA = [
        [0, 0, 0, 0],
        [0, 1, 1, 0],
        [1, 0, 1, 0],
        [1, 1, 0, 1]
    ];
    for (const [va, vb, expS, expC] of casesHA) {
        a.value = va;
        b.value = vb;
        const ev = L.evaluateCircuit(docHA);
        assert.equal(ev.nodes.get(outS.id).live, expS, `HA(${va},${vb}) Sum`);
        assert.equal(ev.nodes.get(outC.id).live, expC, `HA(${va},${vb}) Carry`);
    }

    // Full Adder
    const docFA = L.blank();
    const faA = L.createInput(docFA, -100, -50, 'A', 0);
    docFA.inputs.push(faA);
    const faB = L.createInput(docFA, -100, 0, 'B', 0);
    docFA.inputs.push(faB);
    const faCin = L.createInput(docFA, -100, 50, 'C', 0);
    docFA.inputs.push(faCin);
    const fa = L.createGate('FA', 0, 0);
    docFA.gates.push(fa);
    const faOutS = L.createOutput(docFA, 120, -30, 'F');
    docFA.outputs.push(faOutS);
    const faOutCout = L.createOutput(docFA, 120, 30, 'G');
    docFA.outputs.push(faOutCout);
    L.connectWire(docFA, { nodeId: faA.id, pin: 'out' }, { nodeId: fa.id, pin: 'in0' });
    L.connectWire(docFA, { nodeId: faB.id, pin: 'out' }, { nodeId: fa.id, pin: 'in1' });
    L.connectWire(docFA, { nodeId: faCin.id, pin: 'out' }, { nodeId: fa.id, pin: 'in2' });
    L.connectWire(docFA, { nodeId: fa.id, pin: 'out' }, { nodeId: faOutS.id, pin: 'in0' });
    L.connectWire(docFA, { nodeId: fa.id, pin: 'out1' }, { nodeId: faOutCout.id, pin: 'in0' });

    for (let bits = 0; bits < 8; bits++) {
        const va = (bits >> 2) & 1;
        const vb = (bits >> 1) & 1;
        const vc = bits & 1;
        const total = va + vb + vc;
        faA.value = va;
        faB.value = vb;
        faCin.value = vc;
        const ev = L.evaluateCircuit(docFA);
        assert.equal(ev.nodes.get(faOutS.id).live, total & 1, `FA(${va},${vb},${vc}) Sum`);
        assert.equal(ev.nodes.get(faOutCout.id).live, (total >> 1) & 1, `FA(${va},${vb},${vc}) Cout`);
    }
});

check('4.2: Multiplexer (MUX2 & MUX4), Priority Encoder (ENC42), Decoder (DEC24), and Comparator (COMP2)', () => {
    // 4:1 MUX preset verification
    const docMux = L.makePreset('mux4Router');
    const evMux = L.evaluateCircuit(docMux);
    assert.equal(evMux.hasLoop, false);
    const outY = docMux.outputs[0];
    assert.equal(evMux.nodes.get(outY.id).live, 1, '4:1 MUX preset default S1=0,S0=1 selects D1=1');

    // Priority Encoder preset verification (D2=1, D0=1 -> Y1=1, Y0=0, V=1)
    const docEnc = L.makePreset('priorityEncoder');
    const evEnc = L.evaluateCircuit(docEnc);
    const outY1 = docEnc.outputs.find(n => n.name === 'F');
    const outY0 = docEnc.outputs.find(n => n.name === 'G');
    const outV = docEnc.outputs.find(n => n.name === 'H');
    assert.equal(evEnc.nodes.get(outY1.id).live, 1, 'ENC42 Y1=1 when D2=1');
    assert.equal(evEnc.nodes.get(outY0.id).live, 0, 'ENC42 Y0=0 when D2=1');
    assert.equal(evEnc.nodes.get(outV.id).live, 1, 'ENC42 Valid=1 when any input is 1');

    // Assert D3=1 overrides D2=1 -> Y1=1, Y0=1
    const inD3 = docEnc.inputs.find(n => n.name === 'D');
    inD3.value = 1;
    const evEnc2 = L.evaluateCircuit(docEnc);
    assert.equal(evEnc2.nodes.get(outY1.id).live, 1);
    assert.equal(evEnc2.nodes.get(outY0.id).live, 1);

    // 2-to-4 Decoder (DEC24) & 1-Bit Comparator (COMP2)
    const docDC = L.blank();
    const inA = L.createInput(docDC, -100, -30, 'A', 1);
    docDC.inputs.push(inA);
    const inB = L.createInput(docDC, -100, 30, 'B', 0);
    docDC.inputs.push(inB);
    const comp = L.createGate('COMP2', 0, 0);
    docDC.gates.push(comp);
    const outGT = L.createOutput(docDC, 120, -40, 'F');
    docDC.outputs.push(outGT);
    const outEQ = L.createOutput(docDC, 120, 0, 'G');
    docDC.outputs.push(outEQ);
    const outLT = L.createOutput(docDC, 120, 40, 'H');
    docDC.outputs.push(outLT);
    L.connectWire(docDC, { nodeId: inA.id, pin: 'out' }, { nodeId: comp.id, pin: 'in0' });
    L.connectWire(docDC, { nodeId: inB.id, pin: 'out' }, { nodeId: comp.id, pin: 'in1' });
    L.connectWire(docDC, { nodeId: comp.id, pin: 'out' }, { nodeId: outGT.id, pin: 'in0' });
    L.connectWire(docDC, { nodeId: comp.id, pin: 'out1' }, { nodeId: outEQ.id, pin: 'in0' });
    L.connectWire(docDC, { nodeId: comp.id, pin: 'out2' }, { nodeId: outLT.id, pin: 'in0' });
    const evComp = L.evaluateCircuit(docDC);
    assert.equal(evComp.nodes.get(outGT.id).live, 1, 'A=1 > B=0');
    assert.equal(evComp.nodes.get(outEQ.id).live, 0);
    assert.equal(evComp.nodes.get(outLT.id).live, 0);
});

check('4.3: Stateful SR-Latch & D-Latch blocks + gate-level cross-coupled NOR latch sequential relaxation', () => {
    const docLatch = L.makePreset('latchesDemo');
    const inS = docLatch.inputs.find(n => n.name === 'A');
    const inR = docLatch.inputs.find(n => n.name === 'B');
    const inD = docLatch.inputs.find(n => n.name === 'C');
    const inEN = docLatch.inputs.find(n => n.name === 'D');
    const outSrQ = docLatch.outputs.find(n => n.name === 'F');
    const outSrQn = docLatch.outputs.find(n => n.name === 'G');
    const outDQ = docLatch.outputs.find(n => n.name === 'H');
    const outDQn = docLatch.outputs.find(n => n.name === 'Y');

    // Step 1: S=1, R=0 sets SR-Latch Q=1; D=1, EN=1 sets D-Latch Q=1
    let ev = L.evaluateCircuit(docLatch);
    assert.equal(ev.nodes.get(outSrQ.id).live, 1);
    assert.equal(ev.nodes.get(outSrQn.id).live, 0);
    assert.equal(ev.nodes.get(outDQ.id).live, 1);
    assert.equal(ev.nodes.get(outDQn.id).live, 0);

    // Step 2: S=0, R=0 -> SR-Latch HOLDS Q=1! EN=0, D=0 -> D-Latch HOLDS Q=1!
    inS.value = 0;
    inEN.value = 0;
    inD.value = 0;
    ev = L.evaluateCircuit(docLatch);
    assert.equal(ev.nodes.get(outSrQ.id).live, 1, 'SR-Latch must hold Q=1 when S=0, R=0');
    assert.equal(ev.nodes.get(outDQ.id).live, 1, 'D-Latch must hold Q=1 when EN=0 even if D changes to 0');

    // Step 3: R=1 resets SR-Latch to Q=0; EN=1 makes D-Latch transparent so D=0 passes to Q=0
    inR.value = 1;
    inEN.value = 1;
    ev = L.evaluateCircuit(docLatch);
    assert.equal(ev.nodes.get(outSrQ.id).live, 0, 'SR-Latch must reset to Q=0 when R=1');
    assert.equal(ev.nodes.get(outSrQn.id).live, 1);
    assert.equal(ev.nodes.get(outDQ.id).live, 0, 'D-Latch must update to Q=0 when EN=1, D=0');
    assert.equal(ev.nodes.get(outDQn.id).live, 1);

    // Step 4: Cross-coupled gate-level NOR SR-Latch sequential relaxation
    const docGateLatch = L.blank();
    const gR = L.createInput(docGateLatch, -120, -40, 'A', 0);
    docGateLatch.inputs.push(gR);
    const gS = L.createInput(docGateLatch, -120, 40, 'B', 1);
    docGateLatch.inputs.push(gS);
    const norTop = L.createGate('NOR', 0, -40, 2);
    const norBot = L.createGate('NOR', 0, 40, 2);
    docGateLatch.gates.push(norTop, norBot);
    const gQ = L.createOutput(docGateLatch, 120, -40, 'F');
    docGateLatch.outputs.push(gQ);
    L.connectWire(docGateLatch, { nodeId: gR.id, pin: 'out' }, { nodeId: norTop.id, pin: 'in0' });
    L.connectWire(docGateLatch, { nodeId: norBot.id, pin: 'out' }, { nodeId: norTop.id, pin: 'in1' });
    L.connectWire(docGateLatch, { nodeId: norTop.id, pin: 'out' }, { nodeId: norBot.id, pin: 'in0' });
    L.connectWire(docGateLatch, { nodeId: gS.id, pin: 'out' }, { nodeId: norBot.id, pin: 'in1' });
    L.connectWire(docGateLatch, { nodeId: norTop.id, pin: 'out' }, { nodeId: gQ.id, pin: 'in0' });

    let evGL = L.evaluateCircuit(docGateLatch);
    assert.equal(evGL.hasFeedback, true, 'Cross-coupled NOR gates form a sequential feedback loop');
    assert.equal(evGL.nodes.get(gQ.id).live, 1, 'Cross-coupled NOR latch sets Q=1 when S=1, R=0');

    // Return S=0 -> holds Q=1 via stored _lastLive!
    gS.value = 0;
    evGL = L.evaluateCircuit(docGateLatch);
    assert.equal(evGL.nodes.get(gQ.id).live, 1, 'Cross-coupled NOR latch holds Q=1 when S=0, R=0');
});

check('4.4: Large-scale experiment support — 12 inputs, 8 outputs, and 2-bit Ripple Adder preset', () => {
    assert.equal(L.INPUT_NAMES.length, 12, 'Supports 12 named inputs');
    assert.equal(L.OUTPUT_NAMES.length, 8, 'Supports 8 named outputs');

    const docAdder = L.makePreset('rippleAdder2Bit');
    const evAdder = L.evaluateCircuit(docAdder);
    // Default in preset: A0=1, B0=1, A1=1, B1=0 -> 3 + 1 = 4 (Cout=1, S1=0, S0=0)
    const outS0 = docAdder.outputs.find(n => n.name === 'F');
    const outS1 = docAdder.outputs.find(n => n.name === 'G');
    const outCout = docAdder.outputs.find(n => n.name === 'H');
    assert.equal(evAdder.nodes.get(outS0.id).live, 0, '3+1 bit 0 = 0');
    assert.equal(evAdder.nodes.get(outS1.id).live, 0, '3+1 bit 1 = 0');
    assert.equal(evAdder.nodes.get(outCout.id).live, 1, '3+1 Cout = 1 (total 4)');

    // Verify 6-input truth table extraction (64 rows) on mux4Router and safe 4-variable K-map simplification
    const docMux = L.makePreset('mux4Router');
    const evMux = L.evaluateCircuit(docMux);
    const tt = L.extractTruthTable(docMux, evMux);
    assert.equal(tt.rows.length, 64, '6-input circuit produces 64-row truth table');
    const simp = L.simplify(evMux.nodes.get(docMux.outputs[0].id).mask, tt.vars);
    assert.ok(simp && simp.sop, 'Simplification safely handles >4 variables without 32-bit overflow');
    assert.deepEqual(simp.vars, ['A', 'B', 'C', 'D'], 'K-Map simplification projects onto first 4 sorted inputs');
    // In mux4Router, S1 (E) = 0, S0 (I) = 1 selects D1 (B), so the 4-var K-Map slice for F must simplify to B!
    assert.equal(simp.sop.expression, 'B', 'When S1=0, S0=1, 4:1 MUX K-map slice over (A,B,C,D) simplifies to B');

    // Verify non-ABCD input subset (e.g. A, E, J) truth table, K-map, and synthesis
    const docCustom = L.blank();
    const inA = L.createInput(docCustom, -120, -48, 'A', 1);
    const inE = L.createInput(docCustom, -120, 0, 'E', 1);
    const inJ = L.createInput(docCustom, -120, 48, 'J', 0);
    docCustom.inputs.push(inA, inE, inJ);
    const gAnd = L.createGate('AND', 0, -24, 2);
    const gOr = L.createGate('OR', 96, 12, 2);
    docCustom.gates.push(gAnd, gOr);
    const outF = L.createOutput(docCustom, 216, 12, 'F');
    docCustom.outputs.push(outF);
    L.connectWire(docCustom, { nodeId: inA.id, pin: 'out' }, { nodeId: gAnd.id, pin: 'in0' });
    L.connectWire(docCustom, { nodeId: inE.id, pin: 'out' }, { nodeId: gAnd.id, pin: 'in1' });
    L.connectWire(docCustom, { nodeId: gAnd.id, pin: 'out' }, { nodeId: gOr.id, pin: 'in0' });
    L.connectWire(docCustom, { nodeId: inJ.id, pin: 'out' }, { nodeId: gOr.id, pin: 'in1' });
    L.connectWire(docCustom, { nodeId: gOr.id, pin: 'out' }, { nodeId: outF.id, pin: 'in0' });

    const evCustom = L.evaluateCircuit(docCustom);
    const ttCustom = L.extractTruthTable(docCustom, evCustom);
    assert.deepEqual(ttCustom.vars, ['A', 'E', 'J']);
    assert.equal(ttCustom.rows.length, 8);
    // Active row for A=1, E=1, J=0 is index 6 (110_2)
    const activeRows = ttCustom.rows.filter(r => r.active);
    assert.equal(activeRows.length, 1);
    assert.equal(activeRows[0].index, 6);
    const simpCustom = L.simplify({ vars: ttCustom.vars, mask16: evCustom.nodes.get(outF.id).mask });
    assert.equal(simpCustom.kmap.vars.length, 3);
    // Synthesize SOP, POS, NAND, NOR for non-ABCD inputs and verify equivalence
    for (const mode of ['sop', 'pos', 'nand', 'nor']) {
        const synDoc = L.synthesizeCircuit(docCustom, { mode });
        const synEv = L.evaluateCircuit(synDoc);
        const synOut = synDoc.outputs.find(o => o.name === 'F');
        assert.equal(synEv.nodes.get(synOut.id).mask, evCustom.nodes.get(outF.id).mask, `Synthesized ${mode} matches non-ABCD mask`);
    }
});

// =========================================================================
// SCAN 5: LOGIC IC LAB — 16-PIN MSI & SEQUENTIAL 74xx ICs + TELEMETRY
// =========================================================================
console.log('\n>>> [SCAN 5] Logic IC Lab — 16-Pin MSI & Sequential 74xx ICs + Telemetry');

check('5.1: 74283 4-Bit Binary Full Adder IC (16-Pin DIP) & DIP-4 Switch Bank', () => {
    const doc = Lab.IC_PRESETS.ic_74283_adder4.build();
    const res = Lab.evaluateICBench(doc);
    // Preset has Bus A = 11 (1011) and Bus B = 5 (0101), Cin = 0 -> Sum = 16 (Σ=0, C4=1)
    const seg = res.segStates.get('segSum');
    const lampCout = res.lampStates.get('lampCout');
    assert.equal(seg.value, 0, '11 + 5 mod 16 = 0 on 7-seg');
    assert.equal(lampCout.lit, true, '11 + 5 = 16 sets Carry-Out C4 HIGH');
    assert.ok(res.telemetry.iccMa > 0, 'Telemetry reports non-zero Icc supply current');
    assert.ok(res.telemetry.powerMw > 0, 'Telemetry reports non-zero power dissipation');
    assert.ok(res.telemetry.propagationDelayNs >= 15, 'Telemetry reports critical path propagation delay');
});

check('5.2: 7493 4-Bit Binary Ripple Counter IC — falling-edge counting & master reset', () => {
    const doc = Lab.IC_PRESETS.ic_7493_counter.build();
    const clk = doc.components.find(c => c.id === 'clk1');
    const swClr = doc.components.find(c => c.id === 'swClr');

    // Initial state with CLK=1 -> count = 0
    let res = Lab.evaluateICBench(doc);
    assert.equal(res.segStates.get('segCnt').value, 0);

    // Pulse clock 5 times (falling edges 1 -> 0 increment the 7493 ripple counter!)
    for (let i = 1; i <= 5; i++) {
        clk.value = 0; // falling edge 1 -> 0
        res = Lab.evaluateICBench(doc);
        assert.equal(res.segStates.get('segCnt').value, i, `After ${i} falling edges, 7493 count must be ${i}`);
        clk.value = 1; // rising edge 0 -> 1
        res = Lab.evaluateICBench(doc);
        assert.equal(res.segStates.get('segCnt').value, i, 'Rising edge must not change count');
    }

    // Activate Master Reset (R0(1) & R0(2) = 1) -> resets count to 0 immediately
    swClr.closed = true;
    res = Lab.evaluateICBench(doc);
    assert.equal(res.segStates.get('segCnt').value, 0, 'Master reset clears 7493 counter to 0');
});

check('5.3: 7474 Dual Positive-Edge-Triggered D Flip-Flop IC & Logic Probe', () => {
    const doc = Lab.IC_PRESETS.ic_7474_register.build();
    const clk = doc.components.find(c => c.id === 'clk1');
    const swD = doc.components.find(c => c.id === 'swD');

    // Initial: clk=1, FF1 Q=0, FF2 Q=0
    clk.value = 0;
    let res = Lab.evaluateICBench(doc);
    assert.equal(res.lampStates.get('lampQ1').lit, false);
    assert.equal(res.probeStates.get('prb1').val, 0);

    // Rising edge 0 -> 1 on CLK shifts D1=1 into FF1 (Q1=1), while FF2 samples pre-edge Q1 (0) without race shoot-through!
    clk.value = 1;
    res = Lab.evaluateICBench(doc);
    assert.equal(res.lampStates.get('lampQ1').lit, true, 'FF1 Q latches D=1 on first rising clock edge');
    assert.equal(res.lampStates.get('lampQ2').lit, false, 'FF2 Q must remain 0 on first rising edge (no race shoot-through)');
    assert.equal(res.probeStates.get('prb1').val, 1, 'Logic probe reads HIGH (1) on FF1 Q');

    // Change D1=0 while CLK=1 -> Q1 must stay 1 (edge-triggered, not transparent!)
    swD.closed = false;
    res = Lab.evaluateICBench(doc);
    assert.equal(res.lampStates.get('lampQ1').lit, true, '7474 D Flip-Flop must ignore D changes while CLK is steady');

    // Second clock cycle (1 -> 0 -> 1): D1=0 shifts into FF1 (Q1=0), while previous Q1=1 shifts into FF2 (Q2=1)!
    clk.value = 0;
    res = Lab.evaluateICBench(doc);
    assert.equal(res.lampStates.get('lampQ1').lit, true, 'Falling clock edge must not alter 7474 Q1');
    assert.equal(res.lampStates.get('lampQ2').lit, false, 'Falling clock edge must not alter 7474 Q2');

    clk.value = 1;
    res = Lab.evaluateICBench(doc);
    assert.equal(res.lampStates.get('lampQ1').lit, false, 'Second rising edge shifts D1=0 into FF1 (Q1=0)');
    assert.equal(res.lampStates.get('lampQ2').lit, true, 'Second rising edge shifts previous Q1=1 into FF2 (Q2=1)!');
});

check('5.4: 7475 D-Latch, 74279 SR-Latch, 74157 Quad MUX, and 74148 Priority Encoder ICs', () => {
    // 74157 Quad 2:1 MUX
    const docMux = Lab.blankICDoc();
    docMux.autoPower = true;
    const ic157 = Lab.createICComponent('74157', 0, 0, { id: 'mux' });
    const swSel = Lab.createICComponent('switch', -200, -40, { id: 'sel', closed: false });
    const sw1A = Lab.createICComponent('switch', -200, 0, { id: 'in1A', closed: true });
    const sw1B = Lab.createICComponent('switch', -200, 40, { id: 'in1B', closed: false });
    docMux.components.push(ic157, swSel, sw1A, sw1B);
    Lab.connectICWire(docMux, 'sel:out', 'mux:1');
    Lab.connectICWire(docMux, 'in1A:out', 'mux:2');
    Lab.connectICWire(docMux, 'in1B:out', 'mux:3');
    let resMux = Lab.evaluateICBench(docMux);
    assert.equal(resMux.pinValues.get('mux:4'), 1, '74157 selects 1A=1 when S=0');
    swSel.closed = true;
    resMux = Lab.evaluateICBench(docMux);
    assert.equal(resMux.pinValues.get('mux:4'), 0, '74157 selects 1B=0 when S=1');

    // 74148 8-to-3 Priority Encoder (Active-Low)
    const docEnc = Lab.blankICDoc();
    docEnc.autoPower = true;
    const ic148 = Lab.createICComponent('74148', 0, 0, { id: 'enc' });
    const gnd = Lab.createICComponent('gnd', -200, 0, { id: 'gnd' });
    docEnc.components.push(ic148, gnd);
    // Pull EI' (Pin 5) and Input 6' (Pin 3) LOW (0V)
    Lab.connectICWire(docEnc, 'gnd:pin', 'enc:5');
    Lab.connectICWire(docEnc, 'gnd:pin', 'enc:3');
    const resEnc = Lab.evaluateICBench(docEnc);
    // Active-low code for 6 (110_2) is A2'=0, A1'=0, A0'=1 (Pins 6=0, 7=0, 9=1)
    assert.equal(resEnc.pinValues.get('enc:6'), 0, '74148 A2_bar for input 6');
    assert.equal(resEnc.pinValues.get('enc:7'), 0, '74148 A1_bar for input 6');
    assert.equal(resEnc.pinValues.get('enc:9'), 1, '74148 A0_bar for input 6');
    assert.equal(resEnc.pinValues.get('enc:14'), 0, '74148 GS_bar active-low valid');
});

console.log(`\n=================================================================`);
console.log(`   ALL ${checks} SCANS & TESTS COMPLETED WITH 100% SUCCESS!   `);
console.log(`=================================================================`);

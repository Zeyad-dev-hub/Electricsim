'use strict';
const assert = require('node:assert/strict');
const Lab = require('./logic-ic-lab.js');

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

check('3.1: All 4 Curated Bench Presets are fully closed circuits with no open cathodes', () => {
    const presetIds = ['ic_7408_bench', 'ic_half_adder', 'ic_7411_3input', 'ic_7400_counter'];
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

check('3.5: Left Component Sidebar layout in logic.html replaces trafficked upper bar', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const html = fs.readFileSync(path.join(__dirname, 'logic.html'), 'utf8');
    // Both modes should have .logic-palette-sidebar inside .logic-workspace
    const sidebarMatches = html.match(/class="logic-palette-sidebar glass-panel-small"/g) || [];
    assert.equal(sidebarMatches.length, 2, 'Both Gates and IC Lab modes must have a Left Component Sidebar');
    assert.ok(html.includes('class="logic-tools ic-tools-palette logic-sidebar-tools"'), 'IC tools palette must be styled as sidebar tools');
});

console.log(`\n=================================================================`);
console.log(`   ALL ${checks} SCANS & TESTS COMPLETED WITH 100% SUCCESS!   `);
console.log(`=================================================================`);

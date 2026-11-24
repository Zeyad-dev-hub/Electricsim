'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Solver = require('../js/electronics-solver.js');
const IO = require('../js/schematic-io.js');
const ExportMod = require('../js/electronics-export.js');
const Lab = require('../js/logic-ic-lab.js');

let passed = 0;
function check(name, fn) {
    fn();
    passed++;
    console.log(`PASS: ${name}`);
}

console.log('=================================================================');
console.log('   2D REALISTIC ELECTRONICS LAB — COMPREHENSIVE TEST SUITE       ');
console.log('=================================================================');

// 1. AA Battery Holder (1-4 cells, strictly 1.5V per AA cell, max 6.0V)
check('1.1: AA Battery Holder strictly models 1.5V per cell (1..4 cells -> 1.5V..6.0V)', () => {
    for (let cells = 1; cells <= 4; cells++) {
        const doc = Lab.blankICDoc();
        const bat = Lab.createICComponent('battery', -100, 0, { id: 'b1', cells });
        assert.equal(bat.cells, cells);
        assert.equal(bat.voltage, Math.round(cells * 1.5 * 10) / 10);
        const res = Lab.createICComponent('resistor', 0, 0, { id: 'r1', ohms: 1000 });
        doc.components.push(bat, res);
        Lab.connectICWire(doc, 'b1:pos', 'r1:a');
        Lab.connectICWire(doc, 'r1:b', 'b1:neg');
        const ev = Lab.evaluateICBench(doc);
        const vPos = ev.pinVoltages.get('b1:pos');
        assert.ok(Math.abs(vPos - cells * 1.5) < 0.05, `Expected ${cells * 1.5}V, got ${vPos}V`);
    }
    // Clamps cells > 4 to max 4 (6.0V)
    const clamped = Lab.createICComponent('battery', 0, 0, { cells: 8 });
    assert.equal(clamped.cells, 4);
    assert.equal(clamped.voltage, 6.0);
});

// 2. 9V Battery & Adjustable Bench PSU (0-12V)
check('1.2: 9V Battery outputs 9.0V and Bench PSU regulates 0.0V–12.0V with ON/OFF', () => {
    const doc = Lab.blankICDoc();
    const bat9 = Lab.createICComponent('battery9v', -144, 0, { id: 'b9' });
    const r1 = Lab.createICComponent('resistor', 0, 0, { id: 'r1', ohms: 1000 });
    doc.components.push(bat9, r1);
    Lab.connectICWire(doc, 'b9:pos', 'r1:a');
    Lab.connectICWire(doc, 'r1:b', 'b9:neg');
    let ev = Lab.evaluateICBench(doc);
    assert.ok(Math.abs(ev.pinVoltages.get('b9:pos') - 9.0) < 0.05);
    assert.ok(Math.abs(ev.resistorStates.get('r1').currentMa - 9.0) < 0.2);

    const doc2 = Lab.blankICDoc();
    const psu = Lab.createICComponent('psu', -144, 0, { id: 'psu1', voltage: 12.0, enabled: true });
    const r2 = Lab.createICComponent('resistor', 0, 0, { id: 'r2', ohms: 1200 });
    doc2.components.push(psu, r2);
    Lab.connectICWire(doc2, 'psu1:pos', 'r2:a');
    Lab.connectICWire(doc2, 'r2:b', 'psu1:neg');
    ev = Lab.evaluateICBench(doc2);
    assert.ok(Math.abs(ev.pinVoltages.get('psu1:pos') - 12.0) < 0.05);

    psu.enabled = false;
    ev = Lab.evaluateICBench(doc2);
    assert.ok(Math.abs(ev.resistorStates.get('r2').currentMa) < 0.01);
});

// 3. 74xx IC Safe Operating Window (4.0V-5.5V OK, 6.0V Warn, 9.0V Corrupted + Recovery)
check('1.3: 74xx IC safe window (3×AA=4.5V healthy, 4×AA=6.0V warn, 9V corrupted & halts outputs, recovers cleanly)', () => {
    const doc = Lab.blankICDoc();
    const bat = Lab.createICComponent('battery', -216, 0, { id: 'bat1', cells: 3 });
    const ic = Lab.createICComponent('7404', 0, 0, { id: 'ic1' });
    doc.components.push(bat, ic);
    Lab.connectICWire(doc, 'bat1:pos', 'ic1:14');
    Lab.connectICWire(doc, 'bat1:neg', 'ic1:7');
    Lab.connectICWire(doc, 'bat1:neg', 'ic1:1'); // NOT(0) -> 1

    // 3×AA = 4.5V -> Healthy!
    let ev = Lab.evaluateICBench(doc);
    let st = ev.icStates.get('ic1');
    assert.equal(st.powered, true);
    assert.equal(st.corrupted, false);
    assert.equal(st.overVoltageWarn, false);
    assert.equal(ev.pinValues.get('ic1:2'), 1);

    // 4×AA = 6.0V -> Overvoltage Warning (5.5..6.5V)
    bat.cells = 4;
    bat.voltage = 6.0;
    ev = Lab.evaluateICBench(doc);
    st = ev.icStates.get('ic1');
    assert.equal(st.overVoltageWarn, true);
    assert.equal(st.corrupted, false);
    assert.ok(ev.warnings.length > 0);

    // 2×AA = 3.0V -> Undervoltage (< 4.0V)
    bat.cells = 2;
    bat.voltage = 3.0;
    ev = Lab.evaluateICBench(doc);
    st = ev.icStates.get('ic1');
    assert.equal(st.underVoltage, true);
    assert.equal(st.powered, false);

    // Replace with 9V Battery -> Corrupted/Scorched (> 6.5V) & Halts Output!
    const doc9 = Lab.blankICDoc();
    const bat9 = Lab.createICComponent('battery9v', -216, 0, { id: 'b9' });
    const ic9 = Lab.createICComponent('7404', 0, 0, { id: 'ic9' });
    doc9.components.push(bat9, ic9);
    Lab.connectICWire(doc9, 'b9:pos', 'ic9:14');
    Lab.connectICWire(doc9, 'b9:neg', 'ic9:7');
    Lab.connectICWire(doc9, 'b9:neg', 'ic9:1');
    ev = Lab.evaluateICBench(doc9);
    st = ev.icStates.get('ic9');
    assert.equal(st.corrupted, true);
    assert.equal(st.powered, false);
    assert.equal(ev.pinValues.get('ic9:2'), null, 'Corrupted IC must halt output');
    assert.ok(ev.faults.some(f => f.compId === 'ic9'));

    // Auto-recover when switching to 5.0V PSU
    const psu = Lab.createICComponent('psu', -216, 0, { id: 'b9', voltage: 5.0 });
    doc9.components[0] = psu;
    ev = Lab.evaluateICBench(doc9);
    st = ev.icStates.get('ic9');
    assert.equal(st.corrupted, false);
    assert.equal(st.powered, true);
    assert.equal(ev.pinValues.get('ic9:2'), 1, 'Recovered IC must resume outputting');
});

// 4. LED Overcurrent Fault & Resistor Recovery + Variable 4-Band Resistor Color Codes
check('1.4: Bare 9V LED triggers overcurrent fault; adding 330Ω recovers safely; 4-band resistor colors accurate', () => {
    const doc = Lab.blankICDoc();
    const b9 = Lab.createICComponent('battery9v', -144, 0, { id: 'b9' });
    const led = Lab.createICComponent('lamp', 0, 0, { id: 'led1', color: 'red' });
    doc.components.push(b9, led);
    Lab.connectICWire(doc, 'b9:pos', 'led1:anode');
    Lab.connectICWire(doc, 'led1:cathode', 'b9:neg');
    let ev = Lab.evaluateICBench(doc);
    let lst = ev.lampStates.get('led1');
    assert.equal(lst.overloaded, true);
    assert.ok(lst.currentMa > 35, `Expected >35mA, got ${lst.currentMa}`);
    assert.ok(ev.faults.some(f => f.compId === 'led1'));

    // Insert 330Ω series resistor -> safe ~20 mA!
    const docSafe = Lab.blankICDoc();
    const b9b = Lab.createICComponent('battery9v', -180, 0, { id: 'b9' });
    const res = Lab.createICComponent('resistor', -36, 0, { id: 'r1', ohms: 330 });
    const ledSafe = Lab.createICComponent('lamp', 108, 0, { id: 'led1', color: 'red' });
    docSafe.components.push(b9b, res, ledSafe);
    Lab.connectICWire(docSafe, 'b9:pos', 'r1:a');
    Lab.connectICWire(docSafe, 'r1:b', 'led1:anode');
    Lab.connectICWire(docSafe, 'led1:cathode', 'b9:neg');
    ev = Lab.evaluateICBench(docSafe);
    lst = ev.lampStates.get('led1');
    assert.equal(lst.lit, true);
    assert.equal(lst.overloaded, false);
    assert.ok(lst.currentMa > 15 && lst.currentMa < 25, `Expected ~20mA, got ${lst.currentMa}`);

    // Verify EIA 4-band color codes (220Ω = Red, Red, Brown, Gold; 4.7kΩ = Yellow, Violet, Red, Gold)
    const b220 = Solver.getResistorBands(220);
    assert.equal(b220.length, 4);
    assert.equal(b220[0], '#dc2626'); // Red (2)
    assert.equal(b220[1], '#dc2626'); // Red (2)
    assert.equal(b220[2], '#7c3f1d'); // Brown (×10)
    assert.equal(b220[3], '#d4af37'); // Gold (±5%)

    const b4k7 = Solver.getResistorBands(4700);
    assert.equal(b4k7[0], '#eab308'); // Yellow (4)
    assert.equal(b4k7[1], '#9333ea'); // Violet (7)
    assert.equal(b4k7[2], '#dc2626'); // Red (×100)
});

// 5. Resistor Overheating (> 250 mW)
check('1.5: Low-ohm resistor across 9V triggers overheating fault (>250 mW)', () => {
    const doc = Lab.blankICDoc();
    const b9 = Lab.createICComponent('battery9v', -144, 0, { id: 'b9' });
    const r = Lab.createICComponent('resistor', 0, 0, { id: 'rHot', ohms: 47 });
    doc.components.push(b9, r);
    Lab.connectICWire(doc, 'b9:pos', 'rHot:a');
    Lab.connectICWire(doc, 'rHot:b', 'b9:neg');
    const ev = Lab.evaluateICBench(doc);
    const rst = ev.resistorStates.get('rHot');
    assert.equal(rst.overloaded, true);
    assert.ok(rst.powerW > 1.0);
    assert.ok(ev.faults.some(f => f.compId === 'rHot'));
});

// 6. Breadboard Internal Strip Continuity & Automatic Component Plug-In Snapping (ZERO jumper wires between plugged parts!)
check('1.6: Breadboard automatically connects plugged-in Push Button, Resistor & LED via vertical strips + IC straddling center trough', () => {
    const doc = Lab.BENCH_2D_PRESETS.bb_button_led.build();
    const ev = Lab.evaluateICBench(doc);
    // Verify pins actually snapped into breadboard holes
    assert.ok(ev.pluggedPinMap.size >= 8, `Expected >=8 plugged pins, got ${ev.pluggedPinMap.size}`);
    // Button starts latched+pressed -> LED must be cleanly lit & NOT overloaded
    const lst = ev.lampStates.get('led1');
    assert.equal(lst.lit, true, 'Breadboard plugged LED should illuminate when button is pressed');
    assert.equal(lst.overloaded, false);
    assert.ok(lst.currentMa > 6 && lst.currentMa < 15);

    // Release button -> LED turns OFF
    const btn = doc.components.find(c => c.id === 'btn1');
    btn.pressed = false;
    const evOff = Lab.evaluateICBench(doc);
    assert.equal(evOff.lampStates.get('led1').lit, false);

    // DIP-14 IC straddling breadboard center trough:
    // Top pins 8..14 (y=-72) MUST plug pin-for-pin into Row e, Bottom pins 1..7 (y=+72) MUST plug into Row f!
    const docIC = Lab.blankICDoc();
    const bb = Lab.createICComponent('breadboard', 0, 0, { id: 'bb1' });
    const ic = Lab.createICComponent('7404', 0, 0, { id: 'ic1' });
    docIC.components.push(bb, ic);
    const evIC = Lab.evaluateICBench(docIC);
    for (let p = 1; p <= 7; p++) {
        const hole = evIC.pluggedPinMap.get(`ic1:${p}`);
        assert.ok(hole && /^bb1:f\d+$/.test(hole), `DIP-14 bottom Pin ${p} must plug into Row f across center trough (got ${hole})`);
    }
    for (let p = 8; p <= 14; p++) {
        const hole = evIC.pluggedPinMap.get(`ic1:${p}`);
        assert.ok(hole && /^bb1:e\d+$/.test(hole), `DIP-14 top Pin ${p} must plug into Row e across center trough (got ${hole})`);
    }

    // DIP-16 IC (74283) centered on column pitch (+18, 0) also straddles Row e & Row f pin-for-pin!
    const docIC16 = Lab.blankICDoc();
    const bb16 = Lab.createICComponent('breadboard', 0, 0, { id: 'bb16' });
    const ic16 = Lab.createICComponent('74283', 18, 0, { id: 'ic16' });
    docIC16.components.push(bb16, ic16);
    const evIC16 = Lab.evaluateICBench(docIC16);
    for (let p = 1; p <= 8; p++) {
        const hole = evIC16.pluggedPinMap.get(`ic16:${p}`);
        assert.ok(hole && /^bb16:f\d+$/.test(hole), `DIP-16 bottom Pin ${p} must plug into Row f (got ${hole})`);
    }
    for (let p = 9; p <= 16; p++) {
        const hole = evIC16.pluggedPinMap.get(`ic16:${p}`);
        assert.ok(hole && /^bb16:e\d+$/.test(hole), `DIP-16 top Pin ${p} must plug into Row e (got ${hole})`);
    }
});

// 7. DC Motor RPM Scaling, Polarity Reversal (CW <-> CCW), & Overvoltage Fault
check('1.7: DC Motor computes realistic RPM, reverses CW <-> CCW on polarity swap, and flags >12V overvoltage', () => {
    const doc = Lab.BENCH_2D_PRESETS.motor_pot_rpm.build();
    const pot = doc.components.find(c => c.id === 'pot1');
    let ev = Lab.evaluateICBench(doc);
    const mstHigh = ev.motorStates.get('mot1');
    assert.equal(mstHigh.spinning, true);
    assert.equal(mstHigh.direction, 'CW');
    assert.ok(mstHigh.rpm > 1000, `Expected high RPM, got ${mstHigh.rpm}`);

    // Lower potentiometer wiper -> RPM drops smoothly!
    pot.wiper = 0.25;
    ev = Lab.evaluateICBench(doc);
    const mstLow = ev.motorStates.get('mot1');
    assert.ok(mstLow.rpm < mstHigh.rpm, `Expected lower RPM (${mstLow.rpm} < ${mstHigh.rpm})`);

    // Reverse polarity -> CCW!
    const docRev = Lab.blankICDoc();
    const bat = Lab.createICComponent('battery', -144, 0, { id: 'b1', cells: 4 }); // 6V
    const mot = Lab.createICComponent('motor', 36, 0, { id: 'm1' });
    docRev.components.push(bat, mot);
    Lab.connectICWire(docRev, 'b1:pos', 'm1:neg');
    Lab.connectICWire(docRev, 'b1:neg', 'm1:pos');
    ev = Lab.evaluateICBench(docRev);
    assert.equal(ev.motorStates.get('m1').direction, 'CCW');
    assert.ok(ev.motorStates.get('m1').rpm > 1500);
});

// 8. 3-Terminal SPDT Switch & 9V Overload Recovery Preset
check('1.8: SPDT Switch routes COM -> T2 (Overload!) vs COM -> T1 (330Ω Safe LED)', () => {
    const doc = Lab.BENCH_2D_PRESETS.overload_9v_demo.build();
    const spdt = doc.components.find(c => c.id === 'spdt1');
    // Starts thrown right -> Bare 9V LED is overloaded!
    let ev = Lab.evaluateICBench(doc);
    assert.equal(ev.lampStates.get('ledBare').overloaded, true);
    assert.equal(ev.lampStates.get('ledSafe').lit, false);
    assert.ok(ev.faults.length > 0);

    // Flip SPDT left -> Safe 330Ω LED lights cleanly, faults clear!
    spdt.positionThrow = 'left';
    ev = Lab.evaluateICBench(doc);
    assert.equal(ev.lampStates.get('ledBare').overloaded, false);
    assert.equal(ev.lampStates.get('ledSafe').lit, true);
    assert.equal(ev.lampStates.get('ledSafe').overloaded, false);
    assert.equal(ev.faults.length, 0);
});

// 9. NPN 2N2222 Transistor Driver Preset (4.5V Button -> 9V Motor + Piezo Buzzer)
check('1.9: NPN 2N2222 switches 9V DC Motor & Piezo Buzzer cleanly from 4.5V Push Button', () => {
    const doc = Lab.BENCH_2D_PRESETS.npn_motor_buzzer.build();
    const btn = doc.components.find(c => c.id === 'btn1');
    // Button pressed -> NPN saturates, Motor spins & Buzzer sounds!
    let ev = Lab.evaluateICBench(doc);
    const qst = ev.npnStates.get('q1');
    assert.ok(qst.mode === 'SATURATED' || qst.mode === 'ACTIVE', `Expected NPN ON, got ${qst.mode}`);
    assert.equal(ev.motorStates.get('mot1').spinning, true);
    assert.equal(ev.buzzerStates.get('buz1').sounding, true);

    // Release button -> NPN cutoff, Motor stops & Buzzer silent!
    btn.pressed = false;
    ev = Lab.evaluateICBench(doc);
    assert.equal(ev.npnStates.get('q1').mode, 'CUTOFF');
    assert.equal(ev.motorStates.get('mot1').spinning, false);
    assert.equal(ev.buzzerStates.get('buz1').sounding, false);
});

// 10. Digital Multimeter (V / mA / Ω modes) & RGB LED
check('1.10: Digital Multimeter measures live V, mA, and Ω accurately + RGB LED channels light independently', () => {
    // Voltmeter mode (from motor_pot_rpm preset)
    const docV = Lab.BENCH_2D_PRESETS.motor_pot_rpm.build();
    const evV = Lab.evaluateICBench(docV);
    const dmmV = evV.meterStates.get('dmm1');
    assert.equal(dmmV.mode, 'V');
    assert.ok(dmmV.numeric > 2.0 && dmmV.display.endsWith('V'), `Unexpected DMM V: ${dmmV.display}`);

    // Ohmmeter mode across an unpowered 4.7kΩ resistor
    const docOhm = Lab.blankICDoc();
    const dmm = Lab.createICComponent('multimeter', -90, 0, { id: 'dmm', mode: 'ohm' });
    const res = Lab.createICComponent('resistor', 72, 0, { id: 'r4k7', ohms: 4700 });
    docOhm.components.push(dmm, res);
    Lab.connectICWire(docOhm, 'dmm:pos', 'r4k7:a');
    Lab.connectICWire(docOhm, 'dmm:neg', 'r4k7:b');
    const evOhm = Lab.evaluateICBench(docOhm);
    const ohmSt = evOhm.meterStates.get('dmm');
    assert.ok(Math.abs(ohmSt.numeric - 4700) < 50, `Expected ~4700Ω, got ${ohmSt.numeric}`);

    // RGB LED (R + B lit -> Magenta)
    const docRgb = Lab.blankICDoc();
    const bat = Lab.createICComponent('battery', -200, 0, { id: 'b1', cells: 3 });
    const rR = Lab.createICComponent('resistor', -72, -36, { id: 'rr', ohms: 220 });
    const rB = Lab.createICComponent('resistor', -72, 36, { id: 'rb', ohms: 220 });
    const rgb = Lab.createICComponent('rgb_led', 90, 0, { id: 'rgb1' });
    docRgb.components.push(bat, rR, rB, rgb);
    Lab.connectICWire(docRgb, 'b1:pos', 'rr:a');
    Lab.connectICWire(docRgb, 'rr:b', 'rgb1:r');
    Lab.connectICWire(docRgb, 'b1:pos', 'rb:a');
    Lab.connectICWire(docRgb, 'rb:b', 'rgb1:b');
    Lab.connectICWire(docRgb, 'rgb1:gnd', 'b1:neg');
    const evRgb = Lab.evaluateICBench(docRgb);
    const rst = evRgb.rgbStates.get('rgb1');
    assert.equal(rst.lit, true);
    assert.ok(rst.channels.r.currentMa > 5);
    assert.equal(rst.channels.g.currentMa, 0);
    assert.ok(rst.channels.b.currentMa > 3);
});

// 11. Wire Color Coding, Tidy Wires, and 3-Mode PNG iTXt + JSON Round-Trip
check('1.11: Auto wire color coding, Tidy Wires, JSON serialization, and PNG iTXt round-trip for Electronics Lab', () => {
    const doc = Lab.BENCH_2D_PRESETS.bb_button_led.build();
    doc.wires[0].waypoints = [{ x: 123, y: 456 }];
    Lab.tidyAllWires(doc);
    assert.equal(doc.wires[0].waypoints.length, 0, 'tidyAllWires must clear manual waypoints');

    // Serialize JSON & validate
    const jsonStr = IO.serializeSavedFile('electronics', doc, 'bb-demo');
    const validateErrors = d => {
        const res = ExportMod.validateElectronicsDoc(d);
        return Array.isArray(res) ? res : (res && res.ok ? [] : [res?.error || 'invalid']);
    };
    const parsedJson = IO.parseSavedJson(jsonStr, 'electronics', validateErrors);
    assert.equal(parsedJson.ok, true, parsedJson.error);
    assert.equal(parsedJson.meta.lab, 'electronics');

    // Embed into a minimal valid PNG and extract cleanly (same mechanism used by both Bench PNG & Schematic PNG!)
    const minimalPng = Buffer.from(
        '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
        'hex'
    );
    const embedded = IO.embedJsonInPng(new Uint8Array(minimalPng), jsonStr);
    const extracted = IO.extractJsonFromPng(embedded);
    assert.ok(extracted, 'Must extract embedded ElectricsimData from PNG');
    const parsedPng = IO.parseSavedJson(extracted, 'electronics', validateErrors);
    assert.equal(parsedPng.ok, true, parsedPng.error);
    assert.equal(parsedPng.meta.lab, 'electronics');
    assert.equal(parsedPng.doc.components.length, doc.components.length);
    assert.equal(parsedPng.doc.wires.length, doc.wires.length);
});

// 12. HTML & Script Integration Check (Visual 2D Gallery, No Schematic GND, Separate Classic Logic IC Lab)
check('1.12: pages/electronics.html has visual 2D thumbnail cards, search, NO schematic GND; classic Logic IC Lab exists separately', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'pages', 'electronics.html'), 'utf8');
    const requiredIds = [
        'icSaveJsonBtn', 'icExportBenchPngBtn', 'icExportSchematicPngBtn',
        'icOpenBtn', 'icTidyWiresBtn', 'icWireColorBar', 'icPaletteSearch',
        'icSoundToggle', 'icFlowToggle', 'icXrayToggle',
        'icFaultBox', 'icDynamicControls'
    ];
    for (const id of requiredIds) {
        assert.ok(html.includes(`id="${id}"`), `Missing #${id} in pages/electronics.html`);
    }
    const requiredTools = [
        'breadboard', 'breadboard_mini', 'battery', 'battery9v', 'psu',
        'resistor', 'potentiometer', 'pushbutton', 'spdt',
        'lamp', 'rgb_led', 'motor', 'buzzer', 'npn', 'multimeter'
    ];
    for (const t of requiredTools) {
        assert.ok(html.includes(`data-ic-tool="${t}"`), `Missing tool button ${t} in pages/electronics.html`);
    }
    // Schematic GND, Logic Probe, and 1Hz Clock must NOT be in the 2D hardware Electronics Lab palette
    assert.ok(!html.includes('data-ic-tool="gnd"'), 'Schematic GND should be removed from 2D Electronics Lab palette');
    assert.ok(!html.includes('data-ic-tool="probe"'), 'Logic Probe should be removed from Electronics Lab palette');
    assert.ok(!html.includes('data-ic-tool="clock"'), '1Hz Clock should be removed from Electronics Lab palette');
    assert.ok(html.includes('data-ic-tool="seg7_10"'), 'Realistic 10-pin 7-segment display must be in Electronics Lab palette');
    assert.ok(!html.includes('wokwi-layer') && !html.includes('wokwi-elements'), 'Leftover @wokwi/elements must be cleanly removed');
    // IEEE schematic thumbnail canvases must exist
    assert.ok((html.match(/class="ic-part-thumb"/g) || []).length >= 14, 'Should render >=14 IEEE schematic component thumbnails');
    assert.ok(html.includes('electronics-solver.js'));
    assert.ok(html.includes('electronics-components.js'));
    assert.ok(html.includes('hardware-renderer.js'));
    assert.ok(html.includes('schematic-io.js'));
    assert.ok(html.includes('electronics-export.js'));
    assert.ok(!html.includes('fritzing-renderer.js') && !html.includes('CC-BY-SA 3.0'), 'Third-party Fritzing renderer & CC-BY-SA notice must be cleanly removed');

    // Separate Classic Logic IC Lab must exist cleanly
    const classicHtml = fs.readFileSync(path.join(__dirname, '..', 'pages', 'logic-ic.html'), 'utf8');
    assert.ok(classicHtml.includes('Logic IC Lab'), 'pages/logic-ic.html should be titled Logic IC Lab');
    assert.ok(classicHtml.includes('logic-ic-classic.js'), 'pages/logic-ic.html should load classic js/logic-ic-classic.js');
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'js', 'logic-ic-classic.js')), 'js/logic-ic-classic.js must exist');
});

// 13. Strict Closed-Loop Current Flow (0 mA on open loops/dead-ends/voltmeter, >0 mA ONLY on closed loops!)
check('1.13: Current flow is strictly 0 mA on open switches/dead-ends/voltmeter leads, and non-zero ONLY on active closed loops', () => {
    // A: Breadboard preset with button pressed vs released
    const docBB = Lab.BENCH_2D_PRESETS.bb_button_led.build();
    let ev = Lab.evaluateICBench(docBB);
    assert.ok(ev.wireCurrents && ev.wireCurrents.size === docBB.wires.length);
    for (const w of docBB.wires) {
        const wc = ev.wireCurrents.get(w.id);
        assert.ok(wc.currentMa > 5 && wc.dir !== 0, `Closed breadboard loop wire ${w.from}->${w.to} must carry current (got ${wc.currentMa})`);
    }
    // Release push button -> ALL wires must drop to 0 mA (no flow dashes!)
    docBB.components.find(c => c.id === 'btn1').pressed = false;
    ev = Lab.evaluateICBench(docBB);
    for (const w of docBB.wires) {
        const wc = ev.wireCurrents.get(w.id);
        assert.equal(wc.dir, 0, `Open breadboard wire ${w.from}->${w.to} must have dir=0 (got ${wc.currentMa} mA)`);
        assert.ok(wc.currentMa < 0.05, `Open wire current must be ~0 mA (got ${wc.currentMa})`);
    }

    // B: Motor + Voltmeter preset -> Motor wires carry >100 mA, Voltmeter wires carry ~0 mA!
    const docMot = Lab.BENCH_2D_PRESETS.motor_pot_rpm.build();
    const evMot = Lab.evaluateICBench(docMot);
    const motWire = docMot.wires.find(w => w.to === 'mot1:pos' || w.from === 'mot1:pos');
    const dmmWire = docMot.wires.find(w => w.from === 'dmm1:pos' || w.to === 'dmm1:pos');
    assert.ok(evMot.wireCurrents.get(motWire.id).currentMa > 100, 'Motor feed wire must carry >100 mA');
    assert.equal(evMot.wireCurrents.get(dmmWire.id).dir, 0, 'High-impedance voltmeter probe wire must have NO current flow');

    // C: Overload SPDT preset has NO gnd component and only active throw branch carries current!
    const docOv = Lab.BENCH_2D_PRESETS.overload_9v_demo.build();
    assert.equal(docOv.components.some(c => c.kind === 'gnd'), false, '2D preset should not contain schematic GND');
    const evOv = Lab.evaluateICBench(docOv);
    const activeThrowWire = docOv.wires.find(w => w.from === 'spdt1:t2');
    const inactiveThrowWire = docOv.wires.find(w => w.from === 'spdt1:t1');
    assert.ok(evOv.wireCurrents.get(activeThrowWire.id).currentMa > 35, 'Active SPDT throw must carry current');
    assert.equal(evOv.wireCurrents.get(inactiveThrowWire.id).dir, 0, 'Inactive open SPDT throw must have ZERO current flow');
});

// 14. Breadboard + 7408 DIP-14 IC Showcase Preset (Exact Center Trough Fit + Live Gate Output -> LED)
check('1.14: bb_7408_ic preset plugs 7408 across Row e/f center trough, powers cleanly at 4.5V, and drives output LED via buttons', () => {
    const doc = Lab.BENCH_2D_PRESETS.bb_7408_ic.build();
    let ev = Lab.evaluateICBench(doc);
    // Verify 7408 Pin 14 in e14, Pin 7 in f20, Pin 1 in f14, Pin 2 in f15, Pin 3 in f16
    assert.equal(ev.pluggedPinMap.get('ic1:14'), 'bb1:e14');
    assert.equal(ev.pluggedPinMap.get('ic1:7'), 'bb1:f20');
    assert.equal(ev.pluggedPinMap.get('ic1:1'), 'bb1:f14');
    assert.equal(ev.pluggedPinMap.get('ic1:2'), 'bb1:f15');
    assert.equal(ev.pluggedPinMap.get('ic1:3'), 'bb1:f16');

    const icSt = ev.icStates.get('ic1');
    assert.equal(icSt.powered, true, '7408 IC on breadboard must be powered via rails');
    assert.equal(icSt.corrupted, false);
    assert.equal(ev.pinValues.get('ic1:3'), 1, '7408 Gate 1 (1 AND 1) must output HIGH');
    const ledSt = ev.lampStates.get('led1');
    assert.equal(ledSt.lit, true, 'Output LED on breadboard must illuminate when both buttons are pressed');
    assert.equal(ledSt.overloaded, false);
    assert.equal(ev.faults.length, 0, 'bb_7408_ic preset must have zero faults');

    // Release Button A -> AND output drops to LOW -> LED turns OFF!
    doc.components.find(c => c.id === 'btnA').pressed = false;
    ev = Lab.evaluateICBench(doc);
    assert.equal(ev.lampStates.get('led1').lit, false, 'LED must turn OFF when IN A button is released');
});

// 15. Unified Native-Vector 2.5D HardwareRenderer (Zero SVG Masking) & Realistic 10-Pin 7-Segment Display
check('1.15: Unified HardwareRenderer draws all 2.5D parts & white-ink schematics cleanly + 10-pin 7-segment display straddles trough', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'pages', 'electronics.html'), 'utf8');
    assert.ok(html.includes('hardware-renderer.js'), 'pages/electronics.html must load hardware-renderer.js');
    assert.ok(!html.includes('fritzing-renderer.js'), 'pages/electronics.html must not load legacy fritzing-renderer.js');
    assert.ok(!fs.existsSync(path.join(__dirname, '..', 'assets', 'fritzing')), 'Unused assets/fritzing/ folder should be removed');

    const HW = require('../js/hardware-renderer.js');
    const expectedFns = [
        'drawBreadboard', 'drawSpdt', 'drawPotentiometer', 'drawPushButton', 'drawResistor',
        'drawLed', 'drawRgbLed', 'drawBuzzer', 'drawAAHolder', 'drawBattery9V',
        'drawMotor', 'drawNpn', 'drawSeg7TenPin', 'drawIEEESymbolPreview'
    ];
    for (const fn of expectedFns) {
        assert.equal(typeof HW[fn], 'function', `HardwareRenderer.${fn} must be a function`);
    }

    // Smoke-test every single 2.5D hardware draw function + all palette schematic thumbnails with a mock 2D context
    const noop = () => {};
    const mockGrad = { addColorStop: noop };
    const mockCtx = new Proxy({}, {
        get(_, prop) {
            if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => mockGrad;
            if (prop === 'measureText') return txt => ({ width: String(txt).length * 6 });
            if (prop === 'getTransform') return () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 });
            return noop;
        },
        set() { return true; }
    });
    const dummyEval = Lab.evaluateICBench(Lab.BENCH_2D_PRESETS.bb_wirefree_demo.build());
    assert.equal(HW.drawBreadboard(mockCtx, Lab.createICComponent('breadboard', 0, 0), Solver.getBreadboardSpec('half'), dummyEval, true, 'bb1:top_10'), true);
    assert.equal(HW.drawBreadboard(mockCtx, Lab.createICComponent('breadboard_mini', 0, 0), Solver.getBreadboardSpec('mini'), dummyEval, false, null), true);
    assert.equal(HW.drawSpdt(mockCtx, Lab.createICComponent('spdt', 0, 0, { positionThrow: 'right' }), dummyEval, true), true);
    assert.equal(HW.drawPotentiometer(mockCtx, Lab.createICComponent('potentiometer', 0, 0, { wiper: 0.7 }), dummyEval, true, Solver), true);
    assert.equal(HW.drawPushButton(mockCtx, Lab.createICComponent('pushbutton', 0, 0, { pressed: true }), dummyEval, true), true);
    assert.equal(HW.drawResistor(mockCtx, Lab.createICComponent('resistor', 0, 0, { ohms: 470 }), dummyEval, true, Solver), true);
    assert.equal(HW.drawLed(mockCtx, Lab.createICComponent('lamp', 0, 0, { color: 'emerald' }), dummyEval, true), true);
    assert.equal(HW.drawRgbLed(mockCtx, Lab.createICComponent('rgb_led', 0, 0), dummyEval, true), true);
    assert.equal(HW.drawBuzzer(mockCtx, Lab.createICComponent('buzzer', 0, 0), dummyEval, true, 0.5), true);
    for (let cells = 1; cells <= 4; cells++) {
        assert.equal(HW.drawAAHolder(mockCtx, Lab.createICComponent('battery', 0, 0, { cells }), dummyEval, false), true);
    }
    assert.equal(HW.drawBattery9V(mockCtx, Lab.createICComponent('battery9v', 0, 0), dummyEval, true), true);
    assert.equal(HW.drawMotor(mockCtx, Lab.createICComponent('motor', 0, 0), dummyEval, true, 1.2), true);
    assert.equal(HW.drawNpn(mockCtx, Lab.createICComponent('npn', 0, 0), dummyEval, true), true);
    assert.equal(HW.drawSeg7TenPin(mockCtx, Lab.createICComponent('seg7_10', 0, 0), dummyEval, true), true);

    const thumbKinds = [...html.matchAll(/data-thumb-kind="([^"]+)"/g)].map(m => m[1]);
    assert.ok(thumbKinds.length >= 16, `Expected >= 16 palette schematic cards, found ${thumbKinds.length}`);
    for (const k of thumbKinds) {
        HW.drawIEEESymbolPreview({ width: 112, height: 68, closest: () => null, getBoundingClientRect: () => ({ width: 114, height: 62 }), getContext: () => mockCtx }, k);
    }

    // Verify realistic 10-pin 7-segment display (seg7_10) has 10 pins, plugs into breadboard Rows d & g, and lights segments!
    const doc = Lab.blankICDoc();
    const bb = Lab.createICComponent('breadboard', 0, 0, { id: 'bb1' });
    const seg = Lab.createICComponent('seg7_10', 0, 0, { id: 'seg1' });
    const bat = Lab.createICComponent('battery', -756, -288, { id: 'bat1', cells: 2 }); // 3.0V safe for direct segment demo
    doc.components.push(bb, seg, bat);
    const segPins = Lab.getComponentPins(seg);
    assert.equal(segPins.length, 10, 'Realistic 7-segment display must have exactly 10 pins');

    Lab.connectICWire(doc, 'bat1:neg', 'seg1:com1');
    Lab.connectICWire(doc, 'bat1:pos', 'seg1:a');
    Lab.connectICWire(doc, 'bat1:pos', 'seg1:b');
    const ev = Lab.evaluateICBench(doc);
    // All 10 pins must plug cleanly into breadboard Row d (top) and Row g (bottom)!
    for (const p of ['g', 'f', 'com1', 'a', 'b']) {
        const h = ev.pluggedPinMap.get(`seg1:${p}`);
        assert.ok(h && /^bb1:d\d+$/.test(h), `Top pin ${p} must plug into Row d (got ${h})`);
    }
    for (const p of ['e', 'd', 'com2', 'c', 'dp']) {
        const h = ev.pluggedPinMap.get(`seg1:${p}`);
        assert.ok(h && /^bb1:g\d+$/.test(h), `Bottom pin ${p} must plug into Row g (got ${h})`);
    }
    const st = ev.seg7TenStates.get('seg1');
    assert.equal(st.segs.a.lit, true, 'Segment A must illuminate');
    assert.equal(st.segs.b.lit, true, 'Segment B must illuminate');
    assert.equal(st.segs.g.lit, false, 'Unpowered Segment G must stay OFF');
});

// 16. Tinkercad 1U (36px) Scale & Magnetic Breadboard Hole Snapping (Zero Wires Between Plugged Parts!)
check('1.16: Every pluggable component snaps 100% of its pins into breadboard holes & bb_wirefree_demo runs all 3 circuits wire-free', () => {
    const bbDoc = Lab.blankICDoc();
    bbDoc.components.push(Lab.createICComponent('breadboard', 0, 0, { id: 'bb1' }));

    const testCases = [
        ['lamp', -10, -135],
        ['rgb_led', 10, -140],
        ['resistor', -5, -140],
        ['pushbutton', 8, -140],
        ['spdt', -8, -140],
        ['potentiometer', 12, -140],
        ['buzzer', -10, -140],
        ['npn', 6, -140],
        ['7408', 8, 12],
        ['74283', 10, -10],
        ['seg7_10', -10, 12]
    ];
    for (const [kind, rx, ry] of testCases) {
        const comp = Lab.createICComponent(kind, rx, ry, { id: 't_' + kind });
        const snap = Lab.snapCompToBreadboard(bbDoc, comp);
        assert.ok(snap, `${kind} dropped near breadboard (${rx},${ry}) must magnetically snap`);
        assert.equal(snap.matched, snap.total, `${kind} must snap ALL ${snap.total} pins into breadboard holes (got ${snap.matched})`);
    }

    // Verify bb_wirefree_demo runs SPDT->Res->LED1, Pot->Res->LED2, and Btn->Res->NPN->Buzzer strictly via breadboard strips!
    const doc = Lab.BENCH_2D_PRESETS.bb_wirefree_demo.build();
    const ev = Lab.evaluateICBench(doc);
    assert.equal(ev.faults.length, 0, 'bb_wirefree_demo must have zero faults');
    assert.equal(ev.lampStates.get('led1').lit, true, 'Wire-free SPDT -> 220Ω -> LED1 must illuminate');
    assert.equal(ev.lampStates.get('led2').lit, true, 'Wire-free Pot -> 220Ω -> LED2 must illuminate');
    assert.equal(ev.buzzerStates.get('buz1').sounding, true, 'Wire-free Btn -> 1kΩ -> NPN -> Buzzer must sound');
    assert.ok(ev.pluggedPinMap.size >= 24, `Expected >=24 plugged pins in wire-free demo, got ${ev.pluggedPinMap.size}`);
});

// 17. Blocked/Inaccessible Breadboard Holes Under Components & Collision-Free Snapping
check('1.17: Breadboard holes underneath placed components or occupied by pins are strictly inaccessible; open neighbor holes remain accessible', () => {
    const doc = Lab.BENCH_2D_PRESETS.bb_7408_ic.build();
    const ev = Lab.evaluateICBench(doc);
    // Holes directly occupied/covered by the 7408 DIP-14 IC (e14..e20, f14..f20) MUST be inaccessible!
    for (const hid of ['bb1:e14', 'bb1:e17', 'bb1:e20', 'bb1:f14', 'bb1:f16', 'bb1:f20']) {
        const h = ev.pins.get(hid);
        assert.ok(h, `Missing hole ${hid}`);
        assert.equal(Lab.isBreadboardHoleAccessible(doc, ev, h), false, `Hole ${hid} under 7408 IC must be inaccessible`);
    }
    // Holes directly covered by Push Button A (g6..i8), Resistor (h22..h26), and LED (h26..i27) MUST be inaccessible!
    for (const hid of ['bb1:g6', 'bb1:h7', 'bb1:i8', 'bb1:h22', 'bb1:h24', 'bb1:h26', 'bb1:i26', 'bb1:i27']) {
        const h = ev.pins.get(hid);
        assert.equal(Lab.isBreadboardHoleAccessible(doc, ev, h), false, `Hole ${hid} under component must be inaccessible`);
    }
    // Open uncovered holes in the SAME column strips (e.g., a14..d14 above IC, j14..j16 below IC, f22/g22/i22 around Resistor) MUST remain accessible!
    for (const hid of ['bb1:a14', 'bb1:b14', 'bb1:d14', 'bb1:g14', 'bb1:j16', 'bb1:f22', 'bb1:g22', 'bb1:j27']) {
        const h = ev.pins.get(hid);
        assert.equal(Lab.isBreadboardHoleAccessible(doc, ev, h), true, `Open uncovered hole ${hid} must remain accessible`);
    }

    // Collision-free snapping: dropping a second LED directly on top of led1 must NOT double-stuff i26 & i27!
    const dupLed = Lab.createICComponent('lamp', 378, 180, { id: 'ledDup' });
    const snap = Lab.snapCompToBreadboard(doc, dupLed);
    if (snap) {
        assert.ok(
            snap.x !== 378 || snap.y !== 180,
            'Magnetic snapper must avoid double-stuffing the exact holes already occupied by led1'
        );
    }
});

// 18. Exact 2U (72px) Power-Rail-to-5-Point-Strip Spacing: Vertical 90° Resistor Bridges Rail <-> Strip Directly!
check('1.18: Vertical 90° Resistor plugs directly between Power Rails (+/-) and 5-point strips (b/c/h/i) & lights LED wire-free', () => {
    const doc = Lab.blankICDoc();
    const bb = Lab.createICComponent('breadboard', 0, 0, { id: 'bb1', variant: 'half' });
    const bat = Lab.createICComponent('battery', -756, -288, { id: 'bat1', cells: 3 });
    doc.components.push(bb, bat);

    // Check all 4 vertical rail-to-strip bridges on Col 10 (x = -540 + 9*36 = -216):
    // Top + (-324) <-> Row b (-180) => center y = -252
    // Top - (-288) <-> Row c (-144) => center y = -216
    // Bot + (+288) <-> Row h (+144) => center y = +216
    // Bot - (+324) <-> Row i (+180) => center y = +252
    for (const [label, cy, expA, expB] of [
        ['Top + -> Row b', -252, 'bb1:tp8', 'bb1:b10'],
        ['Top - -> Row c', -216, 'bb1:tn8', 'bb1:c10'],
        ['Bot + -> Row h',  216, 'bb1:h10', 'bb1:bp8'],
        ['Bot - -> Row i',  252, 'bb1:i10', 'bb1:bn8']
    ]) {
        const r = Lab.createICComponent('resistor', -212, cy + 4, { id: 'rTest', rotation: 90, ohms: 220 });
        const snap = Lab.snapCompToBreadboard(doc, r);
        assert.ok(snap && snap.matched === 2, `${label} must snap BOTH resistor pins into breadboard holes`);
        const keys = snap.holes.map(h => h.key).sort();
        assert.deepEqual(keys, [expA, expB].sort(), `${label} expected [${expA}, ${expB}], got [${keys.join(', ')}]`);
    }

    // Build live closed loop: Top + Rail -> Vertical 220Ω Resistor (tp8 -> b10) -> 1U LED (c10 -> c11) -> Vertical 0Ω/100Ω Resistor (c11 -> tn9) -> Top - Rail!
    const rPos = Lab.createICComponent('resistor', -216, -252, { id: 'rPos', rotation: 90, ohms: 220 });
    const led  = Lab.createICComponent('lamp', -198, -144, { id: 'led1', color: 'emerald' });
    const rNeg = Lab.createICComponent('resistor', -180, -216, { id: 'rNeg', rotation: 90, ohms: 100 });
    doc.components.push(rPos, led, rNeg);
    Lab.connectICWire(doc, 'bat1:pos', 'bb1:tp1', [], { color: 'red' });
    Lab.connectICWire(doc, 'bat1:neg', 'bb1:tn1', [], { color: 'black' });

    const ev = Lab.evaluateICBench(doc);
    assert.equal(ev.lampStates.get('led1').lit, true, 'LED driven via vertical rail-to-strip resistors must illuminate!');
    assert.ok(ev.lampStates.get('led1').currentMa > 4 && ev.lampStates.get('led1').currentMa < 15, 'LED current must be regulated (~7.2 mA)');
    assert.equal(ev.faults.length, 0, 'Zero faults in rail-to-strip resistor circuit');
});

console.log('=================================================================');
console.log(`   ALL ${passed} 2D ELECTRONICS LAB TESTS PASSED 100%!`);
console.log('=================================================================');

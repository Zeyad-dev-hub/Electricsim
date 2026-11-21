'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const IO = require('../js/schematic-io.js');
const D = require('../js/dc-circuit-analysis.js');
require('../js/dc-circuit-presets.js');
require('../js/logic-model.js');
require('../js/logic-evaluator.js');
require('../js/logic-presets.js');
const L = globalThis.LogicLab;

let passed = 0;
function check(name, fn) {
    fn();
    passed++;
    console.log(`PASS ${name}`);
}

// Minimal valid 1x1 white PNG (67 bytes)
const MINIMAL_PNG = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde,
    0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, 0x54,
    0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f, 0x00,
    0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
    0xae, 0x42, 0x60, 0x82
]);

check('Circuits Lab save & load round-trip preserves exact document structure', () => {
    for (const id of ['series', 'fullWaveFiltered', 'rlcResonance', 'zenerRegulator', 'transformerStepUp']) {
        const doc = D.makePreset(id);
        const text = IO.serializeSavedFile('dc-circuit', doc, `test-${id}`);
        const res = IO.parseSavedJson(text, 'dc-circuit', D.validateDocument);
        assert.equal(res.ok, true, res.error);
        assert.deepEqual(res.doc, doc);
        assert.equal(res.meta.name, `test-${id}`);
    }
});

check('Logic Lab save & load round-trip preserves exact gates, MSI blocks, inputs, outputs & wires', () => {
    for (const id of Object.keys(L.PRESETS)) {
        const doc = L.makePreset(id);
        const text = IO.serializeSavedFile('logic', doc, `logic-${id}`);
        const res = IO.parseSavedJson(text, 'logic', L.validateDocument);
        assert.equal(res.ok, true, res.error);
        assert.deepEqual(res.doc, doc);
    }
});

check('Raw bare schemaVersion=1 JSON documents import cleanly without wrapper', () => {
    const dcDoc = D.makePreset('bridge');
    const dcRes = IO.parseSavedJson(JSON.stringify(dcDoc), 'dc-circuit', D.validateDocument);
    assert.equal(dcRes.ok, true);
    assert.deepEqual(dcRes.doc, dcDoc);

    const lgDoc = L.makePreset('halfAdder');
    const lgRes = IO.parseSavedJson(JSON.stringify(lgDoc), 'logic', L.validateDocument);
    assert.equal(lgRes.ok, true);
    assert.deepEqual(lgRes.doc, lgDoc);
});

check('Cross-lab drop protection gives clear friendly errors in both directions', () => {
    const logicText = IO.serializeSavedFile('logic', L.makePreset('halfAdder'), 'ha');
    const wrongForDc = IO.parseSavedJson(logicText, 'dc-circuit', D.validateDocument);
    assert.equal(wrongForDc.ok, false);
    assert.match(wrongForDc.error, /Logic Lab/i);

    const dcText = IO.serializeSavedFile('dc-circuit', D.makePreset('series'), 'ser');
    const wrongForLogic = IO.parseSavedJson(dcText, 'logic', L.validateDocument);
    assert.equal(wrongForLogic.ok, false);
    assert.match(wrongForLogic.error, /Circuits Lab/i);
});

check('Malformed JSON and invalid circuit/logic documents are rejected safely', () => {
    const badJson = IO.parseSavedJson('{not valid json', 'dc-circuit', D.validateDocument);
    assert.equal(badJson.ok, false);

    const badDoc = D.makePreset('series');
    badDoc.components[0].value = -50; // resistor value must be positive
    badDoc.components[0].type = 'resistor';
    const invalidRes = IO.parseSavedJson(IO.serializeSavedFile('dc-circuit', badDoc), 'dc-circuit', D.validateDocument);
    assert.equal(invalidRes.ok, false);
    assert.match(invalidRes.error, /validation/i);
});

check('PNG iTXt embedding & extraction preserves full UTF-8 symbols (Ω, µ, →, Σ) and valid PNG CRC32', () => {
    const doc = D.makePreset('zenerRegulator');
    doc.components[0].label = 'R1·100Ω·µA→Σ';
    const jsonText = IO.serializeSavedFile('dc-circuit', doc, 'utf8-bw-export');
    const pngWithMeta = IO.embedJsonInPng(MINIMAL_PNG, jsonText);

    assert.equal(IO.isPngBytes(pngWithMeta), true);
    assert.ok(pngWithMeta.length > MINIMAL_PNG.length);

    // Verify CRC32 of every chunk in the resulting PNG binary
    let offset = 8;
    let sawITXt = false;
    let sawIEND = false;
    while (offset + 12 <= pngWithMeta.length) {
        const len = ((pngWithMeta[offset] << 24) | (pngWithMeta[offset + 1] << 16) | (pngWithMeta[offset + 2] << 8) | pngWithMeta[offset + 3]) >>> 0;
        const type = String.fromCharCode(pngWithMeta[offset + 4], pngWithMeta[offset + 5], pngWithMeta[offset + 6], pngWithMeta[offset + 7]);
        const storedCrc = ((pngWithMeta[offset + 8 + len] << 24) | (pngWithMeta[offset + 9 + len] << 16) | (pngWithMeta[offset + 10 + len] << 8) | pngWithMeta[offset + 11 + len]) >>> 0;
        const computedCrc = IO.crc32(pngWithMeta.subarray(offset + 4, offset + 8 + len));
        assert.equal(storedCrc, computedCrc, `Invalid CRC32 on chunk ${type}`);
        if (type === 'iTXt') sawITXt = true;
        if (type === 'IEND') { sawIEND = true; break; }
        offset += 12 + len;
    }
    assert.equal(sawITXt, true, 'Expected iTXt chunk in exported PNG');
    assert.equal(sawIEND, true, 'Expected IEND chunk at end of exported PNG');

    const extracted = IO.extractJsonFromPng(pngWithMeta);
    assert.equal(extracted, jsonText);

    const parsed = IO.parseSavedJson(extracted, 'dc-circuit', D.validateDocument);
    assert.equal(parsed.ok, true);
    assert.equal(parsed.doc.components[0].label, 'R1·100Ω·µA→Σ');

    // Plain PNG without ElectricsimData returns null
    assert.equal(IO.extractJsonFromPng(MINIMAL_PNG), null);
});

check('Circuits Lab and Logic Lab HTML & renderers wire Save, Open, B&W Image and renderBWCanvas', () => {
    const dcHtml = fs.readFileSync(path.join(__dirname, '../pages/dc-circuit.html'), 'utf8');
    const lgHtml = fs.readFileSync(path.join(__dirname, '../pages/logic.html'), 'utf8');
    const dcRen = fs.readFileSync(path.join(__dirname, '../js/dc-circuit-renderer.js'), 'utf8');
    const lgRen = fs.readFileSync(path.join(__dirname, '../js/logic-renderer.js'), 'utf8');

    for (const [name, html] of [['dc-circuit.html', dcHtml], ['logic.html', lgHtml]]) {
        assert.ok(html.includes('id="saveBtn"'), `${name} missing saveBtn`);
        assert.ok(html.includes('id="openBtn"'), `${name} missing openBtn`);
        assert.ok(html.includes('id="exportBwBtn"'), `${name} missing exportBwBtn`);
        assert.ok(html.includes('id="openFileInput"'), `${name} missing openFileInput`);
        assert.ok(html.includes('../js/schematic-io.js'), `${name} missing schematic-io.js`);
    }
    assert.ok(dcRen.includes('renderBWCanvas('), 'dc-circuit-renderer.js missing renderBWCanvas');
    assert.ok(lgRen.includes('renderBWCanvas('), 'logic-renderer.js missing renderBWCanvas');
});

console.log(`\nALL ${passed} schematic save/drop/B&W export checks passed!`);

(function (root) {
    'use strict';
    const L = typeof module !== 'undefined' && module.exports
        ? require('./logic-model.js')
        : (root.LogicLab || (root.LogicLab = {}));

    function makeBasicAndOr() {
        // Simple 2-gate circuit: F = (A · B) + C
        const doc = L.blank();
        const inA = L.createInput(doc, -240, -72, 'A', 1);
        const inB = L.createInput(doc, -240, 0, 'B', 1);
        const inC = L.createInput(doc, -240, 72, 'C', 0);
        doc.inputs.push(inA, inB, inC);

        const and1 = L.createGate('AND', -48, -48, 2);
        const or1 = L.createGate('OR', 120, 24, 2);
        doc.gates.push(and1, or1);

        const outF = L.createOutput(doc, 288, 24, 'F');
        doc.outputs.push(outF);

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: and1.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: and1.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: and1.id, pin: 'out' }, { nodeId: or1.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inC.id, pin: 'out' }, { nodeId: or1.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: or1.id, pin: 'out' }, { nodeId: outF.id, pin: 'in0' });
        return doc;
    }

    function makeSimplifyDemo() {
        // F = (A · B) + (A · B') + (A · C)  ==> simplifies to F = A
        const doc = L.blank();
        const inA = L.createInput(doc, -288, -96, 'A', 1);
        const inB = L.createInput(doc, -288, 0, 'B', 0);
        const inC = L.createInput(doc, -288, 96, 'C', 1);
        doc.inputs.push(inA, inB, inC);

        const notB = L.createGate('NOT', -144, 24, 1);
        const and1 = L.createGate('AND', 24, -96, 2);
        const and2 = L.createGate('AND', 24, 0, 2);
        const and3 = L.createGate('AND', 24, 96, 2);
        const orOut = L.createGate('OR', 192, 0, 3);
        doc.gates.push(notB, and1, and2, and3, orOut);

        const outF = L.createOutput(doc, 336, 0, 'F');
        doc.outputs.push(outF);

        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: notB.id, pin: 'in0' });

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: and1.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: and1.id, pin: 'in1' });

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: and2.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: notB.id, pin: 'out' }, { nodeId: and2.id, pin: 'in1' });

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: and3.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inC.id, pin: 'out' }, { nodeId: and3.id, pin: 'in1' });

        L.connectWire(doc, { nodeId: and1.id, pin: 'out' }, { nodeId: orOut.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: and2.id, pin: 'out' }, { nodeId: orOut.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: and3.id, pin: 'out' }, { nodeId: orOut.id, pin: 'in2' });

        L.connectWire(doc, { nodeId: orOut.id, pin: 'out' }, { nodeId: outF.id, pin: 'in0' });
        return doc;
    }

    function makeDeMorgan() {
        // F = (A · B)' via NAND,  G = A' + B' via NOT + NOT + OR
        const doc = L.blank();
        const inA = L.createInput(doc, -264, -72, 'A', 1);
        const inB = L.createInput(doc, -264, 72, 'B', 0);
        doc.inputs.push(inA, inB);

        const nand1 = L.createGate('NAND', 24, -96, 2);
        const notA = L.createGate('NOT', -96, 24, 1);
        const notB = L.createGate('NOT', -96, 120, 1);
        const or1 = L.createGate('OR', 96, 72, 2);
        doc.gates.push(nand1, notA, notB, or1);

        const outF = L.createOutput(doc, 264, -96, 'F');
        const outG = L.createOutput(doc, 264, 72, 'G');
        doc.outputs.push(outF, outG);

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: nand1.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: nand1.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: nand1.id, pin: 'out' }, { nodeId: outF.id, pin: 'in0' });

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: notA.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: notB.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: notA.id, pin: 'out' }, { nodeId: or1.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: notB.id, pin: 'out' }, { nodeId: or1.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: or1.id, pin: 'out' }, { nodeId: outG.id, pin: 'in0' });
        return doc;
    }

    function makeXorFromNand() {
        // Classic 4-NAND XOR: F = A ⊕ B
        const doc = L.blank();
        const inA = L.createInput(doc, -288, -72, 'A', 1);
        const inB = L.createInput(doc, -288, 72, 'B', 0);
        doc.inputs.push(inA, inB);

        const n1 = L.createGate('NAND', -120, 0, 2);
        const n2 = L.createGate('NAND', 48, -72, 2);
        const n3 = L.createGate('NAND', 48, 72, 2);
        const n4 = L.createGate('NAND', 216, 0, 2);
        doc.gates.push(n1, n2, n3, n4);

        const outF = L.createOutput(doc, 360, 0, 'F');
        doc.outputs.push(outF);

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: n1.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: n1.id, pin: 'in1' });

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: n2.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: n1.id, pin: 'out' }, { nodeId: n2.id, pin: 'in1' });

        L.connectWire(doc, { nodeId: n1.id, pin: 'out' }, { nodeId: n3.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: n3.id, pin: 'in1' });

        L.connectWire(doc, { nodeId: n2.id, pin: 'out' }, { nodeId: n4.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: n3.id, pin: 'out' }, { nodeId: n4.id, pin: 'in1' });

        L.connectWire(doc, { nodeId: n4.id, pin: 'out' }, { nodeId: outF.id, pin: 'in0' });
        return doc;
    }

    function makeHalfAdder() {
        // F = Carry (A · B, MSB), G = Sum (A ⊕ B, LSB) -> Truth table F G reads 00, 01, 01, 10
        const doc = L.blank();
        const inA = L.createInput(doc, -216, -72, 'A', 1);
        const inB = L.createInput(doc, -216, 72, 'B', 1);
        doc.inputs.push(inA, inB);

        const andCarry = L.createGate('AND', 24, -72, 2);
        const xorSum = L.createGate('XOR', 24, 72, 2);
        doc.gates.push(andCarry, xorSum);

        const outCarry = L.createOutput(doc, 216, -72, 'F');
        const outSum = L.createOutput(doc, 216, 72, 'G');
        doc.outputs.push(outCarry, outSum);

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: andCarry.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: andCarry.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: andCarry.id, pin: 'out' }, { nodeId: outCarry.id, pin: 'in0' });

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: xorSum.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: xorSum.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: xorSum.id, pin: 'out' }, { nodeId: outSum.id, pin: 'in0' });
        return doc;
    }

    function makeFullAdder() {
        // Inputs A, B, C (Carry-In). Outputs F = Carry-Out (MSB), G = Sum (LSB)
        const doc = L.blank();
        const inA = L.createInput(doc, -312, -96, 'A', 1);
        const inB = L.createInput(doc, -312, 0, 'B', 1);
        const inC = L.createInput(doc, -312, 96, 'C', 0);
        doc.inputs.push(inA, inB, inC);

        const xor1 = L.createGate('XOR', -120, -72, 2);
        const xor2 = L.createGate('XOR', 96, 72, 2);
        const and1 = L.createGate('AND', 96, -24, 2);
        const and2 = L.createGate('AND', -72, 96, 2);
        const orCarry = L.createGate('OR', 240, -72, 2);
        doc.gates.push(xor1, xor2, and1, and2, orCarry);

        const outCarry = L.createOutput(doc, 384, -72, 'F');
        const outSum = L.createOutput(doc, 384, 72, 'G');
        doc.outputs.push(outCarry, outSum);

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: xor1.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: xor1.id, pin: 'in1' });

        L.connectWire(doc, { nodeId: xor1.id, pin: 'out' }, { nodeId: xor2.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inC.id, pin: 'out' }, { nodeId: xor2.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: xor2.id, pin: 'out' }, { nodeId: outSum.id, pin: 'in0' });

        L.connectWire(doc, { nodeId: xor1.id, pin: 'out' }, { nodeId: and1.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inC.id, pin: 'out' }, { nodeId: and1.id, pin: 'in1' });

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: and2.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: and2.id, pin: 'in1' });

        L.connectWire(doc, { nodeId: and1.id, pin: 'out' }, { nodeId: orCarry.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: and2.id, pin: 'out' }, { nodeId: orCarry.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: orCarry.id, pin: 'out' }, { nodeId: outCarry.id, pin: 'in0' });
        return doc;
    }

    function makeMux2to1() {
        // 2:1 Multiplexer: A = D0, B = D1, C = Select => F = A·C' + B·C
        const doc = L.blank();
        const inA = L.createInput(doc, -288, -96, 'A', 1);
        const inB = L.createInput(doc, -288, 0, 'B', 0);
        const inC = L.createInput(doc, -288, 96, 'C', 0);
        doc.inputs.push(inA, inB, inC);

        const notS = L.createGate('NOT', -120, 48, 1);
        const and0 = L.createGate('AND', 48, -48, 2);
        const and1 = L.createGate('AND', 48, 72, 2);
        const orOut = L.createGate('OR', 216, 0, 2);
        doc.gates.push(notS, and0, and1, orOut);

        const outF = L.createOutput(doc, 360, 0, 'F');
        doc.outputs.push(outF);

        L.connectWire(doc, { nodeId: inC.id, pin: 'out' }, { nodeId: notS.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: and0.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: notS.id, pin: 'out' }, { nodeId: and0.id, pin: 'in1' });

        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: and1.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inC.id, pin: 'out' }, { nodeId: and1.id, pin: 'in1' });

        L.connectWire(doc, { nodeId: and0.id, pin: 'out' }, { nodeId: orOut.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: and1.id, pin: 'out' }, { nodeId: orOut.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: orOut.id, pin: 'out' }, { nodeId: outF.id, pin: 'in0' });
        return doc;
    }

    function makeMajorityVoter() {
        // 3-input majority voter built in canonical 4-minterm form (simplifies to A·B + A·C + B·C)
        const doc = L.blank();
        const inA = L.createInput(doc, -312, -96, 'A', 1);
        const inB = L.createInput(doc, -312, 0, 'B', 1);
        const inC = L.createInput(doc, -312, 96, 'C', 0);
        doc.inputs.push(inA, inB, inC);

        const notA = L.createGate('NOT', -168, -96, 1);
        const notB = L.createGate('NOT', -168, 0, 1);
        const notC = L.createGate('NOT', -168, 96, 1);

        const m3 = L.createGate('AND', 24, -120, 3); // A'·B·C
        const m5 = L.createGate('AND', 24, -40, 3);  // A·B'·C
        const m6 = L.createGate('AND', 24, 40, 3);   // A·B·C'
        const m7 = L.createGate('AND', 24, 120, 3);  // A·B·C
        const orOut = L.createGate('OR', 216, 0, 4);
        doc.gates.push(notA, notB, notC, m3, m5, m6, m7, orOut);

        const outF = L.createOutput(doc, 360, 0, 'F');
        doc.outputs.push(outF);

        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: notA.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: notB.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inC.id, pin: 'out' }, { nodeId: notC.id, pin: 'in0' });

        // m3 = A' B C
        L.connectWire(doc, { nodeId: notA.id, pin: 'out' }, { nodeId: m3.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: m3.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: inC.id, pin: 'out' }, { nodeId: m3.id, pin: 'in2' });

        // m5 = A B' C
        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: m5.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: notB.id, pin: 'out' }, { nodeId: m5.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: inC.id, pin: 'out' }, { nodeId: m5.id, pin: 'in2' });

        // m6 = A B C'
        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: m6.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: m6.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: notC.id, pin: 'out' }, { nodeId: m6.id, pin: 'in2' });

        // m7 = A B C
        L.connectWire(doc, { nodeId: inA.id, pin: 'out' }, { nodeId: m7.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB.id, pin: 'out' }, { nodeId: m7.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: inC.id, pin: 'out' }, { nodeId: m7.id, pin: 'in2' });

        L.connectWire(doc, { nodeId: m3.id, pin: 'out' }, { nodeId: orOut.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: m5.id, pin: 'out' }, { nodeId: orOut.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: m6.id, pin: 'out' }, { nodeId: orOut.id, pin: 'in2' });
        L.connectWire(doc, { nodeId: m7.id, pin: 'out' }, { nodeId: orOut.id, pin: 'in3' });
        L.connectWire(doc, { nodeId: orOut.id, pin: 'out' }, { nodeId: outF.id, pin: 'in0' });
        return doc;
    }

    const PRESETS = {
        basicAndOr: {
            name: 'Basic AND / OR circuit · F = A·B + C',
            description: 'Simple 2-gate circuit: F is 1 when both A and B are 1, or when C is 1.',
            make: makeBasicAndOr
        },
        halfAdder: {
            name: 'Half adder · Carry (F) & Sum (G)',
            description: 'Adds two 1-bit inputs A and B to produce Carry F = A·B (MSB) and Sum G = A ⊕ B (LSB).',
            make: makeHalfAdder
        },
        fullAdder: {
            name: '1-Bit Full Adder · Carry-Out (F) & Sum (G)',
            description: 'Adds A, B, and Carry-In (C) using two XOR gates, two AND gates, and an OR gate.',
            make: makeFullAdder
        },
        mux2to1: {
            name: '2-to-1 Multiplexer · F = A·C\' + B·C',
            description: 'Select input C routes either data input A (when C=0) or data input B (when C=1) to output F.',
            make: makeMux2to1
        },
        deMorgan: {
            name: 'De Morgan\'s Law · (A·B)\' = A\' + B\'',
            description: 'Compare F = (A·B)\' and G = A\' + B\' in the truth table: both outputs match in every row.',
            make: makeDeMorgan
        },
        simplifyDemo: {
            name: 'Simplification demo · F = A·B + A·B\' + A·C',
            description: 'Redundant 5-gate circuit that simplifies directly to F = A. Click Apply Minimal to test.',
            make: makeSimplifyDemo
        }
    };

    const EXTRA_PRESETS = {
        xorNand: makeXorFromNand,
        fullAdder: makeFullAdder,
        mux2to1: makeMux2to1,
        majority3: makeMajorityVoter,
        blank: () => L.blank()
    };

    function makePreset(id) {
        if (PRESETS[id]) return PRESETS[id].make();
        if (EXTRA_PRESETS[id]) return EXTRA_PRESETS[id]();
        return L.blank();
    }

    Object.assign(L, {
        PRESETS,
        makePreset
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = L;
    }
})(typeof window !== 'undefined' ? window : globalThis);

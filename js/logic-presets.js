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

    // 9. 2-Bit Ripple-Carry Adder using Half Adder (HA) + Full Adder (FA) blocks
    //    Inputs: A (A0), B (B0), C (A1), D (B1) -> Outputs: F (S0), G (S1), H (Cout)
    function makeRippleAdder2Bit() {
        const doc = L.blank();
        const inA0 = L.createInput(doc, -264, -120, 'A', 1);
        doc.inputs.push(inA0);
        const inB0 = L.createInput(doc, -264, -48, 'B', 1);
        doc.inputs.push(inB0);
        const inA1 = L.createInput(doc, -264, 48, 'C', 1);
        doc.inputs.push(inA1);
        const inB1 = L.createInput(doc, -264, 120, 'D', 0);
        doc.inputs.push(inB1);

        const ha = L.createGate('HA', -48, -84);
        const fa = L.createGate('FA', 96, 72);
        doc.gates.push(ha, fa);

        const outS0 = L.createOutput(doc, 264, -96, 'F');
        doc.outputs.push(outS0);
        const outS1 = L.createOutput(doc, 264, 48, 'G');
        doc.outputs.push(outS1);
        const outCout = L.createOutput(doc, 264, 120, 'H');
        doc.outputs.push(outCout);

        L.connectWire(doc, { nodeId: inA0.id, pin: 'out' }, { nodeId: ha.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB0.id, pin: 'out' }, { nodeId: ha.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: ha.id, pin: 'out' }, { nodeId: outS0.id, pin: 'in0' });

        L.connectWire(doc, { nodeId: inA1.id, pin: 'out' }, { nodeId: fa.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inB1.id, pin: 'out' }, { nodeId: fa.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: ha.id, pin: 'out1' }, { nodeId: fa.id, pin: 'in2' });

        L.connectWire(doc, { nodeId: fa.id, pin: 'out' }, { nodeId: outS1.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: fa.id, pin: 'out1' }, { nodeId: outCout.id, pin: 'in0' });
        return doc;
    }

    // 10. 4-to-2 Priority Encoder Interrupt Controller (ENC42 Block)
    function makePriorityEncoder() {
        const doc = L.blank();
        const d0 = L.createInput(doc, -240, -108, 'A', 1);
        doc.inputs.push(d0);
        const d1 = L.createInput(doc, -240, -36, 'B', 0);
        doc.inputs.push(d1);
        const d2 = L.createInput(doc, -240, 36, 'C', 1);
        doc.inputs.push(d2);
        const d3 = L.createInput(doc, -240, 108, 'D', 0);
        doc.inputs.push(d3);

        const enc = L.createGate('ENC42', 0, 0);
        doc.gates.push(enc);

        const y1 = L.createOutput(doc, 240, -72, 'F');
        doc.outputs.push(y1);
        const y0 = L.createOutput(doc, 240, 0, 'G');
        doc.outputs.push(y0);
        const valid = L.createOutput(doc, 240, 72, 'H');
        doc.outputs.push(valid);

        L.connectWire(doc, { nodeId: d0.id, pin: 'out' }, { nodeId: enc.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: d1.id, pin: 'out' }, { nodeId: enc.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: d2.id, pin: 'out' }, { nodeId: enc.id, pin: 'in2' });
        L.connectWire(doc, { nodeId: d3.id, pin: 'out' }, { nodeId: enc.id, pin: 'in3' });

        L.connectWire(doc, { nodeId: enc.id, pin: 'out' }, { nodeId: y1.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: enc.id, pin: 'out1' }, { nodeId: y0.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: enc.id, pin: 'out2' }, { nodeId: valid.id, pin: 'in0' });
        return doc;
    }

    // 11. 4:1 Multiplexer Data Router (MUX4 Block)
    function makeMux4Router() {
        const doc = L.blank();
        const d0 = L.createInput(doc, -264, -144, 'A', 0);
        doc.inputs.push(d0);
        const d1 = L.createInput(doc, -264, -96, 'B', 1);
        doc.inputs.push(d1);
        const d2 = L.createInput(doc, -264, -48, 'C', 0);
        doc.inputs.push(d2);
        const d3 = L.createInput(doc, -264, 0, 'D', 1);
        doc.inputs.push(d3);
        const s1 = L.createInput(doc, -264, 72, 'E', 0);
        doc.inputs.push(s1);
        const s0 = L.createInput(doc, -264, 120, 'I', 1);
        doc.inputs.push(s0);

        const mux = L.createGate('MUX4', 0, 0);
        doc.gates.push(mux);
        const outY = L.createOutput(doc, 240, 0, 'F');
        doc.outputs.push(outY);

        L.connectWire(doc, { nodeId: d0.id, pin: 'out' }, { nodeId: mux.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: d1.id, pin: 'out' }, { nodeId: mux.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: d2.id, pin: 'out' }, { nodeId: mux.id, pin: 'in2' });
        L.connectWire(doc, { nodeId: d3.id, pin: 'out' }, { nodeId: mux.id, pin: 'in3' });
        L.connectWire(doc, { nodeId: s1.id, pin: 'out' }, { nodeId: mux.id, pin: 'in4' });
        L.connectWire(doc, { nodeId: s0.id, pin: 'out' }, { nodeId: mux.id, pin: 'in5' });
        L.connectWire(doc, { nodeId: mux.id, pin: 'out' }, { nodeId: outY.id, pin: 'in0' });
        return doc;
    }

    // 12. SR-Latch & D-Latch Sequential Memory Bench
    function makeLatchesDemo() {
        const doc = L.blank();
        const inS = L.createInput(doc, -240, -108, 'A', 1);
        doc.inputs.push(inS);
        const inR = L.createInput(doc, -240, -48, 'B', 0);
        doc.inputs.push(inR);
        const inD = L.createInput(doc, -240, 48, 'C', 1);
        doc.inputs.push(inD);
        const inEN = L.createInput(doc, -240, 108, 'D', 1);
        doc.inputs.push(inEN);

        const sr = L.createGate('SR_LATCH', 0, -78);
        const dl = L.createGate('D_LATCH', 0, 78);
        doc.gates.push(sr, dl);

        const outQ1 = L.createOutput(doc, 240, -108, 'F');
        doc.outputs.push(outQ1);
        const outQB1 = L.createOutput(doc, 240, -48, 'G');
        doc.outputs.push(outQB1);
        const outQ2 = L.createOutput(doc, 240, 48, 'H');
        doc.outputs.push(outQ2);
        const outQB2 = L.createOutput(doc, 240, 108, 'Y');
        doc.outputs.push(outQB2);

        L.connectWire(doc, { nodeId: inS.id, pin: 'out' }, { nodeId: sr.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inR.id, pin: 'out' }, { nodeId: sr.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: sr.id, pin: 'out' }, { nodeId: outQ1.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: sr.id, pin: 'out1' }, { nodeId: outQB1.id, pin: 'in0' });

        L.connectWire(doc, { nodeId: inD.id, pin: 'out' }, { nodeId: dl.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: inEN.id, pin: 'out' }, { nodeId: dl.id, pin: 'in1' });
        L.connectWire(doc, { nodeId: dl.id, pin: 'out' }, { nodeId: outQ2.id, pin: 'in0' });
        L.connectWire(doc, { nodeId: dl.id, pin: 'out1' }, { nodeId: outQB2.id, pin: 'in0' });
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
        rippleAdder2Bit: {
            name: '2-Bit Ripple Adder · HA + FA Blocks',
            description: 'Cascades a Half Adder block (HA) into a Full Adder block (FA) to add two 2-bit numbers.',
            make: makeRippleAdder2Bit
        },
        mux2to1: {
            name: '2-to-1 Multiplexer · F = A·C\' + B·C',
            description: 'Select input C routes either data input A (when C=0) or data input B (when C=1) to output F.',
            make: makeMux2to1
        },
        mux4Router: {
            name: '4:1 Multiplexer Router · MUX4 Block',
            description: 'Routes 4 data inputs (A..D) to output F using 2-bit select lines E (S1) and I (S0).',
            make: makeMux4Router
        },
        priorityEncoder: {
            name: '4-to-2 Priority Encoder · ENC42 Block',
            description: 'Encodes highest-priority active input D3..D0 into 2-bit binary index (F, G) plus Valid flag (H).',
            make: makePriorityEncoder
        },
        latchesDemo: {
            name: 'SR-Latch & D-Latch Memory Bench',
            description: 'Interactive SR Bistable Latch (top) and Gated D Transparent Latch (bottom) with live memory retention.',
            make: makeLatchesDemo
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

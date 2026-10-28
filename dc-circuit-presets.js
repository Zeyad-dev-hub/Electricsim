(function(root){
    'use strict';const D=typeof module!=='undefined'?require('./dc-circuit-model.js'):root.DCCircuit;
    function fixture(definitions,positions={}){
        const doc=D.blank(),nodes=new Map();
        function node(name){if(!nodes.has(name)){const i=nodes.size;const j={id:`node-${name}`,position:positions[name]||{x:160+(i%4)*180,y:120+Math.floor(i/4)*240}};nodes.set(name,j);doc.junctions.push(j);}return nodes.get(name);}
        definitions.forEach(([label,type,a,b,value,extra={}],i)=>{const pa=node(a).position,pb=node(b).position,c=D.component(type,(pa.x+pb.x)/2,(pa.y+pb.y)/2,label);c.id=label;c.terminals=[`${label}:a`,`${label}:b`];c.value=value;Object.assign(c,extra);c.rotation=pa.x===pb.x?90:0;doc.components.push(c);D.wire(doc,`${label}:a`,node(a).id);D.wire(doc,`${label}:b`,node(b).id);});
        if(nodes.has('0'))doc.referenceEndpoints=[nodes.get('0').id];return doc;
    }
    function makeHalfWave(){
        const doc=D.blank();
        const ac=D.component('ac',-240,0,'AC1');ac.value=10;ac.frequency=1;ac.rotation=90;
        const d1=D.component('diode',0,-144,'D1');d1.value=.7;d1.rotation=0;
        const r1=D.component('resistor',240,0,'R1');r1.value=100;r1.rotation=90;
        doc.components.push(ac,d1,r1);
        D.wire(doc,ac.terminals[0],d1.terminals[0]);
        D.wire(doc,d1.terminals[1],r1.terminals[0]);
        D.wire(doc,r1.terminals[1],ac.terminals[1]);
        doc.referenceEndpoints.push(ac.terminals[1]);
        return doc;
    }
    function makeFullWaveBridge(){
        const doc=D.blank();
        // Classic 4-diode diamond bridge (no center tap) using 45° / 135° diode orientations!
        const ac=D.component('ac',-360,0,'AC1');ac.value=12;ac.frequency=1;ac.rotation=90;
        const nTop={id:'node-ac-top',position:{x:0,y:-168}};
        const nBot={id:'node-ac-bot',position:{x:0,y:168}};
        const nLeft={id:'node-dc-neg',position:{x:-168,y:0}};
        const nRight={id:'node-dc-pos',position:{x:168,y:0}};
        doc.junctions.push(nTop,nBot,nLeft,nRight);
        // D1: top AC node -> right (+) DC node (45°)
        const d1=D.component('diode',84,-84,'D1');d1.rotation=45;
        // D2: bottom AC node -> right (+) DC node (-45° / 315°)
        const d2=D.component('diode',84,84,'D2');d2.rotation=315;
        // D3: left (-) DC node -> top AC node (-45° / 315°)
        const d3=D.component('diode',-84,-84,'D3');d3.rotation=315;
        // D4: left (-) DC node -> bottom AC node (45°)
        const d4=D.component('diode',-84,84,'D4');d4.rotation=45;
        const rLoad=D.component('resistor',360,0,'R1');rLoad.value=100;rLoad.rotation=90;
        doc.components.push(ac,d1,d2,d3,d4,rLoad);
        D.wire(doc,d1.terminals[0],nTop.id);D.wire(doc,d1.terminals[1],nRight.id);
        D.wire(doc,d2.terminals[0],nBot.id);D.wire(doc,d2.terminals[1],nRight.id);
        D.wire(doc,d3.terminals[0],nLeft.id);D.wire(doc,d3.terminals[1],nTop.id);
        D.wire(doc,d4.terminals[0],nLeft.id);D.wire(doc,d4.terminals[1],nBot.id);
        D.wire(doc,ac.terminals[0],nTop.id,[{x:-360,y:-240},{x:0,y:-240}]);
        D.wire(doc,ac.terminals[1],nBot.id,[{x:-360,y:240},{x:0,y:240}]);
        D.wire(doc,nRight.id,rLoad.terminals[0],[{x:360,y:-120}]);
        D.wire(doc,rLoad.terminals[1],nLeft.id,[{x:360,y:288},{x:-168,y:288}]);
        doc.referenceEndpoints.push(nLeft.id);
        return doc;
    }
    function makeTransformerStepUp(){
        const doc=D.blank();
        const ac=D.component('ac',-288,0,'AC1');ac.value=10;ac.frequency=1;ac.rotation=90;
        const tr=D.component('transformer',0,0,'T1');tr.turnsPrimary=1;tr.turnsSecondary=5;
        const rLoad=D.component('resistor',288,0,'R1');rLoad.value=250;rLoad.rotation=90;
        doc.components.push(ac,tr,rLoad);
        D.wire(doc,ac.terminals[0],tr.terminals[0]);
        D.wire(doc,ac.terminals[1],tr.terminals[1]);
        D.wire(doc,tr.terminals[2],rLoad.terminals[0]);
        D.wire(doc,tr.terminals[3],rLoad.terminals[1]);
        doc.referenceEndpoints.push(ac.terminals[1],tr.terminals[3]);
        return doc;
    }
    const presets={
        halfWave:{name:'Half-wave rectifier',question:'Press Run: D1 conducts on positive AC half-cycles (dropping 0.7 V) and blocks negative half-cycles.',make:makeHalfWave,customLayout:true},
        fullWaveBridge:{name:'Full-wave bridge rectifier',question:'Press Run: D1 & D4 conduct on one half-cycle and D2 & D3 on the other, so R1 always receives positive current without a center tap.',make:makeFullWaveBridge,customLayout:true},
        transformerStepUp:{name:'AC transformer · 1:5 step-up',question:'Press Run: 10 Vp AC on the primary is stepped up to 50 Vp across R1 on the isolated secondary.',make:makeTransformerStepUp,customLayout:true},
        rc:{name:'RC · charge & discharge',question:'Open S1 to disconnect the battery; close S2 to discharge. How does doubling C1 change the time?',make:()=>fixture([['V1','voltage','s','0',9],['S1','switch','s','a',0,{closed:true}],['R1','resistor','a','b',1000],['C1','capacitor','b','0',.001],['S2','switch','b','d',0,{closed:false}],['R2','resistor','d','0',1000]],{s:{x:120,y:120},a:{x:320,y:120},b:{x:600,y:120},d:{x:800,y:120},'0':{x:600,y:400}})},
        ohm:{name:'Ohm’s law',question:'What happens to the current when resistance doubles?',make:()=>fixture([['V1','voltage','a','0',12],['R1','resistor','a','0',300]],{a:{x:340,y:120},'0':{x:340,y:400}})},
        series:{name:'Series · voltage divider',question:'Both resistors carry the same current. Where does the 12 V go?',make:()=>fixture([['V1','voltage','a','0',12],['R1','resistor','a','b',100],['R2','resistor','b','0',200]],{a:{x:180,y:120},b:{x:620,y:120},'0':{x:620,y:400}})},
        parallel:{name:'Parallel · current split',question:'Equal terminal voltage, unequal currents. Check KCL at the junction.',make:()=>fixture([['V1','voltage','a','0',12],['R1','resistor','a','0',100],['R2','resistor','a','0',200]],{a:{x:420,y:120},'0':{x:420,y:400}})},
        mixed:{name:'Mixed resistor network',question:'Reduce the parallel pair, then the series pair.',make:()=>fixture([['V1','voltage','a','0',12],['R1','resistor','a','b',100],['R2','resistor','b','0',200],['R3','resistor','b','0',300]],{a:{x:180,y:120},b:{x:600,y:120},'0':{x:600,y:400}})},
        bridge:{name:'Bridge · general network',question:'This is not a series/parallel tree. Inspect the current through R5.',make:()=>fixture([['V1','voltage','a','0',10],['R1','resistor','a','c',100],['R2','resistor','c','0',100],['R3','resistor','a','d',100],['R4','resistor','d','0',200],['R5','resistor','c','d',100]],{a:{x:440,y:80},c:{x:200,y:250},d:{x:680,y:250},'0':{x:440,y:480}})},
        ladder:{name:'Two-capacitor RC ladder',question:'Compare C1 and C2: two coupled time constants, rather than two independent RC curves.',make:()=>fixture([['V1','voltage','a','0',10],['R1','resistor','a','b',1000],['R2','resistor','b','c',1000],['C1','capacitor','b','0',.001],['C2','capacitor','c','0',.001]],{a:{x:140,y:120},b:{x:440,y:120},c:{x:740,y:120},'0':{x:440,y:430}})},
        transform:{name:'Thévenin ↔ Norton',question:'Select V1 and transform it with R1. R2 must still receive 8 V and 40 mA.',make:()=>fixture([['V1','voltage','s','0',12],['R1','resistor','s','a',100],['R2','resistor','a','0',200]],{s:{x:180,y:120},a:{x:620,y:120},'0':{x:620,y:400}})},
        transformRC:{name:'Source transformation · RC load',question:'Transform V1 with R1 while paused. C1 keeps its voltage and the external transient stays equivalent.',make:()=>fixture([['V1','voltage','s','0',12],['R1','resistor','s','a',100],['R2','resistor','a','b',200],['C1','capacitor','b','0',.001]],{s:{x:120,y:120},a:{x:400,y:120},b:{x:720,y:120},'0':{x:720,y:420}})},
        ramp:{name:'Current source · capacitor ramp',question:'A constant current produces dV/dt = I/C. This circuit has no finite charged target.',make:()=>fixture([['I1','current','0','a',.001],['C1','capacitor','a','0',.001]],{a:{x:420,y:120},'0':{x:420,y:400}})},
        blank:{name:'Blank circuit',question:'Place components, then choose Wire and connect their terminal dots. Crossings join only at explicit junctions.',make:D.blank}
    };
    // Route repeated parallel elements on separate lanes, keeping endpoint identities intact.
    function layout(doc){
        const groups=new Map();for(const c of doc.components){const attached=c.terminals.map(t=>doc.wires.find(w=>w.fromEndpoint===t||w.toEndpoint===t)).map(w=>w?.fromEndpoint===c.terminals[0]||w?.fromEndpoint===c.terminals[1]?w.toEndpoint:w?.fromEndpoint);const key=attached.slice().sort().join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);}
        for(const group of groups.values())if(group.length>1)group.forEach((c,i)=>{c.position.x+=(i-(group.length-1)/2)*200;c.rotation=90;});
        for(const c of doc.components){if(c.type==='voltage'&&groups.size>1&&doc.components.length>2){c.position.x=90;c.rotation=90;}}
        // Distinguish charge/discharge return paths in the default experiment.
        const c1=doc.components.find(c=>c.id==='C1'),r2=doc.components.find(c=>c.id==='R2');
        if(doc.components.some(c=>c.id==='S2')&&c1&&r2){c1.position={x:600,y:260};c1.rotation=90;r2.position={x:800,y:260};r2.rotation=90;}
        return doc;
    }
    function makePreset(id){const p=presets[id];return p.customLayout?p.make():layout(p.make());}
    Object.assign(D,{fixture,presets,makePreset});if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);

(function(root){
    'use strict';const D=typeof module!=='undefined'?require('./dc-circuit-model.js'):root.DCCircuit;
    function fixture(definitions,positions={}){
        const doc=D.blank(),nodes=new Map();
        function node(name){if(!nodes.has(name)){const i=nodes.size;const j={id:`node-${name}`,position:positions[name]||{x:160+(i%4)*180,y:120+Math.floor(i/4)*240}};nodes.set(name,j);doc.junctions.push(j);}return nodes.get(name);}
        definitions.forEach(([label,type,a,b,value,extra={}],i)=>{const pa=node(a).position,pb=node(b).position,c=D.component(type,(pa.x+pb.x)/2,(pa.y+pb.y)/2,label);c.id=label;c.terminals=[`${label}:a`,`${label}:b`];c.value=value;Object.assign(c,extra);c.rotation=pa.x===pb.x?90:0;doc.components.push(c);D.wire(doc,`${label}:a`,node(a).id);D.wire(doc,`${label}:b`,node(b).id);});
        if(nodes.has('0'))doc.referenceEndpoints=[nodes.get('0').id];return doc;
    }
    function place(doc,id,type,x,y,rotation,value,extra={}){
        const c=D.component(type,x,y,id);c.id=id;c.terminals=type==='transformer'?['p1','p2','s1','s2'].map(s=>`${id}:${s}`):[`${id}:a`,`${id}:b`];
        c.value=value;c.rotation=rotation;Object.assign(c,extra);doc.components.push(c);return c;
    }
    function junc(doc,id,x,y){const j={id,position:{x,y}};doc.junctions.push(j);return j;}
    function makeHalfWave(){
        const doc=D.blank();
        const ac=place(doc,'AC1','ac',-240,0,90,10,{frequency:1});
        const d1=place(doc,'D1','diode',0,-144,0,.7);
        const r1=place(doc,'R1','resistor',240,0,90,100);
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
        const rLoad=D.component('resistor',432,-72,'R1');rLoad.value=100;rLoad.rotation=90;
        doc.components.push(ac,d1,d2,d3,d4,rLoad);
        D.wire(doc,d1.terminals[0],nTop.id);D.wire(doc,d1.terminals[1],nRight.id);
        D.wire(doc,d2.terminals[0],nBot.id);D.wire(doc,d2.terminals[1],nRight.id);
        D.wire(doc,d3.terminals[0],nLeft.id);D.wire(doc,d3.terminals[1],nTop.id);
        D.wire(doc,d4.terminals[0],nLeft.id);D.wire(doc,d4.terminals[1],nBot.id);
        D.wire(doc,ac.terminals[0],nTop.id,[{x:-360,y:-240},{x:0,y:-240}]);
        D.wire(doc,ac.terminals[1],nBot.id,[{x:-360,y:240},{x:0,y:240}]);
        D.wire(doc,nRight.id,rLoad.terminals[0],[{x:312,y:0},{x:312,y:-168},{x:432,y:-168}]);
        D.wire(doc,rLoad.terminals[1],nLeft.id,[{x:432,y:288},{x:-168,y:288}]);
        doc.referenceEndpoints.push(nLeft.id);
        return doc;
    }
    function makeTransformerStepUp(){
        const doc=D.blank();
        const ac=place(doc,'AC1','ac',-240,0,90,10,{frequency:1});
        const tr=place(doc,'T1','transformer',0,0,0,0,{turnsPrimary:1,turnsSecondary:5});
        const rLoad=place(doc,'R1','resistor',240,0,90,250);
        D.wire(doc,ac.terminals[0],tr.terminals[0]);
        D.wire(doc,ac.terminals[1],tr.terminals[1]);
        D.wire(doc,tr.terminals[2],rLoad.terminals[0]);
        D.wire(doc,tr.terminals[3],rLoad.terminals[1]);
        doc.referenceEndpoints.push(ac.terminals[1],tr.terminals[3]);
        return doc;
    }
    function makeRCChargeDischarge(){
        const doc=D.blank();
        const ns=junc(doc,'node-s',96,120);
        const na=junc(doc,'node-a',312,120);
        const nb=junc(doc,'node-b',552,120);
        const nd=junc(doc,'node-d',792,120);
        const n0=junc(doc,'node-0',552,408);
        const v1=place(doc,'V1','voltage',96,264,90,9);
        const s1=place(doc,'S1','switch',216,120,0,0,{closed:true});
        const r1=place(doc,'R1','resistor',432,120,0,1000);
        const c1=place(doc,'C1','capacitor',552,264,90,.001);
        const s2=place(doc,'S2','switch',672,120,0,0,{closed:false});
        const r2=place(doc,'R2','resistor',792,264,90,1000);
        D.wire(doc,v1.terminals[0],ns.id);
        D.wire(doc,v1.terminals[1],n0.id);
        D.wire(doc,s1.terminals[0],ns.id);
        D.wire(doc,s1.terminals[1],na.id);
        D.wire(doc,r1.terminals[0],na.id);
        D.wire(doc,r1.terminals[1],nb.id);
        D.wire(doc,c1.terminals[0],nb.id);
        D.wire(doc,c1.terminals[1],n0.id);
        D.wire(doc,s2.terminals[0],nb.id);
        D.wire(doc,s2.terminals[1],nd.id);
        D.wire(doc,r2.terminals[0],nd.id);
        D.wire(doc,r2.terminals[1],n0.id);
        doc.referenceEndpoints=[n0.id];
        return doc;
    }
    function makeRCLamp(){
        const doc=D.blank();
        const ns=junc(doc,'node-s',96,120);
        const na=junc(doc,'node-a',312,120);
        const nb=junc(doc,'node-b',552,120);
        const nd=junc(doc,'node-d',792,120);
        const n0=junc(doc,'node-0',552,408);
        const v1=place(doc,'V1','voltage',96,264,90,12);
        const s1=place(doc,'S1','switch',216,120,0,0,{closed:true});
        const r1=place(doc,'R1','resistor',432,120,0,100);
        const c1=place(doc,'C1','capacitor',552,264,90,.01);
        const s2=place(doc,'S2','switch',672,120,0,0,{closed:false});
        const l1=place(doc,'L1','lamp',792,264,90,100);
        D.wire(doc,v1.terminals[0],ns.id);
        D.wire(doc,v1.terminals[1],n0.id);
        D.wire(doc,s1.terminals[0],ns.id);
        D.wire(doc,s1.terminals[1],na.id);
        D.wire(doc,r1.terminals[0],na.id);
        D.wire(doc,r1.terminals[1],nb.id);
        D.wire(doc,c1.terminals[0],nb.id);
        D.wire(doc,c1.terminals[1],n0.id);
        D.wire(doc,s2.terminals[0],nb.id);
        D.wire(doc,s2.terminals[1],nd.id);
        D.wire(doc,l1.terminals[0],nd.id);
        D.wire(doc,l1.terminals[1],n0.id);
        doc.referenceEndpoints=[n0.id];
        return doc;
    }
    function makeRCLadder(){
        const doc=D.blank();
        const ns=junc(doc,'node-s',96,120);
        const na=junc(doc,'node-a',312,120);
        const nb=junc(doc,'node-b',552,120);
        const nc=junc(doc,'node-c',792,120);
        const ng=junc(doc,'node-g',312,408);
        const n0=junc(doc,'node-0',552,408);
        const v1=place(doc,'V1','voltage',96,264,90,10);
        const s1=place(doc,'S1','switch',216,120,0,0,{closed:true});
        const s2=place(doc,'S2','switch',312,264,90,0,{closed:false});
        const r1=place(doc,'R1','resistor',432,120,0,1000);
        const c1=place(doc,'C1','capacitor',552,264,90,.001);
        const r2=place(doc,'R2','resistor',672,120,0,1000);
        const c2=place(doc,'C2','capacitor',792,264,90,.001);
        D.wire(doc,v1.terminals[0],ns.id);
        D.wire(doc,v1.terminals[1],ng.id);
        D.wire(doc,s1.terminals[0],ns.id);
        D.wire(doc,s1.terminals[1],na.id);
        D.wire(doc,s2.terminals[0],na.id);
        D.wire(doc,s2.terminals[1],ng.id);
        D.wire(doc,ng.id,n0.id);
        D.wire(doc,r1.terminals[0],na.id);
        D.wire(doc,r1.terminals[1],nb.id);
        D.wire(doc,c1.terminals[0],nb.id);
        D.wire(doc,c1.terminals[1],n0.id);
        D.wire(doc,r2.terminals[0],nb.id);
        D.wire(doc,r2.terminals[1],nc.id);
        D.wire(doc,c2.terminals[0],nc.id);
        D.wire(doc,c2.terminals[1],n0.id);
        doc.referenceEndpoints=[n0.id];
        return doc;
    }
    function makeOhm(){
        const doc=D.blank();
        const na=junc(doc,'node-a',144,120);
        const nb=junc(doc,'node-b',528,120);
        const n0=junc(doc,'node-0',528,408);
        const v1=place(doc,'V1','voltage',144,264,90,12);
        const s1=place(doc,'S1','switch',336,120,0,0,{closed:true});
        const r1=place(doc,'R1','resistor',528,264,90,300);
        D.wire(doc,v1.terminals[0],na.id);
        D.wire(doc,v1.terminals[1],n0.id);
        D.wire(doc,s1.terminals[0],na.id);
        D.wire(doc,s1.terminals[1],nb.id);
        D.wire(doc,r1.terminals[0],nb.id);
        D.wire(doc,r1.terminals[1],n0.id);
        doc.referenceEndpoints=[n0.id];
        return doc;
    }
    function makeSeries(){
        const doc=D.blank();
        const na=junc(doc,'node-a',144,120);
        const nb=junc(doc,'node-b',576,120);
        const n0=junc(doc,'node-0',576,408);
        const v1=place(doc,'V1','voltage',144,264,90,12);
        const r1=place(doc,'R1','resistor',360,120,0,100);
        const r2=place(doc,'R2','resistor',576,264,90,200);
        D.wire(doc,v1.terminals[0],na.id);
        D.wire(doc,v1.terminals[1],n0.id);
        D.wire(doc,r1.terminals[0],na.id);
        D.wire(doc,r1.terminals[1],nb.id);
        D.wire(doc,r2.terminals[0],nb.id);
        D.wire(doc,r2.terminals[1],n0.id);
        doc.referenceEndpoints=[n0.id];
        return doc;
    }
    function makeParallel(){
        const doc=D.blank();
        const na=junc(doc,'node-a',384,120);
        const n0=junc(doc,'node-0',384,408);
        const v1=place(doc,'V1','voltage',192,264,90,12);
        const r1=place(doc,'R1','resistor',384,264,90,100);
        const r2=place(doc,'R2','resistor',576,264,90,200);
        D.wire(doc,v1.terminals[0],na.id);
        D.wire(doc,v1.terminals[1],n0.id);
        D.wire(doc,r1.terminals[0],na.id);
        D.wire(doc,r1.terminals[1],n0.id);
        D.wire(doc,r2.terminals[0],na.id);
        D.wire(doc,r2.terminals[1],n0.id);
        doc.referenceEndpoints=[n0.id];
        return doc;
    }
    function makeCurrentDivider(){
        const doc=D.blank();
        const na=junc(doc,'node-a',384,120);
        const n0=junc(doc,'node-0',384,408);
        const i1=place(doc,'I1','current',192,264,270,.03);
        const r1=place(doc,'R1','resistor',384,264,90,100);
        const r2=place(doc,'R2','resistor',576,264,90,200);
        D.wire(doc,i1.terminals[0],n0.id);
        D.wire(doc,i1.terminals[1],na.id);
        D.wire(doc,r1.terminals[0],na.id);
        D.wire(doc,r1.terminals[1],n0.id);
        D.wire(doc,r2.terminals[0],na.id);
        D.wire(doc,r2.terminals[1],n0.id);
        doc.referenceEndpoints=[n0.id];
        return doc;
    }
    function makeMixed(){
        const doc=D.blank();
        const na=junc(doc,'node-a',120,120);
        const nb=junc(doc,'node-b',504,120);
        const n0=junc(doc,'node-0',504,408);
        const v1=place(doc,'V1','voltage',120,264,90,12);
        const r1=place(doc,'R1','resistor',312,120,0,100);
        const r2=place(doc,'R2','resistor',504,264,90,200);
        const r3=place(doc,'R3','resistor',696,264,90,300);
        D.wire(doc,v1.terminals[0],na.id);
        D.wire(doc,v1.terminals[1],n0.id);
        D.wire(doc,r1.terminals[0],na.id);
        D.wire(doc,r1.terminals[1],nb.id);
        D.wire(doc,r2.terminals[0],nb.id);
        D.wire(doc,r2.terminals[1],n0.id);
        D.wire(doc,r3.terminals[0],nb.id);
        D.wire(doc,r3.terminals[1],n0.id);
        doc.referenceEndpoints=[n0.id];
        return doc;
    }
    function makeBridge(){
        const doc=D.blank();
        const na=junc(doc,'node-a',312,72);
        const nc=junc(doc,'node-c',312,264);
        const nd=junc(doc,'node-d',600,264);
        const n0=junc(doc,'node-0',312,456);
        const v1=place(doc,'V1','voltage',120,264,90,10);
        const r1=place(doc,'R1','resistor',312,168,90,100);
        const r2=place(doc,'R2','resistor',312,360,90,100);
        const r3=place(doc,'R3','resistor',600,168,90,100);
        const r4=place(doc,'R4','resistor',600,360,90,200);
        const r5=place(doc,'R5','resistor',456,264,0,100);
        D.wire(doc,v1.terminals[0],na.id);
        D.wire(doc,v1.terminals[1],n0.id);
        D.wire(doc,r1.terminals[0],na.id);
        D.wire(doc,r1.terminals[1],nc.id);
        D.wire(doc,r2.terminals[0],nc.id);
        D.wire(doc,r2.terminals[1],n0.id);
        D.wire(doc,r3.terminals[0],na.id);
        D.wire(doc,r3.terminals[1],nd.id);
        D.wire(doc,r4.terminals[0],nd.id);
        D.wire(doc,r4.terminals[1],n0.id);
        D.wire(doc,r5.terminals[0],nc.id);
        D.wire(doc,r5.terminals[1],nd.id);
        doc.referenceEndpoints=[n0.id];
        return doc;
    }
    const presets={
        ohm:{name:'Ohm’s law & switch',question:'Toggle S1 or double R1 to see how resistance controls current around the loop.',make:makeOhm,customLayout:true},
        series:{name:'Series · voltage divider',question:'Both resistors carry the same 40 mA current. Notice how the 12 V divides in proportion to resistance.',make:makeSeries,customLayout:true},
        parallel:{name:'Parallel · current split',question:'Equal 12 V across each branch, unequal branch currents. Check KCL at the top junction.',make:makeParallel,customLayout:true},
        currentDivider:{name:'Current source · parallel divider',question:'I1 injects 30 mA into the top node: 20 mA flows through 100 Ω and 10 mA through 200 Ω (inverse to resistance).',make:makeCurrentDivider,customLayout:true},
        mixed:{name:'Mixed series-parallel network',question:'R2 and R3 share voltage in parallel while R1 carries their combined current in series.',make:makeMixed,customLayout:true},
        bridge:{name:'Wheatstone bridge network',question:'An unbalanced bridge is not a simple series/parallel tree. Change R4 to 100 Ω to balance the bridge and zero the current in R5.',make:makeBridge,customLayout:true},
        rc:{name:'RC · charge & discharge',question:'Press Run to charge C1 through S1 & R1. Then open S1 and close S2 to discharge C1 through R2.',make:makeRCChargeDischarge,customLayout:true},
        rcLamp:{name:'RC · capacitor lamp flash & fade',question:'Press Run to charge C1 to 12 V. Then open S1 and close S2 to discharge C1 through lamp L1 and watch its glow fade.',make:makeRCLamp,customLayout:true},
        ladder:{name:'Two-capacitor RC ladder',question:'Press Run to charge C1 and C2 through the two-stage ladder. Open S1 and close S2 to discharge both capacitors.',make:makeRCLadder,customLayout:true},
        halfWave:{name:'Half-wave rectifier',question:'Press Run: D1 conducts on positive AC half-cycles (dropping 0.7 V) and blocks negative half-cycles.',make:makeHalfWave,customLayout:true},
        fullWaveBridge:{name:'Full-wave bridge rectifier',question:'Press Run: D1 & D4 conduct on positive half-cycles and D2 & D3 on negative half-cycles, so R1 always receives positive current.',make:makeFullWaveBridge,customLayout:true},
        transformerStepUp:{name:'AC transformer · 1:5 step-up',question:'Press Run: 10 Vp AC on the primary is stepped up to 50 Vp across R1 on the isolated secondary.',make:makeTransformerStepUp,customLayout:true},
        transform:{name:'Thévenin ↔ Norton',question:'Select V1 and transform it with R1. R2 must still receive 8 V and 40 mA.',make:()=>fixture([['V1','voltage','s','0',12],['R1','resistor','s','a',100],['R2','resistor','a','0',200]],{s:{x:144,y:120},a:{x:576,y:120},'0':{x:576,y:408}}),hidden:true},
        transformRC:{name:'Source transformation · RC load',question:'Transform V1 with R1 while paused. C1 keeps its voltage and the external transient stays equivalent.',make:()=>fixture([['V1','voltage','s','0',12],['R1','resistor','s','a',100],['R2','resistor','a','b',200],['C1','capacitor','b','0',.001]],{s:{x:120,y:120},a:{x:408,y:120},b:{x:720,y:120},'0':{x:720,y:408}}),hidden:true},
        ramp:{name:'Current source · capacitor ramp',question:'A constant current produces dV/dt = I/C.',make:()=>fixture([['I1','current','0','a',.001],['C1','capacitor','a','0',.001]],{a:{x:408,y:120},'0':{x:408,y:408}}),hidden:true},
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

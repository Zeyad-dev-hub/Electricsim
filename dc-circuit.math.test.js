'use strict';
const assert=require('node:assert/strict');
const D=require('./dc-circuit-solver.js');require('./dc-circuit-editor.js');require('./dc-circuit-presets.js');
let count=0,seed=0x125dc;
function random(){seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;}
function near(actual,expected,tolerance=1e-9){assert.ok(Number.isFinite(actual),`Nonfinite value: ${actual}`);assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1,Math.abs(expected)),`${actual} ≠ ${expected}`);}
function test(name,fn){fn();count++;console.log('PASS '+name);}
function orthogonal(path){for(let i=1;i<path.length;i++)assert.ok(Math.abs(path[i].x-path[i-1].x)<1e-7||Math.abs(path[i].y-path[i-1].y)<1e-7,'Diagonal wire segment');}
function conservation(c,s){
    const currents=new Map(c.nets.map(n=>[n.id,0]));let power=0,scale=0;
    for(const component of c.components){const r=s.componentResults[component.id];assert.ok(Number.isFinite(r.current));currents.set(component.a,currents.get(component.a)+r.current);currents.set(component.b,currents.get(component.b)-r.current);power+=r.voltage*r.current;scale+=Math.abs(r.voltage*r.current);if(component.type==='resistor')near(r.voltage,component.value*r.current,1e-8);}
    for(const value of currents.values())near(value,0,1e-8);
    assert.ok(Math.abs(power)<=1e-8*Math.max(1,scale),'Power is not conserved');
}
function advance(c,s,target){let guard=0;while(s.time<target-1e-10){s=D.advanceTransient(c,s,target,{maxAttempts:1000});assert.ok(++guard<1000,'Transient failed to finish');}return s;}

test('200 generated routes and moved/rotated terminals contain no diagonal segments',()=>{
    for(let i=0;i<200;i++){
        const doc=D.blank(),a=D.component('voltage',random()*700-350,random()*500-250,'V'),b=D.component('resistor',random()*700-350,random()*500-250,'R');a.rotation=(i%4)*90;b.rotation=((i+1)%4)*90;doc.components.push(a,b);
        const w=D.wire(doc,a.terminals[i%2],b.terminals[(i+1)%2],i%3?[{x:random()*500,y:random()*400}]:[]);
        for(let move=0;move<2;move++){const path=D.wireRoute(doc,w);orthogonal(path);const ends=D.endpoints(doc);near(path[0].x,ends.get(w.fromEndpoint).x);near(path[0].y,ends.get(w.fromEndpoint).y);near(path.at(-1).x,ends.get(w.toEndpoint).x);near(path.at(-1).y,ends.get(w.toEndpoint).y);a.position.x+=37;b.position.y-=83;a.rotation+=90;}
    }
});
test('preview and committed diagonal connections use the same obstacle-aware route',()=>{
    for(const vertical of [false,true]){const doc=D.blank(),v=D.component('voltage',0,0,'V');v.rotation=vertical?90:0;doc.components.push(v);const start=D.endpoints(doc).get(v.terminals[0]),pointer={x:177,y:93},preview=D.connectionPath(doc,start,pointer),clicked=D.connectClick(doc,v.terminals[0],pointer);const w=doc.wires.find(w=>w.toEndpoint===clicked.id);assert.deepEqual(D.wireRoute(doc,w).map(p=>({x:p.x,y:p.y})),preview.map(p=>({x:p.x,y:p.y})));orthogonal(preview);}
});
test('clicking an automatic elbow splits it without changing its original path',()=>{
    const doc=D.blank();doc.junctions.push({id:'a',position:{x:0,y:0}},{id:'b',position:{x:137,y:89}});D.wire(doc,'a','b');const old=D.wireRoute(doc,doc.wires[0]).map(p=>({x:p.x,y:p.y}));assert.deepEqual(old,[{x:0,y:0},{x:137,y:0},{x:137,y:89}]);D.wireClick(doc,{x:137,y:0});assert.equal(doc.wires.length,2);for(const w of doc.wires)orthogonal(D.wireRoute(doc,w));assert.equal(D.compileCircuit(doc).nets.length,1);
});
test('junction insertion and undo/redo restore topology atomically',()=>{
    const doc=D.blank();doc.junctions.push({id:'a',position:{x:0,y:0}},{id:'b',position:{x:120,y:0}});D.wire(doc,'a','b');const history=new D.History(doc),next=D.clone(doc);D.connectClick(next,null,{x:60,y:0});history.commit(next);assert.equal(history.doc.wires.length,2);assert.equal(history.doc.junctions.length,3);history.undo();assert.deepEqual(history.doc,doc);history.redo();assert.equal(history.doc.wires.length,2);assert.equal(D.compileCircuit(history.doc).nets.length,1);
});
test('60 random series dividers match Ohm’s law, KVL, KCL and power balance',()=>{
    for(let k=0;k<60;k++){const voltage=(random()-.5)*100,resistances=Array.from({length:2+k%5},()=>10+random()*10000),defs=[['V','voltage','n0','0',voltage]];resistances.forEach((r,i)=>defs.push(['R'+i,'resistor','n'+i,i===resistances.length-1?'0':'n'+(i+1),r]));const c=D.compileCircuit(D.fixture(defs)),s=D.solveDC(c),current=voltage/resistances.reduce((a,b)=>a+b,0);let drops=0;resistances.forEach((r,i)=>{near(s.componentResults['R'+i].current,current);near(s.componentResults['R'+i].voltage,r*current);drops+=s.componentResults['R'+i].voltage;});near(drops,voltage);conservation(c,s);}
});
test('60 random parallel networks match conductance sums and source current',()=>{
    for(let k=0;k<60;k++){const voltage=(random()-.5)*80,rs=Array.from({length:2+k%6},()=>5+random()*20000),c=D.compileCircuit(D.fixture([['V','voltage','a','0',voltage],...rs.map((r,i)=>['R'+i,'resistor','a','0',r])])),s=D.solveDC(c);near(-s.componentResults.V.current,voltage*rs.reduce((g,r)=>g+1/r,0));rs.forEach((r,i)=>near(s.componentResults['R'+i].current,voltage/r));conservation(c,s);}
});
test('40 manufactured meshes recover independently prescribed node potentials',()=>{
    for(let trial=0;trial<40;trial++){
        const size=4+trial%4,volts=Array.from({length:size},(_,i)=>i?(random()-.5)*30:0),injection=Array(size).fill(0),defs=[];
        for(let a=0;a<size;a++)for(let b=a+1;b<size;b++)if(b===a+1||random()<.5){const resistance=20+random()*5000;defs.push(['R'+a+'_'+b,'resistor',String(a),String(b),resistance]);const i=(volts[a]-volts[b])/resistance;injection[a]+=i;injection[b]-=i;}
        for(let a=1;a<size;a++)defs.push(['I'+a,'current',String(a),'0',-injection[a]]);
        const c=D.compileCircuit(D.fixture(defs)),s=D.solveDC(c);
        for(let a=0;a<size;a++)near(s.nodeVoltages[c.netOf.get('node-'+a)].value,volts[a],1e-8);
        conservation(c,s);
    }
});
test('multiple-source superposition agrees for every resistor and source current',()=>{
    const base=[['V1','voltage','a','0',12],['V2','voltage','b','0',-3],['I','current','c','0',.025],['R1','resistor','a','c',150],['R2','resistor','b','c',330],['R3','resistor','c','0',470]];
    const full=D.solveDC(D.compileCircuit(D.fixture(base))),parts=['V1','V2','I'].map(active=>D.solveDC(D.compileCircuit(D.fixture(base.map(row=>['voltage','current'].includes(row[1])&&row[0]!==active?[...row.slice(0,4),0]:row)))));
    for(const row of base){near(full.componentResults[row[0]].voltage,parts.reduce((v,s)=>v+s.componentResults[row[0]].voltage,0));near(full.componentResults[row[0]].current,parts.reduce((v,s)=>v+s.componentResults[row[0]].current,0));}
});
test('resistance and voltage scaling produce the expected linear response',()=>{
    const doc=D.makePreset('bridge'),c=D.compileCircuit(doc),original=D.solveDC(c);
    for(const factor of [.1,10,1000]){const next=D.clone(doc);next.components.filter(c=>c.type==='resistor').forEach(c=>c.value*=factor);const s=D.solveDC(D.compileCircuit(next));for(const comp of c.components){near(s.componentResults[comp.id].voltage,original.componentResults[comp.id].voltage);near(s.componentResults[comp.id].current,original.componentResults[comp.id].current/factor);}}
    for(const factor of [-2,.01,10]){const next=D.clone(doc);next.components.filter(c=>c.type==='voltage').forEach(c=>c.value*=factor);const s=D.solveDC(D.compileCircuit(next));for(const comp of c.components){near(s.componentResults[comp.id].voltage,original.componentResults[comp.id].voltage*factor);near(s.componentResults[comp.id].current,original.componentResults[comp.id].current*factor);}}
});
test('reordering, reversing wire endpoints, moving and rotating parts do not alter physics',()=>{
    const doc=D.makePreset('bridge'),original=D.solveDC(D.compileCircuit(doc)),next=D.clone(doc);next.components.reverse().forEach(c=>{c.rotation+=90;c.position.x+=73;c.position.y-=45;});next.junctions.reverse();next.wires.reverse().forEach(w=>{[w.fromEndpoint,w.toEndpoint]=[w.toEndpoint,w.fromEndpoint];w.waypoints.reverse();});const c=D.compileCircuit(next),s=D.solveDC(c);for(const comp of c.components){near(s.componentResults[comp.id].voltage,original.componentResults[comp.id].voltage);near(s.componentResults[comp.id].current,original.componentResults[comp.id].current);}conservation(c,s);for(const w of next.wires)orthogonal(D.wireRoute(next,w));
});
test('splitting every wire in a circuit preserves component readings and Kirchhoff balance',()=>{
    const doc=D.makePreset('series'),original=D.solveDC(D.compileCircuit(doc));for(const w of doc.wires.slice()){const path=D.wireRoute(doc,w),a=path[0],b=path[1];if(Math.hypot(a.x-b.x,a.y-b.y)>1e-7)D.wireClick(doc,{x:(a.x+b.x)/2,y:(a.y+b.y)/2},1e-7);}const c=D.compileCircuit(doc),s=D.solveDC(c);for(const comp of c.components){near(s.componentResults[comp.id].voltage,original.componentResults[comp.id].voltage);near(s.componentResults[comp.id].current,original.componentResults[comp.id].current);}conservation(c,s);for(const w of doc.wires)orthogonal(D.wireRoute(doc,w));
});
test('RC charging follows the analytical curve across five orders of time constants',()=>{
    for(const tau of [.0001,.01,1,10]){const resistance=1000,capacitance=tau/resistance,c=D.compileCircuit(D.fixture([['V','voltage','a','0',7],['R','resistor','a','b',resistance],['C','capacitor','b','0',capacitance]]));let state=D.initializeTransient(c);for(const fraction of [.25,1,3]){state=advance(c,state,tau*fraction);near(state.capacitorVoltagesById.C,7*(1-Math.exp(-fraction)),.001);near(state.acceptedSolution.componentResults.R.current,7/resistance*Math.exp(-fraction),1e-5);conservation(c,state.acceptedSolution);}}
});
test('unequal series capacitors match equivalent capacitance and equal plate charge',()=>{
    const r=200,c1=.002,c2=.003,equivalent=c1*c2/(c1+c2),c=D.compileCircuit(D.fixture([['V','voltage','a','0',10],['R','resistor','a','b',r],['C1','capacitor','b','d',c1],['C2','capacitor','d','0',c2]])),state=advance(c,D.initializeTransient(c),r*equivalent),s=state.acceptedSolution;near(s.componentResults.C1.voltage,10*(1-Math.exp(-1))*c2/(c1+c2),.001);near(s.componentResults.C2.voltage,10*(1-Math.exp(-1))*c1/(c1+c2),.001);near(s.componentResults.C1.charge,s.componentResults.C2.charge,1e-8);near(s.componentResults.C1.current,s.componentResults.C2.current,1e-8);conservation(c,s);
});
console.log(`\n${count} extended mathematical checks passed (360 generated cases plus targeted invariants).`);

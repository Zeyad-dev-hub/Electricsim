'use strict';
const assert=require('node:assert/strict');
const D=require('./dc-circuit-simulation.js');require('./dc-circuit-editor.js');require('./dc-circuit-presets.js');
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const near=(a,b,tol=1e-8)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),`${a} != ${b}`);
function advance(sim,time){while(sim.state.time<time-1e-10)sim.advance(time,{maxAttempts:1000});}
const rc=()=>D.fixture([['V','voltage','s','0',10],['R','resistor','s','a',1000],['C','capacitor','a','0',.001]]);
test('geometry commit, undo and redo preserve time, charge and accepted solution',()=>{
 const sim=new D.Simulation(rc());advance(sim,1);const state=sim.state,next=D.clone(sim.doc);next.components[0].position.x+=24;next.components[0].rotation+=90;
 assert.equal(sim.commit(next),false);assert.equal(sim.state,state);assert.equal(sim.undo(),false);assert.equal(sim.state,state);assert.equal(sim.undo(true),false);assert.equal(sim.state,state);
});
test('invalid edit and repair retain a charged capacitor and physical time',()=>{
 const sim=new D.Simulation(rc());advance(sim,1);const voltage=sim.state.capacitorVoltagesById.C,time=sim.state.time,next=D.clone(sim.doc);D.wire(next,'node-a','node-0');sim.commit(next);
 assert.ok(sim.error);assert.equal(sim.state,null);near(sim.retained.capacitorVoltagesById.C,voltage);sim.undo();assert.equal(sim.error,null);near(sim.state.capacitorVoltagesById.C,voltage);near(sim.state.time,time);
});
test('resistance and capacitance edits retain voltage; explicit reset restores initial state',()=>{
 const sim=new D.Simulation(rc());advance(sim,1);const voltage=sim.state.capacitorVoltagesById.C,next=D.clone(sim.doc);next.components.find(c=>c.id==='R').value=2000;next.components.find(c=>c.id==='C').value=.002;sim.commit(next);
 near(sim.state.capacitorVoltagesById.C,voltage);near(sim.state.acceptedSolution.componentResults.C.charge,voltage*.002);sim.reset();near(sim.state.time,0);near(sim.state.capacitorVoltagesById.C,0);
});
test('resistor-only simulation has a clock without repeated solves',()=>{
 const sim=new D.Simulation(D.makePreset('series')),solution=sim.state.acceptedSolution;sim.advance(2);near(sim.state.time,2);assert.equal(sim.state.acceptedSolution,solution);
});
test('ground changes origin without changing component measurements',()=>{
 const doc=D.makePreset('series');doc.referenceEndpoints=[];const before=D.solveDC(D.compileCircuit(doc));doc.referenceEndpoints=['node-b'];const compiled=D.compileCircuit(doc),after=D.solveDC(compiled);
 near(after.nodeVoltages[compiled.netOf.get('node-b')].value,0);for(const c of doc.components){near(after.componentResults[c.id].voltage,before.componentResults[c.id].voltage);near(after.componentResults[c.id].current,before.componentResults[c.id].current);}
});
test('redundant ground creates no false ideal-wire loop',()=>{
 const doc=D.makePreset('series');doc.referenceEndpoints.push('V1:b','node-0');const compiled=D.compileCircuit(doc),solution=D.solveDC(compiled);assert.equal(compiled.links.filter(l=>l.type==='reference').length,0);assert.ok(Object.values(solution.wireResults).every(w=>Number.isFinite(w.current)));
});
test('ground links separate nets and detects a battery short',()=>{
 const doc=D.makePreset('series');doc.referenceEndpoints.push('node-a');assert.throws(()=>D.solveDC(D.compileCircuit(doc)),/incompatible/);
});
test('ground attachment and removal retain capacitor state',()=>{
 const sim=new D.Simulation(rc());advance(sim,1);const v=sim.state.capacitorVoltagesById.C,next=D.clone(sim.doc);next.referenceEndpoints=['node-a'];sim.commit(next);near(sim.state.capacitorVoltagesById.C,v);sim.undo();near(sim.state.capacitorVoltagesById.C,v);
});
test('grounded junction deletion cleans references and probes; history restores them',()=>{
 const doc=D.makePreset('series');doc.probes.push({id:'probe',kind:'voltage',endpoints:['node-0','node-a']});const history=new D.History(doc),next=D.clone(doc);D.removeJunction(next,'node-0');assert.deepEqual(D.validateDocument(next),[]);assert.equal(next.referenceEndpoints.length,0);assert.equal(next.probes.length,0);history.commit(next);history.undo();assert.deepEqual(history.doc,doc);
});
test('wire cycle edges are indeterminate while bridge feeds retain exact current',()=>{
 const doc=D.makePreset('series');doc.junctions.push({id:'x',position:{x:0,y:0}},{id:'y',position:{x:24,y:0}});const cycle=[D.wire(doc,'node-a','x'),D.wire(doc,'x','y'),D.wire(doc,'y','node-a')];const solution=D.solveDC(D.compileCircuit(doc));cycle.forEach(w=>assert.equal(solution.wireResults[w.id].current,null));const feed=doc.wires.find(w=>w.fromEndpoint==='R1:a');near(solution.wireResults[feed.id].current,-.04);
});
test('parallel wire edges and self loops do not poison bridge current',()=>{
 const doc=D.makePreset('series');D.wire(doc,'node-a','V1:a');const self=D.wire(doc,'node-a','node-a'),s=D.solveDC(D.compileCircuit(doc));assert.equal(s.wireResults[self.id].current,null);near(s.wireResults[doc.wires.find(w=>w.fromEndpoint==='R1:a').id].current,-.04);
});
test('linear current motion gives equal spatial speed on unequal route lengths and exact ratios',()=>{
 const motion=new D.CurrentMotion();motion.advance({wireResults:{a:{current:.01},b:{current:.01},c:{current:.005}}},.1);
 const short=D.pathMetrics([{x:0,y:0},{x:100,y:0}]),long=D.pathMetrics([{x:0,y:0},{x:400,y:0}]);near(D.pointAtDistance(short,motion.distance('a')).x,6);near(D.pointAtDistance(long,motion.distance('b')).x,6);near(motion.distance('a'),2*motion.distance('c'));
});
test('decaying positive current never reverses integrated motion',()=>{
 const m=new D.CurrentMotion();let distance=0;for(let t=0;t<12;t+=.01){m.advance({wireResults:{w:{current:.01*Math.exp(-t)}}},.01);assert.ok(m.distance('w')>distance);distance=m.distance('w');}
});
test('current edits change velocity without resetting distance, zero freezes and reversal works',()=>{
 const m=new D.CurrentMotion();m.advance({wireResults:{w:{current:.01}}},1);near(m.distance('w'),60);m.advance({wireResults:{w:{current:.02}}},.1);near(m.distance('w'),72);m.advance({wireResults:{w:{current:0}}},1);near(m.distance('w'),72);m.advance({wireResults:{w:{current:-.01}}},.1);near(m.distance('w'),66);
});
test('motion clipping is explicit and auto scale remains fixed during decay',()=>{
 const m=new D.CurrentMotion();m.calibrate({componentResults:{r:{current:.03}}});near(m.reference,.1);m.advance({wireResults:{w:{current:1}}},1);assert.ok(m.clipped);near(m.distance('w'),240);near(m.reference,.1);
});
test('accepted-time motion is frame-rate independent',()=>{
 const one=new D.CurrentMotion(),many=new D.CurrentMotion(),solution={wireResults:{w:{current:.01}}};one.advance(solution,1);for(let i=0;i<60;i++)many.advance(solution,1/60);near(one.distance('w'),many.distance('w'));
});
test('below-resolution, zero and unavailable readings are distinct',()=>{
 assert.equal(D.reading(5e-8,'A'),'<1 µA');assert.equal(D.reading(-5e-8,'A'),'−<1 µA');assert.equal(D.reading(0,'A'),'0 A');assert.equal(D.reading(null,'A'),'—');
});
test('malformed nested records return validation errors rather than throwing',()=>{
 for(const field of ['components','junctions','wires','probes']){const doc=D.blank();doc[field]=[null];assert.ok(D.validateDocument(doc).length);}
});
test('time budget preserves backlog and accepted state remains immutable',()=>{
 const c=D.compileCircuit(rc()),state=D.initializeTransient(c),saved=D.clone(state);let clock=0;const next=D.advanceTransient(c,state,1,{budgetMs:1,now:()=>clock++});assert.ok(next.behind);assert.ok(next.time<1);assert.deepEqual(state,saved);let s=next;while(s.behind)s=D.advanceTransient(c,s,1,{maxAttempts:1000});near(s.time,1);
});
test('initial and advanced closed switch power and KCL are consistent',()=>{
 const doc=D.makePreset('rc'),c=D.compileCircuit(doc),s=D.initializeTransient(c);near(s.acceptedSolution.componentResults.S1.power,0);assert.ok(s.acceptedSolution.residuals.kcl<1e-7);const next=D.advanceTransient(c,s,.01);near(next.acceptedSolution.componentResults.S1.power,0);
});
test('snap previews target existing endpoints and grid points without mutating circuit',()=>{
 const doc=D.makePreset('series'),before=D.clone(doc),p=D.terminalPosition(doc.components[0],0),target=D.snapTarget(doc,{x:p.x+2,y:p.y+3});assert.equal(target.id,doc.components[0].terminals[0]);assert.deepEqual(D.snapTarget(D.blank(),{x:29,y:45}).point,{x:24,y:48});assert.deepEqual(doc,before);
});
test('splitting a moving wire preserves its marker phase on each child route',()=>{
 const doc=D.blank();doc.junctions.push({id:'a',position:{x:0,y:0}},{id:'b',position:{x:120,y:0}});const wire=D.wire(doc,'a','b'),motion=new D.CurrentMotion();motion.advance({wireResults:{[wire.id]:{current:.01}}},.1);const next=D.clone(doc);D.wireClick(next,{x:48,y:0});motion.reconcile(doc,next);
 const first=next.wires.find(w=>w.fromEndpoint==='a'),second=next.wires.find(w=>w.toEndpoint==='b');near(motion.distance(first.id),6);near(motion.distance(second.id),-42);near(D.wrap(motion.distance(second.id),24),6);
});
test('automatic routes avoid an intervening symbol and terminal exits point outward',()=>{
 const doc=D.blank(),a=D.component('voltage',0,0,'V'),b=D.component('resistor',240,0,'R');doc.components.push(a,b);const w=D.wire(doc,a.terminals[1],b.terminals[1]),path=D.wireRoute(doc,w);assert.ok(path[1].x>60);
 for(let i=1;i<path.length;i++){const p=path[i-1],q=path[i];if(p.y===q.y&&Math.abs(p.y)<25)assert.ok(Math.max(p.x,q.x)<=198||Math.min(p.x,q.x)>=282,'Route crosses resistor body');}
});
test('splitting a terminal exit close to the port preserves the exact segment',()=>{
 const doc=D.blank(),a=D.component('voltage',0,0,'V');doc.components.push(a);doc.junctions.push({id:'b',position:{x:-180,y:0}});D.wire(doc,a.terminals[0],'b');D.wireClick(doc,{x:-72,y:0},1);const w=doc.wires.find(w=>w.fromEndpoint===a.terminals[0]);const path=D.wireRoute(doc,w);assert.ok(path.every(p=>p.x>=-72&&p.x<=-60));
});
console.log(`\n${count} improvement checks passed.`);

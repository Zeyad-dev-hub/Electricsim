(function(root){
    'use strict';
    const D=root.DCCircuit||(root.DCCircuit={});
    const clone=value=>JSON.parse(JSON.stringify(value));
    const TYPES=['resistor','lamp','capacitor','voltage','current','switch','diode','ac','transformer'];
    const PREFIX={resistor:'R',lamp:'L',capacitor:'C',voltage:'V',current:'I',switch:'S',diode:'D',ac:'AC',transformer:'T'};
    const TERMINAL_NAMES={transformer:['P1','P2','S1','S2']};
    const terminalName=(c,i)=>TERMINAL_NAMES[c.type]?.[i]||(i?'B':'A');
    const defaults={resistor:1000,lamp:100,capacitor:.001,voltage:9,current:.01,switch:0,diode:.7,ac:10,transformer:0};
    let serial=0;
    const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${++serial}`;
    function blank(){return {schemaVersion:1,components:[],junctions:[],wires:[],referenceEndpoints:[],probes:[],view:{panX:0,panY:0,zoom:1}};}
    function component(type,x,y,label){
        const id=uid(type);
        const c={id,type,label:label||`${PREFIX[type]}${serial}`,terminals:type==='transformer'?['p1','p2','s1','s2'].map(s=>`${id}:${s}`):[`${id}:a`,`${id}:b`],value:defaults[type],position:{x,y},rotation:0};
        if(type==='capacitor')c.initialVoltage=0;
        if(type==='switch')c.closed=false;
        if(type==='ac'){c.frequency=1;c.phase=0;}
        if(type==='transformer'){c.turnsPrimary=null;c.turnsSecondary=null;}
        return c;
    }
    // Transformers have four terminals: P1/P2 on the left, S1/S2 on the right.
    function terminalPosition(c,index){const angle=(c.rotation||0)*Math.PI/180,four=c.type==='transformer',lx=four?(index<2?-60:60):(index?60:-60),ly=four?(index%2?30:-30):0;return {x:c.position.x+lx*Math.cos(angle)-ly*Math.sin(angle),y:c.position.y+lx*Math.sin(angle)+ly*Math.cos(angle)};}
    function endpoints(doc){const out=new Map(doc.junctions.map(j=>[j.id,{...j.position,id:j.id,kind:'junction'}]));for(const c of doc.components)c.terminals.forEach((id,i)=>out.set(id,{...terminalPosition(c,i),id,kind:'terminal',componentId:c.id,index:i}));return out;}
    const allowed={resistor:['id','type','label','terminals','value','position','rotation'],capacitor:['id','type','label','terminals','value','position','rotation','initialVoltage'],voltage:['id','type','label','terminals','value','position','rotation'],current:['id','type','label','terminals','value','position','rotation'],switch:['id','type','label','terminals','value','position','rotation','closed']};
    allowed.lamp=allowed.resistor;allowed.diode=allowed.resistor;
    allowed.ac=[...allowed.voltage,'frequency','phase'];allowed.transformer=[...allowed.resistor,'turnsPrimary','turnsSecondary'];
    const turnsValid=n=>n===null||(Number.isInteger(n)&&n>=1&&n<=100000);
    // A fixed-resistance teaching model; 1 W is the visual full-glow reference.
    function lampBrightness(result){return Number.isFinite(result?.power)?Math.min(1,Math.max(0,result.power)):0;}
    function validateDocument(doc){
        const errors=[],fail=message=>errors.push(message),point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
        if(!doc||doc.schemaVersion!==1||!['components','junctions','wires','referenceEndpoints','probes'].every(k=>Array.isArray(doc[k])))return ['Invalid circuit document or schema version.'];
        if(Object.keys(doc).some(k=>!['schemaVersion','components','junctions','wires','referenceEndpoints','probes','view'].includes(k)))fail('Unknown document field.');
        if(doc.components.length>100)fail('This lab supports up to 100 components.');
        if(doc.junctions.length>1000||doc.wires.length>2000)fail('This lab supports up to 1000 junctions and 2000 wires.');
        const ids=new Set(),ends=new Set();
        const unique=id=>{if(typeof id!=='string'||!id||ids.has(id))fail('Missing or duplicate ID.');ids.add(id);};
        for(const c of doc.components){
            if(!c||typeof c!=='object'){fail('Invalid component.');continue;}
            unique(c.id);
            if(!TYPES.includes(c.type)){fail('Unknown component type.');continue;}
            if(Object.keys(c).some(k=>!allowed[c.type].includes(k)))fail(`Unknown field on ${c.label||c.id}.`);
            if(typeof c.label!=='string'||c.label.length>50||!point(c.position)||!Number.isFinite(c.rotation)||!Number.isFinite(c.value))fail(`Invalid values on ${c.id}.`);
            if(['resistor','lamp','capacitor'].includes(c.type)&&c.value<=0)fail(`${c.label}: value must be positive.`);
            if(c.type==='capacitor'&&!Number.isFinite(c.initialVoltage))fail(`${c.label}: invalid initial voltage.`);
            if(c.type==='switch'&&typeof c.closed!=='boolean')fail(`${c.label}: invalid switch state.`);
            if(c.type==='ac'&&(!Number.isFinite(c.frequency)||c.frequency<=0||c.frequency>1000||!Number.isFinite(c.phase)))fail(`${c.label}: frequency must be above 0 and at most 1000 Hz.`);
            if(c.type==='transformer'&&(!turnsValid(c.turnsPrimary)||!turnsValid(c.turnsSecondary)))fail(`${c.label}: turns must be whole numbers from 1 to 100000.`);
            const terminalCount=c.type==='transformer'?4:2;
            if(!Array.isArray(c.terminals)||c.terminals.length!==terminalCount)fail(terminalCount===2?'Each component requires two terminals.':`${c.label}: a transformer requires four terminals.`);
            else for(const id of c.terminals){unique(id);ends.add(id);}
        }
        for(const j of doc.junctions){if(!j||typeof j!=='object'){fail('Invalid junction.');continue;}unique(j.id);ends.add(j.id);if(!point(j.position)||Object.keys(j).some(k=>!['id','position'].includes(k)))fail('Invalid junction.');}
        for(const w of doc.wires){if(!w||typeof w!=='object'){fail('Invalid wire.');continue;}unique(w.id);if(!ends.has(w.fromEndpoint)||!ends.has(w.toEndpoint)||!Array.isArray(w.waypoints)||w.waypoints.length>200||!w.waypoints.every(point)||Object.keys(w).some(k=>!['id','fromEndpoint','toEndpoint','waypoints'].includes(k)))fail('Invalid wire or endpoint.');}
        for(const id of doc.referenceEndpoints)if(!ends.has(id))fail('Invalid reference endpoint.');
        for(const p of doc.probes){if(!p||typeof p!=='object'){fail('Invalid voltage probe.');continue;}unique(p.id);if(p.kind!=='voltage'||!Array.isArray(p.endpoints)||p.endpoints.length!==2||p.endpoints.some(id=>!ends.has(id))||Object.keys(p).some(k=>!['id','kind','endpoints'].includes(k)))fail('Invalid voltage probe.');}
        if(!doc.view||!Number.isFinite(doc.view.zoom)||doc.view.zoom<=0||!Number.isFinite(doc.view.panX)||!Number.isFinite(doc.view.panY))fail('Invalid view.');
        return errors;
    }
    class History{
        constructor(doc){this.doc=clone(doc);this.undoStack=[];this.redoStack=[];}
        commit(next){const errors=validateDocument(next);if(errors.length)throw new Error(errors.join(' '));this.undoStack.push(clone(this.doc));if(this.undoStack.length>80)this.undoStack.shift();this.doc=clone(next);this.redoStack=[];}
        undo(){if(!this.undoStack.length)return false;this.redoStack.push(clone(this.doc));this.doc=this.undoStack.pop();return true;}
        redo(){if(!this.redoStack.length)return false;this.undoStack.push(clone(this.doc));this.doc=this.redoStack.pop();return true;}
    }
    function wire(doc,a,b,waypoints=[]){const w={id:uid('wire'),fromEndpoint:a,toEndpoint:b,waypoints};doc.wires.push(w);return w;}
    function removeEndpoints(doc,ids){const removed=new Set(ids);doc.wires=doc.wires.filter(w=>!removed.has(w.fromEndpoint)&&!removed.has(w.toEndpoint));doc.referenceEndpoints=doc.referenceEndpoints.filter(id=>!removed.has(id));doc.probes=doc.probes.filter(p=>!p.endpoints.some(id=>removed.has(id)));}
    function removeComponent(doc,id){const c=doc.components.find(c=>c.id===id);if(!c)return;doc.components=doc.components.filter(c=>c.id!==id);removeEndpoints(doc,c.terminals);}
    function removeJunction(doc,id){doc.junctions=doc.junctions.filter(j=>j.id!==id);removeEndpoints(doc,[id]);}
    function reading(value,unit){
        if(unit==='A'&&Number.isFinite(value)&&Math.abs(value)>=1e-14&&Math.abs(value)<1e-6)return `${value<0?'−':''}<1 µA`;
        return format(value,unit);
    }
    // Display thresholds only: never round the values used by the circuit solver.
    function format(value,unit=''){
        if(value===null||value===undefined||!Number.isFinite(value))return '—';
        const a=Math.abs(value),minimum=unit==='A'?1e-6:1e-9;
        if(value===0||a<minimum){
            if(unit==='F'&&a>0)return '<1 nF';
            return `0 ${unit}`.trim();
        }
        const powers=[[1e9,'G'],[1e6,'M'],[1e3,'k'],[1,''],[1e-3,'m'],[1e-6,'µ'],[1e-9,'n']];
        let [scale,prefix]=powers.find(([s])=>a>=s);
        let number=Number((value/scale).toPrecision(3));
        // Rounding 999.9 µA should produce 1 mA, not an awkward 1000 µA.
        if(Math.abs(number)>=1000&&scale<1e9){[scale,prefix]=powers[powers.findIndex(([s])=>s===scale)-1];number=Number((value/scale).toPrecision(3));}
        return `${number} ${prefix}${unit}`.trim();
    }
    Object.assign(D,{clone,TYPES,PREFIX,terminalName,uid,blank,component,terminalPosition,endpoints,validateDocument,History,wire,removeComponent,removeJunction,reading,format,lampBrightness});
    if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);

(function(root){
    'use strict';const D=typeof module!=='undefined'?require('./dc-circuit-solver.js'):root.DCCircuit;
    function resistorGraph(compiled,selectedIds=[]){return compiled.components.filter(c=>c.type==='resistor'&&(!selectedIds.length||selectedIds.includes(c.id))).map(c=>({id:c.id,label:c.label,a:c.a,b:c.b,value:c.value,children:[c.id]}));}
    function findResistorReductions(graph,protectedNodes=[]){
        const result=[],groups=new Map();for(const r of graph){const key=[r.a,r.b].sort().join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
        for(const group of groups.values())if(group.length>1)result.push({type:'parallel',ids:group.map(r=>r.id),a:group[0].a,b:group[0].b,value:1/group.reduce((s,r)=>s+1/r.value,0)});
        const nodes=[...new Set(graph.flatMap(r=>[r.a,r.b]))];for(const node of nodes){if(protectedNodes.includes(node))continue;const rs=graph.filter(r=>r.a===node||r.b===node);if(rs.length===2&&rs.every(r=>r.a!==r.b)){const a=rs[0].a===node?rs[0].b:rs[0].a,b=rs[1].a===node?rs[1].b:rs[1].a;if(a!==b)result.push({type:'series',ids:rs.map(r=>r.id),a,b,node,value:rs[0].value+rs[1].value});}}
        return result;
    }
    function reductionStep(graph,candidate){const rs=graph.filter(r=>candidate.ids.includes(r.id)),label=`(${rs.map(r=>r.label).join(candidate.type==='series'?' + ':' ∥ ')})`,r={id:D.uid('equiv'),label,a:candidate.a,b:candidate.b,value:candidate.value,children:rs.flatMap(r=>r.children)};const equation=candidate.type==='series'?`${rs.map(r=>D.format(r.value,'Ω')).join(' + ')} = ${D.format(r.value,'Ω')}`:`1 / (${rs.map(r=>`1/${D.format(r.value,'Ω')}`).join(' + ')}) = ${D.format(r.value,'Ω')}`;return {graph:[...graph.filter(r=>!candidate.ids.includes(r.id)),r],before:D.clone(graph),candidate,equation,children:r.children};}
    function equivalentResistance(graph,a,b){
        if(a===b)return 0;
        const adj=new Map();for(const r of graph){for(const id of [r.a,r.b])if(!adj.has(id))adj.set(id,[]);adj.get(r.a).push(r.b);adj.get(r.b).push(r.a);}
        const seen=new Set([a]),queue=[a];for(let i=0;i<queue.length;i++)for(const id of adj.get(queue[i])||[])if(!seen.has(id)){seen.add(id);queue.push(id);}if(!seen.has(b))return Infinity;
        const ids=[...seen].filter(id=>id!==b),index=new Map(ids.map((id,i)=>[id,i])),m=ids.map(()=>ids.map(()=>0)),rhs=ids.map(()=>0);rhs[index.get(a)]=1;
        for(const r of graph){if(!seen.has(r.a)||!seen.has(r.b))continue;const g=1/r.value;for(const [x,y,value] of [[r.a,r.a,g],[r.b,r.b,g],[r.a,r.b,-g],[r.b,r.a,-g]])if(index.has(x)&&index.has(y))m[index.get(x)][index.get(y)]+=value;}
        return D.linearSolve(m,rhs)[index.get(a)];
    }
    function capacitorAnalysis(compiled,id){
        const cap=compiled.components.find(c=>c.id===id);if(!cap)return null;
        const uf=new D.UnionFind(compiled.nets.map(n=>n.id));for(const c of compiled.components)if(c.type==='voltage')uf.join(c.a,c.b);
        const graph=resistorGraph(compiled).map(r=>({...r,a:uf.find(r.a),b:uf.find(r.b)}));
        let resistance;try{resistance=equivalentResistance(graph,uf.find(cap.a),uf.find(cap.b));}catch{return {multiple:true};}
        let final=null;try{const dc=D.solveDC(compiled);final=dc.componentResults[id].voltage;}catch{/* A current-source ramp or isolated state has no DC equilibrium. */}
        return {resistance,tau:resistance*cap.value,final,multiple:compiled.components.filter(c=>c.type==='capacitor').length>1};
    }
    function transformCandidates(compiled,sourceId){
        const source=compiled.components.find(c=>c.id===sourceId);if(!source||!['voltage','current'].includes(source.type))return [];
        const results=[];
        for(const r of compiled.components.filter(c=>c.type==='resistor'&&c.a!==c.b)){
            if(source.type==='current'&&[r.a,r.b].includes(source.a)&&[r.a,r.b].includes(source.b)){results.push({sourceId:source.id,resistorId:r.id,from:'current',to:'voltage',a:source.a,b:source.b,resistance:r.value,voltage:-source.value*r.value,current:source.value});}
            if(source.type==='voltage')for(const common of [source.a,source.b]){
                if(![r.a,r.b].includes(common))continue;
                const incident=compiled.components.filter(c=>c.type!=='switch'&&(c.a===common||c.b===common));
                const net=compiled.nets.find(n=>n.id===common);
                const probed=compiled.document.probes.some(p=>p.endpoints.some(e=>compiled.netOf.get(e)===common));
                if(incident.length!==2||net.ground||probed)continue;
                const a=r.a===common?r.b:r.a,b=source.a===common?source.b:source.a,voltage=source.a===common?source.value:-source.value;
                results.push({sourceId:source.id,resistorId:r.id,from:'voltage',to:'current',a,b,common,resistance:r.value,voltage,current:-voltage/r.value});
            }
        }
        return results;
    }
    function applySourceTransform(document,compiled,preview){
        const valid=transformCandidates(compiled,preview.sourceId).find(p=>p.resistorId===preview.resistorId&&p.a===preview.a&&p.b===preview.b);if(!valid)throw new Error('This source pair is no longer eligible.');
        const doc=D.clone(document),source=doc.components.find(c=>c.id===preview.sourceId),r=doc.components.find(c=>c.id===preview.resistorId);
        const anchor=net=>{const ends=compiled.nets.find(n=>n.id===net).endpoints;return ends.find(e=>!source.terminals.includes(e)&&!r.terminals.includes(e))||ends[0];};
        const ensureAnchor=net=>{const id=anchor(net);if(!source.terminals.includes(id)&&!r.terminals.includes(id))return id;const p=compiled.points.get(id),j={id:D.uid('node'),position:{x:p.x,y:p.y}};doc.junctions.push(j);return j.id;};
        const a=ensureAnchor(preview.a),b=ensureAnchor(preview.b);
        // Detach only the pair. Other wires at the boundary nets keep their identities.
        const removed=new Set([...source.terminals,...r.terminals]);
        const replacement=id=>{if(!removed.has(id))return id;const net=compiled.netOf.get(id);return net===preview.a?a:net===preview.b?b:null;};
        doc.wires=doc.wires.map(w=>({...w,fromEndpoint:replacement(w.fromEndpoint),toEndpoint:replacement(w.toEndpoint)})).filter(w=>w.fromEndpoint&&w.toEndpoint&&w.fromEndpoint!==w.toEndpoint);
        const wirePairs=new Set();doc.wires=doc.wires.filter(w=>{const key=[w.fromEndpoint,w.toEndpoint].sort().join('|');if(wirePairs.has(key))return false;wirePairs.add(key);return true;});
        doc.probes=doc.probes.filter(p=>!p.endpoints.some(e=>removed.has(e)));doc.referenceEndpoints=doc.referenceEndpoints.map(e=>removed.has(e)?(compiled.netOf.get(e)===preview.a?a:b):e);
        const pa=compiled.points.get(anchor(preview.a)),pb=compiled.points.get(anchor(preview.b));
        source.type=preview.to;source.value=preview.to==='current'?preview.current:preview.voltage;source.position={x:Math.min(pa.x,pb.x)-120,y:(pa.y+pb.y)/2};source.rotation=90;
        if(preview.to==='current'){
            r.position={x:source.position.x+180,y:source.position.y};r.rotation=90;
            D.wire(doc,source.terminals[0],a);D.wire(doc,source.terminals[1],b);D.wire(doc,r.terminals[0],a);D.wire(doc,r.terminals[1],b);
        }else{
            const j={id:D.uid('node'),position:{x:source.position.x,y:pa.y}};doc.junctions.push(j);r.position={x:(j.position.x+pa.x)/2,y:pa.y};r.rotation=0;
            D.wire(doc,source.terminals[0],j.id);D.wire(doc,source.terminals[1],b);D.wire(doc,r.terminals[0],j.id);D.wire(doc,r.terminals[1],a);
        }
        return doc;
    }
    Object.assign(D,{resistorGraph,findResistorReductions,reductionStep,equivalentResistance,capacitorAnalysis,transformCandidates,applySourceTransform});if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);

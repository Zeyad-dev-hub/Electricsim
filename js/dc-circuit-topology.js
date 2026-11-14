(function(root){
    'use strict';const D=typeof module!=='undefined'?require('./dc-circuit-model.js'):root.DCCircuit;
    class UnionFind{
        constructor(ids){this.parent=new Map(ids.map(id=>[id,id]));}
        find(id){let p=this.parent.get(id);if(p!==id){p=this.find(p);this.parent.set(id,p);}return p;}
        join(a,b){a=this.find(a);b=this.find(b);if(a!==b)this.parent.set(b,a);}
    }
    function compileCircuit(doc){
        const errors=D.validateDocument(doc);if(errors.length)throw new Error(errors.join(' '));
        const points=D.endpoints(doc),uf=new UnionFind([...points.keys()]);
        const links=doc.wires.map(w=>({id:w.id,a:w.fromEndpoint,b:w.toEndpoint,type:'wire'}));
        for(const c of doc.components)if(c.type==='switch'&&c.closed)links.push({id:c.id,a:c.terminals[0],b:c.terminals[1],type:'switch'});
        for(const l of links)uf.join(l.a,l.b);
        for(let i=1;i<doc.referenceEndpoints.length;i++){
            const a=doc.referenceEndpoints[0],b=doc.referenceEndpoints[i];
            // Reference symbols join separate nets, never add a redundant edge.
            if(uf.find(a)!==uf.find(b)){uf.join(a,b);links.push({id:`ground-link-${i}`,a,b,type:'reference'});}
        }
        const netIds=[...new Set([...points.keys()].map(id=>uf.find(id)))],netOf=new Map([...points.keys()].map(id=>[id,uf.find(id)]));
        const nets=netIds.map((id,i)=>({id,label:`N${i}`,endpoints:[...points.keys()].filter(e=>netOf.get(e)===id),ground:doc.referenceEndpoints.some(e=>netOf.get(e)===id)}));
        const components=[];
        for(const c of doc.components){
            if(c.type==='transformer'){
                const valid=Number.isInteger(c.turnsPrimary)&&c.turnsPrimary>=1&&Number.isInteger(c.turnsSecondary)&&c.turnsSecondary>=1;
                const ratio=valid?c.turnsSecondary/c.turnsPrimary:null;
                components.push({
                    ...c,
                    a:netOf.get(c.terminals[0]),b:netOf.get(c.terminals[1]),
                    sa:netOf.get(c.terminals[2]),sb:netOf.get(c.terminals[3]),
                    ratio
                });
            }else components.push({...c,a:netOf.get(c.terminals[0]),b:netOf.get(c.terminals[1])});
        }
        return {document:D.clone(doc),points,netOf,nets,components,links};
    }
    function referenceDomains(compiled,mode){
        const uf=new UnionFind(compiled.nets.map(n=>n.id));
        for(const c of compiled.components){
            if(c.type==='transformer'){
                uf.join(c.a,c.b);uf.join(c.sa,c.sb);
            }else if(c.type!=='switch'&&(mode!=='dc'||c.type!=='capacitor'))uf.join(c.a,c.b);
        }
        const groups=new Map();for(const n of compiled.nets){const key=uf.find(n.id);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(n);}
        const domains=[...groups.values()].map((nets,i)=>({id:i,nets:nets.map(n=>n.id),reference:(nets.find(n=>n.ground)||nets[0]).id,local:!nets.some(n=>n.ground)}));
        return {domains,domainOf:new Map(domains.flatMap(d=>d.nets.map(id=>[id,d])))};
    }
    function recoverWireCurrents(compiled,results){
        const out={},injections=new Map([...compiled.points.keys()].map(id=>[id,0]));
        for(const c of compiled.components){
            const r=results[c.id];
            if(c.type==='transformer'){
                const ip=r?.primaryCurrent,is=r?.secondaryCurrent;
                if(ip!==null&&Number.isFinite(ip)){injections.set(c.terminals[0],injections.get(c.terminals[0])+ip);injections.set(c.terminals[1],injections.get(c.terminals[1])-ip);}
                if(is!==null&&Number.isFinite(is)){injections.set(c.terminals[2],injections.get(c.terminals[2])+is);injections.set(c.terminals[3],injections.get(c.terminals[3])-is);}
                continue;
            }
            const i=r?.current;
            if(i!==null&&Number.isFinite(i)&&c.type!=='switch'){injections.set(c.terminals[0],injections.get(c.terminals[0])+i);injections.set(c.terminals[1],injections.get(c.terminals[1])-i);}
        }
        let maxKCL=0;
        for(const net of compiled.nets){
            const links=compiled.links.filter(l=>compiled.netOf.get(l.a)===net.id),adj=new Map(net.endpoints.map(id=>[id,[]]));
            for(const l of links){adj.get(l.a).push(l);adj.get(l.b).push(l);}
            maxKCL=Math.max(maxKCL,Math.abs(net.endpoints.reduce((sum,id)=>sum+injections.get(id),0)));
            // Iterative low-link traversal: only cycle edges have nonunique current.
            // A bridge still carries the total injection of its entire child side.
            const discovered=new Map(),low=new Map();let serial=0;
            for(const l of links)out[l.id]={current:null,reason:'Indeterminate within ideal wire loop',a:l.a,b:l.b};
            for(const start of net.endpoints){
                if(discovered.has(start))continue;
                discovered.set(start,++serial);low.set(start,serial);
                const stack=[{id:start,parent:null,edge:null,index:0,sum:injections.get(start)}];
                while(stack.length){
                    const item=stack.at(-1),edges=adj.get(item.id);
                    if(item.index<edges.length){
                        const edge=edges[item.index++];if(edge.id===item.edge?.id)continue;
                        const other=edge.a===item.id?edge.b:edge.a;
                        if(discovered.has(other)){low.set(item.id,Math.min(low.get(item.id),discovered.get(other)));continue;}
                        discovered.set(other,++serial);low.set(other,serial);
                        stack.push({id:other,parent:item.id,edge,index:0,sum:injections.get(other)});
                    }else{
                        stack.pop();if(!item.edge)continue;
                        low.set(item.parent,Math.min(low.get(item.parent),low.get(item.id)));
                        stack.at(-1).sum+=item.sum;
                        if(low.get(item.id)>discovered.get(item.parent))out[item.edge.id]={current:item.edge.a===item.id?-item.sum:item.sum,a:item.edge.a,b:item.edge.b};
                    }
                }
            }
        }
        return {wireResults:out,maxKCL};
    }
    function traceBranches(compiled,results,wireResults){
        const compEdges=[];
        for(const c of compiled.components){
            if(c.type==='switch')continue;
            if(c.type==='transformer'){
                const r=results[c.id];
                compEdges.push({id:`${c.id}:primary`,a:c.terminals[0],b:c.terminals[1],type:'component',current:r?.primaryCurrent??null});
                compEdges.push({id:`${c.id}:secondary`,a:c.terminals[2],b:c.terminals[3],type:'component',current:r?.secondaryCurrent??null});
            }else compEdges.push({id:c.id,a:c.terminals[0],b:c.terminals[1],type:'component',current:results[c.id]?.current??null});
        }
        const edges=[...compiled.links.filter(l=>l.type!=='reference').map(l=>({...l,current:wireResults[l.id]?.current??null})),...compEdges];
        const adj=new Map([...compiled.points.keys()].map(id=>[id,[]]));for(const e of edges){adj.get(e.a).push(e);adj.get(e.b).push(e);}
        const boundary=id=>adj.get(id).length!==2||compiled.points.get(id).kind==='junction'||compiled.document.referenceEndpoints.includes(id);
        const visited=new Set(),branches=[];
        for(const edge of edges){if(visited.has(edge.id))continue;let start=boundary(edge.a)?edge.a:boundary(edge.b)?edge.b:edge.a,startEdge=edge;
            if(!boundary(start)){let at=start,previous=edge;const walked=new Set([edge.id]);while(!boundary(at)){const back=adj.get(at).find(e=>e.id!==previous.id);if(!back||walked.has(back.id))break;walked.add(back.id);at=back.a===at?back.b:back.a;previous=back;}if(boundary(at)){start=at;startEdge=previous;}}
            let at=start,next=startEdge,path=[],current=null;
            do{visited.add(next.id);const signed=next.a===at?next.current:next.current===null?null:-next.current;if(path.length===0)current=signed;path.push(next.id);at=next.a===at?next.b:next.a;if(boundary(at))break;next=adj.get(at).find(e=>!visited.has(e.id));}while(next);
            branches.push({id:`branch-${branches.length+1}`,from:start,to:at,path,current,closed:at===start});
        }
        return branches;
    }
    Object.assign(D,{UnionFind,compileCircuit,referenceDomains,recoverWireCurrents,traceBranches});if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);

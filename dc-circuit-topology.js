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
        for(let i=1;i<doc.referenceEndpoints.length;i++){uf.join(doc.referenceEndpoints[0],doc.referenceEndpoints[i]);links.push({id:`ground-link-${i}`,a:doc.referenceEndpoints[0],b:doc.referenceEndpoints[i],type:'reference'});}
        const netIds=[...new Set([...points.keys()].map(id=>uf.find(id)))],netOf=new Map([...points.keys()].map(id=>[id,uf.find(id)]));
        const nets=netIds.map((id,i)=>({id,label:`N${i}`,endpoints:[...points.keys()].filter(e=>netOf.get(e)===id),ground:doc.referenceEndpoints.some(e=>netOf.get(e)===id)}));
        const components=doc.components.map(c=>({...c,a:netOf.get(c.terminals[0]),b:netOf.get(c.terminals[1])}));
        return {document:D.clone(doc),points,netOf,nets,components,links};
    }
    function referenceDomains(compiled,mode){
        const uf=new UnionFind(compiled.nets.map(n=>n.id));
        for(const c of compiled.components)if(c.type!=='switch'&&(mode!=='dc'||c.type!=='capacitor'))uf.join(c.a,c.b);
        const groups=new Map();for(const n of compiled.nets){const key=uf.find(n.id);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(n);}
        const domains=[...groups.values()].map((nets,i)=>({id:i,nets:nets.map(n=>n.id),reference:(nets.find(n=>n.ground)||nets[0]).id,local:!nets.some(n=>n.ground)}));
        return {domains,domainOf:new Map(domains.flatMap(d=>d.nets.map(id=>[id,d])))};
    }
    function recoverWireCurrents(compiled,results){
        const out={},injections=new Map([...compiled.points.keys()].map(id=>[id,0]));
        for(const c of compiled.components){const i=results[c.id]?.current;if(i!==null&&Number.isFinite(i)&&c.type!=='switch'){injections.set(c.terminals[0],injections.get(c.terminals[0])+i);injections.set(c.terminals[1],injections.get(c.terminals[1])-i);}}
        let maxKCL=0;
        for(const net of compiled.nets){
            const links=compiled.links.filter(l=>compiled.netOf.get(l.a)===net.id),adj=new Map(net.endpoints.map(id=>[id,[]]));
            for(const l of links){adj.get(l.a).push(l);adj.get(l.b).push(l);}
            const seen=new Set(),cycles=new Set();
            const visit=(id,parentEdge)=>{seen.add(id);for(const l of adj.get(id)){if(l.id===parentEdge)continue;const other=l.a===id?l.b:l.a;if(seen.has(other))cycles.add(l.id);else visit(other,l.id);}};
            if(net.endpoints.length)visit(net.endpoints[0],null);
            maxKCL=Math.max(maxKCL,Math.abs(net.endpoints.reduce((sum,id)=>sum+injections.get(id),0)));
            if(cycles.size){for(const l of links)out[l.id]={current:null,reason:'Indeterminate within ideal wire loop',a:l.a,b:l.b};continue;}
            function subtree(id,parentEdge){let sum=injections.get(id);for(const l of adj.get(id)){if(l.id===parentEdge)continue;const other=l.a===id?l.b:l.a,child=subtree(other,l.id);out[l.id]={current:l.a===other?-child:child,a:l.a,b:l.b};sum+=child;}return sum;}
            if(net.endpoints.length)subtree(net.endpoints[0],null);
        }
        return {wireResults:out,maxKCL};
    }
    function traceBranches(compiled,results,wireResults){
        const edges=[...compiled.links.filter(l=>l.type!=='reference').map(l=>({...l,current:wireResults[l.id]?.current??null})),...compiled.components.filter(c=>c.type!=='switch').map(c=>({id:c.id,a:c.terminals[0],b:c.terminals[1],type:'component',current:results[c.id]?.current??null}))];
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

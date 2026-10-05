(function(root){
    'use strict';
    const D=typeof module!=='undefined'?require('./dc-circuit-model.js'):root.DCCircuit;
    function orthogonalPath(anchors,verticalFirst=false){
        if(!anchors.length)return [];
        const path=[anchors[0]];
        for(let i=1;i<anchors.length;i++){
            const a=path.at(-1),b=anchors[i];
            if(Math.abs(a.x-b.x)>1e-8&&Math.abs(a.y-b.y)>1e-8){
                path.push(verticalFirst?{x:a.x,y:b.y}:{x:b.x,y:a.y});
            }
            if(Math.hypot(path.at(-1).x-b.x,path.at(-1).y-b.y)>1e-8)path.push(b);
            // Continue the direction of the previous leg through the next bend.
            if(path.length>1)verticalFirst=Math.abs(path.at(-1).x-path.at(-2).x)<1e-8;
        }
        return path;
    }
    function wireRoute(doc,wire){
        const ends=D.endpoints(doc),start=ends.get(wire.fromEndpoint),end=ends.get(wire.toEndpoint);
        if(!start||!end)return [];
        const component=start.componentId?doc.components.find(c=>c.id===start.componentId):null;
        const vertical=component?Math.abs(Math.sin(component.rotation*Math.PI/180))>.5:false;
        return orthogonalPath([start,...wire.waypoints,end],vertical);
    }
    function project(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;const point={x:a.x+t*dx,y:a.y+t*dy};return {point,distance:Math.hypot(p.x-point.x,p.y-point.y)};}
    // Clicked intersections join every segment there; unclicked crossings stay separate.
    function wireClick(doc,p,tolerance=10){
        const ends=D.endpoints(doc);
        let endpoint=[...ends.values()].map(e=>({e,d:Math.hypot(p.x-e.x,p.y-e.y)})).filter(x=>x.d<=tolerance).sort((a,b)=>a.d-b.d)[0]?.e;
        let best;
        if(!endpoint)for(const w of doc.wires){const path=wireRoute(doc,w);for(let i=1;i<path.length;i++){const q=project(p,path[i-1],path[i]);if(q.distance<=tolerance&&(!best||q.distance<best.distance))best=q;}}
        const point=endpoint?{x:endpoint.x,y:endpoint.y}:best?best.point:{x:p.x,y:p.y};
        endpoint=endpoint||[...ends.values()].find(e=>Math.hypot(e.x-point.x,e.y-point.y)<1e-6);
        const existing=!!endpoint||!!best;
        let id=endpoint?.id;
        if(!id){id=D.uid('node');doc.junctions.push({id,position:point});}
        for(const end of ends.values())if(end.id!==id&&Math.hypot(end.x-point.x,end.y-point.y)<1e-6&&!doc.wires.some(w=>(w.fromEndpoint===id&&w.toEndpoint===end.id)||(w.toEndpoint===id&&w.fromEndpoint===end.id)))D.wire(doc,id,end.id);
        for(const w of doc.wires.slice()){
            if(w.fromEndpoint===id||w.toEndpoint===id)continue;
            const path=wireRoute(doc,w);let cut=-1;
            if(Math.hypot(path[0].x-point.x,path[0].y-point.y)<1e-6){w.fromEndpoint=id;continue;}
            if(Math.hypot(path.at(-1).x-point.x,path.at(-1).y-point.y)<1e-6){w.toEndpoint=id;continue;}
            for(let i=1;i<path.length;i++)if(project(point,path[i-1],path[i]).distance<1e-6){cut=i;break;}
            if(cut<0)continue;
            doc.wires=doc.wires.filter(x=>x.id!==w.id);
            D.wire(doc,w.fromEndpoint,id,path.slice(1,cut));
            D.wire(doc,id,w.toEndpoint,path.slice(cut,-1));
        }
        return {id,point,existing,terminal:endpoint?.kind==='terminal'};
    }
    function connectClick(doc,from,p,tolerance=10){const clicked=wireClick(doc,p,tolerance);if(from&&from!==clicked.id&&!doc.wires.some(w=>(w.fromEndpoint===from&&w.toEndpoint===clicked.id)||(w.toEndpoint===from&&w.fromEndpoint===clicked.id)))D.wire(doc,from,clicked.id);return clicked;}
    Object.assign(D,{orthogonalPath,wireRoute,wireClick,connectClick});if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);

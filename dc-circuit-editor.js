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
    function terminalExit(doc,end){
        const c=doc.components.find(c=>c.id===end.componentId);if(!c)return end;
        const angle=c.rotation*Math.PI/180,sign=c.type==='transformer'?(end.index<2?-1:1):(end.index?1:-1);
        return {x:end.x+sign*24*Math.cos(angle),y:end.y+sign*24*Math.sin(angle)};
    }
    function connectionPath(doc,start,end){
        const a=terminalExit(doc,start),b=terminalExit(doc,end);
        const boxes=doc.components.map(c=>{const vertical=Math.abs(Math.sin(c.rotation*Math.PI/180))>.5,h=c.type==='transformer'?42:25;return {left:c.position.x-(vertical?h:42),right:c.position.x+(vertical?h:42),top:c.position.y-(vertical?42:h),bottom:c.position.y+(vertical?42:h)};});
        const candidates=[orthogonalPath([a,b]),orthogonalPath([a,b],true)];
        // Try lanes outside symbol bodies before accepting a route through a symbol.
        for(const box of boxes){
            for(const x of [box.left-18,box.right+18])candidates.push(orthogonalPath([a,{x,y:a.y},{x,y:b.y},b]));
            for(const y of [box.top-18,box.bottom+18])candidates.push(orthogonalPath([a,{x:a.x,y},{x:b.x,y},b]));
        }
        function score(path){let length=0,hits=0;for(let i=1;i<path.length;i++){const p=path[i-1],q=path[i];length+=Math.hypot(p.x-q.x,p.y-q.y);for(const box of boxes){if(Math.abs(p.x-q.x)<1e-7){if(p.x>box.left&&p.x<box.right&&Math.max(p.y,q.y)>box.top&&Math.min(p.y,q.y)<box.bottom)hits++;}else if(p.y>box.top&&p.y<box.bottom&&Math.max(p.x,q.x)>box.left&&Math.min(p.x,q.x)<box.right)hits++;}}return hits*1e9+length;}
        let best=candidates[0],bestScore=score(best);for(const path of candidates.slice(1)){const next=score(path);if(next<bestScore){best=path;bestScore=next;}}
        return [start,...best,end].filter((p,i,array)=>!i||Math.hypot(p.x-array[i-1].x,p.y-array[i-1].y)>1e-7);
    }
    function wireRoute(doc,wire,ends=D.endpoints(doc)){
        const start=ends.get(wire.fromEndpoint),end=ends.get(wire.toEndpoint);if(!start||!end)return [];
        // Explicit bends are preserved exactly, especially when splitting a route.
        if(wire.waypoints.length){const component=doc.components.find(c=>c.id===start.componentId),vertical=component?Math.abs(Math.sin(component.rotation*Math.PI/180))>.5:false;return orthogonalPath([start,...wire.waypoints,end],vertical);}
        return connectionPath(doc,start,end);
    }
    function project(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;const point={x:a.x+t*dx,y:a.y+t*dy};return {point,distance:Math.hypot(p.x-point.x,p.y-point.y)};}
    function snapTarget(doc,p,tolerance=10,geometry=null){
        const ends=geometry?.ends||D.endpoints(doc);let best=null;
        for(const end of ends.values()){const distance=Math.hypot(p.x-end.x,p.y-end.y);if(distance<=tolerance&&(!best||distance<best.distance))best={id:end.id,point:{x:end.x,y:end.y},distance,kind:end.kind};}
        if(best)return best;
        for(const w of doc.wires){const path=geometry?.paths.get(w.id)||wireRoute(doc,w,ends);for(let i=1;i<path.length;i++){const q=project(p,path[i-1],path[i]);if(q.distance<=tolerance&&(!best||q.distance<best.distance))best={id:w.id,...q,kind:'wire'};}}
        return best||{point:{x:Math.round(p.x/24)*24,y:Math.round(p.y/24)*24},kind:'grid'};
    }
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
            const before=path.slice(1,cut),after=path.slice(cut,-1);
            // Keep even a one-segment split explicit; automatic exit stubs must
            // not overshoot a new junction close to the original terminal.
            D.wire(doc,w.fromEndpoint,id,before.length?before:[{x:path[0].x,y:path[0].y}]);
            D.wire(doc,id,w.toEndpoint,after.length?after:[{x:path.at(-1).x,y:path.at(-1).y}]);
        }
        return {id,point,existing,terminal:endpoint?.kind==='terminal'};
    }
    function connectClick(doc,from,p,tolerance=10){const clicked=wireClick(doc,p,tolerance);if(from&&from!==clicked.id&&!doc.wires.some(w=>(w.fromEndpoint===from&&w.toEndpoint===clicked.id)||(w.toEndpoint===from&&w.fromEndpoint===clicked.id)))D.wire(doc,from,clicked.id);return clicked;}
    Object.assign(D,{orthogonalPath,wireRoute,wireClick,connectClick,snapTarget,connectionPath});if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);

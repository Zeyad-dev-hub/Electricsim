(function(root){
    'use strict';const D=root.DCCircuit;
    const color={wire:'#59677f',text:'#d5dfed',muted:'#8292aa',cyan:'#3dd9ff',amber:'#f6b944',accent:'#8b9dff',red:'#ff776e'};
    function route(doc,wire){return D.wireRoute(doc,wire);}
    function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
    function pathPoint(points,fraction){const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((s,l)=>s+l,0);let target=fraction*total;for(let i=0;i<lengths.length;i++){if(target<=lengths[i]||i===lengths.length-1){const t=lengths[i]?target/lengths[i]:0,a=points[i],b=points[i+1];return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x),total};}target-=lengths[i];}return {...points[0],angle:0,total:0};}
    class Renderer{
        constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.view={panX:0,panY:0,zoom:1};this.width=0;this.height=0;this.labelBoxes=[];new ResizeObserver(()=>this.resize()).observe(canvas);this.resize();}
resize(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(this.width&&r.width&&Math.abs(this.width-r.width)>.5){const scale=r.width/this.width;this.view.zoom*=scale;this.view.panX*=scale;this.view.panY*=scale;}this.width=r.width;this.height=r.height;this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.dpr=dpr;}
        world(clientX,clientY){const r=this.canvas.getBoundingClientRect();return {x:(clientX-r.left-this.width/2-this.view.panX)/this.view.zoom,y:(clientY-r.top-this.height/2-this.view.panY)/this.view.zoom};}
        center(){return {x:-this.view.panX/this.view.zoom,y:-this.view.panY/this.view.zoom};}
        fit(doc){const ps=[...D.endpoints(doc).values(),...doc.components.map(c=>c.position)];if(!ps.length){this.view={panX:0,panY:0,zoom:1};return;}const minX=Math.min(...ps.map(p=>p.x))-90,maxX=Math.max(...ps.map(p=>p.x))+90,minY=Math.min(...ps.map(p=>p.y))-80,maxY=Math.max(...ps.map(p=>p.y))+80,zoom=Math.min(1.5,this.width/(maxX-minX),this.height/(maxY-minY));this.view={zoom,panX:-(minX+maxX)/2*zoom,panY:-(minY+maxY)/2*zoom};}
        hit(doc,p){const radius=10/this.view.zoom,ends=D.endpoints(doc);for(const end of ends.values())if(Math.hypot(p.x-end.x,p.y-end.y)<radius)return {kind:end.kind,id:end.id,point:end};for(const c of doc.components.slice().reverse()){const dx=p.x-c.position.x,dy=p.y-c.position.y,a=-c.rotation*Math.PI/180,x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);if(Math.abs(x)<48&&Math.abs(y)<23)return {kind:'component',id:c.id};}for(const w of doc.wires.slice().reverse()){const path=route(doc,w);for(let i=1;i<path.length;i++)if(distanceToSegment(p,path[i-1],path[i])<7/this.view.zoom)return {kind:'wire',id:w.id,point:p};}return null;}
        stroke(points,stroke=color.wire,width=2){const c=this.ctx;c.strokeStyle=stroke;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
        dot(p,r,fill,hollow=false){const c=this.ctx;c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);if(hollow){c.strokeStyle=fill;c.lineWidth=1.4;c.stroke();}else{c.fillStyle=fill;c.fill();}}
        text(value,x,y,fill=color.text,size=11){const c=this.ctx;c.fillStyle=fill;c.font=`500 ${size/this.view.zoom}px Inter,system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(value,x,y);}
        label(value,p,fill=color.muted){const c=this.ctx,z=this.view.zoom;c.font=`500 ${10/z}px Inter,system-ui,sans-serif`;const width=c.measureText(value).width+8/z,height=15/z,offsets=[[0,0],[0,-18/z],[0,18/z],[0,-36/z],[0,36/z],[50/z,0],[-50/z,0],[50/z,-22/z],[-50/z,22/z]];let chosen;
            for(const [dx,dy] of offsets){const box={x:p.x+dx-width/2,y:p.y+dy-height/2,width,height};if(!this.labelBoxes.some(b=>box.x<b.x+b.width&&box.x+width>b.x&&box.y<b.y+b.height&&box.y+height>b.y)){chosen=box;break;}}
            chosen=chosen||{x:p.x-width/2,y:p.y-height/2,width,height};this.labelBoxes.push(chosen);const x=chosen.x+width/2,y=chosen.y+height/2;if(Math.hypot(x-p.x,y-p.y)>10/z)this.stroke([p,{x,y}],'#313c50',.7/z);c.fillStyle='#070a10e8';c.fillRect(chosen.x,chosen.y,width,height);this.text(value,x,y,fill,10);
        }
        arrow(p,direction,fill){const a=p.angle+(direction<0?Math.PI:0),c=this.ctx;c.save();c.translate(p.x,p.y);c.rotate(a);this.stroke([{x:-6,y:-4},{x:0,y:0},{x:-6,y:4}],fill,1.7/this.view.zoom);c.restore();}
        symbol(comp,result,selected,highlight,error){const c=this.ctx;c.save();c.translate(comp.position.x,comp.position.y);c.rotate(comp.rotation*Math.PI/180);const stroke=error?color.red:highlight?color.amber:selected?color.accent:color.text;c.strokeStyle=stroke;c.lineWidth=2/this.view.zoom;c.lineCap='round';
            if(selected||highlight){c.fillStyle=highlight?'#f6b9440c':'#8b9dff10';c.fillRect(-50,-23,100,46);}
            const seg=(p)=>this.stroke(p,stroke,2/this.view.zoom);
            seg([{x:-60,y:0},{x:-30,y:0}]);seg([{x:30,y:0},{x:60,y:0}]);
            if(comp.type==='resistor'){const ps=[{x:-30,y:0}];for(let i=0;i<8;i++)ps.push({x:-26+i*7.4,y:i%2?9:-9});ps.push({x:30,y:0});seg(ps);}
            if(comp.type==='capacitor'){
                seg([{x:-30,y:0},{x:-8,y:0}]);seg([{x:8,y:0},{x:30,y:0}]);seg([{x:-8,y:-19},{x:-8,y:19}]);seg([{x:8,y:-19},{x:8,y:19}]);
                const v=result?.voltage||0,n=Math.min(5,Math.ceil(Math.abs(v)/2));for(let i=0;i<n;i++){const y=-15+i*7;c.fillStyle=v>=0?color.amber:color.cyan;c.fillRect(-17,y,5,2);if(v>=0)c.fillRect(-15,y-2,1,6);c.fillStyle=v>=0?color.cyan:color.amber;c.fillRect(12,y,5,2);if(v<0)c.fillRect(14,y-2,1,6);}
            }
            if(comp.type==='voltage'){seg([{x:-30,y:0},{x:-8,y:0}]);seg([{x:8,y:0},{x:30,y:0}]);seg([{x:-8,y:-21},{x:-8,y:21}]);seg([{x:8,y:-11},{x:8,y:11}]);}
            if(comp.type==='current'){this.dot({x:0,y:0},22,stroke,true);seg([{x:-12,y:0},{x:12,y:0},{x:6,y:-5}]);seg([{x:12,y:0},{x:6,y:5}]);}
            if(comp.type==='switch'){seg([{x:-30,y:0},{x:comp.closed?30:22,y:comp.closed?0:-17}]);this.dot({x:-30,y:0},3,stroke);this.dot({x:30,y:0},3,stroke);}
            c.restore();this.label(`${comp.label} · ${comp.type==='switch'?(comp.closed?'closed':'open'):D.format(comp.value,{resistor:'Ω',capacitor:'F',voltage:'V',current:'A'}[comp.type])}`,{x:comp.position.x,y:comp.position.y-37/this.view.zoom},selected?color.accent:color.text);
        }
        draw(doc,solution,{selected=null,highlights=[],errors=[],options={},phase=0,running=false,connection=null,pointer=null}={}){
            const c=this.ctx,z=this.view.zoom;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);c.save();c.translate(this.width/2+this.view.panX,this.height/2+this.view.panY);c.scale(z,z);this.labelBoxes=[];
            const left=(-this.width/2-this.view.panX)/z,right=(this.width/2-this.view.panX)/z,top=(-this.height/2-this.view.panY)/z,bottom=(this.height/2-this.view.panY)/z;
            for(let x=Math.floor(left/24)*24;x<right;x+=24)for(let y=Math.floor(top/24)*24;y<bottom;y+=24)this.dot({x,y},.65/z,'#ffffff0d');
            const ends=D.endpoints(doc);
            for(const w of doc.wires){const path=route(doc,w),i=solution?.wireResults[w.id]?.current;this.stroke(path,selected?.id===w.id?color.accent:color.wire,selected?.id===w.id?3/z:1.8/z);
                if(options.markers&&Number.isFinite(i)&&Math.abs(i)>=(options.simple?1e-6:1e-14)){const dir=(i<0?-1:1)*(options.electrons?-1:1),speed=8+Math.min(20,Math.log10(1+Math.abs(i)*1e6)*4);for(let k=0;k<3;k++){const f=((phase*speed/100*dir+k/3)%1+1)%1;this.dot(pathPoint(path,f),2.1/z,color.cyan);}}
                if(selected?.id===w.id){const p=pathPoint(path,.5);this.label(Number.isFinite(i)?`${D.format(i,'A')} · route direction`:'Indeterminate wire-loop current',{x:p.x,y:p.y-14/z},color.cyan);}
            }
            for(const comp of doc.components)this.symbol(comp,solution?.componentResults[comp.id],selected?.id===comp.id,highlights.includes(comp.id),errors.includes(comp.id));
            if(options.simple)for(const comp of doc.components){
                const r=options.readings?.componentResults[comp.id];
                this.label(`${D.format(r?.voltage,'V')}  ·  ${D.format(r?.current,'A')}`,{x:comp.position.x,y:comp.position.y-58/z},r?color.cyan:color.muted);
                comp.terminals.forEach((id,i)=>{const p=ends.get(id);this.text(i?'B':'A',p.x,p.y+13/z,color.muted,9);});
            }
            for(const end of ends.values()){const active=connection===end.id;this.dot(end,end.kind==='junction'?4/z:3/z,active?color.amber:end.kind==='junction'?'#9caec4':'#536781');if(active)this.dot(end,8/z,color.amber,true);}
            for(const id of doc.referenceEndpoints){const p=ends.get(id);if(!p)continue;this.stroke([{x:p.x,y:p.y+5},{x:p.x,y:p.y+18}],color.accent,1.5/z);for(let j=0;j<3;j++)this.stroke([{x:p.x-(10-j*3)/z,y:p.y+(18+j*4)/z},{x:p.x+(10-j*3)/z,y:p.y+(18+j*4)/z}],color.accent,1.5/z);}
            if(connection&&pointer&&ends.has(connection)){const p=ends.get(connection),comp=doc.components.find(c=>c.id===p.componentId),vertical=comp?Math.abs(Math.sin(comp.rotation*Math.PI/180))>.5:false;this.stroke(D.orthogonalPath([p,pointer],vertical),color.amber,1.5/z);}
            if(solution){
                for(const comp of doc.components){const r=solution.componentResults[comp.id];if(!r)continue;
                    if(options.currents&&r.current!==null){const p={x:comp.position.x,y:comp.position.y+34/z,angle:comp.rotation*Math.PI/180};if(Math.abs(r.current)>1e-14)this.arrow(p,r.current*(options.electrons?-1:1),color.cyan);this.label(D.format(r.current,'A'),{x:p.x,y:p.y+13/z},color.cyan);}
                    if(options.drops)this.label(`${D.format(r.voltage,'V')} A−B`,{x:comp.position.x,y:comp.position.y+20/z},color.amber);
                    if(!options.simple&&(options.terminals||selected?.id===comp.id))comp.terminals.forEach((id,i)=>{const p=ends.get(id);this.label(`${i?'B':'A'} ${D.format(i?r.vb:r.va,'V')}${r.local?' · local':''}`,{x:p.x,y:p.y-15/z},color.amber);});
                }
                if(options.nodes){const compiled=D.compileCircuit(doc);for(const net of compiled.nets){const anchor=ends.get(net.endpoints.find(id=>ends.get(id).kind==='junction')||net.endpoints[0]),r=solution.nodeVoltages[net.id];if(r)this.label(`${net.label} ${D.format(r.value,'V')}${r.local?' local':''}`,{x:anchor.x,y:anchor.y-24/z},color.accent);}}
            }
            if(!doc.components.length)this.text('Place a component, then connect its terminal dots.',(left+right)/2,(top+bottom)/2,color.muted,13);
            c.restore();
        }
    }
    Object.assign(D,{Renderer,route,pathPoint,distanceToSegment});
})(window);

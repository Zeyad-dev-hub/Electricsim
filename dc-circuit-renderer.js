(function(root){
    'use strict';const D=root.DCCircuit;
    const color={wire:'#59677f',text:'#d5dfed',muted:'#8292aa',cyan:'#3dd9ff',amber:'#f6b944',accent:'#8b9dff',red:'#ff776e'};
    function route(doc,wire){return D.wireRoute(doc,wire);}
    function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
    function pathPoint(points,fraction){const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((s,l)=>s+l,0);let target=fraction*total;for(let i=0;i<lengths.length;i++){if(target<=lengths[i]||i===lengths.length-1){const t=lengths[i]?target/lengths[i]:0,a=points[i],b=points[i+1];return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x),total};}target-=lengths[i];}return {...points[0],angle:0,total:0};}
    class Renderer{
        constructor(canvas){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.view={panX:0,panY:0,zoom:1};this.width=0;this.height=0;this.labelBoxes=[];this.labelOffsets=new Map();this.cache=null;this.onresize=()=>{};new ResizeObserver(()=>{this.resize();this.onresize();}).observe(canvas);this.resize();}
        resize(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);this.width=r.width;this.height=r.height;this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.dpr=dpr;}
        invalidate(){this.cache=null;}
        geometry(doc){
            if(this.cache?.doc===doc)return this.cache;
            const ends=D.endpoints(doc),paths=new Map(),metrics=new Map();
            for(const w of doc.wires){const path=D.wireRoute(doc,w,ends);paths.set(w.id,path);metrics.set(w.id,D.pathMetrics(path));}
            const segments=[],crossings=[];for(const [id,path] of paths)for(let i=1;i<path.length;i++)segments.push({id,a:path[i-1],b:path[i]});
            if(segments.length<600)for(let i=0;i<segments.length;i++)for(let j=i+1;j<segments.length;j++){
                const a=segments[i],b=segments[j];if(a.id===b.id)continue;
                const av=Math.abs(a.a.x-a.b.x)<1e-7,bv=Math.abs(b.a.x-b.b.x)<1e-7;if(av===bv)continue;
                const v=av?a:b,h=av?b:a,p={x:v.a.x,y:h.a.y};
                if(p.x>Math.min(h.a.x,h.b.x)+1e-7&&p.x<Math.max(h.a.x,h.b.x)-1e-7&&p.y>Math.min(v.a.y,v.b.y)+1e-7&&p.y<Math.max(v.a.y,v.b.y)-1e-7)crossings.push(p);
            }
            this.cache={doc,ends,paths,metrics,crossings};return this.cache;
        }
        world(clientX,clientY){const r=this.canvas.getBoundingClientRect();return {x:(clientX-r.left-this.width/2-this.view.panX)/this.view.zoom,y:(clientY-r.top-this.height/2-this.view.panY)/this.view.zoom};}
        center(){return {x:-this.view.panX/this.view.zoom,y:-this.view.panY/this.view.zoom};}
        fit(doc){const ps=[...D.endpoints(doc).values(),...doc.wires.flatMap(w=>w.waypoints)];if(!ps.length){this.view={panX:0,panY:0,zoom:1};return;}const minX=Math.min(...ps.map(p=>p.x))-110,maxX=Math.max(...ps.map(p=>p.x))+110,minY=Math.min(...ps.map(p=>p.y))-110,maxY=Math.max(...ps.map(p=>p.y))+80,zoom=Math.max(.1,Math.min(1.5,this.width/(maxX-minX),this.height/(maxY-minY)));this.view={zoom,panX:-(minX+maxX)/2*zoom,panY:-(minY+maxY)/2*zoom};}
        hit(doc,p){const radius=12/this.view.zoom,{ends,paths}=this.geometry(doc);for(const id of doc.referenceEndpoints){const end=ends.get(id);if(end&&Math.abs(p.x-end.x)<15/this.view.zoom&&p.y>end.y+14/this.view.zoom&&p.y<end.y+42/this.view.zoom)return {kind:'ground',id,point:end};}for(const end of ends.values())if(Math.hypot(p.x-end.x,p.y-end.y)<radius)return {kind:end.kind,id:end.id,point:end};for(const c of doc.components.slice().reverse()){const dx=p.x-c.position.x,dy=p.y-c.position.y,a=-c.rotation*Math.PI/180,x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a);if(Math.abs(x)<48&&Math.abs(y)<23)return {kind:'component',id:c.id};}for(const w of doc.wires.slice().reverse()){const path=paths.get(w.id);for(let i=1;i<path.length;i++)if(distanceToSegment(p,path[i-1],path[i])<8/this.view.zoom)return {kind:'wire',id:w.id,point:p};}return null;}
        stroke(points,stroke=color.wire,width=2){const c=this.ctx;c.strokeStyle=stroke;c.lineWidth=width;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
        dot(p,r,fill,hollow=false){const c=this.ctx;c.beginPath();c.arc(p.x,p.y,r,0,Math.PI*2);if(hollow){c.strokeStyle=fill;c.lineWidth=1.4;c.stroke();}else{c.fillStyle=fill;c.fill();}}
        text(value,x,y,fill=color.text,size=11){const c=this.ctx;c.fillStyle=fill;c.font=`500 ${size/this.view.zoom}px Inter,system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(value,x,y);}
        grid(){
            const {panX,panY,zoom:z}=this.view,key=[this.width,this.height,this.dpr,panX,panY,z].join(':');
            if(this.gridKey!==key){
                this.gridKey=key;this.gridLayer=this.gridLayer||document.createElement('canvas');
                const layer=this.gridLayer;layer.width=this.canvas.width;layer.height=this.canvas.height;
                const c=layer.getContext('2d');c.setTransform(this.dpr,0,0,this.dpr,0,0);c.translate(this.width/2+panX,this.height/2+panY);c.scale(z,z);
                const left=(-this.width/2-panX)/z,right=(this.width/2-panX)/z,top=(-this.height/2-panY)/z,bottom=(this.height/2-panY)/z;
                c.fillStyle='#ffffff0d';c.beginPath();for(let x=Math.floor(left/24)*24;x<right;x+=24)for(let y=Math.floor(top/24)*24;y<bottom;y+=24){c.moveTo(x+.65/z,y);c.arc(x,y,.65/z,0,Math.PI*2);}c.fill();
            }
            this.ctx.drawImage(this.gridLayer,0,0,this.width,this.height);
        }
        label(value,p,fill=color.muted,key=value){const c=this.ctx,z=this.view.zoom;c.font=`500 ${11/z}px Inter,system-ui,sans-serif`;const width=c.measureText(value).width+8/z,height=17/z,previous=this.labelOffsets.get(key),offsets=[...(previous?[previous]:[]),[0,0],[0,-20/z],[0,20/z],[0,-40/z],[0,40/z],[60/z,0],[-60/z,0],[60/z,-24/z],[-60/z,24/z]];let chosen;
            for(const [dx,dy] of offsets){const box={x:p.x+dx-width/2,y:p.y+dy-height/2,width,height};if(box.x<this.bounds.left||box.x+width>this.bounds.right||box.y<this.bounds.top||box.y+height>this.bounds.bottom)continue;if(!this.labelBoxes.some(b=>box.x<b.x+b.width&&box.x+width>b.x&&box.y<b.y+b.height&&box.y+height>b.y)){chosen=box;this.labelOffsets.set(key,[dx,dy]);break;}}
            chosen=chosen||{x:p.x-width/2,y:p.y-height/2,width,height};this.labelBoxes.push(chosen);const x=chosen.x+width/2,y=chosen.y+height/2;if(Math.hypot(x-p.x,y-p.y)>10/z)this.stroke([p,{x,y}],'#313c50',.7/z);c.fillStyle='#070a10e8';c.fillRect(chosen.x,chosen.y,width,height);this.text(value,x,y,fill,11);
        }
        arrow(p,direction,fill){const a=p.angle+(direction<0?Math.PI:0),c=this.ctx;c.save();c.translate(p.x,p.y);c.rotate(a);this.stroke([{x:-6,y:-4},{x:0,y:0},{x:-6,y:4}],fill,1.7/this.view.zoom);c.restore();}
        symbol(comp,result,selected,highlight,error){const c=this.ctx;c.save();c.translate(comp.position.x,comp.position.y);c.rotate(comp.rotation*Math.PI/180);const stroke=error?color.red:highlight?color.amber:selected?color.accent:color.text;c.strokeStyle=stroke;c.lineWidth=2/this.view.zoom;c.lineCap='round';
            if(selected||highlight){c.fillStyle=highlight?'#f6b9440c':'#8b9dff10';c.fillRect(-50,-23,100,46);}
            const seg=(p)=>this.stroke(p,stroke,2/this.view.zoom);
            seg([{x:-60,y:0},{x:-30,y:0}]);seg([{x:30,y:0},{x:60,y:0}]);
            if(comp.type==='resistor'){const ps=[{x:-30,y:0}];for(let i=0;i<8;i++)ps.push({x:-26+i*7.4,y:i%2?9:-9});ps.push({x:30,y:0});seg(ps);}
            if(comp.type==='lamp'){
                const brightness=D.lampBrightness(result);
                if(brightness>0){
                    const glow=c.createRadialGradient(0,0,5,0,0,40);
                    glow.addColorStop(0,`rgba(255,211,102,${.25+.6*brightness})`);glow.addColorStop(1,'rgba(255,185,68,0)');
                    c.fillStyle=glow;c.fillRect(-40,-40,80,80);
                }
                const filament=error?color.red:brightness>0?color.amber:stroke;
                this.stroke([{x:-30,y:0},{x:-22,y:0}],stroke,2/this.view.zoom);this.stroke([{x:22,y:0},{x:30,y:0}],stroke,2/this.view.zoom);
                this.dot({x:0,y:0},22,filament,true);
                this.stroke([{x:-15,y:-15},{x:15,y:15}],filament,2/this.view.zoom);this.stroke([{x:-15,y:15},{x:15,y:-15}],filament,2/this.view.zoom);
            }
            if(comp.type==='capacitor'){
                seg([{x:-30,y:0},{x:-8,y:0}]);seg([{x:8,y:0},{x:30,y:0}]);seg([{x:-8,y:-19},{x:-8,y:19}]);seg([{x:8,y:-19},{x:8,y:19}]);
                const v=result?.voltage||0,charge=Math.abs(result?.charge||0),marks=Math.min(5,charge/.002);for(let i=0;i<Math.ceil(marks);i++){const y=-15+i*7;c.globalAlpha=Math.min(1,marks-i);c.fillStyle=v>=0?color.amber:color.cyan;c.fillRect(-17,y,5,2);if(v>=0)c.fillRect(-15,y-2,1,6);c.fillStyle=v>=0?color.cyan:color.amber;c.fillRect(12,y,5,2);if(v<0)c.fillRect(14,y-2,1,6);}c.globalAlpha=1;
            }
            if(comp.type==='voltage'){const positive=comp.value>=0;seg([{x:-30,y:0},{x:-8,y:0}]);seg([{x:8,y:0},{x:30,y:0}]);seg([{x:-8,y:positive?-21:-11},{x:-8,y:positive?21:11}]);seg([{x:8,y:positive?-11:-21},{x:8,y:positive?11:21}]);this.text(positive?'+':'−',-21,-13,stroke,10);this.text(positive?'−':'+',21,-13,stroke,10);}
            if(comp.type==='current'){this.dot({x:0,y:0},22,stroke,true);seg([{x:-12,y:0},{x:12,y:0},{x:6,y:-5}]);seg([{x:12,y:0},{x:6,y:5}]);}
            if(comp.type==='switch'){seg([{x:-30,y:0},{x:comp.closed?30:22,y:comp.closed?0:-17}]);this.dot({x:-30,y:0},3,stroke);this.dot({x:30,y:0},3,stroke);}
            c.restore();this.label(`${comp.label} · ${comp.type==='switch'?(comp.closed?'closed':'open'):D.format(comp.value,{resistor:'Ω',lamp:'Ω',capacitor:'F',voltage:'V',current:'A'}[comp.type])}`,{x:comp.position.x,y:comp.position.y-39/this.view.zoom},selected?color.accent:color.text,`${comp.id}:value`);
        }
        draw(doc,solution,{selected=null,highlights=[],errors=[],options={},motion=null,connection=null,pointer=null,snap=null}={}){
            if(this.width<=0||this.height<=0||!this.canvas.width||!this.canvas.height)return;
            const c=this.ctx,z=this.view.zoom;c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);this.grid();c.save();c.translate(this.width/2+this.view.panX,this.height/2+this.view.panY);c.scale(z,z);this.labelBoxes=[];
            const left=(-this.width/2-this.view.panX)/z,right=(this.width/2-this.view.panX)/z,top=(-this.height/2-this.view.panY)/z,bottom=(this.height/2-this.view.panY)/z;
            this.bounds={left,right,top,bottom};
            for(const comp of doc.components){const vertical=Math.abs(Math.sin(comp.rotation*Math.PI/180))>.5;this.labelBoxes.push({x:comp.position.x-(vertical?24:50),y:comp.position.y-(vertical?50:24),width:vertical?48:100,height:vertical?100:48});}
            const {ends,paths,metrics,crossings}=this.geometry(doc);
            for(const w of doc.wires){const path=paths.get(w.id),i=solution?.wireResults[w.id]?.current;this.stroke(path,selected?.id===w.id?color.accent:color.wire,selected?.id===w.id?3/z:1.8/z);
                if(options.markers&&motion&&Number.isFinite(i)&&Math.abs(i)>=1e-14){const m=metrics.get(w.id);let count=0;for(let d=D.wrap(motion.distance(w.id),24);d<m.length&&count++<200;d+=24)this.dot(D.pointAtDistance(m,d),2.1/z,color.cyan);}
                if(selected?.id===w.id){const p=pathPoint(path,.5),text=!solution?'Current unavailable':Number.isFinite(i)?`${D.reading(i,'A')} · start → end`:'Indeterminate within ideal wire loop';this.label(text,{x:p.x,y:p.y-14/z},color.cyan,`${w.id}:current`);if(Number.isFinite(i)&&Math.abs(i)>=1e-14)this.arrow(p,i,color.cyan);}
            }
            // Gaps at crossings without explicit endpoints communicate no connection.
            for(const p of crossings){
                this.stroke([{x:p.x,y:p.y-5/z},{x:p.x,y:p.y+5/z}],'#06070b',7/z);this.stroke([{x:p.x-6/z,y:p.y},{x:p.x+6/z,y:p.y}],color.wire,1.8/z);
            }
            for(const comp of doc.components)this.symbol(comp,solution?.componentResults[comp.id],selected?.id===comp.id,highlights.includes(comp.id),errors.includes(comp.id));
            if(options.simple)for(const comp of doc.components){
                const r=options.readings?.componentResults[comp.id];
                this.label(`${D.reading(r?.voltage,'V')}  ·  ${D.reading(r?.current,'A')}`,{x:comp.position.x,y:comp.position.y-61/z},r?color.cyan:color.muted,`${comp.id}:readings`);
                comp.terminals.forEach((id,i)=>{const p=ends.get(id);this.text(i?'B':'A',p.x,p.y+13/z,color.muted,9);});
            }
            for(const end of ends.values()){const active=connection===end.id;this.dot(end,end.kind==='junction'?4/z:3/z,active?color.amber:end.kind==='junction'?'#9caec4':'#536781');if(active)this.dot(end,8/z,color.amber,true);}
            for(const id of doc.referenceEndpoints){const p=ends.get(id);if(!p)continue;const fill=selected?.kind==='ground'&&selected.id===id?color.amber:color.accent;this.stroke([{x:p.x,y:p.y+5/z},{x:p.x,y:p.y+24/z}],fill,1.5/z);for(let j=0;j<3;j++)this.stroke([{x:p.x-(10-j*3)/z,y:p.y+(24+j*4)/z},{x:p.x+(10-j*3)/z,y:p.y+(24+j*4)/z}],fill,1.5/z);this.text('0 V',p.x+25/z,p.y+28/z,fill,10);}
            if(snap)this.dot(snap.point,9/z,color.amber,true);
            if(connection&&pointer&&ends.has(connection)){const p=ends.get(connection),target=snap?.kind==='terminal'||snap?.kind==='junction'?ends.get(snap.id):pointer;this.stroke(D.connectionPath(doc,p,target),color.amber,1.5/z);}
            if(solution){
                for(const comp of doc.components){const r=solution.componentResults[comp.id];if(!r)continue;
                    if(selected?.id===comp.id&&Number.isFinite(r.current)&&Math.abs(r.current)>=1e-14)this.arrow({x:comp.position.x,y:comp.position.y+35/z,angle:comp.rotation*Math.PI/180},r.current,color.cyan);
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

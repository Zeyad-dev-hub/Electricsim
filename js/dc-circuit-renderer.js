(function(root){
    'use strict';const D=root.DCCircuit;
    const color={wire:'#59677f',text:'#d5dfed',muted:'#8292aa',cyan:'#3dd9ff',amber:'#f6b944',accent:'#8b9dff',red:'#ff776e'};
    const bwColor={wire:'#000000',text:'#000000',muted:'#000000',cyan:'#000000',amber:'#000000',accent:'#000000',red:'#000000'};
    function route(doc,wire){return D.wireRoute(doc,wire);}
    function distanceToSegment(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
    function pathPoint(points,fraction){const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((s,l)=>s+l,0);let target=fraction*total;for(let i=0;i<lengths.length;i++){if(target<=lengths[i]||i===lengths.length-1){const t=lengths[i]?target/lengths[i]:0,a=points[i],b=points[i+1];return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x),total};}target-=lengths[i];}return {...points[0],angle:0,total:0};}
    class Renderer{
        constructor(canvas,opts={}){this.canvas=canvas;this.ctx=canvas.getContext('2d');this.view={panX:0,panY:0,zoom:1};this.width=0;this.height=0;this.dpr=1;this.bw=Boolean(opts.bw);this.labelBoxes=[];this.labelOffsets=new Map();this.cache=null;this.onresize=()=>{};if(!opts.offscreen){new ResizeObserver(()=>{this.resize();this.onresize();}).observe(canvas);this.resize();}}
        resize(){const r=this.canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(this.width===r.width&&this.height===r.height&&this.dpr===dpr)return; if(this.width&&this.height){this.view.panX+=(this.width-r.width)/2;this.view.panY+=(this.height-r.height)/2;}this.width=r.width;this.height=r.height;this.canvas.width=Math.round(r.width*dpr);this.canvas.height=Math.round(r.height*dpr);this.dpr=dpr;}
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
                if(p.x>Math.min(h.a.x,h.b.x)+1e-7&&p.x<Math.max(h.a.x,h.b.x)-1e-7&&p.y>Math.min(v.a.y,v.b.y)+1e-7&&p.y<Math.max(v.a.y,v.b.y)-1e-7&&![...ends.values()].some(e=>Math.hypot(e.x-p.x,e.y-p.y)<1e-6))crossings.push({...p,over:h.id,under:v.id,room:Math.min(p.x-Math.min(h.a.x,h.b.x),Math.max(h.a.x,h.b.x)-p.x,p.y-Math.min(v.a.y,v.b.y),Math.max(v.a.y,v.b.y)-p.y)});
            }
            this.cache={doc,ends,paths,metrics,crossings};return this.cache;
        }
        world(clientX,clientY){const r=this.canvas.getBoundingClientRect();return {x:(clientX-r.left-this.width/2-this.view.panX)/this.view.zoom,y:(clientY-r.top-this.height/2-this.view.panY)/this.view.zoom};}
        center(){return {x:-this.view.panX/this.view.zoom,y:-this.view.panY/this.view.zoom};}
        fit(doc){const ps=[...D.endpoints(doc).values(),...doc.wires.flatMap(w=>w.waypoints)];if(!ps.length){this.view={panX:0,panY:0,zoom:1};return;}const minX=Math.min(...ps.map(p=>p.x))-110,maxX=Math.max(...ps.map(p=>p.x))+110,minY=Math.min(...ps.map(p=>p.y))-110,maxY=Math.max(...ps.map(p=>p.y))+80,zoom=Math.max(.1,Math.min(1.5,this.width/(maxX-minX),this.height/(maxY-minY)));this.view={zoom,panX:-(minX+maxX)/2*zoom,panY:-(minY+maxY)/2*zoom};}
        hit(doc,p,{touch=false,preferComponent=false}={}){
            const z=this.view.zoom,radius=(touch?22:12)/z,{ends,paths}=this.geometry(doc);
            const body=()=>{for(const c of doc.components.slice().reverse()){const dx=p.x-c.position.x,dy=p.y-c.position.y,a=-c.rotation*Math.PI/180,x=dx*Math.cos(a)-dy*Math.sin(a),y=dx*Math.sin(a)+dy*Math.cos(a),halfY=c.type==='transformer'?36:23;if(Math.abs(x)<48&&Math.abs(y)<Math.max(halfY,touch?22/z:halfY))return {kind:'component',id:c.id};}return null;};
            if(preferComponent){const hit=body();if(hit)return hit;}
            for(const id of doc.referenceEndpoints){const end=ends.get(id);if(end&&Math.abs(p.x-end.x)<(touch?22:15)/z&&p.y>end.y+14/z&&p.y<end.y+42/z)return {kind:'ground',id,point:end};}
            let nearest=null,best=radius;for(const end of ends.values()){const d=Math.hypot(p.x-end.x,p.y-end.y);if(d<best){best=d;nearest={kind:end.kind,id:end.id,point:end};}}if(nearest)return nearest;
            if(!preferComponent){const hit=body();if(hit)return hit;}
            best=(touch?14:8)/z;nearest=null;for(const w of doc.wires.slice().reverse()){const path=paths.get(w.id);for(let i=1;i<path.length;i++){const d=distanceToSegment(p,path[i-1],path[i]);if(d<best){best=d;nearest={kind:'wire',id:w.id,point:p};}}}return nearest;
        }
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
        label(value,p,fill=color.muted,key=value,side=null){const c=this.ctx,z=this.view.zoom;c.font=`500 ${11/z}px Inter,system-ui,sans-serif`;const width=c.measureText(value).width+8/z,height=17/z,previous=this.labelOffsets.get(key);let chosen;
            // side={mirrorX}: p is the label's left edge beside a vertical part; the fallback mirrors to the other side of the body.
            const preferred=side?{x:p.x,y:p.y-height/2}:{x:p.x-width/2,y:p.y-height/2};
            const offsets=side?[[0,0],[0,-20/z],[0,20/z],['m',0],['m',-20/z],['m',20/z],[0,-40/z],[0,40/z],['m',-40/z],['m',40/z]]:[[0,0],[0,-20/z],[0,20/z],[0,-40/z],[0,40/z],[60/z,0],[-60/z,0],[60/z,-24/z],[-60/z,24/z]];
            const boxAt=([dx,dy])=>dx==='m'?(side?{x:2*side.mirrorX-p.x-width,y:preferred.y+dy,width,height}:{x:preferred.x,y:preferred.y+dy,width,height}):{x:preferred.x+dx,y:preferred.y+dy,width,height};
            const candidates=[...(previous?[previous]:[]),...offsets];
            for(const offset of candidates){const box=boxAt(offset);if(box.x<this.bounds.left||box.x+width>this.bounds.right||box.y<this.bounds.top||box.y+height>this.bounds.bottom)continue;if(!this.labelBoxes.some(b=>box.x<b.x+b.width&&box.x+width>b.x&&box.y<b.y+b.height&&box.y+height>b.y)){chosen=box;this.labelOffsets.set(key,offset);break;}}
            chosen=chosen||{...preferred,width,height};this.labelBoxes.push(chosen);const x=chosen.x+width/2,y=chosen.y+height/2,ax=preferred.x+width/2,ay=preferred.y+height/2;if(Math.hypot(x-ax,y-ay)>10/z&&!side)this.stroke([{x:ax,y:ay},{x,y}],this.bw?'#444444':'#313c50',.7/z);c.fillStyle=this.bw?'#ffffff':'#070a10e8';c.fillRect(chosen.x,chosen.y,width,height);this.text(value,x,y,this.bw?'#000000':fill,11);
        }
        // Where a component's name and reading labels go: above horizontal parts, beside vertical/diagonal ones.
        labelAnchors(comp){const z=this.view.zoom,vertical=Math.abs(Math.sin(comp.rotation*Math.PI/180))>.5,big=comp.type==='transformer';
            if(!vertical)return {name:{x:comp.position.x,y:comp.position.y-(big?51:39)/z},reading:{x:comp.position.x,y:comp.position.y-(big?73:61)/z},side:null};
            const half=big?42:28,x=comp.position.x+half+6/z;
            return {name:{x,y:comp.position.y-10/z},reading:{x,y:comp.position.y+10/z},side:{mirrorX:comp.position.x}};
        }
        arrow(p,direction,fill){const a=p.angle+(direction<0?Math.PI:0),c=this.ctx;c.save();c.translate(p.x,p.y);c.rotate(a);this.stroke([{x:-6,y:-4},{x:0,y:0},{x:-6,y:4}],this.bw?'#000000':fill,1.7/this.view.zoom);c.restore();}
        symbol(comp,result,selected,highlight,error,time=0){const c=this.ctx,P=this.bw?bwColor:color;c.save();c.translate(comp.position.x,comp.position.y);c.rotate(comp.rotation*Math.PI/180);const stroke=this.bw?'#000000':(error?P.red:highlight?P.amber:selected?P.accent:P.text);c.strokeStyle=stroke;c.lineWidth=2/this.view.zoom;c.lineCap='round';
            const halfH=comp.type==='transformer'?36:23;
            if(!this.bw&&(selected||highlight)){c.fillStyle=highlight?'#f6b9440c':'#8b9dff10';c.fillRect(-50,-halfH,100,halfH*2);}
            const seg=(p)=>this.stroke(p,stroke,2/this.view.zoom);
            if(comp.type!=='transformer'){seg([{x:-60,y:0},{x:-30,y:0}]);seg([{x:30,y:0},{x:60,y:0}]);}
            if(comp.type==='resistor'){const ps=[{x:-30,y:0}];for(let i=0;i<8;i++)ps.push({x:-26+i*7.4,y:i%2?9:-9});ps.push({x:30,y:0});seg(ps);}
            if(comp.type==='lamp'){
                const brightness=this.bw?0:D.lampBrightness(result);
                if(brightness>0){
                    const glow=c.createRadialGradient(0,0,5,0,0,40);
                    glow.addColorStop(0,`rgba(255,211,102,${.25+.6*brightness})`);glow.addColorStop(1,'rgba(255,185,68,0)');
                    c.fillStyle=glow;c.fillRect(-40,-40,80,80);
                }
                const filament=this.bw?'#000000':(error?P.red:brightness>0?P.amber:stroke);
                this.stroke([{x:-30,y:0},{x:-22,y:0}],stroke,2/this.view.zoom);this.stroke([{x:22,y:0},{x:30,y:0}],stroke,2/this.view.zoom);
                if(this.bw){c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.fillStyle='#ffffff';c.fill();}
                this.dot({x:0,y:0},22,filament,true);
                this.stroke([{x:-15,y:-15},{x:15,y:15}],filament,2/this.view.zoom);this.stroke([{x:-15,y:15},{x:15,y:-15}],filament,2/this.view.zoom);
            }
            if(comp.type==='capacitor'){
                seg([{x:-30,y:0},{x:-8,y:0}]);seg([{x:8,y:0},{x:30,y:0}]);seg([{x:-8,y:-19},{x:-8,y:19}]);seg([{x:8,y:-19},{x:8,y:19}]);
                if(!this.bw){const v=result?.voltage||0,charge=Math.abs(result?.charge||0),marks=Math.min(5,charge/.002);for(let i=0;i<Math.ceil(marks);i++){const y=-15+i*7;c.globalAlpha=Math.min(1,marks-i);c.fillStyle=v>=0?P.amber:P.cyan;c.fillRect(-17,y,5,2);if(v>=0)c.fillRect(-15,y-2,1,6);c.fillStyle=v>=0?P.cyan:P.amber;c.fillRect(12,y,5,2);if(v<0)c.fillRect(14,y-2,1,6);}c.globalAlpha=1;}
            }
            if(comp.type==='inductor'){
                const energy=this.bw?0:Math.abs(result?.energy||0),magRatio=Math.min(1,Math.sqrt(energy/0.05));
                if(magRatio>0.02){
                    const glow=c.createRadialGradient(0,0,4,0,0,36);
                    glow.addColorStop(0,`rgba(61,217,255,${0.12+0.42*magRatio})`);
                    glow.addColorStop(1,'rgba(61,217,255,0)');
                    c.fillStyle=glow;c.fillRect(-38,-32,76,64);
                }
                seg([{x:-30,y:0},{x:-28,y:0}]);seg([{x:28,y:0},{x:30,y:0}]);
                c.strokeStyle=(!this.bw&&magRatio>0.05)?P.cyan:stroke;c.lineWidth=2.2/this.view.zoom;
                for(let i=0;i<4;i++){
                    const cx=-21+i*14;
                    c.beginPath();c.arc(cx,0,7,Math.PI,0,false);c.stroke();
                }
                this.stroke([{x:-26,y:-11},{x:26,y:-11}],this.bw?'#000000':'#8b9dff88',1.4/this.view.zoom);
            }
            if(comp.type==='voltage'){const positive=comp.value>=0;seg([{x:-30,y:0},{x:-8,y:0}]);seg([{x:8,y:0},{x:30,y:0}]);seg([{x:-8,y:positive?-21:-11},{x:-8,y:positive?21:11}]);seg([{x:8,y:positive?-11:-21},{x:8,y:positive?11:21}]);this.text(positive?'+':'−',-21,-13,stroke,10);this.text(positive?'−':'+',21,-13,stroke,10);}
            if(comp.type==='current'){const dir=comp.value>=0?1:-1;seg([{x:-30,y:0},{x:-22,y:0}]);seg([{x:22,y:0},{x:30,y:0}]);if(this.bw){c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.fillStyle='#ffffff';c.fill();}this.dot({x:0,y:0},22,stroke,true);seg([{x:-12*dir,y:0},{x:12*dir,y:0},{x:6*dir,y:-5}]);seg([{x:12*dir,y:0},{x:6*dir,y:5}]);}
            if(comp.type==='switch'){seg([{x:-30,y:0},{x:comp.closed?30:22,y:comp.closed?0:-17}]);this.dot({x:-30,y:0},3,stroke);this.dot({x:30,y:0},3,stroke);}
            if(comp.type==='diode'||comp.type==='led'||comp.type==='zener'){
                const on=this.bw?false:!!result?.conducting;
                const mode=result?.conductionMode||'Reverse OFF';
                const overloaded=this.bw?false:!!result?.overloaded;
                if(comp.type==='led'&&!this.bw){
                    const b=D.ledBrightness?D.ledBrightness(result):(on?0.8:0);
                    if(b>0){
                        const glow=c.createRadialGradient(0,-2,4,0,-2,38);
                        glow.addColorStop(0,overloaded?`rgba(255,119,110,${0.4+0.5*b})`:`rgba(52,211,153,${0.3+0.6*b})`);
                        glow.addColorStop(1,'rgba(52,211,153,0)');
                        c.fillStyle=glow;c.fillRect(-40,-42,80,80);
                    }
                }
                const activeColor=this.bw?'#000000':(overloaded?P.red:(comp.type==='led'?'#34d399':(mode==='Zener Breakdown'?P.amber:P.cyan)));
                seg([{x:-30,y:0},{x:-13,y:0}]);seg([{x:13,y:0},{x:30,y:0}]);
                c.beginPath();c.moveTo(-13,-14);c.lineTo(-13,14);c.lineTo(13,0);c.closePath();
                if(this.bw){c.fillStyle='#ffffff';c.fill();}
                else if(on){c.fillStyle=comp.type==='led'?'#34d39940':(mode==='Zener Breakdown'?'#f6b94438':'#3dd9ff38');c.fill();}
                c.strokeStyle=on?activeColor:stroke;c.lineWidth=2/this.view.zoom;c.stroke();
                this.stroke([{x:13,y:-14},{x:13,y:14}],on?activeColor:stroke,2.4/this.view.zoom);
                if(comp.type==='zener'){
                    this.stroke([{x:13,y:-14},{x:19,y:-14}],on?activeColor:stroke,2.2/this.view.zoom);
                    this.stroke([{x:13,y:14},{x:7,y:14}],on?activeColor:stroke,2.2/this.view.zoom);
                }
                if(comp.type==='led'){
                    const arrowCol=this.bw?'#000000':(on?activeColor:P.muted);
                    this.stroke([{x:-2,y:-15},{x:7,y:-24}],arrowCol,1.6/this.view.zoom);
                    this.stroke([{x:3,y:-24},{x:7,y:-24},{x:7,y:-20}],arrowCol,1.6/this.view.zoom);
                    this.stroke([{x:6,y:-13},{x:15,y:-22}],arrowCol,1.6/this.view.zoom);
                    this.stroke([{x:11,y:-22},{x:15,y:-22},{x:15,y:-18}],arrowCol,1.6/this.view.zoom);
                }
            }
            if(comp.type==='ac'){
                seg([{x:-30,y:0},{x:-22,y:0}]);seg([{x:22,y:0},{x:30,y:0}]);
                const inst=this.bw?0:(result?.instantaneousVoltage??(comp.value*Math.sin(2*Math.PI*(comp.frequency||1)*time+(comp.phase||0)*Math.PI/180)));
                const ringColor=this.bw?'#000000':(Math.abs(inst)>1e-4?(inst>0?P.cyan:P.amber):stroke);
                if(this.bw){c.beginPath();c.arc(0,0,22,0,Math.PI*2);c.fillStyle='#ffffff';c.fill();}
                this.dot({x:0,y:0},22,ringColor,true);
                const wave=[];for(let i=-14;i<=14;i++)wave.push({x:i,y:-Math.sin(i/14*Math.PI)*9});
                this.stroke(wave,ringColor,1.8/this.view.zoom);
                this.text('~',-22,-15,stroke,10);
            }
            if(comp.type==='transformer'){
                const configured=Number.isInteger(comp.turnsPrimary)&&Number.isInteger(comp.turnsSecondary);
                const wStroke=this.bw?'#000000':(configured?stroke:P.muted);
                this.stroke([{x:-60,y:-30},{x:-16,y:-30}],wStroke,2/this.view.zoom);
                this.stroke([{x:-60,y:30},{x:-16,y:30}],wStroke,2/this.view.zoom);
                this.stroke([{x:60,y:-30},{x:16,y:-30}],wStroke,2/this.view.zoom);
                this.stroke([{x:60,y:30},{x:16,y:30}],wStroke,2/this.view.zoom);
                c.strokeStyle=wStroke;c.lineWidth=2/this.view.zoom;
                for(let i=0;i<4;i++){
                    const y0=-30+i*15,ym=y0+7.5;
                    c.beginPath();c.arc(-16,ym,7.5,-Math.PI/2,Math.PI/2,false);c.stroke();
                    c.beginPath();c.arc(16,ym,7.5,Math.PI/2,-Math.PI/2,false);c.stroke();
                }
                this.stroke([{x:-3,y:-28},{x:-3,y:28}],P.accent,1.8/this.view.zoom);
                this.stroke([{x:3,y:-28},{x:3,y:28}],P.accent,1.8/this.view.zoom);
                this.dot({x:-22,y:-22},2.2,P.amber);
                this.dot({x:22,y:-22},2.2,P.amber);
            }
            c.restore();
            let valueText;
            if(comp.type==='switch')valueText=comp.closed?'closed':'open';
            else if(comp.type==='diode'||comp.type==='led')valueText=`${D.format(comp.value,'V')} Vf`;
            else if(comp.type==='zener')valueText=`${D.format(comp.value,'V')} Vz`;
            else if(comp.type==='ac')valueText=`${D.format(comp.value,'V')}p · ${D.format(comp.frequency||1,'Hz')}`;
            else if(comp.type==='transformer')valueText=(Number.isInteger(comp.turnsPrimary)&&Number.isInteger(comp.turnsSecondary))?`${comp.turnsPrimary}:${comp.turnsSecondary}`:'set Np:Ns';
            else valueText=D.format(comp.value,{resistor:'Ω',lamp:'Ω',capacitor:'F',inductor:'H',voltage:'V',current:'A'}[comp.type]);
            const anchors=this.labelAnchors(comp);
            this.label(`${comp.label} · ${valueText}`,anchors.name,this.bw?'#000000':(selected?P.accent:P.text),`${comp.id}:value`,anchors.side);
        }
        draw(doc,solution,{selected=null,highlights=[],errors=[],options={},motion=null,connection=null,pointer=null,snap=null,placement=null}={}){
            if(this.width<=0||this.height<=0||!this.canvas.width||!this.canvas.height)return;
            const c=this.ctx,z=this.view.zoom,P=this.bw?bwColor:color,bgFill=this.bw?'#ffffff':'#06070b';
            c.setTransform(this.dpr,0,0,this.dpr,0,0);
            if(this.bw){c.fillStyle='#ffffff';c.fillRect(0,0,this.width,this.height);}else{c.clearRect(0,0,this.width,this.height);this.grid();}
            c.save();c.translate(this.width/2+this.view.panX,this.height/2+this.view.panY);c.scale(z,z);this.labelBoxes=[];
            const left=(-this.width/2-this.view.panX)/z,right=(this.width/2-this.view.panX)/z,top=(-this.height/2-this.view.panY)/z,bottom=(this.height/2-this.view.panY)/z;
            this.bounds={left,right,top,bottom};
            for(const comp of doc.components){const vertical=Math.abs(Math.sin(comp.rotation*Math.PI/180))>.5;this.labelBoxes.push({x:comp.position.x-(vertical?24:50),y:comp.position.y-(vertical?50:24),width:vertical?48:100,height:vertical?100:48});}
            const {ends,paths,metrics,crossings}=this.geometry(doc);
            for(const w of doc.wires){const path=paths.get(w.id),i=solution?.wireResults[w.id]?.current;this.stroke(path,(!this.bw&&selected?.id===w.id)?P.accent:P.wire,(!this.bw&&selected?.id===w.id)?3/z:(this.bw?2/z:1.8/z));
                if(!this.bw&&options.markers&&motion&&Number.isFinite(i)&&Math.abs(i)>=1e-14){
                    const m=metrics.get(w.id),ratio=Math.min(1,Math.abs(i)/Math.max(1e-12,motion.reference));
                    const alpha=.35+.65*Math.sqrt(ratio),r=(1.8+1.0*ratio)/z;
                    c.save();c.globalAlpha=alpha;
                    let count=0;for(let d=D.wrap(motion.distance(w.id),24);d<m.length&&count++<200;d+=24)this.dot(D.pointAtDistance(m,d),r,P.cyan);
                    c.restore();
                }
                if(!this.bw&&selected?.id===w.id){const p=pathPoint(path,.5),text=!solution?'Current unavailable':Number.isFinite(i)?`${D.reading(i,'A')} · start → end`:'Indeterminate within ideal wire loop';this.label(text,{x:p.x,y:p.y-14/z},P.cyan,`${w.id}:current`);if(Number.isFinite(i)&&Math.abs(i)>=1e-14)this.arrow(p,i,P.cyan);}
            }
            // Unconnected crossings: the horizontal wire hops over the vertical one with a semicircular bridge arc (no junction dot = no connection).
            for(const p of crossings){
                const r=Math.max(1.5/z,Math.min(6/z,p.room*.45)),selOver=!this.bw&&selected?.id===p.over,selUnder=!this.bw&&selected?.id===p.under;
                const overColor=selOver?P.accent:P.wire,overWidth=selOver?3/z:(this.bw?2/z:1.8/z);
                c.save();c.lineCap='butt';
                this.stroke([{x:p.x-r-.5/z,y:p.y},{x:p.x+r+.5/z,y:p.y}],bgFill,(selOver?3:2.2)/z+1.5/z);
                this.stroke([{x:p.x,y:p.y-r-1/z},{x:p.x,y:p.y+r+1/z}],selUnder?P.accent:P.wire,selUnder?3/z:(this.bw?2/z:1.8/z));
                c.lineCap='round';c.strokeStyle=bgFill;c.lineWidth=overWidth+2.4/z;c.beginPath();c.arc(p.x,p.y,r,Math.PI,2*Math.PI);c.stroke();
                c.strokeStyle=overColor;c.lineWidth=overWidth;c.beginPath();c.arc(p.x,p.y,r,Math.PI,2*Math.PI);c.stroke();
                c.restore();
            }
            const simTime=options.time||0;
            for(const comp of doc.components)this.symbol(comp,this.bw?null:solution?.componentResults[comp.id],!this.bw&&selected?.id===comp.id,!this.bw&&highlights.includes(comp.id),!this.bw&&errors.includes(comp.id),simTime);
            if(!this.bw&&options.simple)for(const comp of doc.components){
                const r=options.readings?.componentResults[comp.id],shown=comp.type==='transformer'?null:D.presentResult(comp,r);
                const readingText=comp.type==='transformer'
                    ?(r?.configured?`Vp ${D.reading(r.primaryVoltage,'V')} · Vs ${D.reading(r.secondaryVoltage,'V')}`:'Unconfigured · set Np:Ns')
                    :`${D.reading(shown?.voltage,'V')}  ·  ${D.reading(shown?.current,'A')}`;
                const anchors=this.labelAnchors(comp);
                this.label(readingText,anchors.reading,r?P.cyan:P.muted,`${comp.id}:readings`,anchors.side);
                comp.terminals.forEach((id,i)=>{const p=ends.get(id);this.text(D.terminalName(comp,i),p.x,p.y+13/z,P.muted,9);});
            }
            for(const end of ends.values()){const active=!this.bw&&connection===end.id;this.dot(end,end.kind==='junction'?4/z:(this.bw?2.3/z:3/z),this.bw?'#000000':(active?P.amber:end.kind==='junction'?'#9caec4':'#536781'));if(active)this.dot(end,8/z,P.amber,true);}
            for(const id of doc.referenceEndpoints){const p=ends.get(id);if(!p)continue;const fill=this.bw?'#000000':(selected?.kind==='ground'&&selected.id===id?P.amber:P.accent);this.stroke([{x:p.x,y:p.y+5/z},{x:p.x,y:p.y+24/z}],fill,1.5/z);for(let j=0;j<3;j++)this.stroke([{x:p.x-(10-j*3)/z,y:p.y+(24+j*4)/z},{x:p.x+(10-j*3)/z,y:p.y+(24+j*4)/z}],fill,1.5/z);this.text('0 V',p.x+25/z,p.y+28/z,fill,10);}
            if(!this.bw&&snap)this.dot(snap.point,9/z,P.amber,true);
            if(!this.bw&&options.nodeLabel&&ends.has(options.nodeLabel.id)){const p=ends.get(options.nodeLabel.id);this.dot(p,7/z,P.cyan,true);this.label(options.nodeLabel.text,{x:p.x,y:p.y-22/z},P.cyan,`${options.nodeLabel.id}:node`);}
            if(!this.bw&&connection&&pointer&&ends.has(connection)){const p=ends.get(connection),target=snap?.kind==='terminal'||snap?.kind==='junction'?ends.get(snap.id):pointer;this.stroke(D.connectionPath(doc,p,target),P.amber,1.5/z);}
            if(!this.bw&&solution){
                for(const comp of doc.components){const r=solution.componentResults[comp.id];if(!r)continue;
                    if(selected?.id===comp.id&&Number.isFinite(r.current)&&Math.abs(r.current)>=1e-14){const vertical=Math.abs(Math.sin(comp.rotation*Math.PI/180))>.5;this.arrow({x:comp.position.x-(vertical?35/z:0),y:comp.position.y+(vertical?0:35/z),angle:comp.rotation*Math.PI/180},r.current,P.cyan);}
                    if(options.currents&&r.current!==null){const p={x:comp.position.x,y:comp.position.y+34/z,angle:comp.rotation*Math.PI/180};if(Math.abs(r.current)>1e-14)this.arrow(p,r.current*(options.electrons?-1:1),P.cyan);this.label(D.format(r.current,'A'),{x:p.x,y:p.y+13/z},P.cyan);}
                    if(options.drops)this.label(`${D.format(r.voltage,'V')} A−B`,{x:comp.position.x,y:comp.position.y+20/z},P.amber);
                    if(!options.simple&&(options.terminals||selected?.id===comp.id))comp.terminals.forEach((id,i)=>{const p=ends.get(id),pot=[r.va,r.vb,r.vsa,r.vsb][i];this.label(`${D.terminalName(comp,i)} ${D.format(pot,'V')}${r.local?' · local':''}`,{x:p.x,y:p.y-15/z},P.amber);});
                }
                if(options.nodes){const compiled=D.compileCircuit(doc);for(const net of compiled.nets){const anchor=ends.get(net.endpoints.find(id=>ends.get(id).kind==='junction')||net.endpoints[0]),r=solution.nodeVoltages[net.id];if(r)this.label(`${net.label} ${D.format(r.value,'V')}${r.local?' local':''}`,{x:anchor.x,y:anchor.y-24/z},P.accent);}}
            }
            if(!this.bw&&!doc.components.length&&!placement)this.text('Place a component, then connect its terminal dots.',(left+right)/2,(top+bottom)/2,P.muted,13);
            if(!this.bw&&placement){c.save();c.globalAlpha=.6;this.symbol(placement,null,false,false,false);c.restore();}
            c.restore();
        }
        renderBWCanvas(doc){
            if(!doc||(!doc.components.length&&!doc.wires.length&&!doc.junctions.length))return null;
            const {ends,paths}=this.geometry(doc);
            const pts=[];
            for(const p of ends.values())pts.push(p);
            for(const path of paths.values())for(const p of path)pts.push(p);
            for(const comp of doc.components){
                const vertical=Math.abs(Math.sin((comp.rotation||0)*Math.PI/180))>.5;
                const rx=vertical?95:70,ry=vertical?68:72;
                pts.push({x:comp.position.x-rx,y:comp.position.y-ry},{x:comp.position.x+rx,y:comp.position.y+ry});
            }
            for(const id of doc.referenceEndpoints){const p=ends.get(id);if(p)pts.push({x:p.x-24,y:p.y},{x:p.x+48,y:p.y+46});}
            if(!pts.length)return null;
            const pad=56;
            const minX=Math.min(...pts.map(p=>p.x))-pad,maxX=Math.max(...pts.map(p=>p.x))+pad;
            const minY=Math.min(...pts.map(p=>p.y))-pad,maxY=Math.max(...pts.map(p=>p.y))+pad;
            const w=Math.max(480,Math.ceil(maxX-minX)),h=Math.max(300,Math.ceil(maxY-minY));
            const dpr=Math.max(1,Math.min(2.5,3400/Math.max(w,h)));
            const off=document.createElement('canvas');
            off.width=Math.round(w*dpr);off.height=Math.round(h*dpr);
            const bwRen=new Renderer(off,{offscreen:true,bw:true});
            bwRen.width=w;bwRen.height=h;bwRen.dpr=dpr;
            bwRen.view={zoom:1,panX:-(minX+maxX)/2,panY:-(minY+maxY)/2};
            bwRen.draw(doc,null,{});
            return off;
        }
    }
    Object.assign(D,{Renderer,route,pathPoint,distanceToSegment});
})(window);

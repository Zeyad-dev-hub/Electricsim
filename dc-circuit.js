(function(){
    'use strict';
    const D=window.DCCircuit,$=id=>document.getElementById(id),canvas=$('circuitCanvas');
    const renderer=new D.Renderer(canvas),simulation=new D.Simulation(),motion=new D.CurrentMotion();
    const units={resistor:[[1,'Ω'],[1e3,'kΩ'],[1e6,'MΩ']],lamp:[[1,'Ω'],[1e3,'kΩ'],[1e6,'MΩ']],capacitor:[[1,'F'],[1e-3,'mF'],[1e-6,'µF'],[1e-9,'nF']],voltage:[[1,'V'],[1e-3,'mV']]};
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    let tool='select',selected=null,connection=null,pointer=null,drag=null,draft=null,pinch=null;
    let running=false,stepTarget=null,targetTime=0,lastFrame=performance.now(),lastRefresh=0,scheduled=false,scaleReady=false,selectionDoc=null;
    const pointers=new Map(),doc=()=>simulation.doc,component=()=>doc().components.find(c=>c.id===selected?.id);
    const snap=p=>D.snapTarget(doc(),p,12/renderer.view.zoom);
    function message(text,bad=false){
        if($('status').textContent!==text)$('status').textContent=text;
        $('status').classList.toggle('error',bad);
    }
    function requestDraw(){if(!scheduled){scheduled=true;requestAnimationFrame(frame);}}
    let viewportWidth=window.innerWidth;
    renderer.onresize=()=>{if(viewportWidth!==window.innerWidth){viewportWidth=window.innerWidth;renderer.fit(doc());}requestDraw();};
    function readyMessage(){
        if(simulation.error)message('Circuit cannot be solved: '+simulation.error.message,true);
        else message(doc().components.length?(running?'Running':'Paused')+' · voltage A − B; current A → B.':'Place a component, then connect its terminal dots with Wire.');
    }
    function option(value,text){const e=document.createElement('option');e.value=value;e.textContent=text;return e;}
    function selectionValue(hit){return hit?`${hit.kind}:${hit.id}`:'';}
    function syncSelection(){
        if(selectionDoc===doc()){$('selectionSelect').value=selectionValue(selected);return;}
        selectionDoc=doc();const options=[option('','Choose an object')];
        for(const c of doc().components){options.push(option(`component:${c.id}`,`${c.label} · ${c.type==='voltage'?'battery':c.type}`));c.terminals.forEach((id,i)=>options.push(option(`terminal:${id}`,`${c.label} terminal ${i?'B':'A'}`)));}
        for(const j of doc().junctions)options.push(option(`junction:${j.id}`,`Junction ${doc().junctions.indexOf(j)+1}`));
        doc().wires.forEach((w,i)=>options.push(option(`wire:${w.id}`,`Wire ${i+1}`)));
        doc().referenceEndpoints.forEach((id,i)=>options.push(option(`ground:${id}`,`Ground ${i+1}`)));
        $('selectionSelect').replaceChildren(...options);$('selectionSelect').value=selectionValue(selected);
    }
    function sync(){
        $('undoBtn').disabled=!simulation.history.undoStack.length;$('redoBtn').disabled=!simulation.history.redoStack.length;
        const invalid=!!simulation.error||!doc().components.length;
        $('runBtn').disabled=invalid;$('stepBtn').disabled=invalid||running||stepTarget!==null;$('resetBtn').disabled=!doc().components.length;
        $('runBtn').textContent=running?'Ⅱ Pause':'▶ Run';$('runBtn').setAttribute('aria-pressed',String(running));
        $('connectSelectedBtn').hidden=!['wire','ground'].includes(tool);
        $('connectSelectedBtn').textContent=tool==='ground'?'Ground selected endpoint':'Use selected endpoint';
        $('connectSelectedBtn').disabled=!selected||!['terminal','junction'].includes(selected.kind);
        syncSelection();const c=component();
        $('inspector').hidden=!selected;$('componentEditor').hidden=!c;$('objectEditor').hidden=!!c||!selected;
        if(c){
            $('selectedTitle').textContent=c.label+' · '+(c.type==='voltage'?'battery':c.type);
            $('valueRow').hidden=c.type==='switch';$('valueInput').disabled=c.type==='switch';
            $('toggleSwitchBtn').hidden=c.type!=='switch';$('capacitorNote').hidden=c.type!=='capacitor';
            $('lampNote').hidden=c.type!=='lamp';$('switchNote').hidden=c.type!=='switch';
            $('valueLabel').textContent=c.type==='lamp'?'Resistance':'Value';
            if(c.type==='switch'){$('toggleSwitchBtn').textContent=c.closed?'Open switch':'Close switch';$('toggleSwitchBtn').setAttribute('aria-pressed',String(c.closed));}
            else{
                const choices=units[c.type]||[[1,'A']];$('unitSelect').replaceChildren(...choices.map(([scale,label])=>option(scale,label)));
                const unit=choices.find(([scale])=>Math.abs(c.value)>=scale)||choices.at(-1);
                $('unitSelect').value=unit[0];$('valueInput').value=Number((c.value/unit[0]).toPrecision(10));
            }
        }else if(selected){
            $('objectTitle').textContent={wire:'Wire',ground:'Ground · 0 V',junction:'Junction',terminal:'Terminal'}[selected.kind]||'Connection';
            $('objectDescription').textContent=selected.kind==='ground'?'All ground symbols connect to the same electrical net. Delete removes this reference attachment.':selected.kind==='wire'?'The arrow follows positive current from the start to the end of this route. Alt-drag to move a segment.':selected.kind==='terminal'?'Use Wire or Ground with this endpoint. Delete the component to remove its terminal.':'An explicit electrical connection. Drag to move; Delete removes its attached wires.';
            $('deleteObjectBtn').disabled=selected.kind==='terminal';
        }
        refreshMeasurements(true);requestDraw();
    }
    function select(hit){selected=hit;sync();}
    function pause(){running=false;stepTarget=null;if(simulation.state)targetTime=simulation.state.time;sync();}
    function afterEdit(changed,wasRunning=false,live=false){
        if(changed){running=false;stepTarget=null;targetTime=simulation.state?.time||0;}
        if(simulation.error){running=false;stepTarget=null;}
        if(live&&wasRunning&&!simulation.error)running=true;
        lastFrame=performance.now();readyMessage();sync();
    }
    function commit(next,live=false){
        try{const wasRunning=running,before=doc(),changed=simulation.commit(next);motion.reconcile(before,doc());afterEdit(changed,wasRunning,live);return true;}
        catch(error){message(error.message,true);return false;}
    }
    function setTool(next){
        tool=next;connection=null;
        document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
        $('toolHint').textContent=tool==='wire'?'Click a terminal or wire to start. Empty clicks create grid junctions; an existing connection finishes. Crossings join only with a dot. Esc ends the wire.':tool==='ground'?'Attach ground to a terminal, junction or wire. All ground symbols connect to the same net.':tool==='pan'?'Drag to pan. Use two fingers to pan and pinch to zoom, or use the zoom buttons.':tool==='select'?'Click to edit; drag to move. R rotates, Delete removes. Scroll to zoom; right-drag pans. Alt-drag a wire moves its segment.':'Click the canvas to add a '+(tool==='voltage'?'battery':tool)+'.';
        canvas.style.cursor=['select','pan'].includes(tool)?tool==='pan'?'grab':'default':'crosshair';sync();
    }
    function activate(p){
        if(tool==='wire'||tool==='ground'){
            const next=D.clone(doc()),target=snap(p),from=connection;
            const clicked=D.connectClick(next,tool==='wire'?from:null,target.point,12/renderer.view.zoom);
            if(tool==='ground'){
                if(!next.referenceEndpoints.includes(clicked.id))next.referenceEndpoints.push(clicked.id);
                if(commit(next))select({kind:'ground',id:clicked.id});
            }else if(commit(next)){
                selected=null;connection=from&&(clicked.existing||clicked.id===from)?null:clicked.id;sync();
            }
            return;
        }
        if(units[tool]||tool==='switch'){
            const next=D.clone(doc()),prefix={resistor:'R',lamp:'L',capacitor:'C',voltage:'V',switch:'S'}[tool];let n=1;
            while(next.components.some(c=>c.label===prefix+n))n++;
            const c=D.component(tool,Math.round(p.x/24)*24,Math.round(p.y/24)*24,prefix+n);next.components.push(c);
            if(commit(next)){setTool('select');select({kind:'component',id:c.id});}return;
        }
        select(renderer.hit(doc(),p));
    }
    function rotate(){const c=component();if(!c)return;const next=D.clone(doc());next.components.find(x=>x.id===c.id).rotation=(c.rotation+90)%360;commit(next);}
    function remove(){
        if(!selected)return;const next=D.clone(doc());
        if(selected.kind==='component')D.removeComponent(next,selected.id);
        else if(selected.kind==='wire')next.wires=next.wires.filter(w=>w.id!==selected.id);
        else if(selected.kind==='ground')next.referenceEndpoints=next.referenceEndpoints.filter(id=>id!==selected.id);
        else if(selected.kind==='junction')D.removeJunction(next,selected.id);else return;
        selected=null;connection=null;commit(next);
    }
    function undo(redo=false){
        const wasRunning=running,before=doc(),changed=simulation.undo(redo);if(changed===null)return;motion.reconcile(before,doc());
        selected=null;connection=null;afterEdit(changed,wasRunning,!changed);
    }
    function calibrate(){
        if($('flowScale').value==='auto')motion.calibrate(simulation.state?.acceptedSolution);
        else motion.reference=Number($('flowScale').value);
        scaleReady=true;
    }
    function play(){
        if(simulation.error||!simulation.state)return;
        if(!scaleReady)calibrate();running=true;stepTarget=null;targetTime=simulation.state.time;lastFrame=performance.now();readyMessage();sync();
    }
    function toggleRun(){if(running){pause();readyMessage();}else play();}
    function toggleSwitch(){const c=component();if(c?.type!=='switch')return;const next=D.clone(doc());next.components.find(x=>x.id===c.id).closed=!c.closed;commit(next,true);}
    function useSelected(){const end=D.endpoints(doc()).get(selected?.id);if(end)activate(end);}
    function zoom(factor,clientX,clientY){
        const rect=canvas.getBoundingClientRect();clientX??=rect.left+rect.width/2;clientY??=rect.top+rect.height/2;
        const before=renderer.world(clientX,clientY);renderer.view.zoom=Math.max(.1,Math.min(3,renderer.view.zoom*factor));
        const after=renderer.world(clientX,clientY);renderer.view.panX+=(after.x-before.x)*renderer.view.zoom;renderer.view.panY+=(after.y-before.y)*renderer.view.zoom;requestDraw();
    }
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=>{
        if(e.button!==0&&e.button!==2)return;
        canvas.focus();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
        pointer=renderer.world(e.clientX,e.clientY);
        if(pointers.size===2&&['select','pan'].includes(tool)){
            const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};drag=null;draft=null;requestDraw();return;
        }
        if(pointers.size>1)return;
        if(e.button===2||tool==='pan'){
            if(connection){connection=null;requestDraw();return;}
            drag={kind:'pan',pointerId:e.pointerId,x:e.clientX,y:e.clientY,view:{...renderer.view}};return;
        }
        const hit=renderer.hit(doc(),pointer);
        if(tool==='select'&&['component','junction'].includes(hit?.kind)){
            select(hit);drag={kind:hit.kind,id:hit.id,pointerId:e.pointerId,start:pointer,original:D.clone(doc()),moved:false};draft=D.clone(doc());
        }else if(tool==='select'&&hit?.kind==='wire'&&e.altKey){
            select(hit);const wire=doc().wires.find(w=>w.id===hit.id),path=D.wireRoute(doc(),wire);let segment=1,best=Infinity;
            for(let i=1;i<path.length;i++){const d=D.distanceToSegment(pointer,path[i-1],path[i]);if(d<best){best=d;segment=i;}}
            drag={kind:'wire',id:hit.id,pointerId:e.pointerId,start:pointer,path,segment,moved:false};draft=D.clone(doc());
        }else activate(pointer);
    });
    canvas.addEventListener('pointermove',e=>{
        if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(pinch&&pointers.size===2){
            const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
            zoom(distance/Math.max(1,pinch.distance),pinch.mid.x,pinch.mid.y);renderer.view.panX+=mid.x-pinch.mid.x;renderer.view.panY+=mid.y-pinch.mid.y;pinch={distance,mid};requestDraw();return;
        }
        pointer=renderer.world(e.clientX,e.clientY);
        if(!drag){if(['wire','ground'].includes(tool))requestDraw();return;}
        if(drag.pointerId!==e.pointerId)return;
        if(drag.kind==='pan'){renderer.view.panX=drag.view.panX+e.clientX-drag.x;renderer.view.panY=drag.view.panY+e.clientY-drag.y;requestDraw();return;}
        const dx=pointer.x-drag.start.x,dy=pointer.y-drag.start.y;
        if(drag.kind==='wire'){
            const {path,segment}=drag,a=path[segment-1],b=path[segment],vertical=Math.abs(a.x-b.x)<1e-7;
            const offset=Math.round((vertical?dx:dy)/24)*24,shift=p=>vertical?{x:p.x+offset,y:p.y}:{x:p.x,y:p.y+offset};
            draft.wires.find(w=>w.id===drag.id).waypoints=[...path.slice(1,segment-1),shift(a),shift(b),...path.slice(segment+1,-1)];
        }else{
            const array=drag.kind==='component'?'components':'junctions',item=draft[array].find(c=>c.id===drag.id),old=drag.original[array].find(c=>c.id===drag.id);
            item.position={x:Math.round((old.position.x+dx)/24)*24,y:Math.round((old.position.y+dy)/24)*24};
        }
        drag.moved=Math.hypot(dx,dy)*renderer.view.zoom>3;renderer.invalidate();requestDraw();
    });
    function endPointer(e,cancel=false){
        pointers.delete(e.pointerId);
        if(pinch){pinch=null;drag=null;draft=null;requestDraw();return;}
        if(drag?.pointerId===e.pointerId){if(!cancel&&draft&&drag.moved)commit(draft);drag=null;draft=null;renderer.invalidate();requestDraw();}
    }
    canvas.addEventListener('pointerup',e=>endPointer(e));canvas.addEventListener('pointercancel',e=>endPointer(e,true));
    canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(Math.exp(-e.deltaY*.001),e.clientX,e.clientY);},{passive:false});
    document.addEventListener('keydown',e=>{
        if(e.target.matches('input,select,textarea,[contenteditable]'))return;
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);return;}
        if(e.target!==canvas)return;
        if(e.key==='Escape'){connection=null;setTool('select');}
        if(e.key.toLowerCase()==='r')rotate();
        if(e.key===' '){e.preventDefault();if(component()?.type==='switch')toggleSwitch();else toggleRun();}
        if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}
        if(e.key==='Enter'){e.preventDefault();if(['wire','ground'].includes(tool)&&['terminal','junction'].includes(selected?.kind))useSelected();else activate(renderer.center());}
        if(e.key==='['||e.key===']'){
            const parts=doc().components;if(!parts.length)return;const index=parts.findIndex(c=>c.id===selected?.id),next=(index+(e.key===']'?1:-1)+parts.length)%parts.length;select({kind:'component',id:parts[next].id});
        }
        const movement={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]}[e.key];
        if(movement&&component()){
            e.preventDefault();const next=D.clone(doc()),c=next.components.find(c=>c.id===selected.id);c.position.x+=movement[0];c.position.y+=movement[1];commit(next);
        }
    });
    $('componentEditor').onsubmit=e=>{
        e.preventDefault();const c=component();if(!c||c.type==='switch')return;
        const value=Number($('valueInput').value)*Number($('unitSelect').value);
        if(!Number.isFinite(value)||(['resistor','lamp','capacitor'].includes(c.type)&&value<=0)){message('Resistance and capacitance must be positive, finite values.',true);return;}
        const next=D.clone(doc());next.components.find(x=>x.id===c.id).value=value;commit(next);
    };
    $('rotateBtn').onclick=rotate;$('deleteBtn').onclick=remove;$('deleteObjectBtn').onclick=remove;
    $('closeEditorBtn').onclick=$('closeObjectBtn').onclick=()=>select(null);
    $('undoBtn').onclick=()=>undo();$('redoBtn').onclick=()=>undo(true);$('toggleSwitchBtn').onclick=toggleSwitch;$('runBtn').onclick=toggleRun;
    $('selectionSelect').onchange=()=>{const value=$('selectionSelect').value,index=value.indexOf(':');select(value?{kind:value.slice(0,index),id:value.slice(index+1)}:null);};
    $('connectSelectedBtn').onclick=useSelected;
    $('fitBtn').onclick=()=>{renderer.fit(doc());requestDraw();};$('zoomInBtn').onclick=()=>zoom(1.25);$('zoomOutBtn').onclick=()=>zoom(.8);
    $('resetBtn').onclick=()=>{pause();simulation.reset();motion.reset();scaleReady=false;targetTime=0;readyMessage();sync();};
    $('stepBtn').onclick=()=>{if(!simulation.state||simulation.error)return;if(!scaleReady)calibrate();pause();stepTarget=simulation.state.time+.01;sync();};
    $('clearBtn').onclick=()=>{pause();selected=null;connection=null;if(commit(D.blank())){simulation.reset();motion.reset();scaleReady=false;renderer.view={panX:0,panY:0,zoom:1};setTool('select');}};
    $('flowScale').onchange=()=>{calibrate();requestDraw();};$('motionToggle').onchange=requestDraw;
    $('timeScale').onchange=()=>{lastFrame=performance.now();requestDraw();};
    document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
    $('motionToggle').checked=!reducedMotion.matches;
    reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)$('motionToggle').checked=false;requestDraw();});
    document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();if(simulation.state)targetTime=simulation.state.time;if(!document.hidden)requestDraw();});
    function detail(label,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;return [dt,dd];}
    function exact(value,unit){return Number.isFinite(value)?`${Number(value.toPrecision(6))} ${unit}`:'Unavailable';}
    function refreshMeasurements(force=false){
        const now=performance.now();if(!force&&now-lastRefresh<200)return;lastRefresh=now;
        const solution=simulation.error?null:simulation.state?.acceptedSolution,c=component(),rows=[];
        for(const item of doc().components){const r=solution?.componentResults[item.id],tr=document.createElement('tr');for(const text of [item.label,D.reading(r?.voltage,'V'),D.reading(r?.current,'A'),D.format(r?.power,'W')]){const td=document.createElement('td');td.textContent=text;tr.append(td);}rows.push(tr);}
        $('measurementRows').replaceChildren(...rows);
        const details=[];
        if(c){
            const r=solution?.componentResults[c.id];details.push(...detail('Voltage A − B',D.reading(r?.voltage,'V')),...detail('Current A → B',D.reading(r?.current,'A')),...detail('Current, detail',exact(r?.current,'A')),...detail('Power',D.format(r?.power,'W')));
            if(r){details.push(...detail('Terminal A',D.format(r.va,'V')+(solution.nodeVoltages[simulation.compiled.netOf.get(c.terminals[0])]?.local?' · local':'')),...detail('Terminal B',D.format(r.vb,'V')+(solution.nodeVoltages[simulation.compiled.netOf.get(c.terminals[1])]?.local?' · local':'')));}
            if(c.type==='capacitor')details.push(...detail('Charge on A',D.format(r?.charge,'C')),...detail('Stored energy',D.format(r?.energy,'J')),...detail('State',!r?'Unavailable':Math.abs(r.power||0)<1e-12?'Holding':r.power>0?'Charging':'Discharging'));
            if(c.type==='voltage'&&r)details.push(...detail('Source',Math.abs(r.power||0)<1e-12?'Idle':r.power<0?'Delivering power':'Absorbing power'));
            if(c.type==='switch')details.push(...detail('State',c.closed?'Closed':'Open'));
            if(c.type==='lamp')details.push(...detail('Lamp',!r?'Unavailable':D.lampBrightness(r)>0?'Lit':'Off'),...detail('Glow',!r?'Unavailable':`${Number((D.lampBrightness(r)*100).toPrecision(3))}%`));
            if(solution?.initialCurrentEstimate)details.push(...detail('Initial current','Right-limit estimate'));
        }else if(selected?.kind==='wire'){
            const r=solution?.wireResults[selected.id];details.push(...detail('Current',!solution?'Unavailable':Number.isFinite(r?.current)?D.reading(r.current,'A'):'Indeterminate wire loop'),...detail('Current, detail',exact(r?.current,'A')));
        }else if(selected){
            const net=simulation.compiled?.netOf.get(selected.id),r=solution?.nodeVoltages[net];details.push(...detail('Potential',r?D.format(r.value,'V')+(r.local?' · local reference':' · ground reference'):'Unavailable'));
        }
        if(selected&&solution)details.push(...detail('Measurement time',D.format(simulation.state.time,'s')));
        $('selectedReadings').replaceChildren(...details);
    }
    function frame(now){
        scheduled=false;const dt=Math.max(0,(now-lastFrame)/1000);lastFrame=now;
        if(!document.hidden&&(running||stepTarget!==null)&&!simulation.error&&simulation.state){
            if(running)targetTime+=dt*Number($('timeScale').value);
            const previous=simulation.state;
            try{
                const state=simulation.advance(stepTarget??targetTime,{budgetMs:8,maxAttempts:120});
                if($('motionToggle').checked&&!reducedMotion.matches)motion.advance(state.acceptedSolution,state.time-previous.time,previous.acceptedSolution);
                if(state.behind)message('Calculating capacitor response · '+D.format((stepTarget??targetTime)-state.time,'s')+' behind target.');
                else{if(stepTarget!==null){stepTarget=null;sync();}readyMessage();}
            }catch(error){simulation.error=error;running=false;stepTarget=null;message('Circuit cannot be solved: '+error.message,true);sync();}
        }
        const solution=simulation.error?null:simulation.state?.acceptedSolution;
        refreshMeasurements();$('timeReadout').textContent=D.format(simulation.state?.time??simulation.retained?.time??0,'s');
        $('flowLegend').textContent='Conventional current · speed ∝ current · '+D.format(motion.reference,'A')+' reference'+(motion.clipped?' · speed capped; increase scale':'')+(reducedMotion.matches?' · reduced motion':'');
        renderer.draw(draft||doc(),solution,{selected,errors:simulation.error?.ids||[],connection,pointer:pointer&&['wire','ground'].includes(tool)?snap(pointer).point:pointer,snap:pointer&&['wire','ground'].includes(tool)?snap(pointer):null,motion,options:{simple:true,readings:solution,markers:!simulation.error&&$('motionToggle').checked&&!reducedMotion.matches}});
        if(!document.hidden&&(running||stepTarget!==null))requestDraw();
    }
    readyMessage();sync();requestDraw();
})();

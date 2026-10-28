(function(){
    'use strict';
    const D=window.DCCircuit,$=id=>document.getElementById(id),canvas=$('circuitCanvas');
    const renderer=new D.Renderer(canvas),simulation=new D.Simulation(),motion=new D.CurrentMotion();
    const units={resistor:[[1,'Ω'],[1e3,'kΩ'],[1e6,'MΩ']],lamp:[[1,'Ω'],[1e3,'kΩ'],[1e6,'MΩ']],capacitor:[[1,'F'],[1e-3,'mF'],[1e-6,'µF'],[1e-9,'nF']],voltage:[[1,'V'],[1e-3,'mV']],ac:[[1,'V'],[1e-3,'mV']]};
    const TYPE_LABEL={voltage:'battery',ac:'AC source',diode:'diode',transformer:'transformer',resistor:'resistor',lamp:'lamp',capacitor:'capacitor',switch:'switch',current:'current source'};
    const typeName=t=>TYPE_LABEL[t]||t;
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    let tool='select',selected=null,connection=null,pointer=null,drag=null,draft=null,pinch=null,placement=null,gesture=false;
    let running=false,stepTarget=null,targetTime=0,lastFrame=performance.now(),lastRefresh=0,scheduled=false,scaleReady=false,selectionDoc=null;
    const pointers=new Map(),doc=()=>simulation.doc,component=()=>doc().components.find(c=>c.id===selected?.id);
    let pointerTouch=false,lastTableDoc=null,lastTableSolution=null,lastReading=null;
    const snap=p=>D.snapTarget(doc(),p,(pointerTouch?22:12)/renderer.view.zoom,renderer.geometry(doc()));
    const placePoint=(p,free=false)=>$('snapToggle').checked&&!free?{x:Math.round(p.x/24)*24,y:Math.round(p.y/24)*24}:{...p};
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
        for(const c of doc().components){options.push(option(`component:${c.id}`,`${c.label} · ${typeName(c.type)}`));c.terminals.forEach((id,i)=>options.push(option(`terminal:${id}`,`${c.label} terminal ${D.terminalName(c,i)}`)));}
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
        $('rotatePlacementBtn').hidden=!placement;
        syncSelection();const c=component();
        $('inspector').hidden=!selected;$('componentEditor').hidden=!c;$('objectEditor').hidden=!!c||!selected;
        if(c){
            $('selectedTitle').textContent=c.label+' · '+typeName(c.type);
            const hideValue=['switch','diode','transformer'].includes(c.type);
            $('valueRow').hidden=hideValue;$('valueInput').disabled=hideValue;
            $('acExtra').hidden=c.type!=='ac';
            $('transformerRow').hidden=c.type!=='transformer';
            $('toggleSwitchBtn').hidden=c.type!=='switch';$('capacitorNote').hidden=c.type!=='capacitor';
            $('lampNote').hidden=c.type!=='lamp';$('switchNote').hidden=c.type!=='switch';
            $('diodeNote').hidden=c.type!=='diode';$('acNote').hidden=c.type!=='ac';$('transformerNote').hidden=c.type!=='transformer';
            $('valueLabel').textContent=c.type==='lamp'?'Resistance':c.type==='ac'?'Peak voltage':'Value';
            if(c.type==='switch'){$('toggleSwitchBtn').textContent=c.closed?'Open switch':'Close switch';$('toggleSwitchBtn').setAttribute('aria-pressed',String(c.closed));}
            else if(c.type==='transformer'){
                $('turnsPrimaryInput').value=Number.isInteger(c.turnsPrimary)?String(c.turnsPrimary):'';
                $('turnsSecondaryInput').value=Number.isInteger(c.turnsSecondary)?String(c.turnsSecondary):'';
            }else if(!hideValue){
                const choices=units[c.type]||[[1,'A']];$('unitSelect').replaceChildren(...choices.map(([scale,label])=>option(scale,label)));
                const unit=choices.find(([scale])=>Math.abs(c.value)>=scale)||choices.at(-1);
                $('unitSelect').value=unit[0];$('valueInput').value=Number((c.value/unit[0]).toPrecision(10));
                if(c.type==='ac'){$('frequencyInput').value=String(c.frequency??1);$('phaseInput').value=String(c.phase??0);}
            }
        }else if(selected){
            $('objectTitle').textContent={wire:'Wire',ground:'Ground · 0 V',junction:'Junction',terminal:'Terminal'}[selected.kind]||'Connection';
            $('objectDescription').textContent=selected.kind==='ground'?'All ground symbols connect to the same electrical net. Delete removes this reference attachment.':selected.kind==='wire'?'Drag a segment to reshape this route. Its electrical connections stay attached. The arrow follows positive current from start to end.':selected.kind==='terminal'?'Use Wire or Ground with this endpoint. Delete the component to remove its terminal.':'An explicit electrical connection. Drag to move; Delete removes its attached wires.';
            $('deleteObjectBtn').disabled=selected.kind==='terminal';
        }
        refreshMeasurements(true);requestDraw();
    }
    function select(hit){if(hit&&placement)setTool('select');selected=hit;sync();}
    function pause(){running=false;stepTarget=null;if(simulation.state)targetTime=simulation.state.time;sync();}
    function afterEdit(changed,wasRunning=false,live=false){
        if(changed){running=false;stepTarget=null;targetTime=simulation.state?.time||0;}
        if(simulation.error){running=false;stepTarget=null;}
        if(live&&wasRunning&&!simulation.error)running=true;
        lastFrame=performance.now();readyMessage();sync();
    }
    function commit(next,live=false){
        if(drag||pinch){gesture=pointers.size>0;cancelDrag();}
        try{const wasRunning=running,before=doc(),changed=simulation.commit(next);motion.reconcile(before,doc());afterEdit(changed,wasRunning,live);return true;}
        catch(error){message(error.message,true);return false;}
    }
    function cancelDrag(){if(drag?.kind==='pan')renderer.view=drag.view;drag=null;draft=null;pinch=null;pointer=null;renderer.invalidate();requestDraw();}
    function setTool(next,template=null){
        cancelDrag();tool=next;connection=null;
        const placeable=Boolean(units[tool]||['switch','diode','transformer'].includes(tool));
        placement=placeable?D.component(tool,0,0,'Next '+typeName(tool)):null;
        if(placement)selected=null;
        if(placement&&template){
            placement.value=template.value;placement.rotation=template.rotation;
            if(template.type==='switch')placement.closed=template.closed;
            if(template.type==='capacitor')placement.initialVoltage=template.initialVoltage;
            if(template.type==='ac'){placement.frequency=template.frequency;placement.phase=template.phase;}
            if(template.type==='transformer'){placement.turnsPrimary=template.turnsPrimary;placement.turnsSecondary=template.turnsSecondary;}
        }
        document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
        $('toolHint').textContent=tool==='wire'?'Tap a terminal or wire to start; tap another to finish. Empty taps add bends. Crossings join only with a dot. Esc ends the wire. Two fingers pan and zoom.':tool==='ground'?'Tap a terminal, junction or wire to attach ground. All ground symbols connect to the same net. Two fingers pan and zoom.':tool==='pan'?'Drag to pan. Use two fingers to pan and pinch to zoom, or use the zoom buttons.':tool==='select'?'Tap to edit; drag parts or wire segments to move. Drag empty space to pan. R rotates; Shift allows fine movement. Two fingers pan and zoom.':'Tap to place a '+typeName(tool)+', or press and slide to position it. Rotate next changes its orientation. Keep placing adds more; Esc finishes.';
        canvas.style.cursor=['select','pan'].includes(tool)?tool==='pan'?'grab':'default':'crosshair';sync();
    }
    function activate(p,free=false){
        if(tool==='wire'||tool==='ground'){
            const next=D.clone(doc()),target=snap(p),from=connection;
            if(target.kind==='grid')target.point=placePoint(p,free);
            const clicked=D.connectClick(next,tool==='wire'?from:null,target.point,(pointerTouch?22:12)/renderer.view.zoom);
            if(tool==='ground'){
                if(!next.referenceEndpoints.includes(clicked.id))next.referenceEndpoints.push(clicked.id);
                if(commit(next))select({kind:'ground',id:clicked.id});
            }else if(commit(next)){
                selected=null;connection=from&&(clicked.existing||clicked.id===from)?null:clicked.id;sync();
            }
            return;
        }
        if(placement){
            const next=D.clone(doc()),prefix=D.PREFIX[tool]||'X';let n=1;
            while(next.components.some(c=>c.label===prefix+n))n++;
            const c=D.component(tool,0,0,prefix+n);c.value=placement.value;c.rotation=placement.rotation;c.position=placePoint(p,free);
            if(tool==='switch')c.closed=placement.closed;
            if(tool==='capacitor')c.initialVoltage=placement.initialVoltage;
            if(tool==='ac'){c.frequency=placement.frequency;c.phase=placement.phase;}
            if(tool==='transformer'){c.turnsPrimary=placement.turnsPrimary;c.turnsSecondary=placement.turnsSecondary;}
            next.components.push(c);
            if(commit(next)){const repeated=$('repeatToggle').checked;if(!repeated)setTool('select');select(repeated?null:{kind:'component',id:c.id});}return;
        }
        select(renderer.hit(doc(),p));
    }
    function rotate(){if(placement){placement.rotation=(placement.rotation+45)%360;requestDraw();return;}const c=component();if(!c)return;const next=D.clone(doc());next.components.find(x=>x.id===c.id).rotation=(c.rotation+45)%360;commit(next);}
    function duplicate(){const c=component();if(!c)return;setTool(c.type,c);select(null);canvas.focus({preventScroll:true});}
    function remove(){
        if(!selected)return;const next=D.clone(doc());
        if(selected.kind==='component')D.removeComponent(next,selected.id);
        else if(selected.kind==='wire')next.wires=next.wires.filter(w=>w.id!==selected.id);
        else if(selected.kind==='ground')next.referenceEndpoints=next.referenceEndpoints.filter(id=>id!==selected.id);
        else if(selected.kind==='junction')D.removeJunction(next,selected.id);else return;
        selected=null;connection=null;commit(next);
    }
    function undo(redo=false){
        if(drag||pinch){gesture=pointers.size>0;cancelDrag();}
        const wasRunning=running,before=doc(),changed=simulation.undo(redo);if(changed===null)return;motion.reconcile(before,doc());
        selected=null;connection=null;afterEdit(changed,wasRunning,!changed);
    }
    function calibrate(){
        if($('flowScale').value==='auto')motion.calibrate(simulation.state?.acceptedSolution,simulation.compiled);
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
        if(![0,1,2].includes(e.button))return;
        canvas.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);
        pointerTouch=e.pointerType==='touch';
        pointer=renderer.world(e.clientX,e.clientY);
        if(pointers.size===2){
            const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};gesture=true;drag=null;draft=null;renderer.invalidate();requestDraw();return;
        }
        if(pointers.size>1||gesture)return;
        const base={pointerId:e.pointerId,x:e.clientX,y:e.clientY,start:pointer,view:{...renderer.view},moved:false,threshold:pointerTouch?6:3,free:e.shiftKey,button:e.button};
        if(e.button!==0||tool==='pan'){
            drag={...base,kind:'pan'};return;
        }
        const hit=renderer.hit(doc(),pointer,{touch:pointerTouch,preferComponent:tool==='select'});
        if(tool==='select'&&['component','junction'].includes(hit?.kind)){
            drag={...base,kind:hit.kind,id:hit.id,hit,original:doc()};
        }else if(tool==='select'&&hit?.kind==='wire'){
            const wire=doc().wires.find(w=>w.id===hit.id),path=D.wireRoute(doc(),wire);let segment=1,best=Infinity;
            for(let i=1;i<path.length;i++){const d=D.distanceToSegment(pointer,path[i-1],path[i]);if(d<best){best=d;segment=i;}}
            drag={...base,kind:'wire',id:hit.id,hit,path,segment};
        }else if(tool==='select'&&!hit)drag={...base,kind:'pan',clearOnTap:true};
        else drag={...base,kind:'tap',hit};
        requestDraw();
    });
    canvas.addEventListener('pointermove',e=>{
        if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
        if(pinch&&pointers.size===2){
            const [a,b]=[...pointers.values()],distance=Math.hypot(a.x-b.x,a.y-b.y),mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
            zoom(distance/Math.max(1,pinch.distance),pinch.mid.x,pinch.mid.y);renderer.view.panX+=mid.x-pinch.mid.x;renderer.view.panY+=mid.y-pinch.mid.y;pinch={distance,mid};requestDraw();return;
        }
        pointer=renderer.world(e.clientX,e.clientY);
        if(gesture)return;
        if(!drag){if(placement||['wire','ground'].includes(tool))requestDraw();return;}
        if(drag.pointerId!==e.pointerId)return;
        drag.free=e.shiftKey;
        if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>drag.threshold)drag.moved=true;
        if(!drag.moved){if(placement)requestDraw();return;}
        if(drag.kind==='pan'){renderer.view.panX=drag.view.panX+e.clientX-drag.x;renderer.view.panY=drag.view.panY+e.clientY-drag.y;requestDraw();return;}
        if(drag.kind==='tap'){requestDraw();return;}
        if(!draft)draft=D.clone(doc());
        const dx=pointer.x-drag.start.x,dy=pointer.y-drag.start.y;
        if(drag.kind==='wire'){
            const {path,segment}=drag,a=path[segment-1],b=path[segment],vertical=Math.abs(a.x-b.x)<1e-7;
            const offset=vertical?dx:dy,shift=p=>vertical?{x:p.x+offset,y:p.y}:{x:p.x,y:p.y+offset};
            drag.offset=offset;
            draft.wires.find(w=>w.id===drag.id).waypoints=[...path.slice(1,segment-1),shift(a),shift(b),...path.slice(segment+1,-1)];
        }else{
            const array=drag.kind==='component'?'components':'junctions',item=draft[array].find(c=>c.id===drag.id),old=drag.original[array].find(c=>c.id===drag.id);
            item.position={x:old.position.x+dx,y:old.position.y+dy};
        }
        renderer.invalidate();requestDraw();
    });
    function endPointer(e,cancel=false){
        pointers.delete(e.pointerId);
        if(gesture){pinch=null;drag=null;draft=null;if(!pointers.size)gesture=false;requestDraw();return;}
        if(drag?.pointerId!==e.pointerId)return;
        const action=drag,next=draft;drag=null;draft=null;
        pointer=renderer.world(e.clientX,e.clientY);
        if(!cancel){
            if(next&&action.moved){
                if(action.kind==='wire'){
                    const {path,segment}=action,a=path[segment-1],b=path[segment],vertical=Math.abs(a.x-b.x)<1e-7,coordinate=vertical?a.x:a.y;
                    const offset=$('snapToggle').checked&&!e.shiftKey?Math.round((coordinate+action.offset)/24)*24-coordinate:action.offset,shift=p=>vertical?{x:p.x+offset,y:p.y}:{x:p.x,y:p.y+offset};
                    next.wires.find(w=>w.id===action.id).waypoints=[...path.slice(1,segment-1),shift(a),shift(b),...path.slice(segment+1,-1)];
                }else{const item=next[action.kind==='component'?'components':'junctions'].find(c=>c.id===action.id);item.position=placePoint(item.position,e.shiftKey);}
                if(commit(next))select(action.hit);
            }else if(action.kind==='tap'){
                if(tool==='select'){if(!action.moved)select(action.hit);}
                else if(placement||!action.moved)activate(pointer,e.shiftKey);
            }else if(!action.moved){
                if(action.clearOnTap)select(null);
                else if(action.hit)select(action.hit);
                else if(action.button===2&&connection){connection=null;requestDraw();}
            }
        }else if(action.kind==='pan')renderer.view=action.view;
        renderer.invalidate();requestDraw();
    }
    canvas.addEventListener('pointerup',e=>endPointer(e));canvas.addEventListener('pointercancel',e=>endPointer(e,true));canvas.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))endPointer(e,true);});
    canvas.addEventListener('pointerleave',()=>{if(!pointers.size){pointer=null;requestDraw();}});
    canvas.addEventListener('wheel',e=>{e.preventDefault();if(!pointers.size)zoom(Math.max(.8,Math.min(1.25,Math.exp(-e.deltaY*.001))),e.clientX,e.clientY);},{passive:false});
    document.addEventListener('keydown',e=>{
        if(e.target.matches('input,select,textarea,[contenteditable]'))return;
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);return;}
        if(e.target!==canvas)return;
        if(e.key==='Escape'){gesture=pointers.size>0;setTool('select');}
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();duplicate();return;}
        if(e.key.toLowerCase()==='r')rotate();
        if(e.key===' '){e.preventDefault();if(component()?.type==='switch')toggleSwitch();else toggleRun();}
        if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}
        if(e.key==='Enter'){e.preventDefault();if(['wire','ground'].includes(tool)&&['terminal','junction'].includes(selected?.kind))useSelected();else activate(renderer.center());}
        if(e.key==='['||e.key===']'){
            const parts=doc().components;if(!parts.length)return;const index=parts.findIndex(c=>c.id===selected?.id),next=(index+(e.key===']'?1:-1)+parts.length)%parts.length;select({kind:'component',id:parts[next].id});
        }
        const movement={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]}[e.key];
        if(movement&&component()){
            e.preventDefault();const next=D.clone(doc()),c=next.components.find(c=>c.id===selected.id),scale=e.shiftKey?1/24:1;c.position.x+=movement[0]*scale;c.position.y+=movement[1]*scale;commit(next);
        }
    });
    $('componentEditor').onsubmit=e=>{
        e.preventDefault();const c=component();if(!c||c.type==='switch'||c.type==='diode')return;
        if(c.type==='transformer'){
            const npRaw=$('turnsPrimaryInput').value.trim(),nsRaw=$('turnsSecondaryInput').value.trim();
            const np=Number(npRaw),ns=Number(nsRaw);
            if(!npRaw||!nsRaw||!Number.isInteger(np)||!Number.isInteger(ns)||np<1||ns<1||np>100000||ns>100000){
                message('Enter positive whole numbers from 1 to 100000 for both Np and Ns.',true);return;
            }
            const next=D.clone(doc()),target=next.components.find(x=>x.id===c.id);
            target.turnsPrimary=np;target.turnsSecondary=ns;commit(next);return;
        }
        const value=Number($('valueInput').value)*Number($('unitSelect').value);
        if(!Number.isFinite(value)||(['resistor','lamp','capacitor'].includes(c.type)&&value<=0)){message('Resistance and capacitance must be positive, finite values.',true);return;}
        const next=D.clone(doc()),target=next.components.find(x=>x.id===c.id);target.value=value;
        if(c.type==='ac'){
            const freq=Number($('frequencyInput').value),phase=Number($('phaseInput').value||0);
            if(!Number.isFinite(freq)||freq<=0||freq>1000||!Number.isFinite(phase)){message('Frequency must be above 0 and at most 1000 Hz.',true);return;}
            target.frequency=freq;target.phase=phase;
        }
        commit(next);
    };
    $('rotateBtn').onclick=rotate;$('deleteBtn').onclick=remove;$('deleteObjectBtn').onclick=remove;
    $('rotatePlacementBtn').onclick=rotate;$('duplicateBtn').onclick=duplicate;
    $('snapToggle').onchange=requestDraw;
    $('closeEditorBtn').onclick=$('closeObjectBtn').onclick=()=>select(null);
    $('undoBtn').onclick=()=>undo();$('redoBtn').onclick=()=>undo(true);$('toggleSwitchBtn').onclick=toggleSwitch;$('runBtn').onclick=toggleRun;
    $('selectionSelect').onchange=()=>{const value=$('selectionSelect').value,index=value.indexOf(':');select(value?{kind:value.slice(0,index),id:value.slice(index+1)}:null);};
    if($('exampleSelect')&&D.presets){
        const exOpts=[option('','Choose an example…')];
        for(const [id,preset] of Object.entries(D.presets)){
            if(id==='blank')continue;
            exOpts.push(option(id,preset.name));
        }
        $('exampleSelect').replaceChildren(...exOpts);
        $('exampleSelect').onchange=()=>{
            const id=$('exampleSelect').value;if(!id||!D.presets[id])return;
            pause();selected=null;connection=null;
            const next=D.makePreset(id);
            if(commit(next)){
                simulation.reset();motion.reset();scaleReady=false;targetTime=0;
                renderer.fit(doc());setTool('select');
                if(D.presets[id].question)message(D.presets[id].name+' · '+D.presets[id].question);
                requestDraw();
            }
        };
    }
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
    function abandonPointers(){cancelDrag();pointers.clear();gesture=false;}
    window.addEventListener('blur',abandonPointers);
    document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();if(simulation.state)targetTime=simulation.state.time;if(document.hidden)abandonPointers();else requestDraw();});
    function detail(label,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;return [dt,dd];}
    function exact(value,unit){return Number.isFinite(value)?`${Number(value.toPrecision(6))} ${unit}`:'Unavailable';}
    function refreshMeasurements(force=false){
        const now=performance.now();if(!force&&now-lastRefresh<200)return;lastRefresh=now;
        const solution=simulation.error?null:simulation.state?.acceptedSolution,c=component(),selection=selectionValue(selected),time=simulation.state?.time;
        if(!force&&lastReading?.doc===doc()&&lastReading.solution===solution&&lastReading.selection===selection&&lastReading.time===time)return;
        lastReading={doc:doc(),solution,selection,time};
        if(lastTableDoc!==doc()||lastTableSolution!==solution){
            const rows=[];for(const item of doc().components){const r=solution?.componentResults[item.id],tr=document.createElement('tr');for(const text of [item.label,D.reading(r?.voltage,'V'),D.reading(r?.current,'A'),D.format(r?.power,'W')]){const td=document.createElement('td');td.textContent=text;tr.append(td);}rows.push(tr);}
            $('measurementRows').replaceChildren(...rows);lastTableDoc=doc();lastTableSolution=solution;
        }
        const details=[];
        if(c){
            const r=solution?.componentResults[c.id];
            if(c.type==='transformer'){
                details.push(
                    ...detail('Turns ratio',r?.configured?`${c.turnsPrimary} : ${c.turnsSecondary} (${Number(r.ratio.toPrecision(4))}×)`:'Unconfigured'),
                    ...detail('Mode',!r?.configured?'Open (enter Np : Ns)':r.ratio>1?'Step-up':r.ratio<1?'Step-down':'1:1 isolation'),
                    ...detail('Primary V (P1 − P2)',D.reading(r?.primaryVoltage,'V')),
                    ...detail('Secondary V (S1 − S2)',D.reading(r?.secondaryVoltage,'V')),
                    ...detail('Primary I (P1 → P2)',D.reading(r?.primaryCurrent,'A')),
                    ...detail('Secondary I (S1 → S2)',D.reading(r?.secondaryCurrent,'A')),
                    ...detail('Power',D.format(r?.power,'W'))
                );
            }else{
                details.push(...detail('Voltage A − B',D.reading(r?.voltage,'V')),...detail('Current A → B',D.reading(r?.current,'A')),...detail('Current, detail',exact(r?.current,'A')),...detail('Power',D.format(r?.power,'W')));
                if(r){details.push(...detail('Terminal A',D.format(r.va,'V')+(solution.nodeVoltages[simulation.compiled.netOf.get(c.terminals[0])]?.local?' · local':'')),...detail('Terminal B',D.format(r.vb,'V')+(solution.nodeVoltages[simulation.compiled.netOf.get(c.terminals[1])]?.local?' · local':'')));}
                if(c.type==='capacitor')details.push(...detail('Charge on A',D.format(r?.charge,'C')),...detail('Stored energy',D.format(r?.energy,'J')),...detail('State',!r?'Unavailable':Math.abs(r.power||0)<1e-12?'Holding':r.power>0?'Charging':'Discharging'));
                if(c.type==='voltage'&&r)details.push(...detail('Source',Math.abs(r.power||0)<1e-12?'Idle':r.power<0?'Delivering power':'Absorbing power'));
                if(c.type==='ac'&&r)details.push(...detail('Peak voltage',D.format(c.value,'V')),...detail('RMS voltage',D.format(r.rmsVoltage,'V')),...detail('Frequency',D.format(c.frequency,'Hz')),...detail('Phase',`${c.phase||0}°`));
                if(c.type==='diode')details.push(...detail('Forward drop Vf',D.format(c.value,'V')),...detail('State',!r?'Unavailable':r.conducting?'Forward biased (ON)':'Reverse biased (OFF)'));
                if(c.type==='switch')details.push(...detail('State',c.closed?'Closed':'Open'));
                if(c.type==='lamp')details.push(...detail('Lamp',!r?'Unavailable':D.lampBrightness(r)>0?'Lit':'Off'),...detail('Glow',!r?'Unavailable':`${Number((D.lampBrightness(r)*100).toPrecision(3))}%`));
                if(solution?.initialCurrentEstimate)details.push(...detail('Initial current','Right-limit estimate'));
            }
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
        const target=pointer&&['wire','ground'].includes(tool)?snap(pointer):null;
        if(target?.kind==='grid')target.point=placePoint(pointer,drag?.free);
        const preview=placement&&!gesture?{...placement,position:placePoint(pointer||renderer.center(),drag?.moved||drag?.free)}:null;
        renderer.draw(draft||doc(),solution,{selected:drag?.hit&&drag.moved?drag.hit:selected,errors:simulation.error?.ids||[],connection,pointer:target?.point||pointer,snap:target,placement:preview,motion,options:{simple:true,readings:solution,time:simulation.state?.time??0,markers:!simulation.error&&$('motionToggle').checked&&!reducedMotion.matches}});
        if(!document.hidden&&(running||stepTarget!==null))requestDraw();
    }
    readyMessage();sync();requestDraw();
})();

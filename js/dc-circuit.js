(function(){
    'use strict';
    const D=window.DCCircuit,$=id=>document.getElementById(id),canvas=$('circuitCanvas');
    const renderer=new D.Renderer(canvas),simulation=new D.Simulation(),motion=new D.CurrentMotion();
    const units={resistor:[[1,'Ω'],[1e3,'kΩ'],[1e6,'MΩ']],lamp:[[1,'Ω'],[1e3,'kΩ'],[1e6,'MΩ']],capacitor:[[1,'F'],[1e-3,'mF'],[1e-6,'µF'],[1e-9,'nF']],inductor:[[1,'H'],[1e-3,'mH'],[1e-6,'µH']],voltage:[[1,'V'],[1e-3,'mV']],current:[[1,'A'],[1e-3,'mA'],[1e-6,'µA']],ac:[[1,'V'],[1e-3,'mV']],led:[[1,'V'],[1e-3,'mV']],zener:[[1,'V'],[1e-3,'mV']]};
    const TYPE_LABEL={voltage:'battery',ac:'AC source',diode:'diode',led:'LED',zener:'Zener diode',transformer:'transformer',resistor:'resistor',lamp:'lamp',capacitor:'capacitor',inductor:'inductor',switch:'switch',current:'current source'};
    const typeName=t=>TYPE_LABEL[t]||t;
    const scopeHistory=[];
    let scopeTargetId=null,scopeManualTarget='auto',scopeTimebase='auto',scopeZoomRipple=false,scopeInvert=false,scopeHoverX=null,scopePrewarmKey=null,scopeIsPrewarmed=false;
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
        else message(doc().components.length?(running?'Running':'Paused')+' · loads show voltage across / current through; sources show their output.':'Place a component, then connect its terminal dots with Wire.');
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
            if($('inductorNote'))$('inductorNote').hidden=c.type!=='inductor';
            $('lampNote').hidden=c.type!=='lamp';$('switchNote').hidden=c.type!=='switch';
            $('diodeNote').hidden=c.type!=='diode';
            if($('ledNote'))$('ledNote').hidden=c.type!=='led';
            if($('zenerNote'))$('zenerNote').hidden=c.type!=='zener';
            $('acNote').hidden=c.type!=='ac';$('transformerNote').hidden=c.type!=='transformer';$('currentNote').hidden=c.type!=='current';
            $('valueLabel').textContent=c.type==='lamp'?'Resistance':c.type==='inductor'?'Inductance':c.type==='led'?'Forward drop Vf':c.type==='zener'?'Zener voltage Vz':c.type==='ac'?'Peak voltage':c.type==='current'?'Current (arrow direction)':'Value';
            if(c.type==='switch'){$('toggleSwitchBtn').textContent=c.closed?'Open switch':'Close switch';$('toggleSwitchBtn').setAttribute('aria-pressed',String(c.closed));}
            else if(c.type==='transformer'){
                $('turnsPrimaryInput').value=Number.isInteger(c.turnsPrimary)?String(c.turnsPrimary):'';
                $('turnsSecondaryInput').value=Number.isInteger(c.turnsSecondary)?String(c.turnsSecondary):'';
            }else if(!hideValue){
                const choices=units[c.type]||[[1,'A']];$('unitSelect').replaceChildren(...choices.map(([scale,label])=>option(scale,label)));
                const unit=choices.find(([scale])=>Math.abs(c.value)>=scale)||choices.at(-1);
                $('unitSelect').value=unit[0];$('valueInput').value=Number((c.value/unit[0]).toPrecision(10));
                if(c.type==='ac'){$('frequencyInput').value=String(c.frequency??0.5);$('phaseInput').value=String(c.phase??0);}
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
        if(changed){running=false;stepTarget=null;targetTime=simulation.state?.time||0;scopeHistory.length=0;scopePrewarmKey=null;scopeIsPrewarmed=false;}
        if(simulation.error){running=false;stepTarget=null;}
        if(live&&wasRunning&&!simulation.error)running=true;
        lastFrame=performance.now();readyMessage();sync();
    }
    function commit(next,live=true){
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
            if(template.type==='inductor')placement.initialCurrent=template.initialCurrent;
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
            if(tool==='inductor')c.initialCurrent=placement.initialCurrent;
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
        if(scopeIsPrewarmed){scopeHistory.length=0;scopeIsPrewarmed=false;}
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
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();saveCircuitFile();return;}
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
        if(!Number.isFinite(value)||(['resistor','lamp','capacitor','inductor','led','zener'].includes(c.type)&&value<=0)){message('Component value must be positive and finite.',true);return;}
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
            if(id==='blank'||preset.hidden)continue;
            exOpts.push(option(id,preset.name));
        }
        $('exampleSelect').replaceChildren(...exOpts);
        $('exampleSelect').onchange=()=>{
            const id=$('exampleSelect').value;if(!id||!D.presets[id])return;
            pause();selected=null;connection=null;
            const next=D.makePreset(id);
            if(commit(next)){
                simulation.reset();motion.reset();scopeHistory.length=0;scaleReady=false;targetTime=0;
                renderer.fit(doc());setTool('select');
                if(D.presets[id].question)message(D.presets[id].name+' · '+D.presets[id].question);
                requestDraw();
            }
        };
    }
    $('connectSelectedBtn').onclick=useSelected;
    $('fitBtn').onclick=()=>{renderer.fit(doc());requestDraw();};$('zoomInBtn').onclick=()=>zoom(1.25);$('zoomOutBtn').onclick=()=>zoom(.8);
    $('resetBtn').onclick=()=>{pause();simulation.reset();motion.reset();scopeHistory.length=0;scopePrewarmKey=null;scopeIsPrewarmed=false;scaleReady=false;targetTime=0;readyMessage();sync();};
    $('stepBtn').onclick=()=>{if(!simulation.state||simulation.error)return;if(scopeIsPrewarmed){scopeHistory.length=0;scopeIsPrewarmed=false;}if(!scaleReady)calibrate();pause();stepTarget=simulation.state.time+.01;sync();};
    $('clearBtn').onclick=()=>{pause();selected=null;connection=null;if(commit(D.blank(),false)){simulation.reset();motion.reset();scopeHistory.length=0;scopePrewarmKey=null;scopeIsPrewarmed=false;scaleReady=false;renderer.view={panX:0,panY:0,zoom:1};setTool('select');}};
    const IO=window.ElectricsimIO;
    function loadSavedCircuitDoc(loadedDoc,meta){
        pause();selected=null;connection=null;
        if(commit(loadedDoc)){
            simulation.reset();motion.reset();scopeHistory.length=0;scopePrewarmKey=null;scopeIsPrewarmed=false;scaleReady=false;targetTime=0;
            if($('exampleSelect'))$('exampleSelect').value='';
            renderer.fit(doc());setTool('select');
            const label=(meta&&(meta.sourceFilename||meta.name))||'saved circuit';
            message(`Loaded "${label}"${meta&&meta.sourceKind==='png'?' (from B&W PNG)':''}.`);
            requestDraw();
        }
    }
    function saveCircuitFile(){
        if(!IO)return;
        const filename=IO.downloadSavedJson('dc-circuit',D.clone(doc()));
        message(`Saved "${filename}" — drag & drop it back here anytime to restore.`);
    }
    async function exportCircuitBWImage(){
        if(!IO)return;
        const bwCanvas=renderer.renderBWCanvas(doc());
        if(!bwCanvas){message('Place at least one component before exporting a B&W schematic image.',true);return;}
        try{
            const filename=await IO.downloadBWImage(bwCanvas,'dc-circuit',D.clone(doc()));
            message(`Exported B&W schematic "${filename}" (drag & drop this PNG back anytime to reload).`);
        }catch(err){
            message(`Could not export B&W schematic: ${err.message}`,true);
        }
    }
    if($('saveBtn'))$('saveBtn').onclick=saveCircuitFile;
    if($('exportBwBtn'))$('exportBwBtn').onclick=exportCircuitBWImage;
    if($('openBtn')&&$('openFileInput')){
        $('openBtn').onclick=()=>{ $('openFileInput').value=''; $('openFileInput').click(); };
        $('openFileInput').onchange=async()=>{
            const file=$('openFileInput').files&&$('openFileInput').files[0];
            if(!file||!IO)return;
            const res=await IO.readImportedFile(file,'dc-circuit',D.validateDocument);
            if(res.ok)loadSavedCircuitDoc(res.doc,res.meta);
            else message(res.error,true);
        };
    }
    if(IO){
        IO.attachDropZone({
            expectedLab:'dc-circuit',
            labTitle:'Circuits Lab',
            validateFn:D.validateDocument,
            onLoad:loadSavedCircuitDoc,
            onError:err=>message(err,true)
        });
    }
    if($('scopeClearBtn'))$('scopeClearBtn').onclick=()=>{scopeHistory.length=0;scopePrewarmKey='cleared';scopeIsPrewarmed=false;scopeHoverX=null;drawScope(simulation.state?.acceptedSolution);};
    if($('scopeZoomRippleBtn'))$('scopeZoomRippleBtn').onclick=()=>{
        scopeZoomRipple=!scopeZoomRipple;
        $('scopeZoomRippleBtn').setAttribute('aria-pressed',String(scopeZoomRipple));
        drawScope(simulation.state?.acceptedSolution);
    };
    if($('scopeInvertBtn'))$('scopeInvertBtn').onclick=()=>{
        scopeInvert=!scopeInvert;
        $('scopeInvertBtn').setAttribute('aria-pressed',String(scopeInvert));
        drawScope(simulation.state?.acceptedSolution);
    };
    if($('scopeTimebaseSelect'))$('scopeTimebaseSelect').onchange=()=>{
        scopeTimebase=$('scopeTimebaseSelect').value||'auto';
        scopeHistory.length=0;scopePrewarmKey=null;scopeIsPrewarmed=false;
        refreshMeasurements(true);
    };
    if($('scopeTargetSelect'))$('scopeTargetSelect').onchange=()=>{
        scopeManualTarget=$('scopeTargetSelect').value||'auto';
        scopeHistory.length=0;scopePrewarmKey=null;scopeIsPrewarmed=false;
        refreshMeasurements(true);
    };
    {
        const sc=$('scopeCanvas'),panel=sc?.closest('details');
        const redrawScope=()=>drawScope(simulation.error?null:simulation.state?.acceptedSolution);
        if(sc&&typeof ResizeObserver==='function')new ResizeObserver(redrawScope).observe(sc);
        if(panel)panel.addEventListener('toggle',()=>{if(panel.open)requestAnimationFrame(redrawScope);});
        if(sc){
            sc.addEventListener('pointermove',e=>{
                const rect=sc.getBoundingClientRect();
                scopeHoverX=e.clientX-rect.left;
                redrawScope();
            });
            sc.addEventListener('pointerleave',()=>{
                if(scopeHoverX!==null){scopeHoverX=null;redrawScope();}
            });
        }
    }
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
    function nodeDetails(info){
        if(!info)return detail('Node voltage','Unavailable');
        const list=info.connections.map(x=>`${x.label}:${x.terminal}`).join(', ')||'Nothing yet';
        return [...detail('Node',info.label),...detail('Node voltage, detail',exact(info.voltage,'V')),...detail('Measured from',info.referenceLabel||'Unavailable'),...detail('Connected terminals',list),...detail('Junctions on node',String(info.junctions))];
    }
    function updateNodeCard(info,solved){
        $('nodeVoltageCard').hidden=!info;if(!info)return;
        $('nodeVoltageValue').textContent=solved&&Number.isFinite(info.voltage)?D.format(info.voltage,'V'):'—';
        $('nodeVoltageRef').textContent=!solved?'Circuit not solved':info.ground?'This node is ground (0 V reference)':info.local?(info.isReference?'Local reference node (no ground in this part of the circuit)':'Relative to a local reference · add Ground for absolute values'):'Relative to ground (0 V)';
    }
    let lastScopeSelectDoc=null;
    function syncScopeTargetSelect(){
        const sel=$('scopeTargetSelect');if(!sel||lastScopeSelectDoc===doc())return;
        lastScopeSelectDoc=doc();
        const opts=[option('auto','Auto (Parallel Load / Selected)')];
        for(const c of doc().components)opts.push(option(c.id,`${c.label} · ${typeName(c.type)}`));
        sel.replaceChildren(...opts);
        if(scopeManualTarget!=='auto'&&!doc().components.some(c=>c.id===scopeManualTarget))scopeManualTarget='auto';
        sel.value=scopeManualTarget;
    }
    function findParallelLoadBranch(){
        const compiled=simulation.compiled,comps=doc().components;
        if(!compiled||!comps.length)return null;
        const caps=compiled.components.filter(c=>c.type==='capacitor'&&c.a!==c.b);
        for(const cap of caps){
            const pairKey=[cap.a,cap.b].sort().join('|');
            const load=compiled.components.find(c=>(c.type==='resistor'||c.type==='lamp'||c.type==='zener'||c.type==='led')&&[c.a,c.b].sort().join('|')===pairKey);
            if(load)return comps.find(x=>x.id===load.id)||comps.find(x=>x.id===cap.id);
        }
        return null;
    }
    function pickScopeComponent(){
        syncScopeTargetSelect();
        const comps=doc().components;if(!comps.length)return null;
        if(scopeManualTarget&&scopeManualTarget!=='auto'){
            const explicit=comps.find(c=>c.id===scopeManualTarget);
            if(explicit)return explicit;
        }
        if(selected?.kind==='component'){
            const found=comps.find(c=>c.id===selected.id);
            if(found){
                // If user selected a source or rectifier diode in a circuit that has a parallel R-C load, still allow direct probing of what they clicked unless they clicked wire/junction
                return found;
            }
        }
        const parallelLoad=findParallelLoadBranch();
        if(parallelLoad)return parallelLoad;
        return comps.find(c=>c.type==='capacitor'||c.type==='inductor'||c.type==='zener'||c.type==='led')||comps.find(c=>c.type==='resistor'||c.type==='lamp')||comps[0];
    }
    function niceScopeStep(rawPerDiv){
        if(!Number.isFinite(rawPerDiv)||rawPerDiv<=0)return 1e-3;
        const exp=Math.floor(Math.log10(rawPerDiv));
        const base=Math.pow(10,exp);
        const frac=rawPerDiv/base;
        const mult=frac<=1?1:frac<=2?2:frac<=5?5:10;
        return mult*base;
    }
    function getScopeWindowSpan(){
        if(scopeTimebase!=='auto'){
            const perDiv=Number(scopeTimebase);
            if(Number.isFinite(perDiv)&&perDiv>0)return 8*perDiv;
        }
        const comps=doc().components;
        const acFreqs=comps.filter(c=>c.type==='ac'&&Number.isFinite(c.frequency)&&c.frequency>0).map(c=>c.frequency);
        if(acFreqs.length){
            const minF=Math.min(...acFreqs);
            const rawDiv=(3.0/minF)/8;
            return Math.max(8e-5,Math.min(8.0,8*niceScopeStep(rawDiv)));
        }
        return 2.0;
    }
    function readScopeProbe(target,r){
        if(!target||!r)return {v:0,i:0};
        let v=0,i=0;
        if(target.type==='transformer'){
            v=r.secondaryVoltage??0;i=r.secondaryCurrent??0;
        }else if(target.type==='voltage'||target.type==='ac'){
            v=r.voltage??0;i=-(r.current??0);
        }else if(target.type==='current'){
            v=-(r.voltage??0);i=r.current??0;
        }else{
            v=r.voltage??0;i=r.current??0;
        }
        return {v:Number.isFinite(v)?v:0,i:Number.isFinite(i)?i:0};
    }
    function computeTotalReactiveEnergy(solution){
        let total=0;
        if(solution){
            for(const item of doc().components){
                const r=solution.componentResults[item.id];
                if(r&&Number.isFinite(r.energy))total+=r.energy;
            }
        }
        return total;
    }
    function recordScopeSample(time,solution,target=pickScopeComponent()){
        if(!target||!solution)return;
        if(scopeTargetId!==target.id){scopeTargetId=target.id;scopeHistory.length=0;scopePrewarmKey=null;}
        const r=solution.componentResults[target.id];if(!r)return;
        const {v,i}=readScopeProbe(target,r);
        const energy=computeTotalReactiveEnergy(solution);
        const span=getScopeWindowSpan();
        const minDt=span/720;
        const pt={time,v,i,energy};
        if(!scopeHistory.length){
            scopeHistory.push(pt);
            return;
        }
        const last=scopeHistory.at(-1);
        if(time<last.time-1e-9){
            scopeHistory.length=0;
            scopeHistory.push(pt);
            return;
        }
        const stepJump=Math.abs(pt.v-last.v)>Math.max(0.5,0.08*Math.max(1,Math.abs(last.v)))&&(time-last.time)>=minDt*0.15;
        if(time-last.time>=minDt||stepJump){
            scopeHistory.push(pt);
        }
        const cutoff=time-span;
        while(scopeHistory.length>2&&scopeHistory[0].time<cutoff)scopeHistory.shift();
        if(scopeHistory.length>2400)scopeHistory.splice(0,scopeHistory.length-2400);
    }
    function recordStateSamples(state){
        const target=pickScopeComponent();if(!target||!state)return;
        if(scopeTargetId!==target.id){scopeTargetId=target.id;scopeHistory.length=0;}
        if(Array.isArray(state.samples)&&state.samples.length){
            for(const s of state.samples){
                if(s&&s.solution)recordScopeSample(s.time,s.solution,target);
            }
        }
        if(state.acceptedSolution)recordScopeSample(state.time,state.acceptedSolution,target);
    }
    function prewarmScopeIfNeeded(target){
        if(running||simulation.error||!simulation.compiled||!target)return;
        if(scopeHistory.length>=8||scopePrewarmKey==='cleared')return;
        if(!D.isDynamic(simulation.compiled))return;
        const key=`${simulation.key||''}::${target.id}::${scopeTimebase}`;
        if(scopePrewarmKey===key&&scopeHistory.length>=2)return;
        scopePrewarmKey=key;
        try{
            const span=getScopeWindowSpan();
            let tempState=D.initializeTransient(simulation.compiled);
            scopeHistory.length=0;
            scopeTargetId=target.id;
            recordScopeSample(tempState.time,tempState.acceptedSolution,target);
            const steps=96;
            const dt=span/steps;
            const started=performance.now();
            for(let k=1;k<=steps;k++){
                if(performance.now()-started>260)break;
                tempState=D.advanceTransient(simulation.compiled,tempState,k*dt,{maxAttempts:240,budgetMs:40});
                recordStateSamples(tempState);
            }
            scopeIsPrewarmed=true;
        }catch(_){
            // Ignore prewarm errors and fall back to single-point live state
        }
    }
    function integrateScopeSegment(v1,v2,i1,i2,dt){
        return {
            areaV:0.5*(v1+v2)*dt,
            areaV2:((v1*v1+v1*v2+v2*v2)/3)*dt,
            areaI2:((i1*i1+i1*i2+i2*i2)/3)*dt
        };
    }
    function computeScopeStats(target){
        if(!target||scopeHistory.length<2)return null;
        const sign=scopeInvert?-1:1;
        const tMin=scopeHistory[0].time,tMax=scopeHistory.at(-1).time,totalSpan=tMax-tMin;
        // Skip initial turn-on transient when analyzing steady-state cycles if window is wide
        const steadyStart=scopeHistory.length>=16&&totalSpan>1e-4?tMin+totalSpan*0.25:tMin;
        let steady=scopeHistory.filter(p=>p.time>=steadyStart);
        if(steady.length<3)steady=scopeHistory;
        let sMax=-Infinity,sMin=Infinity;
        for(const p of steady){
            const v=sign*p.v;
            if(v>sMax)sMax=v;
            if(v<sMin)sMin=v;
        }
        const swing=sMax-sMin;
        // Schmitt-trigger rising crossings at midpoint for cycle-accurate Vdc, Vrms, Freq
        const crossings=[];
        if(swing>1e-4){
            const mid=(sMax+sMin)/2,hyst=Math.max(1e-5,swing*0.08);
            let armed=sign*steady[0].v<=mid-hyst;
            for(let k=1;k<steady.length;k++){
                const v0=sign*steady[k-1].v,v1=sign*steady[k].v;
                if(!armed){
                    if(v1<=mid-hyst)armed=true;
                }else if(v0<mid&&v1>=mid){
                    const frac=(mid-v0)/Math.max(1e-12,v1-v0);
                    crossings.push(steady[k-1].time+frac*(steady[k].time-steady[k-1].time));
                    armed=false;
                }
            }
        }
        let intSeries=steady;
        let freq=null;
        if(crossings.length>=2){
            const tStart=crossings[0],tEnd=crossings.at(-1);
            if(tEnd-tStart>1e-9){
                freq=(crossings.length-1)/(tEnd-tStart);
                const cyclePts=[];
                for(let k=0;k<steady.length-1;k++){
                    const a=steady[k],b=steady[k+1];
                    if(b.time<tStart||a.time>tEnd)continue;
                    const dt=b.time-a.time;
                    if(dt<=0)continue;
                    if(a.time<=tStart&&b.time>=tStart){
                        const f=(tStart-a.time)/dt;
                        cyclePts.push({time:tStart,v:a.v+f*(b.v-a.v),i:a.i+f*(b.i-a.i)});
                    }
                    if(b.time>tStart&&b.time<tEnd){
                        cyclePts.push(b);
                    }
                    if(a.time<=tEnd&&b.time>=tEnd){
                        const f=(tEnd-a.time)/dt;
                        cyclePts.push({time:tEnd,v:a.v+f*(b.v-a.v),i:a.i+f*(b.i-a.i)});
                    }
                }
                if(cyclePts.length>=2)intSeries=cyclePts;
            }
        }
        let vMax=-Infinity,vMin=Infinity,iMax=-Infinity,iMin=Infinity;
        let areaV=0,areaV2=0,areaI2=0,span=0;
        for(let k=0;k<intSeries.length;k++){
            const v=sign*intSeries[k].v,i=sign*intSeries[k].i;
            if(v>vMax)vMax=v;
            if(v<vMin)vMin=v;
            if(i>iMax)iMax=i;
            if(i<iMin)iMin=i;
            if(k>0){
                const dt=intSeries[k].time-intSeries[k-1].time;
                if(dt>0){
                    const seg=integrateScopeSegment(sign*intSeries[k-1].v,v,sign*intSeries[k-1].i,i,dt);
                    areaV+=seg.areaV;areaV2+=seg.areaV2;areaI2+=seg.areaI2;span+=dt;
                }
            }
        }
        if(!Number.isFinite(vMax)){vMax=sMax;vMin=sMin;}
        const vRipple=Math.max(0,vMax-vMin);
        const vDc=span>1e-9?areaV/span:(intSeries.reduce((s,p)=>s+sign*p.v,0)/intSeries.length);
        const vRms=span>1e-9?Math.sqrt(Math.max(0,areaV2/span)):Math.abs(vDc);
        const iRms=span>1e-9?Math.sqrt(Math.max(0,areaI2/span)):Math.abs(intSeries[0]?.i||0);
        const ripplePct=Math.abs(vDc)>0.05?(vRipple/Math.abs(vDc))*100:null;
        const isRectifiedDc=vMin>-0.05*Math.max(1,Math.abs(vMax))&&vMax>0.1&&vDc>0.05;
        return {sign,vMax,vMin,vRipple,vDc,vRms,iRms,freq,ripplePct,iMax,iMin,tMin,tMax:Math.max(tMin+1e-9,tMax),isRectifiedDc};
    }
    function ensureScopeCanvasSize(sc){
        const rect=sc.getBoundingClientRect();
        const w=Math.max(200,Math.round(rect.width||sc.clientWidth||820));
        const h=Math.max(84,Math.round(rect.height||sc.clientHeight||140));
        const dpr=Math.min(window.devicePixelRatio||1,2);
        const bw=Math.round(w*dpr),bh=Math.round(h*dpr);
        if(sc.width!==bw||sc.height!==bh){sc.width=bw;sc.height=bh;}
        return {w,h,dpr};
    }
    function drawScopePill(ctx,text,x,y,color,align='left',bg='rgba(5, 8, 15, 0.84)'){
        ctx.save();
        ctx.font='600 10.5px Inter, system-ui, sans-serif';
        ctx.textAlign='left';
        ctx.textBaseline='middle';
        const tw=ctx.measureText(text).width;
        const px=6,ph=15,pw=tw+px*2;
        const bx=align==='right'?x-pw:align==='center'?x-pw/2:x;
        const by=y-ph/2;
        ctx.fillStyle=bg;
        ctx.beginPath();
        if(ctx.roundRect)ctx.roundRect(bx,by,pw,ph,4);
        else ctx.rect(bx,by,pw,ph);
        ctx.fill();
        ctx.fillStyle=color;
        ctx.fillText(text,bx+px,y+0.5);
        ctx.restore();
        return pw;
    }
    function drawScope(solution){
        const sc=$('scopeCanvas');if(!sc)return;
        const {w,h,dpr}=ensureScopeCanvasSize(sc);
        const ctx=sc.getContext('2d');
        ctx.setTransform(dpr,0,0,dpr,0,0);
        const padL=8,padR=8,padT=20,padB=18;
        const plotW=Math.max(40,w-padL-padR),plotH=Math.max(30,h-padT-padB);
        const bgGrad=ctx.createLinearGradient(0,0,0,h);
        bgGrad.addColorStop(0,'#060a13');bgGrad.addColorStop(1,'#04070d');
        ctx.fillStyle=bgGrad;ctx.fillRect(0,0,w,h);

        // Crisp 8x4 sub-pixel aligned oscilloscope graticule
        ctx.strokeStyle='#131e30';ctx.lineWidth=1;
        ctx.beginPath();
        for(let i=0;i<=8;i++){
            const x=Math.round(padL+(plotW*i)/8)+0.5;
            ctx.moveTo(x,padT);ctx.lineTo(x,padT+plotH);
        }
        for(let j=0;j<=4;j++){
            const y=Math.round(padT+(plotH*j)/4)+0.5;
            ctx.moveTo(padL,y);ctx.lineTo(padL+plotW,y);
        }
        ctx.stroke();
        ctx.strokeStyle='#1a273d';
        ctx.strokeRect(Math.round(padL)+0.5,Math.round(padT)+0.5,Math.round(plotW),Math.round(plotH));

        const target=pickScopeComponent();
        if(!target||!solution){
            if($('scopeTargetLabel'))$('scopeTargetLabel').textContent='Probe: None';
            if($('scopeVpp'))$('scopeVpp').textContent='CH1 V(t): —';
            if($('scopeVrms'))$('scopeVrms').textContent='Vrms: —';
            if($('scopeVdc'))$('scopeVdc').textContent='Vdc: —';
            if($('scopeRipple'))$('scopeRipple').textContent='Vpp: —';
            if($('scopeFreq'))$('scopeFreq').textContent='Freq: —';
            if($('scopeIpeak'))$('scopeIpeak').textContent='CH2 I(t): —';
            if($('scopeEnergy'))$('scopeEnergy').textContent='Energy: 0 J';
            ctx.fillStyle='#6d7f99';
            ctx.font='500 11px Inter, system-ui, sans-serif';
            ctx.textAlign='center';ctx.textBaseline='middle';
            ctx.fillText('Build or select a circuit component to probe V(t) & I(t)',w/2,padT+plotH/2);
            return;
        }
        if(scopeTargetId!==target.id){scopeTargetId=target.id;scopeHistory.length=0;scopePrewarmKey=null;}
        prewarmScopeIfNeeded(target);
        if(!scopeHistory.length)recordScopeSample(simulation.state?.time||0,solution,target);
        const sign=scopeInvert?-1:1;
        const lastPt=scopeHistory.at(-1);
        const r=solution.componentResults[target.id];
        const liveProbe=readScopeProbe(target,r);
        // Keep toolbar values 100% consistent with the displayed trace (including preview mode)
        const curV=sign*(lastPt?lastPt.v:liveProbe.v);
        const curI=sign*(lastPt?lastPt.i:liveProbe.i);
        const shownEnergy=lastPt&&Number.isFinite(lastPt.energy)?lastPt.energy:computeTotalReactiveEnergy(solution);
        const stats=computeScopeStats(target);
        const plusPin=target.type==='transformer'?'S1':target.type==='current'?'B':'A';
        const minusPin=target.type==='transformer'?'S2':target.type==='current'?'A':'B';
        const polTag=scopeInvert?`${minusPin}+/${plusPin}−`:`${plusPin}+/${minusPin}−`;
        if($('scopeTargetLabel'))$('scopeTargetLabel').textContent=`Probe: ${target.label} (${polTag})`;
        if($('scopeVpp'))$('scopeVpp').textContent=`CH1 V(t): ${D.reading(curV,'V')}`;
        if($('scopeIpeak'))$('scopeIpeak').textContent=`CH2 I(t): ${D.reading(curI,'A')}`;
        if($('scopeEnergy'))$('scopeEnergy').textContent=`Energy: ${D.format(shownEnergy,'J')}`;
        const acqLabel=running?'LIVE':scopeIsPrewarmed?'PREVIEW':'HOLD';
        const acqColor=running?'#34d399':scopeIsPrewarmed?'#fbbf24':'#94a3b8';

        if(!stats){
            if($('scopeVrms'))$('scopeVrms').textContent=`Vrms: ${D.format(Math.abs(curV),'V')}`;
            if($('scopeVdc'))$('scopeVdc').textContent=`Vdc: ${D.reading(curV,'V')}`;
            if($('scopeRipple'))$('scopeRipple').textContent='Vpp: 0 V';
            if($('scopeFreq'))$('scopeFreq').textContent='Freq: DC';
            const vDiv=niceScopeStep(Math.max(1e-3,Math.abs(curV))/1.6);
            const iDiv=niceScopeStep(Math.max(1e-6,Math.abs(curI))/1.5);
            const topV=2*vDiv,topI=2*iDiv;
            const yZero=Math.round(padT+plotH/2)+0.5;
            ctx.strokeStyle='#243552';ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(padL,yZero);ctx.lineTo(padL+plotW,yZero);ctx.stroke();
            const yV=yZero-(curV/topV)*(plotH/2);
            const yI=yZero-(curI/topI)*(plotH/2);
            ctx.save();
            ctx.beginPath();ctx.rect(padL,padT,plotW,plotH);ctx.clip();
            ctx.strokeStyle='#f6b944';ctx.lineWidth=1.5;ctx.globalAlpha=0.85;
            ctx.beginPath();ctx.moveTo(padL,yI);ctx.lineTo(padL+plotW,yI);ctx.stroke();
            ctx.globalAlpha=1;ctx.strokeStyle='#3dd9ff';ctx.lineWidth=2;
            ctx.beginPath();ctx.moveTo(padL,yV);ctx.lineTo(padL+plotW,yV);ctx.stroke();
            ctx.restore();
            const w1=drawScopePill(ctx,`CH1 ${D.format(vDiv,'V')}/div`,padL,10,'#3dd9ff','left','transparent');
            drawScopePill(ctx,`CH2 ${D.format(iDiv,'A')}/div`,padL+w1+4,10,'#f6b944','left','transparent');
            drawScopePill(ctx,acqLabel,w-padR,10,acqColor,'right','transparent');
            drawScopePill(ctx,'0 V center',padL,h-8,'#7c8fa8','left','transparent');
            drawScopePill(ctx,`Time: ${D.format(getScopeWindowSpan()/8,'s')}/div · DC steady`,w-padR,h-8,'#7c8fa8','right','transparent');
            return;
        }
        if($('scopeVrms'))$('scopeVrms').textContent=`Vrms: ${D.format(stats.vRms,'V')}`;
        if($('scopeVdc')){
            const pctText=stats.isRectifiedDc&&stats.ripplePct!==null&&stats.vRipple>1e-4?` (${stats.ripplePct.toFixed(1)}% ripple)`:'';
            $('scopeVdc').textContent=`Vdc: ${D.reading(stats.vDc,'V')}${pctText}`;
        }
        if($('scopeRipple')){
            const rangeText=stats.vRipple>1e-4?` (${D.format(stats.vMin,'V')} ↔ ${D.format(stats.vMax,'V')})`:'';
            const lbl=stats.isRectifiedDc?'Ripple Vr(pp)':'Vpp';
            $('scopeRipple').textContent=`${lbl}: ${D.format(stats.vRipple,'V')}${rangeText}`;
        }
        if($('scopeFreq')){
            $('scopeFreq').textContent=`Freq: ${stats.freq!==null?D.format(stats.freq,'Hz'):(stats.vRipple>1e-4?'Transient':'DC')}`;
        }

        const tMin=scopeHistory[0].time,tMax=Math.max(tMin+1e-9,scopeHistory.at(-1).time);
        const vVals=scopeHistory.map(p=>sign*p.v);
        const iVals=scopeHistory.map(p=>sign*p.i);
        const vAllMin=Math.min(...vVals),vAllMax=Math.max(...vVals);
        const iAllMin=Math.min(...iVals),iAllMax=Math.max(...iVals);
        const maxAbsV=Math.max(1e-3,Math.abs(vAllMin),Math.abs(vAllMax));
        const maxAbsI=Math.max(1e-6,Math.abs(iAllMin),Math.abs(iAllMax));
        const mapX=t=>padL+((t-tMin)/Math.max(1e-9,tMax-tMin))*plotW;
        const unipolarV=!scopeZoomRipple&&stats.isRectifiedDc&&vAllMin>=-0.05*maxAbsV;
        let mapYV,vScaleText,zeroYV=null;
        if(scopeZoomRipple&&stats.vRipple>1e-5){
            const vDiv=niceScopeStep(Math.max(stats.vRipple*1.2,1e-4)/4);
            const midV=(stats.vMin+stats.vMax)/2;
            const lo=midV-2*vDiv,hi=midV+2*vDiv;
            mapYV=v=>padT+plotH-((v-lo)/Math.max(1e-9,hi-lo))*plotH;
            vScaleText=`CH1 ${D.format(vDiv,'V')}/div (AC zoom)`;
        }else if(unipolarV){
            const vDiv=niceScopeStep(Math.max(1e-3,vAllMax*1.06)/4);
            const topV=4*vDiv;
            zeroYV=padT+plotH;
            mapYV=v=>zeroYV-(v/topV)*plotH;
            vScaleText=`CH1 ${D.format(vDiv,'V')}/div`;
        }else{
            const vDiv=niceScopeStep((maxAbsV*1.06)/2);
            const topV=2*vDiv;
            zeroYV=padT+plotH/2;
            mapYV=v=>zeroYV-(v/topV)*(plotH/2);
            vScaleText=`CH1 ${D.format(vDiv,'V')}/div`;
        }
        let mapYI,iScaleText;
        if(unipolarV&&iAllMin>=-0.05*maxAbsI){
            const iDiv=niceScopeStep(Math.max(1e-6,iAllMax*1.08)/4);
            const topI=4*iDiv;
            mapYI=i=>(padT+plotH)-(i/topI)*plotH;
            iScaleText=`CH2 ${D.format(iDiv,'A')}/div`;
        }else{
            const iDiv=niceScopeStep((maxAbsI*1.08)/2);
            const topI=2*iDiv;
            mapYI=i=>(padT+plotH/2)-(i/topI)*(plotH/2);
            iScaleText=`CH2 ${D.format(iDiv,'A')}/div`;
        }

        if(zeroYV!==null){
            const zy=Math.round(zeroYV)+0.5;
            ctx.strokeStyle='#263856';ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(padL,zy);ctx.lineTo(padL+plotW,zy);ctx.stroke();
        }

        // Clipped plot region
        ctx.save();
        ctx.beginPath();ctx.rect(padL,padT,plotW,plotH);ctx.clip();
        ctx.lineJoin='round';ctx.lineCap='round';

        if(stats.vRipple>1e-3){
            const yMax=mapYV(stats.vMax),yMin=mapYV(stats.vMin);
            ctx.save();
            ctx.setLineDash([4,4]);
            ctx.strokeStyle='rgba(192, 132, 252, 0.52)';
            ctx.lineWidth=1;
            ctx.beginPath();
            ctx.moveTo(padL,yMax);ctx.lineTo(padL+plotW,yMax);
            ctx.moveTo(padL,yMin);ctx.lineTo(padL+plotW,yMin);
            ctx.stroke();
            ctx.restore();
        }

        // CH2 I(t) in amber
        ctx.strokeStyle='#f6b944';ctx.lineWidth=1.5;ctx.globalAlpha=0.86;ctx.beginPath();
        scopeHistory.forEach((pt,idx)=>{
            const x=mapX(pt.time),y=mapYI(sign*pt.i);
            idx?ctx.lineTo(x,y):ctx.moveTo(x,y);
        });
        ctx.stroke();

        // CH1 V(t) in cyan
        ctx.globalAlpha=1;
        ctx.save();
        ctx.strokeStyle='#3dd9ff';ctx.lineWidth=2;
        ctx.shadowColor='rgba(61, 217, 255, 0.35)';ctx.shadowBlur=5;
        ctx.beginPath();
        scopeHistory.forEach((pt,idx)=>{
            const x=mapX(pt.time),y=mapYV(sign*pt.v);
            idx?ctx.lineTo(x,y):ctx.moveTo(x,y);
        });
        ctx.stroke();
        ctx.restore();
        ctx.restore();

        // Non-overlapping envelope labels
        if(stats.vRipple>1e-3){
            const yMax=mapYV(stats.vMax),yMin=mapYV(stats.vMin);
            const clampY=y=>Math.max(padT+9,Math.min(padT+plotH-9,y));
            if(Math.abs(yMin-yMax)<20){
                drawScopePill(ctx,`${D.format(stats.vMin,'V')} ↔ ${D.format(stats.vMax,'V')} (Δ${D.format(stats.vRipple,'V')})`,w-padR-4,clampY((yMax+yMin)/2-10),'#d8b4fe','right');
            }else{
                drawScopePill(ctx,`Vmax ${D.format(stats.vMax,'V')}`,w-padR-4,clampY(yMax-9),'#d8b4fe','right');
                drawScopePill(ctx,`Vmin ${D.format(stats.vMin,'V')} · ΔV ${D.format(stats.vRipple,'V')}`,w-padR-4,clampY(yMin+9),'#d8b4fe','right');
            }
        }

        // Interactive DSO hover crosshair & cursor readout
        if(scopeHoverX!==null&&scopeHoverX>=padL&&scopeHoverX<=padL+plotW&&scopeHistory.length>=2){
            const frac=(scopeHoverX-padL)/plotW;
            const tCursor=tMin+frac*(tMax-tMin);
            let lo=0,hi=scopeHistory.length-1;
            while(hi-lo>1){const mid=(lo+hi)>>1;if(scopeHistory[mid].time<=tCursor)lo=mid;else hi=mid;}
            const a=scopeHistory[lo],b=scopeHistory[hi];
            const dtSeg=Math.max(1e-12,b.time-a.time);
            const u=Math.max(0,Math.min(1,(tCursor-a.time)/dtSeg));
            const vCur=sign*(a.v+u*(b.v-a.v));
            const iCur=sign*(a.i+u*(b.i-a.i));
            const cx=Math.round(scopeHoverX)+0.5;
            ctx.save();
            ctx.setLineDash([3,3]);ctx.strokeStyle='rgba(213, 223, 237, 0.55)';ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(cx,padT);ctx.lineTo(cx,padT+plotH);ctx.stroke();
            ctx.restore();
            const cyV=Math.max(padT,Math.min(padT+plotH,mapYV(vCur)));
            const cyI=Math.max(padT,Math.min(padT+plotH,mapYI(iCur)));
            ctx.fillStyle='#3dd9ff';ctx.beginPath();ctx.arc(cx,cyV,3.2,0,Math.PI*2);ctx.fill();
            ctx.fillStyle='#f6b944';ctx.beginPath();ctx.arc(cx,cyI,2.8,0,Math.PI*2);ctx.fill();
            const cursorText=`t=${D.format(tCursor,'s')} · V=${D.reading(vCur,'V')} · I=${D.reading(iCur,'A')}`;
            const align=scopeHoverX>w*0.58?'right':'left';
            const tx=align==='right'?cx-8:cx+8;
            drawScopePill(ctx,cursorText,tx,padT+10,'#e2e8f0',align,'rgba(12, 18, 30, 0.92)');
        }

        // Top & bottom oscilloscope HUD
        const w1=drawScopePill(ctx,vScaleText,padL,10,'#3dd9ff','left','transparent');
        drawScopePill(ctx,iScaleText,padL+w1+4,10,'#f6b944','left','transparent');
        drawScopePill(ctx,acqLabel,w-padR,10,acqColor,'right','transparent');
        const baseLabel=scopeZoomRipple?'Center: Vmid':unipolarV?'0 V base':'0 V center';
        drawScopePill(ctx,baseLabel,padL,h-8,'#7c8fa8','left','transparent');
        drawScopePill(ctx,`Time: ${D.format((tMax-tMin)/8,'s')}/div · t = ${D.format(tMax,'s')}`,w-padR,h-8,'#7c8fa8','right','transparent');
    }
    function refreshMeasurements(force=false){
        const now=performance.now();if(!force&&now-lastRefresh<200)return;lastRefresh=now;
        const solution=simulation.error?null:simulation.state?.acceptedSolution,c=component(),selection=selectionValue(selected),time=simulation.state?.time;
        if(!force&&lastReading?.doc===doc()&&lastReading.solution===solution&&lastReading.selection===selection&&lastReading.time===time)return;
        lastReading={doc:doc(),solution,selection,time};
        if(lastTableDoc!==doc()||lastTableSolution!==solution){
            const rows=[];for(const item of doc().components){const r=solution?.componentResults[item.id],shown=item.type==='transformer'?r:D.presentResult(item,r),tr=document.createElement('tr');for(const text of [item.label,D.reading(shown?.voltage,'V'),D.reading(shown?.current,'A'),D.format(shown?.power,'W')+(shown?.role==='source'?' delivered':shown?.role==='load'?' absorbed':'')]){const td=document.createElement('td');td.textContent=text;tr.append(td);}rows.push(tr);}
            $('measurementRows').replaceChildren(...rows);lastTableDoc=doc();lastTableSolution=solution;
        }
        drawScope(solution);
        const scopeStats=(c&&scopeTargetId===c.id)?computeScopeStats(c):null;
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
                const shown=D.presentResult(c,r);
                if(shown?.role==='source'||(!r&&['voltage','ac','current'].includes(c.type))){
                    const plus=c.type==='current'?'B':'A',minus=plus==='A'?'B':'A';
                    details.push(...detail(`Output voltage (${plus}+ to ${minus}−)`,D.reading(shown?.voltage,'V')),...detail(`Output current (out of ${plus})`,D.reading(shown?.current,'A')),...detail('Current, detail',exact(shown?.current,'A')),...detail('Power delivered',D.format(shown?.power,'W')));
                }else{
                    details.push(...detail('Voltage across',D.reading(shown?.voltage,'V')),...detail('Current through',D.reading(shown?.current,'A')),...detail('Current, detail',exact(shown?.current,'A')),...detail('Power absorbed',D.format(shown?.power,'W')));
                    if(shown)details.push(...detail('Higher potential',shown.higher?`Terminal ${shown.higher} (+)`:'Equal'),...detail('Current direction',shown.flow||'No current'));
                }
                if(scopeStats&&scopeStats.vRipple>1e-4){
                    details.push(
                        ...detail('Peak-to-peak Vpp',D.format(scopeStats.vRipple,'V')),
                        ...detail('RMS voltage Vrms',D.format(scopeStats.vRms,'V')),
                        ...detail('DC average Vdc',D.reading(scopeStats.vDc,'V')),
                        ...detail('Envelope (Vmin ↔ Vmax)',`${D.format(scopeStats.vMin,'V')} ↔ ${D.format(scopeStats.vMax,'V')}`),
                        ...(scopeStats.freq!==null?detail('Frequency',D.format(scopeStats.freq,'Hz')):[])
                    );
                }
                if(r){details.push(...detail('Terminal A',D.format(r.va,'V')+(solution.nodeVoltages[simulation.compiled.netOf.get(c.terminals[0])]?.local?' · local':'')),...detail('Terminal B',D.format(r.vb,'V')+(solution.nodeVoltages[simulation.compiled.netOf.get(c.terminals[1])]?.local?' · local':'')));}
                if(c.type==='capacitor')details.push(...detail('Charge',D.format(Math.abs(r?.charge??NaN),'C')),...detail('Stored energy',D.format(r?.energy,'J')),...detail('State',!r?'Unavailable':Math.abs(r.power||0)<1e-12?'Holding':r.power>0?'Charging':'Discharging'));
                if(c.type==='inductor')details.push(...detail('Magnetic flux Φ',D.format(Math.abs(r?.flux??NaN),'Wb')),...detail('Magnetic energy ½LI²',D.format(r?.energy,'J')),...detail('State',!r?'Unavailable':Math.abs(r.voltage||0)<1e-6?'Steady DC field':r.power>0?'Building magnetic field':'Releasing magnetic energy'));
                if(['voltage','ac','current'].includes(c.type)&&shown)details.push(...detail('Source',shown.state));
                if(c.type==='ac'&&r)details.push(...detail('Peak voltage',D.format(c.value,'V')),...detail('RMS voltage',D.format(r.rmsVoltage,'V')),...detail('Frequency',D.format(c.frequency,'Hz')),...detail('Phase',`${c.phase||0}°`));
                if(c.type==='diode')details.push(...detail('Forward drop Vf',D.format(c.value,'V')),...detail('State',!r?'Unavailable':r.conducting?'Forward biased (ON)':'Reverse biased (OFF)'));
                if(c.type==='led')details.push(...detail('Forward drop Vf',D.format(c.value,'V')),...detail('Optical output',!r?'Unavailable':r.overloaded?'OVERLOAD (>50 mA!)':r.conducting?`Emitting (${Number((D.ledBrightness(r)*100).toPrecision(3))}%)`:'Dark (OFF)'));
                if(c.type==='zener')details.push(...detail('Zener breakdown Vz',D.format(c.value,'V')),...detail('Conduction mode',!r?'Unavailable':r.conductionMode||'Reverse OFF'));
                if(c.type==='switch')details.push(...detail('State',c.closed?'Closed':'Open'));
                if(c.type==='lamp')details.push(...detail('Lamp',!r?'Unavailable':D.lampBrightness(r)>0?'Lit':'Off'),...detail('Glow',!r?'Unavailable':`${Number((D.lampBrightness(r)*100).toPrecision(3))}%`));
                if(solution?.initialCurrentEstimate)details.push(...detail('Initial current','Right-limit estimate'));
            }
        }else if(selected?.kind==='wire'){
            const r=solution?.wireResults[selected.id];details.push(...detail('Current',!solution?'Unavailable':Number.isFinite(r?.current)?D.reading(r.current,'A'):'Indeterminate wire loop'),...detail('Current, detail',exact(r?.current,'A')));
            details.push(...nodeDetails(D.nodeInfo(simulation.compiled,solution,selected.id)));
        }else if(selected){
            details.push(...nodeDetails(D.nodeInfo(simulation.compiled,solution,selected.id)));
        }
        updateNodeCard(c||!selected?null:D.nodeInfo(simulation.compiled,solution,selected.id)||{voltage:null,connections:[],junctions:0},!!solution);
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
                recordStateSamples(state);
                if(state.behind)message('Calculating transient response · '+D.format((stepTarget??targetTime)-state.time,'s')+' behind target.');
                else{if(stepTarget!==null){stepTarget=null;sync();}readyMessage();}
            }catch(error){simulation.error=error;running=false;stepTarget=null;message('Circuit cannot be solved: '+error.message,true);sync();}
        }
        const solution=simulation.error?null:simulation.state?.acceptedSolution;
        refreshMeasurements();drawScope(solution);$('timeReadout').textContent=D.format(simulation.state?.time??simulation.retained?.time??0,'s');
        $('flowLegend').textContent='Conventional current · speed ∝ current · '+D.format(motion.reference,'A')+' reference'+(motion.clipped?' · speed capped; increase scale':'')+(reducedMotion.matches?' · reduced motion':'');
        const target=pointer&&['wire','ground'].includes(tool)?snap(pointer):null;
        if(target?.kind==='grid')target.point=placePoint(pointer,drag?.free);
        const preview=placement&&!gesture?{...placement,position:placePoint(pointer||renderer.center(),drag?.moved||drag?.free)}:null;
        const node=solution&&selected&&selected.kind!=='component'&&!drag?.moved?D.nodeInfo(simulation.compiled,solution,selected.id):null;
        const nodeLabel=node&&Number.isFinite(node.voltage)&&selected.kind!=='wire'?{id:selected.id,text:`${node.ground?'GND':node.label} · ${D.format(node.voltage,'V')}${node.local?' (local)':''}`}:null;
        renderer.draw(draft||doc(),solution,{selected:drag?.hit&&drag.moved?drag.hit:selected,errors:simulation.error?.ids||[],connection,pointer:target?.point||pointer,snap:target,placement:preview,motion,options:{simple:true,readings:solution,time:simulation.state?.time??0,markers:!simulation.error&&$('motionToggle').checked&&!reducedMotion.matches,nodeLabel}});
        if(!document.hidden&&(running||stepTarget!==null))requestDraw();
    }
    calibrate();readyMessage();sync();requestDraw();
})();

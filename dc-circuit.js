(function(){
    'use strict';
    const D=window.DCCircuit,$=id=>document.getElementById(id),canvas=$('circuitCanvas'),renderer=new D.Renderer(canvas),history=new D.History(D.blank());
    const units={resistor:[[1,'Ω'],[1e3,'kΩ'],[1e6,'MΩ']],capacitor:[[1,'F'],[1e-3,'mF'],[1e-6,'µF'],[1e-9,'nF']],voltage:[[1,'V'],[1e-3,'mV']]};
    let tool='select',selected=null,connection=null,pointer=null,drag=null,draft=null,compiled=null,state=null,error=null,lastFrame=performance.now(),targetTime=0,lastRefresh=0,running=false,phase=0,displaySolution=null;
    const doc=()=>history.doc,selectedComponent=()=>doc().components.find(c=>c.id===selected?.id);
    function message(text,bad=false){if($('status').textContent!==text)$('status').textContent=text;$('status').classList.toggle('error',bad);}
    function sync(){
        $('undoBtn').disabled=!history.undoStack.length;
        $('runBtn').disabled=!!error||!doc().components.length;
        const c=selectedComponent();$('componentEditor').hidden=!c;
        if(!c)return;
        $('selectedTitle').textContent=c.label+' · '+(c.type==='voltage'?'battery':c.type);
        $('unitSelect').replaceChildren();
        for(const [scale,label] of units[c.type]){const option=document.createElement('option');option.value=scale;option.textContent=label;$('unitSelect').append(option);}
        const unit=units[c.type].find(([scale])=>Math.abs(c.value)>=scale)||units[c.type].at(-1);
        $('unitSelect').value=unit[0];$('valueInput').value=Number((c.value/unit[0]).toPrecision(10));
    }
    function solve(previous=null){
        pause();error=null;state=null;targetTime=0;
        try{compiled=D.compileCircuit(doc());const initial=Object.fromEntries(doc().components.filter(c=>c.type==='capacitor').map(c=>[c.id,previous?.capacitorVoltagesById[c.id]??c.initialVoltage]));state=D.initializeTransient(compiled,initial);state.time=previous?.time||0;targetTime=state.time;message(doc().components.length?'Ready · press Run. Voltage is A − B; current is A → B.':'Add a battery, resistor or capacitor to start.');}
        catch(e){error=e;message('Circuit cannot be solved: '+e.message,true);}
        displaySolution=state?.acceptedSolution||null;lastRefresh=0;lastFrame=performance.now();sync();
    }
    function commit(next,layout=false){
        try{const previous=state;history.commit(next);if(!layout)solve(previous);else{compiled=D.compileCircuit(doc());sync();}}
        catch(e){message(e.message,true);}
    }
    function select(hit){selected=hit;sync();}
    function setTool(next){tool=next;connection=null;select(null);document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));$('toolHint').textContent=tool==='wire'?'Click to create connected junctions. Wires follow horizontal/vertical paths. Click a terminal or existing wire to finish; Esc ends the wire.':tool==='select'?'Click a component to edit; drag to move. R rotates, Delete removes. Scroll to zoom; right-drag pans.':'Click the canvas to add a '+(tool==='voltage'?'battery':tool)+'.';canvas.style.cursor=tool==='select'?'default':'crosshair';}
    function activate(p){
        if(tool==='wire'){
            const next=D.clone(doc()),from=connection,clicked=D.connectClick(next,from,p,10/renderer.view.zoom);
            commit(next);select(null);
            connection=from&&(clicked.existing||clicked.id===from)?null:clicked.id;
            return;
        }
        if(units[tool]){
            const next=D.clone(doc()),prefix={resistor:'R',capacitor:'C',voltage:'V'}[tool];let n=1;while(next.components.some(c=>c.label===prefix+n))n++;
            const component=D.component(tool,Math.round(p.x/24)*24,Math.round(p.y/24)*24,prefix+n);next.components.push(component);commit(next);setTool('select');select({kind:'component',id:component.id});return;
        }
        select(renderer.hit(doc(),p));
    }
    function rotate(){const c=selectedComponent();if(!c)return;const next=D.clone(doc());next.components.find(x=>x.id===c.id).rotation=(c.rotation+90)%360;commit(next,true);}
    function remove(){if(!selected)return;const next=D.clone(doc());if(selected.kind==='component')D.removeComponent(next,selected.id);else if(selected.kind==='wire')next.wires=next.wires.filter(w=>w.id!==selected.id);else if(selected.kind==='junction'){next.junctions=next.junctions.filter(j=>j.id!==selected.id);next.wires=next.wires.filter(w=>![w.fromEndpoint,w.toEndpoint].includes(selected.id));}else return;selected=null;connection=null;commit(next);}
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    canvas.addEventListener('pointerdown',e=>{
        canvas.focus();pointer=renderer.world(e.clientX,e.clientY);
        if(e.button===2){if(connection){connection=null;return;}drag={kind:'pan',x:e.clientX,y:e.clientY,view:{...renderer.view}};canvas.setPointerCapture(e.pointerId);return;}
        if(e.button!==0)return;
        const hit=renderer.hit(doc(),pointer);
        if(tool==='select'&&hit?.kind==='component'){select(hit);drag={kind:'component',id:hit.id,start:pointer,original:D.clone(doc()),moved:false};draft=D.clone(doc());canvas.setPointerCapture(e.pointerId);}
        else activate(pointer);
    });
    canvas.addEventListener('pointermove',e=>{
        pointer=renderer.world(e.clientX,e.clientY);if(!drag)return;
        if(drag.kind==='pan'){renderer.view.panX=drag.view.panX+e.clientX-drag.x;renderer.view.panY=drag.view.panY+e.clientY-drag.y;return;}
        const c=draft.components.find(c=>c.id===drag.id),old=drag.original.components.find(c=>c.id===drag.id);
        c.position={x:Math.round((old.position.x+pointer.x-drag.start.x)/24)*24,y:Math.round((old.position.y+pointer.y-drag.start.y)/24)*24};drag.moved=Math.hypot(pointer.x-drag.start.x,pointer.y-drag.start.y)>3;
    });
    canvas.addEventListener('pointerup',()=>{if(drag?.kind==='component'&&drag.moved)commit(draft,true);drag=null;draft=null;});
    canvas.addEventListener('pointercancel',()=>{drag=null;draft=null;});
    canvas.addEventListener('wheel',e=>{e.preventDefault();const before=renderer.world(e.clientX,e.clientY);renderer.view.zoom=Math.max(.3,Math.min(2,renderer.view.zoom*Math.exp(-e.deltaY*.001)));const after=renderer.world(e.clientX,e.clientY);renderer.view.panX+=(after.x-before.x)*renderer.view.zoom;renderer.view.panY+=(after.y-before.y)*renderer.view.zoom;},{passive:false});
    function undo(redo=false){if(redo?history.redo():history.undo()){selected=null;connection=null;solve();}}
    function pause(){running=false;lastRefresh=0;$('runBtn').textContent='▶ Run';$('runBtn').setAttribute('aria-pressed','false');if(state)targetTime=state.time;}
    document.addEventListener('keydown',e=>{
        if(e.target.matches('input,select'))return;
        if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);return;}
        if(e.key==='Escape'){connection=null;setTool('select');}
        if(e.key.toLowerCase()==='r')rotate();
        if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();remove();}
        if(e.key==='Enter'&&e.target===canvas)activate(renderer.center());
    });
    $('componentEditor').onsubmit=e=>{e.preventDefault();const c=selectedComponent();if(!c)return;const value=Number($('valueInput').value)*Number($('unitSelect').value);if(!Number.isFinite(value)||(['resistor','capacitor'].includes(c.type)&&value<=0)){message('Resistance and capacitance must be positive, finite values.',true);return;}const next=D.clone(doc());next.components.find(x=>x.id===c.id).value=value;commit(next);};
    $('rotateBtn').onclick=rotate;$('deleteBtn').onclick=remove;$('closeEditorBtn').onclick=()=>select(null);$('undoBtn').onclick=()=>undo();
    $('runBtn').onclick=()=>{if(error||!state)return;if(running){pause();message('Paused · capacitor voltage is retained.');}else{running=true;lastFrame=performance.now();targetTime=state.time;$('runBtn').textContent='Ⅱ Pause';$('runBtn').setAttribute('aria-pressed','true');message('Running · capacitor timing is in real seconds. Voltage is A − B; current is A → B.');}};
    $('clearBtn').onclick=()=>{selected=null;connection=null;commit(D.blank());renderer.view={panX:0,panY:0,zoom:1};setTool('select');};
    document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.tool));
    document.addEventListener('visibilitychange',()=>{lastFrame=performance.now();if(state)targetTime=state.time;});
    function frame(now){
        const dt=(now-lastFrame)/1000;lastFrame=now;
        if(!document.hidden&&running){phase+=dt;}
        if(!document.hidden&&running&&!error&&state&&compiled.components.some(c=>c.type==='capacitor')){
            targetTime+=dt;
            try{state=D.advanceTransient(compiled,state,targetTime);if(state.behind)message('Calculating capacitor response…');}
            catch(e){error=e;pause();state=null;sync();message('Circuit cannot be solved: '+e.message,true);}
        }
        if(now-lastRefresh>=250){displaySolution=error?null:state?.acceptedSolution;const text=doc().components.map(c=>{const r=displaySolution?.componentResults[c.id];return c.label+': '+D.format(r?.voltage,'V')+', '+D.format(r?.current,'A')+(c.type==='resistor'?', '+D.format(c.value,'Ω'):'');}).join('; ');canvas.setAttribute('aria-label',text||'Blank circuit canvas. Add a component to start.');lastRefresh=now;}
        renderer.draw(draft||doc(),error?null:state?.acceptedSolution,{selected,errors:error?.ids||[],connection,pointer,phase,options:{simple:true,readings:displaySolution,markers:running&&!error}});
        requestAnimationFrame(frame);
    }
    solve();requestAnimationFrame(frame);
})();

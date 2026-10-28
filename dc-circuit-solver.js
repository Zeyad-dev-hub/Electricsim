(function(root){
    'use strict';const D=typeof module!=='undefined'?require('./dc-circuit-topology.js'):root.DCCircuit;
    class CircuitError extends Error{constructor(message,ids=[]){super(message);this.ids=ids;this.name='CircuitError';}}
    const DIODE_RON=1e-3,DIODE_GOFF=1e-12,TRANSFORMER_LM=10,TRANSFORMER_RW=1e-3,TRANSFORMER_GLEAK=1e-12;
    function linearSolve(matrix,rhs){
        const n=rhs.length;if(!n)return [];
        const a=matrix.map((row,i)=>{const scale=Math.max(...row.map(Math.abs));if(!scale)throw new CircuitError('Unconstrained node or source: add a return path or remove redundant ideal sources.');return [...row.map(v=>v/scale),rhs[i]/scale];});
        const columns=Array.from({length:n},(_,j)=>Math.max(...a.map(row=>Math.abs(row[j])))||1);
        for(const row of a)for(let j=0;j<n;j++)row[j]/=columns[j];
        for(let k=0;k<n;k++){
            let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;
            if(Math.abs(a[pivot][k])<1e-12)throw new CircuitError('Circuit is singular or ill-conditioned. Check floating nodes and ideal-source loops.');
            [a[k],a[pivot]]=[a[pivot],a[k]];
            for(let i=k+1;i<n;i++){const f=a[i][k]/a[k][k];a[i][k]=0;for(let j=k+1;j<=n;j++)a[i][j]-=f*a[k][j];}
        }
        const x=Array(n).fill(0);for(let i=n-1;i>=0;i--){let v=a[i][n];for(let j=i+1;j<n;j++)v-=a[i][j]*x[j];x[i]=v/a[i][i];}return x.map((v,i)=>v/columns[i]);
    }
    function sourceValue(c,time=0){
        if(c.type==='ac'){
            const f=Number.isFinite(c.frequency)?c.frequency:1,phase=(Number.isFinite(c.phase)?c.phase:0)*Math.PI/180;
            return c.value*Math.sin(2*Math.PI*f*time+phase);
        }
        return c.value;
    }
    function isDynamic(compiled){
        return compiled.components.some(c=>c.type==='capacitor'||c.type==='ac'||(c.type==='transformer'&&c.ratio!==null));
    }
    function constraints(compiled,initial,time=0){
        const accepted=[],adj=new Map(compiled.nets.map(n=>[n.id,[]]));
        function known(a,b){const queue=[[a,0]],seen=new Set([a]);for(let index=0;index<queue.length;index++){const [id,delta]=queue[index];if(id===b)return delta;for(const edge of adj.get(id))if(!seen.has(edge.id)){seen.add(edge.id);queue.push([edge.id,delta+edge.value]);}}return null;}
        for(const c of [...compiled.components.filter(c=>c.type==='voltage'||c.type==='ac'),...(initial?compiled.components.filter(c=>c.type==='capacitor'):[])]){
            const value=(c.type==='voltage'||c.type==='ac')?sourceValue(c,time):initial[c.id],existing=known(c.a,c.b);
            if(existing!==null){
                if(Math.abs(existing-value)>1e-8*Math.max(1,Math.abs(value),Math.abs(existing)))throw new CircuitError(`${c.label}: incompatible ideal voltage constraints. A source/charged capacitor across an ideal short can require an impulse; insert an explicit resistor.`,[c.id]);
                if(c.type==='voltage'||c.type==='ac')throw new CircuitError(`${c.label}: redundant ideal voltage constraints have nonunique source currents. Add explicit source resistance.`,[c.id]);
                continue;
            }
            accepted.push({...c,constraint:value});adj.get(c.a).push({id:c.b,value});adj.get(c.b).push({id:c.a,value:-value});
        }
        return accepted;
    }
    function solve(compiled,{mode='dc',previous={},previousInductors={},h=0,initial=null,time=0,measureWires=true}={}){
        if(mode==='transient'&&!initial&&(!Number.isFinite(h)||h<=0))throw new CircuitError('Transient step must be positive and finite.');
        const refs=D.referenceDomains(compiled,mode),referenceSet=new Set(refs.domains.map(d=>d.reference));
        const nodeIds=compiled.nets.map(n=>n.id).filter(id=>!referenceSet.has(id)),index=new Map(nodeIds.map((id,i)=>[id,i]));
        const voltageSources=constraints(compiled,initial,time);
        const transformers=compiled.components.filter(c=>c.type==='transformer'&&c.ratio!==null);
        const diodes=compiled.components.filter(c=>c.type==='diode');
        const n=nodeIds.length+voltageSources.length+transformers.length;
        const diodeStates=new Map(diodes.map(d=>[d.id,false]));
        const diagnostics=[];
        let x=[],residual=0;
        const seenStates=new Set();
        const maxIter=diodes.length?Math.min(32,(1<<Math.min(diodes.length,5))+6):1;
        for(let iter=0;iter<maxIter;iter++){
            const matrix=Array.from({length:n},()=>Array(n).fill(0)),rhs=Array(n).fill(0);
            const add=(a,b,value)=>{if(index.has(a)&&index.has(b))matrix[index.get(a)][index.get(b)]+=value;};
            const conductance=(a,b,g)=>{if(!Number.isFinite(g))throw new CircuitError('Component values exceed numerical resolution.');add(a,a,g);add(b,b,g);add(a,b,-g);add(b,a,-g);};
            const current=(a,b,i)=>{if(index.has(a))rhs[index.get(a)]-=i;if(index.has(b))rhs[index.get(b)]+=i;};
            for(const c of compiled.components){
                if(c.type==='resistor'||c.type==='lamp')conductance(c.a,c.b,1/c.value);
                if(c.type==='current')current(c.a,c.b,sourceValue(c,time));
                if(c.type==='capacitor'&&mode==='transient'&&!initial){conductance(c.a,c.b,c.value/h);current(c.a,c.b,-c.value/h*(previous[c.id]||0));}
                if(c.type==='diode'){
                    const on=diodeStates.get(c.id),vf=Number.isFinite(c.value)&&c.value>0?c.value:.7;
                    if(on){
                        const gon=1/DIODE_RON;
                        conductance(c.a,c.b,gon);
                        current(c.a,c.b,-vf*gon);
                    }else conductance(c.a,c.b,DIODE_GOFF);
                }
                if(c.type==='transformer'){
                    conductance(c.a,c.b,TRANSFORMER_GLEAK);
                    conductance(c.sa,c.sb,TRANSFORMER_GLEAK);
                    if(c.ratio!==null){
                        const gm=(mode==='transient'&&!initial)?h/TRANSFORMER_LM:1/TRANSFORMER_RW;
                        const imPrev=(mode==='transient')?(previousInductors[c.id]||0):0;
                        if(mode==='transient'&&!initial){
                            conductance(c.a,c.b,gm);
                            current(c.a,c.b,imPrev);
                        }else if(mode==='dc'){
                            conductance(c.a,c.b,gm);
                        }else if(initial){
                            current(c.a,c.b,imPrev);
                        }
                    }
                }
            }
            voltageSources.forEach((s,k)=>{const j=nodeIds.length+k;for(const [id,sign] of [[s.a,1],[s.b,-1]])if(index.has(id)){matrix[index.get(id)][j]+=sign;matrix[j][index.get(id)]+=sign;}rhs[j]=s.constraint;});
            transformers.forEach((t,k)=>{
                const j=nodeIds.length+voltageSources.length+k,r=t.ratio;
                for(const [id,sign] of [[t.sa,1],[t.sb,-1]])if(index.has(id)){matrix[index.get(id)][j]+=sign;matrix[j][index.get(id)]+=sign;}
                for(const [id,sign] of [[t.a,-r],[t.b,r]])if(index.has(id)){matrix[index.get(id)][j]+=sign;matrix[j][index.get(id)]+=sign;}
                matrix[j][j]-=TRANSFORMER_RW;
            });
            try{x=linearSolve(matrix,rhs);}catch(error){if(error instanceof CircuitError&&!error.ids.length)error.ids=compiled.components.map(c=>c.id);throw error;}
            residual=0;for(let i=0;i<n;i++){let sum=-rhs[i],scale=Math.abs(rhs[i]);for(let j=0;j<n;j++){sum+=matrix[i][j]*x[j];scale+=Math.abs(matrix[i][j]*x[j]);}residual=Math.max(residual,Math.abs(sum)/Math.max(1e-12,scale));}
            if(!diodes.length)break;
            const stateKey=diodes.map(d=>diodeStates.get(d.id)?'1':'0').join('');
            seenStates.add(stateKey);
            let changed=false;
            for(const d of diodes){
                const va=index.has(d.a)?x[index.get(d.a)]:0,vb=index.has(d.b)?x[index.get(d.b)]:0,vak=va-vb;
                const vf=Number.isFinite(d.value)&&d.value>0?d.value:.7;
                const on=diodeStates.get(d.id);
                if(!on&&vak>vf+1e-7){diodeStates.set(d.id,true);changed=true;}
                else if(on&&(vak-vf)/DIODE_RON<-1e-9){diodeStates.set(d.id,false);changed=true;}
            }
            if(!changed)break;
            const nextKey=diodes.map(d=>diodeStates.get(d.id)?'1':'0').join('');
            if(seenStates.has(nextKey)){diagnostics.push('Diode switching state settled using hysteresis tie-break.');break;}
        }
        if(!Number.isFinite(residual)||residual>1e-6)throw new CircuitError('Numerical residual is too large; rescale extreme component values.');
        const nodeVoltages={};for(const net of compiled.nets)nodeVoltages[net.id]={value:index.has(net.id)?x[index.get(net.id)]:0,domain:refs.domainOf.get(net.id).id,local:refs.domainOf.get(net.id).local,reference:refs.domainOf.get(net.id).reference};
        const componentResults={};
        for(const c of compiled.components){
            if(c.type==='transformer'){
                const vpa=nodeVoltages[c.a].value,vpb=nodeVoltages[c.b].value,vsa=nodeVoltages[c.sa].value,vsb=nodeVoltages[c.sb].value;
                const vp=vpa-vpb,vs=vsa-vsb;
                const k=transformers.findIndex(t=>t.id===c.id);
                const is=k<0?0:x[nodeIds.length+voltageSources.length+k];
                const im=c.ratio===null?0:(mode==='transient'&&!initial)?(previousInductors[c.id]||0)+(h/TRANSFORMER_LM)*vp:(mode==='dc'?vp/TRANSFORMER_RW:(previousInductors[c.id]||0));
                const ip=c.ratio===null?0:-c.ratio*is+im;
                const power=vp*ip+vs*is;
                componentResults[c.id]={
                    va:vpa,vb:vpb,vsa,vsb,
                    voltage:vp,primaryVoltage:vp,secondaryVoltage:vs,
                    current:ip,primaryCurrent:ip,secondaryCurrent:is,magnetizingCurrent:im,
                    power,ratio:c.ratio,configured:c.ratio!==null,
                    domainA:nodeVoltages[c.a].domain,domainB:nodeVoltages[c.b].domain,
                    domainSA:nodeVoltages[c.sa].domain,domainSB:nodeVoltages[c.sb].domain,
                    local:nodeVoltages[c.a].local||nodeVoltages[c.b].local||nodeVoltages[c.sa].local||nodeVoltages[c.sb].local
                };
                continue;
            }
            const va=nodeVoltages[c.a].value,vb=nodeVoltages[c.b].value,same=nodeVoltages[c.a].domain===nodeVoltages[c.b].domain,v=same?va-vb:null;
            let i=0;if(c.type==='resistor'||c.type==='lamp')i=v/c.value;
            if(c.type==='current')i=sourceValue(c,time);
            if(c.type==='voltage'||c.type==='ac'){const k=voltageSources.findIndex(s=>s.id===c.id);i=k<0?null:x[nodeIds.length+k];}
            if(c.type==='capacitor')i=mode==='dc'?0:initial?null:c.value/h*(v-(previous[c.id]||0));
            if(c.type==='diode'){
                const on=diodeStates.get(c.id),vf=Number.isFinite(c.value)&&c.value>0?c.value:.7;
                i=v===null?null:on?(v-vf)/DIODE_RON:v*DIODE_GOFF;
            }
            if(c.type==='switch'&&c.closed)i=null;
            const result={va,vb,voltage:v,current:i,power:i===null||v===null?null:v*i,domainA:nodeVoltages[c.a].domain,domainB:nodeVoltages[c.b].domain,local:nodeVoltages[c.a].local||nodeVoltages[c.b].local};
            if(c.type==='capacitor'){result.charge=v===null?null:c.value*v;result.energy=v===null?null:.5*c.value*v*v;}
            if(c.type==='diode'){result.conducting=!!diodeStates.get(c.id);result.forwardVoltage=Number.isFinite(c.value)&&c.value>0?c.value:.7;}
            if(c.type==='ac'){result.instantaneousVoltage=sourceValue(c,time);result.peakVoltage=c.value;result.rmsVoltage=Math.abs(c.value)/Math.SQRT2;result.frequency=c.frequency;result.phase=c.phase||0;}
            componentResults[c.id]=result;
        }
        const recovered=measureWires?D.recoverWireCurrents(compiled,componentResults):{wireResults:{},maxKCL:0};
        for(const c of compiled.components)if(c.type==='switch'&&c.closed&&recovered.wireResults[c.id]){const r=componentResults[c.id];r.current=recovered.wireResults[c.id].current;r.power=r.current===null?null:0;}
        return {nodeVoltages,componentResults,wireResults:recovered.wireResults,branchResults:measureWires?D.traceBranches(compiled,componentResults,recovered.wireResults):[],residuals:{matrix:residual,kcl:recovered.maxKCL},diagnostics,initialCurrentEstimate:!!initial&&compiled.components.some(c=>c.type==='capacitor')};
    }
    function voltages(compiled,solution){return Object.fromEntries(compiled.components.filter(c=>c.type==='capacitor').map(c=>[c.id,solution.componentResults[c.id].voltage]));}
    function inductorCurrents(compiled,solution){return Object.fromEntries(compiled.components.filter(c=>c.type==='transformer'&&c.ratio!==null).map(c=>[c.id,solution.componentResults[c.id].magnetizingCurrent||0]));}
    function maxStepForAC(compiled){
        const freqs=compiled.components.filter(c=>c.type==='ac'&&Number.isFinite(c.frequency)&&c.frequency>0).map(c=>c.frequency);
        return freqs.length?Math.min(1,1/(Math.max(...freqs)*48)):1;
    }
    function initialStep(compiled){
        const rs=compiled.components.filter(c=>c.type==='resistor'||c.type==='lamp').map(c=>c.value),cs=compiled.components.filter(c=>c.type==='capacitor').map(c=>c.value);
        if(rs.length&&cs.length)return Math.max(1e-14,Math.min(...rs)*Math.min(...cs)*1e-6);
        const acMax=maxStepForAC(compiled);
        return acMax<1?acMax*1e-2:1e-8;
    }
    function initializeTransient(compiled,initialVoltages,initialInductors,time=0){
        const caps=initialVoltages||Object.fromEntries(compiled.components.filter(c=>c.type==='capacitor').map(c=>[c.id,c.initialVoltage]));
        const inductors=initialInductors||Object.fromEntries(compiled.components.filter(c=>c.type==='transformer'&&c.ratio!==null).map(c=>[c.id,0]));
        const hasReactive=Object.keys(caps).length>0||Object.keys(inductors).length>0;
        const exact=solve(compiled,{mode:hasReactive?'transient':'dc',initial:caps,previousInductors:inductors,time,measureWires:false});
        if(Object.keys(caps).length){
            const estimate=solve(compiled,{mode:'transient',previous:caps,previousInductors:inductors,h:initialStep(compiled),time,measureWires:false});
            for(const c of compiled.components){exact.componentResults[c.id].current=estimate.componentResults[c.id].current;exact.componentResults[c.id].power=exact.componentResults[c.id].voltage*estimate.componentResults[c.id].current;}
        }
        const recovered=D.recoverWireCurrents(compiled,exact.componentResults);exact.wireResults=recovered.wireResults;exact.branchResults=D.traceBranches(compiled,exact.componentResults,exact.wireResults);
        exact.residuals.kcl=recovered.maxKCL;
        for(const c of compiled.components)if(c.type==='switch'&&c.closed){const r=exact.componentResults[c.id];r.current=exact.wireResults[c.id]?.current??null;r.power=r.current===null?null:0;}
        return {time,capacitorVoltagesById:{...caps},inductorCurrentsById:{...inductors},acceptedSolution:exact,lastStepSize:Math.min(maxStepForAC(compiled),Math.max(1e-8,initialStep(compiled)*100)),diagnostics:[],traceSamples:[],events:[]};
    }
    function advanceTransient(compiled,state,targetTime,{relative=1e-5,absolute=1e-7,maxAttempts=240,budgetMs=Infinity,now=()=>performance.now()}={}){
        if(!Number.isFinite(targetTime)||targetTime<state.time)throw new CircuitError('Target time must be finite and cannot go backwards.');
        const started=Number.isFinite(budgetMs)?now():0;
        let time=state.time,caps={...state.capacitorVoltagesById},inductors={...(state.inductorCurrentsById||{})},solution=state.acceptedSolution,h=state.lastStepSize||1e-4,attempts=0;const samples=[];
        const hasCaps=Object.keys(caps).length>0,hasInductors=Object.keys(inductors).length>0,hasAC=compiled.components.some(c=>c.type==='ac');
        if(!hasCaps&&!hasInductors&&!hasAC){
            solution=solve(compiled,{time:targetTime});
            return {...state,time:targetTime,acceptedSolution:solution,samples:[{time:targetTime,solution}],behind:false};
        }
        const stepCap=maxStepForAC(compiled);
        if(!hasCaps&&!hasInductors){
            while(time<targetTime-1e-12&&attempts++<maxAttempts){
                if(attempts>1&&Number.isFinite(budgetMs)&&now()-started>=budgetMs)break;
                const step=Math.min(stepCap,targetTime-time);
                time+=step;
                solution=solve(compiled,{mode:'dc',time,measureWires:false});
                samples.push({time,solution});
            }
            const recovered=D.recoverWireCurrents(compiled,solution.componentResults);
            solution={...solution,wireResults:recovered.wireResults,branchResults:D.traceBranches(compiled,solution.componentResults,recovered.wireResults),residuals:{...solution.residuals,kcl:recovered.maxKCL}};
            solution.componentResults=Object.fromEntries(Object.entries(solution.componentResults).map(([id,r])=>[id,{...r}]));
            for(const c of compiled.components)if(c.type==='switch'&&c.closed){const r=solution.componentResults[c.id];r.current=solution.wireResults[c.id]?.current??null;r.power=r.current===null?null:0;}
            return {...state,time,capacitorVoltagesById:caps,inductorCurrentsById:inductors,acceptedSolution:solution,lastStepSize:stepCap,samples,behind:time<targetTime-1e-9};
        }
        while(time<targetTime-1e-12&&attempts++<maxAttempts){
            if(attempts>1&&Number.isFinite(budgetMs)&&now()-started>=budgetMs)break;
            h=Math.min(h,targetTime-time,stepCap);if(h<1e-14)throw new CircuitError('The transient requires steps below numerical resolution. Use less extreme values.');
            const full=solve(compiled,{mode:'transient',previous:caps,previousInductors:inductors,h,time:time+h,measureWires:false});
            const half=solve(compiled,{mode:'transient',previous:caps,previousInductors:inductors,h:h/2,time:time+h/2,measureWires:false});
            const fine=solve(compiled,{mode:'transient',previous:voltages(compiled,half),previousInductors:inductorCurrents(compiled,half),h:h/2,time:time+h,measureWires:false});
            const next=voltages(compiled,fine),nextInd=inductorCurrents(compiled,fine);
            let error=0;
            for(const id of Object.keys(caps))error=Math.max(error,Math.abs(next[id]-full.componentResults[id].voltage)/(absolute+relative*Math.max(Math.abs(next[id]),Math.abs(caps[id]))));
            for(const id of Object.keys(inductors))error=Math.max(error,Math.abs(nextInd[id]-full.componentResults[id].magnetizingCurrent)/(absolute+relative*Math.max(Math.abs(nextInd[id]),Math.abs(inductors[id]))));
            if(error<=1){time+=h;caps=next;inductors=nextInd;solution=fine;samples.push({time,solution});h*=Math.min(2,Math.max(.5,.9/Math.sqrt(Math.max(error,1e-12))));}else h*=Math.max(.1,.9/Math.sqrt(error));
        }
        const recovered=D.recoverWireCurrents(compiled,solution.componentResults);solution={...solution,wireResults:recovered.wireResults,branchResults:D.traceBranches(compiled,solution.componentResults,recovered.wireResults),residuals:{...solution.residuals,kcl:recovered.maxKCL}};
        solution.componentResults=Object.fromEntries(Object.entries(solution.componentResults).map(([id,r])=>[id,{...r}]));
        for(const c of compiled.components)if(c.type==='switch'&&c.closed){const r=solution.componentResults[c.id];r.current=solution.wireResults[c.id]?.current??null;r.power=r.current===null?null:0;}
        return {...state,time,capacitorVoltagesById:caps,inductorCurrentsById:inductors,acceptedSolution:solution,lastStepSize:h,samples,behind:time<targetTime-1e-9};
    }
    Object.assign(D,{CircuitError,linearSolve,sourceValue,isDynamic,solveDC:c=>solve(c),solve,initializeTransient,advanceTransient});if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);

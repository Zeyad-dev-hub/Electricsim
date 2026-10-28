(function(root){
    'use strict';
    const D=typeof module!=='undefined'?require('./dc-circuit-solver.js'):root.DCCircuit;

    // Geometry is deliberately absent: moving a symbol never resets stored energy.
    function electricalKey(doc){
        return JSON.stringify({
            components:doc.components.map(({id,type,terminals,value,closed,initialVoltage,frequency,phase,turnsPrimary,turnsSecondary})=>({id,type,terminals,value,closed,initialVoltage,frequency,phase,turnsPrimary,turnsSecondary})),
            wires:doc.wires.map(({id,fromEndpoint,toEndpoint})=>({id,fromEndpoint,toEndpoint})),
            junctions:doc.junctions.map(j=>j.id),references:doc.referenceEndpoints
        });
    }
    class Simulation{
        constructor(document=D.blank()){
            this.history=new D.History(document);this.state=null;this.retained=null;
            this.compiled=null;this.error=null;this.key=null;this.rebuild();
        }
        get doc(){return this.history.doc;}
        rebuild(reset=false){
            const nextKey=electricalKey(this.doc),changed=reset||nextKey!==this.key||!!this.error;
            this.error=null;
            try{
                const compiled=D.compileCircuit(this.doc);
                if(changed){
                    const previous=reset?null:this.state||this.retained;
                    const caps=Object.fromEntries(this.doc.components.filter(c=>c.type==='capacitor').map(c=>[c.id,previous?.capacitorVoltagesById?.[c.id]??c.initialVoltage]));
                    const inductors=Object.fromEntries(this.doc.components.filter(c=>c.type==='transformer'&&Number.isInteger(c.turnsPrimary)&&Number.isInteger(c.turnsSecondary)).map(c=>[c.id,previous?.inductorCurrentsById?.[c.id]??0]));
                    const next=D.initializeTransient(compiled,caps,inductors,previous?.time||0);
                    this.state=next;this.retained=next;
                }
                this.compiled=compiled;this.key=nextKey;
            }catch(error){
                this.error=error;this.state=null;this.compiled=null;
            }
            return changed;
        }
        commit(next){if(JSON.stringify(next)===JSON.stringify(this.doc))return false;this.history.commit(next);return this.rebuild();}
        undo(redo=false){
            if(!(redo?this.history.redo():this.history.undo()))return null;
            return this.rebuild();
        }
        reset(){this.retained=null;this.state=null;return this.rebuild(true);}
        advance(target,options){
            if(this.error||!this.state)return;
            if(!D.isDynamic(this.compiled)){
                this.state={...this.state,time:target,samples:[],behind:false};this.retained=this.state;return this.state;
            }
            const next=D.advanceTransient(this.compiled,this.state,target,options);
            this.state=next;this.retained=next;return next;
        }
    }

    const wrap=(distance,length)=>length>0?((distance%length)+length)%length:0;
    function pathMetrics(points){
        const cumulative=[0];
        for(let i=1;i<points.length;i++)cumulative.push(cumulative.at(-1)+Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
        return {points,cumulative,length:cumulative.at(-1)||0};
    }
    function pointAtDistance(path,distance){
        if(!path.points.length)return {x:0,y:0,angle:0};
        const d=Math.max(0,Math.min(path.length,distance));
        for(let i=1;i<path.points.length;i++)if(d<=path.cumulative[i]){
            const a=path.points[i-1],b=path.points[i],length=path.cumulative[i]-path.cumulative[i-1],t=length?(d-path.cumulative[i-1])/length:0;
            return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle:Math.atan2(b.y-a.y,b.x-a.x)};
        }
        return {...path.points.at(-1),angle:0};
    }
    class CurrentMotion{
        constructor(){this.distances=new Map();this.reference=.01;this.clipped=false;}
        reset(){this.distances.clear();this.clipped=false;}
        calibrate(solution,compiled=null){
            const currentPeak=s=>Math.max(0,...Object.values(s?.componentResults||{}).flatMap(r=>[Math.abs(r.current)||0,Math.abs(r.primaryCurrent)||0,Math.abs(r.secondaryCurrent)||0]));
            let peak=currentPeak(solution);
            if(compiled&&compiled.components.some(c=>c.type==='ac')){
                const freqs=compiled.components.filter(c=>c.type==='ac'&&c.frequency>0).map(c=>c.frequency);
                const period=freqs.length?1/Math.min(...freqs):1;
                try{
                    for(let k=1;k<=8;k++){
                        const sample=D.solve(compiled,{mode:'dc',time:period*k/16,measureWires:false});
                        peak=Math.max(peak,currentPeak(sample));
                    }
                }catch{}
            }
            this.reference=peak>1e-14?Math.pow(10,Math.ceil(Math.log10(peak))):.01;
        }
        advance(solution,dt,previous=solution){
            if(!Number.isFinite(dt)||dt<=0)return;
            this.clipped=false;
            for(const [id,result] of Object.entries(solution?.wireResults||{})){
                if(!Number.isFinite(result.current))continue;
                const old=previous?.wireResults[id]?.current;
                const current=Number.isFinite(old)?(old+result.current)/2:result.current;
                const raw=60*current/this.reference,velocity=Math.max(-240,Math.min(240,raw));
                this.clipped=this.clipped||Math.abs(raw)>240;
                this.distances.set(id,(this.distances.get(id)||0)+velocity*dt);
            }
        }
        distance(id){return this.distances.get(id)||0;}
        reconcile(before,after){
            const ids=new Set(after.wires.map(w=>w.id));
            const removed=before.wires.filter(w=>!ids.has(w.id)).map(w=>({id:w.id,path:pathMetrics(D.wireRoute(before,w))}));
            function locate(path,point){
                for(let i=1;i<path.points.length;i++){
                    const a=path.points[i-1],b=path.points[i],length=path.cumulative[i]-path.cumulative[i-1];
                    if(Math.abs(Math.hypot(point.x-a.x,point.y-a.y)+Math.hypot(point.x-b.x,point.y-b.y)-length)<1e-6)return path.cumulative[i-1]+Math.hypot(point.x-a.x,point.y-a.y);
                }
                return null;
            }
            for(const wire of after.wires){
                if(this.distances.has(wire.id))continue;
                const path=pathMetrics(D.wireRoute(after,wire));
                for(const old of removed){
                    const from=locate(old.path,path.points[0]),to=locate(old.path,path.points.at(-1));
                    if(from!==null&&to!==null&&Math.abs(Math.abs(to-from)-path.length)<1e-6){this.distances.set(wire.id,to>=from?this.distance(old.id)-from:from-this.distance(old.id));break;}
                }
            }
            for(const id of this.distances.keys())if(!ids.has(id))this.distances.delete(id);
        }
    }
    Object.assign(D,{Simulation,electricalKey,CurrentMotion,pathMetrics,pointAtDistance,wrap});
    if(typeof module!=='undefined')module.exports=D;
})(typeof window!=='undefined'?window:globalThis);

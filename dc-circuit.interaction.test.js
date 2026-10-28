'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require('playwright');
(async()=>{
 const root=__dirname,server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:process.env.CIRCUIT_BROWSER_CHANNEL||'msedge'}:{})});
  const errors=[];
  async function pageFor(options){
   const context=await browser.newContext(options),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://fonts.googleapis.com/**',route=>route.abort());
   // Observe editor state in the test harness without adding production hooks.
   await page.route(/dc-circuit-(renderer|simulation)\.js/,async route=>{
    const response=await route.fetch(),name=route.request().url().includes('renderer')?'Renderer':'Simulation';
    const observe=name==='Renderer'?'draw(...args){window.__drawn=window.DCCircuit.clone(args[0]);window.__preview=args[2]?.placement;return super.draw(...args);}':'';
    await route.fulfill({response,body:(await response.text())+`\n{const Base=window.DCCircuit.${name};window.DCCircuit.${name}=class extends Base{constructor(...args){super(...args);window.__${name.toLowerCase()}=this;}${observe}};}`});
   });
   await page.goto(`http://127.0.0.1:${server.address().port}/dc-circuit.html`);await page.waitForFunction(()=>window.__drawn);
   return page;
  }
  const page=await pageFor({viewport:{width:1366,height:900}}),canvas=page.locator('#circuitCanvas');
  const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const state=()=>page.evaluate(()=>({doc:window.__simulation.doc,undo:window.__simulation.history.undoStack.length,drawn:window.__drawn,preview:window.__preview,view:window.__renderer.view}));
  async function screen(x,y){await settle();return page.evaluate(({x,y})=>{const r=window.__renderer,b=r.canvas.getBoundingClientRect();return {x:b.left+r.width/2+r.view.panX+x*r.view.zoom,y:b.top+r.height/2+r.view.panY+y*r.view.zoom};},{x,y});}
  async function clickWorld(x,y){const p=await screen(x,y);await page.mouse.click(p.x,p.y);await settle();}
  async function choose(label){await page.locator('#selectionSelect').selectOption({label});await settle();}
  await page.locator('[data-tool=resistor]').click();
  let p=await screen(0,0);await page.mouse.move(p.x,p.y);await page.mouse.down();
  assert.equal((await state()).doc.components.length,0,'Press must not immediately place a component');
  await page.mouse.move(p.x+37,p.y+19);await settle();assert.equal((await state()).doc.components.length,0);
  await page.mouse.up();await settle();let s=await state();assert.deepEqual(s.doc.components[0].position,{x:48,y:24});
  // Opening/closing the inspector must not shift the component on screen.
  const beforeClose=await screen(48,24);await page.locator('#closeEditorBtn').click();await settle();const afterClose=await screen(48,24);
  assert.ok(Math.hypot(beforeClose.x-afterClose.x,beforeClose.y-afterClose.y)<1,'Inspector close shifted the drawing');
  await clickWorld(48,24);const afterOpen=await screen(48,24);assert.ok(Math.hypot(afterOpen.x-afterClose.x,afterOpen.y-afterClose.y)<1,'Inspector open shifted the drawing');
  const undo=s.undo;p=afterOpen;await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+13,p.y+7);await settle();s=await state();
  assert.deepEqual(s.doc.components[0].position,{x:48,y:24});assert.deepEqual(s.drawn.components[0].position,{x:61,y:31},'Drag preview must move smoothly, before grid snapping');
  await page.mouse.move(p.x+37,p.y+19);await page.mouse.up();await settle();s=await state();assert.deepEqual(s.doc.components[0].position,{x:96,y:48});assert.equal(s.undo,undo+1,'One drag must create one undo entry');
  await page.locator('#undoBtn').click();await settle();assert.deepEqual((await state()).doc.components[0].position,{x:48,y:24});
  // Escape discards a draft instead of committing a half-completed move.
  p=await screen(48,24);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+70,p.y+20);await page.keyboard.press('Escape');await page.mouse.up();await settle();assert.deepEqual((await state()).doc.components[0].position,{x:48,y:24});
  await page.locator('#snapToggle').uncheck();p=await screen(48,24);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+13,p.y+7);await page.mouse.up();await settle();assert.deepEqual((await state()).doc.components[0].position,{x:61,y:31});
  await canvas.focus();await page.keyboard.press('Shift+ArrowRight');assert.equal((await state()).doc.components[0].position.x,62);
  await page.locator('#snapToggle').check();p=await screen(62,31);await page.keyboard.down('Shift');await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+13,p.y+7);await page.mouse.up();await page.keyboard.up('Shift');await settle();assert.deepEqual((await state()).doc.components[0].position,{x:75,y:38});await page.locator('#snapToggle').uncheck();
  await page.locator('#valueInput').fill('470');await page.locator('#componentEditor button[type=submit]').click();await page.locator('#rotateBtn').click();
  await page.locator('#duplicateBtn').click();await settle();s=await state();assert.equal(s.doc.components.length,1);assert.equal(s.preview.value,470);assert.equal(s.preview.rotation,90);
  await clickWorld(230,107);s=await state();assert.equal(s.doc.components.length,2);assert.equal(s.doc.components[1].value,470);assert.equal(s.doc.components[1].rotation,90);assert.deepEqual(s.doc.components[1].position,{x:230,y:107});assert.notEqual(s.doc.components[0].terminals[0],s.doc.components[1].terminals[0]);
  await page.locator('#repeatToggle').check();await page.locator('[data-tool=capacitor]').click();await page.locator('#rotatePlacementBtn').click();await clickWorld(-144,-96);await clickWorld(-144,96);
  s=await state();assert.equal(s.doc.components.length,4);assert.equal(s.doc.components[2].rotation,90);assert.equal(s.doc.components[3].rotation,90);assert.equal(await page.locator('[data-tool=capacitor]').getAttribute('aria-pressed'),'true');
  await canvas.focus();await page.keyboard.press('Escape');assert.equal(await page.locator('[data-tool=select]').getAttribute('aria-pressed'),'true');
  // Background dragging pans without changing circuit geometry or history.
  s=await state();p=await screen(0,160);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+40,p.y-20);await page.mouse.up();await settle();let after=await state();assert.deepEqual(after.doc,s.doc);assert.equal(after.undo,s.undo);assert.equal(after.view.panX,s.view.panX+40);assert.equal(after.view.panY,s.view.panY-20);
  await page.locator('[data-tool=wire]').click();await choose('R1 terminal B');await page.locator('#connectSelectedBtn').click();await choose('R2 terminal A');await page.locator('#connectSelectedBtn').click();await page.locator('[data-tool=select]').click();await settle();
  const wireSegment=await page.evaluate(()=>{const r=window.__renderer,doc=window.__simulation.doc,w=doc.wires[0],path=window.DCCircuit.wireRoute(doc,w);return path.slice(1).map((b,i)=>({a:path[i],b,length:Math.hypot(b.x-path[i].x,b.y-path[i].y)})).sort((a,b)=>b.length-a.length).find(s=>r.hit(doc,{x:(s.a.x+s.b.x)/2,y:(s.a.y+s.b.y)/2},{preferComponent:true})?.kind==='wire');});
  assert.ok(wireSegment,'No selectable wire segment');s=await state();p=await screen((wireSegment.a.x+wireSegment.b.x)/2,(wireSegment.a.y+wireSegment.b.y)/2);const vertical=Math.abs(wireSegment.a.x-wireSegment.b.x)<1e-7;
  await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+(vertical?17:0),p.y+(vertical?0:17));await page.mouse.up();await settle();after=await state();assert.equal(after.undo,s.undo+1);assert.equal(after.doc.wires[0].fromEndpoint,s.doc.wires[0].fromEndpoint);assert.equal(after.doc.wires[0].toEndpoint,s.doc.wires[0].toEndpoint);assert.notDeepEqual(after.doc.wires[0].waypoints,s.doc.wires[0].waypoints);
  assert.ok(await page.evaluate(()=>{const p=window.DCCircuit.wireRoute(window.__simulation.doc,window.__simulation.doc.wires[0]);return p.slice(1).every((b,i)=>Math.abs(b.x-p[i].x)<1e-7||Math.abs(b.y-p[i].y)<1e-7);}));await page.locator('#undoBtn').click();await settle();assert.deepEqual((await state()).doc.wires,s.doc.wires);
  const previousDoc=await page.evaluate(()=>window.DCCircuit.clone(window.__simulation.history.undoStack.at(-1)));s=await state();p=await screen(s.doc.components[0].position.x,s.doc.components[0].position.y);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+35,p.y+20);await page.keyboard.press('Control+z');await page.mouse.up();await settle();assert.deepEqual((await state()).doc,previousDoc,'Undo during dragging allowed an old draft to overwrite history');
  s=await state();await canvas.evaluate(c=>c.addEventListener('pointerdown',e=>window.__capturedPointer=e.pointerId,{once:true}));p=await screen(s.doc.components[0].position.x,s.doc.components[0].position.y);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+25,p.y+20);await canvas.evaluate(c=>c.releasePointerCapture(window.__capturedPointer));await page.mouse.move(p.x+30,p.y+25);await page.mouse.up();await settle();assert.deepEqual((await state()).doc,s.doc,'Lost pointer capture committed an unfinished drag');
  console.log('PASS desktop: deferred placement, stable inspector, smooth dragging, snap/free movement, single undo, Escape, fine keys, duplicate, repeated/rotated placement, background pan, wire reshaping');
  // Real touch gestures must work in every tool and never place an extra part
  // when a second finger arrives, even if the first finger is over a component.
  const phone=await pageFor({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:3}),phoneCanvas=phone.locator('#circuitCanvas'),cdp=await phone.context().newCDPSession(phone);
  for(const tool of ['resistor','wire','ground','select','pan']){
   await phone.locator(`[data-tool=${tool}]`).tap();await phone.locator('#fitBtn').tap();await phoneCanvas.scrollIntoViewIfNeeded();const b=await phoneCanvas.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
   const before=await phone.evaluate(()=>({doc:window.DCCircuit.clone(window.__simulation.doc),undo:window.__simulation.history.undoStack.length,view:{...window.__renderer.view}}));
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y,id:1}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y,id:1},{x:x+30,y,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-55,y:y+25,id:1},{x:x+55,y:y+25,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[{x:x+55,y:y+25,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+70,y:y+30,id:2}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   const after=await phone.evaluate(()=>({doc:window.__simulation.doc,undo:window.__simulation.history.undoStack.length,view:{...window.__renderer.view}}));assert.deepEqual(after.doc,before.doc,`${tool}: pinch edited circuit`);assert.equal(after.undo,before.undo);assert.ok(after.view.zoom>before.view.zoom,`${tool}: pinch did not zoom`);
  }
  await phone.locator('[data-tool=lamp]').tap();await phoneCanvas.scrollIntoViewIfNeeded();let b=await phoneCanvas.boundingBox(),x=b.x+b.width/2,y=b.y+b.height/2;
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});assert.equal(await phone.locator('#selectionSelect option').count(),1,'Canceled placement created a lamp');
  await phone.touchscreen.tap(x,y);assert.equal(await phone.locator('#selectionSelect option').filter({hasText:'L1 · lamp'}).count(),1);await phone.locator('#fitBtn').tap();await phoneCanvas.scrollIntoViewIfNeeded();
  const geometry=await phone.evaluate(()=>{const r=window.__renderer,c=window.__simulation.doc.components[0],b=r.canvas.getBoundingClientRect();return {x:b.x+r.width/2+r.view.panX+c.position.x*r.view.zoom,y:b.y+r.height/2+r.view.panY+c.position.y*r.view.zoom,position:c.position,undo:window.__simulation.history.undoStack.length};});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:geometry.x,y:geometry.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:geometry.x+2,y:geometry.y+2,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.deepEqual(await phone.evaluate(()=>window.__simulation.doc.components[0].position),geometry.position);assert.equal(await phone.evaluate(()=>window.__simulation.history.undoStack.length),geometry.undo,'Finger jitter created history');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:geometry.x,y:geometry.y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:geometry.x+15,y:geometry.y+5,id:1}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:geometry.x+15,y:geometry.y+5,id:1},{x:geometry.x+60,y:geometry.y,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:geometry.x-10,y:geometry.y+5,id:1},{x:geometry.x+85,y:geometry.y,id:2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.deepEqual(await phone.evaluate(()=>window.__simulation.doc.components[0].position),geometry.position);assert.equal(await phone.evaluate(()=>window.__simulation.history.undoStack.length),geometry.undo,'Pinch committed a component drag');
  await phone.screenshot({path:path.join(os.tmpdir(),'electricsim-interaction-phone.png'),fullPage:true});await cdp.detach();
  console.log('PASS touch: pinch/pan in every tool, release-one-finger protection, canceled placement, subsequent tap, finger-jitter threshold, pinch cancels a component drag');
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});

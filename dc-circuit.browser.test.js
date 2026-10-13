'use strict';
const assert=require('node:assert/strict');const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require('playwright');
(async()=>{
 const root=__dirname,server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:process.env.CIRCUIT_BROWSER_CHANNEL||'msedge'}:{})});
  const page=await browser.newPage({viewport:{width:1366,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://fonts.googleapis.com/**',route=>route.abort());await page.goto(`http://127.0.0.1:${server.address().port}/dc-circuit.html`);
  const canvas=page.locator('#circuitCanvas');
  async function at(x,y){const b=await canvas.boundingBox();await page.mouse.click(b.x+b.width/2+x,b.y+b.height/2+y);}
  async function add(type,x,y,rotate=false){await page.locator(`[data-tool="${type}"]`).click();await at(x,y);if(rotate)await page.locator('#rotateBtn').click();}
  async function choose(label){await page.locator('#selectionSelect').selectOption({label});}
  async function connect(a,b){await page.locator('[data-tool="wire"]').click();await choose(a);await page.locator('#connectSelectedBtn').click();await choose(b);await page.locator('#connectSelectedBtn').click();}
  await add('voltage',-216,0,true);await add('resistor',0,-144);await add('capacitor',216,0,true);
  await connect('V1 terminal A','R1 terminal A');await connect('R1 terminal B','C1 terminal A');await connect('C1 terminal B','V1 terminal B');
  assert.ok((await page.locator('#status').innerText()).startsWith('Paused'));
  await page.locator('[data-tool="ground"]').click();await choose('V1 terminal B');await page.locator('#connectSelectedBtn').click();
  assert.match(await page.locator('#objectTitle').innerText(),/Ground/);assert.equal(await page.locator('#selectionSelect option').filter({hasText:/^Ground /}).count(),1);
  await page.locator('[data-tool="select"]').click();await choose('C1 · capacitor');
  await page.locator('#runBtn').click();await page.waitForTimeout(1050);await page.locator('#runBtn').click();
  async function voltage(){return Number((await page.locator('#selectedReadings dd').first().innerText()).split(' ')[0]);}
  const charged=await voltage();assert.ok(charged>5&&charged<7,`Unexpected RC voltage: ${charged}`);
  await page.locator('#rotateBtn').click();await page.locator('#undoBtn').click();await choose('C1 · capacitor');assert.equal(await voltage(),charged);
  await page.locator('#redoBtn').click();await choose('C1 · capacitor');assert.equal(await voltage(),charged);
  // A ground at both battery terminals creates an invalid ideal short.
  await page.locator('[data-tool="ground"]').click();await choose('V1 terminal A');await page.locator('#connectSelectedBtn').click();
  assert.match(await page.locator('#status').innerText(),/incompatible/);assert.ok(await page.locator('#runBtn').isDisabled());
  await page.locator('#undoBtn').click();await choose('C1 · capacitor');assert.equal(await voltage(),charged);
  await page.locator('#stepBtn').click();await page.waitForFunction(()=>!document.getElementById('stepBtn').disabled);assert.ok(await voltage()>charged);
  await page.locator('#resetBtn').click();assert.equal(await voltage(),0);assert.equal(await page.locator('#timeReadout').innerText(),'0 s');
  await page.locator('#runBtn').click();await page.waitForTimeout(450);await page.locator('#runBtn').click();
  await page.screenshot({path:path.join(os.tmpdir(),'electricsim-desktop.png'),fullPage:true});
  // Ground is selectable/removable without deleting its terminal.
  await choose('Ground 1');await page.locator('#deleteObjectBtn').click();assert.equal(await page.locator('#selectionSelect option').filter({hasText:/^Ground /}).count(),0);await page.locator('#undoBtn').click();
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!document.getElementById('motionToggle').checked);assert.equal(await page.locator('#motionToggle').isChecked(),false);
  for(const width of [375,320]){
   await page.setViewportSize({width,height:740});await choose('C1 · capacitor');await page.waitForTimeout(100);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Horizontal overflow at ${width}`);
   const layout=await page.evaluate(()=>({canvasBottom:document.getElementById('circuitCanvas').getBoundingClientRect().bottom,inspectorTop:document.getElementById('inspector').getBoundingClientRect().top}));assert.ok(layout.inspectorTop>=layout.canvasBottom,`Inspector overlaps canvas at ${width}: ${JSON.stringify(layout)}`);
  }
  // Actual touch events drive pan/pinch without adding components.
  await page.locator('[data-tool="pan"]').click();await canvas.scrollIntoViewIfNeeded();
  const touchBox=await canvas.boundingBox(),cx=touchBox.x+touchBox.width/2,cy=touchBox.y+touchBox.height/2,cdp=await page.context().newCDPSession(page),beforePan=await canvas.evaluate(c=>c.toDataURL()),beforeOptions=await page.locator('#selectionSelect option').count();
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx-30,y:cy,id:1},{x:cx+30,y:cy,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx-50,y:cy+30,id:1},{x:cx+50,y:cy+30,id:2}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(100);
  assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),beforePan);assert.equal(await page.locator('#selectionSelect option').count(),beforeOptions);await cdp.detach();
  await page.locator('#fitBtn').click();await page.screenshot({path:path.join(os.tmpdir(),'electricsim-mobile.png'),fullPage:true});
  await page.setViewportSize({width:1366,height:900});await page.locator('#fitBtn').click();await canvas.focus();await page.keyboard.press(']');await page.keyboard.press('ArrowRight');await page.keyboard.press('r');
  // Phone emulation includes touch input and device pixel ratios, with a fresh
  // battery/switch/lamp circuit built entirely through the public controls.
  for(const device of [{name:'small-phone',width:320,height:740,dpr:2},{name:'iphone-size',width:390,height:844,dpr:3},{name:'android-size',width:412,height:915,dpr:2.625}]){
   const context=await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:device.dpr,isMobile:true,hasTouch:true});
   const phone=await context.newPage();phone.on('pageerror',e=>errors.push(`${device.name}: ${e.message}`));
   await phone.route('https://fonts.googleapis.com/**',route=>route.abort());await phone.goto(`http://127.0.0.1:${server.address().port}/dc-circuit.html`);
   const phoneCanvas=phone.locator('#circuitCanvas');
   async function place(type,x,y,rotate=false){await phone.locator(`[data-tool="${type}"]`).tap();await phoneCanvas.scrollIntoViewIfNeeded();const b=await phoneCanvas.boundingBox();await phone.touchscreen.tap(b.x+b.width/2+x,b.y+b.height/2+y);if(rotate)await phone.locator('#rotateBtn').tap();}
   async function pick(label){await phone.locator('#selectionSelect').selectOption({label});}
   async function link(a,b){await phone.locator('[data-tool="wire"]').tap();await pick(a);await phone.locator('#connectSelectedBtn').tap();await pick(b);await phone.locator('#connectSelectedBtn').tap();}
   function reading(label){return phone.locator('#selectedReadings dt').filter({hasText:new RegExp(`^${label}$`)}).locator('xpath=following-sibling::dd[1]');}
   await place('voltage',-72,0,true);await place('switch',48,-96);await place('lamp',48,96);
   await link('V1 terminal A','S1 terminal A');await link('S1 terminal B','L1 terminal A');await link('L1 terminal B','V1 terminal B');
   await phone.locator('[data-tool="select"]').tap();await pick('L1 · lamp');
   assert.equal(await reading('Lamp').innerText(),'Off');assert.equal(await reading('Current A → B').innerText(),'0 A');
   await pick('S1 · switch');assert.equal(await phone.locator('#toggleSwitchBtn').getAttribute('aria-pressed'),'false');await phone.locator('#toggleSwitchBtn').tap();
   assert.equal(await phone.locator('#toggleSwitchBtn').getAttribute('aria-pressed'),'true');await pick('L1 · lamp');
   assert.equal(await reading('Lamp').innerText(),'Lit');assert.equal(await reading('Power').innerText(),'810 mW');assert.equal(await reading('Glow').innerText(),'81%');
   await phone.locator('#valueInput').fill('200');await phone.locator('#componentEditor button[type=submit]').tap();assert.equal(await reading('Current A → B').innerText(),'45 mA');assert.equal(await reading('Glow').innerText(),'40.5%');
   await phone.locator('#valueInput').fill('100');await phone.locator('#componentEditor button[type=submit]').tap();
   await phone.locator('#runBtn').tap();await pick('S1 · switch');await phone.locator('#toggleSwitchBtn').tap();assert.equal(await phone.locator('#runBtn').getAttribute('aria-pressed'),'true');await pick('L1 · lamp');assert.equal(await reading('Lamp').innerText(),'Off');
   await pick('S1 · switch');await phone.locator('#toggleSwitchBtn').tap();await phone.locator('#runBtn').tap();await pick('L1 · lamp');
   await phone.locator('#rotateBtn').tap();assert.equal(await reading('Power').innerText(),'810 mW');
   await phone.locator('#deleteBtn').tap();assert.equal(await phone.locator('#selectionSelect option').filter({hasText:'L1 · lamp'}).count(),0);await phone.locator('#undoBtn').tap();await pick('L1 · lamp');assert.equal(await reading('Lamp').innerText(),'Lit');
   await phone.locator('.dc-measurements summary').tap();
   for(const viewport of [{width:device.width,height:device.height},{width:device.height,height:device.width}]){
    await phone.setViewportSize(viewport);await phone.locator('#fitBtn').tap();
    assert.ok(await phone.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${device.name}: overflow in ${viewport.width}×${viewport.height}`);
    const layout=await phone.evaluate(()=>({canvas:document.getElementById('circuitCanvas').getBoundingClientRect().toJSON(),inspector:document.getElementById('inspector').getBoundingClientRect().toJSON(),tiny:[...document.querySelectorAll('button,select,input[type=number]')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]')).filter(e=>e.getBoundingClientRect().height<44||e.getBoundingClientRect().width<44).map(e=>e.id||e.textContent)}));
    assert.ok(layout.canvas.width>200&&layout.canvas.height>=300,`${device.name}: unusable canvas`);assert.deepEqual(layout.tiny,[],`${device.name}: small touch controls`);
    if(viewport.width<=850)assert.ok(layout.inspector.top>=layout.canvas.bottom,`${device.name}: inspector overlaps canvas`);
   }
   await phone.setViewportSize({width:device.width,height:device.height});await phone.locator('#fitBtn').tap();
   await phone.screenshot({path:path.join(os.tmpdir(),`electricsim-${device.name}-lamp.png`),fullPage:true});
   await context.close();console.log(`PASS touch ${device.name}: placement, wiring, lamp power/glow, switch while running, resistance edit, rotate, delete/undo, portrait/landscape, 44 px controls`);
  }
  assert.equal(errors.length,0,errors.join('\n'));console.log('PASS browser: blank construction, keyboard wiring, RC timing, ground, undo/redo, invalid-edit recovery, step/reset, reduced motion, mobile layout, touch pan/pinch, keyboard editing');
  console.log('Screenshots: '+path.join(os.tmpdir(),'electricsim-desktop.png')+'; '+path.join(os.tmpdir(),'electricsim-mobile.png'));
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(error=>{console.error(error);process.exitCode=1;});

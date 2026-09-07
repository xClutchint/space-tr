const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const origin = process.env.CMS_INTERFACE_URL || 'http://127.0.0.1:3000';
const port = Number(process.env.CMS_INTERFACE_DEBUG_PORT || 9444);
const edge = [
  process.env.EDGE_PATH,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
].filter(Boolean).find(candidate => fs.existsSync(candidate));
if (!edge) throw new Error('Microsoft Edge was not found.');

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'space-cms-interface-'));
const screenshotDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'space-cms-screens-'));
const browser = spawn(edge, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
  '--window-size=1440,900', 'about:blank'
], { stdio: 'ignore' });

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
async function waitForDebugger() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { const response = await fetch(`http://127.0.0.1:${port}/json`); if (response.ok) return response.json(); } catch {}
    await delay(200);
  }
  throw new Error('Edge debugging endpoint did not start.');
}
function connect(url) {
  const socket = new WebSocket(url); let id = 0; const pending = new Map();
  const ready = new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once:true }); socket.addEventListener('error', reject, { once:true }); });
  socket.addEventListener('message', event => { const message=JSON.parse(event.data); if(!message.id||!pending.has(message.id))return; const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(new Error(message.error.message)):task.resolve(message.result); });
  return { ready, send(method,params={}) { const requestId=++id; return new Promise((resolve,reject)=>{pending.set(requestId,{resolve,reject});socket.send(JSON.stringify({id:requestId,method,params}))}); }, close(){socket.close()} };
}

async function run() {
  const targets = await waitForDebugger(), target = targets.find(item => item.type === 'page');
  const client = connect(target.webSocketDebuggerUrl); await client.ready;
  await client.send('Page.enable'); await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', { width:1440, height:900, deviceScaleFactor:1, mobile:false });
  await client.send('Page.navigate', { url:`${origin}/cms/` });
  const evaluate = async expression => (await client.send('Runtime.evaluate', { expression, awaitPromise:true, returnByValue:true })).result.value;
  for (let attempt=0;attempt<50;attempt+=1) { if(await evaluate(`document.readyState==='complete'`))break; await delay(100); }
  await delay(400);
  await evaluate(`(()=>{const form=document.querySelector('[data-login-form]');form.email.value='space-admin@localhost.test';form.password.value='Space-Local-2026';form.requestSubmit();return true})()`);
  for (let attempt=0;attempt<80;attempt+=1) { if(await evaluate(`!document.querySelector('[data-app]').hidden`))break; await delay(150); }
  const loginState = await evaluate(`({ready:!document.querySelector('[data-app]').hidden,message:document.querySelector('[data-login-message]').textContent,width:innerWidth,blocked:matchMedia('(max-width:1099px)').matches,readyState:document.readyState,scripts:[...document.scripts].map(script=>script.src)})`);
  assert.equal(loginState.ready, true, `CMS login did not complete: ${JSON.stringify(loginState)}`);
  const nav = await evaluate(`[...document.querySelectorAll('[data-section-button]')].map(node=>node.textContent.trim())`);
  assert.deepEqual(nav, ['Hero media','Carousel','Page images','Brands','Careers','Team','Posts','Asset library']);
  assert.match(await evaluate(`getComputedStyle(document.body).fontFamily`), /Marcellus/i);
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('.cms-main')).backgroundColor`), 'rgb(8, 8, 8)');
  await evaluate(`document.querySelector('[data-section-button="page-images"]').click()`); await delay(200);
  const pageImages = await evaluate(`(()=>{const cards=[...document.querySelectorAll('.cms-page-image-card')],first=cards[0]?.getBoundingClientRect(),section=document.querySelector('[data-section="page-images"]');return{count:cards.length,width:first?.width,height:first?.height,overflow:section.scrollWidth-section.clientWidth,labels:cards.slice(0,3).map(card=>card.querySelector('span')?.textContent)}})()`);
  assert.ok(pageImages.count >= 20); assert.ok(pageImages.width <= 260); assert.ok(pageImages.height <= 260); assert.ok(pageImages.overflow <= 1); assert.ok(pageImages.labels.every(Boolean));
  await evaluate(`document.querySelector('[data-edit-page-image="0"]').click()`); await delay(100);
  assert.equal(await evaluate(`document.querySelector('[data-page-image-dialog]').open && document.querySelectorAll('.cms-page-image-variant').length===2`), true);
  assert.match(await evaluate(`getComputedStyle(document.querySelector('[data-page-image-title]')).fontFamily`), /Marcellus/i);
  const editorShot = await client.send('Page.captureScreenshot', { format:'png' });
  fs.writeFileSync(path.join(screenshotDirectory, 'page-image-editor.png'), Buffer.from(editorShot.data, 'base64'));
  await evaluate(`document.querySelector('[data-page-image-dialog]').close()`);
  const pageShot = await client.send('Page.captureScreenshot', { format:'png' });
  fs.writeFileSync(path.join(screenshotDirectory, 'page-images.png'), Buffer.from(pageShot.data, 'base64'));
  await evaluate(`document.querySelector('[data-section-button="team"]').click()`); await delay(500);
  const team = await evaluate(`(()=>{const images=[...document.querySelectorAll('.cms-record-avatar')],actions=[...document.querySelectorAll('[data-section="team"] .cms-row-actions button')];return{count:images.length,loaded:images.filter(image=>image.complete&&image.naturalWidth>0).length,maxButtonHeight:Math.max(...actions.map(button=>button.getBoundingClientRect().height)),overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}})()`);
  assert.equal(team.loaded, team.count); assert.ok(team.maxButtonHeight <= 34); assert.ok(team.overflow <= 1);
  const teamShot = await client.send('Page.captureScreenshot', { format:'png' });
  fs.writeFileSync(path.join(screenshotDirectory, 'team.png'), Buffer.from(teamShot.data, 'base64'));
  await evaluate(`document.querySelector('[data-new-person]').click()`); await delay(100);
  const personEditor = await evaluate(`(()=>{const form=document.querySelector('[data-editor-form]'),text=document.querySelector('[data-editor-fields]').textContent,choose=document.querySelector('.cms-portrait-editor [data-pick-editor-image]'),dialog=document.querySelector('[data-editor-dialog]');form.elements.name.value='Amira Laurent';form.elements.name.dispatchEvent(new Event('input',{bubbles:true}));return{open:dialog.open,type:dialog.dataset.editorType,slug:form.elements.slug.value,paragraphs:document.querySelectorAll('[data-paragraph-input]').length,crop:document.querySelectorAll('[data-portrait-control]').length,removed:/Short introduction|Portrait focal point|Edge colour|Show profile publicly/.test(text),chooseFits:choose.scrollWidth<=choose.clientWidth+1&&choose.getBoundingClientRect().right<=dialog.getBoundingClientRect().right-20}})()`);
  assert.deepEqual(personEditor, { open:true, type:'person', slug:'amira-laurent', paragraphs:5, crop:3, removed:false, chooseFits:true });
  const personShot = await client.send('Page.captureScreenshot', { format:'png' });
  fs.writeFileSync(path.join(screenshotDirectory, 'team-editor.png'), Buffer.from(personShot.data, 'base64'));
  await evaluate(`document.querySelector('[data-editor-fields]').scrollTop=document.querySelector('[data-editor-fields]').scrollHeight`); await delay(80);
  const personProfileShot = await client.send('Page.captureScreenshot', { format:'png' });
  fs.writeFileSync(path.join(screenshotDirectory, 'team-editor-profile.png'), Buffer.from(personProfileShot.data, 'base64'));
  const paragraphFlow = await evaluate(`(()=>{const first=document.querySelector('[name="bioParagraph0"]'),second=document.querySelector('[name="bioParagraph1"]');first.value='a'.repeat(530);first.dispatchEvent(new Event('input',{bubbles:true}));return{first:first.value.length,second:second.value.length}})()`);
  assert.deepEqual(paragraphFlow, { first:520, second:10 });
  await evaluate(`document.querySelector('[data-editor-cancel]').click()`); await delay(50);
  assert.equal(await evaluate(`document.querySelector('[data-editor-dialog]').open`), false);
  await evaluate(`document.querySelector('[data-section-button="careers"]').click();document.querySelector('[data-new-job]').click()`); await delay(100);
  assert.equal(await evaluate(`document.querySelector('[data-editor-dialog]').open && document.querySelector('[data-editor-dialog]').dataset.editorType==='job'`), true);
  await evaluate(`document.querySelector('[data-editor-cancel]').click()`); await delay(50);
  assert.equal(await evaluate(`document.querySelector('[data-editor-dialog]').open`), false);
  assert.equal(await evaluate(`Boolean(document.querySelector('[data-upload-feedback] progress'))`), true);
  const topButtonHeight = await evaluate(`Math.max(...[...document.querySelectorAll('.cms-actions button')].map(button=>button.getBoundingClientRect().height))`);
  assert.ok(topButtonHeight <= 40);
  console.log(JSON.stringify({ nav, pageImages, team, topButtonHeight, screenshots:screenshotDirectory }, null, 2));
  client.close();
}

run().finally(async()=>{browser.kill();await delay(300);try{fs.rmSync(profile,{recursive:true,force:true})}catch{}}).catch(error=>{console.error(error);process.exitCode=1});

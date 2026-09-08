const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const BASE_URL = process.env.BRAND_HOVER_TEST_URL || 'https://www.space-tr.com/en/';
const PORT = Number(process.env.BRAND_HOVER_DEBUG_PORT || 9555);
const TARGETS = ['Gucci', 'Prada', 'Lancome', 'Valentino', 'Ralph Lauren', 'Goldfield & Banks'];
const EXPECTED_PATHS = {
  Gucci:'/assets/editorial/brands/gucci.webp',
  Prada:'/assets/editorial/brands/prada.webp',
  Lancome:'/assets/editorial/brands/lancome.webp',
  Valentino:'/assets/editorial/brands/valentino.webp',
  'Ralph Lauren':'/assets/editorial/brands/ralph-lauren.webp',
  'Goldfield & Banks':'/assets/editorial/brands/goldfield-banks.webp',
};

function edgePath() {
  return [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean).find(candidate => fs.existsSync(candidate));
}

async function waitForDebugger() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Edge debugging endpoint did not become ready.');
}

async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method:'PUT' });
  if (!response.ok) throw new Error(`Unable to open ${url}: ${response.status}`);
  return response.json();
}

function createClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let nextId = 0;
  const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once:true });
    socket.addEventListener('error', reject, { once:true });
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const promise = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) promise.reject(new Error(message.error.message));
    else promise.resolve(message.result);
  });
  return {
    ready,
    send(method, params = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() { socket.close(); },
  };
}

async function main() {
  const executable = edgePath();
  if (!executable) throw new Error('Microsoft Edge was not found.');
  const profile = await mkdtemp(path.join(tmpdir(), 'space-brand-hover-'));
  const browser = spawn(executable, [
    '--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio:'ignore' });
  try {
    await waitForDebugger();
    const target = await openTarget(BASE_URL);
    const client = createClient(target.webSocketDebuggerUrl);
    await client.ready;
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Page.navigate', { url:BASE_URL });
    await new Promise(resolve => setTimeout(resolve, 5000));
    const result = await client.send('Runtime.evaluate', {
      expression:`(async()=>{
        const wait=duration=>new Promise(resolve=>setTimeout(resolve,duration));
        const targets=${JSON.stringify(TARGETS)};
        const results=[];
        document.querySelector('[data-brand-wall]')?.scrollIntoView({block:'center'});
        await wait(500);
        for(const name of targets){
          const item=[...document.querySelectorAll('[data-brand-name]')].find(entry=>entry.dataset.brandName===name);
          if(!item){results.push({name,error:'missing item'});continue}
          item.dispatchEvent(new MouseEvent('mouseenter',{bubbles:false}));
          const deadline=Date.now()+5000;
          while(Date.now()<deadline){
            const stageName=document.querySelector('[data-brand-wall-stage-name]')?.textContent?.trim();
            const media=document.querySelector('[data-brand-wall-stage-media]');
            const alt=media?.alt||'';
            const expectedPath=new URL(item.dataset.brandStageSrc,document.baseURI).pathname;
            const currentPath=media?new URL(media.currentSrc||media.src,location.href).pathname:'';
            if(stageName===name&&alt.startsWith(name+' ')&&currentPath===expectedPath)break;
            await wait(50);
          }
          const media=document.querySelector('[data-brand-wall-stage-media]');
          results.push({name,stageName:document.querySelector('[data-brand-wall-stage-name]')?.textContent?.trim(),src:media?new URL(media.currentSrc||media.src,location.href).pathname:'',srcAttribute:media?.getAttribute('src')||'',alt:media?.alt||''});
        }
        return results;
      })()`,
      awaitPromise:true,
      returnByValue:true,
    });
    client.close();
    const records = result.result.value;
    console.log(JSON.stringify(records, null, 2));
    const failures = records.filter(record => record.error || record.stageName !== record.name || record.src !== EXPECTED_PATHS[record.name] || !record.alt.startsWith(`${record.name} `));
    if (failures.length) process.exitCode = 1;
  } finally {
    browser.kill();
    await new Promise(resolve => setTimeout(resolve, 500));
    await rm(profile, { recursive:true, force:true, maxRetries:4, retryDelay:250 });
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });

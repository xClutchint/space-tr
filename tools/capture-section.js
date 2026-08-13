const { spawn } = require('node:child_process');
const { mkdir, rm, writeFile } = require('node:fs/promises');
const path = require('node:path');

const edge = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = Number(process.env.CAPTURE_DEBUG_PORT || 9444);
const selector = process.argv[2] || 'body';
const output = path.resolve(process.argv[3] || 'qa-section.png');
const profile = path.resolve('.edge-preview', `capture-profile-${port}`);
const width = Number(process.env.CAPTURE_WIDTH || 1440);
const height = Number(process.env.CAPTURE_HEIGHT || 1000);
const clickSelector = process.env.CAPTURE_CLICK || '';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDebugger() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {}
    await delay(200);
  }
  throw new Error('Edge debugging endpoint did not become ready.');
}

async function send(socket, method, params = {}) {
  const id = ++send.id;
  return new Promise((resolve, reject) => {
    const listener = (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== id) return;
      socket.removeEventListener('message', listener);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    };
    socket.addEventListener('message', listener);
    socket.send(JSON.stringify({ id, method, params }));
  });
}
send.id = 0;

async function main() {
  await rm(profile, { recursive: true, force: true });
  await mkdir(profile, { recursive: true });
  const browser = spawn(edge, [
    '--headless', '--disable-gpu', '--hide-scrollbars',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true });

  try {
    await waitForDebugger();
    const targetResponse = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('http://127.0.0.1:3000/about-space.html')}`, { method: 'PUT' });
    const target = await targetResponse.json();
    const socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    await send(socket, 'Page.enable');
    await send(socket, 'Runtime.enable');
    await send(socket, 'Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width <= 760 });
    await delay(2200);
    const expression = `(async () => { document.documentElement.style.scrollBehavior='auto'; const target=document.querySelector(${JSON.stringify(selector)}); if(target) window.scrollTo(0,target.getBoundingClientRect().top + window.scrollY); await document.fonts.ready; await new Promise(resolve => setTimeout(resolve, 1200)); if(target) window.scrollTo(0,target.getBoundingClientRect().top + window.scrollY); await new Promise(resolve => setTimeout(resolve, 450)); })()`;
    await send(socket, 'Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    const position = await send(socket, 'Runtime.evaluate', {
      expression: `(() => { const target=document.querySelector(${JSON.stringify(selector)}); return {selector:${JSON.stringify(selector)},found:Boolean(target),scrollY:Math.round(window.scrollY),targetTop:target?Math.round(target.getBoundingClientRect().top + window.scrollY):null,documentHeight:document.documentElement.scrollHeight}; })()`,
      returnByValue: true,
    });
    console.log(JSON.stringify(position.result?.value || null));
    if (clickSelector) {
      const interaction = await send(socket, 'Runtime.evaluate', {
        expression: `(() => { const target=document.querySelector(${JSON.stringify(clickSelector)}); target?.click(); return {clicked:Boolean(target),selected:document.querySelectorAll('.africa-map-svg .is-selected').length,country:document.querySelector('[data-map-country]')?.textContent,resetVisible:!document.querySelector('[data-map-reset]')?.hidden}; })()`,
        returnByValue: true,
      });
      console.log(JSON.stringify(interaction.result?.value || interaction.exceptionDetails || null));
    }
    const result = await send(socket, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(output, Buffer.from(result.data, 'base64'));
    socket.close();
    console.log(output);
  } finally {
    browser.kill();
    await delay(500);
    await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

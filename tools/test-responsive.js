const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');

const BASE_URL = process.env.RESPONSIVE_TEST_URL || 'http://127.0.0.1:3000';
const PORT = Number(process.env.RESPONSIVE_DEBUG_PORT || 9333);
const PAGES = [
  'index.html',
  'about-space.html',
  'expertise.html',
  'feelnzuri.html',
  'space-x-maven.html',
  'posts.html',
  'careers.html',
  'career-brand-manager.html',
  'career-sales-executive.html',
  'career-logistics-coordinator.html',
];

function edgePath() {
  const candidates = [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  const fs = require('node:fs');
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function waitForDebugger() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Edge debugging endpoint did not become ready.');
}

async function openTarget(url) {
  const response = await fetch(
    `http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`,
    { method: 'PUT' },
  );
  if (!response.ok) throw new Error(`Unable to open ${url}: ${response.status}`);
  return response.json();
}

function createCdpClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let nextId = 0;
  const pending = new Map();

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
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
    close() {
      socket.close();
    },
  };
}

async function inspectPage(page) {
  const target = await openTarget(`${BASE_URL}/${page}`);
  const client = createCdpClient(target.webSocketDebuggerUrl);
  await client.ready;
  await client.send('Page.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
  });
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await client.send('Page.navigate', { url: `${BASE_URL}/${page}` });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const { result } = await client.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body ? document.body.scrollWidth : 0,
      offenders: [...document.querySelectorAll('body *')]
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return { tag: node.tagName, className: String(node.className || '').slice(0, 120), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
        })
        .filter((item) => item.right > document.documentElement.clientWidth + 1 || item.left < -1)
        .sort((a, b) => (b.right - document.documentElement.clientWidth) - (a.right - document.documentElement.clientWidth))
        .slice(0, 8),
      readyState: document.readyState
    })`,
    returnByValue: true,
  });
  client.close();
  return JSON.parse(result.value);
}

async function main() {
  const executable = edgePath();
  if (!executable) throw new Error('Microsoft Edge was not found. Set EDGE_PATH to its executable.');

  const profile = await mkdtemp(path.join(tmpdir(), 'space-responsive-'));
  const browser = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    await waitForDebugger();
    const failures = [];
    for (const page of PAGES) {
      const dimensions = await inspectPage(page);
      const overflow = dimensions.documentWidth - dimensions.viewport;
      console.log(`${page}: ${dimensions.viewport}px viewport, ${dimensions.documentWidth}px document`);
      if (dimensions.readyState !== 'complete' || overflow > 1) {
        failures.push({ page, overflow, ...dimensions });
      }
    }
    if (failures.length) {
      console.error('Responsive failures:', JSON.stringify(failures, null, 2));
      process.exitCode = 1;
    } else {
      console.log('Responsive mobile overflow check passed.');
    }
  } finally {
    browser.kill();
    await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
    } catch (error) {
      console.warn(`Temporary Edge profile will be cleared by the operating system: ${error.code || error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

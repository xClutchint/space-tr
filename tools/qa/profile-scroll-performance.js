const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { once } = require('node:events');
const { tmpdir } = require('node:os');
const path = require('node:path');

const BASE_URL = (process.env.PERF_TEST_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const TARGET_PATH = `/${String(process.env.PERF_TEST_PATH || 'en/').replace(/^\/+/, '')}`;
const PORT = Number(process.env.PERF_DEBUG_PORT || 9444);
const SCROLL_DURATION = Number(process.env.PERF_SCROLL_DURATION || 1800);

function edgePath() {
  const candidates = [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  const fs = require('node:fs');
  return candidates.find(candidate => fs.existsSync(candidate));
}

async function waitForDebugger() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Browser debugging endpoint did not become ready.');
}

async function openTarget(url) {
  const response = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!response.ok) throw new Error(`Unable to open ${url}: ${response.status}`);
  return response.json();
}

function createClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  return {
    ready,
    send(method, params = {}) {
      const requestId = ++id;
      return new Promise((resolve, reject) => {
        pending.set(requestId, { resolve, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    close() { socket.close(); },
  };
}

function percentile(values, ratio) {
  if (!values.length) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.floor(ordered.length * ratio))];
}

async function profile(client, device) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: device.width,
    height: device.height,
    deviceScaleFactor: device.mobile ? 2 : 1,
    mobile: device.mobile,
    screenWidth: device.width,
    screenHeight: device.height,
  });
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: device.mobile });
  await client.send('Emulation.setCPUThrottlingRate', { rate: device.cpuRate });
  await client.send('Performance.enable');
  await client.send('Page.navigate', { url: `${BASE_URL}${TARGET_PATH}` });
  await new Promise(resolve => setTimeout(resolve, 3500));

  const before = await client.send('Performance.getMetrics');
  const { result } = await client.send('Runtime.evaluate', {
    expression: `(async () => {
      const probe = { frames: [], longTasks: [], shifts: [] };
      let lastFrame = 0;
      let running = true;
      const tick = time => {
        if (lastFrame) probe.frames.push(time - lastFrame);
        lastFrame = time;
        if (running) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      let longTaskObserver;
      try {
        longTaskObserver = new PerformanceObserver(list => probe.longTasks.push(...list.getEntries().map(entry => entry.duration)));
        longTaskObserver.observe({ type: 'longtask' });
      } catch {}
      let shiftObserver;
      try {
        shiftObserver = new PerformanceObserver(list => probe.shifts.push(...list.getEntries().filter(entry => !entry.hadRecentInput).map(entry => entry.value)));
        shiftObserver.observe({ type: 'layout-shift' });
      } catch {}
      const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const stops = [Math.min(max, innerHeight * 5.5), Math.min(max, innerHeight * 1.2), Math.min(max, innerHeight * 8.5)];
      for (const target of stops) {
        const origin = scrollY;
        const started = performance.now();
        await new Promise(resolve => {
          const step = now => {
            const progress = Math.min(1, (now - started) / ${SCROLL_DURATION});
            const eased = progress < .5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            scrollTo(0, origin + ((target - origin) * eased));
            if (progress < 1) requestAnimationFrame(step); else resolve();
          };
          requestAnimationFrame(step);
        });
      }
      await new Promise(resolve => setTimeout(resolve, 250));
      running = false;
      longTaskObserver?.disconnect();
      shiftObserver?.disconnect();
      const expensive = [...document.querySelectorAll('body *')].map(node => {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        return {
          node: node.tagName.toLowerCase() + (node.className && typeof node.className === 'string' ? '.' + node.className.trim().split(/\\s+/).slice(0, 3).join('.') : ''),
          area: Math.round(Math.max(0, rect.width) * Math.max(0, rect.height)),
          animation: style.animationName,
          filter: style.filter,
          backdrop: style.backdropFilter,
          position: style.position,
          willChange: style.willChange,
        };
      }).filter(item => item.animation !== 'none' || item.filter !== 'none' || item.backdrop !== 'none' || item.willChange !== 'auto')
        .sort((left, right) => right.area - left.area).slice(0, 18);
      return JSON.stringify({
        frameIntervals: probe.frames,
        longTasks: probe.longTasks,
        layoutShift: probe.shifts.reduce((total, value) => total + value, 0),
        height: document.documentElement.scrollHeight,
        nodes: document.querySelectorAll('*').length,
        images: document.images.length,
        videos: [...document.querySelectorAll('video')].map(video => ({ paused: video.paused, readyState: video.readyState, width: video.videoWidth, height: video.videoHeight })),
        expensive,
      });
    })()`,
    awaitPromise: true,
    returnByValue: true,
  });
  const after = await client.send('Performance.getMetrics');
  const payload = JSON.parse(result.value);
  const metrics = Object.fromEntries(after.metrics.map(item => [item.name, item.value]));
  const starting = Object.fromEntries(before.metrics.map(item => [item.name, item.value]));
  const intervals = payload.frameIntervals.filter(value => value < 500);
  return {
    device: device.name,
    frames: intervals.length,
    fps: Number((1000 / (intervals.reduce((total, value) => total + value, 0) / intervals.length)).toFixed(1)),
    frameP95: Number(percentile(intervals, .95).toFixed(1)),
    framesOver25ms: intervals.filter(value => value > 25).length,
    framesOver50ms: intervals.filter(value => value > 50).length,
    longTasks: payload.longTasks.length,
    longTaskMs: Math.round(payload.longTasks.reduce((total, value) => total + value, 0)),
    layoutShift: Number(payload.layoutShift.toFixed(4)),
    scriptMs: Math.round(((metrics.ScriptDuration || 0) - (starting.ScriptDuration || 0)) * 1000),
    layoutMs: Math.round(((metrics.LayoutDuration || 0) - (starting.LayoutDuration || 0)) * 1000),
    styleMs: Math.round(((metrics.RecalcStyleDuration || 0) - (starting.RecalcStyleDuration || 0)) * 1000),
    taskMs: Math.round(((metrics.TaskDuration || 0) - (starting.TaskDuration || 0)) * 1000),
    height: payload.height,
    nodes: payload.nodes,
    images: payload.images,
    videos: payload.videos,
    expensive: payload.expensive,
  };
}

async function main() {
  const executable = edgePath();
  if (!executable) throw new Error('Microsoft Edge was not found.');
  const profileDirectory = await mkdtemp(path.join(tmpdir(), 'space-scroll-profile-'));
  const browser = spawn(executable, [
    '--headless=new', '--disable-extensions', '--disable-background-networking', '--no-first-run',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDirectory}`, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  try {
    await waitForDebugger();
    const output = [];
    for (const device of [
      { name: 'desktop', width: 1440, height: 900, mobile: false, cpuRate: 1 },
      { name: 'mobile', width: 390, height: 844, mobile: true, cpuRate: 4 },
    ]) {
      const target = await openTarget('about:blank');
      const client = createClient(target.webSocketDebuggerUrl);
      await client.ready;
      await client.send('Page.enable');
      output.push(await profile(client, device));
      client.close();
    }
    console.log(JSON.stringify({ url: `${BASE_URL}${TARGET_PATH}`, results: output }, null, 2));
  } finally {
    if (!browser.killed) browser.kill();
    await Promise.race([once(browser, 'exit'), new Promise(resolve => setTimeout(resolve, 2500))]);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try { await rm(profileDirectory, { recursive: true, force: true }); break; }
      catch (error) {
        if (attempt === 3) throw error;
        await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
      }
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

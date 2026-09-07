const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { once } = require('node:events');
const { tmpdir } = require('node:os');
const path = require('node:path');

const BASE_URL = (process.env.PERF_TEST_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const PORT = Number(process.env.PERF_DEBUG_PORT || 9445);
const VIEWPORT_WIDTH = Number(process.env.PERF_VIEWPORT_WIDTH || 390);
const VIEWPORT_HEIGHT = Number(process.env.PERF_VIEWPORT_HEIGHT || 844);
const SCROLL_DURATION = Number(process.env.PERF_SCROLL_DURATION || 5200);

function edgePath() {
  const fs = require('node:fs');
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
      if ((await fetch(`http://127.0.0.1:${PORT}/json/version`)).ok) return;
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

function clientFor(webSocketDebuggerUrl) {
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
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

async function runPass(client, cacheDisabled) {
  await client.send('Network.setCacheDisabled', { cacheDisabled });
  await client.send('Page.navigate', { url: `${BASE_URL}/en/?film-perf=${Date.now()}` });
  await new Promise(resolve => setTimeout(resolve, 1700));
  const { result } = await client.send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      const film = document.querySelector('.immersive-film');
      const video = film.querySelector('video');
      const intervals = [], longTasks = [], events = [], visibleSamples = [];
      let last = 0, running = true;
      const tick = now => {
        if (last) intervals.push({ at: performance.now(), value: now - last, y: scrollY });
        last = now;
        if (running) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      const sampleTimer = setInterval(() => {
        const bounds = film.getBoundingClientRect();
        if (bounds.bottom <= 0 || bounds.top >= innerHeight) return;
        const frame = film.querySelector('.film-frame');
        const fallback = film.querySelector('.film-motion-fallback');
        visibleSamples.push({
          at: performance.now(),
          currentTime: video.currentTime,
          paused: video.paused,
          readyState: video.readyState,
          frameClass: frame?.className || '',
          videoVisibility: getComputedStyle(video).visibility,
          fallbackDisplay: fallback ? getComputedStyle(fallback).display : '',
        });
      }, 250);
      let observer;
      try {
        observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(item => ({ at: item.startTime, duration: item.duration }))));
        observer.observe({ type: 'longtask' });
      } catch {}
      ['loadstart','loadedmetadata','loadeddata','canplay','playing','waiting','stalled','suspend','pause'].forEach(name => video.addEventListener(name, () => events.push({ name, at: performance.now(), readyState: video.readyState })));
      const filmTop = film.offsetTop;
      scrollTo(0, Math.max(0, filmTop - innerHeight * 1.35));
      await new Promise(resolve => setTimeout(resolve, 250));
      const origin = scrollY;
      const destination = Math.min(document.documentElement.scrollHeight - innerHeight, filmTop + innerHeight * 1.65);
      const started = performance.now();
      await new Promise(resolve => {
        const step = now => {
          const progress = Math.min(1, (now - started) / ${SCROLL_DURATION});
          scrollTo(0, origin + (destination - origin) * progress);
          if (progress < 1) requestAnimationFrame(step); else resolve();
        };
        requestAnimationFrame(step);
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      running = false;
      clearInterval(sampleTimer);
      observer?.disconnect();
      const quality = video.getVideoPlaybackQuality?.();
      return JSON.stringify({
        filmTop,
        source: video.currentSrc,
        readyState: video.readyState,
        paused: video.paused,
        events,
        visibleSamples,
        intervals,
        longTasks,
        quality: quality ? { total: quality.totalVideoFrames, dropped: quality.droppedVideoFrames } : null,
      });
    })()`,
  });
  if (result.subtype === 'error') throw new Error(result.description || 'Film profile evaluation failed.');
  if (result.value == null) throw new Error(result.description || 'Film profile returned no data.');
  const payload = typeof result.value === 'string' ? JSON.parse(result.value) : result.value;
  const filmFrames = payload.intervals.filter(frame => Math.abs(frame.y - payload.filmTop) < 900).map(frame => frame.value);
  const afterFrames = payload.intervals.filter(frame => frame.y > payload.filmTop + 900).map(frame => frame.value);
  const summarize = frames => ({
    count: frames.length,
    p95: Number(percentile(frames, .95).toFixed(1)),
    over25: frames.filter(value => value > 25).length,
    over50: frames.filter(value => value > 50).length,
  });
  return {
    cache: cacheDisabled ? 'cold' : 'warm',
    film: summarize(filmFrames),
    after: summarize(afterFrames),
    longTasks: payload.longTasks,
    events: payload.events,
    visibleSamples: payload.visibleSamples,
    quality: payload.quality,
    final: { paused: payload.paused, readyState: payload.readyState },
  };
}

async function main() {
  const executable = edgePath();
  if (!executable) throw new Error('Microsoft Edge was not found.');
  const profileDirectory = await mkdtemp(path.join(tmpdir(), 'space-film-profile-'));
  const browser = spawn(executable, [
    '--headless=new', '--disable-extensions', '--disable-background-networking', '--no-first-run',
    `--remote-debugging-port=${PORT}`, `--user-data-dir=${profileDirectory}`, 'about:blank',
  ], { stdio: 'ignore', windowsHide: true });
  try {
    await waitForDebugger();
    const target = await openTarget('about:blank');
    const client = clientFor(target.webSocketDebuggerUrl);
    await client.ready;
    await client.send('Page.enable');
    await client.send('Network.enable');
    await client.send('Emulation.setDeviceMetricsOverride', { width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, deviceScaleFactor: VIEWPORT_WIDTH <= 760 ? 2 : 1, mobile: VIEWPORT_WIDTH <= 760, screenWidth: VIEWPORT_WIDTH, screenHeight: VIEWPORT_HEIGHT });
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: VIEWPORT_WIDTH <= 760 });
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const results = [await runPass(client, true), await runPass(client, false)];
    client.close();
    console.log(JSON.stringify({ url: `${BASE_URL}/en/`, results }, null, 2));
  } finally {
    if (!browser.killed) browser.kill();
    await Promise.race([once(browser, 'exit'), new Promise(resolve => setTimeout(resolve, 2500))]);
    await rm(profileDirectory, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

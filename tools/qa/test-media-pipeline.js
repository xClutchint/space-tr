const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const sharp = require('sharp');

const run = promisify(execFile);
const root = path.resolve(__dirname, '../..');
const imagePattern = /\.(?:jpe?g|png|webp|avif)$/i;

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(target) : [target];
  });
}

async function mapConcurrent(items, limit, task) {
  const results = new Array(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index], index);
    }
  }));
  return results;
}

async function runImageBatch() {
  const all = [path.join(root, 'assets', 'brand'), path.join(root, 'assets', 'editorial')]
    .flatMap(walk).filter(file => imagePattern.test(file));
  assert.ok(all.length >= 50, 'At least 50 real images are required for the batch simulation.');
  const chosen = Array.from({ length: 50 }, (_, index) => all[Math.floor(index * all.length / 50)]);
  const started = Date.now();
  const results = await mapConcurrent(chosen, 4, async file => {
    const source = sharp(file, { animated: false }).rotate();
    const metadata = await source.metadata();
    const [web, thumbnail] = await Promise.all([
      source.clone().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 80, effort: 2 }).toBuffer(),
      source.clone().resize({ width: 320, height: 240, fit: 'cover', withoutEnlargement: true }).webp({ quality: 76, effort: 2 }).toBuffer()
    ]);
    assert.ok(metadata.width && metadata.height, `${file} has invalid dimensions.`);
    assert.equal(web.subarray(0, 4).toString(), 'RIFF');
    assert.equal(thumbnail.subarray(0, 4).toString(), 'RIFF');
    return { source: fs.statSync(file).size, output: web.length + thumbnail.length };
  });
  return {
    files: results.length,
    concurrency: 4,
    sourceBytes: results.reduce((sum, item) => sum + item.source, 0),
    outputBytes: results.reduce((sum, item) => sum + item.output, 0),
    durationMs: Date.now() - started
  };
}

async function runVideoPipeline() {
  const ffmpeg = require('ffmpeg-static');
  const input = path.join(root, 'assets', 'brand', 'campaigns', 'brand-stewardship-mobile.mp4');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'space-video-pipeline-'));
  const mobile = path.join(temporary, 'mobile.mp4');
  const poster = path.join(temporary, 'poster.jpg');
  const started = Date.now();
  try {
    await run(ffmpeg, ['-hide_banner','-loglevel','error','-y','-i',input,'-map_metadata','-1','-an','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart','-vf',"scale='min(720,iw)':-2:force_original_aspect_ratio=decrease,fps=24",'-crf','22',mobile], { timeout: 240000, windowsHide: true });
    await run(ffmpeg, ['-hide_banner','-loglevel','error','-y','-ss','0.5','-i',input,'-frames:v','1','-vf',"scale='min(960,iw)':-2",'-q:v','3',poster], { timeout: 60000, windowsHide: true });
    const mobileBytes = fs.readFileSync(mobile), posterBytes = fs.readFileSync(poster);
    assert.equal(mobileBytes.subarray(4, 8).toString(), 'ftyp');
    assert.equal(posterBytes.subarray(0, 2).toString('hex'), 'ffd8');
    return { sourceBytes: fs.statSync(input).size, mobileBytes: mobileBytes.length, posterBytes: posterBytes.length, durationMs: Date.now() - started };
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

(async () => {
  const images = await runImageBatch();
  const video = await runVideoPipeline();
  console.log(JSON.stringify({ images, video }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });

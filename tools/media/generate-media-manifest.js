const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '../..');
const ASSET_ROOT = path.join(ROOT, 'assets');
const MEDIA_ROOT = path.join(ASSET_ROOT, 'media');
const SOURCE_ROOT = path.join(MEDIA_ROOT, 'source', 'brands');
const GENERATED_ROOT = path.join(MEDIA_ROOT, 'generated');
const CATALOG_ROOT = path.join(GENERATED_ROOT, 'catalog');
const DERIVATIVE_ROOT = path.join(GENERATED_ROOT, 'derivatives');
const RUNTIME_ROOT = path.join(MEDIA_ROOT, 'runtime');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov', '.m4v']);
const WEB_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);
const WEB_VIDEO_EXTENSIONS = new Set(['.mp4', '.webm']);
const MAX_WEB_IMAGE_BYTES = 24 * 1024 * 1024;
const MAX_WEB_VIDEO_BYTES = 24 * 1024 * 1024;

function walk(directory, output = []) {
  if (!fs.existsSync(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, output);
    else output.push(absolute);
  }
  return output;
}

function readWindow(file, start, length) {
  const descriptor = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(Math.max(0, length));
    const bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, start);
    return buffer.subarray(0, bytesRead);
  } finally {
    fs.closeSync(descriptor);
  }
}

function jpegDimensions(buffer) {
  let offset = 2;
  while (offset + 8 < buffer.length) {
    if (buffer[offset] !== 0xff) { offset += 1; continue; }
    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
    const size = buffer.readUInt16BE(offset + 2);
    if (size < 2) break;
    if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + size;
  }
  return null;
}

function webpDimensions(buffer) {
  if (buffer.length < 30 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null;
  const kind = buffer.toString('ascii', 12, 16);
  if (kind === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3)
    };
  }
  if (kind === 'VP8 ') {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }
  if (kind === 'VP8L') {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function imageDimensions(file, extension) {
  const buffer = readWindow(file, 0, 1024 * 1024);
  try {
    if (extension === '.png' && buffer.length >= 24) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
    if (extension === '.gif' && buffer.length >= 10) return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
    if ((extension === '.jpg' || extension === '.jpeg') && buffer.length >= 16) return jpegDimensions(buffer);
    if (extension === '.webp') return webpDimensions(buffer);
  } catch {}
  return null;
}

function findTrackDimensions(buffer) {
  const dimensions = [];
  let cursor = 0;
  while ((cursor = buffer.indexOf('tkhd', cursor, 'ascii')) !== -1) {
    const boxStart = cursor - 4;
    if (boxStart >= 0) {
      const boxSize = buffer.readUInt32BE(boxStart);
      const boxEnd = boxStart + boxSize;
      if (boxSize >= 84 && boxEnd <= buffer.length) {
        const width = buffer.readUInt32BE(boxEnd - 8) / 65536;
        const height = buffer.readUInt32BE(boxEnd - 4) / 65536;
        if (width > 0 && height > 0) dimensions.push({ width: Math.round(width), height: Math.round(height) });
      }
    }
    cursor += 4;
  }
  return dimensions.sort((a, b) => (b.width * b.height) - (a.width * a.height))[0] || null;
}

function videoDimensions(file, size, relativePath) {
  const windowSize = Math.min(size, 6 * 1024 * 1024);
  const start = readWindow(file, 0, windowSize);
  let dimensions = findTrackDimensions(start);
  if (!dimensions && size > windowSize) {
    dimensions = findTrackDimensions(readWindow(file, Math.max(0, size - windowSize), windowSize));
  }
  if (dimensions) return dimensions;
  const hint = relativePath.toLowerCase();
  if (/(^|[^0-9])9[_x-]16([^0-9]|$)|vertical|portrait|story|reel/.test(hint)) return { width: 9, height: 16, inferred: true };
  if (/(^|[^0-9])16[_x-]9([^0-9]|$)|horizontal|landscape/.test(hint)) return { width: 16, height: 9, inferred: true };
  return null;
}

function orientationFor(dimensions) {
  if (!dimensions?.width || !dimensions?.height) return 'unknown';
  const ratio = dimensions.width / dimensions.height;
  if (ratio <= 0.82) return 'vertical';
  if (ratio >= 1.22) return 'horizontal';
  return 'square';
}

function publicPath(file) {
  return path.relative(ROOT, file).split(path.sep).join('/');
}

// Media IDs predate the organised source hierarchy. Keep hashing the original
// canonical path so existing hero approvals and carousel selections remain valid.
function legacySourcePath(file) {
  return `assets/${path.relative(SOURCE_ROOT, file).split(path.sep).join('/')}`;
}

function stableId(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 16);
}

function readJson(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

function labelFor(file) {
  return path.basename(file, path.extname(file))
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureCatalogueFolders() {
  for (const orientation of ['vertical', 'horizontal', 'square', 'unknown']) {
    for (const type of ['images', 'gifs', 'videos']) {
      fs.mkdirSync(path.join(CATALOG_ROOT, orientation, type), { recursive: true });
    }
  }
}

function ensureCurationFiles() {
  fs.mkdirSync(RUNTIME_ROOT, { recursive: true });
  const jsonPath = path.join(RUNTIME_ROOT, 'media-curation.json');
  const jsPath = path.join(RUNTIME_ROOT, 'media-curation.js');
  const defaults = {
    version: 1,
    hero: { excludeLightBackgrounds: true, excluded: [], included: [] },
    carousel: { selectionMode: 'include', excluded: [], included: [] }
  };
  const curation = readJson(jsonPath, defaults);
  curation.hero = { ...defaults.hero, ...(curation.hero || {}) };
  curation.carousel = { ...defaults.carousel, ...(curation.carousel || {}) };
  fs.writeFileSync(jsonPath, `${JSON.stringify(curation, null, 2)}\n`);
  fs.writeFileSync(jsPath, `window.SPACE_MEDIA_CURATION=${JSON.stringify(curation)};\n`);
  return curation;
}

function generateMediaManifest() {
  ensureCatalogueFolders();
  const curation = ensureCurationFiles();
  const analysis = readJson(path.join(MEDIA_ROOT, 'source', 'media-analysis.json'));
  const media = [];
  for (const file of walk(SOURCE_ROOT)) {
    const extension = path.extname(file).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(extension) && !VIDEO_EXTENSIONS.has(extension)) continue;
    const stats = fs.statSync(file);
    const relative = publicPath(file);
    const legacyRelative = legacySourcePath(file);
    const kind = VIDEO_EXTENSIONS.has(extension) ? 'video' : extension === '.gif' ? 'gif' : 'image';
    const dimensions = kind === 'video'
      ? videoDimensions(file, stats.size, relative)
      : imageDimensions(file, extension);
    const orientation = orientationFor(dimensions);
    const webCompatible = kind === 'video' ? WEB_VIDEO_EXTENSIONS.has(extension) : WEB_IMAGE_EXTENSIONS.has(extension);
    let webReady = webCompatible && stats.size <= (kind === 'video' ? MAX_WEB_VIDEO_BYTES : MAX_WEB_IMAGE_BYTES) && orientation !== 'unknown';
    const parts = path.relative(SOURCE_ROOT, file).split(path.sep);
    const id = stableId(legacyRelative);
    const displayDerivative = path.join(DERIVATIVE_ROOT, 'display', `${id}.jpg`);
    const thumbnailDerivative = path.join(DERIVATIVE_ROOT, 'thumbnails', `${id}.jpg`);
    const mobileDerivative = path.join(DERIVATIVE_ROOT, 'hero-mobile', `${id}.webp`);
    const desktopDerivative = path.join(DERIVATIVE_ROOT, 'hero-desktop', `${id}.avif`);
    if (kind === 'image' && fs.existsSync(displayDerivative) && orientation !== 'unknown') webReady = true;
    media.push({
      id,
      src: relative,
      optimizedSrc: extension !== '.gif' && fs.existsSync(displayDerivative) ? publicPath(displayDerivative) : null,
      thumbnailSrc: fs.existsSync(thumbnailDerivative) ? publicPath(thumbnailDerivative) : null,
      mobileSrc: fs.existsSync(mobileDerivative) ? publicPath(mobileDerivative) : null,
      desktopSrc: fs.existsSync(desktopDerivative) ? publicPath(desktopDerivative) : null,
      brand: parts[0] || 'Space',
      label: labelFor(file),
      type: kind,
      extension,
      orientation,
      width: dimensions?.width || null,
      height: dimensions?.height || null,
      bytes: stats.size,
      webReady,
      backgroundTone: (analysis[relative] || analysis[legacyRelative])?.backgroundTone || 'unknown',
      edgeLuminance: (analysis[relative] || analysis[legacyRelative])?.edgeLuminance ?? null,
      lightNeutralRatio: (analysis[relative] || analysis[legacyRelative])?.lightNeutralRatio ?? null,
      inferredDimensions: Boolean(dimensions?.inferred)
    });
  }
  media.sort((a, b) => a.brand.localeCompare(b.brand) || a.src.localeCompare(b.src));
  let previousManifest = null;
  try { previousManifest = JSON.parse(fs.readFileSync(path.join(RUNTIME_ROOT, 'media-manifest.json'), 'utf8')); } catch {}
  const generatedAt = previousManifest && JSON.stringify(previousManifest.media) === JSON.stringify(media)
    ? previousManifest.generatedAt
    : new Date().toISOString();
  const manifest = {
    version: 1,
    generatedAt,
    source: 'assets/media/source/brands',
    counts: {
      total: media.length,
      webReady: media.filter(item => item.webReady).length,
      vertical: media.filter(item => item.orientation === 'vertical').length,
      horizontal: media.filter(item => item.orientation === 'horizontal').length,
      square: media.filter(item => item.orientation === 'square').length,
      unknown: media.filter(item => item.orientation === 'unknown').length
    },
    media
  };
  fs.writeFileSync(path.join(RUNTIME_ROOT, 'media-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(RUNTIME_ROOT, 'media-manifest.js'), `window.SPACE_MEDIA_LIBRARY=${JSON.stringify(manifest)};\n`);
  // The homepage must receive every asset that is eligible for automatic hero
  // rotation, not just the handful of explicitly pinned assets. Explicit
  // inclusion only overrides the light-background rule; exclusion remains the
  // source of truth for rejected media.
  const heroIncluded = new Set(curation.hero.included || []);
  const heroExcluded = new Set(curation.hero.excluded || []);
  const isEditorialAsset = item => !/(pack[ -]?shot|png images|no background|textclipping)/i.test(item.src);
  const isLightHeroAsset = item => curation.hero.excludeLightBackgrounds !== false
    && item.type !== 'video'
    && (item.backgroundTone === 'light' || (item.edgeLuminance >= 205 && item.lightNeutralRatio >= .25));
  const heroRuntimeMedia = media.filter(item => item.webReady
    && item.optimizedSrc
    && item.orientation === 'vertical'
    && isEditorialAsset(item)
    && !heroExcluded.has(item.id)
    && (heroIncluded.has(item.id) || !isLightHeroAsset(item)));
  const runtimeIds = new Set([
    ...heroRuntimeMedia.map(item => item.id),
    ...(curation.carousel.included || [])
  ]);
  const runtimeManifest = {
    version: manifest.version,
    generatedAt: manifest.generatedAt,
    source: 'assets/media/generated/derivatives',
    counts: {
      total: runtimeIds.size,
      hero: heroRuntimeMedia.length,
      carousel: (curation.carousel.included || []).length
    },
    // Runtime consumers must never fall back to the local-only master archive.
    // Every published item is known to have a display derivative at this point.
    media: media
      .filter((item) => runtimeIds.has(item.id))
      .map((item) => ({ ...item, src: item.optimizedSrc || item.src }))
  };
  fs.writeFileSync(path.join(RUNTIME_ROOT, 'media-runtime.js'), `window.SPACE_MEDIA_LIBRARY=${JSON.stringify(runtimeManifest)};\n`);
  for (const orientation of ['vertical', 'horizontal', 'square', 'unknown']) {
    for (const group of ['images', 'gifs', 'videos']) {
      const expectedType = group === 'images' ? 'image' : group.slice(0, -1);
      const entries = media.filter(item => item.orientation === orientation && item.type === expectedType);
      fs.writeFileSync(path.join(CATALOG_ROOT, orientation, group, 'index.json'), `${JSON.stringify({ generatedAt, entries }, null, 2)}\n`);
    }
  }
  return manifest;
}

if (require.main === module) {
  const manifest = generateMediaManifest();
  console.log(`Media catalogue: ${manifest.counts.total} files, ${manifest.counts.webReady} web-ready, ${manifest.counts.vertical} vertical, ${manifest.counts.horizontal} horizontal.`);
}

module.exports = { generateMediaManifest };

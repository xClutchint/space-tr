const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promisify } = require('util');
const { execFile } = require('child_process');
const { send, parseBody, requireAuth, clean, sameOrigin, readDraftState, readState } = require('../_cms');
const { requestIp } = require('../_auth');
const store = require('../_store');

const run = promisify(execFile);
const MAX_LOCAL_BYTES = 8 * 1024 * 1024;
const MAX_DIRECT_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_IMAGE_PROCESS_BYTES = 60 * 1024 * 1024;
const MAX_VIDEO_PROCESS_BYTES = 350 * 1024 * 1024;
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm']);
const safeName = value => clean(value, 160).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'asset';
const LOCAL_ASSET_ROOT = process.env.SPACE_CMS_LOCAL_ASSET_ROOT || path.join(__dirname, '..', '..', 'assets', 'media', 'cms', 'uploads');
const LOCAL_ASSET_URL = '/assets/media/cms/uploads/';
const localMode = () => process.env.SPACE_CMS_LOCAL === '1';
const mediaType = filename => ({ '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm' })[path.extname(filename).toLowerCase()] || 'application/octet-stream';
const assetId = pathname => crypto.createHash('sha256').update(String(pathname)).digest('hex').slice(0, 24);

function validSignature(bytes, type) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (type === 'image/webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (type === 'image/gif') return ['GIF87a','GIF89a'].includes(bytes.subarray(0, 6).toString());
  if (type === 'image/avif') return bytes.subarray(4, 8).toString() === 'ftyp' && /avif|avis|mif1/.test(bytes.subarray(8, 20).toString());
  if (type === 'video/mp4') return bytes.subarray(4, 8).toString() === 'ftyp';
  if (type === 'video/webm') return bytes.subarray(0, 4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  return false;
}
function containsUrl(value, targets) {
  if (typeof value === 'string') return targets.has(value);
  if (Array.isArray(value)) return value.some(item => containsUrl(item, targets));
  if (value && typeof value === 'object') return Object.values(value).some(item => containsUrl(item, targets));
  return false;
}
async function assetInUse(asset) {
  const targets = new Set([asset.url, ...Object.values(asset.variants || {}).map(item => item?.url || item).filter(Boolean)]);
  const [draft, published] = await Promise.all([readDraftState(), readState()]);
  return containsUrl(draft, targets) || containsUrl(published, targets);
}

function removeAssetReferences(source, targets) {
  const state = structuredClone(source || {}), remove = list => Array.isArray(list) ? list.filter(item => !containsUrl(item, targets)) : [];
  if (state.media) {
    state.media.hero = remove(state.media.hero);
    state.media.heroDesktop = remove(state.media.heroDesktop);
    state.media.heroMobile = remove(state.media.heroMobile);
    state.media.carousel = remove(state.media.carousel);
  }
  state.pageImages = (state.pageImages || []).filter(item => !targets.has(item.url)).map(item => ({ ...item, mobileUrl: targets.has(item.mobileUrl) ? '' : item.mobileUrl }));
  state.brands = (state.brands || []).map(item => ({ ...item, logoUrl: targets.has(item.logoUrl) ? '' : item.logoUrl, bannerUrl: targets.has(item.bannerUrl) ? '' : item.bannerUrl }));
  state.team = (state.team || []).map(item => ({ ...item, imageUrl: targets.has(item.imageUrl) ? '' : item.imageUrl }));
  state.posts = (state.posts || []).map(item => ({ ...item, imageUrl: targets.has(item.imageUrl) ? '' : item.imageUrl, thumbnailUrl: targets.has(item.thumbnailUrl) ? '' : item.thumbnailUrl }));
  return state;
}

async function deleteAssetEverywhere(asset, actorId) {
  const targets = new Set([asset.url, ...Object.values(asset.variants || {}).map(item => item?.url || item).filter(Boolean)]), document = await store.getDocument();
  if (containsUrl(document.draft, targets) || containsUrl(document.published, targets)) {
    await store.publishDocument(removeAssetReferences(document.draft, targets), actorId, removeAssetReferences(document.published, targets), document.version);
  }
  return targets;
}

function localAsset(relativeName) {
  const absolute = path.join(LOCAL_ASSET_ROOT, relativeName), stats = fs.statSync(absolute), type = mediaType(relativeName);
  return { id: relativeName, pathname: relativeName, url: `${LOCAL_ASSET_URL}${encodeURIComponent(relativeName)}`, name: relativeName, size: stats.size, createdAt: stats.birthtime.toISOString(), uploadedAt: stats.birthtime.toISOString(), type, kind: type.startsWith('video/') ? 'video' : 'image', status: 'ready', variants: {} };
}

async function processImage(blob, record, token) {
  if (record.size > MAX_IMAGE_PROCESS_BYTES) return { ...record, status: 'source-ready' };
  const response = await fetch(blob.url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to retrieve uploaded image (${response.status}).`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!validSignature(bytes, record.type)) throw new Error('Uploaded image signature is invalid.');
  const sharp = require('sharp'), source = sharp(bytes, { animated: false }).rotate(), metadata = await source.metadata();
  const { put } = await import('@vercel/blob');
  const widths = [...new Set([480, 960, 1600, 2400].map(width => Math.min(width, metadata.width || width)))].sort((a, b) => a - b);
  const variantTasks = widths.map(async width => {
    const output = await source.clone().resize({ width, withoutEnlargement: true }).webp({ quality: width <= 480 ? 80 : 84, effort: 4 }).toBuffer();
    const pathname = `space-cms/derived/${record.id}/image-${width}.webp`;
    const saved = await put(pathname, output, { access: 'public', contentType: 'image/webp', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000, token });
    const key = width <= 480 ? 'mobile' : width <= 960 ? 'tablet' : width <= 1600 ? 'desktop' : 'large';
    return [key, { url: saved.url, width, size: output.length, type: 'image/webp' }];
  });
  const thumbnailPromise = source.clone().resize({ width: 320, height: 240, fit: 'cover', withoutEnlargement: true }).webp({ quality: 76, effort: 4 }).toBuffer().then(async output => {
    const saved = await put(`space-cms/derived/${record.id}/thumbnail.webp`, output, { access: 'public', contentType: 'image/webp', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000, token });
    return ['thumbnail', { url: saved.url, width: 320, size: output.length, type: 'image/webp' }];
  });
  const variants = Object.fromEntries(await Promise.all([...variantTasks, thumbnailPromise]));
  return { ...record, status: 'ready', checksum: crypto.createHash('sha256').update(bytes).digest('hex'), width: metadata.width || null, height: metadata.height || null, variants };
}

async function processVideo(blob, record, token) {
  if (record.size > MAX_VIDEO_PROCESS_BYTES) return { ...record, status: 'source-ready' };
  const response = await fetch(blob.url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to retrieve uploaded video (${response.status}).`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!validSignature(bytes, record.type)) throw new Error('Uploaded video signature is invalid.');
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'space-media-'));
  const extension = record.type === 'video/webm' ? '.webm' : '.mp4', input = path.join(temporary, `source${extension}`);
  const mobile = path.join(temporary, 'mobile.mp4'), desktop = path.join(temporary, 'desktop.mp4'), poster = path.join(temporary, 'poster.jpg');
  fs.writeFileSync(input, bytes);
  try {
    const ffmpeg = require('ffmpeg-static');
    const common = ['-hide_banner','-loglevel','error','-y','-i',input,'-map_metadata','-1','-an','-c:v','libx264','-preset','veryfast','-pix_fmt','yuv420p','-movflags','+faststart'];
    await run(ffmpeg, [...common,'-vf',"scale='min(720,iw)':-2:force_original_aspect_ratio=decrease,fps=24",'-crf','22',mobile], { timeout: 280000, windowsHide: true, maxBuffer: 1024 * 1024 });
    await run(ffmpeg, [...common,'-vf',"scale='min(1600,iw)':-2:force_original_aspect_ratio=decrease,fps=30",'-crf','20',desktop], { timeout: 280000, windowsHide: true, maxBuffer: 1024 * 1024 });
    await run(ffmpeg, ['-hide_banner','-loglevel','error','-y','-ss','0.5','-i',input,'-frames:v','1','-vf',"scale='min(960,iw)':-2",'-q:v','3',poster], { timeout: 60000, windowsHide: true, maxBuffer: 1024 * 1024 });
    const { put } = await import('@vercel/blob');
    const uploadVariant = async (name, filename, contentType) => {
      const output = fs.readFileSync(filename), saved = await put(`space-cms/derived/${record.id}/${name}`, output, { access: 'public', contentType, addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000, token });
      return { url: saved.url, size: output.length, type: contentType };
    };
    const [mobileResult, desktopResult, posterResult] = await Promise.all([uploadVariant('mobile.mp4', mobile, 'video/mp4'), uploadVariant('desktop.mp4', desktop, 'video/mp4'), uploadVariant('poster.jpg', poster, 'image/jpeg')]);
    return { ...record, status: 'ready', checksum: crypto.createHash('sha256').update(bytes).digest('hex'), variants: { mobile: mobileResult, desktop: desktopResult, poster: posterResult, thumbnail: posterResult } };
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}

async function processCompletedUpload(payload, token) {
  const metadata = (() => { try { return JSON.parse(payload.tokenPayload || '{}'); } catch { return {}; } })();
  const blob = payload.blob, type = allowed.has(blob.contentType) ? blob.contentType : metadata.type;
  const record = { id: assetId(blob.pathname), pathname: blob.pathname, url: blob.url, name: safeName(metadata.name || blob.pathname.split('/').pop()), type, kind: String(type).startsWith('video/') ? 'video' : 'image', size: Number(metadata.size || 0), status: 'processing', variants: {}, tags: [], uploadedBy: metadata.actorId || null, createdAt: new Date().toISOString() };
  await store.saveAsset(record);
  let processed;
  try { processed = record.kind === 'video' ? await processVideo(blob, record, token) : await processImage(blob, record, token); }
  catch (error) { processed = { ...record, status: 'source-ready', processingError: error.message }; }
  await store.saveAsset(processed);
}

async function handleLocal(req, res, authentication) {
  fs.mkdirSync(LOCAL_ASSET_ROOT, { recursive: true });
  if (req.method === 'GET') {
    const assets = fs.readdirSync(LOCAL_ASSET_ROOT, { withFileTypes: true }).filter(entry => entry.isFile()).map(entry => localAsset(entry.name)).sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt));
    return send(res, 200, { assets, directUpload: false, maximumSizeInBytes: MAX_LOCAL_BYTES });
  }
  if (!sameOrigin(req)) return send(res, 403, { error: 'Origin check failed.' });
  if (req.method === 'POST') {
    const { name, type, data } = parseBody(req);
    if (!allowed.has(type)) return send(res, 400, { error: 'Use JPG, PNG, WebP, AVIF, GIF, MP4 or WebM.' });
    let bytes; try { bytes = Buffer.from(String(data || ''), 'base64'); } catch { return send(res, 400, { error: 'Invalid file data.' }); }
    if (!bytes.length || bytes.length > MAX_LOCAL_BYTES) return send(res, 413, { error: 'Local preview uploads are limited to 8 MB. Deployed CMS uploads go directly to Blob.' });
    if (!validSignature(bytes, type)) return send(res, 400, { error: 'The file signature does not match its declared media type.' });
    const filename = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName(name)}`;
    fs.writeFileSync(path.join(LOCAL_ASSET_ROOT, filename), bytes, { flag: 'wx' });
    const asset = localAsset(filename);
    await store.addAudit({ actorId: authentication.user.id, event: 'asset-uploaded', entity: 'asset', entityId: filename, ip: requestIp(req), metadata: { name: safeName(name), size: bytes.length, type } });
    return send(res, 201, { asset });
  }
  if (req.method === 'DELETE') {
    const { url } = parseBody(req);
    if (!String(url || '').startsWith(LOCAL_ASSET_URL)) return send(res, 400, { error: 'Local asset URL required.' });
    const filename = path.basename(decodeURIComponent(String(url).slice(LOCAL_ASSET_URL.length))), target = path.resolve(LOCAL_ASSET_ROOT, filename), relative = path.relative(path.resolve(LOCAL_ASSET_ROOT), target);
    if (!filename || relative.startsWith('..') || path.isAbsolute(relative)) return send(res, 400, { error: 'Invalid asset path.' });
    const asset = localAsset(filename);
    await deleteAssetEverywhere(asset, authentication.user.id);
    try { fs.unlinkSync(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, DELETE' });
}

module.exports = async function handler(req, res) {
  const body = parseBody(req), callback = body.type === 'blob.upload-completed';
  let authentication = null;
  if (!callback) {
    authentication = await requireAuth(req, { mutation: req.method !== 'GET' });
    if (authentication.error) return send(res, authentication.error.status, { error: authentication.error.message });
  }
  if (localMode()) return handleLocal(req, res, authentication);
  if (!process.env.BLOB_READ_WRITE_TOKEN) return send(res, 503, { error: 'Blob storage is not configured.' });
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (req.method === 'GET') {
    let assets = await store.listAssets(5000);
    if (!assets.length) {
      const { list } = await import('@vercel/blob'), result = await list({ prefix: 'space-cms/assets/', limit: 1000, token });
      assets = result.blobs.map(blob => ({ id: assetId(blob.pathname), pathname: blob.pathname, url: blob.url, name: blob.pathname.split('/').pop(), size: blob.size, type: blob.contentType || mediaType(blob.pathname), status: 'source-ready', variants: {}, createdAt: blob.uploadedAt, uploadedAt: blob.uploadedAt }));
    }
    assets = assets.map(asset => asset.status === 'processing' && Date.now() - Date.parse(asset.updatedAt || asset.createdAt || 0) > 90000
      ? { ...asset, status: 'source-ready', processingError: asset.processingError || 'Web optimisation will retry when the asset is replaced.' }
      : asset);
    return send(res, 200, { assets, directUpload: true, maximumSizeInBytes: MAX_DIRECT_BYTES });
  }
  if (req.method === 'POST' && String(body.type || '').startsWith('blob.')) {
    const { handleUpload } = await import('@vercel/blob/client');
    try {
      const result = await handleUpload({
        token, request: req, body,
        onBeforeGenerateToken: async (pathname, clientPayload) => {
          if (!authentication || !sameOrigin(req)) throw new Error('Authorisation failed.');
          let metadata; try { metadata = JSON.parse(clientPayload || '{}'); } catch { throw new Error('Invalid upload metadata.'); }
          if (!pathname.startsWith('space-cms/assets/') || !allowed.has(metadata.type)) throw new Error('Unsupported asset.');
          if (!Number.isFinite(Number(metadata.size)) || Number(metadata.size) <= 0 || Number(metadata.size) > MAX_DIRECT_BYTES) throw new Error('The asset is too large.');
          return { allowedContentTypes: [...allowed], maximumSizeInBytes: MAX_DIRECT_BYTES, addRandomSuffix: false, allowOverwrite: false, cacheControlMaxAge: 31536000, tokenPayload: JSON.stringify({ ...metadata, name: safeName(metadata.name), actorId: authentication.user.id }) };
        },
        onUploadCompleted: payload => processCompletedUpload(payload, token)
      });
      return send(res, 200, result);
    } catch (error) { return send(res, error.status || 400, { error: error.message }); }
  }
  if (req.method === 'DELETE') {
    if (!sameOrigin(req)) return send(res, 403, { error: 'Origin check failed.' });
    const assets = await store.listAssets(5000), asset = assets.find(item => item.url === body.url || item.id === body.id);
    if (!asset) return send(res, 404, { error: 'Asset not found.' });
    const targets = await deleteAssetEverywhere(asset, authentication.user.id), { del } = await import('@vercel/blob');
    await del([...targets], { token });
    await store.deleteAsset(asset.id);
    await store.addAudit({ actorId: authentication.user.id, event: 'asset-deleted', entity: 'asset', entityId: asset.id, ip: requestIp(req), metadata: { pathname: asset.pathname } });
    return send(res, 200, { ok: true, deleted: true });
  }
  return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, DELETE' });
};

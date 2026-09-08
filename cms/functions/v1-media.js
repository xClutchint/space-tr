const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { send, parseBody, clean } = require('../../api/_cms');
const { requireAutomation } = require('../../api/_ingest');
const store = require('../../api/_store');
const assetTools = require('../../api/admin/_assets');

const MAX_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif', 'image/gif': '.gif' };
const safeName = value => clean(value, 120).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'image';
const derivedUrl = asset => asset.variants?.desktop?.url || asset.variants?.large?.url || asset.url;
const localAssetMode = () => process.env.SPACE_CMS_LOCAL === '1';

module.exports = async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, DELETE' });
  const credential = await requireAutomation(req, res); if (!credential) return;

  if (req.method === 'GET') {
    const limit = Math.min(5000, Math.max(1, Number(req.query?.limit) || 100));
    const assets = await store.listAssets(limit);
    return send(res, 200, { assets, count: assets.length });
  }

  const body = parseBody(req), actorId = `api:${credential.keyId}`;
  if (req.method === 'DELETE') {
    const identifier = clean(req.query?.id || body.id || body.url, 2000);
    const asset = (await store.listAssets(5000)).find(item => item.id === identifier || item.url === identifier);
    if (!asset) return send(res, 404, { error: 'Asset not found.' });
    try {
      const targets = await assetTools.deleteAssetEverywhere(asset, actorId);
      if (localAssetMode()) {
        if (String(asset.url).startsWith(assetTools.LOCAL_ASSET_URL)) {
          const filename = path.basename(decodeURIComponent(String(asset.url).slice(assetTools.LOCAL_ASSET_URL.length)));
          const target = path.resolve(assetTools.LOCAL_ASSET_ROOT, filename), relative = path.relative(path.resolve(assetTools.LOCAL_ASSET_ROOT), target);
          if (filename && !relative.startsWith('..') && !path.isAbsolute(relative)) fs.rmSync(target, { force: true });
        }
      } else {
        const { del } = await import('@vercel/blob');
        await del([...targets], { token: process.env.BLOB_READ_WRITE_TOKEN });
      }
      await store.deleteAsset(asset.id);
      await store.addAudit({ actorId, event: 'api-asset-deleted', entity: 'asset', entityId: asset.id, ip: credential.ip, metadata: { pathname: asset.pathname } });
      return send(res, 200, { ok: true, deleted: true, id: asset.id });
    } catch (error) { return send(res, error.status || 500, { error: error.message }); }
  }

  const type = clean(body.type, 50), extension = MIME_EXTENSIONS[type];
  if (!extension) return send(res, 400, { error: 'Use a JPG, PNG, WebP, AVIF or GIF image.' });
  let bytes; try { bytes = Buffer.from(String(body.data || '').replace(/^data:[^;]+;base64,/, ''), 'base64'); } catch { return send(res, 400, { error: 'Invalid base64 image data.' }); }
  if (!bytes.length || bytes.length > MAX_BYTES) return send(res, 413, { error: 'The image must be between 1 byte and 8 MB.' });
  if (!assetTools.validSignature(bytes, type)) return send(res, 400, { error: 'The file signature does not match the declared image type.' });

  const id = crypto.randomUUID(), filename = `${id}-${safeName(body.name).replace(/\.[^.]+$/, '')}${extension}`, pathnameValue = `space-cms/assets/api/${filename}`;
  let record;
  try {
    if (localAssetMode()) {
      fs.mkdirSync(assetTools.LOCAL_ASSET_ROOT, { recursive: true });
      fs.writeFileSync(path.join(assetTools.LOCAL_ASSET_ROOT, filename), bytes, { flag: 'wx' });
      record = { id, pathname: filename, url: `${assetTools.LOCAL_ASSET_URL}${encodeURIComponent(filename)}`, name: filename, type, kind: 'image', size: bytes.length, status: 'source-ready', variants: {}, tags: ['api'], uploadedBy: actorId, createdAt: new Date().toISOString() };
    } else {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return send(res, 503, { error: 'Blob storage is not configured.' });
      const { put } = await import('@vercel/blob');
      const blob = await put(pathnameValue, bytes, { access: 'public', contentType: type, addRandomSuffix: false, allowOverwrite: false, cacheControlMaxAge: 31536000, token: process.env.BLOB_READ_WRITE_TOKEN });
      record = { id, pathname: pathnameValue, url: blob.url, name: filename, type, kind: 'image', size: bytes.length, status: 'processing', variants: {}, tags: ['api'], uploadedBy: actorId, createdAt: new Date().toISOString() };
      await store.saveAsset(record);
      try { record = await assetTools.processImage(blob, record, process.env.BLOB_READ_WRITE_TOKEN); }
      catch (error) { record = { ...record, status: 'source-ready', processingError: error.message }; }
    }
    record = await store.saveAsset(record);
    await store.addAudit({ actorId, event: 'api-image-uploaded', entity: 'asset', entityId: id, ip: credential.ip, metadata: { pathname: record.pathname, type, size: bytes.length, status: record.status } });
    return send(res, 201, { asset: record, mediaId: id, url: derivedUrl(record), originalUrl: record.url, variants: record.variants, type, size: bytes.length });
  } catch (error) { return send(res, error.status || 500, { error: error.message }); }
};

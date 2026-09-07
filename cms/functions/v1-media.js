const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { send, parseBody, clean } = require('../../api/_cms');
const { requireIngest } = require('../../api/_ingest');
const store = require('../../api/_store');

const MAX_BYTES = 8 * 1024 * 1024;
const MIME_EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/avif': '.avif', 'image/gif': '.gif' };
const safeName = value => clean(value, 120).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'blog-image';
function validSignature(bytes, type) {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (type === 'image/webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (type === 'image/gif') return ['GIF87a','GIF89a'].includes(bytes.subarray(0, 6).toString());
  if (type === 'image/avif') return bytes.subarray(4, 8).toString() === 'ftyp' && /avif|avis|mif1/.test(bytes.subarray(8, 20).toString());
  return false;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  const credential = await requireIngest(req, res); if (!credential) return;
  const body = parseBody(req), type = clean(body.type, 50), extension = MIME_EXTENSIONS[type];
  if (!extension) return send(res, 400, { error: 'Use a JPG, PNG, WebP, AVIF or GIF image.' });
  let bytes; try { bytes = Buffer.from(String(body.data || ''), 'base64'); } catch { return send(res, 400, { error: 'Invalid base64 image data.' }); }
  if (!bytes.length || bytes.length > MAX_BYTES) return send(res, 413, { error: 'The image must be between 1 byte and 8 MB.' });
  if (!validSignature(bytes, type)) return send(res, 400, { error: 'The file signature does not match the declared image type.' });
  const id = crypto.randomUUID(), filename = `${id}-${safeName(body.name).replace(/\.[^.]+$/, '')}${extension}`, pathname = `space-cms/assets/blog/${filename}`;
  let url;
  if (store.localMode()) {
    const root = process.env.SPACE_CMS_LOCAL_ASSET_ROOT || path.join(__dirname, '..', '..', 'assets', 'media', 'cms', 'uploads');
    fs.mkdirSync(root, { recursive: true }); fs.writeFileSync(path.join(root, filename), bytes, { flag: 'wx' }); url = `/assets/media/cms/uploads/${encodeURIComponent(filename)}`;
  } else {
    if (!process.env.BLOB_READ_WRITE_TOKEN) return send(res, 503, { error: 'Blob storage is not configured.' });
    const { put } = await import('@vercel/blob');
    const blob = await put(pathname, bytes, { access: 'public', contentType: type, addRandomSuffix: false, token: process.env.BLOB_READ_WRITE_TOKEN }); url = blob.url;
  }
  await store.addAudit({ event: 'blog-api-image-uploaded', entity: 'asset', entityId: pathname, ip: credential.ip, metadata: { keyId: credential.keyId, type, size: bytes.length } });
  return send(res, 201, { mediaId: id, url, name: filename, type, size: bytes.length });
};

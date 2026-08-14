const crypto = require('crypto');
const { send, parseBody, isAuthenticated, sameOrigin, clean } = require('../_cms');

const MAX_BYTES = 3 * 1024 * 1024;
const allowed = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm']);
const safeName = value => clean(value, 160).toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/^-|-$/g, '') || 'asset';

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) return send(res, 401, { error: 'Authentication required.' });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return send(res, 503, { error: 'Blob storage is not configured.' });
  const { list, put, del } = await import('@vercel/blob');
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (req.method === 'GET') {
    const result = await list({ prefix: 'space-cms/assets/', limit: 1000, token });
    return send(res, 200, { assets: result.blobs.map(blob => ({ id: blob.pathname, url: blob.url, name: blob.pathname.split('/').pop(), size: blob.size, uploadedAt: blob.uploadedAt })) });
  }
  if (!sameOrigin(req)) return send(res, 403, { error: 'Origin check failed.' });
  if (req.method === 'POST') {
    const { name, type, data } = parseBody(req);
    if (!allowed.has(type)) return send(res, 400, { error: 'Use JPG, PNG, WebP, AVIF, GIF, MP4 or WebM.' });
    let bytes;
    try { bytes = Buffer.from(String(data || ''), 'base64'); } catch { return send(res, 400, { error: 'Invalid file data.' }); }
    if (!bytes.length || bytes.length > MAX_BYTES) return send(res, 413, { error: 'Each asset must be 3 MB or smaller. Optimise it for the web first.' });
    const pathname = `space-cms/assets/${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${safeName(name)}`;
    const blob = await put(pathname, bytes, { access: 'public', contentType: type, addRandomSuffix: false, token });
    return send(res, 201, { asset: { id: blob.pathname, url: blob.url, name: safeName(name), size: bytes.length, uploadedAt: new Date().toISOString() } });
  }
  if (req.method === 'DELETE') {
    const { url } = parseBody(req);
    if (!url) return send(res, 400, { error: 'Asset URL required.' });
    await del(url, { token });
    return send(res, 200, { ok: true });
  }
  return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, DELETE' });
};

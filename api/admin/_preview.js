const { send, parseBody, requireAuth } = require('../_cms');
const { signPreview, lifetimeSeconds } = require('../_preview');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  const authentication = await requireAuth(req, { mutation: true });
  if (authentication.error) return send(res, authentication.error.status, { error: authentication.error.message });
  const body = parseBody(req), path = String(body.path || '/en/');
  if (!/^\/(?:en|fr)(?:\/|$)|^\/jobs\//.test(path)) return send(res, 400, { error: 'Preview path is not allowed.' });
  const origin = String(process.env.PREVIEW_SITE_URL || process.env.PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(origin)) return send(res, 503, { error: 'PREVIEW_SITE_URL is not configured.' });
  const token = signPreview(path);
  const url = new URL(path, `${origin}/`);
  url.searchParams.set('preview', token);
  return send(res, 200, { url: url.href, expiresAt: new Date(Date.now() + lifetimeSeconds * 1000).toISOString() });
};

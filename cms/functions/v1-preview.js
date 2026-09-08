const { send, parseBody, clean } = require('../../api/_cms');
const { requireAutomation } = require('../../api/_ingest');
const { signPreview, lifetimeSeconds } = require('../../api/_preview');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  const credential = await requireAutomation(req, res); if (!credential) return;
  const body = parseBody(req), pathname = clean(body.path || '/en/', 500);
  if (!pathname.startsWith('/') || pathname.startsWith('//')) return send(res, 400, { error: 'Preview path must begin with one forward slash.' });
  try {
    const token = signPreview(pathname), publicOrigin = String(process.env.PUBLIC_SITE_URL || 'https://www.space-tr.com').replace(/\/+$/, '');
    const url = new URL(pathname, `${publicOrigin}/`); url.searchParams.set('preview', token);
    return send(res, 200, { url: url.toString(), path: pathname, expiresIn: lifetimeSeconds });
  } catch (error) { return send(res, 503, { error: error.message }); }
};

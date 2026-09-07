const crypto = require('crypto');

const lifetimeSeconds = 10 * 60;
const secret = () => String(process.env.CMS_PREVIEW_SECRET || '');
const sourceHeaders = () => ({
  Accept: 'application/json',
  ...(process.env.CMS_SOURCE_BYPASS_SECRET ? { 'X-Vercel-Protection-Bypass': process.env.CMS_SOURCE_BYPASS_SECRET } : {})
});
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');

function signPreview(pathname = '/') {
  if (secret().length < 32) throw new Error('CMS_PREVIEW_SECRET must contain at least 32 characters.');
  const payload = encode({ path: String(pathname || '/').slice(0, 500), exp: Math.floor(Date.now() / 1000) + lifetimeSeconds });
  const signature = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifyPreview(token, requestedPath = '') {
  if (!token || secret().length < 32) return null;
  const [payload, supplied] = String(token).split('.');
  if (!payload || !supplied) return null;
  const expected = crypto.createHmac('sha256', secret()).update(payload).digest('base64url');
  const left = Buffer.from(supplied), right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    if (requestedPath && decoded.path !== '/' && decoded.path !== requestedPath) return null;
    return decoded;
  } catch { return null; }
}

function previewToken(req) {
  const queryToken = Array.isArray(req.query?.preview) ? req.query.preview[0] : req.query?.preview;
  return queryToken || req.headers?.['x-cms-preview'];
}

async function loadPreviewState(req, localReader) {
  const token = previewToken(req);
  if (!verifyPreview(token)) return null;
  const source = String(process.env.CMS_PREVIEW_SOURCE_URL || '').replace(/\/+$/, '');
  if (!source) return localReader();
  const url = new URL('/api/preview-state', `${source}/`);
  url.searchParams.set('preview', token);
  const response = await fetch(url, { headers: sourceHeaders(), cache: 'no-store' });
  if (!response.ok) throw new Error(`The private preview source returned ${response.status}.`);
  return response.json();
}

async function loadPublishedState() {
  const source = String(process.env.CMS_PREVIEW_SOURCE_URL || '').replace(/\/+$/, '');
  if (!source) return null;
  const token = signPreview('/__published__');
  const response = await fetch(new URL('/api/preview-state?mode=published', `${source}/`), {
    headers: { ...sourceHeaders(), 'X-CMS-Preview': token },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error(`The private published-content source returned ${response.status}.`);
  return response.json();
}

module.exports = { signPreview, verifyPreview, previewToken, loadPreviewState, loadPublishedState, lifetimeSeconds };

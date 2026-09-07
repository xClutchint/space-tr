const crypto = require('crypto');
const { send } = require('./_cms');
const { safeEqual, requestIp } = require('./_auth');
const store = require('./_store');

async function requireIngest(req, res) {
  const configured = String(process.env.CMS_API_KEY || process.env.BLOG_INGEST_API_KEY || '');
  if (!configured) { send(res, 503, { error: 'CMS automation API is not configured.' }); return null; }
  const authorization = String(req.headers.authorization || ''), token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const suppliedHash = crypto.createHash('sha256').update(token).digest('hex'), expectedHash = crypto.createHash('sha256').update(configured).digest('hex');
  if (!token || !safeEqual(suppliedHash, expectedHash)) { send(res, 401, { error: 'Invalid API credentials.' }); return null; }
  const ip = requestIp(req), rate = await store.consumeRateLimit(`cms-api:${ip}`, 120, 60 * 60 * 1000);
  if (!rate.allowed) { send(res, 429, { error: 'API rate limit exceeded.' }, { 'Retry-After': String(rate.retryAfter) }); return null; }
  return { ip, keyId: expectedHash.slice(0, 12) };
}

module.exports = { requireAutomation: requireIngest, requireIngest };

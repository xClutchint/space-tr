const { send, parseBody, safeEqual, makeSession, setSessionCookie } = require('../_cms');
const attempts = globalThis.__spaceCmsLoginAttempts || (globalThis.__spaceCmsLoginAttempts = new Map());

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  const expectedUser = process.env.CMS_USERNAME || '';
  const expectedPassword = process.env.CMS_PASSWORD || '';
  if (!expectedUser || !expectedPassword || !process.env.CMS_SESSION_SECRET) return send(res, 503, { error: 'CMS credentials are not configured on this deployment.' });
  const key = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  const now = Date.now(), recent = (attempts.get(key) || []).filter(time => now - time < 15 * 60 * 1000);
  if (recent.length >= 8) return send(res, 429, { error: 'Too many sign-in attempts. Try again later.' }, { 'Retry-After': '900' });
  const { username, password } = parseBody(req);
  if (!safeEqual(username, expectedUser) || !safeEqual(password, expectedPassword)) { recent.push(now); attempts.set(key, recent); return send(res, 401, { error: 'Incorrect ID or password.' }); }
  attempts.delete(key);
  setSessionCookie(res, makeSession(expectedUser));
  return send(res, 200, { ok: true });
};

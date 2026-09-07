const { send, parseBody } = require('../_cms');
const { bootstrapOwner, normalizeEmail, requestIp, verifyPassword, createSession, setSessionCookie, sameOrigin } = require('../_auth');
const store = require('../_store');
const DUMMY_PASSWORD_HASH = 'scrypt$32768$8$1$c3BhY2UtY21zLWR1bW15IQ$WhMQQT5E8Tg3-lmMYzvHSbKiAbnt5k3RNieGaQCdbGyziv_Lm8Vi-UMj8MqNFMuS6FfbG-kSKM2hJRRGrqVslg';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Origin check failed.' });
  try { await bootstrapOwner(); } catch (error) { return send(res, 503, { error: error.message }); }
  const body = parseBody(req), email = normalizeEmail(body.email || body.username), ip = requestIp(req);
  const [rate, addressRate] = await Promise.all([store.consumeRateLimit(`login:${ip}:${email}`, 8, 15 * 60 * 1000), store.consumeRateLimit(`login-ip:${ip}`, 30, 15 * 60 * 1000)]);
  if (!rate.allowed || !addressRate.allowed) return send(res, 429, { error: 'Too many sign-in attempts. Try again later.' }, { 'Retry-After': String(Math.max(rate.retryAfter || 0, addressRate.retryAfter || 0)) });
  const user = await store.getUserByEmail(email);
  const passwordMatches = await verifyPassword(body.password, user?.passwordHash || DUMMY_PASSWORD_HASH);
  const valid = Boolean(user?.active && user.passwordHash && passwordMatches);
  if (!valid) {
    await store.addAudit({ event: 'login-failed', entity: 'authentication', entityId: email, ip, metadata: {} });
    return send(res, 401, { error: 'Incorrect email or password.' });
  }
  const session = await createSession(user); setSessionCookie(res, session.token);
  await store.addAudit({ actorId: user.id, event: 'login', entity: 'authentication', entityId: user.id, ip, metadata: {} });
  return send(res, 200, { ok: true, csrf: session.csrf, user: { id: user.id, email: user.email, role: user.role } });
};

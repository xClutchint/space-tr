const crypto = require('crypto');
const { send, parseBody } = require('../_cms');
const { bootstrapOwner, normalizeEmail, requestIp, otpHash, sendOtpEmail, sameOrigin } = require('../_auth');
const store = require('../_store');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Origin check failed.' });
  await bootstrapOwner();
  const email = normalizeEmail(parseBody(req).email), ip = requestIp(req), generic = { ok: true, message: 'If that email is authorised, a verification code has been sent.' };
  const [rate, addressRate] = await Promise.all([store.consumeRateLimit(`otp-request:${ip}:${email}`, 3, 60 * 60 * 1000), store.consumeRateLimit(`otp-request-ip:${ip}`, 12, 60 * 60 * 1000)]);
  if (!rate.allowed || !addressRate.allowed) return send(res, 200, generic);
  const user = await store.getUserByEmail(email);
  if (!user?.active) { await store.addAudit({ event: 'recovery-unknown-email', entity: 'authentication', entityId: email, ip, metadata: {} }); return send(res, 200, generic); }
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  await store.saveOtp({ email, codeHash: otpHash(email, code), attempts: 0, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), requestedAt: new Date().toISOString() });
  try {
    const result = await sendOtpEmail(email, code);
    await store.addAudit({ actorId: user.id, event: 'recovery-code-sent', entity: 'authentication', entityId: user.id, ip, metadata: {} });
    return send(res, 200, { ...generic, ...(result.developmentCode ? { developmentCode: result.developmentCode } : {}) });
  } catch (error) {
    await store.deleteOtp(email);
    await store.addAudit({ actorId: user.id, event: 'recovery-email-failed', entity: 'authentication', entityId: user.id, ip, metadata: { reason: String(error.message || 'delivery failure').slice(0, 160) } });
    return send(res, 200, generic);
  }
};

const crypto = require('crypto');
const { send, parseBody } = require('../_cms');
const { normalizeEmail, requestIp, otpHash, safeEqual, hashToken, sameOrigin } = require('../_auth');
const store = require('../_store');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Origin check failed.' });
  const body = parseBody(req), email = normalizeEmail(body.email), code = String(body.otp || '').replace(/\D/g, '').slice(0, 6), ip = requestIp(req);
  const rate = await store.consumeRateLimit(`otp-verify:${ip}:${email}`, 8, 15 * 60 * 1000);
  if (!rate.allowed) return send(res, 429, { error: 'Too many verification attempts. Request a new code later.' }, { 'Retry-After': String(rate.retryAfter) });
  const record = await store.getOtp(email), valid = record && record.attempts < 5 && Date.parse(record.expiresAt) > Date.now() && safeEqual(record.codeHash, otpHash(email, code));
  if (!valid) {
    if (record) await store.updateOtpAttempts(email, Number(record.attempts || 0) + 1);
    return send(res, 400, { error: 'The verification code is invalid or has expired.' });
  }
  await store.deleteOtp(email);
  const token = crypto.randomBytes(32).toString('base64url');
  await store.saveResetTicket({ tokenHash: hashToken(token), email, expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(), used: false });
  await store.addAudit({ event: 'recovery-code-verified', entity: 'authentication', entityId: email, ip, metadata: {} });
  return send(res, 200, { ok: true, resetToken: token });
};

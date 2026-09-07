const { send, parseBody } = require('../_cms');
const { requestIp, hashToken, passwordProblem, hashPassword, sameOrigin } = require('../_auth');
const store = require('../_store');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Origin check failed.' });
  const body = parseBody(req), problem = passwordProblem(body.password);
  if (problem) return send(res, 400, { error: problem });
  if (body.password !== body.confirmPassword) return send(res, 400, { error: 'Passwords do not match.' });
  const ticket = await store.consumeResetTicket(hashToken(body.resetToken));
  if (!ticket) return send(res, 400, { error: 'The reset session is invalid or has expired.' });
  const user = await store.getUserByEmail(ticket.email);
  if (!user?.active) return send(res, 400, { error: 'The account is not available.' });
  await store.saveUser({ ...user, passwordHash: await hashPassword(body.password) });
  await store.deleteUserSessions(user.id);
  await store.addAudit({ actorId: user.id, event: 'password-reset', entity: 'authentication', entityId: user.id, ip: requestIp(req), metadata: {} });
  return send(res, 200, { ok: true, message: 'Password changed. You can now sign in.' });
};

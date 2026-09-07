const { send } = require('../_cms');
const { currentAuth, setSessionCookie, sameOrigin, requestIp } = require('../_auth');
const store = require('../_store');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  if (!sameOrigin(req)) return send(res, 403, { error: 'Origin check failed.' });
  const authentication = await currentAuth(req);
  if (authentication) {
    if (!authentication.stateless) await store.deleteSession(authentication.tokenHash);
    await store.addAudit({ actorId: authentication.user.id, event: 'logout', entity: 'authentication', entityId: authentication.user.id, ip: requestIp(req), metadata: {} });
  }
  setSessionCookie(res, '', 0); return send(res, 200, { ok: true });
};

const { send, parseBody, requireAuth, readDraftState, writeDraft } = require('../_cms');
const { requestIp } = require('../_auth');
const store = require('../_store');

module.exports = async function handler(req, res) {
  const authentication = await requireAuth(req, { mutation: req.method !== 'GET' });
  if (authentication.error) return send(res, authentication.error.status, { error: authentication.error.message });
  if (req.method === 'GET') return send(res, 200, { ...(await readDraftState()), _session: { csrf: authentication.csrf, user: { email: authentication.user.email, role: authentication.user.role } } });
  if (req.method === 'PUT') {
    try {
      const body = parseBody(req), state = await writeDraft(body.state || body, authentication.user.id, body.expectedVersion || body._meta?.version);
      await store.addAudit({ actorId: authentication.user.id, event: 'draft-saved', entity: 'site-content', entityId: 'site', ip: requestIp(req), metadata: { version: state._meta.version } });
      return send(res, 200, state);
    } catch (error) { return send(res, error.status || 503, { error: error.message, details: error.details }); }
  }
  return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, PUT' });
};

const { send, parseBody, requireAuth, sanitizeState, writeDraft } = require('../_cms');
const { requestIp } = require('../_auth');
const store = require('../_store');

module.exports = async function handler(req, res) {
  const authentication = await requireAuth(req, { owner: req.method !== 'GET', mutation: req.method !== 'GET' });
  if (authentication.error) return send(res, authentication.error.status, { error: authentication.error.message });
  if (req.method === 'GET') return send(res, 200, { revisions: await store.listRevisions(50) });
  if (req.method === 'POST') {
    const revision = await store.getRevision(parseBody(req).id); if (!revision) return send(res, 404, { error: 'Revision not found.' });
    const restored = await writeDraft(sanitizeState(revision.state), authentication.user.id);
    await store.addAudit({ actorId: authentication.user.id, event: 'revision-restored', entity: 'site-content', entityId: String(revision.id), ip: requestIp(req), metadata: { restoredVersion: revision.version, newVersion: restored._meta.version } });
    return send(res, 200, { state: restored, message: 'Revision restored as an unpublished draft.' });
  }
  return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
};

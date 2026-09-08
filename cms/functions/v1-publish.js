const { send, parseBody, readDraftState, publishState } = require('../../api/_cms');
const { requireAutomation } = require('../../api/_ingest');
const store = require('../../api/_store');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  const credential = await requireAutomation(req, res); if (!credential) return;
  const body = parseBody(req), scope = ['all', 'desktop', 'mobile'].includes(body.scope) ? body.scope : 'all';
  try {
    const state = await readDraftState(), expectedVersion = Number(body.expectedVersion || state._meta?.version), actorId = `api:${credential.keyId}`;
    const published = await publishState(state, actorId, expectedVersion, scope);
    await store.addAudit({ actorId, event: 'api-publish', entity: 'content', ip: credential.ip, metadata: { scope, version: published._meta.version } });
    return send(res, 200, { ok: true, status: 'published', scope, version: published._meta.version, publishedAt: published._meta.publishedAt });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message, ...(error.details ? { details: error.details } : {}) });
  }
};

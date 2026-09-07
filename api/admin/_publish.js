const { send, parseBody, requireAuth, publishState, readDraftState } = require('../_cms');
const { requestIp } = require('../_auth');
const { notifyIndexing } = require('../_indexing');
const store = require('../_store');

async function triggerDeployment() {
  const hook = String(process.env.SITE_DEPLOY_HOOK_URL || '');
  if (!hook) return { configured: false };
  try {
    const response = await fetch(hook, { method: 'POST', headers: { 'User-Agent': 'space-cms-publisher/1.0' } });
    const body = await response.json().catch(() => ({}));
    return { configured: true, ok: response.ok, job: body.job?.id || body.id || null };
  } catch (error) { return { configured: true, ok: false, error: error.message }; }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
  const authentication = await requireAuth(req, { mutation: true });
  if (authentication.error) return send(res, authentication.error.status, { error: authentication.error.message });
  try {
    const body = parseBody(req), previous = (await store.getDocument()).published;
    const candidate = body.state || await readDraftState();
    const scope = ['all','desktop','mobile'].includes(body.scope) ? body.scope : 'all';
    const state = await publishState(candidate, authentication.user.id, body.expectedVersion || candidate._meta?.version, scope);
    const origin = String(process.env.PUBLIC_SITE_URL || 'https://www.space-tr.com').replace(/\/+$/, '');
    const [indexing, deployment] = await Promise.all([notifyIndexing(previous, state, origin), triggerDeployment()]);
    await store.addAudit({ actorId: authentication.user.id, event: 'published', entity: 'site-content', entityId: 'site', ip: requestIp(req), metadata: { version: state._meta.version, scope, indexing, deployment } });
    return send(res, 200, { state, indexing, deployment });
  } catch (error) { return send(res, error.status || 503, { error: error.message, details: error.details }); }
};

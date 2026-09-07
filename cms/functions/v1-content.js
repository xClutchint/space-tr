const { send, clean, readDraftState } = require('../../api/_cms');
const { requireAutomation } = require('../../api/_ingest');

const resources = new Set(['brands', 'jobs', 'team', 'posts', 'media', 'pageImages', 'settings']);

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const credential = await requireAutomation(req, res); if (!credential) return;
  const state = await readDraftState();
  const resource = clean(req.query?.resource, 40);
  if (!resource) {
    return send(res, 200, {
      version: state._meta?.version || 1,
      updatedAt: state._meta?.updatedAt || null,
      resources: Object.fromEntries([...resources].map(key => [key, Array.isArray(state[key]) ? state[key].length : Boolean(state[key])])),
    });
  }
  if (!resources.has(resource)) return send(res, 400, { error: `Unknown resource. Use one of: ${[...resources].join(', ')}.` });
  return send(res, 200, { resource, data: state[resource], version: state._meta?.version || 1, updatedAt: state._meta?.updatedAt || null });
};

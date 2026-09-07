const { send, requireAuth } = require('../_cms');
const store = require('../_store');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const authentication = await requireAuth(req, { owner: true });
  if (authentication.error) return send(res, authentication.error.status, { error: authentication.error.message });
  const [events, revisions] = await Promise.all([store.listAudits(150), store.listRevisions(50)]);
  return send(res, 200, { events, revisions });
};

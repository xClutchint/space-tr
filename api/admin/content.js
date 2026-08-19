const { send, parseBody, isAuthenticated, sameOrigin, readState, writeState } = require('../_cms');
const { notifyIndexing } = require('../_indexing');

module.exports = async function handler(req, res) {
  if (!isAuthenticated(req)) return send(res, 401, { error: 'Authentication required.' });
  if (req.method === 'GET') return send(res, 200, await readState());
  if (req.method === 'PUT') {
    if (!sameOrigin(req)) return send(res, 403, { error: 'Origin check failed.' });
    try {
      const previous = await readState();
      const state = await writeState(parseBody(req));
      const publicOrigin = String(process.env.PUBLIC_SITE_URL || 'https://www.space-tr.com').replace(/\/+$/, '');
      state.indexing = await notifyIndexing(previous, state, publicOrigin);
      return send(res, 200, state);
    }
    catch (error) { return send(res, 503, { error: error.message }); }
  }
  return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, PUT' });
};

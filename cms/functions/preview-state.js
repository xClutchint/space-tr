const { send, readState, readDraftState } = require('../../api/_cms');
const { verifyPreview, previewToken } = require('../../api/_preview');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const verified = verifyPreview(previewToken(req));
  if (process.env.CMS_ONLY_DEPLOYMENT !== '1' || !verified) return send(res, 404, { error: 'Not found' });
  const publishedRequest = req.query?.mode === 'published' && verified.path === '/__published__';
  const state = publishedRequest ? await readState() : await readDraftState();
  delete state._meta;
  return send(res, 200, state, { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' });
};

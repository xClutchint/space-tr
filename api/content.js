const { send, readState, readDraftState, publicState } = require('./_cms');
const { verifyPreview, previewToken, loadPreviewState } = require('./_preview');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  if (process.env.CMS_ONLY_DEPLOYMENT === '1') return send(res, 404, { error: 'Not found' });
  const preview = verifyPreview(previewToken(req));
  const state = publicState(preview ? await loadPreviewState(req, readDraftState) : await readState());
  if (preview) delete state._meta;
  return send(res, 200, state, { 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store', ...(preview ? { 'X-Robots-Tag': 'noindex, nofollow, noarchive' } : {}) });
};

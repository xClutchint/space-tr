const { send, readState } = require('./_cms');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  try {
    const state = await readState();
    return send(res, 200, { status: 'ok', publishedAt: state.updatedAt || null, checkedAt: new Date().toISOString() }, { 'Cache-Control': 'no-store' });
  } catch { return send(res, 503, { status: 'unavailable', checkedAt: new Date().toISOString() }); }
};

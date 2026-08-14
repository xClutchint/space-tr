const { send, readState, publicState } = require('./_cms');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const state = publicState(await readState());
  return send(res, 200, state, { 'Cache-Control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' });
};

const { send, setSessionCookie, sameOrigin } = require('../_cms');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST' || !sameOrigin(req)) return send(res, 405, { error: 'Method not allowed' });
  setSessionCookie(res, '', 0);
  return send(res, 200, { ok: true });
};

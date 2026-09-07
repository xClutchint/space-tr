const { send } = require('../../api/_cms');

const handlers = Object.freeze({
  'blog-drafts': require('./v1-blog-drafts'),
  posts: require('./v1-blog-drafts'),
  media: require('./v1-media'),
  content: require('./v1-content'),
  openapi: require('./v1-openapi'),
});

module.exports = async function handler(req, res) {
  const rawResource = Array.isArray(req.query?.endpoint) ? req.query.endpoint[0] : req.query?.endpoint;
  const selected = handlers[String(rawResource || '').toLowerCase()];
  if (!selected) return send(res, 404, { error: 'Not found' });
  return selected(req, res);
};

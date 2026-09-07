const { send } = require('../../api/_cms');

const handlers = Object.freeze({
  activity: require('../../api/admin/_activity'),
  assets: require('../../api/admin/_assets'),
  backup: require('../../api/admin/_backup'),
  content: require('../../api/admin/_content'),
  login: require('../../api/admin/_login'),
  logout: require('../../api/admin/_logout'),
  'password-request': require('../../api/admin/_password-request'),
  'password-reset': require('../../api/admin/_password-reset'),
  'password-verify': require('../../api/admin/_password-verify'),
  preview: require('../../api/admin/_preview'),
  publish: require('../../api/admin/_publish'),
  revisions: require('../../api/admin/_revisions'),
  translate: require('../../api/admin/_translate'),
  users: require('../../api/admin/_users')
});

module.exports = async function handler(req, res) {
  const rawAction = Array.isArray(req.query?.action) ? req.query.action[0] : req.query?.action;
  const selected = handlers[String(rawAction || '').toLowerCase()];
  if (!selected) return send(res, 404, { error: 'Not found' });
  return selected(req, res);
};

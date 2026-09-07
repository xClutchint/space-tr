const { send, parseBody, requireAuth } = require('../_cms');
const { normalizeEmail, validEmail, requestIp } = require('../_auth');
const store = require('../_store');

const publicUser = user => ({ id: user.id, email: user.email, role: user.role, active: user.active, createdAt: user.createdAt, updatedAt: user.updatedAt });

module.exports = async function handler(req, res) {
  const authentication = await requireAuth(req, { owner: true, mutation: req.method !== 'GET' });
  if (authentication.error) return send(res, authentication.error.status, { error: authentication.error.message });
  if (req.method === 'GET') return send(res, 200, { users: (await store.listUsers()).map(publicUser) });
  const body = parseBody(req), email = normalizeEmail(body.email);
  if (!validEmail(email)) return send(res, 400, { error: 'Enter a valid email address.' });
  if (req.method === 'POST') {
    if (await store.getUserByEmail(email)) return send(res, 409, { error: 'That email is already authorised.' });
    const user = await store.saveUser({ email, role: body.role === 'owner' ? 'owner' : 'editor', active: true, passwordHash: '' });
    await store.addAudit({ actorId: authentication.user.id, event: 'user-authorised', entity: 'user', entityId: user.id, ip: requestIp(req), metadata: { email: user.email, role: user.role } });
    return send(res, 201, { user: publicUser(user), message: 'User authorised. They can use Forgot password to create their password.' });
  }
  if (req.method === 'PATCH') {
    const user = await store.getUserByEmail(email); if (!user) return send(res, 404, { error: 'User not found.' });
    const users = await store.listUsers(), nextRole = body.role === 'owner' ? 'owner' : 'editor', nextActive = body.active !== false;
    const activeOwners = users.filter(item => item.active && item.role === 'owner');
    if (user.role === 'owner' && (!nextActive || nextRole !== 'owner') && activeOwners.length <= 1) return send(res, 409, { error: 'At least one active owner is required.' });
    const updated = await store.saveUser({ ...user, role: nextRole, active: nextActive });
    if (!nextActive) await store.deleteUserSessions(user.id);
    await store.addAudit({ actorId: authentication.user.id, event: nextActive ? 'user-updated' : 'user-disabled', entity: 'user', entityId: user.id, ip: requestIp(req), metadata: { email, role: nextRole } });
    return send(res, 200, { user: publicUser(updated) });
  }
  return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, PATCH' });
};

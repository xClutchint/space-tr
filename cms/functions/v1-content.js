const crypto = require('crypto');
const { send, parseBody, clean, slug, readDraftState, writeDraft } = require('../../api/_cms');
const { requireAutomation } = require('../../api/_ingest');
const store = require('../../api/_store');

const resources = new Set(['brands', 'jobs', 'team', 'posts', 'media', 'pageImages', 'settings']);
const collections = new Set(['brands', 'jobs', 'team', 'posts', 'pageImages']);
const identifierFor = (resource, item) => resource === 'pageImages' ? item?.key : item?.id;
const findIndex = (items, resource, identifier) => items.findIndex(item =>
  String(identifierFor(resource, item)) === String(identifier) || String(item?.slug || '') === String(identifier)
);
const withoutControls = body => Object.fromEntries(Object.entries(body || {}).filter(([key]) => !['expectedVersion', 'item', 'patch'].includes(key)));

module.exports = async function handler(req, res) {
  if (!['GET', 'POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST, PATCH, PUT, DELETE' });
  const credential = await requireAutomation(req, res); if (!credential) return;
  const state = await readDraftState();
  const resource = clean(req.query?.resource, 40);
  if (!resource && req.method === 'GET') {
    return send(res, 200, {
      version: state._meta?.version || 1,
      updatedAt: state._meta?.updatedAt || null,
      resources: Object.fromEntries([...resources].map(key => [key, Array.isArray(state[key]) ? state[key].length : Boolean(state[key])]))
    });
  }
  if (!resources.has(resource)) return send(res, 400, { error: `Unknown resource. Use one of: ${[...resources].join(', ')}.` });
  if (req.method === 'GET') return send(res, 200, { resource, data: state[resource], version: state._meta?.version || 1, updatedAt: state._meta?.updatedAt || null });

  const body = parseBody(req), expectedVersion = Number(body.expectedVersion || state._meta?.version), actorId = `api:${credential.keyId}`;
  let action = '', entityId = '', responseStatus = 200;
  try {
    if (req.method === 'PUT') {
      const replacement = body.data ?? body.items ?? body.value;
      if (collections.has(resource) && !Array.isArray(replacement)) return send(res, 400, { error: `${resource} must be replaced with an array in "data".` });
      if (!collections.has(resource) && (!replacement || typeof replacement !== 'object' || Array.isArray(replacement))) return send(res, 400, { error: `${resource} must be replaced with an object in "data".` });
      state[resource] = replacement;
      action = 'replace';
    } else if (req.method === 'POST') {
      if (!collections.has(resource)) return send(res, 405, { error: `POST is only available for collection resources. Use PATCH for ${resource}.` }, { Allow: 'GET, PATCH, PUT' });
      const item = { ...(body.item || withoutControls(body)) };
      if (resource === 'pageImages') item.key = slug(item.key || item.label || `page-image-${crypto.randomUUID()}`);
      else item.id = clean(item.id, 120) || `${resource.slice(0, -1)}-${crypto.randomUUID()}`;
      if (findIndex(state[resource], resource, identifierFor(resource, item)) >= 0) return send(res, 409, { error: 'An item with that identifier already exists. Use PATCH to update it.' });
      state[resource].push(item); entityId = identifierFor(resource, item); action = 'create'; responseStatus = 201;
    } else if (req.method === 'PATCH') {
      const patch = { ...(body.patch || withoutControls(body)) };
      if (!collections.has(resource)) {
        state[resource] = { ...(state[resource] || {}), ...patch };
        action = 'update'; entityId = resource;
      } else {
        const identifier = clean(req.query?.id || body.id || body.key, 160);
        if (!identifier) return send(res, 400, { error: 'Provide the item identifier as ?id=… or in the request body.' });
        const index = findIndex(state[resource], resource, identifier);
        if (index < 0) return send(res, 404, { error: `${resource} item not found.` });
        state[resource][index] = { ...state[resource][index], ...patch, ...(resource === 'pageImages' ? { key: state[resource][index].key } : { id: state[resource][index].id }) };
        entityId = identifier; action = 'update';
      }
    } else if (req.method === 'DELETE') {
      if (!collections.has(resource)) return send(res, 405, { error: `DELETE is not available for ${resource}.` }, { Allow: 'GET, PATCH, PUT' });
      const identifier = clean(req.query?.id || body.id || body.key, 160);
      if (!identifier) return send(res, 400, { error: 'Provide the item identifier as ?id=… or in the request body.' });
      const index = findIndex(state[resource], resource, identifier);
      if (index < 0) return send(res, 404, { error: `${resource} item not found.` });
      entityId = identifierFor(resource, state[resource][index]); state[resource].splice(index, 1); action = 'delete';
    }

    const saved = await writeDraft(state, actorId, expectedVersion);
    await store.addAudit({ actorId, event: `api-${resource}-${action}`, entity: resource, entityId, ip: credential.ip, metadata: { version: saved._meta.version } });
    return send(res, responseStatus, { ok: true, resource, action, data: saved[resource], version: saved._meta.version, updatedAt: saved._meta.updatedAt });
  } catch (error) {
    return send(res, error.status || 500, { error: error.message, ...(error.details ? { details: error.details } : {}) });
  }
};

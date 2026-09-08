const crypto = require('crypto');
const { send, parseBody, clean, slug, readDraftState, writeDraft } = require('../../api/_cms');
const { requireIngest } = require('../../api/_ingest');
const store = require('../../api/_store');

module.exports = async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
  const credential = await requireIngest(req, res); if (!credential) return;
  if (req.method === 'GET') {
    const state = await readDraftState();
    const limit = Math.min(100, Math.max(1, Number(req.query?.limit) || 50));
    const status = clean(req.query?.status, 20) || 'draft';
    const includeBody = String(req.query?.includeBody || '') === '1';
    const posts = state.posts
      .filter(post => status === 'all' || (status === 'published' ? post.published : !post.published))
      .slice(0, limit)
      .map(post => includeBody ? post : Object.fromEntries(Object.entries(post).filter(([key]) => key !== 'body')));
    return send(res, 200, { posts, count: posts.length, version: state._meta?.version || 1 });
  }
  const body = parseBody(req), title = clean(body.title, 200), articleBody = clean(body.body, 60000), sourceId = clean(body.sourceId || req.headers['x-idempotency-key'], 160);
  if (!title || articleBody.length < 80) return send(res, 400, { error: 'A title and at least 80 characters of article content are required.' });
  const imageUrl = clean(body.imageUrl, 2000);
  if (imageUrl && !/^(https:\/\/|\/assets\/media\/cms\/uploads\/)/i.test(imageUrl)) return send(res, 400, { error: 'Use an image URL returned by the media endpoint.' });
  const state = await readDraftState(), identifier = sourceId || crypto.randomUUID();
  const item = {
    id: clean(body.id, 100) || `post-${identifier}`, sourceId, slug: slug(body.slug || title), title, format: 'blog',
    date: clean(body.date, 10) || new Date().toISOString().slice(0, 10),
    excerpt: clean(body.excerpt, 300) || articleBody.replace(/[#*_[\]()]/g, '').replace(/\s+/g, ' ').slice(0, 280), body: articleBody,
    imageUrl, thumbnailUrl: clean(body.thumbnailUrl, 2000) || imageUrl,
    seoTitle: clean(body.seoTitle, 70), seoDescription: clean(body.seoDescription, 170), author: clean(body.author, 120) || 'Space Editorial Team',
    language: body.language === 'fr' ? 'fr' : 'en', published: false
  };
  const existing = sourceId ? state.posts.findIndex(post => post.sourceId === sourceId) : -1;
  if (existing >= 0) state.posts.splice(existing, 1, item); else state.posts.unshift(item);
  const saved = await writeDraft(state, null, state._meta?.version);
  await store.addAudit({ event: existing >= 0 ? 'blog-api-draft-updated' : 'blog-api-draft-created', entity: 'post', entityId: item.id, ip: credential.ip, metadata: { keyId: credential.keyId, sourceId, version: saved._meta.version } });
  const cmsOrigin = String(process.env.CMS_PUBLIC_URL || process.env.PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  return send(res, existing >= 0 ? 200 : 201, { id: item.id, slug: item.slug, status: 'draft', version: saved._meta.version, previewUrl: cmsOrigin ? `${cmsOrigin}/cms/#posts` : '/cms/#posts' });
};

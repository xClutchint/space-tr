const { send } = require('../../api/_cms');
const { requireAutomation } = require('../../api/_ingest');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const credential = await requireAutomation(req, res); if (!credential) return;
  const origin = String(process.env.CMS_PUBLIC_URL || 'https://space-tr-cms.vercel.app').replace(/\/+$/, '');
  return send(res, 200, {
    openapi: '3.1.0',
    info: { title: 'SPACE CMS Automation API', version: '1.0.0', description: 'Private, draft-first REST API for SPACE content automation.' },
    servers: [{ url: origin }],
    security: [{ bearerAuth: [] }],
    paths: {
      '/api/v1/content': { get: { summary: 'Inspect draft content resources', parameters: [{ name: 'resource', in: 'query', schema: { type: 'string', enum: ['brands', 'jobs', 'team', 'posts', 'media', 'pageImages', 'settings'] } }], responses: { 200: { description: 'Draft resource or resource summary' } } } },
      '/api/v1/posts': {
        get: { summary: 'List CMS posts', parameters: [{ name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'published', 'all'], default: 'draft' } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } }, { name: 'includeBody', in: 'query', schema: { type: 'integer', enum: [0, 1], default: 0 } }], responses: { 200: { description: 'Post collection' } } },
        post: { summary: 'Create or idempotently update a draft post', parameters: [{ name: 'X-Idempotency-Key', in: 'header', schema: { type: 'string', maxLength: 160 } }], requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title', 'body'], properties: { title: { type: 'string', maxLength: 200 }, body: { type: 'string', minLength: 80, maxLength: 60000 }, sourceId: { type: 'string', maxLength: 160 }, slug: { type: 'string' }, excerpt: { type: 'string', maxLength: 1200 }, imageUrl: { type: 'string' }, thumbnailUrl: { type: 'string' }, language: { type: 'string', enum: ['en', 'fr'] }, date: { type: 'string', format: 'date' } } } } } }, responses: { 201: { description: 'Draft created' }, 200: { description: 'Existing draft updated' } } }
      },
      '/api/v1/media': { post: { summary: 'Upload a blog image', requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'type', 'data'], properties: { name: { type: 'string' }, type: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] }, data: { type: 'string', description: 'Base64 image bytes, without a data URL prefix. Maximum decoded size: 8 MB.' } } } } } }, responses: { 201: { description: 'Media stored' } } } },
      '/api/v1/openapi': { get: { summary: 'Return this authenticated OpenAPI document', responses: { 200: { description: 'OpenAPI document' } } } },
    },
    components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
  });
};

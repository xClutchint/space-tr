const { send } = require('../../api/_cms');
const { requireAutomation } = require('../../api/_ingest');

const jsonBody = schema => ({
  required: true,
  content: { 'application/json': { schema } }
});

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const credential = await requireAutomation(req, res); if (!credential) return;

  const origin = String(process.env.CMS_PUBLIC_URL || 'https://space-tr-cms.vercel.app').replace(/\/+$/, '');
  const resourceNames = ['brands', 'jobs', 'team', 'posts', 'media', 'pageImages', 'settings'];
  const resource = { name: 'resource', in: 'query', required: true, schema: { type: 'string', enum: resourceNames } };
  const itemId = { name: 'id', in: 'query', schema: { type: 'string' } };
  const expectedVersion = { type: 'integer', description: 'Version returned by the preceding read or mutation.' };
  const draftResponse = { description: 'Draft saved. The response includes the new version.' };
  const responses = {
    Unauthorized: { description: 'Missing or invalid bearer token.' },
    Conflict: { description: 'Draft version changed. Read the resource, reconcile, and retry.' },
    NotFound: { description: 'Item or asset not found.' }
  };

  const paths = {};
  paths['/api/v1/content'] = {
    get: {
      summary: 'List resources or read one draft resource',
      parameters: [{ ...resource, required: false }],
      responses: { 200: { description: 'Resource summary or resource data.' }, 401: { $ref: '#/components/responses/Unauthorized' } }
    },
    post: {
      summary: 'Create one draft item',
      description: 'Available for brands, jobs, team, posts, and pageImages.',
      parameters: [resource],
      requestBody: jsonBody({
        type: 'object',
        required: ['item'],
        properties: {
          item: { oneOf: [
            { $ref: '#/components/schemas/Brand' },
            { $ref: '#/components/schemas/Job' },
            { $ref: '#/components/schemas/TeamMember' },
            { $ref: '#/components/schemas/Post' },
            { $ref: '#/components/schemas/PageImage' }
          ] },
          expectedVersion
        }
      }),
      responses: { 201: draftResponse, 409: { $ref: '#/components/responses/Conflict' } }
    },
    patch: {
      summary: 'Update a draft item or singleton resource',
      description: 'For collections pass ?id=ITEM_ID; a slug is also accepted. For media and settings, omit id and merge the supplied patch.',
      parameters: [resource, itemId],
      requestBody: jsonBody({
        type: 'object',
        required: ['patch'],
        properties: { patch: { type: 'object', additionalProperties: true }, expectedVersion }
      }),
      responses: { 200: draftResponse, 404: { $ref: '#/components/responses/NotFound' }, 409: { $ref: '#/components/responses/Conflict' } }
    },
    put: {
      summary: 'Replace an entire draft resource',
      description: 'Collection data is an array. Media and settings data is an object.',
      parameters: [resource],
      requestBody: jsonBody({ type: 'object', required: ['data'], properties: { data: {}, expectedVersion } }),
      responses: { 200: draftResponse, 409: { $ref: '#/components/responses/Conflict' } }
    },
    delete: {
      summary: 'Delete one collection item from the draft',
      parameters: [resource, { ...itemId, required: true }],
      requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { expectedVersion } } } } },
      responses: { 200: draftResponse, 404: { $ref: '#/components/responses/NotFound' }, 409: { $ref: '#/components/responses/Conflict' } }
    }
  };

  paths['/api/v1/posts'] = {
    get: {
      summary: 'List article drafts',
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'published', 'all'], default: 'draft' } },
        { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
        { name: 'includeBody', in: 'query', schema: { type: 'integer', enum: [0, 1], default: 0 } }
      ],
      responses: { 200: { description: 'Article collection.' } }
    },
    post: {
      summary: 'Create or idempotently update an article draft',
      description: 'Use sourceId or X-Idempotency-Key to make retries update the same draft.',
      parameters: [{ name: 'X-Idempotency-Key', in: 'header', schema: { type: 'string', maxLength: 160 } }],
      requestBody: jsonBody({ $ref: '#/components/schemas/PostInput' }),
      responses: { 201: { description: 'Draft created.' }, 200: { description: 'Existing idempotent draft updated.' } }
    }
  };

  paths['/api/v1/media'] = {
    get: {
      summary: 'List assets',
      parameters: [{ name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 5000, default: 100 } }],
      responses: { 200: { description: 'Asset collection.' } }
    },
    post: {
      summary: 'Upload and optimise an image',
      description: 'The returned url is the preferred web-ready variant and can be assigned to any CMS image field.',
      requestBody: jsonBody({
        type: 'object',
        required: ['name', 'type', 'data'],
        properties: {
          name: { type: 'string', maxLength: 120 },
          type: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'] },
          data: { type: 'string', contentEncoding: 'base64', description: 'Maximum decoded size: 8 MB. A data URL prefix is optional.' }
        }
      }),
      responses: { 201: { description: 'Image stored, added to the library, and optimised.' }, 413: { description: 'Image exceeds 8 MB.' } }
    },
    delete: {
      summary: 'Delete an asset everywhere',
      description: 'Removes source, generated variants, library record, and draft and published references.',
      parameters: [{ name: 'id', in: 'query', required: true, schema: { type: 'string' } }],
      responses: { 200: { description: 'Asset deleted.' }, 404: { $ref: '#/components/responses/NotFound' } }
    }
  };

  paths['/api/v1/preview'] = {
    post: {
      summary: 'Create a ten-minute signed draft preview URL',
      requestBody: jsonBody({
        type: 'object',
        required: ['path'],
        properties: { path: { type: 'string', examples: ['/en/posts/article-slug', '/en/'] } }
      }),
      responses: { 200: { description: 'Signed public-site preview URL.' } }
    }
  };

  paths['/api/v1/publish'] = {
    post: {
      summary: 'Publish the current draft',
      description: 'Call only after review and explicit publication approval. A post must have published:true to become public; other posts remain drafts.',
      requestBody: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                scope: { type: 'string', enum: ['all', 'desktop', 'mobile'], default: 'all' },
                expectedVersion
              }
            }
          }
        }
      },
      responses: { 200: { description: 'Published.' }, 409: { $ref: '#/components/responses/Conflict' }, 422: { description: 'Draft failed publication validation.' } }
    }
  };
  paths['/api/v1/openapi'] = { get: { summary: 'Return this OpenAPI 3.1 document', responses: { 200: { description: 'Machine-readable API contract.' } } } };

  const schemas = {
    MediaReference: {
      type: 'object',
      required: ['url'],
      properties: {
        id: { type: 'string' }, url: { type: 'string' }, mobileUrl: { type: 'string' }, desktopUrl: { type: 'string' },
        thumbnailUrl: { type: 'string' }, posterUrl: { type: 'string' }, type: { type: 'string', enum: ['image', 'video'] },
        alt: { type: 'string', maxLength: 220 }, label: { type: 'string', maxLength: 160 }, brand: { type: 'string', maxLength: 120 },
        orientation: { type: 'string', enum: ['vertical', 'horizontal', 'square', ''] }
      }
    },
    Brand: {
      type: 'object', required: ['name'],
      properties: { id: { type: 'string' }, slug: { type: 'string' }, name: { type: 'string', maxLength: 160 }, category: { type: 'string', enum: ['niche', 'premium', 'mass'] }, logoNumber: { type: 'integer' }, logoUrl: { type: 'string' }, bannerUrl: { type: 'string' }, active: { type: 'boolean' } }
    },
    Job: {
      type: 'object', required: ['title', 'description'],
      properties: {
        id: { type: 'string' }, slug: { type: 'string' }, title: { type: 'string', maxLength: 160 }, department: { type: 'string', maxLength: 120 },
        workplaceType: { type: 'string', enum: ['ONSITE', 'HYBRID', 'REMOTE'] }, location: { type: 'string', examples: ['Nairobi, Kenya', 'Remote'] },
        employmentType: { type: 'string', enum: ['FULL_TIME', 'PART_TIME', 'CONTRACTOR', 'TEMPORARY', 'INTERN', 'OTHER'] },
        datePosted: { type: 'string', format: 'date' }, validThrough: { type: 'string' }, description: { type: 'string', maxLength: 16000 },
        responsibilities: { type: 'array', items: { type: 'string' } }, qualifications: { type: 'array', items: { type: 'string' } },
        applyEmail: { type: 'string', format: 'email' }, active: { type: 'boolean' }
      }
    },
    TeamMember: {
      type: 'object', required: ['name', 'role', 'imageUrl'],
      properties: {
        id: { type: 'string' }, slug: { type: 'string' }, name: { type: 'string', maxLength: 160 }, role: { type: 'string', maxLength: 220 },
        roleFr: { type: 'string', maxLength: 220 }, imageUrl: { type: 'string' }, linkedin: { type: 'string', format: 'uri' },
        bio: { type: 'array', maxItems: 16, items: { type: 'string', maxLength: 3000 } },
        bioFr: { type: 'array', maxItems: 16, items: { type: 'string', maxLength: 3000 } }, active: { type: 'boolean' }
      }
    },
    PostInput: {
      type: 'object', required: ['title', 'body'],
      properties: {
        title: { type: 'string', maxLength: 200 }, slug: { type: 'string' },
        body: { type: 'string', minLength: 80, maxLength: 60000, description: 'Restricted Markdown: blank lines are paragraphs; ## and ### are headings; **text** is bold; *text* is italic; consecutive - items are a list; [label](https://url) is a link.' },
        excerpt: { type: 'string', maxLength: 300 }, imageUrl: { type: 'string' }, thumbnailUrl: { type: 'string' },
        seoTitle: { type: 'string', maxLength: 70 }, seoDescription: { type: 'string', maxLength: 170 },
        author: { type: 'string', maxLength: 120 }, language: { type: 'string', enum: ['en', 'fr'] },
        date: { type: 'string', format: 'date' }, sourceId: { type: 'string', maxLength: 160 }
      },
      examples: [{
        title: 'Why selective distribution matters', language: 'en', excerpt: 'A concise summary.',
        body: 'Opening paragraph.\n\n## Market context\n\nUse **bold emphasis**.\n\n- First point\n- Second point',
        sourceId: 'weekly-editorial-2026-37'
      }]
    },
    Post: { allOf: [{ $ref: '#/components/schemas/PostInput' }, { type: 'object', properties: { id: { type: 'string' }, published: { type: 'boolean', description: 'Leave false until explicit publication.' } } }] },
    PageImage: {
      type: 'object', required: ['key', 'page', 'label', 'url'],
      properties: {
        key: { type: 'string' }, page: { type: 'string', maxLength: 80 }, label: { type: 'string', maxLength: 120 }, url: { type: 'string' },
        x: { type: 'number', minimum: 0, maximum: 100 }, y: { type: 'number', minimum: 0, maximum: 100 }, scale: { type: 'number', minimum: 1, maximum: 1.8 },
        mobileUrl: { type: 'string' }, mobileX: { type: 'number', minimum: 0, maximum: 100 }, mobileY: { type: 'number', minimum: 0, maximum: 100 }, mobileScale: { type: 'number', minimum: 1, maximum: 1.8 }
      }
    },
    MediaState: {
      type: 'object',
      properties: {
        hero: { type: 'array', items: { $ref: '#/components/schemas/MediaReference' } },
        heroDesktop: { type: 'array', maxItems: 150, items: { $ref: '#/components/schemas/MediaReference' } },
        heroMobile: { type: 'array', maxItems: 150, items: { $ref: '#/components/schemas/MediaReference' } },
        carousel: { type: 'array', maxItems: 20, items: { $ref: '#/components/schemas/MediaReference' } }
      }
    },
    Settings: {
      type: 'object',
      properties: {
        heroDesktopRotationSeconds: { type: 'integer', minimum: 5, maximum: 15 },
        heroMobileRotationSeconds: { type: 'integer', minimum: 5, maximum: 15 },
        brandDisplayCount: { type: 'integer', minimum: 1, maximum: 80 }
      }
    }
  };

  return send(res, 200, {
    openapi: '3.1.0',
    info: {
      title: 'SPACE CMS Automation API',
      version: '2.0.0',
      description: 'Private, draft-first REST API for the complete SPACE CMS. Content mutations save a draft; only POST /api/v1/publish makes content public.'
    },
    servers: [{ url: origin }],
    security: [{ bearerAuth: [] }],
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'CMS_API_KEY', description: 'Keep this server-side and never expose it in browser code.' }
      },
      responses,
      schemas
    }
  });
};

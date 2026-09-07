const crypto = require('crypto');
const { send, clean, slug, readDraftState, writeDraft } = require('../../api/_cms');
const { safeEqual } = require('../../api/_auth');
const store = require('../../api/_store');

const topicPlan = [
  { topic: 'African fragrance market', angle: 'How international fragrance houses can approach diverse African retail markets without treating the continent as one homogeneous market.' },
  { topic: 'Brand stewardship', angle: 'Why local market knowledge, pricing discipline, training and retail execution matter after a fragrance brand enters a new market.' },
  { topic: 'Travel retail', angle: 'How travel retail and domestic distribution can complement each other for fragrance and beauty brands in Africa.' },
  { topic: 'Retail excellence', angle: 'How beauty-advisor education and consistent visual merchandising protect premium fragrance positioning.' },
  { topic: 'Operations and logistics', angle: 'The operational work behind reliable cross-border fragrance distribution, from regulatory clearance to careful stock management.' },
  { topic: 'Niche fragrance', angle: 'How guided discovery and considered hospitality are supporting interest in niche perfumery in African cities.' }
];
const bearer = request => String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
const authorised = request => {
  const expected = String(process.env.CRON_SECRET || ''), supplied = bearer(request);
  if (!expected || !supplied) return false;
  return safeEqual(crypto.createHash('sha256').update(supplied).digest('hex'), crypto.createHash('sha256').update(expected).digest('hex'));
};
const sourceIdFor = date => `space-editorial-${date}`;

function outputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') return content.text;
    }
  }
  return '';
}

async function generateDraft(brief, context) {
  const endpoint = String(process.env.EDITORIAL_GENERATOR_URL || ''), key = String(process.env.EDITORIAL_GENERATOR_API_KEY || '');
  const instructions = 'Write one useful, factual editorial draft for SPACE-TR. Return JSON with title, excerpt, body, seoTitle and seoDescription. Keep the excerpt within 300 characters. Use blank lines between body paragraphs. Do not invent statistics, contracts, exclusivity, territories, brand relationships or market claims. Do not include markdown. The result is an unpublished draft for human review.';
  const usingCustomGenerator = Boolean(endpoint && key);
  const openAiKey = String(process.env.OPENAI_API_KEY || '');
  if (!usingCustomGenerator && !openAiKey) return null;
  const response = await fetch(usingCustomGenerator ? endpoint : 'https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${usingCustomGenerator ? key : openAiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(usingCustomGenerator ? { task: instructions, brief, context } : {
      model: process.env.OPENAI_EDITORIAL_MODEL || 'gpt-5-mini',
      store: false,
      max_output_tokens: 5000,
      instructions,
      input: JSON.stringify({ brief, context }),
      text: {
        format: {
          type: 'json_schema',
          name: 'space_editorial_draft',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['title', 'excerpt', 'body', 'seoTitle', 'seoDescription'],
            properties: {
              title: { type: 'string' },
              excerpt: { type: 'string' },
              body: { type: 'string' },
              seoTitle: { type: 'string' },
              seoDescription: { type: 'string' }
            }
          }
        }
      }
    }),
    signal: AbortSignal.timeout(90000)
  });
  if (!response.ok) throw new Error(`Editorial generator returned ${response.status}.`);
  const raw = await response.json();
  const candidate = usingCustomGenerator
    ? (typeof raw.output === 'string' ? JSON.parse(raw.output) : raw.output || raw)
    : JSON.parse(outputText(raw));
  if (!candidate || typeof candidate !== 'object') throw new Error('Editorial generator returned an invalid document.');
  return candidate;
}

module.exports = async function handler(req, res) {
  if (!['GET','POST'].includes(req.method)) return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
  if (!authorised(req)) return send(res, 401, { error: 'Invalid cron credentials.' });
  const today = new Date().toISOString().slice(0, 10), sourceId = sourceIdFor(today), state = await readDraftState();
  if (state.posts.some(post => post.sourceId === sourceId)) return send(res, 200, { ok: true, duplicate: true, sourceId });
  const dayNumber = Math.floor(Date.now() / 86400000), brief = topicPlan[dayNumber % topicPlan.length];
  const activeBrands = state.brands.filter(brand => brand.active).map(brand => brand.name);
  const generated = await generateDraft(brief, {
    company: 'SPACE-TR, also known as Space, is a specialist B2B fragrance and beauty distributor connecting international brands with retailers and consumers across African markets.',
    approvedCapabilities: ['market strategy','sales and selective distribution','travel retail','brand stewardship','marketing activation','retail excellence and training','warehousing and cross-border logistics'],
    visiblePortfolioNames: activeBrands,
    editorialRules: ['Use SPACE-TR and Space naturally','Prefer useful operational insight over promotional superlatives','Only name a brand when the relationship is present in the supplied portfolio','Never call Space the best, exclusive or official unless a human adds verified evidence']
  });
  if (!generated) return send(res, 200, { ok: true, skipped: true, reason: 'Editorial generator is not configured; no external spend was incurred.', brief });
  const title = clean(generated.title, 200), body = clean(generated.body, 60000), excerpt = clean(generated.excerpt, 300);
  if (!title || body.length < 500 || !excerpt) return send(res, 422, { error: 'Generated draft failed the minimum editorial quality checks.' });
  const post = {
    id: `post-${sourceId}`, sourceId, slug: slug(generated.slug || title), title, format: 'blog',
    date: today, updatedAt: new Date().toISOString(), excerpt, body, seoTitle: clean(generated.seoTitle, 70), seoDescription: clean(generated.seoDescription, 170),
    author: 'Space Editorial Team', imageUrl: '', thumbnailUrl: '', language: 'en', published: false
  };
  state.posts.unshift(post);
  const saved = await writeDraft(state, null, state._meta?.version);
  await store.addAudit({ event: 'scheduled-blog-draft-created', entity: 'post', entityId: post.id, metadata: { sourceId, brief: brief.topic, version: saved._meta.version } });
  return send(res, 201, { ok: true, status: 'draft', id: post.id, slug: post.slug, version: saved._meta.version });
};

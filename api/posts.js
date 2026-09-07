const { send, readState, readDraftState, publicState } = require('./_cms');
const { verifyPreview, previewToken, loadPreviewState } = require('./_preview');

const safeDate = value => String(value || '').slice(0, 10);
function summary(post) {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    format: 'blog',
    language: post.language === 'fr' ? 'fr' : 'en',
    date: safeDate(post.date),
    excerpt: post.excerpt || String(post.body || '').split(/\n\s*\n/)[0].slice(0, 300),
    imageUrl: post.thumbnailUrl || post.imageUrl
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  if (process.env.CMS_ONLY_DEPLOYMENT === '1') return send(res, 404, { error: 'Not found' });
  const preview = verifyPreview(previewToken(req));
  const state = publicState(preview ? await loadPreviewState(req, readDraftState) : await readState());
  const sort = req.query?.sort === 'oldest' ? 'oldest' : 'latest';
  const language = req.query?.language === 'fr' ? 'fr' : req.query?.language === 'en' ? 'en' : '';
  const limit = Math.min(Math.max(Number.parseInt(req.query?.limit || '10', 10) || 10, 1), 50);
  const requestedPage = Math.max(Number.parseInt(req.query?.page || '1', 10) || 1, 1);
  const filtered = state.posts.map(summary)
    .filter(post => !language || post.language === language)
    .sort((left, right) => {
      const comparison = safeDate(left.date).localeCompare(safeDate(right.date));
      return sort === 'oldest' ? comparison : -comparison;
    });
  const total = filtered.length, totalPages = Math.max(Math.ceil(total / limit), 1);
  const page = Math.min(requestedPage, totalPages), start = (page - 1) * limit;
  return send(res, 200, {
    posts: filtered.slice(start, start + limit),
    pagination: { page, limit, total, totalPages }, sort, language: language || 'all'
  }, { 'Cache-Control': preview ? 'private, no-store' : 'public, max-age=0, s-maxage=30, stale-while-revalidate=300', ...(preview ? { 'X-Robots-Tag': 'noindex, nofollow, noarchive' } : {}) });
};

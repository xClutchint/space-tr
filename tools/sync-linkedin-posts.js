const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cachePath = path.join(root, 'data', 'linkedin-posts.json');
const token = process.env.LINKEDIN_ACCESS_TOKEN;
const author = process.env.LINKEDIN_AUTHOR_URN;
const apiVersion = process.env.LINKEDIN_API_VERSION || '202604';
const requestedCount = Number.parseInt(process.env.LINKEDIN_POST_COUNT || '50', 10);
const count = Math.min(Math.max(Number.isFinite(requestedCount) ? requestedCount : 50, 1), 100);

function readCache() {
  try {
    return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  } catch {
    return { source: 'linkedin', author: '', syncedAt: null, posts: [] };
  }
}

function linkedinUrl(id) {
  const safeId = String(id || '').replace(/[^a-zA-Z0-9:._-]/g, '');
  return safeId ? `https://www.linkedin.com/feed/update/${safeId}/` : '';
}

function firstImage(content) {
  const media = content?.multiImage?.images || content?.carousel?.cards || [];
  const candidate = media[0]?.id || media[0]?.image || content?.media?.id;
  return typeof candidate === 'string' && /^https?:\/\//.test(candidate) ? candidate : null;
}

function normalize(post, previous = {}) {
  const commentary = typeof post.commentary === 'string' ? post.commentary.trim() : '';
  const publishedAt = post.publishedAt ? new Date(post.publishedAt).toISOString() : null;
  const article = post.content?.article || {};
  return {
    ...previous,
    id: post.id,
    text: commentary,
    publishedAt,
    lastModifiedAt: post.lastModifiedAt ? new Date(post.lastModifiedAt).toISOString() : publishedAt,
    linkedinUrl: linkedinUrl(post.id),
    articleUrl: typeof article.source === 'string' ? article.source : null,
    articleTitle: typeof article.title === 'string' ? article.title : null,
    imageUrl: previous.imageUrl || firstImage(post.content),
    hidden: previous.hidden === true,
    lifecycleState: post.lifecycleState || 'PUBLISHED'
  };
}

async function main() {
  if (!token || !author) {
    throw new Error('Set LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN before syncing. See docs/linkedin-posts.md.');
  }

  const endpoint = new URL('https://api.linkedin.com/rest/posts');
  endpoint.searchParams.set('author', author);
  endpoint.searchParams.set('q', 'author');
  endpoint.searchParams.set('count', String(count));
  endpoint.searchParams.set('sortBy', 'CREATED');

  const response = await fetch(endpoint, {
    headers: {
      Authorization: `Bearer ${token}`,
      'LinkedIn-Version': apiVersion,
      'X-Restli-Protocol-Version': '2.0.0'
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LinkedIn returned ${response.status}: ${detail.slice(0, 500)}`);
  }

  const payload = await response.json();
  const existing = readCache();
  const previousById = new Map((existing.posts || []).map(post => [post.id, post]));
  const posts = (payload.elements || [])
    .filter(post => post.id && post.lifecycleState !== 'DRAFT' && post.lifecycleState !== 'PROCESSING')
    .map(post => normalize(post, previousById.get(post.id)))
    .filter(post => post.text || post.articleTitle)
    .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, `${JSON.stringify({
    source: 'linkedin',
    author,
    syncedAt: new Date().toISOString(),
    posts
  }, null, 2)}\n`);
  console.log(`Synced ${posts.length} LinkedIn post${posts.length === 1 ? '' : 's'}.`);
}

main().catch(error => {
  console.error(`LinkedIn sync failed: ${error.message}`);
  process.exitCode = 1;
});

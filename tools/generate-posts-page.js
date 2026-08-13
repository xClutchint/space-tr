const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pagePath = path.join(root, 'posts.html');
const cachePath = path.join(root, 'data', 'linkedin-posts.json');

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeUrl(value = '') {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch {
    return '';
  }
}

function safeMediaUrl(value = '') {
  const local = String(value).replace(/\\/g, '/').trim();
  if (/^(?:assets|brand kit)\//i.test(local) && !local.includes('..')) return local;
  return safeUrl(value);
}

function titleFrom(post) {
  if (post.title) return post.title;
  if (post.articleTitle) return post.articleTitle;
  const clean = String(post.text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return 'From Space';
  const firstSentence = clean.match(/^(.{20,110}?[.!?])(?:\s|$)/)?.[1];
  const candidate = firstSentence || clean.slice(0, 88);
  return candidate.length < clean.length && !/[.!?]$/.test(candidate) ? `${candidate.trim()}…` : candidate;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function excerptFrom(post, limit = 230) {
  const clean = String(post.text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const shortened = clean.slice(0, limit).replace(/\s+\S*$/, '').trim();
  return `${shortened}…`;
}

function renderFeaturedPost(post, index) {
  const title = escapeHtml(titleFrom(post));
  const excerpt = escapeHtml(excerptFrom(post));
  const date = formatDate(post.publishedAt);
  const topic = escapeHtml(post.label || 'From Space');
  const imageUrl = safeMediaUrl(post.imageUrl);
  return `
        <div class="featured-step" style="--stack-index:${index}">
          <article class="featured-card${imageUrl ? ' featured-card-with-image' : ''}">
            ${imageUrl ? `<img class="featured-card-image" src="${escapeHtml(imageUrl)}" alt="${title}" loading="${index === 0 ? 'eager' : 'lazy'}">` : ''}
            <div class="featured-card-shade"></div>
            <div class="featured-card-content">
              <div class="featured-card-meta"><span>${topic}</span>${date ? `<time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(date)}</time>` : ''}</div>
              <h3>${title}</h3>
              ${excerpt ? `<p>${excerpt}</p>` : ''}
            </div>
          </article>
        </div>`;
}

function renderPost(post) {
  const title = escapeHtml(titleFrom(post));
  const paragraphs = String(post.text || '')
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
  const date = formatDate(post.publishedAt);
  const year = post.publishedAt && !Number.isNaN(new Date(post.publishedAt).getTime())
    ? String(new Date(post.publishedAt).getUTCFullYear())
    : '';
  const topic = String(post.label || 'From Space');
  const linkedInUrl = safeUrl(post.linkedinUrl);
  const articleUrl = safeUrl(post.articleUrl);
  const imageUrl = safeMediaUrl(post.imageUrl);
  const primaryUrl = articleUrl || linkedInUrl;
  const image = imageUrl
    ? `${primaryUrl ? `<a class="post-image" href="${escapeHtml(primaryUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Read ${title}">` : '<div class="post-image">'}<img src="${escapeHtml(imageUrl)}" alt="${title}" loading="lazy">${primaryUrl ? '</a>' : '</div>'}`
    : '';
  return `
        <article class="post-card${imageUrl ? ' post-card-with-image' : ''}" data-post-card data-post-topic="${escapeHtml(topic)}" data-post-year="${escapeHtml(year)}">
          ${image}
          <div class="post-body">
            <div class="post-meta">
              <span class="post-label">${escapeHtml(topic)}</span>
              ${date ? `<time datetime="${escapeHtml(post.publishedAt)}">${escapeHtml(date)}</time>` : ''}
            </div>
            <h2>${title}</h2>
            ${paragraphs ? `<div class="post-copy">${paragraphs}</div>` : ''}
            ${primaryUrl ? `<a class="post-link" href="${escapeHtml(primaryUrl)}" target="_blank" rel="noopener noreferrer">Read on LinkedIn</a>` : ''}
          </div>
        </article>`;
}

function emptyState() {
  return `
        <div class="posts-empty">
          <p>Updates from Space will appear here once the LinkedIn connection is active.</p>
        </div>`;
}

function main() {
  if (!fs.existsSync(pagePath)) throw new Error('posts.html is missing.');
  let cache = { posts: [] };
  try { cache = JSON.parse(fs.readFileSync(cachePath, 'utf8')); } catch {}
  const posts = (cache.posts || []).filter(post => !post.hidden && (post.text || post.articleTitle));
  const rendered = posts.length ? posts.map(renderPost).join('') : emptyState();
  const featured = posts.length ? posts.slice(0, 6).map(renderFeaturedPost).join('') : emptyState();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Space Posts',
    url: 'https://www.space-tr.com/posts.html',
    description: 'Updates and perspectives from Space on perfume, fragrance and beauty distribution across Africa and regional retail markets.',
    blogPost: posts.map(post => ({
      '@type': 'BlogPosting',
      headline: titleFrom(post),
      datePublished: post.publishedAt || undefined,
      dateModified: post.lastModifiedAt || post.publishedAt || undefined,
      url: safeUrl(post.linkedinUrl) || 'https://www.space-tr.com/posts.html',
      author: { '@type': 'Organization', name: 'Space' },
      publisher: { '@type': 'Organization', name: 'Space', url: 'https://www.space-tr.com/' }
    }))
  };

  let page = fs.readFileSync(pagePath, 'utf8');
  page = page.replace(
    /<!-- LINKEDIN_POSTS_START -->[\s\S]*?<!-- LINKEDIN_POSTS_END -->/,
    `<!-- LINKEDIN_POSTS_START -->${rendered}\n      <!-- LINKEDIN_POSTS_END -->`
  );
  page = page.replace(
    /<!-- FEATURED_POSTS_START -->[\s\S]*?<!-- FEATURED_POSTS_END -->/,
    `<!-- FEATURED_POSTS_START -->${featured}\n        <!-- FEATURED_POSTS_END -->`
  );
  page = page.replace(
    /<!-- POSTS_JSON_LD_START -->[\s\S]*?<!-- POSTS_JSON_LD_END -->/,
    `<!-- POSTS_JSON_LD_START --><script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script><!-- POSTS_JSON_LD_END -->`
  );
  fs.writeFileSync(pagePath, page);
  console.log(`Generated posts.html with ${posts.length} cached post${posts.length === 1 ? '' : 's'}.`);
}

try { main(); } catch (error) {
  console.error(`Post page generation failed: ${error.message}`);
  process.exitCode = 1;
}

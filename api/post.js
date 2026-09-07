const { readState, readDraftState, slug: slugify } = require('./_cms');
const { verifyPreview, previewToken, loadPreviewState } = require('./_preview');

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
const origin = () => String(process.env.PUBLIC_SITE_URL || 'https://www.space-tr.com').replace(/\/+$/, '');
const absolute = (value, base) => !value ? '' : /^https:\/\//i.test(String(value)) ? value : `${base}/${String(value).replace(/^\/+/, '')}`;
const paragraphs = value => String(value || '').split(/\n\s*\n/).map(item => item.trim()).filter(Boolean).map(item => `<p>${escapeHtml(item).replace(/\n/g,'<br>')}</p>`).join('');
function dateLabel(value, language) {
  const date = new Date(`${String(value || '').slice(0,10)}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) ? String(value || '') : new Intl.DateTimeFormat(language,{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(date);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') { res.statusCode=405; res.setHeader('Allow','GET'); return res.end('Method not allowed'); }
  if (process.env.CMS_ONLY_DEPLOYMENT === '1') { res.statusCode=404; return res.end('Not found'); }
  const preview = verifyPreview(previewToken(req));
  const requested = slugify(req.query.slug || ''), requestedLanguage = req.query.language === 'fr' ? 'fr' : req.query.language === 'en' ? 'en' : '';
  const state = preview ? await loadPreviewState(req, readDraftState) : await readState(), visible = state.posts.filter(item => (preview || item.published !== false) && item.format !== 'linkedin' && item.slug === requested);
  const post = requestedLanguage ? visible.find(item => item.language === requestedLanguage) : visible.find(item => item.language === 'en') || visible[0];
  const language = post?.language === 'fr' ? 'fr' : requestedLanguage || 'en';
  if (!post) {
    const back = language === 'fr' ? 'Retour aux articles' : 'Return to the articles';
    res.statusCode=404;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('X-Robots-Tag','noindex');
    return res.end(`<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Article not found | Space</title></head><body><main><h1>Article not found</h1><p><a href="/${language}/posts.html">${back}</a></p></main></body></html>`);
  }
  const base=origin(), pageUrl=`${base}/${language}/posts/${encodeURIComponent(post.slug)}`, image=absolute(post.imageUrl,base);
  const other=language==='fr'?'en':'fr', counterpart=state.posts.find(item=>item.published!==false&&item.slug===post.slug&&item.language===other);
  const description=String(post.seoDescription||post.excerpt||post.body||'').replace(/\s+/g,' ').trim().slice(0,160), words=String(post.body||'').trim().split(/\s+/).filter(Boolean).length;
  const labels=language==='fr'?{journal:'Le journal Space',home:'Accueil',back:'Retour au journal',read:`${Math.max(1,Math.ceil(words/220))} min de lecture`}:{journal:'The Space journal',home:'Home',back:'Back to the journal',read:`${Math.max(1,Math.ceil(words/220))} min read`};
  const articleId=`${pageUrl}#article`;
  const structured={'@context':'https://schema.org','@graph':[
    {'@type':'WebPage','@id':pageUrl,url:pageUrl,name:post.title,isPartOf:{'@id':`${base}/#website`},about:{'@id':articleId},inLanguage:language},
    {'@type':'BlogPosting','@id':articleId,headline:post.title,description,inLanguage:language,datePublished:post.date,dateModified:post.updatedAt||state.updatedAt||post.date,mainEntityOfPage:{'@id':pageUrl},isPartOf:{'@type':'Blog','@id':`${base}/${language}/posts.html#blog`,url:`${base}/${language}/posts.html`},author:post.author&&post.author!=='Space Editorial Team'?{'@type':'Person','name':post.author}:{'@id':`${base}/#organization`},publisher:{'@id':`${base}/#organization`},...(image?{image:{'@type':'ImageObject',url:image,contentUrl:image,caption:post.title}}:{})},
    {'@type':'BreadcrumbList','@id':`${pageUrl}#breadcrumb`,itemListElement:[
      {'@type':'ListItem',position:1,name:language==='fr'?'Accueil':'Home',item:`${base}/${language}/`},
      {'@type':'ListItem',position:2,name:labels.journal,item:`${base}/${language}/posts.html`},
      {'@type':'ListItem',position:3,name:post.title,item:pageUrl}
    ]}
  ]};
  const alternate=counterpart?`<link rel="alternate" hreflang="${other}" href="${base}/${other}/posts/${encodeURIComponent(counterpart.slug)}">`:'';
  const socialTitle=post.seoTitle||post.title;
  const feedUrl=language==='fr'?`${base}/fr/feed.xml`:`${base}/feed.xml`;
  const html=`<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(socialTitle)} | Space</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${pageUrl}"><link rel="alternate" hreflang="${language}" href="${pageUrl}">${alternate}<link rel="alternate" hreflang="x-default" href="${base}/en/posts/${encodeURIComponent(post.slug)}"><link rel="alternate" type="application/rss+xml" title="SPACE Insights" href="${feedUrl}"><meta property="og:type" content="article"><meta property="og:site_name" content="Space"><meta property="og:title" content="${escapeHtml(socialTitle)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:url" content="${pageUrl}">${image?`<meta property="og:image" content="${escapeHtml(image)}">`:''}<meta name="twitter:card" content="${image?'summary_large_image':'summary'}"><meta name="twitter:title" content="${escapeHtml(socialTitle)}"><meta name="twitter:description" content="${escapeHtml(description)}">${image?`<meta name="twitter:image" content="${escapeHtml(image)}">`:''}<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet"><link rel="stylesheet" href="/css/pages/post-detail.css?v=2"><script type="application/ld+json">${JSON.stringify(structured).replace(/</g,'\\u003c')}</script></head><body><header class="journal-header"><a class="journal-logo" href="/${language}/" aria-label="Space home"><img src="/assets/brand/identity/space-logo-transparent.png" alt="Space"></a><nav aria-label="Journal navigation"><a href="/${language}/posts.html">${labels.journal}</a><a href="/${language}/">${labels.home}</a></nav></header><main><article class="journal-article"><header class="journal-article-header"><p class="journal-kicker">${labels.journal}</p><h1>${escapeHtml(post.title)}</h1><div class="journal-article-meta"><time datetime="${escapeHtml(post.date)}">${escapeHtml(dateLabel(post.date,language))}</time><span>${labels.read}</span></div>${post.excerpt?`<p class="journal-deck">${escapeHtml(post.excerpt)}</p>`:''}</header>${image?`<figure class="journal-article-image"><img src="${escapeHtml(image)}" alt="${escapeHtml(post.title)}"></figure>`:''}<div class="journal-article-body">${paragraphs(post.body)}</div><footer class="journal-article-footer"><a href="/${language}/posts.html">${labels.back}</a></footer></article></main></body></html>`;
  res.statusCode=200;res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control',preview?'private, no-store':'public, max-age=0, s-maxage=60, stale-while-revalidate=300');if(preview)res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');res.end(html);
};

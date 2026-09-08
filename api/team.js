const { readState, readDraftState, slug: slugify } = require('./_cms');
const { verifyPreview, previewToken, loadPreviewState } = require('./_preview');

const escapeHtml = value => String(value || '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const origin = () => String(process.env.PUBLIC_SITE_URL || 'https://www.space-tr.com').replace(/\/+$/, '');
const absolute = (value, base) => /^https:\/\//i.test(String(value || '')) ? value : `${base}/${String(value || '').replace(/^\/+/, '')}`;

module.exports = async function handler(req, res) {
  if (process.env.CMS_ONLY_DEPLOYMENT === '1') { res.statusCode = 404; return res.end('Not found'); }
  const preview = verifyPreview(previewToken(req));
  const language = req.query.language === 'fr' ? 'fr' : 'en', requested = slugify(req.query.slug || '');
  const state = preview ? await loadPreviewState(req, readDraftState) : await readState(), person = state.team.find(item => (preview || item.active !== false) && item.slug === requested);
  if (!person) {
    res.statusCode = 404; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('X-Robots-Tag', 'noindex');
    return res.end(`<!doctype html><html lang="${language}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Profile not found | Space</title><body><p><a href="/${language}/#team">${language === 'fr' ? 'Retour à l’équipe' : 'Return to the team'}</a></p></body></html>`);
  }
  const base = origin(), role = language === 'fr' && person.roleFr ? person.roleFr : person.role;
  const summary = language === 'fr' && person.summaryFr ? person.summaryFr : person.summary;
  const bio = language === 'fr' && person.bioFr?.length ? person.bioFr : person.bio;
  const pageUrl = `${base}/${language}/team/${encodeURIComponent(person.slug)}`, other = language === 'fr' ? 'en' : 'fr';
  const imagePath = /^https:\/\//i.test(String(person.imageUrl || '')) ? person.imageUrl : `/${String(person.imageUrl || '').replace(/^\/+/, '')}`;
  const image = absolute(imagePath, base);
  const personId = `${pageUrl}#person`;
  const structured = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'ProfilePage', '@id': pageUrl, url: pageUrl, name: `${person.name} | SPACE`, mainEntity: { '@id': personId }, isPartOf: { '@id': `${base}/#website` }, inLanguage: language },
    { '@type': 'Person', '@id': personId, name: person.name, jobTitle: role, description: summary || bio[0], image: { '@type': 'ImageObject', url: image, contentUrl: image, caption: person.name }, url: pageUrl, worksFor: { '@id': `${base}/#organization` }, ...(person.linkedin ? { sameAs: [person.linkedin] } : {}) }
  ] };
  const close = language === 'fr' ? 'Fermer le profil' : 'Close profile', label = language === 'fr' ? 'Profil de direction' : 'Leadership profile';
  const html = `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(person.name)} | Space</title><meta name="description" content="${escapeHtml(summary || bio[0]).slice(0,160)}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><link rel="canonical" href="${pageUrl}"><link rel="alternate" hreflang="${language}" href="${pageUrl}"><link rel="alternate" hreflang="${other}" href="${base}/${other}/team/${encodeURIComponent(person.slug)}"><link rel="alternate" hreflang="x-default" href="${base}/en/team/${encodeURIComponent(person.slug)}"><meta property="og:type" content="profile"><meta property="og:site_name" content="Space"><meta property="og:title" content="${escapeHtml(person.name)} | Space"><meta property="og:description" content="${escapeHtml(summary || bio[0])}"><meta property="og:url" content="${pageUrl}"><meta property="og:image" content="${escapeHtml(image)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escapeHtml(person.name)} | Space"><meta name="twitter:description" content="${escapeHtml(summary || bio[0])}"><meta name="twitter:image" content="${escapeHtml(image)}"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Marcellus&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet"><link rel="stylesheet" href="/css/pages/team-profile.css?v=portrait-alignment-7"><script type="application/ld+json">${JSON.stringify(structured).replace(/</g,'\\u003c')}</script></head><body style="--profile-scale:${person.profileScale};--profile-position:${escapeHtml(person.profilePosition)};--profile-edge:${escapeHtml(person.profileEdge)}"><main class="individual-team-profile"><button class="individual-profile-close" type="button" data-profile-close>${close}</button><figure><img src="${escapeHtml(imagePath)}" alt="${escapeHtml(person.name)}"></figure><article><p>${label}</p><h1>${escapeHtml(person.name)}</h1><h2>${escapeHtml(role)}</h2><div>${bio.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}</div></article></main><script>const profileImage=document.querySelector('figure img'),profileFigure=profileImage.closest('figure'),alignProfileImage=()=>profileFigure.classList.toggle('is-portrait',profileImage.naturalHeight>profileImage.naturalWidth*1.05);if(profileImage.complete)alignProfileImage();else profileImage.addEventListener('load',alignProfileImage,{once:true});document.querySelector('[data-profile-close]').addEventListener('click',()=>{const same=document.referrer&&new URL(document.referrer).origin===location.origin;if(same&&history.length>1)history.back();else location.href='/${language}/#team'});</script><script defer src="/_vercel/insights/script.js"></script></body></html>`;
  res.statusCode = 200; res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', preview ? 'private, no-store' : 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'); if (preview) res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive'); res.end(html);
};

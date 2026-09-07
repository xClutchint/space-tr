const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const pagesRoot = path.join(root, 'src', 'pages');
const publicRoot = path.join(root, 'public');
const pages = ['index.html', 'about-space.html', 'expertise.html', 'feelnzuri.html', 'careers.html', 'posts.html'];
const failures = [];

for (const language of ['en', 'fr']) {
  for (const page of pages) {
    const relative = `${language}/${page}`;
    const html = fs.readFileSync(path.join(pagesRoot, relative), 'utf8');
    const expected = `https://www.space-tr.com/${language}/${page === 'index.html' ? '' : page}`;
    const canonical = html.match(/<link rel="canonical" href="([^"]+)">/i)?.[1];
    if (canonical !== expected) failures.push(`${relative}: canonical is ${canonical || 'missing'}`);
    for (const token of ['name="description"', 'name="robots"', 'hreflang="en"', 'hreflang="fr"', 'hreflang="x-default"', 'property="og:title"', 'property="og:description"', 'property="og:url"', 'name="twitter:card"']) {
      if (!html.includes(token)) failures.push(`${relative}: missing ${token}`);
    }
    const expectedFeed = language === 'fr' ? 'https://www.space-tr.com/fr/feed.xml' : 'https://www.space-tr.com/feed.xml';
    if (!html.includes(`type="application/rss+xml"`) || !html.includes(`href="${expectedFeed}"`)) failures.push(`${relative}: missing localized RSS discovery`);
    if (!html.includes('<link rel="icon" href="/favicon.png" type="image/png">')) failures.push(`${relative}: missing canonical favicon`);
    if (!html.includes('<link rel="apple-touch-icon" href="/apple-touch-icon.png">')) failures.push(`${relative}: missing touch icon`);
    if (!/<h1(?:\s|>)/i.test(html)) failures.push(`${relative}: missing h1`);
    for (const [index, match] of [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].entries()) {
      try { JSON.parse(match[1]); } catch (error) { failures.push(`${relative}: invalid JSON-LD ${index + 1}: ${error.message}`); }
    }
  }
}

const robots = fs.readFileSync(path.join(publicRoot, 'robots.txt'), 'utf8');
for (const agent of ['OAI-SearchBot', 'ChatGPT-User', 'GPTBot', 'Claude-SearchBot', 'Claude-User', 'ClaudeBot']) {
  if (!robots.includes(`User-agent: ${agent}`)) failures.push(`robots.txt: missing ${agent}`);
}
for (const agent of ['Google-Extended', 'PerplexityBot']) {
  if (!robots.includes(`User-agent: ${agent}`)) failures.push(`robots.txt: missing ${agent}`);
}
for (const agent of ['CCBot', 'Applebot-Extended', 'Amazonbot', 'Meta-ExternalAgent']) {
  if (!robots.includes(`User-agent: ${agent}`)) failures.push(`robots.txt: missing ${agent}`);
}
for (const language of ['en', 'fr']) {
  const homepage = fs.readFileSync(path.join(pagesRoot, language, 'index.html'), 'utf8');
  if (!homepage.includes('https://www.space-tr.com/#brand-portfolio') || !homepage.includes('"@type":"ItemList"')) failures.push(`${language}/index.html: missing machine-readable brand portfolio`);
  if (/display\s*:\s*none[^<]{0,300}(?:Space|brand)/i.test(homepage)) failures.push(`${language}/index.html: hidden SEO copy is not allowed`);
}
if (!robots.includes('Sitemap: https://www.space-tr.com/sitemap.xml')) failures.push('robots.txt: missing canonical sitemap');
if (!fs.existsSync(path.join(publicRoot, 'llms.txt'))) failures.push('llms.txt: missing');
const favicon = fs.readFileSync(path.join(publicRoot, 'favicon.png'));
if (!favicon.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) failures.push('favicon.png: invalid PNG signature');
if (!fs.existsSync(path.join(publicRoot, 'apple-touch-icon.png'))) failures.push('apple-touch-icon.png: missing');
const llms = fs.readFileSync(path.join(publicRoot, 'llms.txt'), 'utf8');
for (const url of ['/llms-full.txt', '/company.json', '/feed.xml']) {
  if (!llms.includes(url)) failures.push(`llms.txt: missing ${url}`);
}
for (const endpoint of ['api/company.js', 'api/feed.js', 'api/llms-full.js']) {
  if (!fs.existsSync(path.join(root, endpoint))) failures.push(`${endpoint}: missing`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
console.log(`SEO markup validated across ${pages.length * 2} localized pages.`);

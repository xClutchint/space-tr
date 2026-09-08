const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '../..');
const PAGE_ROOT = path.join(ROOT, 'src', 'pages');
const ORIGIN = 'https://www.space-tr.com';

const pages = [
  {
    file: 'index.html', slug: '',
    en: {
      title: 'Space | International Fragrance Distributor in Africa',
      description: 'Space is a specialist B2B fragrance distributor connecting international perfume houses with retailers across Africa.'
    },
    fr: {
      title: 'Space | Distributeur international de parfums en Afrique',
      description: 'Space est un distributeur B2B spécialisé en parfumerie, reliant les maisons internationales aux détaillants en Afrique.'
    }
  },
  {
    file: 'about-space.html', slug: 'about-space.html',
    en: {
      title: 'About Space | Perfume & Beauty Distributor in Africa',
      description: 'Discover Space, a fast-growing fragrance and beauty distribution partner with people and retail relationships across African markets.'
    },
    fr: {
      title: 'À propos de Space | Distribution de parfums en Afrique',
      description: 'Découvrez Space, partenaire en forte croissance pour la distribution de parfums et de produits de beauté sur les marchés africains.'
    }
  },
  {
    file: 'expertise.html', slug: 'expertise.html',
    en: {
      title: 'Perfume Distribution in Africa | Space Expertise',
      description: 'Space provides selective perfume distribution, market entry, travel retail, brand management and logistics across African markets.'
    },
    fr: {
      title: 'Distribution de parfums en Afrique | Expertise Space',
      description: 'Space accompagne les marques en distribution, entrée sur le marché, travel retail, gestion de marque et logistique sur les marchés africains.'
    }
  },
  {
    file: 'feelnzuri.html', slug: 'feelnzuri.html',
    en: {
      title: 'FeelNzuri | Niche Fragrance Lounge by Space',
      description: 'Discover FeelNzuri, a refined niche fragrance lounge in Nairobi combining guided perfume discovery with African hospitality.'
    },
    fr: {
      title: 'FeelNzuri | Salon de parfumerie de niche à Nairobi',
      description: 'Découvrez FeelNzuri, un salon de parfumerie de niche à Nairobi qui associe découverte olfactive guidée et hospitalité africaine.'
    }
  },
  {
    file: 'posts.html', slug: 'posts.html',
    en: {
      title: 'Perfume & Beauty Distribution Insights | Space',
      description: 'Read ideas, observations and company updates from Space across fragrance, beauty and regional distribution.'
    },
    fr: {
      title: 'Actualités de la distribution de parfums | Space',
      description: 'Retrouvez les idées, analyses et actualités de Space dans les univers de la parfumerie, de la beauté et de la distribution régionale.',
      hiddenHeading: 'Publications de Space sur la distribution de parfums et de produits de beauté'
    }
  },
  {
    file: 'careers.html', slug: 'careers.html',
    en: {
      title: 'Careers at Space | Fragrance & Beauty Distribution',
      description: 'Explore current career opportunities across the Space distribution business.'
    },
    fr: {
      title: 'Carrières chez Space | Activités de distribution',
      description: 'Découvrez les postes à pourvoir et les opportunités de carrière au sein des activités de distribution de Space.'
    }
  }
];

const localizedRoutes = new Map(pages.map(page => [page.file, page.slug]));
const localeUrl = (language, slug) => `${ORIGIN}/${language}/${slug}`;

function portfolioNames() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'assets/media/runtime/brand-taxonomy.js'), 'utf8'), sandbox);
  return (sandbox.window.SPACE_BRAND_TAXONOMY?.featuredLogos || []).map(item => item.name).filter(Boolean);
}
const PORTFOLIO_NAMES = portfolioNames();

function addPortfolioSchema(html, language) {
  return html.replace(/<script type="application\/ld\+json">\s*(\{"@context":"https:\/\/schema\.org","@graph":\[[\s\S]*?\]\})\s*<\/script>/, (whole, payload) => {
    let schema;
    try { schema = JSON.parse(payload); } catch { return whole; }
    if (!Array.isArray(schema['@graph']) || schema['@graph'].some(item => item['@id'] === `${ORIGIN}/#brand-portfolio`)) return whole;
    schema['@graph'].push({
      '@type': 'ItemList',
      '@id': `${ORIGIN}/#brand-portfolio`,
      name: language === 'fr' ? 'Marques présentées dans le portefeuille Space' : 'Brands presented in the Space portfolio',
      description: language === 'fr'
        ? 'Marques présentées par Space. La nature de chaque relation et les territoires représentés peuvent varier.'
        : 'Brands presented by Space. The nature of each relationship and represented territories may vary.',
      numberOfItems: PORTFOLIO_NAMES.length,
      itemListElement: PORTFOLIO_NAMES.map((name, index) => ({ '@type': 'ListItem', position: index + 1, item: { '@type': 'Brand', name } }))
    });
    return `<script type="application/ld+json">\n  ${JSON.stringify(schema).replace(/</g, '\\u003c')}\n  </script>`;
  });
}

const copyDefinitions = {
  'index.html': { script: 'js/pages/home.js', marker: 'const localeCopy=', group: 'fr', attributes: ['data-i18n', 'data-i18n-html'] },
  'about-space.html': { script: 'js/pages/about.js', marker: 'const aboutCopy =', group: 'fr', attributes: ['data-i18n'] },
  'expertise.html': { script: 'js/pages/expertise.js', marker: 'const expertiseCopy=', overrideMarker: 'const expertiseCopyOverrides=', group: 'fr', attributes: ['data-i18n'] },
  'feelnzuri.html': { script: 'js/pages/regional-profile.js', marker: 'const translations =', group: ['feelnzuri', 'fr'], attributes: ['data-i18n'] },
  'posts.html': { script: 'js/pages/posts.js', marker: 'const copy =', group: 'fr', attributes: ['data-copy'] },
  'careers.html': { script: 'js/pages/careers.js', marker: 'const careerCopy =', group: 'fr', attributes: ['data-i18n'] }
};

function escapeAttribute(value) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function extractObject(script, marker) {
  const source = fs.readFileSync(path.join(ROOT, script), 'utf8');
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Unable to find ${marker} in ${script}`);
  const start = source.indexOf('{', markerIndex + marker.length);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') { quote = character; continue; }
    if (character === '{') depth += 1;
    else if (character === '}' && --depth === 0) return vm.runInNewContext(`(${source.slice(start, index + 1)})`);
  }
  throw new Error(`Unterminated copy object in ${script}`);
}

function copyForPage(file) {
  const definition = copyDefinitions[file];
  const rootCopy = extractObject(definition.script, definition.marker);
  if (definition.overrideMarker) {
    const overrides = extractObject(definition.script, definition.overrideMarker);
    for (const [key, value] of Object.entries(overrides)) {
      if (value && typeof value === 'object') Object.assign(rootCopy[key] || (rootCopy[key] = {}), value);
    }
  }
  const pathParts = Array.isArray(definition.group) ? definition.group : [definition.group];
  return { definition, copy: pathParts.reduce((value, key) => value?.[key], rootCopy) || {} };
}

function escapeText(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function applyStaticFrenchCopy(html, file) {
  const { definition, copy } = copyForPage(file);
  for (const attribute of definition.attributes) {
    const pattern = new RegExp(`<([a-z][\\w-]*)([^>]*\\s${attribute}="([^"]+)"[^>]*)>([\\s\\S]*?)<\\/\\1>`, 'gi');
    html = html.replace(pattern, (whole, tag, attributes, key) => {
      const value = copy[key];
      if (typeof value !== 'string') return whole;
      const translated = attribute === 'data-i18n-html' ? value : escapeText(value);
      return `<${tag}${attributes}>${translated}</${tag}>`;
    });
  }
  return html;
}

function rewritePageLinks(html, language) {
  return html.replace(/href="([^"]+)"/g, (whole, href) => {
    if (/^(?:https?:|mailto:|tel:|#|\/)/i.test(href)) return whole;
    const [target, fragment = ''] = href.split('#');
    if (!localizedRoutes.has(target)) return whole;
    const slug = localizedRoutes.get(target);
    return `href="/${language}/${slug}${fragment ? `#${fragment}` : ''}"`;
  });
}

function localize(source, page, language) {
  const meta = page[language];
  const canonical = localeUrl(language, page.slug);
  const alternateEn = localeUrl('en', page.slug);
  const alternateFr = localeUrl('fr', page.slug);
  const feedUrl = language === 'fr' ? `${ORIGIN}/fr/feed.xml` : `${ORIGIN}/feed.xml`;
  let html = source
    .replace(/\s*<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]+">/gi, '')
    .replace(/<html\s+lang="[^"]+">/i, `<html lang="${language}">`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${meta.title.replace(/&/g, '&amp;')}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*">/i, `<meta name="description" content="${escapeAttribute(meta.description)}">`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]+">/i,
      `<link rel="canonical" href="${canonical}">\n  <link rel="alternate" hreflang="en" href="${alternateEn}">\n  <link rel="alternate" hreflang="fr" href="${alternateFr}">\n  <link rel="alternate" hreflang="x-default" href="${alternateEn}">\n  <link rel="alternate" type="application/rss+xml" title="SPACE Insights" href="${feedUrl}">`)
    .replace(/<meta\s+property="og:url"\s+content="[^"]+">/i, `<meta property="og:url" content="${canonical}">`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]+">/i, `<meta property="og:title" content="${escapeAttribute(meta.title)}">`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]+">/i, `<meta property="og:description" content="${escapeAttribute(meta.description)}">`)
    .replace(/<meta\s+property="og:locale"\s+content="[^"]+">/i, `<meta property="og:locale" content="${language === 'fr' ? 'fr_FR' : 'en_GB'}">`)
    .replace(/<meta\s+property="og:locale:alternate"\s+content="[^"]+">/i, `<meta property="og:locale:alternate" content="${language === 'fr' ? 'en_GB' : 'fr_FR'}">`)
    .replace(/<meta\s+name="twitter:title"\s+content="[^"]+">/i, `<meta name="twitter:title" content="${escapeAttribute(meta.title)}">`)
    .replace(/<meta\s+name="twitter:description"\s+content="[^"]+">/i, `<meta name="twitter:description" content="${escapeAttribute(meta.description)}">`)
    .replace(/(<meta\s+name="viewport"[^>]*>)/i, `$1\n  <link rel="icon" href="/favicon.png" type="image/png">\n  <link rel="apple-touch-icon" href="/apple-touch-icon.png">\n  <base href="/">\n  <script src="/js/shared/locale-routing.js"></script>`);
  html = rewritePageLinks(html, language);
  if (language === 'fr') html = applyStaticFrenchCopy(html, page.file);
  if (page.file === 'about-space.html') {
    const aboutPageName = language === 'fr' ? 'À propos de Space' : 'About Space';
    const aboutPageIdentity = `"@type":"AboutPage","name":${JSON.stringify(aboutPageName)},"url":${JSON.stringify(canonical)},"description":${JSON.stringify(meta.description)}`;
    html = html.replace(/"@type":"AboutPage","name":"[^"]*","url":"[^"]*","description":"[^"]*"/, aboutPageIdentity);
  }
  if (page.file === 'index.html') {
    html = html
      .replace(/"@id":"https:\/\/www\.space-tr\.com\/en\/#webpage"/, `"@id":${JSON.stringify(`${canonical}#webpage`)}`)
      .replace(/"url":"https:\/\/www\.space-tr\.com\/en\/","name":"[^"]+"/, `"url":${JSON.stringify(canonical)},"name":${JSON.stringify(meta.title)}`)
      .replace(/"inLanguage":"en"/, `"inLanguage":${JSON.stringify(language)}`);
    html = addPortfolioSchema(html, language);
  }
  if (page.file === 'expertise.html') {
    html = html
      .replace(/"url":"https:\/\/www\.space-tr\.com\/expertise\.html"/, `"url":${JSON.stringify(canonical)}`)
      .replace(/"provider":\{"@type":"Organization","name":"Space","alternateName":"Space TR","url":"https:\/\/www\.space-tr\.com\/"\}/, `"provider":{"@id":"https://www.space-tr.com/#organization"}`)
      .replace(/"areaServed":"Africa"/, `"areaServed":{"@type":"Place","name":"Africa"},"inLanguage":${JSON.stringify(language)}`);
  }
  if (page.file === 'feelnzuri.html') {
    html = html
      .replace(/"url":"https:\/\/www\.space-tr\.com\/feelnzuri\.html"/, `"url":${JSON.stringify(canonical)}`)
      .replace(/"parentOrganization":\{"@type":"Organization","name":"Space","url":"https:\/\/www\.space-tr\.com\/"\}/, `"parentOrganization":{"@id":"https://www.space-tr.com/#organization"}`)
      .replace(/"addressCountry":"KE"\}\}/, `"addressCountry":"KE"},"inLanguage":${JSON.stringify(language)}}`);
  }
  if (page.file === 'posts.html') {
    const blogSchema = {
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: language === 'fr' ? 'Publications Space' : 'Space Posts',
      url: canonical,
      description: meta.description,
      inLanguage: language,
      publisher: { '@id': `${ORIGIN}/#organization` }
    };
    html = html.replace(
      /<script type="application\/ld\+json">\{"@context":"https:\/\/schema\.org","@type":"Blog"[\s\S]*?<\/script>/,
      `<script type="application/ld+json">${JSON.stringify(blogSchema).replace(/</g, '\\u003c')}</script>`
    );
  }
  if (page.file === 'careers.html') {
    html = html
      .replace(/"name":"Careers at Space","url":"https:\/\/www\.space-tr\.com\/en\/careers\.html","description":"[^"]+"/, `"name":${JSON.stringify(meta.title)},"url":${JSON.stringify(canonical)},"description":${JSON.stringify(meta.description)}`)
      .replace(/"inLanguage":"en"/, `"inLanguage":${JSON.stringify(language)}`);
  }
  if (meta.hiddenHeading) html = html.replace(/(<h1\s+class="visually-hidden">)[\s\S]*?(<\/h1>)/i, `$1${escapeText(meta.hiddenHeading)}$2`);
  return html;
}

function generateLocalizedPages(destinationRoot = PAGE_ROOT) {
  for (const language of ['en', 'fr']) {
    const directory = path.join(destinationRoot, language);
    fs.rmSync(directory, { recursive: true, force: true });
    fs.mkdirSync(directory, { recursive: true });
    for (const page of pages) {
      const source = fs.readFileSync(path.join(PAGE_ROOT, page.file), 'utf8');
      const outputName = page.slug || 'index.html';
      fs.writeFileSync(path.join(directory, outputName), localize(source, page, language));
    }
  }
  return pages.length * 2;
}

if (require.main === module) {
  const count = generateLocalizedPages();
  console.log(`Localized pages generated: ${count}`);
}

module.exports = { generateLocalizedPages, pages };

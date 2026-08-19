const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const ORIGIN = 'https://www.space-tr.com';

const pages = [
  {
    file: 'index.html', slug: '',
    en: {
      title: 'Perfume & Beauty Distributor in Africa | Space',
      description: 'Space is a specialist B2B perfume, fragrance and beauty distributor connecting international brands with retailers across Africa and the Indian Subcontinent.'
    },
    fr: {
      title: 'Distributeur de parfums et beauté en Afrique | Space',
      description: 'Space est un distributeur B2B spécialisé en parfumerie et beauté, reliant les marques internationales aux détaillants en Afrique et dans le sous-continent indien.'
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
      description: 'Space provides perfume and beauty wholesale distribution, market entry, travel retail, brand management and logistics across Africa and the Indian Subcontinent.'
    },
    fr: {
      title: 'Distribution de parfums en Afrique | Expertise Space',
      description: 'Space accompagne les marques en distribution, entrée sur le marché, travel retail, gestion de marque et logistique en Afrique et dans le sous-continent indien.'
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
    file: 'space-x-maven.html', slug: 'space-x-maven.html',
    en: {
      title: 'Space × Maven | East Africa Fragrance Distribution',
      description: 'Maven is Space’s Nairobi-based subsidiary for luxury fragrance and beauty distribution across East Africa.'
    },
    fr: {
      title: 'Space × Maven | Distribution de parfums en Afrique de l’Est',
      description: 'Maven est la filiale de Space basée à Nairobi pour la distribution de parfums et de produits de beauté en Afrique de l’Est.'
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

const copyDefinitions = {
  'index.html': { script: 'js/main.js', marker: 'const localeCopy=', group: 'fr', attributes: ['data-i18n', 'data-i18n-html'] },
  'about-space.html': { script: 'js/about.js', marker: 'const aboutCopy =', group: 'fr', attributes: ['data-i18n'] },
  'expertise.html': { script: 'js/expertise.js', marker: 'const expertiseCopy=', group: 'fr', attributes: ['data-i18n'] },
  'feelnzuri.html': { script: 'js/regional-profile.js', marker: 'const translations =', group: ['feelnzuri', 'fr'], attributes: ['data-i18n'] },
  'space-x-maven.html': { script: 'js/regional-profile.js', marker: 'const translations =', group: ['maven', 'fr'], attributes: ['data-i18n'] },
  'posts.html': { script: 'js/posts.js', marker: 'const copy =', group: 'fr', attributes: ['data-copy'] },
  'careers.html': { script: 'js/careers.js', marker: 'const careerCopy =', group: 'fr', attributes: ['data-i18n'] }
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
  let html = source
    .replace(/\s*<link\s+rel="alternate"\s+hreflang="[^"]+"\s+href="[^"]+">/gi, '')
    .replace(/<html\s+lang="[^"]+">/i, `<html lang="${language}">`)
    .replace(/<title>[\s\S]*?<\/title>/i, `<title>${meta.title.replace(/&/g, '&amp;')}</title>`)
    .replace(/<meta\s+name="description"\s+content="[^"]*">/i, `<meta name="description" content="${escapeAttribute(meta.description)}">`)
    .replace(/<link\s+rel="canonical"\s+href="[^"]+">/i,
      `<link rel="canonical" href="${canonical}">\n  <link rel="alternate" hreflang="en" href="${alternateEn}">\n  <link rel="alternate" hreflang="fr" href="${alternateFr}">\n  <link rel="alternate" hreflang="x-default" href="${alternateEn}">`)
    .replace(/<meta\s+property="og:url"\s+content="[^"]+">/i, `<meta property="og:url" content="${canonical}">`)
    .replace(/<meta\s+property="og:title"\s+content="[^"]+">/i, `<meta property="og:title" content="${escapeAttribute(meta.title)}">`)
    .replace(/<meta\s+property="og:description"\s+content="[^"]+">/i, `<meta property="og:description" content="${escapeAttribute(meta.description)}">`)
    .replace(/(<meta\s+name="viewport"[^>]*>)/i, `$1\n  <base href="/">\n  <script src="/js/locale-routing.js"></script>`);
  html = rewritePageLinks(html, language);
  if (language === 'fr') html = applyStaticFrenchCopy(html, page.file);
  if (meta.hiddenHeading) html = html.replace(/(<h1\s+class="visually-hidden">)[\s\S]*?(<\/h1>)/i, `$1${escapeText(meta.hiddenHeading)}$2`);
  return html;
}

function generateLocalizedPages(destinationRoot = ROOT) {
  for (const language of ['en', 'fr']) {
    const directory = path.join(destinationRoot, language);
    fs.rmSync(directory, { recursive: true, force: true });
    fs.mkdirSync(directory, { recursive: true });
    for (const page of pages) {
      const source = fs.readFileSync(path.join(ROOT, page.file), 'utf8');
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

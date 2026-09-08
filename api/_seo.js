const { readState, publicState } = require('./_cms');

const MARKETS = [
  'Morocco', 'Tunisia', 'Senegal', 'Ivory Coast', 'Togo', 'Benin',
  'Burkina Faso', 'Nigeria', 'Angola', 'Democratic Republic of the Congo',
  'Republic of the Congo', 'Kenya', 'Uganda', 'Tanzania', 'Ethiopia',
  'Djibouti', 'Burundi', 'Mozambique', 'Zambia', 'Zimbabwe', 'Western Sahara'
];

const CAPABILITIES = [
  'Market strategy', 'Sales and distribution', 'Travel retail',
  'Brand stewardship', 'Marketing and activation', 'Retail excellence and training',
  'Demand planning', 'Warehousing', 'Fulfilment', 'Cross-border logistics'
];

const origin = () => String(process.env.PUBLIC_SITE_URL || 'https://www.space-tr.com').replace(/\/+$/, '');
const escapeXml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;'
})[character]);
const absolute = (value, base = origin()) => !value ? '' : /^https:\/\//i.test(String(value))
  ? String(value)
  : `${base}/${String(value).replace(/^\/+/, '')}`;

async function publishedState() {
  return publicState(await readState());
}

function companyGraph(state) {
  const base = origin();
  const brands = (state.brands || []).filter(brand => brand.active !== false);
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${base}/#organization`,
        name: 'SPACE-TR',
        alternateName: ['SPACE', 'Space TR'],
        url: `${base}/`,
        logo: {
          '@type': 'ImageObject',
          '@id': `${base}/#logo`,
          url: `${base}/favicon.png`,
          contentUrl: `${base}/favicon.png`,
          caption: 'SPACE-TR'
        },
        image: `${base}/assets/brand/campaigns/campaign-hero-static.avif`,
        email: 'info@space-tr.com',
        foundingDate: '2018',
        description: 'SPACE-TR, also known as SPACE, is a specialist B2B fragrance distributor connecting international perfume houses with retailers and consumers across African markets.',
        sameAs: ['https://www.linkedin.com/company/spaceglobalbrandslocalreach/'],
        areaServed: MARKETS.map(name => ({ '@type': 'Country', name })),
        knowsAbout: CAPABILITIES
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#website`,
        url: `${base}/`,
        name: 'SPACE-TR',
        alternateName: 'SPACE',
        publisher: { '@id': `${base}/#organization` },
        inLanguage: ['en', 'fr']
      },
      {
        '@type': 'ItemList',
        '@id': `${base}/#brand-portfolio`,
        name: 'Brands presented in the SPACE portfolio',
        description: 'Brands currently presented in the public SPACE portfolio. The nature of each relationship and represented territories may vary.',
        numberOfItems: brands.length,
        itemListElement: brands.map((brand, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: { '@type': 'Brand', name: brand.name }
        }))
      }
    ]
  };
}

module.exports = { MARKETS, CAPABILITIES, origin, escapeXml, absolute, publishedState, companyGraph };

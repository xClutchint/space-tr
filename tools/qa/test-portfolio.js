const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const existsWithContent = relativePath => {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath) && fs.statSync(absolutePath).size > 0;
};

const context = { window: {} };
vm.runInNewContext(read('assets/media/runtime/brand-taxonomy.js'), context);
const taxonomy = context.window.SPACE_BRAND_TAXONOMY;

assert.ok(taxonomy, 'The portfolio taxonomy must initialize.');
assert.deepEqual(
  [taxonomy.niche.length, taxonomy.premium.length, taxonomy.mass.length],
  [28, 20, 16],
  'The supplied portfolio should contain 28 niche, 20 premium, and 16 mass-market brands.',
);
assert.equal(taxonomy.ordered.length, 64, 'The complete internal taxonomy should retain 64 named brands.');
assert.equal(taxonomy.logos.length, 50, 'The complete mapped-logo archive should contain 50 brands.');
assert.equal(taxonomy.featuredLogos.length, 41, 'The homepage should feature exactly 41 brands.');
assert.equal(taxonomy.featuredLogos.filter(record => record.category === 'niche').length, 28, 'All 28 niche brands should remain featured.');
assert.equal(taxonomy.featuredLogos.filter(record => record.category === 'premium').length, 13, 'The featured wall should contain 13 designer brands.');
assert.ok(taxonomy.featuredLogos.some(record => record.name === 'Versace'), 'Versace must be included in the featured wall.');
assert.ok(taxonomy.featuredLogos.some(record => record.name === 'Chloe'), 'Chloe must be included in the featured wall.');
assert.ok(taxonomy.featuredLogos.some(record => record.name === 'Michael Kors'), 'Michael Kors must be included in the featured wall.');
const expectedFeaturedOrder = [
  'Parfums de Marly','Roja','Xerjoff','Spirit of Dubai','Bond No. 9','Tiziana Terenzi','Sospiro',
  'Nishane','Matiere Premiere','Casamorati','Atelier des Ors','Oman Luxury','THOO','Ormonde Jayne',
  'Brunello Cucinelli','Giorgio Armani Beauty','Gucci','Yves Saint Laurent','Prada','Valentino','Lancome',
  'Chloe','Burberry','Versace','Ralph Lauren','Boss','Marc Jacobs','Michael Kors',
  'Goldfield & Banks','Escentric Molecules','Essential Parfums','Born to Stand Out','Atkinsons','Montale Paris','Mancera Paris',
  'Akro','The Merchant of Venice','Spirit of Kings','New Notes','Ramon Bejar','Maison Noir',
];
assert.deepEqual(Array.from(taxonomy.featuredLogos, record => record.name), expectedFeaturedOrder, 'The homepage portfolio must retain the approved luxury-first hierarchy.');
assert.equal(new Set(taxonomy.ordered).size, 64, 'Portfolio names must be unique.');
assert.equal(new Set(taxonomy.logos.map(record => record.logoNumber)).size, 50, 'Logo mappings must be unique.');
const correctedLogoNumbers = new Map([
  ['Gucci', 39], ['Lancome', 11], ['Prada', 9], ['Valentino', 10],
  ['Ralph Lauren', 12], ['Goldfield & Banks', 16]
]);
for (const [name, logoNumber] of correctedLogoNumbers) {
  assert.equal(taxonomy.logos.find(record => record.name === name)?.logoNumber, logoNumber, `${name} must use the logo file that visibly belongs to it.`);
}
assert.equal(taxonomy.canonicalize('JWAHARA'), 'Jawhara', 'The supplied spelling must resolve to official Jawhara.');
const additions = taxonomy.logos.filter(record => record.logoNumber >= 41 && record.logoNumber <= 54);
assert.equal(additions.length, 14, 'Exactly fourteen missing niche brands should be added.');
assert.ok(additions.every(record => record.category === 'niche' && record.logoNumber <= 54), 'No premium or mass-market addition may enter the wall.');

for (const record of taxonomy.logos) {
  const prefix = `assets/brand/portfolio/logos/brand-${String(record.logoNumber).padStart(2, '0')}`;
  assert.ok(existsWithContent(`${prefix}.avif`), `${record.name} is missing its portfolio tile.`);
  assert.ok(existsWithContent(`${prefix}-mark.png`), `${record.name} is missing its stage logo.`);
}

const css = read('css/pages/home.css');
const responsiveCss = read('css/shared/responsive.css');
const profileCss = read('css/pages/regional-profile.css');
const homepageScript = read('js/pages/home.js');
const africaMapScript = read('js/shared/africa-map.js');
assert.match(css, /regions\/presence\/africa-victoria-falls\.webp/, 'The Africa presence panel must use the approved continental image.');
assert.match(css, /regions\/offices\/nice\.webp/, 'The Nice office must use the supplied Nice photo.');
assert.match(css, /grid-template-columns:repeat\(7,minmax\(0,1fr\)\)[\s\S]*grid-template-rows:repeat\(6,minmax\(0,1fr\)\)/, 'The desktop wall must provide a seven-by-six grid.');
assert.match(css, /\.homepage-brand-wall \.brand-wall-discovery\{[\s\S]*grid-column:auto/, 'The desktop discovery panel must occupy one balanced grid cell.');
assert.match(responsiveCss, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important;grid-template-rows:none!important;height:auto!important/, 'The mobile wall must create rows automatically without clipping brands.');
assert.match(responsiveCss, /\.homepage-brand-wall \.brand-wall-discovery\{\s*grid-column:auto!important/, 'The mobile discovery panel must complete the final grid row.');
assert.match(css, /inset:0 60% 0 0/, 'The desktop campaign stage must occupy 40% of the wall.');
assert.match(css, /width:60%[\s\S]*margin-left:40%/, 'The desktop portfolio grid must use the remaining 60%.');
assert.ok(existsWithContent('assets/editorial/regions/presence/africa-victoria-falls.webp'), 'The Africa presence image is missing.');
assert.ok(existsWithContent('assets/editorial/regions/offices/nice.webp'), 'The Nice office image is missing.');

const nicheStageFiles = [
  'matiere-premiere.webp', 'escentric-molecules.webp', 'oman-luxury.webp', 'atkinsons.webp',
  'brunello-cucinelli.webp', 'akro.webp', 'thoo.webp', 'essential-parfums.webp',
  'born-to-stand-out.webp', 'new-notes.webp', 'sospiro.webp', 'spirit-of-dubai.webp',
  'spirit-of-kings.webp', 'maison-noir.webp',
];
for (const file of nicheStageFiles) {
  assert.ok(existsWithContent(`assets/editorial/brands/${file}`), `${file} is missing from the niche hover stage.`);
  assert.ok(homepageScript.includes(`assets/editorial/brands/${file}`), `${file} is not registered in the portfolio interaction.`);
}
const refreshedStageFiles = [
  'spirit-of-dubai.webp', 'bond-no-9.webp', 'thoo.webp', 'giorgio-armani-beauty.webp',
  'gucci.webp', 'yves-saint-laurent.webp', 'prada.webp', 'valentino.webp', 'lancome.webp',
  'versace.webp', 'marc-jacobs.webp', 'montale.webp', 'mancera.webp', 'new-notes.webp', 'boss.webp',
];
for (const file of refreshedStageFiles) {
  assert.ok(existsWithContent(`assets/editorial/brands/${file}`), `${file} is missing from the refreshed hover stage.`);
  assert.ok(homepageScript.includes(`assets/editorial/brands/${file}`), `${file} is not registered in the refreshed portfolio interaction.`);
}
assert.match(homepageScript, /brandStageRevision='\d{8}-\d+'/, 'The refreshed hover-stage assets must use a cache-busting revision.');
const stageAssetBlock = homepageScript.match(/const sourcedBrandStageAssets=\{([\s\S]*?)\n  \};/);
assert.ok(stageAssetBlock, 'The named brand-stage asset map must be present.');
const stageAssets = new Map(
  [...stageAssetBlock[1].matchAll(/^\s*'([^']+)':\{src:'([^']+)'/gm)].map(match => [match[1], match[2]]),
);
for (const record of taxonomy.featuredLogos) {
  assert.ok(stageAssets.has(record.name), `${record.name} must map directly to its own hover-stage asset.`);
  assert.ok(existsWithContent(stageAssets.get(record.name)), `${record.name} points to a missing hover-stage asset.`);
}
assert.match(homepageScript, /data-brand-stage-src="\$\{stageSource\}"/, 'Each rendered logo must carry its own hover-stage asset URL.');
assert.match(homepageScript, /stageMedia\.src=source/, 'Hovering a logo must apply that tile’s own source directly.');
assert.doesNotMatch(homepageScript, /preload\.onload/, 'Brand switching must not wait on an asynchronous preload callback.');
assert.ok(existsWithContent('assets/editorial/brands/michael-kors.webp'), 'Michael Kors is missing its fragrance hover visual.');
assert.ok(homepageScript.includes('assets/editorial/brands/michael-kors.webp'), 'Michael Kors is not registered in the portfolio interaction.');

const homepage = read('src/pages/index.html');
assert.match(homepage, /js\/pages\/home\.js\?v=[a-z0-9][a-z0-9.-]*/i, 'The homepage must load its cache-busted page script.');
assert.match(homepage, /<strong>50\+<\/strong>/, 'The homepage must retain its 50+ portfolio claim.');
assert.match(homepage, /data-shuffle-number="20">20\+<\/strong>/, 'The homepage must display the 20+ market claim.');
assert.match(homepage, /class="team-title-mobile" data-i18n="teamLeadership">The team<\/span>/, 'The mobile team heading must match the desktop heading.');
assert.ok(homepageScript.includes('Tailored launches and activations for each market'), 'The requested homepage capability copy must be present.');
assert.ok(homepageScript.includes('A strategically selected network of partners'), 'The requested sales and distribution copy must be present.');
assert.ok(homepageScript.includes('End-to-end logistics management'), 'The requested logistics and supply-chain copy must be present.');
assert.ok(homepageScript.includes('From training to on-the-ground coaching'), 'The requested retail development copy must be present.');
assert.match(africaMapScript, /MARKET_IDS[^;]*'zw'[^;]*'eh'/, 'Zimbabwe and Western Sahara must be highlighted as served territories.');
assert.match(africaMapScript, /20\+ and counting/, 'The Africa map must display the 20+ and counting label.');
assert.match(africaMapScript, /zw:'zimbabwe'/, 'Zimbabwe must use its dedicated market image.');
assert.match(africaMapScript, /markets:\['mz','zm','zw'\]/, 'Zimbabwe must appear in the southern Africa rail.');
assert.ok(existsWithContent('assets/editorial/regions/markets/zimbabwe.webp'), 'The Zimbabwe market image is missing.');
assert.equal((homepage.match(/data-maven-drawer-open/g) || []).length, 0, 'The retired Maven drawer trigger must not remain.');
assert.doesNotMatch(homepage, /data-i18n="learnMore"/, 'The duplicated regional learn-more links must be removed.');
assert.match(homepage, /data-i18n="mavenBodyTwo"/, 'The homepage Maven section must include the regional operating evidence.');
assert.doesNotMatch(homepage, /href="space-x-maven\.html"/, 'The retired Maven profile route must not remain on the homepage.');
assert.doesNotMatch(homepage, /maven-drawer/, 'The retired Maven drawer markup must not remain.');
assert.doesNotMatch(homepageScript, /openMavenDrawer|closeMavenDrawer|mavenDrawerOpen/, 'The retired Maven drawer interaction must not remain.');
assert.doesNotMatch(css, /\.maven-drawer/, 'The retired Maven drawer styles must not remain.');
assert.equal(fs.existsSync(path.join(root, 'space-x-maven.html')), false, 'The retired Space × Maven page must be removed.');

const careers = read('src/pages/careers.html');
assert.match(careers, /Take away my people, but leave my factories/, 'The Andrew Carnegie quote must be restored.');
assert.match(careers, /<cite>Andrew Carnegie<\/cite>/, 'The quote must retain its attribution.');

console.log('Validated 41 featured partners, the Michael Kors campaign, the 40/60 wall split, two office photos, and the careers quote.');

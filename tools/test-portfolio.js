const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const existsWithContent = relativePath => {
  const absolutePath = path.join(root, relativePath);
  return fs.existsSync(absolutePath) && fs.statSync(absolutePath).size > 0;
};

const context = { window: {} };
vm.runInNewContext(read('assets/brand-taxonomy.js'), context);
const taxonomy = context.window.SPACE_BRAND_TAXONOMY;

assert.ok(taxonomy, 'The portfolio taxonomy must initialize.');
assert.deepEqual(
  [taxonomy.niche.length, taxonomy.premium.length, taxonomy.mass.length],
  [28, 20, 16],
  'The supplied portfolio should contain 28 niche, 20 premium, and 16 mass-market brands.',
);
assert.equal(taxonomy.ordered.length, 64, 'The complete internal taxonomy should retain 64 named brands.');
assert.equal(taxonomy.logos.length, 48, 'The wall should display the existing partners plus only the missing niche brands.');
assert.equal(new Set(taxonomy.ordered).size, 64, 'Portfolio names must be unique.');
assert.equal(new Set(taxonomy.logos.map(record => record.logoNumber)).size, 48, 'Logo mappings must be unique.');
assert.equal(taxonomy.canonicalize('JWAHARA'), 'Jawhara', 'The supplied spelling must resolve to official Jawhara.');
const additions = taxonomy.logos.filter(record => record.logoNumber >= 41);
assert.equal(additions.length, 14, 'Exactly fourteen missing niche brands should be added.');
assert.ok(additions.every(record => record.category === 'niche' && record.logoNumber <= 54), 'No premium or mass-market addition may enter the wall.');

for (const record of taxonomy.logos) {
  const prefix = `brand kit/brands/brand_${record.logoNumber}`;
  assert.ok(existsWithContent(`${prefix}.avif`), `${record.name} is missing its portfolio tile.`);
  assert.ok(existsWithContent(`${prefix}_mark.png`), `${record.name} is missing its stage logo.`);
}

const css = read('css/main.css');
const responsiveCss = read('css/responsive.css');
const homepageScript = read('js/main.js');
assert.match(css, /nairobi_photo\.webp/, 'The Nairobi office must use the supplied Nairobi photo.');
assert.match(css, /nice_photo\.webp/, 'The Nice office must use the supplied Nice photo.');
assert.match(css, /grid-template-rows:repeat\(7,minmax\(0,1fr\)\)/, 'The desktop wall must provide seven rows.');
assert.match(css, /grid-template-rows:repeat\(10,minmax\(0,1fr\)\)/, 'The tablet wall must provide ten rows.');
assert.match(responsiveCss, /grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important;grid-template-rows:none!important;height:auto!important/, 'The mobile wall must create rows automatically without clipping brands.');
assert.match(css, /inset:0 72% 0 0/, 'The desktop campaign stage must occupy 28% of the wall.');
assert.match(css, /width:72%[\s\S]*margin-left:28%/, 'The desktop portfolio grid must use the remaining 72%.');
assert.ok(existsWithContent('assets/editorial/regions/nairobi_photo.webp'), 'The Nairobi office image is missing.');
assert.ok(existsWithContent('assets/editorial/regions/nice_photo.webp'), 'The Nice office image is missing.');

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

const homepage = read('index.html');
assert.match(homepage, /<strong>40\+<\/strong>/, 'The homepage must retain its 40+ portfolio claim.');

const careers = read('careers.html');
assert.match(careers, /Take away my people, but leave my factories/, 'The Andrew Carnegie quote must be restored.');
assert.match(careers, /<cite>Andrew Carnegie<\/cite>/, 'The quote must retain its attribution.');

console.log('Validated 48 displayed partners, 14 niche campaigns, the 28/72 wall split, two office photos, and the careers quote.');

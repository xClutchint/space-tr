const { cp, mkdir, rm, copyFile } = require('node:fs/promises');
const path = require('node:path');
const { generateLocalizedPages } = require('./tools/generate-localized-pages');

const root = __dirname;
const output = path.join(root, 'dist');
const pages = [
  'index.html', 'about-space.html', 'expertise.html', 'feelnzuri.html', 'space-x-maven.html',
  'careers.html', 'career-brand-manager.html', 'career-sales-executive.html', 'career-logistics-coordinator.html',
  'posts.html', 'privacy-policy.html', 'robots.txt', '.nojekyll'
];
const assetFiles = ['brand-taxonomy.js', 'media-curation.js', 'media-curation.json', 'media-manifest.js', 'media-manifest.json', 'media-runtime.js'];

async function copy(relative) {
  const source = path.join(root, relative);
  const destination = path.join(output, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function build() {
  generateLocalizedPages();
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await Promise.all(pages.map(copy));
  await Promise.all(['css', 'js', 'cms', 'assets/_catalog', 'assets/_derivatives', 'assets/editorial'].map(relative => cp(path.join(root, relative), path.join(output, relative), { recursive: true })));
  await Promise.all(['en', 'fr'].map(relative => cp(path.join(root, relative), path.join(output, relative), { recursive: true })));
  await cp(path.join(root, 'brand kit'), path.join(output, 'brand kit'), {
    recursive: true,
    filter: source => !/Brand Guide line\.pdf$|gif_[23]\.gif$/i.test(source)
  });
  await Promise.all(assetFiles.map(file => copy(`assets/${file}`)));
  console.log(`Production bundle created at ${output}`);
}

build().catch(error => { console.error(error); process.exitCode = 1; });

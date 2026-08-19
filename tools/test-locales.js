const fs = require('node:fs');
const path = require('node:path');
const { pages } = require('./generate-localized-pages');

const root = path.resolve(__dirname, '..');
const failures = [];
const frenchBodyMarkers = {
  'index.html': 'Rapprocher les plus grandes marques mondiales',
  'about-space.html': 'Le partenaire de chaque étape',
  'expertise.html': 'Une expertise en distribution de parfumerie',
  'feelnzuri.html': 'Un salon raffiné',
  'space-x-maven.html': 'Conçue à Nairobi',
  'posts.html': 'Parcourir le journal',
  'careers.html': 'Postes à pourvoir'
};

for (const language of ['en', 'fr']) {
  for (const page of pages) {
    const filename = path.join(root, language, page.slug || 'index.html');
    if (!fs.existsSync(filename)) {
      failures.push(`missing ${language}/${page.slug || 'index.html'}`);
      continue;
    }
    const html = fs.readFileSync(filename, 'utf8');
    const expectedCanonical = `https://www.space-tr.com/${language}/${page.slug}`;
    if (!html.includes(`<html lang="${language}">`)) failures.push(`${filename}: incorrect html lang`);
    if (!html.includes(`<link rel="canonical" href="${expectedCanonical}">`)) failures.push(`${filename}: incorrect canonical`);
    if ((html.match(/hreflang=/g) || []).length !== 3) failures.push(`${filename}: expected three hreflang links`);
    if (!html.includes('/js/locale-routing.js')) failures.push(`${filename}: missing deterministic locale bootstrap`);
    if (language === 'fr' && !html.includes(frenchBodyMarkers[page.file])) failures.push(`${filename}: French body was not rendered statically`);
  }
}

console.log(JSON.stringify({ localizedPages: pages.length * 2, failures }, null, 2));
if (failures.length) process.exitCode = 1;

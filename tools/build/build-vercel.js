const { cp, mkdir, rm, copyFile, readFile, readdir, writeFile } = require('node:fs/promises');
const path = require('node:path');
const { generateLocalizedPages } = require('./generate-localized-pages');
const { generateSiteIcons } = require('./generate-site-icons');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'dist');
const pageSource = path.join(root, 'src', 'pages');
const publicSource = path.join(root, 'public');
const pages = [
  'index.html', 'about-space.html', 'expertise.html', 'feelnzuri.html',
  'careers.html', 'posts.html', 'privacy-policy.html'
];
const publicFiles = ['robots.txt', 'llms.txt', 'favicon.png', 'apple-touch-icon.png', '.nojekyll'];
const runtimeFiles = ['brand-taxonomy.js', 'media-curation.js', 'media-curation.json', 'media-runtime.js'];
const cmsEntrypoints = [
  'api/admin/[action].js', 'api/cron/editorial.js', 'api/v1/[endpoint].js', 'api/v1/[resource].js', 'api/v1/blog-drafts.js', 'api/v1/media.js', 'api/preview-state.js'
];
async function copy(relative) {
  const source = path.join(root, relative);
  const destination = path.join(output, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

async function copyFrom(base, relative, destination = relative) {
  const target = path.join(output, destination);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(path.join(base, relative), target);
}

async function collectSourceFiles(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.posix.join(directory.replaceAll('\\', '/'), entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSourceFiles(relativePath));
    } else if (/\.(?:css|js)$/i.test(entry.name)) {
      files.push(relativePath);
    }
  }

  return files;
}

async function copyPublishedDerivatives() {
  const runtimeRelative = 'assets/media/runtime/media-runtime.js';
  const runtimeSource = await readFile(path.join(root, runtimeRelative), 'utf8');
  const payload = runtimeSource.match(/^window\.SPACE_MEDIA_LIBRARY=(.*);\s*$/s);
  if (!payload) throw new Error(`Unable to parse ${runtimeRelative}`);
  const runtime = JSON.parse(payload[1]);
  const derivatives = new Set();
  for (const item of runtime.media || []) {
    for (const key of ['optimizedSrc', 'thumbnailSrc', 'mobileSrc', 'desktopSrc']) {
      if (item[key]?.startsWith('assets/media/generated/derivatives/')) derivatives.add(item[key]);
    }
  }

  const authoredFiles = pages.map(file => path.posix.join('src/pages', file));
  for (const directory of ['css', 'js']) {
    authoredFiles.push(...await collectSourceFiles(directory));
  }
  for (const relative of authoredFiles) {
    const source = await readFile(path.join(root, relative), 'utf8');
    for (const match of source.matchAll(/assets\/media\/generated\/derivatives\/[a-z-]+\/[a-f0-9]{16}\.[a-z0-9]+/g)) {
      derivatives.add(match[0]);
    }
  }

  await Promise.all([...derivatives].map(copy));
  return derivatives.size;
}

async function addVercelObservability() {
  const scripts = [];
  if (process.env.ENABLE_VERCEL_ANALYTICS === '1') scripts.push('<script defer src="/_vercel/insights/script.js"></script>');
  if (process.env.ENABLE_VERCEL_SPEED_INSIGHTS === '1') scripts.push('<script defer src="/_vercel/speed-insights/script.js"></script>');
  if (!scripts.length) return 0;
  let count = 0;
  for (const directory of ['', 'en', 'fr']) {
    const base = path.join(output, directory);
    for (const entry of await readdir(base, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
      const file = path.join(base, entry.name), source = await readFile(file, 'utf8');
      await writeFile(file, source.replace('</body>', `  ${scripts.join('\n  ')}\n</body>`), 'utf8');
      count += 1;
    }
  }
  return count;
}

async function build() {
  await Promise.all(cmsEntrypoints.map(relative => rm(path.join(root, relative), { force: true })));
  await generateSiteIcons();
  generateLocalizedPages();
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await Promise.all(pages.map(file => copyFrom(pageSource, file)));
  await Promise.all(publicFiles.map(file => copyFrom(publicSource, file)));
  await Promise.all([
    'css', 'js', 'assets/brand', 'assets/editorial'
  ].map(relative => cp(path.join(root, relative), path.join(output, relative), { recursive: true })));
  await Promise.all(['en', 'fr'].map(relative => cp(path.join(pageSource, relative), path.join(output, relative), { recursive: true })));
  await Promise.all(runtimeFiles.map(file => copy(`assets/media/runtime/${file}`)));
  const derivativeCount = await copyPublishedDerivatives();
  const instrumentedPages = await addVercelObservability();
  console.log(`Production bundle created at ${output} with ${derivativeCount} published media derivatives${instrumentedPages ? ` and ${instrumentedPages} instrumented pages` : ''}.`);
}

build().catch(error => { console.error(error); process.exitCode = 1; });

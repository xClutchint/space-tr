const { cp, mkdir, rm, copyFile, writeFile, readFile } = require('node:fs/promises');
const path = require('node:path');
const esbuild = require('esbuild');

const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'dist-cms');
const cmsEntrypoints = {
  'api/admin/[action].js': "module.exports = require('../../cms/functions/admin-entry');\n",
  'api/cron/editorial.js': "module.exports = require('../../cms/functions/editorial-cron');\n",
  'api/v1/[endpoint].js': "module.exports = require('../../cms/functions/v1-entry');\n",
  'api/preview-state.js': "module.exports = require('../cms/functions/preview-state');\n"
};

async function copy(relative) {
  const destination = path.join(output, relative);
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(path.join(root, relative), destination);
}

async function copyCmsDerivatives() {
  const runtimeSource = await readFile(path.join(root, 'assets', 'media', 'runtime', 'media-runtime.js'), 'utf8');
  const payload = runtimeSource.match(/^window\.SPACE_MEDIA_LIBRARY=(.*);\s*$/s);
  if (!payload) throw new Error('Unable to parse the CMS media runtime.');
  const runtime = JSON.parse(payload[1]), derivatives = new Set();
  for (const item of runtime.media || []) {
    for (const key of ['optimizedSrc', 'thumbnailSrc', 'mobileSrc', 'desktopSrc']) {
      if (item[key]?.startsWith('assets/media/generated/derivatives/')) derivatives.add(item[key]);
    }
  }
  const studio = await readFile(path.join(root, 'cms', 'assets', 'scripts', 'studio.js'), 'utf8');
  for (const match of studio.matchAll(/assets\/media\/generated\/derivatives\/[a-z-]+\/[a-f0-9]{16}\.[a-z0-9]+/g)) derivatives.add(match[0]);
  await Promise.all([...derivatives].map(copy));
  return derivatives.size;
}

async function build() {
  await rm(output, { recursive: true, force: true });
  await rm(path.join(root, 'api', 'v1', '[resource].js'), { force: true });
  await mkdir(output, { recursive: true });
  await Promise.all(Object.entries(cmsEntrypoints).map(async ([relative, contents]) => {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents, 'utf8');
  }));
  await Promise.all([
    copy('cms/index.html'),
    cp(path.join(root, 'cms', 'assets'), path.join(output, 'cms', 'assets'), { recursive: true }),
    cp(path.join(root, 'assets', 'brand', 'identity'), path.join(output, 'assets', 'brand', 'identity'), { recursive: true }),
    cp(path.join(root, 'assets', 'brand', 'people'), path.join(output, 'assets', 'brand', 'people'), { recursive: true }),
    cp(path.join(root, 'assets', 'brand', 'portfolio', 'logos'), path.join(output, 'assets', 'brand', 'portfolio', 'logos'), { recursive: true }),
    cp(path.join(root, 'assets', 'editorial'), path.join(output, 'assets', 'editorial'), { recursive: true }),
    cp(path.join(root, 'assets', 'media', 'runtime'), path.join(output, 'assets', 'media', 'runtime'), { recursive: true })
  ]);
  const derivativeCount = await copyCmsDerivatives();
  await esbuild.build({
    entryPoints: [path.join(root, 'cms', 'assets', 'scripts', 'blob-upload.entry.js')],
    outfile: path.join(output, 'cms', 'assets', 'scripts', 'blob-upload.js'),
    bundle: true,
    minify: true,
    platform: 'browser',
    format: 'iife',
    globalName: 'SpaceBlobClient',
    target: ['es2020']
  });
  await writeFile(path.join(output, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
  console.log(`Private CMS bundle created at ${output} with ${derivativeCount} curated media derivatives. Public site pages were not copied.`);
}

build().catch(error => { console.error(error); process.exitCode = 1; });

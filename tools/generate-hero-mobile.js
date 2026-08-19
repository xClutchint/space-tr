const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const runtimeFile = path.join(ROOT, 'assets', 'media-runtime.js');
const outputDirectory = path.join(ROOT, 'assets', '_derivatives', 'hero-mobile');

function runtimeMedia() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(runtimeFile, 'utf8'), sandbox, { filename: runtimeFile });
  return sandbox.window.SPACE_MEDIA_LIBRARY?.media || [];
}

async function generateHeroMobile() {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const items = runtimeMedia().filter(item => item.type === 'image' && item.orientation === 'vertical' && item.optimizedSrc);
  let generated = 0;

  for (const item of items) {
    const source = path.join(ROOT, item.optimizedSrc);
    const destination = path.join(outputDirectory, `${item.id}.webp`);
    if (fs.existsSync(destination) && fs.statSync(destination).mtimeMs >= fs.statSync(source).mtimeMs) continue;
    await sharp(source)
      .resize({ width: 800, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 78, smartSubsample: true })
      .toFile(destination);
    generated += 1;
  }

  console.log(`Hero mobile derivatives: ${generated} generated, ${items.length - generated} current.`);
}

if (require.main === module) generateHeroMobile().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

module.exports = { generateHeroMobile };

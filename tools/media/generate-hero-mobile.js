const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../..');
const runtimeFile = path.join(ROOT, 'assets', 'media', 'runtime', 'media-runtime.js');
const mobileOutputDirectory = path.join(ROOT, 'assets', 'media', 'generated', 'derivatives', 'hero-mobile');
const desktopOutputDirectory = path.join(ROOT, 'assets', 'media', 'generated', 'derivatives', 'hero-desktop');

function runtimeMedia() {
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(runtimeFile, 'utf8'), sandbox, { filename: runtimeFile });
  return sandbox.window.SPACE_MEDIA_LIBRARY?.media || [];
}

async function generateHeroMobile() {
  fs.mkdirSync(mobileOutputDirectory, { recursive: true });
  fs.mkdirSync(desktopOutputDirectory, { recursive: true });
  const items = runtimeMedia().filter(item => item.type === 'image' && item.orientation === 'vertical' && item.optimizedSrc);
  let generated = 0;

  for (const item of items) {
    const source = path.join(ROOT, item.optimizedSrc);
    const mobileDestination = path.join(mobileOutputDirectory, `${item.id}.webp`);
    const desktopDestination = path.join(desktopOutputDirectory, `${item.id}.avif`);
    const sourceModified = fs.statSync(source).mtimeMs;
    const mobileCurrent = fs.existsSync(mobileDestination) && fs.statSync(mobileDestination).mtimeMs >= sourceModified;
    const desktopCurrent = fs.existsSync(desktopDestination) && fs.statSync(desktopDestination).mtimeMs >= sourceModified;
    if (!mobileCurrent) {
      await sharp(source)
        .resize({ width: 900, height: 1350, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 76, smartSubsample: true })
        .toFile(mobileDestination);
    }
    if (!desktopCurrent) {
      await sharp(source)
        .resize({ width: 1440, height: 2160, fit: 'inside', withoutEnlargement: true })
        .avif({ quality: 63, effort: 3, chromaSubsampling: '4:2:0' })
        .toFile(desktopDestination);
    }
    if (!mobileCurrent || !desktopCurrent) generated += 1;
  }

  console.log(`Responsive hero derivatives: ${generated} generated or refreshed, ${items.length - generated} current.`);
}

if (require.main === module) generateHeroMobile().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

module.exports = { generateHeroMobile };

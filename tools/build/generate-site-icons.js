const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '../..');
const source = path.join(root, 'assets', 'brand', 'identity', 'space-watermark.webp');
const output = path.join(root, 'public');

async function generateSiteIcons() {
  const master = await sharp(source)
    .resize(512, 512, { fit: 'contain', background: '#ffffff' })
    .grayscale()
    .threshold(246)
    .png({ compressionLevel: 9 })
    .toBuffer();

  await Promise.all([
    sharp(master).png({ compressionLevel: 9 }).toFile(path.join(output, 'favicon.png')),
    sharp(master).resize(180, 180).png({ compressionLevel: 9 }).toFile(path.join(output, 'apple-touch-icon.png')),
  ]);
}

if (require.main === module) {
  generateSiteIcons().catch(error => { console.error(error); process.exitCode = 1; });
}

module.exports = { generateSiteIcons };

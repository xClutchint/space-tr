const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '../..');
const logoDirectory = path.join(ROOT, 'assets', 'brand', 'portfolio', 'logos');
const logoNumbers = [8, 9, 10, 11, 12, 16, 39];

async function generateLightLogoVariants() {
  for (const number of logoNumbers) {
    const stem = `brand-${String(number).padStart(2, '0')}-mark`;
    const input = path.join(logoDirectory, `${stem}.png`);
    const output = path.join(logoDirectory, `${stem}-white.png`);
    const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let index = 0; index < data.length; index += info.channels) {
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
    }
    await sharp(data, { raw: info }).png({ compressionLevel: 9 }).toFile(output);
  }
  console.log(`Generated ${logoNumbers.length} white transparent logo variants.`);
}

if (require.main === module) generateLightLogoVariants().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

module.exports = { generateLightLogoVariants };

/**
 * Fetch the official fragrance-led stage imagery used by the niche additions.
 * Images are normalized to efficient local WebP assets and a QA contact sheet.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '../..');
const destination = path.join(root, 'assets', 'editorial', 'brands');
const headers = {
  'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
};

const assets = [
  ['Matiere Premiere', 'matiere-premiere.webp', 'https://matiere-premiere.com/cdn/shop/files/Cover_Image_Horizontal.jpg?v=1748975848', '50% 50%'],
  ['Escentric Molecules', 'escentric-molecules.webp', 'https://www.escentric.com/cdn/shop/files/1350x1680_C0DE_WITHIN_E01_CHAPTER_2_NO_CODE_1.jpg?v=1784287657&width=1440', '50% 50%'],
  ['Oman Luxury', 'oman-luxury.webp', 'https://omanluxury.store/cdn/shop/files/SEO.jpg?v=1723544096', '50% 50%'],
  ['Atkinsons', 'atkinsons.webp', 'https://www.atkinsons1799.com/cdn/shop/files/atkinsons1799_Mobile_2_720x1280_47f40830-0735-4e70-a555-30daf4f8ae68.jpg?v=1781684164&width=1500', '50% 50%'],
  ['Brunello Cucinelli', 'brunello-cucinelli.webp', 'https://media.brunellocucinelli.com/brunellocucinelli-dynamic/image/upload/f_auto,q_auto,dpr_auto/v1774539898/261MQ40301010C00U_F.jpg?_i=AG', '50% 50%'],
  ['Akro', 'akro.webp', 'https://akrofragrances.com/cdn/shop/files/AK-WEBSITE-HEAT-1100-VUE1_1.jpg?v=1785533055&width=1920', '50% 50%'],
  ['THOO', 'thoo.webp', 'https://thoo.it/wp-content/uploads/The-Time-1.jpg', '50% 50%'],
  ['Essential Parfums', 'essential-parfums.webp', 'https://www.essentialparfums.com/cdn/shop/files/seo.jpg?v=1776933423', '50% 50%'],
  ['Born to Stand Out', 'born-to-stand-out.webp', 'https://borntostandout.com/cdn/shop/files/PC_bcae0fe6-d813-4b5f-a74d-f0b0429a8b6d.jpg?v=1784106926&width=1920', '50% 50%'],
  ['New Notes', 'new-notes.webp', 'https://static.wixstatic.com/media/9da3fa_ec9a3309087b486380fda7f0ef9d28d4~mv2.jpg', '50% 50%'],
  ['Sospiro', 'sospiro.webp', 'https://sospirointernational.com/cdn/shop/files/Sospiro_Website_bannere_size_943x1719_copy.webp?v=1771490276', '50% 50%'],
  ['Spirit of Dubai', 'spirit-of-dubai.webp', 'https://thespiritofdubai.com/banner/tsodroyea.jpg', '50% 50%'],
  ['Spirit of Kings', 'spirit-of-kings.webp', 'https://thespiritofkings.com/wp-content/uploads/2026/05/Spirit-of-Kings-Amara.webp', '50% 50%'],
  ['Maison Noir', 'maison-noir.webp', 'https://maison-noir.com/cdn/shop/files/075-013-001.png?v=1764165753&width=2048', '50% 50%'],
];

const xmlEscape = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
})[character]);

async function fetchImage(url) {
  const source = new URL(url);
  const referer = source.hostname === 'thoo.it' ? 'https://thoo.it/product/the-time-en/' : `${source.origin}/`;
  const response = await fetch(url, {
    headers: {
      ...headers,
      accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      referer,
      'sec-fetch-dest': 'image',
      'sec-fetch-site': 'same-origin',
    },
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function buildContactSheet() {
  const cellWidth = 220;
  const imageHeight = 390;
  const labelHeight = 42;
  const columns = 7;
  const rows = Math.ceil(assets.length / columns);
  const composites = [];

  for (let index = 0; index < assets.length; index += 1) {
    const [name, file] = assets[index];
    const image = await sharp(path.join(destination, file))
      .resize(cellWidth, imageHeight, { fit: 'cover', position: 'centre' })
      .png()
      .toBuffer();
    const label = Buffer.from(`<svg width="${cellWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0a1020"/><text x="12" y="26" fill="#fff" font-family="Arial" font-size="13">${xmlEscape(name)}</text></svg>`);
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * (imageHeight + labelHeight);
    composites.push({ input: image, left, top }, { input: label, left, top: top + imageHeight });
  }

  await sharp({
    create: {
      width: cellWidth * columns,
      height: (imageHeight + labelHeight) * rows,
      channels: 3,
      background: '#070b14',
    },
  }).composite(composites).png().toFile(path.join(root, 'qa-niche-stage-assets.png'));
}

async function main() {
  await fs.mkdir(destination, { recursive: true });
  for (const [name, file, url] of assets) {
    const payload = await fetchImage(url);
    const metadata = await sharp(payload).metadata();
    if (Math.max(metadata.width || 0, metadata.height || 0) < 1000) {
      throw new Error(`${name} source is below the 1000px quality floor.`);
    }
    await sharp(payload)
      .rotate()
      .resize({ width: 1800, height: 2200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86, effort: 5 })
      .toFile(path.join(destination, file));
  }
  await buildContactSheet();
  console.log(`Wrote ${assets.length} niche stage assets and QA contact sheet.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

/**
 * Fetch and normalize the portfolio logos that were absent from the original kit.
 * Run with `node tools/media/sync-portfolio-logos.js` after making Sharp available.
 * The script writes only the missing niche logos, brand-41 through brand-54,
 * and a QA contact sheet.
 */
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '../..');
const destination = path.join(root, 'assets', 'brand', 'portfolio', 'logos');
const headers = { 'user-agent': 'SpaceTRLogoResearch/1.0 (info@space-tr.com)' };

const logos = [
  [41, 'Matiere Premiere', 'https://matiere-premiere.com/cdn/shop/files/MP_LOGO_1.svg?v=1733497360&width=600', 'asset'],
  [42, 'Escentric Molecules', 'https://www.escentric.com/cdn/shop/files/Escentric_Molecules_Logo.svg?v=1739390439', 'asset'],
  [43, 'Oman Luxury', 'https://parfumcentral.com/cdn/shop/files/pc-brand-logo-oman-luxury-v2.png?v=1778941746&width=720', 'asset'],
  [44, 'Atkinsons', 'https://www.atkinsons1799.com/cdn/shop/files/atkinsons-1799-logo-full-footer.svg?v=1727177000&width=760', 'asset'],
  [45, 'Brunello Cucinelli', 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Brunello_Cucinelli_Logo.png', 'asset'],
  [46, 'Akro', 'https://akrofragrances.com/cdn/shop/files/AKRO_By_OC-Logo_Black-02.png?v=1690197853&width=600', 'asset'],
  [47, 'THOO', 'https://www.atelierperfumes.com/img/cms/THE%20HOUSE%20OF%20OUD/the-house-of-oud-logo-negro.jpg', 'asset'],
  [48, 'Essential Parfums', 'https://www.essentialparfums.com/', 'essential-inline'],
  [49, 'Born to Stand Out', 'https://borntostandout.com/cdn/shop/files/LOGO.png?v=1730273098&width=720', 'asset'],
  [50, 'New Notes', 'https://static.wixstatic.com/media/9da3fa_26cce7d757d247b393e4ea5eacd6afab~mv2.png', 'asset-light'],
  [51, 'Sospiro', 'https://sospirointernational.com/cdn/shop/files/sospiro_logo_7d7dc3b7-1569-4d3e-bc71-22c900a78a0c.png?v=1769417434&width=1024', 'asset'],
  [52, 'Spirit of Dubai', 'https://www.thespiritofdubai.com/img/newlogo.png', 'asset'],
  [53, 'Spirit of Kings', 'https://thespiritofkings.com/wp-content/uploads/2026/05/SK-logo.webp', 'asset'],
  [54, 'Maison Noir', 'https://maison-noir.com/cdn/shop/files/headerlogo_04128955-3915-4c8d-9bf0-8e7375f50e62.png?v=1764582632&width=974', 'asset']
];

const xmlEscape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[character]);

async function fetchSource(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText} for ${url}`);
  return { payload: Buffer.from(await response.arrayBuffer()), type: response.headers.get('content-type') || '' };
}

function extractInlineSvg(payload, kind) {
  const html = payload.toString('utf8');
  if (kind === 'essential-inline') {
    const match = html.match(/<a class="logo"[^>]*>\s*(<svg[\s\S]*?<\/svg>)/i);
    if (!match) throw new Error('Essential Parfums inline logo was not found');
    return Buffer.from(match[1]);
  }
  const match = html.match(/<symbol id="logo-lancaster"([^>]*)>([\s\S]*?)<\/symbol>/i);
  if (!match) throw new Error('Lancaster inline logo was not found');
  const attributes = match[1].replace(/viewbox=/i, 'viewBox=');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg"${attributes}>${match[2]}</svg>`);
}

async function decodedRgba(payload, kind) {
  const input = kind.endsWith('inline') ? extractInlineSvg(payload, kind) : payload;
  const { data, info } = await sharp(input, { density: 360 })
    .resize({ width: 1800, height: 1000, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function normalizeTransparency({ data, width, height }, forceDark = false) {
  const output = Buffer.from(data);
  let fullyOpaque = true;
  for (let index = 3; index < output.length; index += 4) {
    if (output[index] !== 255) { fullyOpaque = false; break; }
  }
  if (fullyOpaque) {
    const corners = [0, (width - 1) * 4, (height - 1) * width * 4, ((height * width) - 1) * 4];
    const background = [0, 1, 2].map(channel => Math.round(corners.reduce((sum, index) => sum + output[index + channel], 0) / corners.length));
    for (let index = 0; index < output.length; index += 4) {
      const distance = Math.max(Math.abs(output[index] - background[0]), Math.abs(output[index + 1] - background[1]), Math.abs(output[index + 2] - background[2]));
      output[index + 3] = Math.min(255, distance * 5);
    }
  }

  let left = width, top = height, right = -1, bottom = -1, luminance = 0, visible = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      if (output[index + 3] <= 6) continue;
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      if (output[index + 3] > 96) {
        luminance += (output[index] * 299 + output[index + 1] * 587 + output[index + 2] * 114) / 1000;
        visible += 1;
      }
    }
  }
  if (right < left || bottom < top) throw new Error('Logo became empty while removing its background');
  if (visible && (forceDark || luminance / visible > 225)) {
    for (let index = 0; index < output.length; index += 4) {
      if (output[index + 3] <= 6) continue;
      output[index] = 255 - output[index]; output[index + 1] = 255 - output[index + 1]; output[index + 2] = 255 - output[index + 2];
    }
  }
  return { data: output, width, height, extract: { left, top, width: right - left + 1, height: bottom - top + 1 } };
}

async function writeVariants(number, payload, kind) {
  const normalized = normalizeTransparency(await decodedRgba(payload, kind), kind === 'asset-light');
  const mark = await sharp(normalized.data, { raw: { width: normalized.width, height: normalized.height, channels: 4 } })
    .extract(normalized.extract)
    .resize({ width: 136, height: 68, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
  const metadata = await sharp(mark).metadata();
  await fs.writeFile(path.join(destination, `brand-${String(number).padStart(2, '0')}-mark.png`), mark);
  await sharp({ create: { width: 144, height: 144, channels: 3, background: '#ffffff' } })
    .composite([{ input: mark, left: Math.floor((144 - metadata.width) / 2), top: Math.floor((144 - metadata.height) / 2) }])
    .avif({ quality: 72, effort: 6 })
    .toFile(path.join(destination, `brand-${String(number).padStart(2, '0')}.avif`));
}

async function contactSheet() {
  const columns = 5, cellWidth = 260, cellHeight = 130;
  const rows = Math.ceil(logos.length / columns);
  const labels = logos.map(([number, name], index) => {
    const left = (index % columns) * cellWidth;
    const top = Math.floor(index / columns) * cellHeight;
    return `<rect x="${left}" y="${top}" width="${cellWidth - 1}" height="${cellHeight - 1}" fill="#fff" stroke="#c9ced6"/><text x="${left + 12}" y="${top + 116}" font-family="Arial,sans-serif" font-size="15" fill="#161a20">${xmlEscape(name)}</text>`;
  }).join('');
  const base = Buffer.from(`<svg width="${columns * cellWidth}" height="${rows * cellHeight}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eef1f5"/>${labels}</svg>`);
  const composites = [];
  for (let index = 0; index < logos.length; index += 1) {
    const [number] = logos[index];
    const input = await fs.readFile(path.join(destination, `brand_${number}_mark.png`));
    const metadata = await sharp(input).metadata();
    composites.push({ input, left: (index % columns) * cellWidth + Math.floor((cellWidth - metadata.width) / 2), top: Math.floor(index / columns) * cellHeight + 22 });
  }
  await sharp(base).composite(composites).png().toFile(path.join(root, 'qa-new-brand-logos.png'));
}

async function main() {
  await fs.mkdir(destination, { recursive: true });
  for (const [number, name, url, kind] of logos) {
    const { payload } = await fetchSource(url);
    await writeVariants(number, payload, kind);
    console.log(`${number}: ${name}`);
  }
  await contactSheet();
  console.log(`Wrote ${logos.length} portfolio logo pairs and QA contact sheet.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });

const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');

const BASE_URL = process.env.RESPONSIVE_TEST_URL || 'http://127.0.0.1:3000';
const PORT = Number(process.env.RESPONSIVE_DEBUG_PORT || 9333);
const PAGES = [
  'index.html',
  'about-space.html',
  'expertise.html',
  'feelnzuri.html',
  'posts.html',
  'fr/index.html',
  'fr/about-space.html',
  'fr/expertise.html',
  'fr/feelnzuri.html',
  'fr/posts.html',
  'fr/careers.html',
  'careers.html',
  'jobs/brand-manager-dubai',
  'jobs/sales-executive-nairobi',
  'jobs/logistics-coordinator-dubai',
  'cms/index.html',
];

function edgePath() {
  const candidates = [
    process.env.EDGE_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean);
  const fs = require('node:fs');
  return candidates.find((candidate) => fs.existsSync(candidate));
}

async function waitForDebugger() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Edge debugging endpoint did not become ready.');
}

async function openTarget(url) {
  const response = await fetch(
    `http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`,
    { method: 'PUT' },
  );
  if (!response.ok) throw new Error(`Unable to open ${url}: ${response.status}`);
  return response.json();
}

function createCdpClient(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  let nextId = 0;
  const pending = new Map();

  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  return {
    ready,
    send(method, params = {}) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    close() {
      socket.close();
    },
  };
}

async function inspectPage(page) {
  const target = await openTarget(`${BASE_URL}/${page}`);
  const client = createCdpClient(target.webSocketDebuggerUrl);
  await client.ready;
  await client.send('Page.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
  });
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await client.send('Page.navigate', { url: `${BASE_URL}/${page}` });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const { result } = await client.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      viewport: document.documentElement.clientWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body ? document.body.scrollWidth : 0,
      offenders: [...document.querySelectorAll('body *')]
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return { tag: node.tagName, className: String(node.className || '').slice(0, 120), left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
        })
        .filter((item) => item.right > document.documentElement.clientWidth + 1 || item.left < -1)
        .sort((a, b) => (b.right - document.documentElement.clientWidth) - (a.right - document.documentElement.clientWidth))
        .slice(0, 8),
      readyState: document.readyState
    })`,
    returnByValue: true,
  });
  client.close();
  return JSON.parse(result.value);
}

async function inspectHeroReload() {
  const target = await openTarget(`${BASE_URL}/en/`);
  const client = createCdpClient(target.webSocketDebuggerUrl);
  await client.ready;
  await client.send('Page.enable');
  const readOpening = async () => {
    await new Promise(resolve => setTimeout(resolve, 900));
    const { result } = await client.send('Runtime.evaluate', {
      expression: `JSON.stringify([...document.querySelectorAll('[data-asset-rotator]')].map(rotator =>
        (rotator.querySelector('.asset-rotator-frame.is-staging') || rotator.querySelector('.asset-rotator-frame.is-active:not(.is-opening-placeholder)'))?.dataset.assetId || null
      ))`,
      returnByValue: true,
    });
    return JSON.parse(result.value);
  };
  await client.send('Page.navigate', { url: `${BASE_URL}/en/` });
  const first = await readOpening();
  await client.send('Page.reload');
  const second = await readOpening();
  client.close();
  return { first, second };
}

async function inspectDesktopHomepage() {
  const target = await openTarget(`${BASE_URL}/en/`);
  const client = createCdpClient(target.webSocketDebuggerUrl);
  await client.ready;
  await client.send('Page.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: 1440,
    screenHeight: 900,
  });
  await client.send('Page.navigate', { url: `${BASE_URL}/en/` });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const { result } = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const maven = document.querySelector('.regional-operation-maven');
      const feelNzuri = document.querySelector('.regional-operation-feelnzuri');
      const presenceBars = [...document.querySelectorAll('.presence-story .presence-bar')];
      const presenceHeading = document.querySelector('.presence-story .presence-bars > p');
      const indiaPanel = document.querySelector('.presence-story .presence-india');
      const salesCard = document.querySelector('.expertise-showcase-card[data-expertise-key="sales"]');
      const operationsCard = document.querySelector('.expertise-showcase-card[data-expertise-key="operations"]');
      const marketCard = document.querySelector('.expertise-showcase-card[data-expertise-key="market"]');
      const filmStatement = document.querySelector('.film-statement');
      const mobileExpertiseCue = document.querySelector('.expertise-mobile-cue');
      const mobileExpertiseLink = document.querySelector('.expertise-mobile-link');
      const campaignCarousel = document.querySelector('.campaign-carousel-section');
      return JSON.stringify({
        teamPrompt: getComputedStyle(document.querySelector('.team-carousel-nudge')).display,
        campaignPrompt: getComputedStyle(document.querySelector('.campaign-carousel-nudge')).display,
        mavenHasImage: maven.hasAttribute('data-lazy-bg'),
        feelNzuriImage: feelNzuri.getAttribute('data-lazy-bg') || feelNzuri.style.getPropertyValue('--regional-image'),
        hasRetiredMavenLink: Boolean(document.querySelector('a[href*="space-x-maven"]')),
        presenceFilters: presenceBars.map(bar => getComputedStyle(bar, '::before').filter),
        presenceImageOpacities: presenceBars.map(bar => Number(getComputedStyle(bar, '::before').opacity)),
        presenceLabelOpacities: presenceBars.map(bar => Number(getComputedStyle(bar.querySelector('strong')).opacity)),
        presenceHeadingOpacity: presenceHeading ? Number(getComputedStyle(presenceHeading).opacity) : 0,
        indiaTransform: indiaPanel ? getComputedStyle(indiaPanel, '::before').transform : '',
        indiaInset: indiaPanel ? getComputedStyle(indiaPanel, '::before').inset : '',
        salesHeight: Math.round(salesCard.getBoundingClientRect().height),
        operationsHeight: Math.round(operationsCard.getBoundingClientRect().height),
        marketHeight: Math.round(marketCard.getBoundingClientRect().height),
        salesObjectPosition: getComputedStyle(salesCard.querySelector('img')).objectPosition,
        filmHeadline: filmStatement?.innerHTML || '',
        mobileExpertiseCue: mobileExpertiseCue ? getComputedStyle(mobileExpertiseCue).display : null,
        mobileExpertiseLink: mobileExpertiseLink ? getComputedStyle(mobileExpertiseLink).display : null,
        desktopExpertiseLink: getComputedStyle(document.querySelector('.expertise-gallery-link')).display,
        campaignCarousel: campaignCarousel ? getComputedStyle(campaignCarousel).display : null
      });
    })()`,
    returnByValue: true,
  });
  const homepage = JSON.parse(result.value);
  await client.send('Runtime.evaluate', {
    expression: `document.querySelector('.hero-view-all[href="#brands"]')?.click()`,
  });
  await new Promise((resolve) => setTimeout(resolve, 1600));
  const { result: anchorResult } = await client.send('Runtime.evaluate', {
    expression: `JSON.stringify({
      brandAnchorTop: Math.round(document.querySelector('#brands').getBoundingClientRect().top),
      bodyCaretTransparent: ['transparent', 'rgba(0, 0, 0, 0)'].includes(getComputedStyle(document.body).caretColor)
    })`,
    returnByValue: true,
  });
  client.close();
  return { ...homepage, ...JSON.parse(anchorResult.value) };
}

async function inspectMobileHomepage() {
  const target = await openTarget(`${BASE_URL}/en/`);
  const client = createCdpClient(target.webSocketDebuggerUrl);
  await client.ready;
  await client.send('Page.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
  });
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await client.send('Page.navigate', { url: `${BASE_URL}/en/` });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const { result } = await client.send('Runtime.evaluate', {
    expression: `(async () => {
      const film = document.querySelector('.immersive-film');
      const video = film?.querySelector('video');
      let visibleBeforeSevenSeconds = null;
      let hiddenInsideSevenSeconds = null;
      let visibleOpacity = null;
      let hiddenOpacity = null;
      if (film && video) {
        try {
          Object.defineProperty(video, 'duration', { configurable: true, value: 30 });
          Object.defineProperty(video, 'currentTime', { configurable: true, writable: true, value: 22.9 });
          video.dispatchEvent(new Event('timeupdate'));
          visibleBeforeSevenSeconds = !film.classList.contains('hide-film-statement');
          visibleOpacity = getComputedStyle(film.querySelector('.film-statement')).opacity;
          video.currentTime = 23.1;
          video.dispatchEvent(new Event('timeupdate'));
          hiddenInsideSevenSeconds = film.classList.contains('hide-film-statement');
          hiddenOpacity = getComputedStyle(film.querySelector('.film-statement')).opacity;
        } catch {}
      }
      const gallery = document.querySelector('.expertise-showcase-gallery');
      const mobileLink = document.querySelector('.expertise-mobile-link');
      const marketCard = document.querySelector('[data-expertise-key="market"]');
      const brandWall = document.querySelector('.homepage-brand-wall');
      const brandDirectory = brandWall?.querySelector('.brand-wall-directory');
      const brandGrid = brandWall?.querySelector('.brand-wall-grid');
      const firstBrand = brandWall?.querySelector('.brand-wall-item');
      const lancomeLogo = brandWall?.querySelector('.brand-wall-item[aria-label="Lancome"] img');
      const feelNzuriKicker = document.querySelector('.regional-operation-feelnzuri .regional-operation-kicker');
      const initiallyRevealed = brandWall?.classList.contains('is-mobile-revealed') || false;
    brandDirectory?.scrollIntoView({block:'start',behavior:'instant'});
  await new Promise(resolve=>setTimeout(resolve,800));
      return JSON.stringify({
        filmHeadline: document.querySelector('.film-statement')?.innerHTML || '',
        filmFontSize: parseFloat(getComputedStyle(document.querySelector('.film-statement')).fontSize),
        visibleBeforeSevenSeconds,
        hiddenInsideSevenSeconds,
        visibleOpacity,
        hiddenOpacity,
        campaignCarousel: getComputedStyle(document.querySelector('.campaign-carousel-section')).display,
        campaignBuiltSlides: document.querySelectorAll('.campaign-carousel-slide').length,
        expertiseCue: getComputedStyle(document.querySelector('.expertise-mobile-cue')).display,
        marketCardShadow: getComputedStyle(marketCard).boxShadow,
        mobileExpertiseLink: getComputedStyle(mobileLink).display,
        desktopExpertiseLink: getComputedStyle(document.querySelector('.expertise-gallery-link')).display,
        mobileLinkHref: mobileLink?.href || '',
        linkBelowGallery: mobileLink.getBoundingClientRect().top >= gallery.getBoundingClientRect().bottom - 1,
        initiallyRevealed,
        brandWallRevealed: brandWall?.classList.contains('is-mobile-revealed') || false,
        brandDirectoryOpacity: getComputedStyle(brandDirectory).opacity,
        brandGridColumns: getComputedStyle(brandGrid).gridTemplateColumns.split(' ').filter(Boolean).length,
        brandGridBackground: getComputedStyle(brandGrid).backgroundColor,
        brandItemBorder: getComputedStyle(firstBrand).borderTopWidth,
        lancomeObjectFit: getComputedStyle(lancomeLogo).objectFit,
        feelNzuriKickerColor: getComputedStyle(feelNzuriKicker).color,
        feelNzuriKickerOpacity: getComputedStyle(feelNzuriKicker).opacity
      });
    })()`,
    returnByValue: true,
    awaitPromise: true,
  });
  client.close();
  return JSON.parse(result.value);
}

async function inspectMobileTeamGrid() {
  const target = await openTarget(`${BASE_URL}/fr/`);
  const client = createCdpClient(target.webSocketDebuggerUrl);
  await client.ready;
  await client.send('Page.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
    screenWidth: 390,
    screenHeight: 844,
  });
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await client.send('Page.navigate', { url: `${BASE_URL}/fr/` });
  await new Promise((resolve) => setTimeout(resolve, 1800));
  const { result } = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const track = document.querySelector('.team-portrait-track');
      const cards = [...document.querySelectorAll('.team-portrait-card')];
      const arrow = document.querySelector('.team-arrow');
      const columns = getComputedStyle(track).gridTemplateColumns.trim().split(/\\s+/).filter(Boolean);
      return JSON.stringify({
        display: getComputedStyle(track).display,
        columnCount: columns.length,
        cardCount: cards.length,
        visibleCards: cards.filter(card => {
          const style = getComputedStyle(card);
          const rect = card.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0 && rect.width > 0 && rect.height > 0;
        }).length,
        arrowDisplay: arrow ? getComputedStyle(arrow).display : null,
        portraitPositions: cards.map(card => getComputedStyle(card.querySelector('img')).objectPosition),
        firstProfileUrl: cards[0]?.getAttribute('href') || cards[0]?.dataset?.profileHref || '',
        firstRole: cards[0]?.querySelector('[data-team-card-role]')?.textContent.trim() || cards[0]?.textContent.trim() || ''
      });
    })()`,
    returnByValue: true,
  });
  client.close();
  return JSON.parse(result.value);
}

async function inspectTeamProfile(page, width, height, mobile) {
  const target = await openTarget(`${BASE_URL}/${page}`);
  const client = createCdpClient(target.webSocketDebuggerUrl);
  await client.ready;
  await client.send('Page.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height,
  });
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  await client.send('Page.navigate', { url: `${BASE_URL}/${page}` });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const { result } = await client.send('Runtime.evaluate', {
    expression: `(() => {
      const root = document.documentElement;
      const main = document.querySelector('.individual-team-profile');
      const figure = main?.querySelector('figure');
      const image = figure?.querySelector('img');
      const linkedin = main?.querySelector('article > a');
      const heading = main?.querySelector('h1');
      const paragraphs = [...(main?.querySelectorAll('article > div p') || [])];
      const rect = main?.getBoundingClientRect();
      const figureStyle = figure ? getComputedStyle(figure) : null;
      const firstParagraph = paragraphs[0];
      const bodyParagraph = paragraphs[1] || firstParagraph;
      return JSON.stringify({
        title: heading?.textContent.trim() || '',
        viewportWidth: root.clientWidth,
        documentWidth: root.scrollWidth,
        viewportHeight: root.clientHeight,
        documentHeight: root.scrollHeight,
        mainWidth: rect ? Math.round(rect.width) : 0,
        mainHeight: rect ? Math.round(rect.height) : 0,
        mainOverflow: main ? getComputedStyle(main).overflow : '',
        bodyOverflow: document.body ? getComputedStyle(document.body).overflow : '',
        mask: figureStyle ? (figureStyle.webkitMaskImage || figureStyle.maskImage || '') : '',
        imageLoaded: Boolean(image?.complete && image?.naturalWidth),
        headingFontSize: heading ? parseFloat(getComputedStyle(heading).fontSize) : 0,
        firstParagraphFontSize: firstParagraph ? parseFloat(getComputedStyle(firstParagraph).fontSize) : 0,
        bodyFontSize: bodyParagraph ? parseFloat(getComputedStyle(bodyParagraph).fontSize) : 0,
        paragraphGap: paragraphs.length > 1 ? Math.round(paragraphs[1].getBoundingClientRect().top - paragraphs[0].getBoundingClientRect().bottom) : 0,
        imagePosition: image ? getComputedStyle(image).objectPosition : '',
        imageFit: image ? getComputedStyle(image).objectFit : '',
        portraitMode: Boolean(figure?.classList.contains('is-portrait')),
        imageAspect: image?.naturalHeight ? Number((image.naturalWidth/image.naturalHeight).toFixed(2)) : 0,
        hasVisibleLinkedin: Boolean(linkedin)
      });
    })()`,
    returnByValue: true,
  });
  client.close();
  return JSON.parse(result.value);
}

async function main() {
  const executable = edgePath();
  if (!executable) throw new Error('Microsoft Edge was not found. Set EDGE_PATH to its executable.');

  const profile = await mkdtemp(path.join(tmpdir(), 'space-responsive-'));
  const browser = spawn(executable, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    await waitForDebugger();
    const failures = [];
    for (const page of PAGES) {
      const dimensions = await inspectPage(page);
      const overflow = dimensions.documentWidth - dimensions.viewport;
      console.log(`${page}: ${dimensions.viewport}px viewport, ${dimensions.documentWidth}px document`);
      if (dimensions.readyState !== 'complete' || overflow > 1) {
        failures.push({ page, overflow, ...dimensions });
      }
    }
    const openings = await inspectHeroReload();
    console.log(`hero reload openings: ${openings.first.join(', ')} -> ${openings.second.join(', ')}`);
    if (openings.first.length !== 2 || openings.second.length !== 2 || openings.first.some(id => !id) || openings.second.some(id => !id) || openings.first.some(id => openings.second.includes(id))) {
      failures.push({ page: 'hero reload', ...openings });
    }
    const desktopHomepage = await inspectDesktopHomepage();
    console.log(`desktop-only check: ${JSON.stringify(desktopHomepage)}`);
    if (desktopHomepage.teamPrompt !== 'none' || desktopHomepage.campaignPrompt !== 'none' || desktopHomepage.mavenHasImage || !desktopHomepage.feelNzuriImage || desktopHomepage.hasRetiredMavenLink || desktopHomepage.presenceFilters.some(filter => filter !== 'none') || desktopHomepage.presenceImageOpacities.some(opacity => opacity !== 0.9) || desktopHomepage.presenceLabelOpacities.some(opacity => opacity !== 0.9) || desktopHomepage.presenceHeadingOpacity !== 0.9 || desktopHomepage.indiaTransform !== 'none' || desktopHomepage.indiaInset !== '0px' || desktopHomepage.salesHeight >= desktopHomepage.operationsHeight || desktopHomepage.salesHeight >= desktopHomepage.marketHeight || desktopHomepage.salesObjectPosition !== '50% 66%' || desktopHomepage.filmHeadline !== 'Global Brands,<br>Local Reach' || desktopHomepage.mobileExpertiseCue !== 'none' || desktopHomepage.mobileExpertiseLink !== 'none' || desktopHomepage.desktopExpertiseLink === 'none' || desktopHomepage.campaignCarousel === 'none' || Math.abs(desktopHomepage.brandAnchorTop) > 1 || !desktopHomepage.bodyCaretTransparent) {
      failures.push({ page: 'desktop homepage mobile-only content', ...desktopHomepage });
    }
    const mobileHomepage = await inspectMobileHomepage();
    console.log(`mobile homepage refinement check: ${JSON.stringify(mobileHomepage)}`);
    if (mobileHomepage.filmHeadline !== 'Global Brands,<br>Local Reach' || mobileHomepage.filmFontSize < 43 || mobileHomepage.filmFontSize > 46 || mobileHomepage.visibleBeforeSevenSeconds !== true || mobileHomepage.hiddenInsideSevenSeconds !== true || mobileHomepage.visibleOpacity !== '1' || mobileHomepage.hiddenOpacity !== '0' || mobileHomepage.campaignCarousel !== 'none' || mobileHomepage.campaignBuiltSlides !== 0 || mobileHomepage.expertiseCue === 'none' || mobileHomepage.marketCardShadow !== 'none' || mobileHomepage.mobileExpertiseLink === 'none' || mobileHomepage.desktopExpertiseLink !== 'none' || !/\/en\/expertise\.html$/.test(mobileHomepage.mobileLinkHref) || !mobileHomepage.linkBelowGallery || mobileHomepage.initiallyRevealed !== false || mobileHomepage.brandWallRevealed !== true || mobileHomepage.brandDirectoryOpacity !== '1' || mobileHomepage.brandGridColumns !== 4 || mobileHomepage.brandGridBackground !== 'rgb(231, 225, 220)' || mobileHomepage.brandItemBorder !== '0px' || mobileHomepage.lancomeObjectFit !== 'cover' || mobileHomepage.feelNzuriKickerColor !== 'rgb(255, 255, 255)' || mobileHomepage.feelNzuriKickerOpacity !== '1') {
      failures.push({ page: 'mobile homepage refinements', ...mobileHomepage });
    }
    const mobileTeam = await inspectMobileTeamGrid();
    console.log(`mobile French team check: ${JSON.stringify(mobileTeam)}`);
    if (mobileTeam.display !== 'grid' || mobileTeam.columnCount !== 2 || mobileTeam.cardCount !== 6 || mobileTeam.visibleCards !== 6 || mobileTeam.arrowDisplay !== 'none' || mobileTeam.portraitPositions[0] !== '50% 15%' || mobileTeam.portraitPositions.slice(1).some(position => position !== '50% 0%') || !/\/fr\/team\/vipul-mathur$/.test(mobileTeam.firstProfileUrl) || !mobileTeam.firstRole.includes('Fondateur')) {
      failures.push({ page: 'mobile French team grid', ...mobileTeam });
    }
    const mobileProfile = await inspectTeamProfile('en/team/krishnamachari-rangarajan', 390, 844, true);
    const desktopProfile = await inspectTeamProfile('en/team/vipul-mathur', 1440, 900, false);
    const desktopPortraitProfile = await inspectTeamProfile('en/team/krishnamachari-rangarajan', 1440, 900, false);
    const shortDesktopProfile = await inspectTeamProfile('en/team/vipul-mathur', 1440, 734, false);
    console.log(`mobile team profile check: ${JSON.stringify(mobileProfile)}`);
    console.log(`desktop team profile check: ${JSON.stringify(desktopProfile)}`);
    console.log(`desktop portrait profile check: ${JSON.stringify(desktopPortraitProfile)}`);
    console.log(`short desktop team profile check: ${JSON.stringify(shortDesktopProfile)}`);
    for (const [page, profile, expectedImagePosition] of [
      ['mobile Krishnamachari profile', mobileProfile, '50% 0%'],
      ['desktop Vipul profile', desktopProfile, '50% 15%'],
    ]) {
      if (!profile.title || profile.documentWidth > profile.viewportWidth + 1 || profile.documentHeight > profile.viewportHeight + 1 || Math.abs(profile.mainWidth - profile.viewportWidth) > 1 || Math.abs(profile.mainHeight - profile.viewportHeight) > 1 || profile.mainOverflow !== 'hidden' || profile.bodyOverflow !== 'hidden' || !profile.mask || profile.mask === 'none' || !profile.imageLoaded || profile.imagePosition !== expectedImagePosition || profile.hasVisibleLinkedin) {
        failures.push({ page, ...profile });
      }
    }
    if (!desktopPortraitProfile.portraitMode || desktopPortraitProfile.imageFit !== 'contain' || desktopPortraitProfile.imageAspect >= 1.05 || desktopProfile.portraitMode || desktopProfile.imageFit !== 'cover') {
      failures.push({ page: 'team profile portrait alignment', portrait: desktopPortraitProfile, landscape: desktopProfile });
    }
    for (const [page, profile] of [
      ['desktop Vipul typography', desktopProfile],
      ['short desktop Vipul typography', shortDesktopProfile],
    ]) {
      if (profile.headingFontSize < 54 || profile.firstParagraphFontSize < 17 || profile.bodyFontSize < 15 || profile.paragraphGap < 16 || profile.documentHeight > profile.viewportHeight + 1) {
        failures.push({ page, ...profile });
      }
    }
    if (failures.length) {
      console.error('Responsive failures:', JSON.stringify(failures, null, 2));
      process.exitCode = 1;
    } else {
      console.log('Responsive mobile overflow check passed.');
    }
  } finally {
    browser.kill();
    await new Promise((resolve) => setTimeout(resolve, 600));
    try {
      await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
    } catch (error) {
      console.warn(`Temporary Edge profile will be cleared by the operating system: ${error.code || error.message}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

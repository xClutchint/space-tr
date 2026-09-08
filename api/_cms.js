const crypto = require('crypto');
const store = require('./_store');
const auth = require('./_auth');
const seedContent = require('../data/cms-content.json');
const seededTeam = new Map((seedContent.team || []).flatMap(person => [[person.id, person], [String(person.name || '').toLowerCase(), person]]));
const legacyBrandLogoCorrections = new Map([
  ['Gucci:9', 39], ['Lancome:10', 11], ['Prada:11', 9],
  ['Valentino:12', 10], ['Ralph Lauren:16', 12], ['Goldfield & Banks:39', 16]
]);

function send(res, status, body, headers = {}) {
  Object.entries({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).send(JSON.stringify(body));
}
function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}
function clean(value, max = 5000) { return String(value || '').trim().slice(0, max); }
function slug(value) { return clean(value, 120).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function cleanList(value, maxItems = 30, maxLength = 500) { return Array.isArray(value) ? value.map(item => clean(item, maxLength)).filter(Boolean).slice(0, maxItems) : []; }
function portraitPosition(value, fallback = 'center top') {
  const position = clean(value, 40).toLowerCase();
  return /^(?:left|center|right|\d{1,3}%)(?:\s+(?:top|center|bottom|\d{1,3}%))?$/.test(position) ? position : fallback;
}
function safeUrl(value, options = {}) {
  const url = clean(value, 2000);
  if (!url) return '';
  if (/^https:\/\//i.test(url) || (options.local !== false && /^(\/|assets\/)/.test(url))) return url;
  return '';
}
function sanitizeMedia(item) {
  if (!item || typeof item !== 'object') return null;
  const url = safeUrl(item.url); if (!url) return null;
  return {
    id: clean(item.id, 150) || crypto.randomUUID(), url,
    type: item.type === 'video' ? 'video' : 'image', alt: clean(item.alt, 220), label: clean(item.label, 160),
    brand: clean(item.brand, 120), orientation: ['vertical', 'horizontal', 'square'].includes(item.orientation) ? item.orientation : '',
    thumbnailUrl: safeUrl(item.thumbnailUrl), mobileUrl: safeUrl(item.mobileUrl), desktopUrl: safeUrl(item.desktopUrl), posterUrl: safeUrl(item.posterUrl), source: item.source === 'library' ? 'library' : 'upload'
  };
}
function sanitizeJob(item) {
  if (!item || typeof item !== 'object' || !item.title) return null;
  const title = clean(item.title, 160);
  const workplaceType = ['ONSITE','HYBRID','REMOTE'].includes(item.workplaceType)
    ? item.workplaceType
    : (/remote/i.test(item.location || '') ? 'REMOTE' : 'ONSITE');
  const location = workplaceType === 'REMOTE' ? 'Remote' : clean(item.location, 160);
  const locationParts = location.split(',').map(part => part.trim()).filter(Boolean);
  const countryNames = { AE:'United Arab Emirates', CI:"Côte d’Ivoire", GH:'Ghana', KE:'Kenya', MA:'Morocco', MU:'Mauritius', NG:'Nigeria', RW:'Rwanda', SA:'Saudi Arabia', SN:'Senegal', TN:'Tunisia', ZA:'South Africa' };
  const locationCountry = workplaceType === 'REMOTE' ? '' : clean(item.country || locationParts.at(-1) || countryNames[clean(item.countryCode, 2).toUpperCase()], 80);
  return {
    id: clean(item.id, 100) || crypto.randomUUID(), slug: slug(item.slug || `${title}-${locationParts[0] || workplaceType.toLowerCase()}`), title,
    department: clean(item.department, 120), workplaceType, location,
    locality: workplaceType === 'REMOTE' ? '' : clean(item.locality || locationParts[0], 100),
    region: workplaceType === 'REMOTE' ? '' : clean(item.region, 100),
    country: locationCountry, countryCode: clean(item.countryCode, 2).toUpperCase(),
    employmentType: ['FULL_TIME','PART_TIME','CONTRACTOR','TEMPORARY','INTERN','OTHER'].includes(item.employmentType) ? item.employmentType : 'FULL_TIME',
    datePosted: clean(item.datePosted, 10), validThrough: clean(item.validThrough, 40), updatedAt: clean(item.updatedAt, 40) || new Date().toISOString(),
    summary: clean(item.summary, 800), description: clean(item.description, 16000), responsibilities: cleanList(item.responsibilities), qualifications: cleanList(item.qualifications),
    applyEmail: clean(item.applyEmail, 200).toLowerCase(), active: item.active !== false
  };
}
function sanitizePost(item) {
  if (!item || typeof item !== 'object' || !item.title) return null;
  const title = clean(item.title, 200);
  return {
    id: clean(item.id, 100) || crypto.randomUUID(), slug: slug(item.slug || title), title, format: 'blog',
    sourceId: clean(item.sourceId, 160),
    date: clean(item.date, 10), updatedAt: clean(item.updatedAt, 40) || clean(item.date, 10), excerpt: clean(item.excerpt, 300),
    body: clean(item.body, 60000), imageUrl: safeUrl(item.imageUrl), thumbnailUrl: safeUrl(item.thumbnailUrl),
    seoTitle: clean(item.seoTitle, 70), seoDescription: clean(item.seoDescription, 170), author: clean(item.author, 120) || 'Space Editorial Team',
    language: item.language === 'fr' ? 'fr' : 'en', published: item.published === true
  };
}
function sanitizeTeam(item) {
  if (!item || typeof item !== 'object' || !item.name) return null;
  const name = clean(item.name, 160), seeded = seededTeam.get(item.id) || seededTeam.get(name.toLowerCase()) || {};
  const itemAlignmentVersion = Number(item.profileAlignmentVersion) || 0;
  const seededAlignmentVersion = Number(seeded.profileAlignmentVersion) || 0;
  const useSeededAlignment = seededAlignmentVersion > itemAlignmentVersion;
  const scale = Number(useSeededAlignment ? seeded.profileScale : item.profileScale);
  const position = useSeededAlignment ? seeded.profilePosition : item.profilePosition;
  return {
    id: clean(item.id, 100) || crypto.randomUUID(), slug: slug(item.slug || name), name,
    role: clean(item.role, 220), roleFr: clean(item.roleFr || seeded.roleFr, 220), imageUrl: safeUrl(item.imageUrl || item.image), linkedin: safeUrl(item.linkedin, { local: false }),
    summary: clean(item.summary, 1200), summaryFr: clean(item.summaryFr || seeded.summaryFr, 1200), bio: cleanList(item.bio, 16, 3000), bioFr: cleanList(item.bioFr?.length ? item.bioFr : seeded.bioFr, 16, 3000),
    active: item.active !== false, profileScale: Number.isFinite(scale) ? Math.max(1, Math.min(1.8, scale)) : 1,
    profilePosition: portraitPosition(position, 'center top'), profileAlignmentVersion: Math.max(itemAlignmentVersion, seededAlignmentVersion),
    profileEdge: /^#[a-f0-9]{6}$/i.test(clean(item.profileEdge, 20)) ? clean(item.profileEdge, 20) : '#c5b59e'
  };
}
function sanitizeBrand(item) {
  if (!item || typeof item !== 'object' || !item.name) return null;
  const name = clean(item.name, 160), suppliedLogoNumber = Number(item.logoNumber);
  const logoNumber = legacyBrandLogoCorrections.get(`${name}:${suppliedLogoNumber}`) || suppliedLogoNumber;
  return {
    id: clean(item.id, 120) || slug(name), slug: slug(item.slug || name), name,
    category: ['niche','premium','mass'].includes(item.category) ? item.category : 'niche',
    logoNumber: Number.isInteger(logoNumber) && logoNumber > 0 ? logoNumber : 0,
    logoUrl: safeUrl(item.logoUrl), bannerUrl: safeUrl(item.bannerUrl), active: item.active !== false
  };
}
function sanitizePageImage(item) {
  if (!item || typeof item !== 'object') return null;
  const url = safeUrl(item.url); if (!url) return null;
  const x = Number(item.x), y = Number(item.y), scale = Number(item.scale);
  return {
    key: slug(item.key), page: clean(item.page, 80), label: clean(item.label, 120), url,
    x: Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 50,
    y: Number.isFinite(y) ? Math.max(0, Math.min(100, y)) : 50,
    scale: Number.isFinite(scale) ? Math.max(1, Math.min(1.8, scale)) : 1,
    mobileUrl: safeUrl(item.mobileUrl),
    mobileX: Number.isFinite(Number(item.mobileX)) ? Math.max(0, Math.min(100, Number(item.mobileX))) : (Number.isFinite(x) ? Math.max(0, Math.min(100, x)) : 50),
    mobileY: Number.isFinite(Number(item.mobileY)) ? Math.max(0, Math.min(100, Number(item.mobileY))) : (Number.isFinite(y) ? Math.max(0, Math.min(100, y)) : 50),
    mobileScale: Number.isFinite(Number(item.mobileScale)) ? Math.max(1, Math.min(1.8, Number(item.mobileScale))) : (Number.isFinite(scale) ? Math.max(1, Math.min(1.8, scale)) : 1)
  };
}
function sanitizeState(input) {
  const state = input && typeof input === 'object' ? input : {}, media = state.media && typeof state.media === 'object' ? state.media : {}, settings = state.settings && typeof state.settings === 'object' ? state.settings : {};
  const desktopInput = Array.isArray(media.heroDesktop) ? media.heroDesktop : media.hero;
  const mobileInput = Array.isArray(media.heroMobile) ? media.heroMobile : desktopInput;
  const desktop = Array.isArray(desktopInput) ? desktopInput.slice(0, 150).map(sanitizeMedia).filter(Boolean) : [];
  const mobile = Array.isArray(mobileInput) ? mobileInput.slice(0, 150).map(sanitizeMedia).filter(Boolean) : [];
  const brandCount = Math.max(1, Math.min(80, Number(settings.brandDisplayCount) || (Array.isArray(state.brands) && state.brands.filter(item => item?.active !== false).length) || 41));
  return {
    version: 5, updatedAt: clean(state.updatedAt, 40),
    settings: {
      heroDesktopRotationSeconds: Math.max(5, Math.min(15, Number(settings.heroDesktopRotationSeconds ?? settings.heroRotationSeconds) || 5)),
      heroMobileRotationSeconds: Math.max(5, Math.min(15, Number(settings.heroMobileRotationSeconds ?? settings.heroRotationSeconds) || 5)),
      brandDisplayCount: brandCount
    },
    media: { hero: desktop, heroDesktop: desktop, heroMobile: mobile, carousel: Array.isArray(media.carousel) ? media.carousel.slice(0, 20).map(sanitizeMedia).filter(Boolean) : [] },
    brands: Array.isArray(state.brands) ? state.brands.slice(0, 200).map(sanitizeBrand).filter(Boolean) : [],
    jobs: Array.isArray(state.jobs) ? state.jobs.slice(0, 200).map(sanitizeJob).filter(Boolean) : [],
    posts: Array.isArray(state.posts) ? state.posts.slice(0, 1000).map(sanitizePost).filter(Boolean) : [],
    team: Array.isArray(state.team) ? state.team.slice(0, 100).map(sanitizeTeam).filter(Boolean) : [],
    pageImages: Array.isArray(state.pageImages) ? state.pageImages.slice(0, 100).map(sanitizePageImage).filter(Boolean) : []
  };
}
function duplicate(values) { const seen = new Set(); return values.find(value => seen.has(value) || !seen.add(value)); }
function validatePublishState(input) {
  const state = sanitizeState(input), errors = [];
  if (state.media.heroDesktop.length < 2) errors.push('Select at least two desktop hero assets.');
  if (state.media.heroMobile.length < 2) errors.push('Select at least two mobile hero assets.');
  if (state.media.carousel.length > 20) errors.push('The lower carousel cannot contain more than 20 images.');
  if (state.brands.length) {
    const activeBrands = state.brands.filter(item => item.active);
    if (activeBrands.length !== state.settings.brandDisplayCount) errors.push(`Select exactly ${state.settings.brandDisplayCount} portfolio brands (${activeBrands.length} currently selected).`);
    if (duplicate(activeBrands.map(item => item.slug))) errors.push('Every selected brand must be unique.');
  }
  if (duplicate(state.team.filter(item => item.active).map(item => item.slug))) errors.push('Every visible team profile must have a unique URL.');
  if (duplicate(state.jobs.filter(item => item.active).map(item => item.slug))) errors.push('Every active career listing must have a unique URL.');
  if (duplicate(state.posts.filter(item => item.published).map(item => `${item.language}:${item.slug}`))) errors.push('Every published article must have a unique URL in its language.');
  state.jobs.filter(item => item.active).forEach(job => {
    const needsLocation = job.workplaceType !== 'REMOTE';
    if (!job.description || !job.datePosted || (needsLocation && (!job.location || (!job.country && !job.countryCode)))) errors.push(`${job.title} is missing required Google Jobs fields.`);
  });
  return { state, errors };
}
function isJobOpen(job, current = Date.now()) {
  if (!job || job.active === false) return false;
  const closing = Date.parse(job.validThrough); return !job.validThrough || Number.isNaN(closing) || closing >= current;
}
async function readState() {
  if (process.env.CMS_PREVIEW_SOURCE_URL) {
    try {
      const { loadPublishedState } = require('./_preview');
      const remoteState = await loadPublishedState();
      if (remoteState) return sanitizeState(remoteState);
    } catch (error) {
      console.warn('Private CMS published state unavailable; trying the local content store.', error.message);
    }
  }
  try {
    const document = await store.getDocument();
    return sanitizeState(document?.published || seedContent);
  } catch (error) {
    // Public pages must remain available when the optional CMS database has
    // not been connected yet or is temporarily unavailable. The checked-in
    // published snapshot is the deployment's safe, read-only fallback.
    console.warn('CMS published state unavailable; serving bundled content.', error.message);
    return sanitizeState(seedContent);
  }
}
async function readDraftState() {
  const document = await store.getDocument(), state = sanitizeState(document?.draft || document?.published || {});
  state._meta = { version: document?.version || 1, updatedAt: document?.updatedAt, publishedAt: document?.publishedAt }; return state;
}
async function writeDraft(state, actorId, expectedVersion) {
  const document = await store.getDocument();
  if (expectedVersion && Number(expectedVersion) !== Number(document.version)) { const error = new Error('This draft changed in another session. Reload before saving.'); error.status = 409; throw error; }
  const cleanState = sanitizeState(state); cleanState.updatedAt = new Date().toISOString();
  const result = await store.saveDocumentDraft(cleanState, actorId, 'save-draft', expectedVersion);
  cleanState._meta = { version: result.version, updatedAt: result.updatedAt, publishedAt: result.publishedAt }; return cleanState;
}
async function publishState(state, actorId, expectedVersion, scope = 'all') {
  const document = await store.getDocument();
  if (expectedVersion && Number(expectedVersion) !== Number(document.version)) { const error = new Error('This draft changed in another session. Reload before publishing.'); error.status = 409; throw error; }
  const draft = sanitizeState(state), current = sanitizeState(document.published || {});
  draft.updatedAt = new Date().toISOString();
  let candidate = draft;
  if (scope === 'desktop') candidate = sanitizeState({ ...current, media: { ...current.media, heroDesktop: draft.media.heroDesktop, hero: draft.media.heroDesktop }, settings: { ...current.settings, heroDesktopRotationSeconds: draft.settings.heroDesktopRotationSeconds } });
  if (scope === 'mobile') candidate = sanitizeState({ ...current, media: { ...current.media, heroMobile: draft.media.heroMobile }, settings: { ...current.settings, heroMobileRotationSeconds: draft.settings.heroMobileRotationSeconds } });
  const validation = validatePublishState(candidate); validation.state.updatedAt = new Date().toISOString(); if (validation.errors.length) { const error = new Error(validation.errors.join(' ')); error.status = 422; error.details = validation.errors; throw error; }
  const result = await store.publishDocument(draft, actorId, validation.state, expectedVersion);
  draft._meta = { version: result.version, updatedAt: result.updatedAt, publishedAt: result.publishedAt }; return draft;
}
function publicState(state) {
  const cleanState = sanitizeState(state);
  return { ...cleanState, jobs: cleanState.jobs.filter(isJobOpen), posts: cleanState.posts.filter(post => post.published), team: cleanState.team.filter(person => person.active), brands: cleanState.brands.filter(brand => brand.active) };
}

module.exports = {
  COOKIE_NAME: auth.COOKIE_NAME, MAX_SESSION_AGE: auth.SESSION_SECONDS, send, parseBody, clean, cleanList, slug, safeEqual: auth.safeEqual,
  setSessionCookie: auth.setSessionCookie, sameOrigin: auth.sameOrigin, isAuthenticated: async req => Boolean(await auth.currentAuth(req)), requireAuth: auth.requireAuth,
  sanitizeState, validatePublishState, readState, readDraftState, writeDraft, publishState, publicState, isJobOpen
};

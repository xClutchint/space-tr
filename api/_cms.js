const crypto = require('crypto');
const fallbackContent = require('../data/cms-content.json');

const CONTENT_PATH = 'space-cms/content.json';
const COOKIE_NAME = 'space_cms_session';
const MAX_SESSION_AGE = 60 * 60 * 12;

function send(res, status, body, headers = {}) {
  Object.entries({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }).forEach(([key, value]) => res.setHeader(key, value));
  return res.status(status).send(JSON.stringify(body));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body); } catch { return {}; }
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sessionSecret() {
  return process.env.CMS_SESSION_SECRET || '';
}

function sign(value) {
  return crypto.createHmac('sha256', sessionSecret()).update(value).digest('base64url');
}

function makeSession(username) {
  const payload = Buffer.from(JSON.stringify({ username, expires: Math.floor(Date.now() / 1000) + MAX_SESSION_AGE })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function cookieValue(req) {
  const cookies = String(req.headers.cookie || '').split(';').map(value => value.trim());
  const match = cookies.find(value => value.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.slice(COOKIE_NAME.length + 1)) : '';
}

function isAuthenticated(req) {
  if (!sessionSecret()) return false;
  const [payload, signature] = cookieValue(req).split('.');
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).expires > Date.now() / 1000; } catch { return false; }
}

function setSessionCookie(res, value, maxAge = MAX_SESSION_AGE) {
  const secure = process.env.VERCEL === '1' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`);
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const protocol = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return origin === `${protocol}://${req.headers.host}`;
}

function sanitizeState(input) {
  const state = input && typeof input === 'object' ? input : {};
  const media = state.media && typeof state.media === 'object' ? state.media : {};
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    media: {
      hero: Array.isArray(media.hero) ? media.hero.slice(0, 2).map(item => sanitizeMedia(item)) : [null, null],
      carousel: Array.isArray(media.carousel) ? media.carousel.slice(0, 40).map(sanitizeMedia).filter(Boolean) : []
    },
    jobs: Array.isArray(state.jobs) ? state.jobs.slice(0, 200).map(sanitizeJob).filter(Boolean) : [],
    posts: Array.isArray(state.posts) ? state.posts.slice(0, 500).map(sanitizePost).filter(Boolean) : []
  };
}

function clean(value, max = 5000) { return String(value || '').trim().slice(0, max); }
function slug(value) { return clean(value, 100).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function cleanList(value) { return Array.isArray(value) ? value.map(item => clean(item, 500)).filter(Boolean).slice(0, 30) : []; }
function sanitizeMedia(item) {
  if (!item || typeof item !== 'object' || !item.url) return null;
  const url = clean(item.url, 2000);
  if (!/^(https:\/\/|\/)/.test(url)) return null;
  return { id: clean(item.id, 150) || crypto.randomUUID(), url, type: item.type === 'video' ? 'video' : 'image', alt: clean(item.alt, 220), label: clean(item.label, 120) };
}
function sanitizeJob(item) {
  if (!item || typeof item !== 'object' || !item.title) return null;
  const title = clean(item.title, 160);
  return {
    id: clean(item.id, 100) || crypto.randomUUID(), slug: slug(item.slug || title), title,
    department: clean(item.department, 120), location: clean(item.location, 160), locality: clean(item.locality, 100), region: clean(item.region, 100), countryCode: clean(item.countryCode, 2).toUpperCase(),
    employmentType: clean(item.employmentType, 40) || 'FULL_TIME', datePosted: clean(item.datePosted, 10), validThrough: clean(item.validThrough, 40), updatedAt: clean(item.updatedAt, 40) || clean(item.datePosted, 10),
    summary: clean(item.summary, 500), description: clean(item.description, 12000), responsibilities: cleanList(item.responsibilities), qualifications: cleanList(item.qualifications),
    applyEmail: clean(item.applyEmail, 200), active: item.active !== false
  };
}
function sanitizePost(item) {
  if (!item || typeof item !== 'object' || !item.title) return null;
  const title = clean(item.title, 200);
  return { id: clean(item.id, 100) || crypto.randomUUID(), slug: slug(item.slug || title), title, topic: clean(item.topic, 100), date: clean(item.date, 10), excerpt: clean(item.excerpt, 1000), body: clean(item.body, 30000), imageUrl: clean(item.imageUrl, 2000), externalUrl: clean(item.externalUrl, 2000), published: item.published !== false };
}

function isJobOpen(job, now = Date.now()) {
  if (!job || job.active === false) return false;
  if (!job.validThrough) return true;
  const closingTime = Date.parse(job.validThrough);
  return Number.isNaN(closingTime) || closingTime >= now;
}

async function blobModule() { return import('@vercel/blob'); }
async function readState() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return structuredClone(fallbackContent);
  try {
    const { list } = await blobModule();
    const result = await list({ prefix: CONTENT_PATH, limit: 1, token: process.env.BLOB_READ_WRITE_TOKEN });
    const exact = result.blobs.find(blob => blob.pathname === CONTENT_PATH);
    if (!exact) return structuredClone(fallbackContent);
    const response = await fetch(exact.downloadUrl || exact.url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Content read failed (${response.status})`);
    return sanitizeState(await response.json());
  } catch (error) {
    console.error('CMS state fallback:', error.message);
    return structuredClone(fallbackContent);
  }
}
async function writeState(state) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN is not configured');
  const { put } = await blobModule();
  const cleanState = sanitizeState(state);
  await put(CONTENT_PATH, JSON.stringify(cleanState), { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json; charset=utf-8', cacheControlMaxAge: 1, token: process.env.BLOB_READ_WRITE_TOKEN });
  return cleanState;
}

function publicState(state) {
  return { ...state, jobs: state.jobs.filter(job => isJobOpen(job)), posts: state.posts.filter(post => post.published) };
}

module.exports = { COOKIE_NAME, MAX_SESSION_AGE, send, parseBody, safeEqual, makeSession, setSessionCookie, isAuthenticated, sameOrigin, sanitizeState, readState, writeState, publicState, isJobOpen, clean };

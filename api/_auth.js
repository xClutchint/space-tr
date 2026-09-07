const crypto = require('crypto');
const { promisify } = require('util');
const store = require('./_store');

const scryptAsync = promisify(crypto.scrypt);
const COOKIE_NAME = 'space_cms_session';
const SESSION_SECONDS = 60 * 60 * 12;
const PASSWORD_MIN_LENGTH = 12;
let bootstrapped;

function localDevelopment() { return process.env.SPACE_CMS_LOCAL === '1'; }
function deployedProduction() { return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'; }

function sessionSecret() { return process.env.CMS_SESSION_SECRET || (store.localMode() ? 'local-development-session-secret' : ''); }
function hashToken(value) {
  const secret = sessionSecret();
  if (!secret) throw new Error('CMS_SESSION_SECRET is not configured.');
  return crypto.createHmac('sha256', secret).update(String(value || '')).digest('hex');
}
function signSessionValue(value) {
  const secret = sessionSecret();
  if (!secret) throw new Error('CMS_SESSION_SECRET is not configured.');
  return crypto.createHmac('sha256', secret).update(`session:${value}`).digest('base64url');
}
function csrfForToken(token) {
  const secret = process.env.CMS_CSRF_SECRET || process.env.CMS_SESSION_SECRET || process.env.CMS_OWNER_PASSWORD || 'local-development-only';
  return crypto.createHmac('sha256', secret).update(`csrf:${token}`).digest('base64url');
}
function safeEqual(left, right) {
  const a = Buffer.from(String(left || '')), b = Buffer.from(String(right || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function normalizeEmail(value) { return String(value || '').trim().toLowerCase().slice(0, 254); }
function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value)); }
function requestIp(req) { return String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim().slice(0, 100); }
function passwordProblem(password) {
  const value = String(password || '');
  if (value.length < PASSWORD_MIN_LENGTH) return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
  if (value.length > 256) return 'Password is too long.';
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) return 'Include an uppercase letter, a lowercase letter and a number.';
  return '';
}
async function hashPassword(password) {
  const problem = passwordProblem(password); if (problem) throw new Error(problem);
  const salt = crypto.randomBytes(16), derived = await scryptAsync(String(password), salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$8$1$${salt.toString('base64url')}$${Buffer.from(derived).toString('base64url')}`;
}
async function verifyPassword(password, encoded) {
  try {
    const [algorithm, n, r, p, salt, expected] = String(encoded || '').split('$');
    if (algorithm !== 'scrypt' || !salt || !expected) return false;
    const derived = await scryptAsync(String(password || ''), Buffer.from(salt, 'base64url'), Buffer.from(expected, 'base64url').length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 64 * 1024 * 1024 });
    return safeEqual(Buffer.from(derived).toString('base64url'), expected);
  } catch { return false; }
}
async function bootstrapOwner() {
  if (bootstrapped) return bootstrapped;
  bootstrapped = (async () => {
    await store.ensureDatabase();
    const email = normalizeEmail(process.env.CMS_OWNER_EMAIL || process.env.CMS_USERNAME || (store.localMode() ? 'space-admin@localhost.test' : ''));
    const password = process.env.CMS_OWNER_PASSWORD || process.env.CMS_PASSWORD || (store.localMode() ? 'Space-Local-2026' : '');
    if (!email || !password) throw new Error('CMS_OWNER_EMAIL and CMS_OWNER_PASSWORD must be configured.');
    if (deployedProduction()) {
      const secrets = [process.env.CMS_SESSION_SECRET, process.env.CMS_CSRF_SECRET, process.env.CMS_OTP_SECRET];
      if (secrets.some(value => String(value || '').length < 32)) throw new Error('CMS session, CSRF and OTP secrets must each contain at least 32 characters.');
      if (new Set(secrets).size !== secrets.length) throw new Error('CMS session, CSRF and OTP secrets must be independent values.');
      const problem = passwordProblem(password); if (problem) throw new Error(`CMS_OWNER_PASSWORD: ${problem}`);
    }
    let user = await store.getUserByEmail(email);
    if (!user) user = await store.saveUser({ email, passwordHash: await hashPassword(password), role: 'owner', active: true });
    else if (!user.passwordHash) user = await store.saveUser({ ...user, passwordHash: await hashPassword(password), role: 'owner' });
    return user;
  })().catch(error => { bootstrapped = null; throw error; });
  return bootstrapped;
}
function cookieValue(req) {
  const cookies = String(req.headers.cookie || '').split(';').map(value => value.trim());
  const match = cookies.find(value => value.startsWith(`${COOKIE_NAME}=`));
  return match ? decodeURIComponent(match.slice(COOKIE_NAME.length + 1)) : '';
}
function setSessionCookie(res, token, maxAge = SESSION_SECONDS) {
  const secure = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return !req.headers['sec-fetch-site'] || ['same-origin', 'none'].includes(String(req.headers['sec-fetch-site']));
  const protocol = String(req.headers['x-forwarded-proto'] || (process.env.VERCEL ? 'https' : 'http')).split(',')[0];
  return origin === `${protocol}://${req.headers.host}`;
}
async function createSession(user) {
  const payload = Buffer.from(JSON.stringify({
    version: 2,
    userId: user.id,
    expiresAt: Date.now() + SESSION_SECONDS * 1000,
    credential: hashToken(`credential:${user.id}:${user.passwordHash}`),
    nonce: crypto.randomBytes(16).toString('base64url')
  })).toString('base64url');
  const token = `v2.${payload}.${signSessionValue(payload)}`, csrf = csrfForToken(token);
  return { token, csrf };
}
async function signedSession(token) {
  if (!String(token).startsWith('v2.')) return null;
  try {
    const [, payload, signature, ...extra] = String(token).split('.');
    if (!payload || !signature || extra.length || !safeEqual(signature, signSessionValue(payload))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (parsed.version !== 2 || !parsed.userId || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= Date.now()) return null;
    const user = await store.getUserById(String(parsed.userId));
    if (!user?.active || !safeEqual(parsed.credential, hashToken(`credential:${user.id}:${user.passwordHash}`))) return null;
    const csrf = csrfForToken(token);
    return {
      user,
      session: { userId:user.id, csrfHash:hashToken(csrf), expiresAt:new Date(parsed.expiresAt).toISOString(), stateless:true },
      tokenHash: hashToken(token),
      csrf,
      stateless: true
    };
  } catch { return null; }
}
async function currentAuth(req) {
  await bootstrapOwner();
  const token = cookieValue(req); if (!token) return null;
  const signed = await signedSession(token); if (signed) return signed;
  const session = await store.getSession(hashToken(token)); if (!session) return null;
  const user = await store.getUserById(session.userId); if (!user?.active) return null;
  return { user, session, tokenHash: hashToken(token), csrf: csrfForToken(token) };
}
async function requireAuth(req, options = {}) {
  const auth = await currentAuth(req);
  if (!auth) return { error: { status: 401, message: 'Authentication required.' } };
  if (options.owner && auth.user.role !== 'owner') return { error: { status: 403, message: 'Owner access is required.' } };
  if (options.mutation) {
    if (!sameOrigin(req)) return { error: { status: 403, message: 'Origin check failed.' } };
    const csrf = String(req.headers['x-cms-csrf'] || '');
    if (!csrf || !safeEqual(hashToken(csrf), auth.session.csrfHash)) return { error: { status: 403, message: 'Security token is missing or expired.' } };
  }
  return auth;
}
function otpHash(email, code) {
  const secret = process.env.CMS_OTP_SECRET || process.env.CMS_SESSION_SECRET || process.env.CMS_OWNER_PASSWORD || '';
  if (!secret) throw new Error('CMS_OTP_SECRET is not configured.');
  return crypto.createHmac('sha256', secret).update(`${normalizeEmail(email)}:${String(code)}`).digest('hex');
}
async function sendOtpEmail(email, code) {
  if (localDevelopment()) return { developmentCode: code };
  if (!process.env.RESEND_API_KEY || !process.env.CMS_EMAIL_FROM) throw new Error('CMS recovery email is not configured.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.CMS_EMAIL_FROM, to: [email], subject: 'Your Space CMS password reset code',
      text: `Your Space CMS verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
      html: `<div style="font-family:Arial,sans-serif;color:#171814;padding:24px"><p>Space Content Studio</p><h1 style="font-size:32px;letter-spacing:8px">${code}</h1><p>This code expires in 10 minutes. If you did not request a password reset, ignore this email.</p></div>` })
  });
  if (!response.ok) throw new Error('Unable to send the password reset email.');
  return {};
}

module.exports = {
  COOKIE_NAME, SESSION_SECONDS, PASSWORD_MIN_LENGTH, normalizeEmail, validEmail, requestIp,
  passwordProblem, hashPassword, verifyPassword, bootstrapOwner, createSession, currentAuth,
  requireAuth, setSessionCookie, sameOrigin, safeEqual, hashToken, otpHash, sendOtpEmail
};

const crypto = require('crypto');
const { isJobOpen } = require('./_cms');

const base64url = value => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

async function accessToken(credentials) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: 'RS256', typ: 'JWT' });
  const claim = base64url({ iss: credentials.client_email, scope: 'https://www.googleapis.com/auth/indexing', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
  const unsigned = `${header}.${claim}`;
  const signature = crypto.sign('RSA-SHA256', Buffer.from(unsigned), credentials.private_key).toString('base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }) });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error_description || 'Google authentication failed');
  return body.access_token;
}

async function notifyIndexing(previous, next, origin) {
  if (process.env.ENABLE_SEARCH_INDEXING !== '1' || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return { configured: false, notified: 0 };
  let credentials;
  try { credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON); } catch { return { configured: true, notified: 0, error: 'Invalid GOOGLE_SERVICE_ACCOUNT_JSON' }; }
  try {
    const token = await accessToken(credentials);
    const before = new Map(previous.jobs.filter(job => isJobOpen(job)).map(job => [job.slug, JSON.stringify(job)]));
    const after = new Map(next.jobs.filter(job => isJobOpen(job)).map(job => [job.slug, JSON.stringify(job)]));
    const notifications = [];
    after.forEach((value, slug) => { if (before.get(slug) !== value) notifications.push({ url: `${origin}/jobs/${slug}`, type: 'URL_UPDATED' }); });
    before.forEach((value, slug) => { if (!after.has(slug)) notifications.push({ url: `${origin}/jobs/${slug}`, type: 'URL_DELETED' }); });
    const results = await Promise.all(notifications.slice(0, 50).map(async item => {
      const response = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
      if (!response.ok) { const body = await response.text(); throw new Error(`Google Indexing ${response.status}: ${body.slice(0, 180)}`); }
      return item.url;
    }));
    return { configured: true, notified: results.length };
  } catch (error) { return { configured: true, notified: 0, error: error.message }; }
}

module.exports = { notifyIndexing };

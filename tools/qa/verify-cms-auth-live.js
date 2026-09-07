const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const origin = (process.env.CMS_LIVE_URL || 'https://space-tr-cms.vercel.app').replace(/\/$/, '');

function parseEnvironment(file) {
  const values = {};
  if (!fs.existsSync(file)) return values;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      try { value = JSON.parse(value); } catch { value = value.slice(1, -1); }
    }
    values[match[1]] = value;
  }
  return values;
}

async function jsonRequest(pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${pathname} returned ${response.status}: ${body.error || 'request failed'}`);
  return { response, body };
}

async function main() {
  const credentials = parseEnvironment(path.join(root, '.env.cms-login.local'));
  const previous = parseEnvironment(path.join(root, '.env.cms.runtime.local'));
  const login = await jsonRequest('/api/admin/login', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: credentials.CMS_OWNER_EMAIL, password: credentials.CMS_OWNER_PASSWORD }),
  });
  const cookie = login.response.headers.get('set-cookie')?.split(';')[0];
  if (!cookie || !login.body.csrf) throw new Error('Login did not return a secure session and CSRF token.');
  const headers = { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json', 'X-CMS-CSRF': login.body.csrf };
  const content = await jsonRequest('/api/admin/content', { headers });
  const users = await jsonRequest('/api/admin/users', { headers });

  let legacyDisabled = false;
  const legacyEmail = String(previous.CMS_USERNAME || '').trim().toLowerCase();
  if (process.env.DISABLE_LEGACY_CMS_OWNER === '1' && legacyEmail && legacyEmail !== credentials.CMS_OWNER_EMAIL.toLowerCase()) {
    const legacy = users.body.users?.find(user => user.email === legacyEmail && user.active);
    if (legacy) {
      await jsonRequest('/api/admin/users', { method: 'PATCH', headers, body: JSON.stringify({ email: legacyEmail, role: legacy.role, active: false }) });
      legacyDisabled = true;
    }
  }
  await jsonRequest('/api/admin/logout', { method: 'POST', headers, body: '{}' });
  console.log(JSON.stringify({
    authenticated: true,
    owner: login.body.user?.email,
    role: login.body.user?.role,
    contentVersion: content.body._meta?.version,
    authorisedUsers: users.body.users?.length || 0,
    legacyDisabled,
    sessionCookie: { httpOnly: /HttpOnly/i.test(login.response.headers.get('set-cookie') || ''), secure: /Secure/i.test(login.response.headers.get('set-cookie') || ''), sameSiteLax: /SameSite=Lax/i.test(login.response.headers.get('set-cookie') || ''), serverlessSafe: /^space_cms_session=v2\./.test(decodeURIComponent(cookie)) },
  }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fallbackContent = require('../data/cms-content.json');

const usesBlobDatabase = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN && !process.env.POSTGRES_URL && !process.env.DATABASE_URL && process.env.SPACE_CMS_LOCAL !== '1');
const LOCAL_FILE = process.env.SPACE_CMS_LOCAL_DATABASE || (usesBlobDatabase() ? path.join('/tmp', 'space-cms.database.json') : `${process.env.SPACE_CMS_LOCAL_CONTENT || path.join(__dirname, '..', 'data', 'cms-content.local.json')}.database.json`);
const localMode = () => process.env.SPACE_CMS_LOCAL === '1' || usesBlobDatabase();
const BLOB_DATABASE_PATH = 'space-cms/database.json';
const BLOB_DOCUMENT_PATH = 'space-cms/document.json';
const BLOB_ASSET_RECORD_PREFIX = 'space-cms/records/assets/';
let blobDatabaseReadyAt = 0;
let sqlClient;
let initialized;
const CONTENT_RESET_MIGRATION = '2026-08-remove-placeholder-jobs-and-posts';

function now() { return new Date().toISOString(); }
function initialLocalDatabase() {
  return {
    users: [], sessions: [], otps: [], resetTickets: [], rateLimits: [], assets: [],
    document: { key: 'site', draft: structuredClone(fallbackContent), published: structuredClone(fallbackContent), version: 1, updatedAt: now(), publishedAt: now() },
    revisions: [], audits: [], migrations: []
  };
}
function readLocal() {
  let data;
  try { data = { ...initialLocalDatabase(), ...JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')) }; }
  catch (error) { if (error.code !== 'ENOENT') throw error; data = initialLocalDatabase(); }
  if (!Array.isArray(data.migrations)) data.migrations = [];
  if (!data.migrations.includes(CONTENT_RESET_MIGRATION)) {
    [data.document?.draft, data.document?.published].forEach(state => {
      if (!state) return;
      state.jobs = [];
      state.posts = [];
    });
    data.migrations.push(CONTENT_RESET_MIGRATION);
    data.document.version = Number(data.document.version || 0) + 1;
    data.document.updatedAt = now();
    data.document.publishedAt = now();
    writeLocal(data);
  }
  return data;
}
function writeLocal(value) {
  fs.mkdirSync(path.dirname(LOCAL_FILE), { recursive: true });
  const temporary = `${LOCAL_FILE}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
  fs.renameSync(temporary, LOCAL_FILE);
}
async function hydrateBlobDatabase() {
  if (!usesBlobDatabase()) return;
  if (Date.now() - blobDatabaseReadyAt < 5000 && fs.existsSync(LOCAL_FILE)) return;
  const { list } = require('@vercel/blob');
  const listing = await list({ prefix: BLOB_DATABASE_PATH, limit: 10, token: process.env.BLOB_READ_WRITE_TOKEN });
  const existing = listing.blobs.find(blob => blob.pathname === BLOB_DATABASE_PATH);
  if (!existing) return;
  const response = await fetch(`${existing.url}?cms=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to read the CMS database.');
  const encrypted = await response.text();
  const [ivValue, tagValue, bodyValue] = encrypted.split('.');
  const secrets = [process.env.CMS_SESSION_SECRET, process.env.CMS_SESSION_SECRET_PREVIOUS].filter(Boolean);
  let contents = '';
  for (const secret of secrets) {
    try {
      const key = crypto.createHash('sha256').update(String(secret)).digest();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
      contents = Buffer.concat([decipher.update(Buffer.from(bodyValue, 'base64url')), decipher.final()]).toString('utf8');
      JSON.parse(contents);
      break;
    } catch { contents = ''; }
  }
  if (!contents) throw new Error('Unable to decrypt the CMS database. Refusing to replace stored content.');
  fs.writeFileSync(LOCAL_FILE, contents);
  blobDatabaseReadyAt = Date.now();
}
async function persistBlobDatabase() {
  if (!usesBlobDatabase()) return;
  const { put } = require('@vercel/blob');
  const key = crypto.createHash('sha256').update(String(process.env.CMS_SESSION_SECRET)).digest();
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(fs.readFileSync(LOCAL_FILE)), cipher.final()]);
  const payload = `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
  await put(BLOB_DATABASE_PATH, payload, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, addRandomSuffix: false, allowOverwrite: true, contentType: 'application/octet-stream', cacheControlMaxAge: 60 });
  blobDatabaseReadyAt = Date.now();
}
function decryptBlobPayload(encrypted) {
  const [ivValue, tagValue, bodyValue] = String(encrypted || '').split('.');
  const secrets = [process.env.CMS_SESSION_SECRET, process.env.CMS_SESSION_SECRET_PREVIOUS].filter(Boolean);
  for (const secret of secrets) {
    try {
      const key = crypto.createHash('sha256').update(String(secret)).digest();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivValue, 'base64url'));
      decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
      const contents = Buffer.concat([decipher.update(Buffer.from(bodyValue, 'base64url')), decipher.final()]).toString('utf8');
      return JSON.parse(contents);
    } catch {}
  }
  throw new Error('Unable to decrypt the CMS content document.');
}
function encryptBlobPayload(value) {
  const key = crypto.createHash('sha256').update(String(process.env.CMS_SESSION_SECRET)).digest();
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}
async function writeBlobDocument(bundle) {
  const { put } = require('@vercel/blob');
  await put(BLOB_DOCUMENT_PATH, encryptBlobPayload(bundle), { access:'public', token:process.env.BLOB_READ_WRITE_TOKEN, addRandomSuffix:false, allowOverwrite:true, contentType:'application/octet-stream', cacheControlMaxAge:60 });
}
async function readBlobDocument() {
  const { list } = require('@vercel/blob');
  const listing = await list({ prefix:BLOB_DOCUMENT_PATH, limit:10, token:process.env.BLOB_READ_WRITE_TOKEN });
  const existing = listing.blobs.find(blob => blob.pathname === BLOB_DOCUMENT_PATH);
  if (existing) {
    const response = await fetch(`${existing.url}?cms-document=${Date.now()}-${crypto.randomBytes(3).toString('hex')}`, { cache:'no-store' });
    if (!response.ok) throw new Error('Unable to read the CMS content document.');
    const bundle = decryptBlobPayload(await response.text());
    if (!bundle?.document) throw new Error('The CMS content document is invalid.');
    if (!Array.isArray(bundle.revisions)) bundle.revisions = [];
    return bundle;
  }
  await hydrateBlobDatabase();
  const legacy = readLocal(), bundle = { document:legacy.document, revisions:Array.isArray(legacy.revisions) ? legacy.revisions : [] };
  await writeBlobDocument(bundle);
  return bundle;
}
function withBlobSync(handler, mutation = false) {
  return async (...args) => {
    await hydrateBlobDatabase();
    const result = await handler(...args);
    if (mutation) await persistBlobDatabase();
    return result;
  };
}
function databaseUrl() { return process.env.POSTGRES_URL || process.env.DATABASE_URL || ''; }
async function sql() {
  if (localMode()) return null;
  const url = databaseUrl();
  if (!url) throw new Error('POSTGRES_URL or DATABASE_URL is required for the deployed CMS.');
  if (!sqlClient) {
    const postgres = require('postgres');
    const localDatabase = /(?:localhost|127\.0\.0\.1)/i.test(url);
    sqlClient = postgres(url, { max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false, ssl: localDatabase ? false : 'require' });
  }
  return sqlClient;
}
async function ensureDatabase() {
  if (localMode()) return;
  if (initialized) return initialized;
  initialized = (async () => {
    const db = await sql();
    await db`CREATE TABLE IF NOT EXISTS cms_users (
      id text PRIMARY KEY, email text UNIQUE NOT NULL, password_hash text NOT NULL DEFAULT '',
      role text NOT NULL CHECK (role IN ('owner','editor')), active boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`;
    await db`CREATE TABLE IF NOT EXISTS cms_sessions (
      token_hash text PRIMARY KEY, user_id text NOT NULL REFERENCES cms_users(id) ON DELETE CASCADE,
      csrf_hash text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await db`CREATE TABLE IF NOT EXISTS cms_password_otps (
      email text PRIMARY KEY, code_hash text NOT NULL, attempts integer NOT NULL DEFAULT 0,
      expires_at timestamptz NOT NULL, requested_at timestamptz NOT NULL DEFAULT now()
    )`;
    await db`CREATE TABLE IF NOT EXISTS cms_reset_tickets (
      token_hash text PRIMARY KEY, email text NOT NULL, expires_at timestamptz NOT NULL,
      used boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await db`CREATE TABLE IF NOT EXISTS cms_documents (
      key text PRIMARY KEY, draft jsonb NOT NULL, published jsonb NOT NULL, version integer NOT NULL DEFAULT 1,
      updated_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz NOT NULL DEFAULT now()
    )`;
    await db`CREATE TABLE IF NOT EXISTS cms_revisions (
      id bigserial PRIMARY KEY, document_key text NOT NULL, version integer NOT NULL, action text NOT NULL,
      state jsonb NOT NULL, actor_id text, created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await db`CREATE TABLE IF NOT EXISTS cms_audit (
      id bigserial PRIMARY KEY, actor_id text, event text NOT NULL, entity text NOT NULL,
      entity_id text, ip text, metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await db`CREATE TABLE IF NOT EXISTS cms_rate_limits (
      key text PRIMARY KEY, hits integer NOT NULL DEFAULT 0, window_start timestamptz NOT NULL DEFAULT now()
    )`;
    await db`CREATE TABLE IF NOT EXISTS cms_migrations (
      key text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
    )`;
    await db`CREATE TABLE IF NOT EXISTS cms_assets (
      id text PRIMARY KEY, pathname text UNIQUE NOT NULL, url text NOT NULL, name text NOT NULL,
      type text NOT NULL, size bigint NOT NULL DEFAULT 0, status text NOT NULL DEFAULT 'ready',
      checksum text NOT NULL DEFAULT '', width integer, height integer, duration numeric,
      variants jsonb NOT NULL DEFAULT '{}'::jsonb, tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      uploaded_by text, archived boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`;
    await db`CREATE INDEX IF NOT EXISTS cms_sessions_expiry_idx ON cms_sessions(expires_at)`;
    await db`CREATE INDEX IF NOT EXISTS cms_audit_created_idx ON cms_audit(created_at DESC)`;
    await db`INSERT INTO cms_documents (key,draft,published) VALUES ('site',${db.json(fallbackContent)},${db.json(fallbackContent)}) ON CONFLICT (key) DO NOTHING`;
    const migration = await db`INSERT INTO cms_migrations (key) VALUES (${CONTENT_RESET_MIGRATION}) ON CONFLICT (key) DO NOTHING RETURNING key`;
    if (migration.length) {
      await db`UPDATE cms_documents
        SET draft=jsonb_set(jsonb_set(draft,'{jobs}','[]'::jsonb,true),'{posts}','[]'::jsonb,true),
            published=jsonb_set(jsonb_set(published,'{jobs}','[]'::jsonb,true),'{posts}','[]'::jsonb,true),
            version=version+1,updated_at=now(),published_at=now()
        WHERE key='site'`;
    }
  })().catch(error => { initialized = null; throw error; });
  return initialized;
}

function normalizeUser(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, passwordHash: row.password_hash ?? row.passwordHash ?? '', role: row.role, active: row.active !== false, createdAt: row.created_at ?? row.createdAt, updatedAt: row.updated_at ?? row.updatedAt };
}
async function getUserByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (localMode()) return normalizeUser(readLocal().users.find(user => user.email === normalized));
  await ensureDatabase(); const db = await sql();
  return normalizeUser((await db`SELECT * FROM cms_users WHERE email=${normalized} LIMIT 1`)[0]);
}
async function getUserById(id) {
  if (localMode()) return normalizeUser(readLocal().users.find(user => user.id === id));
  await ensureDatabase(); const db = await sql();
  return normalizeUser((await db`SELECT * FROM cms_users WHERE id=${id} LIMIT 1`)[0]);
}
async function listUsers() {
  if (localMode()) return readLocal().users.map(normalizeUser).sort((a, b) => a.email.localeCompare(b.email));
  await ensureDatabase(); const db = await sql();
  return (await db`SELECT * FROM cms_users ORDER BY email`).map(normalizeUser);
}
async function saveUser(user) {
  const clean = { id: user.id || crypto.randomUUID(), email: String(user.email).trim().toLowerCase(), passwordHash: user.passwordHash || '', role: user.role === 'owner' ? 'owner' : 'editor', active: user.active !== false, createdAt: user.createdAt || now(), updatedAt: now() };
  if (localMode()) {
    const data = readLocal(), index = data.users.findIndex(item => item.id === clean.id || item.email === clean.email);
    if (index >= 0) data.users.splice(index, 1, clean); else data.users.push(clean);
    writeLocal(data); return normalizeUser(clean);
  }
  await ensureDatabase(); const db = await sql();
  const rows = await db`INSERT INTO cms_users (id,email,password_hash,role,active,created_at,updated_at)
    VALUES (${clean.id},${clean.email},${clean.passwordHash},${clean.role},${clean.active},${clean.createdAt},now())
    ON CONFLICT (email) DO UPDATE SET password_hash=excluded.password_hash,role=excluded.role,active=excluded.active,updated_at=now()
    RETURNING *`;
  return normalizeUser(rows[0]);
}

async function saveSession(session) {
  if (localMode()) { const data = readLocal(); data.sessions = data.sessions.filter(item => item.tokenHash !== session.tokenHash && Date.parse(item.expiresAt) > Date.now()); data.sessions.push(session); writeLocal(data); return; }
  await ensureDatabase(); const db = await sql();
  await db`DELETE FROM cms_sessions WHERE expires_at < now()`;
  await db`INSERT INTO cms_sessions (token_hash,user_id,csrf_hash,expires_at) VALUES (${session.tokenHash},${session.userId},${session.csrfHash},${session.expiresAt})`;
}
async function getSession(tokenHash) {
  if (localMode()) return readLocal().sessions.find(item => item.tokenHash === tokenHash && Date.parse(item.expiresAt) > Date.now()) || null;
  await ensureDatabase(); const db = await sql();
  const row = (await db`SELECT token_hash AS "tokenHash",user_id AS "userId",csrf_hash AS "csrfHash",expires_at AS "expiresAt" FROM cms_sessions WHERE token_hash=${tokenHash} AND expires_at > now() LIMIT 1`)[0];
  return row || null;
}
async function deleteSession(tokenHash) {
  if (localMode()) { const data = readLocal(); data.sessions = data.sessions.filter(item => item.tokenHash !== tokenHash); writeLocal(data); return; }
  await ensureDatabase(); const db = await sql(); await db`DELETE FROM cms_sessions WHERE token_hash=${tokenHash}`;
}
async function deleteUserSessions(userId) {
  if (localMode()) { const data = readLocal(); data.sessions = data.sessions.filter(item => item.userId !== userId); writeLocal(data); return; }
  await ensureDatabase(); const db = await sql(); await db`DELETE FROM cms_sessions WHERE user_id=${userId}`;
}

async function saveOtp(record) {
  if (localMode()) { const data = readLocal(); data.otps = data.otps.filter(item => item.email !== record.email); data.otps.push(record); writeLocal(data); return; }
  await ensureDatabase(); const db = await sql();
  await db`INSERT INTO cms_password_otps (email,code_hash,attempts,expires_at,requested_at) VALUES (${record.email},${record.codeHash},0,${record.expiresAt},now()) ON CONFLICT (email) DO UPDATE SET code_hash=excluded.code_hash,attempts=0,expires_at=excluded.expires_at,requested_at=now()`;
}
async function getOtp(email) {
  if (localMode()) return readLocal().otps.find(item => item.email === email) || null;
  await ensureDatabase(); const db = await sql();
  return (await db`SELECT email,code_hash AS "codeHash",attempts,expires_at AS "expiresAt",requested_at AS "requestedAt" FROM cms_password_otps WHERE email=${email} LIMIT 1`)[0] || null;
}
async function updateOtpAttempts(email, attempts) {
  if (localMode()) { const data = readLocal(), item = data.otps.find(entry => entry.email === email); if (item) item.attempts = attempts; writeLocal(data); return; }
  await ensureDatabase(); const db = await sql(); await db`UPDATE cms_password_otps SET attempts=${attempts} WHERE email=${email}`;
}
async function deleteOtp(email) {
  if (localMode()) { const data = readLocal(); data.otps = data.otps.filter(item => item.email !== email); writeLocal(data); return; }
  await ensureDatabase(); const db = await sql(); await db`DELETE FROM cms_password_otps WHERE email=${email}`;
}
async function saveResetTicket(ticket) {
  if (localMode()) { const data = readLocal(); data.resetTickets = data.resetTickets.filter(item => item.tokenHash !== ticket.tokenHash && Date.parse(item.expiresAt) > Date.now()); data.resetTickets.push(ticket); writeLocal(data); return; }
  await ensureDatabase(); const db = await sql();
  await db`INSERT INTO cms_reset_tickets (token_hash,email,expires_at) VALUES (${ticket.tokenHash},${ticket.email},${ticket.expiresAt})`;
}
async function consumeResetTicket(tokenHash) {
  if (localMode()) {
    const data = readLocal(), ticket = data.resetTickets.find(item => item.tokenHash === tokenHash && !item.used && Date.parse(item.expiresAt) > Date.now());
    if (!ticket) return null; ticket.used = true; writeLocal(data); return ticket;
  }
  await ensureDatabase(); const db = await sql();
  return (await db`UPDATE cms_reset_tickets SET used=true WHERE token_hash=${tokenHash} AND used=false AND expires_at > now() RETURNING email,expires_at AS "expiresAt"`)[0] || null;
}

function normalizeDocument(row) {
  if (!row) return null;
  return { key: row.key, draft: row.draft, published: row.published, version: Number(row.version), updatedAt: row.updated_at ?? row.updatedAt, publishedAt: row.published_at ?? row.publishedAt };
}
async function getDocument() {
  if (usesBlobDatabase()) return normalizeDocument((await readBlobDocument()).document);
  if (localMode()) return normalizeDocument(readLocal().document);
  await ensureDatabase(); const db = await sql();
  return normalizeDocument((await db`SELECT * FROM cms_documents WHERE key='site'`)[0]);
}
async function saveDocumentDraft(state, actorId, action = 'save-draft', expectedVersion) {
  if (usesBlobDatabase()) {
    const bundle = await readBlobDocument(), current = normalizeDocument(bundle.document);
    if (expectedVersion && Number(current.version) !== Number(expectedVersion)) { const error = new Error('This draft changed in another session. Reload before saving.'); error.status = 409; throw error; }
    const version = Number(current.version || 0) + 1, timestamp = now();
    bundle.document = { ...bundle.document, draft:state, version, updatedAt:timestamp };
    bundle.revisions.unshift({ id:crypto.randomUUID(), documentKey:'site', version, action, state, actorId, createdAt:timestamp });
    bundle.revisions = bundle.revisions.slice(0, 100);
    await writeBlobDocument(bundle);
    return normalizeDocument(bundle.document);
  }
  if (localMode()) {
    const data = readLocal();
    if (expectedVersion && Number(data.document.version) !== Number(expectedVersion)) { const error = new Error('This draft changed in another session. Reload before saving.'); error.status = 409; throw error; }
    const version = Number(data.document.version || 0) + 1;
    data.document = { ...data.document, draft: state, version, updatedAt: now() };
    data.revisions.unshift({ id: crypto.randomUUID(), documentKey: 'site', version, action, state, actorId, createdAt: now() });
    data.revisions = data.revisions.slice(0, 100); writeLocal(data); return normalizeDocument(data.document);
  }
  await ensureDatabase(); const db = await sql();
  return db.begin(async transaction => {
    const rows = expectedVersion
      ? await transaction`UPDATE cms_documents SET draft=${transaction.json(state)},version=version+1,updated_at=now() WHERE key='site' AND version=${Number(expectedVersion)} RETURNING *`
      : await transaction`UPDATE cms_documents SET draft=${transaction.json(state)},version=version+1,updated_at=now() WHERE key='site' RETURNING *`;
    const row = rows[0];
    if (!row) { const error = new Error('This draft changed in another session. Reload before saving.'); error.status = 409; throw error; }
    await transaction`INSERT INTO cms_revisions (document_key,version,action,state,actor_id) VALUES ('site',${row.version},${action},${transaction.json(state)},${actorId || null})`;
    await transaction`DELETE FROM cms_revisions WHERE id IN (SELECT id FROM cms_revisions WHERE document_key='site' ORDER BY created_at DESC OFFSET 100)`;
    return normalizeDocument(row);
  });
}
async function publishDocument(draftState, actorId, publishedState = draftState, expectedVersion) {
  if (usesBlobDatabase()) {
    const bundle = await readBlobDocument(), current = normalizeDocument(bundle.document);
    if (expectedVersion && Number(current.version) !== Number(expectedVersion)) { const error = new Error('This draft changed in another session. Reload before publishing.'); error.status = 409; throw error; }
    const version = Number(current.version || 0) + 1, timestamp = now();
    bundle.document = { ...bundle.document, draft:draftState, published:publishedState, version, updatedAt:timestamp, publishedAt:timestamp };
    bundle.revisions.unshift({ id:crypto.randomUUID(), documentKey:'site', version, action:'publish', state:publishedState, actorId, createdAt:timestamp });
    bundle.revisions = bundle.revisions.slice(0, 100);
    await writeBlobDocument(bundle);
    return normalizeDocument(bundle.document);
  }
  if (localMode()) {
    const data = readLocal();
    if (expectedVersion && Number(data.document.version) !== Number(expectedVersion)) { const error = new Error('This draft changed in another session. Reload before publishing.'); error.status = 409; throw error; }
    const version = Number(data.document.version || 0) + 1;
    data.document = { ...data.document, draft: draftState, published: publishedState, version, updatedAt: now(), publishedAt: now() };
    data.revisions.unshift({ id: crypto.randomUUID(), documentKey: 'site', version, action: 'publish', state: publishedState, actorId, createdAt: now() });
    data.revisions = data.revisions.slice(0, 100); writeLocal(data); return normalizeDocument(data.document);
  }
  await ensureDatabase(); const db = await sql();
  return db.begin(async transaction => {
    const rows = expectedVersion
      ? await transaction`UPDATE cms_documents SET draft=${transaction.json(draftState)},published=${transaction.json(publishedState)},version=version+1,updated_at=now(),published_at=now() WHERE key='site' AND version=${Number(expectedVersion)} RETURNING *`
      : await transaction`UPDATE cms_documents SET draft=${transaction.json(draftState)},published=${transaction.json(publishedState)},version=version+1,updated_at=now(),published_at=now() WHERE key='site' RETURNING *`;
    const row = rows[0];
    if (!row) { const error = new Error('This draft changed in another session. Reload before publishing.'); error.status = 409; throw error; }
    await transaction`INSERT INTO cms_revisions (document_key,version,action,state,actor_id) VALUES ('site',${row.version},'publish',${transaction.json(publishedState)},${actorId || null})`;
    return normalizeDocument(row);
  });
}
async function listRevisions(limit = 30) {
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  if (usesBlobDatabase()) return (await readBlobDocument()).revisions.slice(0, safeLimit).map(item => ({ ...item, state:undefined }));
  if (localMode()) return readLocal().revisions.slice(0, safeLimit).map(item => ({ ...item, state: undefined }));
  await ensureDatabase(); const db = await sql();
  return db`SELECT id,version,action,actor_id AS "actorId",created_at AS "createdAt" FROM cms_revisions WHERE document_key='site' ORDER BY created_at DESC LIMIT ${safeLimit}`;
}
async function getRevision(id) {
  if (usesBlobDatabase()) return (await readBlobDocument()).revisions.find(item => String(item.id) === String(id)) || null;
  if (localMode()) return readLocal().revisions.find(item => String(item.id) === String(id)) || null;
  await ensureDatabase(); const db = await sql();
  return (await db`SELECT id,version,action,state,actor_id AS "actorId",created_at AS "createdAt" FROM cms_revisions WHERE id=${String(id)} AND document_key='site' LIMIT 1`)[0] || null;
}
async function addAudit(entry) {
  const record = { id: crypto.randomUUID(), actorId: entry.actorId || null, event: entry.event, entity: entry.entity || 'cms', entityId: entry.entityId || null, ip: entry.ip || '', metadata: entry.metadata || {}, createdAt: now() };
  if (localMode()) { const data = readLocal(); data.audits.unshift(record); data.audits = data.audits.slice(0, 500); writeLocal(data); return record; }
  await ensureDatabase(); const db = await sql();
  await db`INSERT INTO cms_audit (actor_id,event,entity,entity_id,ip,metadata) VALUES (${record.actorId},${record.event},${record.entity},${record.entityId},${record.ip},${db.json(record.metadata)})`;
  return record;
}
async function listAudits(limit = 100) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  if (localMode()) return readLocal().audits.slice(0, safeLimit);
  await ensureDatabase(); const db = await sql();
  return db`SELECT id,actor_id AS "actorId",event,entity,entity_id AS "entityId",ip,metadata,created_at AS "createdAt" FROM cms_audit ORDER BY created_at DESC LIMIT ${safeLimit}`;
}

function normalizeAsset(row) {
  if (!row) return null;
  return {
    id: row.id, pathname: row.pathname, url: row.url, name: row.name, type: row.type,
    size: Number(row.size || 0), status: row.status || 'ready', checksum: row.checksum || '',
    width: row.width == null ? null : Number(row.width), height: row.height == null ? null : Number(row.height),
    duration: row.duration == null ? null : Number(row.duration), variants: row.variants || {}, tags: row.tags || [],
    uploadedBy: row.uploaded_by ?? row.uploadedBy ?? null, archived: row.archived === true,
    createdAt: row.created_at ?? row.createdAt, updatedAt: row.updated_at ?? row.updatedAt
  };
}
async function listBlobAssetRecords(limit) {
  const { list } = require('@vercel/blob'), blobs = []; let cursor;
  do {
    const page = await list({ prefix: BLOB_ASSET_RECORD_PREFIX, limit: Math.min(1000, limit - blobs.length), cursor, token: process.env.BLOB_READ_WRITE_TOKEN });
    blobs.push(...page.blobs); cursor = page.hasMore && blobs.length < limit ? page.cursor : undefined;
  } while (cursor && blobs.length < limit);
  const records = [];
  for (let index = 0; index < blobs.length; index += 40) {
    const batch = await Promise.all(blobs.slice(index, index + 40).map(async blob => {
      try { const response = await fetch(`${blob.url}?cms=${Date.now()}`, { cache: 'no-store' }); return response.ok ? normalizeAsset(await response.json()) : null; }
      catch { return null; }
    }));
    records.push(...batch.filter(Boolean));
  }
  return records;
}
async function saveBlobAssetRecord(record) {
  const { put } = require('@vercel/blob'), key = String(record.id || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, '');
  await put(`${BLOB_ASSET_RECORD_PREFIX}${key}.json`, JSON.stringify(record), { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN, addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', cacheControlMaxAge: 60 });
  return record;
}
async function listAssets(limit = 1000) {
  const safeLimit = Math.min(Math.max(Number(limit) || 1000, 1), 5000);
  if (usesBlobDatabase()) {
    await hydrateBlobDatabase();
    const legacy = (readLocal().assets || []).map(normalizeAsset), records = await listBlobAssetRecords(safeLimit), merged = new Map();
    legacy.forEach(item => merged.set(item.id || item.pathname, item)); records.forEach(item => merged.set(item.id || item.pathname, item));
    return [...merged.values()].filter(item => !item.archived).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, safeLimit);
  }
  if (localMode()) return (readLocal().assets || []).filter(item => !item.archived).map(normalizeAsset).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, safeLimit);
  await ensureDatabase(); const db = await sql();
  return (await db`SELECT * FROM cms_assets WHERE archived=false ORDER BY created_at DESC LIMIT ${safeLimit}`).map(normalizeAsset);
}
async function saveAsset(asset) {
  const record = normalizeAsset({ ...asset, id: asset.id || crypto.randomUUID(), createdAt: asset.createdAt || now(), updatedAt: now() });
  if (usesBlobDatabase()) return saveBlobAssetRecord(record);
  if (localMode()) {
    const data = readLocal(); if (!Array.isArray(data.assets)) data.assets = [];
    const index = data.assets.findIndex(item => item.id === record.id || item.pathname === record.pathname || item.url === record.url);
    if (index >= 0) data.assets.splice(index, 1, { ...data.assets[index], ...record, updatedAt: now() }); else data.assets.unshift(record);
    writeLocal(data); return record;
  }
  await ensureDatabase(); const db = await sql();
  const rows = await db`INSERT INTO cms_assets (id,pathname,url,name,type,size,status,checksum,width,height,duration,variants,tags,uploaded_by,archived,created_at,updated_at)
    VALUES (${record.id},${record.pathname},${record.url},${record.name},${record.type},${record.size},${record.status},${record.checksum},${record.width},${record.height},${record.duration},${db.json(record.variants)},${db.json(record.tags)},${record.uploadedBy},${record.archived},${record.createdAt},now())
    ON CONFLICT (pathname) DO UPDATE SET url=excluded.url,name=excluded.name,type=excluded.type,size=excluded.size,status=excluded.status,checksum=excluded.checksum,width=excluded.width,height=excluded.height,duration=excluded.duration,variants=excluded.variants,tags=excluded.tags,uploaded_by=excluded.uploaded_by,archived=excluded.archived,updated_at=now() RETURNING *`;
  return normalizeAsset(rows[0]);
}
async function archiveAsset(id) {
  if (usesBlobDatabase()) { const item = (await listAssets(5000)).find(asset => asset.id === id || asset.url === id); if (item) await saveBlobAssetRecord({ ...item, archived: true, updatedAt: now() }); return; }
  if (localMode()) { const data = readLocal(), item = (data.assets || []).find(asset => asset.id === id || asset.url === id); if (item) { item.archived = true; item.updatedAt = now(); writeLocal(data); } return; }
  await ensureDatabase(); const db = await sql(); await db`UPDATE cms_assets SET archived=true,updated_at=now() WHERE id=${id} OR url=${id}`;
}

async function deleteAsset(id) {
  if (usesBlobDatabase()) {
    const { del } = require('@vercel/blob'), key = String(id || '').replace(/[^a-zA-Z0-9_-]/g, '');
    if (key) await del(`${BLOB_ASSET_RECORD_PREFIX}${key}.json`, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return;
  }
  if (localMode()) { const data = readLocal(); data.assets = (data.assets || []).filter(asset => asset.id !== id); writeLocal(data); return; }
  await ensureDatabase(); const db = await sql(); await db`DELETE FROM cms_assets WHERE id=${id}`;
}

async function consumeRateLimit(key, limit, windowMs) {
  const current = Date.now();
  if (localMode()) {
    const data = readLocal();
    let record = data.rateLimits.find(item => item.key === key);
    if (!record || current - Date.parse(record.windowStart) >= windowMs) {
      record = { key, hits: 0, windowStart: now() };
      data.rateLimits = data.rateLimits.filter(item => item.key !== key);
      data.rateLimits.push(record);
    }
    record.hits += 1;
    data.rateLimits = data.rateLimits.filter(item => current - Date.parse(item.windowStart) < Math.max(windowMs, 86400000));
    writeLocal(data);
    return { allowed: record.hits <= limit, remaining: Math.max(0, limit - record.hits), retryAfter: Math.max(1, Math.ceil((windowMs - (current - Date.parse(record.windowStart))) / 1000)) };
  }
  await ensureDatabase(); const db = await sql();
  const seconds = Math.ceil(windowMs / 1000);
  const row = (await db`INSERT INTO cms_rate_limits (key,hits,window_start) VALUES (${key},1,now())
    ON CONFLICT (key) DO UPDATE SET
      hits=CASE WHEN cms_rate_limits.window_start < now() - (${seconds} * interval '1 second') THEN 1 ELSE cms_rate_limits.hits + 1 END,
      window_start=CASE WHEN cms_rate_limits.window_start < now() - (${seconds} * interval '1 second') THEN now() ELSE cms_rate_limits.window_start END
    RETURNING hits,window_start AS "windowStart"`)[0];
  const elapsed = current - Date.parse(row.windowStart);
  return { allowed: row.hits <= limit, remaining: Math.max(0, limit - row.hits), retryAfter: Math.max(1, Math.ceil((windowMs - elapsed) / 1000)) };
}

module.exports = {
  localMode, ensureDatabase,
  getUserByEmail: withBlobSync(getUserByEmail), getUserById: withBlobSync(getUserById), listUsers: withBlobSync(listUsers), saveUser: withBlobSync(saveUser, true),
  saveSession: withBlobSync(saveSession, true), getSession: withBlobSync(getSession), deleteSession: withBlobSync(deleteSession, true), deleteUserSessions: withBlobSync(deleteUserSessions, true),
  saveOtp: withBlobSync(saveOtp, true), getOtp: withBlobSync(getOtp), updateOtpAttempts: withBlobSync(updateOtpAttempts, true), deleteOtp: withBlobSync(deleteOtp, true), saveResetTicket: withBlobSync(saveResetTicket, true), consumeResetTicket: withBlobSync(consumeResetTicket, true),
  getDocument, saveDocumentDraft, publishDocument, listRevisions, getRevision,
  addAudit: withBlobSync(addAudit, true), listAudits: withBlobSync(listAudits), consumeRateLimit: withBlobSync(consumeRateLimit, true),
  listAssets, saveAsset, archiveAsset, deleteAsset
};

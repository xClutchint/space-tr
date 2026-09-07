const { send, requireAuth } = require('../_cms');
const store = require('../_store');
const fs = require('fs');
const path = require('path');

async function assetManifest() {
  if (store.localMode()) {
    const root = process.env.SPACE_CMS_LOCAL_ASSET_ROOT || path.join(__dirname, '..', '..', 'assets', 'media', 'cms', 'uploads');
    try { return fs.readdirSync(root, { withFileTypes: true }).filter(entry => entry.isFile()).map(entry => { const stats = fs.statSync(path.join(root, entry.name)); return { pathname: entry.name, size: stats.size, uploadedAt: stats.birthtime.toISOString() }; }); }
    catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return [];
  const { list } = await import('@vercel/blob');
  const result = await list({ prefix: 'space-cms/assets/', limit: 1000, token: process.env.BLOB_READ_WRITE_TOKEN });
  return result.blobs.map(blob => ({ pathname: blob.pathname, url: blob.url, size: blob.size, uploadedAt: blob.uploadedAt }));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
  const authentication = await requireAuth(req, { owner: true });
  if (authentication.error) return send(res, authentication.error.status, { error: authentication.error.message });
  const [document, revisions, users, assets] = await Promise.all([store.getDocument(), store.listRevisions(500), store.listUsers(), assetManifest()]);
  const backup = { format: 'space-cms-backup', version: 2, exportedAt: new Date().toISOString(), document, revisions, assets, users: users.map(user => ({ id: user.id, email: user.email, role: user.role, active: user.active, createdAt: user.createdAt, updatedAt: user.updatedAt })) };
  res.setHeader('Content-Disposition', `attachment; filename="space-cms-backup-${new Date().toISOString().slice(0, 10)}.json"`);
  return send(res, 200, backup);
};

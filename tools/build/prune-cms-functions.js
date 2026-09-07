const { existsSync, readdirSync, renameSync } = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..', '.vercel', 'output', 'functions', 'api');
const allowed = new Set([
  'admin/[action].func',
  'cron/editorial.func',
  'health.func',
  'preview-state.func',
  'v1/[endpoint].func'
]);

function walk(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(directory, entry.name);
    if (!entry.isDirectory()) return [];
    if (entry.name.endsWith('.func')) return [absolute];
    return walk(absolute);
  });
}

const functions = walk(root);
if (!functions.length) throw new Error('No prebuilt Vercel functions found. Run `vercel build` first.');

for (const directory of functions) {
  const relative = path.relative(root, directory).replaceAll('\\', '/');
  if (allowed.has(relative)) continue;
  const excluded = `${directory}.excluded`;
  if (!existsSync(excluded)) renameSync(directory, excluded);
}

const remaining = walk(root).map(directory => path.relative(root, directory).replaceAll('\\', '/'));
const unexpected = remaining.filter(relative => !allowed.has(relative));
if (unexpected.length || remaining.length > 12) throw new Error(`Unsafe CMS function bundle: ${remaining.join(', ')}`);
console.log(`CMS deployment bundle contains ${remaining.length} private functions: ${remaining.join(', ')}`);

const assert = require('node:assert/strict');
process.env.SPACE_CMS_LOCAL = '1';
const handler = require('../../api/job');
const content = require('../../data/cms-content.json');
const { isJobOpen, sanitizeState } = require('../../api/_cms');

function render(slug) {
  return new Promise((resolve, reject) => {
    const headers = {};
    const response = {
      statusCode: 200,
      setHeader(name, value) { headers[name.toLowerCase()] = value; },
      end(body) { resolve({ statusCode: this.statusCode, headers, body: String(body || '') }); }
    };
    Promise.resolve(handler({ query: { slug }, headers: { host: 'www.space-tr.com', 'x-forwarded-proto': 'https' } }, response)).catch(reject);
  });
}

async function main() {
  const synthetic = sanitizeState({ jobs: [
    { id:'onsite', title:'On-site role', workplaceType:'HYBRID', location:'Nairobi, Kenya', description:'Role', datePosted:'2026-09-01' },
    { id:'remote', title:'Remote role', workplaceType:'REMOTE', location:'Old location', description:'Role', datePosted:'2026-09-01' }
  ] }).jobs;
  assert.equal(synthetic[0].locality, 'Nairobi');
  assert.equal(synthetic[0].country, 'Kenya');
  assert.equal(synthetic[1].location, 'Remote');
  assert.equal(synthetic[1].locality, '');

  const jobs = content.jobs.filter(job => isJobOpen(job));
  if (!jobs.length) {
    const missing = await render('no-open-position');
    assert.equal(missing.statusCode, 404, 'An empty careers catalogue must not expose a stale job route.');
  }

  for (const job of jobs) {
    const page = await render(job.slug);
    assert.equal(page.statusCode, 200, `${job.slug} should render successfully.`);
    const script = page.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    assert.ok(script, `${job.slug} must include JobPosting JSON-LD.`);
    const schema = JSON.parse(script[1]);
    assert.equal(schema['@type'], 'JobPosting');
    assert.equal(schema.title, job.title);
    assert.equal(schema.datePosted, job.datePosted);
    assert.equal(schema.employmentType, job.employmentType);
    assert.equal(schema.jobLocation.address.addressCountry, job.countryCode);
    assert.ok(schema.description.includes(job.description), 'The structured description must include the visible role description.');
    assert.ok(schema.hiringOrganization.logo.endsWith('/favicon.png'), 'Google Jobs must use the black-on-white SPACE mark.');
    assert.ok(page.body.includes('>Positions</a>') && page.body.includes('>Home</a>'), 'Each job page must expose Positions and Home navigation.');
    assert.ok(page.body.indexOf('Qualifications') < page.body.indexOf('Apply by email'), 'The apply action must follow the role specifications.');
    assert.ok(!page.body.includes('job-aside') && !page.body.includes('job-hero'), 'Legacy boxed job layouts must not return.');
  }

  assert.equal(isJobOpen({ active: true, validThrough: '2000-01-01T00:00:00Z' }), false, 'Expired jobs must close automatically.');
  assert.equal(isJobOpen({ active: false }), false, 'Draft jobs must remain private.');
  console.log(jobs.length
    ? `Validated ${jobs.length} server-rendered Google Jobs posting${jobs.length === 1 ? '' : 's'}.`
    : 'Validated the empty careers state and closed job routes.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });

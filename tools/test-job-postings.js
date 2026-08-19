const assert = require('node:assert/strict');
const handler = require('../api/job');
const content = require('../data/cms-content.json');
const { isJobOpen } = require('../api/_cms');

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
  const jobs = content.jobs.filter(job => isJobOpen(job));
  assert.ok(jobs.length, 'At least one open job is required for the schema test.');

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
    assert.ok(schema.hiringOrganization.logo.endsWith('/brand%20kit/identity/Space%20Logo-07.jpg'), 'Google Jobs must use the square Space logo.');
    assert.ok(page.body.includes('>Positions</a>') && page.body.includes('>Home</a>'), 'Each job page must expose Positions and Home navigation.');
    assert.ok(page.body.indexOf('Qualifications') < page.body.indexOf('Apply by email'), 'The apply action must follow the role specifications.');
    assert.ok(!page.body.includes('job-aside') && !page.body.includes('job-hero'), 'Legacy boxed job layouts must not return.');
  }

  assert.equal(isJobOpen({ active: true, validThrough: '2000-01-01T00:00:00Z' }), false, 'Expired jobs must close automatically.');
  assert.equal(isJobOpen({ active: false }), false, 'Draft jobs must remain private.');
  console.log(`Validated ${jobs.length} server-rendered Google Jobs posting${jobs.length === 1 ? '' : 's'}.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '../..');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'space-cms-test-'));
const port = 32000 + Math.floor(Math.random() * 1000), origin = `http://localhost:${port}`;
const ownerEmail = 'owner@example.test', ownerPassword = 'Secure-Owner-2026', ingestKey = 'cms-test-blog-ingest-key';
const child = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT:String(port), CMS_OWNER_EMAIL:ownerEmail, CMS_OWNER_PASSWORD:ownerPassword,
    CMS_SESSION_SECRET:'cms-test-session-secret-long', CMS_CSRF_SECRET:'cms-test-csrf-secret-long', CMS_OTP_SECRET:'cms-test-otp-secret-long',
    CMS_API_KEY:ingestKey, CMS_PREVIEW_SECRET:'cms-test-preview-secret-at-least-thirty-two-characters', PUBLIC_SITE_URL:origin,
    OPENAI_API_KEY:'', SPACE_CMS_LOCAL_CONTENT:path.join(temporary,'content.json'), SPACE_CMS_LOCAL_ASSET_ROOT:path.join(temporary,'uploads') },
  stdio:['ignore','pipe','pipe']
});
const waitForServer = () => new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Local CMS server did not start.')),15000);child.once('error',reject);child.stdout.on('data',chunk=>{if(String(chunk).includes('Space site running')){clearTimeout(timer);resolve()}});child.stderr.on('data',chunk=>process.stderr.write(chunk))});
const json = async response => ({ response, body:await response.json().catch(()=>({})) });
async function request(url, options={}) { return json(await fetch(origin+url,options)); }
async function login(email,password) {
  const result=await request('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email,password})});
  return {...result, cookie:String(result.response.headers.get('set-cookie')||'').split(';')[0], setCookie:String(result.response.headers.get('set-cookie')||'')};
}
const headersFor = session => ({Cookie:session.cookie,Origin:origin,'X-CMS-CSRF':session.body.csrf,'Content-Type':'application/json'});
const media = id => ({id,url:`/assets/media/test/${id}.jpg`,type:'image',alt:`Test ${id}`,orientation:'vertical',source:'library'});

async function run() {
  await waitForServer();
  const deploymentConfig=JSON.parse(fs.readFileSync(path.join(root,'tools','build','vercel.cms.json'),'utf8'));
  const contentSecurityPolicy=deploymentConfig.headers.flatMap(rule=>rule.headers).find(header=>header.key==='Content-Security-Policy')?.value||'';
  assert.match(contentSecurityPolicy,/connect-src[^;]*https:\/\/vercel\.com(?:\s|;)/,'CMS uploads must allow the Vercel Blob transfer endpoint.');
  const studioSource=fs.readFileSync(path.join(root,'cms','assets','scripts','studio.js'),'utf8');
  assert.match(studioSource,/Math\.min\(4,files\.length\)/,'Asset batches must use bounded concurrent uploads.');
  assert.match(studioSource,/watchProcessing\(successful\.map/,'Asset processing must refresh in the background.');
  assert.match(studioSource,/files\.length>50/,'Asset batches must be capped at 50 supported files.');
  assert.match(studioSource,/filesFromDrop/,'Dropped folders must be traversed.');
  assert.match(studioSource,/void saveDraft\(\{silent:true\}\)/,'Carousel drag ordering must autosave immediately.');
  assert.match(studioSource,/carousel order was not stored/i,'Publishing must verify the stored carousel order.');
  assert.match(studioSource,/maxlength:300/,'Post excerpts must expose a visible hard limit.');
  assert.match(studioSource,/maxlength:70/,'SEO titles must expose a character counter and hard limit.');
  assert.doesNotMatch(studioSource,/field\('topic'/,'The post editor must not ask for a topic.');
  assert.doesNotMatch(studioSource,/field\('relatedBrands'/,'The post editor must not ask for related brands.');
  assert.doesNotMatch(studioSource,/field\('published'/,'Articles must only publish through the global CMS action.');
  let result=await request('/cms/');
  assert.equal(result.response.status,200); const cmsHtml=await (await fetch(origin+'/cms/')).text();
  assert.match(cmsHtml,/desktop-required-title/); assert.match(cmsHtml,/Forgot password/); assert.match(cmsHtml,/Hero media/); assert.match(cmsHtml,/data-section="carousel"/); assert.match(cmsHtml,/data-upload-folder/); assert.match(cmsHtml,/webkitdirectory/); assert.match(cmsHtml,/data-brand-crop-dialog/); assert.match(cmsHtml,/data-crop-handle="se"/);
  assert.match(cmsHtml,/data-section="api-guide"/); assert.match(cmsHtml,/GET \/api\/v1\/openapi/); assert.match(cmsHtml,/Never call \/api\/v1\/publish unless/);
  assert.doesNotMatch(cmsHtml,/data-section="overview"/); assert.doesNotMatch(cmsHtml,/data-section="security"/); assert.doesNotMatch(cmsHtml,/data-section="history"/);
  result=await request('/api/health'); assert.equal(result.response.status,200); assert.equal(result.body.status,'ok');
  result=await request('/api/admin/content'); assert.equal(result.response.status,401,'CMS content must require a session.');
  result=await request('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://attacker.invalid'},body:JSON.stringify({email:ownerEmail,password:ownerPassword})});
  assert.equal(result.response.status,403,'Cross-origin login attempts must be rejected.');
  result=await login(ownerEmail,'Wrong-password-2026'); assert.equal(result.response.status,401);
  const owner=await login(ownerEmail,ownerPassword); assert.equal(owner.response.status,200); assert.match(owner.cookie,/^space_cms_session=/);
  assert.match(owner.setCookie,/HttpOnly/i); assert.match(owner.setCookie,/SameSite=Lax/i); assert.match(decodeURIComponent(owner.cookie),/space_cms_session=v2\./); assert.equal(owner.body.user.role,'owner');
  result=await request('/api/admin/translate',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({role:'Founder',bio:['Profile']})}); assert.equal(result.response.status,401);
  result=await request('/api/admin/translate',{method:'POST',headers:headersFor(owner),body:JSON.stringify({role:'Founder',bio:['Profile']})}); assert.equal(result.response.status,503); assert.match(result.body.error,/not connected/i);

  result=await request('/api/admin/content',{headers:{Cookie:owner.cookie,Origin:origin}}); assert.equal(result.response.status,200);
  let state=result.body, version=state._meta.version; assert.equal(state._session.user.email,ownerEmail); assert.ok(state.team.every(person=>person.roleFr&&person.bioFr.length),'Seed team profiles must include French content.');
  delete state._session;
  result=await request('/api/admin/content',{method:'PUT',headers:{Cookie:owner.cookie,Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({state,expectedVersion:version})});
  assert.equal(result.response.status,403,'State mutations without CSRF must be rejected.');

  result=await request('/api/admin/users',{method:'POST',headers:headersFor(owner),body:JSON.stringify({email:'editor@example.test',role:'editor'})});
  assert.equal(result.response.status,201); assert.equal(result.body.user.active,true);
  result=await request('/api/admin/password-request',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email:'unknown@example.test'})});
  assert.equal(result.response.status,200); assert.equal(result.body.developmentCode,undefined,'Unknown accounts must not receive or reveal OTPs.');
  result=await request('/api/admin/password-request',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email:'editor@example.test'})});
  assert.equal(result.response.status,200); assert.match(result.body.developmentCode,/^\d{6}$/); const otp=result.body.developmentCode;
  let verified=await request('/api/admin/password-verify',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email:'editor@example.test',otp:'000000'})}); assert.equal(verified.response.status,400);
  verified=await request('/api/admin/password-verify',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({email:'editor@example.test',otp})}); assert.equal(verified.response.status,200);
  result=await request('/api/admin/password-reset',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({resetToken:verified.body.resetToken,password:'weak',confirmPassword:'weak'})}); assert.equal(result.response.status,400);
  const editorPassword='Secure-Editor-2026';
  result=await request('/api/admin/password-reset',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({resetToken:verified.body.resetToken,password:editorPassword,confirmPassword:editorPassword})}); assert.equal(result.response.status,200);
  result=await request('/api/admin/password-reset',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({resetToken:verified.body.resetToken,password:editorPassword,confirmPassword:editorPassword})}); assert.equal(result.response.status,400,'Reset tickets must be one-time use.');
  const editor=await login('editor@example.test',editorPassword); assert.equal(editor.response.status,200); assert.equal(editor.body.user.role,'editor');
  result=await request('/api/admin/users',{headers:{Cookie:editor.cookie,Origin:origin}}); assert.equal(result.response.status,403,'Editors must not manage users.');

  state.media={...state.media,hero:[media('desktop-a'),media('desktop-b')],heroDesktop:[media('desktop-a'),media('desktop-b')],heroMobile:[media('mobile-a'),media('mobile-b')],carousel:Array.from({length:20},(_,index)=>media(`carousel-${index}`))};
  state.settings={...state.settings,heroDesktopRotationSeconds:7,heroMobileRotationSeconds:9,brandDisplayCount:3};
  state.brands=[
    {id:'brand-one',slug:'brand-one',name:'Brand One',category:'niche',logoNumber:1,active:true},
    {id:'brand-two',slug:'brand-two',name:'Brand Two',category:'niche',logoNumber:2,active:true},
    {id:'brand-three',slug:'brand-three',name:'Brand Three',category:'premium',logoNumber:3,active:false}
  ];
  state.jobs=[{id:'test-job',slug:'test-role',title:'Test Role',department:'Operations',location:'Dubai, UAE',locality:'Dubai',region:'Dubai',countryCode:'AE',employmentType:'FULL_TIME',datePosted:'2026-08-01',validThrough:'2027-08-01T23:59:59+04:00',summary:'A test role for CMS verification.',description:'A test role for verifying structured career publishing through the CMS.',responsibilities:['Verify publishing'],qualifications:['Testing experience'],applyEmail:'careers@space-tr.com',active:true}];
  state.posts=Array.from({length:205},(_,index)=>({id:`scale-${index}`,slug:`scale-${index}`,title:`Scale article ${index}`,format:'blog',language:'en',topic:'Scale',date:new Date(Date.UTC(2025,0,index+1)).toISOString().slice(0,10),excerpt:`Excerpt ${index}`,body:`${'Article content '.repeat(8)}${index}`,imageUrl:'',published:true}));
  result=await request('/api/admin/content',{method:'PUT',headers:headersFor(owner),body:JSON.stringify({state,expectedVersion:version})}); assert.equal(result.response.status,200); state=result.body; version=state._meta.version;
  result=await request('/api/content'); assert.equal(result.body.posts.length,0,'Saving a draft must not change public content.'); assert.match(result.response.headers.get('cache-control')||'',/no-store/,'Published CMS content must not be served stale.');
  result=await request('/api/admin/publish',{method:'POST',headers:headersFor(owner),body:JSON.stringify({state,expectedVersion:version,scope:'all'})});
  assert.equal(result.response.status,422,'Publishing must enforce the exact brand count.');
  state.brands[2].active=true;
  result=await request('/api/admin/content',{method:'PUT',headers:headersFor(owner),body:JSON.stringify({state,expectedVersion:version})}); assert.equal(result.response.status,200);state=result.body;version=state._meta.version;
  const staleVersion=version-1;
  result=await request('/api/admin/content',{method:'PUT',headers:headersFor(owner),body:JSON.stringify({state,expectedVersion:staleVersion})}); assert.equal(result.response.status,409,'Concurrent stale saves must be rejected.');
  result=await request('/api/admin/publish',{method:'POST',headers:headersFor(owner),body:JSON.stringify({state,expectedVersion:version,scope:'all'})}); assert.equal(result.response.status,200); state=result.body.state; version=state._meta.version;
  result=await request('/api/content'); assert.equal(result.response.status,200); assert.equal(result.body.posts.length,205); assert.equal(result.body.media.carousel.length,20); assert.equal(result.body.brands.length,3);
  result=await request('/api/posts?page=21&limit=10&sort=latest&language=en'); assert.equal(result.response.status,200); assert.equal(result.body.pagination.total,205); assert.equal(result.body.pagination.totalPages,21); assert.equal(result.body.posts.length,5); assert.ok(result.body.posts.every(post=>!Object.hasOwn(post,'body')));

  result=await request('/api/admin/assets',{method:'POST',headers:headersFor(owner),body:JSON.stringify({name:'fake.png',type:'image/png',data:Buffer.from('not an image').toString('base64')})}); assert.equal(result.response.status,400,'MIME spoofing must be rejected.');
  const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nGQAAAAASUVORK5CYII=';
  result=await request('/api/admin/assets',{method:'POST',headers:headersFor(owner),body:JSON.stringify({name:'cms-test.png',type:'image/png',data:png})}); assert.equal(result.response.status,201); const adminAsset=result.body.asset;
  assert.equal((await fetch(origin+adminAsset.url)).status,200);
  let assetState=(await request('/api/admin/content',{headers:{Cookie:owner.cookie,Origin:origin}})).body, assetVersion=assetState._meta.version; delete assetState._session; assetState.posts[0].imageUrl=adminAsset.url;
  result=await request('/api/admin/content',{method:'PUT',headers:headersFor(owner),body:JSON.stringify({state:assetState,expectedVersion:assetVersion})}); assert.equal(result.response.status,200); assetState=result.body; assetVersion=assetState._meta.version;
  result=await request('/api/admin/assets',{method:'DELETE',headers:headersFor(owner),body:JSON.stringify({url:adminAsset.url})}); assert.equal(result.response.status,200,'Archiving an asset must delete it from content and storage.');
  assetState=(await request('/api/admin/content',{headers:{Cookie:owner.cookie,Origin:origin}})).body;
  assert.equal(assetState.posts[0].imageUrl,'','Deleted assets must be removed from draft content.');
  assert.equal((await fetch(origin+adminAsset.url)).status,404,'Deleted local assets must no longer be served.');

  result=await request('/api/v1/media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'api.png',type:'image/png',data:png})}); assert.equal(result.response.status,401);
  result=await request('/api/v1/media',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ingestKey}`},body:JSON.stringify({name:'api.png',type:'image/png',data:png})}); assert.equal(result.response.status,201); const apiImage=result.body.url;
  const apiAssetId=result.body.mediaId;
  result=await request('/api/v1/media',{headers:{Authorization:`Bearer ${ingestKey}`}}); assert.equal(result.response.status,200); assert.ok(result.body.assets.some(asset=>asset.id===apiAssetId));
  const article={sourceId:'external-article-001',title:'A securely imported article',body:'This draft arrives through the restricted blog ingestion endpoint.\n\n## Market context\n\nSpace protects **brand value** through disciplined execution.',excerpt:'A controlled draft import.',imageUrl:apiImage,language:'en'};
  result=await request('/api/v1/blog-drafts',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ingestKey}`},body:JSON.stringify(article)}); assert.equal(result.response.status,201); assert.equal(result.body.status,'draft'); const importedId=result.body.id; let importedSlug=result.body.slug;
  result=await request('/api/content'); assert.equal(result.body.posts.some(post=>post.sourceId===article.sourceId),false,'API imports must not self-publish.');
  result=await request('/api/admin/content',{headers:{Cookie:owner.cookie,Origin:origin}}); assert.equal(result.body.posts.filter(post=>post.sourceId===article.sourceId).length,1);
  result=await request('/api/v1/blog-drafts',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ingestKey}`},body:JSON.stringify({...article,title:'Updated imported article'})}); assert.equal(result.response.status,200,'Repeated source IDs should update the draft.'); importedSlug=result.body.slug;
  result=await request('/api/v1/posts?status=draft&includeBody=1',{headers:{Authorization:`Bearer ${ingestKey}`}}); assert.equal(result.response.status,200); assert.ok(result.body.posts.some(post=>post.sourceId===article.sourceId&&post.body));
  result=await request('/api/v1/content?resource=brands',{headers:{Authorization:`Bearer ${ingestKey}`}}); assert.equal(result.response.status,200); assert.equal(result.body.resource,'brands'); assert.ok(Array.isArray(result.body.data));
  result=await request('/api/v1/content?resource=team',{headers:{Authorization:`Bearer ${ingestKey}`}}); const teamVersion=result.body.version;
  result=await request('/api/v1/content?resource=team',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ingestKey}`},body:JSON.stringify({item:{id:'api-test-person',name:'API Test Person',role:'Tester',imageUrl:apiImage,bio:['Created through the complete content API.'],active:false},expectedVersion:teamVersion})}); assert.equal(result.response.status,201); let automationVersion=result.body.version;
  result=await request('/api/v1/content?resource=team&id=api-test-person',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ingestKey}`},body:JSON.stringify({patch:{role:'API Tester'},expectedVersion:automationVersion})}); assert.equal(result.response.status,200); automationVersion=result.body.version; assert.equal(result.body.data.find(person=>person.id==='api-test-person').role,'API Tester');
  result=await request('/api/v1/content?resource=team&id=api-test-person',{method:'DELETE',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ingestKey}`},body:JSON.stringify({expectedVersion:automationVersion})}); assert.equal(result.response.status,200); assert.equal(result.body.data.some(person=>person.id==='api-test-person'),false); automationVersion=result.body.version;
  result=await request('/api/v1/preview',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ingestKey}`},body:JSON.stringify({path:'/en/posts/securely-imported-article'})}); assert.equal(result.response.status,200); assert.match(result.body.url,/preview=/);
  result=await request(`/api/v1/content?resource=posts&id=${encodeURIComponent(importedId)}`,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ingestKey}`},body:JSON.stringify({patch:{published:true},expectedVersion:automationVersion})}); assert.equal(result.response.status,200); automationVersion=result.body.version;
  result=await request('/api/v1/publish',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${ingestKey}`},body:JSON.stringify({scope:'all',expectedVersion:automationVersion})}); assert.equal(result.response.status,200); assert.equal(result.body.status,'published');
  const importedHtml=await (await fetch(`${origin}/en/posts/${importedSlug}`)).text(); assert.match(importedHtml,/<h2>Market context<\/h2>/); assert.match(importedHtml,/<strong>brand value<\/strong>/);
  result=await request('/api/v1/content?resource=users',{headers:{Authorization:`Bearer ${ingestKey}`}}); assert.equal(result.response.status,400,'Account data must not be exposed by the automation API.');
  result=await request('/api/v1/openapi',{headers:{Authorization:`Bearer ${ingestKey}`}}); assert.equal(result.response.status,200); assert.equal(result.body.openapi,'3.1.0'); assert.ok(result.body.paths['/api/v1/posts']); assert.ok(result.body.paths['/api/v1/publish']); assert.ok(result.body.components.schemas.MediaState);

  result=await request('/api/admin/activity',{headers:{Cookie:owner.cookie,Origin:origin}}); assert.equal(result.response.status,200); assert.ok(result.body.events.some(event=>event.event==='published')); assert.ok(result.body.revisions.length>=2);
  result=await request('/api/admin/backup',{headers:{Cookie:owner.cookie,Origin:origin}}); assert.equal(result.response.status,200); const backupText=JSON.stringify(result.body); assert.equal(/passwordHash|password_hash|sessions|otps|resetTickets/.test(backupText),false,'Backups must omit authentication secrets.'); assert.ok(Array.isArray(result.body.assets));
  const revision=result.body.revisions[0]; result=await request('/api/admin/revisions',{method:'POST',headers:headersFor(owner),body:JSON.stringify({id:revision.id})}); assert.equal(result.response.status,200); assert.match(result.body.message,/unpublished draft/i);

  result=await request('/jobs/'+encodeURIComponent((await request('/api/content')).body.jobs[0].slug)); assert.equal(result.response.status,200); const jobHtml=await (await fetch(origin+'/jobs/'+encodeURIComponent((await request('/api/content')).body.jobs[0].slug))).text(); assert.match(jobHtml,/"@type":"JobPosting"/);
  result=await request('/fr/team/vipul-mathur'); assert.equal(result.response.status,200); const frenchProfile=await (await fetch(origin+'/fr/team/vipul-mathur')).text(); assert.match(frenchProfile,/"@type":"Person"/); assert.match(frenchProfile,/Fondateur/); assert.match(frenchProfile,/hreflang="en"/);
  result=await request('/en/posts/scale-0'); assert.equal(result.response.status,200); const englishPost=await (await fetch(origin+'/en/posts/scale-0')).text(); assert.match(englishPost,/"@type":"BlogPosting"/); assert.match(englishPost,/lang="en"/); assert.match(englishPost,/\/en\/posts\/scale-0/);
  const sitemap=await (await fetch(origin+'/sitemap.xml')).text(); assert.match(sitemap,/\/fr\/team\/vipul-mathur/); assert.match(sitemap,/\/jobs\//); assert.match(sitemap,/\/en\/posts\/scale-0/);
  console.log('Validated auth, OTP recovery, roles, CSRF, draft isolation, complete REST mutations, signed preview, OpenAPI, revisions, media, posts, jobs, bilingual team SEO, backup and health monitoring.');
}

run().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>{child.kill();fs.rmSync(temporary,{recursive:true,force:true})});

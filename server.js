const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
const {generateMediaManifest}=require('./tools/media/generate-media-manifest');
const root=__dirname,pageRoot=path.join(root,'src','pages'),publicRoot=path.join(root,'public'),port=process.env.PORT||3000,devHost=process.env.SPACE_DEV_HOST||'127.0.0.1',rates=new Map(),types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.avif':'image/avif','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.svg':'image/svg+xml'};
process.env.SPACE_CMS_LOCAL='1';
process.env.CMS_OWNER_EMAIL||='space-admin@localhost.test';
process.env.CMS_OWNER_PASSWORD||='Space-Local-2026';
process.env.CMS_SESSION_SECRET||=crypto.createHash('sha256').update(`${root}|space-local-cms`).digest('hex');
process.env.CMS_CSRF_SECRET||=crypto.createHash('sha256').update(`${root}|space-local-csrf`).digest('hex');
process.env.CMS_OTP_SECRET||=crypto.createHash('sha256').update(`${root}|space-local-otp`).digest('hex');
process.env.CMS_API_KEY||=process.env.BLOG_INGEST_API_KEY||'space-local-cms-api';
process.env.PUBLIC_SITE_URL||=`http://localhost:${port}`;
const cmsHandlers=new Map([
  ['/api/content',require('./api/content')],
  ['/api/admin/login',require('./api/admin/_login')],
  ['/api/admin/logout',require('./api/admin/_logout')],
  ['/api/admin/content',require('./api/admin/_content')],
  ['/api/admin/assets',require('./api/admin/_assets')],
  ['/api/admin/publish',require('./api/admin/_publish')],
  ['/api/admin/password-request',require('./api/admin/_password-request')],
  ['/api/admin/password-verify',require('./api/admin/_password-verify')],
  ['/api/admin/password-reset',require('./api/admin/_password-reset')],
  ['/api/admin/preview',require('./api/admin/_preview')],
  ['/api/admin/users',require('./api/admin/_users')],
  ['/api/admin/activity',require('./api/admin/_activity')],
  ['/api/admin/revisions',require('./api/admin/_revisions')],
  ['/api/admin/translate',require('./api/admin/_translate')],
  ['/api/admin/backup',require('./api/admin/_backup')],
  ['/api/v1/media',require('./cms/functions/v1-media')],
  ['/api/v1/blog-drafts',require('./cms/functions/v1-blog-drafts')],
  ['/api/v1/posts',require('./cms/functions/v1-blog-drafts')],
  ['/api/v1/content',require('./cms/functions/v1-content')],
  ['/api/v1/openapi',require('./cms/functions/v1-openapi')],
  ['/api/health',require('./api/health')]
]);
cmsHandlers.set('/api/cron/editorial',require('./cms/functions/editorial-cron'));
const jobHandler=require('./api/job'),postHandler=require('./api/post'),postsHandler=require('./api/posts'),teamHandler=require('./api/team'),sitemapHandler=require('./api/sitemap'),companyHandler=require('./api/company'),feedHandler=require('./api/feed'),llmsFullHandler=require('./api/llms-full');
const localizedRedirects=new Map([
  ['/','/en/'],['/index.html','/en/'],['/about-space.html','/en/about-space.html'],
  ['/expertise.html','/en/expertise.html'],['/feelnzuri.html','/en/feelnzuri.html'],
  ['/space-x-maven.html','/en/'],['/en/space-x-maven.html','/en/'],['/fr/space-x-maven.html','/fr/'],
  ['/posts.html','/en/posts.html'],
  ['/careers.html','/en/careers.html']
]);
// The catalogue is checked into the project and should be regenerated only
// when source media changes. Scanning hundreds of OneDrive-hosted originals in
// the HTTP process blocked local requests. Opt into live regeneration only for
// dedicated curation sessions with SPACE_WATCH_MEDIA=1.
if(process.env.SPACE_WATCH_MEDIA==='1')try{let mediaRefresh;fs.watch(path.join(root,'assets','media','source','brands'),{recursive:true},()=>{clearTimeout(mediaRefresh);mediaRefresh=setTimeout(()=>{try{const manifest=generateMediaManifest();console.log(`Media catalogue refreshed: ${manifest.counts.webReady} web-ready files.`)}catch(error){console.warn('Media catalogue refresh failed:',error.message)}},1200)})}catch{}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
function safeText(v,max){return typeof v==='string'?v.trim().slice(0,max):''}
function runLocalApi(handler,req,res,query={}){
  req.query=query;
  req.headers['x-forwarded-proto']||='http';
  res.status=status=>{res.statusCode=status;return res};
  res.send=body=>res.end(body);
  const invoke=()=>Promise.resolve(handler(req,res)).catch(error=>{console.error('Local API error:',error);if(!res.headersSent)json(res,500,{error:'Local API request failed.'});else if(!res.writableEnded)res.end()});
  if(['GET','HEAD'].includes(req.method))return invoke();
  let raw='',tooLarge=false;
  req.on('data',chunk=>{if(tooLarge)return;raw+=chunk;if(raw.length>12*1024*1024){tooLarge=true;json(res,413,{error:'Request body is too large.'});req.destroy()}});
  req.on('end',()=>{if(tooLarge)return;req.body=raw;invoke()});
}
async function contact(req,res){let raw='';req.on('data',c=>{raw+=c;if(raw.length>16000)req.destroy()});req.on('end',async()=>{let b;try{b=JSON.parse(raw)}catch{return json(res,400,{message:'Invalid request.'})}if(b.website)return json(res,200,{message:'Thank you.'});const ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0],now=Date.now(),recent=(rates.get(ip)||[]).filter(t=>now-t<3600000);if(recent.length>=5)return json(res,429,{message:'Too many enquiries. Please try again later.'});rates.set(ip,[...recent,now]);const name=safeText(b.name,100),email=safeText(b.email,160),company=safeText(b.company,160),message=safeText(b.message,4000);if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||message.length<10)return json(res,400,{message:'Please complete all required fields.'});if(!process.env.RESEND_API_KEY||!process.env.CONTACT_TO)return json(res,503,{message:'The form is being connected. Please email info@space-tr.com directly.'});try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.CONTACT_FROM||'Space Website <onboarding@resend.dev>',to:[process.env.CONTACT_TO],reply_to:email,subject:`Website enquiry — ${company||name}`,text:`Name: ${name}\nEmail: ${email}\nCompany: ${company}\n\n${message}\n\nRef: ${crypto.randomUUID()}`})});if(!response.ok)throw Error();json(res,200,{message:'Thank you. Our team will be in touch.'})}catch{json(res,502,{message:'Unable to send right now. Please email info@space-tr.com.'})}})}
function saveMediaCuration(req,res){let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>100000)req.destroy()});req.on('end',()=>{let body;try{body=JSON.parse(raw)}catch{return json(res,400,{message:'Invalid curation data.'})}const ids=value=>Array.isArray(value)?[...new Set(value.filter(id=>/^[a-f0-9]{16}$/.test(id)))]:[];const curation={version:1,updatedAt:new Date().toISOString(),hero:{excludeLightBackgrounds:body?.hero?.excludeLightBackgrounds!==false,excluded:ids(body?.hero?.excluded),included:ids(body?.hero?.included)},carousel:{selectionMode:'include',excluded:[],included:ids(body?.carousel?.included)}};try{const pretty=JSON.stringify(curation,null,2),script=`window.SPACE_MEDIA_CURATION=${JSON.stringify(curation)};\n`;const runtime=path.join(root,'assets','media','runtime');fs.writeFileSync(path.join(runtime,'media-curation.json'),pretty);fs.writeFileSync(path.join(runtime,'media-curation.js'),script);json(res,200,{message:'Media shortlist saved.',curation})}catch(error){json(res,500,{message:'Unable to save the shortlist.',detail:error.message})}})}
const compressible=new Set(['.html','.css','.js','.json','.txt','.xml','.svg']);
const cachePolicy=(file,extension)=>{
  const normalized=file.replace(/\\/g,'/');
  if(['.html','.xml','.css','.js'].includes(extension))return 'no-cache';
  if(/\/assets\/media\/runtime\/media-curation\.(?:js|json)$/.test(normalized))return 'private, no-store';
  if(normalized.includes('/assets/media/generated/derivatives/'))return 'public, max-age=31536000, immutable';
  if(['.jpg','.jpeg','.png','.gif','.avif','.webp','.mp4','.webm','.svg'].includes(extension))return 'public, max-age=604800, stale-while-revalidate=2592000';
  return 'public, max-age=3600, must-revalidate';
};
const serveFile=(req,res,file)=>{
  fs.stat(file,(error,stats)=>{
    if(error||!stats.isFile()){res.writeHead(404);return res.end('Not found')}
    const extension=path.extname(file).toLowerCase();
    const type=types[extension]||'application/octet-stream';
    const etag=`W/\"${stats.size.toString(16)}-${Math.floor(stats.mtimeMs).toString(16)}\"`;
    const baseHeaders={
      'Content-Type':type,
      'Cache-Control':cachePolicy(file,extension),
      'ETag':etag,
      'Last-Modified':stats.mtime.toUTCString(),
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'strict-origin-when-cross-origin',
      'Cross-Origin-Resource-Policy':'same-origin'
    };
    if(req.headers['if-none-match']===etag){res.writeHead(304,baseHeaders);return res.end()}
    const range=req.headers.range;
    if(range&&['.mp4','.webm'].includes(extension)){
      const match=/bytes=(\d*)-(\d*)/.exec(range);
      if(!match){res.writeHead(416,{...baseHeaders,'Content-Range':`bytes */${stats.size}`});return res.end()}
      const start=match[1]?Number(match[1]):0;
      const end=match[2]?Math.min(Number(match[2]),stats.size-1):stats.size-1;
      if(!Number.isFinite(start)||!Number.isFinite(end)||start>end||start>=stats.size){res.writeHead(416,{...baseHeaders,'Content-Range':`bytes */${stats.size}`});return res.end()}
      const headers={...baseHeaders,'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${stats.size}`,'Content-Length':end-start+1};
      res.writeHead(206,headers);
      if(req.method==='HEAD')return res.end();
      return fs.createReadStream(file,{start,end}).pipe(res);
    }
    if(['.mp4','.webm'].includes(extension))baseHeaders['Accept-Ranges']='bytes';
    const encoding=String(req.headers['accept-encoding']||'');
    const shouldCompress=compressible.has(extension)&&stats.size>1024;
    if(shouldCompress&&/\bbr\b/.test(encoding)){
      res.writeHead(200,{...baseHeaders,'Content-Encoding':'br','Vary':'Accept-Encoding'});
      if(req.method==='HEAD')return res.end();
      return fs.createReadStream(file).pipe(zlib.createBrotliCompress({params:{[zlib.constants.BROTLI_PARAM_QUALITY]:4}})).pipe(res);
    }
    if(shouldCompress&&/\bgzip\b/.test(encoding)){
      res.writeHead(200,{...baseHeaders,'Content-Encoding':'gzip','Vary':'Accept-Encoding'});
      if(req.method==='HEAD')return res.end();
      return fs.createReadStream(file).pipe(zlib.createGzip({level:6})).pipe(res);
    }
    res.writeHead(200,{...baseHeaders,'Content-Length':stats.size});
    if(req.method==='HEAD')return res.end();
    fs.createReadStream(file).pipe(res);
  });
};
http.createServer((req,res)=>{
  let requestUrl;
  try{requestUrl=new URL(req.url,`http://${req.headers.host||`localhost:${port}`}`)}catch{return json(res,400,{error:'Invalid URL.'})}
  const pathname=requestUrl.pathname;
  if(req.method==='POST'&&pathname==='/api/contact')return contact(req,res);
  if(req.method==='POST'&&pathname==='/api/media-curation')return saveMediaCuration(req,res);
  if(cmsHandlers.has(pathname))return runLocalApi(cmsHandlers.get(pathname),req,res,Object.fromEntries(requestUrl.searchParams));
  if(pathname==='/api/job')return runLocalApi(jobHandler,req,res,Object.fromEntries(requestUrl.searchParams));
  if(pathname.startsWith('/jobs/'))return runLocalApi(jobHandler,req,res,{slug:decodeURIComponent(pathname.slice('/jobs/'.length))});
  if(pathname==='/api/post')return runLocalApi(postHandler,req,res,Object.fromEntries(requestUrl.searchParams));
  if(pathname==='/api/posts')return runLocalApi(postsHandler,req,res,Object.fromEntries(requestUrl.searchParams));
  const postRoute=/^\/(en|fr)\/posts\/([^/]+)\/?$/.exec(pathname);
  if(postRoute)return runLocalApi(postHandler,req,res,{language:postRoute[1],slug:decodeURIComponent(postRoute[2])});
  if(pathname.startsWith('/posts/'))return runLocalApi(postHandler,req,res,{slug:decodeURIComponent(pathname.slice('/posts/'.length))});
  if(pathname==='/api/team')return runLocalApi(teamHandler,req,res,Object.fromEntries(requestUrl.searchParams));
  const teamRoute=/^\/(en|fr)\/team\/([^/]+)\/?$/.exec(pathname);
  if(teamRoute)return runLocalApi(teamHandler,req,res,{language:teamRoute[1],slug:decodeURIComponent(teamRoute[2])});
  if(pathname==='/api/sitemap'||pathname==='/sitemap.xml')return runLocalApi(sitemapHandler,req,res,Object.fromEntries(requestUrl.searchParams));
  if(pathname==='/api/company'||pathname==='/company.json')return runLocalApi(companyHandler,req,res,Object.fromEntries(requestUrl.searchParams));
  if(pathname==='/api/feed'||pathname==='/feed.xml'||pathname==='/fr/feed.xml')return runLocalApi(feedHandler,req,res,{...Object.fromEntries(requestUrl.searchParams),language:pathname==='/fr/feed.xml'?'fr':requestUrl.searchParams.get('language')||'en'});
  if(pathname==='/api/llms-full'||pathname==='/llms-full.txt')return runLocalApi(llmsFullHandler,req,res,Object.fromEntries(requestUrl.searchParams));
  if(process.env.SPACE_CMS_LOCAL_ASSET_ROOT&&pathname.startsWith('/assets/media/cms/uploads/')){
    const assetRoot=path.resolve(process.env.SPACE_CMS_LOCAL_ASSET_ROOT),filename=path.basename(decodeURIComponent(pathname.slice('/assets/media/cms/uploads/'.length))),target=path.resolve(assetRoot,filename),relative=path.relative(assetRoot,target);
    if(!filename||relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);return res.end('Forbidden')}
    return serveFile(req,res,target);
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD, POST'});return res.end('Method not allowed')}
  let url;
  try{url=decodeURIComponent(req.url.split('?')[0])}catch{res.writeHead(400);return res.end('Bad request')}
  if(localizedRedirects.has(url)){
    const query=req.url.includes('?')?`?${req.url.split('?').slice(1).join('?')}`:'';
    res.writeHead(308,{'Location':`${localizedRedirects.get(url)}${query}`,'Cache-Control':'no-store'});
    return res.end();
  }
  if(url==='/')url='/index.html';
  else if(url.endsWith('/'))url+='index.html';
  const pageRequest=/^\/(?:en|fr)(?:\/|$)/.test(url)||url==='/privacy-policy.html';
  const publicRequest=new Set(['/favicon.png','/apple-touch-icon.png','/robots.txt','/llms.txt','/.nojekyll']).has(url);
  const sourceRoot=pageRequest?pageRoot:(publicRequest?publicRoot:root);
  const file=path.resolve(sourceRoot,`.${url}`);
  const relative=path.relative(sourceRoot,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);return res.end('Forbidden')}
  serveFile(req,res,file);
}).listen(port,devHost,()=>{
  console.log(`Space site running at http://localhost:${port}`);
  console.log(`Local CMS: http://localhost:${port}/cms/ (email: ${process.env.CMS_OWNER_EMAIL}, password: ${process.env.CMS_OWNER_PASSWORD})`);
});

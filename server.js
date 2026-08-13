const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),zlib=require('zlib');
const {generateMediaManifest}=require('./tools/generate-media-manifest');
const root=__dirname,port=process.env.PORT||3000,rates=new Map(),types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.avif':'image/avif','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.svg':'image/svg+xml'};
try{generateMediaManifest()}catch(error){console.warn('Media catalogue could not be generated:',error.message)}
try{let mediaRefresh;fs.watch(path.join(root,'assets'),{recursive:true},(_event,file='')=>{const normalized=String(file).replace(/\\/g,'/');if(normalized.startsWith('_catalog/')||normalized.startsWith('_derivatives/')||/media-(manifest|curation)\.(js|json)$|media-analysis\.json$/.test(normalized))return;clearTimeout(mediaRefresh);mediaRefresh=setTimeout(()=>{try{const manifest=generateMediaManifest();console.log(`Media catalogue refreshed: ${manifest.counts.webReady} web-ready files.`)}catch(error){console.warn('Media catalogue refresh failed:',error.message)}},1200)})}catch{}
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
function safeText(v,max){return typeof v==='string'?v.trim().slice(0,max):''}
async function contact(req,res){let raw='';req.on('data',c=>{raw+=c;if(raw.length>16000)req.destroy()});req.on('end',async()=>{let b;try{b=JSON.parse(raw)}catch{return json(res,400,{message:'Invalid request.'})}if(b.website)return json(res,200,{message:'Thank you.'});const ip=(req.headers['x-forwarded-for']||req.socket.remoteAddress||'').split(',')[0],now=Date.now(),recent=(rates.get(ip)||[]).filter(t=>now-t<3600000);if(recent.length>=5)return json(res,429,{message:'Too many enquiries. Please try again later.'});rates.set(ip,[...recent,now]);const name=safeText(b.name,100),email=safeText(b.email,160),company=safeText(b.company,160),message=safeText(b.message,4000);if(!name||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||message.length<10)return json(res,400,{message:'Please complete all required fields.'});if(!process.env.RESEND_API_KEY||!process.env.CONTACT_TO)return json(res,503,{message:'The form is being connected. Please email info@space-tr.com directly.'});try{const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.CONTACT_FROM||'Space Website <onboarding@resend.dev>',to:[process.env.CONTACT_TO],reply_to:email,subject:`Website enquiry — ${company||name}`,text:`Name: ${name}\nEmail: ${email}\nCompany: ${company}\n\n${message}\n\nRef: ${crypto.randomUUID()}`})});if(!response.ok)throw Error();json(res,200,{message:'Thank you. Our team will be in touch.'})}catch{json(res,502,{message:'Unable to send right now. Please email info@space-tr.com.'})}})}
function saveMediaCuration(req,res){let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>100000)req.destroy()});req.on('end',()=>{let body;try{body=JSON.parse(raw)}catch{return json(res,400,{message:'Invalid curation data.'})}const ids=value=>Array.isArray(value)?[...new Set(value.filter(id=>/^[a-f0-9]{16}$/.test(id)))]:[];const curation={version:1,updatedAt:new Date().toISOString(),hero:{excludeLightBackgrounds:body?.hero?.excludeLightBackgrounds!==false,excluded:ids(body?.hero?.excluded),included:ids(body?.hero?.included)},carousel:{selectionMode:'include',excluded:[],included:ids(body?.carousel?.included)}};try{const pretty=JSON.stringify(curation,null,2);fs.writeFileSync(path.join(root,'assets','media-curation.json'),pretty);fs.writeFileSync(path.join(root,'assets','media-curation.js'),`window.SPACE_MEDIA_CURATION=${JSON.stringify(curation)};\n`);json(res,200,{message:'Media shortlist saved.',curation})}catch(error){json(res,500,{message:'Unable to save the shortlist.',detail:error.message})}})}
const compressible=new Set(['.html','.css','.js','.json','.txt','.xml','.svg']);
const cachePolicy=(file,extension)=>{
  const normalized=file.replace(/\\/g,'/');
  if(extension==='.html'||extension==='.xml')return 'no-cache';
  if(normalized.includes('/assets/_derivatives/'))return 'public, max-age=31536000, immutable';
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
  if(req.method==='POST'&&req.url==='/api/contact')return contact(req,res);
  if(req.method==='POST'&&req.url==='/api/media-curation')return saveMediaCuration(req,res);
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD, POST'});return res.end('Method not allowed')}
  let url;
  try{url=decodeURIComponent(req.url.split('?')[0])}catch{res.writeHead(400);return res.end('Bad request')}
  if(url==='/')url='/index.html';
  const file=path.resolve(root,`.${url}`);
  const relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)){res.writeHead(403);return res.end('Forbidden')}
  serveFile(req,res,file);
}).listen(port,()=>console.log(`Space site running at http://localhost:${port}`));

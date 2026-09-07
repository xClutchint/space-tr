global.window={};
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../..');

require(path.join(root,'assets/media/runtime/brand-taxonomy.js'));
require(path.join(root,'assets/media/runtime/media-curation.js'));
// Exercise the exact lightweight catalogue loaded by the homepage. Testing the
// full authoring manifest previously hid regressions where eligible hero media
// was accidentally omitted from the production runtime.
require(path.join(root,'assets/media/runtime/media-runtime.js'));
require(path.join(root,'js/shared/hero-scheduler.js'));

const taxonomy=window.SPACE_BRAND_TAXONOMY;
const curation=window.SPACE_MEDIA_CURATION?.hero||{};
const excluded=new Set(curation.excluded||[]);
const included=new Set(curation.included||[]);
const editorial=item=>!/(pack[ -]?shot|png images|no background|textclipping)/i.test(item.src);
const isLight=item=>curation.excludeLightBackgrounds!==false&&item.type!=='video'
  &&(item.backgroundTone==='light'||(item.edgeLuminance>=205&&item.lightNeutralRatio>=.25));
const approved=item=>!excluded.has(item.id)&&(included.has(item.id)||!isLight(item));
const pool=(window.SPACE_MEDIA_LIBRARY?.media||[]).filter(item=>
  item.webReady&&item.optimizedSrc&&item.orientation==='vertical'&&editorial(item)
  &&approved(item)&&!taxonomy.isRetired(item.brand)
);

const scheduler=window.SpaceHeroScheduler.create(pool,{pairSize:2,canonicalize:taxonomy.canonicalize});
const pairs=Array.from({length:100},()=>scheduler.nextPair());
const failures=[];
let previousFamilies=new Set(),previousAssets=new Set();
let lastAtelierRotation=Number.NEGATIVE_INFINITY;

pairs.forEach((pair,index)=>{
  if(pair.length!==2)failures.push(`rotation ${index+1}: expected two assets, received ${pair.length}`);
  const brands=pair.map(item=>item.__heroBrand);
  const families=pair.map(item=>item.__heroFamily);
  const assets=pair.map(item=>item.id);
  if(new Set(brands).size!==brands.length)failures.push(`rotation ${index+1}: duplicate brand in pair`);
  if(new Set(families).size!==families.length)failures.push(`rotation ${index+1}: duplicate fragrance family in pair`);
  if(new Set(assets).size!==assets.length)failures.push(`rotation ${index+1}: duplicate asset in pair`);
  if(families.some(family=>previousFamilies.has(family)))failures.push(`rotation ${index+1}: fragrance family repeated from prior pair`);
  if(assets.some(asset=>previousAssets.has(asset)))failures.push(`rotation ${index+1}: asset repeated from prior pair`);
  const atelierCount=brands.filter(brand=>brand==='Atelier des Ors').length;
  if(atelierCount>1)failures.push(`rotation ${index+1}: more than one Atelier des Ors asset in a cycle`);
  if(atelierCount&&index-lastAtelierRotation<3)failures.push(`rotation ${index+1}: Atelier des Ors repeated before three cycles elapsed`);
  if(atelierCount)lastAtelierRotation=index;
  previousFamilies=new Set(families);previousAssets=new Set(assets);
});

const stats=scheduler.stats();
const assetCounts=Object.values(stats.assets);
const assetSpread=Math.max(...assetCounts)-Math.min(...assetCounts);
if(assetSpread>1)failures.push(`asset exposure spread is ${assetSpread}, expected at most 1`);
const firstCompleteCycle=new Set(pairs.slice(0,Math.ceil(pool.length/2)).flat().map(item=>item.id));
if(firstCompleteCycle.size!==pool.length)failures.push(`first complete cycle exposed ${firstCompleteCycle.size} of ${pool.length} assets`);

const assetsByBrand=new Map();
pool.forEach(item=>{
  const brand=taxonomy.canonicalize(item.brand);
  if(!assetsByBrand.has(brand))assetsByBrand.set(brand,[]);
  assetsByBrand.get(brand).push(stats.assets[item.id]||0);
});
for(const [brand,counts] of assetsByBrand){
  const spread=Math.max(...counts)-Math.min(...counts);
  if(spread>1)failures.push(`${brand}: asset exposure spread is ${spread}, expected at most 1`);
}

let priorOpening=[];
for(let reload=0;reload<30;reload+=1){
  const priorIds=new Set(priorOpening.map(item=>item.id));
  const priorBrands=new Set(priorOpening.map(item=>taxonomy.canonicalize(item.brand)));
  let candidates=pool.filter(item=>!priorIds.has(item.id)&&!priorBrands.has(taxonomy.canonicalize(item.brand)));
  if(new Set(candidates.map(item=>taxonomy.canonicalize(item.brand))).size<2)candidates=pool.filter(item=>!priorIds.has(item.id));
  const opening=window.SpaceHeroScheduler.create(candidates,{pairSize:2,canonicalize:taxonomy.canonicalize}).nextPair();
  if(opening.some(item=>priorIds.has(item.id)))failures.push(`reload ${reload+1}: opening asset repeated`);
  if(opening.some(item=>priorBrands.has(taxonomy.canonicalize(item.brand))))failures.push(`reload ${reload+1}: opening brand repeated`);
  priorOpening=opening;
}

const homepage=fs.readFileSync(path.join(root,'src','pages','index.html'),'utf8');
const homepageScript=fs.readFileSync(path.join(root,'js','pages','home.js'),'utf8');
const catalogueScript=fs.readFileSync(path.join(root,'tools','media','library','app.js'),'utf8');
const approvalScript=fs.readFileSync(path.join(root,'tools','media','library','hero-approval.js'),'utf8');
const heroLogic=homepageScript.slice(homepageScript.indexOf('const heroRotators='),homepageScript.indexOf('const heroBrandProof='));
if((homepage.match(/is-bootstrap-frame/g)||[]).length!==2)failures.push('homepage must contain two responsive bootstrap frames');
if((homepage.match(/<source media="\(max-width:900px\)" srcset="assets\/media\/generated\/derivatives\/hero-mobile\//g)||[]).length<2)failures.push('bootstrap frames must provide mobile derivatives');
if((homepage.match(/fetchpriority="high"/g)||[]).length<2)failures.push('bootstrap frames must prioritise opening imagery');
if(!/configuredSeconds=mobileHero\?cmsContent\?\.settings\?\.heroMobileRotationSeconds:cmsContent\?\.settings\?\.heroDesktopRotationSeconds/.test(heroLogic)||!/heroRotationInterval=Math\.max\(5,Math\.min\(15,Number\(configuredSeconds\?\?cmsContent\?\.settings\?\.heroRotationSeconds\)\|\|5\)\)\*1000/.test(heroLogic))failures.push('hero rotation must use the independent desktop/mobile CMS interval, clamped from five to fifteen seconds');
if(!/lastAtelierPair\+3/.test(fs.readFileSync(path.join(root,'js','shared','hero-scheduler.js'),'utf8')))failures.push('Atelier des Ors must be spaced across three hero cycles');
if(!/if\(pendingShows\)return/.test(heroLogic))failures.push('hero rotation must wait for pending media to finish loading');
if(/addEventListener\('mouseenter'/.test(heroLogic))failures.push('hover must not pause the hero rotation');
if(!/media-curation\.json'.*cache: 'no-store'/s.test(catalogueScript))failures.push('the media catalogue must bypass cached curation data');
if(!/media-curation\.json'.*cache:'no-store'/s.test(homepageScript))failures.push('the homepage must bypass cached curation data');
if(!/space-media-curation-updated/.test(homepageScript))failures.push('the homepage must invalidate an open rotation deck after a curation save');
if(!/space-media-curation-updated/.test(catalogueScript)||!/space-media-curation-updated/.test(approvalScript))failures.push('both hero catalogues must notify open homepage tabs after saving');

console.log(JSON.stringify({
  rotations:pairs.length,
  eligibleBrands:scheduler.brandCount,
  eligibleAssets:scheduler.assetCount,
  totalExposures:stats.selections,
  assetExposureRange:[Math.min(...assetCounts),Math.max(...assetCounts)],
  completeCycleAssets:firstCompleteCycle.size,
  reloadOpeningsChecked:30,
  failures
},null,2));

if(failures.length)process.exitCode=1;

global.window={};
const fs=require('node:fs');

require('../assets/brand-taxonomy.js');
require('../assets/media-curation.js');
// Exercise the exact lightweight catalogue loaded by the homepage. Testing the
// full authoring manifest previously hid regressions where eligible hero media
// was accidentally omitted from the production runtime.
require('../assets/media-runtime.js');
require('../js/hero-scheduler.js');

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
let previousBrands=new Set(),previousAssets=new Set();

pairs.forEach((pair,index)=>{
  if(pair.length!==2)failures.push(`rotation ${index+1}: expected two assets, received ${pair.length}`);
  const brands=pair.map(item=>item.__heroBrand);
  const assets=pair.map(item=>item.id);
  if(new Set(brands).size!==brands.length)failures.push(`rotation ${index+1}: duplicate brand in pair`);
  if(new Set(assets).size!==assets.length)failures.push(`rotation ${index+1}: duplicate asset in pair`);
  if(brands.some(brand=>previousBrands.has(brand)))failures.push(`rotation ${index+1}: brand repeated from prior pair`);
  if(assets.some(asset=>previousAssets.has(asset)))failures.push(`rotation ${index+1}: asset repeated from prior pair`);
  previousBrands=new Set(brands);previousAssets=new Set(assets);
});

const stats=scheduler.stats();
const brandCounts=Object.values(stats.brands);
const brandSpread=Math.max(...brandCounts)-Math.min(...brandCounts);
if(brandSpread>1)failures.push(`brand exposure spread is ${brandSpread}, expected at most 1`);

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

const homepage=fs.readFileSync(require('node:path').join(__dirname,'..','index.html'),'utf8');
if((homepage.match(/is-opening-placeholder/g)||[]).length!==2)failures.push('homepage must contain two neutral opening placeholders');
if(/is-opening-placeholder[^>]*>\s*<img/i.test(homepage))failures.push('opening placeholders must not download fixed photographs');

console.log(JSON.stringify({
  rotations:pairs.length,
  eligibleBrands:scheduler.brandCount,
  eligibleAssets:scheduler.assetCount,
  totalExposures:stats.selections,
  brandExposureRange:[Math.min(...brandCounts),Math.max(...brandCounts)],
  reloadOpeningsChecked:30,
  failures
},null,2));

if(failures.length)process.exitCode=1;

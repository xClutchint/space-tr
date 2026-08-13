global.window={};

require('../assets/brand-taxonomy.js');
require('../assets/media-curation.js');
require('../assets/media-manifest.js');
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

console.log(JSON.stringify({
  rotations:pairs.length,
  eligibleBrands:scheduler.brandCount,
  eligibleAssets:scheduler.assetCount,
  totalExposures:stats.selections,
  brandExposureRange:[Math.min(...brandCounts),Math.max(...brandCounts)],
  failures
},null,2));

if(failures.length)process.exitCode=1;

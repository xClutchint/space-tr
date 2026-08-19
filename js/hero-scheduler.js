(()=>{
  const shuffled=items=>{
    const copy=[...items];
    for(let index=copy.length-1;index>0;index--){
      const swap=Math.floor(Math.random()*(index+1));
      [copy[index],copy[swap]]=[copy[swap],copy[index]];
    }
    return copy;
  };

  const create=(items,{pairSize=2,canonicalize=value=>String(value||''),previousItems=[]}={})=>{
    const usable=items.filter(item=>item&&item.id);
    const byBrand=new Map();
    usable.forEach(item=>{
      const brand=canonicalize(item.brand)||item.brand||'Space';
      item.__heroBrand=brand;
      if(!byBrand.has(brand))byBrand.set(brand,[]);
      byBrand.get(brand).push(item);
    });
    const brandCounts=new Map([...byBrand.keys()].map(brand=>[brand,0]));
    const assetCounts=new Map(usable.map(item=>[item.id,0]));
    const brandTieBreak=new Map(shuffled([...byBrand.keys()]).map((brand,index)=>[brand,index]));
    const assetTieBreak=new Map(shuffled(usable).map((item,index)=>[item.id,index]));
    let previousBrands=new Set(previousItems.map(item=>canonicalize(item?.brand)||item?.brand||'Space'));
    let previousAssets=new Set(previousItems.map(item=>item?.id).filter(Boolean)),selectionCount=0;

    const rankedBrands=(blocked,avoidPrevious)=>[...byBrand.keys()]
      .filter(brand=>!blocked.has(brand)&&(!avoidPrevious||!previousBrands.has(brand)))
      .sort((left,right)=>(brandCounts.get(left)-brandCounts.get(right))||(brandTieBreak.get(left)-brandTieBreak.get(right)));
    const chooseAsset=brand=>byBrand.get(brand)
      .filter(item=>!previousAssets.has(item.id)||byBrand.get(brand).length===1)
      .sort((left,right)=>(assetCounts.get(left.id)-assetCounts.get(right.id))||(assetTieBreak.get(left.id)-assetTieBreak.get(right.id)))[0]
      ||byBrand.get(brand).sort((left,right)=>(assetCounts.get(left.id)-assetCounts.get(right.id))||(assetTieBreak.get(left.id)-assetTieBreak.get(right.id)))[0];

    const nextPair=()=>{
      if(!usable.length)return [];
      const result=[],usedBrands=new Set(),usedAssets=new Set();
      for(let slot=0;slot<pairSize;slot++){
        let candidates=rankedBrands(usedBrands,true);
        if(!candidates.length)candidates=rankedBrands(usedBrands,false);
        const brand=candidates[0];
        if(!brand)break;
        let asset=chooseAsset(brand);
        if(usedAssets.has(asset?.id))asset=byBrand.get(brand).find(item=>!usedAssets.has(item.id))||asset;
        if(!asset)continue;
        result.push(asset);usedBrands.add(brand);usedAssets.add(asset.id);
        brandCounts.set(brand,brandCounts.get(brand)+1);
        assetCounts.set(asset.id,assetCounts.get(asset.id)+1);
        selectionCount+=1;
      }
      previousBrands=new Set(result.map(item=>item.__heroBrand));
      previousAssets=new Set(result.map(item=>item.id));
      return result;
    };
    const stats=()=>({
      selections:selectionCount,
      brands:Object.fromEntries([...brandCounts].sort()),
      assets:Object.fromEntries([...assetCounts].sort())
    });
    return {nextPair,stats,brandCount:byBrand.size,assetCount:usable.length};
  };

  window.SpaceHeroScheduler={create};
})();

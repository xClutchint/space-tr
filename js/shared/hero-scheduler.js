(()=>{
  const shuffled=items=>{
    const copy=[...items];
    for(let index=copy.length-1;index>0;index--){
      const swap=Math.floor(Math.random()*(index+1));
      [copy[index],copy[swap]]=[copy[swap],copy[index]];
    }
    return copy;
  };

  const normalized=value=>String(value||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

  const knownFamilies=[
    [/\bnaseej oud\b/,'naseej-oud'],
    [/\bcocoa kimiya\b/,'cocoa-kimiya'],
    [/\bkawa karda\b/,'kawa-karda'],
    [/\brose omeyyade\b/,'rose-omeyyade'],
    [/\brouge saray\b/,'rouge-saray'],
    [/\blune feline\b/,'lune-feline'],
    [/\bnuda veritas\b/,'nuda-veritas'],
    [/\bnovae vanilla\b/,'novae-vanilla'],
    [/^rs\b/,'riviera-sunrise'],
    [/\bblack mango\b/,'black-mango'],
    [/\boud candy\b/,'oud-candy'],
    [/\bblack karak\b/,'black-karak']
  ];

  const productKey=(item,canonicalize=value=>String(value||''))=>{
    const brand=canonicalize(item?.brand)||item?.brand||'Space';
    const label=normalized(item?.label);
    const known=knownFamilies.find(([pattern])=>pattern.test(label));
    if(known)return `${brand}:${known[1]}`;
    const cleaned=label
      .replace(/\b(?:extrait|extreme|story|studio|campaign|concept|teaser|edit|copy|key visual|gros plan|close up|depth detail|box bottle set)\b/g,' ')
      .replace(/\b(?:19|20)\d{2}\b|\b\d+(?:x\d+)?\b|\bml\b/g,' ')
      .replace(/\s+/g,' ').trim();
    return `${brand}:${cleaned||item?.id||label}`;
  };

  const create=(items,{pairSize=2,canonicalize=value=>String(value||''),previousItems=[],familyKey=productKey}={})=>{
    const usable=items.filter(item=>item&&item.id);
    const brandCounts=new Map(),assetCounts=new Map(usable.map(item=>[item.id,0]));
    const atelierBrand=canonicalize('Atelier des Ors')||'Atelier des Ors';
    usable.forEach(item=>{
      item.__heroBrand=canonicalize(item.brand)||item.brand||'Space';
      item.__heroFamily=familyKey(item,canonicalize);
      brandCounts.set(item.__heroBrand,0);
    });

    let deck=[],selectionCount=0,pairCount=0;
    let lastAtelierPair=Number.NEGATIVE_INFINITY,atelierPairs=new Set();
    let previousFamilies=new Set(previousItems.map(item=>familyKey(item,canonicalize)));
    let previousAssets=new Set(previousItems.map(item=>item?.id).filter(Boolean));
    const scheduleAtelierPairs=()=>{
      const atelierCount=deck.filter(item=>item.__heroBrand===atelierBrand).length;
      atelierPairs=new Set();
      if(!atelierCount)return;

      const firstPair=pairCount;
      const finalPair=firstPair+Math.ceil(deck.length/pairSize)-1;
      const schedules=[];
      const collect=(candidate,remaining,chosen)=>{
        if(!remaining){schedules.push(chosen);return}
        const latest=finalPair-(remaining-1)*3;
        for(let current=candidate;current<=latest;current+=1){
          collect(current+3,remaining-1,[...chosen,current]);
        }
      };
      collect(Math.max(firstPair,lastAtelierPair+3),atelierCount,[]);
      const selected=schedules[Math.floor(Math.random()*schedules.length)];
      if(selected)atelierPairs=new Set(selected);
    };
    const refill=()=>{deck=shuffled(usable);scheduleAtelierPairs()};
    const remainingCount=(property,value)=>deck.reduce((count,item)=>count+(item[property]===value?1:0),0);
    const chooseIndex=(usedBrands,usedFamilies,requiresAtelier)=>{
      const respectsAtelierSpacing=item=>requiresAtelier
        ?(usedBrands.has(atelierBrand)?item.__heroBrand!==atelierBrand:item.__heroBrand===atelierBrand)
        :item.__heroBrand!==atelierBrand;
      const strategies=[
        item=>!usedBrands.has(item.__heroBrand)&&!usedFamilies.has(item.__heroFamily)&&!previousFamilies.has(item.__heroFamily)&&!previousAssets.has(item.id),
        item=>!usedBrands.has(item.__heroBrand)&&!usedFamilies.has(item.__heroFamily)&&!previousFamilies.has(item.__heroFamily),
        item=>!usedBrands.has(item.__heroBrand)&&!usedFamilies.has(item.__heroFamily),
        item=>!usedFamilies.has(item.__heroFamily),
        ()=>true
      ];
      for(const allows of strategies){
        const candidates=deck.map((item,index)=>({item,index})).filter(({item})=>respectsAtelierSpacing(item)&&allows(item));
        if(candidates.length){
          candidates.sort((left,right)=>
            (remainingCount('__heroBrand',right.item.__heroBrand)-remainingCount('__heroBrand',left.item.__heroBrand))
            ||(remainingCount('__heroFamily',right.item.__heroFamily)-remainingCount('__heroFamily',left.item.__heroFamily))
          );
          return candidates[0].index;
        }
      }
      return -1;
    };

    const nextPair=()=>{
      if(!usable.length)return [];
      if(!deck.length)refill();
      const result=[],usedBrands=new Set(),usedFamilies=new Set();
      const requiresAtelier=atelierPairs.has(pairCount);
      for(let slot=0;slot<pairSize;slot++){
        if(!deck.length)refill();
        const index=chooseIndex(usedBrands,usedFamilies,requiresAtelier);
        if(index<0)break;
        const [asset]=deck.splice(index,1);
        result.push(asset);usedBrands.add(asset.__heroBrand);usedFamilies.add(asset.__heroFamily);
        brandCounts.set(asset.__heroBrand,(brandCounts.get(asset.__heroBrand)||0)+1);
        assetCounts.set(asset.id,(assetCounts.get(asset.id)||0)+1);
        selectionCount+=1;
      }
      if(result.length===2&&pairCount%2)result.reverse();
      if(result.some(item=>item.__heroBrand===atelierBrand))lastAtelierPair=pairCount;
      atelierPairs.delete(pairCount);
      pairCount+=1;
      previousFamilies=new Set(result.map(item=>item.__heroFamily));
      previousAssets=new Set(result.map(item=>item.id));
      return result;
    };

    const stats=()=>({
      selections:selectionCount,
      brands:Object.fromEntries([...brandCounts].sort()),
      assets:Object.fromEntries([...assetCounts].sort())
    });
    return {nextPair,stats,brandCount:brandCounts.size,assetCount:usable.length};
  };

  window.SpaceHeroScheduler={create,productKey};
})();

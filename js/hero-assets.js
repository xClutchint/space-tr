(()=>{
  const library=window.SPACE_MEDIA_LIBRARY?.media||[];
  const taxonomy=window.SPACE_BRAND_TAXONOMY||{isRetired:()=>false};
  const base=window.SPACE_MEDIA_CURATION||{version:1,hero:{excludeLightBackgrounds:true,excluded:[],included:[]},carousel:{excluded:[],included:[]}};
  const state={search:'',brand:'',tone:'',status:'all',curation:JSON.parse(JSON.stringify(base))};
  state.curation.hero||={excludeLightBackgrounds:true,excluded:[],included:[]};
  state.curation.carousel||={excluded:[],included:[]};

  const $=selector=>document.querySelector(selector);
  const grid=$('[data-grid]');
  const template=$('#asset-card-template');
  const settings=()=>state.curation.hero;
  const editorial=item=>!/(pack[ -]?shot|png images|no background|textclipping)/i.test(item.src);
  // Mirrors the production hero pool in js/main.js exactly.
  const candidate=item=>item.webReady&&item.optimizedSrc&&!taxonomy.isRetired(item.brand)&&item.orientation==='vertical'&&editorial(item);
  const candidates=library.filter(candidate);
  const manuallyExcluded=item=>settings().excluded.includes(item.id);
  const manuallyIncluded=item=>settings().included.includes(item.id);
  const autoLight=item=>settings().excludeLightBackgrounds!==false&&item.type!=='video'&&(item.backgroundTone==='light'||(item.edgeLuminance>=205&&item.lightNeutralRatio>=.25))&&!manuallyIncluded(item);
  const approved=item=>!manuallyExcluded(item)&&!autoLight(item);
  const source=item=>String(item.thumbnailSrc||item.optimizedSrc||item.src).split('/').map(segment=>encodeURIComponent(segment)).join('/');

  const matches=item=>{
    const isApproved=approved(item);
    if(state.status==='approved'&&!isApproved)return false;
    if(state.status==='excluded'&&isApproved)return false;
    if(state.brand&&item.brand!==state.brand)return false;
    if(state.tone&&(item.backgroundTone||'unknown')!==state.tone)return false;
    if(state.search&&!`${item.brand} ${item.label} ${item.src}`.toLowerCase().includes(state.search))return false;
    return true;
  };

  const mediaNode=item=>{
    if(item.type==='video'){
      const video=document.createElement('video');
      video.src=source(item);video.muted=true;video.loop=true;video.playsInline=true;video.preload='metadata';
      video.addEventListener('mouseenter',()=>video.play().catch(()=>{}));
      video.addEventListener('mouseleave',()=>{video.pause();video.currentTime=0});
      return video;
    }
    const image=document.createElement('img');
    image.src=source(item);image.alt=`${item.brand} ${item.label}`;image.loading='lazy';image.decoding='async';
    return image;
  };

  const toggle=item=>{
    const excluded=new Set(settings().excluded),included=new Set(settings().included);
    if(manuallyExcluded(item)){excluded.delete(item.id);included.add(item.id)}
    else if(autoLight(item)){included.add(item.id)}
    else{excluded.add(item.id);included.delete(item.id)}
    settings().excluded=[...excluded];settings().included=[...included];
    render();setSaveStatus('Unsaved changes');
  };

  const render=()=>{
    const visible=candidates.filter(matches);
    grid.replaceChildren();
    visible.forEach(item=>{
      const fragment=template.content.cloneNode(true);
      const card=fragment.querySelector('.asset-card');
      const isApproved=approved(item);
      fragment.querySelector('.asset-preview').append(mediaNode(item));
      fragment.querySelector('.asset-state').textContent=isApproved?'APPROVED':autoLight(item)?'LIGHT BACKGROUND':'EXCLUDED';
      fragment.querySelector('.asset-brand').textContent=item.brand||'Space';
      fragment.querySelector('.asset-name').textContent=item.label||item.src.split('/').pop();
      fragment.querySelector('.asset-dimensions').textContent=`${item.width} × ${item.height}`;
      fragment.querySelector('.asset-tone').textContent=item.backgroundTone||'unknown';
      const button=fragment.querySelector('.approval-button');
      button.textContent=isApproved?'Exclude from hero':'Approve for hero';
      button.setAttribute('aria-label',`${button.textContent}: ${item.brand} ${item.label}`);
      button.addEventListener('click',()=>toggle(item));
      card.classList.toggle('is-excluded',!isApproved);
      grid.append(fragment);
    });
    const approvedCount=candidates.filter(approved).length;
    $('[data-approved-count]').textContent=approvedCount;
    $('[data-excluded-count]').textContent=candidates.length-approvedCount;
    $('[data-total-count]').textContent=candidates.length;
    $('[data-summary]').textContent=`${visible.length} assets shown · ${approvedCount} approved for both hero banners`;
  };

  const setSaveStatus=message=>$('[data-save-status]').textContent=message;
  [...new Set(candidates.map(item=>item.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b)).forEach(brand=>{
    const option=document.createElement('option');option.value=option.textContent=brand;$('[data-brand]').append(option);
  });
  $('[data-search]').addEventListener('input',event=>{state.search=event.target.value.trim().toLowerCase();render()});
  $('[data-brand]').addEventListener('change',event=>{state.brand=event.target.value;render()});
  $('[data-tone]').addEventListener('change',event=>{state.tone=event.target.value;render()});
  $('[data-status]').addEventListener('change',event=>{state.status=event.target.value;render()});
  $('[data-exclude-light]').checked=settings().excludeLightBackgrounds!==false;
  $('[data-exclude-light]').addEventListener('change',event=>{settings().excludeLightBackgrounds=event.target.checked;render();setSaveStatus('Unsaved changes')});
  $('[data-save]').addEventListener('click',async()=>{
    setSaveStatus('Saving…');
    try{
      const response=await fetch('/api/media-curation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(state.curation)});
      if(!response.ok)throw new Error('save failed');
      const data=await response.json();state.curation=data.curation;render();setSaveStatus('Approvals saved to the homepage');
    }catch{
      const blob=new Blob([JSON.stringify(state.curation,null,2)],{type:'application/json'}),link=document.createElement('a');
      link.href=URL.createObjectURL(blob);link.download='hero-asset-approvals.json';link.click();URL.revokeObjectURL(link.href);
      setSaveStatus('Approval file downloaded');
    }
  });
  render();
})();

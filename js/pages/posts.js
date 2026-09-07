(() => {
  const PAGE_SIZE = 10;
  const language = document.documentElement.lang === 'fr' ? 'fr' : 'en';
  const copy = {
    en:{home:'Home',browse:'Browse',sort:'Sort by date',latest:'Latest first',oldest:'Oldest first',apply:'Apply',reset:'Reset filters',noResults:'No posts have been published yet.',address:'Address',email:'E-mail',read:'Read article',previous:'Previous',next:'Next'},
    fr:{home:'Accueil',browse:'Parcourir',sort:'Trier par date',latest:'Plus recents',oldest:'Plus anciens',apply:'Appliquer',reset:'Reinitialiser',noResults:"Aucun article n'a encore été publié.",address:'Adresse',email:'E-mail',read:"Lire l'article",previous:'Precedent',next:'Suivant'}
  };
  const strings = copy[language];
  const list = document.querySelector('.posts-list'), form = document.querySelector('[data-post-filters]');
  const sort = document.querySelector('[data-post-sort]'), reset = document.querySelector('[data-post-reset]');
  const empty = document.querySelector('[data-post-empty]'), pages = document.querySelector('[data-post-pagination]');
  const params = new URLSearchParams(location.search);
  let activeSort = params.get('sort') === 'oldest' ? 'oldest' : 'latest';
  let currentPage = Math.max(parseInt(params.get('page') || '1', 10) || 1, 1);
  let pagination = { page:1, limit:PAGE_SIZE, total:0, totalPages:1 };
  const escapeUrl = value => { const source=String(value||'').trim(); return /^https?:\/\//i.test(source)||source.startsWith('/')?source:`/${source.replace(/^\.\//,'')}`; };
  const dateLabel = value => { const date=new Date(`${String(value||'').slice(0,10)}T00:00:00Z`); return Number.isNaN(date.valueOf())?'':new Intl.DateTimeFormat(language,{day:'2-digit',month:'long',year:'numeric',timeZone:'UTC'}).format(date); };

  function card(post) {
    const article=document.createElement('article'); article.className='post-card'; article.dataset.postCard=''; article.dataset.postKind='blog'; article.dataset.postDate=post.date||'';
    const link=document.createElement('a'),preview=new URLSearchParams(location.search).get('preview'); link.className='post-card-link'; link.href=`/${language}/posts/${encodeURIComponent(post.slug)}${preview?`?preview=${encodeURIComponent(preview)}`:''}`;
    const type=document.createElement('span'); type.className='post-type'; type.innerHTML='<i aria-hidden="true"></i><span>Blog</span>';
    const heading=document.createElement('span'); heading.className='post-card-heading';
    const h2=document.createElement('h2'); h2.textContent=post.title||'Space'; heading.append(h2);
    const time=document.createElement('time'); time.dateTime=post.date||''; time.textContent=dateLabel(post.date);
    const thumb=document.createElement('span'); thumb.className='post-thumb'; const source=escapeUrl(post.imageUrl);
    if(source){const image=document.createElement('img');image.src=source;image.alt='';image.loading='lazy';image.decoding='async';thumb.append(image)}else thumb.classList.add('is-empty');
    const action=document.createElement('span'); action.className='post-action'; action.textContent=strings.read;
    link.append(type,heading,time,thumb,action); article.append(link); return article;
  }
  function button(label,page,disabled,current=false){const node=document.createElement('button');node.type='button';node.textContent=label;node.disabled=disabled;if(current)node.setAttribute('aria-current','page');if(!disabled&&!current)node.addEventListener('click',()=>load(page,true));return node}
  function renderPagination(){pages.replaceChildren();const {page,total,totalPages}=pagination;empty.hidden=total!==0;if(totalPages<=1||!total){pages.hidden=true;return}pages.hidden=false;pages.append(button(strings.previous,page-1,page===1));for(let n=1;n<=totalPages;n++){if(totalPages>7&&Math.abs(n-page)>1&&n!==1&&n!==totalPages){if(n===2||n===totalPages-1){const dots=document.createElement('span');dots.textContent='...';pages.append(dots)}continue}pages.append(button(String(n),n,false,n===page))}pages.append(button(strings.next,page+1,page===totalPages))}
  function syncUrl(){const url=new URL(location.href);currentPage>1?url.searchParams.set('page',String(currentPage)):url.searchParams.delete('page');activeSort==='oldest'?url.searchParams.set('sort','oldest'):url.searchParams.delete('sort');history.replaceState({},'',url.pathname+url.search)}
  async function load(page=1,scroll=false){currentPage=Math.max(1,page);list?.setAttribute('aria-busy','true');try{const query=new URLSearchParams({page:String(currentPage),limit:String(PAGE_SIZE),sort:activeSort,language}),preview=new URLSearchParams(location.search).get('preview');if(preview)query.set('preview',preview);const response=await fetch(`/api/posts?${query}`,{headers:{Accept:'application/json'}});if(!response.ok)throw new Error();const data=await response.json();list.replaceChildren(...data.posts.map(card));pagination=data.pagination;currentPage=pagination.page;renderPagination();syncUrl();if(scroll)document.querySelector('.posts-stream')?.scrollIntoView({behavior:'smooth',block:'start'})}catch{empty.hidden=false;empty.textContent=language==='fr'?'Les articles sont temporairement indisponibles.':'Articles are temporarily unavailable.'}finally{list?.removeAttribute('aria-busy')}}
  document.querySelectorAll('[data-copy]').forEach(node=>{const value=strings[node.dataset.copy];if(typeof value==='string')node.textContent=value});
  document.querySelectorAll('[data-lang]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.lang===language));button.addEventListener('click',()=>{if(button.dataset.lang!==language)location.href=`/${button.dataset.lang}/posts.html`})});
  sort.value=activeSort;form?.addEventListener('submit',event=>{event.preventDefault();activeSort=sort.value==='oldest'?'oldest':'latest';load(1)});reset?.addEventListener('click',()=>{sort.value='latest';activeSort='latest';load(1)});load(currentPage);
})();

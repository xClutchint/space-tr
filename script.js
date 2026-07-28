const body=document.body,menu=document.querySelector('.menu-toggle'),nav=document.querySelector('.main-nav');
if(menu){menu.addEventListener('click',()=>{const open=body.classList.toggle('menu-open');menu.setAttribute('aria-expanded',String(open))});nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{body.classList.remove('menu-open');menu.setAttribute('aria-expanded','false')}))}
document.querySelectorAll('[data-coming-soon]').forEach(link=>link.addEventListener('click',event=>event.preventDefault()));
const siteHeader=document.querySelector('.site-header'),hero=document.querySelector('.hero');
let previousScroll=window.scrollY,heroCrossed=false;
function updateSmartHeader(){
  if(siteHeader?.classList.contains('landing-header'))return;
  const currentScroll=window.scrollY;
  const threshold=hero?Math.max(hero.offsetHeight-90,120):0;
  const pastHero=!hero||currentScroll>=threshold;
  siteHeader?.classList.toggle('past-hero',pastHero);
  const logo=siteHeader?.querySelector('.brand img');
  if(logo)logo.src=pastHero?logo.dataset.headerLogo||logo.src:logo.dataset.landingLogo||logo.src;
  if(!pastHero){siteHeader?.classList.remove('header-hidden');heroCrossed=false}
  else if(!heroCrossed){siteHeader?.classList.remove('header-hidden');heroCrossed=true}
  else if(currentScroll>previousScroll+3&&!body.classList.contains('menu-open'))siteHeader?.classList.add('header-hidden');
  else if(currentScroll<previousScroll-3)siteHeader?.classList.remove('header-hidden');
  previousScroll=currentScroll;
}
window.addEventListener('scroll',updateSmartHeader,{passive:true});updateSmartHeader();
const translations={
  'About':'À propos','Brands':'Marques','Expertise':'Expertise','Markets':'Marchés','People':'Équipe','Team':'Équipe','Careers':'Carrières','Contact':'Contact','Contact Us':'Contactez-nous',
  'Bringing the best of global beauty brands to local audiences.':'Rapprocher les plus grandes marques mondiales de beauté des consommateurs locaux.',
  'Space is a specialist fragrance and beauty distributor connecting international brands with retailers and consumers across Africa and the Indian Subcontinent.':'Space est un distributeur spécialisé en parfumerie et beauté, reliant les marques internationales aux détaillants et aux consommateurs en Afrique et dans le sous-continent indien.',
  'View all brands':'Voir toutes les marques',
  'About Space':'À propos de Space','Discover Space':'Découvrir Space','Countries served':'Pays desservis','Brand partners':'Marques partenaires','Available SKUs':'Références disponibles','Approved points of sale':'Points de vente agréés',
  'Trusted with brands that define beauty.':'La confiance des marques qui définissent la beauté.','Explore the portfolio. Hover, focus or tap a brand card to reveal more.':'Découvrez le portefeuille. Survolez, sélectionnez ou touchez une carte pour en savoir plus.',
  'Our expertise':'Notre expertise','Building brands beyond distribution.':'Développer les marques au-delà de la distribution.','Market strategy':'Stratégie de marché','Sales & distribution':'Vente et distribution','Brand stewardship':'Gestion de marque','Marketing & activation':'Marketing et activation',
  'Our network':'Notre réseau','Regional infrastructure.':'Infrastructure régionale.','Local intelligence.':'Expertise locale.','Regional operations':'Opérations régionales','Focused ventures.':'Entreprises spécialisées.','Shared standards.':'Exigence commune.',
  'Our people':'Notre équipe','Led by people who understand brands and markets.':'Dirigé par des experts qui comprennent les marques et les marchés.','Meet our leadership':'Rencontrer notre direction',
  'The Space standard':'L’exigence Space','Global consistency.':'Cohérence mondiale.','Local resonance.':'Résonance locale.','Start a conversation':'Échangeons','Let’s create lasting':'Créons une présence','market presence.':'durable sur le marché.','Send enquiry':'Envoyer la demande',
  'Name':'Nom','Work email':'E-mail professionnel','Company':'Entreprise','How can we help?':'Comment pouvons-nous vous aider ?',
  'Our people':'Notre équipe','Leadership':'Direction','How we work':'Notre méthode','Careers at Space':'Carrières chez Space','Open positions':'Postes à pourvoir','Working at Space':'Travailler chez Space','Space insights':'Perspectives Space','Latest thinking':'Dernières analyses','Home':'Accueil','Insights':'Actualités','Explore':'Explorer','Connect':'Nous contacter'
};
const translatable=[];
document.querySelectorAll('h1,h2,h3,p,a,button,label span,.metrics span').forEach(element=>{if(element.children.length===0){const english=element.textContent.trim();if(translations[english])translatable.push({element,english})}});
document.body.insertAdjacentHTML('beforeend','<svg class="glass-filter" aria-hidden="true"><filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox"><feTurbulence type="fractalNoise" baseFrequency="0.001 0.005" numOctaves="1" seed="17" result="turbulence"/><feComponentTransfer in="turbulence" result="mapped"><feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5"/><feFuncG type="gamma" amplitude="0" exponent="1" offset="0"/><feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5"/></feComponentTransfer><feGaussianBlur in="turbulence" stdDeviation="3" result="softMap"/><feSpecularLighting in="softMap" surfaceScale="5" specularConstant="1" specularExponent="100" lighting-color="white" result="specLight"><fePointLight x="-200" y="-200" z="300"/></feSpecularLighting><feComposite in="specLight" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="litImage"/><feDisplacementMap in="SourceGraphic" in2="softMap" scale="80" xChannelSelector="R" yChannelSelector="G"/></filter></svg>');
const languageSwitch=document.createElement('div');languageSwitch.className='language-switch';languageSwitch.setAttribute('role','group');languageSwitch.setAttribute('aria-label','Language');languageSwitch.innerHTML='<span class="glass-distortion" aria-hidden="true"></span><span class="glass-sheen" aria-hidden="true"></span><span class="language-thumb" aria-hidden="true"></span><button type="button" data-lang="en">EN</button><button type="button" data-lang="fr">FR</button>';
nav?.appendChild(languageSwitch);
function setLanguage(language){document.documentElement.lang=language;translatable.forEach(({element,english})=>element.textContent=language==='fr'?translations[english]:english);languageSwitch.classList.toggle('is-fr',language==='fr');languageSwitch.querySelectorAll('button').forEach(button=>{const current=button.dataset.lang===language;button.classList.toggle('is-current',current);button.setAttribute('aria-pressed',String(current))});localStorage.setItem('space-language',language)}
languageSwitch.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.lang)));
setLanguage(localStorage.getItem('space-language')==='fr'?'fr':'en');
const localeCopy={
  en:{
    expertiseSectionLabel:'What we do',
    expertiseWordSpace:'Space',expertiseWordManages:'manages',expertiseWordEvery:'every',expertiseWordStage:'stage',expertiseWordBetween:'between',expertiseWordBrand:'brand',expertiseWordAmbition:'ambition',expertiseWordAnd:'and',expertiseWordMarket:'market',expertiseWordExecution:'execution.',
    expertiseMarketLong:'Space assesses market conditions, positioning and launch requirements to support thoughtful commercial planning. Our approach connects international brand objectives with regional knowledge, helping define practical routes to market and a clear foundation for long-term development.',
    expertiseSalesLong:'Space manages wholesale partnerships, retail relationships and route-to-market execution across domestic, duty-free and e-commerce channels. Our regional network connects brands with retailers and consumers while supporting consistent commercial execution across Africa and the Indian Subcontinent.',
    expertiseStewardshipLong:'Space supports consistent brand presentation, pricing discipline and established brand standards across local markets. Our teams work with partners to maintain each brand\u2019s identity while adapting execution to the commercial realities and consumer expectations of individual markets.',
    expertiseMarketingLong:'Space supports launches, campaigns, visual merchandising, beauty advisor training and consumer-facing activations. These activities are planned around each brand\u2019s positioning and adapted to local retail environments, helping partners deliver coherent and relevant experiences at every consumer touchpoint.',
    expertiseOperationsLong:'Space coordinates inventory planning, warehousing, order fulfilment and regional supply requirements. Strategic stock holdings and experienced local teams support dependable operations across markets, helping partners manage product availability, smaller orders and access to a broader brand portfolio.',
    navAbout:'About',navExpertise:'Expertise',navBrands:'Brands',navTeam:'Team',navCareers:'Careers',navContact:'Contact Us',
    heroHeadline:'Bringing the best of global beauty brands to local audiences.',viewBrands:'View all brands',
    brandsEyebrow:'Our portfolio',brandsTitle:'Brands',brandsHeadline:'Trusted with brands that define beauty.',
    brandsIntro:'The portfolio of brands that we proudly partner with.',brandsCount:'International fragrance & beauty partners',
    aboutHeadline:'Space is a specialist fragrance and beauty distributor connecting international brands with retailers and consumers across Africa and the Indian Subcontinent.',
    aboutIntro:'Space is a specialist fragrance and beauty distributor connecting international brands with retailers and consumers across Africa and the Indian Subcontinent.',
    aboutDetail:'Through local market knowledge, wholesale distribution and disciplined brand management, our regional teams manage the complete route to market, from commercial planning and retail development to inventory coordination and long-term brand growth.',
    markets:'Markets',brandPartners:'Brand partners',availableSkus:'Available SKUs',discoverSpace:'Discover Space',
    ourPresence:'Our presence',africa:'Africa',uae:'UAE',france:'France',india:'India',
    africaRole:'Regional distribution',uaeRole:'Strategic operations hub',franceRole:'European brand connection',indiaRole:'Local market access',
    filmHeadline:'Enabling beauty<br>without distance.',teamHeadline:'The team',viewProfile:'View profile',
    expertiseEyebrow:'Our expertise',expertiseHeadline:'Space manages every stage between brand ambition and market execution.',
    expertiseInstruction:'Select a capability to explore',expertiseMarket:'Market strategy',expertiseSales:'Sales & distribution',
    expertiseStewardship:'Brand stewardship',expertiseMarketing:'Marketing & activation',expertiseOperations:'Operations & logistics',
    expertiseMarketCopy:'Market assessment, positioning, launch planning and long-term commercial development.',
    expertiseSalesCopy:'Wholesale partnerships, retail relationships, duty-free, e-commerce and route-to-market execution.',
    expertiseStewardshipCopy:'Consistent presentation, pricing discipline and brand standards adapted with local relevance.',
    expertiseMarketingCopy:'Launches, campaigns, visual merchandising, training and consumer-facing brand experiences.',
    expertiseOperationsCopy:'Inventory planning, warehousing, fulfilment and dependable regional supply coordination.',
    previousMember:'Previous team member',nextMember:'Next team member',closeProfile:'Close profile',
    contactHeadline:'Get in touch',contactIntro:'For any inquiries or concerns, please reach out via e-mail and we will be pleased to assist you.',
    addressLabel:'Address',addressValue:'Dubai World Centre, Dubai U.A.E',emailLabel:'E-mail',
    hoursLabel:'Working hours',hoursValue:'Monday to Friday: 10am – 6pm',
    nameLabel:'Name',formEmailLabel:'Email',messageLabel:'Message',submit:'Submit',
    languageLabel:'Language',selectedBrands:'Selected brands',campaignsLabel:'Space brand campaigns',
    regionalPresenceLabel:'Our regional presence',
    regionalOperationsEyebrow:'Regional operations',regionalOperationsHeadline:'Two regional worlds. One considered approach.',
    mavenKicker:'Regional distribution',mavenBody:'Space and Maven Global Limited provide integrated support from strategic brand management through logistics. Through its regional subsidiary, Maven Global Limited, Space supports efficient local-market execution and helps position each product appropriately within its market.',
    feelNzuriKicker:'Fragrance lounge',feelNzuriBody:'FeelNZuri presents a curated selection of niche perfumes in a refined, welcoming setting. Guests can relax by the fireplace, enjoy the garden view from the back deck, and savour coffee or wine. Thoughtful details create an elegant atmosphere rooted in the warmth and authenticity of African hospitality.',learnMore:'Learn more',
    formWait:'Please take a moment before submitting.',formSending:'Sending…',
    formError:'Unable to send your enquiry.',formEmailFallback:'Please email info@space-tr.com directly.',
    formSuccess:'Thank you. Your message has been sent.'
  },
  fr:{
    expertiseSectionLabel:'Notre savoir-faire',
    expertiseWordSpace:'Space',expertiseWordManages:'pilote',expertiseWordEvery:'chaque',expertiseWordStage:'\u00e9tape',expertiseWordBetween:'entre',expertiseWordBrand:'l\u2019ambition',expertiseWordAmbition:'de la marque',expertiseWordAnd:'et',expertiseWordMarket:'son ex\u00e9cution',expertiseWordExecution:'sur le march\u00e9.',
    expertiseMarketLong:'Space analyse les conditions de march\u00e9, le positionnement et les exigences de lancement afin de soutenir une planification commerciale rigoureuse. Notre approche rapproche les objectifs des marques internationales de la connaissance r\u00e9gionale pour d\u00e9finir des voies d\u2019acc\u00e8s au march\u00e9 concr\u00e8tes et une base de d\u00e9veloppement durable.',
    expertiseSalesLong:'Space g\u00e8re les partenariats de gros, les relations avec les d\u00e9taillants et l\u2019ex\u00e9cution commerciale sur les march\u00e9s domestiques, le duty-free et l\u2019e-commerce. Notre r\u00e9seau r\u00e9gional relie les marques aux d\u00e9taillants et aux consommateurs en Afrique et dans le sous-continent indien.',
    expertiseStewardshipLong:'Space veille \u00e0 la coh\u00e9rence de la pr\u00e9sentation, \u00e0 la discipline tarifaire et au respect des standards de marque sur les march\u00e9s locaux. Nos \u00e9quipes travaillent avec les partenaires pour pr\u00e9server l\u2019identit\u00e9 de chaque marque tout en adaptant son ex\u00e9cution aux r\u00e9alit\u00e9s commerciales locales.',
    expertiseMarketingLong:'Space accompagne les lancements, les campagnes, le merchandising visuel, la formation des conseillers beaut\u00e9 et les activations destin\u00e9es aux consommateurs. Ces actions respectent le positionnement de chaque marque et s\u2019adaptent aux environnements retail locaux afin de proposer des exp\u00e9riences coh\u00e9rentes et pertinentes.',
    expertiseOperationsLong:'Space coordonne la planification des stocks, l\u2019entreposage, l\u2019ex\u00e9cution des commandes et les besoins d\u2019approvisionnement r\u00e9gionaux. Les stocks strat\u00e9giques et les \u00e9quipes locales soutiennent des op\u00e9rations fiables, la disponibilit\u00e9 des produits, les commandes de plus petite taille et l\u2019acc\u00e8s \u00e0 un portefeuille de marques plus large.',
    navAbout:'À propos',navExpertise:'Expertise',navBrands:'Marques',navTeam:'Équipe',navCareers:'Carrières',navContact:'Nous contacter',
    heroHeadline:'Les plus grandes marques de beauté internationales, au plus près des marchés locaux.',viewBrands:'Découvrir nos marques',
    brandsEyebrow:'Notre portefeuille',brandsTitle:'Marques',brandsHeadline:'La confiance des marques qui façonnent la beauté.',
    brandsIntro:'Les marques avec lesquelles nous sommes fiers de collaborer.',brandsCount:'Partenaires internationaux de la parfumerie & de la beauté',
    aboutHeadline:'Space est un distributeur spécialisé en parfumerie et beauté qui connecte les marques internationales aux détaillants et aux consommateurs en Afrique et dans le sous-continent indien.',
    aboutIntro:'Space est un distributeur spécialisé en parfumerie et beauté. Nous connectons les marques internationales aux détaillants et aux consommateurs en Afrique et dans le sous-continent indien.',
    aboutDetail:'Grâce à notre connaissance des marchés locaux, à notre réseau de distribution et à une gestion rigoureuse des marques, nos équipes pilotent l’ensemble de la mise sur le marché, de la planification commerciale et du développement retail à la coordination des stocks et à la croissance durable des marques.',
    markets:'Marchés',brandPartners:'Marques partenaires',availableSkus:'Références disponibles',discoverSpace:'Découvrir Space',
    ourPresence:'Notre présence',africa:'Afrique',uae:'Émirats arabes unis',france:'France',india:'Inde',
    africaRole:'Distribution régionale',uaeRole:'Pôle opérationnel stratégique',franceRole:'Lien avec les marques européennes',indiaRole:'Accès au marché local',
    filmHeadline:'La beauté<br>sans frontières.',teamHeadline:'L’équipe',viewProfile:'Voir le profil',
    expertiseEyebrow:'Notre expertise',expertiseHeadline:'Space pilote chaque étape entre l’ambition de la marque et son exécution sur le marché.',
    expertiseInstruction:'Sélectionnez une expertise',expertiseMarket:'Stratégie de marché',expertiseSales:'Vente & distribution',
    expertiseStewardship:'Pilotage de marque',expertiseMarketing:'Marketing & activation',expertiseOperations:'Opérations & logistique',
    expertiseMarketCopy:'Évaluation du marché, positionnement, planification des lancements et développement commercial à long terme.',
    expertiseSalesCopy:'Partenariats de gros, relations avec les détaillants, duty-free, e-commerce et exécution de la mise sur le marché.',
    expertiseStewardshipCopy:'Présentation cohérente, discipline tarifaire et standards de marque adaptés avec pertinence aux marchés locaux.',
    expertiseMarketingCopy:'Lancements, campagnes, merchandising visuel, formation et expériences de marque destinées aux consommateurs.',
    expertiseOperationsCopy:'Planification des stocks, entreposage, exécution des commandes et coordination fiable de l’approvisionnement régional.',
    previousMember:'Profil précédent',nextMember:'Profil suivant',closeProfile:'Fermer le profil',
    contactHeadline:'Parlons de vos projets',contactIntro:'Pour toute demande ou question, écrivez-nous. Notre équipe se fera un plaisir de vous accompagner.',
    addressLabel:'Adresse',addressValue:'Dubai World Centre, Dubaï, Émirats arabes unis',emailLabel:'E-mail',
    hoursLabel:'Horaires',hoursValue:'Du lundi au vendredi, de 10 h à 18 h',
    nameLabel:'Nom',formEmailLabel:'E-mail',messageLabel:'Message',submit:'Envoyer',
    languageLabel:'Langue',selectedBrands:'Sélection de marques',campaignsLabel:'Campagnes de marques Space',
    regionalPresenceLabel:'Notre présence régionale',
    regionalOperationsEyebrow:'Opérations régionales',regionalOperationsHeadline:'Deux univers régionaux. Une même exigence.',
    mavenKicker:'Distribution régionale',mavenBody:'Space et Maven Global Limited proposent un accompagnement intégré, de la gestion stratégique des marques à la logistique. Par l’intermédiaire de sa filiale régionale Maven Global Limited, Space favorise une exécution efficace sur les marchés locaux et un positionnement adapté de chaque produit.',
    feelNzuriKicker:'Salon de parfumerie',feelNzuriBody:'FeelNZuri présente une sélection de parfums de niche dans un cadre raffiné et accueillant. Les visiteurs peuvent se détendre près de la cheminée, profiter de la vue sur le jardin depuis la terrasse et savourer un café ou un verre de vin. Chaque détail compose une atmosphère élégante, empreinte de la chaleur et de l’authenticité de l’hospitalité africaine.',learnMore:'En savoir plus',
    formWait:'Veuillez patienter un instant avant d’envoyer votre message.',formSending:'Envoi en cours…',
    formError:'Votre demande n’a pas pu être envoyée.',formEmailFallback:'Veuillez écrire directement à info@space-tr.com.',
    formSuccess:'Merci. Votre message a bien été envoyé.'
  }
};
let currentLanguage=localStorage.getItem('space-language')==='fr'?'fr':'en';
function applyLocale(language){
  currentLanguage=language==='fr'?'fr':'en';
  const copy=localeCopy[currentLanguage];
  document.documentElement.lang=currentLanguage;
  document.querySelectorAll('[data-i18n]').forEach(element=>{const value=copy[element.dataset.i18n];if(value!==undefined)element.textContent=value});
  document.querySelectorAll('[data-i18n-html]').forEach(element=>{const value=copy[element.dataset.i18nHtml];if(value!==undefined)element.innerHTML=value});
  document.querySelector('.hero-brand-proof')?.setAttribute('aria-label',copy.selectedBrands);
  document.querySelector('[data-hero-media]')?.setAttribute('aria-label',copy.campaignsLabel);
  document.querySelector('.presence-bars')?.setAttribute('aria-label',copy.regionalPresenceLabel);
  document.querySelector('[data-team-prev]')?.setAttribute('aria-label',copy.previousMember);
  document.querySelector('[data-team-next]')?.setAttribute('aria-label',copy.nextMember);
  document.querySelector('[data-team-close]')?.setAttribute('aria-label',copy.closeProfile);
  languageSwitch.setAttribute('aria-label',copy.languageLabel);
  languageSwitch.classList.toggle('is-fr',currentLanguage==='fr');
  languageSwitch.querySelectorAll('button').forEach(button=>{const selected=button.dataset.lang===currentLanguage;button.classList.toggle('is-current',selected);button.setAttribute('aria-pressed',String(selected))});
  localStorage.setItem('space-language',currentLanguage);
  window.dispatchEvent(new CustomEvent('space:languagechange',{detail:{language:currentLanguage}}));
}
setLanguage=applyLocale;
setLanguage(currentLanguage);
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
const expertiseWordTransition=document.querySelector('[data-expertise-word-transition]'),expertiseEditorial=document.querySelector('[data-expertise-editorial]');
if(expertiseWordTransition){
  const expertiseWordHeading=expertiseWordTransition.querySelector('h2');
  const expertiseWords=[...expertiseWordHeading.querySelectorAll('span')];
  const updateExpertiseWordLabel=()=>expertiseWordHeading.setAttribute('aria-label',[...expertiseWordHeading.querySelectorAll('span')].map(word=>word.textContent.trim()).join(' '));
  const expertiseWordObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting)entry.target.classList.add('is-word-visible')}),{threshold:.35,rootMargin:'-12% 0px -32% 0px'});
  expertiseWords.forEach(word=>expertiseWordObserver.observe(word));
  addEventListener('space:languagechange',updateExpertiseWordLabel);
  updateExpertiseWordLabel();
}
if(expertiseEditorial){
  const expertiseCardObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');expertiseCardObserver.unobserve(entry.target)}}),{threshold:.08});
  expertiseCardObserver.observe(expertiseEditorial);
}
const numberStory=document.querySelector('[data-number-story]');
if(numberStory){
  const figures=[...numberStory.querySelectorAll('[data-shuffle-number]')];
  const formatFigure=value=>Number(value).toLocaleString('en-US')+'+';
  const settleFigure=(figure,index)=>{
    const target=figure.dataset.shuffleNumber;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){figure.textContent=formatFigure(target);return}
    const length=String(target).length,start=performance.now()+index*180,duration=1050+index*120;
    const frame=now=>{
      if(now<start){requestAnimationFrame(frame);return}
      const progress=Math.min((now-start)/duration,1),settled=Math.floor(progress*length);
      const targetDigits=String(target).split('');
      const shuffled=targetDigits.map((digit,digitIndex)=>digitIndex<settled?digit:String(Math.floor(Math.random()*10))).join('');
      figure.textContent=Number(shuffled).toLocaleString('en-US')+'+';
      if(progress<1)requestAnimationFrame(frame);else figure.textContent=formatFigure(target);
    };
    requestAnimationFrame(frame);
  };
  const numberObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){figures.forEach(settleFigure);numberObserver.disconnect()}}),{threshold:.45});
  numberObserver.observe(numberStory);
}
const slideObserver=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle('is-in-view',entry.isIntersecting)),{threshold:.28});
document.querySelectorAll('.scroll-slide').forEach(slide=>slideObserver.observe(slide));

/* Keep motion inexpensive: only play video while it is actually visible. */
const managedMedia=[...document.querySelectorAll('video[data-managed-media]')];
if(managedMedia.length){
  const limitMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches||Boolean(navigator.connection?.saveData);
  const mediaInView=new WeakMap();
  const syncMedia=media=>{
    const shouldPlay=!limitMotion&&!document.hidden&&mediaInView.get(media);
    if(shouldPlay){const playback=media.play();if(playback?.catch)playback.catch(()=>{})}else media.pause();
  };
  const mediaObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{mediaInView.set(entry.target,entry.isIntersecting&&entry.intersectionRatio>.12);syncMedia(entry.target)}),{threshold:[0,.12,.4]});
  managedMedia.forEach(media=>mediaObserver.observe(media));
  document.addEventListener('visibilitychange',()=>managedMedia.forEach(syncMedia));
}

/* CSS background images cannot use native lazy-loading, so hydrate them near view. */
const lazyBackgrounds=[...document.querySelectorAll('[data-lazy-bg]')];
if(lazyBackgrounds.length){
  const backgroundObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;const element=entry.target;element.style.setProperty('--regional-image',`url("${element.dataset.lazyBg}")`);element.removeAttribute('data-lazy-bg');backgroundObserver.unobserve(element)}),{rootMargin:'700px 0px'});
  lazyBackgrounds.forEach(element=>backgroundObserver.observe(element));
}
const form=document.querySelector('[data-contact-form]');
if(form){const started=Date.now();form.addEventListener('submit',async event=>{event.preventDefault();const status=form.querySelector('.form-status'),button=form.querySelector('button'),copy=localeCopy[currentLanguage];if(form.website.value)return;if(Date.now()-started<2500){status.textContent=copy.formWait;return}button.disabled=true;status.textContent=copy.formSending;try{const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});const data=await response.json();if(!response.ok)throw new Error(currentLanguage==='fr'?copy.formError:(data.message||copy.formError));status.textContent=copy.formSuccess;form.reset()}catch(error){status.textContent=error.message||copy.formEmailFallback}finally{button.disabled=false}})}
const gallery=document.querySelector('[data-brand-gallery]');
if(gallery){
  const brandNames=['Parfums de Marly','Initio Parfums Privés','Xerjoff','Nishane','Tiziana Terenzi','Casamorati','Giorgio Armani Beauty','Yves Saint Laurent','Gucci','Lancôme','Prada','Valentino','Burberry','Marc Jacobs','Chloé','Ralph Lauren','Boss','Viktor & Rolf','Davidoff','Armaf','Afnan Perfumes','Bond No. 9','The Merchant of Venice','Franck Boclet','Jacques Fath Paris','Affinessence Paris','Chabaud Maison de Parfum','Amouroud','Scalpers Yacht Club','Diesel','Cacharel','Tous','Halloween','Roja','Ormonde Jayne','Ramón Béjar','Montale Paris','Mancera Paris','Goldfield & Banks','Atelier des Ors'];
  gallery.innerHTML=brandNames.map((name,index)=>`<button class="brand-card" type="button" aria-label="${name}, portfolio partner" aria-pressed="false"><span class="brand-card-inner"><span class="brand-face brand-front"><img src="brand%20kit/brand_${index+1}.avif" alt="${name}" loading="lazy" decoding="async"></span><span class="brand-face brand-back"><small>Space portfolio</small><strong>${name}</strong><span>Global brands · Local reach</span></span></span></button>`).join('');
  gallery.querySelectorAll('.brand-card').forEach(card=>card.addEventListener('click',()=>{const flipped=card.classList.toggle('is-flipped');card.setAttribute('aria-pressed',String(flipped))}));
}
const brandTheatre=document.querySelector('[data-brand-theatre]');
if(brandTheatre){
  const theatreBrands=['Parfums de Marly','Initio Parfums PrivÃ©s','Xerjoff','Nishane','Tiziana Terenzi','Casamorati','Giorgio Armani Beauty','Yves Saint Laurent','Gucci','LancÃ´me','Prada','Valentino','Burberry','Marc Jacobs','ChloÃ©','Ralph Lauren','Boss','Viktor & Rolf','Davidoff','Armaf','Afnan Perfumes','Bond No. 9','The Merchant of Venice','Franck Boclet','Jacques Fath Paris','Affinessence Paris','Chabaud Maison de Parfum','Amouroud','Scalpers Yacht Club','Diesel','Cacharel','Tous','Halloween','Roja','Ormonde Jayne','RamÃ³n BÃ©jar','Montale Paris','Mancera Paris','Goldfield & Banks','Atelier des Ors'];
  const scenes=['brand%20kit/gif_1.avif','brand%20kit/gif_3-poster.webp','brand%20kit/gif_4.avif','brand%20kit/static_1.avif'];
  const backdrop=brandTheatre.querySelector('.brand-theatre-backdrop');
  const brandItem=(name,index)=>`<button class="brand-ribbon-item" type="button" data-brand-scene="${index%scenes.length}" aria-label="${name}"><img src="brand%20kit/brand_${index+1}.avif" alt="${name}" loading="lazy" decoding="async"></button>`;
  const firstHalf=theatreBrands.slice(0,20),secondHalf=theatreBrands.slice(20);
  brandTheatre.querySelector('[data-brand-row="one"]').innerHTML=[...firstHalf,...firstHalf].map((name,index)=>brandItem(name,index%20)).join('');
  brandTheatre.querySelector('[data-brand-row="two"]').innerHTML=[...secondHalf,...secondHalf].map((name,index)=>brandItem(name,20+(index%20))).join('');
  brandTheatre.querySelectorAll('[data-brand-scene]').forEach(item=>{
    const revealScene=()=>{backdrop.style.backgroundImage=`linear-gradient(rgba(4,8,15,.34),rgba(4,8,15,.68)),url('${scenes[Number(item.dataset.brandScene)]}')`};
    item.addEventListener('mouseenter',revealScene);item.addEventListener('focus',revealScene);
  });
  const overlay=brandTheatre.querySelector('[data-brand-overlay]');
  brandTheatre.querySelector('[data-brand-index]').innerHTML=theatreBrands.map((name,index)=>`<div><img src="brand%20kit/brand_${index+1}.avif" alt="${name}" loading="lazy"><span>${name}</span></div>`).join('');
  const setOverlay=open=>{overlay.classList.toggle('is-open',open);overlay.setAttribute('aria-hidden',String(!open));document.body.classList.toggle('brand-index-open',open)};
  brandTheatre.querySelector('[data-brand-open]').addEventListener('click',()=>setOverlay(true));
  brandTheatre.querySelector('[data-brand-close]').addEventListener('click',()=>setOverlay(false));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')setOverlay(false)});
}
const brandBrochure=document.querySelector('[data-brand-brochure]');
if(brandBrochure){
  const brochureBrands=['Parfums de Marly','Initio Parfums PrivÃ©s','Xerjoff','Nishane','Tiziana Terenzi','Casamorati','Giorgio Armani Beauty','Yves Saint Laurent','Gucci','LancÃ´me','Prada','Valentino','Burberry','Marc Jacobs','ChloÃ©','Ralph Lauren','Boss','Viktor & Rolf','Davidoff','Armaf','Afnan Perfumes','Bond No. 9','The Merchant of Venice','Franck Boclet','Jacques Fath Paris','Affinessence Paris','Chabaud Maison de Parfum','Amouroud','Scalpers Yacht Club','Diesel','Cacharel','Tous','Halloween','Roja','Ormonde Jayne','RamÃ³n BÃ©jar','Montale Paris','Mancera Paris','Goldfield & Banks','Atelier des Ors'];
  const grid=brandBrochure.querySelector('[data-brand-brochure-grid]');
  grid.innerHTML=brochureBrands.map((name,index)=>`<div class="brand-directory-item"><img src="brand%20kit/brand_${index+1}.avif" alt="${name}" loading="lazy" decoding="async"></div>`).join('');
  const gifSlides=[...brandBrochure.querySelectorAll('.brand-gif-stage img')];let activeGif=0;
  if(gifSlides.length>1&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)window.setInterval(()=>{gifSlides[activeGif].classList.remove('is-active');activeGif=(activeGif+1)%gifSlides.length;gifSlides[activeGif].classList.add('is-active')},6000);
}
const brandRunway=document.querySelector('[data-brand-runway]');
if(brandRunway){
  const runwayBrands=['Parfums de Marly','Initio Parfums PrivÃ©s','Xerjoff','Nishane','Tiziana Terenzi','Casamorati','Giorgio Armani Beauty','Yves Saint Laurent','Gucci','LancÃ´me','Prada','Valentino','Burberry','Marc Jacobs','ChloÃ©','Ralph Lauren','Boss','Viktor & Rolf','Davidoff','Armaf','Afnan Perfumes','Bond No. 9','The Merchant of Venice','Franck Boclet','Jacques Fath Paris','Affinessence Paris','Chabaud Maison de Parfum','Amouroud','Scalpers Yacht Club','Diesel','Cacharel','Tous','Halloween','Roja','Ormonde Jayne','RamÃ³n BÃ©jar','Montale Paris','Mancera Paris','Goldfield & Banks','Atelier des Ors'];
  const rows=Array.from({length:4},(_,rowIndex)=>runwayBrands.slice(rowIndex*10,rowIndex*10+10));
  brandRunway.querySelector('[data-runway-rows]').innerHTML=rows.map((row,rowIndex)=>`<div class="runway-row"><span class="runway-row-number">0${rowIndex+1}</span><div class="runway-logo-line">${row.map((name,itemIndex)=>{const index=rowIndex*10+itemIndex;return `<button type="button" aria-label="${name}"><img src="brand%20kit/brand_${index+1}.avif" alt="${name}" loading="lazy" decoding="async"></button>`}).join('')}</div></div>`).join('');
}
const brandCatalogue=document.querySelector('[data-brand-catalogue]');
if(brandCatalogue){
  const catalogueBrands=['Parfums de Marly','Initio Parfums PrivÃ©s','Xerjoff','Nishane','Tiziana Terenzi','Casamorati','Giorgio Armani Beauty','Yves Saint Laurent','Gucci','LancÃ´me','Prada','Valentino','Burberry','Marc Jacobs','ChloÃ©','Ralph Lauren','Boss','Viktor & Rolf','Davidoff','Armaf','Afnan Perfumes','Bond No. 9','The Merchant of Venice','Franck Boclet','Jacques Fath Paris','Affinessence Paris','Chabaud Maison de Parfum','Amouroud','Scalpers Yacht Club','Diesel','Cacharel','Tous','Halloween','Roja','Ormonde Jayne','RamÃ³n BÃ©jar','Montale Paris','Mancera Paris','Goldfield & Banks','Atelier des Ors'];
  brandCatalogue.querySelector('[data-brand-catalogue-grid]').innerHTML=catalogueBrands.map((name,index)=>`<div class="catalogue-logo"><img src="brand%20kit/brand_${index+1}.avif" alt="${name}" loading="lazy" decoding="async"></div>`).join('');
}
const expertiseAtelier=document.querySelector('[data-expertise-atelier]');
if(expertiseAtelier){
  const expertiseAreas=[
    {title:'Team & BA management',copy:'Space coordinates regional teams and beauty advisors to support consistent day-to-day brand execution across local markets and retail environments.',tags:['Regional teams','BA coordination','Local execution']},
    {title:'Sales & operations',copy:'Our teams support sales and operational coordination across local retail, duty-free and e-commerce channels, helping international products reach regional consumers.',tags:['Local retail','Duty-free','E-commerce','Sales coordination']},
    {title:'Stock & supplies',copy:'Space maintains strategic stock holdings to support partner requirements and improve operational efficiency. This helps reduce the impact of smaller orders while providing access to a wider portfolio of trusted brands.',tags:['Stock holdings','Partner support','Portfolio access','Operational efficiency']},
    {title:'Visual merchandising',copy:'We support the consistent presentation of brands across retail environments, helping visual execution remain aligned with each brand’s identity and standards.',tags:['Retail presentation','Brand identity','Visual consistency']},
    {title:'BA training',copy:'Space provides training support for beauty advisors, helping retail teams develop product knowledge and represent brands consistently at the point of sale.',tags:['Product knowledge','Brand representation','Retail support']},
    {title:'Launches, marketing & activation',copy:'We support brand awareness through launches, in-store activations, marketing initiatives and promotional activities designed for local markets and audiences.',tags:['Launches','In-store activation','Marketing','Promotional activity']}
  ];
  const expertiseScenes=['brand%20kit/gif_1.avif','brand%20kit/UAE.jpg','brand%20kit/static_1.avif','brand%20kit/gif_3-poster.webp','brand%20kit/france.jpg','brand%20kit/gif_4.avif'];
  const buttons=[...expertiseAtelier.querySelectorAll('[data-expertise]')],stage=expertiseAtelier.querySelector('.service-stage'),indexNav=expertiseAtelier.querySelector('.service-index'),ghost=expertiseAtelier.querySelector('[data-expertise-ghost]'),number=expertiseAtelier.querySelector('[data-expertise-number]'),title=expertiseAtelier.querySelector('[data-expertise-title]'),copy=expertiseAtelier.querySelector('[data-expertise-copy]'),tags=expertiseAtelier.querySelector('[data-expertise-tags]'),visual=expertiseAtelier.querySelector('[data-expertise-visual]');let activeExpertise=0,expertiseCycle;
  const showExpertise=index=>{if(index===activeExpertise&&stage.classList.contains('is-ready'))return;activeExpertise=index;stage.classList.add('is-changing','is-ready');window.setTimeout(()=>{const area=expertiseAreas[index],label=String(index+1).padStart(2,'0');expertiseAtelier.dataset.active=String(index);ghost.textContent=label;number.textContent=`${label} / 06`;title.textContent=area.title;copy.textContent=area.copy;tags.innerHTML=area.tags.map(tag=>`<li>${tag}</li>`).join('');visual.src=expertiseScenes[index];buttons.forEach((button,buttonIndex)=>button.classList.toggle('is-active',buttonIndex===index));window.setTimeout(()=>stage.classList.remove('is-changing'),80)},280)};
  const startExpertiseCycle=()=>{window.clearInterval(expertiseCycle);expertiseCycle=window.setInterval(()=>showExpertise((activeExpertise+1)%expertiseAreas.length),6000)};
  buttons.forEach((button,index)=>{button.addEventListener('mouseenter',()=>showExpertise(index));button.addEventListener('focus',()=>showExpertise(index));button.addEventListener('click',()=>{showExpertise(index);startExpertiseCycle()})});
  indexNav.addEventListener('mouseenter',()=>window.clearInterval(expertiseCycle));indexNav.addEventListener('mouseleave',startExpertiseCycle);stage.classList.add('is-ready');startExpertiseCycle();
}
const heroMedia=document.querySelector('[data-hero-media]');
if(heroMedia){
  const slides=[...heroMedia.querySelectorAll('.hero-slide')];
  let activeSlide=0;
  if(slides.length>1&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    window.setInterval(()=>{
      const outgoing=slides[activeSlide];
      const nextIndex=(activeSlide+1)%slides.length;
      const incoming=slides[nextIndex];
      outgoing.classList.remove('is-active');
      outgoing.classList.add('is-leaving');
      incoming.classList.add('is-active');
      window.setTimeout(()=>outgoing.classList.remove('is-leaving'),1100);
      activeSlide=nextIndex;
    },6000);
  }
}
const presenceMap=document.querySelector('[data-presence-map-legacy]');
if(presenceMap){
  const place=presenceMap.querySelector('[data-map-place]');
  const copy=presenceMap.querySelector('[data-map-copy]');
  const descriptions={Africa:'Regional market knowledge and an established distribution network across priority African markets.',France:'A European connection supporting international brand relationships and commercial coordination.',UAE:'The group’s strategic regional hub connecting partners, operations and routes to market.',India:'Local access across one of the world’s most dynamic fragrance and beauty markets.'};
  const africaIds=new Set(['012','024','204','072','854','108','132','120','140','148','174','178','180','262','818','226','232','748','231','266','270','288','324','624','384','404','426','430','434','450','454','466','478','480','504','508','516','562','566','646','678','686','690','694','706','710','728','729','834','768','788','800','894','716','732']);
  const markets=[{name:'Africa',coords:[36.82,-1.29],ids:africaIds},{name:'France',coords:[2.35,48.86],ids:new Set(['250'])},{name:'UAE',coords:[55.27,25.20],ids:new Set(['784'])},{name:'India',coords:[72.88,19.08],ids:new Set(['356'])}];
  const marketFor=feature=>markets.find(market=>market.ids.has(String(feature.id).padStart(3,'0')));
  const activate=market=>{place.textContent=market.name;copy.textContent=descriptions[market.name];presenceMap.querySelectorAll('[data-market]').forEach(node=>node.classList.toggle('is-active',node.dataset.market===market.name))};
  let worldData;
  const renderMap=()=>{
    if(!worldData||!window.d3||!window.topojson)return;
    const svg=d3.select('#regional-map-svg'),width=presenceMap.clientWidth,height=presenceMap.clientHeight;svg.selectAll('*').remove();svg.attr('viewBox',`0 0 ${width} ${height}`);
    const countries=topojson.feature(worldData,worldData.objects.countries).features;
    const regional=countries.filter(feature=>Boolean(marketFor(feature)));
    const projection=d3.geoMercator().fitExtent([[30,70],[width-30,height-115]],{type:'FeatureCollection',features:regional});
    const path=d3.geoPath(projection),layer=svg.append('g').attr('class','map-country-layer');
    layer.selectAll('path').data(regional).join('path').attr('d',path).attr('class',feature=>marketFor(feature)?'country is-present':'country').attr('data-market',feature=>marketFor(feature)?.name||null).on('mouseenter',(_,feature)=>{const market=marketFor(feature);if(market)activate(market)}).on('click',(_,feature)=>{const market=marketFor(feature);if(market)activate(market)});
    const routes=markets.slice(1).map(market=>({type:'LineString',coordinates:[markets[0].coords,market.coords]}));
    svg.append('g').attr('class','map-route-layer').selectAll('path').data(routes).join('path').attr('d',path).attr('class','regional-route');
    const nodes=svg.append('g').attr('class','map-node-layer').selectAll('g').data(markets).join('g').attr('class','regional-node').attr('data-market',market=>market.name).attr('transform',market=>`translate(${projection(market.coords).join(',')})`).on('mouseenter',(_,market)=>activate(market)).on('click',(_,market)=>activate(market));
    nodes.append('circle').attr('r',7);nodes.append('circle').attr('class','pulse').attr('r',7);nodes.append('text').attr('x',13).attr('y',4).text(market=>market.name);
    activate(markets[0]);
  };
  const mapObserver=new IntersectionObserver(entries=>entries.forEach(async entry=>{if(entry.isIntersecting&&!worldData){try{worldData=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(response=>response.json());renderMap();new ResizeObserver(renderMap).observe(presenceMap)}catch{}mapObserver.disconnect()}}),{rootMargin:'180px'});mapObserver.observe(presenceMap);
}

const regionalGridMap=document.querySelector('[data-presence-map]');
if(regionalGridMap){
  const africaIds=new Set(['012','024','204','072','854','108','132','120','140','148','174','178','180','262','818','226','232','748','231','266','270','288','324','624','384','404','426','430','434','450','454','466','478','480','504','508','516','562','566','646','678','686','690','694','706','710','728','729','834','768','788','800','894','716','732']);
  const markets=[{name:'India',ids:new Set(['356'])},{name:'Africa',ids:africaIds},{name:'France',ids:new Set(['250'])},{name:'UAE',ids:new Set(['784'])}];
  const renderRegionalGrid=worldData=>{
    const countries=topojson.feature(worldData,worldData.objects.countries).features;
    const grid=regionalGridMap.querySelector('.regional-map-grid');
    grid.innerHTML=markets.map(market=>`<figure class="regional-map-card"><svg role="img" aria-label="${market.name}"></svg><figcaption>${market.name}</figcaption></figure>`).join('');
    grid.querySelectorAll('.regional-map-card').forEach((card,index)=>{
      const market=markets[index];
      const features=countries.filter(feature=>market.ids.has(String(feature.id).padStart(3,'0')));
      const collection={type:'FeatureCollection',features};
      const svg=d3.select(card.querySelector('svg')).attr('viewBox','0 0 320 240');
      const projection=d3.geoMercator().fitExtent([[42,24],[278,194]],collection);
      const path=d3.geoPath(projection);
      svg.selectAll('path').data(features).join('path').attr('d',path).attr('class','regional-shape');
    });
  };
  const gridObserver=new IntersectionObserver(entries=>entries.forEach(async entry=>{if(entry.isIntersecting){try{const worldData=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(response=>response.json());renderRegionalGrid(worldData)}catch{}gridObserver.disconnect()}}),{rootMargin:'180px'});
  gridObserver.observe(regionalGridMap);
}

const immersiveFilm=document.querySelector('[data-immersive-film]');
if(immersiveFilm){
  let filmProgress=0,touchY=null;
  const setFilmProgress=value=>{
    filmProgress=Math.max(0,Math.min(1,value));
    immersiveFilm.style.setProperty('--film-progress',filmProgress.toFixed(3));
    const mobile=window.innerWidth<768;
    const startWidth=mobile?82:38;
    const startHeight=mobile?48:52;
    immersiveFilm.style.setProperty('--film-width',`${startWidth+(100-startWidth)*filmProgress}vw`);
    immersiveFilm.style.setProperty('--film-height',`${startHeight+(100-startHeight)*filmProgress}vh`);
    immersiveFilm.style.setProperty('--film-radius',`${18*(1-filmProgress)}px`);
    immersiveFilm.style.setProperty('--film-copy-opacity',String(Math.max(0,1-filmProgress*1.35)));
    immersiveFilm.style.setProperty('--film-cue-opacity',String(Math.max(0,.8-filmProgress*.8)));
    immersiveFilm.style.setProperty('--film-backdrop-opacity',String(Math.max(0,1-filmProgress*.62)));
    immersiveFilm.classList.toggle('is-expanded',filmProgress>.98);
  };
  const filmIsActive=()=>Math.abs(immersiveFilm.getBoundingClientRect().top)<window.innerHeight*.12;
  const consumeFilmDelta=delta=>{
    if(!filmIsActive()||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return false;
    if((delta>0&&filmProgress<1)||(delta<0&&filmProgress>0)){
      setFilmProgress(filmProgress+delta*.0018);
      return true;
    }
    return false;
  };
  window.addEventListener('wheel',event=>{if(consumeFilmDelta(event.deltaY))event.preventDefault()},{passive:false});
  immersiveFilm.addEventListener('touchstart',event=>{touchY=event.touches[0].clientY},{passive:true});
  immersiveFilm.addEventListener('touchmove',event=>{
    if(touchY===null)return;
    const delta=touchY-event.touches[0].clientY;
    touchY=event.touches[0].clientY;
    if(consumeFilmDelta(delta*2.2))event.preventDefault();
  },{passive:false});
  immersiveFilm.addEventListener('touchend',()=>{touchY=null});
  setFilmProgress(0);
}

const campaignFilm=document.querySelector('.immersive-film');
if(campaignFilm){
  const campaignVideo=campaignFilm.querySelector('video');
  campaignVideo?.addEventListener('timeupdate',()=>campaignFilm.classList.toggle('hide-film-statement',campaignVideo.currentTime>=30));
  campaignVideo?.addEventListener('seeked',()=>campaignFilm.classList.toggle('hide-film-statement',campaignVideo.currentTime>=30));
}

const expertiseDial=document.querySelector('[data-expertise-dial]');
if(expertiseDial){
  const dialStages=[
    {title:'expertiseMarket',copy:'expertiseMarketCopy'},
    {title:'expertiseSales',copy:'expertiseSalesCopy'},
    {title:'expertiseStewardship',copy:'expertiseStewardshipCopy'},
    {title:'expertiseMarketing',copy:'expertiseMarketingCopy'},
    {title:'expertiseOperations',copy:'expertiseOperationsCopy'}
  ];
  const dialStage=expertiseDial.querySelector('[data-expertise-dial-stage]');
  const dialNodes=[...expertiseDial.querySelectorAll('[data-expertise-dial-node]')];
  const dialNumber=expertiseDial.querySelector('[data-expertise-dial-number]');
  const dialTitle=expertiseDial.querySelector('[data-expertise-dial-title]');
  const dialCopy=expertiseDial.querySelector('[data-expertise-dial-copy]');
  let activeDialStage=0,dialChangeTimer;
  const positionDialNodes=index=>{
    const rotation=-index*72;
    expertiseDial.style.setProperty('--dial-rotation',`${rotation}deg`);
    dialNodes.forEach((node,nodeIndex)=>{
      const angle=nodeIndex*72+rotation;
      node.style.transform=`translate(-50%,-50%) rotate(${angle}deg) translateY(calc(var(--dial-radius) * -1)) rotate(${-angle}deg)`;
    });
  };
  const showDialStage=(index,force=false)=>{
    const nextStage=(index+dialStages.length)%dialStages.length;
    if(!force&&nextStage===activeDialStage&&expertiseDial.classList.contains('is-ready'))return;
    activeDialStage=nextStage;
    const stage=dialStages[activeDialStage],label=String(activeDialStage+1).padStart(2,'0');
    clearTimeout(dialChangeTimer);
    expertiseDial.classList.add('is-changing');
    positionDialNodes(activeDialStage);
    dialNodes.forEach((node,nodeIndex)=>{
      const active=nodeIndex===activeDialStage;
      node.classList.toggle('is-active',active);
      node.setAttribute('aria-pressed',String(active));
    });
    dialChangeTimer=setTimeout(()=>{
      const copy=localeCopy[currentLanguage];
      dialNumber.textContent=`${label} / 05`;
      dialTitle.textContent=copy[stage.title];
      dialCopy.textContent=copy[stage.copy];
      expertiseDial.classList.remove('is-changing');
      expertiseDial.classList.add('is-ready');
    },220);
  };
  dialNodes.forEach((node,index)=>{
    node.addEventListener('mouseenter',()=>showDialStage(index));
    node.addEventListener('focus',()=>showDialStage(index));
    node.addEventListener('click',()=>showDialStage(index));
  });
  expertiseDial.addEventListener('pointermove',event=>{
    const bounds=expertiseDial.getBoundingClientRect();
    expertiseDial.style.setProperty('--dial-x',`${event.clientX-bounds.left}px`);
    expertiseDial.style.setProperty('--dial-y',`${event.clientY-bounds.top}px`);
    const x=(event.clientX-bounds.left)/bounds.width-.5,y=(event.clientY-bounds.top)/bounds.height-.5;
    dialStage.style.setProperty('--dial-tilt-x',`${y*-2.2}deg`);
    dialStage.style.setProperty('--dial-tilt-y',`${x*2.2}deg`);
  },{passive:true});
  expertiseDial.addEventListener('pointerleave',()=>{
    dialStage.style.setProperty('--dial-tilt-x','0deg');
    dialStage.style.setProperty('--dial-tilt-y','0deg');
  });
  window.addEventListener('space:languagechange',()=>showDialStage(activeDialStage,true));
  showDialStage(0,true);
}

const expertiseTheatre=document.querySelector('[data-expertise-theatre]');
if(expertiseTheatre){
  const theatreStages=[
    {title:'expertiseMarket',copy:'expertiseMarketCopy'},
    {title:'expertiseSales',copy:'expertiseSalesCopy'},
    {title:'expertiseStewardship',copy:'expertiseStewardshipCopy'},
    {title:'expertiseMarketing',copy:'expertiseMarketingCopy'},
    {title:'expertiseOperations',copy:'expertiseOperationsCopy'}
  ];
  const theatreRows=[...expertiseTheatre.querySelectorAll('[data-expertise-theatre-row]')];
  const theatreNumber=expertiseTheatre.querySelector('[data-expertise-theatre-number]');
  const theatreTitle=expertiseTheatre.querySelector('[data-expertise-theatre-title]');
  const theatreCopy=expertiseTheatre.querySelector('[data-expertise-theatre-copy]');
  let activeTheatreStage=0,theatreTimer;
  const showTheatreStage=(index,force=false)=>{
    const nextStage=(index+theatreStages.length)%theatreStages.length;
    if(!force&&nextStage===activeTheatreStage&&expertiseTheatre.classList.contains('is-ready'))return;
    activeTheatreStage=nextStage;
    const stage=theatreStages[activeTheatreStage],label=String(activeTheatreStage+1).padStart(2,'0'),copy=localeCopy[currentLanguage];
    clearTimeout(theatreTimer);
    expertiseTheatre.classList.add('is-changing');
    theatreRows.forEach((row,rowIndex)=>{
      const active=rowIndex===activeTheatreStage;
      row.classList.toggle('is-active',active);
      row.setAttribute('aria-pressed',String(active));
      row.querySelectorAll('strong').forEach(title=>title.textContent=copy[theatreStages[rowIndex].title]);
    });
    theatreTimer=setTimeout(()=>{
      theatreNumber.textContent=label;
      theatreTitle.textContent=copy[stage.title];
      theatreCopy.textContent=copy[stage.copy];
      expertiseTheatre.style.setProperty('--theatre-row',String(activeTheatreStage));
      expertiseTheatre.classList.remove('is-changing');
      expertiseTheatre.classList.add('is-ready');
    },170);
  };
  theatreRows.forEach((row,index)=>{
    row.addEventListener('mouseenter',()=>showTheatreStage(index));
    row.addEventListener('focus',()=>showTheatreStage(index));
    row.addEventListener('click',()=>showTheatreStage(index));
  });
  expertiseTheatre.addEventListener('pointermove',event=>{
    const bounds=expertiseTheatre.getBoundingClientRect();
    expertiseTheatre.style.setProperty('--theatre-x',`${event.clientX-bounds.left}px`);
    expertiseTheatre.style.setProperty('--theatre-y',`${event.clientY-bounds.top}px`);
  },{passive:true});
  window.addEventListener('space:languagechange',()=>showTheatreStage(activeTheatreStage,true));
  showTheatreStage(0,true);
}

const expertiseChapter=document.querySelector('[data-expertise-chapter]');
if(expertiseChapter){
  const chapterStages=[
    {title:'expertiseMarket',copy:'expertiseMarketCopy',image:'brand%20kit/france.jpg',points:{en:['Market assessment','Brand positioning','Launch planning','Commercial development'],fr:['Évaluation du marché','Positionnement de marque','Planification des lancements','Développement commercial']}},
    {title:'expertiseSales',copy:'expertiseSalesCopy',image:'brand%20kit/UAE.jpg',points:{en:['Wholesale partnerships','Retail relationships','Duty-free & e-commerce','Route-to-market execution'],fr:['Partenariats de gros','Relations avec les détaillants','Duty-free & e-commerce','Exécution commerciale']}},
    {title:'expertiseStewardship',copy:'expertiseStewardshipCopy',image:'brand%20kit/gif_1.avif',points:{en:['Presentation standards','Pricing discipline','Brand consistency','Local relevance'],fr:['Standards de présentation','Discipline tarifaire','Cohérence de marque','Pertinence locale']}},
    {title:'expertiseMarketing',copy:'expertiseMarketingCopy',image:'brand%20kit/gif_4.avif',points:{en:['Launches & campaigns','Visual merchandising','Team training','Consumer activation'],fr:['Lancements & campagnes','Merchandising visuel','Formation des équipes','Activation consommateur']}},
    {title:'expertiseOperations',copy:'expertiseOperationsCopy',image:'brand%20kit/static_1.avif',points:{en:['Inventory planning','Warehousing','Order fulfilment','Regional supply coordination'],fr:['Planification des stocks','Entreposage','Exécution des commandes','Coordination régionale']}}
  ];
  const chapterWorkspace=expertiseChapter.querySelector('[data-expertise-workspace]');
  const chapterButtons=[...expertiseChapter.querySelectorAll('[data-expertise-capability]')];
  const chapterPanel=expertiseChapter.querySelector('.expertise-content-panel');
  const chapterImage=expertiseChapter.querySelector('[data-expertise-content-image]');
  const chapterNumber=expertiseChapter.querySelector('[data-expertise-content-number]');
  const chapterTitle=expertiseChapter.querySelector('[data-expertise-content-title]');
  const chapterCopy=expertiseChapter.querySelector('[data-expertise-content-copy]');
  const chapterPoints=expertiseChapter.querySelector('[data-expertise-content-points]');
  let activeChapterStage=0,chapterTimer=0,chapterFrame=0;
  const showChapterStage=(index,force=false)=>{
    const nextStage=(index+chapterStages.length)%chapterStages.length;
    if(!force&&nextStage===activeChapterStage)return;
    activeChapterStage=nextStage;
    const stage=chapterStages[activeChapterStage],copy=localeCopy[currentLanguage];
    clearTimeout(chapterTimer);
    chapterPanel.classList.add('is-changing');
    chapterButtons.forEach((button,buttonIndex)=>{
      const selected=buttonIndex===activeChapterStage;
      button.classList.toggle('is-active',selected);
      button.setAttribute('aria-pressed',String(selected));
    });
    chapterTimer=setTimeout(()=>{
      chapterNumber.textContent=String(activeChapterStage+1).padStart(2,'0');
      chapterTitle.textContent=copy[stage.title];
      chapterCopy.textContent=copy[stage.copy];
      chapterPoints.innerHTML=stage.points[currentLanguage].map(point=>`<li>${point}</li>`).join('');
      chapterImage.style.backgroundImage=`url("${stage.image}")`;
      chapterPanel.classList.remove('is-changing');
    },210);
  };
  chapterButtons.forEach((button,index)=>{
    button.addEventListener('mouseenter',()=>showChapterStage(index));
    button.addEventListener('focus',()=>showChapterStage(index));
    button.addEventListener('click',()=>showChapterStage(index));
  });
  const clampChapter=value=>Math.min(1,Math.max(0,value));
  const updateExpertiseChapter=()=>{
    chapterFrame=0;
    if(matchMedia('(max-width:900px)').matches){
      expertiseChapter.style.setProperty('--expertise-inset','0%');
      expertiseChapter.style.setProperty('--expertise-intro-opacity','1');
      expertiseChapter.style.setProperty('--expertise-intro-scale','1');
      expertiseChapter.classList.add('is-workspace-active');
      return;
    }
    const bounds=expertiseChapter.getBoundingClientRect();
    const distance=Math.max(1,bounds.height-innerHeight);
    const progress=clampChapter(-bounds.top/distance);
    const reveal=clampChapter((progress-.27)/.6);
    const introExit=clampChapter((progress-.08)/.42);
    expertiseChapter.style.setProperty('--expertise-inset',`${(1-reveal)*50}%`);
    expertiseChapter.style.setProperty('--expertise-intro-opacity',(1-introExit).toFixed(3));
    expertiseChapter.style.setProperty('--expertise-intro-scale',(1+introExit*.075).toFixed(3));
    expertiseChapter.classList.toggle('is-workspace-active',reveal>.38);
  };
  const requestExpertiseChapterUpdate=()=>{if(!chapterFrame)chapterFrame=requestAnimationFrame(updateExpertiseChapter)};
  addEventListener('scroll',requestExpertiseChapterUpdate,{passive:true});
  addEventListener('resize',requestExpertiseChapterUpdate,{passive:true});
  addEventListener('space:languagechange',()=>showChapterStage(activeChapterStage,true));
  showChapterStage(0,true);
  updateExpertiseChapter();
}

const presenceIndex=document.querySelector('[data-presence-index]');
if(presenceIndex){
  const africaIds=new Set(['012','024','204','072','854','108','132','120','140','148','174','178','180','262','818','226','232','748','231','266','270','288','324','624','384','404','426','430','434','450','454','466','478','480','504','508','516','562','566','646','678','686','690','694','706','710','728','729','834','768','788','800','894','716','732']);
  const regions=[
    {name:'Africa',ids:africaIds,copy:'Established distribution infrastructure and local market knowledge across priority African markets.'},
    {name:'India',ids:new Set(['356']),copy:'Local access and commercial understanding within one of beautyâ€™s most dynamic consumer markets.'},
    {name:'UAE',ids:new Set(['784']),copy:'A strategic regional hub connecting international partners, operations and routes to market.'},
    {name:'France',ids:new Set(['250']),copy:'A European connection supporting brand relationships, commercial coordination and global standards.'}
  ];
  const shape=presenceIndex.querySelector('[data-presence-shape]'),name=presenceIndex.querySelector('[data-presence-name]'),copy=presenceIndex.querySelector('[data-presence-copy]'),number=presenceIndex.querySelector('[data-presence-number]'),buttons=[...presenceIndex.querySelectorAll('[data-region]')];
  let countries,activeIndex=0,cycle;
  const showRegion=index=>{
    if(!countries)return;
    activeIndex=index;
    const region=regions[index],features=countries.filter(feature=>region.ids.has(String(feature.id).padStart(3,'0'))),collection={type:'FeatureCollection',features};
    presenceIndex.classList.add('is-changing');
    window.setTimeout(()=>{
      const svg=d3.select(shape).attr('viewBox','0 0 600 500').attr('aria-label',region.name);svg.selectAll('*').remove();
      const projection=d3.geoMercator().fitExtent([[95,55],[505,410]],collection),path=d3.geoPath(projection);
      svg.selectAll('path').data(features).join('path').attr('d',path).attr('class','presence-country');
      name.textContent=region.name;copy.textContent=region.copy;number.textContent=`0${index+1} / 04`;
      buttons.forEach((button,buttonIndex)=>{const selected=buttonIndex===index;button.classList.toggle('is-active',selected);button.setAttribute('aria-selected',String(selected))});
      presenceIndex.classList.remove('is-changing');
    },220);
  };
  const startCycle=()=>{window.clearInterval(cycle);cycle=window.setInterval(()=>showRegion((activeIndex+1)%regions.length),5500)};
  buttons.forEach((button,index)=>button.addEventListener('click',()=>{showRegion(index);startCycle()}));
  const indexObserver=new IntersectionObserver(entries=>entries.forEach(async entry=>{if(entry.isIntersecting&&!countries){try{const world=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(response=>response.json());countries=topojson.feature(world,world.objects.countries).features;showRegion(0);startCycle()}catch{}indexObserver.disconnect()}}),{rootMargin:'160px'});
  indexObserver.observe(presenceIndex);
}

document.querySelectorAll('[data-campaign-carousel]').forEach(carousel=>{
  const viewport=carousel.querySelector('.campaign-carousel-viewport'),track=carousel.querySelector('[data-campaign-track]'),slides=[...track.children],thumbnailRail=carousel.querySelector('[data-campaign-thumbnails]'),thumbnails=[...carousel.querySelectorAll('[data-campaign-thumbnail]')],previous=carousel.querySelector('[data-campaign-prev]'),next=carousel.querySelector('[data-campaign-next]');
  let index=0,startX=0,currentX=0,startTime=0,dragging=false;
  const render=(animate=true)=>{
    track.classList.toggle('is-immediate',!animate);
    track.style.transform=`translate3d(${-index*100}%,0,0)`;
    thumbnails.forEach((thumbnail,thumbnailIndex)=>{const active=thumbnailIndex===index;thumbnail.classList.toggle('is-active',active);thumbnail.setAttribute('aria-current',active?'true':'false')});
    previous.disabled=index===0;next.disabled=index===slides.length-1;
    const activeThumbnail=thumbnails[index];if(activeThumbnail)thumbnailRail.scrollTo({left:activeThumbnail.offsetLeft-(thumbnailRail.clientWidth-activeThumbnail.offsetWidth)/2,behavior:animate?'smooth':'auto'});
    if(!animate)requestAnimationFrame(()=>track.classList.remove('is-immediate'));
  };
  const setIndex=value=>{index=Math.max(0,Math.min(slides.length-1,value));render()};
  previous.addEventListener('click',()=>setIndex(index-1));
  next.addEventListener('click',()=>setIndex(index+1));
  thumbnails.forEach((thumbnail,thumbnailIndex)=>thumbnail.addEventListener('click',()=>setIndex(thumbnailIndex)));
  viewport.addEventListener('pointerdown',event=>{if(event.target.closest('button'))return;dragging=true;startX=currentX=event.clientX;startTime=performance.now();viewport.classList.add('is-dragging');viewport.setPointerCapture(event.pointerId)});
  viewport.addEventListener('pointermove',event=>{if(!dragging)return;currentX=event.clientX;const width=viewport.clientWidth||1,delta=currentX-startX;track.style.transform=`translate3d(${(-index*width)+delta}px,0,0)`});
  const finishDrag=event=>{if(!dragging)return;dragging=false;const delta=(event.clientX||currentX)-startX,elapsed=Math.max(1,performance.now()-startTime),velocity=delta/elapsed,width=viewport.clientWidth||1;viewport.classList.remove('is-dragging');if(Math.abs(velocity)>.55||Math.abs(delta)>width*.3)setIndex(index+(delta<0?1:-1));else render()};
  viewport.addEventListener('pointerup',finishDrag);viewport.addEventListener('pointercancel',finishDrag);
  carousel.tabIndex=0;carousel.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')setIndex(index-1);if(event.key==='ArrowRight')setIndex(index+1)});
  render(false);
});

const teamCarousel=document.querySelector('[data-team-carousel]');
if(teamCarousel){
  const people=[
    {name:'Vipul Mathur',role:'Founder',image:'brand%20kit/team/Vipul%20Mathur.jpg',summary:'Founder of Space TR, with commercial experience across Africa, the Caribbean, North America and the Middle East since 2007.',bio:[
      'Vipul Mathur is the Founder of Space TR, a specialist beauty and fragrance distribution company focused on travel retail and domestic markets across Africa.',
      'Since 2007, he has developed commercial experience across Africa, the Caribbean, North America and the Middle East, with a particular focus on building luxury beauty and fragrance businesses in emerging markets.',
      'Before establishing Space TR, Vipul held senior corporate leadership positions including General Manager, Vice President and Director. Today, he leads the company’s expansion across Africa, developing travel retail and domestic distribution while building long-term partnerships.'
    ]},
    {name:'K. J. Thomas',role:'Strategic Business Operations, Procurement and Supply Chain Management',image:'brand%20kit/team/KJ%20Thomas.jpg',summary:'More than 15 years of experience across fragrance, beauty and travel retail, with responsibility for operations, procurement and supply chain at Space.',bio:[
      'K. J. Thomas brings more than 15 years of experience in the fragrance, beauty and travel retail industry.',
      'He previously served as Senior General Manager of Beauty at Shoppers Stop and Category Lead for Beauty at Parcos. In these roles, he led commercial strategy, category management, retail operations and local store marketing across premium beauty and fragrance brands.',
      'At Space, K. J. leads strategic business operations, procurement and supply chain management across Africa, the Indian Subcontinent and travel retail. He holds an MBA in Marketing and a postgraduate qualification in Retail Management.'
    ]},
    {name:'Sundeep Sharma',role:'Co-Founder and Director',image:'brand%20kit/team/Sundeep%20Sharma.jpg',summary:'Co-Founder and Director of Maven Global Ltd., with extensive experience in African markets and travel retail.',bio:[
      'Sundeep Sharma is the Co-Founder and Director of Maven Global Ltd., established in 2016. Maven Global is described as East Africa’s largest in-country distributor of luxury, niche and prestige fragrances.',
      'Based in Nairobi since 2002, Sundeep has developed extensive knowledge of African market dynamics. Before establishing Maven Global, he spent 14 years with Flemingo Travel Retail Ltd.',
      'At the age of 36, he was appointed the company’s youngest Regional Chief Executive Officer for Africa. During his tenure, the regional business grew from two to 50 retail outlets across 16 countries. Sundeep holds a Bachelor of Commerce from the University of Mumbai.'
    ]},
    {name:'Chandni Rana',role:'Commercial Head',image:'brand%20kit/team/Chandni%20Rana.jpg',summary:'More than a decade of experience building luxury fragrance, skincare and cosmetics businesses across India and Africa.',bio:[
      'Chandni Rana brings more than a decade of experience in building luxury fragrance, skincare and cosmetics businesses across India and Africa, covering both travel retail and domestic markets.',
      'At Space TR, she leads commercial strategy, distribution and brand partnerships. She works closely with international brand principals to develop their presence across the company’s markets.',
      'Her experience includes pricing, product assortment, retail environments and understanding the consumer. Chandni takes a hands-on and entrepreneurial approach to leadership and has a track record of identifying new commercial opportunities.'
    ]},
    {name:'Krishnamachari Rangarajan',role:'Finance, Treasury Management, HR and Administration',image:'brand%20kit/team/Krishnamachari%20Rangarajan.jpg',summary:'Nearly four decades of experience in accounting, finance and factory commercial operations within the FMCG industry.',bio:[
      'Krishnamachari Rangarajan brings nearly four decades of experience in accounting, finance and factory commercial operations within the FMCG industry.',
      'In his previous role, he served as Factory Chief Financial Officer for the international business of one of India’s largest multinational companies in personal care and hair care manufacturing.',
      'At Space, Krish leads Finance, Treasury Management, Human Resources and Administration. His work includes streamlining, automating and digitising business processes, controlling costs and supporting competitive pricing that meets customer expectations.'
    ]},
    {name:'Baptiste Vesin',role:'Business Development Director',image:'brand%20kit/team/Baptiste%20VESIN.png',summary:'More than 20 years of experience developing distributor and retailer relationships across African local and travel retail markets.',bio:[
      'Baptiste Vesin brings more than 20 years of experience in developing and consolidating distributor and retailer networks across Africa.',
      'He specialises in luxury and niche brands, including COTY, L’Oréal Luxe, EuroItalia, LVMH, Xerjoff, Nishane, Tiziana Terenzi, Montale, Matière Première, Parfums de Marly, Initio, Atelier des Ors, Ramon Bejar and Sospiro.',
      'At Space, Baptiste is responsible for business development. Fluent in French, Spanish, Italian, Portuguese and English, he focuses on building long-term partnerships across African local and travel retail markets.'
    ]}
  ];
  const peopleFr=[
    {role:'Fondateur',bio:[
      'Vipul Mathur est le fondateur de Space TR, une société spécialisée dans la distribution de produits de beauté et de parfums sur les marchés du travel retail et les marchés domestiques en Afrique.',
      'Depuis 2007, il développe une expérience commerciale en Afrique, dans les Caraïbes, en Amérique du Nord et au Moyen-Orient, avec un intérêt particulier pour le développement des activités de parfumerie et de beauté de luxe sur les marchés émergents.',
      'Avant de créer Space TR, Vipul a occupé plusieurs fonctions de direction, notamment celles de directeur général, vice-président et directeur. Il pilote aujourd’hui l’expansion de l’entreprise en Afrique, en développant parallèlement le travel retail et la distribution domestique, tout en construisant des partenariats durables.'
    ]},
    {role:'Opérations stratégiques, achats et chaîne d’approvisionnement',bio:[
      'K. J. Thomas possède plus de quinze ans d’expérience dans les secteurs de la parfumerie, de la beauté et du travel retail.',
      'Il a notamment occupé les fonctions de Senior General Manager Beauty chez Shoppers Stop et de Category Lead Beauty chez Parcos. À ces postes, il a dirigé la stratégie commerciale, la gestion des catégories, les opérations retail et le marketing local en magasin pour des marques de beauté et de parfumerie premium.',
      'Chez Space, K. J. dirige les opérations stratégiques, les achats et la gestion de la chaîne d’approvisionnement en Afrique, dans le sous-continent indien et en travel retail. Il est titulaire d’un MBA en marketing et d’un diplôme de troisième cycle en management du retail.'
    ]},
    {role:'Cofondateur et directeur',bio:[
      'Sundeep Sharma est cofondateur et directeur de Maven Global Ltd., créée en 2016. Maven Global est présentée comme le plus grand distributeur local de parfums de luxe, de niche et de prestige en Afrique de l’Est.',
      'Installé à Nairobi depuis 2002, Sundeep a acquis une connaissance approfondie des marchés africains. Avant de créer Maven Global, il a travaillé pendant quatorze ans chez Flemingo Travel Retail Ltd.',
      'À 36 ans, il est devenu le plus jeune directeur général régional Afrique de l’entreprise. Sous sa direction, l’activité régionale est passée de deux à cinquante points de vente répartis dans seize pays. Sundeep est titulaire d’un Bachelor of Commerce de l’Université de Mumbai.'
    ]},
    {role:'Directrice commerciale',bio:[
      'Chandni Rana possède plus de dix ans d’expérience dans le développement d’activités de parfumerie, de soin et de cosmétique de luxe en Inde et en Afrique, sur les marchés domestiques comme en travel retail.',
      'Chez Space TR, elle dirige la stratégie commerciale, la distribution et les partenariats avec les marques. Elle travaille étroitement avec les maisons internationales afin de développer leur présence sur les marchés de l’entreprise.',
      'Son expérience couvre la tarification, l’assortiment, l’environnement retail et la compréhension des consommateurs. Chandni adopte une approche entrepreneuriale et opérationnelle du management et sait identifier de nouvelles opportunités commerciales.'
    ]},
    {role:'Finance, trésorerie, ressources humaines et administration',bio:[
      'Krishnamachari Rangarajan possède près de quarante ans d’expérience en comptabilité, finance et opérations commerciales industrielles dans le secteur des biens de grande consommation.',
      'Dans ses fonctions précédentes, il était directeur financier d’usine pour les activités internationales de l’un des plus grands groupes multinationaux indiens spécialisés dans la fabrication de produits de soin et de soins capillaires.',
      'Chez Space, Krish dirige la finance, la trésorerie, les ressources humaines et l’administration. Il contribue à rationaliser, automatiser et numériser les processus, à maîtriser les coûts et à soutenir une politique tarifaire compétitive répondant aux attentes des clients.'
    ]},
    {role:'Directeur du développement commercial',bio:[
      'Baptiste Vesin possède plus de vingt ans d’expérience dans le développement et la consolidation de réseaux de distributeurs et de détaillants en Afrique.',
      'Il est spécialisé dans les marques de luxe et de niche, notamment COTY, L’Oréal Luxe, EuroItalia, LVMH, Xerjoff, Nishane, Tiziana Terenzi, Montale, Matière Première, Parfums de Marly, Initio, Atelier des Ors, Ramon Bejar et Sospiro.',
      'Chez Space, Baptiste est responsable du développement commercial. Il parle couramment français, espagnol, italien, portugais et anglais et privilégie la construction de partenariats durables sur les marchés africains domestiques et du travel retail.'
    ]}
  ];
  const track=teamCarousel.querySelector('[data-team-track]'),stage=teamCarousel.querySelector('[data-team-stage]');
  const personForLanguage=index=>currentLanguage==='fr'?{...people[index],...peopleFr[index]}:people[index];
  track.innerHTML=people.map((person,index)=>{const localized=personForLanguage(index);return `<article class="team-portrait-card" data-team-card="${index}"><button class="team-card-select" type="button" data-team-select aria-label="${person.name}, ${localized.role}"><img src="${person.image}" alt="${person.name}" loading="lazy" decoding="async"><span><strong>${person.name}</strong><small>${localized.role}</small><em>${localeCopy[currentLanguage].viewProfile}</em></span></button><div class="team-social-dock" data-team-social-dock aria-label="Profile links coming soon"><button type="button" tabindex="-1" aria-disabled="true" aria-label="LinkedIn link coming soon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 8.2H1.6V22h3.6V8.2ZM3.4 2A2.1 2.1 0 1 0 3.4 6.2 2.1 2.1 0 0 0 3.4 2ZM22.4 14.1c0-4.2-2.2-6.2-5.2-6.2-2.4 0-3.5 1.3-4.1 2.3v-2H9.5V22h3.6v-6.8c0-1.8.3-3.6 2.6-3.6 2.2 0 2.3 2.1 2.3 3.7V22h3.6l.8-7.9Z"/></svg></button><button type="button" tabindex="-1" aria-disabled="true" aria-label="Email link coming soon"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="gmail-red" d="M2.2 6.1 12 13.4l9.8-7.3v12.1c0 1-.8 1.8-1.8 1.8h-2.3V10.5L12 14.7l-5.7-4.2V20H4c-1 0-1.8-.8-1.8-1.8V6.1Z"/><path class="gmail-blue" d="M2.2 6.1c0-1 .8-1.8 1.8-1.8l8 5.9-2.9 2.2-6.9-5.2V6.1Z"/><path class="gmail-green" d="M21.8 6.1c0-1-.8-1.8-1.8-1.8l-8 5.9 2.9 2.2 6.9-5.2V6.1Z"/></svg></button></div></article>`}).join('');
  const cards=[...track.querySelectorAll('[data-team-card]')];let activePerson=0,touchStart=0;
  const updateTeam=index=>{
    activePerson=(index+people.length)%people.length;const previous=(activePerson-1+people.length)%people.length,next=(activePerson+1)%people.length;
    cards.forEach((card,cardIndex)=>{card.classList.toggle('is-active',cardIndex===activePerson);card.classList.toggle('is-prev',cardIndex===previous);card.classList.toggle('is-next',cardIndex===next);card.classList.toggle('is-away',cardIndex!==activePerson&&cardIndex!==previous&&cardIndex!==next);card.querySelector('[data-team-select]').setAttribute('aria-pressed',String(cardIndex===activePerson))});
  };
  const refreshTeamLanguage=()=>{cards.forEach((card,index)=>{const person=personForLanguage(index);card.querySelector('[data-team-select]').setAttribute('aria-label',`${person.name}, ${person.role}`);card.querySelector('small').textContent=person.role;card.querySelector('em').textContent=localeCopy[currentLanguage].viewProfile})};
  cards.forEach((card,index)=>card.querySelector('[data-team-select]').addEventListener('click',()=>updateTeam(index)));
  teamCarousel.querySelector('[data-team-prev]').addEventListener('click',()=>updateTeam(activePerson-1));teamCarousel.querySelector('[data-team-next]').addEventListener('click',()=>updateTeam(activePerson+1));
  teamCarousel.tabIndex=0;teamCarousel.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')updateTeam(activePerson-1);if(event.key==='ArrowRight')updateTeam(activePerson+1)});
  stage.addEventListener('touchstart',event=>{touchStart=event.changedTouches[0].clientX},{passive:true});stage.addEventListener('touchend',event=>{const distance=event.changedTouches[0].clientX-touchStart;if(Math.abs(distance)>45)updateTeam(activePerson+(distance<0?1:-1))},{passive:true});
  teamCarousel.querySelectorAll('[data-team-social-dock]').forEach(socialDock=>{
    const dockItems=[...socialDock.querySelectorAll('button')];
    socialDock.addEventListener('pointermove',event=>dockItems.forEach(item=>{const bounds=item.getBoundingClientRect(),distance=Math.abs(event.clientX-(bounds.left+bounds.width/2)),influence=Math.max(0,1-distance/120);item.style.setProperty('--dock-size',`${40+20*influence}px`);item.style.setProperty('--dock-lift',`${-9*influence}px`)}),{passive:true});
    socialDock.addEventListener('pointerleave',()=>dockItems.forEach(item=>{item.style.removeProperty('--dock-size');item.style.removeProperty('--dock-lift')}));
  });
  window.addEventListener('space:languagechange',refreshTeamLanguage);
  updateTeam(0);
}

const brandWall=document.querySelector('[data-brand-wall]');
if(brandWall){
  const brandWallNames=['Parfums de Marly','Initio Parfums Privés','Xerjoff','Nishane','Tiziana Terenzi','Casamorati','Giorgio Armani Beauty','Yves Saint Laurent','Gucci','Lancôme','Prada','Valentino','Burberry','Marc Jacobs','Chloé','Ralph Lauren','Boss','Viktor & Rolf','Davidoff','Armaf','Afnan Perfumes','Bond No. 9','The Merchant of Venice','Franck Boclet','Jacques Fath Paris','Affinessence Paris','Chabaud Maison de Parfum','Amouroud','Scalpers Yacht Club','Diesel','Cacharel','Tous','Halloween','Roja','Ormonde Jayne','Ramón Béjar','Montale Paris','Mancera Paris','Goldfield & Banks','Atelier des Ors'];
  const wallGrid=brandWall.querySelector('[data-brand-wall-grid]');
  wallGrid.innerHTML=brandWallNames.map((name,index)=>`<article class="brand-wall-item" tabindex="0" aria-label="${name}"><img src="brand%20kit/brand_${index+1}.avif" alt="${name}" decoding="async"></article>`).join('');
  const wallItems=[...wallGrid.querySelectorAll('.brand-wall-item')];
  const setWallFocus=item=>{brandWall.classList.toggle('has-brand-focus',Boolean(item));wallItems.forEach(candidate=>candidate.classList.toggle('is-focused',candidate===item))};
  wallItems.forEach(item=>{item.addEventListener('mouseenter',()=>setWallFocus(item));item.addEventListener('mouseleave',()=>setWallFocus(null));item.addEventListener('focus',()=>setWallFocus(item));item.addEventListener('blur',()=>setWallFocus(null))});
  brandWall.addEventListener('pointermove',event=>{const bounds=brandWall.getBoundingClientRect();const isHomepageWall=brandWall.classList.contains('homepage-brand-wall');brandWall.style.setProperty('--wall-x',`${event.clientX-bounds.left}px`);brandWall.style.setProperty('--wall-y',`${isHomepageWall?event.clientY:event.clientY-bounds.top}px`)},{passive:true});
  if(brandWall.classList.contains('homepage-brand-wall')){
    let wallFrame=0;
    const clamp=value=>Math.min(1,Math.max(0,value));
    const updateBrandChapter=()=>{
      wallFrame=0;
      if(window.matchMedia('(max-width:1050px)').matches)return;
      const bounds=brandWall.getBoundingClientRect();
      const distance=Math.max(1,bounds.height-window.innerHeight);
      const progress=clamp(-bounds.top/distance);
      const reveal=clamp((progress-.12)/.78);
      const introFade=1-clamp((progress-.04)/.48);
      brandWall.style.setProperty('--brand-reveal',`${(1-reveal)*100}%`);
      brandWall.style.setProperty('--brand-intro-opacity',introFade.toFixed(3));
      brandWall.style.setProperty('--brand-intro-shift',`${-110*clamp(progress/.6)}px`);
    };
    const requestBrandChapterUpdate=()=>{if(!wallFrame)wallFrame=requestAnimationFrame(updateBrandChapter)};
    addEventListener('scroll',requestBrandChapterUpdate,{passive:true});
    addEventListener('resize',requestBrandChapterUpdate,{passive:true});
    updateBrandChapter();
  }
}

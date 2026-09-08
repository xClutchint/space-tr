const body=document.body,menu=document.querySelector('.menu-toggle'),nav=document.querySelector('.main-nav');
const pathLanguageMatch=location.pathname.match(/^\/(en|fr)(?:\/|$)/),initialLanguage=pathLanguageMatch?.[1]||(localStorage.getItem('space-language')==='fr'?'fr':'en');
const reducedMotionQuery=window.matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointerQuery=window.matchMedia('(pointer: coarse)');
const lowPowerMode=coarsePointerQuery.matches||Boolean(navigator.connection?.saveData)||Boolean(navigator.connection&&/2g/.test(navigator.connection.effectiveType||''))||Boolean(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)||Boolean(navigator.deviceMemory&&navigator.deviceMemory<=4);
document.documentElement.classList.toggle('low-power-mode',lowPowerMode);
const isNearViewport=(element,margin=.35)=>{if(!element||document.hidden)return false;const bounds=element.getBoundingClientRect(),buffer=innerHeight*margin;return bounds.bottom>-buffer&&bounds.top<innerHeight+buffer};
if(menu){menu.addEventListener('click',()=>{const open=body.classList.toggle('menu-open');menu.setAttribute('aria-expanded',String(open))});nav?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{body.classList.remove('menu-open');menu.setAttribute('aria-expanded','false')}))}
const scrollToHomeSection=(target,hash)=>{
  history.replaceState(null,'',hash);
  const root=document.documentElement,previousBehavior=root.style.scrollBehavior;
  root.style.scrollBehavior='auto';
  target.scrollIntoView({behavior:'auto',block:'start'});
  const settle=()=>{const distance=target.getBoundingClientRect().top;if(Math.abs(distance)>1)window.scrollTo({top:window.scrollY+distance,left:0,behavior:'auto'})};
  settle();requestAnimationFrame(()=>{settle();root.style.scrollBehavior=previousBehavior});
  if(document.fonts?.status==='loading')document.fonts.ready.then(settle);
};
nav?.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',event=>{
  const target=document.querySelector(link.hash);
  if(!target)return;
  event.preventDefault();
  scrollToHomeSection(target,link.hash);
}));
const heroBrandsLink=document.querySelector('.hero-view-all[href="#brands"]');
heroBrandsLink?.addEventListener('click',event=>{
  const target=document.querySelector('#brands');
  if(!target)return;
  event.preventDefault();
  scrollToHomeSection(target,'#brands');
});
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
  'About':'À propos','Brands':'Marques','Expertise':'Expertise','Markets':'Marchés','People':'Équipe','Team':'Équipe','Careers':'Carrières','Contact':'Contact','Contact Us':'Contactez-nous','Posts':'Publications',
  'Bringing the best of global beauty brands to local audiences':'L’EXCELLENCE DE LA PARFUMERIE ET DE LA BEAUTÉ AU PLUS PRÈS DES CONSOMMATEURS',
  'Space is a specialist fragrance and beauty distributor connecting international brands with retailers and consumers across Africa.':'SPACE, distributeur spécialisé en parfumerie et haute parfumerie qui connecte les maisons internationales au public africain',
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
const languageSwitch=document.createElement('div');languageSwitch.className='language-switch';languageSwitch.setAttribute('role','group');languageSwitch.setAttribute('aria-label','Language');languageSwitch.innerHTML='<span class="glass-sheen" aria-hidden="true"></span><span class="language-thumb" aria-hidden="true"></span><button type="button" data-lang="en">EN</button><button type="button" data-lang="fr">FR</button>';
nav?.appendChild(languageSwitch);
function setLanguage(language){document.documentElement.lang=language;translatable.forEach(({element,english})=>element.textContent=language==='fr'?translations[english]:english);languageSwitch.classList.toggle('is-fr',language==='fr');languageSwitch.querySelectorAll('button').forEach(button=>{const current=button.dataset.lang===language;button.classList.toggle('is-current',current);button.setAttribute('aria-pressed',String(current))});localStorage.setItem('space-language',language)}
languageSwitch.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
  const language=button.dataset.lang;
  if(pathLanguageMatch&&language!==pathLanguageMatch[1]){location.href=`/${language}${location.pathname.slice(3)}${location.search}${location.hash}`;return}
  setLanguage(language);
}));
setLanguage(initialLanguage);
const localeCopy={
  en:{
    expertiseSectionLabel:'What we do',exploreExpertisePage:'Explore our distribution expertise',
    expertiseWordYoung:'Young',expertiseWordInOne:'in',expertiseWordYears:'years.',expertiseWordAhead:'Ahead',expertiseWordInTwo:'in',expertiseWordMotion:'motion.',expertiseWordPrecise:'Precise',expertiseWordInThree:'in',expertiseWordExecution:'execution.',
    expertiseMarketLong:'Tailored launches and activations for each market, while preserving the standards and DNA of each Maison.',
    expertiseSalesLong:'A strategically selected network of partners to build a selective and consistent presence across domestic, duty-free and e-commerce markets.',
    expertiseStewardshipLong:'Brand image, standards and long-term value are protected market by market.',
    expertiseMarketingLong:'Tailored launches and activations for each market, while preserving the standards and DNA of each Maison.',
    expertiseOperationsLong:'End-to-end logistics management, ensuring seamless and controlled coordination at every stage, from demand planning through to delivery in each market.',
    expertiseTraining:'Retail Excellence & Development',
    expertiseTrainingLong:'From training to on-the-ground coaching, we strengthen team expertise, elevate the customer experience and drive retail excellence, while staying true to each Maison\u2019s DNA.',
    navAbout:'About',navExpertise:'Expertise',navBrands:'Brands',navTeam:'Team',navCareers:'Careers',navContact:'Contact Us',navPosts:'Posts',openNavigation:'Open navigation',closeNavigation:'Close navigation',
    heroHeadline:'Bringing the best of global beauty brands to local audiences',viewBrands:'View all brands',
    brandsEyebrow:'Our portfolio',brandsTitle:'Brands',brandsHeadline:'Trusted with brands that define beauty.',
    brandsIntro:'The portfolio of brands that we proudly partner with.',brandsCount:'International fragrance & beauty partners',
    aboutHeadline:'Space is a specialist fragrance and beauty distributor connecting international brands with retailers and consumers across Africa.',
    aboutIntro:'Space is a specialist fragrance and beauty distributor connecting international brands with retailers and consumers across Africa.',
    aboutDetail:'Through local market knowledge, selective distribution and disciplined brand management, our regional teams manage the complete route to market, from commercial planning and retail development to inventory coordination and long-term brand growth.',
    markets:'Markets',brandPartners:'Brand partners',availableSkus:'Available SKUs',discoverSpace:'Discover Space',
    ourPresence:'Our offices',africa:'Africa',uae:'UAE',france:'France',india:'Indian Subcontinent',
    filmHeadline:'Global Brands,<br>Local Reach',expertiseSwipe:'Swipe to explore',teamHeadline:'The team',teamLeadership:'The team',teamSwipe:'Swipe or use the arrows to meet the team',campaignSwipe:'Swipe through campaign stories',viewProfile:'View profile',
    expertiseEyebrow:'Our expertise',expertiseHeadline:'Young in years. Ahead in motion. Precise in execution.',
    expertiseInstruction:'Select a capability to explore',expertiseMarket:'Market strategy',expertiseSales:'Sale & Distribution',
    expertiseStewardship:'Brand stewardship',expertiseMarketing:'Marketing & Activation',expertiseOperations:'Logistics & Supply Chain',
    expertiseMarketCopy:'Market assessment, positioning, launch planning and long-term commercial development.',
    expertiseSalesCopy:'Distribution partnerships, retail relationships, duty-free, e-commerce and route-to-market execution.',
    expertiseStewardshipCopy:'Consistent presentation, pricing discipline and brand standards adapted with local relevance.',
    expertiseMarketingCopy:'Launches, campaigns, visual merchandising, training and consumer-facing brand experiences.',
    expertiseOperationsCopy:'Inventory planning, warehousing, fulfilment and dependable regional supply coordination.',
    previousMember:'Previous team member',nextMember:'Next team member',closeProfile:'Close profile',profileLabel:'Leadership profile',
    contactHeadline:'Get in touch',contactIntro:'For any inquiries or concerns, please reach out via e-mail and we will be pleased to assist you.',
    addressLabel:'Address',addressValue:'Dubai World Centre, Dubai U.A.E',emailLabel:'E-mail',
    footerCopyright:'© 2026 Space',
    nameLabel:'Name',formEmailLabel:'Email',messageLabel:'Message',submit:'Submit',
    languageLabel:'Language',selectedBrands:'Selected brands',campaignsLabel:'Space brand campaigns',
    regionalPresenceLabel:'Our offices',
    regionalOperationsEyebrow:'A regional subsidiary of Space',
    mavenKicker:'Distribution',mavenPositioning:'East Africa’s house of luxury fragrance distribution.',mavenBody:'Maven is Space’s regional subsidiary in Kenya, connecting international luxury fragrance houses with selective retail channels across East Africa. Its reach extends deep into Tier II and Tier III cities, giving brands privileged access to discerning customers where luxury demand already exists but direct brand presence rarely follows.',mavenBodyTwo:'More than 250 retail doors extend brand presence across specialist perfumeries, pharmacies, supermarkets and e-commerce. Stock is managed through bonded facilities in Nairobi and Mombasa. Regulatory clearance and doorstep delivery are handled locally. Every movement respects the product, its positioning and the standards of the brand.',
    feelNzuriKicker:'Flagship fragrance lounge',feelNzuriBody:'FeelNZuri is Space’s flagship fragrance lounge, where a curated world of niche perfumery unfolds beside a warm fireplace, serene garden views and considered hospitality. Every detail invites unhurried discovery and expresses the elegance of authentic African hospitality.',feelNzuriBodyMobile:'FeelNZuri is Space’s flagship fragrance lounge, shaped by niche perfumery, serene garden views and the warmth of authentic African hospitality.',learnMore:'Learn more',
    exploreMaven:'Explore Maven',mavenDrawerLabel:'Maven Global · A Space company',mavenDrawerEyebrow:'Distribution and consumer retail',
    mavenDrawerIntro:'Maven Global is Space’s regional subsidiary for luxury fragrance distribution and retail. Local warehousing, regulatory coordination, cross-border logistics and established retail access operate alongside FeelNZuri, Space’s consumer-facing fragrance lounge.',
    mavenDistributionLabel:'Distribution',mavenRetailLabel:'Retail',
    mavenDrawerDistribution:'Maven Global connects international fragrance houses with regional retail through market entry, selective distribution, warehousing, cross-border logistics and disciplined brand execution.',
    mavenDrawerRetail:'FeelNZuri is Space’s consumer-facing fragrance lounge, bringing niche perfumery closer to consumers through guided discovery, considered presentation and first-hand retail insight.',
    openMavenPanel:'Open the Maven profile',closeMavenPanel:'Close the Maven profile',
    formWait:'Please take a moment before submitting.',formSending:'Sending…',
    formError:'Unable to send your enquiry.',formEmailFallback:'Please email info@space-tr.com directly.',
    formSuccess:'Thank you. Your message has been sent.'
  },
  fr:{
    expertiseSectionLabel:'Notre savoir-faire',exploreExpertisePage:'Découvrir notre expertise en distribution',
    expertiseWordYoung:'Jeune',expertiseWordInOne:'par son',expertiseWordYears:'histoire,',expertiseWordAhead:'Toujours',expertiseWordInTwo:'en',expertiseWordMotion:'mouvement,',expertiseWordPrecise:'Pr\u00e9cise',expertiseWordInThree:'dans son',expertiseWordExecution:'ex\u00e9cution.',
    expertiseMarketLong:'Des lancements et activations adapt\u00e9s \u00e0 chaque march\u00e9, tout en pr\u00e9servant les standards et l\u2019ADN de chaque Maison.',
    expertiseSalesLong:'Un r\u00e9seau de partenaires s\u00e9lectionn\u00e9s de mani\u00e8re strat\u00e9gique afin de construire une pr\u00e9sence s\u00e9lective et coh\u00e9rente sur les march\u00e9s domestiques, duty-free et e-commerce.',
    expertiseStewardshipLong:'L\u2019image, les standards et la valeur \u00e0 long terme de chaque marque sont prot\u00e9g\u00e9s march\u00e9 par march\u00e9.',
    expertiseMarketingLong:'Des lancements et activations adapt\u00e9s \u00e0 chaque march\u00e9, tout en pr\u00e9servant les standards et l\u2019ADN de chaque Maison.',
    expertiseOperationsLong:'Une gestion logistique de bout en bout, assurant une coordination fluide et ma\u00eetris\u00e9e \u00e0 chaque \u00e9tape, de la planification de la demande jusqu\u2019\u00e0 la livraison sur chaque march\u00e9.',
    expertiseTraining:'Excellence & d\u00e9veloppement retail',
    expertiseTrainingLong:'De la formation \u00e0 l\u2019accompagnement sur le terrain, nous renfor\u00e7ons l\u2019expertise des \u00e9quipes, \u00e9levons l\u2019exp\u00e9rience client et favorisons l\u2019excellence retail, tout en restant fid\u00e8les \u00e0 l\u2019ADN de chaque Maison.',
    navAbout:'À propos',navExpertise:'Expertise',navBrands:'Marques',navTeam:'Équipe',navCareers:'Carrières',navContact:'Nous contacter',navPosts:'Publications',openNavigation:'Ouvrir la navigation',closeNavigation:'Fermer la navigation',
    heroHeadline:'L’EXCELLENCE DE LA PARFUMERIE ET DE LA BEAUTÉ AU PLUS PRÈS DES CONSOMMATEURS',viewBrands:'Découvrir nos marques',
    brandsEyebrow:'Notre portefeuille',brandsTitle:'Marques',brandsHeadline:'La confiance des marques qui façonnent la beauté.',
    brandsIntro:'Les marques avec lesquelles nous sommes fiers de collaborer.',brandsCount:'Partenaires internationaux de la parfumerie & de la beauté',
    aboutHeadline:'SPACE, distributeur spécialisé en parfumerie et haute parfumerie qui connecte les maisons internationales au public africain',
    aboutIntro:'SPACE, distributeur spécialisé en parfumerie et haute parfumerie qui connecte les maisons internationales au public africain',
    aboutDetail:'Grâce à notre connaissance des marchés locaux, à notre réseau de distribution et à une gestion rigoureuse des marques, nos équipes pilotent l’ensemble de la mise sur le marché, de la planification commerciale et du développement retail à la coordination des stocks et à la croissance durable des marques.',
    markets:'Marchés',brandPartners:'Marques partenaires',availableSkus:'Références disponibles',discoverSpace:'Découvrir Space',
    ourPresence:'Nos bureaux',africa:'Africa',uae:'UAE',france:'France',india:'Indian Subcontinent',
    filmHeadline:'Des marques internationales,<br>une présence et expertise locale',expertiseSwipe:'Balayez pour explorer',teamHeadline:'L’équipe',teamLeadership:'L’équipe',teamSwipe:'Balayez ou utilisez les flèches pour découvrir l’équipe',campaignSwipe:'Balayez pour découvrir les campagnes',viewProfile:'Voir le profil',
    expertiseEyebrow:'Notre expertise',expertiseHeadline:'Jeune par son histoire, Toujours en mouvement, Précise dans son exécution.',
    expertiseInstruction:'Sélectionnez une expertise',expertiseMarket:'Stratégie de marché',expertiseSales:'Vente & distribution',
    expertiseStewardship:'Pilotage de marque',expertiseMarketing:'Marketing & activation',expertiseOperations:'Logistique & chaîne d’approvisionnement',
    expertiseMarketCopy:'Évaluation du marché, positionnement, planification des lancements et développement commercial à long terme.',
    expertiseSalesCopy:'Partenariats de gros, relations avec les détaillants, duty-free, e-commerce et exécution de la mise sur le marché.',
    expertiseStewardshipCopy:'Présentation cohérente, discipline tarifaire et standards de marque adaptés avec pertinence aux marchés locaux.',
    expertiseMarketingCopy:'Lancements, campagnes, merchandising visuel, formation et expériences de marque destinées aux consommateurs.',
    expertiseOperationsCopy:'Planification des stocks, entreposage, exécution des commandes et coordination fiable de l’approvisionnement régional.',
    previousMember:'Profil précédent',nextMember:'Profil suivant',closeProfile:'Fermer le profil',profileLabel:'Profil de direction',
    contactHeadline:'Parlons de vos projets',contactIntro:'Pour toute demande ou question, écrivez-nous. Notre équipe se fera un plaisir de vous accompagner.',
    addressLabel:'Adresse',addressValue:'Dubai World Centre, Dubaï, Émirats arabes unis',emailLabel:'E-mail',
    footerCopyright:'© 2026 Space',
    nameLabel:'Nom',formEmailLabel:'E-mail',messageLabel:'Message',submit:'Envoyer',
    languageLabel:'Langue',selectedBrands:'Sélection de marques',campaignsLabel:'Campagnes de marques Space',
    regionalPresenceLabel:'Nos bureaux',
    regionalOperationsEyebrow:'Une filiale régionale de Space',
    mavenKicker:'Distribution',mavenPositioning:'La maison de la distribution de parfumerie de luxe en Afrique de l’Est.',mavenBody:'Maven est la filiale régionale de Space au Kenya. Elle relie les maisons internationales de parfumerie de luxe à des circuits de distribution sélectifs en Afrique de l’Est. Sa présence s’étend au cœur des villes de rang II et III, offrant aux marques un accès privilégié à une clientèle avertie, là où la demande de luxe existe déjà mais où la présence directe des marques demeure rare.',mavenBodyTwo:'Plus de 250 points de vente renforcent la présence des marques dans les parfumeries spécialisées, les pharmacies, les supermarchés et le commerce en ligne. Les stocks sont gérés depuis des entrepôts sous douane à Nairobi et Mombasa. Les autorisations réglementaires et la livraison jusqu’au point de vente sont prises en charge localement. Chaque mouvement respecte le produit, son positionnement et les standards de la marque.',
    feelNzuriKicker:'Salon de parfumerie emblématique',feelNzuriBody:'FeelNZuri est le salon de parfumerie phare de Space, où un univers de parfumerie de niche se révèle entre le confort du feu, la sérénité du jardin et une hospitalité attentive. Chaque détail invite à une découverte paisible et exprime l’élégance de l’authentique hospitalité africaine.',feelNzuriBodyMobile:'FeelNZuri est le salon de parfumerie phare de Space, façonné par la parfumerie de niche, la sérénité du jardin et la chaleur de l’hospitalité africaine.',learnMore:'En savoir plus',
    exploreMaven:'Découvrir Maven',mavenDrawerLabel:'Maven Global · Une société Space',mavenDrawerEyebrow:'Distribution et retail consommateur',
    mavenDrawerIntro:'Maven Global est la filiale régionale de Space pour la distribution et le retail de parfums de luxe. L’entreposage local, la coordination réglementaire, la logistique transfrontalière et l’accès établi au retail opèrent aux côtés de FeelNZuri, le salon de parfumerie de Space destiné aux consommateurs.',
    mavenDistributionLabel:'Distribution',mavenRetailLabel:'Retail',
    mavenDrawerDistribution:'Maven Global relie les maisons internationales de parfumerie au retail régional par l’entrée sur le marché, la distribution de gros, l’entreposage, la logistique transfrontalière et une exécution rigoureuse de la marque.',
    mavenDrawerRetail:'FeelNZuri est le salon de parfumerie de Space destiné aux consommateurs. Il rapproche la parfumerie de niche du public grâce à une découverte guidée, une présentation soignée et une lecture directe du marché retail.',
    openMavenPanel:'Ouvrir le profil Maven',closeMavenPanel:'Fermer le profil Maven',
    formWait:'Veuillez patienter un instant avant d’envoyer votre message.',formSending:'Envoi en cours…',
    formError:'Votre demande n’a pas pu être envoyée.',formEmailFallback:'Veuillez écrire directement à info@space-tr.com.',
    formSuccess:'Merci. Votre message a bien été envoyé.'
  }
};
let currentLanguage=initialLanguage;
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
  const resetExpertiseWords=()=>expertiseWords.forEach(word=>word.classList.remove('is-word-visible'));
  const expertiseWordObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting)entry.target.classList.add('is-word-visible');
  }),{threshold:.35,rootMargin:'-12% 0px -32% 0px'});
  const expertiseSectionObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)resetExpertiseWords();
  }),{threshold:0});
  expertiseWords.forEach(word=>expertiseWordObserver.observe(word));
  expertiseSectionObserver.observe(expertiseWordTransition);
  addEventListener('space:languagechange',updateExpertiseWordLabel);
  updateExpertiseWordLabel();
}
if(expertiseEditorial){
  const expertiseCardObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');expertiseCardObserver.unobserve(entry.target)}}),{threshold:.08});
  expertiseCardObserver.observe(expertiseEditorial);
}
const expertiseShowcase=document.querySelector('[data-expertise-showcase]');
if(expertiseShowcase){
  const expertiseTargets=[...expertiseShowcase.querySelectorAll('[data-expertise-key]')];
  const defaultExpertiseKey='market';
  const activateExpertise=key=>{
    expertiseShowcase.classList.toggle('has-active',Boolean(key));
    expertiseTargets.forEach(target=>target.classList.toggle('is-active',target.dataset.expertiseKey===key));
  };
  expertiseTargets.forEach(target=>{
    const key=target.dataset.expertiseKey;
    target.addEventListener('mouseenter',()=>activateExpertise(key));
    target.addEventListener('focus',()=>activateExpertise(key));
    target.addEventListener('click',()=>activateExpertise(key));
  });
  expertiseShowcase.addEventListener('mouseleave',()=>activateExpertise(defaultExpertiseKey));
  activateExpertise(defaultExpertiseKey);
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

/* Generated media library: this is the boundary a future CMS can update. */
const spaceMediaLibrary=window.SPACE_MEDIA_LIBRARY?.media||[];
let spaceMediaCuration=window.SPACE_MEDIA_CURATION||{hero:{excludeLightBackgrounds:true,excluded:[],included:[]},carousel:{selectionMode:'include',excluded:[],included:[]}};
const mediaCurationPromise=(async()=>{
  try{
    const response=await fetch('/assets/media/runtime/media-curation.json',{cache:'no-store'});
    if(response.ok){
      const current=await response.json();
      if(current?.hero&&current?.carousel)spaceMediaCuration=current;
    }
  }catch{}
  return spaceMediaCuration;
})();
let curationReloadPending=false;
const reloadForCuration=message=>{
  const updatedAt=Date.parse(message?.updatedAt||0)||0,loadedAt=Date.parse(spaceMediaCuration.updatedAt||0)||0;
  if(!curationReloadPending&&updatedAt>loadedAt){curationReloadPending=true;window.location.reload()}
};
window.addEventListener('storage',event=>{
  if(event.key!=='space-media-curation-updated'||!event.newValue)return;
  try{reloadForCuration(JSON.parse(event.newValue))}catch{}
});
if('BroadcastChannel' in window){
  const curationChannel=new BroadcastChannel('space-media-curation');
  curationChannel.addEventListener('message',event=>reloadForCuration(event.data));
}
const cmsContentPromise=(async()=>{
  const controller=new AbortController(),timeout=window.setTimeout(()=>controller.abort(),2500);
  try{const preview=new URLSearchParams(location.search).get('preview'),endpoint=preview?`/api/content?preview=${encodeURIComponent(preview)}`:'/api/content',response=await fetch(endpoint,{headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal});return response.ok?response.json():null}
  catch{return null}
  finally{window.clearTimeout(timeout)}
})();
const brandTaxonomy=window.SPACE_BRAND_TAXONOMY||{
  logos:[],canonicalize:value=>String(value||''),isRetired:()=>false
};
const portfolioBrandRecords=brandTaxonomy.featuredLogos||brandTaxonomy.logos||[];
const portfolioBrandNames=portfolioBrandRecords.map(record=>record.name);
const lightHeroLogoNumbers=new Set([8,9,10,11,12,16,39]);
const whiteCanvasLogoNumbers=new Set([8,9,10,11,12,16,39]);
const portfolioLogoPath=(record,variant='avif')=>{
  if(record.logoUrl)return record.logoUrl;
  const stem=`assets/brand/portfolio/logos/brand-${String(record.logoNumber).padStart(2,'0')}`;
  if(variant==='light')return `${stem}-mark${lightHeroLogoNumbers.has(record.logoNumber)?'-white':''}.png`;
  if(variant==='web-white')return `${stem}-web-white.avif`;
  return `${stem}${variant==='mark'?'-mark.png':'.avif'}`;
};
const slotAllowsMedia=(item,slot)=>{
  const settings=spaceMediaCuration[slot]||{},excluded=new Set(settings.excluded||[]),included=new Set(settings.included||[]);
  if(slot==='carousel')return included.has(item.id);
  if(excluded.has(item.id))return false;
  if(included.has(item.id))return true;
  if(slot==='hero'&&settings.excludeLightBackgrounds!==false&&item.type!=='video'&&(item.backgroundTone==='light'||(item.edgeLuminance>=205&&item.lightNeutralRatio>=.25)))return false;
  return true;
};
const encodeAssetPath=value=>/^https?:\/\//i.test(String(value))?String(value):String(value).split('/').map(segment=>encodeURIComponent(decodeURIComponent(segment))).join('/');
const shuffleMedia=items=>{
  const copy=[...items];
  for(let index=copy.length-1;index>0;index-=1){const swap=Math.floor(Math.random()*(index+1));[copy[index],copy[swap]]=[copy[swap],copy[index]]}
  return copy;
};
const isEditorialAsset=item=>!/(pack[ -]?shot|png images|no background|textclipping)/i.test(item.src);
// Only serve generated web derivatives from the rotating library. Raw campaign
// masters remain local for curation and future CMS processing, but are far too
// large to ship to every visitor. Legacy curated fallbacks remain available.
const mediaPool=(orientation,type,slot)=>spaceMediaLibrary.filter(item=>item.webReady&&item.optimizedSrc&&!brandTaxonomy.isRetired(item.brand)&&item.orientation===orientation&&(!type||item.type===type)&&isEditorialAsset(item)&&(!slot||slotAllowsMedia(item,slot)));
const mediaLabel=item=>`${item.brand||'Space'} ${item.label||'campaign'} visual`;
const buildMediaElement=(item,{deferSource=false,responsive=false}={})=>{
  const source=encodeAssetPath((responsive&&!window.matchMedia('(max-width:900px)').matches&&item.desktopSrc)||item.optimizedSrc||item.src);
  if(item.type==='video'){
    const video=document.createElement('video');
    video.muted=true;video.loop=true;video.playsInline=true;video.preload=deferSource?'none':'auto';video.setAttribute('aria-label',mediaLabel(item));
    if(item.posterSrc)video.poster=encodeAssetPath(item.posterSrc);
    if(deferSource)video.dataset.src=source;else video.src=source;
    return video;
  }
  const image=document.createElement('img');
  image.alt=mediaLabel(item);image.draggable=false;image.decoding='async';
  if(responsive&&item.mobileSrc){image.srcset=`${encodeAssetPath(item.mobileSrc)} 900w, ${source} 1440w`;image.sizes='(max-width: 900px) 100vw, 50vw'}
  if(deferSource)image.dataset.src=source;else image.src=source;
  return image;
};
const hydrateMediaElement=element=>{
  if(!element?.dataset.src)return;
  element.src=element.dataset.src;delete element.dataset.src;
  if(element.tagName==='VIDEO')element.load();
};
const fallbackVertical=[
  {id:'fallback-left',src:'assets/brand/campaigns/campaign-motion.mp4',brand:'Space Fragrance',label:'fragrance campaign',type:'video',orientation:'vertical',webReady:true},
  {id:'fallback-right',src:'assets/brand/campaigns/campaign-still.avif',brand:'Space Beauty',label:'beauty campaign',type:'image',orientation:'vertical',webReady:true}
];
const cmsMediaItem=item=>{if(!item?.url)return null;const mobile=window.matchMedia('(max-width:900px)').matches,desktopSrc=item.desktopUrl||item.url,mobileSrc=item.mobileUrl||desktopSrc,src=mobile?mobileSrc:desktopSrc;return {id:item.id||item.url,src,optimizedSrc:src,mobileSrc,desktopSrc,posterSrc:item.posterUrl||item.thumbnailUrl||'',thumbnailSrc:item.thumbnailUrl||src,brand:item.brand||item.id||item.url,label:item.alt||item.label||'campaign',type:item.type==='video'?'video':'image',orientation:item.orientation||'vertical',webReady:true}};
const heroRotators=[...document.querySelectorAll('[data-asset-rotator]')];
if(heroRotators.length){
  Promise.all([cmsContentPromise,mediaCurationPromise]).then(([cmsContent,currentCuration])=>{
  spaceMediaCuration=currentCuration;
  const mobileHero=window.matchMedia('(max-width:900px)').matches;
  const configuredHero=mobileHero?(cmsContent?.media?.heroMobile||cmsContent?.media?.hero):(cmsContent?.media?.heroDesktop||cmsContent?.media?.hero);
  const cmsHero=(configuredHero||[]).map(cmsMediaItem).filter(Boolean),heroPool=mediaPool('vertical',null,'hero');
  const rotationPool=cmsHero.length?cmsHero:(heroPool.length?heroPool:fallbackVertical);
  let previousOpeningIds=[];
  try{previousOpeningIds=JSON.parse(localStorage.getItem('space-hero-opening-v2')||'[]')}catch{previousOpeningIds=[]}
  const previousOpeningItems=rotationPool.filter(item=>previousOpeningIds.includes(item.id));
  const previousOpeningBrands=new Set(previousOpeningItems.map(item=>brandTaxonomy.canonicalize(item.brand)));
  let openingCandidates=rotationPool.filter(item=>!previousOpeningIds.includes(item.id)&&!previousOpeningBrands.has(brandTaxonomy.canonicalize(item.brand)));
  if(new Set(openingCandidates.map(item=>brandTaxonomy.canonicalize(item.brand))).size<heroRotators.length)openingCandidates=rotationPool.filter(item=>!previousOpeningIds.includes(item.id));
  const openingPair=openingCandidates.length
    ? window.SpaceHeroScheduler?.create(openingCandidates,{pairSize:heroRotators.length,canonicalize:brandTaxonomy.canonicalize})?.nextPair()||[]
    : [];
  let pendingOpeningPair=[...openingPair];
  let openingRecorded=false;
  const scheduler=window.SpaceHeroScheduler?.create(rotationPool,{
    pairSize:heroRotators.length,
    canonicalize:brandTaxonomy.canonicalize,
    previousItems:openingPair
  });
  const pendingRotations=new WeakMap();
  const heroRotatorVisibility=new WeakMap(heroRotators.map(rotator=>[rotator,false]));
  const syncHeroRotator=rotator=>{
    const shouldPlay=heroRotatorVisibility.get(rotator)&&!document.hidden&&!reducedMotionQuery.matches;
    rotator.querySelectorAll('.asset-rotator-frame.is-active video').forEach(video=>{
      if(!shouldPlay){video.pause();return}
      const playback=video.play();if(playback?.catch)playback.catch(()=>{});
    });
  };
  const heroMediaObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    heroRotatorVisibility.set(entry.target,entry.isIntersecting&&entry.intersectionRatio>.02);
    syncHeroRotator(entry.target);
  }),{threshold:[0,.02,.25]});
  heroRotators.forEach(rotator=>heroMediaObserver.observe(rotator));
  document.addEventListener('visibilitychange',()=>heroRotators.forEach(syncHeroRotator));
  let timer,pendingShows=0;
  const show=(rotator,item)=>{
    pendingRotations.get(rotator)?.cancel();
    pendingShows+=1;
    const frame=document.createElement('div');frame.className='asset-rotator-frame is-staging';frame.dataset.assetId=item.id;
    const previewSource=item.thumbnailSrc||item.optimizedSrc||item.src;
    if(previewSource)frame.style.backgroundImage=`url("${encodeAssetPath(previewSource)}")`;
    const media=buildMediaElement(item,{responsive:true});frame.append(media);
    const isInitialFrame=!rotator.querySelector('.asset-rotator-frame.is-active');
    if(media.tagName==='IMG'&&isInitialFrame)media.fetchPriority='high';
    // Insert the matching lightweight preview immediately. The full image or
    // video can decode behind it without exposing the empty hero background.
    rotator.append(frame);
    let settled=false,decoding=false,readinessFallback;
    const clearPending=()=>{
      if(pendingRotations.get(rotator)!==controller)return;
      pendingRotations.delete(rotator);
      pendingShows=Math.max(0,pendingShows-1);
    };
    const discard=()=>{
      if(settled)return;
      settled=true;window.clearTimeout(readinessFallback);clearPending();
      if(isInitialFrame&&previewSource&&!rotator.querySelector('.asset-rotator-frame.is-active')){
        frame.classList.remove('is-staging');frame.classList.add('is-active','is-preview-only');
      }else frame.remove();
    };
    const commit=()=>{
      if(settled||pendingRotations.get(rotator)!==controller)return;
      settled=true;window.clearTimeout(readinessFallback);clearPending();
      rotator.dataset.activeAssetId=item.id;rotator.dataset.activeBrand=item.brand||'';rotator.dataset.activeSrc=item.optimizedSrc||item.src;
      const oldFrames=[...rotator.querySelectorAll('.asset-rotator-frame')].filter(old=>old!==frame);
      frame.classList.remove('is-staging');frame.classList.add('is-active','is-media-ready');void frame.offsetWidth;
      oldFrames.forEach(old=>{old.querySelector('video')?.pause();old.remove()});
      if(media.tagName==='VIDEO')syncHeroRotator(rotator);
    };
    const activate=()=>{
      if(settled||decoding||pendingRotations.get(rotator)!==controller)return;
      if(media.tagName==='IMG'&&typeof media.decode==='function'){
        decoding=true;
        media.decode().catch(()=>{}).then(()=>{decoding=false;commit()});
      }else commit();
    };
    const controller={cancel:discard};pendingRotations.set(rotator,controller);
    readinessFallback=window.setTimeout(()=>{
      const ready=media.tagName==='IMG'?(media.complete&&media.naturalWidth>0):media.readyState>=2;
      if(ready)activate();else discard();
    },7000);
    if(media.tagName==='IMG'){
      if(media.complete&&media.naturalWidth>0)activate();
      else if(media.complete)discard();
      else{media.addEventListener('load',activate,{once:true});media.addEventListener('error',discard,{once:true})}
    }else{
      media.addEventListener('loadeddata',activate,{once:true});media.addEventListener('canplay',activate,{once:true});media.addEventListener('error',discard,{once:true});
      if(media.readyState>=2)activate();
    }
  };
  const advance=()=>{
    if(!isNearViewport(heroRotators[0],.1))return;
    if(pendingShows)return;
    const pair=pendingOpeningPair.length?pendingOpeningPair.splice(0):scheduler?.nextPair()||[];
    if(pair.length&&!openingRecorded){
      openingRecorded=true;
      try{localStorage.setItem('space-hero-opening-v2',JSON.stringify(pair.map(item=>item.id)))}catch{}
    }
    pair.forEach((item,index)=>{if(heroRotators[index]&&item)show(heroRotators[index],item)});
  };
  // The HTML contains only a zero-byte neutral frame. Select an approved pair
  // immediately so every load begins with fresh campaign photography without
  // downloading a fixed pair first.
  advance();
  const configuredSeconds=mobileHero?cmsContent?.settings?.heroMobileRotationSeconds:cmsContent?.settings?.heroDesktopRotationSeconds;
  const heroRotationInterval=Math.max(5,Math.min(15,Number(configuredSeconds??cmsContent?.settings?.heroRotationSeconds)||5))*1000;
  const constrainedConnection=Boolean(navigator.connection?.saveData)||Boolean(navigator.connection&&/2g/.test(navigator.connection.effectiveType||''));
  if(rotationPool.length>heroRotators.length&&!reducedMotionQuery.matches&&!constrainedConnection)timer=window.setInterval(advance,heroRotationInterval);
  });
}

const heroBrandProof=document.querySelector('.hero-brand-proof');
if(heroBrandProof){
  const heroBrandRecords=portfolioBrandRecords.filter(record=>String(record.name||'').trim().toLowerCase()!=='spirit of dubai');
  const heroBrandNames=heroBrandRecords.map(record=>record.name);
  const brandImages=[...heroBrandProof.querySelectorAll('img')];
  const allBrandIndexes=heroBrandNames.map((_,index)=>index);
  let previousOpening=[];
  try{previousOpening=JSON.parse(localStorage.getItem('space-hero-brand-opening')||'[]')}catch(error){previousOpening=[]}
  const openingPool=shuffleMedia(allBrandIndexes.filter(index=>!previousOpening.includes(index)));
  if(openingPool.length<brandImages.length)openingPool.push(...shuffleMedia(allBrandIndexes.filter(index=>!openingPool.includes(index))));
  let currentBrandIndexes=openingPool.slice(0,brandImages.length),brandDeck=shuffleMedia(allBrandIndexes.filter(index=>!currentBrandIndexes.includes(index))),brandTimer;
  localStorage.setItem('space-hero-brand-opening',JSON.stringify(currentBrandIndexes));
  brandImages.forEach((image,slot)=>{const index=currentBrandIndexes[slot];image.src=portfolioLogoPath(heroBrandRecords[index],'light');image.alt=heroBrandNames[index]});
  const nextBrandSet=()=>{
    const next=[];
    while(next.length<brandImages.length){
      if(!brandDeck.length)brandDeck=shuffleMedia(allBrandIndexes.filter(index=>!currentBrandIndexes.includes(index)&&!next.includes(index)));
      const candidate=brandDeck.shift();
      if(candidate!==undefined&&!currentBrandIndexes.includes(candidate)&&!next.includes(candidate))next.push(candidate);
    }
    return next;
  };
  const preloadBrandSet=indexes=>Promise.all(indexes.map(index=>new Promise(resolve=>{
    const image=new Image();
    image.onload=resolve;image.onerror=resolve;
    image.src=portfolioLogoPath(heroBrandRecords[index],'light');
  })));
  const showBrandSet=async()=>{
    if(!isNearViewport(heroBrandProof,.1))return;
    const next=nextBrandSet();
    await preloadBrandSet(next);
    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduceMotion)heroBrandProof.classList.add('is-changing');
    window.setTimeout(()=>{
      brandImages.forEach((image,slot)=>{const index=next[slot];image.src=portfolioLogoPath(heroBrandRecords[index],'light');image.alt=heroBrandNames[index]});
      currentBrandIndexes=next;
      requestAnimationFrame(()=>requestAnimationFrame(()=>heroBrandProof.classList.remove('is-changing')));
    },reduceMotion?0:520);
  };
  const startBrandRotation=()=>{
    window.clearInterval(brandTimer);
    if(!reducedMotionQuery.matches)brandTimer=window.setInterval(showBrandSet,5200);
  };
  heroBrandProof.addEventListener('mouseenter',()=>window.clearInterval(brandTimer));
  heroBrandProof.addEventListener('mouseleave',startBrandRotation);
  startBrandRotation();
}

const selectCarouselMedia=(limit=20)=>{
  // The lower carousel is manually curated in the media catalogue. Preserve
  // that approved set exactly; never backfill it with unapproved assets.
  const approved=mediaPool('horizontal',null,'carousel'),byId=new Map(approved.map(item=>[item.id,item]));
  return (spaceMediaCuration.carousel?.included||[]).map(id=>byId.get(id)).filter(Boolean).slice(0,limit);
};
document.querySelectorAll('[data-campaign-carousel]').forEach(carousel=>{
  if(window.matchMedia('(max-width: 900px)').matches){carousel.hidden=true;return}
  const track=carousel.querySelector('[data-campaign-track]'),rail=carousel.querySelector('[data-campaign-thumbnails]');
  if(!track||!rail)return;
  cmsContentPromise.then(cmsContent=>{
  const cmsCarousel=(cmsContent?.media?.carousel||[]).map(item=>{const media=cmsMediaItem(item);if(media)media.orientation='horizontal';return media}).filter(Boolean);
  const limit=Number(track.dataset.mediaLimit)||20,items=(cmsCarousel.length?cmsCarousel:selectCarouselMedia(limit)).slice(0,limit);
  items.forEach((item,index)=>{
    const slide=document.createElement('figure');slide.className='campaign-carousel-slide';slide.dataset.brand=item.brand;slide.append(buildMediaElement(item,{deferSource:index>1}));track.append(slide);
    const thumbnail=document.createElement('button');thumbnail.type='button';thumbnail.dataset.campaignThumbnail=String(index);thumbnail.setAttribute('aria-label',`View ${mediaLabel(item)}`);if(index===0)thumbnail.classList.add('is-active');
    const thumbnailSource=item.thumbnailSrc||item.optimizedSrc||item.src;
    const thumbnailMedia=document.createElement(item.type==='video'&&!item.thumbnailSrc?'video':'img');thumbnailMedia.src=encodeAssetPath(thumbnailSource);thumbnailMedia.setAttribute('aria-hidden','true');
    if(thumbnailMedia.tagName==='VIDEO'){thumbnailMedia.muted=true;thumbnailMedia.playsInline=true;thumbnailMedia.preload='metadata'}else{thumbnailMedia.alt='';thumbnailMedia.loading='lazy';thumbnailMedia.decoding='async'}
    thumbnail.append(thumbnailMedia);rail.append(thumbnail);
  });
  carousel.dispatchEvent(new CustomEvent('space:campaign-built'));
  });
});

/* Keep motion inexpensive: only play video while it is actually visible. */
const managedMedia=[...document.querySelectorAll('video[data-managed-media]')];
if(managedMedia.length){
  const limitMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mediaInView=new WeakMap();
  const mediaByFrame=new WeakMap();
  const mediaReleaseTimers=new WeakMap();
  const releaseDecodedMedia=coarsePointerQuery.matches;
  const hydrateMedia=media=>{
    if(media.dataset.sourceHydrated)return;
    let changed=false;
    media.querySelectorAll('source[data-src]').forEach(source=>{source.src=source.dataset.src;changed=true});
    media.dataset.sourceHydrated='true';
    media.preload='auto';
    const frame=media.closest('.film-frame'),fallback=frame?.querySelector('[data-motion-fallback]');
    if(fallback&&!fallback.getAttribute('src'))fallback.setAttribute('src',fallback.dataset.motionFallback);
    if(changed)media.load();
  };
  const showFilmFallback=media=>{
    const frame=media.closest('.film-frame'),fallback=frame?.querySelector('[data-motion-fallback]');
    if(!frame||!fallback)return;
    if(!fallback.getAttribute('src'))fallback.setAttribute('src',fallback.dataset.motionFallback);
    frame.classList.add('is-motion-fallback');
    frame.classList.remove('is-video-active');
  };
  const showFilmVideo=media=>{
    const frame=media.closest('.film-frame');
    frame?.classList.remove('is-motion-fallback');
    frame?.classList.add('is-video-active');
  };
  const clearMediaRelease=media=>{
    const timer=mediaReleaseTimers.get(media);
    if(timer)window.clearTimeout(timer);
    mediaReleaseTimers.delete(media);
  };
  const parkMedia=media=>{
    clearMediaRelease(media);
    if(mediaInView.get(media)||!releaseDecodedMedia)return;
    media.pause();
    let changed=false;
    media.querySelectorAll('source[src]').forEach(source=>{
      if(!source.dataset.src)source.dataset.src=source.getAttribute('src');
      source.removeAttribute('src');
      changed=true;
    });
    if(media.hasAttribute('src')){
      if(!media.dataset.src)media.dataset.src=media.getAttribute('src');
      media.removeAttribute('src');
      changed=true;
    }
    delete media.dataset.sourceHydrated;
    delete media.dataset.playRequested;
    media.preload='none';
    if(changed)media.load();
    showFilmFallback(media);
  };
  const scheduleMediaRelease=media=>{
    if(!releaseDecodedMedia)return;
    clearMediaRelease(media);
    mediaReleaseTimers.set(media,window.setTimeout(()=>parkMedia(media),700));
  };
  const requestPlayback=media=>{
    clearMediaRelease(media);
    hydrateMedia(media);
    media.muted=true;media.defaultMuted=true;media.autoplay=true;media.playsInline=true;media.controls=false;
    if(media.readyState<3)showFilmFallback(media);
    if(!media.paused){if(media.readyState>=3)showFilmVideo(media);return}
    if(media.dataset.playRequested==='true')return;
    media.dataset.playRequested='true';
    const playback=media.play();
    if(playback?.then)playback.then(()=>{
      if(mediaInView.get(media)&&media.dataset.sourceHydrated)showFilmVideo(media);
      else showFilmFallback(media);
    }).catch(()=>showFilmFallback(media)).finally(()=>{delete media.dataset.playRequested});
    else delete media.dataset.playRequested;
  };
  const syncMedia=media=>{
    const shouldPlay=!limitMotion&&!document.hidden&&mediaInView.get(media);
    if(shouldPlay)requestPlayback(media);
    else{
      media.pause();
      /* Keep the last decoded frame visible while the film is crossing a
         viewport edge. Swapping back to the poster here creates a visible
         flash during a fast mobile swipe. The far-offscreen parking observer
         releases the decoder and restores the poster once it cannot be seen. */
      if(media.readyState<2)showFilmFallback(media);
    }
  };
  const mediaObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    const media=mediaByFrame.get(entry.target);if(!media)return;
    mediaInView.set(media,entry.isIntersecting&&entry.intersectionRatio>0);syncMedia(media);
  }),{threshold:[0,.01,.12,.4]});
  const mediaWarmupMargin=Math.ceil(innerHeight*(releaseDecodedMedia?1.6:.9));
  const proximityObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
    const media=mediaByFrame.get(entry.target);if(!media)return;
    if(entry.isIntersecting){clearMediaRelease(media);hydrateMedia(media)}
    else scheduleMediaRelease(media);
  }),{rootMargin:`${mediaWarmupMargin}px 0px`,threshold:0});
  managedMedia.forEach(media=>{
    const frame=media.closest('.film-frame')||media;
    mediaByFrame.set(frame,media);
    mediaObserver.observe(frame);
    proximityObserver.observe(frame);
    if(!media.querySelector('source[data-src]'))media.dataset.sourceHydrated='true';
    media.addEventListener('canplay',()=>syncMedia(media));
    media.addEventListener('playing',()=>showFilmVideo(media));
    media.addEventListener('waiting',()=>{if(media.readyState<2)showFilmFallback(media)});
    showFilmFallback(media);
  });
  document.addEventListener('visibilitychange',()=>managedMedia.forEach(syncMedia));
  window.addEventListener('pageshow',()=>managedMedia.forEach(syncMedia));
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
  gallery.innerHTML=portfolioBrandRecords.map(record=>`<button class="brand-card" type="button" aria-label="${record.name}, portfolio partner" aria-pressed="false"><span class="brand-card-inner"><span class="brand-face brand-front"><img src="${portfolioLogoPath(record)}" alt="${record.name}" loading="lazy" decoding="async"></span><span class="brand-face brand-back"><small>Space portfolio</small><strong>${record.name}</strong><span>Global brands · Local reach</span></span></span></button>`).join('');
  gallery.querySelectorAll('.brand-card').forEach(card=>card.addEventListener('click',()=>{const flipped=card.classList.toggle('is-flipped');card.setAttribute('aria-pressed',String(flipped))}));
}
const brandTheatre=document.querySelector('[data-brand-theatre]');
if(brandTheatre){
  const theatreBrands=portfolioBrandRecords;
  const scenes=['assets/brand/campaigns/campaign-still.avif','assets/brand/campaigns/campaign-editorial-poster.webp','assets/brand/campaigns/campaign-still.avif','assets/brand/campaigns/campaign-hero-static.avif'];
  const backdrop=brandTheatre.querySelector('.brand-theatre-backdrop');
  const brandItem=(record,index)=>`<button class="brand-ribbon-item" type="button" data-brand-scene="${index%scenes.length}" aria-label="${record.name}"><img src="${portfolioLogoPath(record)}" alt="${record.name}" loading="lazy" decoding="async"></button>`;
  const midpoint=Math.ceil(theatreBrands.length/2),firstHalf=theatreBrands.slice(0,midpoint),secondHalf=theatreBrands.slice(midpoint);
  brandTheatre.querySelector('[data-brand-row="one"]').innerHTML=[...firstHalf,...firstHalf].map((record,index)=>brandItem(record,index%firstHalf.length)).join('');
  brandTheatre.querySelector('[data-brand-row="two"]').innerHTML=[...secondHalf,...secondHalf].map((record,index)=>brandItem(record,midpoint+(index%secondHalf.length))).join('');
  brandTheatre.querySelectorAll('[data-brand-scene]').forEach(item=>{
    const revealScene=()=>{backdrop.style.backgroundImage=`linear-gradient(rgba(4,8,15,.34),rgba(4,8,15,.68)),url('${scenes[Number(item.dataset.brandScene)]}')`};
    item.addEventListener('mouseenter',revealScene);item.addEventListener('focus',revealScene);
  });
  const overlay=brandTheatre.querySelector('[data-brand-overlay]');
  brandTheatre.querySelector('[data-brand-index]').innerHTML=theatreBrands.map(record=>`<div><img src="${portfolioLogoPath(record)}" alt="${record.name}" loading="lazy"><span>${record.name}</span></div>`).join('');
  const setOverlay=open=>{overlay.classList.toggle('is-open',open);overlay.setAttribute('aria-hidden',String(!open));document.body.classList.toggle('brand-index-open',open)};
  brandTheatre.querySelector('[data-brand-open]').addEventListener('click',()=>setOverlay(true));
  brandTheatre.querySelector('[data-brand-close]').addEventListener('click',()=>setOverlay(false));
  document.addEventListener('keydown',event=>{if(event.key==='Escape')setOverlay(false)});
}
const brandBrochure=document.querySelector('[data-brand-brochure]');
if(brandBrochure){
  const grid=brandBrochure.querySelector('[data-brand-brochure-grid]');
  grid.innerHTML=portfolioBrandRecords.map(record=>`<div class="brand-directory-item"><img src="${portfolioLogoPath(record)}" alt="${record.name}" loading="lazy" decoding="async"></div>`).join('');
  const gifSlides=[...brandBrochure.querySelectorAll('.brand-gif-stage img')];let activeGif=0;
  if(gifSlides.length>1&&!reducedMotionQuery.matches)window.setInterval(()=>{if(!isNearViewport(brandBrochure))return;gifSlides[activeGif].classList.remove('is-active');activeGif=(activeGif+1)%gifSlides.length;gifSlides[activeGif].classList.add('is-active')},6000);
}
const brandRunway=document.querySelector('[data-brand-runway]');
if(brandRunway){
  const rowSize=10,rows=Array.from({length:Math.ceil(portfolioBrandRecords.length/rowSize)},(_,rowIndex)=>portfolioBrandRecords.slice(rowIndex*rowSize,rowIndex*rowSize+rowSize));
  brandRunway.querySelector('[data-runway-rows]').innerHTML=rows.map((row,rowIndex)=>`<div class="runway-row"><span class="runway-row-number">0${rowIndex+1}</span><div class="runway-logo-line">${row.map(record=>`<button type="button" aria-label="${record.name}"><img src="${portfolioLogoPath(record)}" alt="${record.name}" loading="lazy" decoding="async"></button>`).join('')}</div></div>`).join('');
}
const brandCatalogue=document.querySelector('[data-brand-catalogue]');
if(brandCatalogue){
  brandCatalogue.querySelector('[data-brand-catalogue-grid]').innerHTML=portfolioBrandRecords.map(record=>`<div class="catalogue-logo"><img src="${portfolioLogoPath(record)}" alt="${record.name}" loading="lazy" decoding="async"></div>`).join('');
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
  const expertiseScenes=['assets/brand/campaigns/campaign-still.avif','assets/editorial/regions/offices/dubai.jpg','assets/brand/campaigns/campaign-hero-static.avif','assets/brand/campaigns/campaign-editorial-poster.webp','assets/editorial/regions/context/france.webp','assets/brand/campaigns/campaign-still.avif'];
  const buttons=[...expertiseAtelier.querySelectorAll('[data-expertise]')],stage=expertiseAtelier.querySelector('.service-stage'),indexNav=expertiseAtelier.querySelector('.service-index'),ghost=expertiseAtelier.querySelector('[data-expertise-ghost]'),number=expertiseAtelier.querySelector('[data-expertise-number]'),title=expertiseAtelier.querySelector('[data-expertise-title]'),copy=expertiseAtelier.querySelector('[data-expertise-copy]'),tags=expertiseAtelier.querySelector('[data-expertise-tags]'),visual=expertiseAtelier.querySelector('[data-expertise-visual]');let activeExpertise=0,expertiseCycle;
  const showExpertise=index=>{if(index===activeExpertise&&stage.classList.contains('is-ready'))return;activeExpertise=index;stage.classList.add('is-changing','is-ready');window.setTimeout(()=>{const area=expertiseAreas[index],label=String(index+1).padStart(2,'0');expertiseAtelier.dataset.active=String(index);ghost.textContent=label;number.textContent=`${label} / 06`;title.textContent=area.title;copy.textContent=area.copy;tags.innerHTML=area.tags.map(tag=>`<li>${tag}</li>`).join('');visual.src=expertiseScenes[index];buttons.forEach((button,buttonIndex)=>button.classList.toggle('is-active',buttonIndex===index));window.setTimeout(()=>stage.classList.remove('is-changing'),80)},280)};
  const startExpertiseCycle=()=>{window.clearInterval(expertiseCycle);if(reducedMotionQuery.matches||lowPowerMode)return;expertiseCycle=window.setInterval(()=>{if(isNearViewport(expertiseAtelier))showExpertise((activeExpertise+1)%expertiseAreas.length)},6000)};
  buttons.forEach((button,index)=>{button.addEventListener('mouseenter',()=>showExpertise(index));button.addEventListener('focus',()=>showExpertise(index));button.addEventListener('click',()=>{showExpertise(index);startExpertiseCycle()})});
  indexNav.addEventListener('mouseenter',()=>window.clearInterval(expertiseCycle));indexNav.addEventListener('mouseleave',startExpertiseCycle);stage.classList.add('is-ready');startExpertiseCycle();
}
const heroMedia=document.querySelector('[data-hero-media]');
if(heroMedia){
  const slides=[...heroMedia.querySelectorAll('.hero-slide')];
  let activeSlide=0;
  if(slides.length>1&&!reducedMotionQuery.matches){
    window.setInterval(()=>{
      if(!isNearViewport(heroMedia))return;
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
  immersiveFilm.style.setProperty('--film-progress','1');
  immersiveFilm.style.setProperty('--film-width','100vw');
  immersiveFilm.style.setProperty('--film-height','100svh');
  immersiveFilm.style.setProperty('--film-radius','0px');
  immersiveFilm.style.setProperty('--film-backdrop-opacity','0');
  immersiveFilm.classList.add('is-expanded');
}

const campaignFilm=document.querySelector('.immersive-film');
if(campaignFilm){
  const campaignVideo=campaignFilm.querySelector('video');
  const mobileFilmQuery=window.matchMedia('(max-width: 900px)');
  const syncFilmStatement=()=>{
    if(!campaignVideo)return;
    const duration=Number.isFinite(campaignVideo.duration)?campaignVideo.duration:0;
    const hideTime=mobileFilmQuery.matches&&duration>0?Math.max(0,duration-7):25;
    campaignFilm.classList.toggle('hide-film-statement',campaignVideo.currentTime>=hideTime);
  };
  ['loadedmetadata','durationchange','timeupdate','seeked','emptied'].forEach(eventName=>campaignVideo?.addEventListener(eventName,syncFilmStatement));
  campaignVideo?.addEventListener('play',syncFilmStatement);
  campaignVideo?.addEventListener('pause',syncFilmStatement);
  campaignVideo?.addEventListener('ended',syncFilmStatement);
  mobileFilmQuery.addEventListener?.('change',syncFilmStatement);
  syncFilmStatement();
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
  if(!lowPowerMode&&window.matchMedia('(pointer:fine)').matches)expertiseDial.addEventListener('pointermove',event=>{
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
  if(!lowPowerMode&&window.matchMedia('(pointer:fine)').matches)expertiseTheatre.addEventListener('pointermove',event=>{
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
    {title:'expertiseMarket',copy:'expertiseMarketCopy',image:'assets/editorial/regions/context/france.webp',points:{en:['Market assessment','Brand positioning','Launch planning','Commercial development'],fr:['Évaluation du marché','Positionnement de marque','Planification des lancements','Développement commercial']}},
    {title:'expertiseSales',copy:'expertiseSalesCopy',image:'assets/editorial/regions/offices/dubai.jpg',points:{en:['Distribution partnerships','Retail relationships','Duty-free & e-commerce','Route-to-market execution'],fr:['Partenariats de distribution','Relations avec les détaillants','Duty-free & e-commerce','Exécution commerciale']}},
    {title:'expertiseStewardship',copy:'expertiseStewardshipCopy',image:'assets/brand/campaigns/campaign-still.avif',points:{en:['Presentation standards','Pricing discipline','Brand consistency','Local relevance'],fr:['Standards de présentation','Discipline tarifaire','Cohérence de marque','Pertinence locale']}},
    {title:'expertiseMarketing',copy:'expertiseMarketingCopy',image:'assets/brand/campaigns/campaign-still.avif',points:{en:['Launches & campaigns','Visual merchandising','Team training','Consumer activation'],fr:['Lancements & campagnes','Merchandising visuel','Formation des équipes','Activation consommateur']}},
    {title:'expertiseOperations',copy:'expertiseOperationsCopy',image:'assets/brand/campaigns/campaign-hero-static.avif',points:{en:['Inventory planning','Warehousing','Order fulfilment','Regional supply coordination'],fr:['Planification des stocks','Entreposage','Exécution des commandes','Coordination régionale']}}
  ];
  const chapterWorkspace=expertiseChapter.querySelector('[data-expertise-workspace]');
  const chapterButtons=[...expertiseChapter.querySelectorAll('[data-expertise-capability]')];
  const chapterPanel=expertiseChapter.querySelector('.expertise-content-panel');
  const chapterImage=expertiseChapter.querySelector('[data-expertise-content-image]');
  const chapterNumber=expertiseChapter.querySelector('[data-expertise-content-number]');
  const chapterTitle=expertiseChapter.querySelector('[data-expertise-content-title]');
  const chapterCopy=expertiseChapter.querySelector('[data-expertise-content-copy]');
  const chapterPoints=expertiseChapter.querySelector('[data-expertise-content-points]');
  const desktopExpertiseQuery=window.matchMedia('(min-width:901px)');
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
    if(!desktopExpertiseQuery.matches){
      expertiseChapter.style.setProperty('--expertise-inset','0%');
      expertiseChapter.style.setProperty('--expertise-intro-opacity','1');
      expertiseChapter.style.setProperty('--expertise-intro-scale','1');
      expertiseChapter.classList.add('is-workspace-active');
      return;
    }
    const bounds=expertiseChapter.getBoundingClientRect();
    if(bounds.bottom<-innerHeight*.25||bounds.top>innerHeight*1.25)return;
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
  if(desktopExpertiseQuery.matches)addEventListener('scroll',requestExpertiseChapterUpdate,{passive:true});
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
    {name:'India',ids:new Set(['356']),copy:'Local access and commercial understanding within one of beauty\u2019s most dynamic consumer markets.'},
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
  const startCycle=()=>{window.clearInterval(cycle);if(reducedMotionQuery.matches||lowPowerMode)return;cycle=window.setInterval(()=>{if(isNearViewport(presenceIndex))showRegion((activeIndex+1)%regions.length)},5500)};
  buttons.forEach((button,index)=>button.addEventListener('click',()=>{showRegion(index);startCycle()}));
  const indexObserver=new IntersectionObserver(entries=>entries.forEach(async entry=>{if(entry.isIntersecting&&!countries){try{const world=await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json').then(response=>response.json());countries=topojson.feature(world,world.objects.countries).features;showRegion(0);startCycle()}catch{}indexObserver.disconnect()}}),{rootMargin:'160px'});
  indexObserver.observe(presenceIndex);
}

const initializeCampaignCarousel=carousel=>{
  if(carousel.dataset.carouselReady)return;
  const viewport=carousel.querySelector('.campaign-carousel-viewport'),track=carousel.querySelector('[data-campaign-track]'),slides=[...track.children],thumbnailRail=carousel.querySelector('[data-campaign-thumbnails]'),thumbnails=[...carousel.querySelectorAll('[data-campaign-thumbnail]')],previous=carousel.querySelector('[data-campaign-prev]'),next=carousel.querySelector('[data-campaign-next]');
  if(!slides.length||!viewport||!previous||!next)return;
  carousel.dataset.carouselReady='true';
  let index=0,startX=0,currentX=0,startTime=0,dragging=false,carouselVisible=false;
  const slideHydrator='IntersectionObserver' in window?new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(!entry.isIntersecting)return;
    hydrateMediaElement(entry.target.querySelector('img,video'));
    slideHydrator.unobserve(entry.target);
  }),{rootMargin:'600px 0px',threshold:.01}):null;
  slides.forEach(slide=>slideHydrator?.observe(slide));
  const syncSlideMedia=()=>slides.forEach((slide,slideIndex)=>{
    const mobileGallery=window.matchMedia('(max-width: 900px)').matches;
    if((!mobileGallery&&Math.abs(slideIndex-index)<=1)||(mobileGallery&&!slideHydrator&&slideIndex<2))hydrateMediaElement(slide.querySelector('img,video'));
    const video=slide.querySelector('video');if(!video)return;
    if(slideIndex===index&&carouselVisible&&!document.hidden&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches){const playback=video.play();if(playback?.catch)playback.catch(()=>{})}else video.pause();
  });
  const render=(animate=true)=>{
    track.classList.toggle('is-immediate',!animate);
    track.style.transform=`translate3d(${-index*100}%,0,0)`;
    thumbnails.forEach((thumbnail,thumbnailIndex)=>{const active=thumbnailIndex===index;thumbnail.classList.toggle('is-active',active);thumbnail.setAttribute('aria-current',active?'true':'false')});
    previous.disabled=index===0;next.disabled=index===slides.length-1;
    const activeThumbnail=thumbnails[index];if(activeThumbnail)thumbnailRail.scrollTo({left:activeThumbnail.offsetLeft-(thumbnailRail.clientWidth-activeThumbnail.offsetWidth)/2,behavior:animate?'smooth':'auto'});
    syncSlideMedia();
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
  new IntersectionObserver(entries=>{carouselVisible=entries[0]?.isIntersecting&&entries[0].intersectionRatio>.12;syncSlideMedia()},{threshold:[0,.12,.4]}).observe(carousel);
  document.addEventListener('visibilitychange',syncSlideMedia);
  render(false);
};
document.querySelectorAll('[data-campaign-carousel]').forEach(carousel=>{
  carousel.addEventListener('space:campaign-built',()=>initializeCampaignCarousel(carousel),{once:true});
  if(carousel.querySelector('[data-campaign-track]')?.children.length)initializeCampaignCarousel(carousel);
});

const teamCarousel=document.querySelector('[data-team-carousel]');
if(teamCarousel){
  cmsContentPromise.then(cmsContent=>{
  let people=[
    {name:'Vipul Mathur',role:'Founder',image:'assets/brand/people/vipul-mathur.jpg',linkedin:'https://www.linkedin.com/in/mathvipul/',summary:'Founder of Space TR, with commercial experience across Africa, the Caribbean, North America and the Middle East since 2007.',bio:[
      'Vipul Mathur is the Founder of Space TR, a specialist beauty and fragrance distribution company focused on travel retail and domestic markets across Africa.',
      'Since 2007, he has developed commercial experience across Africa, the Caribbean, North America and the Middle East, with a particular focus on building luxury beauty and fragrance businesses in emerging markets.',
      'Before establishing Space TR, Vipul held senior corporate leadership positions including General Manager, Vice President and Director. Today, he leads the company’s expansion across Africa, developing travel retail and domestic distribution while building long-term partnerships.'
    ]},
    {name:'K. J. Thomas',role:'Operations Head',image:'assets/brand/people/kj-thomas.jpg',linkedin:'https://www.linkedin.com/in/kjthomsi/',profileScale:1,profilePosition:'center top',profileEdge:'#bca98f',summary:'More than 15 years of experience across fragrance, beauty and travel retail, with responsibility for operations, procurement and supply chain at Space.',bio:[
      'K. J. Thomas brings more than 15 years of experience in the fragrance, beauty and travel retail industry.',
      'He previously served as Senior General Manager of Beauty at Shoppers Stop and Category Lead for Beauty at Parcos. In these roles, he led commercial strategy, category management, retail operations and local store marketing across premium beauty and fragrance brands.',
      'At Space, K. J. leads strategic business operations, procurement and supply chain management across Africa, the Indian Subcontinent and travel retail. He holds an MBA in Marketing and a postgraduate qualification in Retail Management.'
    ]},
    {name:'Sundeep Sharma',role:'Co-Founder and Director, Maven Global Ltd.',image:'assets/brand/people/sundeep-sharma.jpg',linkedin:'https://www.linkedin.com/in/sundeepsharmaceo/',profileScale:1,profilePosition:'center top',profileEdge:'#c8b79f',summary:'Co-Founder and Director of Maven Global Ltd., with extensive experience in African markets and travel retail.',bio:[
      'Sundeep Sharma is the Co-Founder and Director of Maven Global Ltd., established in 2016. Maven Global is described as East Africa’s largest in-country distributor of luxury, niche and prestige fragrances.',
      'Based in Nairobi since 2002, Sundeep has developed extensive knowledge of African market dynamics. Before establishing Maven Global, he spent 14 years with Flemingo Travel Retail Ltd.',
      'At the age of 36, he was appointed the company’s youngest Regional Chief Executive Officer for Africa. During his tenure, the regional business grew from two to 50 retail outlets across 16 countries. Sundeep holds a Bachelor of Commerce from the University of Mumbai.'
    ]},
    {name:'Chandni Rana',role:'Commercial Head & Brand Manager',image:'assets/brand/people/chandni-rana.jpg',linkedin:'https://www.linkedin.com/in/chandni-rana-897351137/',profileScale:1,profilePosition:'center top',profileEdge:'#bdb7ae',summary:'More than a decade of experience building luxury fragrance, skincare and cosmetics businesses across India and Africa.',bio:[
      'Chandni Rana brings more than a decade of experience in building luxury fragrance, skincare and cosmetics businesses across India and Africa, covering both travel retail and domestic markets.',
      'At Space TR, she leads commercial strategy, distribution and brand partnerships. She works closely with international brand principals to develop their presence across the company’s markets.',
      'Her experience includes pricing, product assortment, retail environments and understanding the consumer. Chandni takes a hands-on and entrepreneurial approach to leadership and has a track record of identifying new commercial opportunities.'
    ]},
    {name:'Krishnamachari Rangarajan',role:'Head of Finance',image:'assets/brand/people/krishnamachari-rangarajan.jpg',linkedin:'https://www.linkedin.com/in/rangarajan-krishnamachari-9476a925/',profileScale:1,profilePosition:'center top',summary:'Nearly four decades of experience in accounting, finance and factory commercial operations within the FMCG industry.',bio:[
      'Krishnamachari Rangarajan brings nearly four decades of experience in accounting, finance and factory commercial operations within the FMCG industry.',
      'In his previous role, he served as Factory Chief Financial Officer for the international business of one of India’s largest multinational companies in personal care and hair care manufacturing.',
      'At Space, Krish leads Finance, Treasury Management, Human Resources and Administration. His work includes streamlining, automating and digitising business processes, controlling costs and supporting competitive pricing that meets customer expectations.'
    ]},
    {name:'Baptiste Vesin',role:'Business Development Director',image:'assets/brand/people/baptiste-vesin.png',linkedin:'https://www.linkedin.com/in/baptiste-vesin-b523b9351/',profileScale:1,profilePosition:'center top',summary:'More than 20 years of experience developing distributor and retailer relationships across African local and travel retail markets.',bio:[
      'Baptiste Vesin brings more than 20 years of experience in developing and consolidating distributor and retailer networks across Africa.',
      'He specialises in luxury and niche brands, including COTY, L’Oréal Luxe, EuroItalia, LVMH, Xerjoff, Nishane, Tiziana Terenzi, Montale, Matière Première, Parfums de Marly, Atelier des Ors, Ramon Bejar and Sospiro.',
      'At Space, Baptiste is responsible for business development. Fluent in French, Spanish, Italian, Portuguese and English, he focuses on building long-term partnerships across African local and travel retail markets.'
    ]}
  ];
  const peopleFr=[
    {role:'Fondateur',bio:[
      'Vipul Mathur est le fondateur de Space TR, une société spécialisée dans la distribution de produits de beauté et de parfums sur les marchés du travel retail et les marchés domestiques en Afrique.',
      'Depuis 2007, il développe une expérience commerciale en Afrique, dans les Caraïbes, en Amérique du Nord et au Moyen-Orient, avec un intérêt particulier pour le développement des activités de parfumerie et de beauté de luxe sur les marchés émergents.',
      'Avant de créer Space TR, Vipul a occupé plusieurs fonctions de direction, notamment celles de directeur général, vice-président et directeur. Il pilote aujourd’hui l’expansion de l’entreprise en Afrique, en développant parallèlement le travel retail et la distribution domestique, tout en construisant des partenariats durables.'
    ]},
    {role:'Responsable des opérations',bio:[
      'K. J. Thomas possède plus de quinze ans d’expérience dans les secteurs de la parfumerie, de la beauté et du travel retail.',
      'Il a notamment occupé les fonctions de Senior General Manager Beauty chez Shoppers Stop et de Category Lead Beauty chez Parcos. À ces postes, il a dirigé la stratégie commerciale, la gestion des catégories, les opérations retail et le marketing local en magasin pour des marques de beauté et de parfumerie premium.',
      'Chez Space, K. J. dirige les opérations stratégiques, les achats et la gestion de la chaîne d’approvisionnement en Afrique, dans le sous-continent indien et en travel retail. Il est titulaire d’un MBA en marketing et d’un diplôme de troisième cycle en management du retail.'
    ]},
    {role:'Cofondateur et directeur, Maven Global Ltd.',bio:[
      'Sundeep Sharma est cofondateur et directeur de Maven Global Ltd., créée en 2016. Maven Global est présentée comme le plus grand distributeur local de parfums de luxe, de niche et de prestige en Afrique de l’Est.',
      'Installé à Nairobi depuis 2002, Sundeep a acquis une connaissance approfondie des marchés africains. Avant de créer Maven Global, il a travaillé pendant quatorze ans chez Flemingo Travel Retail Ltd.',
      'À 36 ans, il est devenu le plus jeune directeur général régional Afrique de l’entreprise. Sous sa direction, l’activité régionale est passée de deux à cinquante points de vente répartis dans seize pays. Sundeep est titulaire d’un Bachelor of Commerce de l’Université de Mumbai.'
    ]},
    {role:'Directrice commerciale et responsable de marque',bio:[
      'Chandni Rana possède plus de dix ans d’expérience dans le développement d’activités de parfumerie, de soin et de cosmétique de luxe en Inde et en Afrique, sur les marchés domestiques comme en travel retail.',
      'Chez Space TR, elle dirige la stratégie commerciale, la distribution et les partenariats avec les marques. Elle travaille étroitement avec les maisons internationales afin de développer leur présence sur les marchés de l’entreprise.',
      'Son expérience couvre la tarification, l’assortiment, l’environnement retail et la compréhension des consommateurs. Chandni adopte une approche entrepreneuriale et opérationnelle du management et sait identifier de nouvelles opportunités commerciales.'
    ]},
    {role:'Responsable de la finance',bio:[
      'Krishnamachari Rangarajan possède près de quarante ans d’expérience en comptabilité, finance et opérations commerciales industrielles dans le secteur des biens de grande consommation.',
      'Dans ses fonctions précédentes, il était directeur financier d’usine pour les activités internationales de l’un des plus grands groupes multinationaux indiens spécialisés dans la fabrication de produits de soin et de soins capillaires.',
      'Chez Space, Krish dirige la finance, la trésorerie, les ressources humaines et l’administration. Il contribue à rationaliser, automatiser et numériser les processus, à maîtriser les coûts et à soutenir une politique tarifaire compétitive répondant aux attentes des clients.'
    ]},
    {role:'Directeur du développement commercial',bio:[
      'Baptiste Vesin possède plus de vingt ans d’expérience dans le développement et la consolidation de réseaux de distributeurs et de détaillants en Afrique.',
      'Il est spécialisé dans les marques de luxe et de niche, notamment COTY, L’Oréal Luxe, EuroItalia, LVMH, Xerjoff, Nishane, Tiziana Terenzi, Montale, Matière Première, Parfums de Marly, Atelier des Ors, Ramon Bejar et Sospiro.',
      'Chez Space, Baptiste est responsable du développement commercial. Il parle couramment français, espagnol, italien, portugais et anglais et privilégie la construction de partenariats durables sur les marchés africains domestiques et du travel retail.'
    ]}
  ];
  const peopleFrById=new Map([
    'team-vipul-mathur',
    'team-kj-thomas',
    'team-sundeep-sharma',
    'team-chandni-rana',
    'team-krishnamachari-rangarajan',
    'team-baptiste-vesin'
  ].map((id,index)=>[id,peopleFr[index]]));
  const peopleFrByName=new Map(people.map((person,index)=>[person.name,peopleFr[index]]));
  const cmsPeople=(cmsContent?.team||[]).filter(person=>person.active!==false&&person.name&&person.imageUrl).map(person=>({...person,image:person.imageUrl,bio:Array.isArray(person.bio)?person.bio:[]}));
  const usingCmsTeam=cmsPeople.length>0;
  if(usingCmsTeam)people=cmsPeople;
  const track=teamCarousel.querySelector('[data-team-track]'),stage=teamCarousel.querySelector('[data-team-stage]'),profileOverlay=document.querySelector('[data-team-overlay]'),profileClose=profileOverlay.querySelector('[data-team-close]'),profileImage=profileOverlay.querySelector('[data-team-overlay-image]'),profileLabel=profileOverlay.querySelector('[data-team-overlay-label]'),profileName=profileOverlay.querySelector('[data-team-overlay-name]'),profileRole=profileOverlay.querySelector('[data-team-overlay-role]'),profileBio=profileOverlay.querySelector('[data-team-overlay-bio]');
  const personForLanguage=index=>{
    const person=people[index];
    if(currentLanguage!=='fr')return person;
    if(usingCmsTeam)return {...person,role:person.roleFr||person.role,summary:person.summaryFr||person.summary,bio:Array.isArray(person.bioFr)&&person.bioFr.length?person.bioFr:person.bio};
    const translated=peopleFrById.get(person.id)||peopleFrByName.get(person.name);
    if(!translated)return person;
    return {...person,...translated};
  };
  const linkedInIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.2 8.2H1.6V22h3.6V8.2ZM3.4 2A2.1 2.1 0 1 0 3.4 6.2 2.1 2.1 0 0 0 3.4 2ZM22.4 14.1c0-4.2-2.2-6.2-5.2-6.2-2.4 0-3.5 1.3-4.1 2.3v-2H9.5V22h3.6v-6.8c0-1.8.3-3.6 2.6-3.6 2.2 0 2.3 2.1 2.3 3.7V22h3.6l.8-7.9Z"/></svg>';
  const normalizePortraitPosition=(value,fallback='center top')=>{const position=String(value||'').trim().toLowerCase();return /^(?:left|center|right|\d{1,3}%)(?:\s+(?:top|center|bottom|\d{1,3}%))?$/.test(position)?position:fallback};
  track.innerHTML=people.map((person,index)=>{const localized=personForLanguage(index),profileSlug=person.slug||person.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),cardPosition=normalizePortraitPosition(person.profilePosition,index===0?'center 18%':'center top'),linkedInControl=person.linkedin?`<a href="${person.linkedin}" target="_blank" rel="noopener noreferrer" aria-label="${person.name} on LinkedIn">${linkedInIcon}</a>`:`<button type="button" tabindex="-1" aria-disabled="true" aria-label="LinkedIn link coming soon">${linkedInIcon}</button>`;return `<article class="team-portrait-card" style="--team-card-position:${cardPosition}" data-team-card="${index}" data-profile-href="/${currentLanguage}/team/${profileSlug}"><button class="team-card-select" type="button" data-team-select aria-label="${person.name}, ${localized.role}"><img src="${person.image}" alt="${person.name}" loading="lazy" decoding="async"><span><strong>${person.name}</strong><small data-team-card-role>${localized.role}</small><em>${localeCopy[currentLanguage].viewProfile}</em></span></button><div class="team-social-dock" data-team-social-dock aria-label="LinkedIn profile">${linkedInControl}</div></article>`}).join('');
  const cards=[...track.querySelectorAll('[data-team-card]')];let activePerson=0,touchStart=0,openProfileIndex=null,lastProfileTrigger=null;
  const updateTeam=index=>{
    activePerson=(index+people.length)%people.length;const previous=(activePerson-1+people.length)%people.length,next=(activePerson+1)%people.length;
    cards.forEach((card,cardIndex)=>{card.classList.toggle('is-active',cardIndex===activePerson);card.classList.toggle('is-prev',cardIndex===previous);card.classList.toggle('is-next',cardIndex===next);card.classList.toggle('is-away',cardIndex!==activePerson&&cardIndex!==previous&&cardIndex!==next);card.querySelector('[data-team-select]').setAttribute('aria-pressed',String(cardIndex===activePerson))});
  };
  const renderProfile=index=>{const person=personForLanguage(index),profileScale=person.profileScale||1;profileOverlay.dataset.profile=String(index);profileOverlay.style.setProperty('--profile-scale',profileScale);profileOverlay.style.setProperty('--profile-enter-scale',profileScale+.045);profileOverlay.style.setProperty('--profile-position',normalizePortraitPosition(person.profilePosition,index===0?'center 15%':'center top'));profileOverlay.style.setProperty('--profile-edge',person.profileEdge||'#c5b59e');profileImage.src=person.image;profileImage.alt=person.name;profileLabel.textContent=localeCopy[currentLanguage].profileLabel;profileName.textContent=person.name;profileRole.textContent=person.role;profileBio.innerHTML=person.bio.map(paragraph=>`<p>${paragraph}</p>`).join('')};
  const openProfile=index=>{const person=people[index],profileSlug=person.slug||person.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');location.href=`/${currentLanguage}/team/${encodeURIComponent(profileSlug)}`};
  const closeProfile=()=>{profileOverlay.classList.remove('is-open');profileOverlay.setAttribute('aria-hidden','true');document.body.classList.remove('team-profile-open');openProfileIndex=null;lastProfileTrigger?.focus()};
  const refreshTeamLanguage=()=>{cards.forEach((card,index)=>{const person=personForLanguage(index);card.querySelector('[data-team-select]').setAttribute('aria-label',`${person.name}, ${person.role}`);card.querySelector('small').textContent=person.role;card.querySelector('em').textContent=localeCopy[currentLanguage].viewProfile});if(openProfileIndex!==null)renderProfile(openProfileIndex)};
  cards.forEach((card,index)=>{const select=card.querySelector('[data-team-select]');select.addEventListener('click',()=>{if(window.matchMedia('(max-width:900px)').matches||index===activePerson)openProfile(index,select);else updateTeam(index)})});
  profileClose.addEventListener('click',closeProfile);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&profileOverlay.classList.contains('is-open'))closeProfile()});
  teamCarousel.querySelector('[data-team-prev]').addEventListener('click',()=>updateTeam(activePerson-1));teamCarousel.querySelector('[data-team-next]').addEventListener('click',()=>updateTeam(activePerson+1));
  teamCarousel.tabIndex=0;teamCarousel.addEventListener('keydown',event=>{if(event.key==='ArrowLeft')updateTeam(activePerson-1);if(event.key==='ArrowRight')updateTeam(activePerson+1)});
  stage.addEventListener('touchstart',event=>{touchStart=event.changedTouches[0].clientX},{passive:true});stage.addEventListener('touchend',event=>{const distance=event.changedTouches[0].clientX-touchStart;if(Math.abs(distance)>45)updateTeam(activePerson+(distance<0?1:-1))},{passive:true});
  teamCarousel.querySelectorAll('[data-team-social-dock]').forEach(socialDock=>{
    const dockItems=[...socialDock.querySelectorAll('a,button')];
    if(!lowPowerMode&&window.matchMedia('(pointer:fine)').matches)socialDock.addEventListener('pointermove',event=>dockItems.forEach(item=>{const bounds=item.getBoundingClientRect(),distance=Math.abs(event.clientX-(bounds.left+bounds.width/2)),influence=Math.max(0,1-distance/120);item.style.setProperty('--dock-size',`${40+20*influence}px`);item.style.setProperty('--dock-lift',`${-9*influence}px`)}),{passive:true});
    socialDock.addEventListener('pointerleave',()=>dockItems.forEach(item=>{item.style.removeProperty('--dock-size');item.style.removeProperty('--dock-lift')}));
  });
  window.addEventListener('space:languagechange',refreshTeamLanguage);
  updateTeam(0);
  });
}

const brandWall=document.querySelector('[data-brand-wall]');
if(brandWall){
  cmsContentPromise.then(cmsContent=>{
  const canonicalLogoNumberByName=new Map((brandTaxonomy.logos||[]).map(record=>[brandTaxonomy.normalize?.(record.name)||record.name,record.logoNumber]));
  const configuredBrands=(cmsContent?.brands||[]).filter(record=>record.active!==false&&record.name).map(record=>{const canonicalNumber=canonicalLogoNumberByName.get(brandTaxonomy.normalize?.(record.name)||record.name);return record.logoUrl||!canonicalNumber?record:{...record,logoNumber:canonicalNumber}});
  const brandWallRecords=configuredBrands.length?configuredBrands:portfolioBrandRecords;
  const brandWallNames=brandWallRecords.map(record=>record.name);
  const wallGrid=brandWall.querySelector('[data-brand-wall-grid]');
  const stage=brandWall.querySelector('[data-brand-wall-stage]'),stageMedia=brandWall.querySelector('[data-brand-wall-stage-media]'),stageName=brandWall.querySelector('[data-brand-wall-stage-name]'),stageKicker=brandWall.querySelector('[data-brand-wall-stage-kicker]');
  const sourcedBrandStageAssets={
    'Parfums de Marly':{src:'assets/editorial/brands/parfums-de-marly.webp',objectPosition:'50% 50%'},
    'Goldfield & Banks':{src:'assets/editorial/brands/goldfield-banks.webp',objectPosition:'55% 50%'},
    'Roja':{src:'assets/editorial/brands/roja.webp',objectPosition:'50% 50%'},
    'Casamorati':{src:'assets/editorial/brands/casamorati.webp',objectPosition:'50% 50%'},
    'Bond No. 9':{src:'assets/editorial/brands/bond-no-9.webp',objectPosition:'50% 50%'},
    'Ormonde Jayne':{src:'assets/editorial/brands/ormonde-jayne.webp',objectPosition:'50% 50%'},
    'Ramon Bejar':{src:'assets/editorial/brands/ramon-bejar.webp',objectPosition:'50% 50%'},
    'The Merchant of Venice':{src:'assets/editorial/brands/merchant-of-venice.webp',objectPosition:'48% 50%'},
    'Giorgio Armani Beauty':{src:'assets/editorial/brands/giorgio-armani-beauty.webp',objectPosition:'50% 50%'},
    'Gucci':{src:'assets/editorial/brands/gucci.webp',objectPosition:'50% 50%'},
    'Yves Saint Laurent':{src:'assets/editorial/brands/yves-saint-laurent.webp',objectPosition:'50% 50%'},
    'Lancome':{src:'assets/editorial/brands/lancome.webp',objectPosition:'50% 50%'},
    'Burberry':{src:'assets/editorial/brands/burberry.webp',objectPosition:'50% 50%'},
    'Boss':{src:'assets/editorial/brands/boss.webp',objectPosition:'50% 50%',scale:1.045},
    'Marc Jacobs':{src:'assets/editorial/brands/marc-jacobs.webp',objectPosition:'50% 50%',scale:1.18},
    'Chloe':{src:'assets/editorial/brands/chloe.webp',objectPosition:'52% 50%'},
    'Michael Kors':{src:'assets/editorial/brands/michael-kors.webp',objectPosition:'50% 50%'},
    'Ralph Lauren':{src:'assets/editorial/brands/ralph-lauren.webp',objectPosition:'50% 50%'},
    'Prada':{src:'assets/editorial/brands/prada.webp',objectPosition:'50% 50%'},
    'Valentino':{src:'assets/editorial/brands/valentino.webp',objectPosition:'50% 50%'},
    'Versace':{src:'assets/editorial/brands/versace.webp',objectPosition:'50% 50%'},
    'Davidoff':{src:'assets/editorial/brands/davidoff.webp',objectPosition:'50% 50%'},
    'Cacharel':{src:'assets/editorial/brands/cacharel.webp',objectPosition:'76% 50%'},
    'Viktor & Rolf':{src:'assets/editorial/brands/viktor-rolf.webp',objectPosition:'50% 50%'},
    'Tous':{src:'assets/editorial/brands/tous.webp',objectPosition:'50% 50%'},
    'Halloween':{src:'assets/editorial/brands/halloween.webp',objectPosition:'50% 50%'},
    'Armaf':{src:'assets/editorial/brands/armaf.webp',objectPosition:'27% 50%'},
    'Scalpers Yacht Club':{src:'assets/editorial/brands/scalpers-yacht-club.webp',objectPosition:'50% 50%'},
    'Diesel':{src:'assets/editorial/brands/diesel.webp',objectPosition:'50% 50%'},
    'Xerjoff':{src:'assets/media/generated/derivatives/display/e23f4d706c447631.jpg',objectPosition:'50% 50%'},
    'Nishane':{src:'assets/media/generated/derivatives/display/353cd27e55b4b94e.jpg',objectPosition:'50% 50%'},
    'Tiziana Terenzi':{src:'assets/media/generated/derivatives/display/300d8e1829197449.jpg',objectPosition:'50% 50%'},
    'Montale Paris':{src:'assets/editorial/brands/montale.webp',objectPosition:'50% 50%'},
    'Mancera Paris':{src:'assets/editorial/brands/mancera.webp',objectPosition:'50% 50%'},
    'Afnan Perfumes':{src:'assets/media/generated/derivatives/display/735c4b66931fb62f.jpg',objectPosition:'50% 50%'},
    'Atelier des Ors':{src:'assets/media/generated/derivatives/display/5eb138828dd40fb1.jpg',objectPosition:'50% 50%'},
    'Matiere Premiere':{src:'assets/editorial/brands/matiere-premiere.webp',objectPosition:'50% 50%'},
    'Escentric Molecules':{src:'assets/editorial/brands/escentric-molecules.webp',objectPosition:'50% 50%'},
    'Oman Luxury':{src:'assets/editorial/brands/oman-luxury.webp',objectPosition:'50% 50%'},
    'Atkinsons':{src:'assets/editorial/brands/atkinsons.webp',objectPosition:'50% 50%'},
    'Brunello Cucinelli':{src:'assets/editorial/brands/brunello-cucinelli.webp',objectPosition:'50% 50%'},
    'Akro':{src:'assets/editorial/brands/akro.webp',objectPosition:'50% 50%'},
    'THOO':{src:'assets/editorial/brands/thoo.webp',objectPosition:'50% 50%'},
    'Essential Parfums':{src:'assets/editorial/brands/essential-parfums.webp',objectPosition:'50% 50%'},
    'Born to Stand Out':{src:'assets/editorial/brands/born-to-stand-out.webp',objectPosition:'55% 50%'},
    'New Notes':{src:'assets/editorial/brands/new-notes.webp',objectPosition:'50% 50%'},
    'Sospiro':{src:'assets/editorial/brands/sospiro.webp',objectPosition:'50% 50%'},
    'Spirit of Dubai':{src:'assets/editorial/brands/spirit-of-dubai.webp',objectPosition:'50% 50%'},
    'Spirit of Kings':{src:'assets/editorial/brands/spirit-of-kings.webp',objectPosition:'50% 50%'},
    'Maison Noir':{src:'assets/editorial/brands/maison-noir.webp',objectPosition:'50% 50%'}
  };
  const campaignAssetsByBrand=new Map();
  const brandStageRevision='20260908-3';
  Object.entries(sourcedBrandStageAssets).forEach(([name,asset])=>{
    const source=asset.src.startsWith('assets/editorial/brands/')?`${asset.src}?v=${brandStageRevision}`:asset.src;
    campaignAssetsByBrand.set(name,{...asset,src:source});
  });
  brandWallRecords.forEach(record=>{if(record.bannerUrl)campaignAssetsByBrand.set(record.name,{src:record.bannerUrl,objectPosition:'50% 50%'})});
  const lightCanvasBrands=new Set([1,2,3,4,5,6,7,9,13,14,15,17,19,20,22,23,24,25,26,27,28,29,30,31,32,34,35,36,37,38,40,56,...Array.from({length:14},(_,index)=>index+41)]);
  const contrastCanvasBrands=new Set([21]);
  wallGrid.innerHTML=brandWallRecords.map(record=>{const name=record.name,number=record.logoNumber,asset=campaignAssetsByBrand.get(name),stageSource=asset?.optimizedSrc||asset?.src||portfolioLogoPath(record,'mark'),usesWhiteCanvasLogo=whiteCanvasLogoNumbers.has(number),logoVariant=usesWhiteCanvasLogo?'web-white':'avif';return `<article class="brand-wall-item${asset?' has-campaign-asset':''}${!usesWhiteCanvasLogo&&lightCanvasBrands.has(number)?' has-light-canvas':''}${!usesWhiteCanvasLogo&&contrastCanvasBrands.has(number)?' needs-contrast-canvas':''}" data-brand-name="${name}" data-brand-stage-src="${stageSource}" data-brand-stage-position="${asset?.objectPosition||'50% 50%'}" data-brand-stage-scale="${asset?.scale||1}" data-brand-stage-has-asset="${asset?'true':'false'}" tabindex="0" aria-label="${name}"><img src="${portfolioLogoPath(record,logoVariant)}" alt="${name}" loading="lazy" decoding="async"></article>`}).join('')+`<button class="brand-wall-discovery" type="button" aria-label="More portfolio brands"><span class="brand-wall-discovery-orbit" aria-hidden="true"><i></i></span><span>&amp;<br>More</span></button>`;
  const wallItems=[...wallGrid.querySelectorAll('.brand-wall-item')];
  let activeStageIndex=-1;
  const showBrandOnStage=(item,index)=>{
    if(!stage||!item)return;
    activeStageIndex=index;
    const name=item.dataset.brandName,source=item.dataset.brandStageSrc,hasAsset=item.dataset.brandStageHasAsset==='true';
    stage.classList.add('is-changing');
    stage.classList.toggle('is-logo-only',!hasAsset);
    stageMedia.loading='eager';
    stageMedia.fetchPriority='high';
    const revealStage=()=>{if(stageMedia.getAttribute('src')===source)requestAnimationFrame(()=>stage.classList.remove('is-changing'))};
    stageMedia.onload=revealStage;
    stageMedia.onerror=revealStage;
    stageMedia.src=source;
    stageMedia.style.objectPosition=item.dataset.brandStagePosition||'50% 50%';
    stageMedia.style.setProperty('--brand-stage-scale',item.dataset.brandStageScale||1);
    stageMedia.alt=hasAsset?`${name} campaign visual`:`${name} logo`;
    stageName.textContent=name;
    stageKicker.textContent='Portfolio partner';
    if(stageMedia.complete)revealStage();
  };
  const setWallFocus=(item,index)=>{brandWall.classList.toggle('has-brand-focus',Boolean(item));wallItems.forEach(candidate=>candidate.classList.toggle('is-focused',candidate===item));if(item)showBrandOnStage(item,index)};
  wallItems.forEach((item,index)=>{
    const activate=()=>setWallFocus(item,index);
    item.addEventListener('mouseenter',activate);
    item.addEventListener('focus',activate);
    item.addEventListener('click',()=>{activate();item.focus({preventScroll:true})});
    item.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate()}});
  });
  const discovery=wallGrid.querySelector('.brand-wall-discovery');
  discovery?.addEventListener('click',()=>{
    const alternatives=wallItems.map((item,index)=>({item,index})).filter(({index})=>index!==activeStageIndex);
    const selection=alternatives[Math.floor(Math.random()*alternatives.length)];
    if(!selection)return;
    setWallFocus(selection.item,selection.index);
    selection.item.focus({preventScroll:true});
  });
  const initialStageIndex=Math.max(0,brandWallNames.findIndex(name=>campaignAssetsByBrand.has(name)));
  showBrandOnStage(wallItems[initialStageIndex],initialStageIndex);
  if(!lowPowerMode&&window.matchMedia('(pointer:fine)').matches)brandWall.addEventListener('pointermove',event=>{const bounds=brandWall.getBoundingClientRect();const isHomepageWall=brandWall.classList.contains('homepage-brand-wall');brandWall.style.setProperty('--wall-x',`${event.clientX-bounds.left}px`);brandWall.style.setProperty('--wall-y',`${isHomepageWall?event.clientY:event.clientY-bounds.top}px`)},{passive:true});
  if(brandWall.classList.contains('homepage-brand-wall')){
    const mobileBrandDirectory=brandWall.querySelector('.brand-wall-directory');
    if(mobileBrandDirectory){
      const revealMobileBrands=()=>{
        const bounds=mobileBrandDirectory.getBoundingClientRect();
        if(bounds.top>=window.innerHeight||bounds.bottom<=0)return false;
        brandWall.classList.add('is-mobile-revealed');
        window.removeEventListener('scroll',checkMobileBrandReveal);
        return true;
      };
      let mobileRevealFrame=0;
      const checkMobileBrandReveal=()=>{
        if(mobileRevealFrame)return;
        mobileRevealFrame=requestAnimationFrame(()=>{mobileRevealFrame=0;revealMobileBrands()});
      };
      const mobileBrandRevealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        revealMobileBrands();
        mobileBrandRevealObserver.disconnect();
      }),{threshold:.01,rootMargin:'0px 0px 5% 0px'});
      mobileBrandRevealObserver.observe(mobileBrandDirectory);
      window.addEventListener('scroll',checkMobileBrandReveal,{passive:true});
    }
    let wallFrame=0;
    const desktopBrandQuery=window.matchMedia('(min-width:1051px)');
    const clamp=value=>Math.min(1,Math.max(0,value));
    const updateBrandChapter=()=>{
      wallFrame=0;
      if(!desktopBrandQuery.matches)return;
      const bounds=brandWall.getBoundingClientRect();
      if(bounds.bottom<-window.innerHeight*.25||bounds.top>window.innerHeight*1.25)return;
      const distance=Math.max(1,bounds.height-window.innerHeight);
      const progress=clamp(-bounds.top/distance);
      const reveal=clamp((progress-.12)/.78);
      const introFade=1-clamp((progress-.04)/.48);
      brandWall.style.setProperty('--brand-reveal',`${(1-reveal)*100}%`);
      brandWall.style.setProperty('--brand-intro-opacity',introFade.toFixed(3));
      brandWall.style.setProperty('--brand-intro-shift',`${-110*clamp(progress/.6)}px`);
    };
    const requestBrandChapterUpdate=()=>{if(!wallFrame)wallFrame=requestAnimationFrame(updateBrandChapter)};
    if(desktopBrandQuery.matches)addEventListener('scroll',requestBrandChapterUpdate,{passive:true});
    addEventListener('resize',requestBrandChapterUpdate,{passive:true});
    updateBrandChapter();
  }
  });
}

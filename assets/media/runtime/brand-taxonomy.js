(()=>{
  const retired=[
    'Initio Parfums Prives',
    'Chabaud Maison de Parfum',
    'Affinessence Paris',
    'Amouroud',
    'Jacques Fath Paris',
    'Franck Boclet'
  ];

  // Portfolio sequence supplied by Space. Existing active brands that were not
  // present in the supplied table are retained at the end of their closest group.
  const niche=[
    'Parfums de Marly','Xerjoff','Matiere Premiere','Tiziana Terenzi',
    'Goldfield & Banks','Nishane','Roja','Casamorati','Atelier des Ors',
    'Montale Paris','Mancera Paris','Escentric Molecules','Oman Luxury',
    'Atkinsons','Brunello Cucinelli','Akro','THOO','Essential Parfums',
    'Born to Stand Out','Bond No. 9','Ormonde Jayne','New Notes',
    'Ramon Bejar','Sospiro','Spirit of Dubai','Spirit of Kings','Maison Noir',
    'The Merchant of Venice'
  ];
  const premium=[
    'Giorgio Armani Beauty','Gucci','Yves Saint Laurent','Lancome','Burberry',
    'Boss','Marc Jacobs','Chloe','Ralph Lauren','Prada','Valentino','Versace',
    'Michael Kors','Nightology','Moschino','Missoni','Calvin Klein','Davidoff',
    'Cacharel','Viktor & Rolf'
  ];
  const mass=[
    'Nikos','Tous','Halloween','Afnan Perfumes','Armaf','Billie Eilish',
    'Paris Hilton','Joop','Escada','Lancaster','Adidas','David Beckham','Jawhara',
    'Nautica','Scalpers Yacht Club','Diesel'
  ];
  const featured=[
    'Parfums de Marly','Roja','Xerjoff','Spirit of Dubai','Bond No. 9','Tiziana Terenzi','Sospiro',
    'Nishane','Matiere Premiere','Casamorati','Atelier des Ors','Oman Luxury','THOO','Ormonde Jayne',
    'Brunello Cucinelli','Giorgio Armani Beauty','Gucci','Yves Saint Laurent','Prada','Valentino','Lancome',
    'Chloe','Burberry','Versace','Ralph Lauren','Boss','Marc Jacobs','Michael Kors',
    'Goldfield & Banks','Escentric Molecules','Essential Parfums','Born to Stand Out','Atkinsons','Montale Paris','Mancera Paris',
    'Akro','The Merchant of Venice','Spirit of Kings','New Notes','Ramon Bejar','Maison Noir'
  ];

  // Logo numbers refer to the original high-resolution brand-kit files.
  const logoNumbers={
    'Parfums de Marly':1,'Xerjoff':3,'Nishane':4,'Tiziana Terenzi':5,
    'Casamorati':6,'Giorgio Armani Beauty':7,'Yves Saint Laurent':8,
    'Gucci':39,'Lancome':11,'Prada':9,'Valentino':10,'Burberry':13,
    'Marc Jacobs':14,'Chloe':15,'Ralph Lauren':12,'Boss':17,
    'Viktor & Rolf':18,'Davidoff':19,'Armaf':20,'Afnan Perfumes':21,
    'Bond No. 9':22,'The Merchant of Venice':23,'Scalpers Yacht Club':29,
    'Diesel':30,'Cacharel':31,'Tous':32,'Halloween':33,'Roja':34,
    'Ormonde Jayne':35,'Ramon Bejar':36,'Montale Paris':37,
    'Mancera Paris':38,'Goldfield & Banks':16,'Atelier des Ors':40,
    'Matiere Premiere':41,'Escentric Molecules':42,'Oman Luxury':43,
    'Atkinsons':44,'Brunello Cucinelli':45,'Akro':46,'THOO':47,
    'Essential Parfums':48,'Born to Stand Out':49,'New Notes':50,
    'Sospiro':51,'Spirit of Dubai':52,'Spirit of Kings':53,'Maison Noir':54,
    'Versace':55,'Michael Kors':56
  };

  const normalize=value=>String(value||'')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toUpperCase().replace(/&/g,' AND ').replace(/[^A-Z0-9]+/g,' ').trim();
  const aliases={
    'AFNAN':'Afnan Perfumes','ATELIER DES ORS':'Atelier des Ors','JWAHARA':'Jawhara',
    'BORN TO STAND OUT':'Born to Stand Out','CASAMORATI':'Casamorati',
    'ESCENTRIC MOLECULE':'Escentric Molecules','ESCENTRIC MOLECULES':'Escentric Molecules',
    'ESSENTIAL PARFUMS':'Essential Parfums','GOLDFIELD AND BANKS':'Goldfield & Banks',
    'MONTALE MANCERA':'Montale / Mancera','NISHANE':'Nishane','OMAN LUXURY':'Oman Luxury',
    'RAMON BEJAR':'Ramon Bejar','THOO':'THOO','TIZIANA TERENZI':'Tiziana Terenzi',
    'XERJOFF':'Xerjoff','HUGO BOSS':'Boss','YSL':'Yves Saint Laurent',
    'JACQUE FATH':'Jacques Fath Paris','JACQUES FATH':'Jacques Fath Paris',
    'AFFINESCENCE':'Affinessence Paris','AFFINESSENCE':'Affinessence Paris',
    'CHABAUD':'Chabaud Maison de Parfum','INITIO':'Initio Parfums Prives',
    'FRANK BOCLET':'Franck Boclet'
  };
  [...niche,...premium,...mass,...retired].forEach(name=>{aliases[normalize(name)]=name});

  const retiredKeys=new Set(retired.map(normalize));
  const ordered=[...niche,...premium,...mass];
  const categoryByName=new Map([
    ...niche.map(name=>[normalize(name),'niche']),
    ...premium.map(name=>[normalize(name),'premium']),
    ...mass.map(name=>[normalize(name),'mass']),
    ['MONTALE MANCERA','niche']
  ]);
  const canonicalize=value=>aliases[normalize(value)]||String(value||'').trim();
  const categoryOf=value=>categoryByName.get(normalize(canonicalize(value)))||categoryByName.get(normalize(value))||'unclassified';
  const isRetired=value=>retiredKeys.has(normalize(canonicalize(value)))||retiredKeys.has(normalize(value));
  const logos=ordered
    .filter(name=>logoNumbers[name])
    .map(name=>({name,category:categoryOf(name),logoNumber:logoNumbers[name]}));
  const logoByName=new Map(logos.map(record=>[normalize(record.name),record]));
  const featuredLogos=featured.map(name=>logoByName.get(normalize(name))).filter(Boolean);

  window.SPACE_BRAND_TAXONOMY={
    niche,premium,mass,ordered,featured,retired,logos,featuredLogos,normalize,canonicalize,categoryOf,isRetired
  };
})();

(() => {
  document.documentElement.classList.add('profile-js');
  const page = document.body.dataset.profile;
  const translations = {
    feelnzuri: {
      en: {
        returnHome:'Home', kicker:'Fragrance lounge · Nairobi',
        headline:'FeelNzuri',
        lead:'A refined fragrance lounge where niche perfumery meets the warmth of African hospitality.',
        body:'FeelNzuri creates a considered setting for fragrance discovery—bringing distinctive perfume houses, knowledgeable guidance and a welcoming retail experience together in one intimate destination.',
        facetOne:'Niche perfumery', facetTwo:'Guided discovery', facetThree:'African hospitality',
        next:'Return to Space', caption:'Fragrance, experienced personally'
      },
      fr: {
        returnHome:'Accueil', kicker:'Salon de parfumerie · Nairobi',
        headline:'FeelNzuri',
        lead:'Un salon raffiné où la parfumerie de niche rencontre la chaleur de l’hospitalité africaine.',
        body:'FeelNzuri propose un cadre pensé pour la découverte olfactive, réunissant maisons de parfum singulières, conseil attentif et expérience retail accueillante au sein d’une destination intime.',
        facetOne:'Parfumerie de niche', facetTwo:'Découverte guidée', facetThree:'Hospitalité africaine',
        next:'Retour à Space', caption:'Le parfum, vécu personnellement'
      }
    },
    maven: {
      en: {
        pageKicker:'Maven Global · A Space company',
        pageTitle:'Distribution and consumer retail.',
        pageIntro:"Maven Global is Space's regional subsidiary for luxury fragrance distribution and retail. Local warehousing, regulatory coordination, cross-border logistics and established retail access operate alongside FeelNZuri, Space's consumer-facing fragrance lounge.",
        pageDistribution:'International fragrance houses are connected with regional retail through market entry, selective distribution, warehousing, cross-border logistics and disciplined brand execution.',
        pageRetail:'FeelNZuri brings niche perfumery closer to consumers through guided discovery, considered presentation and first-hand retail insight.',
        pageRetailKicker:'Flagship fragrance lounge', pageByMaven:'by Maven',
        pageFeelLink:'Explore FeelNZuri', pageExpertiseLink:'Our distribution expertise',
        addressLabel:'Address', emailLabel:'E-mail',
        editorialLabel:'Space’s regional subsidiary in Kenya',
        editorialLead:'East Africa’s house of luxury fragrance distribution.',
        editorialIntro:'Space × Maven connects international luxury fragrance houses with selective retail channels across East Africa. Its network reaches beyond the principal commercial centres and deep into Tier II and Tier III cities, opening markets where discerning demand is present but meaningful luxury distribution requires exceptional local depth.',
        marketTitle:'Market access built from within the region.',
        marketOne:'Based in Nairobi, the team works from direct knowledge of East African consumers, retail structures and commercial conditions. That proximity helps international fragrance brands judge where to enter, which channels fit their positioning and how their offer should evolve from one market to the next.',
        marketTwo:'The distribution network extends across specialist fragrance retail, pharmacies, supermarkets, traditional trade and selected digital channels. More than 250 retail doors connect established commercial centres with emerging cities where premium fragrance demand is growing.',
        distributionTitle:'Distribution that protects the brand as it expands.',
        distributionOne:'Market reach is developed selectively. Retail partners are chosen for their ability to present each fragrance house with the environment, service and discipline its identity requires. Product availability, recommended pricing and retail presentation are managed as connected responsibilities rather than isolated transactions.',
        distributionTwo:'This gives brand principals a route into East Africa that can widen without becoming indiscriminate. The objective is not simply to place stock, but to establish a presence that remains credible as distribution grows.',
        operationsTitle:'One regional operation from arrival to retail.',
        operationsOne:'Bonded warehousing in Nairobi and Mombasa supports stock moving into and across the region. Maven coordinates regulatory clearance, certification, inventory, fulfilment and delivery so that the practical demands of several territories remain within one managed workflow.',
        operationsTwo:'For fragrance principals, that structure reduces the burden of navigating each market independently. Products move through the region with clearer oversight, while their integrity and the standards surrounding them remain protected.',
        editorialFootprintTitle:'A connected East African footprint.',
        footprintOne:'The network serves Kenya, Burundi, Rwanda, South Sudan, Tanzania and Uganda, with reach into Goma, Bunia and Bukavu in the eastern Democratic Republic of the Congo. Local relationships and regional coordination allow the same brand direction to be carried across markets with very different retail realities.',
        footprintTwo:'FeelNZuri, Space’s flagship fragrance lounge in Nairobi, brings an additional layer of first-hand retail insight. It creates an intimate setting for guided fragrance discovery and offers a direct view of how consumers experience, understand and choose niche perfumery.',
        returnHome:'Home', kicker:'Maven Global · Nairobi',
        headline:'Space × Maven',
        lead:'Built in Nairobi. Designed for East Africa.',
        body:'Founded in 2016, Maven is Space’s East African distribution subsidiary. Its team combines more than two decades of luxury-market experience with local retail, logistics and brand-management expertise.',
        facetOne:'Luxury & niche fragrance', facetTwo:'East African distribution', facetThree:'Local retail intelligence',
        external:'Visit Maven Global', next:'Explore FeelNzuri', caption:'Nairobi headquarters · East African reach',
        storyKicker:'We are Maven', storyTitle:'Regional knowledge that moves brands with precision.',
        storyOne:'Maven operates at the intersection of luxury retail and distribution. From Nairobi, the team translates international brand standards into market-specific decisions across Eastern Africa.',
        storyTwo:'Strategic relationships with brands, distributors, retailers and logistics specialists create one connected value chain—designed to move premium products efficiently while protecting how each brand is positioned and presented.',
        metricSkus:'Portfolio SKUs', metricEac:'EAC markets', metricDrc:'Eastern DRC hubs',
        footprintKicker:'The regional footprint', footprintTitle:'One operation. Multiple routes to market.',
        footprintLead:'Maven’s commercial network spans Burundi, Kenya, Rwanda, South Sudan, Tanzania and Uganda, with reach into Goma, Bunia and Bukavu in the eastern Democratic Republic of the Congo.',
        principleOneTitle:'Market fluency', principleOneBody:'Local knowledge helps brands navigate consumer behaviour, retail structures and commercial realities without losing their international identity.',
        principleTwoTitle:'Infrastructure by design', principleTwoBody:'Strategically located consolidation facilities near key regional ports help improve delivery timelines and control the cost of moving product across complex routes.',
        principleThreeTitle:'A network with standards', principleThreeBody:'Retail partners are selected for their ability to represent each brand with the presentation, discipline and service its principles require.',
        quote:'“Perfume is the key to our memories.”', operatingKicker:'How Maven works',
        operatingLead:'Local insight, precise execution, resilient logistics, trusted partnerships and responsible brand stewardship guide every market decision.', backToSpace:'Back to Space'
      },
      fr: {
        pageKicker:'Maven Global · Une société Space',
        pageTitle:'Distribution et retail consommateur.',
        pageIntro:"Maven Global est la filiale régionale de Space pour la distribution et le retail de parfums de luxe. L'entreposage local, la coordination réglementaire, la logistique transfrontalière et l'accès établi au retail opèrent aux côtés de FeelNZuri, le salon de parfumerie de Space destiné aux consommateurs.",
        pageDistribution:"Les maisons internationales de parfumerie sont reliées au retail régional par l'entrée sur le marché, la distribution de gros sélective, l'entreposage, la logistique transfrontalière et une exécution rigoureuse de la marque.",
        pageRetail:"FeelNZuri rapproche la parfumerie de niche des consommateurs grâce à une découverte guidée, une présentation soignée et une lecture directe du marché retail.",
        pageRetailKicker:'Salon de parfumerie phare', pageByMaven:'par Maven',
        pageFeelLink:'Découvrir FeelNZuri', pageExpertiseLink:'Notre expertise en distribution',
        addressLabel:'Adresse', emailLabel:'E-mail',
        editorialLabel:'La filiale régionale de Space au Kenya',
        editorialLead:'La maison est-africaine de la distribution de parfums de luxe.',
        editorialIntro:'Space × Maven relie les maisons internationales de parfumerie de luxe à des circuits de distribution sélectifs en Afrique de l’Est. Son réseau dépasse les principaux centres commerciaux et pénètre les villes de niveaux II et III, ouvrant des marchés où la demande exigeante existe mais où une distribution de luxe crédible requiert une profondeur locale exceptionnelle.',
        marketTitle:'Un accès au marché construit depuis la région.',
        marketOne:'Basée à Nairobi, l’équipe travaille à partir d’une connaissance directe des consommateurs, des structures retail et des réalités commerciales d’Afrique de l’Est. Cette proximité aide les marques internationales de parfumerie à choisir leurs marchés, les circuits adaptés à leur positionnement et la manière dont leur offre doit évoluer d’un territoire à l’autre.',
        marketTwo:'Le réseau couvre la parfumerie spécialisée, les pharmacies, les supermarchés, le commerce traditionnel et certains circuits numériques. Plus de 250 points de vente relient les centres commerciaux établis aux villes émergentes où la demande de parfums premium progresse.',
        distributionTitle:'Une distribution qui protège la marque à mesure qu’elle grandit.',
        distributionOne:'Le développement du réseau reste sélectif. Les partenaires retail sont choisis pour leur capacité à présenter chaque maison dans un environnement, avec un service et une discipline conformes à son identité. La disponibilité, les prix recommandés et la présentation sont gérés comme des responsabilités liées, et non comme des transactions isolées.',
        distributionTwo:'Les maisons disposent ainsi d’une voie d’accès à l’Afrique de l’Est capable de s’élargir sans devenir indiscriminée. L’objectif n’est pas simplement de placer du stock, mais d’établir une présence qui conserve sa crédibilité à mesure que la distribution progresse.',
        operationsTitle:'Une opération régionale, de l’arrivée jusqu’au retail.',
        operationsOne:'Des entrepôts sous douane à Nairobi et Mombasa soutiennent les stocks entrant dans la région et circulant entre ses marchés. Maven coordonne les autorisations réglementaires, la certification, les stocks, la préparation des commandes et la livraison au sein d’un même flux opérationnel.',
        operationsTwo:'Cette structure évite aux maisons de parfumerie de devoir aborder chaque marché séparément. Les produits circulent avec une supervision plus claire, tandis que leur intégrité et les standards qui les entourent restent protégés.',
        editorialFootprintTitle:'Une présence est-africaine connectée.',
        footprintOne:'Le réseau dessert le Kenya, le Burundi, le Rwanda, le Soudan du Sud, la Tanzanie et l’Ouganda, avec une présence à Goma, Bunia et Bukavu dans l’est de la République démocratique du Congo. Les relations locales et la coordination régionale permettent de porter une même direction de marque sur des marchés aux réalités retail très différentes.',
        footprintTwo:'FeelNZuri, le salon de parfumerie phare de Space à Nairobi, apporte une lecture directe du retail. Son cadre intime favorise une découverte guidée et révèle comment les consommateurs vivent, comprennent et choisissent la parfumerie de niche.',
        returnHome:'Accueil', kicker:'Maven Global · Nairobi',
        headline:'Space × Maven',
        lead:'Conçue à Nairobi. Pensée pour l’Afrique de l’Est.',
        body:'Fondée en 2016, Maven est la filiale de distribution est-africaine de Space. Son équipe associe plus de vingt ans d’expérience des marchés du luxe à une expertise locale du retail, de la logistique et de la gestion de marque.',
        facetOne:'Parfumerie de luxe et de niche', facetTwo:'Distribution est-africaine', facetThree:'Intelligence retail locale',
        external:'Visiter Maven Global', next:'Découvrir FeelNzuri', caption:'Siège à Nairobi · Portée est-africaine',
        storyKicker:'Nous sommes Maven', storyTitle:'Une connaissance régionale qui fait avancer les marques avec précision.',
        storyOne:'Maven opère à la rencontre du retail de luxe et de la distribution. Depuis Nairobi, l’équipe traduit les standards internationaux des marques en décisions adaptées à chaque marché d’Afrique de l’Est.',
        storyTwo:'Des relations stratégiques avec les marques, distributeurs, détaillants et spécialistes de la logistique forment une chaîne de valeur connectée, conçue pour acheminer efficacement les produits premium tout en protégeant leur positionnement et leur présentation.',
        metricSkus:'Références au portefeuille', metricEac:'Marchés de l’EAC', metricDrc:'Hubs dans l’est de la RDC',
        footprintKicker:'L’empreinte régionale', footprintTitle:'Une opération. Plusieurs voies vers le marché.',
        footprintLead:'Le réseau commercial de Maven couvre le Burundi, le Kenya, le Rwanda, le Soudan du Sud, la Tanzanie et l’Ouganda, avec une présence à Goma, Bunia et Bukavu dans l’est de la République démocratique du Congo.',
        principleOneTitle:'Maîtrise des marchés', principleOneBody:'La connaissance locale aide les marques à comprendre les comportements, les structures retail et les réalités commerciales sans perdre leur identité internationale.',
        principleTwoTitle:'Une infrastructure pensée', principleTwoBody:'Des installations de consolidation situées près des principaux ports régionaux contribuent à améliorer les délais et à maîtriser le coût des itinéraires complexes.',
        principleThreeTitle:'Un réseau exigeant', principleThreeBody:'Les partenaires retail sont choisis pour leur capacité à représenter chaque marque avec la présentation, la discipline et le service qu’exigent ses principes.',
        quote:'« Le parfum est la clé de nos souvenirs. »', operatingKicker:'La méthode Maven',
        operatingLead:'Connaissance locale, exécution précise, logistique résiliente, partenariats de confiance et gestion responsable des marques guident chaque décision.', backToSpace:'Retour à Space'
      }
    }
  };
  const languageControl = document.querySelector('[data-language]');
  const setLanguage = (requested) => {
    const language = requested === 'fr' ? 'fr' : 'en';
    const copy = translations[page]?.[language];
    if (!copy) return;
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const value = copy[element.dataset.i18n];
      if (value !== undefined) element.textContent = value;
    });
    languageControl?.classList.toggle('is-fr', language === 'fr');
    languageControl?.querySelectorAll('button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lang === language)));
    try { localStorage.setItem('space-language', language); } catch {}
  };
  languageControl?.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
  let initial = 'en';
  try { initial = localStorage.getItem('space-language') || 'en'; } catch {}
  setLanguage(initial);

  const revealElements = [...document.querySelectorAll('.profile-reveal')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!('IntersectionObserver' in window) || reduceMotion) revealElements.forEach((element) => element.classList.add('is-visible'));
  else {
    const revealObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }), { threshold: .16, rootMargin: '0px 0px -8% 0px' });
    revealElements.forEach((element) => revealObserver.observe(element));
  }
})();

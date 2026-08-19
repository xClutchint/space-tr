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
        next:'Explore Space × Maven', caption:'Fragrance, experienced personally'
      },
      fr: {
        returnHome:'Accueil', kicker:'Salon de parfumerie · Nairobi',
        headline:'FeelNzuri',
        lead:'Un salon raffiné où la parfumerie de niche rencontre la chaleur de l’hospitalité africaine.',
        body:'FeelNzuri propose un cadre pensé pour la découverte olfactive, réunissant maisons de parfum singulières, conseil attentif et expérience retail accueillante au sein d’une destination intime.',
        facetOne:'Parfumerie de niche', facetTwo:'Découverte guidée', facetThree:'Hospitalité africaine',
        next:'Découvrir Space × Maven', caption:'Le parfum, vécu personnellement'
      }
    },
    maven: {
      en: {
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

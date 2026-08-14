(() => {
  const page = document.body.dataset.profile;
  const translations = {
    feelnzuri: {
      en: {
        returnHome:'Return home', kicker:'Fragrance lounge · Nairobi',
        headline:'FeelNzuri',
        lead:'A refined fragrance lounge where niche perfumery meets the warmth of African hospitality.',
        body:'FeelNzuri creates a considered setting for fragrance discovery—bringing distinctive perfume houses, knowledgeable guidance and a welcoming retail experience together in one intimate destination.',
        facetOne:'Niche perfumery', facetTwo:'Guided discovery', facetThree:'African hospitality',
        next:'Explore Space × Maven', caption:'Fragrance, experienced personally'
      },
      fr: {
        returnHome:'Retour à l’accueil', kicker:'Salon de parfumerie · Nairobi',
        headline:'FeelNzuri',
        lead:'Un salon raffiné où la parfumerie de niche rencontre la chaleur de l’hospitalité africaine.',
        body:'FeelNzuri propose un cadre pensé pour la découverte olfactive, réunissant maisons de parfum singulières, conseil attentif et expérience retail accueillante au sein d’une destination intime.',
        facetOne:'Parfumerie de niche', facetTwo:'Découverte guidée', facetThree:'Hospitalité africaine',
        next:'Découvrir Space × Maven', caption:'Le parfum, vécu personnellement'
      }
    },
    maven: {
      en: {
        returnHome:'Return home', kicker:'Regional distribution · East Africa',
        headline:'Space × Maven',
        lead:'Regional intelligence translates international brand ambition into precise local-market execution.',
        body:'Space and Maven connect brand management, retailer relationships, stock coordination and market knowledge within one considered regional operation—supporting fragrance and beauty portfolios across East African retail environments.',
        facetOne:'Brand management', facetTwo:'Retail relationships', facetThree:'Operations & logistics',
        external:'Visit Maven Global', next:'Explore FeelNzuri', caption:'Global standards, regional command'
      },
      fr: {
        returnHome:'Retour à l’accueil', kicker:'Distribution régionale · Afrique de l’Est',
        headline:'Space × Maven',
        lead:'L’intelligence régionale transforme l’ambition des marques internationales en une exécution locale précise.',
        body:'Space et Maven réunissent gestion de marque, relations avec les détaillants, coordination des stocks et connaissance des marchés au sein d’une opération régionale cohérente au service des portefeuilles parfum et beauté en Afrique de l’Est.',
        facetOne:'Gestion de marque', facetTwo:'Relations retail', facetThree:'Opérations et logistique',
        external:'Visiter Maven Global', next:'Découvrir FeelNzuri', caption:'Standards mondiaux, maîtrise régionale'
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
})();

(() => {
  const copy = {
    en: {
      home: 'Return home', kicker: 'The Space journal', headline: 'Posts.',
      intro: 'Ideas, observations and company updates from the worlds of fragrance, beauty and regional distribution.',
      featuredKicker: 'Selected posts', featuredTitle: 'From the journal.', featuredIntro: 'Scroll through recent perspectives from Space.', viewAll: 'View all posts',
      archive: 'Archive', browse: 'Browse the journal', search: 'Search', topic: 'Topic', year: 'Year',
      reset: 'Reset filters', journal: 'The latest from Space', latest: 'Perspectives & updates',
      noResults: 'No posts match these filters.', address: 'Address', email: 'E-mail', tagline: 'Global Brands, Local Reach',
      searchPlaceholder: 'Search posts', allTopics: 'All topics', allYears: 'All years', onePost: '1 post', manyPosts: count => `${count} posts`
    },
    fr: {
      home: "Retour à l'accueil", kicker: 'Le journal de Space', headline: 'Publications.',
      intro: "Idées, observations et actualités de l'entreprise dans les univers de la parfumerie, de la beauté et de la distribution régionale.",
      featuredKicker: 'Publications choisies', featuredTitle: 'Le journal.', featuredIntro: 'Parcourez les dernières perspectives de Space.', viewAll: 'Voir toutes les publications',
      archive: 'Archives', browse: 'Parcourir le journal', search: 'Rechercher', topic: 'Sujet', year: 'Année',
      reset: 'Réinitialiser', journal: 'Les dernières publications de Space', latest: 'Perspectives et actualités',
      noResults: 'Aucune publication ne correspond à ces filtres.', address: 'Adresse', email: 'E-mail', tagline: 'Marques mondiales, portée locale',
      searchPlaceholder: 'Rechercher une publication', allTopics: 'Tous les sujets', allYears: 'Toutes les années', onePost: '1 publication', manyPosts: count => `${count} publications`
    }
  };

  const buttons = [...document.querySelectorAll('[data-lang]')];
  const cards = [...document.querySelectorAll('[data-post-card]')];
  const searchInput = document.querySelector('[data-post-search]');
  const topicSelect = document.querySelector('[data-post-topic]');
  const yearSelect = document.querySelector('[data-post-year]');
  const resetButton = document.querySelector('[data-post-reset]');
  const countNode = document.querySelector('[data-post-count]');
  const emptyNode = document.querySelector('[data-post-empty]');
  let currentLanguage = 'en';

  function uniqueValues(attribute) {
    return [...new Set(cards.map(card => card.getAttribute(attribute)).filter(Boolean))];
  }

  function fillSelect(select, values, firstLabel) {
    if (!select) return;
    const selected = select.value;
    select.replaceChildren(new Option(firstLabel, ''));
    values.forEach(value => select.add(new Option(value, value)));
    if ([...select.options].some(option => option.value === selected)) select.value = selected;
  }

  function updateFilters() {
    const query = (searchInput?.value || '').trim().toLocaleLowerCase(currentLanguage);
    const topic = topicSelect?.value || '';
    const year = yearSelect?.value || '';
    let visible = 0;

    cards.forEach(card => {
      const textMatches = !query || card.textContent.toLocaleLowerCase(currentLanguage).includes(query);
      const topicMatches = !topic || card.dataset.postTopic === topic;
      const yearMatches = !year || card.dataset.postYear === year;
      const matches = textMatches && topicMatches && yearMatches;
      card.hidden = !matches;
      if (matches) visible += 1;
    });

    const strings = copy[currentLanguage];
    if (countNode) countNode.textContent = visible === 1 ? strings.onePost : strings.manyPosts(visible);
    if (emptyNode) emptyNode.hidden = visible !== 0;
  }

  function setLanguage(language) {
    currentLanguage = copy[language] ? language : 'en';
    const strings = copy[currentLanguage];
    document.documentElement.lang = currentLanguage;
    document.querySelectorAll('[data-copy]').forEach(node => {
      const value = strings[node.dataset.copy];
      if (typeof value !== 'string') return;
      if (node.dataset.copy === 'tagline') {
        node.replaceChildren(document.createElement('span'), document.createTextNode(value), document.createElement('span'));
      } else {
        node.textContent = value;
      }
    });
    if (searchInput) searchInput.placeholder = strings.searchPlaceholder;
    fillSelect(topicSelect, uniqueValues('data-post-topic').sort(), strings.allTopics);
    fillSelect(yearSelect, uniqueValues('data-post-year').sort((a, b) => b.localeCompare(a)), strings.allYears);
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === currentLanguage)));
    localStorage.setItem('space-language', currentLanguage);
    updateFilters();
  }

  [searchInput, topicSelect, yearSelect].forEach(control => control?.addEventListener('input', updateFilters));
  resetButton?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    if (topicSelect) topicSelect.value = '';
    if (yearSelect) yearSelect.value = '';
    updateFilters();
  });
  buttons.forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
  setLanguage(localStorage.getItem('space-language') || 'en');
})();

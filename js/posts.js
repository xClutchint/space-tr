(() => {
  const copy = {
    en: {
      home: 'Home', kicker: 'The Space journal', headline: 'Posts.',
      intro: 'Ideas, observations and company updates from the worlds of fragrance, beauty and regional distribution.',
      featuredKicker: 'Selected posts', featuredTitle: 'From the journal.', featuredIntro: 'Scroll through recent perspectives from Space.', viewAll: 'View all posts',
      archive: 'Archive', browse: 'Browse the journal', search: 'Search', topic: 'Topic', year: 'Year',
      reset: 'Reset filters', journal: 'The latest from Space', latest: 'Perspectives & updates',
      noResults: 'No posts match these filters.', address: 'Address', email: 'E-mail',
      searchPlaceholder: 'Search posts', allTopics: 'All topics', allYears: 'All years', onePost: '1 post', manyPosts: count => `${count} posts`
    },
    fr: {
      home: 'Accueil', kicker: 'Le journal de Space', headline: 'Publications.',
      intro: "Idées, observations et actualités de l'entreprise dans les univers de la parfumerie, de la beauté et de la distribution régionale.",
      featuredKicker: 'Publications choisies', featuredTitle: 'Le journal.', featuredIntro: 'Parcourez les dernières perspectives de Space.', viewAll: 'Voir toutes les publications',
      archive: 'Archives', browse: 'Parcourir le journal', search: 'Rechercher', topic: 'Sujet', year: 'Année',
      reset: 'Réinitialiser', journal: 'Les dernières publications de Space', latest: 'Perspectives et actualités',
      noResults: 'Aucune publication ne correspond à ces filtres.', address: 'Adresse', email: 'E-mail',
      searchPlaceholder: 'Rechercher une publication', allTopics: 'Tous les sujets', allYears: 'Toutes les années', onePost: '1 publication', manyPosts: count => `${count} publications`
    }
  };

  const buttons = [...document.querySelectorAll('[data-lang]')];
  let cards = [...document.querySelectorAll('[data-post-card]')];
  const postsList = document.querySelector('.posts-list');
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
  async function hydratePosts() {
    try {
      const response = await fetch('/api/content', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('CMS unavailable');
      const content = await response.json();
      if (!Array.isArray(content.posts) || !postsList) throw new Error('Invalid posts data');
      postsList.replaceChildren(...content.posts.map(post => {
        const article = document.createElement('article');
        article.className = `post-card${post.imageUrl ? ' post-card-with-image' : ''}`;
        article.dataset.postCard = '';
        article.dataset.postTopic = post.topic || 'Updates';
        article.dataset.postYear = String(post.date || '').slice(0, 4);
        if (post.imageUrl) {
          const visual = document.createElement('div'); visual.className = 'post-image';
          const image = document.createElement('img'); image.src = post.imageUrl; image.alt = post.title || ''; image.loading = 'lazy'; visual.append(image); article.append(visual);
        }
        const body = document.createElement('div'); body.className = 'post-body';
        const meta = document.createElement('div'); meta.className = 'post-meta';
        const label = document.createElement('span'); label.className = 'post-label'; label.textContent = post.topic || 'Updates'; meta.append(label);
        const time = document.createElement('time'); time.dateTime = post.date || ''; time.textContent = post.date ? new Intl.DateTimeFormat(currentLanguage, { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${post.date}T00:00:00Z`)) : ''; meta.append(time); body.append(meta);
        const heading = document.createElement('h2'); heading.textContent = post.title || ''; body.append(heading);
        const copyNode = document.createElement('div'); copyNode.className = 'post-copy';
        String(post.body || post.excerpt || '').split(/\n{2,}/).filter(Boolean).forEach(value => { const paragraph = document.createElement('p'); paragraph.textContent = value; copyNode.append(paragraph); }); body.append(copyNode);
        if (post.externalUrl) { const link = document.createElement('a'); link.href = post.externalUrl; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Read more'; body.append(link); }
        article.append(body); return article;
      }));
      cards = [...postsList.querySelectorAll('[data-post-card]')];
      setLanguage(currentLanguage);
    } catch (error) {
      updateFilters();
    }
  }

  setLanguage(localStorage.getItem('space-language') || 'en');
  hydratePosts();
})();

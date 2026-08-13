(() => {
  const root = document.querySelector('[data-africa-map]');
  const map = window.AFRICA_MAP_DATA;
  if (!root || !map) return;

  const MARKET_IDS = ['ke','ao','sn','mz','ug','tz','ci','cd','cg','tn','ma','et','tg','bj','dj','bf','zm','bi','ng'];
  const MARKET_SET = new Set(MARKET_IDS);
  const REGIONAL_OFFICE_IDS = new Set(['ke']);
  const overrides = {
    en: { ci:'Ivory Coast',cd:'Congo DRC',cg:'Congo Brazzaville' },
    fr: { ci:'Côte d’Ivoire',cd:'RDC',cg:'Congo-Brazzaville' }
  };
  const copy = {
    en: { heading:'Space market atlas',continent:'Africa',selection:'Highlighted market',idle:'19 African markets highlighted',preview:'Part of the Space African market footprint',locked:'Selected market within the Space African footprint',reset:'View all' },
    fr: { heading:'Atlas des marchés Space',continent:'Afrique',selection:'Marché mis en valeur',idle:'19 marchés africains mis en valeur',preview:'Marché faisant partie de l’empreinte africaine de Space',locked:'Marché sélectionné au sein de l’empreinte africaine de Space',reset:'Tout afficher' }
  };

  const svg = root.querySelector('svg');
  const countryOutput = root.querySelector('[data-map-country]');
  const statusOutput = root.querySelector('[data-map-status]');
  const reset = root.querySelector('[data-map-reset]');
  const headingLabel = root.querySelector('.africa-map-heading span');
  const headingTitle = root.querySelector('.africa-map-heading strong');
  const selectionLabel = root.querySelector('.africa-map-label');
  const indexItems = [...document.querySelectorAll('[data-country-name]')];
  let selected = null;
  let language = document.documentElement.lang === 'fr' ? 'fr' : 'en';

  const countryName = (location) => {
    if (!location) return '';
    if (overrides[language][location.id]) return overrides[language][location.id];
    try { return new Intl.DisplayNames([language], { type:'region' }).of(location.id.toUpperCase()) || location.name; }
    catch { return location.name; }
  };

  const setIndexState = (id) => indexItems.forEach((item) => item.classList.toggle('is-active', item.dataset.countryName === id));
  const show = (location, locked = false) => {
    countryOutput.textContent = countryName(location);
    statusOutput.textContent = location ? (locked ? copy[language].locked : copy[language].preview) : copy[language].idle;
    setIndexState(location?.id || '');
  };
  const select = (path, location) => {
    svg.querySelectorAll('.is-selected').forEach((item) => item.classList.remove('is-selected'));
    selected = location;
    path.classList.add('is-selected');
    reset.hidden = false;
    show(location, true);
  };

  svg.setAttribute('viewBox', map.viewBox);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  map.locations.forEach((location) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', location.path);
    path.dataset.country = location.id;

    if (!MARKET_SET.has(location.id)) {
      path.classList.add('is-context');
      path.setAttribute('aria-hidden', 'true');
      svg.appendChild(path);
      return;
    }

    path.classList.add('is-market');
    if (REGIONAL_OFFICE_IDS.has(location.id)) {
      path.classList.add('is-office');
      path.style.fill = '#111111';
      path.dataset.regionRole = 'regional-office';
    } else {
      path.style.fill = '#111111';
      path.dataset.regionRole = 'market-served';
    }
    path.setAttribute('tabindex', '0');
    path.setAttribute('role', 'button');
    path.setAttribute('aria-label', countryName(location));
    path.addEventListener('mouseenter', () => { if (!selected) show(location); });
    path.addEventListener('mouseleave', () => { if (!selected) show(null); });
    path.addEventListener('focus', () => { if (!selected) show(location); });
    path.addEventListener('blur', () => { if (!selected) show(null); });
    path.addEventListener('click', () => select(path, location));
    path.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      select(path, location);
    });
    svg.appendChild(path);
  });

  indexItems.forEach((item) => {
    const location = map.locations.find((entry) => entry.id === item.dataset.countryName);
    const path = svg.querySelector(`[data-country="${item.dataset.countryName}"]`);
    if (!location || !path) return;
    item.tabIndex = 0;
    item.addEventListener('mouseenter', () => { if (!selected) show(location); });
    item.addEventListener('mouseleave', () => { if (!selected) show(null); });
    item.addEventListener('click', () => select(path, location));
    item.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      select(path, location);
    });
  });

  reset.addEventListener('click', () => {
    selected = null;
    svg.querySelectorAll('.is-selected').forEach((item) => item.classList.remove('is-selected'));
    reset.hidden = true;
    show(null);
  });

  const updateLanguage = () => {
    if (headingLabel) headingLabel.textContent = copy[language].heading;
    if (headingTitle) headingTitle.textContent = copy[language].continent;
    if (selectionLabel) selectionLabel.textContent = copy[language].selection;
    reset.textContent = copy[language].reset;
    svg.setAttribute('aria-label', copy[language].continent);
    svg.querySelectorAll('.is-market').forEach((path) => {
      const location = map.locations.find((entry) => entry.id === path.dataset.country);
      path.setAttribute('aria-label', countryName(location));
    });
    show(selected, Boolean(selected));
  };

  window.addEventListener('space:language', (event) => {
    language = event.detail?.language === 'fr' ? 'fr' : 'en';
    updateLanguage();
  });
  updateLanguage();
})();

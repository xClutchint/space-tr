(() => {
  const root = document.querySelector('[data-africa-map]');
  const map = window.AFRICA_MAP_DATA;
  if (!root || !map) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const MARKET_IDS = ['ke','ao','sn','mz','ug','tz','ci','cd','cg','tn','ma','et','tg','bj','dj','bf','zm','bi','ng'];
  const MARKET_SET = new Set(MARKET_IDS);
  const MARKET_SCENES = {
    ao:'angola', bj:'benin', bf:'burkina-faso', bi:'burundi',
    cd:'democratic-republic-of-the-congo', dj:'djibouti', et:'ethiopia',
    ci:'ivory-coast', ke:'kenya', ma:'morocco', mz:'mozambique', ng:'nigeria',
    cg:'republic-of-the-congo', sn:'senegal', tz:'tanzania', tg:'togo',
    tn:'tunisia', ug:'uganda', zm:'zambia'
  };
  const marketSceneUrl = (id) => `assets/editorial/regions/markets/${MARKET_SCENES[id]}.webp`;
  const MARKET_GROUPS = [
    { id:'north', markets:['ma','tn'] },
    { id:'west', markets:['sn','ci','tg','bj','bf','ng'] },
    { id:'central', markets:['ao','cd','cg'] },
    { id:'east', markets:['ke','ug','tz','et','dj','bi'] },
    { id:'southern', markets:['mz','zm'] }
  ];
  const MARKET_ORDER = MARKET_GROUPS.flatMap((region) => region.markets);
  const RAIL_ORDER = ['overview', ...MARKET_ORDER];
  const overrides = {
    en: { ci:'Ivory Coast',cd:'Congo DRC',cg:'Congo Brazzaville' },
    fr: { ci:'Côte d’Ivoire',cd:'RDC',cg:'Congo-Brazzaville' }
  };

  const svg = root.querySelector('svg');
  const backdropRoot = document.querySelector('[data-market-backdrops]');
  const railRoot = document.querySelector('[data-market-rail]');
  const railTrack = document.querySelector('[data-market-track]');
  let selected = null;
  let railActiveId = '';
  let focusRailMarket = () => {};
  let language = document.documentElement.lang === 'fr' ? 'fr' : 'en';
  let clearPreviewFrame = 0;
  const primaryHover = window.matchMedia('(hover: hover) and (pointer: fine)');

  const countryName = (location) => {
    if (!location) return '';
    if (overrides[language][location.id]) return overrides[language][location.id];
    try {
      return new Intl.DisplayNames([language], { type:'region' }).of(location.id.toUpperCase()) || location.name;
    } catch {
      return location.name;
    }
  };

  const backdropItems = [];
  let activeBackdropIndex = -1;
  let activeBackdropId = '';
  let backdropRequest = 0;
  const prefetchedScenes = new Set();

  const prefetchScene = (id) => {
    if (!id || id === 'overview' || prefetchedScenes.has(id)) return;
    prefetchedScenes.add(id);
    const scene = new Image();
    scene.decoding = 'async';
    scene.src = marketSceneUrl(id);
  };

  if (backdropRoot) {
    for (let index = 0; index < 2; index += 1) {
      const scene = document.createElement('img');
      scene.alt = '';
      scene.decoding = 'async';
      backdropRoot.appendChild(scene);
      backdropItems.push(scene);
    }
  }

  if (railTrack) {
    for (let repetition = 0; repetition < 3; repetition += 1) {
      RAIL_ORDER.forEach((id) => {
        const label = document.createElement('span');
        label.className = 'presence-market-name';
        label.dataset.railMarket = id;
        railTrack.appendChild(label);
      });
    }
  }

  const railItems = [...document.querySelectorAll('[data-rail-market]')];
  const showBackdrop = (id = '') => {
    backdropRoot?.classList.toggle('has-active-market', Boolean(id));
    if (!backdropRoot || !backdropItems.length) return;
    if (!id) {
      backdropRequest += 1;
      activeBackdropId = '';
      backdropItems.forEach((item) => item.classList.remove('is-active'));
      return;
    }
    if (id === activeBackdropId && activeBackdropIndex >= 0) return;

    const request = ++backdropRequest;
    const nextIndex = (activeBackdropIndex + 1) % backdropItems.length;
    const nextBackdrop = backdropItems[nextIndex];
    const reveal = () => {
      if (request !== backdropRequest) return;
      backdropItems.forEach((item, index) => item.classList.toggle('is-active', index === nextIndex));
      activeBackdropIndex = nextIndex;
      activeBackdropId = id;
    };
    nextBackdrop.onload = reveal;
    nextBackdrop.src = marketSceneUrl(id);
    if (nextBackdrop.complete) window.requestAnimationFrame(reveal);
  };

  const setMarketState = (id = '') => {
    showBackdrop(id);
  };

  const clearPreview = () => {
    window.cancelAnimationFrame(clearPreviewFrame);
    clearPreviewFrame = window.requestAnimationFrame(() => {
      svg.querySelectorAll('.is-previewed').forEach((item) => item.classList.remove('is-previewed'));
      const activeId = selected?.id || '';
      setMarketState(activeId);
      focusRailMarket(activeId || 'overview');
    });
  };

  const preview = (path, location) => {
    window.cancelAnimationFrame(clearPreviewFrame);
    prefetchScene(location.id);
    svg.querySelectorAll('.is-previewed').forEach((item) => item.classList.remove('is-previewed'));
    if (!path.classList.contains('is-selected')) path.classList.add('is-previewed');
    setMarketState(location.id);
    focusRailMarket(location.id);
  };

  const clearSelection = () => {
    selected = null;
    svg.querySelectorAll('.is-selected').forEach((item) => {
      item.classList.remove('is-selected');
      item.setAttribute('aria-pressed', 'false');
    });
    svg.querySelectorAll('.is-previewed').forEach((item) => item.classList.remove('is-previewed'));
    setMarketState('');
    focusRailMarket('overview');
  };

  const select = (path, location) => {
    if (selected?.id === location.id) {
      clearSelection();
      return;
    }

    svg.querySelectorAll('.is-previewed').forEach((item) => item.classList.remove('is-previewed'));
    svg.querySelectorAll('.is-selected').forEach((item) => {
      item.classList.remove('is-selected');
      item.setAttribute('aria-pressed', 'false');
    });
    selected = location;
    path.classList.add('is-selected');
    path.setAttribute('aria-pressed', 'true');
    setMarketState(location.id);
    focusRailMarket(location.id);
  };

  svg.setAttribute('viewBox', map.viewBox);
  svg.setAttribute('preserveAspectRatio', 'xMidYMax meet');

  map.locations.forEach((location) => {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', location.path);
    path.dataset.country = location.id;

    if (!MARKET_SET.has(location.id)) {
      path.classList.add('is-context');
      path.setAttribute('aria-hidden', 'true');
      svg.appendChild(path);
      return;
    }

    path.classList.add('is-market');
    path.dataset.regionRole = 'market-served';
    path.setAttribute('tabindex', '0');
    path.setAttribute('role', 'button');
    path.setAttribute('aria-pressed', 'false');
    path.setAttribute('aria-label', countryName(location));
    path.addEventListener('mouseenter', () => preview(path, location));
    path.addEventListener('mouseleave', clearPreview);
    path.addEventListener('focus', () => preview(path, location));
    path.addEventListener('blur', clearPreview);
    path.addEventListener('click', () => {
      if (!primaryHover.matches) select(path, location);
    });
    path.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      select(path, location);
    });
    svg.appendChild(path);
  });

  if (railRoot && railTrack && railItems.length) {
    const sequenceLength = RAIL_ORDER.length;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mapLayout = railRoot.closest('.presence-map-stage')?.querySelector('.presence-map-layout');
    let railIndex = sequenceLength;
    let railTransitionHandler = null;

    const activateRailMarket = (index) => {
      const item = railItems[index];
      if (!item) return;
      railItems.forEach((entry, itemIndex) => entry.classList.toggle('is-active', itemIndex === index));
      railActiveId = item.dataset.railMarket === 'overview' ? '' : item.dataset.railMarket;
      setMarketState(selected?.id || railActiveId);
    };

    const placeRailItem = (index, animate = true) => {
      const item = railItems[index];
      if (!item) return;
      const offset = item.offsetLeft + item.offsetWidth / 2 - railRoot.clientWidth / 2;
      if (railTransitionHandler) {
        railTrack.removeEventListener('transitionend', railTransitionHandler);
        railTransitionHandler = null;
      }
      railTrack.style.transitionDuration = animate && !reducedMotion.matches ? '.52s' : '0s';
      railTrack.style.transform = `translate3d(${-offset}px,0,0)`;

      if (!animate || reducedMotion.matches) {
        activateRailMarket(index);
        if (index >= sequenceLength * 2) railIndex = index - sequenceLength;
        else if (index < sequenceLength) railIndex = index + sequenceLength;
        if (railIndex !== index) placeRailItem(railIndex, false);
        return;
      }

      railTransitionHandler = (event) => {
        if (event.propertyName !== 'transform') return;
        railTrack.removeEventListener('transitionend', railTransitionHandler);
        railTransitionHandler = null;
        activateRailMarket(index);
        if (index >= sequenceLength * 2) {
          railIndex = index - sequenceLength;
          placeRailItem(railIndex, false);
        } else if (index < sequenceLength) {
          railIndex = index + sequenceLength;
          placeRailItem(railIndex, false);
        }
      };
      railTrack.addEventListener('transitionend', railTransitionHandler);
    };

    focusRailMarket = (id = 'overview') => {
      const orderIndex = RAIL_ORDER.indexOf(id);
      if (orderIndex < 0) return;
      const candidates = [orderIndex, orderIndex + sequenceLength, orderIndex + sequenceLength * 2];
      railIndex = candidates.reduce((closest, candidate) => (
        Math.abs(candidate - railIndex) < Math.abs(closest - railIndex) ? candidate : closest
      ), candidates[0]);
      placeRailItem(railIndex, true);
    };

    window.addEventListener('resize', () => placeRailItem(railIndex, false), { passive:true });

    if (mapLayout && 'IntersectionObserver' in window) {
      let mapHasEntered = false;
      const mapExitObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            mapHasEntered = true;
            return;
          }
          if (mapHasEntered) clearSelection();
        });
      }, { threshold:0 });
      mapExitObserver.observe(mapLayout);
    }

    window.requestAnimationFrame(() => {
      placeRailItem(railIndex, false);
      railRoot.classList.add('is-ready');
    });
  }

  const updateLanguage = () => {
    svg.setAttribute('aria-label', language === 'fr' ? 'Afrique' : 'Africa');
    svg.querySelectorAll('.is-market').forEach((path) => {
      const location = map.locations.find((entry) => entry.id === path.dataset.country);
      path.setAttribute('aria-label', countryName(location));
    });
    railItems.forEach((item) => {
      if (item.dataset.railMarket === 'overview') {
        item.textContent = language === 'fr' ? '19+ et toujours plus' : '19+ and counting';
        return;
      }
      const location = map.locations.find((entry) => entry.id === item.dataset.railMarket);
      if (location) item.textContent = countryName(location);
    });
    setMarketState(selected?.id);
  };

  window.addEventListener('space:language', (event) => {
    language = event.detail?.language === 'fr' ? 'fr' : 'en';
    updateLanguage();
  });

  updateLanguage();
})();

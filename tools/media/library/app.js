(async() => {
  const library = window.SPACE_MEDIA_LIBRARY?.media || [];
  const defaults = {
    version: 1,
    hero: { excludeLightBackgrounds: true, excluded: [], included: [] },
    carousel: { selectionMode: 'include', excluded: [], included: [] }
  };
  let base = window.SPACE_MEDIA_CURATION || defaults;
  try {
    const response = await fetch('/assets/media/runtime/media-curation.json', { cache: 'no-store' });
    if (response.ok) base = await response.json();
  } catch {}
  const requestedSlot = new URLSearchParams(window.location.search).get('slot');
  const initialSlot = requestedSlot === 'carousel' ? 'carousel' : 'hero';
  const state = {
    slot: initialSlot,
    search: '',
    brand: '',
    type: '',
    status: initialSlot === 'carousel' ? 'all' : 'eligible',
    curation: JSON.parse(JSON.stringify(base))
  };

  state.curation.hero ||= { ...defaults.hero };
  state.curation.carousel ||= { ...defaults.carousel };
  state.curation.carousel.selectionMode = 'include';
  state.curation.carousel.excluded ||= [];
  state.curation.carousel.included ||= [];

  const $ = selector => document.querySelector(selector);
  const grid = $('[data-media-grid]');
  const template = $('#media-card-template');
  const settings = slot => state.curation[slot];
  const editorial = item => !/(pack[ -]?shot|png images|no background|textclipping)/i.test(item.src);
  const candidate = (item, slot) => item.webReady && editorial(item) && item.orientation === (slot === 'hero' ? 'vertical' : 'horizontal');
  const manuallyExcluded = (item, slot) => settings(slot).excluded.includes(item.id);
  const manuallyIncluded = (item, slot) => settings(slot).included.includes(item.id);
  const autoLight = (item, slot) => slot === 'hero'
    && settings(slot).excludeLightBackgrounds !== false
    && item.type !== 'video'
    && (item.backgroundTone === 'light' || (item.edgeLuminance >= 205 && item.lightNeutralRatio >= .25))
    && !manuallyIncluded(item, slot);
  const eligible = (item, slot) => slot === 'carousel'
    ? manuallyIncluded(item, slot)
    : !manuallyExcluded(item, slot) && !autoLight(item, slot);

  const assetUrl = value => {
    const raw = String(value || '').replace(/\\/g, '/');
    if (!raw) return '';
    const rooted = /^(?:https?:|data:|blob:|\/)/i.test(raw)
      ? raw
      : `/${raw.replace(/^(?:\.\.\/)+/, '').replace(/^\.\//, '')}`;
    return encodeURI(rooted).replace(/#/g, '%23');
  };
  const mediaSources = item => [...new Set([
    item.thumbnailSrc,
    item.optimizedSrc,
    item.src
  ].map(assetUrl).filter(Boolean))];
  const bytes = n => n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.ceil(n / 1024)} KB`;

  const mediaNode = item => {
    const sources = mediaSources(item);
    if (item.type === 'video') {
      const video = document.createElement('video');
      video.src = sources[0] || '';
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.addEventListener('mouseenter', () => video.play().catch(() => {}));
      video.addEventListener('mouseleave', () => { video.pause(); video.currentTime = 0; });
      return video;
    }
    const img = document.createElement('img');
    let sourceIndex = 0;
    img.src = sources[sourceIndex] || '';
    img.alt = `${item.brand} ${item.label}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => {
      sourceIndex += 1;
      if (sources[sourceIndex]) img.src = sources[sourceIndex];
      else img.closest('.media-preview')?.classList.add('has-load-error');
    });
    return img;
  };

  const pool = slot => library.filter(item => candidate(item, slot));
  const matches = item => {
    const isEligible = eligible(item, state.slot);
    if (state.status === 'eligible' && !isEligible) return false;
    if (state.status === 'excluded' && isEligible) return false;
    if (state.brand && item.brand !== state.brand) return false;
    if (state.type && item.type !== state.type) return false;
    if (state.search && !`${item.brand} ${item.label} ${item.src}`.toLowerCase().includes(state.search)) return false;
    return true;
  };

  const toggle = item => {
    const slot = state.slot;
    const slotSettings = settings(slot);
    const excluded = new Set(slotSettings.excluded);
    const included = new Set(slotSettings.included);
    if (slot === 'carousel') {
      excluded.delete(item.id);
      if (included.has(item.id)) included.delete(item.id);
      else included.add(item.id);
    } else if (manuallyExcluded(item, slot)) {
      excluded.delete(item.id);
      included.add(item.id);
    } else if (autoLight(item, slot)) {
      included.add(item.id);
    } else {
      excluded.add(item.id);
      included.delete(item.id);
    }
    slotSettings.excluded = [...excluded];
    slotSettings.included = [...included];
    render();
    setStatus('Unsaved changes');
  };

  const render = () => {
    const all = pool(state.slot);
    const items = all.filter(matches);
    grid.replaceChildren();
    items.forEach(item => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector('.media-card');
      const preview = fragment.querySelector('.media-preview');
      const button = fragment.querySelector('.curation-button');
      const selected = eligible(item, state.slot);
      preview.append(mediaNode(item));
      fragment.querySelector('.media-brand').textContent = item.brand;
      fragment.querySelector('.media-file').textContent = item.label;
      fragment.querySelector('.media-id').textContent = `ID ${item.id}`;
      fragment.querySelector('.media-format').textContent = `${item.width}×${item.height} ${item.type}`;
      fragment.querySelector('.media-size').textContent = bytes(item.bytes);
      fragment.querySelector('.media-tone').textContent = item.backgroundTone || 'unknown';
      if (state.slot === 'carousel') {
        card.classList.toggle('is-selected', selected);
        card.classList.toggle('is-unselected', !selected);
        button.textContent = selected ? 'Remove' : 'Include';
      } else {
        card.classList.toggle('is-excluded', !selected);
        button.textContent = manuallyExcluded(item, state.slot) ? 'Include' : autoLight(item, state.slot) ? 'Include anyway' : 'Exclude';
      }
      button.addEventListener('click', () => toggle(item));
      grid.append(fragment);
    });

    const selectedCount = all.filter(item => eligible(item, state.slot)).length;
    $('[data-summary]').textContent = state.slot === 'carousel'
      ? `${items.length} shown · ${selectedCount} selected · ${all.length - selectedCount} available`
      : `${items.length} shown · ${selectedCount} shortlisted · ${all.length - selectedCount} excluded`;
    $('[data-hero-count]').textContent = pool('hero').filter(item => eligible(item, 'hero')).length;
    $('[data-carousel-count]').textContent = pool('carousel').filter(item => eligible(item, 'carousel')).length;
    $('[data-carousel-shortlisted-count]').textContent = pool('carousel').filter(item => eligible(item, 'carousel')).length;
  };

  const setStatus = message => { $('[data-save-status]').textContent = message; };
  const signalCurationUpdate = curation => {
    const message = { updatedAt: curation.updatedAt, nonce: `${Date.now()}-${Math.random()}` };
    try { localStorage.setItem('space-media-curation-updated', JSON.stringify(message)); } catch {}
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('space-media-curation');
      channel.postMessage(message);
      channel.close();
    }
  };
  const brands = [...new Set(library.filter(editorial).map(item => item.brand))].sort((a, b) => a.localeCompare(b));
  brands.forEach(brand => {
    const option = document.createElement('option');
    option.value = option.textContent = brand;
    $('[data-brand]').append(option);
  });

  const updateStatusOptions = () => {
    const select = $('[data-status]');
    const labels = state.slot === 'carousel'
      ? { eligible: 'Selected', all: 'All candidates', excluded: 'Not selected' }
      : { eligible: 'Shortlisted', all: 'All candidates', excluded: 'Excluded' };
    [...select.options].forEach(option => { option.textContent = labels[option.value]; });
    select.value = state.status;
  };
  const updateSlotUi = () => {
    document.body.dataset.activeSlot = state.slot;
    document.querySelectorAll('[data-slot]').forEach(node => node.classList.toggle('is-active', node.dataset.slot === state.slot));
    $('[data-hero-rule]').hidden = state.slot !== 'hero';
    $('[data-carousel-rule]').hidden = state.slot !== 'carousel';
    updateStatusOptions();
  };

  document.querySelectorAll('[data-slot]').forEach(tab => tab.addEventListener('click', () => {
    state.slot = tab.dataset.slot;
    state.status = state.slot === 'carousel' ? 'all' : 'eligible';
    updateSlotUi();
    history.replaceState(null, '', `${location.pathname}?slot=${state.slot}`);
    render();
  }));
  $('[data-search]').addEventListener('input', event => { state.search = event.target.value.toLowerCase(); render(); });
  $('[data-brand]').addEventListener('change', event => { state.brand = event.target.value; render(); });
  $('[data-type]').addEventListener('change', event => { state.type = event.target.value; render(); });
  $('[data-status]').addEventListener('change', event => { state.status = event.target.value; render(); });
  $('[data-exclude-light]').checked = settings('hero').excludeLightBackgrounds !== false;
  $('[data-exclude-light]').addEventListener('change', event => {
    settings('hero').excludeLightBackgrounds = event.target.checked;
    render();
    setStatus('Unsaved changes');
  });
  $('[data-save]').addEventListener('click', async () => {
    setStatus('Saving…');
    try {
      const response = await fetch('/api/media-curation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state.curation)
      });
      if (!response.ok) throw Error();
      const data = await response.json();
      state.curation = data.curation;
      signalCurationUpdate(state.curation);
      setStatus('Selection saved. Open homepage tabs updated.');
    } catch {
      const blob = new Blob([JSON.stringify(state.curation, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'media-curation.json';
      link.click();
      URL.revokeObjectURL(link.href);
      setStatus('Server restart required to save directly. Curation JSON downloaded.');
    }
  });

  updateSlotUi();
  render();
})();

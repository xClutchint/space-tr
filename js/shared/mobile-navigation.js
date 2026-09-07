(() => {
  const toggle = document.querySelector('[data-page-menu-toggle]');
  const navigation = document.querySelector('[data-page-mobile-nav]');

  if (!toggle || !navigation) return;

  // Keep the mobile controls outside page headers so local stacking contexts,
  // clipping and header overlays can never intercept the menu button.
  document.body.append(toggle, navigation);

  const isFrench = document.documentElement.lang.toLowerCase().startsWith('fr');
  const close = () => {
    document.body.classList.remove('page-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', isFrench ? 'Ouvrir la navigation' : 'Open navigation');
  };

  navigation.querySelectorAll('[data-nav-en]').forEach((link) => {
    link.textContent = link.dataset[isFrench ? 'navFr' : 'navEn'];
    link.addEventListener('click', close);
  });

  toggle.setAttribute('aria-label', isFrench ? 'Ouvrir la navigation' : 'Open navigation');
  toggle.addEventListener('click', () => {
    const willOpen = !document.body.classList.contains('page-menu-open');
    document.body.classList.toggle('page-menu-open', willOpen);
    toggle.setAttribute('aria-expanded', String(willOpen));
    toggle.setAttribute('aria-label', willOpen
      ? (isFrench ? 'Fermer la navigation' : 'Close navigation')
      : (isFrench ? 'Ouvrir la navigation' : 'Open navigation'));
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });

  window.matchMedia('(min-width: 761px)').addEventListener('change', close);
})();

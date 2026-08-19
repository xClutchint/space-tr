(() => {
  const match = window.location.pathname.match(/^\/(en|fr)(?:\/|$)/i);
  if (!match) return;

  const locale = match[1].toLowerCase();
  window.SPACE_LOCALE = locale;
  document.documentElement.lang = locale;
  try { localStorage.setItem('space-language', locale); } catch {}

  const localizedPath = (language) => {
    const unprefixed = window.location.pathname.replace(/^\/(en|fr)(?=\/|$)/i, '') || '/';
    const suffix = unprefixed === '/index.html' ? '/' : unprefixed;
    return `/${language}${suffix}${window.location.search}${window.location.hash}`;
  };

  // Existing page scripts still provide the instant text translation. On an
  // indexable locale URL, make the switch navigate to the equivalent language
  // URL so users and crawlers see the same language state.
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('[data-lang]');
    const language = button?.dataset.lang;
    if (!button || !['en', 'fr'].includes(language)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (language !== locale) window.location.assign(localizedPath(language));
  }, true);
})();

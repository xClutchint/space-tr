const locationFilter = document.querySelector('[data-career-location]');
const typeFilter = document.querySelector('[data-career-type]');
const sortFilter = document.querySelector('[data-career-sort]');
const list = document.querySelector('[data-career-list]');
let rows = [...document.querySelectorAll('.career-list-row')];
const status = document.querySelector('[data-career-status]');
const empty = document.querySelector('[data-career-empty]');
const pagination = document.querySelector('[data-career-pagination]');
const pageSize = 8;
let currentPage = 1;
let cmsJobs = null;
let currentLanguage = 'en';
try { currentLanguage = (window.SPACE_LOCALE || localStorage.getItem('space-language')) === 'fr' ? 'fr' : 'en'; } catch {}

const careerCopy = {
  en: {
    home: 'Home',
    quoteOne: 'Take away my people, but leave my factories, and soon grass will grow on the factory floors.',
    quoteTwo: 'Take away my factories, but leave my people, and soon we shall have a new and better factory.',
    explorePositions: 'Explore open positions', openPositions: 'Open positions',
    directoryIntro: 'Explore current opportunities across our distribution business.',
    location: 'Location', employmentType: 'Employment type', allLocations: 'All locations', allTypes: 'All types',
    fullTime: 'Full time', partTime: 'Part time', contractor: 'Contract', temporary: 'Temporary', internship: 'Internship', other: 'Other',
    sortBy: 'Sort by', newestFirst: 'Newest first', oldestFirst: 'Oldest first', roleAz: 'Role A–Z',
    initialStatus: 'Showing all 3 open positions', role: 'Role', department: 'Department', type: 'Type', posted: 'Posted',
    viewPosition: 'View position', brandManagement: 'Brand management', salesDistribution: 'Sales & distribution', operationsLogistics: 'Operations & logistics',
    noMatching: 'No matching positions', tryAnother: 'Try another location or employment type.', showAll: 'Show all positions',
    beyondOpenings: 'Beyond the current openings', rightRole: 'The right role may not be listed yet.',
    openDoorBody: 'We welcome talented people whose experience and perspective could strengthen Space, even when no suitable role is listed. Every application is considered on merit and potential.',
    emailTeam: 'Email our team', address: 'Address', email: 'E-mail', filtersAria: 'Filter open positions', paginationAria: 'Open-position pages',
    previous: 'Previous', next: 'Next', noFilterMatches: 'No open positions match these filters',
    showing: (start, end, total) => `Showing ${start}–${end} of ${total} open positions`
  },
  fr: {
    home: 'Accueil',
    quoteOne: 'Enlevez-moi mes collaborateurs, mais laissez-moi mes usines, et bientôt l’herbe poussera sur leurs sols.',
    quoteTwo: 'Enlevez-moi mes usines, mais laissez-moi mes collaborateurs, et bientôt nous aurons une usine nouvelle et meilleure.',
    explorePositions: 'Découvrir les postes à pourvoir', openPositions: 'Postes à pourvoir',
    directoryIntro: 'Découvrez les opportunités actuelles au sein de nos activités de distribution.',
    location: 'Lieu', employmentType: 'Type de contrat', allLocations: 'Tous les lieux', allTypes: 'Tous les contrats',
    fullTime: 'Temps plein', partTime: 'Temps partiel', contractor: 'Contrat', temporary: 'Temporaire', internship: 'Stage', other: 'Autre',
    sortBy: 'Trier par', newestFirst: 'Plus récents', oldestFirst: 'Plus anciens', roleAz: 'Intitulé A–Z',
    initialStatus: '3 postes à pourvoir', role: 'Poste', department: 'Département', type: 'Contrat', posted: 'Publication',
    viewPosition: 'Voir le poste', brandManagement: 'Gestion de marque', salesDistribution: 'Ventes et distribution', operationsLogistics: 'Opérations et logistique',
    noMatching: 'Aucun poste correspondant', tryAnother: 'Essayez un autre lieu ou type de contrat.', showAll: 'Voir tous les postes',
    beyondOpenings: 'Au-delà des postes actuels', rightRole: 'Le poste qui vous correspond n’est peut-être pas encore publié.',
    openDoorBody: 'Nous souhaitons rencontrer des personnes talentueuses dont l’expérience et le regard pourraient renforcer Space, même lorsqu’aucun poste adapté n’est publié. Chaque candidature est étudiée selon son mérite et son potentiel.',
    emailTeam: 'Écrire à notre équipe', address: 'Adresse', email: 'E-mail', filtersAria: 'Filtrer les postes à pourvoir', paginationAria: 'Pages des postes à pourvoir',
    previous: 'Précédent', next: 'Suivant', noFilterMatches: 'Aucun poste ne correspond à ces filtres',
    showing: (start, end, total) => `Affichage de ${start} à ${end} sur ${total} postes`
  }
};

const strings = () => careerCopy[currentLanguage];

const manifesto = document.querySelector('.career-manifesto');
if (manifesto) requestAnimationFrame(() => requestAnimationFrame(() => manifesto.classList.add('is-visible')));

function matchingRows() {
  const matches = rows.filter(row => {
    const matchesLocation = locationFilter.value === 'all' || row.dataset.location === locationFilter.value;
    const matchesType = typeFilter.value === 'all' || row.dataset.type === typeFilter.value;
    return matchesLocation && matchesType;
  });
  return matches.sort((a, b) => {
    if (sortFilter.value === 'oldest') return a.dataset.date.localeCompare(b.dataset.date, currentLanguage);
    if (sortFilter.value === 'title') return a.dataset.title.localeCompare(b.dataset.title, currentLanguage);
    return b.dataset.date.localeCompare(a.dataset.date, currentLanguage);
  });
}

function renderPagination(totalPages) {
  if (totalPages <= 1) { pagination.innerHTML = ''; return; }
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .map(page => `<button type="button" data-page="${page}"${page === currentPage ? ' aria-current="page"' : ''}>${page}</button>`).join('');
  pagination.innerHTML = `<button type="button" data-page="prev"${currentPage === 1 ? ' disabled' : ''}>${strings().previous}</button>${pages}<button type="button" data-page="next"${currentPage === totalPages ? ' disabled' : ''}>${strings().next}</button>`;
}

function filterCareers(resetPage = false) {
  if (resetPage) currentPage = 1;
  const matches = matchingRows();
  matches.forEach(row => list.appendChild(row));
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  currentPage = Math.min(currentPage, totalPages);
  const start = (currentPage - 1) * pageSize;
  const visibleRows = matches.slice(start, start + pageSize);
  rows.forEach(row => { row.hidden = !visibleRows.includes(row); });
  if (!matches.length) status.textContent = strings().noFilterMatches;
  else status.textContent = strings().showing(start + 1, Math.min(start + pageSize, matches.length), matches.length);
  empty.hidden = matches.length !== 0;
  renderPagination(totalPages);
}

function resetCareers() {
  locationFilter.value = 'all';
  typeFilter.value = 'all';
  sortFilter.value = 'newest';
  filterCareers(true);
}

locationFilter.addEventListener('change', () => filterCareers(true));
typeFilter.addEventListener('change', () => filterCareers(true));
sortFilter.addEventListener('change', () => filterCareers(true));
document.querySelector('[data-career-empty-reset]').addEventListener('click', resetCareers);
pagination.addEventListener('click', event => {
  const button = event.target.closest('[data-page]');
  if (!button || button.disabled) return;
  const totalPages = Math.max(1, Math.ceil(matchingRows().length / pageSize));
  if (button.dataset.page === 'prev') currentPage -= 1;
  else if (button.dataset.page === 'next') currentPage += 1;
  else currentPage = Number(button.dataset.page);
  currentPage = Math.max(1, Math.min(currentPage, totalPages));
  filterCareers();
  status.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

function employmentLabel(value) {
  const copy = strings();
  return ({ FULL_TIME: copy.fullTime, PART_TIME: copy.partTime, CONTRACTOR: copy.contractor, TEMPORARY: copy.temporary, INTERN: copy.internship, OTHER: copy.other })[value] || String(value || '').replaceAll('_', ' ');
}

function departmentLabel(value) {
  const copy = strings();
  return ({
    'brand-management': copy.brandManagement,
    'sales-distribution': copy.salesDistribution,
    'operations-logistics': copy.operationsLogistics
  })[filterValue(value)] || value || '';
}

function filterValue(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function refreshSelect(select, values, firstLabel) {
  const selected = select.value;
  select.replaceChildren(new Option(firstLabel, 'all'));
  values.forEach(([value, label]) => select.add(new Option(label, value)));
  if ([...select.options].some(option => option.value === selected)) select.value = selected;
}

function formatDates() {
  document.querySelectorAll('.career-list-row time[datetime]').forEach(time => {
    if (!time.dateTime) return;
    time.textContent = new Intl.DateTimeFormat(currentLanguage, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(`${time.dateTime}T00:00:00Z`));
  });
}

function renderCmsJobs(jobs) {
  list.replaceChildren(...jobs.map(job => {
    const row = document.createElement('a');
    row.className = 'career-list-row';
    row.href = `/jobs/${encodeURIComponent(job.slug)}`;
    row.dataset.location = filterValue(job.location);
    row.dataset.type = filterValue(job.employmentType);
    row.dataset.date = job.datePosted || '';
    row.dataset.title = job.title || '';
    const values = [job.title, departmentLabel(job.department), job.location, employmentLabel(job.employmentType)];
    const strong = document.createElement('strong'); strong.textContent = values.shift(); row.append(strong);
    values.forEach(value => { const span = document.createElement('span'); span.textContent = value || ''; row.append(span); });
    const time = document.createElement('time'); time.dateTime = job.datePosted || ''; row.append(time);
    const action = document.createElement('i'); action.textContent = strings().viewPosition; row.append(action);
    return row;
  }));
  rows = [...list.querySelectorAll('.career-list-row')];
  const locations = [...new Map(jobs.map(job => [filterValue(job.location), job.location])).entries()];
  const types = [...new Map(jobs.map(job => [filterValue(job.employmentType), employmentLabel(job.employmentType)])).entries()];
  refreshSelect(locationFilter, locations, strings().allLocations);
  refreshSelect(typeFilter, types, strings().allTypes);
  formatDates();
  filterCareers();
}

function setLanguage(language) {
  currentLanguage = language === 'fr' ? 'fr' : 'en';
  const copy = strings();
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const value = copy[element.dataset.i18n];
    if (typeof value === 'string') element.textContent = value;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(element => {
    const value = copy[element.dataset.i18nAria];
    if (typeof value === 'string') element.setAttribute('aria-label', value);
  });
  const languageControl = document.querySelector('.career-language');
  languageControl?.classList.toggle('is-fr', currentLanguage === 'fr');
  languageControl?.querySelectorAll('[data-lang]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lang === currentLanguage)));
  try { localStorage.setItem('space-language', currentLanguage); } catch {}
  if (cmsJobs) renderCmsJobs(cmsJobs);
  else { formatDates(); filterCareers(); }
}

document.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));

async function hydrateCareers() {
  try {
    const response = await fetch('/api/content', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('CMS unavailable');
    const content = await response.json();
    if (!Array.isArray(content.jobs)) throw new Error('Invalid careers data');
    cmsJobs = content.jobs;
    renderCmsJobs(cmsJobs);
  } catch (error) {
    // The checked-in roles remain as a resilient fallback for local/static use.
    formatDates();
    filterCareers();
  }
}

setLanguage(currentLanguage);
hydrateCareers();

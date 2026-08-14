const searchFilter = document.querySelector('[data-career-search]');
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

const manifesto = document.querySelector('.career-manifesto');
if (manifesto) requestAnimationFrame(() => requestAnimationFrame(() => manifesto.classList.add('is-visible')));

function matchingRows() {
  const query = searchFilter.value.trim().toLowerCase();
  const matches = rows.filter(row => {
    const matchesSearch = !query || row.textContent.toLowerCase().includes(query);
    const matchesLocation = locationFilter.value === 'all' || row.dataset.location === locationFilter.value;
    const matchesType = typeFilter.value === 'all' || row.dataset.type === typeFilter.value;
    return matchesSearch && matchesLocation && matchesType;
  });
  return matches.sort((a, b) => {
    if (sortFilter.value === 'oldest') return a.dataset.date.localeCompare(b.dataset.date);
    if (sortFilter.value === 'title') return a.dataset.title.localeCompare(b.dataset.title);
    return b.dataset.date.localeCompare(a.dataset.date);
  });
}

function renderPagination(totalPages) {
  if (totalPages <= 1) { pagination.innerHTML = ''; return; }
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .map(page => `<button type="button" data-page="${page}"${page === currentPage ? ' aria-current="page"' : ''}>${page}</button>`).join('');
  pagination.innerHTML = `<button type="button" data-page="prev"${currentPage === 1 ? ' disabled' : ''}>Previous</button>${pages}<button type="button" data-page="next"${currentPage === totalPages ? ' disabled' : ''}>Next</button>`;
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
  if (!matches.length) status.textContent = 'No open positions match these filters';
  else status.textContent = `Showing ${start + 1}–${Math.min(start + pageSize, matches.length)} of ${matches.length} open positions`;
  empty.hidden = matches.length !== 0;
  renderPagination(totalPages);
}

function resetCareers() {
  searchFilter.value = '';
  locationFilter.value = 'all';
  typeFilter.value = 'all';
  sortFilter.value = 'newest';
  filterCareers(true);
}

searchFilter.addEventListener('input', () => filterCareers(true));
locationFilter.addEventListener('change', () => filterCareers(true));
typeFilter.addEventListener('change', () => filterCareers(true));
sortFilter.addEventListener('change', () => filterCareers(true));
document.querySelector('[data-career-reset]').addEventListener('click', resetCareers);
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
  return ({ FULL_TIME: 'Full time', PART_TIME: 'Part time', CONTRACTOR: 'Contract', TEMPORARY: 'Temporary', INTERN: 'Internship', OTHER: 'Other' })[value] || String(value || '').replaceAll('_', ' ');
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

async function hydrateCareers() {
  try {
    const response = await fetch('/api/content', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('CMS unavailable');
    const content = await response.json();
    if (!Array.isArray(content.jobs)) throw new Error('Invalid careers data');
    list.replaceChildren(...content.jobs.map(job => {
      const row = document.createElement('a');
      row.className = 'career-list-row';
      row.href = `/jobs/${encodeURIComponent(job.slug)}`;
      row.dataset.location = filterValue(job.location);
      row.dataset.type = filterValue(job.employmentType);
      row.dataset.date = job.datePosted || '';
      row.dataset.title = job.title || '';
      const posted = job.datePosted ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${job.datePosted}T00:00:00Z`)) : '';
      const values = [job.title, job.department, job.location, employmentLabel(job.employmentType)];
      const strong = document.createElement('strong'); strong.textContent = values.shift(); row.append(strong);
      values.forEach(value => { const span = document.createElement('span'); span.textContent = value || ''; row.append(span); });
      const time = document.createElement('time'); time.dateTime = job.datePosted || ''; time.textContent = posted; row.append(time);
      const action = document.createElement('i'); action.textContent = 'View position'; row.append(action);
      return row;
    }));
    rows = [...list.querySelectorAll('.career-list-row')];
    const locations = [...new Map(content.jobs.map(job => [filterValue(job.location), job.location])).entries()];
    const types = [...new Map(content.jobs.map(job => [filterValue(job.employmentType), employmentLabel(job.employmentType)])).entries()];
    refreshSelect(locationFilter, locations, 'All locations');
    refreshSelect(typeFilter, types, 'All types');
  } catch (error) {
    // The checked-in roles remain as a resilient fallback for local/static use.
  }
  filterCareers();
}

hydrateCareers();

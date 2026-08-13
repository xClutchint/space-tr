const searchFilter = document.querySelector('[data-career-search]');
const locationFilter = document.querySelector('[data-career-location]');
const typeFilter = document.querySelector('[data-career-type]');
const sortFilter = document.querySelector('[data-career-sort]');
const list = document.querySelector('[data-career-list]');
const rows = [...document.querySelectorAll('.career-list-row')];
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

filterCareers();

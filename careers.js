const locationFilter = document.querySelector('[data-career-location]');
const typeFilter = document.querySelector('[data-career-type]');
const rows = [...document.querySelectorAll('.career-list-row')];
const status = document.querySelector('[data-career-status]');
const empty = document.querySelector('[data-career-empty]');

function filterCareers() {
  const location = locationFilter.value;
  const type = typeFilter.value;
  let visible = 0;

  rows.forEach(row => {
    const matchesLocation = location === 'all' || row.dataset.location === location;
    const matchesType = type === 'all' || row.dataset.type === type;
    const show = matchesLocation && matchesType;
    row.hidden = !show;
    if (show) visible += 1;
  });

  status.textContent = visible === rows.length
    ? `Showing all ${visible} open positions`
    : `Showing ${visible} of ${rows.length} open positions`;
  empty.hidden = visible !== 0;
}

function resetCareers() {
  locationFilter.value = 'all';
  typeFilter.value = 'all';
  filterCareers();
}

locationFilter.addEventListener('change', filterCareers);
typeFilter.addEventListener('change', filterCareers);
document.querySelector('[data-career-reset]').addEventListener('click', resetCareers);
document.querySelector('[data-career-empty-reset]').addEventListener('click', resetCareers);

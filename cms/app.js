(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const api = async (url, options = {}) => {
    const response = await fetch(new URL(url, window.location.href), { credentials: 'same-origin', ...options, headers: options.body && !(options.body instanceof FormData) ? { 'Content-Type': 'application/json', ...(options.headers || {}) } : options.headers });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || `Request failed (${response.status})`);
    return body;
  };
  const mediaType = asset => asset.type || (/\.(mp4|webm)(?:\?|$)/i.test(asset.url || asset.name || '') ? 'video' : 'image');
  const mediaMarkup = item => item ? `<${mediaType(item) === 'video' ? 'video muted loop playsinline autoplay' : 'img'} src="${escapeHtml(item.url)}" ${mediaType(item) === 'image' ? `alt="${escapeHtml(item.alt || '')}"` : ''}></${mediaType(item) === 'video' ? 'video' : 'img'}>` : '';
  const dateLabel = value => value ? new Intl.DateTimeFormat('en', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`)) : 'No date';
  let state = null;
  let assets = [];
  let dirty = false;
  let pickerCallback = null;
  let editor = null;

  function toast(message) {
    const node = $('[data-toast]');
    node.textContent = message;
    node.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('is-visible'), 2800);
  }
  function setDirty(value = true) {
    dirty = value;
    const node = $('[data-save-state]');
    node.textContent = value ? 'Unpublished changes' : `Published ${state?.updatedAt ? dateLabel(state.updatedAt.slice(0, 10)) : ''}`;
    node.classList.toggle('is-dirty', value);
  }
  function showSection(name) {
    $$('[data-section]').forEach(section => section.classList.toggle('is-active', section.dataset.section === name));
    $$('[data-section-button]').forEach(button => button.classList.toggle('is-active', button.dataset.sectionButton === name));
    $('[data-section-title]').textContent = ({ overview: 'Overview', media: 'Homepage media', careers: 'Careers', posts: 'Posts', assets: 'Asset library' })[name];
    history.replaceState(null, '', `#${name}`);
  }
  function renderStats() {
    $('[data-stat-jobs]').textContent = state.jobs.filter(job => job.active).length;
    $('[data-stat-posts]').textContent = state.posts.filter(post => post.published).length;
    $('[data-stat-media]').textContent = assets.length;
  }
  function renderHero() {
    while (state.media.hero.length < 2) state.media.hero.push(null);
    $('[data-hero-slots]').innerHTML = state.media.hero.slice(0, 2).map((item, index) => `<article class="cms-media-slot">${item ? mediaMarkup(item) : '<div class="cms-media-slot-empty">No media selected</div>'}<div class="cms-media-slot-bar"><span>Hero board ${index + 1}</span><button type="button" data-pick-hero="${index}">${item ? 'Replace' : 'Choose asset'}</button></div></article>`).join('');
  }
  function renderCarousel() {
    const list = $('[data-carousel-list]');
    list.innerHTML = state.media.carousel.length ? state.media.carousel.map((item, index) => `<article class="cms-sequence-item"><div class="cms-sequence-preview">${mediaMarkup(item)}</div><div><strong>${escapeHtml(item.label || item.name || `Campaign ${index + 1}`)}</strong><small>Position ${index + 1}</small></div><div class="cms-row-actions"><button type="button" data-carousel-move="up" data-index="${index}" aria-label="Move up">↑</button><button type="button" data-carousel-move="down" data-index="${index}" aria-label="Move down">↓</button><button type="button" data-carousel-remove data-index="${index}" aria-label="Remove">×</button></div></article>`).join('') : '<p>No CMS override is active. The approved built-in carousel remains live until you add an asset here.</p>';
  }
  function renderJobs() {
    $('[data-career-count]').textContent = `${state.jobs.filter(job => job.active).length} active · ${state.jobs.length} total`;
    $('[data-jobs-list]').innerHTML = state.jobs.map((job, index) => `<article class="cms-record"><div><strong>${escapeHtml(job.title)}</strong><small>${escapeHtml(job.department)}</small></div><span>${escapeHtml(job.location)}</span><span>${dateLabel(job.datePosted)}</span><span class="cms-status ${job.active ? '' : 'is-draft'}">${job.active ? 'Active' : 'Draft'}</span><div class="cms-row-actions"><button type="button" data-edit-job="${index}">Edit</button><button type="button" data-delete-job="${index}">Delete</button></div></article>`).join('');
  }
  function renderPosts() {
    $('[data-post-count]').textContent = `${state.posts.filter(post => post.published).length} published · ${state.posts.length} total`;
    $('[data-posts-list]').innerHTML = state.posts.map((post, index) => `<article class="cms-record"><div><strong>${escapeHtml(post.title)}</strong><small>${escapeHtml(post.topic)}</small></div><span>${dateLabel(post.date)}</span><span class="cms-status ${post.published ? '' : 'is-draft'}">${post.published ? 'Published' : 'Draft'}</span><div class="cms-row-actions"><button type="button" data-edit-post="${index}">Edit</button><button type="button" data-delete-post="${index}">Delete</button></div></article>`).join('');
  }
  function renderAssets() {
    $('[data-assets-grid]').innerHTML = assets.length ? assets.map((asset, index) => `<article class="cms-asset">${mediaMarkup(asset)}<footer><strong title="${escapeHtml(asset.name)}">${escapeHtml(asset.name)}</strong><button type="button" data-delete-asset="${index}">Delete</button></footer></article>`).join('') : '<p>No uploaded assets yet.</p>';
    renderStats();
  }
  function renderAll() { renderHero(); renderCarousel(); renderJobs(); renderPosts(); renderAssets(); renderStats(); }

  function openPicker(callback, allowClear = true) {
    pickerCallback = callback;
    $('[data-picker-clear]').hidden = !allowClear;
    $('[data-picker-grid]').innerHTML = assets.length ? assets.map((asset, index) => `<button class="cms-picker-item" type="button" data-pick-asset="${index}" title="${escapeHtml(asset.name)}">${mediaMarkup(asset)}</button>`).join('') : '<p>Upload an asset first.</p>';
    $('[data-picker-dialog]').showModal();
  }
  function chooseAsset(asset) {
    const item = asset ? { id: asset.id || uid('media'), url: asset.url, type: mediaType(asset), alt: asset.name?.replace(/[-_]/g, ' ').replace(/\.[^.]+$/, '') || '', label: asset.name || '' } : null;
    pickerCallback?.(item);
    $('[data-picker-dialog]').close();
    setDirty(); renderHero(); renderCarousel();
  }

  const field = (name, label, value = '', options = {}) => {
    if (options.checkbox) return `<label class="cms-check ${options.wide ? 'is-wide' : ''}"><input type="checkbox" name="${name}" ${value ? 'checked' : ''}><span>${label}</span></label>`;
    const className = `cms-field ${options.wide ? 'is-wide' : ''}`;
    if (options.select) return `<label class="${className}"><span>${label}</span><select name="${name}">${options.select.map(([optionValue, optionLabel]) => `<option value="${optionValue}" ${value === optionValue ? 'selected' : ''}>${optionLabel}</option>`).join('')}</select></label>`;
    if (options.textarea) return `<label class="${className}"><span>${label}</span><textarea name="${name}" ${options.required ? 'required' : ''}>${escapeHtml(value)}</textarea></label>`;
    return `<label class="${className}"><span>${label}</span><input name="${name}" value="${escapeHtml(value)}" type="${options.type || 'text'}" ${options.required ? 'required' : ''}></label>`;
  };
  function openJobEditor(index = -1) {
    const job = index >= 0 ? state.jobs[index] : { id: uid('job'), title: '', department: '', location: '', locality: '', region: '', countryCode: '', employmentType: 'FULL_TIME', datePosted: new Date().toISOString().slice(0, 10), validThrough: '', summary: '', description: '', responsibilities: [], qualifications: [], applyEmail: 'careers@space-tr.com', active: true };
    editor = { type: 'job', index, original: job };
    $('[data-editor-kicker]').textContent = 'Careers editor'; $('[data-editor-title]').textContent = index >= 0 ? 'Edit role' : 'New role';
    $('[data-editor-fields]').innerHTML = field('title', 'Role title', job.title, { required: true }) + field('department', 'Department', job.department) + field('location', 'Display location', job.location, { required: true }) + field('employmentType', 'Employment type', job.employmentType, { select: [['FULL_TIME','Full time'],['PART_TIME','Part time'],['CONTRACTOR','Contract'],['TEMPORARY','Temporary'],['INTERN','Internship'],['OTHER','Other']] }) + field('locality', 'City / locality', job.locality) + field('region', 'Region / state', job.region) + field('countryCode', 'Country code (AE, KE…)', job.countryCode) + field('datePosted', 'Date posted', job.datePosted, { type: 'date', required: true }) + field('validThrough', 'Applications close', job.validThrough?.slice(0, 10), { type: 'date' }) + field('summary', 'Short summary', job.summary, { textarea: true, wide: true }) + field('description', 'Role description', job.description, { textarea: true, wide: true, required: true }) + field('responsibilities', 'Responsibilities — one per line', job.responsibilities.join('\n'), { textarea: true, wide: true }) + field('qualifications', 'Qualifications — one per line', job.qualifications.join('\n'), { textarea: true, wide: true }) + field('applyEmail', 'Application email', job.applyEmail, { type: 'email' }) + field('active', 'Publish this role', job.active, { checkbox: true });
    $('[data-editor-dialog]').showModal();
  }
  function openPostEditor(index = -1) {
    const post = index >= 0 ? state.posts[index] : { id: uid('post'), title: '', topic: 'Company news', date: new Date().toISOString().slice(0, 10), excerpt: '', body: '', imageUrl: '', externalUrl: '', published: true };
    editor = { type: 'post', index, original: post };
    $('[data-editor-kicker]').textContent = 'Journal editor'; $('[data-editor-title]').textContent = index >= 0 ? 'Edit post' : 'New post';
    $('[data-editor-fields]').innerHTML = field('title', 'Title', post.title, { required: true, wide: true }) + field('topic', 'Topic', post.topic) + field('date', 'Publication date', post.date, { type: 'date', required: true }) + field('excerpt', 'Excerpt', post.excerpt, { textarea: true, wide: true }) + field('body', 'Post content — blank lines create paragraphs', post.body, { textarea: true, wide: true, required: true }) + field('imageUrl', 'Image URL (choose from Assets and copy its URL)', post.imageUrl, { wide: true }) + field('externalUrl', 'Optional external link', post.externalUrl, { type: 'url', wide: true }) + field('published', 'Publish this post', post.published, { checkbox: true });
    $('[data-editor-dialog]').showModal();
  }
  function saveEditor() {
    const form = $('[data-editor-form]');
    if (!form.reportValidity()) return false;
    const values = Object.fromEntries(new FormData(form));
    if (editor.type === 'job') {
      const item = { ...editor.original, ...values, slug: (values.title + '-' + values.locality).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), validThrough: values.validThrough ? `${values.validThrough}T23:59:59+00:00` : '', responsibilities: values.responsibilities.split('\n').map(value => value.trim()).filter(Boolean), qualifications: values.qualifications.split('\n').map(value => value.trim()).filter(Boolean), active: form.elements.active.checked };
      editor.index >= 0 ? state.jobs.splice(editor.index, 1, item) : state.jobs.unshift(item);
      renderJobs();
    } else {
      const item = { ...editor.original, ...values, slug: values.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), published: form.elements.published.checked };
      editor.index >= 0 ? state.posts.splice(editor.index, 1, item) : state.posts.unshift(item);
      renderPosts();
    }
    setDirty(); renderStats(); return true;
  }

  async function loadStudio() {
    try {
      const [content, assetResult] = await Promise.all([api('/api/admin/content'), api('/api/admin/assets').catch(error => ({ assets: [], warning: error.message }))]);
      state = content; assets = assetResult.assets || [];
      $('[data-login]').hidden = true; $('[data-app]').hidden = false;
      renderAll(); setDirty(false); showSection(location.hash.slice(1) || 'overview');
      if (assetResult.warning) toast(assetResult.warning);
    } catch (error) {
      if (!/Authentication/.test(error.message)) $('[data-login-message]').textContent = error.message;
    }
  }
  $('[data-login-form]').addEventListener('submit', async event => {
    event.preventDefault();
    const message = $('[data-login-message]'); message.textContent = 'Signing in…';
    try { await api('/api/admin/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) }); message.textContent = ''; await loadStudio(); }
    catch (error) { message.textContent = error.message; }
  });
  $('[data-logout]').addEventListener('click', async () => { await api('/api/admin/logout', { method: 'POST' }).catch(() => {}); location.reload(); });
  $$('[data-section-button]').forEach(button => button.addEventListener('click', () => showSection(button.dataset.sectionButton)));
  $('[data-go-assets]').addEventListener('click', () => showSection('assets'));
  $('[data-publish]').addEventListener('click', async event => {
    event.currentTarget.disabled = true; event.currentTarget.textContent = 'Publishing…';
    try {
      state = await api('/api/admin/content', { method: 'PUT', body: JSON.stringify(state) });
      const indexing = state.indexing; delete state.indexing;
      setDirty(false);
      toast(indexing?.error ? 'Published; Google notification needs attention' : indexing?.notified ? `Published · ${indexing.notified} job URL${indexing.notified === 1 ? '' : 's'} sent to Google` : 'Published to the live site');
    }
    catch (error) { toast(error.message); }
    finally { event.currentTarget.disabled = false; event.currentTarget.textContent = 'Publish changes'; }
  });
  $('[data-upload]').addEventListener('change', async event => {
    const files = [...event.target.files];
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]; $('[data-upload-state]').textContent = `Uploading ${index + 1} of ${files.length}: ${file.name}`;
      try {
        if (file.size > 3 * 1024 * 1024) throw new Error(`${file.name} is larger than 3 MB.`);
        const base64 = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); });
        const result = await api('/api/admin/assets', { method: 'POST', body: JSON.stringify({ name: file.name, type: file.type, data: base64 }) });
        assets.unshift({ ...result.asset, type: file.type.startsWith('video/') ? 'video' : 'image' });
      } catch (error) { toast(error.message); }
    }
    $('[data-upload-state]').textContent = files.length ? 'Upload complete.' : ''; event.target.value = ''; renderAssets();
  });
  document.addEventListener('click', async event => {
    const hero = event.target.closest('[data-pick-hero]'); if (hero) return openPicker(item => { state.media.hero[Number(hero.dataset.pickHero)] = item; });
    if (event.target.closest('[data-add-carousel]')) return openPicker(item => { if (item) state.media.carousel.push(item); });
    const move = event.target.closest('[data-carousel-move]'); if (move) { const index = Number(move.dataset.index), next = move.dataset.carouselMove === 'up' ? index - 1 : index + 1; if (next >= 0 && next < state.media.carousel.length) [state.media.carousel[index], state.media.carousel[next]] = [state.media.carousel[next], state.media.carousel[index]]; setDirty(); return renderCarousel(); }
    const remove = event.target.closest('[data-carousel-remove]'); if (remove) { state.media.carousel.splice(Number(remove.dataset.index), 1); setDirty(); return renderCarousel(); }
    const pick = event.target.closest('[data-pick-asset]'); if (pick) return chooseAsset(assets[Number(pick.dataset.pickAsset)]);
    if (event.target.closest('[data-picker-clear]')) { event.preventDefault(); return chooseAsset(null); }
    if (event.target.closest('[data-new-job]')) return openJobEditor();
    if (event.target.closest('[data-new-post]')) return openPostEditor();
    const editJob = event.target.closest('[data-edit-job]'); if (editJob) return openJobEditor(Number(editJob.dataset.editJob));
    const editPost = event.target.closest('[data-edit-post]'); if (editPost) return openPostEditor(Number(editPost.dataset.editPost));
    const deleteJob = event.target.closest('[data-delete-job]'); if (deleteJob && confirm('Delete this role from the CMS?')) { state.jobs.splice(Number(deleteJob.dataset.deleteJob), 1); setDirty(); renderJobs(); renderStats(); }
    const deletePost = event.target.closest('[data-delete-post]'); if (deletePost && confirm('Delete this post from the CMS?')) { state.posts.splice(Number(deletePost.dataset.deletePost), 1); setDirty(); renderPosts(); renderStats(); }
    const deleteAsset = event.target.closest('[data-delete-asset]');
    if (deleteAsset) {
      const index = Number(deleteAsset.dataset.deleteAsset), asset = assets[index];
      if (!confirm(`Permanently delete ${asset.name}? Existing placements using it may break.`)) return;
      try { await api('/api/admin/assets', { method: 'DELETE', body: JSON.stringify({ url: asset.url }) }); assets.splice(index, 1); renderAssets(); toast('Asset deleted'); } catch (error) { toast(error.message); }
    }
  });
  $('[data-editor-save]').addEventListener('click', event => { event.preventDefault(); if (saveEditor()) $('[data-editor-dialog]').close(); });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  loadStudio();
})();

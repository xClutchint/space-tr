(() => {
  async function applyPageImages() {
    try {
      const preview = new URLSearchParams(location.search).get('preview');
      const endpoint = preview ? `/api/content?preview=${encodeURIComponent(preview)}` : '/api/content';
      const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const content = await response.json();
      (content.pageImages || []).forEach(item => {
        document.querySelectorAll(`[data-cms-image="${CSS.escape(item.key)}"]`).forEach(image => {
          const mobile = matchMedia('(max-width: 900px)').matches;
          const url = mobile && item.mobileUrl ? item.mobileUrl : item.url;
          const x = mobile ? item.mobileX ?? item.x : item.x;
          const y = mobile ? item.mobileY ?? item.y : item.y;
          const scale = mobile ? item.mobileScale ?? item.scale : item.scale;
          image.src = url;
          image.style.objectPosition = `${x}% ${y}%`;
          image.style.transformOrigin = `${x}% ${y}%`;
          image.style.transform = `scale(${scale})`;
        });
      });
    } catch {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', applyPageImages, { once: true });
  else applyPageImages();
})();

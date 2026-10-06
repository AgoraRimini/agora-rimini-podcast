(() => {
  const nav = document.querySelector('.article-share');
  if (!nav) return;
  const url = document.querySelector('link[rel="canonical"]')?.href || location.href.split(/[?#]/)[0];
  const title = document.querySelector('.article-post-header h1')?.textContent.trim() || document.title;
  const encodedUrl = encodeURIComponent(url);
  const links = {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodedUrl}`
  };
  Object.entries(links).forEach(([key, href]) => { nav.querySelector(`[data-share="${key}"]`).href = href; });
  const status = nav.querySelector('.article-share-status');
  const native = nav.querySelector('[data-share="native"]');
  native.hidden = typeof navigator.share !== 'function';
  native.addEventListener('click', async () => {
    try { await navigator.share({ title, url }); }
    catch (error) { if (error.name !== 'AbortError') status.textContent = 'Condivisione non disponibile. Usa i pulsanti social o copia il link.'; }
  });
  nav.querySelector('[data-share="copy"]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      status.textContent = 'Link copiato.';
    } catch {
      status.replaceChildren();
      const input = document.createElement('input');
      input.type = 'text'; input.readOnly = true; input.value = url;
      input.setAttribute('aria-label', 'Link da copiare');
      status.append('Copia questo link: ', input); input.focus(); input.select();
    }
  });
})();

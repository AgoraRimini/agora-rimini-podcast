(() => {
  'use strict';
  // Share an HTML page: social crawlers need static metadata, not a binary APK.
  const shareUrl = 'https://agorariminipodcast.it/scarica-app/';
  for (const button of document.querySelectorAll('[data-app-copy]')) {
    button.addEventListener('click', async () => {
      const status = button.closest('section, main').querySelector('[data-app-copy-status]');
      const announce = text => { if (status) status.textContent = text; };
      try {
        if (!navigator.clipboard?.writeText) throw new Error('clipboard-unavailable');
        await navigator.clipboard.writeText(shareUrl);
        announce('Link copiato! Pronto da condividere.');
      } catch (_) {
        const input = document.createElement('textarea');
        input.value = shareUrl;
        input.setAttribute('readonly', '');
        input.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.append(input);
        input.select();
        let copied = false;
        try { copied = document.execCommand('copy'); } catch (_) {}
        input.remove();
        button.focus();
        if (copied) announce('Link copiato! Pronto da condividere.');
        else {
          announce('Copia questo link: ' + shareUrl);
          const manual = document.querySelector('[data-app-manual-link]');
          if (manual) { manual.hidden = false; manual.focus(); manual.select(); }
        }
      }
    });
  }
})();

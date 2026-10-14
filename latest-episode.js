/* Public Spreaker API: refresh without rebuilding the site or exposing credentials. */
(() => {
  const panel = document.querySelector('.hero-latest');
  if (!panel) return;
  const audio = document.querySelector('#latest-audio');
  const play = document.querySelector('#latest-play');
  const seek = document.querySelector('#latest-seek');
  const status = document.querySelector('#latest-status');
  const skips = [...panel.querySelectorAll('[data-skip]')];
  let current, pending, refreshing = false;
  const clock = seconds => {
    const n = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  };
  const sync = () => {
    const playing = !audio.paused && !audio.ended;
    play.setAttribute('aria-pressed', String(playing));
    play.setAttribute('aria-label', playing ? 'Metti in pausa la puntata' : 'Ascolta l’ultima puntata');
    play.querySelector('span').textContent = playing ? 'Pausa' : 'Ascolta ora';
    const duration = Number.isFinite(audio.duration) ? audio.duration : (current?.duration || 0) / 1000;
    document.querySelector('#latest-time').textContent = `${clock(audio.currentTime)} / ${clock(duration)}`;
    const ready = Number.isFinite(audio.duration) && audio.duration > 0;
    seek.disabled = !ready;
    skips.forEach(button => { button.disabled = !ready; });
    if (ready) {
      seek.value = audio.currentTime / audio.duration * 100;
      seek.setAttribute('aria-valuetext', `${clock(audio.currentTime)} di ${clock(audio.duration)}`);
    }
  };
  const apply = episode => {
    if (!episode || !/^\d+$/.test(String(episode.episode_id)) || typeof episode.title !== 'string' || !episode.title.trim()) return;
    if (current?.episode_id === episode.episode_id) return;
    // Keep even a paused listening session intact until it finishes.
    if (current && (audio.currentTime > 0 || !audio.paused) && !audio.ended) { pending = episode; return; }
    current = episode;
    pending = null;
    document.querySelector('#latest-title').textContent = episode.title.replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').trim();
    document.querySelector('#latest-link').href = `https://www.spreaker.com/episode/${episode.episode_id}`;
    audio.removeAttribute('src');
    audio.load();
    panel.hidden = false;
    sync();
  };
  const getJSON = async url => {
    const response = await fetch(url, { cache:'no-store', signal:AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };
  const refresh = async () => {
    if (refreshing || document.hidden) return;
    refreshing = true;
    try {
      const data = await getJSON('https://api.spreaker.com/v2/shows/5748998/episodes?limit=5&filter=listenable');
      const episodes = (data.response?.items || []).filter(item => item.type === 'RECORDED' && item.published_at);
      episodes.sort((a,b) => b.published_at.localeCompare(a.published_at) || b.episode_id - a.episode_id);
      if (!episodes.length) throw new Error('Nessuna puntata pubblicata');
      apply(episodes[0]);
      try { localStorage.setItem('agora-latest-episode', JSON.stringify(episodes[0])); } catch {}
    } catch {
      if (!current) {
        try { apply(await getJSON('/data/latest-episode.json')); } catch {}
      }
      status.textContent = current ? 'Aggiornamento temporaneamente non disponibile. Ultima puntata disponibile.' : 'Puntata non disponibile. Consulta la sezione Puntate.';
    } finally { refreshing = false; }
  };
  play.addEventListener('click', async () => {
    if (!audio.paused) { audio.pause(); return; }
    play.disabled = true;
    try {
      document.dispatchEvent(new Event('agora:episode-play'));
      document.querySelectorAll('audio').forEach(other => { if (other !== audio) other.pause(); });
      if (!audio.getAttribute('src')) audio.src = `https://api.spreaker.com/v2/episodes/${current.episode_id}/play.mp3`;
      status.textContent = 'Caricamento audio…';
      await audio.play();
      status.textContent = 'Riproduzione avviata.';
    } catch { status.textContent = 'Audio non disponibile. Riprova oppure usa il collegamento Pagina puntata.'; }
    finally { play.disabled = false; sync(); }
  });
  seek.addEventListener('input', () => { if (Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 100 * audio.duration; sync(); });
  skips.forEach(button => button.addEventListener('click', () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = Math.min(audio.duration, Math.max(0,audio.currentTime + Number(button.dataset.skip)));
    sync();
  }));
  ['play','pause','loadedmetadata','durationchange','timeupdate','emptied'].forEach(event => audio.addEventListener(event,sync));
  audio.addEventListener('error', () => { status.textContent = 'Audio non disponibile. Riprova o apri Pagina puntata.'; audio.removeAttribute('src'); sync(); });
  audio.addEventListener('ended', () => { sync(); if (pending) apply(pending); });
  document.addEventListener('agora:trailer-play', () => audio.pause());
  try { apply(JSON.parse(localStorage.getItem('agora-latest-episode'))); } catch {}
  refresh();
  setInterval(refresh,60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  window.addEventListener('online',refresh);
})();

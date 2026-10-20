import { readFileSync, writeFileSync } from "node:fs";

const path = "data/content-catalog.json";
const catalog = JSON.parse(readFileSync(path, "utf8"));
const response = await fetch("https://agora-editorial-api.paolo-rocchetti.workers.dev/v1/music", {
  signal: AbortSignal.timeout(30000),
  headers: { Accept: "application/json" }
});
if (!response.ok) throw new Error(`Catalogo musicale non disponibile: HTTP ${response.status}`);
const { tracks } = await response.json();
if (!Array.isArray(tracks)) throw new Error("Risposta del catalogo musicale non valida.");
const ids = new Set();
const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const previousSongs = catalog.items.filter(item => item.type === 'song');
const songs = tracks.map((track) => {
  if (!/^[0-9a-f-]{36}$/.test(track.id) || !track.title || !/^https:\/\//.test(track.audio) || ids.has(track.id)) {
    throw new Error("Brano non valido o duplicato nel catalogo musicale.");
  }
  ids.add(track.id);
  const aliases = [...new Set(previousSongs.filter(item => normalize(item.title) === normalize(track.title)).flatMap(item => [item.id, ...(item.aliases || [])]))].filter(id => id !== track.id);
  return { type: "song", id: track.id, title: track.title, url: `/?song=${encodeURIComponent(track.id)}#musica`, ...(aliases.length ? { aliases } : {}) };
});
const next = { ...catalog, items: [...catalog.items.filter(item => item.type !== "song"), ...songs] };
writeFileSync(path, JSON.stringify(next, null, 2) + "\n");
console.log(`Catalogo sincronizzato: ${songs.length} canzoni ospitate sul sito.`);
console.log(JSON.stringify(songs));

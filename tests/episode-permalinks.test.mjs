import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const item = (id, title, link = `https://www.spreaker.com/episode/example--${id}`) => `<item>
  <title>${title}</title><link>${link}</link><guid>${id === '80000000' ? '7c42d0ee-d52e-480c-8dbe-fe8352531147' : `https://api.spreaker.com/episode/${id}`}</guid>
  <enclosure url="https://api.spreaker.com/download/episode/${id}/audio.mp3" />
  <description>Descrizione originale ${id}</description><pubDate>Sun, 25 Oct 2026 10:22:07 +0000</pubDate>
  <itunes:duration>60:00</itunes:duration></item>`;
const snapshot = (directory, prefix = '') => Object.fromEntries(readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = join(directory, entry.name);
  const relative = prefix + entry.name;
  return entry.isDirectory() ? Object.entries(snapshot(path, relative + '/')) : [[relative, readFileSync(path, 'utf8')]];
}));

test('full archive preserves pages, aliases and permalinks across feed changes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'agora-permalinks-'));
  mkdirSync(join(directory, 'scripts'));
  mkdirSync(join(directory, 'data'));
  for (const file of ['generate-episodes.mjs', 'build-content-catalog.mjs']) {
    copyFileSync(join(root, 'scripts', file), join(directory, 'scripts', file));
  }
  writeFileSync(join(directory, 'data/articles.json'), '[]');
  writeFileSync(join(directory, 'data/content-catalog.json'), JSON.stringify({ items: [{ type: 'song', id: 'keep-me' }] }));
  writeFileSync(join(directory, 'mock-fetch.mjs'), `import { readFileSync } from 'node:fs';
    globalThis.fetch = async () => new Response(readFileSync('feed.xml', 'utf8'));`);
  const run = items => {
    writeFileSync(join(directory, 'feed.xml'), `<rss><channel>${items.join('')}</channel></rss>`);
    const result = spawnSync(process.execPath, ['--import', './mock-fetch.mjs', 'scripts/generate-episodes.mjs'], { cwd: directory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(readFileSync(join(directory, 'data/episodes.json'), 'utf8'));
  };
  // More than 50 ordinary episodes must all be generated.
  const initialItems = Array.from({ length: 60 }, (_, i) => item(String(80000000 + i), `Titolo ${i}`));
  let archive = run(initialItems);
  assert.equal(archive.length, 60);
  const before = snapshot(join(directory, 'puntate'));
  for (const episode of archive) assert.ok(before[episode.slug + '/index.html']);
  // A publisher-supplied website link must not change identity or create a self-link.
  archive = run([item('80000000', 'Titolo completamente diverso', 'https://agorariminipodcast.it/puntate/titolo-0-80000000/'), item('90000000', 'Nuova puntata')]);
  assert.equal(archive.length, 61);
  assert.equal(archive.find(e => e.id === '80000000').slug, 'titolo-0-80000000');
  assert.equal(archive.find(e => e.id === '80000000').link, 'https://www.spreaker.com/episode/80000000');
  const after = snapshot(join(directory, 'puntate'));
  for (const [path, html] of Object.entries(before)) {
    if (path !== 'index.html') assert.equal(after[path], html, `Existing page changed: ${path}`);
  }
  assert.ok(after['nuova-puntata-90000000/index.html']);
  assert.match(after['index.html'], /titolo-59-80000059/);
  assert.match(readFileSync(join(directory, 'sitemap.xml'), 'utf8'), /titolo-59-80000059/);
  assert.ok(JSON.parse(readFileSync(join(directory, 'data/content-catalog.json'), 'utf8')).items.some(i => i.id === 'keep-me'));
  const stable = snapshot(join(directory, 'puntate'));
  run([item('90000000', 'Nuova puntata')]);
  assert.deepEqual(snapshot(join(directory, 'puntate')), stable);
});

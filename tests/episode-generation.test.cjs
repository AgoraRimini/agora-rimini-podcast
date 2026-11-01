const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function snapshot(root, names) {
  const result = {};
  function walk(relative) {
    const file = path.join(root, relative);
    if (!fs.existsSync(file)) return;
    if (fs.statSync(file).isDirectory()) for (const name of fs.readdirSync(file)) walk(path.join(relative, name));
    else result[relative] = hash(file);
  }
  names.forEach(walk);
  return result;
}
test('RSS: nuova puntata, idempotenza, feed ridotto, permalink e contenuti preservati', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'agora-episodes-'));
  try {
    for (const name of ['scripts', 'data', 'puntate', 'articoli']) fs.cpSync(name, path.join(temp, name), { recursive: true });
    const before = snapshot(temp, ['puntate', 'articoli']);
    delete before[path.join('puntate', 'index.html')];
    const old = JSON.parse(fs.readFileSync(path.join(temp, 'data/episodes.json')));
    const songs = JSON.parse(fs.readFileSync(path.join(temp, 'data/content-catalog.json'))).items.filter(e => e.type === 'song');
    const item = '<item><title>Test aggiornamento &amp; permalink</title><link>https://agorariminipodcast.it/pagina-personalizzata/</link><guid>https://api.spreaker.com/episode/999999999</guid><description>Descrizione originale di prova.</description><pubDate>Sun, 01 Nov 2026 12:00:00 GMT</pubDate><itunes:duration>12:34</itunes:duration></item>';
    const run = xml => {
      const loader = 'globalThis.fetch=async()=>({ok:true,text:async()=>'+JSON.stringify(xml)+'});';
      return spawnSync(process.execPath, ['--import', 'data:text/javascript,' + encodeURIComponent(loader), 'scripts/generate-episodes.mjs'], { cwd: temp, encoding: 'utf8' });
    };
    const result = run('<rss><channel>' + item + '</channel></rss>');
    assert.equal(result.status, 0, result.stderr);
    const after = JSON.parse(fs.readFileSync(path.join(temp, 'data/episodes.json')));
    assert.equal(after.length, old.length + 1);
    for (const entry of old) assert.equal(after.find(e => e.id === entry.id)?.slug, entry.slug);
    const added = after.find(e => e.id === '999999999');
    assert.equal(added.title, 'Test aggiornamento & permalink');
    assert.equal(added.description, 'Descrizione originale di prova.');
    for (const [file, digest] of Object.entries(before)) assert.equal(hash(path.join(temp, file)), digest, 'Contenuto modificato: ' + file);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(temp, 'data/content-catalog.json'))).items.filter(e => e.type === 'song'), songs);
    const generated = snapshot(temp, ['puntate', 'data', 'sitemap.xml']);
    assert.equal(run('<rss><channel>' + item + '</channel></rss>').status, 0);
    assert.deepEqual(snapshot(temp, ['puntate', 'data', 'sitemap.xml']), generated, 'Feed identico deve produrre zero modifiche');
    // A short RSS never removes archive entries; an unusable RSS fails before writing.
    assert.equal(run('<rss><channel></channel></rss>').status, 1);
    assert.deepEqual(snapshot(temp, ['puntate', 'data', 'sitemap.xml']), generated);
    const validation = spawnSync(process.execPath, ['scripts/validate-episodes.mjs'], { cwd: temp, encoding: 'utf8' });
    assert.equal(validation.status, 0, validation.stderr);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
